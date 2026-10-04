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

/**
 * True when a message is safe to show a player.
 *
 * game-* functions raise their refusals with RAISE EXCEPTION (SQLSTATE P0001),
 * and those messages are written for players ("Team is not active"). They are
 * worth passing on. Anything else in an error payload — a table name, a column,
 * a constraint, an internal helper name — is not, and must not reach a client.
 */
export function isPlayerSafeRpcMessage(message: unknown): message is string {
  if (typeof message !== 'string') return false
  const trimmed = message.trim()
  if (trimmed.length === 0 || trimmed.length > 300) return false
  const leaks =
    /\b(sqlstate|relation|column|constraint|pg_|stack\s+trace|syntax\s+error|undefined\s+function|duplicate\s+key|violates?|permission\s+denied|not[- ]null)\b/i.test(trimmed) ||
    /\bfunction\s+\w+\s*\(/.test(trimmed)
  const looksLikeSql = /\b(select|insert|update|delete|create|drop|alter|grant)\b[\s\S]*\b(from|into|table|where|values|set)\b/i.test(trimmed)
  const context = /^\s*(detail|context|hint|where)\s*:/i.test(trimmed)
  return !leaks && !looksLikeSql && !context
}

export function dbError(error: DbErrorLike | null | undefined): { status: number; message: string } {
  const code = error?.code ?? ''
  switch (code) {
    case '42501':
      return { status: 403, message: 'You do not have permission to perform this action' }
    case 'P0001': {
      const message = (error?.message ?? '').trim()
      return { status: 400, message: isPlayerSafeRpcMessage(message) ? message : 'Request refused' }
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
