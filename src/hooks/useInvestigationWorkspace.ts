import { useCallback, useEffect, useState } from 'react'
import {
  emptyInvestigationWorkspace,
  readInvestigationWorkspace,
  writeInvestigationWorkspace,
  type InvestigationWorkspace,
} from '@/lib/investigationWorkspace'

interface StoredWorkspace {
  teamId: string | null
  workspace: InvestigationWorkspace
}

export function useInvestigationWorkspace(teamId: string | null | undefined) {
  const normalizedTeamId = teamId ?? null
  const [stored, setStored] = useState<StoredWorkspace>(() => ({
    teamId: normalizedTeamId,
    workspace: readInvestigationWorkspace(normalizedTeamId),
  }))

  useEffect(() => {
    if (stored.teamId !== normalizedTeamId) {
      setStored({
        teamId: normalizedTeamId,
        workspace: readInvestigationWorkspace(normalizedTeamId),
      })
    }
  }, [normalizedTeamId, stored.teamId])

  useEffect(() => {
    if (stored.teamId === normalizedTeamId) {
      writeInvestigationWorkspace(normalizedTeamId, stored.workspace)
    }
  }, [normalizedTeamId, stored])

  useEffect(() => {
    if (!normalizedTeamId || typeof window === 'undefined') return
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== `nexus_case_workspace_v1:${normalizedTeamId}`) return
      setStored({ teamId: normalizedTeamId, workspace: readInvestigationWorkspace(normalizedTeamId) })
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [normalizedTeamId])

  const updateWorkspace = useCallback((update: (current: InvestigationWorkspace) => InvestigationWorkspace) => {
    setStored(current => {
      const workspace = current.teamId === normalizedTeamId
        ? current.workspace
        : readInvestigationWorkspace(normalizedTeamId)
      return { teamId: normalizedTeamId, workspace: update(workspace) }
    })
  }, [normalizedTeamId])

  return {
    workspace: stored.teamId === normalizedTeamId ? stored.workspace : emptyInvestigationWorkspace(),
    updateWorkspace,
  }
}