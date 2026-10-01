/**
 * NEXUS ECHO — Narrative Hooks
 *
 * Thin React bindings over the pure narrative layer. These deliberately hold no
 * state of their own: the narrative level is a function of game state, so it is
 * recomputed whenever that state changes and cannot drift out of sync.
 */

import { useMemo } from 'react'
import {
  createSignals,
  deriveNarrativeState,
  resolveArtifactAnomaly,
  type ArtifactAnomaly,
  type NarrativeLevel,
  type NarrativeSignals,
  type NarrativeState,
} from '@/lib/narrative'

/** The current narrative state, given whatever the calling shell knows. */
export function useNarrative(signals: Partial<NarrativeSignals>): NarrativeState {
  const {
    solvedCount,
    totalNodes,
    currentStage,
    totalStages,
    attempts,
    hintsUsed,
    isOffline,
    queuedCount,
    unreadCount,
    observedAnomalies,
  } = signals

  return useMemo(
    () =>
      deriveNarrativeState(
        createSignals({
          solvedCount,
          totalNodes,
          currentStage,
          totalStages,
          attempts,
          hintsUsed,
          isOffline,
          queuedCount,
          unreadCount,
          observedAnomalies,
        })
      ),
    [
      solvedCount,
      totalNodes,
      currentStage,
      totalStages,
      attempts,
      hintsUsed,
      isOffline,
      queuedCount,
      unreadCount,
      observedAnomalies,
    ]
  )
}

/**
 * Whether one artifact is anomalous, for a given narrative level. Stable across
 * renders because the decision is a pure function of the seed.
 */
export function useArtifactAnomaly(seed: string, level: NarrativeLevel): ArtifactAnomaly {
  return useMemo(() => resolveArtifactAnomaly(seed, level), [seed, level])
}

/**
 * The attribute a shell sets to select the palette drain. Exposed as a constant
 * so the attribute name is written once.
 */
export const HORROR_ATTRIBUTE = 'data-horror' as const