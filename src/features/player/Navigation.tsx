/**
 * NEXUS ECHO — Player Navigation
 *
 * The field investigator's site map. A canvas-based campus overview showing
 * building footprints, POI markers encoded by KnowledgeState and RealityState,
 * and fog-of-war over unexplored locations. Clicking a marker opens the node.
 *
 * The right margin holds the investigation register — a filing-index list of
 * current, available, and locked sites, rendered as ruled rows rather than cards.
 */

import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useNarrative } from '@/hooks/useNarrative'
import { useCampusMapState, useTeamMemberPositions } from '@/hooks/useCampusMap'
import { ROUTES } from '@/app/config'
import { BureauIcons } from '@/components/bureau'
import {
  DocumentShell,
  RegisterColumn,
  RegisterList,
  RegisterRow,
  StateMarker,
  Stamp,
} from '@/components/bureau'
import { CampusMap, DynamicMinimap } from '@/components/player/map'

export function PlayerNavigation() {
  const { allNodesForMap, solvedCount, totalNodes, teamProgress, gameState } = useGameEngine()

  const solvedSet = useMemo(() => {
    const set = new Set<string>()
    for (const n of allNodesForMap) {
      if (n.solved) set.add(n.code)
    }
    return set
  }, [allNodesForMap])

  const narrative = useNarrative({
    solvedCount,
    totalNodes,
    currentStage: gameState?.currentPhase ? 0 : Math.max(...allNodesForMap.map(n => n.stage)),
    totalStages: 5,
    hintsUsed: teamProgress?.hintsUsed ?? 0,
  })

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

  const currentPlayerPos = useMemo((): [number, number] => {
    const currentNode = allNodesForMap.find(n => n.isCurrent)
    if (!currentNode) return [500, 550]
    const mapNode = mapNodes.find(n => n.code === currentNode.code)
    return mapNode ? mapNode.position : [500, 550]
  }, [allNodesForMap, mapNodes])

  const currentNodes = allNodesForMap.filter(n => n.isCurrent)
  const availableNodes = allNodesForMap.filter(n => n.available && !n.solved && !n.isCurrent)

  const navigate = useNavigate()

  // Router navigation, not `window.location.href`.
  //
  // A full document load tears down the app and re-runs session restore, the
  // game-state fetch and the node-progress fetch before showing anything: on a
  // phone that is a visible white flash and a second or two of dead screen for a
  // single tap, and it drops whatever the player had already loaded. Worse, it
  // lands mid-restore, where the app has a session but no player yet, which is
  // exactly the window in which the node screen can be reached before the team
  // has been attached. The rest of this screen already navigates with <Link>.
  const handleNodeSelect = (code: string) => {
    navigate(ROUTES.PLAYER_NODE.replace(':nodeId', code))
  }

  const handleNodeHover = (_code: string | null) => {
    // Could be used for tooltip previews
  }

  return (
    <div className="page" data-horror={narrative.level}>
      <div className="page-content max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to={ROUTES.PLAYER_GAME}
              className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text touch-target-primary"
              aria-label="Back to game"
            >
              <BureauIcons.Back className="bureau-icon w-5 h-5" />
            </Link>
            <div>
              <h1 className="heading-3">Site Map</h1>
              <p className="text-nexus-textMuted text-sm">
                {narrative.observation}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-nexus-textMuted">
              {solvedCount} / {totalNodes}
            </span>
            <Stamp variant="archived">Case 037</Stamp>
          </div>
        </div>

        {/* Campus Map + Minimap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Full Campus Map */}
          <div className="lg:col-span-2">
            <DocumentShell
              reference="Investigation Map"
              title="Campus Overview"
              subtitle={`Knowledge: ${mapNodes.filter(n => n.knowledge !== 'UNKNOWN').length} / ${mapNodes.length} sites charted`}
              stock="digital"
              footer={
                <div className="flex items-center gap-3">
                  <Stamp variant="incomplete" impressed>
                    {solvedCount} solved
                  </Stamp>
                  <span className="meta">Stage {Math.max(...mapNodes.map(n => n.stage))}</span>
                </div>
              }
            >
              <div className="h-[480px] relative">
                <CampusMap
                  nodes={mapNodes}
                  zoom={1}
                  showFog={true}
                  onNodeSelect={handleNodeSelect}
                  onNodeHover={handleNodeHover}
                />
              </div>
            </DocumentShell>
          </div>

          {/* Dynamic Minimap + Legend */}
          <div className="space-y-4">
            {/* Minimap */}
            <div className="flex justify-center">
              <DynamicMinimap
                playerPosition={currentPlayerPos}
                teamMembers={teamMembers}
                nodes={mapNodes}
                orientation="north"
                playerCentered={true}
                viewRadius={260}
                size={200}
                onNodeSelect={handleNodeSelect}
                className="border border-nexus-borderSubtle"
              />
            </div>

            {/* Legend */}
            <DocumentShell
              reference="Map Legend"
              title="Site Status"
              stock="paper"
              footer={<Stamp variant="archived">Reference</Stamp>}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <StateMarker glyph="●" tone="active" label="Discovered" />
                  <span className="text-sm text-nexus-accent">Visited / Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <StateMarker glyph="■" tone="active" label="In Progress" />
                  <span className="text-sm text-nexus-textMuted">Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <StateMarker glyph="✓" tone="active" label="Verified" />
                  <span className="text-sm text-nexus-textMuted">Solved</span>
                </div>
                <div className="flex items-center gap-2">
                  <StateMarker glyph="◦" tone="inactive" label="Locked" />
                  <span className="text-sm text-nexus-textSubtle">Unexplored</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                  Reality Status
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-nexus-inactive border border-nexus-border" aria-hidden="true" />
                    <span className="text-sm text-nexus-textSubtle">Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-nexus-warning border border-nexus-border" aria-hidden="true" />
                    <span className="text-sm text-nexus-warning">Suspicious</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-nexus-danger border border-nexus-border" aria-hidden="true" />
                    <span className="text-sm text-nexus-danger">Anomalous</span>
                  </div>
                </div>
              </div>
            </DocumentShell>

            {/* Team Radar Legend */}
            <DocumentShell
              reference="Team Radar"
              title="Contact Protocol"
              stock="digital"
              footer={<Stamp variant="incomplete">Live</Stamp>}
            >
              <div className="space-y-2">
                <RegisterRow
                  id="self"
                  label="Investigator (You)"
                  meta="White dot with facing vector"
                />
                <RegisterRow
                  id="observer"
                  label="Observer"
                  meta="Cyan contact"
                />
                <RegisterRow
                  id="analyst"
                  label="Analyst"
                  meta="Amber contact"
                />
                <RegisterRow
                  id="operator"
                  label="Operator"
                  meta="Blue contact"
                />
              </div>
            </DocumentShell>
          </div>
        </div>

        {/* Register: Available Nodes */}
        {availableNodes.length > 0 && (
          <RegisterColumn heading="Available Sites">
            <RegisterList>
              {availableNodes.slice(0, 8).map(n => (
                <Link
                  key={n.code}
                  to={ROUTES.PLAYER_NODE.replace(':nodeId', n.code)}
                  className="register-row focus-visible:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border border-nexus-accent/30 bg-nexus-accentBg flex items-center justify-center">
                      <BureauIcons.MapPin className="bureau-icon w-4 h-4 text-nexus-accent" />
                    </div>
                    <div>
                      <p className="register-label">{n.title}</p>
                      <p className="register-meta">{n.location}</p>
                    </div>
                  </div>
                  <Stamp variant="incomplete" size="xs">
                    Available
                  </Stamp>
                </Link>
              ))}
            </RegisterList>
          </RegisterColumn>
        )}

        {/* Register: Current Location */}
        {currentNodes.length > 0 && (
          <RegisterColumn heading="Current Location">
            <RegisterList>
              {currentNodes.map(n => (
                <Link
                  key={n.code}
                  to={ROUTES.PLAYER_NODE.replace(':nodeId', n.code)}
                  className="register-row register-row-selected focus-visible:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border border-nexus-accent/30 bg-nexus-accentBg flex items-center justify-center">
                      <BureauIcons.Target className="bureau-icon w-4 h-4 text-nexus-accent" />
                    </div>
                    <div>
                      <p className="register-label">{n.title}</p>
                      <p className="register-meta">
                        {n.location} • Node: {n.code}
                      </p>
                    </div>
                  </div>
                  <Stamp variant="verified" size="xs">
                    Assigned
                  </Stamp>
                </Link>
              ))}
            </RegisterList>
          </RegisterColumn>
        )}

        {/* Quick Access */}
        <RegisterColumn heading="Quick Access">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to={ROUTES.PLAYER_QR}
              className="nexus-btn nexus-btn-secondary flex items-center justify-center gap-2 touch-target-comfortable"
            >
              <BureauIcons.ScanLine className="bureau-icon w-4 h-4" />
              <span>Open Scanner</span>
            </Link>
            <Link
              to={ROUTES.PLAYER_EVIDENCE}
              className="nexus-btn nexus-btn-secondary flex items-center justify-center gap-2 touch-target-comfortable"
            >
              <BureauIcons.File className="bureau-icon w-4 h-4" />
              <span>Evidence Board</span>
            </Link>
          </div>
        </RegisterColumn>
      </div>
    </div>
  )
}
