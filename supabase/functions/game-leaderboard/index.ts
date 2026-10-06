import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
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

    // Establish who the caller is before any game data is read. An expired or
    // invalid token is a 401 here rather than an unexplained 500 from PostgREST.
    await requireVerifiedUser(supabaseUser, token)

    const { data, error } = await supabaseUser.rpc('get_leaderboard')

    if (error) {
      console.error('get_leaderboard error:', error)
      const mapped = dbError(error)
      return errorResponse(mapped.status, mapped.message)
    }

    // get_leaderboard reports refusals in its payload rather than as a PostgREST error.
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      const rpcError = data.error
      const message = isPlayerSafeRpcMessage(rpcError)
        ? rpcError
        : 'Leaderboard could not be retrieved.'
      return errorResponse(403, message)
    }

    return jsonResponse(200, { success: true, leaderboard: data })
  } catch (err: unknown) {
    if (err instanceof AuthError) return errorResponse(err.status, err.message)
    console.error('Unhandled error in game-leaderboard:', err)
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
