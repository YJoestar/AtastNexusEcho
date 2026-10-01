/**
 * NEXUS — QR Location Registry
 *
 * Single source of truth mapping every puzzle node to its scan location data:
 *   - locationId: stable human-readable identifier (e.g. "LOC-001")
 *   - scanNodeId: the puzzle node code this marker unlocks (e.g. "P01")
 *   - qrPayload: versioned string for the physical QR code (e.g. "NX|V1|LOC-001|ABCD-EFGH")
 *   - manualCode: ambiguity-safe code for manual entry (e.g. "NX-Loc-001-ABCD-EFGH")
 *   - resultType: "PUZZLE" for node markers, "LOCATION" for navigation markers
 *
 * Generated deterministically from ALL_PUZZLES so the client and server agree
 * even if puzzles are reordered or new ones are inserted.
 */

import { ALL_PUZZLES } from '@/content/puzzles'
import { BUILDING_NAMES, type BuildingName, type CampusPOI, getPOI } from '@/content/campus'
import type { NodeIndexEntry } from '@/content/puzzles'

/**
 * QR payload versioning.
 * Format: NX|V1|<locationId>|<manualToken>
 *   - NX prefix is unambiguous (no puzzle code starts with "NX")
 *   - V1 allows forward-compatible evolution
 *   - locationId is the canonical scan location identifier
 *   - manualToken is a short, human-readable token for verification
 */
export const QR_PAYLOAD_PREFIX = 'NX'
export const QR_PAYLOAD_VERSION = 'V1'

/**
 * Manual code format: NX-Loc-<NNN>-<TOKEN>
 *   - NX- confirms it's a NEXUS marker
 *   - Loc- confirms it's a location manual code
 *   - NNN is the 3-digit location ID
 *   - TOKEN is the 8-char ambiguity-safe verification token
 *
 * Uses Crockford-style base32 alphabet (no I, O, 0, 1) for error resistance.
 */
export const MANUAL_CODE_PREFIX = 'NX-Loc-'

/**
 * Special test/fallback code — always resolves to the first puzzle node (P01)
 * and is always available regardless of prerequisite state. Used by developers
 * and QA to verify the scanning pipeline end-to-end without a camera.
 */
export const TEST_CODE = 'NX-TEST-ENTRY'

/**
 * Result type for a resolved scan location.
 */
export type ScanResultType = 'PUZZLE' | 'LOCATION' | 'TEST'

/**
 * The canonical scan location record. Both QR payloads and manual codes
 * resolve to this single structure, ensuring the client and QA simulator
 * share the same validation pipeline.
 */
export interface ScanLocation {
  /** Canonical location identifier (e.g. "LOC-001") */
  locationId: string
  /** The puzzle node code this marker maps to (e.g. "P01") */
  scanNodeId: string
  /** Human-readable label for display (e.g. "The Facade Marker") */
  label: string
  /** Node name for display (e.g. "The Facade") */
  nodeName: string
  /** Node type (e.g. "OBSERVATION") */
  nodeType: string
  /** Node stage (1–5) */
  nodeStage: number
  /** Full location string (e.g. "[ADMIN BUILDING] — Main Entrance Facade") */
  nodeLocation: string
  /** Building name for map display */
  building: BuildingName
  /** World coordinates on the campus map */
  position: [number, number]
  /** Full QR payload string to encode in the physical marker */
  qrPayload: string
  /** Ambiguity-safe manual entry code */
  manualCode: string
  /** What kind of result this location yields */
  resultType: ScanResultType
}

/**
 * Ambiguity-safe character set: Crockford base32 (excludes I, O, 0, 1).
 * Matches the existing auth code system alphabet in code-generation.ts.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Deterministic token generation from a location ID.
 *
 * Produces a stable 8-character token by hashing the locationId and
 * mapping to the ambiguity-safe alphabet. Same input always produces
 * the same output, so the server and client agree without a database
 * lookup.
 */
function generateToken(locationId: string): string {
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
  return token
}

/**
 * Build the full payload string for a location.
 */
function buildQRPayload(locationId: string, token: string): string {
  return `${QR_PAYLOAD_PREFIX}|${QR_PAYLOAD_VERSION}|${locationId}|${token}`
}

/**
 * Build the manual entry code for a location.
 */
function buildManualCode(locationId: string, token: string): string {
  const num = parseInt(locationId.replace('LOC-', ''), 10)
  const numStr = num.toString().padStart(3, '0')
  return `${MANUAL_CODE_PREFIX}${numStr}-${token}`
}

/**
 * Derive the building name from a puzzle's location string.
 */
function buildingFromLocation(location: string): BuildingName {
  const upper = location.toUpperCase()
  if (upper.includes('[NEXUS CORE]')) return 'NEXUS_CORE'
  if (upper.includes('[ENGINEERING BLOCK]')) return 'ENGINEERING_BLOCK'
  if (upper.includes('[SCIENCE BUILDING]')) return 'SCIENCE_BUILDING'
  if (upper.includes('[LIBRARY]')) return 'LIBRARY'
  if (upper.includes('[ADMIN BUILDING]')) return 'ADMIN_BUILDING'
  if (upper.includes('[CAMPUS]')) return 'SCULPTURE_GARDEN'
  return 'ADMIN_BUILDING'
}

/**
 * The canonical location registry: all 47 puzzle nodes + 1 test location.
 *
 * Built deterministically from ALL_PUZZLES so the ordering is stable
 * across environments. Each puzzle node gets exactly one location entry.
 */
export const SCAN_LOCATIONS: ScanLocation[] = (() => {
  const locations: ScanLocation[] = []

  ALL_PUZZLES.forEach((puzzle: NodeIndexEntry, index: number) => {
    const locationId = `LOC-${(index + 1).toString().padStart(3, '0')}`
    const token = generateToken(locationId)
    const building = buildingFromLocation(puzzle.location)
    const poi: CampusPOI | undefined = getPOI(puzzle.code)

    locations.push({
      locationId,
      scanNodeId: puzzle.code,
      label: `${puzzle.name} Marker`,
      nodeName: puzzle.name,
      nodeType: puzzle.type,
      nodeStage: puzzle.stage,
      nodeLocation: puzzle.location,
      building,
      position: poi ? poi.position : [0, 0],
      qrPayload: buildQRPayload(locationId, token),
      manualCode: buildManualCode(locationId, token),
      resultType: 'PUZZLE',
    })
  })

  locations.push({
    locationId: 'LOC-000',
    scanNodeId: 'P01',
    label: 'Test Entry Marker',
    nodeName: 'The Facade',
    nodeType: 'OBSERVATION',
    nodeStage: 1,
    nodeLocation: '[TEST] — Development Fallback',
    building: 'ADMIN_BUILDING',
    position: [185, 140],
    qrPayload: `${QR_PAYLOAD_PREFIX}|${QR_PAYLOAD_VERSION}|LOC-000|TESTCODE`,
    manualCode: TEST_CODE,
    resultType: 'TEST',
  })

  return locations
})()

/**
 * Lookup table for O(1) resolution by locationId.
 */
export const SCAN_LOCATIONS_BY_ID: Record<string, ScanLocation> =
  SCAN_LOCATIONS.reduce(
    (acc, loc) => {
      acc[loc.locationId] = loc
      return acc
    },
    {} as Record<string, ScanLocation>,
  )

/**
 * Lookup table for O(1) resolution by puzzle node code.
 */
export const SCAN_LOCATIONS_BY_NODE: Record<string, ScanLocation> =
  SCAN_LOCATIONS.filter(loc => loc.resultType !== 'TEST').reduce(
    (acc, loc) => {
      acc[loc.scanNodeId] = loc
      return acc
    },
    {} as Record<string, ScanLocation>,
  )

/**
 * Lookup table for O(1) resolution by QR payload.
 */
export const SCAN_LOCATIONS_BY_PAYLOAD: Record<string, ScanLocation> =
  SCAN_LOCATIONS.reduce(
    (acc, loc) => {
      acc[loc.qrPayload] = loc
      return acc
    },
    {} as Record<string, ScanLocation>,
  )

/**
 * Lookup table for O(1) resolution by manual code.
 */
export const SCAN_LOCATIONS_BY_MANUAL: Record<string, ScanLocation> =
  SCAN_LOCATIONS.reduce(
    (acc, loc) => {
      acc[loc.manualCode] = loc
      return acc
    },
    {} as Record<string, ScanLocation>,
  )

/**
 * Total number of scan locations (includes the test location).
 */
export const SCAN_LOCATION_COUNT = SCAN_LOCATIONS.length

/**
 * Get the building display name for a scan location.
 */
export function getBuildingName(building: BuildingName): string {
  return BUILDING_NAMES[building]
}
