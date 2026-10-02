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
import { NAV_ITEMS, shouldRenderBottomNav } from '@/lib/navigation'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

/**
 * Handset labels, keyed by the route constants themselves: the earlier
 * literal keys drifted away from the real paths, so four of the five tabs
 * silently fell back to their generic names.
 *
 * These read in sentence case on purpose. The control bar renders them in
 * uppercase through CSS, but assistive technology announces the DOM text, and
 * "Evidence" read normally beats "EVIDENCE" shouted at a player.
 *
 * Two are renamed outright, because the route name was the weaker word:
 * "Game" says nothing, and "QR" names the format rather than the action.
 */
const DEVICE_LABELS: Record<string, string> = {
  [ROUTES.PLAYER_GAME]: 'Case',
  [ROUTES.PLAYER_EVIDENCE]: 'Evidence',
  [ROUTES.PLAYER_INVENTORY]: 'Inventory',
  [ROUTES.PLAYER_QR]: 'Scan',
  [ROUTES.PLAYER_LEADERBOARD]: 'Rank',
}

export function BottomNav() {
  const { player } = useApp()
  const connection = useConnection()
  const { count: queuedCount } = useSubmissionQueue()
  const { pathname } = useLocation()

  if (!player) return null
  if (!shouldRenderBottomNav(pathname)) return null

  const isActivePath = (path: string) => pathname === path

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-nexus-borderSubtle bg-nexus-surface/95 backdrop-blur safe-area-bottom">
      <div className="nexus-device-control-bar">
        <div className="nexus-device-signal-strip">
          <div className="flex items-center gap-2">
            {connection.status !== 'online' ? (
              <>
                <span className="nexus-device-signal-dot offline bg-nexus-danger" aria-label="Offline" />
                <span className="font-mono text-[0.8125rem] uppercase tracking-[0.18em] text-nexus-danger">
                  SIGNAL: {connection.status.toUpperCase()}
                </span>
              </>
            ) : (
              <>
                <span className="nexus-device-signal-dot online" aria-label="Online" />
                <span className="font-mono text-[0.8125rem] uppercase tracking-[0.18em] text-nexus-accent">
                  LINKED
                </span>
              </>
            )}
          </div>
          {queuedCount > 0 && isActivePath(ROUTES.PLAYER_GAME) && (
            <span className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-nexus-warning">
              {queuedCount} PENDING
            </span>
          )}
        </div>

        <div className="nexus-device-controls">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = isActivePath(item.path)
            const label = DEVICE_LABELS[item.path] ?? item.label

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={cn(
                  'nexus-device-control flex flex-col items-center justify-center gap-0.5',
                  active
                    ? 'nexus-device-control-active'
                    : 'nexus-device-control-inactive',
                )}
                aria-label={label}
              >
                <span className={cn(
                  'nexus-device-control-icon bureau-icon w-6 h-6',
                  active ? 'text-nexus-accent' : 'text-nexus-textMuted',
                )}>
                  <Icon className="bureau-icon w-5 h-5" />
                </span>
                <span className="font-mono text-[0.8125rem] uppercase tracking-[0.18em] leading-none">
                  {label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
