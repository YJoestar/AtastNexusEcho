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
import { Link, useNavigate } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useGameTimer } from '@/hooks/useGameTimer'
import { useNarrative } from '@/hooks/useNarrative'
import { useCampusMapState } from '@/hooks/useCampusMap'
import { ROUTES, ROLE_LABELS, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import {
  AnomalyArtifact,
  DocumentShell,
  Field,
  FieldGrid,
  RegisterList,
  RegisterRow,
  Stamp,
  StatusMark,
  type StatusTone,
} from '@/components/bureau'
import { CampusMap } from '@/components/player/map/CampusMap'
import { TacticalOverlay } from '@/components/visual/TacticalOverlay'

export function PlayerGame() {
  const navigate = useNavigate()
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

  const availableNodes = useMemo(
    () => allNodesForMap.filter(n => n.available && !n.solved && n.code !== currentNodeId),
    [allNodesForMap, currentNodeId]
  )

  if (!player || !team) {
    return null
  }

  const roleTheme = player.role && ROLE_THEMES[player.role]

  const caseTone: StatusTone =
    gameState?.status === 'RUNNING' ? 'active' : gameState?.status === 'PAUSED' ? 'warning' : 'neutral'

  return (
    <div className="page">
      <div className="page-content mx-auto max-w-2xl nx-stack-loose">
        {/* ---- 1. WHO YOU ARE ------------------------------------------------
            The case file itself. The only region allowed to own an h1: it is
            the thing every other region on this screen belongs to. */}
        <AnomalyArtifact seed={`case:${team.code}`} level={narrative.level}>
          <DocumentShell
            titleAs="h1"
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

        {/* ---- 2. WHAT TO DO NEXT -------------------------------------------
            Promoted above every reference surface. The map and the register
            are how a player orients; this is how the game moves, so it is the
            largest, highest-contrast, single-purpose target on the screen. */}
        <section aria-labelledby="assigned-heading">
          <div className="nx-section-head">
            <h2 id="assigned-heading" className="heading-4">
              Assigned to you
            </h2>
            {totalNodes > 0 && (
              <span className="nx-meta text-nexus-textMuted tabular-nums">
                {solvedCount} of {totalNodes} closed
              </span>
            )}
          </div>

          {currentNode ? (
            <Link
              to={ROUTES.PLAYER_NODE.replace(':nodeId', currentNode.code)}
              className="mt-4 block focus-visible:outline-none"
            >
              <DocumentShell
                reference={`Item ${currentNode.code}`}
                title={currentNode.title}
                subtitle={currentNode.location}
                stock="paper"
                lit
                className="nx-stage transition-colors duration-150 hover:border-nexus-accent"
                footer={
                  <>
                    <Stamp variant="verified">Assigned</Stamp>
                    <span className="meta">Stage {currentNode.stage}</span>
                  </>
                }
              >
                <p className="section-label">Open this item to continue</p>
                <span className="nx-action mt-5 w-full">
                  <span>Continue investigation</span>
                  <BureauIcons.Forward className="bureau-icon w-4 h-4" aria-hidden="true" />
                </span>
                {timer.isArmed && (
                  <p className="meta mt-3">
                    {timer.isExpired ? 'Session time has expired' : `${timer.formatted} remaining in session`}
                  </p>
                )}
              </DocumentShell>
            </Link>
          ) : (
            /* The empty state says what is true, and what would change it. */
            <div className="nx-empty mt-4 border border-nexus-borderSubtle">
              <BureauIcons.Target className="bureau-icon w-8 h-8 text-nexus-textSubtle" aria-hidden="true" />
              <p className="nx-empty-title">Nothing assigned right now</p>
              <p className="nx-body max-w-[44ch]">
                {availableNodes.length > 0
                  ? 'The Bureau has not handed you a specific item. Anything open below is yours to take.'
                  : 'No item is open to your team. New assignments appear here as the case moves.'}
              </p>
            </div>
          )}
        </section>

        {/* ---- 3. WHAT ELSE IS WAITING --------------------------------------
            Secondary: things you may choose, in order. Capped, because a list
            that grows without bound is what turned this screen into a
            dashboard in the first place. */}
        {availableNodes.length > 0 && (
          <section aria-labelledby="open-heading">
            <div className="nx-section-head">
              <h2 id="open-heading" className="heading-4">
                Also open
              </h2>
              <span className="nx-meta text-nexus-textMuted tabular-nums">
                {availableNodes.length} available
              </span>
            </div>
            <div className="mt-4">
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
                      trailing={
                        <BureauIcons.Forward className="bureau-icon w-4 h-4 text-nexus-textSubtle" aria-hidden="true" />
                      }
                    />
                  </Link>
                ))}
              </RegisterList>
            </div>
          </section>
        )}

        {/* ---- 4. ORIENTATION ------------------------------------------------
            Reference, not instruction. Demoted and reduced so the map supports
            the decision above it instead of competing with it. */}
        <section aria-labelledby="cartography-heading">
          <div className="nx-section-head">
            <h2 id="cartography-heading" className="heading-4">
              Field cartography
            </h2>
            <Link to={ROUTES.PLAYER_NAVIGATION} className="nx-meta text-nexus-accent hover:underline">
              Open map
            </Link>
          </div>

          <div className="mt-4 overflow-hidden border border-nexus-border bg-nexus-surfaceElevated">
            <div className="relative h-[min(30vh,240px)] min-h-[200px]">
              <CampusMap
                nodes={mapNodes}
                showFog
                onNodeSelect={code => navigate(ROUTES.PLAYER_NODE.replace(':nodeId', code))}
              />
              <TacticalOverlay nodes={mapNodes} showScaleBar={false} />
            </div>
            <p className="border-t border-nexus-border px-4 py-3 font-mono text-[0.8125rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
              North campus &middot; {solvedCount.toString().padStart(2, '0')} verified &middot;{' '}
              {availableNodes.length.toString().padStart(2, '0')} accessible
            </p>
          </div>
        </section>

        {/* ---- 5. THE CASE RECORD -------------------------------------------
            One compact strip. Role and unread count were dropped on purpose:
            both already live in the handset header, and repeating them here
            was the clearest symptom of a screen arranged as a KPI grid. */}
        <section aria-labelledby="record-heading">
          <div className="nx-section-head">
            <h2 id="record-heading" className="heading-4">
              Case record
            </h2>
          </div>
          <div className="mt-4">
            <FieldGrid columns={3}>
              <Field
                label="Score"
                value={<span className="font-mono tabular-nums">{teamProgress?.score.toLocaleString() ?? '—'}</span>}
              />
              <Field
                label="Hints drawn"
                value={<span className="font-mono tabular-nums">{hintsUsed}</span>}
              />
              <Field
                label="Evidence held"
                value={<span className="font-mono tabular-nums">{teamProgress?.evidenceOwned.length ?? 0}</span>}
              />
            </FieldGrid>
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

function formatElapsedTime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}