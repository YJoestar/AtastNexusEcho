/**
 * NEXUS ECHO — Case search
 *
 * Search is an investigative tool, not a list filter: a name, a place or a
 * reference noticed in one record is typed (or tapped) into the archive to find
 * every other record that mentions it. Each hit says WHERE the term was found,
 * so the player learns which file connects to which.
 *
 * Pure, so it is tested without a browser.
 */
import type { CaseArtifact } from '@/features/player/evidence/types'

export type SearchField =
  | 'ID' | 'TITLE' | 'LOCATION' | 'CONTENT' | 'DESCRIPTION' | 'LINKED RECORD' | 'YOUR NOTE'

export interface SearchMatch {
  field: SearchField
  /** A short excerpt around the first occurrence. */
  snippet: string
}

export interface SearchHit {
  artifact: CaseArtifact
  score: number
  matches: SearchMatch[]
}

const WEIGHT: Record<SearchField, number> = {
  ID: 6, TITLE: 5, LOCATION: 4, CONTENT: 3, DESCRIPTION: 2, 'LINKED RECORD': 2, 'YOUR NOTE': 1,
}

const MEDIA_KEYS = new Set([
  'image_url', 'imageUrl', 'photo_url', 'document_url', 'file_url',
  'audio_url', 'audioUrl', 'video_url', 'videoUrl',
])

export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).map(token => token.trim()).filter(Boolean)
}

function flatten(value: unknown, out: string[], depth = 0): void {
  if (value == null || depth > 3) return
  if (typeof value === 'string') { if (value.trim()) out.push(value.trim()) }
  else if (typeof value === 'number' || typeof value === 'boolean') out.push(String(value))
  else if (Array.isArray(value)) value.forEach(item => flatten(item, out, depth + 1))
  else if (typeof value === 'object') {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (!MEDIA_KEYS.has(key)) flatten(inner, out, depth + 1)
    }
  }
}

function excerpt(text: string, token: string): string {
  const at = text.toLowerCase().indexOf(token)
  if (at < 0) return text.slice(0, 80)
  const start = Math.max(0, at - 28)
  const end = Math.min(text.length, at + token.length + 44)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

interface Source { field: SearchField; text: string }

function sourcesFor(artifact: CaseArtifact, notes: string[]): Source[] {
  const sources: Source[] = [
    { field: 'ID', text: artifact.code },
    { field: 'TITLE', text: artifact.title },
  ]
  if (artifact.location) sources.push({ field: 'LOCATION', text: artifact.location })
  if (artifact.description) sources.push({ field: 'DESCRIPTION', text: artifact.description })
  const content: string[] = []
  flatten(artifact.content, content)
  for (const text of content) sources.push({ field: 'CONTENT', text })
  for (const link of artifact.relationships ?? []) {
    sources.push({ field: 'LINKED RECORD', text: `${link.to} ${link.note}` })
  }
  for (const text of notes) sources.push({ field: 'YOUR NOTE', text })
  return sources
}

/**
 * Every record that mentions ALL the words of `query`, best first. A word may
 * be found in different fields of the same record. An empty query returns [].
 */
export function searchArtifacts(
  artifacts: CaseArtifact[],
  query: string,
  notesFor: (artifact: CaseArtifact) => string[] = () => [],
): SearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []
  const hits: SearchHit[] = []
  for (const artifact of artifacts) {
    const sources = sourcesFor(artifact, notesFor(artifact))
    let score = 0
    const matches: SearchMatch[] = []
    let all = true
    for (const token of tokens) {
      let best: { source: Source; weight: number } | null = null
      for (const source of sources) {
        if (!source.text.toLowerCase().includes(token)) continue
        const weight = WEIGHT[source.field]
        if (!best || weight > best.weight) best = { source, weight }
      }
      if (!best) { all = false; break }
      score += best.weight
      const duplicate = matches.some(m => m.field === best!.source.field && m.snippet === excerpt(best!.source.text, token))
      if (!duplicate) matches.push({ field: best.source.field, snippet: excerpt(best.source.text, token) })
    }
    if (all) hits.push({ artifact, score, matches })
  }
  return hits.sort((a, b) => b.score - a.score || a.artifact.code.localeCompare(b.artifact.code))
}

const TRACE_KEYS = [
  'location', 'location_name', 'building', 'camera_id', 'camera', 'cam', 'device',
  'subject', 'name', 'person', 'employee', 'author', 'sender', 'recipient',
  'reference', 'control_number', 'badge', 'terminal',
]

/**
 * Terms worth chasing from one record: places, devices, people, reference
 * numbers. Short, deduplicated, and never a media URL or free prose.
 */
export function traceTerms(artifact: CaseArtifact, limit = 6): string[] {
  const found: string[] = []
  const add = (value: unknown) => {
    if (typeof value !== 'string') return
    const text = value.trim()
    if (text.length < 3 || text.length > 40 || /^https?:/i.test(text)) return
    if (!found.some(existing => existing.toLowerCase() === text.toLowerCase())) found.push(text)
  }
  // A location is often `CODE / NAME`; each half is a term in its own right.
  for (const part of (artifact.location ?? '').split(/\s+\/\s+/)) add(part)
  for (const key of TRACE_KEYS) add(artifact.content?.[key])
  return found.slice(0, limit)
}
