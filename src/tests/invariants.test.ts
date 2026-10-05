import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

describe('SECURITY DEFINER functions keep a pinned search_path', () => {
  /**
   * Strip SQL comments, so a migration that *explains* search_path is not read as
   * one that *sets* it. Several of these files document the rule at length.
   */
  const stripSql = (sql: string) =>
    sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')

  /**
   * Every function the migration history defines or replaces, with whether the
   * definition itself states `SET search_path`, and whether any LATER migration
   * re-pinned it.
   *
   * CREATE OR REPLACE resets a function's SET clauses, so "the history pinned it
   * once" is not good enough - only the newest definition counts. This is how
   * submit_puzzle_answer and scan_qr_code lost it: 2026100309 pinned everything,
   * then 2026100501 and 2026100502 replaced two of them without restating the
   * clause, and the loss was invisible until someone read pg_proc.
   */
  const definitions = (() => {
    // name -> { definer, pinnedInline, repairedAfter }
    const map = new Map<string, { definer: boolean; pinnedInline: boolean; repaired: boolean; file: string }>()
    for (const { name, sql } of migrations) {
      const code = stripSql(sql)
      for (const m of code.matchAll(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([A-Za-z0-9_.]+)\s*\([\s\S]*?\)\s*([\s\S]*?)\$\$/gi,
      )) {
        const [, fn, body = ''] = m
        map.set(fn, {
          definer: /SECURITY\s+DEFINER/i.test(body),
          pinnedInline: /SET\s+search_path/i.test(body),
          repaired: false,
          file: name,
        })
      }
      // An ALTER over pg_proc repairs every definer function in the schema, so
      // record it against the ones already known and against ones defined later.
      if (/ALTER\s+FUNCTION[\s\S]*?SET\s+search_path/i.test(code)) {
        for (const entry of map.values()) entry.repaired = true
      }
    }
    return map
  })()

  const definerFunctions = [...definitions.entries()].filter(([, d]) => d.definer)

  it('finds the definer functions it is meant to be checking', () => {
    // Guards the guard: an empty or near-empty set means the parser stopped
    // matching and every rule below would pass vacuously.
    expect(definerFunctions.length).toBeGreaterThan(10)
  })

  it.each(definerFunctions)(
    '%s is left with a pinned search_path by the newest definition',
    (fn, d) => {
      // The newest definition either states the clause or a later migration
      // re-pinned it. Anything else is running on the caller's search_path, where
      // a role that can create objects ahead of `public` (or in pg_temp) can
      // shadow a table and have the definer execute the attacker's version.
      expect(
        d.pinnedInline || d.repaired,
        `${fn} is SECURITY DEFINER but its newest definition (${d.file}) neither states SET search_path nor is repaired by a later migration`,
      ).toBe(true)
    },
  )

  it('names the game-critical functions among the ones it protects', () => {
    const protectedNames = definerFunctions.map(([fn]) => fn)
    for (const critical of ['submit_puzzle_answer', 'scan_qr_code', 'get_player_node_detail']) {
      expect(protectedNames, `${critical} must be covered by this check`).toContain(critical)
    }
  })
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
  it('prints the identifier the database resolves against', () => {
    // The marker identity a player can actually use is qr_nodes.code. Everything
    // the scanner accepts is one of code / marker_id / manual_code, matched
    // exactly, so whatever goes into the image has to be that value verbatim.
    const sheet = readFileSync(join(ROOT, 'src/lib/qr-download.ts'), 'utf8')
    expect(sheet).toMatch(/QRCode\.toDataURL\(\s*item\.code/)
    const marker = readFileSync(join(ROOT, 'src/components/visual/FieldMarker.tsx'), 'utf8')
    expect(marker).toMatch(/QRCode\.toString\(\s*qrCode\.code/)
  })

  it('has exactly one source of truth for what a marker means', () => {
    // A client-side registry of marker payloads was the second opinion: it
    // published `NX|V1|LOC-...` payloads and `NX-Loc-...` manual codes, which
    // scan_qr_code rejects on every row, and the Bureau QA inventory was built
    // from it — so QA signed off on codes that fail in production. Nothing in
    // the app may resolve a marker without the database.
    expect(
      existsSync(join(ROOT, 'src/lib/qr')),
      'the client-side marker registry must not come back',
    ).toBe(false)

    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue
          walk(full)
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
          // Comments are stripped first: this file and the QA simulator both
          // discuss the retired vocabulary in prose, and documentation of a
          // removed scheme is not a reintroduction of it.
          const code = readFileSync(full, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '')
          if (/NX\|V1\||QR_PAYLOAD_PREFIX|NX-Loc-/.test(code)) {
            offenders.push(full.replace(`${ROOT}\\`, ''))
          }
        }
      }
    }
    walk(join(ROOT, 'src'))
    expect(offenders, 'a second marker vocabulary exists in the app').toEqual([])
  })

  it('sends the raw payload to the Bureau instead of resolving it locally', () => {
    const scanner = readFileSync(join(ROOT, 'src/features/player/QR.tsx'), 'utf8')
    expect(scanner).not.toMatch(/from '@\/lib\/qr'/)
    expect(scanner).toMatch(/void submitCode\(code\)|await submitCode\(code\)/)
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

  it('records the resolved marker code, not whatever the player typed', () => {
    // team_has_scanned compares the event payload against qr_nodes.code. A manual
    // entry recorded the typed string, so a marker typed rather than scanned was
    // written to the ledger but stayed invisible to the team through RLS.
    const fix = migrations.find(m => m.name.startsWith('2026100502'))
    expect(fix, 'the idempotent marker migration must exist').toBeDefined()
    // Comments stripped: the migration quotes the old expression in prose to
    // explain what it replaced.
    const fixCode = fix!.sql.replace(/^\s*--.*$/gm, '')
    expect(fixCode).toMatch(/'qrCode', v_qr_node\.code/)
    expect(fixCode).not.toMatch(/jsonb_build_object\('qrCode', p_qr_code\)/)
  })

  it('does not write a fresh progress record for every frame the camera reads', () => {
    const fix = migrations.find(m => m.name.startsWith('2026100502'))!.sql
    // The AVAILABLE branch used to insert a notification and an event on every
    // call, with nothing writing node_progress to close the window.
    expect(fix).toMatch(/INTO v_seen_before/)
    expect(fix).toMatch(/IF NOT v_seen_before THEN/)
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

describe('a solve is scored exactly once', () => {
  /**
   * The definition of submit_puzzle_answer that is actually in force after the
   * whole migration history has run: the last CREATE OR REPLACE wins, exactly
   * as in Postgres. Older, broken copies stay in the history and must not be
   * mistaken for the live one.
   */
  function effectiveSubmit(): { file: string; sql: string } {
    let found: { file: string; sql: string } | null = null
    for (const m of migrations) {
      const match = /CREATE OR REPLACE FUNCTION\s+submit_puzzle_answer\s*\([\s\S]*?\$\$;/i.exec(m.sql)
      if (match) found = { file: m.name, sql: match[0] }
    }
    return found!
  }

  const fn = effectiveSubmit()

  it('found the function it is checking', () => {
    expect(fn, 'submit_puzzle_answer must be defined in the migration history').toBeTruthy()
  })

  it('makes the SOLVED transition conditional rather than a blind write', () => {
    // Three players submitting the same answer on three phones is ordinary, not
    // exotic. Both transactions used to read IN_PROGRESS and both paid out.
    // The arbiter has to be the transition, so it must refuse to re-solve.
    expect(fn.sql).toMatch(/WHERE team_id = v_team_id AND node_id = p_node_id\s*\n\s*AND status <> 'SOLVED'/i)
  })

  it('gates the payout on having actually won that transition', () => {
    // Only the transaction that moved the row out of a non-SOLVED status may
    // touch the score, the unlock or the events.
    const diagnostics = /GET DIAGNOSTICS v_solved_rowcount = ROW_COUNT/i.exec(fn.sql)
    expect(diagnostics, 'the row count of the SOLVED update must be read').toBeTruthy()
    const zeroCheck = /IF v_solved_rowcount = 0 THEN/i.exec(fn.sql)
    expect(zeroCheck, 'a lost race must be detected').toBeTruthy()

    // ...and the refusal has to come before the score is touched.
    const zeroAt = zeroCheck!.index
    const scoreAt = fn.sql.search(/SET score = score \+ v_points_awarded/i)
    expect(scoreAt).toBeGreaterThan(-1)
    expect(zeroAt).toBeLessThan(scoreAt)
  })

  it('claims the attempt counter atomically instead of reading it first', () => {
    // Reading attempts and then writing attempts + 1 is what let two concurrent
    // submissions both record attempt_number = 1 while the progress row still
    // said 1. The value has to come back from the statement that wrote it.
    expect(fn.sql).toMatch(/ON CONFLICT \(team_id, node_id\) DO UPDATE[\s\S]{0,400}attempts = node_progress\.attempts \+ 1/i)
    expect(fn.sql).toMatch(/RETURNING attempts, started_at INTO v_attempt_number/i)
  })

  it('does not let a later write clobber the claimed attempt number', () => {
    // The old code incremented in one statement and then overwrote it with a
    // value read before either, which is how two attempts became one.
    expect(fn.sql).not.toMatch(/SET attempts = v_attempt_number,\s*\n\s*updated_at/i)
  })

  it('tells the loser the answer was right and the team already has the points', () => {
    // Silence here reads to a player as "nothing happened", which is how a
    // player retries and how a team loses confidence in the score.
    expect(fn.sql).toMatch(/'alreadySolved', true/i)
  })

  it('ends the run when the team has nothing left it can reach', () => {
    // P37 unlocks nothing, so before this the finale left the team ACTIVE
    // forever: clock running, leaderboard unfinalised, no ending screen.
    expect(fn.sql).toMatch(/SET status = 'COMPLETED'/)
    expect(fn.sql).toMatch(/'TEAM_COMPLETED'/)
  })

  it('measures puzzle time against when the node was opened, not the game start', () => {
    expect(fn.sql).toMatch(/EXTRACT\(EPOCH FROM \(now\(\) - v_started_at\)\)/i)
    expect(fn.sql).not.toMatch(/time_spent_seconds = time_spent_seconds \+ v_response_time/i)
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
