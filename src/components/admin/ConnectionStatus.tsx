/**
 * NEXUS — Connection Status
 * Real-time connection indicator for the Bureau control center.
 */

import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime, formatDuration } from '@/lib/time'
import { useBureauRealtime } from '@/hooks/useBureau'

export function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const { connectionInfo } = useBureauRealtime()
  const { status, lastSync } = connectionInfo

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {status === 'LIVE' ? (
          <>
            <Wifi className="w-3 h-3 text-nexus-accent" />
            <span className="text-nexus-accent">LIVE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-nexus-danger animate-pulse" />
            <span className="text-nexus-danger">OFFLINE</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        {status === 'LIVE' ? (
          <Wifi className="w-5 h-5 text-nexus-accent" />
        ) : (
          <WifiOff className="w-5 h-5 text-nexus-danger animate-pulse" />
        )}
        <span className={cn(
          'font-medium',
          status === 'LIVE' ? 'text-nexus-accent' : 'text-nexus-danger',
        )}>
          {status === 'LIVE' ? 'REAL-TIME CONNECTED' : 'CONNECTION LOST'}
        </span>
      </div>

      {lastSync && (
        <span className="text-nexus-textSubtle text-xs">
          Last sync: {formatDateTime(lastSync.toISOString())}
        </span>
      )}

      {status !== 'LIVE' && (
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-xs py-1"
        >
          <RefreshCw className="w-3 h-3" />
          Reconnect
        </button>
      )}
    </div>
  )
}

export function ConnectionTimingBadge({
  startedAt,
  durationMinutes,
}: {
  startedAt: string | null
  durationMinutes: number
}) {
  if (!startedAt) {
    return <span className="text-nexus-textSubtle text-xs">Not started</span>
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <Clock className="w-3 h-3 text-nexus-textSubtle" />
      <span className="text-nexus-textSubtle">
        Started {formatDateTime(startedAt)}
      </span>
      <span className="text-nexus-danger">
        Duration: {formatDuration(durationMinutes * 60000)}
      </span>
    </div>
  )
}
