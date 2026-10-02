/**
 * NEXUS — Operational Field Record
 *
 * Server-authoritative investigation ledger and performance records.
 * Rendered as an archival record board.
 */

import { useEffect, useMemo } from 'react'
import { BureauIcons, TerminalFrame } from '@/components/bureau'
import { formatNumber } from '@/lib/utils'
import { formatDuration } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'

export function AdminLeaderboard() {
  const {
    leaderboard,
    isLoading,
    error,
    fetchLeaderboard,
  } = useBureau()

  useEffect(() => {
    void fetchLeaderboard()
  }, [fetchLeaderboard])

  const sortedLeaderboard = useMemo(() => {
    return [...(leaderboard ?? [])].sort((a, b) => {
      if (a.solvedCount !== b.solvedCount) {
        return b.solvedCount - a.solvedCount
      }
      if (a.score !== b.score) {
        return b.score - a.score
      }
      return (a.timeElapsedMinutes ?? 0) - (b.timeElapsedMinutes ?? 0)
    })
  }, [leaderboard])

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-nexus-border bg-nexus-surfaceElevated p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-nexus-accent" />
              <span className="text-[0.625rem] tracking-[0.24em] uppercase text-nexus-textSubtle">
                NEXUS ECHO // ARCHIVAL OPERATIONS RECORD
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-nexus-text mt-1">
              FIELD INVESTIGATION RECORD BOARD
            </h1>
          </div>

          <button
            type="button"
            onClick={() => { void fetchLeaderboard() }}
            disabled={isLoading}
            className="nexus-btn-secondary text-xs px-3 py-1.5"
          >
            <BureauIcons.Refresh className="bureau-icon w-3.5 h-3.5" />
            <span>[ RE-INDEX OPERATIONAL RECORD ]</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-nexus-dangerBg/30 border border-nexus-danger text-nexus-danger text-xs">
          RECORD RETRIEVAL ERROR: {error}
        </div>
      )}

      {/* Field Record Board */}
      <TerminalFrame
        title="BUREAU OPERATIONAL LEDGER"
        reference={`${sortedLeaderboard.length} TEAMS FILED`}
        variant="register"
      >
        {isLoading ? (
          <div className="py-12 text-center text-nexus-textSubtle font-mono text-xs">
            <BureauIcons.Spinner className="bureau-icon w-6 h-6 animate-spin mx-auto mb-2 text-nexus-accent" />
            <span>DECODING OFFICIAL RECORD BOARD…</span>
          </div>
        ) : sortedLeaderboard.length === 0 ? (
          <div className="py-12 text-center text-nexus-textSubtle font-mono text-xs">
            <p>NO OPERATIONAL RECORDS TRANSMITTED</p>
            <p className="text-[0.625rem] mt-1 text-nexus-textMuted">AWAITING FIRST VERIFIED EVIDENCE SUBMISSION</p>
          </div>
        ) : (
          <ol className="divide-y divide-nexus-borderSubtle">
            {sortedLeaderboard.map((entry, idx) => {
              const rank = idx + 1
              return (
                <li
                  key={entry.teamId}
                  className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-3 px-3 py-3 font-mono transition-colors hover:bg-nexus-surfaceElevated sm:grid-cols-[64px_minmax(0,1fr)]"
                >
                  <span className="self-stretch border-r border-nexus-border pr-2 pt-1 text-sm font-bold tabular-nums text-nexus-accent">
                    {rank.toString().padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="mr-2 text-xs font-bold text-nexus-text">{entry.teamCode}</span>
                        <span className="break-words text-sm font-bold text-nexus-text">{entry.teamName}</span>
                      </div>
                      <TeamStatusBadge status={entry.status} showDot={false} />
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-nexus-borderSubtle pt-2 text-[0.6rem] sm:grid-cols-4">
                      <div>
                        <dt className="text-[0.48rem] uppercase tracking-[0.12em] text-nexus-textSubtle">Nodes verified</dt>
                        <dd className="mt-0.5 font-bold text-nexus-text">{entry.solvedCount ?? 0}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.48rem] uppercase tracking-[0.12em] text-nexus-textSubtle">Aids issued</dt>
                        <dd className="mt-0.5 font-bold text-nexus-warning">{entry.hintsUsed ?? 0}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.48rem] uppercase tracking-[0.12em] text-nexus-textSubtle">Elapsed</dt>
                        <dd className="mt-0.5 tabular-nums text-nexus-textMuted">{formatDuration((entry.timeElapsedMinutes ?? 0) * 60000)}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.48rem] uppercase tracking-[0.12em] text-nexus-textSubtle">Score filed</dt>
                        <dd className="mt-0.5 font-bold text-nexus-accent">{formatNumber(entry.score ?? 0)}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </TerminalFrame>
    </div>
  )
}
