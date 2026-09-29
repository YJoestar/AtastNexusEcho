/**
 * NEXUS — Bottom Navigation
 * Mobile-first bottom navigation bar for player screens.
 * Shows the 5 core gameplay destinations with role-colored active state.
 */

import { NavLink } from 'react-router-dom'
import {
  Eye,
  Package,
  Brain,
  QrCode,
  Trophy,
} from 'lucide-react'
import { useApp } from '@/app/providers'
import { useOffline } from '@/hooks/useOffline'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { path: ROUTES.PLAYER_GAME, label: 'Game', icon: Eye },
  { path: ROUTES.PLAYER_EVIDENCE, label: 'Evidence', icon: Package },
  { path: ROUTES.PLAYER_INVENTORY, label: 'Inventory', icon: Brain },
  { path: ROUTES.PLAYER_QR, label: 'QR', icon: QrCode },
  { path: ROUTES.PLAYER_LEADERBOARD, label: 'Ranking', icon: Trophy },
]

export function BottomNav() {
  const { player } = useApp()
  const { isOffline } = useOffline()

  if (!player) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-nexus-borderSubtle bg-nexus-surface/95 backdrop-blur">
      <div className="grid grid-cols-5 gap-1 py-2">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2 text-xs font-medium transition-all duration-fast',
                isActive
                  ? 'text-nexus-accent'
                  : 'text-nexus-textSubtle hover:text-nexus-text',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    isActive
                      ? 'bg-nexus-accentBg/30'
                      : 'hover:bg-nexus-surfaceElevated',
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-5 h-5',
                      isActive ? 'text-nexus-accent' : 'text-nexus-textMuted',
                    )}
                    aria-hidden="true"
                  />
                </div>
                <span>{item.label}</span>
                {isOffline && item.path === ROUTES.PLAYER_QR && (
                  <span className="w-2 h-2 rounded-full bg-nexus-danger animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
