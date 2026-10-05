/**
 * NEXUS ECHO — Case (home of the field device)
 *
 * Deprecated: this component is now a thin route wrapper around FieldHub.
 * The field hub and lead system live in `src/features/player/FieldHub.tsx`.
 */

import { FieldHub } from '@/features/player/FieldHub'

export function PlayerGame() {
  return <FieldHub />
}
