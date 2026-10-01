/**
 * NEXUS — Unified QR Validation Pipeline
 *
 * Single entry point for resolving any scanned or manually-entered code into
 * a canonical ScanLocation record. Both QR payloads and manual codes flow
 * through this same pipeline, ensuring client and QA simulator agree.
 *
 * Resolution order:
 *   1. Test/fallback code ("NX-TEST-ENTRY") → always resolves to LOC-000
 *   2. Versioned QR payload ("NX|V1|LOC-001|TOKEN") → parsed and validated
 *   3. Canonical manual code ("NX-Loc-001-TOKEN") → looked up directly
 *   4. Legacy puzzle code ("P01", "QR-P01") → normalized to canonical manual code
 *
 * The server (game-scan-qr edge function) receives the raw QR payload string
 * and invokes scan_qr_code RPC. For the QA simulator, this module performs
 * client-side resolution so the full pipeline can be tested without a backend.
 */

import { parseQRPayload, resolvePayload, isTestCode, resolveTestCode } from './payload'
import { normalizeManualCode, resolveManualCode, resolveCodeInput, parseManualCode } from './manualCode'
import type { ScanLocation } from './locations'
import { SCAN_LOCATIONS_BY_PAYLOAD } from './locations'
import type { QRScanResult } from '@/hooks/useGameEngine'

/**
 * Classification of the input format for diagnostics.
 */
export type InputFormat = 'test_code' | 'qr_payload' | 'manual_code' | 'legacy_code' | 'unknown'

/**
 * Result of validating and resolving a code input.
 */
export interface ValidationResult {
  /** The canonical scan location, or null if validation failed */
  location: ScanLocation | null
  /** What format the input was classified as */
  inputFormat: InputFormat
  /** The normalized canonical code (manual code or QR payload) */
  normalizedCode: string
  /** Error message if validation failed, null on success */
  error: string | null
  /** For invalid inputs, a suggested user-facing message */
  userMessage: string
}

const ERROR_INVALID_MARKER = 'ACCESS DENIED. The system does not recognize this marker.'
const ERROR_EMPTY_INPUT = 'No code provided.'
const ERROR_MALFORMED = 'The provided code is malformed and cannot be processed.'
const ERROR_UNKNOWN_LOCATION = 'ACCESS DENIED. The marker references an unknown location.'

function unknownResult(input: string, message: string, userMessage: string): ValidationResult {
  return {
    location: null,
    inputFormat: 'unknown',
    normalizedCode: input,
    error: message,
    userMessage,
  }
}

/**
 * Resolve a raw QR payload string (from a scanned physical marker) to a
 * ValidationResult.
 *
 * @param qrCode - The raw string decoded from a QR marker
 */
export function validateQRCode(qrCode: string): ValidationResult {
  const trimmed = qrCode.trim()

  if (!trimmed) {
    return {
      location: null,
      inputFormat: 'unknown',
      normalizedCode: '',
      error: ERROR_EMPTY_INPUT,
      userMessage: ERROR_EMPTY_INPUT,
    }
  }

  if (isTestCode(trimmed)) {
    const loc = resolveTestCode()
    if (!loc) {
      return unknownResult(trimmed, 'Test location not found in registry.', ERROR_INVALID_MARKER)
    }
    return {
      location: loc,
      inputFormat: 'test_code',
      normalizedCode: trimmed,
      error: null,
      userMessage: '',
    }
  }

  const payload = parseQRPayload(trimmed)
  if (!payload.valid) {
    return unknownResult(trimmed, payload.error ?? ERROR_MALFORMED, ERROR_INVALID_MARKER)
  }

  const loc = resolvePayload(payload)
  if (!loc) {
    return unknownResult(trimmed, ERROR_UNKNOWN_LOCATION, ERROR_INVALID_MARKER)
  }

  return {
    location: loc,
    inputFormat: 'qr_payload',
    normalizedCode: loc.qrPayload,
    error: null,
    userMessage: '',
  }
}

/**
 * Resolve a manual entry code to a ValidationResult.
 *
 * Accepts canonical manual codes, legacy puzzle codes, and test codes.
 *
 * @param code - The code entered by the user in the manual entry field
 */
export function validateManualCode(code: string): ValidationResult {
  const trimmed = code.trim()

  if (!trimmed) {
    return {
      location: null,
      inputFormat: 'unknown',
      normalizedCode: '',
      error: ERROR_EMPTY_INPUT,
      userMessage: ERROR_EMPTY_INPUT,
    }
  }

  if (isTestCode(trimmed)) {
    const loc = resolveTestCode()
    if (!loc) {
      return unknownResult(trimmed, 'Test location not found in registry.', ERROR_INVALID_MARKER)
    }
    return {
      location: loc,
      inputFormat: 'test_code',
      normalizedCode: trimmed,
      error: null,
      userMessage: '',
    }
  }

  const normalized = normalizeManualCode(trimmed)
  if (!normalized) {
    const parsed = parseManualCode(trimmed.toUpperCase())
    if (parsed && !SCAN_LOCATIONS_BY_PAYLOAD[parsed.locationId]) {
      return unknownResult(trimmed, `Unknown location: ${parsed.locationId}`, ERROR_UNKNOWN_LOCATION)
    }
    return unknownResult(trimmed, 'Unrecognized manual code format.', ERROR_INVALID_MARKER)
  }

   const loc = resolveManualCode(normalized)
  if (!loc) {
    return unknownResult(trimmed, ERROR_UNKNOWN_LOCATION, ERROR_INVALID_MARKER)
  }

   const wasCanonical = trimmed.toUpperCase() === normalized.toUpperCase()
   const inputFormat: InputFormat = wasCanonical ? 'manual_code' : 'legacy_code'

  return {
    location: loc,
    inputFormat,
    normalizedCode: normalized,
    error: null,
    userMessage: '',
  }
}

/**
 * Resolve any code input (QR payload, manual code, or legacy code) to a
 * ValidationResult.
 *
 * This is the unified entry point used by both the QR scanner and QA simulator.
 *
 * @param input - Any raw code string from scanning or manual entry
 */
export function validateAnyCode(input: string): ValidationResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return {
      location: null,
      inputFormat: 'unknown',
      normalizedCode: '',
      error: ERROR_EMPTY_INPUT,
      userMessage: ERROR_EMPTY_INPUT,
    }
  }

  if (isTestCode(trimmed)) {
    const loc = resolveTestCode()
    if (!loc) {
      return unknownResult(trimmed, 'Test location not found in registry.', ERROR_INVALID_MARKER)
    }
    return {
      location: loc,
      inputFormat: 'test_code',
      normalizedCode: trimmed,
      error: null,
      userMessage: '',
    }
  }

  const loc = resolveCodeInput(trimmed)
  if (loc) {
    return {
      location: loc,
      inputFormat: 'manual_code',
      normalizedCode: loc.manualCode,
      error: null,
      userMessage: '',
    }
  }

  return validateQRCode(trimmed)
}

/**
 * Convert a ValidationResult to a QRScanResult for the game engine hook.
 *
 * This bridges the new canonical validation layer with the existing
 * QRScanResult interface used throughout the player screens.
 */
export function toQRScanResult(result: ValidationResult): QRScanResult {
  if (result.location) {
    return {
      discovered: true,
      qrLabel: result.location.label,
      nodeCode: result.location.scanNodeId,
      nodeTitle: result.location.nodeName,
      message: `Marker for ${result.location.nodeName} detected at ${result.location.nodeLocation}.`,
    }
  }
  return {
    discovered: false,
    error: result.error ?? 'Unknown error',
    message: result.userMessage,
  }
}

/**
 * Convenience: validate and directly return a QRScanResult.
 */
export function validateToScanResult(input: string): QRScanResult {
  return toQRScanResult(validateAnyCode(input))
}
