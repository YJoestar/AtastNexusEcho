/**
 * NEXUS ECHO — Per-medium facts strip
 *
 * The few fields that matter for reading each medium, taken verbatim from the
 * record's own content. A field the record does not carry is omitted; nothing
 * is filled in. Which fields lead is a presentation choice, the values are not.
 */
import type { CaseArtifact } from '@/features/player/evidence/types'
import { artifactType, contentString, type ArtifactType } from '@/features/player/evidence/types'

export interface Fact {
  label: string
  value: string
}

type FactSpec = Array<[label: string, keys: string[]]>

const CAPTURED = ['captured_at', 'capturedAt', 'timestamp']

const SPECS: Record<ArtifactType, FactSpec> = {
  PHOTOGRAPH: [['CAMERA', ['device']], ['TAKEN', CAPTURED], ['INTEGRITY', ['integrity']]],
  SURVEILLANCE: [['CAMERA', ['device']], ['FRAME TIME', CAPTURED], ['SIGNAL', ['integrity']]],
  AUDIO: [['LENGTH', ['duration']], ['RECORDER', ['device']], ['RECORDED', CAPTURED]],
  DOCUMENT: [['FORM', ['device']], ['DATED', CAPTURED], ['ORIGIN', ['source']]],
  FRAGMENT: [['MATERIAL', ['device']], ['FOUND AT', ['location']], ['INTEGRITY', ['integrity']]],
  MAP: [['SHEET', ['device']], ['DRAWN', CAPTURED], ['INTEGRITY', ['integrity']]],
  PERSONNEL: [['FORM', ['device']], ['FILED', CAPTURED], ['STATUS', ['integrity']]],
  NOTE: [['WRITTEN IN', ['device']], ['DATED', CAPTURED], ['HAND', ['source']]],
}

export function mediumFacts(artifact: CaseArtifact): Fact[] {
  const facts: Fact[] = []
  for (const [label, keys] of SPECS[artifactType(artifact)]) {
    const value = contentString(artifact.content, keys)
    if (value) facts.push({ label, value })
  }
  return facts
}
