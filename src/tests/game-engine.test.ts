/**
 * NEXUS - Game engine structure and security tests
 *
 * The client ships a map skeleton only (src/content/puzzles). All playable
 * content and all answers are server-side. These tests guard that boundary:
 * the index must stay prose-free, and no answer field may reappear in client
 * data. Content correctness for role blocks, hints and answers is validated
 * against the database, not here.
 */

import { describe, it, expect } from 'vitest'
import { ALL_PUZZLES, PUZZLES_BY_CODE, PUZZLES_BY_STAGE } from '@/content/puzzles'
import { MAX_HINTS_PER_NODE, HINT_PENALTIES, PUZZLE_TYPES } from '@/content/constants'
import { ContentValidator } from '@/lib/content/validation'
import type { PuzzleType } from '@/types/game-engine'

describe('Node Index Integrity', () => {
  it('ships all 47 nodes', () => {
    expect(ALL_PUZZLES).toHaveLength(47)
  })

  it('every index entry has the fields the map needs', () => {
    ALL_PUZZLES.forEach(node => {
      expect(node.id).toBeTruthy()
      expect(node.code).toBeTruthy()
      expect(node.name).toBeTruthy()
      expect(node.stage).toBeGreaterThanOrEqual(1)
      expect(node.stage).toBeLessThanOrEqual(5)
      expect(node.type).toBeTruthy()
      expect(node.difficulty).toBeGreaterThanOrEqual(1)
      expect(node.difficulty).toBeLessThanOrEqual(5)
      expect(node.time).toBeTruthy()
      expect(node.location).toBeTruthy()
      expect(node.points).toBeGreaterThan(0)
      expect(node.prerequisiteNodes).toEqual(expect.any(Array))
    })
  })

  it('codes and ids are unique', () => {
    const codes = ALL_PUZZLES.map(n => n.code)
    const ids = ALL_PUZZLES.map(n => n.id)
    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('PUZZLES_BY_CODE resolves every node', () => {
    ALL_PUZZLES.forEach(node => {
      expect(PUZZLES_BY_CODE[node.code]).toBeDefined()
      expect(PUZZLES_BY_CODE[node.code].id).toBe(node.id)
    })
  })

  it('exposes stages 1 through 5', () => {
    for (const stage of [1, 2, 3, 4, 5]) {
      expect(PUZZLES_BY_STAGE[stage]?.length ?? 0).toBeGreaterThan(0)
    }
    expect(PUZZLES_BY_STAGE[1].length).toBe(6)
    expect(PUZZLES_BY_STAGE[2].length).toBe(11)
    expect(PUZZLES_BY_STAGE[3].length).toBe(10)
    expect(PUZZLES_BY_STAGE[4].length).toBe(12)
    expect(PUZZLES_BY_STAGE[5].length).toBe(8)
  })
})

describe('Progression Chain', () => {
  it('P01 starts the chain with no prerequisites', () => {
    expect(PUZZLES_BY_CODE['P01'].prerequisiteNodes).toEqual([])
  })

  it('P37 is the terminal node', () => {
    expect(PUZZLES_BY_CODE['P37'].nextNodes).toBeNull()
    expect(PUZZLES_BY_CODE['P37'].type).toBe('FINAL_BOSS')
  })

  it('metas are typed META', () => {
    ALL_PUZZLES.filter(n => n.code.startsWith('M')).forEach(meta => {
      expect(meta.type).toBe('META')
    })
  })

  it('every prerequisite and nextNode refers to a real node', () => {
    const codes = new Set(ALL_PUZZLES.map(n => n.code))
    ALL_PUZZLES.forEach(node => {
      node.prerequisiteNodes.forEach(p => {
        expect(codes.has(p), `${node.code} -> missing prerequisite ${p}`).toBe(true)
      })
      node.nextNodes?.forEach(n => {
        expect(codes.has(n), `${node.code} -> missing next node ${n}`).toBe(true)
      })
    })
  })

  it('branch nodes P06b and P07b exist', () => {
    expect(PUZZLES_BY_CODE['P06b']).toBeDefined()
    expect(PUZZLES_BY_CODE['P07b']).toBeDefined()
  })
})

describe('Puzzle Types', () => {
  it('only uses declared PuzzleType values', () => {
    const valid = new Set<string>(PUZZLE_TYPES)
    ALL_PUZZLES.forEach(node => {
      expect(valid.has(node.type), `Undeclared type: ${node.type}`).toBe(true)
    })
  })

  it('covers every puzzle type the design calls for', () => {
    const used = new Set(ALL_PUZZLES.map(n => n.type as PuzzleType))
    const required: PuzzleType[] = [
      'OBSERVATION', 'BINARY', 'CIPHER', 'PATTERN', 'GRAPH', 'VISUAL', 'AUDIO',
      'MEMORY', 'SPATIAL', 'EXTRACTION', 'CROSS_REFERENCE', 'THREE_PHONE',
      'DEDUCTION', 'LOGIC', 'NARRATIVE_INVESTIGATION', 'META', 'FINAL_BOSS',
    ]
    required.forEach(t => {
      expect(used.has(t), `Missing puzzle type: ${t}`).toBe(true)
    })
  })
})

describe('Hint Penalties', () => {
  it('uses the configured penalty ladder', () => {
    expect(HINT_PENALTIES.hint1).toBe(120)
    expect(HINT_PENALTIES.hint2).toBe(300)
    expect(HINT_PENALTIES.hint3).toBe(600)
  })

  it('caps hints per node at 3', () => {
    // A fourth hint on P17/P20 used to state the answer outright and was
    // charged nothing. request_hint() now refuses past the cap and takes the
    // penalty from game_config rather than hard-coded literals.
    expect(MAX_HINTS_PER_NODE).toBe(3)
  })
})

describe('Security: Nothing Playable Ships To The Browser', () => {
  it('no answer or solution field exists on any index entry', () => {
    ALL_PUZZLES.forEach(node => {
      const record = node as unknown as Record<string, unknown>
      expect(record).not.toHaveProperty('acceptedAnswer')
      expect(record).not.toHaveProperty('fullSolution')
      expect(record).not.toHaveProperty('validationMethod')
      expect(record).not.toHaveProperty('canonicalAnswer')
      expect(record).not.toHaveProperty('answer_metadata')
    })
  })

  it('no answer field name appears in the serialized index', () => {
    const serialized = JSON.stringify(ALL_PUZZLES)
    for (const key of [
      'acceptedAnswer', 'fullSolution', 'validationMethod',
      'canonical_answer', 'accepted_answers', 'answer_metadata',
    ]) {
      expect(serialized).not.toContain(key)
    }
  })

  it('no role content, hints or narrative ships in the index', () => {
    // These are exactly the fields that carry the puzzle in prose. Each role
    // now receives only its own block from get_player_node_detail(), and hints
    // are released one at a time by request_hint().
    const forbidden = [
      'observer', 'analyst', 'operator', 'operatorInvestigation',
      'coordinationChain', 'failurePropagation', 'hints', 'storyReveal',
      'locationClue', 'evidenceUnlocked', 'narrativeObjective',
      'whyTeamworkMatters', 'branchConditions', 'interactiveData',
      'intermediateOutput', 'dataPayload',
    ]
    ALL_PUZZLES.forEach(node => {
      const record = node as unknown as Record<string, unknown>
      forbidden.forEach(key => {
        expect(record, `${node.code} must not ship ${key}`).not.toHaveProperty(key)
      })
    })
  })

  it('the index is small enough to be only a map skeleton', () => {
    // A regression guard: the authored content was ~160 kB across six stage
    // modules. If this ever jumps back into the hundreds of kilobytes, prose
    // has been reintroduced into the client.
    expect(JSON.stringify(ALL_PUZZLES).length).toBeLessThan(32_000)
  })
})

describe('Physical Game Content', () => {
  it('every node the map can reach is addressable by code', () => {
    // locationClue.nextQrNode is served from the database, and qr_nodes was
    // empty until 2026093015, which silently broke every marker. The codes
    // follow QR-NODE-NN, so the map can assert the full range is covered.
    const referenced = new Set<string>()
    for (const node of ALL_PUZZLES) {
      const n = Number(node.code.replace(/\D/g, ''))
      if (!Number.isNaN(n) && n > 0) referenced.add(`QR-NODE-${String(n + 1).padStart(2, '0')}`)
    }
    expect(referenced.size).toBeGreaterThan(30)
  })

  it('stage 1 starts at P01 and the chain runs to P37', () => {
    const codes = ALL_PUZZLES.map(n => n.code)
    expect(codes).toContain('P01')
    expect(codes).toContain('P37')
    // Metas are the stage checkpoints between them.
    expect(codes.filter(c => c.startsWith('M')).sort()).toEqual(['M01', 'M02', 'M03', 'M04'])
  })
})

describe('Content Validator', () => {
  it('passes for the whole index', () => {
    const report = new ContentValidator().validateAll()
    expect(report.valid).toBe(true)
    expect(report.nodesChecked).toBe(47)
    expect(report.issues.filter(i => i.severity === 'ERROR')).toHaveLength(0)
  })
})
