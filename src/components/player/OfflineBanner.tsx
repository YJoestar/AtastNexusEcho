/**
 * NEXUS — Offline Banner
 * Non-intrusive banner shown when the device loses network connectivity.
 * Allows reading already-loaded information while preventing submissions.
 */

import { WifiOff, Wifi } from 'lucide-react'

interface OfflineBannerProps {
  isOffline: boolean
}

export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  if (isOffline) {
    return (
      <div className="sticky top-0 z-30 border-b border-nexus-danger/30 bg-nexus-dangerBg/90 backdrop-blur">
        <div className="flex items-center justify-center gap-2 px-4 py-2">
          <WifiOff className="w-4 h-4 text-nexus-danger flex-shrink-0" />
          <p className="text-sm font-medium text-nexus-danger text-center">
            OFFLINE — Your session is preserved. Submissions will resume when connection returns.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-30 border-b border-nexus-accent/20 bg-nexus-accentBg/10 backdrop-blur opacity-0 h-0 overflow-hidden transition-all duration-normal pointer-events-none">
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <Wifi className="w-4 h-4 text-nexus-accent flex-shrink-0" />
        <p className="text-sm font-medium text-nexus-accent">Connection restored</p>
      </div>
    </div>
  )
}
