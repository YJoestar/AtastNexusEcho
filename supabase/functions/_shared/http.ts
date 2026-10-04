/**
 * NEXUS — HTTP plumbing shared by every edge function
 *
 * Pure TypeScript (no Deno APIs) so it is unit-tested from the app's suite.
 *
 *  - preflightOrMethodError: OPTIONS gets a CORS answer, any method other than
 *    POST gets 405 with an Allow header (previously a GET fell through to
 *    JSON parsing and surfaced as a confusing 400/500).
 *  - dbError: turns a PostgREST/Postgres error into an HTTP status and a safe
 *    message. Raw database messages leak table, column and constraint names, so
 *    only messages our own SQL raises on purpose (SQLSTATE P0001, written in
 *    the migrations) are passed on; everything else becomes a generic text.
 *    Insufficient privilege (42501, e.g. the SUPER_ADMIN gate) is a 403.
 */

export function preflightOrMethodError(
  req: Request,
  corsHeaders: Record<string, string>,
  allowed: readonly string[] = ['POST'],
): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (!allowed.includes(req.method)) {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: [...allowed, 'OPTIONS'].join(', ') },
    })
  }
  return null
}

export interface DbErrorLike {
  code?: string | null
  message?: string | null
}

export function dbError(error: DbErrorLike | null | undefined): { status: number; message: string } {
  const code = error?.code ?? ''
  switch (code) {
    case '42501':
      return { status: 403, message: 'You do not have permission to perform this action' }
    case 'P0001': {
      const message = (error?.message ?? '').trim()
      return { status: 400, message: message && message.length <= 300 ? message : 'Request refused' }
    }
    case '23505':
      return { status: 409, message: 'That already exists' }
    case 'P0002':
    case 'PGRST116':
      return { status: 404, message: 'Not found' }
  }
  // 22xxx data exceptions, 23xxx integrity violations, 42xxx syntax/name errors
  // caused by input are the caller's problem; the rest is ours.
  if (/^(22|23)/.test(code)) return { status: 400, message: 'Invalid request' }
  return { status: 500, message: 'Internal server error' }
}
