import type { CaseArtifact } from '../types'
import type { RelatedRecord } from './types'

/**
 * Records that bear on this one: its own declared relationships, records that
 * declare a relationship to it, and (for maps) records filed at the same
 * location. Every entry is a real record of the supplied catalogue.
 */
export function linkedRecordsFor(
  artifact: CaseArtifact,
  catalog: readonly CaseArtifact[],
  related: RelatedRecord[],
  includeSameLocation: boolean,
): RelatedRecord[] {
  const found = new Map<string, RelatedRecord>()
  for (const entry of related) found.set(entry.artifact.id, entry)
  const byCode = new Map(catalog.map(item => [item.code, item]))
  for (const link of artifact.relationships ?? []) {
    const other = byCode.get(link.to)
    if (other && other.id !== artifact.id && !found.has(other.id)) found.set(other.id, { artifact: other, kind: link.kind, note: link.note })
  }
  for (const other of catalog) {
    if (other.id === artifact.id || found.has(other.id)) continue
    const back = (other.relationships ?? []).find(link => link.to === artifact.code)
    if (back) found.set(other.id, { artifact: other, kind: back.kind, note: back.note })
  }
  const here = artifact.location?.trim().toUpperCase()
  if (includeSameLocation && here) {
    for (const other of catalog) {
      if (other.id === artifact.id || found.has(other.id)) continue
      if (other.location?.trim().toUpperCase() === here) found.set(other.id, { artifact: other, kind: 'SAME LOCATION', note: artifact.location ?? '' })
    }
  }
  return Array.from(found.values())
}
