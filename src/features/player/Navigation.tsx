import type { ReactNode } from 'react'
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

import { Link } from 'react-router-dom'
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
  Stamp,
} from '@/components/bureau'
import { cn } from '@/lib/utils'
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

  const handleNodeSelect = (code: string) => {
    window.location.href = ROUTES.PLAYER_NODE.replace(':nodeId', code)
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

            {/* Legend. Each marker is described by exactly one visible term.
                StateMarker keeps its label in the accessibility tree and the
                tooltip, which left sighted players reading a caption that did
                not match what the glyph meant — the marker said "Discovered"
                while the text beside it said "Visited / Available". The glyph
                and its label now agree, and both are in the DOM. */}
            <DocumentShell
              reference="Map Legend"
              title="Site status"
              stock="paper"
              titleAs="h2"
              footer={<Stamp variant="archived">Reference</Stamp>}
            >
              <ul className="nx-stack-tight">
                <LegendRow glyph="●" tone="text-nexus-accent">Assigned or available</LegendRow>
                <LegendRow glyph="■" tone="text-nexus-accent">In progress</LegendRow>
                <LegendRow glyph="✓" tone="text-nexus-accent">Verified</LegendRow>
                <LegendRow glyph="◦" tone="text-nexus-textSubtle">Not yet explored</LegendRow>
              </ul>

              <div className="mt-6 border-t border-nexus-borderSubtle pt-4">
                <h3 className="nx-eyebrow mb-3">What is happening on site</h3>
                <ul className="nx-stack-tight">
                  <LegendRow swatch="bg-nexus-inactive" tone="text-nexus-textMuted">Nothing unusual</LegendRow>
                  <LegendRow swatch="bg-nexus-warning" tone="text-nexus-warning">Something is wrong</LegendRow>
                  <LegendRow swatch="bg-nexus-danger" tone="text-nexus-danger">Cannot be explained</LegendRow>
                </ul>
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

/**
 * One legend entry: a visible marker and one visible term that means the same
 * thing. `glyph` draws a typographic marker; `swatch` draws a filled block.
 * The marker is hidden from assistive technology because the text beside it
 * already carries the meaning.
 */
function LegendRow({
  glyph,
  swatch,
  tone,
  children,
}: {
  glyph?: string
  swatch?: string
  tone: string
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-3">
      {glyph ? (
        <span className={cn('w-5 text-center font-mono text-[0.9375rem]', tone)} aria-hidden="true">
          {glyph}
        </span>
      ) : (
        <span className={cn('w-5 h-5 border border-nexus-border', swatch)} aria-hidden="true" />
      )}
      <span className="nx-body text-nexus-textMuted">{children}</span>
    </li>
  )
}
