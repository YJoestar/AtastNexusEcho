/**
 * NEXUS — App Provider
 *
 * Manages player authentication state using Supabase Auth sessions
 * and device binding. Replaces the legacy localStorage-based approach.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import type { Player, Team, Role, TeamStatus, PlayerStatus, TeamProgress, Notification, GameState, NodeProgress, ProgressMetadata, GamePhase } from '@/types'
import { supabase } from '@/lib/supabase'
import { gameAPI } from '@/lib/game'
import { collectDeviceFingerprint, hashDeviceFingerprint } from '@/lib/auth'
import { toGameStatus } from '@/lib/auth/team-state-machine'
import { QASimulatorContext } from '@/contexts/QASimulatorContext'

/**
 * Pull the server's own words out of a failed edge function call. supabase-js
 * hands back a non-2xx response as an error whose body holds the real reason,
 * and that reason is often the only actionable thing the player can be told.
 */
function readFunctionErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const context = (error as { context?: unknown }).context
  if (!context || typeof context !== 'object') return null
  const message = (context as { error?: unknown }).error
  return typeof message === 'string' && message.length > 0 ? message : null
}

const PLAYER_SESSION_STORAGE_KEY = 'nexus_player_session'

/** Storage is a convenience: a full, blocked or private-mode store must never fail a login. */
function safeStorageSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value) } catch { /* optional */ }
}

function safeStorageRemove(key: string): void {
  try { window.localStorage.removeItem(key) } catch { /* optional */ }
}

export interface AppContextValue {
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
  refreshNotifications: () => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue | null>(null)

const PLAYER_LOGIN_FUNCTION = 'player-login'

const NOTIFICATION_TYPES = new Set([
  'SYSTEM', 'PUZZLE_UNLOCKED', 'PUZZLE_SOLVED', 'EVIDENCE_FOUND', 'ITEM_ACQUIRED',
  'FRAGMENT_REVEALED', 'HINT_AVAILABLE', 'TIME_WARNING', 'ROLE_ACTION_REQUIRED',
  'ADMIN_MESSAGE', 'GAME_PHASE_CHANGE', 'TEAM_STATUS_CHANGE',
])

/** The server sends free-form strings; narrow them to the known union. */
function toNotificationType(raw: string): Notification['type'] {
  return NOTIFICATION_TYPES.has(raw) ? (raw as Notification['type']) : 'SYSTEM'
}

function toNotificationPriority(raw: string): Notification['priority'] {
  return raw === 'LOW' || raw === 'HIGH' || raw === 'CRITICAL' ? raw : 'NORMAL'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [teamProgress, setTeamProgress] = useState<TeamProgress | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isInitializing, setIsInitializing] = useState(true)

  const role = player?.role ?? null
  const isAuthenticated = !!player && !!team

  // Guards against setState after unmount, and against a slow response for one
  // user landing after the session has moved on to another.
  const mountedRef = useRef(true)
  const authUserIdRef = useRef<string | null>(null)
  const loginInFlightRef = useRef<Promise<{ success: boolean; error?: string }> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const clearSessionState = useCallback(() => {
    authUserIdRef.current = null
    setPlayer(null)
    setTeam(null)
    setGameState(null)
    setTeamProgress(null)
    setNotifications([])
    safeStorageRemove(PLAYER_SESSION_STORAGE_KEY)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        // Try to load existing session. An expired session whose refresh token
        // is rejected comes back as no session, not as a crash.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.warn('Session load error:', sessionError)
        }

        if (session?.user && mountedRef.current) {
          authUserIdRef.current = session.user.id
          await loadPlayerSession(session.user.id)
        }
      } catch (error) {
        // A rejected getSession() must not leave the guards on "Loading session…" forever.
        console.error('Session init failed:', error)
      } finally {
        if (mountedRef.current) setIsInitializing(false)
      }
    }

    void init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the Supabase session after startup: sign-out or sign-in in another
  // tab, and a token refresh that fails (supabase-js then emits SIGNED_OUT).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer: supabase-js holds its auth lock while it runs this callback, so
      // calling back into the client synchronously can deadlock.
      setTimeout(() => {
        if (!mountedRef.current) return
        if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          clearSessionState()
          return
        }
        const nextUserId = session?.user?.id ?? null
        if (
          nextUserId &&
          authUserIdRef.current !== null &&
          nextUserId !== authUserIdRef.current &&
          (event === 'SIGNED_IN' || event === 'USER_UPDATED')
        ) {
          // Another tab signed in as someone else: this tab must not keep
          // showing (or acting as) the previous player.
          authUserIdRef.current = nextUserId
          void loadPlayerSession(nextUserId)
        }
      }, 0)
    })
    return () => subscription.unsubscribe()
  }, [clearSessionState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime team status; owned by an effect so it is torn down on logout/unmount.
  const teamId = team?.id
  useEffect(() => {
    if (!teamId) return
    const channel = supabase
      .channel(`team:${teamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` },
        (payload) => {
          const updatedTeam = payload.new as {
            status: string
            score: number
            started_at: string | null
            completed_at: string | null
          }
          setTeam(prev => prev && {
            ...prev,
            status: updatedTeam.status as TeamStatus,
            score: updatedTeam.score,
            startedAt: updatedTeam.started_at,
            completedAt: updatedTeam.completed_at,
          })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [teamId])

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
      // Stale: unmounted, or the session moved to another user while we fetched.
      if (!mountedRef.current || authUserIdRef.current !== authUserId) return
      setPlayer(mappedPlayer)
      setTeam(mappedTeam)
    } catch (error) {
      console.error('Failed to load player session:', error)
    }
  }, [])

  const performLogin = useCallback(async (accessCode: string, deviceInfo?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
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
        // A non-2xx response still carries the server's own explanation in the
        // error body — for example "this phone is already registered to another
        // player". Falling back to a generic message would leave the player
        // guessing, so the server's words win whenever there are any.
        const serverMessage = readFunctionErrorMessage(funcError)
        return {
          success: false,
          error: result?.error ?? serverMessage ?? 'Login failed',
        }
      }

      // The edge function returns the auth session tokens directly.
      // Set the session in the browser's Supabase Auth client.
      if (result.session) {
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })
        if (setSessionError) {
          return { success: false, error: 'Could not start a secure session. Please try again.' }
        }
        authUserIdRef.current = sessionData?.user?.id ?? null
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

      if (mountedRef.current) {
        setPlayer(mappedPlayer)
        setTeam(mappedTeam)
      }

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

      safeStorageSet(PLAYER_SESSION_STORAGE_KEY, JSON.stringify(sessionMeta))

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }, [])

  // A second submit while one is in flight (double tap, Enter + click) joins the
  // first instead of starting another login against the one-time code.
  const login = useCallback((accessCode: string, deviceInfo?: Record<string, unknown>) => {
    if (loginInFlightRef.current) return loginInFlightRef.current
    const attempt = performLogin(accessCode, deviceInfo).finally(() => {
      loginInFlightRef.current = null
    })
    loginInFlightRef.current = attempt
    return attempt
  }, [performLogin])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // Offline or server error: the local session is still ended below.
      console.warn('Sign out failed:', error)
    } finally {
      if (mountedRef.current) clearSessionState()
      else authUserIdRef.current = null
    }
  }, [clearSessionState])

  const refreshGameState = useCallback(async () => {
    if (!team) return
    try {
      const state = await gameAPI.getGameState()
      const gameState: GameState = {
        // Translated, not cast: the database speaks ACTIVE/COMPLETED and the UI
        // speaks RUNNING/ENDED, so the old `as GameStatus` silently sent every live
        // status to the UI's `default` branch and rendered "Unknown".
        status: toGameStatus(state.team.status),
        startedAt: state.team.startedAt ?? null,
        endsAt: state.team.deadline ?? null,
        currentPhase: 'GAMEPLAY' as GamePhase,
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
        availableNodeIds: gameState.progress?.availableNodeIds ?? [],
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

  /**
   * Fetch the team's notifications from the server.
   * The backend (game-notifications -> get_team_notifications) is RLS-scoped to
   * the caller's own team, so this can only ever return the player's own team's
   * messages.
   */
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await gameAPI.getNotifications(false)
      setNotifications(
        data.map(n => ({
          id: n.id,
          teamId: team?.id ?? '',
          targetRoles: 'ALL' as const,
          type: toNotificationType(n.type),
          title: n.title,
          message: n.message,
          priority: toNotificationPriority(n.priority),
          isRead: n.isRead,
          createdAt: n.createdAt,
          readAt: null,
          actionUrl: n.actionUrl ?? undefined,
        })),
      )
    } catch (err: unknown) {
      // A failed notification fetch must never block gameplay.
      console.warn('Notification refresh failed:', err)
    }
  }, [isAuthenticated, team?.id])

  /**
   * Mark notifications read *on the server*, then reflect it locally.
   * Marking read only in local state would leave unread badges returning after
   * a refresh.
   */
  const markAllNotificationsRead = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      await gameAPI.markNotificationsRead()
    } catch (err: unknown) {
      console.warn('Mark notifications read failed:', err)
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() })))
  }, [isAuthenticated])

  // Keep notifications fresh for the session, and clear them on logout.
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      return
    }
    void refreshNotifications()
    const id = setInterval(() => { void refreshNotifications() }, 30_000)
    return () => clearInterval(id)
  }, [isAuthenticated, refreshNotifications])

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
    refreshNotifications,
    markAllNotificationsRead,
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

  // In QA Simulator mode, delegate to the simulated context so player screens
  // receive mock data without any production side effects.
  const qaContext = useContext(QASimulatorContext)

  // Hook must be called unconditionally — the empty callback is a safe no-op
  // in both QA and production paths.
  const noopRefresh = useCallback(async () => {}, [])

  if (qaContext?.isActive) {
    return {
      player: qaContext.player,
      team: qaContext.team,
      role: qaContext.player.role,
      isAuthenticated: qaContext.isAuthenticated,
      isInitializing: qaContext.isInitializing,
      login: qaContext.login,
      logout: qaContext.logout,
      refreshGameState: qaContext.refreshGameState,
      refreshTeamProgress: qaContext.refreshTeamProgress,
      gameState: qaContext.gameState ?? null,
      teamProgress: qaContext.teamProgress ?? null,
      notifications: qaContext.notifications,
      unreadCount: qaContext.notifications.filter(n => !n.isRead).length,
      markNotificationRead: qaContext.markNotificationRead,
      refreshNotifications: noopRefresh,
      markAllNotificationsRead: qaContext.markAllNotificationsRead,
    }
  }

  return context
}
