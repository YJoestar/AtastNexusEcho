/**
 * NEXUS — Game Timer Tests
 *
 * The countdown must be derived from the server-published deadline
 * (teams.game_deadline -> gameState.endsAt), never from a locally invented one.
 * These tests use fake timers to prove it actually ticks — the previous
 * implementation rendered formatTimeRemaining() on every render, so the value
 * was frozen between polls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useGameTimer, TIMER_THRESHOLDS } from '@/hooks/useGameTimer'

const IN_90_MIN = new Date('2026-09-30T12:00:00.000Z').toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-30T10:30:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useGameTimer', () => {
  it('reports "not armed" until the server publishes a deadline', () => {
    const { result } = renderHook(() => useGameTimer(null))
    expect(result.current.isArmed).toBe(false)
    expect(result.current.remainingMs).toBeNull()
    expect(result.current.formatted).toBe('—')
    expect(result.current.isExpired).toBe(false)
  })

  it('tolerates an unparseable deadline instead of rendering NaN', () => {
    const { result } = renderHook(() => useGameTimer('not-a-date'))
    expect(result.current.isArmed).toBe(false)
    expect(result.current.formatted).toBe('—')
  })

  it('derives remaining time from the server deadline', () => {
    const { result } = renderHook(() => useGameTimer(IN_90_MIN))
    expect(result.current.isArmed).toBe(true)
    expect(result.current.remainingMs).toBe(90 * 60 * 1000)
    expect(result.current.formatted).toBe('1h 30m')
    expect(result.current.urgency).toBe('normal')
  })

  it('actually ticks once per second (the old implementation did not)', () => {
    // Format contract: seconds are shown only below one hour, to keep the
    // header compact and glanceable on a phone.
    const { result } = renderHook(() => useGameTimer(IN_90_MIN))
    expect(result.current.formatted).toBe('1h 30m')

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.remainingMs).toBe((90 * 60 - 1) * 1000)
    expect(result.current.formatted).toBe('1h 29m')

    // Cross the one-hour boundary and the seconds component appears.
    act(() => { vi.advanceTimersByTime(30 * 60 * 1000) })
    expect(result.current.remainingMs).toBe((60 * 60 - 1) * 1000)
    expect(result.current.formatted).toBe('59m 59s')
  })

  it('escalates urgency as the deadline approaches', () => {
    const { result, rerender } = renderHook(({ endsAt }: { endsAt: string }) => useGameTimer(endsAt), {
      initialProps: { endsAt: new Date(Date.now() + TIMER_THRESHOLDS.low + 60_000).toISOString() },
    })
    expect(result.current.urgency).toBe('normal')

    rerender({ endsAt: new Date(Date.now() + TIMER_THRESHOLDS.low - 1000).toISOString() })
    expect(result.current.urgency).toBe('low')

    rerender({ endsAt: new Date(Date.now() + TIMER_THRESHOLDS.critical - 1000).toISOString() })
    expect(result.current.urgency).toBe('critical')
  })

  it('clamps at zero and reports expiry without going negative', () => {
    const endsAt = new Date(Date.now() + 2000).toISOString()
    const { result } = renderHook(() => useGameTimer(endsAt))

    act(() => { vi.advanceTimersByTime(10_000) })

    expect(result.current.isExpired).toBe(true)
    expect(result.current.urgency).toBe('expired')
    expect(result.current.remainingMs).toBe(0)
    expect(result.current.formatted).toBe('00m 00s')
  })

  it('re-syncs from the server deadline after the device sleeps', () => {
    // Phone locked for 20 minutes: interval callbacks are throttled or paused
    // entirely, so the value must be recomputed from the absolute deadline
    // rather than by counting ticks.
    const { result } = renderHook(() => useGameTimer(IN_90_MIN))
    act(() => { vi.setSystemTime(new Date('2026-09-30T11:00:00.000Z')) })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.remainingMs).toBe((60 * 60 - 1) * 1000)
    expect(result.current.formatted).toBe('59m 59s')
  })

  it('stop ticking once unmounted', () => {
    const { unmount } = renderHook(() => useGameTimer(IN_90_MIN))
    unmount()
    expect(() => act(() => { vi.advanceTimersByTime(5000) })).not.toThrow()
  })
})
