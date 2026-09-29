/**
 * NEXUS — Player Game Hub
 * Main dashboard: progress overview, current node, quick actions.
 * Mobile-first layout with bottom-safe padding for BottomNav.
 */

import { Link } from 'react-router-dom'
import { Package, MapPin, QrCode, Trophy, ChevronRight, Clock, Target, Brain, Users, Zap } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES, ROLE_LABELS, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import { formatTimeRemaining } from '@/lib/time'

export function PlayerGame() {
  const {
    player,
    team,
    gameState,
    teamProgress,
    solvedCount,
    totalNodes,
    allNodesForMap,
  } = useGameEngine()

  if (!player || !team) {
    return null
  }

  const roleTheme = player.role && ROLE_THEMES[player.role]
  const progressPercent = totalNodes > 0 ? (solvedCount / totalNodes) * 100 : 0
  const currentNodeId = teamProgress?.currentNodeId
  const currentNode = currentNodeId
    ? allNodesForMap.find(n => n.code === currentNodeId)
    : null

  const quickActions = [
    { path: currentNodeId ? ROUTES.PLAYER_NODE.replace(':nodeId', currentNodeId) : ROUTES.PLAYER_GAME, label: 'Current Puzzle', icon: Target, primary: true, disabled: !currentNodeId },
    { path: ROUTES.PLAYER_EVIDENCE, label: 'Evidence', icon: Package, count: teamProgress?.evidenceOwned.length ?? 0 },
    { path: ROUTES.PLAYER_INVENTORY, label: 'Inventory', icon: Brain, count: Object.values(teamProgress?.inventoryOwned ?? {}).reduce((a, b) => a + b, 0) },
    { path: ROUTES.PLAYER_NAVIGATION, label: 'Navigation', icon: MapPin },
    { path: ROUTES.PLAYER_QR, label: 'QR Scanner', icon: QrCode },
    { path: ROUTES.PLAYER_LEADERBOARD, label: 'Ranking', icon: Trophy },
  ]

  return (
    <div className="page pb-[72px] md:pb-0">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Team Status Bar */}
        <div className="panel flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nexus-accentBg flex items-center justify-center">
              <span className="text-nexus-accent font-display font-bold text-xl">N</span>
            </div>
            <div>
              <p className="font-semibold text-nexus-text text-lg">{team.name}</p>
              <p className="text-xs text-nexus-textMuted font-mono">{team.code}</p>
            </div>
          </div>
          <span className={cn('badge', roleTheme?.badge)}>
            {ROLE_LABELS[player.role]}
          </span>
        </div>

        {/* Time Remaining Banner */}
        {gameState?.endsAt && (
          <div className="panel bg-nexus-warningBg/20 border border-nexus-warning/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-nexus-warning" />
                <span className="font-medium text-nexus-warning">Time Remaining</span>
              </div>
              <span className="font-mono text-lg text-nexus-warning">
                {formatTimeRemaining(gameState.endsAt)}
              </span>
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-nexus-accent" />
              <span>Investigation Progress</span>
            </h2>
            <span className="text-lg font-mono font-bold text-nexus-accent">
              {solvedCount} / {totalNodes}
            </span>
          </div>

          <div className="h-3 bg-nexus-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-nexus-accent rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-nexus-textMuted">
            <span>{Math.round(progressPercent)}% complete</span>
            {gameState?.startedAt && (
              <span>
                Elapsed: {formatElapsedTime(gameState.startedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Current Node */}
        {currentNode && (
          <Link
            to={ROUTES.PLAYER_NODE.replace(':nodeId', currentNode.code)}
            className="panel panel-hover group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-accent">ACTIVE</span>
                  <Target className="w-4 h-4 text-nexus-accent" />
                </div>
                <h3 className="heading-4 truncate">{currentNode.title}</h3>
                <p className="text-nexus-textMuted text-sm mt-1">
                  {currentNode.location}
                </p>
                <p className="text-xs text-nexus-textSubtle mt-1 font-mono">
                  Node: {currentNode.code} • Stage {currentNode.stage}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-nexus-textSubtle group-hover:text-nexus-accent transition-colors flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Available Nodes Quick Preview */}
        {allNodesForMap.filter(n => n.available && !n.solved && n.code !== currentNodeId).length > 0 && (
          <div className="panel space-y-3">
            <h3 className="heading-4 text-sm">Available Investigations</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allNodesForMap
                .filter(n => n.available && !n.solved && n.code !== currentNodeId)
                .slice(0, 5)
                .map(node => (
                  <Link
                    key={node.code}
                    to={ROUTES.PLAYER_NODE.replace(':nodeId', node.code)}
                    className="panel panel-hover flex items-center gap-3 p-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-nexus-bg flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-nexus-textSubtle group-hover:text-nexus-accent transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{node.title}</p>
                      <p className="text-xs text-nexus-textMuted">{node.location}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-nexus-textSubtle" />
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Quick Access Grid */}
        <div>
          <h2 className="heading-4 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <Link
                key={action.path}
                to={action.path}
                className={cn(
                  'panel panel-hover p-4 flex flex-col items-center gap-2 text-center',
                  action.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                  action.primary && 'col-span-2 flex-row justify-between text-left',
                )}
              >
                <action.icon
                  className={cn(
                    'w-6 h-6',
                    action.primary ? 'text-nexus-accent' : 'text-nexus-textMuted',
                  )}
                />
                <div className={cn('flex-1', action.primary && 'flex flex-col items-start')}>
                  <span className={cn('font-medium', action.primary ? 'text-lg' : 'text-sm')}>
                    {action.label}
                  </span>
                  {action.primary && currentNode && (
                    <span className="text-xs text-nexus-textSubtle mt-0.5">
                      {currentNode.location}
                    </span>
                  )}
                </div>
                {action.count !== undefined && !action.primary && action.count > 0 && (
                  <span className="badge-accent text-xs">{action.count}</span>
                )}
                {!action.primary && action.count === 0 && (
                  <span className="text-xs text-nexus-textSubtle">Empty</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Team Status */}
        <div className="panel bg-nexus-bg/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-nexus-accent" />
              <span className="font-medium text-nexus-text">Team Status</span>
            </div>
            <div className="flex items-center gap-2">
              {gameState?.status === 'RUNNING' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-nexus-accent animate-pulse" />
                  <span className="text-sm text-nexus-text">Active</span>
                </>
              ) : (
                <span className="text-sm text-nexus-textMuted">
                  {gameState?.status ?? 'Unknown'}
                </span>
              )}
            </div>
          </div>
          {teamProgress && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-xl font-mono font-bold text-nexus-accent">
                  {teamProgress.score.toLocaleString()}
                </p>
                <p className="text-xs text-nexus-textMuted">Score</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-mono font-bold text-nexus-warning">
                  {teamProgress.hintsUsed}
                </p>
                <p className="text-xs text-nexus-textMuted">Hints Used</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-mono font-bold text-nexus-info">
                  {teamProgress.evidenceOwned.length}
                </p>
                <p className="text-xs text-nexus-textMuted">Evidence</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatElapsedTime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}
