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
import { isValidLoginCode, isValidTeamCode } from '../_shared/logicCode.ts'
import { BadRequestError, readJsonObject } from '../_shared/request.ts'
import { preflightOrMethodError } from '../_shared/http.ts'
import { clientAddress, loginRateLimitRequest } from '../_shared/clientKey.ts'

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

    // Rate limiting. Every attempt is counted BEFORE anything else is checked
    // (malformed bodies and wrong formats cost the attacker a try too), in one
    // atomic call over several keys: the client network (trusted proxy header,
    // IPv6 by /64), the team code when the client sends one, and a global
    // breaker against distributed guessing. A successful login does not reset
    // any counter. See login_rate_limit_hit in migration 2026100309.
    let body: Record<string, unknown> | null = null
    let bodyError: BadRequestError | null = null
    try {
      body = await readJsonObject(req)
    } catch (err: unknown) {
      if (!(err instanceof BadRequestError)) throw err
      bodyError = err
    }
    const teamCode = typeof body?.teamCode === 'string' && isValidTeamCode(body.teamCode.toUpperCase())
      ? body.teamCode.toUpperCase()
      : null
    const rl = loginRateLimitRequest(clientAddress(req.headers), teamCode)
    const { data: rlData, error: rateLimitError } = await supabaseAdmin.rpc('login_rate_limit_hit', {
      p_keys: rl.keys,
      p_limits: rl.limits,
      p_windows: rl.windows,
    })
    const verdict = Array.isArray(rlData) ? rlData[0] : rlData
    if (rateLimitError || !verdict) {
      // Fail closed: without a working limiter the login must not be open to guessing.
      console.error('Rate limit check error:', rateLimitError)
      return errorResponse(500, 'Internal server error')
    }
    if (!verdict.allowed) {
      return jsonResponse(429, { success: false, error: 'Too many login attempts. Please try again later.' }, {
        'Retry-After': String(verdict.retry_after_seconds ?? 60),
      })
    }

    if (bodyError || !body) throw bodyError ?? new BadRequestError('Request body must be a JSON object')
    const { code, deviceFingerprint, deviceInfo } = body

    // Exact same rule as the generator and the client input: LOGIN_CODE_LENGTH
    // characters from A-Z and 2-9, with I, O, 0 and 1 rejected. Anything else
    // can never be a valid code, so it is refused before it reaches the
    // database and before it is counted as a hashing target.
    if (!isValidLoginCode(code)) {
      return errorResponse(401, 'Invalid access code')
    }

    if (!deviceFingerprint || typeof deviceFingerprint !== 'string' || deviceFingerprint.length > 200) {
      return errorResponse(401, 'Invalid access code')
    }

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

      // The code was right; the phone was not. Device identities are unique, so
      // this phone is already bound to a different player. Saying "invalid code"
      // here would send the player round in circles retyping a code that works.
      if (loginError.code === '23505') {
        return errorResponse(
          409,
          'This phone is already registered to another player. Each player needs their own phone.',
        )
      }

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

    // Check whether the account is under a lockout.
    //
    // player_login_flow has already refused an actively locked player (it only
    // matches rows whose login_locked_until is NULL or already in the past) and
    // clears the lock on success, so this read is defence in depth rather than
    // the primary gate. It is compared against now() for the same reason the
    // SQL is: an expired lock must never keep a player out.
    //
    // A failure to read the row is a server fault, not a bad code. Reporting it
    // as "Invalid access code" used to send a player with a perfectly good code
    // round in circles retyping it.
    const { data: playerData, error: playerError } = await supabaseAdmin
      .from('players')
      .select('login_locked_until')
      .eq('id', result.player_id)
      .maybeSingle()

    if (playerError) {
      console.error('Lockout check failed for player', result.player_id, playerError)
      return errorResponse(500, 'Could not verify this account. Please try again.')
    }

    const lockedUntil = playerData?.login_locked_until
      ? new Date(playerData.login_locked_until).getTime()
      : null
    if (lockedUntil !== null && Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
      const retryAfter = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000))
      return jsonResponse(
        429,
        { success: false, error: 'Too many failed attempts. Wait for the lock to clear, then try again.' },
        { 'Retry-After': String(retryAfter) },
      )
    }

    // Sign in the auth user using the login code as the password.
    //
    // auth_user_email comes back from the RPC as untyped jsonb. Passing it
    // straight into signInWithPassword meant a row with a missing or
    // non-string value reached GoTrue as `undefined`, which fails as an opaque
    // "Invalid login credentials" — the same lie we refuse to tell elsewhere.
    const authUserEmail = result.auth_user_email
    if (typeof authUserEmail !== 'string' || authUserEmail.length === 0) {
      console.error(
        'Login flow returned no usable auth_user_email for player',
        result.player_id,
      )
      return errorResponse(500, 'Could not start your session. Please contact the Bureau.')
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: authUserEmail,
      password: code,
    })

    if (authError || !authData?.session) {
      // The code was accepted by the database, so telling the player it is
      // invalid would be a lie and would strand them. This is our fault.
      console.error('Auth sign-in failed for player', result.player_id, authError)
      return errorResponse(500, 'Could not start your session. Please try again.')
    }

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
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
    console.error('Unhandled error in player-login:', err)
    return errorResponse(500, 'Internal server error')
  }
})

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, message: string) {
  return jsonResponse(status, { success: false, error: message })
}
