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
  solvedNodes,
}: {
  leadNode: PlayerNodeView | null
  allNodes: MapNodeEntry[]
  teamStatus?: string
  currentNodeId?: string | null
  solvedNodes: string[]
}): UseCaseLeadResult {
  const lead = useMemo(
    () => buildCaseLead(leadNode, teamStatus),
    [leadNode, teamStatus],
  )

  const status = lead?.status ?? null

  const otherLeads = useMemo(
    () =>
      allNodes.filter(
        n => n.available && !n.solved && n.code !== currentNodeId && !solvedNodes.includes(n.code),
      ),
    [allNodes, currentNodeId, solvedNodes],
  )

  return { lead, otherLeads, status }
}
