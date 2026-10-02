export type ArtifactSource = 'EVIDENCE' | 'INVENTORY' | 'FRAGMENT'

/**
 * What the artifact physically is. The medium decides how it is presented:
 * a photograph is looked at, a document is read, a recording is played, a
 * fragment is turned over in the hand.
 */
export type ArtifactType =
  | 'PHOTOGRAPH'
  | 'SURVEILLANCE'
  | 'DOCUMENT'
  | 'FRAGMENT'
  | 'MAP'
  | 'PERSONNEL'
  | 'NOTE'
  | 'AUDIO'

/** What survived. Condition is a property of the object, not of the player. */
export type ArtifactCondition =
  | 'NORMAL'
  | 'DAMAGED'
  | 'PARTIAL'
  | 'DEGRADED'
  | 'INCOMPLETE'
  | 'ANOMALOUS'
  | 'BURNED'
  | 'TORN'
  | 'FADED'
  | 'FOLDED'
  | 'STAINED'

/** Where the investigation stands with it. State is assigned, not earned. */
export type ArtifactState =
  | 'UNREVIEWED'
  | 'REVIEWED'
  | 'VERIFIED'
  | 'FLAGGED'
  | 'UNRESOLVED'
  | 'CONTRADICTED'
  | 'ANOMALOUS'

export interface ArtifactRelationship {
  to: string
  kind: string
  note: string
}

export interface CaseArtifact {
  id: string
  code: string
  title: string
  description: string
  type: string
  source: ArtifactSource
  content: Record<string, unknown>
  location: string | null
  acquiredAt: string | null
  /** Present when the artifact has generated media. */
  condition?: ArtifactCondition | string
  state?: ArtifactState | string
  imageUrl?: string | null
  thumbUrl?: string | null
  relationships?: ArtifactRelationship[]
  /** Marks a catalog that exists only in development, never in production. */
  simulation?: boolean
}

export function contentString(content: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = content[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function artifactMediaUrl(artifact: CaseArtifact, media: 'IMAGE' | 'AUDIO' | 'VIDEO'): string | null {
  const keys = media === 'IMAGE'
    ? ['image_url', 'imageUrl', 'photo_url', 'document_url', 'file_url']
    : media === 'AUDIO'
      ? ['audio_url', 'audioUrl']
      : ['video_url', 'videoUrl']
  const raw = contentString(artifact.content, keys)
  if (!raw || typeof window === 'undefined') return null
  try {
    const url = new URL(raw, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export function visibleArtifactFields(content: Record<string, unknown>): Array<[string, string]> {
  const hiddenMediaKeys = new Set([
    'image_url', 'imageUrl', 'photo_url', 'document_url', 'file_url',
    'audio_url', 'audioUrl', 'video_url', 'videoUrl',
  ])
  return Object.entries(content)
    .filter(([key, value]) => !hiddenMediaKeys.has(key) && value !== null && value !== undefined)
    .map(([key, value]) => [key.replace(/_/g, ' ').toUpperCase(), typeof value === 'string' ? value : JSON.stringify(value)] as [string, string])
}

/* ─────────────────────── normalisation over legacy data ─────────────────────── */

const TYPE_ALIASES: Array<[RegExp, ArtifactType]> = [
  [/VIDEO|SURVEILLANCE|CAMERA|RECORDER/i, 'SURVEILLANCE'],
  [/IMAGE|PHOTO|PHOTOGRAPH|FILM|FRAME/i, 'PHOTOGRAPH'],
  [/DOCUMENT|REPORT|LETTER|LEDGER|MEMO|CARD|SHEET|FORM|PRINT/i, 'DOCUMENT'],
  [/MAP|PLAN|DRAWING|PLAN|BLUEPRINT|SITE/i, 'MAP'],
  [/PERSONNEL|DOSSIER|STAFF|BIOGRAPH/i, 'PERSONNEL'],
  [/NOTE|NOTEPAD|FIELD ?BOOK|LOGBOOK|MEMO ?BOOK/i, 'NOTE'],
  [/AUDIO|RECORDING|TAPE|DICTAPHONE|TRANSCRIPT/i, 'AUDIO'],
  [/FRAGMENT|TEAR|SHRED|SCRAP/i, 'FRAGMENT'],
]

/**
 * The catalogue stores free-text types from several sources (`IMAGE`, `PHOTO`,
 * `DOCUMENT`, `PHOTOGRAPH`, `UNCLASSIFIED`). Everything downstream should ask
 * for the normalised medium instead of pattern-matching the raw string.
 */
export function artifactType(artifact: CaseArtifact): ArtifactType {
  const raw = `${artifact.type} ${artifact.code}`
  for (const [pattern, type] of TYPE_ALIASES) {
    if (pattern.test(raw)) return type
  }
  return artifact.source === 'FRAGMENT' ? 'FRAGMENT' : 'DOCUMENT'
}

/** Condition falls back to content so backend rows keep working. */
export function artifactCondition(artifact: CaseArtifact): ArtifactCondition {
  const raw = artifact.condition
    ?? contentString(artifact.content, ['condition', 'evidence_condition'])
    ?? 'NORMAL'
  return raw.toUpperCase() as ArtifactCondition
}

export function artifactState(artifact: CaseArtifact): ArtifactState {
  const raw = artifact.state
    ?? contentString(artifact.content, ['state', 'review_state'])
    ?? 'UNREVIEWED'
  return raw.toUpperCase() as ArtifactState
}

/** The strongest available image: generated media first, then backend content. */
export function artifactImageUrl(artifact: CaseArtifact): string | null {
  if (artifact.imageUrl) return artifact.imageUrl
  return artifactMediaUrl(artifact, 'IMAGE')
}

export function artifactThumbUrl(artifact: CaseArtifact): string | null {
  if (artifact.thumbUrl) return artifact.thumbUrl
  return artifactImageUrl(artifact)
}

export function isDegraded(artifact: CaseArtifact): boolean {
  return artifactCondition(artifact) !== 'NORMAL'
}

export function isFlagged(artifact: CaseArtifact): boolean {
  const state = artifactState(artifact)
  return state === 'FLAGGED' || state === 'CONTRADICTED' || state === 'ANOMALOUS'
}

/** Medium decides the reader: audio and surveillance are played, the rest are looked at. */
export function isPlayable(artifact: CaseArtifact): boolean {
  const type = artifactType(artifact)
  return type === 'AUDIO' || Boolean(artifactMediaUrl(artifact, 'AUDIO'))
}

export function isVisual(artifact: CaseArtifact): boolean {
  return Boolean(artifactImageUrl(artifact))
}
