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
    const nodeRef = requireString(body.nodeId, 'nodeId', 64)
    // The app sends a node's code ("P01"); the RPCs want its id. Resolve either.
    const { data: nodeId, error: resolveError } = await supabaseUser.rpc('resolve_node_ref', { p_ref: nodeRef })
    if (resolveError || typeof nodeId !== 'string') {
      return errorResponse(404, 'Node not found')
    }
    const answer = requireString(body.answer, 'answer', 1000)

    const { data, error } = await supabaseUser.rpc('submit_puzzle_answer', {
      p_node_id: nodeId,
      p_answer: answer,
    })

    if (data && typeof data === 'object' && 'error' in data && data.error) {
      const rpcError = data.error as string
      const status = mapRpcErrorToStatus(rpcError)
      return errorResponse(status, rpcError)
    }

    if (error) {
      console.error('submit_puzzle_answer error:', error)
      const status = mapSupabaseErrorToStatus(error)
      const message = (error as { message?: string }).message ?? 'Submission failed'
      return errorResponse(status, message)
    }

    return jsonResponse(200, { success: true, result: data })
  } catch (err: unknown) {
    if (err instanceof BadRequestError) return errorResponse(400, err.message)
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

const RATE_LIMIT_PATTERNS = /rate limit|too many/i

function mapRpcErrorToStatus(message: string): number {
  if (RATE_LIMIT_PATTERNS.test(message)) return 429
  if (/no team|not authentic/i.test(message)) return 401
  if (/not active|not accessible|not found|forbidden|permission/i.test(message)) return 403
  if (/invalid|malformed|missing|required/i.test(message)) return 400
  return 500
}

function mapSupabaseErrorToStatus(error: unknown): number {
  let text = ''
  if (typeof error === 'object' && error !== null) {
    const e = error as { message?: string; hint?: string; details?: string; code?: string }
    text = [e.message, e.hint, e.details, e.code].filter(Boolean).join(' ').toLowerCase()
  }
  if (RATE_LIMIT_PATTERNS.test(text)) return 429
  if (/rate_limit|23505|23503/.test(text)) return 429
  return 400
}
