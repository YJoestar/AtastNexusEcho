/**
 * NEXUS ECHO — Player Layout
 *
 * Mobile-first layout wrapper for all player screens.
 * Shows PlayerHeader, the connection banner and BottomNav only when
 * authenticated, and reserves bottom padding only where the nav actually renders.
 *
 * The shell also carries the narrative level. The whole subtree drains colour
 * through `[data-horror]` on this one element, so escalation is a property of
 * the case rather than of any individual screen — and no screen has to know
 * about it.
 */

import { useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PlayerHeader } from '@/components/player/PlayerHeader'
import { BottomNav } from '@/components/player/BottomNav'
import { OfflineBanner } from '@/components/player/OfflineBanner'
import { shouldRenderBottomNav } from '@/lib/navigation'
import { useApp } from '@/app/providers'
import { useConnection } from '@/hooks/useConnection'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { useNarrative } from '@/hooks/useNarrative'
import { PUZZLE_COUNT } from '@/content/puzzles'

export function PlayerLayout() {
  const { isAuthenticated, isInitializing, teamProgress, unreadCount } = useApp()
  const connection = useConnection()
  const queue = useSubmissionQueue()
  const { pathname } = useLocation()
  const showLayout = isAuthenticated && !isInitializing

  // BottomNav renders only on the five listed destinations; the content
  // padding has to follow it or detail screens get a dead strip at the bottom.
  const showBottomNav = showLayout && shouldRenderBottomNav(pathname)

  const signals = useMemo(
    () => ({
      solvedCount: teamProgress ? Object.keys(teamProgress.solvedNodes).length : 0,
      totalNodes: PUZZLE_COUNT,
      hintsUsed: teamProgress?.hintsUsed ?? 0,
      isOffline: connection.isOffline,
      queuedCount: queue.count,
      unreadCount,
    }),
    [teamProgress, connection.isOffline, queue.count, unreadCount]
  )

  const narrative = useNarrative(signals)

  return (
    <div
      data-horror={narrative.level}
      className="bg-nexus-bg text-nexus-text flex flex-col safe-area-x app-viewport"
    >
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