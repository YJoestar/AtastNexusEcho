/**
 * NEXUS — Player Device Controls
 *
 * The field handset control bar. Replaces the generic bottom navigation
 * with a device-style control strip that feels like instrument panels
 * on a handheld investigation device — large tactile controls, signal
 * indicators, and field-appropriate labels.
 *
 * The five core destinations are preserved. Only the visual language
 * and physical metaphor change.
 */

import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '@/app/providers'
import { useConnection } from '@/hooks/useConnection'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { NAV_ITEMS, navItemFor, shouldRenderBottomNav } from '@/lib/navigation'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const { player, unreadCount = 0 } = useApp()
  const connection = useConnection()
  const { count: queuedCount } = useSubmissionQueue()
  const { pathname, search } = useLocation()

  if (!player) return null
  if (!shouldRenderBottomNav(pathname)) return null

  const isActivePath = (path: string) => pathname === path
  const current = navItemFor(pathname, search)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-nexus-borderSubtle bg-nexus-surface/95 backdrop-blur safe-area-bottom">
      <div className="nexus-device-control-bar">
        <div className="nexus-device-signal-strip">
          <div className="flex items-center gap-2">
            {connection.status !== 'online' ? (
              <>
                <span className="nexus-device-signal-dot offline bg-nexus-danger" aria-label="Offline" />
                <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-nexus-danger">
                  SIGNAL: {connection.status.toUpperCase()}
                </span>
              </>
            ) : (
              <>
                <span className="nexus-device-signal-dot online" aria-label="Online" />
                <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-nexus-accent">
                  LINKED
                </span>
              </>
            )}
          </div>
          {queuedCount > 0 && isActivePath(ROUTES.PLAYER_GAME) && (
            <span className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-nexus-warning">
              {queuedCount} PENDING
            </span>
          )}
        </div>

        <div className="nexus-device-controls">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = current?.id === item.id
            const label = item.label.toUpperCase()
            const badge = item.id === 'COMMS' ? unreadCount : 0

            return (
              <NavLink
                key={item.id}
                to={{ pathname: item.path, search: item.search }}
                className={cn(
                  'nexus-device-control relative flex flex-col items-center justify-center gap-0.5',
                  active
                    ? 'nexus-device-control-active'
                    : 'nexus-device-control-inactive',
                )}
                aria-label={badge > 0 ? `${label}, ${badge} unread` : label}
                aria-current={active ? 'page' : undefined}
              >
                <span className={cn(
                  'nexus-device-control-icon bureau-icon w-6 h-6',
                  active ? 'text-nexus-accent' : 'text-nexus-textMuted',
                )}>
                  <Icon className="bureau-icon w-5 h-5" />
                </span>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] leading-none">
                  {label}
                </span>
                {badge > 0 && (
                  <span
                    className="absolute right-[18%] top-1 min-w-[1.1rem] border border-nexus-warning bg-nexus-bg px-1 text-center font-mono text-[0.6rem] font-bold leading-4 text-nexus-warning"
                    aria-hidden="true"
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
