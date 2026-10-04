/**
 * NEXUS ECHO — Evidence importance
 *
 * How much of the case leans on a record, read only from the clues the case
 * data already declares (see clues.ts). It is an authoring aid: it tells an
 * editor which records the case would lose most by changing. It is never shown
 * to players and never changes what a player discovers.
 *
 *   CRITICAL    8+ clues: a hub several lines of enquiry pass through
 *   IMPORTANT   4+ clues, or any contradiction
 *   SUPPORTING  2-3 clues
 *   BACKGROUND  0-1 clues
 */
import type { CaseArtifact } from '@/features/player/evidence/types'
import { artifactType, type ArtifactType } from '@/features/player/evidence/types'
import { deriveClues, type HiddenClue } from './clues'

export type EvidenceImportance = 'BACKGROUND' | 'SUPPORTING' | 'IMPORTANT' | 'CRITICAL'

export interface ImportanceReading {
  importance: EvidenceImportance
  clues: number
  contradictions: number
  /** Distinct media of the records this one is clued to. */
  mediaReach: number
}

export const IMPORTANCE_ORDER: readonly EvidenceImportance[] = ['BACKGROUND', 'SUPPORTING', 'IMPORTANT', 'CRITICAL']

export function importanceFor(clues: number, contradictions: number): EvidenceImportance {
  if (clues >= 8) return 'CRITICAL'
  if (clues >= 4 || contradictions >= 1) return 'IMPORTANT'
  if (clues >= 2) return 'SUPPORTING'
  return 'BACKGROUND'
}

/** One reading per record, keyed by code. */
export function evidenceImportance(
  artifacts: readonly CaseArtifact[],
  clues: readonly HiddenClue[] = deriveClues(artifacts),
): Map<string, ImportanceReading> {
  const media = new Map<string, ArtifactType>(artifacts.map(artifact => [artifact.code, artifactType(artifact)]))
  const readings = new Map<string, ImportanceReading>()
  for (const artifact of artifacts) {
    const mine = clues.filter(clue => clue.evidence.includes(artifact.code))
    const contradictions = mine.filter(clue => clue.category === 'CONTRADICTION').length
    const reach = new Set<ArtifactType>()
    for (const clue of mine) {
      const other = clue.evidence[0] === artifact.code ? clue.evidence[1] : clue.evidence[0]
      const medium = media.get(other)
      if (medium) reach.add(medium)
    }
    readings.set(artifact.code, {
      importance: importanceFor(mine.length, contradictions),
      clues: mine.length,
      contradictions,
      mediaReach: reach.size,
    })
  }
  return readings
}
