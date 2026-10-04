import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { BadRequestError, readJsonObject, requireString } from '../_shared/request.ts'

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

    const body = await readJsonObject(req)
    const qrCode = requireString(body.qrCode, 'qrCode', 64)

    const { data, error } = await supabaseUser.rpc('scan_qr_code', {
      p_qr_code: qrCode,
    })

    if (error) {
      console.error('scan_qr_code error:', error)
      return errorResponse(500, 'Failed to scan QR code')
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
        return jsonResponse(200, { success: true, result: retry.data })
      }
    }

    return jsonResponse(200, { success: true, result: data })
  } catch (err: unknown) {
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
