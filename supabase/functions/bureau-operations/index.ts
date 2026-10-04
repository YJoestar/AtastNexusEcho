/**
 * NEXUS — Bureau Operations Edge Function
 *
 * All Bureau (admin) mutations flow through this single function.
 * Each action is verified against the admin_users table.
 * Supported actions:
 *   - provision-team  { teamName, players:[{name, role}], idempotencyKey? }
 *   - create-team     { teamName }
 *   - add-player      { teamId, displayName, role }
 *   - generate-code    { playerId }              (rotate one player's code)
 *   - generate-codes   { teamId }               (rotate every player's code)
 *   - reissue-codes    { teamId, playerIds? }   (alias of generate-codes)
 *   - reveal-codes     { teamId }               (read only — never rotates)
 *   - start-team       { teamId, reason }
 *   - pause-team       { teamId, reason }
 *   - resume-team      { teamId, reason }
 *   - complete-team    { teamId, reason }
 *   - disqualify-team  { teamId, reason }
 *   - reset-team       { teamId, reason }
 *   - reassign-role    { playerId, newRole, reason }
   *   - get-team-details { teamId }
   *   - start-game     { reason }           (start all pre-start teams)
   *   - pause-game     { reason }           (pause all active teams)
   *   - end-game       { reason }           (complete all active/paused teams)
   *   - reset-game     { reason }           (reset all teams' progression)
 *   - update-game-config { config }       (update game_config key/values)
 *   - list-locations        { }              (list all locations with node info)
 *   - get-location          { nodeId }       (get location override + history for a node)
 *   - create-location       { nodeId, name, status?, reason? }
 *   - delete-location       { nodeId, reason? }
 *   - send-notification     { target, teamIds?, title, message, notifType?, priority?, targetRoles?, reason? }
 *   - list-qr-codes          { }               (list all QR codes with puzzle node info for printing)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { encryptLoginCode, decryptLoginCode } from '../_shared/loginCodeCipher.ts'
import { BadRequestError, readJsonObject } from '../_shared/request.ts'
import { preflightOrMethodError, dbError } from '../_shared/http.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReissueRpcRow {
  player_id: string
  name: string
  player_role: string
  login_code: string
  auth_user_id: string | null
  auth_user_email: string | null
}

interface IssuedCredential {
  playerId: string
  name: string
  role: string
  loginCode: string
}

/** A roster row as `reveal-codes` needs it: hash presence, cipher, identity. */
interface RosterCredentialRow {
  id: string
  display_name: string
  role: string
  status: string
  login_code_hash: string | null
  login_code_cipher: string | null
}

interface RevealedPlayerCode {
  playerId: string
  displayName: string
  role: string
  status: string
  /** null when there is no code to show, or it cannot be decrypted. */
  loginCode: string | null
  /** A live code whose ciphertext is unreadable: only a re-issue can fix it. */
  needsReissue: boolean
  /** The player already logged in, so the code was consumed on purpose. */
  used: boolean
}

/** An action that failed for a reason the Bureau should see verbatim. */
class BureauActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BureauActionError'
  }
}

/** The caller is a valid admin but not allowed to do this (HTTP 403). */
class BureauForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BureauForbiddenError'
  }
}

/**
 * Actions that destroy data or end/disqualify teams irreversibly. They need a
 * SUPER_ADMIN, matching bureau_reset_team / bureau_reset_node in the database
 * (migration 2026100309). Everything else stays available to ADMIN.
 */
export const SUPER_ADMIN_ACTIONS: ReadonlySet<string> = new Set([
  'reset-team',
  'reset-game',
  'end-game',
  'disqualify-team',
  'delete-location',
])

function dbErrorResponse(error: { code?: string | null; message?: string | null }) {
  const { status, message } = dbError(error)
  return jsonResponse(status, { error: message })
}

/** Map an action failure onto an HTTP status without leaking internals. */
function bureauErrorResponse(err: unknown) {
  if (err instanceof BadRequestError) return jsonResponse(400, { error: err.message })
  if (err instanceof BureauForbiddenError) return jsonResponse(403, { error: err.message })
  const message = err instanceof Error ? err.message : 'Unknown error'
  if (err instanceof BureauActionError) {
    const locked = message.includes('roster is locked') || message.includes('Team not found')
    return jsonResponse(locked ? 403 : 400, { error: message })
  }
  console.error('Unexpected bureau-operations error:', err)
  return jsonResponse(500, { error: 'Internal server error' })
}

Deno.serve(async (req: Request) => {
  const early = preflightOrMethodError(req, corsHeaders)
  if (early) return early

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
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)
    const user = userData?.user ?? null

    if (authError || !user) {
      return jsonResponse(401, { error: 'Invalid session' })
    }

    // An authenticated user with no admin row is not an authentication
    // problem — the session is fine, the grant is missing. 403 says that;
    // 401 told the client its token was bad, which sent operators re-authenticating
    // with perfectly good credentials.
    const { data: adminRecord, error: adminLookupError } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (adminLookupError) {
      console.error('admin_users lookup failed:', adminLookupError)
      return jsonResponse(500, { error: 'Could not verify your permissions. Please try again.' })
    }

    if (!adminRecord) {
      return jsonResponse(403, { error: 'This account is not authorised for Bureau operations' })
    }

    const isAdmin = adminRecord.role === 'ADMIN' || adminRecord.role === 'SUPER_ADMIN'
    if (!isAdmin) {
      return jsonResponse(403, { error: 'This account is not authorised for Bureau operations' })
    }

    const adminUserId = user.id

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

    // Store each issued code encrypted so the admin can display that same code
    // again later without it ever being written to the database in the clear.
    // Best effort: if this fails the code still works for login, and the display
    // honestly reports it as needing a re-issue instead of showing nothing.
    async function persistLoginCodeCiphers(
      issued: Array<{ playerId: string; loginCode: string }>,
    ): Promise<{ stored: number; failed: number }> {
      let stored = 0
      let failed = 0
      await Promise.all(
        issued.map(async credential => {
          // A missing field here means the caller built the wrong shape. Without
          // this guard encryptLoginCode(undefined) throws per player and the
          // Bureau silently ends up with no re-displayable codes at all.
          if (!credential?.playerId || !credential?.loginCode) {
            failed += 1
            console.error(
              'Refusing to store a login code cipher for an incomplete credential',
              credential,
            )
            return
          }
          try {
            const cipher = await encryptLoginCode(credential.loginCode)
            const { error: cipherError } = await supabaseAdmin
              .from('players')
              .update({ login_code_cipher: cipher })
              .eq('id', credential.playerId)
            if (cipherError) {
              failed += 1
              console.error('Could not store the encrypted code:', cipherError.message)
            } else {
              stored += 1
            }
          } catch (err: unknown) {
            failed += 1
            console.error('Could not store the encrypted code:', err)
          }
        }),
      )
      if (failed > 0) {
        console.error(`login code cipher storage incomplete: ${stored} stored, ${failed} failed`)
      }
      return { stored, failed }
    }

    // Rotate login codes in the database (transactional) and then make each new
    // code usable as that player's Supabase Auth password. The database half
    // returns the plaintext codes exactly once; the Auth half can never join a
    // SQL transaction, so a failure here is reported and repaired by rotating
    // again rather than by leaving a code that no one can log in with.
    async function issueCredentials(
      teamId: string,
      playerIds?: string[],
    ): Promise<{ credentials: IssuedCredential[]; failures: string[] }> {
      const { data, error } = await supabaseAdminUser.rpc('bureau_reissue_login_codes', {
        p_team_id: teamId,
        p_player_ids: playerIds && playerIds.length > 0 ? playerIds : null,
      })

      if (error) {
        if (error.code === '42501') {
          throw new BureauForbiddenError(dbError(error).message)
        }
        throw new BureauActionError(dbError(error).message)
      }

      const rows = (Array.isArray(data) ? data : []) as ReissueRpcRow[]
      const credentials: IssuedCredential[] = []
      const failures: string[] = []

      for (const row of rows) {
        // A provisioned player already owns this internal auth user, so the
        // password is rotated rather than a duplicate user created.
        if (row.auth_user_id) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            row.auth_user_id,
            { password: row.login_code },
          )
          if (updateError) {
            failures.push(`${row.name}: ${updateError.message}`)
            continue
          }
        } else {
          const internalEmail = row.auth_user_email ?? `nexus+${row.player_id}@internal`
          const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: internalEmail,
            password: row.login_code,
email_confirm: true,
              // supabase-js v2 forwards AdminUserAttributes to GoTrue; the
              // field is `user_metadata`. `user_data` is not part of the type
              // and was dropped silently, so the player link never landed.
              user_metadata: { player_id: row.player_id },
          })

          if (createError || !authData?.user) {
            failures.push(`${row.name}: ${createError?.message ?? 'Failed to create auth user'}`)
            continue
          }

          const { error: linkError } = await supabaseAdmin
            .from('players')
            .update({ auth_user_id: authData.user.id, auth_user_email: internalEmail })
            .eq('id', row.player_id)

          if (linkError) {
            failures.push(`${row.name}: ${linkError.message}`)
            continue
          }
        }

        // Only a code whose Auth password now matches its stored hash is
        // reported, so the Bureau is never handed a code that cannot be used.
        credentials.push({
          playerId: row.player_id,
          name: row.name,
          role: row.player_role,
          loginCode: row.login_code,
        })
      }

      await persistLoginCodeCiphers(credentials)

      return { credentials, failures }
    }

    async function issueCredentialsWithRetry(
      teamId: string,
      playerIds?: string[],
    ): Promise<IssuedCredential[]> {
      let attempt = await issueCredentials(teamId, playerIds)

      // The stored hash and the Auth password must agree. One automatic
      // rotation repairs a transient Auth failure and guarantees we never
      // hand the Bureau a code that cannot be logged in with.
      if (attempt.failures.length > 0) {
        attempt = await issueCredentials(teamId, playerIds)
      }

      if (attempt.failures.length > 0) {
        throw new BureauActionError(
          `Could not issue a working login code for ${attempt.failures.join('; ')}. Nothing was reported as issued — retry to rotate again.`,
        )
      }

      return attempt.credentials
    }

    const { action, ...params } = await readJsonObject(req)
    if (typeof action !== 'string' || !action) {
      return jsonResponse(400, { error: 'Missing action' })
    }

    // --- SUPER_ADMIN gate for destructive actions (403, not 401/500) ---
    if (SUPER_ADMIN_ACTIONS.has(action) && adminRecord.role !== 'SUPER_ADMIN') {
      return jsonResponse(403, { error: 'This action requires a super administrator' })
    }

    /**
     * Applies a team status change that is only legal from certain states.
     *
     * PostgREST reports "the filter matched nothing" as a success with an empty
     * result set, not as an error. Pausing an already-paused team therefore
     * answered { success: true } while changing nothing, leaving the operator
     * believing a team had been paused when it had not. The two real outcomes
     * are now separated: no such team is a 404, and a team in a state that does
     * not allow the transition is a 409 that names the state it is actually in.
     */
    async function transitionTeamStatus(
      teamId: string,
      nextStatus: string,
      allowedFrom: string[],
      extraColumns: Record<string, unknown> = {},
    ): Promise<Response | null> {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('teams')
        .update({ status: nextStatus, updated_at: new Date().toISOString(), ...extraColumns })
        .eq('id', teamId)
        .in('status', allowedFrom)
        .select('id')

      if (updateError) return dbErrorResponse(updateError)

      if (!updated || updated.length === 0) {
        const { data: current } = await supabaseAdmin
          .from('teams')
          .select('status')
          .eq('id', teamId)
          .maybeSingle()

        if (!current) {
          return jsonResponse(404, { error: 'Team not found' })
        }
        return jsonResponse(409, {
          error: `This team is ${current.status} and cannot be changed to ${nextStatus}`,
          currentStatus: current.status,
          allowedFrom,
        })
      }

      return null
    }

    // --- Log admin action ---
    async function logAction(actionType: string, targetTeamId?: string, targetPlayerId?: string, payload?: Record<string, unknown>) {
      try {
        const { error } = await supabaseAdmin.from('audit_log').insert({
          admin_id: adminUserId,
          action_type: actionType,
          target_team_id: targetTeamId ?? null,
          target_player_id: targetPlayerId ?? null,
          payload: payload ?? {},
          reason: (params as Record<string, unknown>).reason as string ?? '',
          ip_address: clientIp,
        })
        if (error) {
          console.warn(`audit_log insert failed for action ${actionType}:`, error.message)
        }
      } catch (err: unknown) {
        console.warn(`logAction threw for action ${actionType}:`, err)
      }
    }

    // --- Route actions ---
    switch (action) {
      case 'provision-team': {
        const { teamName, players, idempotencyKey } = params as {
          teamName: string
          players: Array<{ name: string; role: string }>
          idempotencyKey?: string
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
        // One wizard session sends one idempotency key, so a retry (double
        // submit, lost response) resolves to the same team with freshly
        // rotated codes instead of provisioning a duplicate team.
        const { data: provisionData, error: provisionError } = await supabaseAdminUser.rpc(
          'bureau_provision_team',
          {
            p_team_name: teamName,
            p_players: players,
            p_idempotency_key: idempotencyKey ?? null,
          },
        )

        if (provisionError) {
          return dbErrorResponse(provisionError)
        }

        const provisioned = Array.isArray(provisionData) ? provisionData[0] : provisionData
        if (!provisioned?.team_id) {
          return jsonResponse(500, { error: 'Provisioning returned no result' })
        }

        const replayed = provisioned.replayed === true

        const provisionedPlayers: Array<{
          player_id: string
          name: string
          role: string
          login_code: string
        }> = Array.isArray(provisioned.players) ? provisioned.players : []

        // --- Auth half: cannot join the SQL transaction, so compensate ---
        const createdAuthUserIds: string[] = []
        try {
          for (const p of provisionedPlayers) {
            const { data: existingPlayer } = await supabaseAdmin
              .from('players')
              .select('auth_user_id, auth_user_email')
              .eq('id', p.player_id)
              .single()

            // A retried wizard reaches players that already own an auth user.
            if (existingPlayer?.auth_user_id) {
              const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
                existingPlayer.auth_user_id,
                { password: p.login_code },
              )
              if (updateErr) {
                throw new Error(updateErr.message)
              }
              continue
            }

            const internalEmail = existingPlayer?.auth_user_email ?? `nexus+${p.player_id}@internal`
            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
              email: internalEmail,
              password: p.login_code,
              email_confirm: true,
              // supabase-js v2 forwards AdminUserAttributes to GoTrue; the
              // field is `user_metadata`. `user_data` is not part of the type
              // and was dropped silently, so the player link never landed.
              user_metadata: { player_id: p.player_id },
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
          // Compensating rollback so no half-provisioned team survives. A
          // replayed submission must NOT be rolled back: that team predates
          // this request and deleting it would destroy the original roster.
          const reason = provisionFailure instanceof Error ? provisionFailure.message : 'unknown error'
          console.error('provision-team auth sync failed:', reason)

          if (replayed) {
            return jsonResponse(500, {
              error: 'Could not issue working login codes for the existing team. It was left in place — retry to rotate its codes again.',
            })
          }

          // The rollback is compensating work. It must not mask the original
          // failure, but it also must not be silent: a half-deleted roster or an
          // orphaned auth account is exactly what an operator must be able to
          // find afterwards, so every step is reported.
          for (const authUserId of createdAuthUserIds) {
            try {
              const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
              if (deleteError) {
                console.error(
                  `Rollback could not remove auth user ${authUserId}; it is orphaned and must be deleted manually:`,
                  deleteError.message,
                )
              }
            } catch (err: unknown) {
              console.error(
                `Rollback threw while removing auth user ${authUserId}; it is orphaned and must be deleted manually:`,
                err,
              )
            }
          }
          for (const table of ['game_events', 'audit_log', 'players', 'teams']) {
            try {
              const { error: deleteError } = await supabaseAdmin
                .from(table)
                .delete()
                .eq(table === 'teams' ? 'id' : 'team_id', provisioned.team_id)
              if (deleteError) {
                console.error(
                  `Rollback could not clear ${table} for team ${provisioned.team_id}:`,
                  deleteError.message,
                )
              }
            } catch (err: unknown) {
              console.error(
                `Rollback threw while clearing ${table} for team ${provisioned.team_id}:`,
                err,
              )
            }
          }
          return jsonResponse(500, {
            error: 'Provisioning failed and was rolled back. No team was created.',
          })
        }

        await logAction('TEAM_CREATE', provisioned.team_id, undefined, {
          action: replayed ? 'PROVISION_REPLAY' : 'PROVISION',
          players: provisionedPlayers.length,
        })

        // provisionedPlayers is the SQL row shape (snake_case); the cipher
        // helper takes the credential shape. Passing it straight through gave
        // every entry an undefined playerId/loginCode, so encryptLoginCode threw
        // for each player and the whole roster ended up with no stored cipher —
        // which is what `reveal-codes` needs to show the Bureau the codes again.
        await persistLoginCodeCiphers(
          provisionedPlayers.map(row => ({
            playerId: row.player_id,
            loginCode: row.login_code,
          })),
        )

        return jsonResponse(200, {
          success: true,
          idempotent: replayed,
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

        if (error) return dbErrorResponse(error)

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

        if (error) return dbErrorResponse(error)

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

        const { data: playerData, error: playerError } = await supabaseAdmin
          .from('players')
          .select('team_id')
          .eq('id', playerId)
          .single()

        if (playerError || !playerData) {
          return jsonResponse(404, { error: 'Player not found' })
        }

        try {
          const credentials = await issueCredentialsWithRetry(playerData.team_id, [playerId])
          const issued = credentials[0]
          if (!issued) {
            return jsonResponse(400, { error: 'Player not found' })
          }

          await logAction('ROLE_ASSIGN', playerData.team_id, playerId, { action: 'REISSUE_CODE' })

          return jsonResponse(200, {
            success: true,
            playerId,
            displayName: issued.name,
            role: issued.role,
            loginCode: issued.loginCode,
          })
        } catch (issueError: unknown) {
          return bureauErrorResponse(issueError)
        }
      }

      case 'generate-codes':
      case 'reissue-codes': {
        const { teamId, playerIds } = params as { teamId: string; playerIds?: string[] }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        try {
          const credentials = await issueCredentialsWithRetry(teamId, playerIds)

          await logAction('ROLE_ASSIGN', teamId, undefined, {
            action: 'REISSUE_CODES',
            count: credentials.length,
          })

          const { data: team } = await supabaseAdmin
            .from('teams')
            .select('id, code, name')
            .eq('id', teamId)
            .single()

          return jsonResponse(200, {
            success: true,
            team: {
              id: teamId,
              code: team?.code ?? null,
              name: team?.name ?? null,
            },
            codes: credentials.map(c => ({
              playerId: c.playerId,
              role: c.role,
              displayName: c.name,
              loginCode: c.loginCode,
            })),
          })
        } catch (issueError: unknown) {
          return bureauErrorResponse(issueError)
        }
      }

      // Read the codes a team already has. This never rotates anything: a
      // player asking "what was my code?" must not lose the code they are
      // holding. A player whose code is absent here is reported as needing a
      // re-issue — never given a guess, and never rotated behind their back.
      case 'reveal-codes': {
        const { teamId } = params as { teamId: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        const { data: team, error: teamError } = await supabaseAdmin
          .from('teams')
          .select('id, code, name')
          .eq('id', teamId)
          .single()

        if (teamError || !team) {
          return jsonResponse(404, { error: 'Team not found' })
        }

        const { data: roster, error: rosterError } = await supabaseAdmin
          .from('players')
          .select('id, display_name, role, status, login_code_hash, login_code_cipher')
          .eq('team_id', teamId)
          .order('created_at', { ascending: true })

        if (rosterError) {
          return dbErrorResponse(rosterError)
        }

        const players = await Promise.all(
          (roster ?? []).map(async (player: RosterCredentialRow): Promise<RevealedPlayerCode> => {
            // A code exists only while its hash does: the hash is cleared the
            // moment the player logs in, and clearing it clears the cipher too.
            const hasActiveCode =
              typeof player.login_code_hash === 'string' && player.login_code_hash.length > 0
            const loginCode = hasActiveCode
              ? await decryptLoginCode(player.login_code_cipher ?? null)
              : null

            return {
              playerId: player.id,
              displayName: player.display_name,
              role: player.role,
              status: player.status,
              loginCode,
              // The admin is told plainly which codes need a re-issue instead of
              // being left staring at an empty slot.
              needsReissue: hasActiveCode && loginCode === null,
              used: !hasActiveCode,
            }
          }),
        )

        await logAction('CODE_REVEAL', teamId, undefined, {
          action: 'REVEAL_CODES',
          count: players.filter(p => p.loginCode !== null).length,
        })

        return jsonResponse(200, {
          success: true,
          team: { id: team.id, code: team.code, name: team.name },
          players,
        })
      }

      case 'start-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        // Verify all players have logged in
        const { data: players, error: playerError } = await supabaseAdmin
          .from('players')
          .select('auth_user_id, device_session_token')
          .eq('team_id', teamId)

        if (playerError) return dbErrorResponse(playerError)

        const allLoggedIn = players.length === 3 &&
          players.every(p => p.auth_user_id && p.device_session_token)

        if (!allLoggedIn) {
          return jsonResponse(400, {
            error: 'All 3 players must have logged in and bound their devices before starting',
            playersLoggedIn: players.filter(p => p.auth_user_id && p.device_session_token).length,
          })
        }

        // Read the team's current status to decide on the transition path.
        const { data: teamRow, error: teamFetchError } = await supabaseAdmin
          .from('teams')
          .select('status')
          .eq('id', teamId)
          .single()

        if (teamFetchError) return dbErrorResponse(teamFetchError)

        const currentStatus = teamRow?.status

        // Only teams in pre-game statuses can be started.
        const preGameStatuses = ['REGISTERED', 'FORMING', 'READY', 'WAITING']
        if (!preGameStatuses.includes(currentStatus ?? '')) {
          return jsonResponse(400, {
            error: `Team must be in a pre-game status to start, current status is ${currentStatus}`,
          })
        }

        const now = new Date().toISOString()

        // If not already WAITING, transition to WAITING first.
        // Only READY -> WAITING is valid per the status-transition trigger.
        // REGISTERED and FORMING teams don't have 3 logged-in players yet,
        // so they would have been rejected by the player check above.
        if (currentStatus !== 'WAITING') {
          const { error: waitingError } = await supabaseAdmin
            .from('teams')
            .update({ status: 'WAITING', updated_at: now })
            .eq('id', teamId)
            .in('status', ['READY'])

          if (waitingError) {
            return jsonResponse(400, {
              error: `Could not move team to WAITING status: ${dbError(waitingError).message}`,
            })
          }
        }

        // Now transition WAITING -> ACTIVE. bureau_start_team does this and
        // also logs the audit + game event.
        const { data: rpcData, error: rpcError } = await supabaseAdminUser.rpc('bureau_start_team', {
          p_team_id: teamId,
          p_reason: reason ?? 'Started by Bureau',
        })

        if (rpcError) {
          if (rpcError.message.includes('WAITING')) {
            return jsonResponse(400, { error: 'Team must be in WAITING status to start' })
          }
          return dbErrorResponse(rpcError)
        }

        return jsonResponse(200, { success: true, teamId, startedAt: rpcData[0]?.started_at })
      }

      case 'pause-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const refusal = await transitionTeamStatus(teamId, 'PAUSED', ['ACTIVE'])
        if (refusal) return refusal
        await logAction('TEAM_PAUSE', teamId, undefined, { reason })
        return jsonResponse(200, { success: true, teamId })
      }

      case 'resume-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const refusal = await transitionTeamStatus(teamId, 'ACTIVE', ['PAUSED'])
        if (refusal) return refusal
        await logAction('TEAM_RESUME', teamId, undefined, { reason })

        // The event stream is what the live monitor and the audit trail read, so
        // a resume has to appear there too. It previously wrote no event at all,
        // leaving TEAM_RESUMED permanently absent from the record.
        const { error: eventError } = await supabaseAdmin.from('game_events').insert({
          type: 'TEAM_RESUMED',
          team_id: teamId,
          payload: { reason: reason ?? 'Resumed by Bureau' },
        })
        if (eventError) {
          console.error(`TEAM_RESUMED event not recorded for team ${teamId}:`, eventError.message)
        }

        return jsonResponse(200, { success: true, teamId })
      }

      case 'complete-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const completedAt = new Date().toISOString()
        const refusal = await transitionTeamStatus(teamId, 'COMPLETED', ['ACTIVE', 'PAUSED'], {
          completed_at: completedAt,
        })
        if (refusal) return refusal
        await logAction('TEAM_COMPLETE', teamId, undefined, { reason })

        const { error: eventError } = await supabaseAdmin.from('game_events').insert({
          type: 'TEAM_COMPLETED',
          team_id: teamId,
          payload: { reason },
        })
        if (eventError) {
          console.error(`TEAM_COMPLETED event not recorded for team ${teamId}:`, eventError.message)
        }

        return jsonResponse(200, { success: true, teamId })
      }

      case 'disqualify-team': {
        const { teamId, reason } = params as { teamId: string; reason?: string }
        const refusal = await transitionTeamStatus(teamId, 'DISQUALIFIED', ['ACTIVE', 'PAUSED', 'WAITING'])
        if (refusal) return refusal
        await logAction('TEAM_DISQUALIFY', teamId, undefined, { reason })

        const { error: eventError } = await supabaseAdmin.from('game_events').insert({
          type: 'TEAM_DISQUALIFIED',
          team_id: teamId,
          payload: { reason },
        })
        if (eventError) {
          console.error(`TEAM_DISQUALIFIED event not recorded for team ${teamId}:`, eventError.message)
        }

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

        if (error) return dbErrorResponse(error)

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

        if (error) return dbErrorResponse(error)
        await logAction('ROLE_REASSIGN', player.team_id, playerId, { from: player.role, to: newRole, reason })

        return jsonResponse(200, { success: true, playerId, newRole })
      }

      case 'get-team-details': {
        const { teamId } = params as { teamId: string }
        if (!teamId) return jsonResponse(400, { error: 'teamId is required' })

        const [teamResult, playersResult] = await Promise.all([
          supabaseAdmin
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .maybeSingle(),
          supabaseAdmin
            .from('players')
            .select('id, team_id, role, display_name, status, is_connected, last_seen_at, created_at, joined_at, auth_user_id, device_session_token')
            .eq('team_id', teamId)
            .order('role'),
        ])

        // Both checked. These two queries had their errors discarded entirely,
        // so a failure answered 200 with { team: null, players: [] } — which
        // the dossier renders as a team that exists with no roster.
        if (teamResult.error) return dbErrorResponse(teamResult.error)
        if (playersResult.error) return dbErrorResponse(playersResult.error)

        const team = teamResult.data
        const players = playersResult.data

        if (!team) return jsonResponse(404, { error: 'Team not found' })

        return jsonResponse(200, {
          success: true,
          team,
          players: players ?? [],
        })
      }

      case 'list-teams': {
        // Every one of these four reads discarded its error, so a database fault
        // answered 200 with `teams: []` and the operator was told "ARCHIVE EMPTY
        // // NO MATCHING FIELD RECORDS" — the worst possible message during a live
        // event, because it looks like a correct answer.
        const { data: teams, error: teamsError } = await supabaseAdmin
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false })

        if (teamsError) {
          console.error('list-teams: teams query failed:', teamsError)
          return dbErrorResponse(teamsError)
        }

        const { data: playerCounts, error: playerCountsError } = await supabaseAdmin
          .from('players')
          .select('team_id, role')

        if (playerCountsError) {
          console.error('list-teams: players query failed:', playerCountsError)
          return dbErrorResponse(playerCountsError)
        }

        const { data: progressData, error: progressError } = await supabaseAdmin
          .from('team_progress')
          .select('team_id, hints_used, score, started_at')

        if (progressError) {
          console.error('list-teams: team_progress query failed:', progressError)
          return dbErrorResponse(progressError)
        }

        const { data: solvedCounts, error: solvedCountsError } = await supabaseAdmin
          .from('node_progress')
          .select('team_id, status')
          .eq('status', 'SOLVED')

        if (solvedCountsError) {
          console.error('list-teams: node_progress query failed:', solvedCountsError)
          return dbErrorResponse(solvedCountsError)
        }

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

        const { data: team, error: teamError } = await supabaseAdmin
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .maybeSingle()

        if (teamError) return dbErrorResponse(teamError)
        if (!team) return jsonResponse(404, { error: 'Team not found' })

        // The five detail queries used to discard their errors, so any of them
        // failing produced a dossier with a hole in it and no indication that
        // anything was missing — e.g. no submissions at all, which reads as
        // "this team has attempted nothing".
        const [playersResult, progressResult, nodeProgressResult, hintsResult, submissionsResult] =
          await Promise.all([
            supabaseAdmin
              .from('players')
              .select('id, team_id, role, display_name, status, is_connected, last_seen_at, created_at, joined_at, auth_user_id, device_session_token, login_code_hash, login_code_expires_at, updated_at')
              .eq('team_id', teamId)
              .order('role'),
            supabaseAdmin
              .from('team_progress')
              .select('*')
              .eq('team_id', teamId)
              .maybeSingle(),
            supabaseAdmin
              .from('node_progress')
              .select('*, puzzle_nodes!inner(code, title, type, stage, location)')
              .eq('team_id', teamId)
              .order('created_at', { ascending: true }),
            supabaseAdmin
              .from('hints_used')
              .select('*, puzzle_nodes!inner(code, title)')
              .eq('team_id', teamId)
              .order('used_at', { ascending: false }),
            supabaseAdmin
              .from('submissions')
              .select('*, puzzle_nodes!inner(code, title)')
              .eq('team_id', teamId)
              .order('submitted_at', { ascending: false })
              .limit(50),
          ])

        const detailError = playersResult.error
          ?? progressResult.error
          ?? nodeProgressResult.error
          ?? hintsResult.error
          ?? submissionsResult.error
        if (detailError) return dbErrorResponse(detailError)

        const players = playersResult.data
        const progress = progressResult.data
        const nodeProgress = nodeProgressResult.data
        const hintsUsed = hintsResult.data
        const submissions = submissionsResult.data

        const { data: gameEvents, error: gameEventsError } = await supabaseAdmin
          .from('game_events')
          .select('*')
          .eq('team_id', teamId)
          .order('timestamp', { ascending: false })
          .limit(50)

        if (gameEventsError) return dbErrorResponse(gameEventsError)

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

        if (error) return dbErrorResponse(error)

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

        if (error) return dbErrorResponse(error)

        return jsonResponse(200, { success: true, events: data ?? [] })
      }

      case 'get-game-state': {
        const [configResult, teamsResult] = await Promise.all([
          supabaseAdmin
            .from('game_config')
            .select('*')
            .in('key', ['game_duration_minutes', 'hint_penalties', 'rate_limit_submissions', 'login_code_ttl_minutes']),
          supabaseAdmin
            .from('teams')
            .select('status'),
        ])

        // Both reads are checked. A failure here used to be indistinguishable
        // from a real pre-game state: the team list came back empty, so
        // totalTeams was 0 and gameStatus resolved to NOT_STARTED. During a
        // database outage the Operations Control screen would therefore claim
        // the game had not begun, inviting an operator to press Start.
        if (teamsResult.error) return dbErrorResponse(teamsResult.error)
        if (configResult.error) return dbErrorResponse(configResult.error)

        const config = configResult.data
        const teams = teamsResult.data

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

        const [teamsResult, progressResult, solvedResult] = await Promise.all([
          supabaseAdmin
            .from('teams')
            .select('id, name, code, status, score, started_at, completed_at, current_node_id, current_node_code')
            .order('created_at', { ascending: false }),
          supabaseAdmin
            .from('team_progress')
            .select('team_id, hints_used, time_elapsed_minutes'),
          supabaseAdmin
            .from('node_progress')
            .select('team_id, status')
            .eq('status', 'SOLVED'),
        ])

        // Checked, because a dropped query here renders as a leaderboard where
        // every team shows zero solved and no time — a plausible-looking board
        // that is simply wrong, shown to the Bureau during a live event.
        const leaderboardError = teamsResult.error ?? progressResult.error ?? solvedResult.error
        if (leaderboardError) return dbErrorResponse(leaderboardError)

        const teams = teamsResult.data
        const progressData = progressResult.data
        const solvedCounts = solvedResult.data

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

      case 'list-puzzle-qa': {
        const { data: nodes, error: nodesError } = await supabaseAdmin
          .from('puzzle_nodes')
          .select('id, code, title, type, stage, location, prerequisites, branches, content, answer_metadata, metadata')
          .order('code')

        if (nodesError) {
          return dbErrorResponse(nodesError)
        }

        const nodeCodes = (nodes ?? []).map(n => n.code)

        const { data: evidenceItems, error: evidenceError } = await supabaseAdmin
          .from('evidence')
          .select('id, type, title, content, metadata')
          .in('metadata->nodeCode', nodeCodes)

        // Checked: an unchecked failure returned puzzles with no evidence
        // attached, which the QA screen reads as "this puzzle rewards nothing"
        // rather than "the evidence table could not be read".
        if (evidenceError) return dbErrorResponse(evidenceError)

        const evidenceByNodeCode = new Map<string, typeof evidenceItems>()
        for (const ev of evidenceItems ?? []) {
          const nodeCode = ev.metadata?.nodeCode
          if (!nodeCode) continue
          if (!evidenceByNodeCode.has(nodeCode)) {
            evidenceByNodeCode.set(nodeCode, [])
          }
          evidenceByNodeCode.get(nodeCode)!.push(ev)
        }

        const puzzles = (nodes ?? []).map(n => {
          const nodeEvidence = evidenceByNodeCode.get(n.code) ?? []
          const audioEvidence = nodeEvidence
            .filter(e => e.type === 'AUDIO' || (e.content as Record<string, unknown>)?.audio_url)
            .map(e => ({
              id: e.id,
              title: e.title,
              type: e.type,
              audioUrl: (e.content as Record<string, unknown>)?.audio_url ?? null,
              audioExists: Boolean((e.content as Record<string, unknown>)?.audio_url?.toString().startsWith('/audio/')),
              nodeCode: e.metadata?.nodeCode ?? null,
            }))

          const observerData = (n.content as Record<string, unknown>)?.observer as Record<string, unknown> | undefined
          const interactiveData = observerData?.interactiveData as Record<string, unknown> | undefined
          const contentAudioUrl = interactiveData?.audioUrl
          const contentAudioClips = interactiveData?.audioClips

          if (contentAudioUrl || contentAudioClips) {
            audioEvidence.push({
              id: `${n.id}-content`,
              title: `Puzzle Content Audio (${n.code})`,
              type: 'AUDIO',
              audioUrl: typeof contentAudioUrl === 'string' ? contentAudioUrl : null,
              audioExists: Boolean(interactiveData),
              nodeCode: n.code,
            })
          }

          return {
            id: n.id,
            code: n.code,
            title: n.title,
            type: n.type,
            stage: n.stage,
            location: n.location,
            prerequisites: n.prerequisites,
            branches: n.branches,
            content: n.content,
            answerMetadata: n.answer_metadata,
            evidence: nodeEvidence,
            audioEvidence,
          }
        })

        return jsonResponse(200, { success: true, puzzles })
      }

      case 'list-evidence-lab-catalog': {
        const [evidenceResult, inventoryResult, fragmentsResult, nodesResult] = await Promise.all([
          supabaseAdmin
            .from('evidence')
            .select('id, code, title, description, type, classification, content, metadata')
            .order('code'),
          supabaseAdmin
            .from('inventory_items')
            .select('id, code, name, description, type, rarity, properties, uses, metadata')
            .order('code'),
          supabaseAdmin
            .from('fragments')
            .select('id, code, label, content, type, role, node_id, position, metadata')
            .order('code'),
          supabaseAdmin
            .from('puzzle_nodes')
            .select('id, code, title, location')
            .order('code'),
        ])

        const catalogError = evidenceResult.error
          ?? inventoryResult.error
          ?? fragmentsResult.error
          ?? nodesResult.error
        if (catalogError) return dbErrorResponse(catalogError)

        return jsonResponse(200, {
          success: true,
          catalog: {
            evidence: evidenceResult.data ?? [],
            inventoryItems: inventoryResult.data ?? [],
            fragments: fragmentsResult.data ?? [],
            nodes: nodesResult.data ?? [],
          },
        })
      }

      case 'send-notification': {
        const { target, teamIds, title, message, type: notifType, priority, targetRoles, reason } = params as {
          target: 'single' | 'multiple' | 'all'
          teamIds?: string[]
          title: string
          message: string
          // The wire field is `type`; it is renamed to notifType on
          // destructuring. Declaring `notifType` here described a field the
          // body never reads, so the compiler could not see the rename.
          type?: string
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
          const { data: allTeams, error: allTeamsError } = await supabaseAdmin
            .from('teams')
            .select('id')
            .in('status', ['ACTIVE', 'PAUSED', 'WAITING', 'READY', 'FORMING'])

          if (allTeamsError) return dbErrorResponse(allTeamsError)
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

        // Each insert is checked. This loop used to discard its errors and then
        // report teamsNotified as the number of teams it *tried* to reach, so an
        // announcement that reached nobody was indistinguishable from one that
        // reached everybody — the worst possible outcome for a mid-event
        // instruction to all teams.
        const failedTeamIds: string[] = []
        for (const teamId of targetTeams) {
          const { error: insertError } = await supabaseAdmin.from('notifications').insert({
            team_id: teamId,
            target_roles: rolesValue,
            type: notifTypeValue,
            title,
            message,
            priority: priorityValue,
            is_read: false,
          })
          if (insertError) {
            console.error(`Notification not delivered to team ${teamId}:`, insertError.message)
            failedTeamIds.push(teamId)
          }
        }

        if (targetTeams.length > 0 && failedTeamIds.length === targetTeams.length) {
          return jsonResponse(500, {
            error: 'The notification could not be delivered to any team. Nothing was sent.',
            teamsNotified: 0,
            failedTeamIds,
          })
        }

        await logAction('ANNOUNCEMENT_SEND', undefined, undefined, {
          target,
          teamIds: targetTeams,
          title,
          message,
          type: notifTypeValue,
          priority: priorityValue,
          failedTeamIds,
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
          teamsNotified: targetTeams.length - failedTeamIds.length,
          ...(failedTeamIds.length > 0 ? { failedTeamIds } : {}),
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
          return dbErrorResponse(hintError)
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
          return dbErrorResponse(error)
        }

        await logAction('NODE_UNLOCK', teamId, undefined, { nodeId: unlockNodeId, reason: unlockReason, manual: true })

        return jsonResponse(200, { success: true, result: data })
      }

      case 'start-game': {
        const { reason } = params as { reason?: string }
        const now = new Date().toISOString()

        const { data: durationConfig } = await supabaseAdmin
          .from('game_config')
          .select('value')
          .eq('key', 'game_duration_minutes')
          .single()

        const durationMinutes = Number((durationConfig?.value as string) ?? '180')
        const deadline = new Date(Date.now() + durationMinutes * 60_000).toISOString()

        // Step 1: transition READY teams to WAITING first.
        // Only READY -> WAITING is valid per the status-transition trigger.
        // REGISTERED (1 player) and FORMING (2 players) cannot be started
        // because they don't have all 3 players.
        const { error: waitingError } = await supabaseAdmin
          .from('teams')
          .update({ status: 'WAITING', updated_at: now })
          .eq('status', 'READY')

        if (waitingError) return jsonResponse(400, { error: `Could not move teams to WAITING: ${dbError(waitingError).message}` })

        // Step 2: now transition all WAITING teams to ACTIVE.
        const { data: teams, error: startError } = await supabaseAdmin
          .from('teams')
          .update({
            status: 'ACTIVE',
            started_at: now,
            game_started_at: now,
            game_deadline: deadline,
            updated_at: now,
          })
          .eq('status', 'WAITING')
          .select('id')

        if (startError) return dbErrorResponse(startError)

        for (const t of teams ?? []) {
          await logAction('GAME_START', t.id, undefined, { startedAt: now, deadline, reason })
          await supabaseAdmin.from('game_events').insert({
            type: 'GAME_STARTED',
            team_id: t.id,
            payload: { startedAt: now, deadline, reason },
          })
        }

        return jsonResponse(200, {
          success: true,
          teamsStarted: (teams ?? []).length,
          startedAt: now,
          deadline,
        })
      }

      case 'pause-game': {
        const { reason } = params as { reason?: string }
        const { data: teams, error: pauseError } = await supabaseAdmin
          .from('teams')
          .update({ status: 'PAUSED', updated_at: new Date().toISOString() })
          .eq('status', 'ACTIVE')
          .select('id')

        if (pauseError) return dbErrorResponse(pauseError)

        for (const t of teams ?? []) {
          await logAction('GAME_PAUSE', t.id, undefined, { reason })
          await supabaseAdmin.from('game_events').insert({
            type: 'GAME_PAUSED',
            team_id: t.id,
            payload: { reason },
          })
        }

        return jsonResponse(200, {
          success: true,
          teamsPaused: (teams ?? []).length,
        })
      }
      case 'end-game': {
        const { reason } = params as { reason?: string }
        const now = new Date().toISOString()

        // The status-transition trigger only allows ACTIVE -> COMPLETED
        // and PAUSED -> COMPLETED. Teams in pre-game (WAITING/READY/etc.)
        // are not ended by end-game — use reset-game for those.
        const { data: teams, error: endError } = await supabaseAdmin
          .from('teams')
          .update({
            status: 'COMPLETED',
            completed_at: now,
            updated_at: now,
          })
          .in('status', ['ACTIVE', 'PAUSED'])
          .select('id')

        if (endError) return dbErrorResponse(endError)

        for (const t of teams ?? []) {
          await logAction('GAME_END', t.id, undefined, { reason })
          await supabaseAdmin.from('game_events').insert({
            type: 'GAME_ENDED',
            team_id: t.id,
            payload: { reason },
          })
        }

        return jsonResponse(200, {
          success: true,
          teamsEnded: (teams ?? []).length,
        })
      }

      case 'reset-game': {
        const { reason } = params as { reason?: string }
        if (!reason) return jsonResponse(400, { error: 'reason is required for reset' })

        const { data: allTeams, error: fetchError } = await supabaseAdmin
          .from('teams')
          .select('id')
          .not('status', 'in', '(COMPLETED, DISQUALIFIED, ABANDONED)')

        if (fetchError) return dbErrorResponse(fetchError)

        let resetCount = 0
        const resetFailures: Array<{ teamId: string; reason: string }> = []
        for (const t of allTeams ?? []) {
          const { error: resetError } = await supabaseAdminUser.rpc('bureau_reset_team', {
            p_team_id: t.id,
            p_reason: reason,
          })
          if (resetError) {
            // Reported, not swallowed. A partial reset used to answer 200 with
            // only the success count, leaving an operator believing the whole
            // field was back to its starting state when some teams still held
            // live progress.
            console.error(`Reset failed for team ${t.id}:`, resetError.message)
            resetFailures.push({ teamId: t.id, reason: resetError.message })
            continue
          }
          await logAction('TEAM_UPDATE', t.id, undefined, { action: 'GAME_RESET', reason })
          resetCount++
        }

        if (resetFailures.length > 0 && resetCount === 0) {
          return jsonResponse(500, {
            error: 'No team could be reset. Nothing was changed.',
            failedTeams: resetFailures,
          })
        }

        return jsonResponse(200, {
          success: true,
          teamsReset: resetCount,
          ...(resetFailures.length > 0 ? { failedTeams: resetFailures } : {}),
        })
      }

      case 'update-game-config': {
        const { config } = params as { config: Record<string, unknown> }
        if (!config || typeof config !== 'object') {
          return jsonResponse(400, { error: 'config object is required' })
        }

        const now = new Date().toISOString()
        const updatedKeys: string[] = []
        const failedKeys: Array<{ key: string; reason: string }> = []

        for (const [key, value] of Object.entries(config)) {
          if (['id', 'created_at', 'updated_at', 'updated_by'].includes(key)) continue
          if (value === null || value === undefined) continue

          const { error: upsertError } = await supabaseAdmin
            .from('game_config')
            .upsert({
              key,
              value: typeof value === 'string' ? `"${value}"` : JSON.stringify(value),
              description: null,
              updated_at: now,
              updated_by: adminUserId,
            })
            .select('key')

          if (upsertError) {
            // Logged loudly and reported to the caller. A partial config write
            // used to answer 200 with the failed key simply absent from
            // updatedKeys, so an operator could believe the game duration had
            // been changed when it had not.
            console.error(`Config update failed for ${key}:`, upsertError.message)
            failedKeys.push({ key, reason: upsertError.message })
          } else {
            updatedKeys.push(key)
          }
        }

        await logAction('CONFIG_UPDATE', undefined, undefined, {
          keys: updatedKeys,
          failedKeys: failedKeys.map(f => f.key),
          reason: (params as Record<string, unknown>).reason as string ?? '',
        })

        if (updatedKeys.length === 0 && failedKeys.length > 0) {
          return jsonResponse(500, {
            error: 'No configuration value could be saved.',
            failedKeys,
          })
        }

        return jsonResponse(200, {
          success: true,
          updatedKeys,
          ...(failedKeys.length > 0 ? { failedKeys } : {}),
        })
      }

      case 'list-locations': {
        const { data: locations, error: locationsError } = await supabaseAdmin
          .from('locations')
          .select(`
            id,
            node_id,
            name,
            status,
            created_at,
            updated_at,
            created_by,
            updated_by,
            puzzle_nodes:node_id (code, title, type, stage)
          `)
          .order('puzzle_nodes.code', { foreignTable: 'puzzle_nodes', ascending: true })

        // Checked: an unchecked failure rendered as "no locations configured",
        // which would have an operator conclude every puzzle is at its default
        // position when in fact the table could not be read.
        if (locationsError) return dbErrorResponse(locationsError)

        return jsonResponse(200, {
          success: true,
          locations: locations ?? [],
        })
      }

      case 'get-location': {
        const { nodeId } = params as { nodeId?: string }

        if (!nodeId) {
          return jsonResponse(400, { error: 'nodeId is required' })
        }

        const [locationResult, historyResult] = await Promise.all([
          supabaseAdmin
            .from('locations')
            .select(`
              id,
              node_id,
              name,
              status,
              created_at,
              updated_at,
              created_by,
              updated_by,
              puzzle_nodes:node_id (code, title, type, stage)
            `)
            .eq('node_id', nodeId)
            .order('created_at', { ascending: false })
            .maybeSingle(),
          supabaseAdmin
            .from('location_history')
            .select('*')
            .eq('node_id', nodeId)
            .order('created_at', { ascending: false }),
        ])

        // Both checked. A failure used to answer { location: null }, which the
        // editor reads as "this puzzle has no location override" — the exact
        // state an operator would then create one against.
        if (locationResult.error) return dbErrorResponse(locationResult.error)
        if (historyResult.error) return dbErrorResponse(historyResult.error)

        return jsonResponse(200, {
          success: true,
          location: locationResult.data ?? null,
          history: historyResult.data ?? [],
        })
      }

      case 'create-location': {
        const { nodeId, nodeCode, name, status, reason } = params as {
          nodeId?: string
          nodeCode?: string
          name: string
          status?: string
          reason?: string
        }

        let resolvedNodeId = nodeId

        if (!resolvedNodeId && nodeCode) {
          const { data: nodeData } = await supabaseAdmin
            .from('puzzle_nodes')
            .select('id')
            .eq('code', nodeCode)
            .maybeSingle()
          resolvedNodeId = nodeData?.id
        }

        if (!resolvedNodeId) {
          return jsonResponse(400, { error: 'nodeId or nodeCode is required' })
        }

        if (!name || name.trim().length < 1 || name.trim().length > 200) {
          return jsonResponse(400, { error: 'Location name must be 1-200 characters' })
        }

        const validStatus = ['ACTIVE', 'INACTIVE']
        if (status && !validStatus.includes(status)) {
          return jsonResponse(400, { error: 'Invalid status' })
        }

        const { data: existing } = await supabaseAdmin
          .from('locations')
          .select('id')
          .eq('node_id', resolvedNodeId)
          .maybeSingle()

        const now = new Date().toISOString()

        if (existing) {
          const { error: histError } = await supabaseAdmin.from('location_history').insert({
            location_id: existing.id,
            node_id: resolvedNodeId,
            name: name.trim(),
            status: status ?? 'ACTIVE',
            created_by: user.id,
            reason: reason ?? '',
          })

          if (histError) {
            console.warn('Failed to write location history:', histError.message)
          }

          const { error: updateError } = await supabaseAdmin
            .from('locations')
            .update({
              name: name.trim(),
              status: status ?? 'ACTIVE',
              updated_at: now,
              updated_by: user.id,
            })
            .eq('node_id', resolvedNodeId)

          if (updateError) {
            return dbErrorResponse(updateError)
          }

          await logAction('LOCATION_UPDATE', undefined, undefined, { nodeId: resolvedNodeId, name, reason })

          return jsonResponse(200, { success: true, action: 'updated' })
        } else {
          const { data: newLocation, error: insertError } = await supabaseAdmin
            .from('locations')
            .insert({
              node_id: resolvedNodeId,
              name: name.trim(),
              status: status ?? 'ACTIVE',
              created_by: user.id,
            })
            .select()
            .single()

          if (insertError) {
            return dbErrorResponse(insertError)
          }

          const { error: histError } = await supabaseAdmin.from('location_history').insert({
            location_id: newLocation.id,
            node_id: resolvedNodeId,
            name: name.trim(),
            status: status ?? 'ACTIVE',
            created_by: user.id,
            reason: reason ?? '',
          })

          if (histError) {
            console.warn('Failed to write location history:', histError.message)
          }

          await logAction('LOCATION_CREATE', undefined, undefined, { nodeId: resolvedNodeId, name, reason })

          return jsonResponse(200, { success: true, action: 'created', location: newLocation })
        }
      }

      case 'delete-location': {
        const { nodeId, nodeCode, reason } = params as {
          nodeId?: string
          nodeCode?: string
          reason?: string
        }

        let resolvedNodeId = nodeId

        if (!resolvedNodeId && nodeCode) {
          const { data: nodeData } = await supabaseAdmin
            .from('puzzle_nodes')
            .select('id')
            .eq('code', nodeCode)
            .maybeSingle()
          resolvedNodeId = nodeData?.id
        }

        if (!resolvedNodeId) {
          return jsonResponse(400, { error: 'nodeId or nodeCode is required' })
        }

        const { data: existing } = await supabaseAdmin
          .from('locations')
          .select('id, name, status')
          .eq('node_id', resolvedNodeId)
          .maybeSingle()

        if (!existing) {
          return jsonResponse(404, { error: 'No location override found for this node' })
        }

        const { error: histError } = await supabaseAdmin.from('location_history').insert({
          location_id: existing.id,
          node_id: resolvedNodeId,
          name: existing.name,
          status: 'INACTIVE',
          created_by: user.id,
          reason: reason ?? 'Location override removed by Bureau',
        })

        if (histError) {
          console.warn('Failed to write location history on delete:', histError.message)
        }

        const { error: deleteError } = await supabaseAdmin
          .from('locations')
          .delete()
          .eq('node_id', resolvedNodeId)

        if (deleteError) {
          return dbErrorResponse(deleteError)
        }

        await logAction('LOCATION_DELETE', undefined, undefined, { nodeId: resolvedNodeId, oldName: existing.name, reason })

        return jsonResponse(200, { success: true })
      }

        case 'list-qr-codes': {
          const { data: qrNodes, error: qrError } = await supabaseAdmin
            .from('qr_nodes')
            .select('*')

          if (qrError) {
            return dbErrorResponse(qrError)
          }

          const nodeIds = (qrNodes ?? []).map((q: Record<string, unknown>) => q.puzzle_node_id as string | null).filter(Boolean)
          const { data: puzzleNodes } = await supabaseAdmin
            .from('puzzle_nodes')
            .select('id, code, title, type, stage, location')
            .in('id', nodeIds)

         const nodeMap = new Map<string, { code: string; title: string; type: string; stage: number; location: string }>()
         for (const node of puzzleNodes ?? []) {
           nodeMap.set(node.id, {
             code: node.code,
             title: node.title,
             type: node.type,
             stage: node.stage,
             location: node.location ?? '',
           })
         }

          const enriched = (qrNodes ?? []).map((q: Record<string, unknown>) => {
            const nodeId = q.puzzle_node_id as string | null
            const nodeInfo = nodeId ? nodeMap.get(nodeId) : null

            const metadata = q.metadata as Record<string, unknown> | undefined
            const puzzleCode = (metadata?.puzzleCode as string) ?? (nodeInfo?.code as string) ?? ''
            const stage = (metadata?.stage as number) ?? nodeInfo?.stage ?? 1
            const building = (q.label as string ?? '').split(' — ')[0]?.replace('[', '')?.replace(']', '') ?? ''

            return {
              id: q.id,
              code: q.code,
              label: q.label,
              type: q.type,
              puzzle_node_id: nodeId,
              position: q.position,
              metadata: q.metadata,
              puzzle_node: nodeInfo,
              marker_id: q.marker_id ?? null,
              manual_code: q.manual_code ?? null,
              deployment_status: q.deployment_status ?? 'GENERATED',
              deployment_batch: q.deployment_batch ?? null,
              case_number: '037',
              puzzle_code: puzzleCode,
              puzzle_stage: stage,
              building: building,
            }
          })

          const qrCodes: string[] = enriched
            .map(e => e.code)
            .filter((code): code is string => typeof code === 'string')
          const duplicates = qrCodes.filter((code, idx, arr) => arr.indexOf(code) !== idx)

          return jsonResponse(200, {
            success: true,
            qrCodes: enriched,
            duplicates: [...new Set(duplicates)],
            totalPages: Math.ceil(enriched.length / 4),
          })
       }

       default:
         return jsonResponse(400, { error: `Unknown action: ${action}` })
    }
  } catch (err: unknown) {
    if (err instanceof BadRequestError) return jsonResponse(400, { error: err.message })
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
