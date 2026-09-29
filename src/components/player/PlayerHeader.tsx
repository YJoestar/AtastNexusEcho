/**
 * NEXUS — Player Header
 * Consistent header showing team name, player role, stage, and connection status.
 * Uses role-specific visual identities for OBSERVER, ANALYST, OPERATOR.
 */

import { Link } from 'react-router-dom'
import { Clock, Wifi, WifiOff } from 'lucide-react'
import { useApp } from '@/app/providers'
import { useOffline } from '@/hooks/useOffline'
import { ROUTES, ROLE_SUBTITLES, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import { formatTimeRemaining } from '@/lib/time'

export function PlayerHeader() {
  const { player, team, gameState, isInitializing } = useApp()
  const { isOffline } = useOffline()

  if (!player || !team || isInitializing) {
    return null
  }

  const roleTheme = player.role && ROLE_THEMES[player.role]
  const timeRemaining = gameState?.endsAt
    ? formatTimeRemaining(gameState.endsAt)
    : '—'

  return (
    <header className="sticky top-0 z-40 border-b border-nexus-borderSubtle bg-nexus-surface/95 backdrop-blur">
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
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-nexus-textSubtle" aria-hidden="true" />
            <span className="font-mono text-sm text-nexus-text">{timeRemaining}</span>
          </div>
          {isOffline ? (
            <div title="Offline">
              <WifiOff className="w-4 h-4 text-nexus-danger" />
            </div>
          ) : (
            <div title="Online">
              <Wifi className="w-4 h-4 text-nexus-accent" />
            </div>
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
