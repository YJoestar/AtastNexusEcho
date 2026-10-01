/**
 * NEXUS ECHO — Campus Map State Hook
 *
 * Derives KnowledgeState and RealityState for each node on the map from the
 * game engine's existing progression signals. Maps engine node states to
 * the two-dimensional Knowledge × Reality model.
 */

import { useMemo } from 'react'
import { ALL_POIS, type BuildingName } from '@/content/campus'
import { BUILDINGS } from '@/content/campus'
import type {
  MapNodeState,
  KnowledgeState,
  RealityState,
  TeamMember,
} from '@/types/campus'
import type { NodeProgressEntry } from '@/types/game-engine'
import { type NarrativeLevel } from '@/lib/narrative'

/**
 * Map engine state (solved/available/current) to a KnowledgeState.
 * The player's understanding deepens as the investigation progresses.
 */
function knowledgeFromEngineState(
  solved: boolean,
  isCurrent: boolean,
  available: boolean,
  locked: boolean,
): KnowledgeState {
  if (solved) return 'VERIFIED'
  if (isCurrent) return 'INVESTIGATED'
  if (available) return 'VISITED'
  if (!locked) return 'DISCOVERED'
  return 'UNKNOWN'
}

/**
 * Map narrative level to RealityState for a building. Higher narrative levels
 * mean the institution is behaving anomalously, so some locations drift into
 * suspicious or anomalous territory. The mapping is deterministic per-building
 * so the same location is wrong in the same way each time.
 */
function realityFromNarrative(
  buildingId: BuildingName,
  narrativeLevel: NarrativeLevel,
  seed: number,
): RealityState {
  if (narrativeLevel >= 5) {
    const roll = (seed * 37 + buildingId.charCodeAt(0)) % 100
    if (roll < 20 && buildingId === 'NEXUS_CORE') return 'CONFIRMED_ANOMALY'
    if (roll < 40) return 'ANOMALOUS'
    if (roll < 65) return 'SUSPICIOUS'
    return 'NORMAL'
  }
  if (narrativeLevel >= 3) {
    const roll = (seed * 37 + buildingId.charCodeAt(0)) % 100
    if (roll < 15 && buildingId === 'NEXUS_CORE') return 'ANOMALOUS'
    if (roll < 35) return 'SUSPICIOUS'
    return 'NORMAL'
  }
  if (narrativeLevel >= 1) {
    const roll = (seed * 41 + buildingId.charCodeAt(0)) % 100
    if (roll < 8) return 'SUSPICIOUS'
    return 'NORMAL'
  }
  return 'NORMAL'
}

export interface UseCampusMapStateParams {
  solvedCodes: Set<string>
  currentNodeId: string | null
  availableNodeIds: string[]
  currentNode?: { code: string; location: string } | null
  narrativeLevel?: NarrativeLevel
  nodeProgress?: NodeProgressEntry[]
}

export function useCampusMapState(params: UseCampusMapStateParams): MapNodeState[] {
  const {
    solvedCodes,
    currentNodeId,
    availableNodeIds,
    currentNode,
    narrativeLevel = 0,
    nodeProgress = [],
  } = params

  return useMemo(() => {
    const progressByCode = new Map<string, NodeProgressEntry>()
    for (const p of nodeProgress) {
      progressByCode.set(p.nodeCode ?? p.nodeId, p)
    }

    return ALL_POIS.map(poi => {
      const solved = solvedCodes.has(poi.code)
      const isCurrent = poi.code === currentNodeId
      const available = availableNodeIds.includes(poi.code)
      const locked = !solved && !isCurrent && !available

      const knowledge = knowledgeFromEngineState(solved, isCurrent, available, locked)
      const reality = realityFromNarrative(poi.building, narrativeLevel, poi.stage * 100 + poi.code.length)

      const progressEntry = progressByCode.get(poi.code)
      const status = progressEntry?.status ?? (solved ? 'SOLVED' : locked ? 'LOCKED' : isCurrent ? 'IN_PROGRESS' : 'AVAILABLE')

      return {
        code: poi.code,
        title: poi.name,
        location: BUILDINGS[poi.building].name,
        building: poi.building,
        stage: poi.stage,
        position: poi.position,
        knowledge,
        reality,
        unlocked: !locked || solved || isCurrent,
        solved,
        isCurrent,
        available,
        status,
      } as MapNodeState
    })
  }, [solvedCodes, currentNodeId, availableNodeIds, currentNode, narrativeLevel, nodeProgress])
}

/**
 * Get team member positions for the minimap radar.
 * In production, this would come from real-time team state.
 * In QA mode, positions are derived from current progress.
 */
export function useTeamMemberPositions(
  currentNodeId: string | null,
  availableNodeIds: string[],
  solvedCodes: Set<string>,
): TeamMember[] {
  return useMemo(() => {
    const members: TeamMember[] = []

    if (currentNodeId) {
      const poi = ALL_POIS.find(p => p.code === currentNodeId)
      if (poi) {
        members.push({
          id: 'self',
          playerId: 'current',
          role: 'OBSERVER',
          displayName: 'You',
          position: poi.position,
          building: poi.building,
          isCurrent: true,
          isConnected: true,
        })
      }
    }

    const roleOrder: Array<{ role: string; displayName: string }> = [
      { role: 'ANALYST', displayName: 'Analyst' },
      { role: 'OPERATOR', displayName: 'Operator' },
    ]

    const available = availableNodeIds.filter(c => c !== currentNodeId)
    available.slice(0, 3).forEach((code, i) => {
      const poi = ALL_POIS.find(p => p.code === code)
      if (poi && i < roleOrder.length) {
        members.push({
          id: `team-${i + 1}`,
          playerId: `team-${roleOrder[i].role.toLowerCase()}`,
          role: roleOrder[i].role,
          displayName: roleOrder[i].displayName,
          position: poi.position,
          building: poi.building,
          isCurrent: false,
          isConnected: true,
        })
      }
    })

    return members
  }, [currentNodeId, availableNodeIds, solvedCodes])
}

export function getBuildingForLocation(location: string): BuildingName | null {
  const upper = location.toUpperCase()
  for (const building of Object.values(BUILDINGS)) {
    if (upper.includes(`[${building.id.replace('_', ' ')}]`) ||
        upper.includes(`[${building.id.replace('_', ' ')}]`)) {
      return building.id
    }
  }
  if (upper.includes('[ADMIN BUILDING]')) return 'ADMIN_BUILDING'
  if (upper.includes('[LIBRARY]')) return 'LIBRARY'
  if (upper.includes('[SCIENCE BUILDING]')) return 'SCIENCE_BUILDING'
  if (upper.includes('[ENGINEERING BLOCK]')) return 'ENGINEERING_BLOCK'
  if (upper.includes('[CAMPUS]')) return 'SCULPTURE_GARDEN'
  if (upper.includes('[NEXUS CORE]')) return 'NEXUS_CORE'
  return null
}

export { knowledgeFromEngineState, realityFromNarrative }
