/**
 * NEXUS — Game Bureau Operations Edge Function
 *
 * Node-level admin operations with admin authorization.
 * SECURITY: Verifies admin privileges before every operation.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // --- Verify admin (same as bureau-operations) ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(401, 'Authentication required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return errorResponse(401, 'Authentication required')
    }

    const { data: adminRecord } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminRecord || !['ADMIN', 'SUPER_ADMIN'].includes(adminRecord.role)) {
      return errorResponse(401, 'Authentication required')
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

    const { action, teamId, nodeId, nodeCode, reason } = await req.json()

    if (!action) {
      return errorResponse(400, 'Missing action')
    }

    let result: unknown = null

    switch (action) {
      case 'manual_unlock': {
        if (!nodeId && !nodeCode) {
          return errorResponse(400, 'Missing nodeId or nodeCode')
        }
        const resolvedNodeId = nodeId ?? (await resolveNodeCode(supabaseAdmin, nodeCode as string))
        if (!resolvedNodeId) {
          return errorResponse(404, 'Node not found')
        }
        const { data, error } = await supabaseAdminUser.rpc('bureau_manual_unlock', {
          p_team_id: teamId ?? null,
          p_node_id: resolvedNodeId,
          p_reason: reason ?? 'Administrative unlock',
        })
        if (error) {
          console.error('bureau_manual_unlock error:', error)
          return errorResponse(500, error.message || 'Failed to unlock node')
        }
        result = data
        break
      }

      case 'reset_node': {
        if (!nodeId && !nodeCode) {
          return errorResponse(400, 'Missing nodeId or nodeCode')
        }
        const resolvedNodeId = nodeId ?? (await resolveNodeCode(supabaseAdmin, nodeCode as string))
        if (!resolvedNodeId) {
          return errorResponse(404, 'Node not found')
        }
        const { data, error } = await supabaseAdminUser.rpc('bureau_reset_node', {
          p_team_id: teamId ?? null,
          p_node_id: resolvedNodeId,
          p_reason: reason ?? 'Administrative reset',
        })
        if (error) {
          console.error('bureau_reset_node error:', error)
          return errorResponse(500, error.message || 'Failed to reset node')
        }
        result = data
        break
      }

      case 'get_node_detail': {
        if (!nodeId && !nodeCode) {
          return errorResponse(400, 'Missing nodeId or nodeCode')
        }
        const resolvedNodeId = nodeId ?? (await resolveNodeCode(supabaseAdmin, nodeCode as string))
        if (!resolvedNodeId) {
          return errorResponse(404, 'Node not found')
        }
        const { data, error } = await supabaseAdminUser.rpc('bureau_get_node_detail', {
          p_node_id: resolvedNodeId,
        })
        if (error) {
          console.error('bureau_get_node_detail error:', error)
          return errorResponse(500, 'Failed to fetch node detail')
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
          return errorResponse(500, 'Failed to fetch available nodes')
        }
        result = data
        break
      }

      default:
        return errorResponse(400, 'Invalid action')
    }

    return jsonResponse(200, { success: true, action, result })
  } catch (err: unknown) {
    console.error('Unhandled error in game-bureau-ops:', err)
    return errorResponse(500, 'Internal server error')
  }
})

async function resolveNodeCode(supabaseAdmin: ReturnType<typeof createClient>, nodeCode: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('puzzle_nodes')
    .select('id')
    .eq('code', nodeCode)
    .single()
  if (error || !data) return null
  return (data as { id: string }).id
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
