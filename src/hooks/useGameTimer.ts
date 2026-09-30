/**
 * NEXUS — Game Timer
 *
 * Server-authoritative countdown for the 180 minute investigation.
 *
 * The ONLY source of truth is `gameState.endsAt`, which the backend derives
 * from `teams.game_deadline`. The client never invents a deadline and never
 * decides that the game is over — it renders the remaining interval and, once
 * the interval is non-positive, reports `isExpired` so the UI can render
 * whatever end-state the server returns.
 *
 * Because the deadline is a server timestamp, the countdown survives refresh,
 * navigation, browser close/reopen and device sleep: after any of those the
 * value is simply recomputed from the freshly fetched `endsAt`.
 */

import { useEffect, useMemo, useState } from 'react'

export type TimerUrgency = 'normal' | 'low' | 'critical' | 'expired'

export interface GameTimerState {
  /** Milliseconds left, clamped at 0. Null when the server has not set a deadline yet. */
  remainingMs: number | null
  /** e.g. "2h 14m" / "14m 09s" / "0m 00s" */
  formatted: string
  urgency: TimerUrgency
  isExpired: boolean
  /** True once the server has published a deadline (i.e. the clock is armed). */
  isArmed: boolean
}

const LOW_THRESHOLD_MS = 30 * 60 * 1000
const CRITICAL_THRESHOLD_MS = 10 * 60 * 1000

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (hours > 0) return `${hours}h ${pad(minutes)}m`
  return `${pad(minutes)}m ${pad(seconds)}s`
}

function urgencyFor(remainingMs: number): TimerUrgency {
  if (remainingMs <= 0) return 'expired'
  if (remainingMs <= CRITICAL_THRESHOLD_MS) return 'critical'
  if (remainingMs <= LOW_THRESHOLD_MS) return 'low'
  return 'normal'
}

export function useGameTimer(endsAt: string | null | undefined): GameTimerState {
  const deadline = useMemo(() => {
    if (!endsAt) return null
    const parsed = new Date(endsAt).getTime()
    return Number.isNaN(parsed) ? null : parsed
  }, [endsAt])

  // Seed immediately so the first paint is correct rather than 0.
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    deadline === null ? null : deadline - Date.now(),
  )

  useEffect(() => {
    if (deadline === null) {
      setRemainingMs(null)
      return
    }

    const tick = () => setRemainingMs(deadline - Date.now())
    tick()

    const id = setInterval(tick, 1000)
    // Re-sync when the tab becomes visible again, which covers device sleep
    // and backgrounding where timers are throttled or frozen entirely.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', tick)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', tick)
    }
  }, [deadline])

  return useMemo<GameTimerState>(() => {
    if (remainingMs === null) {
      return { remainingMs: null, formatted: '—', urgency: 'normal', isExpired: false, isArmed: false }
    }
    const clamped = Math.max(0, remainingMs)
    return {
      remainingMs: clamped,
      formatted: formatRemaining(clamped),
      urgency: urgencyFor(clamped),
      isExpired: clamped <= 0,
      isArmed: true,
    }
  }, [remainingMs])
}

export const TIMER_THRESHOLDS = {
  low: LOW_THRESHOLD_MS,
  critical: CRITICAL_THRESHOLD_MS,
} as const
