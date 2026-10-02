/**
 * NEXUS ECHO — Hidden clue model
 *
 * A clue is a connection the case already contains but does not announce: two
 * records that bear on each other. Nothing here invents story. Every clue is
 * derived from a relationship the case data already declares
 * (`artifact.relationships`), and the text shown on discovery is that
 * relationship's own note, unmodified.
 *
 *   evidence ─ relationships ─▶ HiddenClue ─ discovered by the player ─▶ record
 *
 * The player never sees the clue list. They see only what they have found, and
 * only after doing something an investigator would do: comparing two records,
 * or lining their timestamps up.
 */
import type { CaseArtifact } from '@/features/player/evidence/types'
import { contentString } from '@/features/player/evidence/types'

export type ClueCategory =
  | 'CONFIRMATION'
  | 'CONTRADICTION'
  | 'IDENTITY'
  | 'LOCATION'
  | 'TIMELINE'
  | 'RELATIONSHIP'
  | 'FORENSIC'
  | 'UNKNOWN'

export type DiscoveryMethod = 'CROSS_REFERENCE' | 'TIMELINE_COMPARISON'
export type ClueDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'

/** What the player knows about a clue. */
export type ClueStatus = 'UNKNOWN' | 'DISCOVERED' | 'CORROBORATED' | 'CONTRADICTED'

export interface HiddenClue {
  id: string
  category: ClueCategory
  /** The relationship kind in the case data this clue was derived from. */
  sourceKind: string
  /** Evidence codes, in a stable order. */
  evidence: [string, string]
  method: DiscoveryMethod
  difficulty: ClueDifficulty
  /** The case data's own words. Never rewritten. */
  meaning: string
}

export interface ClueDiscovery {
  clueId: string
  discoveredAt: string
  via: DiscoveryMethod
}

const CATEGORY_BY_KIND: Record<string, ClueCategory> = {
  TEMPORAL: 'TIMELINE',
  SPATIAL: 'LOCATION',
  PERSONNEL: 'IDENTITY',
  CONTRADICTION: 'CONTRADICTION',
  SOURCE: 'RELATIONSHIP',
  REFERENCE: 'CONFIRMATION',
}

/** Restrained, in-world feedback. Never congratulatory. */
export const DISCOVERY_NOTICE: Record<ClueCategory, string> = {
  CONFIRMATION: 'CORRELATION FOUND',
  CONTRADICTION: 'CONFLICT BETWEEN RECORDS',
  IDENTITY: 'NAME CROSS-REFERENCED',
  LOCATION: 'LOCATION MATCH',
  TIMELINE: 'TIMESTAMP RELATIONSHIP RECORDED',
  RELATIONSHIP: 'PROVENANCE RECORDED',
  FORENSIC: 'FORENSIC CONNECTION',
  UNKNOWN: 'UNCLASSIFIED CORRELATION',
}

const DIFFICULTY_BY_KIND: Record<string, ClueDifficulty> = {
  SOURCE: 'EASY',
  SPATIAL: 'EASY',
  PERSONNEL: 'MEDIUM',
  REFERENCE: 'MEDIUM',
  TEMPORAL: 'HARD',
  CONTRADICTION: 'EXPERT',
}

export function clueCategory(kind: string): ClueCategory {
  return CATEGORY_BY_KIND[kind.toUpperCase()] ?? 'UNKNOWN'
}

function pairKey(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a]
}

export function clueId(a: string, b: string, kind: string): string {
  const [first, second] = pairKey(a, b)
  return `clue:${first}~${second}:${kind.toUpperCase()}`
}

/** Both records carry a readable time, so lining them up can show something. */
function hasTime(artifact: CaseArtifact): boolean {
  return parseEvidenceTime(timestampOf(artifact)) !== null
}

export function timestampOf(artifact: CaseArtifact): string | null {
  return contentString(artifact.content, ['captured_at', 'capturedAt', 'timestamp'])
}

/**
 * Derive every clue the loaded case contains. A relationship whose far end is
 * not in the case file yields nothing: you cannot cross-reference what you
 * have not recovered.
 */
export function deriveClues(artifacts: readonly CaseArtifact[]): HiddenClue[] {
  const byCode = new Map(artifacts.map(artifact => [artifact.code, artifact]))
  const clues = new Map<string, HiddenClue>()
  for (const artifact of artifacts) {
    for (const relation of artifact.relationships ?? []) {
      const other = byCode.get(relation.to)
      if (!other || other.code === artifact.code) continue
      const id = clueId(artifact.code, other.code, relation.kind)
      if (clues.has(id)) continue
      const kind = relation.kind.toUpperCase()
      const timeAware = (kind === 'TEMPORAL' || kind === 'CONTRADICTION') && hasTime(artifact) && hasTime(other)
      clues.set(id, {
        id,
        category: clueCategory(kind),
        sourceKind: kind,
        evidence: pairKey(artifact.code, other.code),
        method: timeAware ? 'TIMELINE_COMPARISON' : 'CROSS_REFERENCE',
        difficulty: DIFFICULTY_BY_KIND[kind] ?? 'MEDIUM',
        meaning: relation.note,
      })
    }
  }
  return Array.from(clues.values())
}

export function cluesBetween(clues: readonly HiddenClue[], a: string, b: string): HiddenClue[] {
  const [first, second] = pairKey(a, b)
  return clues.filter(clue => clue.evidence[0] === first && clue.evidence[1] === second)
}

/** Which clues does examining this pair, by this method, bring to light? */
export function discoverableBy(
  clues: readonly HiddenClue[],
  a: string,
  b: string,
  method: DiscoveryMethod,
): HiddenClue[] {
  // Lining timestamps up is a stricter reading of a cross-reference, so it
  // reveals both kinds; a plain side-by-side comparison reveals only the first.
  return cluesBetween(clues, a, b).filter(clue =>
    method === 'TIMELINE_COMPARISON' || clue.method === 'CROSS_REFERENCE')
}

/* ───────────────────────────── timestamps ───────────────────────────── */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/**
 * Parse the case's two timestamp spellings — "14 OCT 94 03:12:44" and the
 * on-screen "14-10-94 02:41:20". Returns epoch milliseconds in the case's own
 * (unspecified) zone; only differences between two are meaningful.
 */
export function parseEvidenceTime(text: string | null | undefined): number | null {
  if (!text) return null
  const upper = text.toUpperCase()
  const named = /(\d{1,2})\s+([A-Z]{3})\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(upper)
  const numeric = /(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(upper)
  const match = named ?? numeric
  if (!match) return null
  const day = Number(match[1])
  const month = named ? MONTHS.indexOf(match[2]) : Number(match[2]) - 1
  let year = Number(match[3])
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  if (year < 100) year += year < 70 ? 2000 : 1900
  const hours = Number(match[4])
  const minutes = Number(match[5])
  const seconds = match[6] ? Number(match[6]) : 0
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return Date.UTC(year, month, day, hours, minutes, seconds)
}

/** "2 min 09 s", "1 h 05 min", "same instant". */
export function describeGap(milliseconds: number): string {
  const total = Math.round(Math.abs(milliseconds) / 1000)
  if (total === 0) return 'SAME INSTANT'
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return `${days} d ${hours.toString().padStart(2, '0')} h`
  if (hours > 0) return `${hours} h ${minutes.toString().padStart(2, '0')} min`
  if (minutes > 0) return `${minutes} min ${seconds.toString().padStart(2, '0')} s`
  return `${seconds} s`
}

/* ───────────────────────────── player state ───────────────────────────── */

export interface LinkLike {
  from: string
  to: string
  kind: string
  status: string
}

/**
 * What the player knows. A found clue is DISCOVERED. If the player has also
 * filed their own link between the same two records and marked it confirmed,
 * it is CORROBORATED; a CONTRADICTION clue the player has marked contradicted
 * reads as CONTRADICTED. Nothing here is system-verified truth — it records
 * the player's own reasoning against what they found.
 */
export function clueStatus(
  clue: HiddenClue,
  discoveries: Readonly<Record<string, ClueDiscovery>>,
  links: readonly LinkLike[],
  idByCode: (code: string) => string,
): ClueStatus {
  if (!discoveries[clue.id]) return 'UNKNOWN'
  const [a, b] = clue.evidence.map(idByCode)
  const link = links.find(entry => (entry.from === a && entry.to === b) || (entry.from === b && entry.to === a))
  if (link?.status === 'CONFIRMED') return 'CORROBORATED'
  if (link?.status === 'CONTRADICTED' && clue.category === 'CONTRADICTION') return 'CONTRADICTED'
  return 'DISCOVERED'
}
