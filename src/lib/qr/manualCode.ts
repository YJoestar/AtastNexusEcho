/**
 * NEXUS — Manual Code Utilities
 *
 * Deterministic generation and validation of ambiguity-safe manual entry codes.
 *
 * Manual code format: NX-Loc-<NNN>-<TOKEN>
 *   - NX- confirms it's a NEXUS marker
 *   - Loc- confirms it's a location manual code
 *   - NNN is the 3-digit location ID (e.g. "001")
 *   - TOKEN is the 8-char ambiguity-safe verification token
 *
 * The token is generated deterministically from the locationId using a simple
 * hash folded into the Crockford base32 alphabet (no I, O, 0, 1, U).
 * This means the same locationId always produces the same manual code,
 * without needing a database lookup.
 *
 * Legacy support: bare puzzle codes (e.g. "P01", "QR-P01") are normalized
 * to their corresponding manual code via the location registry.
 */

import {
  TEST_CODE,
  SCAN_LOCATIONS_BY_NODE,
  SCAN_LOCATIONS_BY_MANUAL,
  SCAN_LOCATIONS_BY_ID,
  SCAN_LOCATIONS_BY_PAYLOAD,
} from './locations'
import type { ScanLocation } from './locations'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const MANUAL_CODE_PATTERN = /^NX-Loc-(\d{3})-([A-HJ-NP-Z2-9]{8})$/i
export { ALPHABET as MANUAL_CODE_ALPHABET }

/**
 * Generate the manual code for a location ID using the same deterministic
 * algorithm used during registry construction.
 *
 * This is re-exported for use in tests and admin tooling that needs to
 * produce codes without importing the full registry.
 */
export function generateManualCode(locationId: string): string {
  const num = parseInt(locationId.replace('LOC-', ''), 10)
  const numStr = num.toString().padStart(3, '0')

  let hash = 0
  for (let i = 0; i < locationId.length; i++) {
    hash = (hash * 31 + locationId.charCodeAt(i)) | 0
  }
  hash = Math.abs(hash)

  let token = ''
  let remaining = hash
  for (let i = 0; i < 8; i++) {
    token += ALPHABET[remaining % ALPHABET.length]
    remaining = Math.floor(remaining / ALPHABET.length)
  }

  return `NX-Loc-${numStr}-${token}`
}

/**
 * Parse a manual code string, extracting the location number and token.
 *
 * Returns null if the code does not match the expected format.
 */
export function parseManualCode(code: string): { locationId: string; token: string } | null {
  const match = code.trim().match(MANUAL_CODE_PATTERN)
  if (!match) return null

  const [, numStr, token] = match
  const locationId = `LOC-${numStr}`
  return { locationId, token }
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
    return SCAN_LOCATIONS_BY_ID['LOC-000'] ?? null
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
    return SCAN_LOCATIONS_BY_ID['LOC-000'] ?? null
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
