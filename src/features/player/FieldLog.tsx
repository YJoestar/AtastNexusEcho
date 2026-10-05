/**
 * NEXUS ECHO — Player Field Log
 *
 * Chronological investigation log for the field team. Records QR scans, puzzle
 * solves, evidence discoveries, hints used, role handoffs, contradictions noted,
 * and leads received. The team's memory of what happened, not a system event log.
 */

import { useMemo, useState } from 'react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { BureauIcons } from '@/components/bureau'
import {
  DocumentShell,
  Stamp,
  StateMarker,
} from '@/components/bureau'
import { formatTime, startOfDay, parseISO } from '@/lib/time'

export interface FieldLogEntry {
  id: string
  timestamp: string
  kind: 'qr_scan' | 'puzzle_solved' | 'evidence_found' | 'hint_used' | 'lead_received' | 'role_action' | 'contradiction' | 'system'
  title: string
  detail?: string
  role?: string
  nodeCode?: string
  icon?: string
}

const KIND_ICON: Record<FieldLogEntry['kind'], keyof typeof BureauIcons> = {
  qr_scan: 'ScanLine',
  puzzle_solved: 'Flag',
  evidence_found: 'File',
  hint_used: 'Help',
  lead_received: 'Target',
  role_action: 'Users',
  contradiction: 'AlertTriangle',
  system: 'Radio',
}

const KIND_LABEL: Record<FieldLogEntry['kind'], string> = {
  qr_scan: 'QR SCAN',
  puzzle_solved: 'PUZZLE SOLVED',
  evidence_found: 'EVIDENCE FOUND',
  hint_used: 'HINT USED',
  lead_received: 'LEAD RECEIVED',
  role_action: 'ROLE ACTION',
  contradiction: 'CONTRADICTION',
  system: 'SYSTEM',
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

function dayLabel(date: string): string {
  const d = parseISO(date)
  const today = startOfDay()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (sameDay(date, today.toISOString())) return 'TODAY'
  if (sameDay(date, yesterday.toISOString())) return 'YESTERDAY'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
}

function deduplicateEntries(entries: FieldLogEntry[]): FieldLogEntry[] {
  const seen = new Map<string, FieldLogEntry>()
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.nodeCode ?? 'none'}:${Math.floor(new Date(entry.timestamp).getTime() / 5000)}`
    const existing = seen.get(key)
    if (!existing || new Date(entry.timestamp) > new Date(existing.timestamp)) {
      seen.set(key, entry)
    }
  }
  return Array.from(seen.values())
}

function capEntries(entries: FieldLogEntry[], max = 100): FieldLogEntry[] {
  return entries.slice(0, max)
}

export function PlayerFieldLog() {
  const { nodeProgress, notifications, teamProgress, role } = useGameEngine()
  const { workspace } = useInvestigationWorkspace(teamProgress?.teamId ?? null)

  const [manualEntries, _setManualEntries] = useState<FieldLogEntry[]>([])

  const allEntries = useMemo(() => {
    const entries: FieldLogEntry[] = []

    for (const progress of nodeProgress) {
      if (progress.status === 'SOLVED' && progress.solvedAt) {
        entries.push({
          id: `solve_${progress.nodeCode}`,
          timestamp: progress.solvedAt,
          kind: 'puzzle_solved',
          title: `${progress.nodeCode} solved`,
          detail: progress.title,
          nodeCode: progress.nodeCode,
          role: role ?? undefined,
        })
      }
    }

    for (const [clueId, discovery] of Object.entries(workspace.discoveries)) {
      if (discovery.discoveredAt) {
        entries.push({
          id: `evidence_${clueId}`,
          timestamp: discovery.discoveredAt,
          kind: 'evidence_found',
          title: `Evidence discovered: ${clueId}`,
          detail: `Method: ${discovery.via}`,
          nodeCode: clueId,
          role: discovery.via === 'TIMELINE_COMPARISON' ? 'ANALYST' : undefined,
        })
      }
    }

    for (const notification of notifications) {
      const systemTypes = ['SYSTEM', 'ADMIN_MESSAGE', 'GAME_PHASE_CHANGE', 'TEAM_STATUS_CHANGE']
      if (systemTypes.includes(notification.type)) {
        entries.push({
          id: `sys_${notification.id}`,
          timestamp: notification.createdAt,
          kind: 'system',
          title: notification.title,
          detail: notification.message,
        })
      }
    }

    if (teamProgress?.currentNodeId) {
      entries.push({
        id: `lead_${teamProgress.currentNodeId}`,
        timestamp: teamProgress.lastActivityAt ?? new Date().toISOString(),
        kind: 'lead_received',
        title: `Lead assigned: ${teamProgress.currentNodeId}`,
        detail: 'New investigation site unlocked',
        nodeCode: teamProgress.currentNodeId,
      })
    }

    entries.push(...manualEntries)

    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const deduped = deduplicateEntries(entries)
    return capEntries(deduped)
  }, [nodeProgress, workspace.discoveries, notifications, teamProgress, manualEntries, role])

  const groupedEntries = useMemo(() => {
    const groups: Record<string, FieldLogEntry[]> = {}
    for (const entry of allEntries) {
      const label = dayLabel(entry.timestamp)
      if (!groups[label]) groups[label] = []
      groups[label].push(entry)
    }
    return groups
  }, [allEntries])

  const dateGroups = Object.keys(groupedEntries).sort((a, b) => {
    const aFirst = groupedEntries[a][0]?.timestamp ?? ''
    const bFirst = groupedEntries[b][0]?.timestamp ?? ''
    return new Date(bFirst).getTime() - new Date(aFirst).getTime()
  })

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto">
        <header className="mb-5 flex items-center gap-3 border-b border-nexus-border pb-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-nexus-textSubtle">FIELD RECORD · CASE 037</p>
            <h1 className="mt-1 font-mono text-lg font-bold text-nexus-text">FIELD LOG</h1>
          </div>
        </header>

        {allEntries.length === 0 ? (
          <DocumentShell
            reference="FIELD RECORD / CASE 037"
            title="NO ACTIVITY RECORDED"
            subtitle="Begin the investigation."
            stock="paper"
            footer={<Stamp variant="archived">Awaiting first entry</Stamp>}
          >
            <div className="text-center py-8 text-nexus-textMuted">
              <BureauIcons.File className="bureau-icon w-12 h-12 mx-auto mb-3 text-nexus-textSubtle" />
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em]" role="status">NO ACTIVITY RECORDED</p>
              <p className="mt-1 text-sm text-nexus-textMuted">Begin the investigation.</p>
            </div>
          </DocumentShell>
        ) : (
          <ul className="border-y border-nexus-borderSubtle divide-y divide-nexus-borderSubtle" role="list" aria-label="Field log entries">
            {dateGroups.map(dateKey => (
              <div key={dateKey} className="px-1 py-2 border-b border-nexus-borderSubtle/50 bg-nexus-surfaceElevated/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                    {dateKey}
                  </span>
                  <span className="h-px flex-1 bg-nexus-borderSubtle" aria-hidden="true" />
                </div>
                {groupedEntries[dateKey].map(entry => {
                  const Icon = BureauIcons[KIND_ICON[entry.kind]]
                  return (
                    <li
                      key={entry.id}
                      className="px-1 py-2 register-row"
                      role="listitem"
                    >
                      <div className="flex items-start gap-3">
                        <time
                          className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-nexus-textSubtle shrink-0 mt-0.5"
                          aria-label={entry.timestamp}
                        >
                          {formatTime(entry.timestamp)}
                        </time>
                        <Icon className="bureau-icon w-4 h-4 text-nexus-accent shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Stamp variant="incomplete" size="xs" impressed>
                              {KIND_LABEL[entry.kind]}
                            </Stamp>
                            {entry.role && (
                              <StateMarker
                                glyph={entry.role === 'OBSERVER' ? '●' : entry.role === 'ANALYST' ? '■' : '▲'}
                                tone="active"
                                label={entry.role}
                              />
                            )}
                          </div>
                          <p className="mt-1 font-medium text-nexus-text truncate">{entry.title}</p>
                          {entry.detail && (
                            <p className="mt-0.5 text-sm text-nexus-textMuted truncate">{entry.detail}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </div>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-nexus-textSubtle">
          <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em]">
            FIELD RECORD / TEAM SCOPE ONLY / NOT A COMMS CHANNEL
          </span>
        </div>
      </div>
    </div>
  )
}