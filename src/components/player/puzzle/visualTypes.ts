/**
 * NEXUS - Puzzle visual types
 *
 * The set of `visualType` values the content actually ships, and the set the
 * frontend draws with a dedicated renderer. Kept out of the component file so
 * the registry can be checked from a test: every shipped type must be drawn,
 * not fall through to a paragraph of prose.
 */

/** Every visualType present in the seeded puzzle content. */
export const CONTENT_VISUAL_TYPES = [
  'observation',
  'spatial',
  'visual',
  'memory-recall',
  'cipher',
  'graph-network',
  'document-forensics',
  'audio',
  'binary-technical',
  'pattern',
  'puzzle',
  'dependency-tree',
  'contradiction-hunt',
  'timeline-investigation',
  'three-phone',
  'meta',
  'final-boss',
] as const

/** Types the registry draws. `identity`/`cryptogram` are accepted aliases. */
export const RENDERED_VISUAL_TYPES = [
  'observation',
  'spatial',
  'visual',
  'memory-recall',
  'identity',
  'cipher',
  'cryptogram',
  'graph-network',
  'document-forensics',
  'audio',
  'binary-technical',
  'pattern',
  'puzzle',
  'dependency-tree',
  'contradiction-hunt',
  'timeline-investigation',
  'three-phone',
  'meta',
  'final-boss',
] as const

export function isDedicatedVisualType(type?: string | null): boolean {
  if (!type) return false
  return (RENDERED_VISUAL_TYPES as readonly string[]).includes(type.toLowerCase())
}