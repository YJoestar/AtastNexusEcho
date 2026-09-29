/**
 * NEXUS — Player Leaderboard
 * Real-time team rankings with only safe, public information.
 * Never reveals solution details, team compositions, or private data.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy, TrendingUp, Circle, CheckCircle } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

export function PlayerLeaderboard() {
  const { team, leaderboard, teamProgress, fetchLeaderboard, solvedCount, totalNodes } = useGameEngine()
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(() => {
      fetchLeaderboard()
      setLastRefresh(new Date())
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const currentTeamRank = leaderboard?.findIndex(t => t.teamCode === team?.code)
  const safeRank = currentTeamRank !== undefined && currentTeamRank >= 0 ? currentTeamRank + 1 : null

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div className="page pb-[72px] md:pb-0">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 rounded-xl text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="heading-3">Leaderboard</h1>
            <p className="text-nexus-textMuted text-sm">
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Current Team Highlight */}
        {team && (
          <div className="panel bg-nexus-accentBg/30 border-nexus-accent/30 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-nexus-accentBg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-nexus-accent" />
                </div>
                <div>
                  <p className="font-medium text-nexus-text">Your Team: {team.name}</p>
                  <p className="text-sm text-nexus-textMuted">
                    {safeRank ? `Rank: #${safeRank}` : 'Not yet ranked'} · Code: {team.code}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-nexus-accent">
                  {teamProgress?.score?.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-nexus-textMuted">points</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {leaderboard && leaderboard.length > 0 ? (
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-nexus-borderSubtle">
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider w-12">
                      Rank
                    </th>
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                      Team
                    </th>
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider text-right w-24">
                      Score
                    </th>
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider text-right w-20">
                      Solved
                    </th>
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider text-right w-24">
                      Time
                    </th>
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider text-right w-16">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(entry => {
                    const isCurrentTeam = entry.teamCode === team?.code
                    const isCompleted = entry.status === 'COMPLETED'
                    const solvedPct = entry.score > 0 ? `${entry.score} pts` : '—'
                    return (
                      <tr
                        key={entry.teamCode}
                        className={cn(
                          'border-b border-nexus-borderSubtle/50 last:border-0',
                          isCurrentTeam && 'bg-nexus-accentBg/30',
                        )}
                      >
                        <td className="p-3">
                          {entry.rank <= 3 ? (
                            <span
                              className={cn(
                                'font-bold',
                                entry.rank === 1 && 'text-yellow-400',
                                entry.rank === 2 && 'text-neutral-400',
                                entry.rank === 3 && 'text-orange-400',
                              )}
                            >
                              #{entry.rank}
                            </span>
                          ) : (
                            <span className="text-nexus-textMuted">#{entry.rank}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'badge',
                                isCompleted
                                  ? 'badge-accent'
                                  : 'bg-nexus-warningBg text-nexus-warning',
                              )}
                            >
                              <Circle className="w-1.5 h-1.5" />
                            </span>
                            <p
                              className={cn(
                                'font-medium truncate max-w-[140px]',
                                isCurrentTeam && 'text-nexus-accent',
                              )}
                            >
                              {entry.teamName}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-nexus-text">
                          {entry.score.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-nexus-textMuted font-mono">
                          {solvedPct}
                        </td>
                        <td className="p-3 text-right text-nexus-textMuted font-mono">
                          {formatTime(entry.elapsedMinutes)}
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-xs text-nexus-textSubtle">
                            {isCompleted ? 'Complete' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="panel text-center py-12">
            <Trophy className="w-12 h-12 text-nexus-textSubtle mx-auto mb-4" />
            <h3 className="heading-4 mb-2">No Rankings Available</h3>
            <p className="text-nexus-textMuted">
              Rankings update as teams begin the investigation.
            </p>
          </div>
        )}

        {/* Stats Summary */}
        {leaderboard && (
          <div className="panel grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-nexus-bg rounded-xl">
              <Trophy className="w-6 h-6 text-nexus-accent mx-auto mb-1" />
              <p className="text-2xl font-mono font-bold text-nexus-accent">
                {leaderboard.length}
              </p>
              <p className="text-xs text-nexus-textMuted">Teams Ranked</p>
            </div>
            <div className="p-3 bg-nexus-bg rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-mono font-bold text-green-400">
                {leaderboard.filter(t => t.status === 'COMPLETED').length}
              </p>
              <p className="text-xs text-nexus-textMuted">Completed</p>
            </div>
            <div className="p-3 bg-nexus-bg rounded-xl">
              <TrendingUp className="w-6 h-6 text-nexus-info mx-auto mb-1" />
              <p className="text-2xl font-mono font-bold text-nexus-info">
                {teamProgress ? Math.round((solvedCount / totalNodes) * 100) : 0}%
              </p>
              <p className="text-xs text-nexus-textMuted">Your Progress</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
