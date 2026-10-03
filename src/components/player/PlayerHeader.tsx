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
import { ROUTES, ROLE_THEMES } from '@/app/config'
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
      {/* One row: where I am, who I am on this case, the link, the clock. */}
      <div className="nexus-handset-title-bar !py-1.5">
        <Link to={ROUTES.PLAYER_GAME} className="flex min-w-0 items-center gap-2" aria-label="Case file">
          <div className="handset-badge-mark">N</div>
          <div className="min-w-0 leading-none">
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-nexus-textMuted">CASE 037</div>
            <div className={cn('mt-1 font-mono text-[0.58rem] uppercase tracking-[0.2em]', roleTheme?.text)}>{player.role}</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1"
            role="img"
            aria-label={`Signal ${connection.status}: ${indicator.label}`}
          >
            <ConnectionIcon
              className={cn('bureau-icon w-4 h-4', indicator.className, connection.status !== 'online' && 'animate-pulse')}
              aria-hidden="true"
            />
          </span>
          {queuedCount > 0 && (
            <span
              className="min-w-[18px] h-[18px] px-1 border border-nexus-warning text-nexus-warning text-[10px] font-bold flex items-center justify-center bg-nexus-bg"
              aria-label={`${queuedCount} submissions queued`}
            >
              {queuedCount}
            </span>
          )}
          <span
            className={cn('flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.72rem] tabular-nums tracking-[0.1em]', TIMER_TONE[timer.urgency])}
            role="timer"
            aria-label={`Timer: ${timer.isArmed ? timeRemaining : 'not started'}`}
          >
            <BureauIcons.Clock className="bureau-icon w-3.5 h-3.5" aria-hidden="true" />
            {timeRemaining}
          </span>
        </div>
      </div>
    </header>
  )
}
