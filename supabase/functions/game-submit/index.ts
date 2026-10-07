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
      // A failed lookup is not the same as "no such node". Reporting a
      // privilege or connectivity fault as 404 hides the real problem and
      // leaves the player hunting for a typo that does not exist.
      console.error('resolve_node_ref error:', resolveError)
      const mapped = dbError(resolveError)
      return errorResponse(mapped.status, mapped.message)
    }
    if (typeof nodeId !== 'string' || nodeId.length === 0) {
      return errorResponse(404, 'Node not found')
    }
    const answer = requireString(body.answer, 'answer', 1000)

    const { data, error } = await supabaseUser.rpc('submit_puzzle_answer', {
      p_node_id: nodeId,
      p_answer: answer,
    })

    if (data && typeof data === 'object' && 'error' in data && data.error) {
      // submit_puzzle_answer answers refusals in its payload rather than as a
      // PostgREST error. These are messages our own SQL wrote for players, so
      // they are passed through — but only after the same safety check
      // dbError applies, so an unexpected payload can never leak schema text.
      const rpcError = data.error
      const status = mapRpcErrorToStatus(rpcError)
      const message = isPlayerSafeRpcMessage(rpcError)
        ? rpcError
        : 'That answer could not be submitted.'
      return errorResponse(status, message)
    }

    if (error) {
      console.error('submit_puzzle_answer error:', error)
      // The shared mapping decides the status so a genuine server fault is a
      // 500 and not, as before, a 400 that told the player to change their
      // answer when the database was the problem.
      const mapped = dbError(error)
      return errorResponse(mapped.status, mapped.message)
    }

    return jsonResponse(200, { success: true, result: data })
  } catch (err: unknown) {
    if (err instanceof AuthError) return errorResponse(err.status, err.message)
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
    console.error('Unhandled error in game-submit:', err)
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

const RATE_LIMIT_PATTERNS = /rate limit|too many/i

/**
 * Statuses for the refusals submit_puzzle_answer returns in its payload.
 * These messages are written by our own SQL (see the migration), so matching on
 * them is a contract rather than a guess. Anything unrecognised is treated as a
 * server fault (500) rather than being blamed on the player's input.
 */
function mapRpcErrorToStatus(message: string): number {
  if (RATE_LIMIT_PATTERNS.test(message)) return 429
  if (/no team|not authentic/i.test(message)) return 401
  // An authenticated Observer or Analyst is permitted but not authorized
  // to submit: the conclusion is the Operator's to enter. 403, never 401.
  if (/forbidden|permission|operator/i.test(message)) return 403
  // "not found" is genuinely absent; "not accessible" and "not active" mean the
  // team or node exists but may not be acted on right now, which is a refusal.
  if (/not found/i.test(message)) return 404
  if (/not active|not accessible|already solved|locked/i.test(message)) return 403
  if (/invalid|malformed|missing|required/i.test(message)) return 400
  return 500
}
