/**
 * NEXUS ECHO — Evidence series and chronology
 *
 * Both are read from fields the records already carry; nothing is authored.
 *
 *  - A SERIES is two or more records of the same medium that name the same
 *    source: the nine DVR tapes of node B-04, the six dictaphone tapes, the
 *    twelve frames recovered by OBS-02. The source's own wording decides; a
 *    trailing "/ TAPE 7" or "/ VOL 3" is a position inside the series, not a
 *    different source.
 *  - CHRONOLOGY orders records by when the thing recorded happened
 *    (`captured_at`), not when it was recovered. Case timestamps are spelled
 *    at several precisions ("14 OCT 94 03:12:44", "14 OCT 94", "MAR 94",
 *    "1994", "14 OCT 94 03:0_:__"); a coarse stamp is placed at the start of
 *    the period it names and reports that it is coarse. Records with no
 *    readable stamp follow the dated ones.
 *
 * Pure: no DOM, no storage, no clock.
 */
import type { CaseArtifact } from '@/features/player/evidence/types'
import { artifactType, contentString, type ArtifactType } from '@/features/player/evidence/types'
import { timestampOf } from './clues'

export type TimePrecision = 'SECOND' | 'MINUTE' | 'DAY' | 'MONTH' | 'YEAR'

export interface CaptureTime {
  /** Start of the period the stamp names, as epoch ms in the case's own zone. */
  ms: number
  precision: TimePrecision
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function fullYear(raw: string): number {
  const year = Number(raw)
  if (raw.length >= 4) return year
  return year < 70 ? 2000 + year : 1900 + year
}

/**
 * Read a case timestamp at whatever precision it has. Masked digits
 * ("03:0_:__") make the time unreadable, so the stamp falls back to its day.
 */
export function parseCaptureTime(text: string | null | undefined): CaptureTime | null {
  if (!text) return null
  const upper = text.toUpperCase().trim()

  const dayMatch = /^(\d{1,2})\s+([A-Z]{3})\s+(\d{2,4})(?:\s+(.*))?$/.exec(upper)
  if (dayMatch) {
    const month = MONTHS.indexOf(dayMatch[2])
    const day = Number(dayMatch[1])
    if (month < 0 || day < 1 || day > 31) return null
    const year = fullYear(dayMatch[3])
    const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec((dayMatch[4] ?? '').trim())
    if (time) {
      const hours = Number(time[1])
      const minutes = Number(time[2])
      const seconds = time[3] ? Number(time[3]) : 0
      if (hours <= 23 && minutes <= 59 && seconds <= 59) {
        return { ms: Date.UTC(year, month, day, hours, minutes, seconds), precision: time[3] ? 'SECOND' : 'MINUTE' }
      }
    }
    return { ms: Date.UTC(year, month, day), precision: 'DAY' }
  }

  const monthMatch = /^([A-Z]{3})\s+(\d{2,4})$/.exec(upper)
  if (monthMatch) {
    const month = MONTHS.indexOf(monthMatch[1])
    if (month < 0) return null
    return { ms: Date.UTC(fullYear(monthMatch[2]), month, 1), precision: 'MONTH' }
  }

  const yearMatch = /^(\d{4})$/.exec(upper)
  if (yearMatch) return { ms: Date.UTC(Number(yearMatch[1]), 0, 1), precision: 'YEAR' }

  return null
}

const PRECISION_RANK: Record<TimePrecision, number> = { YEAR: 0, MONTH: 1, DAY: 2, MINUTE: 3, SECOND: 4 }

export function captureTimeOf(artifact: CaseArtifact): CaptureTime | null {
  return parseCaptureTime(timestampOf(artifact))
}

export interface ChronologyEntry {
  artifact: CaseArtifact
  time: CaptureTime | null
}

/**
 * Order records by when the recorded event happened. Ties break coarse before
 * fine (a day-level stamp reads as the start of that day), then by code, so
 * the order is total and stable.
 */
export function chronology(artifacts: readonly CaseArtifact[]): ChronologyEntry[] {
  return artifacts
    .map(artifact => ({ artifact, time: captureTimeOf(artifact) }))
    .sort((a, b) => {
      if (a.time && b.time) {
        return a.time.ms - b.time.ms
          || PRECISION_RANK[a.time.precision] - PRECISION_RANK[b.time.precision]
          || a.artifact.code.localeCompare(b.artifact.code)
      }
      if (a.time) return -1
      if (b.time) return 1
      return a.artifact.code.localeCompare(b.artifact.code)
    })
}

export function sortChronologically(artifacts: readonly CaseArtifact[]): CaseArtifact[] {
  return chronology(artifacts).map(entry => entry.artifact)
}

/* ───────────────────────────────── series ───────────────────────────────── */

export interface EvidenceSeries {
  id: string
  medium: ArtifactType
  /** The shared source, without its position suffix: "DVR NODE B-04". */
  source: string
  /** Member codes, in chronological order. */
  members: string[]
  /** Position label inside the series where the source names one: code → "TAPE 7". */
  units: Record<string, string>
}

export function sourceOf(artifact: CaseArtifact): string | null {
  return contentString(artifact.content, ['source'])
}

/** "DVR NODE B-04 / TAPE 7" → { base: "DVR NODE B-04", unit: "TAPE 7" }. */
export function splitSource(source: string): { base: string; unit: string | null } {
  const [head, ...rest] = source.toUpperCase().split(/\s+\/\s+/)
  const tail = rest.join(' / ')
  const unit = /^(TAPE|VOL|VOLUME)\s*\d+$/.exec(tail.trim())
  return { base: head.trim(), unit: unit ? tail.trim() : null }
}

/**
 * Group records by medium and shared source. A group of one is not a series.
 * Only recovered evidence takes part; inventory objects and fragments held in
 * the team's index carry no source of their own.
 */
export function deriveSeries(artifacts: readonly CaseArtifact[]): EvidenceSeries[] {
  const groups = new Map<string, { medium: ArtifactType; source: string; items: CaseArtifact[]; units: Record<string, string> }>()
  for (const artifact of artifacts) {
    if (artifact.source !== 'EVIDENCE') continue
    const raw = sourceOf(artifact)
    if (!raw) continue
    const { base, unit } = splitSource(raw)
    const medium = artifactType(artifact)
    const id = `${medium}:${base}`
    const group = groups.get(id) ?? { medium, source: base, items: [], units: {} }
    group.items.push(artifact)
    if (unit) group.units[artifact.code] = unit
    groups.set(id, group)
  }
  return Array.from(groups.entries())
    .filter(([, group]) => group.items.length >= 2)
    .map(([id, group]) => ({
      id,
      medium: group.medium,
      source: group.source,
      members: sortChronologically(group.items).map(item => item.code),
      units: group.units,
    }))
    .sort((a, b) => b.members.length - a.members.length || a.id.localeCompare(b.id))
}

export interface SeriesPosition {
  series: EvidenceSeries
  /** 1-based place in chronological order. */
  position: number
  total: number
  unit: string | null
}

export function seriesPosition(series: readonly EvidenceSeries[], code: string): SeriesPosition | null {
  for (const entry of series) {
    const index = entry.members.indexOf(code)
    if (index >= 0) return { series: entry, position: index + 1, total: entry.members.length, unit: entry.units[code] ?? null }
  }
  return null
}
