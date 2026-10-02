/**
 * NEXUS — Player Notifications
 *
 * Team-scoped message centre. Content comes from the server
 * (game-notifications -> get_team_notifications, RLS-scoped to the caller's
 * own team). Marking read is persisted server-side through game-mark-read, so
 * an unread badge cannot reappear after a refresh.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, refreshNotifications } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshNotifications()
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshNotifications])

  const handleOpen = useCallback(
    (id: string, isRead: boolean, actionUrl?: string) => {
      if (!isRead) markNotificationRead(id)
      if (actionUrl) {
        if (actionUrl.startsWith('/player/')) {
          navigate(actionUrl)
        }
      }
    },
    [markNotificationRead, navigate],
  )

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to={ROUTES.PLAYER_GAME} className="nexus-btn nexus-btn-ghost touch-target-primary" aria-label="RETURN TO FIELD">
            <BureauIcons.Back className="bureau-icon w-4 h-4" />
            BACK
          </Link>
          <h1 className="heading-2">FIELD COMMUNICATIONS</h1>
          <button
            onClick={handleRefresh}
            className="p-2 border border-nexus-borderSubtle text-nexus-textSubtle hover:text-nexus-text touch-target-primary"
            aria-label="Re-query field channel"
            title="Re-query channel"
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
            ACKNOWLEDGE ALL DISPATCHES ({unreadCount})
          </button>
        )}

        {notifications.length === 0 ? (
          <DocumentShell
            reference="FIELD CHANNEL / CASE 037"
            title="NO DISPATCH RECEIVED"
            stock="paper"
            footer={<Stamp variant="archived">Channel listening</Stamp>}
          >
            <div className="grid grid-cols-[6.5rem_1fr] border-y border-nexus-borderSubtle font-mono text-[0.8125rem] uppercase tracking-[0.12em]">
              <span className="border-r border-nexus-borderSubtle px-3 py-3 text-nexus-textSubtle">BUFFER</span>
              <span className="px-3 py-3 text-nexus-textMuted">NO INBOUND DISPATCHES IN LOCAL RECORD</span>
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
                        <StateMarker glyph="●" tone="active" label="UNREAD" />
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
                      [ REVIEW ]
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
          <span className="font-mono text-[0.75rem] uppercase tracking-[0.12em]">
            DISTRIBUTION / TEAM CHANNEL ONLY / PLAYER RECORDS WITHHELD
          </span>
        </div>
      </div>
    </div>
  )
}
