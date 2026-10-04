import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dbError, preflightOrMethodError } from '../../supabase/functions/_shared/http'
import {
  clientAddress, ipKey, loginRateLimitRequest, LOGIN_LIMITS,
} from '../../supabase/functions/_shared/clientKey'

const cors = { 'Access-Control-Allow-Origin': '*' }
const FN_DIR = join(__dirname, '../../supabase/functions')
const functions = readdirSync(FN_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== '_shared')
  .map(d => ({ name: d.name, src: readFileSync(join(FN_DIR, d.name, 'index.ts'), 'utf8') }))

describe('preflightOrMethodError', () => {
  it('answers OPTIONS with the CORS headers', async () => {
    const res = preflightOrMethodError(new Request('http://x/', { method: 'OPTIONS' }), cors)!
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
  it('refuses other methods with 405 and an Allow header', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const res = preflightOrMethodError(new Request('http://x/', { method }), cors)!
      expect(res.status).toBe(405)
      expect(res.headers.get('Allow')).toBe('POST, OPTIONS')
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    }
  })
  it('lets POST through', () => {
    expect(preflightOrMethodError(new Request('http://x/', { method: 'POST', body: '{}' }), cors)).toBeNull()
  })
})

describe('dbError', () => {
  it('maps insufficient privilege (the SUPER_ADMIN gate) to 403, not 500', () => {
    expect(dbError({ code: '42501', message: 'Super administrator access required' }).status).toBe(403)
  })
  it('passes through messages our own SQL raised on purpose', () => {
    expect(dbError({ code: 'P0001', message: 'Team not found' })).toEqual({ status: 400, message: 'Team not found' })
  })
  it('never echoes internal database messages', () => {
    const leaky = 'duplicate key value violates unique constraint "players_login_code_hash_key"'
    for (const code of ['23505', '23503', '42P01', '42703', 'XX000', '', undefined]) {
      expect(dbError({ code, message: leaky }).message).not.toContain('players_login_code_hash_key')
    }
    expect(dbError({ code: '42P01', message: 'relation "x" does not exist' })).toEqual({ status: 500, message: 'Internal server error' })
    expect(dbError({ code: '23505' }).status).toBe(409)
    expect(dbError({ code: '22P02' }).status).toBe(400)
    expect(dbError(null).status).toBe(500)
  })
})

describe('login rate limit keys', () => {
  const h = (init: Record<string, string>) => new Headers(init)
  it('cannot be dodged by prepending a spoofed X-Forwarded-For entry', () => {
    const a = clientAddress(h({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }))
    const b = clientAddress(h({ 'x-forwarded-for': '7.7.7.7, 203.0.113.9' }))
    expect(a).toBe('203.0.113.9')
    expect(b).toBe(a)
  })
  it('prefers a header only the platform sets', () => {
    expect(clientAddress(h({ 'cf-connecting-ip': '198.51.100.4', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe('198.51.100.4')
  })
  it('rejects garbage and over-long values into one shared bucket', () => {
    expect(clientAddress(h({ 'x-forwarded-for': "'; drop table x;--" }))).toBe('unknown')
    expect(clientAddress(h({ 'x-forwarded-for': 'a'.repeat(100) }))).toBe('unknown')
    expect(clientAddress(h({}))).toBe('unknown')
  })
  it('keys an IPv6 client by its /64 so rotating the low bits does not help', () => {
    expect(ipKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe(ipKey('2001:db8:1:2::1'))
    expect(ipKey('2001:db8:1:3::1')).not.toBe(ipKey('2001:db8:1:2::1'))
    expect(ipKey('203.0.113.9')).toBe('ip:203.0.113.9')
  })
  it('always counts the network and global keys, and the team key when given', () => {
    const base = loginRateLimitRequest('203.0.113.9')
    expect(base.keys).toEqual(['ip:203.0.113.9', 'global:login'])
    const withTeam = loginRateLimitRequest('203.0.113.9', 'ABCDEF')
    expect(withTeam.keys).toContain('team:ABCDEF')
    expect(withTeam.limits).toHaveLength(withTeam.keys.length)
    expect(withTeam.windows).toHaveLength(withTeam.keys.length)
    expect(withTeam.limits[0]).toBe(LOGIN_LIMITS.ip.limit)
  })
})

describe('every edge function', () => {
  it.each(functions.map(f => [f.name, f.src]))('%s handles preflight and refuses non-POST methods', (_name, src) => {
    expect(src).toContain('preflightOrMethodError(req, corsHeaders)')
    expect(src).toContain('Access-Control-Allow-Headers')
  })
  it.each(functions.map(f => [f.name, f.src]))('%s never returns a raw database message', (_name, src) => {
    // `{ error: someError.message }` / `errorResponse(500, error.message)` ship
    // table, column and constraint names to the caller.
    expect(src).not.toMatch(/\{\s*error:\s*\w*[Ee]rror\??\.message/)
    expect(src).not.toMatch(/errorResponse\(\s*\d+,\s*\w*[Ee]rror\??\.message/)
    expect(src).not.toMatch(/detail:\s*reason/)
  })
})

describe('SUPER_ADMIN gating in the admin functions', () => {
  const ops = functions.find(f => f.name === 'bureau-operations')!.src
  const nodeOps = functions.find(f => f.name === 'game-bureau-ops')!.src
  it('gates the destructive bureau-operations actions behind SUPER_ADMIN with a 403', () => {
    const set = /SUPER_ADMIN_ACTIONS[^=]*=\s*new Set\(\[([^\]]*)\]/.exec(ops)![1]
    for (const a of ['reset-team', 'reset-game', 'end-game', 'disqualify-team', 'delete-location']) {
      expect(set).toContain(`'${a}'`)
    }
    // ordinary operator actions must stay open to ADMIN
    for (const a of ['start-team', 'pause-team', 'send-notification', 'grant-hint', 'create-team', 'provision-team']) {
      expect(set).not.toContain(`'${a}'`)
    }
    expect(ops).toMatch(/SUPER_ADMIN_ACTIONS\.has\(action\) && adminRecord\.role !== 'SUPER_ADMIN'[\s\S]{0,80}jsonResponse\(403/)
  })
  it('maps the database 42501 refusal to 403 in both functions', () => {
    expect(ops).toContain("error.code === '42501'")
    expect(ops).toContain('BureauForbiddenError')
    expect(nodeOps).toMatch(/case 'reset_node':[\s\S]{0,400}errorResponse\(403/)
    expect(nodeOps).not.toMatch(/errorResponse\(500, error\.message/)
  })
})

describe('player-login rate limiting', () => {
  const src = functions.find(f => f.name === 'player-login')!.src
  it('uses the atomic limiter, fails closed, and never resets a counter on success', () => {
    expect(src).toContain("rpc('login_rate_limit_hit'")
    expect(src).toMatch(/rateLimitError \|\| !verdict[\s\S]{0,200}errorResponse\(500/)
    expect(src).toContain('Retry-After')
    expect(src).not.toContain('login_rate_limits')
    expect(src).not.toMatch(/\.delete\(\)/)
  })
  it('counts the attempt before it validates the code', () => {
    expect(src.indexOf("rpc('login_rate_limit_hit'")).toBeGreaterThan(0)
    expect(src.indexOf("rpc('login_rate_limit_hit'")).toBeLessThan(src.indexOf('isValidLoginCode(code)'))
  })
  it('does not trust the first X-Forwarded-For entry', () => {
    expect(src).not.toMatch(/x-forwarded-for[^)]*\)\?\.split\(','\)\[0\]/)
  })
})

describe('migrations', () => {
  it('2026100309 documents the SUPER_ADMIN decision in its header', () => {
    const sql = readFileSync(join(__dirname, '../../supabase/migrations/2026100309_super_admin_gating_rate_limit_hardening.sql'), 'utf8')
    const header = sql.split('CREATE')[0]
    expect(header).toMatch(/DECISION: which bureau_\* RPCs need SUPER_ADMIN/)
    expect(header).toContain('bureau_reset_team')
    expect(header).toContain('bureau_reset_node')
  })
})
