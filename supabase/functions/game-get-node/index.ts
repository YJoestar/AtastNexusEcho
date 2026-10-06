import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { BadRequestError, readJsonObject, requireString } from '../_shared/request.ts'
import { dbError, isPlayerSafeRpcMessage, preflightOrMethodError } from '../_shared/http.ts'
import { AuthError, requireBearerToken, requireVerifiedUser } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  const early = preflightOrMethodError(req, corsHeaders)
  if (early) return early

  try {
    const token = requireBearerToken(req)

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )

    await requireVerifiedUser(supabaseUser, token)

    const body = await readJsonObject(req)
    const nodeRef = requireString(body.nodeId, 'nodeId', 64)
    // The app sends a node's code ("P01"); the RPCs want its id. Resolve either.
    const { data: nodeId, error: resolveError } = await supabaseUser.rpc('resolve_node_ref', { p_ref: nodeRef })
    if (resolveError) {
      // A failure to resolve is not the same as "no such node". Reporting a
      // privilege or connectivity fault as 404 hides the real problem and
      // leaves the player hunting for a typo that does not exist.
      console.error('resolve_node_ref error:', resolveError)
      const mapped = dbError(resolveError)
      return errorResponse(mapped.status, mapped.message)
    }
    if (typeof nodeId !== 'string' || nodeId.length === 0) {
      return errorResponse(404, 'Node not found')
    }

    const { data, error } = await supabaseUser.rpc('get_player_node_detail', {
      p_node_id: nodeId,
      // Ignored by the database, which reads the caller's role from `players`.
      // Nothing here may default to a privileged role.
      p_player_role: typeof body.role === 'string' ? body.role : 'OBSERVER',
    })

    if (error) {
      console.error('get_player_node_detail error:', error)
      const mapped = dbError(error)
      return errorResponse(mapped.status, mapped.message)
    }

    // get_player_node_detail reports refusals in its payload (e.g., "Node not accessible")
    // rather than as a PostgREST error. These messages are written by our own SQL,
    // so they are passed through — but only after the same safety check dbError applies.
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      const rpcError = data.error
      const message = isPlayerSafeRpcMessage(rpcError)
        ? rpcError
        : 'That node could not be retrieved.'
      return errorResponse(403, message)
    }

    return jsonResponse(200, { success: true, node: data })
  } catch (err: unknown) {
    if (err instanceof AuthError) return errorResponse(err.status, err.message)
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
    console.error('Unhandled error in game-get-node:', err)
    return errorResponse(500, 'Internal server error')
  }
})

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, message: string) {
  return jsonResponse(status, { success: false, error: message })
}
