/**
 * NEXUS ECHO — Evidence archive showcase model
 *
 * Pure derivation of what the showcase displays, from the catalog's real
 * fields and the repo's own clue, series and importance rules. Nothing here is
 * authored copy about a record; a value the record lacks is simply absent.
 */
import { deriveClues } from '@/lib/evidence/clues'
import { mediumFacts, type Fact } from '@/lib/evidence/facts'
import { evidenceImportance, IMPORTANCE_ORDER, type ImportanceReading } from '@/lib/evidence/importance'
import { deriveSeries, seriesPosition, type SeriesPosition } from '@/lib/evidence/series'
import {
  artifactCondition,
  artifactState,
  artifactType,
  type ArtifactType,
  type CaseArtifact,
} from '@/features/player/evidence/types'

/** The eight real media, in the order the archive audit lists them. */
export const MEDIA_ORDER: readonly ArtifactType[] = [
  'PHOTOGRAPH', 'SURVEILLANCE', 'DOCUMENT', 'FRAGMENT', 'NOTE', 'PERSONNEL', 'AUDIO', 'MAP',
]

export const MEDIA_LABEL: Record<ArtifactType, string> = {
  PHOTOGRAPH: 'PHOTOGRAPHS',
  SURVEILLANCE: 'SURVEILLANCE',
  DOCUMENT: 'DOCUMENTS',
  FRAGMENT: 'FRAGMENTS',
  NOTE: 'NOTES',
  PERSONNEL: 'PERSONNEL',
  AUDIO: 'RECORDINGS',
  MAP: 'MAPS',
}

export const REPRESENTATIVES_PER_MEDIUM = 4

export interface ShowcaseRecord {
  artifact: CaseArtifact
  type: ArtifactType
  condition: string
  state: string
  importance: ImportanceReading
  series: SeriesPosition | null
  /** Distinct other records this one is clued to. */
  related: string[]
  facts: Fact[]
}

export interface ShowcaseGroup {
  type: ArtifactType
  label: string
  /** Every record of the medium, most important first. */
  records: ShowcaseRecord[]
  /** The few shown by default. */
  representatives: ShowcaseRecord[]
  nonNormal: number
}

export interface ShowcaseModel {
  groups: ShowcaseGroup[]
  total: number
  byCode: Map<string, ShowcaseRecord>
  artifacts: CaseArtifact[]
}

const NONE: ImportanceReading = { importance: 'BACKGROUND', clues: 0, contradictions: 0, mediaReach: 0 }

export function buildShowcaseModel(artifacts: readonly CaseArtifact[]): ShowcaseModel {
  const clues = deriveClues(artifacts)
  const importance = evidenceImportance(artifacts, clues)
  const series = deriveSeries(artifacts)
  const partners = new Map<string, Set<string>>()
  for (const clue of clues) {
    const [a, b] = clue.evidence
    if (!partners.has(a)) partners.set(a, new Set())
    if (!partners.has(b)) partners.set(b, new Set())
    partners.get(a)?.add(b)
    partners.get(b)?.add(a)
  }

  const byCode = new Map<string, ShowcaseRecord>()
  const buckets = new Map<ArtifactType, ShowcaseRecord[]>()
  for (const artifact of artifacts) {
    const type = artifactType(artifact)
    const record: ShowcaseRecord = {
      artifact,
      type,
      condition: artifactCondition(artifact),
      state: artifactState(artifact),
      importance: importance.get(artifact.code) ?? NONE,
      series: seriesPosition(series, artifact.code),
      related: Array.from(partners.get(artifact.code) ?? []).sort(),
      facts: mediumFacts(artifact),
    }
    byCode.set(artifact.code, record)
    buckets.set(type, [...(buckets.get(type) ?? []), record])
  }

  const rank = (record: ShowcaseRecord) => IMPORTANCE_ORDER.indexOf(record.importance.importance)
  const groups: ShowcaseGroup[] = MEDIA_ORDER.flatMap(type => {
    const members = buckets.get(type)
    if (!members || members.length === 0) return []
    const records = [...members].sort((a, b) =>
      rank(b) - rank(a) || b.importance.clues - a.importance.clues || a.artifact.code.localeCompare(b.artifact.code))
    return [{
      type,
      label: MEDIA_LABEL[type],
      records,
      representatives: records.slice(0, REPRESENTATIVES_PER_MEDIUM),
      nonNormal: records.filter(record => record.condition !== 'NORMAL').length,
    }]
  })

  return { groups, total: artifacts.length, byCode, artifacts: [...artifacts] }
}

export interface DeepLink {
  type: ArtifactType | null
  code: string | null
}

/** `?type=SURVEILLANCE&code=CAM-07`. The code may be short or full; type may be any case. */
export function parseDeepLink(search: string): DeepLink {
  const params = new URLSearchParams(search)
  const rawType = params.get('type')?.trim().toUpperCase() ?? ''
  const type = MEDIA_ORDER.find(candidate => candidate === rawType) ?? null
  const code = params.get('code')?.trim().toUpperCase() || null
  return { type, code }
}

export function findRecord(model: ShowcaseModel, code: string | null, type: ArtifactType | null): ShowcaseRecord | null {
  if (!code) return null
  const wanted = code.toUpperCase()
  const exact = model.byCode.get(wanted)
  const match = exact ?? Array.from(model.byCode.values()).find(record => {
    const full = record.artifact.code.toUpperCase()
    return full === wanted || full.endsWith(`-${wanted}`)
  })
  if (!match) return null
  return type && match.type !== type ? null : match
}
