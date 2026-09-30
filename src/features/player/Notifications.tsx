/**
 * NEXUS — Player Notifications
 *
 * Team-scoped message centre. Content comes from the server
 * (game-notifications -> get_team_notifications, RLS-scoped to the caller's
 * own team). Marking read is persisted server-side through game-mark-read, so
 * an unread badge cannot reappear after a refresh.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellOff, Check, ArrowLeft, RefreshCw } from 'lucide-react'
import { useApp } from '@/app/providers'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/time'

const PRIORITY_TONE: Record<string, string> = {
  LOW: 'text-nexus-textSubtle border-nexus-border',
  NORMAL: 'text-nexus-textMuted border-nexus-border',
  HIGH: 'text-nexus-warning border-nexus-warning/40',
  CRITICAL: 'text-nexus-danger border-nexus-danger/40',
}

export function PlayerNotifications() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, refreshNotifications } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refreshNotifications()
    setIsRefreshing(false)
  }, [refreshNotifications])

  const handleOpen = useCallback(
    (id: string, isRead: boolean, actionUrl?: string) => {
      if (!isRead) markNotificationRead(id)
      if (actionUrl) {
        // Only internal player routes may be followed; never an arbitrary URL.
        if (actionUrl.startsWith('/player/')) {
          window.location.assign(actionUrl)
        }
      }
    },
    [markNotificationRead],
  )

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to={ROUTES.PLAYER_GAME} className="btn-ghost" aria-label="Back to game">
            <ArrowLeft className="w-4 h-4" />
            BACK
          </Link>
          <h1 className="heading-2">Notifications</h1>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg text-nexus-textSubtle hover:text-nexus-text"
            aria-label="Refresh notifications"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {unreadCount > 0 && (
          <button onClick={() => void markAllNotificationsRead()} className="btn-secondary w-full mb-4">
            <Check className="w-4 h-4" />
            MARK ALL AS READ ({unreadCount})
          </button>
        )}

        {notifications.length === 0 ? (
          <div className="panel p-8 text-center">
            <BellOff className="w-8 h-8 text-nexus-textSubtle mx-auto mb-3" aria-hidden="true" />
            <p className="text-nexus-textMuted">No transmissions for your team.</p>
            <p className="text-sm text-nexus-textSubtle mt-1">
              Objective updates and Bureau notices appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => handleOpen(n.id, n.isRead, n.actionUrl)}
                  className={cn(
                    'w-full text-left panel p-4 transition-colors',
                    !n.isRead && 'border-nexus-accent/40 bg-nexus-accentBg/40',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-nexus-accent shrink-0" aria-label="Unread" />
                        )}
                        <span className="font-medium text-nexus-text">{n.title}</span>
                        <span
                          className={cn(
                            'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border',
                            PRIORITY_TONE[n.priority] ?? PRIORITY_TONE.NORMAL,
                          )}
                        >
                          {n.priority}
                        </span>
                      </div>
                      <p className="text-sm text-nexus-textMuted mt-1.5 whitespace-pre-wrap">
                        {n.message}
                      </p>
                      <p className="text-xs text-nexus-textSubtle mt-2 font-mono">
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-nexus-textSubtle">
          <Bell className="w-3 h-3" aria-hidden="true" />
          Team-wide. Individual player data is never shown here.
        </div>
      </div>
    </div>
  )
}
