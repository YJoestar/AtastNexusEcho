/**
 * NEXUS — Audit Log
 *
 * Real audit log from the server. All admin actions are logged.
 */

import { useEffect, useMemo, useState } from 'react'
import { BureauIcons } from '@/components/bureau'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import type { AuditLogEntryAdmin } from '@/lib/admin'

const ACTION_ICONS: Record<string, JSX.Element> = {
  TEAM_CREATE: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-info" />,
  TEAM_START: <BureauIcons.Play className="bureau-icon w-4 h-4 text-nexus-accent" />,
  TEAM_PAUSE: <BureauIcons.Pause className="bureau-icon w-4 h-4 text-nexus-warning" />,
  TEAM_RESUME: <BureauIcons.Play className="bureau-icon w-4 h-4 text-nexus-accent" />,
  TEAM_COMPLETE: <BureauIcons.Play className="bureau-icon w-4 h-4 text-nexus-accent" />,
  TEAM_DISQUALIFY: <BureauIcons.Alert className="bureau-icon w-4 h-4 text-nexus-danger" />,
  TEAM_DELETE: <BureauIcons.Trash className="bureau-icon w-4 h-4 text-nexus-danger" />,
  TEAM_UPDATE: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-info" />,
  ROLE_ASSIGN: <BureauIcons.Users className="bureau-icon w-4 h-4 text-nexus-info" />,
  ROLE_REASSIGN: <BureauIcons.Users className="bureau-icon w-4 h-4 text-nexus-info" />,
  NODE_UNLOCK: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-warning" />,
  NODE_LOCK: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-textMuted" />,
  NODE_SKIP: <BureauIcons.Alert className="bureau-icon w-4 h-4 text-nexus-textMuted" />,
  HINT_GRANT: <BureauIcons.Lightbulb className="bureau-icon w-4 h-4 text-nexus-warning" />,
  ANNOUNCEMENT_SEND: <BureauIcons.Send className="bureau-icon w-4 h-4 text-nexus-info" />,
  SCORE_ADJUST: <BureauIcons.Alert className="bureau-icon w-4 h-4 text-nexus-warning" />,
  SUBMISSION_OVERRIDE: <BureauIcons.Alert className="bureau-icon w-4 h-4 text-nexus-info" />,
  TIME_ADJUST: <BureauIcons.Clock className="bureau-icon w-4 h-4 text-nexus-info" />,
  GAME_START: <BureauIcons.Play className="bureau-icon w-4 h-4 text-nexus-accent" />,
  GAME_PAUSE: <BureauIcons.Pause className="bureau-icon w-4 h-4 text-nexus-warning" />,
  GAME_END: <BureauIcons.Alert className="bureau-icon w-4 h-4 text-nexus-danger" />,
  CONFIG_UPDATE: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-info" />,
  EVIDENCE_GRANT: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-accent" />,
  ITEM_GRANT: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-warning" />,
  FRAGMENT_REVEAL: <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-info" />,
  LOCATION_CREATE: <BureauIcons.MapPin className="bureau-icon w-4 h-4 text-nexus-info" />,
  LOCATION_UPDATE: <BureauIcons.MapPin className="bureau-icon w-4 h-4 text-nexus-warning" />,
  LOCATION_DELETE: <BureauIcons.MapPin className="bureau-icon w-4 h-4 text-nexus-danger" />,
}

export function AdminAudit() {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const {
    auditLog,
    isLoading,
    error,
    fetchAuditLog,
  } = useBureau()

  useEffect(() => {
    void fetchAuditLog(200, actionFilter, searchTerm)
  }, [fetchAuditLog, actionFilter, searchTerm])

  const filteredLog = useMemo(() => {
    return (auditLog ?? []).filter(entry => {
      if (!searchTerm) return true
      const searchFields = [
        entry.action,
        entry.reason,
        entry.targetTeamId,
        entry.targetPlayerId,
        entry.adminId,
      ].filter(Boolean).join(' ').toLowerCase()
      return searchFields.includes(searchTerm.toLowerCase())
    })
  }, [auditLog, searchTerm])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action] ?? <BureauIcons.Shield className="bureau-icon w-4 h-4 text-nexus-textSubtle" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Audit Log</h1>
          <p className="text-nexus-textMuted mt-1">
            {auditLog?.length ?? 0} entries recorded
          </p>
        </div>
        <button
          onClick={() => void fetchAuditLog(200, actionFilter, searchTerm)}
          disabled={isLoading}
          className="btn-secondary text-xs py-1.5"
        >
          <BureauIcons.Refresh className={cn('bureau-icon w- h-4', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <BureauIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search by team, action, or reason…"
            className="input pl-10"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="input w-48"
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_ICONS).map(action => (
            <option key={action} value={action}>
              {action.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 text-nexus-danger text-sm animate-slide-down">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nexus-borderSubtle">
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Action</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Target</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Reason</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-nexus-textSubtle">
                    <BureauIcons.Refresh className="bureau-icon w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading audit log…
                  </td>
                </tr>
              ) : filteredLog.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-nexus-textSubtle">
                    {searchTerm || actionFilter ? 'No matching entries' : 'No audit entries recorded'}
                  </td>
                </tr>
              ) : (
                filteredLog.map(entry => (
                  <AuditRow key={entry.id} entry={entry} getActionIcon={getActionIcon} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AuditRow({
  entry,
  getActionIcon,
}: {
  entry: AuditLogEntryAdmin
  getActionIcon: (action: string) => JSX.Element
}) {
  const targetText = entry.targetTeamId
    ? `Team: ${entry.targetTeamId}`
    : entry.targetPlayerId
    ? `Player: ${entry.targetPlayerId}`
    : entry.targetNodeId
    ? `Node: ${entry.targetNodeId}`
    : 'System'

  const payloadText = formatPayload(entry.payload)

  return (
    <tr className="border-b border-nexus-borderSubtle/50 hover:bg-nexus-bg/50">
      <td className="py-3 px-4">
        <span className="text-sm text-nexus-textSubtle whitespace-nowrap">
          {formatDateTime(entry.createdAt)}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="bureau-icon w-8 h-8 rounded-lg bg-nexus-surfaceElevated flex items-center justify-center">
            {getActionIcon(entry.action)}
          </div>
          <span className="font-mono text-xs text-nexus-text">
            {entry.action.replace(/_/g, ' ')}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-nexus-text">{targetText}</span>
        {payloadText && (
          <span className="text-xs text-nexus-textSubtle block mt-0.5">
            {payloadText}
          </span>
        )}
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-nexus-textMuted">{entry.reason ?? '—'}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-nexus-textSubtle font-mono">{entry.ipAddress ?? '—'}</span>
      </td>
    </tr>
  )
}

function formatPayload(payload: Record<string, unknown>): string | null {
  if (!payload) return null
  const entries = Object.entries(payload).filter(([key]) =>
    !['action', 'oldValue', 'newValue'].includes(key)
  )
  if (entries.length === 0) return null
  return entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ')
}





