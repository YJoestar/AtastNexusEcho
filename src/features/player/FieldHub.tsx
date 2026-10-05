/**
 * NEXUS ECHO — Field Hub
 *
 * The player's home screen. Orchestrates the current lead, available leads,
 * case ledger, and latest intel into one coherent view.
 *
 * Replaces the old `PlayerGame` component, which mixed routing, state derivation,
 * lead rendering, and team state into one screen.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGameEngine, type PlayerNodeView } from '@/hooks/useGameEngine'
import { useGameTimer } from '@/hooks/useGameTimer'
import { useNarrative } from '@/hooks/useNarrative'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { AnomalyArtifact } from '@/components/bureau'
import { FieldLead, FieldLedger, FieldLink, IntelRow, LeadSelector } from '@/components/player/field'
import { useCaseLead } from '@/hooks/useCaseLead'
import { LeadStatus } from '@/lib/investigation/lead'

export function FieldHub() {
  const {
    player,
    team,
    gameState,
    teamProgress,
    solvedCount,
    totalNodes,
    allNodesForMap,
    isOffline,
    inventory,
    queuedCount,
    unreadCount,
    notifications,
    role,
    fetchNode,
  } = useGameEngine()
  const { workspace } = useInvestigationWorkspace(team?.id)
  const timer = useGameTimer(gameState?.endsAt)

  const [leadNode, setLeadNode] = useState<PlayerNodeView | null>(null)

  const fetchNodeRef = useRef(fetchNode)
  fetchNodeRef.current = fetchNode

  const currentNodeId = teamProgress?.currentNodeId

  useEffect(() => {
    let cancelled = false
    if (!currentNodeId || !role) {
      setLeadNode(null)
      return
    }
    void fetchNodeRef
      .current(currentNodeId)
      .then(node => {
        if (!cancelled) setLeadNode(node)
      })
      .catch(() => {
        if (!cancelled) setLeadNode(null)
      })
    return () => {
      cancelled = true
    }
  }, [currentNodeId, role])

  const { lead, otherLeads, status } = useCaseLead({
    leadNode,
    allNodes: allNodesForMap,
    teamStatus: gameState?.status,
    currentNodeId,
    solvedNodes: [],
  })

  const narrative = useNarrative({
    solvedCount,
    totalNodes,
    currentStage: leadNode?.stage ?? 0,
    totalStages: 5,
    hintsUsed: teamProgress?.hintsUsed ?? 0,
    isOffline,
    queuedCount,
    unreadCount,
  })

  const ledger = useMemo(() => {
    if (totalNodes <= 0) return []
    if (allNodesForMap.length === totalNodes) return allNodesForMap.map(n => n.solved)
    return Array.from({ length: totalNodes }, (_, index) => index < solvedCount)
  }, [allNodesForMap, totalNodes, solvedCount])

  const gameStatus = gameState?.status
  const updatedRecords = Object.values(workspace.revelations).filter(r => r.hasNewInfo).length
  const latestUnread = notifications?.find(n => !n.isRead)
  const timeLow = timer.isArmed && !timer.isExpired && timer.urgency !== 'normal'
  const closed = gameStatus === 'ENDED'
  const isPaused = gameStatus === 'PAUSED'

  const pinnedEvidence = useMemo(() => {
    if (!team || !inventory) return []
    const entries = Object.entries(workspace.marks)
      .filter(([, mark]) => mark === 'IMPORTANT' || mark === 'VERIFIED')
      .map(([id]) => {
        const code = id.replace('evidence:', '')
        const item = inventory.evidence.find(e => e.code === code)
        return item ? { id: item.code, title: item.title } : null
      })
      .filter((entry): entry is { id: string; title: string } => entry !== null)
    return entries.slice(0, 3)
  }, [team, inventory, workspace.marks])

  const roleStateLabel = useMemo(() => {
    if (!role || !team) return null
    if (closed) return 'CASE CLOSED'
    if (isPaused) return 'CASE SUSPENDED'
    if (gameStatus !== 'RUNNING') return 'STANDBY'
    if (!lead) return 'AWAITING ASSIGNMENT'
    if (status === LeadStatus.ABANDONED) return 'LEAD SEALED'
    if (status === LeadStatus.PAUSED) return 'LEAD PAUSED'
    if (status === LeadStatus.COMPLETED) return 'LEAD COMPLETE'
    if (status === LeadStatus.UNBRIEFED) return 'AWAITING BRIEFING'
    return 'ACTIVE INVESTIGATION'
  }, [role, team, closed, isPaused, gameStatus, lead, status])

  const leadAction = useMemo(() => {
    if (!lead) {
      if (gameStatus === 'RUNNING') {
        return (
          <Link to={ROUTES.PLAYER_QR} className="nexus-btn nexus-btn-primary flex min-h-14 w-full items-center justify-center text-sm">
            SCAN MARKER
          </Link>
        )
      }
      return null
    }

    if (status === LeadStatus.ABANDONED) {
      return (
        <Link
          to={ROUTES.PLAYER_NODE.replace(':nodeId', lead.nodeCode)}
          className="nexus-btn nexus-btn-primary flex min-h-14 w-full items-center justify-center text-sm"
        >
          VIEW LEAD
        </Link>
      )
    }

    return (
      <Link
        to={ROUTES.PLAYER_NODE.replace(':nodeId', lead.nodeCode)}
        className="nexus-btn nexus-btn-primary flex min-h-14 w-full items-center justify-center text-sm"
      >
        WORK THIS LEAD
      </Link>
    )
  }, [lead, status, gameStatus])

  const leadTitle = useMemo(() => {
    if (!lead) {
      if (closed) return 'The case file is closed.'
      if (gameStatus === 'RUNNING') return 'Find a marker in the field.'
      if (isPaused) return 'The case is suspended.'
      return 'Waiting for the case to open.'
    }
    return lead.objective
  }, [lead, closed, gameStatus, isPaused])

  const leadEyebrow = useMemo(() => {
    if (!lead) {
      if (closed) return 'CASE CLOSED'
      if (gameStatus === 'RUNNING') return 'NO ACTIVE LEAD'
      if (isPaused) return 'CASE SUSPENDED'
      return 'CASE NOT OPEN'
    }
    return lead.eyebrow
  }, [lead, closed, gameStatus, isPaused])

  if (!player || !team) return null

  return (
    <div className="page nx-wake">
      <div className="page-content mx-auto max-w-md space-y-8 pb-6 pt-2">
        <p className="flex items-center justify-between gap-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-nexus-textSubtle">
          <span className="min-w-0 truncate">{team.name}</span>
          <span className={cn(isPaused && 'text-nexus-warning', gameStatus === 'RUNNING' && 'text-nexus-accent')}>
            {caseToneLabel(gameStatus)}
          </span>
        </p>

        {roleStateLabel && (
          <div className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            <span className="h-2 w-2 rounded-full bg-nexus-accent" aria-hidden="true" />
            <span>{roleStateLabel}</span>
            {role && <span className="text-nexus-textMuted">/ {role}</span>}
          </div>
        )}

        <AnomalyArtifact seed={`case:${team.code}`} level={narrative.level}>
          <FieldLead
            eyebrow={leadEyebrow}
            title={leadTitle}
            clue={lead?.clue ?? null}
            note={lead?.degraded ? narrative.observation : null}
            action={leadAction}
          />
        </AnomalyArtifact>

        {timeLow && (
          <p
            className={cn(
              'font-mono text-sm uppercase tracking-[0.14em]',
              timer.urgency === 'critical' ? 'text-nexus-danger' : 'text-nexus-warning',
            )}
            role="status"
          >
            ▲ {timer.formatted} REMAINING
          </p>
        )}

        {pinnedEvidence.length > 0 && (
          <section aria-label="Pinned evidence" className="space-y-2">
            <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-nexus-textSubtle">PINNED EVIDENCE</h2>
            <div className="space-y-1">
              {pinnedEvidence.map(item => (
                <Link
                  key={item.id}
                  to={ROUTES.PLAYER_EVIDENCE}
                  className="flex min-h-12 items-center justify-between border border-nexus-borderSubtle px-3 font-mono text-xs uppercase tracking-[0.12em] text-nexus-textMuted transition-colors active:bg-nexus-surfaceElevated focus-visible:outline-none"
                >
                  <span className="truncate">{item.title}</span>
                  <span className="ml-2 shrink-0 text-[0.62rem] text-nexus-accent">VIEW</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section aria-label="New information">
          <h2 className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-nexus-textSubtle">SINCE LAST CHECK</h2>
          {unreadCount === 0 && updatedRecords === 0 && queuedCount === 0 && otherLeads.length === 0 ? (
            <p className="border-y border-nexus-borderSubtle py-4 font-mono text-xs uppercase tracking-[0.12em] text-nexus-textMuted">
              NO NEW INFORMATION.
            </p>
          ) : (
            <div className="border-t border-nexus-borderSubtle">
              {unreadCount > 0 && (
                <IntelRow
                  to={ROUTES.PLAYER_NOTIFICATIONS}
                  label={unreadCount === 1 ? 'NEW DISPATCH' : 'NEW DISPATCHES'}
                  detail={latestUnread?.title}
                  count={unreadCount}
                  tone="warning"
                />
              )}
              {updatedRecords > 0 && (
                <IntelRow
                  to={ROUTES.PLAYER_EVIDENCE}
                  label={updatedRecords === 1 ? 'RECORD UPDATED' : 'RECORDS UPDATED'}
                  detail="New information in a file you hold"
                  count={updatedRecords}
                />
              )}
              {queuedCount > 0 && (
                <IntelRow
                  to={ROUTES.PLAYER_GAME}
                  label="ANSWERS HELD ON DEVICE"
                  detail="Sent automatically when the link returns"
                  count={queuedCount}
                  tone="warning"
                />
              )}
              {otherLeads.slice(0, 3).map(node => (
                <IntelRow
                  key={node.code}
                  to={ROUTES.PLAYER_NODE.replace(':nodeId', node.code)}
                  label={node.title}
                  detail={`Also open · ${node.location}`}
                />
              ))}
            </div>
          )}
        </section>

        <LeadSelector leads={otherLeads} disabled={isOffline || !!lead?.degraded} />

        <section className="space-y-4" aria-label="Case standing">
          <FieldLedger cells={ledger} closed={solvedCount} total={totalNodes} />
          <div className="flex gap-2">
            <FieldLink to={ROUTES.PLAYER_NAVIGATION} label="SITE MAP" />
            <FieldLink to={ROUTES.PLAYER_INVENTORY} label="OBJECTS" />
            <FieldLink to={ROUTES.PLAYER_LEADERBOARD} label="RECORD" />
          </div>
        </section>
      </div>
    </div>
  )
}

function caseToneLabel(status: string | undefined): string {
  switch (status) {
    case 'RUNNING':
      return 'Open'
    case 'PAUSED':
      return 'Suspended'
    case 'ENDED':
      return 'Closed'
    case 'NOT_STARTED':
      return 'Not started'
    default:
      return 'Unknown'
  }
}
