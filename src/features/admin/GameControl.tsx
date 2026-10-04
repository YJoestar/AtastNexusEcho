/**
 * NEXUS — Operations Control Console
 *
 * Master system switches and mission execution controls.
 * Built as an operational interlock terminal.
 */

import { useEffect, useState } from 'react'
import { BureauIcons, TerminalFrame } from '@/components/bureau'
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

  const gameDuration = config?.game_duration_minutes as number ?? 180

  // The deadline is not a game_config key. `game_started_at` and `game_deadline`
  // are per-team columns on `teams` (2026092902_game_engine.sql:36-37), set when
  // each team starts. This screen read them from `config`, whose select list never
  // contained them, so the deadline rendered "— / NOT INITIALIZED" permanently
  // and the state rendered "— / OPEN" permanently, whatever the teams were doing.
  // Derived from the teams this screen already loads.
  const startedDeadlines = teams
    .map(t => t.gameDeadline)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .sort()
  const startedAtValues = teams
    .map(t => t.gameStartedAt)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .sort()

  // The earliest deadline is the one the Bureau is actually racing.
  const deadline = startedDeadlines[0] ?? null
  const startedAt = startedAtValues[0] ?? null

  const activeTeams = teams.filter(t => t.status === 'ACTIVE').length
  const preStartTeams = teams.filter(t => ['REGISTERED', 'FORMING', 'READY', 'WAITING'].includes(t.status)).length

  const handleSaveConfig = async () => {
    setIsSaving(true)
    setActionError(null)
    try {
      const durationMinutes = gameDuration
      await adminAPI.updateGameConfig({
        game_duration_minutes: String(durationMinutes),
      }, 'Game duration updated from Operations Control')
      void fetchGameState()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update system parameters')
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
          await adminAPI.startGame('Mission execution initiated from Bureau Console')
          break
        case 'pause':
          await adminAPI.pauseGame('Mission execution suspended by Operator')
          break
        case 'end':
          await adminAPI.endGame('Mission terminated by Bureau')
          break
        case 'reset':
          await adminAPI.resetGame('Master baseline reset executed')
          break
      }
      void fetchGameState()
      void fetchTeams()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Interlock rejected command')
    } finally {
      setIsActionLoading(false)
      setActionConfirmOpen(null)
    }
  }

  const getConfirmTitle = (action: GameAction) => {
    switch (action) {
      case 'start': return 'CONFIRM MISSION INITIATION'
      case 'pause': return 'CONFIRM MISSION HOLD'
      case 'end': return 'CONFIRM MISSION TERMINATION'
      case 'reset': return 'CONFIRM BASELINE RE-INITIALIZATION'
      default: return ''
    }
  }

  const getConfirmMessage = (action: GameAction) => {
    switch (action) {
      case 'start':
        return `Initiate active case operation for all ${preStartTeams} standby unit(s)? Mission countdown will begin.`
      case 'pause':
        return `Hold mission execution for ${activeTeams} active field unit(s)? Telemetry timers will be frozen.`
      case 'end':
        return `Terminate mission? All active field units (${teams.filter(t => !['COMPLETED', 'DISQUALIFIED', 'ABANDONED'].includes(t.status)).length}) will be marked completed.`
      case 'reset':
        return 'WARNING: Full baseline reset. This will wipe all field progression data and return station to standby. This cannot be undone.'
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
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-nexus-border bg-nexus-surfaceElevated p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-nexus-warning animate-pulse" />
              <span className="text-[0.625rem] tracking-[0.24em] uppercase text-nexus-textSubtle">
                NEXUS ECHO // OPERATIONS CONTROL & MASTER INTERLOCKS
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-nexus-text mt-1">
              MISSION EXECUTION CONSOLE
            </h1>
          </div>

          <button
            type="button"
            onClick={() => { void fetchGameState(); void fetchTeams() }}
            disabled={isLoading}
            className="nexus-btn-secondary text-xs px-3 py-1.5"
          >
            <BureauIcons.RotateCcw className={cn('bureau-icon w-3.5 h-3.5', isLoading && 'animate-spin')} />
            <span>[ POLL STATUS ]</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {(error || actionError) && (
        <div className="p-3 bg-nexus-dangerBg/30 border border-nexus-danger text-nexus-danger text-xs flex items-center gap-2">
          <BureauIcons.AlertTriangle className="bureau-icon w-4 h-4 shrink-0" />
          <span>INTERLOCK ALERT: {actionError ?? error}</span>
        </div>
      )}

      {/* Grid: Master Interlocks + System Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Master Execution Switches */}
        <TerminalFrame title="MASTER EXECUTION CONTROLS" reference="SAFETY INTERLOCK" variant="monitor">
          <div className="space-y-4 p-2">
            <div className="flex items-center justify-between border-b border-nexus-border pb-3">
              <div>
                <span className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle block">
                  CURRENT SYSTEM STATE
                </span>
                <span className={cn(
                  'text-lg font-bold uppercase tracking-[0.14em]',
                  gameStatus === 'RUNNING' && 'text-nexus-accent',
                  gameStatus === 'PAUSED' && 'text-nexus-warning',
                  gameStatus === 'ENDED' && 'text-nexus-danger',
                  gameStatus === 'NOT_STARTED' && 'text-nexus-textMuted',
                )}>
                  [ {gameStatus.replace(/_/g, ' ')} ]
                </span>
              </div>

              {gameStatus === 'RUNNING' && deadline && (
                <div className="text-right">
                  <span className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle block">
                    MISSION CLOCK
                  </span>
                  <span className="text-lg font-bold text-nexus-warning">
                    {formatTimeRemaining(deadline)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {gameStatus === 'NOT_STARTED' && (
                <button
                  type="button"
                  onClick={() => setActionConfirmOpen('start')}
                  disabled={isActionLoading || preStartTeams === 0}
                  className="w-full py-2.5 px-4 bg-nexus-text text-nexus-bg font-bold text-xs uppercase tracking-[0.18em] hover:bg-nexus-textMuted disabled:opacity-40 transition-colors"
                >
                  [ INITIATE MISSION / DEPLOY ALL STANDBY UNITS ]
                </button>
              )}

              {gameStatus === 'RUNNING' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionConfirmOpen('pause')}
                    disabled={isActionLoading || activeTeams === 0}
                    className="py-2.5 px-3 border border-nexus-warning text-nexus-warning bg-nexus-warningBg/20 font-bold text-xs uppercase tracking-[0.14em] hover:bg-nexus-warningBg/50 disabled:opacity-40 transition-colors"
                  >
                    [ HOLD MISSION ]
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionConfirmOpen('end')}
                    disabled={isActionLoading}
                    className="py-2.5 px-3 border border-nexus-danger text-nexus-danger bg-nexus-dangerBg/20 font-bold text-xs uppercase tracking-[0.14em] hover:bg-nexus-dangerBg/50 disabled:opacity-40 transition-colors"
                  >
                    [ TERMINATE MISSION ]
                  </button>
                </div>
              )}

              {(gameStatus === 'PAUSED' || gameStatus === 'ENDED') && (
                <button
                  type="button"
                  onClick={() => setActionConfirmOpen('reset')}
                  disabled={isActionLoading}
                  className="w-full py-2.5 px-4 border border-nexus-danger text-nexus-danger bg-nexus-dangerBg/20 font-bold text-xs uppercase tracking-[0.18em] hover:bg-nexus-dangerBg/50 transition-colors"
                >
                  [ RETURN SYSTEM TO BASELINE / HARD RESET ]
                </button>
              )}
            </div>

            <p className="text-[0.625rem] text-nexus-textSubtle leading-relaxed">
              {gameStatus === 'NOT_STARTED'
                ? `Ready to arm. ${preStartTeams} field unit(s) waiting for deployment.`
                : gameStatus === 'RUNNING'
                ? `Operation is active across ${activeTeams} field unit(s). Unit progress remains recorded in the case ledger.`
                : gameStatus === 'PAUSED'
                ? 'Operation suspended. Reset system to return parameters to baseline.'
                : 'Operation ended. All field registers preserved.'}
            </p>
          </div>
        </TerminalFrame>

        {/* Telemetry & Clocks */}
        <TerminalFrame title="TELEMETRY READOUTS" reference="STATION CHRONO" variant="system">
          <div className="p-2 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-nexus-border bg-nexus-bg p-2.5">
                <span className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle block">
                  MISSION INITIATED
                </span>
                <span className="text-nexus-text font-bold block mt-1">
                  {startedAt ? formatDateTime(startedAt) : '— / NOT INITIALIZED'}
                </span>
              </div>

              <div className="border border-nexus-border bg-nexus-bg p-2.5">
                <span className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle block">
                  TARGET DEADLINE
                </span>
                <span className="text-nexus-warning font-bold block mt-1">
                  {deadline ? formatDateTime(deadline) : '— / OPEN'}
                </span>
              </div>

              <div className="border border-nexus-border bg-nexus-bg p-2.5">
                <span className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle block">
                  ALLOCATED DURATION
                </span>
                <span className="text-nexus-text font-bold block mt-1">
                  {gameDuration} MINUTES
                </span>
              </div>

              <div className="border border-nexus-border bg-nexus-bg p-2.5">
                <span className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle block">
                  REGISTERED UNITS
                </span>
                <span className="text-nexus-accent font-bold block mt-1">
                  {teams.length} UNITS
                </span>
              </div>
            </div>
          </div>
        </TerminalFrame>
      </div>

      {/* Status Distribution Grid */}
      <TerminalFrame title="UNIT DEPLOYMENT DISTRIBUTION" reference="PERSONNEL REGISTRY" variant="register">
        <div className="p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div
                key={status}
                className="border border-nexus-border bg-nexus-bg p-2 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <span className="text-[0.56rem] text-nexus-textSubtle block uppercase tracking-[0.12em] truncate">
                    {status}
                  </span>
                  <TeamStatusBadge status={status as TeamStatus} showDot={false} />
                </div>
                <span className="text-sm font-bold text-nexus-text ml-2">
                  {count as number}
                </span>
              </div>
            ))}
          </div>
        </div>
      </TerminalFrame>

      {/* System Parameter Configuration */}
      <TerminalFrame
        title="SYSTEM OPERATING PARAMETERS"
        reference="REGULATION 037"
        variant="system"
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-[0.625rem] text-nexus-textSubtle">
              CHANGES TO PARAMETERS WRITE DIRECTLY TO BUREAU PROTOCOL
            </span>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="nexus-btn-primary text-xs px-3 py-1 min-h-[30px]"
            >
              <BureauIcons.Save className={cn('bureau-icon w-3 h-3', isSaving && 'animate-spin')} />
              <span>[ COMMIT PARAMETERS ]</span>
            </button>
          </div>
        }
      >
        <div className="p-2 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="border border-nexus-borderSubtle bg-nexus-bg p-2">
            <span className="text-nexus-textSubtle text-[0.56rem] uppercase tracking-[0.14em] block">MAXIMUM UNITS</span>
            <span className="font-bold text-nexus-text mt-1 block">{String(config?.max_teams ?? 25)}</span>
          </div>

          <div className="border border-nexus-borderSubtle bg-nexus-bg p-2">
            <span className="text-nexus-textSubtle text-[0.56rem] uppercase tracking-[0.14em] block">INVESTIGATORS / UNIT</span>
            <span className="font-bold text-nexus-text mt-1 block">{String(config?.players_per_team ?? 3)}</span>
          </div>

          <div className="border border-nexus-borderSubtle bg-nexus-bg p-2">
            <span className="text-nexus-textSubtle text-[0.56rem] uppercase tracking-[0.14em] block">DURATION</span>
            <span className="font-bold text-nexus-text mt-1 block">{gameDuration} MIN</span>
          </div>

          <div className="border border-nexus-borderSubtle bg-nexus-bg p-2">
            <span className="text-nexus-textSubtle text-[0.56rem] uppercase tracking-[0.14em] block">ROLLING INTERVAL</span>
            <span className="font-bold text-nexus-text mt-1 block">{String(config?.rolling_start_interval_minutes ?? 10)} MIN</span>
          </div>

          <div className="border border-nexus-borderSubtle bg-nexus-bg p-2">
            <span className="text-nexus-textSubtle text-[0.56rem] uppercase tracking-[0.14em] block">AUTO-ASSIGN ROLES</span>
            <span className="font-bold text-nexus-text mt-1 block">{config?.auto_assign_roles ? 'AUTHORIZED' : 'MANUAL'}</span>
          </div>

          <div className="border border-nexus-borderSubtle bg-nexus-bg p-2">
            <span className="text-nexus-textSubtle text-[0.56rem] uppercase tracking-[0.14em] block">ROLE COMPLETENESS</span>
            <span className="font-bold text-nexus-text mt-1 block">{config?.require_all_roles ? 'ENFORCED' : 'OPTIONAL'}</span>
          </div>
        </div>
      </TerminalFrame>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!actionConfirmOpen}
        onClose={() => setActionConfirmOpen(null)}
        title={getConfirmTitle(actionConfirmOpen)}
        confirmAction={{
          label: actionConfirmOpen === 'reset' ? 'CONFIRM HARD RESET' : actionConfirmOpen === 'end' ? 'CONFIRM TERMINATION' : actionConfirmOpen === 'pause' ? 'CONFIRM HOLD' : 'CONFIRM INITIATE',
          variant: getConfirmVariant(actionConfirmOpen),
          loading: isActionLoading,
        }}
        onConfirm={executeAction}
        danger={actionConfirmOpen === 'end' || actionConfirmOpen === 'reset'}
      >
        <p className="font-mono text-xs">{actionConfirmOpen ? getConfirmMessage(actionConfirmOpen) : ''}</p>
      </ConfirmationDialog>
    </div>
  )
}
