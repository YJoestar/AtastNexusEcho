import { useMemo } from 'react'
import type { PlayerNodeView } from '@/hooks/useGameEngine'
import { buildCaseLead, type CaseLead, type LeadStatus } from '@/lib/investigation/lead'

export interface MapNodeEntry {
  code: string
  title: string
  location: string
  stage: number
  solved: boolean
  available: boolean
  isCurrent: boolean
  locked: boolean
}

export interface UseCaseLeadResult {
  lead: CaseLead | null
  otherLeads: MapNodeEntry[]
  status: LeadStatus | null
}

export function useCaseLead({
  leadNode,
  allNodes,
  teamStatus,
  currentNodeId,
}: {
  leadNode: PlayerNodeView | null
  allNodes: MapNodeEntry[]
  teamStatus?: string
  currentNodeId?: string | null
}): UseCaseLeadResult {
  const lead = useMemo(
    () => buildCaseLead(leadNode, teamStatus),
    [leadNode, teamStatus],
  )

  const status = lead?.status ?? null

  const otherLeads = useMemo(
    () =>
      // `allNodes` entries already carry `solved`, so filtering on it here is
      // enough. A former `solvedNodes: string[]` parameter was removed: the only
      // caller passed a hardcoded `[]`, so the extra `includes` test could never
      // fire and merely implied a filter that was not in fact applied.
      allNodes.filter(
        n => n.available && !n.solved && n.code !== currentNodeId,
      ),
    [allNodes, currentNodeId],
  )

  return { lead, otherLeads, status }
}
