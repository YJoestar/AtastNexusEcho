/**
 * NEXUS — Connection State Hook
 *
 * `navigator.onLine` only says whether the device has a network interface. On
 * campus Wi-Fi and mobile data it very often reports "online" while nothing can
 * actually reach Supabase, which is exactly the case that used to leave a
 * player staring at a submit button that silently failed.
 *
 * This hook tracks two independent facts and combines them into one status:
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
 */

import { useCallback, useEffect, useRef, useState } from 'react'

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

export interface ConnectionState {
  status: ConnectionStatus
  /** navigator.onLine */
  isBrowserOnline: boolean
  /** The last probe reached the server, whatever it answered. */
  isServerReachable: boolean
  /** The last probe was answered with a success status. */
  isServerHealthy: boolean
  /** HTTP status from the last completed probe, or null if it never completed. */
  lastProbeStatus: number | null
  /** True for every status that is not a healthy online connection. */
  isOffline: boolean
  /** ISO timestamp of the last completed probe, or null before the first one. */
  lastProbedAt: string | null
  /** Force an immediate probe (used by the banner's retry affordance). */
  probe: () => Promise<void>
}

const PROBE_TIMEOUT_MS = 4000
const PROBE_INTERVAL_MS = 20000

function statusOf(
  isBrowserOnline: boolean,
  isServerReachable: boolean,
  isServerHealthy: boolean,
  hasProbed: boolean
): ConnectionStatus {
  if (!isBrowserOnline) return 'offline'
  if (!hasProbed) return 'reconnecting'
  if (!isServerReachable) return 'degraded'
  return isServerHealthy ? 'online' : 'unavailable'
}

export function useConnection(): ConnectionState {
  const [isBrowserOnline, setIsBrowserOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [isServerReachable, setIsServerReachable] = useState(false)
  const [isServerHealthy, setIsServerHealthy] = useState(false)
  const [lastProbeStatus, setLastProbeStatus] = useState<number | null>(null)
  const [lastProbedAt, setLastProbedAt] = useState<string | null>(null)
  const inFlight = useRef(false)

  const probe = useCallback(async () => {
    if (inFlight.current) return
    if (!SUPABASE_URL) {
      // No configured backend: there is nothing to reach, so do not claim to
      // be connected and do not hammer an empty URL.
      setIsServerReachable(false)
      setIsServerHealthy(false)
      setLastProbeStatus(null)
      setLastProbedAt(new Date().toISOString())
      return
    }
    inFlight.current = true
    try {
      const base = SUPABASE_URL.replace(/\/+$/, '')
      const controller = new AbortController()
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
        setIsServerReachable(true)
        setIsServerHealthy(response.ok)
        setLastProbeStatus(response.status)
      } finally {
        clearTimeout(timeout)
      }
    } catch {
      // Abort, DNS failure, TLS failure, offline — all mean "cannot reach".
      setIsServerReachable(false)
      setIsServerHealthy(false)
      setLastProbeStatus(null)
    } finally {
      setLastProbedAt(new Date().toISOString())
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true)
      void probe()
    }
    const handleOffline = () => {
      setIsBrowserOnline(false)
      setIsServerReachable(false)
      setIsServerHealthy(false)
      setLastProbeStatus(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    void probe()

    const interval = setInterval(() => {
      if (navigator.onLine) void probe()
    }, PROBE_INTERVAL_MS)

    // A phone that was backgrounded during the blackout only finds out on
    // return, and `online` never fires for a link that never fully dropped.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void probe()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [probe])

  const status = statusOf(
    isBrowserOnline,
    isServerReachable,
    isServerHealthy,
    lastProbedAt !== null
  )

  return {
    status,
    isBrowserOnline,
    isServerReachable,
    isServerHealthy,
    lastProbeStatus,
    isOffline: status !== 'online',
    lastProbedAt,
    probe,
  }
}