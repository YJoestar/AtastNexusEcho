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
import { useApp } from '@/app/providers'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/time'
import { BureauIcons } from '@/components/bureau'
import { DocumentShell, RegisterList, RegisterRow, StateMarker, Stamp, type StampVariant } from '@/components/bureau'

const PRIORITY_STAMP: Record<string, { variant: StampVariant; label: string }> = {
  LOW: { variant: 'archived', label: 'Low' },
  NORMAL: { variant: 'verified', label: 'Normal' },
  HIGH: { variant: 'anomalous', label: 'High' },
  CRITICAL: { variant: 'anomalous', label: 'Critical' },
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
          <Link to={ROUTES.PLAYER_GAME} className="nexus-btn nexus-btn-ghost touch-target-primary" aria-label="Back to game">
            <BureauIcons.Back className="bureau-icon w-4 h-4" />
            BACK
          </Link>
          <h1 className="heading-2">Notifications</h1>
          <button
            onClick={handleRefresh}
            className="p-2 border border-nexus-borderSubtle text-nexus-textSubtle hover:text-nexus-text touch-target-primary"
            aria-label="Refresh notifications"
            disabled={isRefreshing}
            type="button"
          >
            <BureauIcons.Refresh className={cn('bureau-icon w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => void markAllNotificationsRead()}
            className="nexus-btn nexus-btn-secondary w-full mb-4 touch-target-comfortable"
            type="button"
          >
            <BureauIcons.Check className="bureau-icon w-4 h-4" />
            MARK ALL AS READ ({unreadCount})
          </button>
        )}

        {notifications.length === 0 ? (
          <DocumentShell
            reference="Notifications"
            title="No transmissions"
            stock="paper"
            footer={<Stamp variant="archived">Empty</Stamp>}
          >
            <div className="text-center py-8">
              <BureauIcons.BellOff className="bureau-icon w-8 h-8 text-nexus-textSubtle mx-auto mb-3" aria-hidden="true" />
              <p className="text-nexus-textMuted">No transmissions for your team.</p>
              <p className="text-sm text-nexus-textSubtle mt-1">
                Objective updates and Bureau notices appear here.
              </p>
            </div>
          </DocumentShell>
        ) : (
          <RegisterList>
            {notifications.map(n => {
              const stamp = PRIORITY_STAMP[n.priority] ?? PRIORITY_STAMP.NORMAL
              return (
                <RegisterRow
                  key={n.id}
                  id={formatDateTime(n.createdAt)}
                  label={
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <StateMarker glyph="●" tone="active" label="Unread" />
                      )}
                      <span className="font-medium text-nexus-text">{n.title}</span>
                    </div>
                  }
                  meta={
                    <div className="flex items-center gap-2 mt-1">
                      <Stamp variant={stamp.variant} impressed>
                        {stamp.label}
                      </Stamp>
                      <span className="text-xs text-nexus-textMuted font-mono">
                        {n.message}
                      </span>
                    </div>
                  }
                  trailing={
                    <button
                      onClick={() => handleOpen(n.id, n.isRead, n.actionUrl)}
                      className="text-xs text-nexus-textSubtle hover:text-nexus-text font-mono"
                      aria-label={`Open ${n.title}`}
                      type="button"
                    >
                      OPEN
                    </button>
                  }
                  className={cn(
                    'cursor-pointer',
                    !n.isRead && 'bg-nexus-accentBg/10',
                  )}
                />
              )
            })}
          </RegisterList>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-nexus-textSubtle">
          <BureauIcons.Bell className="bureau-icon w-3 h-3" aria-hidden="true" />
          Team-wide. Individual player data is never shown here.
        </div>
      </div>
    </div>
  )
}
