/**
 * NEXUS — Manual Code Utilities
 *
 * Deterministic generation and validation of ambiguity-safe manual entry codes.
 *
 * Manual code format: NX-Loc-<CODE>-<TOKEN>
 *   - NX- confirms it's a NEXUS marker
 *   - Loc- confirms it's a location manual code
 *   - CODE is the stable puzzle code (e.g. "P01", "M01")
 *   - TOKEN is the 8-char ambiguity-safe verification token
 *
 * The code segment is the puzzle code rather than an ordinal. Ordinals were
 * assigned from the node's position in ALL_PUZZLES, so inserting or reordering a
 * puzzle renumbered every later marker and invalidated every QR sheet already
 * printed. Puzzle codes are the same identity the database uses, so they are
 * stable across reordering, insertion and growth of the game.
 *
 * The token is generated deterministically from the puzzle code using a simple
 * hash folded into the Crockford base32 alphabet (no I, O, 0, 1, U).
 *
 * Legacy support: bare puzzle codes (e.g. "P01", "QR-P01") are normalized
 * to their corresponding manual code via the location registry.
 */

import {
  TEST_CODE,
  TEST_LOCATION_ID,
  SCAN_LOCATIONS_BY_NODE,
  SCAN_LOCATIONS_BY_MANUAL,
  SCAN_LOCATIONS_BY_ID,
  SCAN_LOCATIONS_BY_PAYLOAD,
} from './locations'
import type { ScanLocation } from './locations'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
/** The code segment is a puzzle code, so it is alphanumeric rather than numeric. */
export const MANUAL_CODE_PATTERN = /^NX-Loc-([A-Za-z0-9]+)-([A-HJ-NP-Z2-9]{8})$/
export { ALPHABET as MANUAL_CODE_ALPHABET }

/**
 * Generate the manual code for a location using the same deterministic
 * algorithm used during registry construction.
 *
 * Accepts either a bare puzzle code ("P01") or a location id ("LOC-P01") so
 * callers that hold either form still get the canonical manual code.
 *
 * This is re-exported for use in tests and admin tooling that needs to
 * produce codes without importing the full registry.
 */
export function generateManualCode(locationId: string): string {
  const code = locationId.replace(/^LOC-/, '')

  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0
  }
  hash = Math.abs(hash)

  let token = ''
  let remaining = hash
  for (let i = 0; i < 8; i++) {
    token += ALPHABET[remaining % ALPHABET.length]
    remaining = Math.floor(remaining / ALPHABET.length)
  }

  return `NX-Loc-${code}-${token}`
}

/**
 * Parse a manual code string, extracting the location reference and token.
 *
 * Returns null if the code does not match the expected format.
 */
export function parseManualCode(code: string): { locationId: string; token: string } | null {
  const match = code.trim().match(MANUAL_CODE_PATTERN)
  if (!match) return null

  const [, codeSegment, token] = match
  return { locationId: `LOC-${codeSegment}`, token }
}

/**
 * Normalize a user-entered code to the canonical manual code format.
 *
 * Handles several input formats:
 *   - Canonical manual code: "NX-Loc-001-ABCD-EFGH" → as-is
 *   - Legacy node code: "P01" → resolves to the manual code for LOC-001
 *   - Prefixed legacy: "QR-P01" → strips prefix, resolves to LOC-001
 *   - Test code: "NX-TEST-ENTRY" → as-is (special test location)
 */
export function normalizeManualCode(input: string): string | null {
  const trimmed = input.trim()

  if (!trimmed) return null

  if (trimmed === TEST_CODE) return TEST_CODE

  const parsed = parseManualCode(trimmed)
  if (parsed) {
    const loc = SCAN_LOCATIONS_BY_ID[parsed.locationId]
    return loc ? loc.manualCode : null
  }

  let code = trimmed
  if (code.toUpperCase().startsWith('QR-')) {
    code = code.slice(3)
  }

  const loc = SCAN_LOCATIONS_BY_NODE[code.toUpperCase()]
  return loc ? loc.manualCode : null
}

/**
 * Resolve a normalized manual code to its ScanLocation.
 */
export function resolveManualCode(normalizedCode: string): ScanLocation | null {
  if (normalizedCode === TEST_CODE) {
    return SCAN_LOCATIONS_BY_ID[TEST_LOCATION_ID] ?? null
  }
  return SCAN_LOCATIONS_BY_MANUAL[normalizedCode] ?? null
}

/**
 * Resolve any raw input (QR payload, manual code, or test code) to a ScanLocation.
 *
 * This is the primary entry point for the unified validation pipeline.
 * It tries test code, then QR payload lookup, then manual code resolution.
 */
export function resolveCodeInput(input: string): ScanLocation | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed === TEST_CODE) {
    return SCAN_LOCATIONS_BY_ID[TEST_LOCATION_ID] ?? null
  }

  const manualLoc = SCAN_LOCATIONS_BY_MANUAL[trimmed]
  if (manualLoc) return manualLoc

  const payloadLoc = SCAN_LOCATIONS_BY_PAYLOAD[trimmed]
  if (payloadLoc) return payloadLoc

  const upperCode = trimmed.toUpperCase()
  const stripped = upperCode.startsWith('QR-') ? upperCode.slice(3) : upperCode
  const nodeLoc = SCAN_LOCATIONS_BY_NODE[stripped]
  return nodeLoc ?? null
}

/**
 * Re-export the canonical manual code for a location.
 */
export function manualCodeForLocation(location: ScanLocation): string {
  return location.manualCode
}
