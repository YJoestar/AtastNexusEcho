/**
 * NEXUS — case content validator.
 *
 * The rebuilt investigation lives entirely in the migration history: each gate
 * is a `puzzle_nodes` row whose `content`, `answer_metadata` and `metadata`
 * carry every player-facing string. Nothing about that content is checked by
 * the type system, and a single leaked answer token undoes the whole design,
 * so the rules are enforced here against the real SQL sources.
 *
 * What this suite does NOT do: it does not judge whether the writing is any
 * good. And it does not pretend every gate has been rebuilt. Gates that no
 * rebuild migration touches are reported as NOT REBUILT rather than silently
 * passing, so a green suite can never be read as "the whole case was
 * rewritten" while that is untrue.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT_VISUAL_TYPES, isDedicatedVisualType } from '@/components/player/puzzle/visualTypes'

const ROOT = join(__dirname, '../..')
const MIGRATIONS = join(ROOT, 'supabase/migrations')

/** Migrations that carry the investigation rebuild, in application order. */
const REBUILD_FILES = [
  '2026100603_investigation_rebuild_stage1.sql',
  '2026100604_investigation_rebuild_stage2.sql',
  '2026100605_investigation_rebuild_stage3.sql',
  '2026100606_investigation_rebuild_stage4.sql',
  '2026100607_investigation_rebuild_stage5.sql',
]

/**
 * Repair migrations applied after the rebuild. The 2026-10 audit found gates
 * whose answer did not match the evidence their own migration printed (P27b,
 * P29, P37). Each repair rewrites the gate forward, so it must be read as the
 * newest UPDATE for its code - otherwise the validator would keep checking the
 * broken text the repair replaced.
 */
const REPAIR_FILES = [
  '2026100610_finale_disposition_alignment.sql',
  '2026100611_repair_p27b_answer_target.sql',
  '2026100612_repair_p29_identity_format.sql',
  '2026100613_repair_token_provenance.sql',
  '2026100614_presented_evidence_redaction.sql',
]

/** The migrations that introduced the gates players meet today. */
const SEED_FILES = [
  '2026092903_seed_puzzle_nodes.sql',
  '2026093035_audio_evidence_integration.sql',
]

/** Every gate the case contains, playable and meta. */
const EXPECTED_CODES = [
  'P01', 'P02', 'P03', 'P04', 'P05',
  'P06', 'P06b', 'P07', 'P07b', 'P08', 'P09', 'P10', 'P11', 'P12', 'P13',
  'P14', 'P15', 'P16', 'P17', 'P17b', 'P18', 'P19', 'P20', 'P21',
  'P22', 'P23', 'P23b', 'P24', 'P24b', 'P25', 'P26', 'P27', 'P27b', 'P28', 'P29',
  'P30', 'P31', 'P32', 'P33', 'P34', 'P35', 'P36', 'P37',
  'M01', 'M02', 'M03', 'M04',
]

const ROLE_KEYS = ['observer', 'analyst', 'operator'] as const
const ROLE_FIELDS = ['role', 'screenTitle', 'dataPayload', 'whatTheySee', 'taskPrompt'] as const
const META_FIELDS = ['type', 'difficulty', 'time', 'storyReveal', 'locationClue', 'evidenceUnlocked', 'whyTeamworkMatters'] as const

function readIfPresent(name: string): string | null {
  try {
    return readFileSync(join(MIGRATIONS, name), 'utf8')
  } catch {
    return null
  }
}

interface Gate {
  code: string
  content: Record<string, unknown>
  answer: Record<string, unknown>
  metadata: Record<string, unknown>
  file: string
  rebuilt: boolean
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * The newest migration quotes its JSON with a single-quoted literal; the older
 * audio-evidence seed uses dollar quotes ($content23b$...$content23b$). Both
 * styles are read here, and the dollar-quoted bodies are blanked out before the
 * single-quote pass so an apostrophe inside one cannot pair with a quote
 * elsewhere in the file.
 */
function jsonLiterals(sql: string): { index: number; value: Record<string, unknown> }[] {
  const out: { index: number; value: Record<string, unknown> }[] = []

  const push = (index: number, text: string) => {
    if (!text.trimStart().startsWith('{')) return
    try {
      const value: unknown = JSON.parse(text)
      if (isPlainObject(value)) out.push({ index, value })
    } catch {
      // rewards / branches / other literals are not gate payloads
    }
  }

  const dollar = /\$([A-Za-z0-9_]*)\$([\s\S]*?)\$\1\$/g
  for (const m of sql.matchAll(dollar)) push(m.index!, m[2])

  const masked = sql.replace(dollar, whole => ' '.repeat(whole.length))
  for (const m of masked.matchAll(/'((?:[^']|'')*)'/g)) push(m.index!, m[1].replace(/''/g, "'"))

  out.sort((a, b) => a.index - b.index)
  return out
}

/** The JSON a named column is set to, in either quoting style. */
function columnJson(body: string, column: string): string | null {
  const re = new RegExp(
    `\\b${column}\\s*=\\s*(?:'((?:[^']|'')*)'|\\$([A-Za-z0-9_]*)\\$([\\s\\S]*?)\\$\\2\\$)`,
  )
  const hit = re.exec(body)
  if (!hit) return null
  return hit[1] !== undefined ? hit[1].replace(/''/g, "'") : hit[3]
}

/**
 * The seed files are one INSERT with many tuples: a code appears, then its JSON
 * payloads. Each payload is attributed to the most recent code marker before
 * it. Rebuild migrations are read separately, by statement, because there the
 * code follows the payload.
 */
function parseSeed(sql: string, file: string, out: Map<string, Gate>): void {
  const markers: { index: number; code: string }[] = []
  for (const m of sql.matchAll(/\(\s*'([A-Za-z0-9_]{2,8})'\s*,/g)) {
    markers.push({ index: m.index!, code: m[1] })
  }
  markers.sort((a, b) => a.index - b.index)

  const slots = new Map<string, { content?: Record<string, unknown>; answer?: Record<string, unknown>; metadata?: Record<string, unknown> }>()

  for (const literal of jsonLiterals(sql)) {
    let owner: string | null = null
    for (const marker of markers) {
      if (marker.index < literal.index) owner = marker.code
      else break
    }
    if (!owner) continue
    const slot = slots.get(owner) ?? {}
    if ('observer' in literal.value) slot.content = literal.value
    else if ('acceptedAnswer' in literal.value || 'acceptedAnswers' in literal.value) slot.answer = literal.value
    else if ('locationClue' in literal.value || 'storyReveal' in literal.value) slot.metadata = literal.value
    else continue
    slots.set(owner, slot)
  }

  for (const [code, slot] of slots) {
    if (!slot.content || !slot.answer || !slot.metadata) continue
    out.set(code, { code, content: slot.content, answer: slot.answer, metadata: slot.metadata, file, rebuilt: false })
  }
}

function parseUpdates(sql: string, file: string, out: Map<string, Gate>): void {
  const statement = /UPDATE\s+puzzle_nodes\s+SET\s+([\s\S]*?)\s+WHERE\s+code\s*=\s*'([A-Za-z0-9_]+)'\s*;/gi
  for (const m of sql.matchAll(statement)) {
    const [, body, code] = m
    const content = columnJson(body, 'content')
    const answer = columnJson(body, 'answer_metadata')
    const metadata = columnJson(body, 'metadata')
    // A rebuild migration rewrites a whole gate; a repair migration (2026-10
    // audit) may touch only one column and inherit the rest. Merge so the
    // newest writer for each column wins and a partial repair is still read as
    // the gate's real, current text.
    const previous = out.get(code)
    if (!content && !answer && !metadata) {
      throw new Error(`${file}: update for ${code} sets none of content / answer_metadata / metadata`)
    }
    if (!previous && (!content || !answer || !metadata)) {
      throw new Error(`${file}: update for ${code} introduces a gate but is missing one of content / answer_metadata / metadata`)
    }
    out.set(code, {
      code,
      content: content ? (JSON.parse(content) as Record<string, unknown>) : previous!.content,
      answer: answer ? (JSON.parse(answer) as Record<string, unknown>) : previous!.answer,
      metadata: metadata ? (JSON.parse(metadata) as Record<string, unknown>) : previous!.metadata,
      file,
      rebuilt: true,
    })
  }
}

const seedGates = new Map<string, Gate>()
for (const name of SEED_FILES) {
  const sql = readIfPresent(name)
  if (sql) parseSeed(sql, name, seedGates)
}

const gates = new Map(seedGates)
for (const name of [...REBUILD_FILES, ...REPAIR_FILES]) {
  const sql = readIfPresent(name)
  if (sql) parseUpdates(sql, name, gates)
}

const rebuilt = [...gates.values()].filter(g => g.rebuilt)

const seedSql = SEED_FILES.map(readIfPresent).join('\n')

/** The `type` column as written in the seed tuple: code, title, type. */
function seedType(code: string): string | null {
  const re = new RegExp(`\\('${code}'\\s*,\\s*'(?:[^']|'')*'\\s*,\\s*'([A-Z_]+)'`)
  const hit = re.exec(seedSql)
  return hit ? hit[1] : null
}

/** Every player-facing string of a gate, for the leakage check. */
function playerStrings(gate: Gate): string[] {
  const strings: string[] = []
  const push = (value: unknown) => {
    if (typeof value === 'string') strings.push(value)
    else if (Array.isArray(value)) value.forEach(push)
    else if (isPlainObject(value)) Object.values(value).forEach(push)
  }
  for (const role of ROLE_KEYS) push(gate.content[role])
  push(gate.content.operatorInvestigation)
  push(gate.content.hints)
  push(gate.content.narrativeObjective)
  push(gate.metadata.storyReveal)
  push(gate.metadata.whyTeamworkMatters)
  push(gate.metadata.locationClue)
  push(gate.metadata.evidenceUnlocked)
  return strings
}

/** The comparison the server itself uses: keep alphanumerics, upper-case them. */
const normalize = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '')

const stripComments = (sql: string) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')

const cases = rebuilt.map(g => [g.code, g] as const)

describe('case content: coverage', () => {
  it('knows every gate in the case', () => {
    for (const code of EXPECTED_CODES) {
      expect(gates.has(code), `no content found for ${code}`).toBe(true)
    }
  })

  it('reports honestly how much of the case the rebuild reaches', () => {
    const missing = EXPECTED_CODES.filter(code => !gates.get(code)?.rebuilt)
    expect(missing, `NOT REBUILT: ${missing.join(', ')}`).toEqual([])
  })
})

describe('case content: shape', () => {
  it.each(cases)('%s has all three role blocks', (_code, gate) => {
    for (const role of ROLE_KEYS) {
      const block = gate.content[role]
      expect(block, `${role} block missing`).toBeTruthy()
      for (const field of ROLE_FIELDS) {
        const value = (block as Record<string, unknown>)[field]
        expect(typeof value, `${role}.${field} must be a non-empty string`).toBe('string')
        expect((value as string).trim().length).toBeGreaterThan(0)
      }
    }
  })

  it.each(cases)('%s states its objective and coordination chain', (_code, gate) => {
    expect(typeof gate.content.narrativeObjective).toBe('string')
    const chain = gate.content.coordinationChain
    expect(chain, 'coordinationChain missing').toBeTruthy()
    for (const key of ['observerProduces', 'analystTransforms', 'operatorExecutes']) {
      expect(typeof (chain as Record<string, unknown>)[key], `coordinationChain.${key}`).toBe('string')
    }
    const investigation = gate.content.operatorInvestigation
    expect(investigation, 'operatorInvestigation missing').toBeTruthy()
    for (const key of ['operatorOwnEvidence', 'operatorTaskDescription']) {
      expect(typeof (investigation as Record<string, unknown>)[key], `operatorInvestigation.${key}`).toBe('string')
    }
  })

  it.each(cases)('%s carries complete metadata', (_code, gate) => {
    for (const field of META_FIELDS) {
      expect(gate.metadata[field], `metadata.${field} missing`).not.toBeUndefined()
    }
  })

  /**
   * The case x role matrix.
   *
   * The three-role chain is not enforced by the server - by design the Observer
   * and the Analyst speak their results and the application never receives
   * them, so only the Operator can submit (2026100601). The chain therefore
   * lives entirely in the CONTENT: each role is handed a different slice of the
   * evidence and must hand its result to the next. That makes "this gate has
   * three meaningful roles" a property of the content that can regress silently
   * - a role block left as a placeholder still passes every shape check above.
   *
   * These tests hold each of the 47 gates x 3 roles to the chain's contract.
   */
  const roleOf = (gate: Gate, role: string) =>
    (gate.content[role] ?? {}) as Record<string, unknown>

  it.each(cases)('%s: every role states what it sees, and what it hands on', (_code, gate) => {
    for (const role of ROLE_KEYS) {
      const block = roleOf(gate, role)
      // `whatTheySee` is the evidence only this role is given; `dataPayload` is
      // its instrument; `taskPrompt` is what it must do; `intermediateOutput` is
      // what it passes along. A block missing any of them is not a station in
      // the chain, it is decoration.
      for (const field of ['whatTheySee', 'dataPayload', 'taskPrompt', 'intermediateOutput']) {
        const value = block[field]
        expect(typeof value, `${gate.code}.${role}.${field} must be a non-empty string`).toBe('string')
        expect((value as string).trim().length, `${gate.code}.${role}.${field} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it.each(cases)('%s: the chain names all three hand-offs', (_code, gate) => {
    const chain = gate.content.coordinationChain as Record<string, unknown>
    // Observer produces -> Analyst transforms -> Operator executes. Each step
    // must be a real sentence, not a placeholder.
    for (const key of ['observerProduces', 'analystTransforms', 'operatorExecutes']) {
      expect(typeof chain[key], `coordinationChain.${key}`).toBe('string')
      expect((chain[key] as string).trim().length, `coordinationChain.${key} is empty`).toBeGreaterThan(10)
    }
  })

  it.each(cases)('%s: no two roles are handed the same instrument', (_code, gate) => {
    // If two roles carry an identical dataPayload, one of them is redundant and
    // the gate can be solved without it. Identical prose across roles is the
    // signature of a collapsed chain.
    const payloads = ROLE_KEYS.map(role => normalize(String(roleOf(gate, role).dataPayload ?? '')))
    const unique = new Set(payloads)
    expect(unique.size, `${gate.code}: two roles carry an identical dataPayload`).toBe(ROLE_KEYS.length)
  })

  it.each(cases)('%s: no two roles are handed the same observation', (_code, gate) => {
    const seen = ROLE_KEYS.map(role => normalize(String(roleOf(gate, role).whatTheySee ?? '')))
    const unique = new Set(seen)
    expect(unique.size, `${gate.code}: two roles are given identical evidence`).toBe(ROLE_KEYS.length)
  })

  it.each(cases)('%s has exactly three non-empty hints', (_code, gate) => {
    const hints = gate.content.hints
    expect(Array.isArray(hints), 'hints must be an array').toBe(true)
    expect(hints).toHaveLength(3)
    for (const hint of hints as unknown[]) {
      expect(typeof hint).toBe('string')
      expect((hint as string).trim().length).toBeGreaterThan(0)
    }
  })

  it.each(cases)('%s declares only visualTypes the player can draw', (_code, gate) => {
    for (const role of ROLE_KEYS) {
      const block = gate.content[role] as Record<string, unknown> | undefined
      const type = block?.visualType
      if (type === undefined) continue
      expect(typeof type, `${role}.visualType must be a string`).toBe('string')
      expect(
        isDedicatedVisualType(type as string),
        `${gate.code}.${role}: visualType "${String(type)}" has no renderer and would degrade to prose`,
      ).toBe(true)
    }
  })

  it.each(cases)('%s has a short canonical answer', (_code, gate) => {
    const single = gate.answer.acceptedAnswer
    const many = gate.answer.acceptedAnswers
    expect(typeof single === 'string' || Array.isArray(many), 'needs an answer').toBe(true)
    const candidates = [single, ...(Array.isArray(many) ? many : [])].filter(
      (v): v is string => typeof v === 'string',
    )
    for (const value of candidates) {
      expect(value.trim().length, `answer "${value}" must not be blank`).toBeGreaterThan(0)
      expect(value.length, `answer "${value}" is a sentence, not a token`).toBeLessThanOrEqual(40)
      expect(value.trim().split(/\s+/).length, `answer "${value}" is too many words`).toBeLessThanOrEqual(4)
    }
  })
})

describe('case content: the answer never reaches a player', () => {
  /**
   * A gate whose `acceptedAnswer` is a non-prose sentinel (###NN###) is a
   * decision gate: its real answers live in `acceptedAnswers` and the case
   * deliberately PRESENTS them, because the player is choosing between named
   * options rather than deducing one. The finale (P37) is the only such gate.
   * Its `acceptedAnswers` are the labels on the console, so they are allowed to
   * appear in the text that asks the question - that is the whole point of the
   * sentinel. Every other gate's answer set is still checked in full.
   */
  const isDecisionGate = (answer: Record<string, unknown>) =>
    typeof answer.acceptedAnswer === 'string' && /^#{2,}\w+#{2,}$/.test(answer.acceptedAnswer.trim())

  /**
   * A gate whose `answer_metadata.presentedEvidence` is true is a
   * presented-evidence gate: its answer IS a record entry the team reads off a
   * register, so the gate is meant to print it. The server honours the same
   * declaration by suppressing redaction for that gate only
   * (2026100614_presented_evidence_redaction.sql). P04, M01 and P21 are the
   * only such gates; every other gate must still hide its answer completely.
   *
   * The exemption is deliberate and narrow: it does not relax the token's
   * `acceptedAnswer`, and a gate that is NOT declared still fails this test the
   * moment its answer appears in its own text.
   */
  const isPresentedEvidence = (answer: Record<string, unknown>) =>
    answer.presentedEvidence === true

  it.each(cases)('%s does not contain its answer in any visible string', (_code, gate) => {
    const decisionGate = isDecisionGate(gate.answer)
    const presented = isPresentedEvidence(gate.answer)
    const answers = [
      ...(decisionGate || presented ? [] : [gate.answer.acceptedAnswer]),
      ...(Array.isArray(gate.answer.acceptedAnswers) && !decisionGate && !presented
        ? gate.answer.acceptedAnswers
        : []),
    ].filter((v): v is string => typeof v === 'string')

    for (const answer of answers) {
      const needle = normalize(answer)
      if (needle.length < 3) continue // the server does not match short answers either
      for (const text of playerStrings(gate)) {
        expect(
          normalize(text).includes(needle),
          `${gate.code}: answer "${answer}" leaks into "${text}"`,
        ).toBe(false)
      }
    }
  })

  it('P37 accepts every disposition its console actually prints', () => {
    const gate = gates.get('P37')
    expect(gate, 'P37 missing').toBeTruthy()
    expect(isDecisionGate(gate!.answer), 'P37 must stay a decision gate').toBe(true)

    const accepted = (gate!.answer.acceptedAnswers as string[]).map(normalize)
    const operator = (gate!.content.operator as Record<string, unknown>).dataPayload as string
    // The console prints its verdicts between the field markers. Every word it
    // shows must be in the servable set, or a team that reads the screen and
    // types what it sees is rejected - which is the exact defect this repairs.
    const shown = operator.match(/\b(ERASE|KEEP|RELEASE|DELETE|RETAIN|SHARE)\b/g) ?? []
    expect(shown.length, 'the console prints no verdicts').toBeGreaterThan(0)
    for (const word of shown) {
      expect(accepted, `${word} is printed on the console but not accepted`).toContain(normalize(word))
    }
    // The console must name at least one word that is directly typeable.
    expect(shown.some(w => accepted.includes(normalize(w))), 'no typeable verdict').toBe(true)
  })

  it('only the three declared gates print their own answer', () => {
    // The presentedEvidence exemption is the one place the redaction rule is
    // intentionally suspended. Pin the exact set so a future edit cannot quietly
    // exempt a deduction gate and hand its answer to the player.
    const presented = [...gates.values()]
      .filter(g => g.answer.presentedEvidence === true)
      .map(g => g.code)
      .sort()
    expect(presented).toEqual(['M01', 'P04', 'P21'])
  })
})

describe('case content: mechanics are preserved', () => {
  it.each(cases)('%s keeps the physical step it was wired to', (_code, gate) => {
    const seedClue = seedGates.get(gate.code)?.metadata.locationClue as Record<string, unknown> | undefined
    const currentClue = gate.metadata.locationClue as Record<string, unknown> | undefined
    expect(currentClue?.nextQrNode, `${gate.code} lost its nextQrNode`).toBe(seedClue?.nextQrNode)
    // The location must be the same step. The rebuild sources are held ASCII-only,
    // so a seed em-dash (U+2014) is written as a hyphen; compare with the dash
    // folded so a typographic substitution cannot read as a moved location.
    const fold = (value: unknown): unknown => (typeof value === 'string' ? value.replace(/[—–]/g, '-') : value)
    expect(fold(currentClue?.nextPhysicalLocation), `${gate.code} lost its nextPhysicalLocation`)
      .toBe(fold(seedClue?.nextPhysicalLocation))
  })

  it.each(cases)('%s keeps its puzzle type', (_code, gate) => {
    const original = seedType(gate.code)
    if (original === null) return // a gate added by the rebuild itself
    expect(gate.metadata.type, `${gate.code} changed type`).toBe(original)
  })

  it.each(cases)('%s keeps the evidence file it unlocks', (_code, gate) => {
    const seedEvidence = seedGates.get(gate.code)?.metadata.evidenceUnlocked as Record<string, unknown> | undefined
    const currentEvidence = gate.metadata.evidenceUnlocked as Record<string, unknown> | undefined
    expect(currentEvidence?.id, `${gate.code} lost its evidence id`).toBe(seedEvidence?.id)
  })
})

describe('case content: the sources are clean', () => {
  it('keeps the shipped-type list in step with the migrations', () => {
    const shipped = new Set<string>()
    for (const gate of gates.values()) {
      for (const role of ROLE_KEYS) {
        const block = gate.content[role] as Record<string, unknown> | undefined
        if (typeof block?.visualType === 'string') shipped.add(block.visualType)
      }
    }
    const declared = new Set<string>(CONTENT_VISUAL_TYPES)
    const undeclared = [...shipped].filter(type => !declared.has(type)).sort()
    expect(
      undeclared,
      `visualType shipped by content but absent from CONTENT_VISUAL_TYPES: ${undeclared.join(', ')}`,
    ).toEqual([])
  })

  it.each([...REBUILD_FILES, ...REPAIR_FILES])('%s is ASCII-only', (name) => {
    const sql = readIfPresent(name)
    if (sql === null) return
    const offenders = [...sql].filter(ch => ch.charCodeAt(0) > 126)
    expect(offenders, `non-ASCII characters in ${name}`).toEqual([])
  })

  it.each([...REBUILD_FILES, ...REPAIR_FILES])('%s contains no destructive or schema-changing SQL', (name) => {
    const sql = readIfPresent(name)
    if (sql === null) return
    const stripped = stripComments(sql)
    // Strip string literals first: a gate's answer or prose may legitimately
    // contain a word like DELETE (the finale's dispositions do), and that is
    // content, not SQL. What must never appear is the STATEMENT.
    const code = stripped.replace(/\$[A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z0-9_]*\$/g, "''")
      .replace(/'(?:[^']|'')*'/g, "''")
    expect(code, `${name} must not drop, truncate or delete`).not.toMatch(/\b(DROP|TRUNCATE|DELETE)\b/i)
    const statements = code.match(/^\s*(?:UPDATE|INSERT|ALTER|CREATE|DELETE|DROP|TRUNCATE|GRANT|REVOKE)\b[^\n;]*/gim) ?? []
    for (const statement of statements) {
      const upper = statement.trim().replace(/\s+/g, ' ').toUpperCase()
      // A repair migration may touch content (UPDATE puzzle_nodes), and it may
      // redefine a server FUNCTION body - 2026100614 teaches
      // get_player_node_detail to honour a gate's presented-evidence
      // declaration, which is a behaviour repair, not a schema change.
      //
      // CREATE OR REPLACE FUNCTION is allowed; every other CREATE (TABLE,
      // POLICY, INDEX, TYPE, EXTENSION) is not. The REVOKE/GRANT that must
      // accompany it are allowed too, because CREATE OR REPLACE does not
      // preserve a function's EXECUTE grants and dropping them would be the
      // real security regression - but they are pinned to that one function so
      // a repair cannot widen privileges anywhere else.
      const isContentUpdate = /^UPDATE PUZZLE_NODES\b/.test(upper)
      const isFunctionBody = /^CREATE OR REPLACE FUNCTION\b/.test(upper)
      const isGrantLockdown =
        /^(?:REVOKE EXECUTE ON FUNCTION|GRANT EXECUTE ON FUNCTION) GET_PLAYER_NODE_DETAIL\(UUID, TEXT\)/.test(upper)
      expect(
        isContentUpdate || isFunctionBody || isGrantLockdown,
        `${name}: unexpected statement: ${upper.slice(0, 80)}`,
      ).toBe(true)
      // No statement may smuggle a schema change in behind an allowed verb.
      expect(upper, `${name}: schema change smuggled into a statement`).not.toMatch(
        /\b(ALTER|DROP|TRUNCATE|DELETE)\b/,
      )
    }
  })
})
