import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { BadRequestError, readJsonObject, requireInteger, requireString } from '../_shared/request.ts'
import { dbError, preflightOrMethodError } from '../_shared/http.ts'
import { AuthError, requireBearerToken, requireVerifiedUser } from '../_shared/auth.ts'

/**
 * A node offers at most three hints. This must stay equal to the database's
 * `LEAST(v_max_hints, 3)` in request_hint and to the
 * `hints_used.hint_number CHECK (hint_number BETWEEN 1 AND 3)` constraint.
 * It used to accept up to 20 here, so hint numbers 4-20 travelled to the
 * database only to be refused there, costing a round trip and returning a
 * message about hints rather than about the request.
 */
const MAX_HINTS_PER_NODE = 3

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
    const hintNumber = requireInteger(body.hintNumber, 'hintNumber', 1, MAX_HINTS_PER_NODE)
    // The app sends a node's code ("P01"); the RPCs want its id. Resolve either.
    const { data: nodeId, error: resolveError } = await supabaseUser.rpc('resolve_node_ref', { p_ref: nodeRef })
    if (resolveError) {
      // A resolver fault is not a missing node; answering 404 would send the
      // player looking for a typo instead of reporting a broken lookup.
      console.error('resolve_node_ref error:', resolveError)
      const resolveMapped = dbError(resolveError)
      return errorResponse(resolveMapped.status, resolveMapped.message)
    }
    if (typeof nodeId !== 'string' || nodeId.length === 0) {
      return errorResponse(404, 'Node not found')
    }

    const { data, error } = await supabaseUser.rpc('request_hint', {
      p_node_id: nodeId,
      p_hint_number: hintNumber,
    })

    if (error) {
      console.error('request_hint error:', error)
      const msg = error.message || ''
      if (msg.includes('rate') || msg.includes('limit') || msg.includes('cooldown')) {
        return errorResponse(429, 'Too many hint requests. Please wait.')
      }
      if (msg.includes('not available') || msg.includes('not found')) {
        return errorResponse(404, 'Node not available for hints')
      }
      // Everything else follows the shared mapping rather than defaulting to
      // an unexplained 500.
      const mapped = dbError(error)
      return errorResponse(mapped.status, mapped.message)
    }

    return jsonResponse(200, { success: true, result: data })
  } catch (err: unknown) {
    if (err instanceof AuthError) return errorResponse(err.status, err.message)
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
    console.error('Unhandled error in game-use-hint:', err)
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
