/**
 * NEXUS - Puzzle payload readers
 *
 * The server hands each role a `visualType` and an `interactiveData` bag. The
 * bag is untyped JSONB, so every renderer has to read defensively: a node may
 * declare a field its renderer does not expect, or declare none at all.
 *
 * SECURITY: nothing here reads `intermediateOutput`, `acceptedAnswer` or
 * `fullSolution`. Renderers only ever receive the requesting role's own
 * redacted block.
 */

export type InteractiveData = Record<string, unknown> | null | undefined

export function readString(data: InteractiveData, key: string): string | undefined {
  const value = data?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function readBoolean(data: InteractiveData, key: string): boolean {
  return data?.[key] === true
}

export function readStringArray(data: InteractiveData, key: string): string[] {
  const value = data?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export interface DataEntry {
  source: string
  text: string
  flag: boolean
}

export function readEntries(data: InteractiveData, key = 'entries'): DataEntry[] {
  const value = data?.[key]
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map(entry => ({
      source: typeof entry.source === 'string' ? entry.source : 'Source',
      text: typeof entry.text === 'string' ? entry.text : '',
      flag: entry.flag === true,
    }))
}

export interface GraphNode {
  label: string
  pos: number
}

export interface AudioClip {
  speaker: string
  voice: string
  file: string
}

export function readAudioClips(data: InteractiveData, key = 'audioClips'): AudioClip[] {
  const value = data?.[key]
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map(entry => ({
      speaker: typeof entry.speaker === 'string' ? entry.speaker : 'Unknown',
      voice: typeof entry.voice === 'string' ? entry.voice : '',
      file: typeof entry.file === 'string' ? entry.file : '',
    }))
}

export function readGraphNodes(data: InteractiveData): GraphNode[] {
  const value = data?.nodes
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry, index) => ({
      label: typeof entry.label === 'string' ? entry.label : '?',
      pos: typeof entry.pos === 'number' ? entry.pos : index + 1,
    }))
    .sort((a, b) => a.pos - b.pos)
}

/** Unicode glyphs used by the cipher/symbol family, all inside one block. */
const GLYPH_PATTERN = /[\u2300-\u2bff]/gu

/** Pull the run of glyphs out of a prose payload, e.g. "SLOTS: ⟁ ⧉ ⬡". */
export function extractGlyphs(text: string): string[] {
  return text.match(GLYPH_PATTERN) ?? []
}

/**
 * The glyph run a payload is actually about.
 *
 * Prose mixes real separators with a symbol sequence: "SLOTS: ⟁ ⧉ ⬡ — see the
 * wall". Splitting on every non-glyph character would reduce that to one-glyph
 * fragments, so instead the text is cut only at *words* and the segment with
 * the most glyphs wins.
 */
export function extractGlyphSequence(text: string): string[] {
  let best: string[] = []

  for (const segment of text.split(/[^\u2300-\u2bff\s]+/u)) {
    const glyphs = segment.match(GLYPH_PATTERN)
    if (glyphs && glyphs.length > best.length) best = glyphs
  }

  return best
}

/** Frequencies written as "1747 Hz" in an audio payload. */
export function extractFrequencies(text: string): number[] {
  const matches = text.matchAll(/(\d{2,5})\s*hz/gi)
  return Array.from(matches, match => Number(match[1])).filter(n => Number.isFinite(n))
}
