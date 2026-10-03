/**
 * NEXUS ECHO — Case (home of the field device)
 *
 * Opening the device answers three questions in this order:
 *   1. What am I working on?        — the current lead, large, one action
 *   2. What changed?                — only real events: dispatches, updated
 *                                     records, answers held offline
 *   3. Where does the case stand?   — one ledger strip and three references
 *
 * Everything else the old home carried (score cards, a status grid, a list of
 * standing instructions, an inline map) is reachable from the bottom bar or a
 * reference link, and no longer competes with the lead.
 *
 * Reads the same engine state as before and links to the same destinations.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useGameTimer } from '@/hooks/useGameTimer'
import { useNarrative } from '@/hooks/useNarrative'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { AnomalyArtifact } from '@/components/bureau'
import { FieldLead, FieldLedger, FieldLink, IntelRow } from '@/components/player/field'

export function PlayerGame() {
  const {
    player,
    team,
    gameState,
    teamProgress,
    solvedCount,
    totalNodes,
    allNodesForMap,
    isOffline,
    queuedCount,
    unreadCount,
    notifications,
  } = useGameEngine()
  const { workspace } = useInvestigationWorkspace(team?.id)
  const timer = useGameTimer(gameState?.endsAt)

  const currentNodeId = teamProgress?.currentNodeId
  const currentNode = currentNodeId ? allNodesForMap.find(n => n.code === currentNodeId) : null

  const narrative = useNarrative({
    solvedCount,
    totalNodes,
    currentStage: currentNode?.stage ?? 0,
    totalStages: 5,
    hintsUsed: teamProgress?.hintsUsed ?? 0,
    isOffline,
    queuedCount,
    unreadCount,
  })

  const otherLeads = useMemo(
    () => allNodesForMap.filter(n => n.available && !n.solved && n.code !== currentNodeId),
    [allNodesForMap, currentNodeId],
  )

  // One cell per item in the case. When the engine has published per-node state
  // the cells are the real nodes; before that they stand for the count.
  const ledger = useMemo(() => {
    if (totalNodes <= 0) return []
    if (allNodesForMap.length === totalNodes) return allNodesForMap.map(n => n.solved)
    return Array.from({ length: totalNodes }, (_, index) => index < solvedCount)
  }, [allNodesForMap, totalNodes, solvedCount])

  if (!player || !team) return null

  const status = gameState?.status
  const updatedRecords = Object.values(workspace.revelations).filter(r => r.hasNewInfo).length
  const latestUnread = notifications?.find(n => !n.isRead)
  const timeLow = timer.isArmed && !timer.isExpired && timer.urgency !== 'normal'
  const closed = status === 'ENDED'

  return (
    <div className="page nx-wake">
      <div className="page-content mx-auto max-w-md space-y-8 pb-6 pt-2">
        {/* Where I am: one quiet line */}
        <p className="flex items-center justify-between gap-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-nexus-textSubtle">
          <span className="min-w-0 truncate">{team.name}</span>
          <span className={cn(status === 'PAUSED' && 'text-nexus-warning', status === 'RUNNING' && 'text-nexus-accent')}>
            {caseToneLabel(status)}
          </span>
        </p>

        {/* 1 — the lead */}
        <AnomalyArtifact seed={`case:${team.code}`} level={narrative.level}>
          {currentNode ? (
            <FieldLead
              eyebrow={`LEAD · STAGE ${currentNode.stage}`}
              title={currentNode.title}
              place={currentNode.location}
              note={narrative.observation}
              action={
                <Link
                  to={ROUTES.PLAYER_NODE.replace(':nodeId', currentNode.code)}
                  className="nexus-btn nexus-btn-primary flex min-h-14 w-full items-center justify-center text-sm"
                >
                  OPEN LEAD
                </Link>
              }
            />
          ) : (
            <FieldLead
              eyebrow={closed ? 'CASE CLOSED' : status === 'RUNNING' ? 'NO ACTIVE LEAD' : 'CASE NOT OPEN'}
              title={
                closed
                  ? 'The case file is closed.'
                  : status === 'RUNNING'
                    ? 'Find a marker in the field.'
                    : status === 'PAUSED'
                      ? 'The case is suspended.'
                      : 'Waiting for the case to open.'
              }
              note={narrative.observation}
              action={
                status === 'RUNNING' ? (
                  <Link to={ROUTES.PLAYER_QR} className="nexus-btn nexus-btn-primary flex min-h-14 w-full items-center justify-center text-sm">
                    SCAN MARKER
                  </Link>
                ) : null
              }
            />
          )}
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

        {/* 2 — what changed (real events only) */}
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

        {/* 3 — where the case stands */}
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
