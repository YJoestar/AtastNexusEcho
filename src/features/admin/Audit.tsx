/**
 * NEXUS — Audit Log
 *
 * Real audit log from the server. All admin actions are logged.
 */

import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, AlertCircle, Shield, Users, Play, Pause, Lightbulb, Send, Clock, Trash2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import type { AuditLogEntryAdmin } from '@/lib/admin'

const ACTION_ICONS: Record<string, JSX.Element> = {
  TEAM_CREATE: <Shield className="w-4 h-4 text-nexus-info" />,
  TEAM_START: <Play className="w-4 h-4 text-nexus-accent" />,
  TEAM_PAUSE: <Pause className="w-4 h-4 text-nexus-warning" />,
  TEAM_RESUME: <Play className="w-4 h-4 text-nexus-accent" />,
  TEAM_COMPLETE: <Play className="w-4 h-4 text-nexus-accent" />,
  TEAM_DISQUALIFY: <AlertCircle className="w-4 h-4 text-nexus-danger" />,
  TEAM_DELETE: <Trash2 className="w-4 h-4 text-nexus-danger" />,
  TEAM_UPDATE: <Shield className="w-4 h-4 text-nexus-info" />,
  ROLE_ASSIGN: <Users className="w-4 h-4 text-nexus-info" />,
  ROLE_REASSIGN: <Users className="w-4 h-4 text-nexus-info" />,
  NODE_UNLOCK: <Shield className="w-4 h-4 text-nexus-warning" />,
  NODE_LOCK: <Shield className="w-4 h-4 text-nexus-textMuted" />,
  NODE_SKIP: <AlertCircle className="w-4 h-4 text-nexus-textMuted" />,
  HINT_GRANT: <Lightbulb className="w-4 h-4 text-nexus-warning" />,
  ANNOUNCEMENT_SEND: <Send className="w-4 h-4 text-nexus-info" />,
  SCORE_ADJUST: <AlertCircle className="w-4 h-4 text-nexus-warning" />,
  SUBMISSION_OVERRIDE: <AlertCircle className="w-4 h-4 text-nexus-info" />,
  TIME_ADJUST: <Clock className="w-4 h-4 text-nexus-info" />,
  GAME_START: <Play className="w-4 h-4 text-nexus-accent" />,
  GAME_PAUSE: <Pause className="w-4 h-4 text-nexus-warning" />,
  GAME_END: <AlertCircle className="w-4 h-4 text-nexus-danger" />,
  CONFIG_UPDATE: <Shield className="w-4 h-4 text-nexus-info" />,
  EVIDENCE_GRANT: <Shield className="w-4 h-4 text-cyan-400" />,
  ITEM_GRANT: <Shield className="w-4 h-4 text-amber-400" />,
  FRAGMENT_REVEAL: <Shield className="w-4 h-4 text-purple-400" />,
  LOCATION_CREATE: <MapPin className="w-4 h-4 text-nexus-info" />,
  LOCATION_UPDATE: <MapPin className="w-4 h-4 text-nexus-warning" />,
  LOCATION_DELETE: <MapPin className="w-4 h-4 text-nexus-danger" />,
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
    return ACTION_ICONS[action] ?? <Shield className="w-4 h-4 text-nexus-textSubtle" />
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
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
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
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
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
          <div className="w-8 h-8 rounded-lg bg-nexus-surfaceElevated flex items-center justify-center">
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
