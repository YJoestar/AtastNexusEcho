/**
 * NEXUS — Connection State
 *
 * `navigator.onLine` only says whether the device has a network interface. On
 * campus Wi-Fi and mobile data it very often reports "online" while nothing can
 * actually reach Supabase, which is exactly the case that used to leave a
 * player staring at a submit button that silently failed.
 *
 * This module tracks two independent facts and combines them into one status:
 *   - the browser thinks there is a link
 *   - a live probe of the Supabase auth endpoint actually answered
 *
 * The probe is a GET of /auth/v1/health, which is public, cheap and cached-off.
 * It runs on mount, on online/offline transitions, on tab focus and on a slow
 * interval, so a silently dropped connection is noticed without polling hard.
 *
 * Two things the probe has to get right, because the difference is the whole
 * point of this hook:
 *
 *   1. It must send the project `apikey`. Supabase gates /auth/v1/health behind
 *      the anon key on most projects, and an ungated probe gets a 401 from a
 *      perfectly healthy server — which used to be reported to the player as
 *      "no route to server".
 *   2. It must distinguish "the server answered" from "the server could not be
 *      reached". Any HTTP response at all proves a route exists. Only a
 *      transport failure — DNS, TLS, timeout, abort — means no route.
 *
 * There is exactly ONE probe per device, shared by every consumer.
 *
 * This used to be per-component state. `PlayerLayout` calls the hook and then
 * renders `PlayerHeader`, `OfflineBanner` and `BottomNav`, each of which called
 * it again — so a single authenticated player screen ran four independent
 * probes every 20 seconds, and any screen that also used the game engine ran
 * five. Each instance had its own `inFlight` guard, so the guards did not
 * deduplicate anything. In a room of phones that is a small army of identical
 * requests against the one endpoint players depend on.
 *
 * Worse, the instances were free to disagree. They mounted at different moments
 * and probed independently, so the header could read "online" while the banner
 * beneath it read "reconnecting", and which one was right depended on which had
 * most recently finished. A player cannot act on that, and it was never true.
 * Connectivity is a property of the device, not of a component.
 *
 * The state now lives in a module-level store that `useSyncExternalStore`
 * reads. One probe loop, one interval, one answer, and every consumer on the
 * screen shows the same thing because there is only one thing to show.
 */

import { useCallback, useSyncExternalStore } from 'react'

/** Public health endpoint on the same host as the Supabase API. */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''

/**
 * The anon key is public by design and is already in the client bundle; it is
 * sent only so the health endpoint does not reject the probe.
 */
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export type ConnectionStatus =
  /** Link up and the server answered the last probe with a success. */
  | 'online'
  /** Link up but the last probe could not reach the server: captive portal, dead campus Wi-Fi. */
  | 'degraded'
  /** The server answered, but not with a success. It is there and it is refusing. */
  | 'unavailable'
  /** No network interface at all. */
  | 'offline'
  /** Just regained the link; the first probe has not confirmed the server yet. */
  | 'reconnecting'

export interface ConnectionSnapshot {
  status: ConnectionStatus
  /** navigator.onLine */
  isBrowserOnline: boolean
  /** The last probe reached the server, whatever it answered. */
  isServerReachable: boolean
  /** The last probe was answered with a success status. */
  isServerHealthy: boolean
  /** HTTP status from the last completed probe, or null if it never completed. */
  lastProbeStatus: number | null
  /** ISO timestamp of the last completed probe, or null before the first one. */
  lastProbedAt: string | null
}

export interface ConnectionState extends ConnectionSnapshot {
  /** True for every status that is not a healthy online connection. */
  isOffline: boolean
  /** Force an immediate probe (used by the banner's retry affordance). */
  probe: () => Promise<void>
}

const PROBE_TIMEOUT_MS = 4000
const PROBE_INTERVAL_MS = 20000

function statusOf(state: Omit<ConnectionSnapshot, 'status'>): ConnectionStatus {
  if (!state.isBrowserOnline) return 'offline'
  if (state.lastProbedAt === null) return 'reconnecting'
  if (!state.isServerReachable) return 'degraded'
  return state.isServerHealthy ? 'online' : 'unavailable'
}

interface Store {
  isBrowserOnline: boolean
  isServerReachable: boolean
  isServerHealthy: boolean
  lastProbeStatus: number | null
  lastProbedAt: string | null
}

function initialStore(): Store {
  return {
    isBrowserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    isServerReachable: false,
    isServerHealthy: false,
    lastProbeStatus: null,
    lastProbedAt: null,
  }
}

let store: Store = initialStore()
let snapshot: ConnectionSnapshot = withStatus(store)
const listeners = new Set<() => void>()

/** Guards against overlapping probes across all consumers. */
let inFlight = false
let subscribers = 0
let abortInFlight: AbortController | null = null
let teardown: (() => void) | null = null

function withStatus(next: Store): ConnectionSnapshot {
  const base = {
    isBrowserOnline: next.isBrowserOnline,
    isServerReachable: next.isServerReachable,
    isServerHealthy: next.isServerHealthy,
    lastProbeStatus: next.lastProbeStatus,
    lastProbedAt: next.lastProbedAt,
  }
  return { status: statusOf(base), ...base }
}

function setStore(patch: Partial<Store>) {
  store = { ...store, ...patch }
  snapshot = withStatus(store)
  for (const listener of listeners) listener()
}

async function runProbe(): Promise<void> {
  if (inFlight) return

  if (!SUPABASE_URL) {
    // No configured backend: there is nothing to reach, so do not claim to
    // be connected and do not hammer an empty URL.
    setStore({
      isServerReachable: false,
      isServerHealthy: false,
      lastProbeStatus: null,
      lastProbedAt: new Date().toISOString(),
    })
    return
  }

  inFlight = true
  try {
    const base = SUPABASE_URL.replace(/\/+$/, '')
    const controller = new AbortController()
    abortInFlight = controller
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    try {
      const response = await fetch(`${base}/auth/v1/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : undefined,
      })
      // We got a response, so there is a route to the server. A 401 from a
      // gated endpoint means reachable-and-refusing, not unreachable.
      setStore({
        isServerReachable: true,
        isServerHealthy: response.ok,
        lastProbeStatus: response.status,
      })
    } finally {
      clearTimeout(timeout)
      abortInFlight = null
    }
  } catch {
    // Abort, DNS failure, TLS failure, offline — all mean "cannot reach".
    setStore({
      isServerReachable: false,
      isServerHealthy: false,
      lastProbeStatus: null,
    })
  } finally {
    setStore({ lastProbedAt: new Date().toISOString() })
    inFlight = false
  }
}

function start(): void {
  if (teardown) return

  // A device can change link state while nothing is mounted, and the previous
  // consumer's verdict must not be inherited across that gap.
  if (typeof navigator !== 'undefined') {
    setStore({ isBrowserOnline: navigator.onLine })
  }

  const handleOnline = () => {
    setStore({ isBrowserOnline: true })
    void runProbe()
  }
  const handleOffline = () => {
    setStore({
      isBrowserOnline: false,
      isServerReachable: false,
      isServerHealthy: false,
      lastProbeStatus: null,
    })
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  void runProbe()

  const interval = setInterval(() => {
    if (navigator.onLine) void runProbe()
  }, PROBE_INTERVAL_MS)

  // A phone that was backgrounded during the blackout only finds out on
  // return, and `online` never fires for a link that never fully dropped.
  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) void runProbe()
  }
  document.addEventListener('visibilitychange', handleVisibility)

  teardown = () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    document.removeEventListener('visibilitychange', handleVisibility)
    clearInterval(interval)
    teardown = null
  }
}

/**
 * Reference-counted so the loop outlives any single component and stops when
 * the last one goes. React 18 StrictMode mounts effects twice in development;
 * the count is what makes that a no-op rather than a second probe loop.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  subscribers += 1
  start()
  return () => {
    listeners.delete(listener)
    subscribers -= 1
    if (subscribers > 0) return
    teardown?.()
    abortInFlight?.abort()
    // Reset so the next mount re-probes instead of showing a stale verdict
    // from a previous session on the device.
    store = initialStore()
    snapshot = withStatus(store)
  }
}

const getSnapshot = () => snapshot
const getServerSnapshot = () => snapshot

/**
 * Shared connectivity for the whole app.
 *
 * Every caller observes the same probe. `probe` is stable, so components can
 * use it in dependency arrays without re-running effects on every render.
 */
export function useConnection(): ConnectionState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const probe = useCallback(() => runProbe(), [])
  return { ...state, isOffline: state.status !== 'online', probe }
}

/** Test-only: drops the shared store so each case starts from a clean slate. */
export function __resetConnectionStoreForTests(): void {
  listeners.clear()
  subscribers = 0
  teardown?.()
  teardown = null
  abortInFlight?.abort()
  abortInFlight = null
  inFlight = false
  store = initialStore()
  snapshot = withStatus(store)
}