/**
 * NEXUS — Admin Check Edge Function
 *
 * Verifies whether the current authenticated Supabase Auth user
 * has Bureau/admin privileges. Used as a gatekeeper for all
 * admin operations and to validate admin session on the client.
 */

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Extract the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { authenticated: false, error: 'No auth token provided' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return jsonResponse(401, { authenticated: false, error: 'Invalid or expired session' })
    }

    // Check if this user is an admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('role, username')
      .eq('auth_user_id', user.id)
      .single()

    if (adminError || !adminData) {
      return jsonResponse(401, { authenticated: true, isAdmin: false, error: 'Not authorized as admin' })
    }

    return jsonResponse(200, {
      authenticated: true,
      isAdmin: true,
      adminRole: adminData.role,
      username: adminData.username,
      email: user.email ?? null,
      userId: user.id,
    })
  } catch (err: unknown) {
    console.error('Unhandled error in admin-check:', err)
    return jsonResponse(500, { error: 'Internal server error' })
  }
})

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
