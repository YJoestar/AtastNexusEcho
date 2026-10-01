/**
 * NEXUS ECHO — Campus Map Types
 *
 * The map is a record of two independent things the bureau keeps track of:
 *   1. What the investigators have learned (KnowledgeState)
 *   2. What is actually there (RealityState)
 *
 * A location can be KNOWN but its reality may be SUSPICIOUS — the paperwork
 * says one thing and the building says another. The map renders both, never
 * collapsing them.
 */

import type { BuildingName } from '@/content/campus'

export type KnowledgeState =
  | 'UNKNOWN'
  | 'DISCOVERED'
  | 'VISITED'
  | 'OBSERVED'
  | 'INVESTIGATED'
  | 'VERIFIED'

export type RealityState =
  | 'NORMAL'
  | 'SUSPICIOUS'
  | 'ANOMALOUS'
  | 'CONFIRMED_ANOMALY'

export const KNOWLEDGE_ORDER: KnowledgeState[] = [
  'UNKNOWN',
  'DISCOVERED',
  'VISITED',
  'OBSERVED',
  'INVESTIGATED',
  'VERIFIED',
]

export const REALITY_ORDER: RealityState[] = [
  'NORMAL',
  'SUSPICIOUS',
  'ANOMALOUS',
  'CONFIRMED_ANOMALY',
]

export const KNOWLEDGE_LABEL: Record<KnowledgeState, string> = {
  UNKNOWN: 'Unknown',
  DISCOVERED: 'Discovered',
  VISITED: 'Visited',
  OBSERVED: 'Observed',
  INVESTIGATED: 'Investigated',
  VERIFIED: 'Verified',
}

export const REALITY_LABEL: Record<RealityState, string> = {
  NORMAL: 'Normal',
  SUSPICIOUS: 'Suspicious',
  ANOMALOUS: 'Anomalous',
  CONFIRMED_ANOMALY: 'Confirmed Anomaly',
}

export const KNOWLEDGE_GLYPH: Record<KnowledgeState, string> = {
  UNKNOWN: '·',
  DISCOVERED: '◦',
  VISITED: '●',
  OBSERVED: '◉',
  INVESTIGATED: '■',
  VERIFIED: '✓',
}

export const KNOWLEDGE_COLOR: Record<KnowledgeState, string> = {
  UNKNOWN: 'text-nexus-textSubtle',
  DISCOVERED: 'text-nexus-textMuted',
  VISITED: 'text-nexus-accent',
  OBSERVED: 'text-nexus-info',
  INVESTIGATED: 'text-nexus-warning',
  VERIFIED: 'text-nexus-text',
}

export const REALITY_COLOR: Record<RealityState, string> = {
  NORMAL: 'text-nexus-textSubtle',
  SUSPICIOUS: 'text-nexus-warning',
  ANOMALOUS: 'text-nexus-danger',
  CONFIRMED_ANOMALY: 'text-nexus-danger',
}

export interface LocationState {
  knowledge: KnowledgeState
  reality: RealityState
}

export interface MapNodeState extends LocationState {
  code: string
  title: string
  location: string
  building: BuildingName
  stage: number
  /** World coordinates of this POI on the campus map. */
  position: [number, number]
  /** Whether the node is currently unlocked for the team. */
  unlocked: boolean
  /** Whether the node has been solved. */
  solved: boolean
  /** Whether the node is the team's current target. */
  isCurrent: boolean
  /** Whether the node is available but not yet current. */
  available: boolean
}

export interface TeamMember {
  id: string
  playerId: string
  role: string
  displayName: string
  position: [number, number]
  building: BuildingName
  isCurrent: boolean
  isConnected: boolean
}

export type MapOrientation = 'north' | 'player'

export interface MinimapState {
  playerPosition: [number, number]
  playerRotation: number
  orientation: MapOrientation
  zoom: number
  teamMembers: TeamMember[]
}
