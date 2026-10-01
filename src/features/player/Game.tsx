/**
 * NEXUS ECHO — Player Case Hub
 *
 * The player's home screen is the front of their case file, not a dashboard.
 * Everything on it is something a dossier would carry: who you are, what you
 * have done, what is assigned to you now, and what else is waiting.
 *
 * Behaviour is unchanged — this reads the same engine state as before and links
 * to the same destinations.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useGameTimer } from '@/hooks/useGameTimer'
import { useNarrative } from '@/hooks/useNarrative'
import { useCampusMapState, useTeamMemberPositions } from '@/hooks/useCampusMap'
import { ROUTES, ROLE_LABELS, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import {
  AnomalyArtifact,
  DocumentShell,
  Field,
  FieldGrid,
  RegisterColumn,
  RegisterList,
  RegisterRow,
  Stamp,
  StatusMark,
  type StatusTone,
} from '@/components/bureau'
import { DynamicMinimap } from '@/components/player/map'

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
  } = useGameEngine()
  const timer = useGameTimer(gameState?.endsAt)

  const hintsUsed = teamProgress?.hintsUsed ?? 0

  const currentNodeId = teamProgress?.currentNodeId
  const currentNode = currentNodeId
    ? allNodesForMap.find(n => n.code === currentNodeId)
    : null

  const narrative = useNarrative({
    solvedCount,
    totalNodes,
    currentStage: currentNode?.stage ?? 0,
    totalStages: 5,
    hintsUsed,
    isOffline,
    queuedCount,
    unreadCount,
  })

  const solvedSet = useMemo(() => {
    const set = new Set<string>()
    for (const n of allNodesForMap) {
      if (n.solved) set.add(n.code)
    }
    return set
  }, [allNodesForMap])

  const mapNodes = useCampusMapState({
    solvedCodes: solvedSet,
    currentNodeId: teamProgress?.currentNodeId ?? null,
    availableNodeIds: teamProgress?.availableNodeIds ?? [],
    narrativeLevel: narrative.level,
  })

  const teamMembers = useTeamMemberPositions(
    teamProgress?.currentNodeId ?? null,
    teamProgress?.availableNodeIds ?? [],
    solvedSet,
  )

  const currentPlayerPos = useMemo(() => {
    const mapNode = mapNodes.find(n => n.isCurrent)
    return mapNode ? mapNode.position : [500, 550] as [number, number]
  }, [mapNodes])

  const availableNodes = useMemo(
    () => allNodesForMap.filter(n => n.available && !n.solved && n.code !== currentNodeId),
    [allNodesForMap, currentNodeId]
  )

  // One cell per item in the case. When the engine has published per-node state
  // the cells are the real nodes; before that they stand for the count.
  const ledger = useMemo(() => {
    if (totalNodes <= 0) return []
    if (allNodesForMap.length === totalNodes) return allNodesForMap.map(n => n.solved)
    return Array.from({ length: totalNodes }, (_, index) => index < solvedCount)
  }, [allNodesForMap, totalNodes, solvedCount])

  if (!player || !team) {
    return null
  }

  const roleTheme = player.role && ROLE_THEMES[player.role]
  const inventoryCount = Object.values(teamProgress?.inventoryOwned ?? {}).reduce((a, b) => a + b, 0)

  const quickActions = [
    {
      path: currentNodeId ? ROUTES.PLAYER_NODE.replace(':nodeId', currentNodeId) : ROUTES.PLAYER_GAME,
      label: 'Current Puzzle',
      icon: BureauIcons.Target,
      count: undefined,
      disabled: !currentNodeId,
    },
    {
      path: ROUTES.PLAYER_EVIDENCE,
      label: 'Evidence',
      icon: BureauIcons.Package,
      count: teamProgress?.evidenceOwned.length ?? 0,
    },
    { path: ROUTES.PLAYER_INVENTORY, label: 'Inventory', icon: BureauIcons.Key, count: inventoryCount },
    { path: ROUTES.PLAYER_NAVIGATION, label: 'Navigation', icon: BureauIcons.MapPin, count: undefined },
    { path: ROUTES.PLAYER_QR, label: 'QR Scanner', icon: BureauIcons.QrCode, count: undefined },
    { path: ROUTES.PLAYER_LEADERBOARD, label: 'Ranking', icon: BureauIcons.Trophy, count: undefined },
  ]

  const caseTone: StatusTone =
    gameState?.status === 'RUNNING' ? 'active' : gameState?.status === 'PAUSED' ? 'warning' : 'neutral'

  return (
    <div className="page">
      <div className="page-content mx-auto max-w-2xl space-y-6">
        {/* Case identity */}
        <AnomalyArtifact seed={`case:${team.code}`} level={narrative.level}>
          <DocumentShell
            reference={`Case ${team.code}`}
            title={team.name}
            subtitle={
              gameState?.startedAt
                ? `Opened ${formatElapsedTime(gameState.startedAt)} ago`
                : 'Not yet opened'
            }
            classification="RESTRICTED"
            stock="digital"
            footer={
              <>
                <StatusMark tone={caseTone}>{caseToneLabel(gameState?.status)}</StatusMark>
                <span className={cn('badge', roleTheme?.badge)}>{ROLE_LABELS[player.role]}</span>
              </>
            }
          >
            <p className="body-sm text-nexus-textMuted">{narrative.observation}</p>
          </DocumentShell>
        </AnomalyArtifact>

        {/* Deadline — a filed directive, not an alarm banner */}
        {timer.isArmed && (
          <div
            className={cn(
              'bureau-document-sm flex items-center justify-between gap-3 px-4 py-3',
              timer.urgency === 'critical' && !timer.isExpired && 'border-l-2 border-l-nexus-danger',
              timer.urgency === 'low' && 'border-l-2 border-l-nexus-warning'
            )}
            role="timer"
            aria-label={`${timer.formatted} remaining`}
          >
            <span className="flex items-center gap-2">
              <BureauIcons.Clock
                className={cn(
                  'bureau-icon w-4 h-4',
                  timer.urgency === 'normal'
                    ? 'text-nexus-textMuted'
                    : timer.urgency === 'low'
                      ? 'text-nexus-warning'
                      : 'text-nexus-danger'
                )}
                aria-hidden="true"
              />
              <span className="section-label">
                {timer.isExpired ? 'Time expired' : 'Time remaining'}
              </span>
            </span>
            <span
              className={cn(
                'font-mono text-base font-semibold tabular-nums',
                timer.urgency === 'normal'
                  ? 'text-nexus-text'
                  : timer.urgency === 'low'
                    ? 'text-nexus-warning'
                    : 'text-nexus-danger'
              )}
            >
              {timer.formatted}
            </span>
          </div>
        )}

        {/* Investigation progress — a docket of the case, one cell per item */}
        <section className="panel">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="heading-4">Investigation Progress</h2>
            <span className="font-mono text-sm tabular-nums text-nexus-textMuted">
              {solvedCount} / {totalNodes}
            </span>
          </div>

          <div
            className="flex flex-wrap gap-1"
            role="img"
            aria-label={`Investigation Progress: ${solvedCount} of ${totalNodes} items closed`}
          >
            {ledger.map((closed, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={cn(
                  'h-3 w-3 border',
                  closed ? 'border-nexus-accent/60 bg-nexus-accent/60' : 'border-nexus-borderSubtle'
                )}
              />
            ))}
          </div>

          {gameState?.startedAt && (
            <p className="meta mt-3">
              Case opened {formatElapsedTime(gameState.startedAt)} ago
            </p>
          )}
        </section>

        {/* Field position — a live minimap showing where the team stands */}
        {currentPlayerPos && (
          <section className="panel">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="heading-4 flex items-center gap-2">
                <BureauIcons.Compass className="bureau-icon w-4 h-4 text-nexus-textMuted" aria-hidden="true" />
                Field Position
              </h2>
              <span className="font-mono text-sm tabular-nums text-nexus-textMuted">
                {teamMembers.filter(m => m.isConnected).length} / {teamMembers.length + 1} active
              </span>
            </div>
            <div className="flex items-center justify-center">
              <DynamicMinimap
                playerPosition={currentPlayerPos}
                teamMembers={teamMembers}
                nodes={mapNodes}
                orientation="north"
                playerCentered={true}
                viewRadius={300}
                size={180}
                onNodeSelect={code => {
                  window.location.href = ROUTES.PLAYER_NODE.replace(':nodeId', code)
                }}
              />
            </div>
            <p className="meta mt-3">
              {teamMembers.filter(m => m.isConnected).length} team contacts on scope
            </p>
          </section>
        )}

        {/* Assigned item */}
        {currentNode && (
          <Link
            to={ROUTES.PLAYER_NODE.replace(':nodeId', currentNode.code)}
            className="block focus-visible:outline-none"
          >
            <DocumentShell
              reference={`Node ${currentNode.code}`}
              title={currentNode.title}
              subtitle={currentNode.location}
              stock="paper"
              lit
              footer={
                <>
                  <Stamp variant="verified">Assigned</Stamp>
                  <span className="meta">Stage {currentNode.stage}</span>
                </>
              }
            >
              <p className="section-label">Open this item to continue</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm text-nexus-textMuted">
                <span>Proceed</span>
                <BureauIcons.Forward className="bureau-icon w-4 h-4" aria-hidden="true" />
              </span>
            </DocumentShell>
          </Link>
        )}

        {/* Open items */}
        {availableNodes.length > 0 && (
          <section className="panel">
            <h3 className="heading-4 mb-3">Available Investigations</h3>
            <RegisterList>
              {availableNodes.slice(0, 5).map(node => (
                <Link
                  key={node.code}
                  to={ROUTES.PLAYER_NODE.replace(':nodeId', node.code)}
                  className="block focus-visible:outline-none"
                >
               <RegisterRow
                     id={node.code}
                     label={node.title}
                     meta={node.location}
                     trailing={<BureauIcons.Forward className="bureau-icon w-4 h-4 text-nexus-textSubtle" aria-hidden="true" />}
                   />
                </Link>
              ))}
            </RegisterList>
          </section>
        )}

        {/* Standing instructions */}
        <section>
          <h2 className="heading-4 mb-3">Standing Instructions</h2>
          <RegisterList>
            {quickActions.map(action => (
              <Link
                key={action.path}
                to={action.path}
                aria-disabled={action.disabled || undefined}
                className={cn(
                  'register-row focus-visible:outline-none',
                  action.disabled && 'pointer-events-none opacity-50'
                )}
              >
                <action.icon className="bureau-icon w-4 h-4 shrink-0 text-nexus-textSubtle" aria-hidden="true" />
                <span className="register-main">
                  <span className="register-label block">{action.label}</span>
                </span>
                {action.count !== undefined && (
                  <span className="font-mono text-[0.6875rem] tabular-nums text-nexus-textSubtle">
                    {action.count === 0 ? 'None' : action.count}
                  </span>
                )}
              </Link>
            ))}
          </RegisterList>
        </section>

        {/* Team record */}
        <section className="panel">
          <div className="mb-3 flex items-center gap-2">
            <BureauIcons.Users className="bureau-icon w-4 h-4 text-nexus-textMuted" aria-hidden="true" />
            <h2 className="heading-4">Team Record</h2>
          </div>
          {teamProgress ? (
            <FieldGrid columns={3}>
              <Field label="Score" value={<span className="font-mono tabular-nums">{teamProgress.score.toLocaleString()}</span>} />
              <Field label="Hints drawn" value={<span className="font-mono tabular-nums">{teamProgress.hintsUsed}</span>} />
              <Field label="Evidence held" value={<span className="font-mono tabular-nums">{teamProgress.evidenceOwned.length}</span>} />
            </FieldGrid>
          ) : (
            <p className="body-sm text-nexus-textMuted">
              No record has been issued to your team yet.
            </p>
          )}
        </section>

        {/* Where the case stands */}
        <RegisterColumn heading="Case status">
          <FieldGrid columns={2}>
            <Field label="Game" value={<span className="font-mono">{caseToneLabel(gameState?.status)}</span>} />
            <Field label="Phase" value={<span className="font-mono">{gameState?.currentPhase ?? '—'}</span>} />
            <Field label="Your role" value={<span className="font-mono">{ROLE_LABELS[player.role]}</span>} />
            <Field label="Unread directives" value={<span className="font-mono tabular-nums">{unreadCount}</span>} />
          </FieldGrid>
        </RegisterColumn>
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

function formatElapsedTime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}