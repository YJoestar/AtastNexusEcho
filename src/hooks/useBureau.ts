/**
 * NEXUS — Bureau Data Hook
 *
 * Central data management for Bureau operations.
 * Provides team lists, team details, game state, leaderboard,
 * audit log, and live activity feed.
 *
 * All mutations go through the adminAPI which calls Edge Functions
 * with service-role verification. The browser is untrusted.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { adminAPI, type TeamWithStats, type TeamDetailFull, type GameStateAdmin, type LeaderboardEntryAdmin, type AuditLogEntryAdmin, type GameEventAdmin, type LocationEntry } from '@/lib/admin'
import { supabase } from '@/lib/supabase'
import type { TeamStatus } from '@/types'

export interface BureauState {
  teams: TeamWithStats[]
  teamDetail: TeamDetailFull | null
  gameState: GameStateAdmin | null
  leaderboard: LeaderboardEntryAdmin[]
  auditLog: AuditLogEntryAdmin[]
  gameEvents: GameEventAdmin[]
  locations: LocationEntry[]
  isLoading: boolean
  error: string | null
}

const BUREAU_REFRESH_INTERVAL = 15000

export function useBureau() {
  const [teams, setTeams] = useState<TeamWithStats[]>([])
  const [teamDetail, setTeamDetail] = useState<TeamDetailFull | null>(null)
  const [gameState, setGameState] = useState<GameStateAdmin | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryAdmin[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntryAdmin[]>([])
  const [gameEvents, setGameEvents] = useState<GameEventAdmin[]>([])
  const [locations, setLocations] = useState<LocationEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  /**
   * `isLoading` is a count, not a boolean.
   *
   * `refreshAll` fires five requests at once. With a plain boolean, whichever
   * returned first cleared the flag and the dashboard rendered as "loaded" while
   * four of its five panels were still empty - so a slow game-state call showed
   * a populated table with no state above it, which reads as a real outage
   * rather than a request still in flight.
   */
  const [pending, setPending] = useState(0)
  const isLoading = pending > 0

  const begin = useCallback(() => setPending(count => count + 1), [])
  const end = useCallback(() => setPending(count => Math.max(0, count - 1)), [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchTeams = useCallback(async () => {
    begin()
    setError(null)
    try {
      const data = await adminAPI.listTeams()
      setTeams(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      end()
    }
  }, [begin, end])

  const fetchTeamDetail = useCallback(async (teamId: string) => {
    begin()
    setError(null)
    try {
      const detail = await adminAPI.getTeam(teamId)
      setTeamDetail(detail)
      return detail
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load team'
      setError(msg)
      throw err
    } finally {
      end()
    }
  }, [begin, end])

  const fetchGameState = useCallback(async () => {
    begin()
    try {
      const state = await adminAPI.getGameState()
      setGameState(state)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load game state')
    } finally {
      end()
    }
  }, [begin, end])

  const fetchLeaderboard = useCallback(async (sortBy = 'rank', sortDir: 'asc' | 'desc' = 'desc') => {
    begin()
    try {
      const data = await adminAPI.getLeaderboard(sortBy, sortDir)
      setLeaderboard(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      end()
    }
  }, [begin, end])

  const fetchAuditLog = useCallback(async (limit = 100, actionFilter?: string, search?: string) => {
    begin()
    try {
      const data = await adminAPI.getAuditLog(limit, actionFilter, search)
      setAuditLog(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      end()
    }
  }, [begin, end])

   const fetchGameEvents = useCallback(async (limit = 50, teamId?: string) => {
    begin()
    try {
      const data = await adminAPI.getGameEvents(limit, teamId)
      setGameEvents(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load game events')
    } finally {
      end()
    }
  }, [begin, end])

   const fetchLocations = useCallback(async () => {
    begin()
    setError(null)
    try {
      const data = await adminAPI.listLocations()
      setLocations(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load locations')
    } finally {
      end()
    }
  }, [begin, end])

   const saveLocation = useCallback(async (params: {
    nodeId?: string
    nodeCode?: string
    name: string
    status?: 'ACTIVE' | 'INACTIVE'
    reason?: string
  }) => {
    setError(null)
    // A failed write has to reach the operator through the bureau's own error
    // channel, not only as a rejected promise. These cleared `error` and then
    // let the rejection escape to whichever caller happened to remember to
    // catch it, so a rejected location edit could leave the console reporting
    // the previous, unrelated message.
    try {
      const result = await adminAPI.saveLocation(params)
      await fetchLocations()
      return result
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save location')
      throw err
    }
  }, [fetchLocations])

   const deleteLocation = useCallback(async (nodeId?: string, reason?: string) => {
    setError(null)
    try {
      const result = await adminAPI.deleteLocation(nodeId, reason)
      await fetchLocations()
      return result
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete location')
      throw err
    }
  }, [fetchLocations])


  const getTeamById = useCallback((teamId: string): TeamWithStats | undefined => {
    return teams.find(t => t.id === teamId)
  }, [teams])

  const getTeamsByStatus = useCallback((status: TeamStatus): TeamWithStats[] => {
    return teams.filter(t => t.status === status)
  }, [teams])

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchTeams(),
      fetchGameState(),
      fetchLeaderboard(),
      fetchGameEvents(50),
      fetchLocations(),
    ])
  }, [fetchTeams, fetchGameState, fetchLeaderboard, fetchGameEvents, fetchLocations])

  const bureauState: BureauState = {
    teams,
    teamDetail,
    gameState,
    leaderboard,
    auditLog,
    gameEvents,
    locations,
    isLoading,
    error,
  }

  return {
    ...bureauState,
    teams,
    teamDetail,
    gameState,
    leaderboard,
    auditLog,
    gameEvents,
    locations,
    fetchTeams,
    fetchTeamDetail,
    fetchGameState,
    fetchLeaderboard,
    fetchAuditLog,
    fetchGameEvents,
    fetchLocations,
    saveLocation,
    deleteLocation,
    refreshAll,
    getTeamById,
    getTeamsByStatus,
    clearError,
    setError,
    BUREAU_REFRESH_INTERVAL,
  }
}

export function useBureauRealtime() {
  const [isConnected, setIsConnected] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const channelsRef = useRef<Map<string, unknown>>(new Map())

  const subscribe = useCallback((
    channelName: string,
    config: {
      event: string
      schema: string
      table: string
      filter?: string
    },
    callback: (payload: unknown) => void,
  ) => {
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes' as never, config as never, callback as never)
      .subscribe(((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setLastSync(new Date())
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
        }
      }) as never)

    channelsRef.current.set(channelName, ch)
    return ch
  }, [])

  const unsubscribe = useCallback((channelName: string) => {
    const ch = channelsRef.current.get(channelName)
    if (ch) {
      supabase.removeChannel(ch as Parameters<typeof supabase.removeChannel>[0])
      channelsRef.current.delete(channelName)
    }
  }, [])

  const unsubscribeAll = useCallback(() => {
    channelsRef.current.forEach((ch, name) => {
      supabase.removeChannel(ch as Parameters<typeof supabase.removeChannel>[0])
      channelsRef.current.delete(name)
    })
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsConnected(true)
    const handleOffline = () => setIsConnected(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribeAll()
    }
  }, [unsubscribeAll])

  const getConnectedStatus = (): 'LIVE' | 'RECONNECTING' | 'OFFLINE' => {
    if (!isConnected) return 'OFFLINE'
    return 'LIVE'
  }

  const getSignalStrength = (): number => {
    if (!isConnected || !lastSync) return 0
    const ageMs = Date.now() - lastSync.getTime()
    const maxAge = 30000
    const strength = Math.max(0, Math.min(100, 100 - (ageMs / maxAge) * 100))
    return Math.round(strength / 10) * 10
  }

  const getConnectionInfo = () => ({
    status: getConnectedStatus(),
    signalStrength: getSignalStrength(),
    lastSync,
    isConnected,
  })

  return {
    isConnected,
    lastSync,
    connectionStatus: getConnectedStatus(),
    connectionInfo: getConnectionInfo(),
    signalStrength: getSignalStrength(),
    subscribe,
    unsubscribe,
    unsubscribeAll,
  }
}
