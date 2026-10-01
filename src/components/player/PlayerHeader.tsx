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
  const { player, team, gameState, isInitializing, notifications } = useApp()
  const connection = useConnection()
  const { count: queuedCount } = useSubmissionQueue()
  const timer = useGameTimer(gameState?.endsAt)

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0

  if (!player || !team || isInitializing) {
    return null
  }

  const roleTheme = player.role && ROLE_THEMES[player.role]
  const timeRemaining = timer.isArmed ? timer.formatted : '—'
  const indicator = CONNECTION_INDICATOR[connection.status]
  const ConnectionIcon = indicator.Icon

  return (
    <header className="sticky top-0 z-40 safe-area-top nexus-header-shell">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={ROUTES.PLAYER_GAME} className="flex items-center gap-2 shrink-0">
            <div className="case-badge-mark">N</div>
            <div className="min-w-0">
              <div className="font-display text-[0.62rem] uppercase tracking-[0.32em] text-nexus-textSubtle">NEXUS</div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-nexus-textMuted">Case 037</div>
            </div>
          </Link>
          <span className="hidden sm:block text-nexus-textMuted font-mono text-[0.62rem] uppercase tracking-[0.18em]">Team {team.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 border border-nexus-borderSubtle bg-nexus-surface px-2 py-1"
            role="timer"
            aria-live="off"
            aria-label={timer.isArmed ? `${timeRemaining} remaining` : 'Timer not started'}
          >
            <BureauIcons.Clock
              className={cn(
                'bureau-icon w-3.5 h-3.5',
                timer.urgency === 'normal' ? 'text-nexus-textSubtle' : TIMER_TONE[timer.urgency],
              )}
              aria-hidden="true"
            />
            <span className={cn('font-mono text-[0.64rem] uppercase tracking-[0.18em]', TIMER_TONE[timer.urgency])}>
              {timeRemaining}
            </span>
          </div>

          <Link
            to={ROUTES.PLAYER_NOTIFICATIONS}
            className="relative p-1.5 border border-nexus-borderSubtle bg-nexus-surface text-nexus-textSubtle hover:text-nexus-text"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <BureauIcons.Bell className="bureau-icon w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center border border-nexus-danger text-nexus-danger text-[10px] font-bold bg-nexus-bg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => void connection.probe()}
            title={
              queuedCount > 0
                ? `${indicator.label} — ${queuedCount} submission${queuedCount === 1 ? '' : 's'} queued`
                : indicator.label
            }
            aria-label={
              queuedCount > 0
                ? `${indicator.label}, ${queuedCount} submissions queued`
                : indicator.label
            }
            className="p-1.5 border border-nexus-borderSubtle bg-nexus-surface text-nexus-textSubtle hover:text-nexus-text"
          >
            <ConnectionIcon
              className={cn(
                'bureau-icon w-4 h-4',
                indicator.className,
                connection.status !== 'online' && 'animate-pulse',
              )}
              aria-hidden="true"
            />
          </button>
          {queuedCount > 0 && (
            <span
              className="min-w-[18px] h-[18px] px-1 border border-nexus-warning text-nexus-warning text-[10px] font-bold flex items-center justify-center bg-nexus-bg"
              aria-hidden="true"
            >
              {queuedCount}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5 border-t border-nexus-borderSubtle/70 archive-strip',
          roleTheme?.bg,
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              'px-2 py-1 text-[0.58rem] font-medium uppercase tracking-[0.22en] border border-current bg-transparent',
              roleTheme?.badge,
            )}
          >
            {player.role}
          </span>
          <span className={cn('text-[0.58rem] uppercase tracking-[0.18em]', roleTheme?.text)}>
            {player.role && ROLE_SUBTITLES[player.role]}
          </span>
        </div>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
          {player.displayName}
        </span>
      </div>
    </header>
  )
}
