/**
 * NEXUS — Player Header
 * Consistent header showing team name, player role, stage, and connection status.
 * Uses role-specific visual identities for OBSERVER, ANALYST, OPERATOR.
 */

import { Link } from 'react-router-dom'
import { Clock, Wifi, WifiOff, Bell, CloudOff, RefreshCw, ServerCrash } from 'lucide-react'
import { useApp } from '@/app/providers'
import { useConnection, type ConnectionStatus } from '@/hooks/useConnection'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { useGameTimer } from '@/hooks/useGameTimer'
import { ROUTES, ROLE_SUBTITLES, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'

const TIMER_TONE: Record<string, string> = {
  normal: 'text-nexus-text',
  low: 'text-nexus-warning',
  critical: 'text-nexus-danger',
  expired: 'text-nexus-danger',
}

/**
 * navigator.onLine says nothing about whether the server is reachable, which on
 * campus Wi-Fi is the question that actually matters. The header icon therefore
 * reflects the probed state, not the radio.
 */
const CONNECTION_INDICATOR: Record<
  ConnectionStatus,
  { Icon: typeof Wifi; className: string; label: string }
> = {
  online: { Icon: Wifi, className: 'text-nexus-accent', label: 'Connected to Bureau command' },
  reconnecting: { Icon: RefreshCw, className: 'text-nexus-warning', label: 'Reconnecting to Bureau command' },
  degraded: { Icon: CloudOff, className: 'text-nexus-warning', label: 'No route to server' },
  unavailable: { Icon: ServerCrash, className: 'text-nexus-warning', label: 'Bureau command not responding' },
  offline: { Icon: WifiOff, className: 'text-nexus-danger', label: 'Offline' },
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
    <header className="sticky top-0 z-40 border-b border-nexus-borderSubtle bg-nexus-surface/95 backdrop-blur safe-area-top">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link to={ROUTES.PLAYER_GAME} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-nexus-accentBg flex items-center justify-center">
              <span className="text-nexus-accent font-display font-bold text-lg">N</span>
            </div>
            <span className="font-display font-semibold text-base text-nexus-text">NEXUS</span>
          </Link>
          <span className="text-nexus-textMuted font-mono text-xs">Team: {team.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5"
            role="timer"
            aria-live="off"
            aria-label={timer.isArmed ? `${timeRemaining} remaining` : 'Timer not started'}
          >
            <Clock
              className={cn(
                'w-4 h-4',
                timer.urgency === 'normal' ? 'text-nexus-textSubtle' : TIMER_TONE[timer.urgency],
              )}
              aria-hidden="true"
            />
            <span className={cn('font-mono text-sm font-semibold', TIMER_TONE[timer.urgency])}>
              {timeRemaining}
            </span>
          </div>

          <Link
            to={ROUTES.PLAYER_NOTIFICATIONS}
            className="relative p-1 rounded text-nexus-textSubtle hover:text-nexus-text"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center border border-nexus-danger text-nexus-danger text-[10px] font-bold">
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
            className="p-1 rounded text-nexus-textSubtle hover:text-nexus-text"
          >
            <ConnectionIcon
              className={cn(
                indicator.className,
                connection.status !== 'online' && 'animate-pulse',
              )}
              aria-hidden="true"
            />
          </button>
          {queuedCount > 0 && (
            <span
              className="min-w-[18px] h-[18px] px-1 border border-nexus-warning text-nexus-warning text-[10px] font-bold flex items-center justify-center"
              aria-hidden="true"
            >
              {queuedCount}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5 border-t border-nexus-borderSubtle/50',
          roleTheme?.bg,
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'px-2.5 py-1 rounded-xl text-xs font-medium font-display',
              roleTheme?.badge,
            )}
          >
            {player.role}
          </span>
          <span className={cn('text-xs font-medium', roleTheme?.text)}>
            {player.role && ROLE_SUBTITLES[player.role]}
          </span>
        </div>
        <span className="font-mono text-xs text-nexus-textSubtle">
          {player.displayName}
        </span>
      </div>
    </header>
  )
}
