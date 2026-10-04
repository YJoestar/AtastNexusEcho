/**
 * NEXUS — Game Bureau Operations Edge Function
 *
 * Node-level admin operations with admin authorization.
 * SECURITY: Verifies admin privileges before every operation.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { BadRequestError, readJsonObject, requireUuid } from '../_shared/request.ts'
import { preflightOrMethodError, dbError } from '../_shared/http.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // --- Verify admin (same as bureau-operations) ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(401, 'Authentication required')
    }

    const token = authHeader.replace('Bearer ', '')
    // Destructuring `{ data: { user } }` throws a TypeError when `data` is null,
    // turning a rejected token into a 500. Take the envelope apart first.
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)
    const user = userData?.user ?? null

    if (authError || !user) {
      return errorResponse(401, 'Invalid session')
    }

    // maybeSingle(), not single(): `single()` rejects zero rows as PGRST116, and
    // this lookup discards `error`, so a missing admin row and a real database
    // fault were indistinguishable. An authenticated user with no admin grant is
    // not an authentication problem — 401 sent operators re-authenticating with
    // perfectly good credentials.
    const { data: adminRecord, error: adminLookupError } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (adminLookupError) {
      console.error('admin_users lookup failed:', adminLookupError)
      return errorResponse(500, 'Could not verify your permissions. Please try again.')
    }

    if (!adminRecord || !['ADMIN', 'SUPER_ADMIN'].includes(adminRecord.role)) {
      return errorResponse(403, 'This account is not authorised for Bureau operations')
    }

    // Create a user-authenticated client for RPC calls that use auth.uid()
    // (SECURITY DEFINER functions call auth.uid() for audit logging).
    const supabaseAdminUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )

    const body = await readJsonObject(req)
    const { action, nodeCode, reason } = body as { action?: unknown; nodeCode?: unknown; reason?: unknown }
    if (typeof action !== 'string' || !action) {
      return errorResponse(400, 'Missing action')
    }
    const teamId = body.teamId === undefined ? undefined : requireUuid(body.teamId, 'teamId')
    const nodeId = body.nodeId === undefined ? undefined : requireUuid(body.nodeId, 'nodeId')

    let result: unknown = null

    switch (action) {
      case 'manual_unlock': {
        const resolvedNodeId = await resolveNodeIdOrResponse(supabaseAdmin, nodeId, nodeCode)
        if (typeof resolvedNodeId !== 'string') return resolvedNodeId
        const { data, error } = await supabaseAdminUser.rpc('bureau_manual_unlock', {
          p_team_id: teamId ?? null,
          p_node_id: resolvedNodeId,
          p_reason: reason ?? 'Administrative unlock',
        })
        if (error) {
          console.error('bureau_manual_unlock error:', error)
          return dbErrorResponse(error)
        }
        result = data
        break
      }

      case 'reset_node': {
        // Irreversible (deletes the attempt history): SUPER_ADMIN only. The
        // database enforces it too (42501), this just answers before any work.
        if (adminRecord.role !== 'SUPER_ADMIN') {
          return errorResponse(403, 'This action requires a super administrator')
        }
        const resolvedNodeId = await resolveNodeIdOrResponse(supabaseAdmin, nodeId, nodeCode)
        if (typeof resolvedNodeId !== 'string') return resolvedNodeId
        const { data, error } = await supabaseAdminUser.rpc('bureau_reset_node', {
          p_team_id: teamId ?? null,
          p_node_id: resolvedNodeId,
          p_reason: reason ?? 'Administrative reset',
        })
        if (error) {
          console.error('bureau_reset_node error:', error)
          return dbErrorResponse(error)
        }
        result = data
        break
      }

      case 'get_node_detail': {
        const resolvedNodeId = await resolveNodeIdOrResponse(supabaseAdmin, nodeId, nodeCode)
        if (typeof resolvedNodeId !== 'string') return resolvedNodeId
        const { data, error } = await supabaseAdminUser.rpc('bureau_get_node_detail', {
          p_node_id: resolvedNodeId,
        })
        if (error) {
          console.error('bureau_get_node_detail error:', error)
          return dbErrorResponse(error)
        }
        result = data
        break
      }

      case 'get_available_nodes': {
        // This is a player-facing RPC, not admin-specific.
        // It uses auth.uid() internally, so it will only work for authenticated users.
        // No additional admin check needed since it returns only the calling player's team data.
        const { data, error } = await supabaseAdminUser.rpc('get_available_nodes')
        if (error) {
          console.error('get_available_nodes error:', error)
          return dbErrorResponse(error)
        }
        result = data
        break
      }

      default:
        return errorResponse(400, 'Invalid action')
    }

    return jsonResponse(200, { success: true, action, result })
  } catch (err: unknown) {
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
    console.error('Unhandled error in game-bureau-ops:', err)
    return errorResponse(500, 'Internal server error')
  }
})

/**
 * Resolves the target node for an action, accepting either a uuid or a code.
 *
 * Returns the node id, or the Response to send when the node cannot be
 * resolved. A failed lookup is deliberately NOT reported as 404: a privilege
 * or connectivity fault told to the operator as "Node not found" sends them
 * hunting for a typo that does not exist while the real fault goes unreported.
 */
async function resolveNodeIdOrResponse(
  client: {
    // supabase-js returns a PostgrestFilterBuilder, which is thenable rather
    // than a real Promise, so the structural type must accept PromiseLike.
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{
      data: unknown
      error: { code?: string; message?: string } | null
    }>
  },
  nodeId: string | undefined,
  nodeCode: unknown,
): Promise<string | Response> {
  if (nodeId) return nodeId
  if (typeof nodeCode !== 'string' || nodeCode.trim().length === 0) {
    return errorResponse(400, 'Missing nodeId or nodeCode')
  }
  const { data, error } = await client.rpc('resolve_node_ref', { p_ref: nodeCode })
  if (error) {
    console.error('resolve_node_ref error:', error)
    return dbErrorResponse(error)
  }
  if (typeof data !== 'string' || data.length === 0) {
    return errorResponse(404, 'Node not found')
  }
  return data
}

function dbErrorResponse(error: { code?: string | null; message?: string | null }) {
  const { status, message } = dbError(error)
  return errorResponse(status, message)
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, message: string) {
  return jsonResponse(status, { success: false, error: message })
}
