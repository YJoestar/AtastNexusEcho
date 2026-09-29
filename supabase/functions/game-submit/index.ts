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

    const { nodeId, answer } = await req.json()

    if (!nodeId || !answer) {
      return errorResponse(400, 'Missing nodeId or answer')
    }

    const { data, error } = await supabaseUser.rpc('submit_puzzle_answer', {
      p_node_id: nodeId,
      p_answer: answer,
    })

    if (error) {
      console.error('submit_puzzle_answer error:', error)
      return errorResponse(429, 'Too many submissions. Please wait before trying again.')
    }

    return jsonResponse(200, { success: true, result: data })
  } catch (err: unknown) {
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
