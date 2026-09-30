/**
 * NEXUS — Custom Notification Modal
 *
 * Allows Bureau operators to send targeted notifications to player teams.
 * Integrates with the existing notifications system via adminAPI.sendNotification().
 */

import { useState } from 'react'
import { X, Send, Users, User, Bell, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminAPI } from '@/lib/admin'
import { NOTIFICATION_TYPE_OPTIONS, NOTIFICATION_PRIORITY_OPTIONS } from '@/app/config'
import type { TeamWithStats } from '@/lib/admin'

interface CustomNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  teams: TeamWithStats[]
  onNotificationSent?: () => void
}

export function CustomNotificationModal({
  isOpen,
  onClose,
  teams,
  onNotificationSent,
}: CustomNotificationModalProps) {
  const [target, setTarget] = useState<'all' | 'single'>('all')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [notifType, setNotifType] = useState('ADMIN_MESSAGE')
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('HIGH')
  const [reason, setReason] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isOpen) return null

  const eligibleTeams = teams.filter(t =>
    ['ACTIVE', 'PAUSED', 'WAITING', 'READY'].includes(t.status)
  )

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required')
      return
    }

    if (target === 'single' && !selectedTeamId) {
      setError('Please select a team')
      return
    }

    setIsSending(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await adminAPI.sendNotification({
        target: target === 'all' ? 'all' : 'single',
        teamIds: target === 'single' ? [selectedTeamId] : undefined,
        title: title.trim(),
        message: message.trim(),
        notifType,
        priority,
        reason: reason.trim() || undefined,
      })

      setSuccess(`Notification sent to ${result.teamsNotified} team(s)`)
      setTitle('')
      setMessage('')
      setReason('')
      onNotificationSent?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send notification')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (isSending) return
    setTitle('')
    setMessage('')
    setReason('')
    setError(null)
    setSuccess(null)
    setTarget('all')
    setSelectedTeamId('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-nexus-surface border border-nexus-border rounded-2xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-nexus-borderSubtle">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-nexus-info" />
            <h2 className="heading-3">Send Notification</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="p-2 rounded-lg text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-nexus-dangerBg/20 border border-nexus-danger/30 text-nexus-danger text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-nexus-accentBg/20 border border-nexus-accent/30 text-nexus-accent text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Recipient */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Recipients
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTarget('all')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  target === 'all'
                    ? 'border-nexus-accent bg-nexus-accentBg text-nexus-accent'
                    : 'border-nexus-border text-nexus-textMuted hover:bg-nexus-bg',
                )}
              >
                <Users className="w-4 h-4" />
                All Active Teams
              </button>
              <button
                type="button"
                onClick={() => setTarget('single')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  target === 'single'
                    ? 'border-nexus-accent bg-nexus-accentBg text-nexus-accent'
                    : 'border-nexus-border text-nexus-textMuted hover:bg-nexus-bg',
                )}
              >
                <User className="w-4 h-4" />
                Single Team
              </button>
            </div>

            {target === 'single' && eligibleTeams.length > 0 && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent"
              >
                <option value="">Select a team…</option>
                {eligibleTeams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) — {t.status}
                  </option>
                ))}
              </select>
            )}

            {target === 'single' && eligibleTeams.length === 0 && (
              <p className="text-sm text-nexus-textMuted">
                No active teams available to notify.
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Type
            </label>
            <select
              value={notifType}
              onChange={(e) => setNotifType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent"
            >
              {NOTIFICATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Priority
            </label>
            <div className="flex gap-3">
              {NOTIFICATION_PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    priority === opt.value
                      ? 'border-nexus-accent bg-nexus-accentBg text-nexus-accent'
                      : 'border-nexus-border text-nexus-textMuted hover:bg-nexus-bg',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Important Update"
              disabled={isSending}
              className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent disabled:opacity-50"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              disabled={isSending}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent disabled:opacity-50 resize-y"
            />
          </div>

          {/* Reason (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Reason <span className="text-nexus-textSubtle">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Server maintenance at 18:00 UTC"
              disabled={isSending}
              className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-nexus-borderSubtle bg-nexus-bg/50 rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="px-4 py-2 text-sm font-medium text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated rounded-xl transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSending || !title.trim() || !message.trim()}
            className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block mr-2" />
                SENDING…
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                SEND
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
