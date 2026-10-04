import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AuthError,
  requireBearerToken,
  requireVerifiedUser,
} from '../../supabase/functions/_shared/auth'

function req(auth?: string): Request {
  return new Request('http://localhost/', {
    method: 'POST',
    headers: auth === undefined ? {} : { Authorization: auth },
  })
}

/** A stand-in for the auth server, so the helper can be exercised without one. */
function client(behaviour: {
  user?: { id: string } | null
  error?: { status?: number; message?: string } | null
  throws?: boolean
}) {
  return {
    auth: {
      getUser: vi.fn(async () => {
        if (behaviour.throws) throw new Error('fetch failed')
        return { data: { user: behaviour.user ?? null }, error: behaviour.error ?? null }
      }),
    },
  }
}

describe('requireBearerToken', () => {
  it('returns the token from a well-formed header', () => {
    expect(requireBearerToken(req('Bearer abc.def.ghi'))).toBe('abc.def.ghi')
  })

  it('accepts the scheme case-insensitively, as RFC 7235 requires', () => {
    expect(requireBearerToken(req('bearer abc'))).toBe('abc')
    expect(requireBearerToken(req('BEARER abc'))).toBe('abc')
  })

  it('trims surrounding whitespace a client may have sent', () => {
    expect(requireBearerToken(req('Bearer   abc  '))).toBe('abc')
  })

  it('is a 401 for every unusable header, never a 500', () => {
    for (const header of [undefined, '', 'abc', 'Basic abc', 'Bearer', 'Bearer    ']) {
      let caught: unknown
      try {
        requireBearerToken(req(header))
      } catch (err) {
        caught = err
      }
      expect(caught, `header: ${JSON.stringify(header)}`).toBeInstanceOf(AuthError)
      expect((caught as AuthError).status).toBe(401)
    }
  })

  it('does not strip a "Bearer " prefix occurring inside the token', () => {
    // Only the leading scheme is removed; slicing a fixed prefix would corrupt
    // a token that legitimately contains the text.
    expect(requireBearerToken(req('Bearer Bearer x'))).toBe('Bearer x')
  })
})

describe('requireVerifiedUser', () => {
  it('returns the id for a valid session', async () => {
    const c = client({ user: { id: 'user-1' } })
    await expect(requireVerifiedUser(c, 'tok')).resolves.toEqual({ id: 'user-1' })
    expect(c.auth.getUser).toHaveBeenCalledWith('tok')
  })

  it('is a 401 when the token is rejected', async () => {
    const c = client({ user: null, error: { status: 401, message: 'invalid JWT' } })
    await expect(requireVerifiedUser(c, 'bad')).rejects.toMatchObject({
      name: 'AuthError',
      status: 401,
    })
  })

  it('is a 401 when the auth server answers with no user and no error', async () => {
    await expect(requireVerifiedUser(client({}), 'tok')).rejects.toMatchObject({ status: 401 })
  })

  it('is a 503, not a 401, when the auth server is unwell', async () => {
    // The whole point: a service blip must not sign every player out.
    const serverError = client({ user: null, error: { status: 503, message: 'upstream' } })
    await expect(requireVerifiedUser(serverError, 'tok')).rejects.toMatchObject({ status: 503 })
  })

  it('is a 503 when the verification call itself throws (network down)', async () => {
    await expect(requireVerifiedUser(client({ throws: true }), 'tok')).rejects.toMatchObject({
      status: 503,
    })
  })

  it('treats a missing user as a rejection even when no error is reported', async () => {
    await expect(
      requireVerifiedUser({ auth: { getUser: async () => ({ data: null, error: null }) } }, 'tok'),
    ).rejects.toMatchObject({ status: 401 })
  })
})

describe('AuthError', () => {
  it('carries the status its handler should use', () => {
    const err = new AuthError('nope', 503)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('AuthError')
    expect(err.status).toBe(503)
  })
})

describe('console output during session verification', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('logs a server fault but never the token itself', async () => {
    await expect(requireVerifiedUser(client({ throws: true }), 'super-secret-token')).rejects.toThrow()
    const logged = errorSpy.mock.calls.flat().join(' ')
    expect(logged.length).toBeGreaterThan(0)
    expect(logged).not.toContain('super-secret-token')
  })
})