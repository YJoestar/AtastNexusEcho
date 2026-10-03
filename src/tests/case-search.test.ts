import { describe, it, expect } from 'vitest'
import { searchArtifacts, traceTerms, tokenize } from '@/lib/evidence/search'
import type { CaseArtifact } from '@/features/player/evidence/types'

const make = (over: Partial<CaseArtifact>): CaseArtifact => ({
  id: over.code ?? 'x', code: 'X-01', title: 'Untitled', description: '', type: 'DOCUMENT',
  source: 'EVIDENCE', content: {}, location: null, acquiredAt: null, ...over,
})

const photo = make({ code: 'B-01', title: 'East Corridor', type: 'PHOTOGRAPH', location: 'LOC-C214', content: { camera_id: 'FIELD-CAM-02', image_url: 'https://x/y.jpg' } })
const memo = make({ code: 'D-01', title: 'Maintenance memo', description: 'Ref station 04 relay', content: { body: 'Relay at Station 04 reset at 03:17' } })
const cctv = make({ code: 'CAM-02', title: 'Frame', type: 'SURVEILLANCE', location: 'LOC-C214', relationships: [{ to: 'B-01', kind: 'SPATIAL', note: 'covers the same corridor' }] })

describe('searchArtifacts', () => {
  it('returns nothing for an empty query', () => {
    expect(searchArtifacts([photo, memo], '   ')).toEqual([])
  })

  it('finds a term in content and says where', () => {
    const hits = searchArtifacts([photo, memo, cctv], 'station 04')
    expect(hits.map(h => h.artifact.code)).toEqual(['D-01'])
    expect(hits[0].matches[0].snippet.toLowerCase()).toContain('station 04')
  })

  it('requires every word, which may sit in different fields', () => {
    expect(searchArtifacts([memo], 'maintenance relay').length).toBe(1)
    expect(searchArtifacts([memo], 'maintenance corridor').length).toBe(0)
  })

  it('links records that share a place', () => {
    const codes = searchArtifacts([photo, memo, cctv], 'LOC-C214').map(h => h.artifact.code)
    expect(codes.sort()).toEqual(['B-01', 'CAM-02'])
  })

  it('ranks a title hit above a content hit', () => {
    const a = make({ code: 'A', title: 'Relay', content: {} })
    const b = make({ code: 'B', title: 'Other', content: { n: 'relay' } })
    expect(searchArtifacts([b, a], 'relay')[0].artifact.code).toBe('A')
  })

  it('never searches media URLs', () => {
    expect(searchArtifacts([photo], 'y.jpg')).toEqual([])
  })

  it('searches the investigator\'s own notes and relationship notes', () => {
    expect(searchArtifacts([photo], 'suspicious', () => ['Suspicious shadow by door'])[0].matches[0].field).toBe('YOUR NOTE')
    expect(searchArtifacts([cctv], 'same corridor')[0].matches[0].field).toBe('LINKED RECORD')
  })

  it('tokenizes on whitespace, lowercased', () => {
    expect(tokenize('  Station   04 ')).toEqual(['station', '04'])
  })
})

describe('traceTerms', () => {
  it('offers places and devices, not media URLs, deduplicated', () => {
    expect(traceTerms(photo)).toEqual(['LOC-C214', 'FIELD-CAM-02'])
    expect(traceTerms(make({ location: 'loc-c214', content: { location: 'LOC-C214' } }))).toEqual(['loc-c214'])
    expect(traceTerms(make({ location: 'LOC-C214 / EAST CORRIDOR' }))).toEqual(['LOC-C214', 'EAST CORRIDOR'])
  })

  it('skips long prose and short noise', () => {
    expect(traceTerms(make({ content: { name: 'x', subject: 'a'.repeat(60) } }))).toEqual([])
  })
})
