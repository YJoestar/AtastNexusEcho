import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireBoolean, requireInteger } from '../../supabase/functions/_shared/request'
import { isPlayerSafeRpcMessage } from '../../supabase/functions/_shared/http'

const ROOT = join(__dirname, '../..')
const FN_DIR = join(ROOT, 'supabase/functions')
const MIGRATIONS = join(ROOT, 'supabase/migrations')

const functions = readdirSync(FN_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== '_shared')
  .map(d => ({ name: d.name, src: readFileSync(join(FN_DIR, d.name, 'index.ts'), 'utf8') }))

/** The functions that read or write a team's private game state. */
const GAME_FUNCTIONS = functions.filter(f => f.name.startsWith('game-') && f.name !== 'game-bureau-ops')
  .map(f => f.name)

const migrations = readdirSync(MIGRATIONS)
  .filter(f => f.endsWith('.sql'))
  // Same ordering the migration runner uses: by the version before the first
  // underscore, so 20260929_x precedes 2026092902_y.
  .sort((a, b) => a.split('_')[0].localeCompare(b.split('_')[0]))
  .map(name => ({ name, sql: readFileSync(join(MIGRATIONS, name), 'utf8') }))
const allMigrations = migrations.map(m => m.sql).join('\n')

describe('every game function establishes who the caller is', () => {
  it('covers all of them', () => {
    // Guards the guard: if a new game-* function appears it is covered here.
    expect(GAME_FUNCTIONS.sort()).toEqual([
      'game-get-node', 'game-get-state', 'game-inventory', 'game-leaderboard',
      'game-mark-read', 'game-node-progress', 'game-notifications',
      'game-scan-qr', 'game-submit', 'game-use-hint',
    ])
  })

  it.each(GAME_FUNCTIONS)('%s reads the bearer token through the shared helper', (name) => {
    const src = functions.find(f => f.name === name)!.src
    expect(src, 'must not hand-roll Authorization parsing').not.toMatch(/headers\.get\('Authorization'\)/)
    expect(src).toContain('requireBearerToken(req)')
  })

  it.each(GAME_FUNCTIONS)('%s verifies the token before touching game data', (name) => {
    const src = functions.find(f => f.name === name)!.src
    expect(src).toContain('await requireVerifiedUser(supabaseUser, token)')
    // Verification has to happen before the first RPC, or it is decoration.
    expect(src.indexOf('await requireVerifiedUser')).toBeGreaterThan(-1)
    const firstRpc = src.search(/\.rpc\(/)
    expect(src.indexOf('await requireVerifiedUser')).toBeLessThan(firstRpc)
  })

  it.each(GAME_FUNCTIONS)('%s answers an AuthError with its own status', (name) => {
    const src = functions.find(f => f.name === name)!.src
    expect(src).toMatch(/err instanceof AuthError\)\s*return errorResponse\(err\.status, err\.message\)/)
  })
})

describe('edge functions report failures deliberately', () => {
  it.each(functions.map(f => [f.name, f.src]))('%s has no empty catch block', (_name, src) => {
    // A bare `catch {}` or one whose body is only a comment is a failure that
    // leaves no trace at all.
    expect(src).not.toMatch(/catch\s*\{\s*(\/\/[^\n]*\s*)?\}/)
  })

  it.each(functions.map(f => [f.name, f.src]))(
    '%s never answers a database error with a flat 500 and a canned message',
    (_name, src) => {
      // The old shape: every PostgREST failure, from a privilege problem to a
      // dropped connection, became the same uninformative 500.
      expect(src).not.toMatch(/errorResponse\(\s*500,\s*'Failed to /)
    },
  )

  it('routes database errors through the shared mapping instead of a blanket status', () => {
    for (const name of GAME_FUNCTIONS) {
      const src = functions.find(f => f.name === name)!.src
      // Each function that reports a database error must consult dbError.
      if (/\.rpc\(/.test(src) && /console\.error\([^)]*error/.test(src)) {
        expect(src, `${name} logs a database error but never maps it`).toContain('dbError(')
      }
    }
  })
})

describe('admin authorisation is asked of the database honestly', () => {
  const ADMIN_FUNCTIONS = ['bureau-operations', 'admin-check', 'game-bureau-ops']

  /**
   * Source with comments removed. These invariants are about what the code does,
   * and several of these files *explain* the 401/403 distinction in prose — a scan
   * that includes comments would match its own documentation.
   */
  const codeOf = (name: string) =>
    functions
      .find(f => f.name === name)!
      .src.replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')

  it.each(ADMIN_FUNCTIONS)(
    '%s asks for the admin row with maybeSingle(), not single()',
    name => {
      // `single()` rejects zero rows as PGRST116 and several of these lookups
      // discarded `error`, so "no admin row" and "the database is down" were the
      // same outcome. maybeSingle() separates them.
      const lookup = /from\('admin_users'\)[\s\S]{0,200}?\.(single|maybeSingle)\(\)/.exec(codeOf(name))
      expect(lookup, `${name} must look up its admin grant`).not.toBeNull()
      expect(lookup![1], `${name} should use maybeSingle()`).toBe('maybeSingle')
    },
  )

  it.each(ADMIN_FUNCTIONS)('%s checks the admin lookup error it used to discard', name => {
    // The destructured `error` has to be branched on; naming it is not enough.
    expect(codeOf(name), `${name} must handle the admin_users lookup error`).toMatch(
      /const\s*\{[^}]*\berror:\s*admin\w*\s*\}\s*=\s*await/,
    )
  })

  it.each(ADMIN_FUNCTIONS)(
    '%s answers 403, not 401, to an authenticated caller with no admin grant',
    name => {
      const code = codeOf(name)
      // A missing bearer token and a rejected session are genuinely 401, and both
      // happen *before* the admin grant is consulted. The defect was answering 401
      // afterwards too, which claimed the token was bad when the session was fine
      // and only the grant was missing — sending operators re-authenticating with
      // working credentials. So: past the admin_users lookup, 401 must not appear.
      const grant = /from\('admin_users'\)[\s\S]{0,200}?\.maybeSingle\(\)/.exec(code)
      expect(grant, `${name} must look up its admin grant`).not.toBeNull()
      const afterGrant = code.slice(grant!.index + grant![0].length)
      expect(afterGrant, `${name} must not answer 401 once the grant is known`).not.toMatch(/\b401\b/)
      expect(afterGrant, `${name} must answer 403 when the grant is missing`).toMatch(/403/)
    },
  )

  it.each(functions.map(f => [f.name, f.src]))(
    '%s does not destructure a possibly-null auth envelope',
    (_name, src) => {
      // `{ data: { user }, error }` throws a TypeError when `data` is null, which
      // reports a rejected token as an unhandled 500.
      expect(src).not.toMatch(/const\s*\{\s*data:\s*\{\s*user\s*\}\s*,/)
    },
  )
})

describe('hint numbers agree between the edge function and the database', () => {
  it('accepts exactly as many hints as the schema allows', () => {
    const edge = functions.find(f => f.name === 'game-use-hint')!.src
    const declared = /MAX_HINTS_PER_NODE\s*=\s*(\d+)/.exec(edge)
    expect(declared, 'game-use-hint must name its bound').not.toBeNull()
    const edgeMax = Number(declared![1])

    // hints_used.hint_number CHECK (hint_number BETWEEN 1 AND n)
    const check = /hint_number\s+INTEGER\s+NOT\s+NULL\s+CHECK\s*\(\s*hint_number\s+BETWEEN\s+1\s+AND\s+(\d+)\s*\)/i
      .exec(allMigrations)
    expect(check, 'the hints_used constraint must still exist').not.toBeNull()
    const dbMax = Number(check![1])

    // request_hint caps with LEAST(v_max_hints, n)
    const cap = /LEAST\(v_max_hints,\s*(\d+)\)/.exec(allMigrations)
    expect(cap, 'request_hint must still cap hints').not.toBeNull()

    expect(edgeMax).toBe(dbMax)
    expect(edgeMax).toBe(Number(cap![1]))
  })

  it('no longer accepts hint numbers the database would refuse', () => {
    const edge = functions.find(f => f.name === 'game-use-hint')!.src
    expect(edge).toContain("requireInteger(body.hintNumber, 'hintNumber', 1, MAX_HINTS_PER_NODE)")
    expect(edge).not.toMatch(/'hintNumber',\s*1,\s*20/)
  })
})

describe('admin RLS policies can actually evaluate', () => {
  /**
   * The definition of every policy that is in force after the whole migration
   * history has been applied.
   *
   * Migration history legitimately keeps the original broken text — you cannot
   * rewrite a migration that has already run — so this replays CREATE/DROP in
   * order and keeps only the last statement per policy name. That is the
   * version Postgres actually holds.
   */
  function effectivePolicies(): Map<string, { file: string; text: string }> {
    const effective = new Map<string, { file: string; text: string }>()
    for (const m of migrations) {
      for (const match of m.sql.matchAll(
        /(CREATE|DROP)\s+POLICY\s+(IF EXISTS\s+)?"([^"]+)"([\s\S]*?);/gi
      )) {
        const [, kind, , name, tail] = match
        if (kind.toUpperCase() === 'DROP') {
          effective.delete(name)
        } else {
          effective.set(name, { file: m.name, text: `${match[0]}` })
        }
        void tail
      }
    }
    return effective
  }

  const effective = effectivePolicies()

  it('found the policies it is checking', () => {
    expect(effective.size).toBeGreaterThan(10)
  })

  it('never names admin_users inside a policy that is still in force', () => {
    // A subquery on admin_users is evaluated as the invoking role, and
    // admin_users is deny-all, so the expression is permanently false while
    // looking completely correct. This is the defect 2026100401 repairs.
    //
    // Only the USING / WITH CHECK expression is inspected: the `ON <table>`
    // clause legitimately reads "ON admin_users" for the deny-all policy.
    const offenders = [...effective.entries()]
      .map(([name, p]) => ({
        name,
        file: p.file,
        // Everything after the table the policy is attached to.
        expression: p.text.replace(/^\s*CREATE\s+POLICY\s+"[^"]+"\s+ON\s+[\w."]+\s*/i, ''),
      }))
      .filter(p => /admin_users/.test(p.expression))
      .map(p => `${p.name} (${p.file})`)
    expect(offenders, 'these policies can never be satisfied').toEqual([])
  })

  it('routes every admin policy in force through the SECURITY DEFINER helper', () => {
    const adminPolicies = [...effective.entries()].filter(([name]) => /^Admins can/i.test(name))
    expect(adminPolicies.length).toBeGreaterThan(0)
    for (const [name, p] of adminPolicies) {
      expect(p.text, `${name} (${p.file})`).toMatch(/is_current_user_admin\(\)/)
    }
  })

  it('still defines the deny-all policy on admin_users itself', () => {
    // Repairing the admin policies must not have opened admin_users itself.
    const deny = effective.get('No public access to admin_users')
    expect(deny, 'the deny-all policy on admin_users must survive').toBeDefined()
    expect(deny!.text).toMatch(/USING \(FALSE\)/)
  })

  it('ships the repair migration', () => {
    const repair = migrations.find(m => m.name.startsWith('2026100401'))
    expect(repair, 'the repair migration must exist').toBeDefined()
    expect(repair!.sql).toContain('DROP POLICY IF EXISTS "Admins can read all teams"')
    expect(repair!.sql).toContain('is_current_user_admin()')
  })

  it('repairs the score trigger, whose admin exemption was equally dead', () => {
    const repair = migrations.find(m => m.name.startsWith('2026100401'))!.sql
    expect(repair).toContain('FUNCTION prevent_direct_score_change()')
    // The trigger body must no longer inline the subquery that cannot evaluate.
    const body = /FUNCTION prevent_direct_score_change\(\)[\s\S]*?\$\$;/i.exec(repair)![0]
    expect(body).not.toMatch(/SELECT 1 FROM admin_users/)
    expect(body).toContain('is_current_user_admin()')
  })
})

describe('realtime publications cover the tables the app subscribes to', () => {
  const publishedTables = new Set<string>()
  for (const m of migrations) {
    for (const match of m.sql.matchAll(/CREATE PUBLICATION\s+\w+\s+FOR TABLE\s+([\w,\s]+);/gi)) {
      for (const t of match[1].split(',')) publishedTables.add(t.trim())
    }
  }

  it('publishes every table the client subscribes to', () => {
    // AppProvider subscribes to `teams`; nothing else is subscribed in
    // production (useBureauRealtime's subscribe() has no production caller).
    expect(publishedTables.has('teams')).toBe(true)
  })

  it('publishes the progress tables rather than colliding on one name', () => {
    // Two publications once shared a name, so the second CREATE was a silent
    // no-op behind IF NOT EXISTS. Distinct names keep both live.
    expect(publishedTables.has('team_progress')).toBe(true)
    expect(publishedTables.has('node_progress')).toBe(true)
  })
})

describe('every edge function has a version-controlled JWT posture', () => {
  const config = readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8')
  const declared = new Map(
    [...config.matchAll(/^\[functions\.([\w-]+)\][\s\S]*?verify_jwt\s*=\s*(true|false)/gm)]
      .map(m => [m[1], m[2] === 'true'])
  )

  it('declares an explicit verify_jwt for every function that exists', () => {
    // Without this a newly added function silently inherits the platform
    // default, and the only place its posture is recorded is a dashboard.
    for (const f of functions) {
      expect(declared.has(f.name), `${f.name} has no explicit verify_jwt in supabase/config.toml`).toBe(true)
    }
  })

  it('declares no function that does not exist', () => {
    const actual = new Set(functions.map(f => f.name))
    for (const name of declared.keys()) {
      expect(actual, `config.toml declares unknown function ${name}`).toContain(name)
    }
  })

  it('only lets the login function run without a token', () => {
    // player-login is how a player obtains a session; requiring a token there
    // would make login impossible. Every other function must be gated.
    const ungated = [...declared.entries()].filter(([, gated]) => !gated).map(([name]) => name)
    expect(ungated).toEqual(['player-login'])
  })

  it('gates every function whose code verifies a session itself', () => {
    // Defence in depth in both directions: the gateway setting and the in-function
    // check have to agree, or one of them is quietly doing nothing.
    for (const name of GAME_FUNCTIONS) {
      const src = functions.find(f => f.name === name)!.src
      expect(src).toContain('requireVerifiedUser')
      expect(declared.get(name), `${name} verifies in code but is not gated at the gateway`).toBe(true)
    }
  })
})

describe('request validators', () => {
  it('requireBoolean accepts only real booleans', () => {
    expect(requireBoolean(true, 'unreadOnly')).toBe(true)
    expect(requireBoolean(false, 'unreadOnly')).toBe(false)
    for (const bad of ['true', 1, 0, null, undefined, {}, [], 'yes']) {
      expect(() => requireBoolean(bad, 'unreadOnly')).toThrow(/unreadOnly must be true or false/)
    }
  })

  it('requireInteger still bounds a value the way the database does', () => {
    expect(requireInteger(3, 'hintNumber', 1, 3)).toBe(3)
    expect(() => requireInteger(4, 'hintNumber', 1, 3)).toThrow()
    expect(() => requireInteger(1.5, 'hintNumber', 1, 3)).toThrow()
  })
})

describe('isPlayerSafeRpcMessage', () => {
  it('passes the refusals our own SQL writes for players', () => {
    for (const message of [
      'Team not found',
      'No team found for player',
      'Team is not active',
      'Node not accessible',
      'Hint not available',
      'Invalid answer format',
    ]) {
      expect(isPlayerSafeRpcMessage(message), message).toBe(true)
    }
  })

  it('refuses internal database text', () => {
    for (const message of [
      'duplicate key value violates unique constraint "players_login_code_hash_key"',
      'null value in column "team_id" violates not-null constraint',
      'relation "public.puzzle_nodes" does not exist',
      'permission denied for table puzzle_nodes',
      'column "accepted_answer" does not exist',
      'SELECT * FROM puzzle_nodes',
      'function nexus_redact_jsonb() failed',
      'ERROR: SQLSTATE 42501',
    ]) {
      expect(isPlayerSafeRpcMessage(message), message).toBe(false)
    }
  })

  it('refuses anything that is not a sane string', () => {
    for (const value of [null, undefined, 42, {}, [], 'x'.repeat(301), '   ']) {
      expect(isPlayerSafeRpcMessage(value)).toBe(false)
    }
  })
})
describe('QR marker identity is stable and data-driven', () => {
  const locationsSrc = readFileSync(join(ROOT, 'src/lib/qr/locations.ts'), 'utf8')

  it('does not derive marker identity from an array index', () => {
    // `LOC-${index + 1}` renumbered every later marker when a puzzle was inserted
    // or reordered, invalidating every QR sheet already printed and stuck to a wall.
    expect(locationsSrc).not.toMatch(/forEach\s*\([^)]*\bindex\b/)
    expect(locationsSrc).not.toMatch(/padStart\(3,\s*'0'\)/)
  })

  it('keys marker identity on the puzzle code', () => {
    expect(locationsSrc).toMatch(/function buildLocationId\(puzzleCode: string\)/)
  })

  it('never claims the Bureau recognises a marker it has no record of', () => {
    // The scan result carries `error` when the marker is unknown. Telling the
    // player "the system recognizes the marker" sent them hunting for a
    // prerequisite that did not exist.
    const engine = readFileSync(join(ROOT, 'src/hooks/useGameEngine.ts'), 'utf8')
    expect(engine).toMatch(/function describeUnrecognised\(/)
    const throwBranch = engine.slice(engine.indexOf('} catch (err) {'))
    expect(throwBranch.slice(0, 400)).not.toContain('recognizes the marker')
  })

  it('exposes the marker target to the admin client', () => {
    // `code` is a legacy label that does not encode its target, so discarding
    // puzzle_node_id left the Bureau unable to see what a marker pointed at.
    const admin = readFileSync(join(ROOT, 'src/lib/admin/index.ts'), 'utf8')
    expect(admin).toMatch(/puzzleNodeId:\s*toOptionalText\(firstPresent\(q, \['puzzle_node_id'\]\)\)/)
  })
})

describe('the finale is discovered by type, not by a literal code', () => {
  it('does not submit to a hardcoded node code', () => {
    const finalScreen = readFileSync(join(ROOT, 'src/features/player/Final.tsx'), 'utf8')
    expect(finalScreen).not.toMatch(/FINAL_NODE_ID\s*=\s*'P\d+/)
    expect(finalScreen).toMatch(/FINAL_NODE\?\.code/)
  })

  it('resolves the finale from the content graph', () => {
    const content = readFileSync(join(ROOT, 'src/content/puzzles/index.ts'), 'utf8')
    expect(content).toMatch(/FINAL_NODE[\s\S]{0,120}type === 'FINAL_BOSS'/)
  })
})

describe('team status is translated, never cast', () => {
  it('maps the database vocabulary onto the UI vocabulary', () => {
    const machine = readFileSync(join(ROOT, 'src/lib/auth/team-state-machine.ts'), 'utf8')
    expect(machine).toMatch(/export function toGameStatus\(/)
    for (const [db, ui] of [['ACTIVE', 'RUNNING'], ['PAUSED', 'PAUSED'], ['COMPLETED', 'ENDED']]) {
      expect(machine).toMatch(new RegExp(`case '${db}':[\\s\\S]{0,80}'${ui}'`))
    }
  })

  it('is used where the raw database status used to be cast', () => {
    const provider = readFileSync(join(ROOT, 'src/app/providers/AppProvider.tsx'), 'utf8')
    expect(provider).not.toMatch(/status:\s*state\.team\.status as GameStatus/)
    expect(provider).toContain('toGameStatus(state.team.status)')
  })

  it('does not ship invented game parameters as if they were server state', () => {
    const provider = readFileSync(join(ROOT, 'src/app/providers/AppProvider.tsx'), 'utf8')
    expect(provider).not.toMatch(/maxTeams:\s*25/)
    expect(provider).not.toMatch(/playersPerTeam:\s*3/)
    expect(provider).not.toMatch(/gameDurationMinutes:\s*180/)
  })
})

describe('bureau list handlers never discard a query error', () => {
  it('checks the error on every read inside list-teams', () => {
    const src = functions.find(f => f.name === 'bureau-operations')!.src
    const start = src.indexOf("case 'list-teams'")
    expect(start).toBeGreaterThan(-1)
    const block = src.slice(start, src.indexOf("case '", start + 10))
    // Four reads; each must branch on its error or a database fault answers 200
    // with an empty register and the operator is told the archive is empty.
    const reads = block.match(/const \{ data: \w+, error: \w+ \} = await/g) ?? []
    expect(reads.length).toBeGreaterThanOrEqual(4)
    expect((block.match(/dbErrorResponse\(/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })

  it('does not file a QR_DOWNLOAD audit record for a pure read', () => {
    // Now that the audit trail actually renders, a read-time logAction would fill
    // the ledger with download entries for sheets nobody downloaded.
    const src = functions.find(f => f.name === 'bureau-operations')!.src
    const start = src.indexOf("case 'list-qr-codes'")
    const block = src.slice(start, src.indexOf("case '", start + 10))
    expect(block).not.toContain('QR_DOWNLOAD')
  })
})

describe('admin reads use the key the edge function actually returns', () => {
  it('reads the audit log under the name the edge function sends', () => {
    // bureau-operations returns `auditLog`. The client read `audit_log`, so
    // `?? []` turned the entire audit trail into a permanently empty ledger.
    const admin = readFileSync(join(ROOT, 'src/lib/admin/index.ts'), 'utf8')
    const start = admin.indexOf('async getAuditLog(')
    expect(start).toBeGreaterThan(-1)
    const block = admin.slice(start, start + 1200)
    expect(block).toMatch(/result\.auditLog/)
  })
})
