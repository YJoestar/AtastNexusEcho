/**
 * NEXUS — Bureau Tests
 *
 * Tests for useBureau hook, adminAPI data flow,
 * and realtime subscription management.
 *
 * All Supabase calls are mocked — no network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBureau, useBureauRealtime } from '@/hooks/useBureau'

const mockTeams = vi.hoisted(() => [
  {
    id: 'team-1',
    name: 'ALPHA SQUAD',
    code: 'ALP123',
    status: 'ACTIVE',
    createdAt: '2026-09-29T12:00:00Z',
    startedAt: '2026-09-29T13:00:00Z',
    completedAt: null,
    currentNodeId: 'node-1',
    score: 2850,
    metadata: {},
    playerCount: 3,
    playerRoles: ['OBSERVER', 'ANALYST', 'OPERATOR'],
    hintsUsed: 2,
    solvedCount: 8,
    currentNodeCode: 'P08',
    gameStartedAt: '2026-09-29T13:00:00Z',
    gameDeadline: '2026-09-29T16:00:00Z',
    gameDurationMinutes: 180,
  },
  {
    id: 'team-2',
    name: 'BETA TEAM',
    code: 'BTA456',
    status: 'PAUSED',
    createdAt: '2026-09-29T12:00:00Z',
    startedAt: '2026-09-29T13:30:00Z',
    completedAt: null,
    currentNodeId: 'node-2',
    score: 1850,
    metadata: {},
    playerCount: 3,
    playerRoles: ['OBSERVER', 'ANALYST', 'OPERATOR'],
    hintsUsed: 1,
    solvedCount: 5,
    currentNodeCode: 'P05',
    gameStartedAt: '2026-09-29T13:30:00Z',
    gameDeadline: '2026-09-29T16:30:00Z',
    gameDurationMinutes: 180,
  },
  {
    id: 'team-3',
    name: 'GAMMA FORCE',
    code: 'GAM789',
    status: 'COMPLETED',
    createdAt: '2026-09-29T12:00:00Z',
    startedAt: '2026-09-29T11:00:00Z',
    completedAt: '2026-09-29T14:30:00Z',
    currentNodeId: null,
    score: 3200,
    metadata: {},
    playerCount: 3,
    playerRoles: ['OBSERVER', 'ANALYST', 'OPERATOR'],
    hintsUsed: 0,
    solvedCount: 10,
    currentNodeCode: null,
    gameStartedAt: '2026-09-29T11:00:00Z',
    gameDeadline: '2026-09-29T14:00:00Z',
    gameDurationMinutes: 180,
  },
  {
    id: 'team-4',
    name: 'DELTA UNIT',
    code: 'DEL012',
    status: 'READY',
    createdAt: '2026-09-29T12:00:00Z',
    startedAt: null,
    completedAt: null,
    currentNodeId: null,
    score: 0,
    metadata: {},
    playerCount: 2,
    playerRoles: ['OBSERVER', 'ANALYST'],
    hintsUsed: 0,
    solvedCount: 0,
    currentNodeCode: null,
    gameStartedAt: null,
    gameDeadline: null,
    gameDurationMinutes: 180,
  },
])

const mockGameState = vi.hoisted(() => ({
  gameStatus: 'RUNNING' as const,
  statusCounts: {
    REGISTERED: 2,
    READY: 3,
    ACTIVE: 18,
    PAUSED: 2,
    COMPLETED: 3,
  },
  totalTeams: 25,
  config: {
    max_teams: 25,
    players_per_team: 3,
    game_duration_minutes: 180,
    rolling_start_interval_minutes: 10,
    game_deadline: '2026-09-29T16:00:00Z',
    game_started_at: '2026-09-29T13:00:00Z',
  },
}))

const mockLeaderboard = vi.hoisted(() => [
  { rank: 1, teamId: 'team-3', teamName: 'GAMMA FORCE', teamCode: 'GAM789', score: 3200, status: 'COMPLETED', startedAt: '2026-09-29T11:00:00Z', completedAt: '2026-09-29T14:30:00Z', currentNodeCode: null, currentNodeId: null, hintsUsed: 0, timeElapsedMinutes: 210, solvedCount: 10 },
  { rank: 2, teamId: 'team-1', teamName: 'ALPHA SQUAD', teamCode: 'ALP123', score: 2850, status: 'ACTIVE', startedAt: '2026-09-29T13:00:00Z', completedAt: null, currentNodeCode: 'P08', currentNodeId: 'node-1', hintsUsed: 2, timeElapsedMinutes: 90, solvedCount: 8 },
])

const mockAuditLog = vi.hoisted(() => [
  { id: 'audit-1', adminId: 'admin-1', action: 'TEAM_START', targetTeamId: 'team-1', targetPlayerId: null, targetNodeId: null, payload: {}, reason: 'Game started', ipAddress: '192.168.1.1', createdAt: '2026-09-29T13:00:00Z', revertedAt: null, revertedBy: null },
  { id: 'audit-2', adminId: 'admin-1', action: 'HINT_GRANT', targetTeamId: 'team-1', targetPlayerId: null, targetNodeId: 'node-5', payload: { hintNumber: 1 }, reason: 'Player requested hint', ipAddress: '192.168.1.1', createdAt: '2026-09-29T13:25:00Z', revertedAt: null, revertedBy: null },
  { id: 'audit-3', adminId: 'admin-2', action: 'TEAM_CREATE', targetTeamId: 'team-4', targetPlayerId: null, targetNodeId: null, payload: {}, reason: 'Bulk team creation', ipAddress: '10.0.0.1', createdAt: '2026-09-29T12:00:00Z', revertedAt: null, revertedBy: null },
])

const mockGameEvents = vi.hoisted(() => [
  { id: 'event-1', type: 'TEAM_STARTED', timestamp: '2026-09-29T13:00:00Z', teamId: 'team-1', playerId: null, nodeId: null, payload: {}, metadata: null },
  { id: 'event-2', type: 'NODE_SOLVED', timestamp: '2026-09-29T13:45:00Z', teamId: 'team-1', playerId: 'p-1', nodeId: 'node-5', payload: { nodeCode: 'P05' }, metadata: { points: 500 } },
])

vi.mock('@/lib/admin', () => ({
  adminAPI: {
    listTeams: vi.fn().mockResolvedValue(mockTeams),
    getTeam: vi.fn().mockResolvedValue({
      team: { ...mockTeams[0], playerCount: 3 },
      players: [],
      progress: null,
      nodeProgress: [],
      hintsUsedHistory: [],
      recentSubmissions: [],
      recentEvents: [],
    }),
    getGameState: vi.fn().mockResolvedValue(mockGameState),
    getLeaderboard: vi.fn().mockResolvedValue(mockLeaderboard),
    getAuditLog: vi.fn().mockResolvedValue(mockAuditLog),
    getGameEvents: vi.fn().mockResolvedValue(mockGameEvents),
    startTeam: vi.fn().mockResolvedValue({ teamId: 'team-1', startedAt: '2026-09-29T13:00:00Z' }),
    pauseTeam: vi.fn().mockResolvedValue({ teamId: 'team-1' }),
    resumeTeam: vi.fn().mockResolvedValue({ teamId: 'team-1' }),
    completeTeam: vi.fn().mockResolvedValue({ teamId: 'team-1' }),
    disqualifyTeam: vi.fn().mockResolvedValue({ teamId: 'team-1' }),
    resetTeam: vi.fn().mockResolvedValue({ teamId: 'team-1' }),
    sendNotification: vi.fn().mockResolvedValue({ teamsNotified: 1 }),
    grantHint: vi.fn().mockResolvedValue({ hintContent: 'Test hint' }),
    createTeamWithPlayers: vi.fn().mockResolvedValue({ success: true, teamId: 'team-new', teamCode: 'NEW001', playerCodes: ['CODE1', 'CODE2'] }),
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation(cb => {
        cb('SUBSCRIBED')
        return 'channel'
      }),
    }),
    removeChannel: vi.fn(),
  },
}))

describe('useBureau Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchTeams', () => {
    it('loads teams successfully', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchTeams()
      })

      expect(result.current.teams).toHaveLength(4)
      expect(result.current.teams).toHaveLength(4)
      expect(result.current.isLoading).toBe(false)
    })

    it('sets isLoading during fetch', async () => {
      const { result } = renderHook(() => useBureau())

      let promise: Promise<unknown>
      act(() => {
        promise = result.current.fetchTeams()
      })

      expect(result.current.isLoading).toBe(true)
      await act(async () => {
        await promise
      })
      expect(result.current.isLoading).toBe(false)
    })

    it('handles errors gracefully', async () => {
      const { adminAPI } = await import('@/lib/admin')
      vi.mocked(adminAPI.listTeams).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchTeams()
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.teams).toHaveLength(0)
    })
  })

  describe('fetchGameState', () => {
    it('loads game state successfully', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchGameState()
      })

      expect(result.current.gameState).toBeDefined()
      expect(result.current.gameState?.gameStatus).toBe('RUNNING')
      expect(result.current.gameState?.totalTeams).toBe(25)
    })
  })

  describe('fetchTeamDetail', () => {
    it('loads team detail by ID', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchTeamDetail('team-1')
      })

      expect(result.current.teamDetail).toBeDefined()
      expect(result.current.teamDetail?.team.id).toBe('team-1')
    })
  })

  describe('fetchLeaderboard', () => {
    it('loads leaderboard successfully', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchLeaderboard()
      })

      expect(result.current.leaderboard).toHaveLength(2)
      expect(result.current.leaderboard[0].rank).toBe(1)
    })
  })

  describe('fetchAuditLog', () => {
    it('loads audit log successfully', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchAuditLog()
      })

      expect(result.current.auditLog).toHaveLength(3)
      expect(result.current.auditLog[0].action).toBe('TEAM_START')
    })
  })

  describe('fetchGameEvents', () => {
    it('loads game events successfully', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchGameEvents()
      })

      expect(result.current.gameEvents).toHaveLength(2)
      expect(result.current.gameEvents[0].type).toBe('TEAM_STARTED')
    })
  })

  describe('team query helpers', () => {
    it('getTeamById returns correct team', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchTeams()
      })

      const team = result.current.getTeamById('team-1')
      expect(team).toBeDefined()
      expect(team?.name).toBe('ALPHA SQUAD')
    })

    it('getTeamById returns undefined for unknown ID', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchTeams()
      })

      expect(result.current.getTeamById('nonexistent')).toBeUndefined()
    })

    it('getTeamsByStatus filters correctly', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.fetchTeams()
      })

      const activeTeams = result.current.getTeamsByStatus('ACTIVE')
      expect(activeTeams).toHaveLength(1)
      expect(activeTeams[0].status).toBe('ACTIVE')

      const completedTeams = result.current.getTeamsByStatus('COMPLETED')
      expect(completedTeams).toHaveLength(1)
      expect(completedTeams[0].status).toBe('COMPLETED')
    })
  })

  describe('refreshAll', () => {
    it('refreshes all data sources', async () => {
      const { result } = renderHook(() => useBureau())

      await act(async () => {
        await result.current.refreshAll()
      })

      expect(result.current.teams).toHaveLength(4)
      expect(result.current.gameState).toBeDefined()
      expect(result.current.leaderboard).toHaveLength(2)
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      const { result } = renderHook(() => useBureau())

      expect(result.current.error).toBeNull()
      result.current.clearError()
      expect(result.current.error).toBeNull()
    })
  })
})

describe('useBureauRealtime Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns connected state', () => {
      const { result } = renderHook(() => useBureauRealtime())
      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionStatus).toBe('LIVE')
    })

    it('returns connection info', () => {
      const { result } = renderHook(() => useBureauRealtime())
      expect(result.current.connectionInfo).toBeDefined()
      expect(result.current.connectionInfo.isConnected).toBe(true)
    })
  })

  describe('subscribe', () => {
    it('creates a channel and subscribes', () => {
      const { result } = renderHook(() => useBureauRealtime())
      const callback = vi.fn()

      act(() => {
        result.current.subscribe('test-channel', {
          event: '*',
          schema: 'public',
          table: 'teams',
        }, callback)
      })

      expect(result.current.isConnected).toBe(true)
    })

    it('unsubscribe removes the channel', () => {
      const { result } = renderHook(() => useBureauRealtime())

      act(() => {
        result.current.subscribe('test-channel', {
          event: '*',
          schema: 'public',
          table: 'teams',
        }, vi.fn())
      })

      act(() => {
        result.current.unsubscribe('test-channel')
      })

      expect(result.current.isConnected).toBe(true)
    })

    it('unsubscribeAll removes all channels', () => {
      const { result } = renderHook(() => useBureauRealtime())

      act(() => {
        result.current.subscribe('ch1', { event: '*', schema: 'public', table: 'teams' }, vi.fn())
        result.current.subscribe('ch2', { event: '*', schema: 'public', table: 'teams' }, vi.fn())
      })

      act(() => {
        result.current.unsubscribeAll()
      })

      expect(result.current.isConnected).toBe(true)
    })
  })

  describe('online/offline events', () => {
    it('updates connection status on window offline event', () => {
      const { result } = renderHook(() => useBureauRealtime())

      act(() => {
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionStatus).toBe('OFFLINE')

      act(() => {
        window.dispatchEvent(new Event('online'))
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionStatus).toBe('LIVE')
    })
  })
})
