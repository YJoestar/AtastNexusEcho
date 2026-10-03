/**
 * NEXUS — Player Header
 * Consistent header showing team name, player role, stage, and connection status.
 * Uses role-specific visual identities for OBSERVER, ANALYST, OPERATOR.
 */

import { Link } from 'react-router-dom'
import { useApp } from '@/app/providers'
import { useConnection, type ConnectionStatus } from '@/hooks/useConnection'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { useGameTimer } from '@/hooks/useGameTimer'
import { ROUTES, ROLE_SUBTITLES, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import { BureauIcons } from '@/components/bureau'

const TIMER_TONE: Record<string, string> = {
  normal: 'text-nexus-text',
  low: 'text-nexus-warning',
  critical: 'text-nexus-danger',
  expired: 'text-nexus-danger',
}

const CONNECTION_INDICATOR: Record<
  ConnectionStatus,
  { Icon: React.ComponentType<{ className?: string }>; className: string; label: string }
> = {
  online: { Icon: BureauIcons.Wifi, className: 'text-nexus-accent', label: 'Connected to Bureau command' },
  reconnecting: { Icon: BureauIcons.Refresh, className: 'text-nexus-warning', label: 'Reconnecting to Bureau command' },
  degraded: { Icon: BureauIcons.CloudOff, className: 'text-nexus-warning', label: 'No route to server' },
  unavailable: { Icon: BureauIcons.Server, className: 'text-nexus-warning', label: 'Bureau command not responding' },
  offline: { Icon: BureauIcons.WifiOff, className: 'text-nexus-danger', label: 'Offline' },
}

export function PlayerHeader() {
  const { player, team, gameState, isInitializing } = useApp()
  const connection = useConnection()
  const { count: queuedCount } = useSubmissionQueue()
  const timer = useGameTimer(gameState?.endsAt)

  if (!player || !team || isInitializing) {
    return null
  }

  const roleTheme = player.role && ROLE_THEMES[player.role]
  const timeRemaining = timer.isArmed ? timer.formatted : '—'
  const indicator = CONNECTION_INDICATOR[connection.status]
  const ConnectionIcon = indicator.Icon

  return (
    <header className="sticky top-0 z-40 nexus-handset-header safe-area-top">
      <div className="nexus-handset-title-bar">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={ROUTES.PLAYER_GAME} className="flex items-center gap-2 shrink-0">
            <div className="handset-badge-mark">N</div>
            <div className="min-w-0">
              <div className="font-display text-[0.62rem] uppercase tracking-[0.32em] text-nexus-textSubtle">NEXUS</div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-nexus-textMuted">Case 037</div>
            </div>
          </Link>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-nexus-textMuted hidden sm:block">
            Team {team.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-6 h-6">
            <ConnectionIcon
              className={cn(
                'bureau-icon w-3.5 h-3.5',
                indicator.className,
                connection.status !== 'online' && 'animate-pulse',
              )}
              aria-hidden="true"
            />
          </div>
          <span
            className={cn(
              'font-mono text-[0.56rem] uppercase tracking-[0.18em]',
              connection.status !== 'online' ? 'text-nexus-warning' : 'text-nexus-accent',
            )}
            aria-label={`Signal ${connection.status}`}
          >
            {connection.status.toUpperCase()}
          </span>
          {queuedCount > 0 && (
            <span
              className="min-w-[18px] h-[18px] px-1 border border-nexus-warning text-nexus-warning text-[10px] font-bold flex items-center justify-center bg-nexus-bg"
              aria-label={`${queuedCount} submissions queued`}
            >
              {queuedCount}
            </span>
          )}
        </div>
      </div>

      <div className="nexus-handset-subheader border-t border-nexus-borderSubtle/60">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              'px-2 py-1 text-[0.58rem] font-medium uppercase tracking-[0.22em] border border-current bg-transparent',
              roleTheme?.badge,
            )}
          >
            {player.role}
          </span>
          <span className={cn('hidden sm:inline text-[0.58rem] uppercase tracking-[0.18em]', roleTheme?.text)}>
            {player.role && ROLE_SUBTITLES[player.role]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="max-w-[7rem] truncate font-mono text-[0.62rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
            {player.displayName}
          </span>
          <div
            className="handset-badge-mark"
            aria-label={`Timer: ${timer.isArmed ? timeRemaining : 'not started'}`}
            role="timer"
          >
            <BureauIcons.Clock
              className={cn(
                'bureau-icon w-3 h-3',
                timer.urgency === 'normal' ? 'text-nexus-textSubtle' : TIMER_TONE[timer.urgency],
              )}
              aria-hidden="true"
            />
          </div>
          <span
            className={cn(
              'whitespace-nowrap font-mono text-[0.64rem] uppercase tracking-[0.18em]',
              TIMER_TONE[timer.urgency],
            )}
            aria-live="off"
          >
            {timeRemaining}
          </span>
        </div>
      </div>
    </header>
  )
}
