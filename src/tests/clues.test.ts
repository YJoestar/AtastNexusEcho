import { describe, expect, it } from 'vitest'
import {
  clueStatus,
  cluesBetween,
  deriveClues,
  describeGap,
  discoverableBy,
  parseEvidenceTime,
} from '@/lib/evidence/clues'
import type { CaseArtifact } from '@/features/player/evidence/types'

function artifact(code: string, extra: Partial<CaseArtifact> = {}): CaseArtifact {
  return {
    id: `evidence:${code}`, code, title: code, description: '', type: 'PHOTOGRAPH', source: 'EVIDENCE',
    content: {}, location: null, acquiredAt: null, ...extra,
  }
}

const A = artifact('A', {
  content: { captured_at: '14 OCT 94 03:12:44' },
  relationships: [
    { to: 'B', kind: 'TEMPORAL', note: 'B covers the same segment two minutes later.' },
    { to: 'C', kind: 'SPATIAL', note: 'Incident record names the corridor.' },
    { to: 'GONE', kind: 'PERSONNEL', note: 'Not recovered yet.' },
  ],
})
const B = artifact('B', {
  content: { captured_at: '14-10-94 03:14:53' },
  relationships: [{ to: 'A', kind: 'TEMPORAL', note: 'B covers the same segment two minutes later.' }],
})
const C = artifact('C', { type: 'DOCUMENT', relationships: [{ to: 'B', kind: 'CONTRADICTION', note: 'The log disagrees.' }] })

describe('clue derivation', () => {
  const clues = deriveClues([A, B, C])

  it('derives one clue per unordered pair and kind, from existing relationships only', () => {
    expect(clues.map(clue => clue.id).sort()).toEqual([
      'clue:A~B:TEMPORAL',
      'clue:A~C:SPATIAL',
      'clue:B~C:CONTRADICTION',
    ])
  })

  it('keeps the case data\'s own note as the meaning, unmodified', () => {
    expect(clues.find(c => c.id === 'clue:A~C:SPATIAL')?.meaning).toBe('Incident record names the corridor.')
  })

  it('yields nothing for a relationship whose far end has not been recovered', () => {
    expect(clues.some(clue => clue.evidence.includes('GONE'))).toBe(false)
  })

  it('maps relationship kinds to categories and escalating difficulty', () => {
    const by = Object.fromEntries(clues.map(clue => [clue.sourceKind, clue]))
    expect(by.SPATIAL).toMatchObject({ category: 'LOCATION', difficulty: 'EASY' })
    expect(by.TEMPORAL).toMatchObject({ category: 'TIMELINE', difficulty: 'HARD' })
    expect(by.CONTRADICTION).toMatchObject({ category: 'CONTRADICTION', difficulty: 'EXPERT' })
  })

  it('needs a timestamp comparison only when both records carry a time', () => {
    const by = Object.fromEntries(clues.map(clue => [clue.sourceKind, clue]))
    expect(by.TEMPORAL.method).toBe('TIMELINE_COMPARISON')
    expect(by.SPATIAL.method).toBe('CROSS_REFERENCE')
    // C has no time, so its contradiction with B is found by plain comparison.
    expect(by.CONTRADICTION.method).toBe('CROSS_REFERENCE')
  })

  it('finds a pair\'s clues in either order, and gates timeline clues behind the timeline', () => {
    expect(cluesBetween(clues, 'B', 'A')).toHaveLength(1)
    expect(discoverableBy(clues, 'A', 'B', 'CROSS_REFERENCE')).toHaveLength(0)
    expect(discoverableBy(clues, 'B', 'A', 'TIMELINE_COMPARISON')).toHaveLength(1)
    expect(discoverableBy(clues, 'A', 'C', 'CROSS_REFERENCE')).toHaveLength(1)
  })

  it('shows nothing for two unrelated records', () => {
    expect(cluesBetween(clues, 'A', 'Z')).toEqual([])
  })
})

describe('timestamps', () => {
  it('reads both spellings the case uses', () => {
    const named = parseEvidenceTime('14 OCT 94 03:12:44')!
    const osd = parseEvidenceTime('14-10-94 03:14:53')!
    expect(osd - named).toBe((2 * 60 + 9) * 1000)
  })
  it('rejects nonsense', () => {
    expect(parseEvidenceTime('later')).toBeNull()
    expect(parseEvidenceTime('14 OCT 94 27:00')).toBeNull()
    expect(parseEvidenceTime(null)).toBeNull()
  })
  it('describes gaps', () => {
    expect(describeGap(0)).toBe('SAME INSTANT')
    expect(describeGap(129_000)).toBe('2 min 09 s')
    expect(describeGap(-3_900_000)).toBe('1 h 05 min')
  })
})

describe('player-facing clue status', () => {
  const [clue] = deriveClues([A, B])
  const id = (code: string) => `evidence:${code}`
  const found = { [clue.id]: { clueId: clue.id, discoveredAt: 'x', via: 'TIMELINE_COMPARISON' as const } }

  it('is UNKNOWN until found', () => {
    expect(clueStatus(clue, {}, [], id)).toBe('UNKNOWN')
  })
  it('is DISCOVERED once found', () => {
    expect(clueStatus(clue, found, [], id)).toBe('DISCOVERED')
  })
  it('becomes CORROBORATED when the player confirmed their own link between the pair', () => {
    const links = [{ from: 'evidence:B', to: 'evidence:A', kind: 'TEMPORAL', status: 'CONFIRMED' }]
    expect(clueStatus(clue, found, links, id)).toBe('CORROBORATED')
  })
  it('reads CONTRADICTED only for contradiction clues', () => {
    const links = [{ from: 'evidence:A', to: 'evidence:B', kind: 'TEMPORAL', status: 'CONTRADICTED' }]
    expect(clueStatus(clue, found, links, id)).toBe('DISCOVERED')
  })
})
