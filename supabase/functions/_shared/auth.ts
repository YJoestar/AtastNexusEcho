/**
 * NEXUS — session verification shared by the game edge functions
 *
 * The game-* functions used to accept any non-empty `Authorization` header and
 * hand it to PostgREST with the anon key. That has two consequences that only
 * show up in production:
 *
 *  1. An expired or malformed token produces a PostgREST 401 that carries no
 *     SQLSTATE, so `dbError` had nothing to classify it and answered 500. A
 *     player whose session had simply lapsed was told, in effect, that the
 *     server was broken.
 *  2. A perfectly valid token belonging to somebody who is not a player (an
 *     admin session, an auth user left behind by a reset) sailed past the edge
 *     check entirely, because nothing at the edge ever established who the
 *     caller was.
 *
 * Verifying the token against the auth server fixes both: an unverifiable or
 * expired session is a 401, and a session that is valid but cannot be used is
 * the database's own refusal rather than a silent success.
 *
 * Pure TypeScript with a structural client type, so it is unit-tested from the
 * app's suite alongside the rest of _shared.
 */

export class AuthError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

const BEARER_PREFIX = 'bearer '

/**
 * The caller's access token.
 *
 * The scheme is matched case-insensitively because RFC 7235 says it is, and
 * the header is client-supplied. An absent or empty token is a 401, never a 500.
 */
export function requireBearerToken(req: Request): string {
  const header = req.headers.get('Authorization')
  if (!header || !header.toLowerCase().startsWith(BEARER_PREFIX)) {
    throw new AuthError('Authentication required', 401)
  }
  const token = header.slice(BEARER_PREFIX.length).trim()
  if (!token) {
    throw new AuthError('Authentication required', 401)
  }
  return token
}

/** Minimal structural view of the supabase client this helper needs. */
export interface AuthVerifyingClient {
  auth: {
    getUser(jwt: string): PromiseLike<{
      data: { user: { id: string } | null } | null
      error: { status?: number; code?: string; message?: string } | null
    }>
  }
}

/**
 * Establishes who the caller is.
 *
 * An invalid or expired token is a 401: the client must sign in again. An auth
 * server that cannot be reached is a 503 instead, because that is our outage
 * and retrying is the right response — reporting it as 401 would sign every
 * player out at the moment the service blipped.
 */
export async function requireVerifiedUser(
  client: AuthVerifyingClient,
  token: string,
): Promise<{ id: string }> {
  let result: { data: { user: { id: string } | null } | null; error: { status?: number; code?: string; message?: string } | null }
  try {
    result = await client.auth.getUser(token)
  } catch (err: unknown) {
    // A thrown fetch means the auth server was unreachable, not that the token
    // was refused.
    console.error('Auth server unreachable while verifying the session:', err)
    throw new AuthError('Session could not be verified. Please try again.', 503)
  }

  if (result.error || !result.data?.user) {
    // 401/403 from the auth server means the token itself was rejected. Anything
    // else (5xx) means the server is unwell and must not end the session.
    const status = result.error?.status
    if (typeof status === 'number' && status >= 500) {
      console.error('Auth server failed while verifying the session:', result.error)
      throw new AuthError('Session could not be verified. Please try again.', 503)
    }
    throw new AuthError('Invalid or expired session', 401)
  }

  return { id: result.data.user.id }
}