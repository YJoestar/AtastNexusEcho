import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { BadRequestError, readJsonObject, requireUuid } from '../_shared/request.ts'

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
    const nodeId = requireUuid(body.nodeId, 'nodeId')

    const { data, error } = await supabaseUser.rpc('get_player_node_detail', {
      p_node_id: nodeId,
      // Ignored by the database, which reads the caller's role from `players`.
      // Nothing here may default to a privileged role.
      p_player_role: typeof body.role === 'string' ? body.role : 'OBSERVER',
    })

    if (error) {
      console.error('get_player_node_detail error:', error)
      return errorResponse(500, 'Failed to fetch node')
    }

    return jsonResponse(200, { success: true, node: data })
  } catch (err: unknown) {
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
    console.error('Unhandled error in game-get-node:', err)
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
