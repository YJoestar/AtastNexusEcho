/**
 * NEXUS — Canonical QR Pipeline Tests
 *
 * Tests the unified validation pipeline that resolves QR payloads, manual codes,
 * legacy codes, and test codes to canonical ScanLocation records.
 */

import { describe, it, expect } from 'vitest'
import {
  SCAN_LOCATIONS,
  SCAN_LOCATIONS_BY_ID,
  SCAN_LOCATIONS_BY_NODE,
  SCAN_LOCATION_COUNT,
  TEST_CODE,
  TEST_LOCATION_ID,
} from '@/lib/qr/locations'
import {
  parseQRPayload,
  resolvePayload,
  isTestCode,
  resolveTestCode,
} from '@/lib/qr/payload'
import {
  generateManualCode,
  parseManualCode,
  normalizeManualCode,
  resolveManualCode,
  resolveCodeInput,
  MANUAL_CODE_PATTERN,
  MANUAL_CODE_ALPHABET,
} from '@/lib/qr/manualCode'
import {
  validateAnyCode,
  validateQRCode,
  validateManualCode,
  toQRScanResult,
} from '@/lib/qr/validation'

describe('QR Location Registry', () => {
  it('registers all 47 puzzle nodes plus the test location', () => {
    expect(SCAN_LOCATIONS).toHaveLength(48)
    expect(SCAN_LOCATION_COUNT).toBe(48)
  })

  it('maps P01 to LOC-P01', () => {
    const loc = SCAN_LOCATIONS_BY_NODE['P01']
    expect(loc).toBeDefined()
    expect(loc.locationId).toBe('LOC-P01')
    expect(loc.scanNodeId).toBe('P01')
    expect(loc.nodeName).toBe('The Facade')
  })

  it('maps P37 (final boss) to the last puzzle location', () => {
    const loc = SCAN_LOCATIONS_BY_NODE['P37']
    expect(loc).toBeDefined()
    expect(loc.scanNodeId).toBe('P37')
    expect(loc.nodeType).toBe('FINAL_BOSS')
  })

  it('location IDs are unique and derived from the puzzle code, not an ordinal', () => {
    // This replaced a test that asserted the IDs were "unique and sequential".
    // Numbering markers by array position meant inserting or reordering one
    // puzzle silently renumbered every later marker and invalidated every printed
    // QR sheet. Identity now comes from the puzzle code, so the invariants that
    // matter are uniqueness and code-derivation — not a sequence.
    const ids = SCAN_LOCATIONS.map(l => l.locationId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(TEST_LOCATION_ID)

    for (const loc of SCAN_LOCATIONS) {
      if (loc.resultType === 'TEST') continue
      expect(loc.locationId).toBe(`LOC-${loc.scanNodeId}`)
    }
  })

  it('marker identity survives a change to the order or size of the game', () => {
    // The regression that motivated the scheme change: reorder the puzzle list and
    // every marker's payload must be byte-identical, because the payload is a
    // function of the puzzle code alone. Keyed by locationId, not scanNodeId —
    // the test entry deliberately shares scanNodeId 'P01' with the first puzzle.
    const byId = new Map(SCAN_LOCATIONS.map(l => [l.locationId, l.qrPayload]))
    for (const loc of [...SCAN_LOCATIONS].reverse()) {
      expect(loc.qrPayload).toBe(byId.get(loc.locationId))
    }
  })

  it('all QR payloads are unique', () => {
    const payloads = SCAN_LOCATIONS.map(l => l.qrPayload)
    expect(new Set(payloads).size).toBe(payloads.length)
  })

  it('all manual codes are unique', () => {
    const codes = SCAN_LOCATIONS.map(l => l.manualCode)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('test location uses TEST_CODE as manual code', () => {
    const testLoc = SCAN_LOCATIONS_BY_ID['LOC-TEST']
    expect(testLoc).toBeDefined()
    expect(testLoc.manualCode).toBe(TEST_CODE)
    expect(testLoc.resultType).toBe('TEST')
  })
})

describe('QR Payload Parsing', () => {
  const testLoc = SCAN_LOCATIONS_BY_ID['LOC-P01']

  it('parses a valid QR payload', () => {
    const result = parseQRPayload(testLoc.qrPayload)
    expect(result.valid).toBe(true)
    expect(result.version).toBe('V1')
    expect(result.locationId).toBe('LOC-P01')
    expect(result.token).toBe(testLoc.qrPayload.split('|')[3])
    expect(result.error).toBeNull()
  })

  it('resolves a valid payload to its ScanLocation', () => {
    const payload = parseQRPayload(testLoc.qrPayload)
    const loc = resolvePayload(payload)
    expect(loc).toBeDefined()
    expect(loc?.locationId).toBe('LOC-P01')
    expect(loc?.scanNodeId).toBe('P01')
  })

  it('rejects empty payload', () => {
    const result = parseQRPayload('')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Empty')
  })

  it('rejects wrong prefix', () => {
    const result = parseQRPayload('BAD|V1|LOC-P01|TOKEN123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid prefix')
  })

  it('rejects wrong version', () => {
    const result = parseQRPayload('NX|V2|LOC-P01|TOKEN123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported version')
  })

  it('rejects unknown location ID', () => {
    const result = parseQRPayload('NX|V1|LOC-999|TOKEN123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unknown location')
  })

  it('rejects wrong token length', () => {
    const result = parseQRPayload('NX|V1|LOC-P01|AB')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid token')
  })

  it('rejects too few parts', () => {
    const result = parseQRPayload('NX|V1|LOC-P01')
    expect(result.valid).toBe(false)
  })

  it('isTestCode detects test codes', () => {
    expect(isTestCode(TEST_CODE)).toBe(true)
    expect(isTestCode('NX-V1-LOC-P01-TOKEN')).toBe(false)
    expect(isTestCode('')).toBe(false)
  })

  it('resolveTestCode returns LOC-TEST', () => {
    const loc = resolveTestCode()
    expect(loc).toBeDefined()
    expect(loc?.locationId).toBe('LOC-TEST')
  })
})

describe('Manual Code Generation', () => {
  it('generates consistent codes for the same location', () => {
    const code1 = generateManualCode('LOC-P01')
    const code2 = generateManualCode('LOC-P01')
    expect(code1).toBe(code2)
  })

  it('generates codes matching the pattern', () => {
    for (const loc of SCAN_LOCATIONS) {
      if (loc.resultType === 'TEST') continue
      expect(loc.manualCode).toMatch(MANUAL_CODE_PATTERN)
    }
  })

  it('excludes ambiguity-prone characters from the alphabet', () => {
    const forbidden = new Set(['I', 'O', '0', '1'])
    for (const char of MANUAL_CODE_ALPHABET) {
      expect(forbidden.has(char)).toBe(false)
    }
  })

  it('parses a valid manual code', () => {
    const loc = SCAN_LOCATIONS_BY_ID['LOC-P01']
    const parsed = parseManualCode(loc.manualCode)
    expect(parsed).not.toBeNull()
    expect(parsed?.locationId).toBe('LOC-P01')
    expect(parsed?.token).toBe(loc.manualCode.split('-').pop())
  })

  it('normalizes legacy puzzle codes to canonical manual codes', () => {
    const loc = SCAN_LOCATIONS_BY_NODE['P01']
    expect(loc).toBeDefined()

    const normalized = normalizeManualCode('P01')
    expect(normalized).toBe(loc.manualCode)
  })

  it('normalizes QR-prefixed legacy codes', () => {
    const loc = SCAN_LOCATIONS_BY_NODE['P01']
    expect(loc).toBeDefined()

    const normalized = normalizeManualCode('QR-P01')
    expect(normalized).toBe(loc.manualCode)
  })

  it('normalizes test code', () => {
    const normalized = normalizeManualCode(TEST_CODE)
    expect(normalized).toBe(TEST_CODE)
  })

  it('rejects invalid manual codes', () => {
    expect(normalizeManualCode('INVALID-CODE')).toBeNull()
    expect(normalizeManualCode('')).toBeNull()
    expect(normalizeManualCode('NX-Loc-999-ZZXXCCVV')).toBeNull()
  })

  it('resolves a canonical manual code to its location', () => {
    const loc = SCAN_LOCATIONS_BY_ID['LOC-P01']
    const resolved = resolveManualCode(loc.manualCode)
    expect(resolved).toBeDefined()
    expect(resolved?.scanNodeId).toBe('P01')
  })

  it('resolves test code to LOC-TEST', () => {
    const resolved = resolveManualCode(TEST_CODE)
    expect(resolved).toBeDefined()
    expect(resolved?.locationId).toBe('LOC-TEST')
  })

  it('resolveCodeInput handles all input formats', () => {
    const loc = SCAN_LOCATIONS_BY_ID['LOC-P01']

    expect(resolveCodeInput(loc.qrPayload)?.locationId).toBe('LOC-P01')
    expect(resolveCodeInput(loc.manualCode)?.locationId).toBe('LOC-P01')
    expect(resolveCodeInput('P01')?.locationId).toBe('LOC-P01')
    expect(resolveCodeInput('QR-P01')?.locationId).toBe('LOC-P01')
    expect(resolveCodeInput(TEST_CODE)?.locationId).toBe('LOC-TEST')
    expect(resolveCodeInput('GARBAGE')).toBeNull()
  })
})

describe('Unified Validation Pipeline', () => {
  it('validateQRCode resolves a valid payload', () => {
    const loc = SCAN_LOCATIONS_BY_ID['LOC-P01']
    const result = validateQRCode(loc.qrPayload)
    expect(result.location).not.toBeNull()
    expect(result.error).toBeNull()
    expect(result.inputFormat).toBe('qr_payload')
    expect(result.location?.scanNodeId).toBe('P01')
  })

  it('validateQRCode rejects invalid payloads', () => {
    const result = validateQRCode('INVALID')
    expect(result.location).toBeNull()
    expect(result.error).not.toBeNull()
  })

  it('validateManualCode accepts canonical codes', () => {
    const loc = SCAN_LOCATIONS_BY_ID['LOC-P01']
    const result = validateManualCode(loc.manualCode)
    expect(result.location).not.toBeNull()
    expect(result.error).toBeNull()
    expect(result.inputFormat).toBe('manual_code')
  })

  it('validateManualCode accepts legacy codes', () => {
    const result = validateManualCode('P01')
    expect(result.location).not.toBeNull()
    expect(result.error).toBeNull()
    expect(result.inputFormat).toBe('legacy_code')
  })

  it('validateManualCode accepts QR-prefixed legacy codes', () => {
    const result = validateManualCode('QR-P01')
    expect(result.location).not.toBeNull()
    expect(result.error).toBeNull()
    expect(result.inputFormat).toBe('legacy_code')
  })

  it('validateManualCode accepts test code', () => {
    const result = validateManualCode(TEST_CODE)
    expect(result.location).not.toBeNull()
    expect(result.error).toBeNull()
    expect(result.inputFormat).toBe('test_code')
    expect(result.location?.locationId).toBe('LOC-TEST')
  })

  it('validateManualCode rejects unknown codes', () => {
    const result = validateManualCode('NX-Loc-999-XXXXXXXX')
    expect(result.location).toBeNull()
    expect(result.error).not.toBeNull()
  })

  it('validateAnyCode handles all input types', () => {
    const loc = SCAN_LOCATIONS_BY_ID['LOC-P01']

    expect(validateAnyCode(loc.qrPayload).location?.locationId).toBe('LOC-P01')
    expect(validateAnyCode(loc.manualCode).location?.locationId).toBe('LOC-P01')
    expect(validateAnyCode('P01').location?.locationId).toBe('LOC-P01')
    expect(validateAnyCode(TEST_CODE).location?.locationId).toBe('LOC-TEST')
    expect(validateAnyCode('GARBAGE').location).toBeNull()
  })

  it('toQRScanResult produces correct result for discovered marker', () => {
    const loc = SCAN_LOCATIONS_BY_ID['LOC-P01']
    const result = validateQRCode(loc.qrPayload)
    const scanResult = toQRScanResult(result)
    expect(scanResult.discovered).toBe(true)
    expect(scanResult.nodeCode).toBe('P01')
    expect(scanResult.nodeTitle).toBe(loc.nodeName)
    expect(scanResult.qrLabel).toBe(loc.label)
    expect(scanResult.error).toBeUndefined()
  })

  it('toQRScanResult produces correct result for denied marker', () => {
    const result = validateQRCode('INVALID-QR-CODE')
    const scanResult = toQRScanResult(result)
    expect(scanResult.discovered).toBe(false)
    expect(scanResult.error).toBeDefined()
  })
})

describe('Test/Fallback Code', () => {
  it('resolves to P01', () => {
    const result = validateAnyCode(TEST_CODE)
    expect(result.location).not.toBeNull()
    expect(result.location?.scanNodeId).toBe('P01')
    expect(result.inputFormat).toBe('test_code')
  })

  it('produces a valid scan result', () => {
    const { scanQR } = createQASimulator()
    const result = scanQR(TEST_CODE)
    expect(result.discovered).toBe(true)
    expect(result.nodeCode).toBe('P01')
  })

  function createQASimulator() {
    return {
      scanQR: (code: string) => toQRScanResult(validateAnyCode(code)),
    }
  }
})
