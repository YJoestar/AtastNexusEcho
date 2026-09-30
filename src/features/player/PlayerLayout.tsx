/**
 * NEXUS — Player Layout
 * Mobile-first layout wrapper for all player screens.
 * Shows PlayerHeader, the connection banner and BottomNav only when
 * authenticated, and reserves bottom padding only where the nav actually renders.
 */

import { Outlet, useLocation } from 'react-router-dom'
import { PlayerHeader } from '@/components/player/PlayerHeader'
import { BottomNav } from '@/components/player/BottomNav'
import { OfflineBanner } from '@/components/player/OfflineBanner'
import { shouldRenderBottomNav } from '@/lib/navigation'
import { useApp } from '@/app/providers'
import { useConnection } from '@/hooks/useConnection'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'

export function PlayerLayout() {
  const { isAuthenticated, isInitializing } = useApp()
  const connection = useConnection()
  const queue = useSubmissionQueue()
  const { pathname } = useLocation()
  const showLayout = isAuthenticated && !isInitializing

  // BottomNav renders only on the five listed destinations; the content
  // padding has to follow it or detail screens get a dead strip at the bottom.
  const showBottomNav = showLayout && shouldRenderBottomNav(pathname)

  return (
    <div className="bg-nexus-bg text-nexus-text flex flex-col safe-area-x app-viewport">
      {showLayout && <PlayerHeader />}
      {showLayout && (
        <OfflineBanner
          connection={connection}
          queuedCount={queue.count}
          lastFlush={queue.lastFlush}
          onAcknowledge={queue.clearLastFlush}
        />
      )}

      <main
        className={
          showBottomNav
            ? 'flex-1 w-full overflow-x-hidden pb-[calc(56px+var(--safe-bottom))] md:pb-0'
            : 'flex-1 w-full overflow-x-hidden'
        }
      >
        <Outlet />
      </main>

      {showLayout && <BottomNav />}
    </div>
  )
}