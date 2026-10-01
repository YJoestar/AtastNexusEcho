/**
 * NEXUS — Connection Banner
 *
 * Sticky strip under the player header that states the actual connection state
 * and what the game will do about it. It replaced a banner that only ever knew
 * about navigator.onLine, so a phone on a Wi-Fi access point with no route to
 * the server used to look healthy while every action failed.
 *
 * It also surfaces the offline submission queue: an answer typed out of signal
 * is held locally, and this is where the player is told that, and told when it
 * has gone through.
 */

import { CloudOff, RefreshCw, Send, ServerCrash, Wifi, WifiOff, Check } from 'lucide-react'
import type { ConnectionState, ConnectionStatus } from '@/hooks/useConnection'
import type { QueuedSubmission } from '@/lib/offlineQueue'
import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  connection: ConnectionState
  queuedCount?: number
  /** Answers replayed on the last flush, so the player gets an acknowledgement. */
  lastFlush?: QueuedSubmission[] | null
  /** Dismiss the replay acknowledgement once it has been read. */
  onAcknowledge?: () => void
}

const COPY: Record<
  ConnectionStatus,
  { text: string; detail: (queued: number) => string; container: string; accent: string; icon: typeof Wifi }
> = {
  online: {
    text: 'CONNECTED',
    detail: () => 'Live sync with Bureau command.',
    container: 'border-nexus-accent/20 bg-nexus-accentBg/10',
    accent: 'text-nexus-accent',
    icon: Wifi,
  },
  reconnecting: {
    text: 'RECONNECTING',
    detail: queued =>
      queued > 0
        ? `Restoring link. ${queued} queued submission${queued === 1 ? '' : 's'} waiting.`
        : 'Restoring link to Bureau command.',
    container: 'border-nexus-warning/30 bg-nexus-warningBg/20',
    accent: 'text-nexus-warning',
    icon: RefreshCw,
  },
  degraded: {
    text: 'NO ROUTE TO SERVER',
    detail: queued =>
      queued > 0
        ? `Device is on Wi-Fi but the server is unreachable. ${queued} submission${queued === 1 ? '' : 's'} held locally.`
        : 'Device reports Wi-Fi but the server is unreachable. Actions will be retried automatically.',
    container: 'border-nexus-warning/30 bg-nexus-warningBg/20',
    accent: 'text-nexus-warning',
    icon: CloudOff,
  },
  unavailable: {
    text: 'BUREAU COMMAND NOT RESPONDING',
    detail: queued =>
      queued > 0
        ? `The server answered but rejected the request. ${queued} submission${queued === 1 ? '' : 's'} held locally.`
        : 'The server answered but rejected the request. Actions will be retried automatically.',
    container: 'border-nexus-warning/30 bg-nexus-warningBg/20',
    accent: 'text-nexus-warning',
    icon: ServerCrash,
  },
  offline: {
    text: 'OFFLINE',
    detail: queued =>
      queued > 0
        ? `No signal. ${queued} submission${queued === 1 ? '' : 's'} will be sent when you reconnect.`
        : 'No signal. Answers you submit now are queued and sent on reconnect.',
    container: 'border-nexus-danger/30 bg-nexus-dangerBg/90',
    accent: 'text-nexus-danger',
    icon: WifiOff,
  },
}

export function OfflineBanner({
  connection,
  queuedCount = 0,
  lastFlush,
  onAcknowledge,
}: OfflineBannerProps) {
  const { status, probe } = connection
  const copy = COPY[status]
  const Icon = copy.icon
  const isProblem = status !== 'online'

  // A healthy connection with nothing queued and nothing just replayed has
  // nothing to say; keep the strip collapsed instead of shouting at players.
  const showFlushAck = status === 'online' && (lastFlush?.length ?? 0) > 0
  if (!isProblem && !showFlushAck) {
    return (
      <div
        className="h-0 overflow-hidden border-0"
        aria-hidden="true"
        data-connection-status={status}
      />
    )
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-30 border-b backdrop-blur',
        showFlushAck ? 'border-nexus-accent/30 bg-nexus-accentBg/20' : copy.container,
      )}
      role="status"
      aria-live="polite"
      data-connection-status={status}
    >
      <div className="flex items-start gap-2 px-4 py-2">
        <Icon
          className={cn('w-4 h-4 flex-shrink-0 mt-0.5', copy.accent, isProblem && 'animate-pulse')}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              showFlushAck ? 'text-nexus-accent' : copy.accent,
            )}
          >
            {showFlushAck ? 'SUBMITTED' : copy.text}
          </p>
          <p className="text-sm text-nexus-textMuted leading-snug">
            {showFlushAck
              ? `${lastFlush?.length} queued answer${lastFlush?.length === 1 ? '' : 's'} delivered.`
              : copy.detail(queuedCount)}
          </p>
        </div>
        {isProblem && (
          <button
            type="button"
            onClick={() => void probe()}
            className="btn-ghost shrink-0 px-2 py-1 min-h-0 min-w-0 text-xs"
            aria-label="Retry connection now"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            RETRY
          </button>
        )}
        {!isProblem && queuedCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-nexus-accent shrink-0">
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            {queuedCount}
          </span>
        )}
        {showFlushAck && onAcknowledge && (
          <button
            type="button"
            onClick={onAcknowledge}
            className="btn-ghost shrink-0 px-2 py-1 min-h-0 min-w-0 text-xs"
            aria-label="Dismiss delivered submissions notice"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            OK
          </button>
        )}
      </div>
      {status === 'online' && queuedCount === 0 && !showFlushAck && (
        <p className="sr-only">Connection healthy</p>
      )}
    </div>
  )
}