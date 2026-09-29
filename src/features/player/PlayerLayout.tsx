/**
 * NEXUS — Player Layout
 * Mobile-first layout wrapper for all player screens.
 * Shows PlayerHeader and BottomNav only when authenticated.
 */

import { Outlet } from 'react-router-dom'
import { PlayerHeader } from '@/components/player/PlayerHeader'
import { BottomNav } from '@/components/player/BottomNav'
import { OfflineBanner } from '@/components/player/OfflineBanner'
import { useApp } from '@/app/providers'
import { useOffline } from '@/hooks/useOffline'

export function PlayerLayout() {
  const { isAuthenticated, isInitializing } = useApp()
  const { isOffline } = useOffline()
  const showLayout = isAuthenticated && !isInitializing

  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text flex flex-col">
      {showLayout && <PlayerHeader />}
      {showLayout && <OfflineBanner isOffline={isOffline} />}

      <main className="flex-1 w-full overflow-x-hidden pb-[56px] md:pb-0">
        <Outlet />
      </main>

      {showLayout && <BottomNav />}
    </div>
  )
}
