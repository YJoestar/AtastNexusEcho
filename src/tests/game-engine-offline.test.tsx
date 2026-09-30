/**
 * NEXUS - Game engine offline behaviour tests
 *
 * The engine is where "no signal" is decided and where a lost answer is
 * recovered. `navigator.onLine` alone is not enough: a phone on a Wi-Fi access
 * point with no route to the server must behave exactly like one with no link.
 *
 * These tests cover the three cases that matter and one that must never change:
 * an answer typed offline is queued and replayed, a server rejection still
 * reaches the player, and hints are never replayed speculatively because they
 * cost time.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { readQueue } from '@/lib/offlineQueue'

const useApp = vi.fn()
const useConnection = vi.fn()
const useOffline = vi.fn()
const submitAnswer = vi.fn()
const useHint = vi.fn()
const getNodeProgress = vi.fn()
const getGameState = vi.fn()
const getNotifications = vi.fn()

vi.mock('@/app/providers', () => ({ useApp: () => useApp() }))
vi.mock('@/hooks/useConnection', () => ({ useConnection: () => useConnection() }))
vi.mock('@/hooks/useOffline', () => ({ useOffline: () => useOffline() }))
vi.mock('@/lib/game', () => ({
  gameAPI: {
    submitAnswer: (...args: unknown[]) => submitAnswer(...args),
    useHint: (...args: unknown[]) => useHint(...args),
    getNodeProgress: () => getNodeProgress(),
    getGameState: () => getGameState(),
    getNotifications: () => getNotifications(),
    getInventory: vi.fn().mockResolvedValue({ evidence: [], inventory: [], fragments: [] }),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    scanQR: vi.fn(),
    markNotificationsRead: vi.fn(),
  },
}))

const { useGameEngine } = await import('@/hooks/useGameEngine')

const app = {
  player: { id: 'p1', role: 'OPERATOR' },
  team: { id: 't1', name: 'Atlas' },
  role: 'OPERATOR',
  isInitializing: false,
  isAuthenticated: true,
  refreshGameState: vi.fn().mockResolvedValue(undefined),
  refreshTeamProgress: vi.fn().mockResolvedValue(undefined),
  gameState: null,
  teamProgress: null,
  notifications: [],
  markNotificationRead: vi.fn(),
}

beforeEach(() => {
  localStorage.clear()
  submitAnswer.mockReset()
  useHint.mockReset()
  getNodeProgress.mockReset().mockResolvedValue([])
  getGameState.mockReset().mockResolvedValue({
    team: { status: 'ACTIVE', score: 0, startedAt: null, deadline: null },
    progress: { solvedCount: 0, currentNodeId: null },
    currentNode: null,
  })
  getNotifications.mockReset().mockResolvedValue([])

  useApp.mockReset().mockReturnValue(app)
  useOffline.mockReset().mockReturnValue({ isOnline: true, isOffline: false })
  useConnection.mockReset().mockReturnValue({
    status: 'online',
    isBrowserOnline: true,
    isServerReachable: true,
    isOffline: false,
    lastProbedAt: new Date().toISOString(),
    probe: vi.fn(),
  })
})

describe('submitAnswer', () => {
  it('queues the answer instead of losing it when there is no signal', async () => {
    useOffline.mockReturnValue({ isOnline: false, isOffline: true })
    useConnection.mockReturnValue({
      status: 'offline',
      isBrowserOnline: false,
      isServerReachable: false,
      isOffline: true,
      lastProbedAt: null,
      probe: vi.fn(),
    })

    const { result } = renderHook(() => useGameEngine())

    let outcome
    await act(async () => {
      outcome = await result.current.submitAnswer('P01', 'CDFDEFF')
    })

    expect(outcome).toMatchObject({ isCorrect: false, queued: true })
    expect(submitAnswer).not.toHaveBeenCalled()
    expect(readQueue().map(entry => entry.answer)).toEqual(['CDFDEFF'])
    expect(result.current.queuedCount).toBe(1)
  })

  it('treats a Wi-Fi link with no route to the server as offline', async () => {
    useConnection.mockReturnValue({
      status: 'degraded',
      isBrowserOnline: true,
      isServerReachable: false,
      isOffline: true,
      lastProbedAt: new Date().toISOString(),
      probe: vi.fn(),
    })

    const { result } = renderHook(() => useGameEngine())
    await act(async () => {
      const outcome = await result.current.submitAnswer('P01', '3425')
      expect(outcome.queued).toBe(true)
    })

    expect(submitAnswer).not.toHaveBeenCalled()
    expect(readQueue()).toHaveLength(1)
  })

  it('queues the answer when the link dies mid-request', async () => {
    submitAnswer.mockRejectedValue(new Error('TypeError: Failed to fetch'))

    const { result } = renderHook(() => useGameEngine())
    await act(async () => {
      const outcome = await result.current.submitAnswer('P01', 'CDFDEFF')
      expect(outcome.queued).toBe(true)
    })

    expect(readQueue().map(entry => entry.answer)).toEqual(['CDFDEFF'])
  })

  it('surfaces a server rejection instead of silently queueing it', async () => {
    submitAnswer.mockRejectedValue(new Error('Rate limited. Please wait before submitting again.'))

    const { result } = renderHook(() => useGameEngine())
    await act(async () => {
      await expect(result.current.submitAnswer('P01', 'CDFDEFF')).rejects.toThrow(/Rate limited/)
    })

    expect(readQueue()).toHaveLength(0)
  })

  it('sends normally when the connection is healthy', async () => {
    submitAnswer.mockResolvedValue({ isCorrect: true, pointsAwarded: 50, attemptNumber: 1 })

    const { result } = renderHook(() => useGameEngine())
    await act(async () => {
      const outcome = await result.current.submitAnswer('P01', 'CDFDEFF')
      expect(outcome.isCorrect).toBe(true)
      expect(outcome.queued).toBeUndefined()
    })

    expect(submitAnswer).toHaveBeenCalledWith('P01', 'CDFDEFF')
    expect(readQueue()).toHaveLength(0)
  })
})

describe('replay', () => {
  it('flushes the queue once the connection is usable again', async () => {
    localStorage.setItem(
      'nexus_submission_queue',
      JSON.stringify([
        { id: 'q1', nodeId: 'P01', answer: 'CDFDEFF', queuedAt: new Date().toISOString(), attempts: 0 },
      ]),
    )
    submitAnswer.mockResolvedValue({ isCorrect: true, pointsAwarded: 50, attemptNumber: 1, nextNodeId: 'P02' })

    const { result } = renderHook(() => useGameEngine())

    await waitFor(() => expect(submitAnswer).toHaveBeenCalledWith('P01', 'CDFDEFF'))
    await waitFor(() => expect(result.current.queuedCount).toBe(0))
    // A replayed correct answer may have unlocked the next node, so the
    // authoritative state has to be re-read rather than assumed.
    await waitFor(() => expect(app.refreshGameState).toHaveBeenCalled())
    expect(app.refreshTeamProgress).toHaveBeenCalled()
  })
})

describe('requestHint', () => {
  it('never queues a hint - the penalty and the record must not be deferred', async () => {
    useOffline.mockReturnValue({ isOnline: false, isOffline: true })
    useConnection.mockReturnValue({
      status: 'offline',
      isBrowserOnline: false,
      isServerReachable: false,
      isOffline: true,
      lastProbedAt: null,
      probe: vi.fn(),
    })

    const { result } = renderHook(() => useGameEngine())
    await act(async () => {
      await expect(result.current.requestHint('P01', 1)).rejects.toThrow(/offline/i)
    })

    expect(useHint).not.toHaveBeenCalled()
    expect(readQueue()).toHaveLength(0)
  })
})