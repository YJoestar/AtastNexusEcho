import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { dbError, preflightOrMethodError } from '../_shared/http.ts'
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

    const { data: gameState, error: stateError } = await supabaseUser.rpc('get_team_game_state')

    if (stateError) {
      console.error('get_team_game_state error:', stateError)
      // Deliberate status: a privilege failure is a 403 and a missing row a
      // 404, not an unexplained 500.
      const mapped = dbError(stateError)
      return errorResponse(mapped.status, mapped.message)
    }

    // get_team_game_state reports "this token has no team" as a 200 carrying an
    // { error } payload. Passing that straight through answered success for a
    // token that is not a player at all (an admin session, or a player removed
    // mid-event), which then rendered as an empty game screen rather than the
    // 401/403 it is. The refusal is now surfaced with a real status.
    if (gameState && typeof gameState === 'object' && 'error' in gameState && gameState.error) {
      const reason = typeof gameState.error === 'string' ? gameState.error : 'No team found for player'
      console.error('get_team_game_state reported a refusal:', reason)
      return /not found for player/i.test(reason)
        ? errorResponse(403, 'This account is not attached to a team')
        : errorResponse(404, 'Team not found')
    }

    const { data: notifications, error: notifError } = await supabaseUser.rpc('get_team_notifications', {
      p_unread_only: true,
    })

    // The unread badge is secondary to the game state, so a failure here must
    // not cost the player their whole screen. It must still be honest: the
    // caller is told the count could not be read rather than being handed a
    // zero that looks identical to "you have no unread notifications".
    const warnings: string[] = []
    let unreadCount = 0
    if (notifError) {
      console.error('get_team_notifications error:', notifError)
      warnings.push('unread_notifications_unavailable')
    } else {
      unreadCount = Array.isArray(notifications) ? notifications.length : 0
    }

    return jsonResponse(200, {
      success: true,
      gameState,
      unreadNotifications: unreadCount,
      ...(warnings.length > 0 ? { warnings } : {}),
    })
  } catch (err: unknown) {
    if (err instanceof AuthError) return errorResponse(err.status, err.message)
    console.error('Unhandled error in game-get-state:', err)
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
