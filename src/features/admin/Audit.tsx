/**
 * NEXUS — System Access Record & Chrono-Audit
 *
 * Immutable chronological access log of all bureau operations.
 * Rendered as a forensic system record.
 */

import { useEffect, useMemo, useState } from 'react'
import { BureauIcons, IncidentLog, TerminalFrame, type IncidentEntry } from '@/components/bureau'
import { formatDateTime } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'

const ACTION_LABELS: Record<string, string> = {
  TEAM_CREATE: 'UNIT PROVISIONED',
  TEAM_START: 'UNIT DEPLOYED',
  TEAM_PAUSE: 'UNIT SUSPENDED',
  TEAM_RESUME: 'UNIT RESUMED',
  TEAM_COMPLETE: 'MISSION COMPLETED',
  TEAM_DISQUALIFY: 'UNIT DISQUALIFIED',
  TEAM_DELETE: 'RECORD PURGED',
  TEAM_UPDATE: 'RECORD MODIFIED',
  ROLE_ASSIGN: 'ROLE ASSIGNED',
  ROLE_REASSIGN: 'ROLE REASSIGNED',
  NODE_UNLOCK: 'LOCATION UNLOCKED',
  NODE_LOCK: 'LOCATION SEALED',
  NODE_SKIP: 'MARKER BYPASSED',
  HINT_GRANT: 'DECRYPTION AID ISSUED',
  ANNOUNCEMENT_SEND: 'DIRECTIVE TRANSMITTED',
  SCORE_ADJUST: 'LEDGER ADJUSTED',
  SUBMISSION_OVERRIDE: 'SUBMISSION OVERRIDDEN',
  TIME_ADJUST: 'CHRONO ADJUSTED',
  GAME_START: 'MASTER INITIATION',
  GAME_PAUSE: 'MASTER HOLD',
  GAME_END: 'MASTER TERMINATION',
  CONFIG_UPDATE: 'PARAMETERS MODIFIED',
  EVIDENCE_GRANT: 'EVIDENCE RECORDED',
  ITEM_GRANT: 'ASSET ISSUED',
  FRAGMENT_REVEAL: 'FRAGMENT DECRYPTED',
  LOCATION_CREATE: 'LOCATION CATALOGUED',
  LOCATION_UPDATE: 'LOCATION MODIFIED',
  LOCATION_DELETE: 'LOCATION STRICKEN',
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

  const incidentEntries = useMemo((): (IncidentEntry | { gap: true; note?: string })[] => {
    const entries: (IncidentEntry | { gap: true; note?: string })[] = []
    filteredLog.forEach((entry, index) => {
      const previous = filteredLog[index - 1]
      if (previous) {
        const gapMinutes = Math.floor((new Date(previous.createdAt).getTime() - new Date(entry.createdAt).getTime()) / 60000)
        if (gapMinutes >= 5) entries.push({ gap: true, note: `[NO ACCESS RECORD FOR ${gapMinutes} MINUTES]` })
      }

      const target = entry.targetTeamId
        ? `UNIT ${entry.targetTeamId}`
        : entry.targetPlayerId
          ? `PLAYER ${entry.targetPlayerId}`
          : entry.targetNodeId
            ? `NODE ${entry.targetNodeId}`
            : 'SYSTEM ROOT'
      const action = ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, ' ')
      entries.push({
        time: formatDateTime(entry.createdAt),
        text: (
          <span className="block min-w-0">
            <span className="block font-mono text-xs font-bold text-nexus-text">
              <span className="mr-2 text-nexus-accent">REC {entry.id.slice(0, 8).toUpperCase()}</span>
              {action} / {target}
            </span>
            <span className="mt-1 block text-[0.65rem] text-nexus-textMuted">
              {entry.reason || 'NO JUSTIFICATION FILED'}
            </span>
            <span className="mt-1 block font-mono text-[0.52rem] uppercase tracking-[0.1em] text-nexus-textSubtle">
              OPERATOR {entry.adminId || 'UNRECORDED'} / SOURCE {entry.ipAddress || 'INTERNAL'}
            </span>
          </span>
        ),
      })
    })
    return entries
  }, [filteredLog])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-nexus-border bg-nexus-surfaceElevated p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-nexus-accent" />
              <span className="text-[0.625rem] tracking-[0.24em] uppercase text-nexus-textSubtle">
                NEXUS ECHO // SYSTEM ACCESS RECORD
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-nexus-text mt-1">
              ARCHIVAL ACTIVITY CHRONO-LOG
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void fetchAuditLog(200, actionFilter, searchTerm)}
            disabled={isLoading}
            className="nexus-btn-secondary text-xs px-3 py-1.5"
          >
            <BureauIcons.Refresh className="bureau-icon w-3.5 h-3.5" />
            <span>[ RE-QUERY ACCESS RECORD ]</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-3 pt-3 border-t border-nexus-borderSubtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <BureauIcons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-textSubtle" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="FILTER BY RECORD, OPERATOR, OR ACTION…"
              className="w-full bg-nexus-bg border border-nexus-border text-nexus-text pl-8 pr-3 py-1.5 text-xs placeholder:text-nexus-textSubtle focus:outline-none focus:border-nexus-accent font-mono"
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-nexus-bg border border-nexus-border text-nexus-text px-3 py-1.5 text-xs focus:outline-none focus:border-nexus-accent font-mono"
          >
            <option value="">ALL ACTION CLASSES</option>
            {Object.entries(ACTION_LABELS).map(([action, label]) => (
              <option key={action} value={action}>
                {label} [{action}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-nexus-dangerBg/30 border border-nexus-danger text-nexus-danger text-xs">
          LOG RETRIEVAL ERROR: {error}
        </div>
      )}

      {/* Audit Log Terminal Frame */}
      <TerminalFrame
        title="IMMUTABLE ACCESS LEDGER"
        reference={`${filteredLog.length} RECORDS FILED`}
        variant="register"
      >
        {isLoading ? (
          <div className="py-12 text-center text-nexus-textSubtle font-mono text-xs">
            <BureauIcons.Spinner className="bureau-icon w-6 h-6 animate-spin mx-auto mb-2 text-nexus-accent" />
            <span>READING ARCHIVAL LEDGER…</span>
          </div>
        ) : filteredLog.length === 0 ? (
          <div className="grid min-h-28 grid-cols-[120px_1fr] items-center gap-3 px-4 font-mono text-[0.625rem] uppercase tracking-[0.12em]">
            <span className="border-r border-nexus-border py-4 text-nexus-warning">NO RECORD</span>
            <span className="text-nexus-textSubtle">{searchTerm || actionFilter ? 'QUERY RETURNED NO MATCHING ACCESS RECORDS' : 'NO ACCESS ENTRIES IN THE AVAILABLE LEDGER'}</span>
          </div>
        ) : (
          <IncidentLog entries={incidentEntries} className="px-3" />
        )}
      </TerminalFrame>
    </div>
  )
}

