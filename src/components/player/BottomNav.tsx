/**
 * NEXUS — Bottom Navigation
 * Mobile-first bottom navigation bar for the five core gameplay destinations.
 *
 * See src/lib/navigation.ts for why the bar is limited to those five routes.
 */

import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '@/app/providers'
import { useConnection } from '@/hooks/useConnection'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { NAV_ITEMS, shouldRenderBottomNav } from '@/lib/navigation'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const { player } = useApp()
  const connection = useConnection()
  const { count: queuedCount } = useSubmissionQueue()
  const { pathname } = useLocation()

  if (!player) return null

  // Not a listed destination (puzzle node, navigation, notifications, final,
  // completion, login, waiting): render nothing rather than an inert bar.
  if (!shouldRenderBottomNav(pathname)) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-nexus-borderSubtle bg-nexus-surface/95 backdrop-blur safe-area-bottom">
      <div className="grid grid-cols-5 gap-1 py-2">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end
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
                {connection.status !== 'online' && item.path === ROUTES.PLAYER_QR && (
                  <span className="w-2 h-2 rounded-full bg-nexus-danger animate-pulse" />
                )}
                {queuedCount > 0 && item.path === ROUTES.PLAYER_GAME && (
                  <span className="w-2 h-2 rounded-full bg-nexus-warning animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}