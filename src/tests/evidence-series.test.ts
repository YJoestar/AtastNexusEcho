import { describe, expect, it } from 'vitest'
import { GENERATED_ASSETS, type GeneratedAsset } from '@/lib/evidence/assetLibrary.generated'
import type { CaseArtifact } from '@/features/player/evidence/types'
import { deriveClues } from '@/lib/evidence/clues'
import { chronology, deriveSeries, parseCaptureTime, seriesPosition, sortChronologically, splitSource } from '@/lib/evidence/series'
import { evidenceImportance, importanceFor } from '@/lib/evidence/importance'
import { mediumFacts } from '@/lib/evidence/facts'

function toArtifact(asset: GeneratedAsset): CaseArtifact {
  return {
    id: `evidence:${asset.code}`, code: asset.code, title: asset.title, description: asset.description,
    type: asset.type, source: 'EVIDENCE', location: asset.location, acquiredAt: asset.acquiredAt,
    relationships: asset.relationships,
    content: {
      location: asset.location, device: asset.device, captured_at: asset.capturedAt, acquired_at: asset.acquiredAt,
      integrity: asset.integrity, source: asset.source, duration: asset.duration,
    },
  }
}

const LIBRARY = GENERATED_ASSETS.map(toArtifact)
const byCode = (code: string) => LIBRARY.find(item => item.code === code)!

describe('parseCaptureTime', () => {
  it('reads each spelling at its own precision', () => {
    expect(parseCaptureTime('14 OCT 94 03:12:44')?.precision).toBe('SECOND')
    expect(parseCaptureTime('14 OCT 94 03:12')?.precision).toBe('MINUTE')
    expect(parseCaptureTime('19 OCT 94')?.precision).toBe('DAY')
    expect(parseCaptureTime('MAR 94')?.precision).toBe('MONTH')
    expect(parseCaptureTime('1994')?.precision).toBe('YEAR')
  })
  it('falls back to the day when the time is masked', () => {
    expect(parseCaptureTime('14 OCT 94 03:0_:__')).toEqual(parseCaptureTime('14 OCT 94'))
    expect(parseCaptureTime('14 OCT 94 __:17:__')?.precision).toBe('DAY')
  })
  it('rejects what it cannot read', () => {
    expect(parseCaptureTime(null)).toBeNull()
    expect(parseCaptureTime('UNKNOWN')).toBeNull()
    expect(parseCaptureTime('31 XXX 94')).toBeNull()
    expect(parseCaptureTime('14 OCT 94 25:00:00')?.precision).toBe('DAY')
  })
})

describe('chronology', () => {
  it('orders by when it happened, not when it was recovered', () => {
    const order = sortChronologically(LIBRARY).map(item => item.code)
    expect(order.indexOf('NX-037-B-08')).toBeLessThan(order.indexOf('NX-037-B-06'))
    expect(order.indexOf('NX-CAM-01')).toBeLessThan(order.indexOf('NX-CAM-07'))
  })
  it('is total, stable and keeps every record', () => {
    const forward = sortChronologically(LIBRARY).map(item => item.code)
    const backward = sortChronologically([...LIBRARY].reverse()).map(item => item.code)
    expect(forward).toEqual(backward)
    expect(new Set(forward).size).toBe(LIBRARY.length)
  })
  it('puts undated records last', () => {
    const undated: CaseArtifact = { ...byCode('NX-037-B-01'), code: 'ZZ-UNDATED', id: 'evidence:ZZ-UNDATED', content: {} }
    const entries = chronology([undated, byCode('NX-037-B-01')])
    expect(entries.map(entry => entry.artifact.code)).toEqual(['NX-037-B-01', 'ZZ-UNDATED'])
    expect(entries[1].time).toBeNull()
  })
})

describe('series', () => {
  const series = deriveSeries(LIBRARY)
  it('splits a source from its position suffix', () => {
    expect(splitSource('DVR NODE B-04 / TAPE 7')).toEqual({ base: 'DVR NODE B-04', unit: 'TAPE 7' })
    expect(splitSource('UNASSIGNED FILE / FOUND IN SECTOR C')).toEqual({ base: 'UNASSIGNED FILE', unit: null })
  })
  it('finds the nine DVR tapes as one surveillance series', () => {
    const dvr = series.find(entry => entry.id === 'SURVEILLANCE:DVR NODE B-04')
    expect(dvr?.members).toHaveLength(9)
    expect(dvr?.units['NX-CAM-07']).toBe('TAPE 7')
    expect(dvr?.members[0]).toBe('NX-CAM-01')
  })
  it('never mixes media and never makes a series of one', () => {
    const media = new Map(LIBRARY.map(item => [item.code, item.type]))
    for (const entry of series) {
      expect(entry.members.length).toBeGreaterThanOrEqual(2)
      expect(new Set(entry.members.map(code => media.get(code))).size).toBe(1)
    }
  })
  it('does not group the unassigned personnel file with the personnel file', () => {
    expect(seriesPosition(series, 'NX-037-P-06')).toBeNull()
    expect(seriesPosition(series, 'NX-037-P-01')?.series.source).toBe('PERSONNEL FILE')
  })
  it('ignores inventory and fragment-feed records', () => {
    const inventory: CaseArtifact = { ...byCode('NX-037-B-01'), source: 'INVENTORY', code: 'X1', id: 'inventory:X1' }
    const inventoryTwo: CaseArtifact = { ...inventory, code: 'X2', id: 'inventory:X2' }
    expect(deriveSeries([inventory, inventoryTwo])).toEqual([])
  })
})

describe('importance', () => {
  const clues = deriveClues(LIBRARY)
  const readings = evidenceImportance(LIBRARY, clues)
  it('reads every record', () => expect(readings.size).toBe(66))
  it('matches the thresholds', () => {
    expect(importanceFor(0, 0)).toBe('BACKGROUND')
    expect(importanceFor(1, 0)).toBe('BACKGROUND')
    expect(importanceFor(2, 0)).toBe('SUPPORTING')
    expect(importanceFor(3, 1)).toBe('IMPORTANT')
    expect(importanceFor(4, 0)).toBe('IMPORTANT')
    expect(importanceFor(8, 0)).toBe('CRITICAL')
  })
  it('makes the most-connected records critical', () => {
    expect(readings.get('NX-CAM-07')?.importance).toBe('CRITICAL')
    expect(readings.get('NX-037-B-02')?.importance).toBe('CRITICAL')
    expect(readings.get('NX-037-B-04')?.importance).toBe('BACKGROUND')
  })
  it('counts clues from the same derivation the player sees', () => {
    const total = Array.from(readings.values()).reduce((sum, reading) => sum + reading.clues, 0)
    expect(total).toBe(clues.length * 2)
  })
})

describe('mediumFacts', () => {
  it('reads real fields only', () => {
    expect(mediumFacts(byCode('NX-037-A-01')).map(fact => fact.label)).toEqual(['LENGTH', 'RECORDER', 'RECORDED'])
    expect(mediumFacts(byCode('NX-CAM-07')).find(fact => fact.label === 'SIGNAL')?.value).toBe('FRAME DROPOUT 03:17:05–03:17:18')
  })
  it('omits what the record lacks', () => {
    expect(mediumFacts({ ...byCode('NX-037-B-01'), content: {} })).toEqual([])
  })
})
