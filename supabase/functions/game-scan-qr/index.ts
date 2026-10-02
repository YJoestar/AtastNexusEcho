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

    const { qrCode } = await req.json()

    if (!qrCode) {
      return errorResponse(400, 'Missing qrCode')
    }

    const { data, error } = await supabaseUser.rpc('scan_qr_code', {
      p_qr_code: qrCode,
    })

    if (error) {
      console.error('scan_qr_code error:', error)
      return errorResponse(500, 'Failed to scan QR code')
    }

    if (data && typeof data === 'object' && data.error === 'Invalid QR code') {
      const { data: nodeData, error: nodeError } = await supabaseUser
        .from('qr_nodes')
        .select('code')
        .or(`marker_id.eq.${qrCode},manual_code.eq.${qrCode}`)
        .maybeSingle()

      if (nodeError) {
        console.error('qr_nodes fallback lookup error:', nodeError)
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
