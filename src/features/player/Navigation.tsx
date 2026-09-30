/**
 * NEXUS — Player Navigation
 * Campus map showing discovered locations and available nodes.
 * Mobile-first card list with location-based navigation guidance.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Navigation, Compass, QrCode, Target } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'

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
            className="p-2 rounded-xl text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="heading-3">Navigation</h1>
            <p className="text-nexus-textMuted text-sm">Campus locations and puzzle sites</p>
          </div>
        </div>

        {/* Location Overview */}
        <div className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-4">Investigation Map</h2>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-nexus-textSubtle" />
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
                  className="panel panel-hover flex items-center gap-3 p-4 bg-nexus-accentBg/20 border-nexus-accent/30"
                >
                  <div className="w-10 h-10 rounded-xl bg-nexus-accentBg flex items-center justify-center">
                    <Target className="w-5 h-5 text-nexus-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-nexus-accent">{n.title}</p>
                    <p className="text-xs text-nexus-textMuted">
                      {n.location} • Node: {n.code}
                    </p>
                  </div>
                  <Navigation className="w-5 h-5 text-nexus-accent" />
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
                  className="panel panel-hover flex items-center gap-3 p-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-nexus-surfaceElevated flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-nexus-textMuted group-hover:text-nexus-accent transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{n.title}</p>
                    <p className="text-xs text-nexus-textMuted">
                      {n.location} • Stage {n.stage}
                    </p>
                  </div>
                  <span className="badge badge-neutral text-xs">
                    Available
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
              {lockedNodes.slice(0, 5).map(n => (
                <div
                  key={n.code}
                  className="panel flex items-center gap-3 p-3 opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-nexus-bg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-nexus-textSubtle" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-nexus-textSubtle">{n.title}</p>
                    <p className="text-xs text-nexus-textSubtle">
                      {n.location} • Node: {n.code}
                    </p>
                  </div>
                  <span className="badge-neutral text-xs">Locked</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="panel space-y-3">
          <h3 className="heading-4 text-sm">Site Status</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-nexus-accent" />
              <span className="text-sm text-nexus-text">Current Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-nexus-textMuted" />
              <span className="text-sm text-nexus-textMuted">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-nexus-accent" />
              <span className="text-sm text-nexus-textMuted">Solved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-nexus-borderSubtle" />
              <span className="text-sm text-nexus-textSubtle">Locked</span>
            </div>
          </div>
        </div>

        {/* Quick Scan */}
        <div className="panel">
          <h3 className="heading-4 mb-3 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-nexus-accent" />
            <span>Quick Access</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to={ROUTES.PLAYER_QR}
              className="btn-secondary flex items-center justify-center gap-2 touch-target-comfortable"
            >
              <QrCode className="w-4 h-4" />
              <span>Open Scanner</span>
            </Link>
            <Link
              to={ROUTES.PLAYER_EVIDENCE}
              className="btn-secondary flex items-center justify-center gap-2 touch-target-comfortable"
            >
              <MapPin className="w-4 h-4" />
              <span>Evidence Board</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
