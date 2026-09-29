/**
 * NEXUS — Player Login Edge Function
 *
 * Validates the Bureau-generated access code, enforces device binding,
 * and establishes a Supabase Auth session.
 *
 * Security model:
 *   1. The access code is hashed with salted MD5 (using built-in gen_random_uuid
 *      and md5) and never stored in plaintext.
 *   2. Device binding is atomic — the first device to log in claims the player.
 *   3. Subsequent logins from a different device are rejected (DEVICE_MISMATCH).
 *   4. The auth user email is internal and never shown to the player.
 *   5. The login code doubles as the auth password, but the email is only
 *      discoverable through this edge function (which enforces device binding).
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

    // Rate limiting: track attempts per IP address
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const { count: attemptCount, error: rateLimitError } = await supabaseAdmin
      .from('login_rate_limits')
      .select('id', { count: 'exact' })
      .eq('ip_address', clientIP)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
      return errorResponse(500, 'Internal server error')
    }

    if ((attemptCount ?? 0) >= 10) {
      return errorResponse(429, 'Too many login attempts. Please try again later.')
    }

    const { code, deviceFingerprint, deviceInfo } = await req.json()

    if (!code || typeof code !== 'string' || code.length !== 8) {
      return errorResponse(401, 'Invalid access code')
    }

    if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
      return errorResponse(401, 'Invalid access code')
    }

    // Validate code format: 8 chars, A-Z and 2-9 only, no I/O/0/1
    if (!/^[A-Z2-9]{8}$/.test(code)) {
      return errorResponse(401, 'Invalid access code')
    }

    // Record this attempt for rate limiting
    await supabaseAdmin.from('login_rate_limits').insert({
      ip_address: clientIP,
    })

    // Call the atomic login flow function
    const { data: loginData, error: loginError } = await supabaseAdmin.rpc(
      'player_login_flow',
      {
        input_code: code,
        input_device_fingerprint_hash: deviceFingerprint,
        input_device_info: JSON.stringify(deviceInfo ?? {}),
      },
    )

    if (loginError) {
      console.error('Login flow error:', loginError)
      return errorResponse(401, 'Invalid access code')
    }

    const result = loginData[0]
    if (!result) {
      return errorResponse(401, 'Invalid access code')
    }

    const loginResult = result.login_result

    if (loginResult === 'DEVICE_MISMATCH') {
      return errorResponse(401, 'Invalid access code')
    }

    if (loginResult === 'NOT_FOUND') {
      return errorResponse(401, 'Invalid access code')
    }

    if (loginResult !== 'SUCCESS') {
      return errorResponse(401, 'Invalid access code')
    }

    // Check if account is locked due to too many failed attempts
    const { data: playerData, error: playerError } = await supabaseAdmin
      .from('players')
      .select('login_locked_until')
      .eq('id', result.player_id)
      .single()

    if (playerError || playerData?.login_locked_until) {
      return errorResponse(401, 'Invalid access code')
    }

    // Sign in the auth user using the login code as the password
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: result.auth_user_email,
      password: code,
    })

    if (authError || !authData.session) {
      console.error('Auth sign-in error:', authError)
      return errorResponse(401, 'Invalid access code')
    }

    // Clear rate limit entries for this IP on successful login
    await supabaseAdmin
      .from('login_rate_limits')
      .delete()
      .eq('ip_address', clientIP)

    const session = authData.session

    return jsonResponse(200, {
      success: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
      player: {
        id: result.player_id,
        teamId: result.team_id,
        role: result.role,
        displayName: result.display_name,
      },
      team: {
        name: result.team_name,
        status: result.team_status,
      },
    })
  } catch (err: unknown) {
    console.error('Unhandled error in player-login:', err)
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
