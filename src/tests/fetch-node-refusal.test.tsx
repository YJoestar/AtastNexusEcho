/**
 * `fetchNode` has three answers, not two.
 *
 * The server refuses a node it will not serve by returning `{unlocked:false}`.
 * That one payload used to mean the same thing as "there is nothing here", and
 * PlayerNode rendered "nothing here" as `return null` - so every refusal was a
 * blank page. The three cases a player has to be able to tell apart:
 *
 *   1. the node exists but this team has not been given it  -> sealed document
 *   2. the node exists and the team has closed it            -> full content,
 *                                                                SOLVED status
 *   3. the code is in no register at all                     -> explicit not-found
 *
 * `get_player_node_detail` answers `{unlocked:false}` for all of a locked node,
 * a solved node (before 2026100504) and a nonexistent one, so the distinction has
 * to be made from what the client legitimately knows: the local index bundle and
 * this team's own node progress.
 *
 * A fetch that THROWS is a fourth case again - the Bureau never answered - and
 * must not be reported as any of the three above.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const useApp = vi.fn()
const useConnection = vi.fn()
const useOffline = vi.fn()
const getNode = vi.fn()
const getNodeProgress = vi.fn()

vi.mock('@/app/providers', () => ({ useApp: () => useApp() }))
vi.mock('@/hooks/useConnection', () => ({ useConnection: () => useConnection() }))
vi.mock('@/hooks/useOffline', () => ({ useOffline: () => useOffline() }))
vi.mock('@/lib/game', () => ({
  gameAPI: {
    getNode: (...args: unknown[]) => getNode(...args),
    getNodeProgress: () => getNodeProgress(),
    getGameState: vi.fn().mockResolvedValue({
      team: { status: 'ACTIVE', score: 0, startedAt: null, deadline: null },
      progress: { solvedCount: 0, currentNodeId: null, availableNodeIds: [] },
      currentNode: null,
    }),
    getNotifications: vi.fn().mockResolvedValue([]),
    getInventory: vi.fn().mockResolvedValue({ evidence: [], inventory: [], fragments: [] }),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    scanQR: vi.fn(),
    markNotificationsRead: vi.fn(),
    submitAnswer: vi.fn(),
    useHint: vi.fn(),
  },
}))

const { useGameEngine } = await import('@/hooks/useGameEngine')

const baseApp = {
  player: { id: 'p1', role: 'OBSERVER' },
  team: { id: 't1', name: 'Atlas' },
  role: 'OBSERVER',
  isInitializing: false,
  isAuthenticated: true,
  refreshGameState: vi.fn().mockResolvedValue(undefined),
  refreshTeamProgress: vi.fn().mockResolvedValue(undefined),
  gameState: null,
  teamProgress: { currentNodeId: 'P01', availableNodeIds: ['P01'] },
  notifications: [],
  markNotificationRead: vi.fn(),
}

beforeEach(() => {
  useApp.mockReset().mockReturnValue(baseApp)
  useOffline.mockReset().mockReturnValue({ isOnline: true, isOffline: false })
  useConnection.mockReset().mockReturnValue({ isOffline: false, lastProbe: null })
  getNode.mockReset().mockResolvedValue({ unlocked: false })
  getNodeProgress.mockReset().mockResolvedValue([])
})

async function fetch(code: string) {
  const { result } = renderHook(() => useGameEngine())
  await waitFor(() => expect(result.current.nodeProgress).toBeDefined())
  let out: unknown
  await act(async () => { out = await result.current.fetchNode(code) })
  return out
}

describe('fetchNode refusals', () => {
  it('gives a node the team was never given a sealed document, not nothing', async () => {
    // P02 exists in the index bundle but this team has no progress row for it,
    // which is exactly what the server denies.
    const node = (await fetch('P02')) as { unlocked: boolean; status: string; code: string; title: string }

    expect(node).not.toBeNull()
    expect(node.unlocked).toBe(false)
    expect(node.status).toBe('LOCKED')
    // Carrying the index identity is what lets the screen say which node is
    // sealed instead of showing an empty frame.
    expect(node.code).toBe('P02')
    expect(node.title).toBeTruthy()
  })

  it('returns null only for a code that is in no register at all', async () => {
    expect(await fetch('NOT-A-NODE')).toBeNull()
  })

  it('raises a fetch failure rather than reporting it as a sealed node', async () => {
    // "Could not ask" and "the answer is no" are different facts. Collapsing
    // them told players their node was sealed when the Bureau had never replied.
    getNode.mockRejectedValue(new Error('JWT expired'))

    const { result } = renderHook(() => useGameEngine())
    await waitFor(() => expect(result.current.nodeProgress).toBeDefined())
    await act(async () => {
      await expect(result.current.fetchNode('P01')).rejects.toThrow(/JWT expired/)
    })
  })

  it('does not stay in a loading state after a refusal', async () => {
    const { result } = renderHook(() => useGameEngine())
    await waitFor(() => expect(result.current.nodeProgress).toBeDefined())
    await act(async () => { await result.current.fetchNode('P02') })
    // A stuck `loading` flag here is the difference between "sealed" and a
    // spinner that never resolves.
    expect(result.current.isLoading('node')).toBe(false)
  })
})

describe('isNodeSolved', () => {
  it('is false for a node the team has merely been given', async () => {
    getNodeProgress.mockResolvedValue([
      { nodeId: 'n-p01', nodeCode: 'P01', title: 'The Facade', status: 'AVAILABLE', attempts: 0, hintsUsed: 0 },
      { nodeId: 'n-p02', nodeCode: 'P02', title: 'Second', status: 'IN_PROGRESS', attempts: 1, hintsUsed: 0 },
      { nodeId: 'n-p03', nodeCode: 'P03', title: 'Third', status: 'SOLVED', attempts: 2, hintsUsed: 1 },
    ])

    const { result } = renderHook(() => useGameEngine())
    await waitFor(() => expect(result.current.nodeProgress).toHaveLength(3))

    expect(result.current.isNodeSolved('P01')).toBe(false)
    expect(result.current.isNodeSolved('P02')).toBe(false)
    expect(result.current.isNodeSolved('P03')).toBe(true)
    // A row that exists in no state at all is not a solve.
    expect(result.current.isNodeSolved('P04')).toBe(false)
  })
})
