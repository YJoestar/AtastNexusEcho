/**
 * NEXUS — Admin API Client
 *
 * Typed wrappers around the bureau-operations edge function.
 * SECURITY: All calls require an authenticated admin session.
 * The browser is untrusted — all mutations go through Edge Functions
 * with service-role verification. Admin authorization is enforced
 * server-side in every edge function.
 */

import { supabase } from '../supabase/client'
import type {
  Team,
  Player,
  TeamStatus,
  AdminActionType,
} from '@/types'

class AdminAPIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminAPIError'
    this.status = status
  }
}

interface RawTeam {
  id: string
  name: string
  code: string
  status: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  score: number
  current_node_id: string | null
  current_node_code: string | null
  game_started_at: string | null
  game_deadline: string | null
  game_duration_minutes: number
  metadata: Record<string, unknown>
  player_count?: number
  player_roles?: string[]
  hints_used?: number
  solved_count?: number
}

interface RawPlayer {
  id: string
  team_id: string
  role: string
  display_name: string
  status: string
  is_connected: boolean
  last_seen_at: string | null
  created_at: string
  joined_at: string
  has_auth_user: boolean
  device_bound: boolean
  code_expires_at: string | null
}

interface RawNodeProgress {
  id: string
  team_id: string
  node_id: string
  status: string
  started_at: string | null
  solved_at: string | null
  attempts: number
  hints_used: number
  time_spent_seconds: number
  points_awarded: number
  code: string
  title: string
  type: string
  stage: number
  location: string
  created_at: string
  updated_at: string
}

interface RawHintUsed {
  id: string
  team_id: string
  node_id: string
  hint_number: number
  used_at: string
  time_penalty_seconds: number
  code: string
  title: string
}

interface RawSubmission {
  id: string
  team_id: string
  node_id: string
  player_id: string
  role: string
  submitted_answer: string
  is_correct: boolean
  attempt_number: number
  submitted_at: string
  points_awarded: number
  code: string
  title: string
}

interface RawAuditEntry {
  id: string
  admin_id: string | null
  action_type: string
  target_team_id: string | null
  target_player_id: string | null
  target_node_id: string | null
  payload: Record<string, unknown>
  reason: string
  ip_address: string | null
  created_at: string
  reverted_at: string | null
  reverted_by: string | null
}

interface RawGameEvent {
  id: string
  type: string
  timestamp: string
  team_id: string | null
  player_id: string | null
  node_id: string | null
  payload: Record<string, unknown>
  metadata: Record<string, unknown> | null
}

async function callBureau<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('bureau-operations', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

  if (error) {
    throw new AdminAPIError(500, error.message)
  }

  const result = data as { success?: boolean; error?: string } | null

  if (!result) {
    throw new AdminAPIError(500, 'No response from server')
  }

  if (result.error && !result.success) {
    throw new AdminAPIError(400, result.error)
  }

  return data as unknown as T
}

function formatTeam(raw: RawTeam): Team {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    status: raw.status as TeamStatus,
    createdAt: raw.created_at,
    startedAt: raw.started_at,
    completedAt: raw.completed_at,
    currentNodeId: raw.current_node_id,
    score: raw.score,
    metadata: (raw.metadata || {}) as unknown as Team['metadata'],
  }
}

function formatPlayer(raw: RawPlayer): Player {
  return {
    id: raw.id,
    teamId: raw.team_id,
    role: raw.role as Player['role'],
    displayName: raw.display_name,
    joinedAt: raw.joined_at,
    isConnected: raw.is_connected,
    lastSeenAt: raw.last_seen_at,
    deviceInfo: undefined,
    status: raw.status as Player['status'],
    createdAt: raw.created_at,
    loginCodeHash: null,
    authUserId: null,
    deviceSessionToken: null,
    deviceFingerprintHash: null,
  }
}

export interface TeamWithStats extends Team {
  playerCount: number
  playerRoles: string[]
  hintsUsed: number
  solvedCount: number
  currentNodeCode: string | null
  gameStartedAt: string | null
  gameDeadline: string | null
  gameDurationMinutes: number
}

export interface PlayerWithAdminView extends Player {
  hasAuthUser: boolean
  deviceBound: boolean
  codeExpiresAt: string | null
  lastSeenAt: string | null
  status: Player['status']
}

export interface TeamDetailFull {
  team: TeamWithStats
  players: PlayerWithAdminView[]
  progress: {
    hintsUsed: number
    hintsAvailable: number
    score: number
    timeElapsedMinutes: number
    timeRemainingMinutes: number
    startedAt: string | null
    evidenceOwned: string[]
    inventoryOwned: Record<string, number>
    fragmentsOwned: string[]
    availableNodeIds: string[]
    currentNodeId: string | null
    solvedNodes: Record<string, unknown>
    lastActivityAt: string
  } | null
  nodeProgress: Array<{
    nodeId: string
    nodeCode: string
    nodeTitle: string
    nodeType: string
    stage: number
    location: string
    status: string
    startedAt: string | null
    solvedAt: string | null
    attempts: number
    hintsUsed: number
    timeSpentSeconds: number
    pointsAwarded: number
    createdAt: string
  }>
  hintsUsedHistory: Array<{
    nodeId: string
    nodeCode: string
    nodeTitle: string
    hintNumber: number
    usedAt: string
    timePenaltySeconds: number
  }>
  recentSubmissions: Array<{
    nodeId: string
    nodeCode: string
    nodeTitle: string
    playerId: string
    role: string
    answer: string
    isCorrect: boolean
    attemptNumber: number
    submittedAt: string
    pointsAwarded: number
  }>
  recentEvents: RawGameEvent[]
}

export interface AuditLogEntryAdmin {
  id: string
  adminId: string | null
  action: AdminActionType
  targetTeamId: string | null
  targetPlayerId: string | null
  targetNodeId: string | null
  payload: Record<string, unknown>
  reason: string
  ipAddress: string | null
  createdAt: string
  revertedAt: string | null
  revertedBy: string | null
}

export interface GameEventAdmin {
  id: string
  type: string
  timestamp: string
  teamId: string | null
  playerId: string | null
  nodeId: string | null
  payload: Record<string, unknown>
  metadata: Record<string, unknown> | null
}

export interface GameStateAdmin {
  gameStatus: 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'ENDED'
  statusCounts: Record<string, number>
  totalTeams: number
  config: Record<string, unknown>
}

export interface LeaderboardEntryAdmin {
  rank: number
  teamId: string
  teamName: string
  teamCode: string
  score: number
  status: TeamStatus
  startedAt: string | null
  completedAt: string | null
  currentNodeCode: string | null
  currentNodeId: string | null
  hintsUsed: number
  timeElapsedMinutes: number
  solvedCount: number
}

export const adminAPI = {
  async listTeams(): Promise<TeamWithStats[]> {
    const result = await callBureau<{ teams: RawTeam[] }>({ action: 'list-teams' })
    return result.teams.map(formatTeamWithStats)
  },

  async getTeam(teamId: string): Promise<TeamDetailFull> {
    const result = await callBureau<{
      team: RawTeam
      players: RawPlayer[]
      progress: Record<string, unknown> | null
      nodeProgress: RawNodeProgress[]
      hintsUsed: RawHintUsed[]
      recentSubmissions: RawSubmission[]
      recentEvents: RawGameEvent[]
    }>({ action: 'get-team-detail-full', teamId })

    return {
      team: formatTeamWithStats(result.team),
      players: result.players.map(formatPlayerWithAdminView),
      progress: result.progress ? formatProgress(result.progress) : null,
      nodeProgress: result.nodeProgress.map(formatNodeProgress),
      hintsUsedHistory: result.hintsUsed.map(formatHintUsed),
      recentSubmissions: result.recentSubmissions.map(formatSubmission),
      recentEvents: result.recentEvents,
    }
  },

  async getGameState(): Promise<GameStateAdmin> {
    const result = await callBureau<{
      gameState: GameStateAdmin
    }>({ action: 'get-game-state' })
    return result.gameState
  },

  async getLeaderboard(sortBy = 'rank', sortDir: 'asc' | 'desc' = 'desc'): Promise<LeaderboardEntryAdmin[]> {
    const result = await callBureau<{
      leaderboard: Array<{
        team_id: string
        team_name: string
        team_code: string
        score: number
        status: string
        started_at: string | null
        completed_at: string | null
        current_node_code: string | null
        current_node_id: string | null
        hints_used: number
        time_elapsed_minutes: number
        solved_count: number
        rank: number
      }>
    }>({ action: 'get-admin-leaderboard', sortBy, sortDir })

    return (result.leaderboard ?? []).map(e => ({
      rank: e.rank,
      teamId: e.team_id,
      teamName: e.team_name,
      teamCode: e.team_code,
      score: e.score,
      status: e.status as TeamStatus,
      startedAt: e.started_at,
      completedAt: e.completed_at,
      currentNodeCode: e.current_node_code,
      currentNodeId: e.current_node_id,
      hintsUsed: e.hints_used,
      timeElapsedMinutes: e.time_elapsed_minutes,
      solvedCount: e.solved_count,
    }))
  },

  async getAuditLog(limit = 100, actionFilter?: string, search?: string): Promise<AuditLogEntryAdmin[]> {
    const result = await callBureau<{ audit_log: RawAuditEntry[] }>({
      action: 'get-audit-log', limit, actionFilter, search,
    })

    return (result.audit_log ?? []).map(a => ({
      id: a.id,
      adminId: a.admin_id,
      action: a.action_type as AdminActionType,
      targetTeamId: a.target_team_id,
      targetPlayerId: a.target_player_id,
      targetNodeId: a.target_node_id,
      payload: a.payload,
      reason: a.reason,
      ipAddress: a.ip_address,
      createdAt: a.created_at,
      revertedAt: a.reverted_at,
      revertedBy: a.reverted_by,
    }))
  },

  async getGameEvents(limit = 50, teamId?: string): Promise<GameEventAdmin[]> {
    const result = await callBureau<{ events: RawGameEvent[] }>({
      action: 'get-game-events', limit, teamId,
    })

    return (result.events ?? []).map(e => ({
      id: e.id,
      type: e.type,
      timestamp: e.timestamp,
      teamId: e.team_id,
      playerId: e.player_id,
      nodeId: e.node_id,
      payload: e.payload,
      metadata: e.metadata,
    }))
  },

  async createTeam(teamName: string): Promise<{ id: string; code: string; name: string }> {
    const result = await callBureau<{ team: { id: string; code: string; name: string } }>
      ({ action: 'create-team', teamName })
    return result.team
  },

  async addPlayer(teamId: string, displayName: string, role: string): Promise<{ id: string; teamId: string }> {
    const result = await callBureau<{ player: { id: string; teamId: string } }>
      ({ action: 'add-player', teamId, displayName, role })
    return result.player
  },

  async generateCodes(teamId: string): Promise<Array<{ playerId: string; role: string; displayName: string; loginCode: string }>> {
    const result = await callBureau<{ codes: Array<{ playerId: string; role: string; displayName: string; loginCode: string }> }>
      ({ action: 'generate-codes', teamId })
    return result.codes ?? []
  },

  async generateCode(playerId: string): Promise<{ playerId: string; loginCode: string }> {
    const result = await callBureau<{ playerId: string; loginCode: string }>
      ({ action: 'generate-code', playerId })
    return { playerId: result.playerId, loginCode: result.loginCode }
  },

  async startTeam(teamId: string, reason?: string): Promise<{ teamId: string; startedAt: string }> {
    const result = await callBureau<{ teamId: string; startedAt: string }>
      ({ action: 'start-team', teamId, reason })
    return result
  },

  async pauseTeam(teamId: string, reason?: string): Promise<{ teamId: string }> {
    const result = await callBureau<{ teamId: string }>
      ({ action: 'pause-team', teamId, reason })
    return result
  },

  async resumeTeam(teamId: string, reason?: string): Promise<{ teamId: string }> {
    const result = await callBureau<{ teamId: string }>
      ({ action: 'resume-team', teamId, reason })
    return result
  },

  async completeTeam(teamId: string, reason?: string): Promise<{ teamId: string }> {
    const result = await callBureau<{ teamId: string }>
      ({ action: 'complete-team', teamId, reason })
    return result
  },

  async disqualifyTeam(teamId: string, reason?: string): Promise<{ teamId: string }> {
    const result = await callBureau<{ teamId: string }>
      ({ action: 'disqualify-team', teamId, reason })
    return result
  },

  async resetTeam(teamId: string, reason: string): Promise<{ teamId: string }> {
    const result = await callBureau<{ teamId: string }>
      ({ action: 'reset-team', teamId, reason })
    return result
  },

  async reassignRole(playerId: string, newRole: string, reason: string): Promise<{ playerId: string; newRole: string }> {
    const result = await callBureau<{ playerId: string; newRole: string }>
      ({ action: 'reassign-role', playerId, newRole, reason })
    return result
  },

  async sendNotification(params: {
    target: 'single' | 'multiple' | 'all'
    teamIds?: string[]
    title: string
    message: string
    notifType?: string
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
    targetRoles?: string[]
    reason?: string
  }): Promise<{ teamsNotified: number }> {
    const result = await callBureau<{ teamsNotified: number }>
      ({ action: 'send-notification', ...params })
    return result
  },

  async grantHint(params: {
    teamId: string
    nodeId: string
    hintNumber: number
    reason?: string
  }): Promise<{ hintContent: string }> {
    const result = await callBureau<{ hintContent: string }>
      ({ action: 'grant-hint', ...params })
    return result
  },

  async manualUnlock(params: {
    teamId: string
    nodeId: string
    reason: string
  }): Promise<unknown> {
    const result = await callBureau<{ result: unknown }>
      ({ action: 'manual_unlock', teamId: params.teamId, nodeId: params.nodeId, reason: params.reason })
    return result.result
  },

  async createTeamWithPlayers(params: {
    teamName: string
    players: Array<{ name: string; deviceId: string; role: string }>
  }): Promise<{
    success: boolean
    teamId: string
    teamCode: string
    playerCodes: string[]
    /** Name + role for each provisioned player, in the order the codes were issued. */
    provisionedPlayers: Array<{ name: string; role: string; loginCode: string }>
    error?: string
  }> {
    try {
      const result = await callBureau<{
        team: { id: string; code: string; name: string }
        players: Array<{ player_id: string; name: string; role: string; login_code: string }>
      }>({
        action: 'provision-team',
        teamName: params.teamName,
        players: params.players.map(p => ({ name: p.name, role: p.role })),
      })

      return {
        success: true,
        teamId: result.team.id,
        teamCode: result.team.code,
        playerCodes: result.players.map(p => p.login_code),
        provisionedPlayers: result.players.map(p => ({
          name: p.name,
          role: p.role,
          loginCode: p.login_code,
        })),
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create team'
      return {
        success: false,
        teamId: '',
        teamCode: '',
        playerCodes: [],
        provisionedPlayers: [],
        error: msg,
      }
    }
  },
}

function formatTeamWithStats(raw: RawTeam): TeamWithStats {
  const base = formatTeam(raw)
  return {
    ...base,
    playerCount: raw.player_count ?? 0,
    playerRoles: raw.player_roles ?? [],
    hintsUsed: raw.hints_used ?? 0,
    solvedCount: raw.solved_count ?? 0,
    currentNodeCode: raw.current_node_code ?? null,
    gameStartedAt: raw.game_started_at ?? null,
    gameDeadline: raw.game_deadline ?? null,
    gameDurationMinutes: raw.game_duration_minutes ?? 180,
  }
}

function formatPlayerWithAdminView(raw: RawPlayer): PlayerWithAdminView {
  const base = formatPlayer(raw)
  return {
    ...base,
    hasAuthUser: raw.has_auth_user,
    deviceBound: raw.device_bound,
    codeExpiresAt: raw.code_expires_at,
    lastSeenAt: raw.last_seen_at ?? null,
    status: raw.status as Player['status'],
  }
}

function formatProgress(raw: Record<string, unknown>) {
  const tp = raw as {
    hints_used: number
    hints_available: number
    score: number
    time_elapsed_minutes: number
    time_remaining_minutes: number
    started_at: string | null
    evidence_owned: string[]
    inventory_owned: Record<string, number>
    fragments_owned: string[]
    available_node_ids: string[] | null
    current_node_id: string | null
    solved_nodes: Record<string, unknown>
    last_activity_at: string
  }
  return {
    hintsUsed: tp.hints_used ?? 0,
    hintsAvailable: tp.hints_available ?? 3,
    score: tp.score ?? 0,
    timeElapsedMinutes: tp.time_elapsed_minutes ?? 0,
    timeRemainingMinutes: tp.time_remaining_minutes ?? 180,
    startedAt: tp.started_at ?? null,
    evidenceOwned: tp.evidence_owned ?? [],
    inventoryOwned: tp.inventory_owned ?? {},
    fragmentsOwned: tp.fragments_owned ?? [],
    availableNodeIds: tp.available_node_ids ?? [],
    currentNodeId: tp.current_node_id ?? null,
    solvedNodes: tp.solved_nodes ?? {},
    lastActivityAt: tp.last_activity_at ?? new Date().toISOString(),
  }
}

function formatNodeProgress(raw: RawNodeProgress) {
  return {
    nodeId: raw.node_id,
    nodeCode: raw.code,
    nodeTitle: raw.title,
    nodeType: raw.type,
    stage: raw.stage,
    location: raw.location,
    status: raw.status,
    startedAt: raw.started_at,
    solvedAt: raw.solved_at,
    attempts: raw.attempts,
    hintsUsed: raw.hints_used,
    timeSpentSeconds: raw.time_spent_seconds,
    pointsAwarded: raw.points_awarded,
    createdAt: raw.created_at,
  }
}

function formatHintUsed(raw: RawHintUsed) {
  return {
    nodeId: raw.node_id,
    nodeCode: raw.code,
    nodeTitle: raw.title,
    hintNumber: raw.hint_number,
    usedAt: raw.used_at,
    timePenaltySeconds: raw.time_penalty_seconds,
  }
}

function formatSubmission(raw: RawSubmission) {
  return {
    nodeId: raw.node_id,
    nodeCode: raw.code,
    nodeTitle: raw.title,
    playerId: raw.player_id,
    role: raw.role,
    answer: raw.submitted_answer,
    isCorrect: raw.is_correct,
    attemptNumber: raw.attempt_number,
    submittedAt: raw.submitted_at,
    pointsAwarded: raw.points_awarded,
  }
}

export { AdminAPIError }
