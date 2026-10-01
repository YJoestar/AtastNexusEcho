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

  if (!shouldRenderBottomNav(pathname)) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-nexus-borderSubtle bg-nexus-surface/95 backdrop-blur safe-area-bottom">
      <div className="register grid-cols-5 gap-1 py-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              cn(
                'register-row flex-col gap-1 py-2 text-xs font-medium transition-all duration-fast',
                isActive
                  ? 'text-nexus-accent'
                  : 'text-nexus-textSubtle hover:text-nexus-text',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'bureau-icon w-5 h-5',
                    isActive ? 'text-nexus-accent' : 'text-nexus-textMuted',
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {connection.status !== 'online' && item.path === ROUTES.PLAYER_QR && (
                  <span className="w-2 h-2 border border-nexus-danger bg-nexus-bg shrink-0" aria-label="Offline" />
                )}
                {queuedCount > 0 && item.path === ROUTES.PLAYER_GAME && (
                  <span className="w-2 h-2 border border-nexus-warning bg-nexus-bg shrink-0" aria-label="Queued submissions" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
