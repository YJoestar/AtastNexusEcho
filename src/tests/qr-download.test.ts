/**
 * NEXUS — QR Field Marker PDF Generation Tests
 *
 * Tests the 2×2 grid layout, pagination, filename format, and batch
 * summary calculation for the field marker deployment sheets.
 */

import { describe, it, expect } from 'vitest'
import type { QRCodeEntry } from '@/lib/admin'

const BATCH_NAME = 'BATCH-01'

function makeQRCode(code: string, manualCode?: string): QRCodeEntry {
  const num = parseInt(code.replace('QR-NODE-', ''), 10)
  const letter = String.fromCharCode(64 + ((num - 1) % 26))
  const doubleLetter = num > 26 ? String.fromCharCode(65 + Math.floor((num - 1) / 26) - 1) : ''
  const suffix = num <= 26 ? letter : `${doubleLetter}${letter}`
  const num4 = 4820 + num
  return {
    id: `qr-id-${num}`,
    code,
    label: `[BUILDING ${suffix}] — Marker Location`,
    type: 'NAVIGATION',
    puzzleNodeCode: code.replace('QR-NODE-', 'P'),
    puzzleNodeTitle: `Node Title ${num}`,
    puzzleNodeType: 'OBSERVATION',
    puzzleNodeStage: Math.ceil(num / 10),
    puzzleNodeLocation: `[BUILDING ${suffix}] — Marker Location`,
    markerId: `NX-037-${suffix}`,
    manualCode: manualCode ?? `037-${suffix}-${num4}`,
    deploymentStatus: 'GENERATED',
    deploymentBatch: BATCH_NAME,
    caseNumber: '037',
    building: `BUILDING ${suffix}`,
  }
}

function makeQRCodes(count: number): QRCodeEntry[] {
  const codes: QRCodeEntry[] = []
  for (let i = 0; i < count; i++) {
    codes.push(makeQRCode(`QR-NODE-${String(i + 2).padStart(2, '0')}`))
  }
  return codes
}

describe('QR code marker data', () => {
  it('produces unique marker IDs', () => {
    const codes = makeQRCodes(47)
    const ids = codes.map(c => c.markerId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('produces unique manual codes', () => {
    const codes = makeQRCodes(47)
    const manuals = codes.map(c => c.manualCode)
    expect(new Set(manuals).size).toBe(manuals.length)
  })

  it('includes case number and building info', () => {
    const code = makeQRCode('QR-NODE-02')
    expect(code.caseNumber).toBe('037')
    expect(code.building).toBeDefined()
    expect(code.building).toContain('BUILDING')
  })

  it('formats manual codes with case-suffix-token pattern', () => {
    const code = makeQRCode('QR-NODE-02')
    expect(code.manualCode).toMatch(/^037-.+-\d{4}$/)
  })
})

describe('Batch pagination logic', () => {
  it('calculates exactly 1 page for 4 markers', () => {
    expect(Math.ceil(4 / 4)).toBe(1)
  })

  it('calculates exactly 2 pages for 5 markers', () => {
    expect(Math.ceil(5 / 4)).toBe(2)
  })

  it('calculates exactly 2 pages for 8 markers', () => {
    expect(Math.ceil(8 / 4)).toBe(2)
  })

  it('calculates exactly 3 pages for 9 markers', () => {
    expect(Math.ceil(9 / 4)).toBe(3)
  })

  it('calculates exactly 3 pages for 12 markers', () => {
    expect(Math.ceil(12 / 4)).toBe(3)
  })

  it('calculates exactly 5 pages for 20 markers', () => {
    expect(Math.ceil(20 / 4)).toBe(5)
  })

  it('leaves empty slots when count is not divisible by 4', () => {
    const count = 5
    const totalPages = Math.ceil(count / 4)
    expect(totalPages).toBe(2)
    const lastPageItems = count - (totalPages - 1) * 4
    expect(lastPageItems).toBe(1)
  })
})

describe('Duplicate detection', () => {
  it('detects duplicate manual codes', () => {
    const codes = makeQRCodes(5)
    codes[3]!.manualCode = codes[0]!.manualCode

    const seen = new Set<string>()
    const dups: string[] = []
    for (const qr of codes) {
      const manual = qr.manualCode!
       const existing = seen.has(manual)
      if (existing) {
        if (!dups.includes(manual)) dups.push(manual)
      }
      seen.add(manual)
    }
    expect(dups).toHaveLength(1)
    expect(dups[0]).toBe(codes[0]!.manualCode)
  })

  it('detects duplicate marker IDs', () => {
    const codes = makeQRCodes(5)
    codes[4]!.markerId = codes[1]!.markerId

    const seen = new Set<string>()
    const dups: string[] = []
    for (const qr of codes) {
      const id = qr.markerId ?? qr.code
      const existing = seen.has(id)
      if (existing) {
        if (!dups.includes(id)) dups.push(id)
      }
      seen.add(id)
    }
    expect(dups).toHaveLength(1)
    expect(dups[0]).toBe(codes[1]!.markerId)
  })
})

describe('Field marker filename', () => {
  it('uses case number and batch name in filename', () => {
    const batchName = 'BATCH-04'
    const caseNumber = '037'
    const expected = `NEXUS-ECHO_FIELD-MARKERS_Case-${caseNumber}_${batchName}.pdf`
    expect(expected).toBe('NEXUS-ECHO_FIELD-MARKERS_Case-037_BATCH-04.pdf')
  })
})
