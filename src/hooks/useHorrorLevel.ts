/**
 * NEXUS ECHO — Narrative Horror Level Hook
 *
 * Returns the current narrative horror level (0-6) derived from the
 * game state's current phase. Used by visual effect components to
 * modulate effect intensity.
 */

import { useApp } from '@/app/providers'
import { levelFromCasePhase } from '@/lib/narrative'

export function useHorrorLevel(): number {
  const { gameState } = useApp()
  return gameState ? levelFromCasePhase(gameState.currentPhase) : 0
}
