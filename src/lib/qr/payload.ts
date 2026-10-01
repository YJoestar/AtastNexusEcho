/**
 * NEXUS — QR Payload Parsing
 *
 * Parses and formats versioned QR payload strings.
 *
 * Payload format: NX|V1|<locationId>|<token>
 *   - NX: constant prefix (unambiguous, no puzzle code starts with "NX")
 *   - V1: version marker for forward compatibility
 *   - locationId: canonical location identifier (e.g. "LOC-001")
 *   - token: 8-char ambiguity-safe verification token
 *
 * This module is pure: no side effects, no dependencies on DOM or I/O.
 */

import {
  QR_PAYLOAD_PREFIX,
  QR_PAYLOAD_VERSION,
  type ScanLocation,
  SCAN_LOCATIONS_BY_ID,
} from './locations'
import { TEST_CODE } from './locations'

/**
 * Parsed representation of a QR payload string.
 */
export interface QRPayload {
  /** Raw string that was parsed */
  raw: string
  /** Whether the payload parsed successfully */
  valid: boolean
  /** Version string (e.g. "V1") */
  version: string | null
  /** Location ID extracted from the payload (e.g. "LOC-001") */
  locationId: string | null
  /** Token extracted from the payload */
  token: string | null
  /** Error message if parsing failed */
  error: string | null
}

/**
 * Special sentinel for the test code — when the raw input matches TEST_CODE,
 * it bypasses the versioned payload format entirely.
 */
const TEST_LOCATION_ID = 'LOC-000'

const PAYLOAD_PARTS_COUNT = 4

/**
 * Parse a QR payload string into its components.
 *
 * Returns a QRPayload object with valid=true only if the format is correct
 * and the locationId resolves to a known scan location.
 *
 * @param raw - The raw string scanned from a QR code
 */
export function parseQRPayload(raw: string): QRPayload {
  const trimmed = raw.trim()

  if (!trimmed) {
    return {
      raw,
      valid: false,
      version: null,
      locationId: null,
      token: null,
      error: 'Empty payload',
    }
  }

  const parts = trimmed.split('|')

  if (parts.length !== PAYLOAD_PARTS_COUNT) {
    return {
      raw,
      valid: false,
      version: null,
      locationId: null,
      token: null,
      error: `Invalid payload format: expected ${PAYLOAD_PARTS_COUNT} parts separated by '|'`,
    }
  }

  const [prefix, version, locationId, token] = parts

  if (prefix !== QR_PAYLOAD_PREFIX) {
    return {
      raw,
      valid: false,
      version: null,
      locationId: null,
      token: null,
      error: `Invalid prefix: expected "${QR_PAYLOAD_PREFIX}"`,
    }
  }

  if (version !== QR_PAYLOAD_VERSION) {
    return {
      raw,
      valid: false,
      version,
      locationId: null,
      token: null,
      error: `Unsupported version: expected "${QR_PAYLOAD_VERSION}"`,
    }
  }

  if (!locationId || !SCAN_LOCATIONS_BY_ID[locationId]) {
    return {
      raw,
      valid: false,
      version,
      locationId,
      token: null,
      error: `Unknown location ID: ${locationId ?? '(empty)'}`,
    }
  }

  if (!token || token.length !== 8) {
    return {
      raw,
      valid: false,
      version,
      locationId,
      token,
      error: 'Invalid token: expected 8 characters',
    }
  }

  return {
    raw,
    valid: true,
    version,
    locationId,
    token,
    error: null,
  }
}

/**
 * Format a scan location into its QR payload string.
 */
export function formatQRPayload(location: ScanLocation): string {
  return location.qrPayload
}

/**
 * Resolve a parsed QR payload to its canonical ScanLocation.
 */
export function resolvePayload(payload: QRPayload): ScanLocation | null {
  if (!payload.valid || !payload.locationId) return null
  return SCAN_LOCATIONS_BY_ID[payload.locationId] ?? null
}

/**
 * Check whether the raw string is the special test/fallback code.
 *
 * @param raw - The raw string to check
 */
export function isTestCode(raw: string): boolean {
  return raw.trim() === TEST_CODE
}

/**
 * Resolve the test code to its ScanLocation (LOC-000).
 */
export function resolveTestCode(): ScanLocation | null {
  return SCAN_LOCATIONS_BY_ID[TEST_LOCATION_ID] ?? null
}

/**
 * Format a location as a display string for the scanner UI.
 */
export function formatPayloadForDisplay(payload: string): string {
  const parsed = parseQRPayload(payload)
  if (parsed.valid && parsed.locationId) {
    const loc = SCAN_LOCATIONS_BY_ID[parsed.locationId]
    return loc ? loc.label : parsed.locationId
  }
  return payload
}
