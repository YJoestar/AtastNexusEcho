import { describe, expect, it } from 'vitest'
import { queryArchive, type QueryData } from '@/features/admin/workstation/query'

const DATA: QueryData = {
  teams: [
    { id: 't1', code: 'ALPHA1', name: 'Alpha Unit', status: 'ACTIVE', playerCount: 3 },
    { id: 't2', code: 'BRAVO2', name: 'Archive Runners', status: 'PAUSED', playerCount: 2 },
  ] as never,
  locations: [{ id: 'l1', nodeCode: 'P05', name: 'Central Archive', nodeTitle: 'Stacks', status: 'ACTIVE' }] as never,
  evidence: [
    { id: 'e1', code: 'NX-037-B-03', title: 'Central Archive, Aisle 2', description: 'shelving', type: 'PHOTOGRAPH', condition: 'NORMAL', classification: 'C', content: {}, metadata: {} },
    { id: 'e2', code: 'NX-037-D-01', title: 'Incident Record', description: 'archive copy', type: 'DOCUMENT', classification: 'C', content: {}, metadata: {} },
  ] as never,
}

describe('QUERY ARCHIVE', () => {
  it('lists every module for an empty query and nothing else', () => {
    const results = queryArchive('', 'ALL', DATA)
    expect(results.every(result => result.kind === 'MODULE')).toBe(true)
    expect(results.length).toBe(12)
  })

  it('finds records across kinds and ranks exact over prefix over contains', () => {
    const results = queryArchive('archive', 'ALL', DATA)
    const kinds = new Set(results.map(result => result.kind))
    for (const kind of ['UNIT', 'LOCATION', 'EVIDENCE', 'MODULE']) expect(kinds.has(kind as never)).toBe(true)
    expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score)
    expect(queryArchive('alpha1', 'ALL', DATA)[0]).toMatchObject({ kind: 'UNIT', code: 'ALPHA1', score: 3 })
  })

  it('filters by kind', () => {
    expect(queryArchive('archive', 'LOCATION', DATA).map(result => result.kind)).toEqual(['LOCATION'])
    expect(queryArchive('archive', 'EVIDENCE', DATA)).toHaveLength(2)
  })

  it('points each result at the module that owns it, with a dossier path for a unit', () => {
    const [unit] = queryArchive('alpha', 'UNIT', DATA)
    expect(unit.target).toEqual({ kind: 'UNIT', app: 'FIELD_UNITS', path: '/admin/teams/t1' })
    const [item] = queryArchive('nx-037-b-03', 'EVIDENCE', DATA)
    expect(item.target.app).toBe('EVIDENCE')
  })

  it('matches module purposes, and returns nothing for a nonsense query', () => {
    expect(queryArchive('credentials', 'MODULE', DATA).some(result => result.code === 'M-02')).toBe(true)
    expect(queryArchive('zzzzqq', 'ALL', DATA)).toEqual([])
  })
})
