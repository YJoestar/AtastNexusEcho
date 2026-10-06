import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { BadRequestError, readJsonObject, requireString } from '../_shared/request.ts'
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

    const body = await readJsonObject(req)
    const qrCode = requireString(body.qrCode, 'qrCode', 64)

    const { data, error } = await supabaseUser.rpc('scan_qr_code', {
      p_qr_code: qrCode,
    })

    if (error) {
      console.error('scan_qr_code error:', error)
      // Every error from this call used to become a flat 500, so a privilege
      // failure, a dropped connection and a missing table were indistinguishable
      // from each other. The shared mapping names the real cause.
      const mapped = dbError(error)
      return errorResponse(mapped.status, mapped.message)
    }

    if (data && typeof data === 'object' && data.error === 'Invalid QR code') {
      // Resolve a printed marker id or manual code to the node's code in the
      // database, with the typed text as a bound parameter. (This used to query
      // qr_nodes with the text interpolated into a PostgREST `.or(...)` string, so
      // a "code" such as `x,code.eq.QR-NODE-37` rewrote the filter, and the table
      // read itself failed on a recursive row-level policy.)
      const { data: resolvedCode, error: nodeError } = await supabaseUser.rpc('resolve_qr_code', {
        p_input: qrCode,
      })
      const nodeData = typeof resolvedCode === 'string' && resolvedCode ? { code: resolvedCode } : null

      if (nodeError) {
        console.error('resolve_qr_code error:', nodeError)
      }

      if (nodeData) {
        const retry = await supabaseUser.rpc('scan_qr_code', {
          p_qr_code: nodeData.code,
        })
        // The retry used to be returned without looking at its error, so a
        // failed second scan answered 200 with result: undefined — a success
        // response for an operation that never happened.
        if (retry.error) {
          console.error('scan_qr_code retry error:', retry.error)
          const mapped = dbError(retry.error)
          return errorResponse(mapped.status, mapped.message)
        }
        return jsonResponse(200, { success: true, result: retry.data })
      }

      // Resolution failed: the QR code is genuinely invalid. Return a proper error status.
      return errorResponse(404, 'Invalid QR code')
    }

    // Check if the RPC returned an error in its payload (e.g., "No team found")
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      const reason = typeof data.error === 'string' ? data.error : 'Unknown error'
      console.error('scan_qr_code reported a refusal:', reason)
      return /no team found for player/i.test(reason)
        ? errorResponse(403, 'This account is not attached to a team')
        : errorResponse(400, reason)
    }

    return jsonResponse(200, { success: true, result: data })
  } catch (err: unknown) {
    if (err instanceof AuthError) return errorResponse(err.status, err.message)
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
    console.error('Unhandled error in game-scan-qr:', err)
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
