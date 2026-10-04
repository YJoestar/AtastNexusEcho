/**
 * NEXUS — rate-limit keys for player-login
 *
 * Pure TypeScript, unit-tested. The old code keyed on the FIRST entry of
 * X-Forwarded-For, which the client controls: sending a different
 * `X-Forwarded-For: <random>` on every request gave every attempt its own
 * bucket. The platform proxy appends the address it actually saw, so the
 * trustworthy entry is the LAST one (or a header only the platform sets).
 * IPv6 clients own a whole /64, so the key is the /64 prefix.
 */

export const LOGIN_LIMITS = {
  ip: { limit: 10, windowSeconds: 60 },
  team: { limit: 30, windowSeconds: 600 },
  global: { limit: 600, windowSeconds: 60 },
} as const

export function clientAddress(headers: Headers): string {
  const single = headers.get('cf-connecting-ip') ?? headers.get('x-real-ip')
  const forwarded = headers.get('x-forwarded-for')
  const raw = single?.trim() || forwarded?.split(',').map(s => s.trim()).filter(Boolean).pop() || ''
  return raw.length > 0 && raw.length <= 64 && /^[0-9a-fA-F:.]+$/.test(raw) ? raw : 'unknown'
}

function ipv6Prefix64(address: string): string {
  const [head, tail = ''] = address.split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const groups = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return groups.slice(0, 4).map(g => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':')
}

export function ipKey(address: string): string {
  if (address === 'unknown') return 'ip:unknown'
  return address.includes(':') ? `ip:${ipv6Prefix64(address)}::/64` : `ip:${address}`
}

/** Keys, limits and windows for one attempt; teamCode must already be validated. */
export function loginRateLimitRequest(address: string, teamCode?: string | null) {
  const keys = [ipKey(address), 'global:login']
  const limits: number[] = [LOGIN_LIMITS.ip.limit, LOGIN_LIMITS.global.limit]
  const windows: number[] = [LOGIN_LIMITS.ip.windowSeconds, LOGIN_LIMITS.global.windowSeconds]
  if (teamCode) {
    keys.push(`team:${teamCode}`)
    limits.push(LOGIN_LIMITS.team.limit)
    windows.push(LOGIN_LIMITS.team.windowSeconds)
  }
  return { keys, limits, windows }
}
