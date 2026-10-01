/**
 * NEXUS — Player Navigation
 * Campus map showing discovered locations and available nodes.
 * Mobile-first layout using bureau primitives: DocumentShell, EvidenceFrame,
 * RegisterColumn, RegisterList, RegisterRow, StateMarker, Stamp, StatusMark.
 */

import { Link } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
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

export function PlayerNavigation() {
  const { allNodesForMap, solvedCount } = useGameEngine()

  const currentNodes = allNodesForMap.filter(n => n.isCurrent)
  const availableNodes = allNodesForMap.filter(n => n.available && !n.solved && !n.isCurrent)
  const lockedNodes = allNodesForMap.filter(n => n.locked)

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text touch-target-primary"
            aria-label="Back to game"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div>
            <h1 className="heading-3">Navigation</h1>
            <p className="text-nexus-textMuted text-sm">Campus locations and puzzle sites</p>
          </div>
        </div>

        {/* Location Overview */}
        <RegisterColumn heading="Investigation Map">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BureauIcons.Compass className="bureau-icon w-5 h-5 text-nexus-textSubtle" />
              <span className="text-sm text-nexus-textMuted">
                {solvedCount} / {allNodesForMap.length} sites explored
              </span>
            </div>
          </div>

          {/* Current Location */}
          {currentNodes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                Current Location
              </h3>
              {currentNodes.map(n => (
                <Link
                  key={n.code}
                  to={ROUTES.PLAYER_NODE.replace(':nodeId', n.code)}
                  className="register-row register-row-selected focus-visible:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-nexus-accent/30 bg-nexus-accentBg flex items-center justify-center">
                      <BureauIcons.Target className="bureau-icon w-5 h-5 text-nexus-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-nexus-accent">{n.title}</p>
                      <p className="text-xs text-nexus-textMuted">
                        {n.location} • Node: {n.code}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0">
                    <BureauIcons.Forward className="bureau-icon w-5 h-5 text-nexus-accent" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Available Nodes */}
          {availableNodes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                Available Sites
              </h3>
              {availableNodes.slice(0, 8).map(n => (
                <Link
                  key={n.code}
                  to={ROUTES.PLAYER_NODE.replace(':nodeId', n.code)}
                  className="register-row focus-visible:outline-none"
                >
                  <div className="w-10 h-10 border border-nexus-borderSubtle flex items-center justify-center flex-shrink-0">
                    <BureauIcons.MapPin className="bureau-icon w-5 h-5 text-nexus-textMuted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{n.title}</p>
                    <p className="text-xs text-nexus-textMuted">
                      {n.location} • Stage {n.stage}
                    </p>
                  </div>
                  <span className="shrink-0">
                    <Stamp variant="incomplete" impressed>
                      Available
                    </Stamp>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Locked Nodes */}
          {lockedNodes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                Locked Sites
              </h3>
              <RegisterList>
                {lockedNodes.slice(0, 5).map(n => (
                  <RegisterRow
                    key={n.code}
                    id={n.code}
                    label={n.title}
                    meta={`${n.location} • Node: ${n.code}`}
                  />
                ))}
              </RegisterList>
            </div>
          )}
        </RegisterColumn>

        {/* Legend */}
        <DocumentShell
          reference="Map Legend"
          title="Site Status"
          stock="paper"
          footer={<Stamp variant="archived">Reference</Stamp>}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <StateMarker glyph="●" tone="active" label="Current Location" />
              <span className="text-sm text-nexus-text">Current Location</span>
            </div>
            <div className="flex items-center gap-2">
              <StateMarker glyph="◦" tone="active" label="Available" />
              <span className="text-sm text-nexus-textMuted">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <StateMarker glyph="●" tone="active" label="Solved" />
              <span className="text-sm text-nexus-textMuted">Solved</span>
            </div>
            <div className="flex items-center gap-2">
              <StateMarker glyph="◦" tone="inactive" label="Locked" />
              <span className="text-sm text-nexus-textSubtle">Locked</span>
            </div>
          </div>
        </DocumentShell>

        {/* Quick Scan */}
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
