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
 * Each entry is keyed on the puzzle CODE, never on the node's position in
 * ALL_PUZZLES, so inserting or reordering a puzzle cannot invalidate the marker
 * identities of the nodes around it.
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
 * Deterministic token generation from a stable location seed.
 *
 * Produces a stable 8-character token by hashing the seed (the puzzle code) and
 * mapping to the ambiguity-safe alphabet. Same input always produces the same
 * output, so the payload never drifts when the game is reordered or extended.
 */
function generateToken(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
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
 * The test entry's identifiers. Named constants so the registry and the tests
 * cannot drift apart, and so nothing derives them from an array position.
 */
export const TEST_LOCATION_ID = 'LOC-TEST'
const TEST_CODE_SCAN_NODE = 'P01'

/**
 * Build the stable location id for a puzzle code.
 *
 * Keyed on the puzzle code rather than an ordinal so that adding, removing or
 * reordering nodes leaves every other marker's identifier — and therefore every
 * printed QR sheet — valid.
 */
function buildLocationId(puzzleCode: string): string {
  return `LOC-${puzzleCode}`
}

/**
 * Build the manual entry code for a location.
 */
function buildManualCode(puzzleCode: string, token: string): string {
  return `${MANUAL_CODE_PREFIX}${puzzleCode}-${token}`
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
 * The canonical location registry: one entry per puzzle node, plus the test entry.
 *
 * Marker identity is derived from the puzzle CODE, never from the node's position
 * in this array. The previous version numbered locations as `LOC-001`, `LOC-002`,
 * … by array index, which meant inserting or reordering a single puzzle silently
 * renumbered every later marker and invalidated every QR sheet already printed
 * and stuck to a wall. Codes are the stable, database-backed identity, so a
 * marker's payload now survives any change to the order or size of the game.
 */
export const SCAN_LOCATIONS: ScanLocation[] = (() => {
  const locations: ScanLocation[] = []

  ALL_PUZZLES.forEach((puzzle: NodeIndexEntry) => {
    // Stable: the puzzle code is the identity the database also uses.
    const locationId = buildLocationId(puzzle.code)
    const token = generateToken(puzzle.code)
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
      manualCode: buildManualCode(puzzle.code, token),
      resultType: 'PUZZLE',
    })
  })

  locations.push({
    locationId: TEST_LOCATION_ID,
    scanNodeId: TEST_CODE_SCAN_NODE,
    label: 'Test Entry Marker',
    nodeName: 'The Facade',
    nodeType: 'OBSERVATION',
    nodeStage: 1,
    nodeLocation: '[TEST] — Development Fallback',
    building: 'ADMIN_BUILDING',
    position: [185, 140],
    qrPayload: `${QR_PAYLOAD_PREFIX}|${QR_PAYLOAD_VERSION}|${TEST_LOCATION_ID}|TESTCODE`,
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
