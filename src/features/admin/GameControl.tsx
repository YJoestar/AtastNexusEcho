/**
 * NEXUS — Admin Game Control
 *
 * Real-time game state management. Controls game-wide
 * start, pause, resume, and end. Shows live status counts.
 */

import { useEffect, useState } from 'react'
import { Play, Pause, Square, RotateCcw, Clock, Users, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime, formatTimeRemaining } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmationDialog } from '@/components/admin/ConfirmationDialog'
import { adminAPI } from '@/lib/admin'
import type { TeamStatus } from '@/types'

type GameAction = 'start' | 'pause' | 'end' | 'reset' | null

export function AdminGameControl() {
  const [actionConfirmOpen, setActionConfirmOpen] = useState<GameAction>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    gameState,
    teams,
    isLoading,
    error,
    fetchGameState,
    fetchTeams,
  } = useBureau()

  useEffect(() => {
    void fetchGameState()
    void fetchTeams()
  }, [fetchGameState, fetchTeams])

  const gameStatus = gameState?.gameStatus ?? 'NOT_STARTED'
  const statusCounts = gameState?.statusCounts ?? {}
  const config = gameState?.config ?? {}

  const getGameStateConfig = (status: string) => {
    const configs: Record<string, { icon: JSX.Element; color: string; bg: string; label: string }> = {
      NOT_STARTED: { icon: <Play className="w-6 h-6" />, color: 'text-nexus-info', bg: 'bg-nexus-infoBg/20', label: 'Not Started' },
      RUNNING: { icon: <Pause className="w-6 h-6" />, color: 'text-nexus-accent', bg: 'bg-nexus-accentBg/20', label: 'Running' },
      PAUSED: { icon: <Play className="w-6 h-6" />, color: 'text-nexus-warning', bg: 'bg-nexus-warningBg/20', label: 'Paused' },
      ENDED: { icon: <Square className="w-6 h-6" />, color: 'text-nexus-danger', bg: 'bg-nexus-dangerBg/20', label: 'Ended' },
    }
    return configs[status] ?? configs.NOT_STARTED
  }

  const stateConfig = getGameStateConfig(gameStatus)

  const deadline = config?.game_deadline as string | null
  const gameDuration = config?.game_duration_minutes as number ?? 180
  const startedAt = config?.game_started_at as string | null

  const activeTeams = teams.filter(t => t.status === 'ACTIVE').length
  const completedTeams = teams.filter(t => ['COMPLETED', 'DISQUALIFIED', 'ABANDONED'].includes(t.status)).length
  const preStartTeams = teams.filter(t => ['REGISTERED', 'FORMING', 'READY', 'WAITING'].includes(t.status)).length

  const handleSaveConfig = async () => {
    setIsSaving(true)
    setActionError(null)
    try {
      const durationMinutes = gameDuration
      await adminAPI.updateGameConfig({
        game_duration_minutes: String(durationMinutes),
      }, 'Game duration updated from Game Control')
      void fetchGameState()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save config')
    } finally {
      setIsSaving(false)
    }
  }

  const executeAction = async () => {
    if (!actionConfirmOpen) return
    setIsActionLoading(true)
    setActionError(null)

    try {
      switch (actionConfirmOpen) {
        case 'start':
          await adminAPI.startGame('Game started by Bureau')
          break
        case 'pause':
          await adminAPI.pauseGame('Game paused by Bureau')
          break
        case 'end':
          await adminAPI.endGame('Game ended by Bureau')
          break
        case 'reset':
          await adminAPI.resetGame('Game reset by Bureau')
          break
      }
      void fetchGameState()
      void fetchTeams()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setIsActionLoading(false)
      setActionConfirmOpen(null)
    }
  }

  const getConfirmTitle = (action: GameAction) => {
    switch (action) {
      case 'start': return 'Start Game'
      case 'pause': return 'Pause Game'
      case 'end': return 'End Game'
      case 'reset': return 'Reset Game'
      default: return ''
    }
  }

  const getConfirmMessage = (action: GameAction) => {
    switch (action) {
      case 'start':
        return `Start the game for all ${preStartTeams} pre-start team(s)? The game timer will begin for all teams.`
      case 'pause':
        return `Pause the game for all ${activeTeams} active team(s)? Their timers will stop.`
      case 'end':
        return `End the game? All ${teams.filter(t => !['COMPLETED', 'DISQUALIFIED', 'ABANDONED'].includes(t.status)).length} in-progress team(s) will be marked as completed.`
      case 'reset':
        return 'Reset the game? This will clear all teams\' progression data. This cannot be undone.'
      default:
        return ''
    }
  }

  const getConfirmVariant = (action: GameAction) => {
    switch (action) {
      case 'end': return 'danger'
      case 'reset': return 'danger'
      case 'pause': return 'warning'
      default: return 'primary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="heading-2">Game Control</h1>
        <button
          onClick={() => { void fetchGameState(); void fetchTeams() }}
          disabled={isLoading}
          className="btn-secondary text-xs py-1.5"
        >
          <RotateCcw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error */}
      {(error || actionError) && (
        <div className="p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 text-nexus-danger text-sm animate-slide-down">
          {actionError ?? error}
        </div>
      )}

      {/* Game Status Card */}
      <div className={cn(
        'panel border',
        stateConfig.bg,
        `border-${stateConfig.color.replace('text-', '')}/30`,
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {stateConfig.icon}
            <div>
              <p className="text-sm text-nexus-textMuted">Game Status</p>
              <p className={cn('font-display font-bold text-2xl', stateConfig.color)}>
                {stateConfig.label}
              </p>
            </div>
          </div>
          <div className="text-right">
            {gameStatus === 'RUNNING' && deadline && (
              <div className="text-right">
                <p className="text-sm text-nexus-textMuted">Time Remaining</p>
                <p className="font-display font-bold text-xl text-nexus-warning">
                  {formatTimeRemaining(deadline)}
                </p>
              </div>
            )}
            {startedAt && (
              <p className="text-sm text-nexus-textSubtle mt-1">
                Started: {formatDateTime(startedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Game Timer */}
      <div className="panel">
        <h2 className="heading-3 mb-4">Game Timer</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TimerCard label="Started" value={startedAt ? formatDateTime(startedAt) : '—'} icon={<Clock className="w-5 h-5 text-nexus-info" />} color="text-nexus-info" />
          <TimerCard label="Deadline" value={deadline ? formatDateTime(deadline) : '—'} icon={<Square className="w-5 h-5 text-nexus-danger" />} color="text-nexus-danger" />
          <TimerCard label="Duration" value={`${gameDuration} min`} icon={<Clock className="w-5 h-5 text-nexus-info" />} color="text-nexus-info" />
          <TimerCard label="Total Teams" value={String(teams.length)} icon={<Users className="w-5 h-5 text-nexus-accent" />} color="text-nexus-accent" />
        </div>
      </div>

      {/* Status Counts */}
      <div className="panel">
        <h2 className="heading-3 mb-4">Team Status Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <StatusCountCard
              key={status}
              status={status}
              count={count as number}
            />
          ))}
        </div>
      </div>

      {/* Game Configuration */}
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-3">Game Configuration</h2>
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin text-nexus-info" />
          ) : (
            <button
              onClick={handleSaveConfig}
              className="btn-secondary text-xs py-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Config</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <ConfigItem label="Max Teams" value={String(config?.max_teams ?? 25)} />
          <ConfigItem label="Players/Team" value={String(config?.players_per_team ?? 3)} />
          <ConfigItem label="Game Duration" value={`${gameDuration} min`} />
          <ConfigItem label="Rolling Start" value={`${config?.rolling_start_interval_minutes ?? 10} min`} />
          <ConfigItem label="Auto Assign Roles" value={config?.auto_assign_roles ? 'Yes' : 'No'} />
          <ConfigItem label="Require All Roles" value={config?.require_all_roles ? 'Yes' : 'No'} />
        </div>
      </div>

      {/* Game Actions */}
      <div className="panel">
        <h2 className="heading-3 mb-4">Game Lifecycle Actions</h2>
        <div className="flex flex-wrap gap-3">
          {gameStatus === 'NOT_STARTED' && (
            <button
              onClick={() => setActionConfirmOpen('start')}
              disabled={isActionLoading || preStartTeams === 0}
              className="btn-primary"
            >
              <Play className="w-4 h-4" />
              Start Game
            </button>
          )}
          {gameStatus === 'RUNNING' && (
            <>
              <button
                onClick={() => setActionConfirmOpen('pause')}
                disabled={isActionLoading || activeTeams === 0}
                className="btn-warning"
              >
                <Pause className="w-4 h-4" />
                Pause Game
              </button>
              {completedTeams === teams.length && (
                <button
                  onClick={() => setActionConfirmOpen('end')}
                  disabled={isActionLoading}
                  className="btn-danger"
                >
                  <Square className="w-4 h-4" />
                  End Game
                </button>
              )}
            </>
          )}
          {gameStatus === 'PAUSED' && (
            <button
              onClick={() => setActionConfirmOpen('reset')}
              disabled={isActionLoading}
              className="btn-primary"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Game</span>
            </button>
          )}
          {gameStatus === 'ENDED' && (
            <button
              onClick={() => setActionConfirmOpen('reset')}
              disabled={isActionLoading}
              className="btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Game
            </button>
          )}
        </div>
        <p className="text-xs text-nexus-textSubtle mt-3">
          {gameStatus === 'NOT_STARTED'
            ? `Start the game to begin the team timer for ${preStartTeams} team(s).`
            : gameStatus === 'RUNNING'
            ? `Game is live. ${activeTeams} teams currently playing.`
            : gameStatus === 'PAUSED'
            ? 'Game is paused. Reset to restart all teams.'
            : 'Game has ended. All teams are finalized.'}
        </p>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!actionConfirmOpen}
        onClose={() => setActionConfirmOpen(null)}
        title={getConfirmTitle(actionConfirmOpen)}
        confirmAction={{
          label: actionConfirmOpen === 'reset' ? 'RESET GAME' : actionConfirmOpen === 'end' ? 'END GAME' : actionConfirmOpen === 'pause' ? 'PAUSE GAME' : 'START GAME',
          variant: getConfirmVariant(actionConfirmOpen),
          loading: isActionLoading,
        }}
        onConfirm={executeAction}
        danger={actionConfirmOpen === 'end' || actionConfirmOpen === 'reset'}
      >
        <p>{actionConfirmOpen ? getConfirmMessage(actionConfirmOpen) : ''}</p>
      </ConfirmationDialog>
    </div>
  )
}

function TimerCard({ label, value, icon, color }: {
  label: string
  value: string
  icon: JSX.Element
  color: string
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-nexus-bg rounded-xl border border-nexus-border">
      {icon}
      <div>
        <p className="text-xs text-nexus-textSubtle">{label}</p>
        <p className={cn('font-mono font-medium', color)}>{value}</p>
      </div>
    </div>
  )
}

function StatusCountCard({ status, count }: {
  status: string
  count: number
}) {
  const statusColors: Record<string, { text: string; bg: string }> = {
    REGISTERED: { text: 'text-neutral-300', bg: 'bg-neutral-900/40' },
    FORMING: { text: 'text-blue-300', bg: 'bg-blue-900/40' },
    READY: { text: 'text-cyan-300', bg: 'bg-cyan-900/40' },
    WAITING: { text: 'text-yellow-300', bg: 'bg-yellow-900/40' },
    ACTIVE: { text: 'text-emerald-300', bg: 'bg-emerald-900/40' },
    PAUSED: { text: 'text-blue-300', bg: 'bg-blue-900/40' },
    COMPLETED: { text: 'text-purple-300', bg: 'bg-purple-900/40' },
    DISQUALIFIED: { text: 'text-red-300', bg: 'bg-red-900/40' },
    ABANDONED: { text: 'text-gray-300', bg: 'bg-gray-900/40' },
    RESET: { text: 'text-neutral-400', bg: 'bg-neutral-900/40' },
  }

  const style = statusColors[status] ?? { text: 'text-nexus-textMuted', bg: 'bg-nexus-borderSubtle/30' }

  return (
    <div className={cn('flex items-center gap-2 p-3 rounded-xl border border-nexus-border', style.bg, style.text)}>
      <span className="text-xs font-medium">{count}</span>
      <TeamStatusBadge status={status as TeamStatus} showDot={false} />
    </div>
  )
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-nexus-borderSubtle/50">
      <span className="text-nexus-textSubtle">{label}</span>
      <span className="font-medium text-nexus-text">{value}</span>
    </div>
  )
}
