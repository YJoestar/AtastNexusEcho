import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { preflightOrMethodError } from '../_shared/http.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  const early = preflightOrMethodError(req, corsHeaders)
  if (early) return early

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    if (!token) {
      return errorResponse(401, 'Authentication required')
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )

    const { data: gameState, error: stateError } = await supabaseUser.rpc('get_team_game_state')

    if (stateError) {
      console.error('get_team_game_state error:', stateError)
      return errorResponse(500, 'Failed to fetch game state')
    }

    const { data: notifications, error: notifError } = await supabaseUser.rpc('get_team_notifications', {
      p_unread_only: true,
    })

    if (notifError) {
      return jsonResponse(200, { success: true, gameState, unreadNotifications: 0 })
    }

    const unreadCount = Array.isArray(notifications) ? notifications.length : 0

    return jsonResponse(200, {
      success: true,
      gameState,
      unreadNotifications: unreadCount,
    })
  } catch (err: unknown) {
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
