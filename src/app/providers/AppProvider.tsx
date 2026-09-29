/**
 * NEXUS — App Provider
 *
 * Manages player authentication state using Supabase Auth sessions
 * and device binding. Replaces the legacy localStorage-based approach.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { Player, Team, Role, TeamStatus, PlayerStatus, TeamProgress, Notification, GameState, NodeProgress, ProgressMetadata, GameStatus, GamePhase } from '@/types'
import { supabase } from '@/lib/supabase'
import { gameAPI } from '@/lib/game'
import { collectDeviceFingerprint, hashDeviceFingerprint } from '@/lib/auth'

interface AppContextValue {
  player: Player | null
  team: Team | null
  role: Role | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (accessCode: string, deviceInfo?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshGameState: () => Promise<void>
  refreshTeamProgress: () => Promise<void>
  gameState: GameState | null
  teamProgress: TeamProgress | null
  notifications: Notification[]
  unreadCount: number
  markNotificationRead: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const PLAYER_LOGIN_FUNCTION = 'player-login'

export function AppProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [teamProgress, setTeamProgress] = useState<TeamProgress | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isInitializing, setIsInitializing] = useState(true)

  const role = player?.role ?? null
  const isAuthenticated = !!player && !!team

  useEffect(() => {
    const init = async () => {
      // Try to load existing session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.warn('Session load error:', sessionError)
      }

      if (session?.user) {
        await loadPlayerSession(session.user.id)
      }

      setIsInitializing(false)
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlayerSession = useCallback(async (authUserId: string) => {
    try {
      const { data: playerData, error } = await supabase
        .from('players')
        .select('*, teams(*)')
        .eq('auth_user_id', authUserId)
        .single()

      if (error || !playerData) {
        console.warn('Player not found for auth user')
        return
      }

      const mappedPlayer: Player = {
        id: playerData.id,
        teamId: playerData.team_id,
        role: playerData.role as Role,
        displayName: playerData.display_name,
        joinedAt: playerData.joined_at ?? '',
        isConnected: playerData.is_connected ?? false,
        lastSeenAt: playerData.last_seen_at,
        deviceInfo: playerData.device_info as unknown as Player['deviceInfo'],
        status: playerData.status as PlayerStatus,
        createdAt: playerData.created_at,
        loginCodeHash: playerData.login_code_hash,
        authUserId: playerData.auth_user_id,
        deviceSessionToken: playerData.device_session_token,
        deviceFingerprintHash: playerData.device_fingerprint_hash,
      }

      const t = playerData.teams
      const mappedTeam: Team = {
        id: t.id,
        name: t.name,
        code: t.code,
        status: t.status as TeamStatus,
        createdAt: t.created_at,
        startedAt: t.started_at,
        completedAt: t.completed_at,
        currentNodeId: t.current_node_id,
        score: t.score,
        metadata: t.metadata as unknown as Team['metadata'],
      }
      setPlayer(mappedPlayer)
      setTeam(mappedTeam)

      // Subscribe to realtime team status changes
      const channel = supabase
        .channel(`team:${mappedTeam.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${mappedTeam.id}` },
          (payload) => {
            const updatedTeam = payload.new as typeof t
            setTeam(prev => ({
              ...(prev as Team),
              status: updatedTeam.status as TeamStatus,
              score: updatedTeam.score,
              startedAt: updatedTeam.started_at,
              completedAt: updatedTeam.completed_at,
            }))
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error('Failed to load player session:', error)
    }
  }, [])

  const login = useCallback(async (accessCode: string, deviceInfo?: Record<string, unknown>) => {
    try {
      // Collect and hash device fingerprint
      const fingerprint = collectDeviceFingerprint()
      const fingerprintHash = await hashDeviceFingerprint(fingerprint)

      const { data: result, error: funcError } = await supabase.functions.invoke<{
        success: boolean
        error?: string
        player?: {
          id: string
          teamId: string
          role: string
          displayName: string
        }
        team?: {
          name: string
          status: string
        }
        session?: {
          access_token: string
          refresh_token: string
        }
      }>(PLAYER_LOGIN_FUNCTION, {
        method: 'POST',
        body: JSON.stringify({
          code: accessCode.toUpperCase(),
          deviceFingerprint: fingerprintHash,
          deviceInfo: { ...fingerprint, ...deviceInfo },
        }),
      })

      if (funcError || !result || !result.success) {
        return { success: false, error: result?.error ?? funcError?.message ?? 'Login failed' }
      }

      // The edge function returns the auth session tokens directly.
      // Set the session in the browser's Supabase Auth client.
      if (result.session) {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })
      }

      if (!result.player || !result.team) {
        return { success: false, error: 'Login response missing player data' }
      }

      // Map player from the edge function response
      const mappedPlayer: Player = {
        id: result.player.id,
        teamId: result.player.teamId,
        role: result.player.role as Role,
        displayName: result.player.displayName,
        joinedAt: new Date().toISOString(),
        isConnected: true,
        lastSeenAt: new Date().toISOString(),
        deviceInfo: undefined,
        status: 'ACTIVE' as PlayerStatus,
        createdAt: new Date().toISOString(),
        loginCodeHash: null,
        authUserId: null,
        deviceSessionToken: null,
        deviceFingerprintHash: null,
      }

      const mappedTeam: Team = {
        id: result.player.teamId,
        name: result.team.name,
        code: '',
        status: result.team.status as TeamStatus,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        currentNodeId: null,
        score: 0,
        metadata: { registeredBy: 'PLAYER', assignedRoles: false } as Team['metadata'],
      }

      setPlayer(mappedPlayer)
      setTeam(mappedTeam)

      // Store non-sensitive session metadata for quick UI recovery
      // NOTE: Access tokens are managed by Supabase Auth (cookies/memory),
      // NOT stored in localStorage to prevent XSS token theft.
      const sessionMeta = {
        playerId: result.player.id,
        teamId: result.player.teamId,
        role: result.player.role as Role,
        displayName: result.player.displayName,
        teamName: result.team.name,
        teamStatus: result.team.status as TeamStatus,
        deviceFingerprint: fingerprintHash,
        createdAt: new Date().toISOString(),
      }

      localStorage.setItem('nexus_player_session', JSON.stringify(sessionMeta))

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setPlayer(null)
    setTeam(null)
    setGameState(null)
    setTeamProgress(null)
    setNotifications([])
    localStorage.removeItem('nexus_player_session')
  }, [])

  const refreshGameState = useCallback(async () => {
    if (!team) return
    try {
      const state = await gameAPI.getGameState()
      const gameState: GameState = {
        status: state.team.status as GameStatus,
        startedAt: state.team.startedAt ?? null,
        endsAt: state.team.deadline ?? null,
        currentPhase: 'GAMEPLAY' as GamePhase,
        config: {
          maxTeams: 25,
          playersPerTeam: 3,
          gameDurationMinutes: 180,
          rollingStartIntervalMinutes: 10,
          autoAssignRoles: false,
          requireAllRoles: true,
        },
      }
      setGameState(gameState)
    } catch (error) {
      console.error('Failed to refresh game state:', error)
    }
  }, [team])

  const refreshTeamProgress = useCallback(async () => {
    if (!team) return
    try {
      const progress = await gameAPI.getNodeProgress()
      const solvedNodes: Record<string, NodeProgress> = {}
      progress.forEach((entry: { nodeId: string; nodeCode: string; title: string; status: string }) => {
        solvedNodes[entry.nodeId] = {
          nodeId: entry.nodeId,
          status: entry.status as NodeProgress['status'],
          startedAt: null,
          solvedAt: null,
          attempts: 0,
          hintsUsed: 0,
          timeSpentSeconds: 0,
          solvedByRole: null,
          submissions: [],
        }
      })

      const gameState = await gameAPI.getGameState()
      setTeamProgress({
        teamId: team.id,
        solvedNodes,
        currentNodeId: gameState.currentNode?.code ?? null,
        availableNodeIds: [],
        evidenceOwned: [],
        inventoryOwned: {},
        fragmentsOwned: [],
        score: gameState.team.score,
        hintsUsed: 0,
        hintsAvailable: 3,
        timeElapsedMinutes: gameState.team.startedAt
          ? Math.floor((Date.now() - new Date(gameState.team.startedAt).getTime()) / 60000)
          : 0,
        timeRemainingMinutes: gameState.team.deadline
          ? Math.max(0, Math.floor((new Date(gameState.team.deadline).getTime() - Date.now()) / 60000))
          : 180,
        startedAt: gameState.team.startedAt ?? null,
        lastActivityAt: new Date().toISOString(),
        metadata: {} as ProgressMetadata,
      })
    } catch (error) {
      console.error('Failed to refresh team progress:', error)
    }
  }, [team])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
    )
  }, [])

  const value: AppContextValue = {
    player,
    team,
    role,
    isAuthenticated,
    isInitializing,
    login,
    logout,
    gameState,
    teamProgress,
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    markNotificationRead,
    refreshGameState,
    refreshTeamProgress,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
