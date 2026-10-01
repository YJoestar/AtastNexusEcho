/**
 * NEXUS — Player Leaderboard
 * Real-time team rankings with only safe, public information.
 * Never reveals solution details, team compositions, or private data.
 * Bureau primitives: DocumentShell, RegisterColumn, RegisterList, RegisterRow,
 * StateMarker, Stamp, StatusMark. Bureau glyphs instead of emoji/lucide.
 */

import { Link } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { BureauIcons } from '@/components/bureau'
import {
  DocumentShell,
  FieldGrid,
  RegisterColumn,
  RegisterRow,
  StateMarker,
  Stamp,
  StatusMark,
} from '@/components/bureau'

const RANK_MARK: Record<number, string> = {
  1: '★',
  2: '●',
  3: '■',
}

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
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated touch-target-primary"
            aria-label="Back to game"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
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
          <DocumentShell
            reference="Your Team"
            title={team.name}
            subtitle={`Code: ${team.code}`}
            stock="carbon"
            footer={
              <>
                <Stamp variant="verified">Your Team</Stamp>
                <span className="font-mono text-sm tabular-nums text-nexus-accent">
                  {teamProgress?.score?.toLocaleString() ?? 0} pts
                </span>
              </>
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border border-nexus-borderSubtle flex items-center justify-center">
                <BureauIcons.Trophy className="bureau-icon w-6 h-6 text-nexus-accent" />
              </div>
              <div>
                <p className="font-medium text-nexus-text">
                  {safeRank ? `Rank: #${safeRank}` : 'Not yet ranked'}
                </p>
                <StatusMark tone="active">
                  {teamProgress ? 'Active' : 'Standing by'}
                </StatusMark>
              </div>
            </div>
          </DocumentShell>
        )}

        {/* Leaderboard Table */}
        {leaderboard && leaderboard.length > 0 ? (
          <RegisterColumn heading="Team Standings">
            <div className="overflow-x-auto">
              <table className="nexus-register w-full text-left">
                <thead>
                  <tr className="border-b border-nexus-borderSubtle">
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                      Team
                    </th>
                    <th className="p-3 text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider text-right w-24">
                      Score
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
                    const rankMark = RANK_MARK[entry.rank] ?? entry.rank
                    return (
                      <tr
                        key={entry.teamCode}
                        className={cn(
                          'border-b border-nexus-borderSubtle/50 last:border-0',
                          isCurrentTeam && 'bg-nexus-accentBg/20',
                        )}
                      >
                        <td className="p-3">
                          {entry.rank <= 3 ? (
                            <span className={cn(
                              'font-display text-lg',
                              entry.rank === 1 ? 'text-nexus-warning' :
                              entry.rank === 2 ? 'text-nexus-textMuted' :
                              'text-nexus-textSubtle',
                            )}>
                              {rankMark}
                            </span>
                          ) : (
                            <span className="text-nexus-textMuted font-mono">#{entry.rank}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <RegisterRow
                            id={entry.teamCode}
                            label={entry.teamName}
                            meta={isCompleted ? 'Complete' : 'Active'}
                            trailing={
                              <StateMarker
                                glyph={isCompleted ? '✓' : '◦'}
                                tone={isCompleted ? 'active' : 'neutral'}
                                label={isCompleted ? 'Complete' : 'Active'}
                              />
                            }
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-nexus-text">
                          {entry.score.toLocaleString()}
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
          </RegisterColumn>
        ) : (
          <DocumentShell
            reference="Leaderboard"
            title="No rankings available"
            stock="paper"
            footer={<Stamp variant="incomplete">Pending</Stamp>}
          >
            <div className="text-center py-8">
              <BureauIcons.Trophy className="bureau-icon w-12 h-12 text-nexus-textSubtle mx-auto mb-4" aria-hidden="true" />
              <h3 className="heading-4 mb-2">No Rankings Available</h3>
              <p className="text-nexus-textMuted">
                Rankings update as teams begin the investigation.
              </p>
            </div>
          </DocumentShell>
        )}

        {/* Stats Summary — filed as a 3-column register */}
        {leaderboard && (
          <RegisterColumn heading="Investigation Summary">
            <FieldGrid columns={3}>
              <div className="text-center">
                <BureauIcons.Trophy className="bureau-icon w-5 h-5 text-nexus-accent mx-auto mb-1" />
                <p className="text-2xl font-mono font-bold text-nexus-accent">
                  {leaderboard.length}
                </p>
                <p className="text-xs text-nexus-textMuted">Teams Ranked</p>
              </div>
              <div className="text-center">
                <BureauIcons.Check className="bureau-icon w-5 h-5 text-nexus-success mx-auto mb-1" />
                <p className="text-2xl font-mono font-bold text-nexus-success">
                  {leaderboard.filter(t => t.status === 'COMPLETED').length}
                </p>
                <p className="text-xs text-nexus-textMuted">Completed</p>
              </div>
              <div className="text-center">
                <BureauIcons.TrendingUp className="bureau-icon w-5 h-5 text-nexus-info mx-auto mb-1" />
                <p className="text-2xl font-mono font-bold text-nexus-info">
                  {teamProgress ? Math.round((solvedCount / totalNodes) * 100) : 0}%
                </p>
                <p className="text-xs text-nexus-textMuted">Your Progress</p>
              </div>
            </FieldGrid>
          </RegisterColumn>
        )}
      </div>
    </div>
  )
}
