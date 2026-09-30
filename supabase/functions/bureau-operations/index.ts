/**
 * NEXUS — Bureau Operations Edge Function
 *
 * All Bureau (admin) mutations flow through this single function.
 * Each action is verified against the admin_users table.
 * Supported actions:
 *   - provision-team  { teamName, players:[{name, role}] }  (ATOMIC team+players+codes)
 *   - create-team     { teamName }
 *   - add-player      { teamId, displayName, role }
 *   - generate-code    { playerId }
 *   - generate-codes   { teamId }     (generate codes for all players on a team)
 *   - start-team       { teamId, reason }
 *   - pause-team       { teamId, reason }
 *   - resume-team      { teamId, reason }
 *   - complete-team    { teamId, reason }
 *   - disqualify-team  { teamId, reason }
 *   - reset-team       { teamId, reason }
 *   - reassign-role    { playerId, newRole, reason }
 *   - get-team-details { teamId }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LOGIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LOGIN_CODE_LENGTH = 8

function generateLoginCode(): string {
  const bytes = new Uint8Array(LOGIN_CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < LOGIN_CODE_LENGTH; i++) {
    result += LOGIN_CODE_CHARS[bytes[i] % LOGIN_CODE_CHARS.length]
  }
  return result
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // --- Verify admin ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Authentication required' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse(401, { error: 'Invalid session' })
    }

    const { data: adminRecord } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminRecord) {
      return jsonResponse(401, { error: 'Authentication required' })
    }

    const isAdmin = adminRecord.role === 'ADMIN' || adminRecord.role === 'SUPER_ADMIN'
    if (!isAdmin) {
      return jsonResponse(401, { error: 'Authentication required' })
    }

    // Create a user-authenticated client for RPC calls that use auth.uid()
    // (SECURITY DEFINER functions call auth.uid() for audit logging).
    // Direct table operations use supabaseAdmin (service role bypasses RLS).
    const supabaseAdminUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )

    // Get client IP for audit logging
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    const { action, ...params } = await req.json()

    // --- Log admin action ---
    async function logAction(actionType: string, targetTeamId?: string, targetPlayerId?: string, payload?: Record<string, unknown>) {
      await supabaseAdmin.from('audit_log').insert({
        admin_id: user.id,
        action_type: actionType,
        target_team_id: targetTeamId ?? null,
        target_player_id: targetPlayerId ?? null,
        payload: payload ?? {},
        reason: (params as Record<string, unknown>).reason as string ?? '',
        ip_address: clientIp,
      })
    }

    // --- Route actions ---
    switch (action) {
      case 'provision-team': {
        const { teamName, players } = params as {
          teamName: string
          players: Array<{ name: string; role: string }>
        }

        if (!teamName || teamName.trim().length < 1 || teamName.length > 50) {
          return jsonResponse(400, { error: 'Team name must be 1-50 characters' })
        }
        if (!Array.isArray(players) || players.length < 1) {
          return jsonResponse(400, { error: 'At least one player is required' })
        }
        if (players.length > 3) {
          return jsonResponse(400, { error: 'A team may have at most 3 players' })
        }

        const seenRoles = new Set<string>()
        for (const p of players) {
          if (!p.name || !p.name.trim()) {
            return jsonResponse(400, { error: 'Every player needs a name' })
          }
          if (!['OBSERVER', 'ANALYST', 'OPERATOR'].includes(p.role)) {
            return jsonResponse(400, { error: `Invalid role: ${p.role}` })
          }
          if (seenRoles.has(p.role)) {
            return jsonResponse(400, { error: `Role ${p.role} is assigned twice` })
          }
          seenRoles.add(p.role)
        }

        // --- Atomic database half: team + players + login-code hashes ---
        const { data: provisionData, error: provisionError } = await supabaseAdminUser.rpc(
          'bureau_provision_team',
          { p_team_name: teamName, p_players: players },
        )

        if (provisionError) {
          return jsonResponse(400, { error: provisionError.message })
        }

        const provisioned = Array.isArray(provisionData) ? provisionData[0] : provisionData
        if (!provisioned?.team_id) {
          return jsonResponse(500, { error: 'Provisioning returned no result' })
        }

        const provisionedPlayers: Array<{
          player_id: string
          name: string
          role: string
          login_code: string
        }> = Array.isArray(provisioned.players) ? provisioned.players : []

        // --- Auth-user half: cannot join the SQL transaction, so compensate ---
        const createdAuthUserIds: string[] = []
        try {
          for (const p of provisionedPlayers) {
            const internalEmail = `nexus+${p.player_id}@internal`
            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
              email: internalEmail,
              password: p.login_code,
              email_confirm: true,
              user_data: { player_id: p.player_id },
            })

            if (authErr || !authData?.user) {
              throw new Error(authErr?.message ?? 'Failed to create auth user')
            }
            createdAuthUserIds.push(authData.user.id)

            const { error: linkError } = await supabaseAdmin
              .from('players')
              .update({ auth_user_id: authData.user.id, auth_user_email: internalEmail })
              .eq('id', p.player_id)

            if (linkError) {
              throw new Error(linkError.message)
            }
          }
        } catch (provisionFailure: unknown) {
          // Compensating rollback so no half-provisioned team survives
          for (const authUserId of createdAuthUserIds) {
            try {
              await supabaseAdmin.auth.admin.deleteUser(authUserId)
            } catch {
              // best-effort cleanup
            }
          }
          for (const table of ['game_events', 'audit_log', 'players', 'teams']) {
            try {
              await supabaseAdmin.from(table).delete().eq(
                table === 'teams' ? 'id' : 'team_id',
                provisioned.team_id,
              )
            } catch {
              // best-effort cleanup
            }
          }
          const reason = provisionFailure instanceof Error ? provisionFailure.message : 'unknown error'
          console.error('provision-team failed, rolled back:', reason)
          return jsonResponse(500, {
            error: 'Provisioning failed and was rolled back. No team was created.',
            detail: reason,
          })
        }

        await logAction('TEAM_CREATE', provisioned.team_id, undefined, {
          action: 'PROVISION',
          players: provisionedPlayers.length,
        })

        return jsonResponse(200, {
          success: true,
          team: {
            id: provisioned.team_id,
            code: provisioned.team_code,
            name: teamName,
          },
          players: provisionedPlayers,
        })
      }

      case 'create-team': {
        const { teamName } = params as { teamName: string }
        if (!teamName || teamName.length < 1 || teamName.length > 50) {
          return jsonResponse(400, { error: 'Team name must be 1-50 characters' })
        }

        const { data, error } = await supabaseAdminUser.rpc('bureau_create_team', {
          p_team_name: teamName,
        })

        await logAction('TEAM_CREATE', data?.[0]?.team_id)

        if (error) return jsonResponse(400, { error: error.message })

        return jsonResponse(200, {
          success: true,
          team: {
            id: data[0].team_id,
            code: data[0].team_code,
            name: teamName,
            status: 'REGISTERED',
          },
        })
      }

      case 'add-player': {
        const { teamId, displayName, role } = params as { teamId: string; displayName: string; role: string }
        if (!teamId || !displayName || !role) {
          return jsonResponse(400, { error: 'teamId, displayName, and role are required' })
        }
        if (!['OBSERVER', 'ANALYST', 'OPERATOR'].includes(role)) {
          return jsonResponse(400, { error: 'Invalid role' })
        }
        if (displayName.length < 1 || displayName.length > 30) {
          return jsonResponse(400, { error: 'Display name must be 1-30 characters' })
        }

        const { data, error } = await supabaseAdmin.rpc('bureau_add_player', {
          p_team_id: teamId,
          p_display_name: displayName,
          p_role: role,
        })

        await logAction('ROLE_ASSIGN', teamId, data?.[0]?.player_id, { displayName, role })

        if (error) return jsonResponse(400, { error: error.message })

        return jsonResponse(200, {
          success: true,
          player: {
            id: data[0].player_id,
            teamId: data[0].team_id,
            displayName,
            role,
            status: 'INVITED',
          },
        })
      }

      case 'generate-code': {
        const { playerId } = params as { playerId: string }
        if (!playerId) {
          return jsonResponse(400, { error: 'playerId is required' })
        }

        // Check role lock
        const { data: playerData } = await supabaseAdmin
          .from('players')
          .select('team_id')
          .eq('id', playerId)
          .single()

        if (!playerData) return jsonResponse(404, { error: 'Player not found' })

        const { data: teamData } = await supabaseAdmin
          .from('teams')
          .select('status')
          .eq('id', playerData.team_id)
          .single()

        if (teamData && ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(teamData.status)) {
          return jsonResponse(403, { error: 'Cannot generate code: role is locked' })
        }

        const loginCode = generateLoginCode()

        // Hash the code via SQL function
        const { data: hashResult } = await supabaseAdmin.rpc('hash_login_code', {
          input_code: loginCode,
        })

        // Create Supabase Auth user with the login code as password
        // The email is internal and never shown to the player
        const internalEmail = `nexus+${playerId}@internal`
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: internalEmail,
          password: loginCode,
          email_confirm: true,
          user_data: { player_id: playerId },
        })

        if (authError) {
          console.error('Auth user creation error:', authError)
          return jsonResponse(500, { error: 'Failed to create auth user' })
        }

        // Store the hash and auth user reference
        const { error: updateError } = await supabaseAdmin
          .from('players')
          .update({
            login_code_hash: hashResult ?? '',
            auth_user_id: authData.user.id,
            auth_user_email: internalEmail,
            status: 'INVITED',
          })
          .eq('id', playerId)

        if (updateError) return jsonResponse(500, { error: updateError.message })

        await logAction('ROLE_ASSIGN', playerData.team_id, playerId, { action: 'GENERATE_CODE' })

        // Return the plaintext code to the Bureau (for display only)
        return jsonResponse(200, {
          success: true,
          playerId,
          loginCode,
        })
      }

      case 'generate-codes': {
        const { teamId } = params as { teamId: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        // Fetch all players on the team without codes
        const { data: players, error: fetchError } = await supabaseAdmin
          .from('players')
          .select('id, role, display_name')
          .eq('team_id', teamId)
          .is('login_code_hash', null)

        if (fetchError) return jsonResponse(400, { error: fetchError.message })

        const results: Array<{ playerId: string; role: string; displayName: string; loginCode: string }> = []

        for (const player of players) {
          const loginCode = generateLoginCode()
          const { data: hashResult } = await supabaseAdmin.rpc('hash_login_code', {
            input_code: loginCode,
          })
          const internalEmail = `nexus+${player.id}@internal`
          const { data: authData } = await supabaseAdmin.auth.admin.createUser({
            email: internalEmail,
            password: loginCode,
            email_confirm: true,
            user_data: { player_id: player.id },
          })
          await supabaseAdmin
            .from('players')
            .update({
              login_code_hash: hashResult ?? '',
              auth_user_id: authData?.user?.id,
              auth_user_email: internalEmail,
              status: 'INVITED',
            })
            .eq('id', player.id)

          results.push({
            playerId: player.id,
            role: player.role,
            displayName: player.display_name,
            loginCode,
          })
        }

        await logAction('ROLE_ASSIGN', teamId, undefined, { action: 'GENERATE_CODES', count: results.length })

        // Transition team to WAITING once codes are generated
        const { data: team } = await supabaseAdmin
          .from('teams')
          .select('status')
          .eq('id', teamId)
          .single()

        if (team && team.status === 'READY') {
          await supabaseAdmin
            .from('teams')
            .update({ status: 'WAITING' })
            .eq('id', teamId)

          await supabaseAdmin.from('game_events').insert({
            type: 'TEAM_STARTED',
            team_id: teamId,
            payload: { action: 'CODES_GENERATED' },
          })
        }

        return jsonResponse(200, { success: true, codes: results })
      }

      case 'start-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        // Verify all players have logged in
        const { data: players, error: playerError } = await supabaseAdmin
          .from('players')
          .select('auth_user_id, device_session_token')
          .eq('team_id', teamId)

        if (playerError) return jsonResponse(400, { error: playerError.message })

        const allLoggedIn = players.length === 3 &&
          players.every(p => p.auth_user_id && p.device_session_token)

        if (!allLoggedIn) {
          return jsonResponse(400, {
            error: 'All 3 players must have logged in and bound their devices before starting',
            playersLoggedIn: players.filter(p => p.auth_user_id && p.device_session_token).length,
          })
        }

        const { data, error } = await supabaseAdminUser.rpc('bureau_start_team', {
          p_team_id: teamId,
          p_reason: reason ?? 'Started by Bureau',
        })

        if (error) {
          if (error.message.includes('WAITING')) {
            return jsonResponse(400, { error: 'Team must be in WAITING status to start' })
          }
          return jsonResponse(400, { error: error.message })
        }

        return jsonResponse(200, { success: true, teamId, startedAt: data[0]?.started_at })
      }

      case 'pause-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const { error } = await supabaseAdmin
          .from('teams')
          .update({ status: 'PAUSED', updated_at: new Date().toISOString() })
          .eq('id', teamId)
          .in('status', ['ACTIVE'])

        if (error) return jsonResponse(400, { error: error.message })
        await logAction('TEAM_PAUSE', teamId, undefined, { reason })
        return jsonResponse(200, { success: true, teamId })
      }

      case 'resume-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const { error } = await supabaseAdmin
          .from('teams')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', teamId)
          .eq('status', 'PAUSED')

        if (error) return jsonResponse(400, { error: error.message })
        await logAction('TEAM_RESUME', teamId, undefined, { reason })
        return jsonResponse(200, { success: true, teamId })
      }

      case 'complete-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const { error } = await supabaseAdmin
          .from('teams')
          .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', teamId)
          .in('status', ['ACTIVE', 'PAUSED'])

        if (error) return jsonResponse(400, { error: error.message })
        await logAction('TEAM_COMPLETE', teamId, undefined, { reason })

        await supabaseAdmin.from('game_events').insert({
          type: 'TEAM_COMPLETED',
          team_id: teamId,
          payload: { reason },
        })

        return jsonResponse(200, { success: true, teamId })
      }

      case 'disqualify-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const { error } = await supabaseAdmin
          .from('teams')
          .update({ status: 'DISQUALIFIED', updated_at: new Date().toISOString() })
          .eq('id', teamId)
          .in('status', ['ACTIVE', 'PAUSED', 'WAITING'])

        if (error) return jsonResponse(400, { error: error.message })
        await logAction('TEAM_DISQUALIFY', teamId, undefined, { reason })

        await supabaseAdmin.from('game_events').insert({
          type: 'TEAM_DISQUALIFIED',
          team_id: teamId,
          payload: { reason },
        })

        return jsonResponse(200, { success: true, teamId })
      }

      case 'reset-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })
        if (!reason) return jsonResponse(400, { error: 'reason is required for reset' })

        const { error } = await supabaseAdminUser.rpc('bureau_reset_team', {
          p_team_id: teamId,
          p_reason: reason,
        })

        if (error) return jsonResponse(400, { error: error.message })

        // Clear login codes to force regeneration
        await supabaseAdmin
          .from('players')
          .update({
            login_code_hash: null,
            device_session_token: null,
            device_fingerprint_hash: null,
            status: 'INVITED',
          })
          .eq('team_id', teamId)

        await logAction('TEAM_UPDATE', teamId, undefined, { action: 'RESET', reason })

        return jsonResponse(200, { success: true, teamId })
      }

      case 'reassign-role': {
        const { playerId, newRole, reason } = params as { playerId: string; newRole: string; reason: string }
        if (!playerId || !newRole) return jsonResponse(400, { error: 'playerId and newRole are required' })

        // Check if role is locked
        const { data: player } = await supabaseAdmin
          .from('players')
          .select('team_id, role')
          .eq('id', playerId)
          .single()

        if (!player) return jsonResponse(404, { error: 'Player not found' })

        const { data: team } = await supabaseAdmin
          .from('teams')
          .select('status')
          .eq('id', player.team_id)
          .single()

        if (team && ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(team.status)) {
          return jsonResponse(403, { error: 'Role is locked after game start' })
        }

        // Check role uniqueness
        const { data: existing } = await supabaseAdmin
          .from('players')
          .select('id')
          .eq('team_id', player.team_id)
          .eq('role', newRole)
          .neq('id', playerId)
          .single()

        if (existing) return jsonResponse(409, { error: `Role ${newRole} is already assigned to another player` })

        const { error } = await supabaseAdmin
          .from('players')
          .update({ role: newRole })
          .eq('id', playerId)

        if (error) return jsonResponse(400, { error: error.message })
        await logAction('ROLE_REASSIGN', player.team_id, playerId, { from: player.role, to: newRole, reason })

        return jsonResponse(200, { success: true, playerId, newRole })
      }

      case 'get-team-details': {
        const { teamId } = params as { teamId: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        const { data: team } = await supabaseAdmin
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()

        const { data: players } = await supabaseAdmin
          .from('players')
          .select('id, team_id, role, display_name, status, is_connected, last_seen_at, created_at, joined_at, auth_user_id, device_session_token')
          .eq('team_id', teamId)
          .order('role')

        return jsonResponse(200, {
          success: true,
          team,
          players: players ?? [],
        })
      }

      case 'list-teams': {
        const { data: teams } = await supabaseAdmin
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false })

        const { data: playerCounts } = await supabaseAdmin
          .from('players')
          .select('team_id, role')

        const { data: progressData } = await supabaseAdmin
          .from('team_progress')
          .select('team_id, hints_used, score, started_at')

        const { data: solvedCounts } = await supabaseAdmin
          .from('node_progress')
          .select('team_id, status')
          .eq('status', 'SOLVED')

        const playerCountMap: Record<string, { count: number; roles: string[] }> = {}
        for (const p of playerCounts ?? []) {
          if (!playerCountMap[p.team_id]) {
            playerCountMap[p.team_id] = { count: 0, roles: [] }
          }
          playerCountMap[p.team_id].count += 1
          if (p.role) playerCountMap[p.team_id].roles.push(p.role)
        }

        const progressMap: Record<string, { hintsUsed: number; progressScore: number; startedAt: string | null }> = {}
        for (const tp of progressData ?? []) {
          progressMap[tp.team_id] = {
            hintsUsed: tp.hints_used,
            progressScore: tp.score,
            startedAt: tp.started_at,
          }
        }

        const solvedCountMap: Record<string, number> = {}
        for (const sc of solvedCounts ?? []) {
          solvedCountMap[sc.team_id] = (solvedCountMap[sc.team_id] ?? 0) + 1
        }

        return jsonResponse(200, {
          success: true,
          teams: (teams ?? []).map(t => {
            const pm = playerCountMap[t.id]
            const pm2 = progressMap[t.id]
            return {
              id: t.id,
              name: t.name,
              code: t.code,
              status: t.status,
              createdAt: t.created_at,
              startedAt: t.started_at,
              completedAt: t.completed_at,
              score: t.score,
              currentNodeId: t.current_node_id,
              currentNodeCode: t.current_node_code ?? null,
              playerCount: pm?.count ?? 0,
              playerRoles: pm?.roles ?? [],
              hintsUsed: pm2?.hintsUsed ?? 0,
              solvedCount: solvedCountMap[t.id] ?? 0,
              gameStartedAt: t.game_started_at,
              gameDeadline: t.game_deadline,
              gameDurationMinutes: t.game_duration_minutes,
            }
          }),
        })
      }

      case 'get-team-detail-full': {
        const { teamId } = params as { teamId: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        const { data: team } = await supabaseAdmin
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()

        if (!team) return jsonResponse(404, { error: 'Team not found' })

        const { data: players } = await supabaseAdmin
          .from('players')
          .select('id, team_id, role, display_name, status, is_connected, last_seen_at, created_at, joined_at, auth_user_id, device_session_token, login_code_hash, login_code_expires_at, updated_at')
          .eq('team_id', teamId)
          .order('role')

        const { data: progress } = await supabaseAdmin
          .from('team_progress')
          .select('*')
          .eq('team_id', teamId)
          .single()

        const { data: nodeProgress } = await supabaseAdmin
          .from('node_progress')
          .select('*, puzzle_nodes!inner(code, title, type, stage, location)')
          .eq('team_id', teamId)
          .order('created_at', { ascending: true })

        const { data: hintsUsed } = await supabaseAdmin
          .from('hints_used')
          .select('*, puzzle_nodes!inner(code, title)')
          .eq('team_id', teamId)
          .order('used_at', { ascending: false })

        const { data: submissions } = await supabaseAdmin
          .from('submissions')
          .select('*, puzzle_nodes!inner(code, title)')
          .eq('team_id', teamId)
          .order('submitted_at', { ascending: false })
          .limit(50)

        const { data: gameEvents } = await supabaseAdmin
          .from('game_events')
          .select('*')
          .eq('team_id', teamId)
          .order('timestamp', { ascending: false })
          .limit(50)

        const safePlayers = (players ?? []).map(p => ({
          id: p.id,
          team_id: p.team_id,
          role: p.role,
          display_name: p.display_name,
          status: p.status,
          is_connected: p.is_connected,
          last_seen_at: p.last_seen_at,
          created_at: p.created_at,
          joined_at: p.joined_at,
          has_auth_user: !!p.auth_user_id,
          device_bound: !!p.device_session_token,
          code_expires_at: p.login_code_expires_at,
        }))

        return jsonResponse(200, {
          success: true,
          team,
          players: safePlayers,
          progress,
          nodeProgress: nodeProgress ?? [],
          hintsUsed: hintsUsed ?? [],
          recentSubmissions: submissions ?? [],
          recentEvents: gameEvents ?? [],
        })
      }

      case 'get-audit-log': {
        const { limit = 100, actionFilter, search } = params as {
          limit?: number
          actionFilter?: string
          search?: string
        }

        let query = supabaseAdmin
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(Math.min(limit, 200))

        if (actionFilter) {
          query = query.eq('action_type', actionFilter)
        }

        const { data, error } = await query

        if (error) return jsonResponse(400, { error: error.message })

        let filtered = data ?? []
        if (search) {
          const term = search.toLowerCase()
          filtered = filtered.filter(
            entry =>
              entry.action_type?.toLowerCase().includes(term) ||
              entry.target_team_id?.toLowerCase().includes(term) ||
              entry.target_player_id?.toLowerCase().includes(term) ||
              entry.reason?.toLowerCase().includes(term) ||
              JSON.stringify(entry.payload || {}).toLowerCase().includes(term),
          )
        }

        return jsonResponse(200, { success: true, auditLog: filtered })
      }

      case 'get-game-events': {
        const { limit = 50, teamId } = params as {
          limit?: number
          teamId?: string
        }

        let query = supabaseAdmin
          .from('game_events')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(Math.min(limit, 200))

        if (teamId) {
          query = query.eq('team_id', teamId)
        }

        const { data, error } = await query

        if (error) return jsonResponse(400, { error: error.message })

        return jsonResponse(200, { success: true, events: data ?? [] })
      }

      case 'get-game-state': {
        const { data: config } = await supabaseAdmin
          .from('game_config')
          .select('*')
          .in('key', ['game_duration_minutes', 'hint_penalties', 'rate_limit_submissions', 'login_code_ttl_minutes'])

        const { data: teams } = await supabaseAdmin
          .from('teams')
          .select('status')

        const statusCounts: Record<string, number> = {}
        for (const t of teams ?? []) {
          statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1
        }

        const activeTeam = teams?.find(t => t.status === 'ACTIVE')
        const hasActiveTeams = !!activeTeam
        const completedCount = statusCounts['COMPLETED'] ?? 0
        const totalCount = teams?.length ?? 0

        let gameStatus: string
        if (completedCount === totalCount && totalCount > 0) {
          gameStatus = 'ENDED'
        } else if (hasActiveTeams || (statusCounts['PAUSED'] ?? 0) > 0) {
          gameStatus = 'RUNNING'
        } else {
          gameStatus = 'NOT_STARTED'
        }

        const configMap: Record<string, unknown> = {}
        for (const c of config ?? []) {
          configMap[c.key] = c.value
        }

        return jsonResponse(200, {
          success: true,
          gameState: {
            gameStatus,
            statusCounts,
            totalTeams: totalCount,
            config: configMap,
          },
        })
      }

      case 'get-admin-leaderboard': {
        const { sortBy = 'rank', sortDir = 'desc' } = params as {
          sortBy?: string
          sortDir?: 'asc' | 'desc'
        }

        const { data: teams } = await supabaseAdmin
          .from('teams')
          .select('id, name, code, status, score, started_at, completed_at, current_node_id, current_node_code')
          .order('created_at', { ascending: false })

        const { data: progressData } = await supabaseAdmin
          .from('team_progress')
          .select('team_id, hints_used, time_elapsed_minutes')

        const { data: solvedCounts } = await supabaseAdmin
          .from('node_progress')
          .select('team_id, status')
          .eq('status', 'SOLVED')

        const progressMap = new Map()
        for (const tp of progressData ?? []) {
          progressMap.set(tp.team_id, {
            hintsUsed: tp.hints_used,
            timeElapsedMinutes: tp.time_elapsed_minutes,
          })
        }

        const solvedCountMap = new Map()
        for (const sc of solvedCounts ?? []) {
          solvedCountMap.set(sc.team_id, (solvedCountMap.get(sc.team_id) ?? 0) + 1)
        }

        const allEntries = (teams ?? []).map(t => {
          const prog = progressMap.get(t.id)
          return {
            teamId: t.id,
            teamName: t.name,
            teamCode: t.code,
            score: t.score,
            status: t.status,
            startedAt: t.started_at,
            completedAt: t.completed_at,
            currentNodeCode: t.current_node_code,
            currentNodeId: t.current_node_id,
            hintsUsed: prog?.hintsUsed ?? 0,
            timeElapsedMinutes: prog?.timeElapsedMinutes ?? 0,
            solvedCount: solvedCountMap.get(t.id) ?? 0,
          }
        })

        const sorted = [...allEntries].sort((a, b) => {
          let aVal: number | string = 0
          let bVal: number | string = 0
          if (sortBy === 'score') {
            aVal = a.score
            bVal = b.score
          } else if (sortBy === 'solvedCount') {
            aVal = a.solvedCount
            bVal = b.solvedCount
          } else if (sortBy === 'timeElapsedMinutes') {
            aVal = a.timeElapsedMinutes
            bVal = b.timeElapsedMinutes
          } else {
            aVal = a.score
            bVal = b.score
          }
          if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
          if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
          return 0
        })

        const ranked = sorted.map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }))

        return jsonResponse(200, { success: true, leaderboard: ranked })
      }

      case 'send-notification': {
        const { target, teamIds, title, message, type: notifType, priority, targetRoles, reason } = params as {
          target: 'single' | 'multiple' | 'all'
          teamIds?: string[]
          title: string
          message: string
          notifType?: string
          priority?: string
          targetRoles?: string[]
          reason?: string
        }

        if (!title || !message) {
          return jsonResponse(400, { error: 'title and message are required' })
        }

        if (!['single', 'multiple', 'all'].includes(target)) {
          return jsonResponse(400, { error: 'Invalid target type' })
        }

        const validTypes = ['SYSTEM', 'PUZZLE_UNLOCKED', 'PUZZLE_SOLVED', 'EVIDENCE_FOUND', 'ITEM_ACQUIRED',
                            'FRAGMENT_REVEALED', 'HINT_AVAILABLE', 'TIME_WARNING',
                            'ROLE_ACTION_REQUIRED', 'ADMIN_MESSAGE', 'GAME_PHASE_CHANGE', 'TEAM_STATUS_CHANGE']
        const notifTypeValue = notifType && validTypes.includes(notifType) ? notifType : 'ADMIN_MESSAGE'
        const priorityValue = priority && ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].includes(priority)
          ? priority : 'HIGH'
        const rolesValue = targetRoles && targetRoles.length > 0 ? targetRoles : ['OBSERVER', 'ANALYST', 'OPERATOR']

        let targetTeams: string[] = []

        if (target === 'all') {
          const { data: allTeams } = await supabaseAdmin
            .from('teams')
            .select('id')
            .in('status', ['ACTIVE', 'PAUSED', 'WAITING', 'READY', 'FORMING'])

          targetTeams = (allTeams ?? []).map(t => t.id)
        } else {
          if (!teamIds || teamIds.length === 0) {
            return jsonResponse(400, { error: 'teamIds is required for single/multiple target' })
          }

          if (target === 'single') {
            targetTeams = [teamIds[0]]
          } else {
            targetTeams = teamIds
          }
        }

        const now = new Date().toISOString()
        for (const teamId of targetTeams) {
          await supabaseAdmin.from('notifications').insert({
            team_id: teamId,
            target_roles: rolesValue,
            type: notifTypeValue,
            title,
            message,
            priority: priorityValue,
            is_read: false,
          })
        }

        await logAction('ANNOUNCEMENT_SEND', undefined, undefined, {
          target,
          teamIds: targetTeams,
          title,
          message,
          type: notifTypeValue,
          priority: priorityValue,
          reason,
        })

        if (target === 'single') {
          await supabaseAdmin.from('game_events').insert({
            type: 'ADMIN_ACTION',
            team_id: targetTeams[0],
            payload: { action: 'NOTIFICATION_SENT', title, message, type: notifTypeValue, priority: priorityValue, reason },
            metadata: { source: 'bureau', timestamp: now },
          })
        } else {
          await supabaseAdmin.from('game_events').insert({
            type: 'ADMIN_ACTION',
            payload: { action: 'NOTIFICATION_SENT', target, teamCount: targetTeams.length, title, message, type: notifTypeValue, priority: priorityValue, reason },
            metadata: { source: 'bureau', timestamp: now },
          })
        }

        return jsonResponse(200, {
          success: true,
          teamsNotified: targetTeams.length,
        })
      }

      case 'grant-hint': {
        const { teamId, nodeId, hintNumber, reason } = params as {
          teamId: string
          nodeId: string
          hintNumber: number
          reason?: string
        }

        if (!teamId || !nodeId || !hintNumber) {
          return jsonResponse(400, { error: 'teamId, nodeId, and hintNumber are required' })
        }

        const { error: hintError } = await supabaseAdmin
          .from('hints_used')
          .insert({
            team_id: teamId,
            node_id: nodeId,
            hint_number: hintNumber,
            time_penalty_seconds: [0, 120, 300, 600][hintNumber] ?? 600,
          })

        if (hintError) {
          if (hintError.message.includes('duplicate')) {
            return jsonResponse(409, { error: 'Hint already granted for this node' })
          }
          return jsonResponse(400, { error: hintError.message })
        }

        const { data: node } = await supabaseAdmin
          .from('puzzle_nodes')
          .select('answer_metadata')
          .eq('id', nodeId)
          .single()

        let hintContent = 'Emergency hint granted by Bureau.'
        if (node?.answer_metadata) {
          const meta = node.answer_metadata as { hints?: string[] }
          if (meta.hints && meta.hints[hintNumber - 1]) {
            hintContent = meta.hints[hintNumber - 1]
          }
        }

        await supabaseAdmin.from('notifications').insert({
          team_id: teamId,
          target_roles: ['OBSERVER', 'ANALYST', 'OPERATOR'],
          type: 'HINT_AVAILABLE',
          title: 'Emergency Hint',
          message: hintContent,
          priority: 'HIGH',
          is_read: false,
        })

        await supabaseAdmin.from('game_events').insert({
          type: 'HINT_CONSUMED',
          team_id: teamId,
          node_id: nodeId,
          payload: { hintNumber, manual: true, reason },
        })

        await logAction('HINT_GRANT', teamId, undefined, { nodeId, hintNumber, reason, manual: true })

        return jsonResponse(200, { success: true, hintContent })
      }

      case 'manual_unlock': {
        const { teamId, nodeId: unlockNodeId, reason: unlockReason } = params as {
          teamId: string
          nodeId?: string
          reason?: string
        }

        if (!teamId || !unlockNodeId) {
          return jsonResponse(400, { error: 'teamId and nodeId are required' })
        }

        const { data, error } = await supabaseAdminUser.rpc('bureau_manual_unlock', {
          p_team_id: teamId,
          p_node_id: unlockNodeId,
          p_reason: unlockReason ?? 'Administrative unlock',
        })

        if (error) {
          console.error('bureau_manual_unlock error:', error)
          return jsonResponse(400, { error: error.message })
        }

        await logAction('NODE_UNLOCK', teamId, undefined, { nodeId: unlockNodeId, reason: unlockReason, manual: true })

        return jsonResponse(200, { success: true, result: data })
      }

      default:
         return jsonResponse(400, { error: `Unknown action: ${action}` })
    }
  } catch (err: unknown) {
    console.error('Unhandled error in bureau-operations:', err)
    return jsonResponse(500, { error: 'Internal server error' })
  }
})

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
