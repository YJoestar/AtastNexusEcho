import { describe, it, expect } from 'vitest'
import { buildCaseLead, readsAsWaypoint, assertNoDestination } from '@/lib/investigation/lead'
import {
  validateGameIntegrity,
  blockersOf,
  type IntegrityNode,
  type IntegrityMarker,
} from '@/lib/integrity/validate'

/**
 * Minimal PlayerNodeView shaped input. Only the fields the lead reads are
 * provided, so a change to the derivation that starts depending on something
 * else shows up as a type error rather than as silent behaviour change.
 */
function nodeView(over: Record<string, unknown> = {}) {
  return {
    code: 'P12',
    title: 'The Stairwell Register',
    stage: 3,
    narrativeObjective: 'The door log says nobody entered. The camera says someone did.',
    locationClue: {
      format: 'CLUE',
      clueText: 'The same four digits appear in two records that should never have existed together.',
      solution: 'the north stairwell',
      nextPhysicalLocation: '[NEXUS CORE] — North Stairwell',
      nextQrNode: 'P13',
      explanation: '…',
    },
    ...over,
  } as never
}

describe('the current lead reasons instead of pointing', () => {
  it('uses the authored, role-scoped objective', () => {
    const lead = buildCaseLead(nodeView({ isCurrent: true, isNextUp: true, isSolved: false, unlocked: true }))
    expect(lead?.objective).toBe('The door log says nobody entered. The camera says someone did.')
    expect(lead?.nodeCode).toBe('P12')
    expect(lead?.eyebrow).toBe('LEAD · STAGE 3')
  })

  it('surfaces the clue the team should reason over', () => {
    expect(buildCaseLead(nodeView())?.clue).toContain('four digits')
  })

  it('never carries the destination the team is meant to infer', () => {
    const lead = buildCaseLead(nodeView())
    expect(lead).not.toBeNull()
    // The regression: the case home rendered the node's location string under a
    // MapPin, which made the game a waypoint list and removed the moment where
    // the team works out where to go.
    expect(assertNoDestination(lead!)).toEqual([])
    const serialised = JSON.stringify(lead)
    expect(serialised).not.toContain('North Stairwell')
    expect(serialised).not.toContain('nextQrNode')
    expect(serialised).not.toContain('nextPhysicalLocation')
    expect(serialised).not.toContain('solution')
  })

  it('has no lead when there is no current node', () => {
    expect(buildCaseLead(null)).toBeNull()
    expect(buildCaseLead(undefined)).toBeNull()
  })

  it('flags a degraded lead rather than dressing a placeholder as briefing', () => {
    const lead = buildCaseLead(nodeView({ narrativeObjective: '   ', isCurrent: true }))
    expect(lead?.degraded).toBe(true)
    expect(lead?.eyebrow).toContain('UNBRIEFED')
    expect(lead?.objective).toBe('The Stairwell Register')
  })

  it('tolerates a missing location clue', () => {
    expect(buildCaseLead(nodeView({ locationClue: null }))?.clue).toBeNull()
  })
})

describe('waypoint detection flags authored quest markers', () => {
  it('catches imperative navigation in authored objectives', () => {
    for (const text of [
      'Go to the library.',
      'Head down to room 214.',
      'Proceed to the archive.',
      'Walk toward the north stairwell.',
    ]) {
      expect(readsAsWaypoint(text), text).toBe(true)
    }
  })

  it('allows a lead that mentions a place as an observation', () => {
    // Naming a location while describing evidence is legitimate and is often how
    // the team infers where to go. Only instructions to travel are waypoints.
    for (const text of [
      'The north stairwell log records an entry at 04:17.',
      'Compare the two timestamps.',
      'Something in the archive references a room that should be empty.',
      '',
    ]) {
      expect(readsAsWaypoint(text), text || '(empty)').toBe(false)
    }
  })
})

describe('game integrity validation', () => {
  const goodNodes: IntegrityNode[] = [
    { id: 'n1', code: 'P01', unlocks: 'P02' },
    { id: 'n2', code: 'P02', unlocks: 'P03' },
    { id: 'n3', code: 'P03', type: 'FINAL_BOSS' },
  ]
  const goodMarkers: IntegrityMarker[] = [
    { id: 'q1', code: 'QR-01', markerId: 'NX-1', manualCode: '1-A', puzzleNodeId: 'n1' },
    { id: 'q2', code: 'QR-02', markerId: 'NX-2', manualCode: '1-B', puzzleNodeId: 'n2' },
    { id: 'q3', code: 'QR-03', markerId: 'NX-3', manualCode: '1-C', puzzleNodeId: 'n3' },
  ]

  it('passes a coherent graph', () => {
    const report = validateGameIntegrity(goodNodes, goodMarkers)
    expect(blockersOf(report)).toEqual([])
    expect(report.playable).toBe(true)
    expect(report.counts.assignedMarkers).toBe(3)
    expect(report.counts.nodesWithMarkers).toBe(3)
  })

  it('catches a printed marker that unlocks nothing', () => {
    const report = validateGameIntegrity(goodNodes, [
      ...goodMarkers,
      { id: 'q4', code: 'QR-04', markerId: 'NX-4', manualCode: '1-D' },
    ])
    const blockers = blockersOf(report)
    expect(blockers.map(b => b.code)).toContain('MARKER_UNASSIGNED')
    expect(report.playable).toBe(false)
    expect(report.counts.unassignedMarkers).toBe(1)
  })

  it('catches a marker pointing at a node that does not exist', () => {
    const report = validateGameIntegrity(goodNodes, [
      ...goodMarkers,
      { id: 'q5', code: 'QR-05', markerId: 'NX-5', manualCode: '1-E', puzzleNodeId: 'gone' },
    ])
    expect(blockersOf(report).map(b => b.code)).toContain('MARKER_ORPHANED')
  })

  it('catches a puzzle that dead-ends mid-run', () => {
    const report = validateGameIntegrity(
      [{ id: 'n1', code: 'P01', unlocks: 'P02' }, { id: 'n2', code: 'P02' }],
      [{ id: 'q1', code: 'QR-01', markerId: 'NX-1', manualCode: '1-A', puzzleNodeId: 'n1' }],
    )
    expect(blockersOf(report).map(b => b.code)).toContain('NODE_DEAD_END')
  })

  it('catches an unlock pointing at a puzzle that does not exist', () => {
    const report = validateGameIntegrity(
      [{ id: 'n1', code: 'P01', unlocks: 'P99' }],
      [{ id: 'q1', code: 'QR-01', markerId: 'NX-1', manualCode: '1-A', puzzleNodeId: 'n1' }],
    )
    expect(blockersOf(report).map(b => b.code)).toContain('UNLOCK_TARGET_MISSING')
  })

  it('does not require a finale to unlock anything', () => {
    const report = validateGameIntegrity(
      [{ id: 'n3', code: 'P03', type: 'FINAL_BOSS' }],
      [{ id: 'q3', code: 'QR-03', markerId: 'NX-3', manualCode: '1-C', puzzleNodeId: 'n3' }],
    )
    expect(blockersOf(report).map(b => b.code)).not.toContain('NODE_DEAD_END')
  })

  it('treats isFinale as equivalent to the FINAL_BOSS type', () => {
    const report = validateGameIntegrity(
      [{ id: 'n3', code: 'P03', isFinale: true }],
      [{ id: 'q3', code: 'QR-03', markerId: 'NX-3', manualCode: '1-C', puzzleNodeId: 'n3' }],
    )
    expect(blockersOf(report).map(b => b.code)).not.toContain('NODE_DEAD_END')
  })

  it('catches duplicate marker codes, ids and manual codes', () => {
    const report = validateGameIntegrity(goodNodes, [
      { id: 'q1', code: 'QR-01', markerId: 'NX-1', manualCode: '1-A', puzzleNodeId: 'n1' },
      { id: 'q2', code: 'QR-01', markerId: 'NX-1', manualCode: '1-A', puzzleNodeId: 'n2' },
    ])
    const codes = blockersOf(report).map(b => b.code)
    expect(codes).toContain('DUPLICATE_MARKER_CODE')
    expect(codes).toContain('DUPLICATE_MARKER_ID')
    expect(codes).toContain('DUPLICATE_MANUAL_CODE')
  })

  it('catches duplicate puzzle node codes', () => {
    const report = validateGameIntegrity(
      [
        { id: 'n1', code: 'P01', unlocks: 'P02' },
        { id: 'n2', code: 'P01' },
      ],
      [{ id: 'q1', code: 'QR-01', markerId: 'NX-1', manualCode: '1-A', puzzleNodeId: 'n1' }],
    )
    expect(blockersOf(report).map(b => b.code)).toContain('DUPLICATE_NODE_CODE')
  })

  it('warns when a puzzle has no marker but never blocks on it', () => {
    // Reachable-by-unlock is a legitimate design; the operator should confirm it.
    const report = validateGameIntegrity(
      [
        { id: 'n1', code: 'P01', unlocks: 'P02' },
        { id: 'n2', code: 'P02', type: 'FINAL_BOSS' },
      ],
      [{ id: 'q1', code: 'QR-01', markerId: 'NX-1', manualCode: '1-A', puzzleNodeId: 'n1' }],
    )
    expect(report.warnings).toBeGreaterThan(0)
    expect(report.playable).toBe(true)
  })

  it('reports opening nodes as unreachable-by-unlock without calling them broken', () => {
    const report = validateGameIntegrity(goodNodes, goodMarkers)
    const unreachable = report.issues.filter(i => i.code === 'NODE_UNREACHABLE')
    expect(unreachable.every(i => i.severity === 'INFO')).toBe(true)
    expect(unreachable.map(i => i.ref)).toContain('P01')
  })

  it('always ends with a summary an operator can read at a glance', () => {
    const report = validateGameIntegrity(goodNodes, goodMarkers)
    const summary = report.issues.find(i => i.code === 'SUMMARY')
    expect(summary?.message).toContain('3 puzzles')
    expect(summary?.message).toContain('3 markers')
  })

  it('handles an empty deployment without throwing', () => {
    const report = validateGameIntegrity([], [])
    expect(report.playable).toBe(true)
    expect(report.counts.nodes).toBe(0)
  })
})
