/**
 * NEXUS — Leaderboard
 *
 * Live server-authoritative leaderboard.
 */

import { useEffect, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-neutral-400'
    if (rank === 3) return 'text-orange-400'
    return 'text-nexus-textSubtle'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Leaderboard</h1>
          <p className="text-nexus-textMuted mt-1">
            Server-authoritative rankings • {leaderboard.length} teams
          </p>
        </div>
        <button
          onClick={() => { void fetchLeaderboard() }}
          disabled={isLoading}
          className="btn-secondary text-xs py-1.5"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 text-nexus-danger text-sm animate-slide-down">
          {error}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nexus-borderSubtle">
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Rank</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Team</th>
                <th className="center py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Status</th>
                <th className="right py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Solved</th>
                <th className="right py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Hints</th>
                <th className="right py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Time Elapsed</th>
                <th className="right py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Score</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-nexus-textSubtle">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading leaderboard…
                  </td>
                </tr>
              ) : sortedLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-nexus-textSubtle">
                    No teams registered yet
                  </td>
                </tr>
              ) : (
                sortedLeaderboard.map((entry, idx) => {
                  const rank = idx + 1
                  return (
                    <tr
                      key={entry.teamId}
                      className="border-b border-nexus-borderSubtle/50 hover:bg-nexus-bg/50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn('font-display font-bold w-6 text-center', getRankColor(rank))}>
                            {getRankIcon(rank) ?? `#${rank}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-nexus-surfaceElevated flex items-center justify-center">
                            <span className="font-display font-bold text-sm text-nexus-danger">
                              {entry.teamName.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-nexus-text">{entry.teamName}</span>
                            <div className="text-xs text-nexus-textSubtle font-mono">
                              {entry.teamCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 center">
                        <TeamStatusBadge status={entry.status} showDot={false} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-nexus-text">{entry.solvedCount ?? 0}/10</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-nexus-warning">{entry.hintsUsed ?? 0}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs text-nexus-textSubtle">
                          {formatDuration(((entry.timeElapsedMinutes ?? 0) * 60000))}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-nexus-warning">
                          {formatNumber(entry.score ?? 0)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
