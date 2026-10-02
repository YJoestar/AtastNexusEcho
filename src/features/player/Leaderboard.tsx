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
  RegisterColumn,
  RegisterList,
  RegisterRow,
  StateMarker,
  Stamp,
  StatusMark,
} from '@/components/bureau'

const RANK_MARK: Record<number, string> = {
  1: 'V',
  2: '◆',
  3: '▲',
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
             aria-label="RETURN TO FIELD"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="heading-3">FIELD OPERATIONS RECORD</h1>
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

        {/* Ranked field records */}
        {leaderboard && leaderboard.length > 0 ? (
          <RegisterColumn heading="UNIT PERFORMANCE / SERVER RECORD">
            <RegisterList>
              {leaderboard.map(entry => {
                const isCurrentTeam = entry.teamCode === team?.code
                const isCompleted = entry.status === 'COMPLETED'
                const rankMark = RANK_MARK[entry.rank] ?? String(entry.rank).padStart(2, '0')
                return (
                  <RegisterRow
                    key={entry.teamCode}
                    id={`RANK ${entry.rank}`}
                    label={
                      <div className={cn('min-w-0 border-l-2 pl-3', isCurrentTeam ? 'border-nexus-accent' : 'border-transparent')}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-mono text-xs font-bold text-nexus-accent">{rankMark}</span>
                          <span className="font-mono text-[0.8125rem] text-nexus-textSubtle">{entry.teamCode}</span>
                          <span className="break-words font-medium text-nexus-text">{entry.teamName}</span>
                          {isCurrentTeam && <Stamp variant="verified">YOUR UNIT</Stamp>}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-nexus-borderSubtle pt-2 font-mono text-[0.8125rem] sm:grid-cols-3">
                          <span className="text-nexus-textMuted">SCORE / <b className="text-nexus-text">{entry.score.toLocaleString()}</b></span>
                          <span className="text-nexus-textMuted">ELAPSED / <b className="text-nexus-text">{formatTime(entry.elapsedMinutes)}</b></span>
                          <span className="text-nexus-textMuted">CASE / <b className="text-nexus-text">{isCompleted ? 'CLOSED' : 'ACTIVE'}</b></span>
                        </div>
                      </div>
                    }
                    trailing={
                      <StateMarker
                        glyph={isCompleted ? 'V' : '—'}
                        tone={isCompleted ? 'active' : 'neutral'}
                        label={isCompleted ? 'Verified' : 'Pending'}
                      />
                    }
                    className={isCurrentTeam ? 'bg-nexus-accentBg/10' : undefined}
                  />
                )
              })}
            </RegisterList>
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
             <h1 className="heading-4 mb-2">NO RANKINGS ON RECORD</h1>
             <p className="text-nexus-textMuted">
               Rankings will appear as units begin the investigation.
             </p>
            </div>
          </DocumentShell>
        )}

        {/* Case summary */}
        {leaderboard && (
           <RegisterColumn heading="CASE RECORD SUMMARY">
             <RegisterList>
               <RegisterRow id="units-listed" label="UNITS LISTED" trailing={<span className="font-mono font-bold">{leaderboard.length}</span>} />
               <RegisterRow id="cases-closed" label="CASES CLOSED" trailing={<span className="font-mono font-bold">{leaderboard.filter(t => t.status === 'COMPLETED').length}</span>} />
               <RegisterRow id="case-progress" label="YOUR VERIFIED NODES" meta={`CASE ${team?.code ?? 'UNASSIGNED'}`} trailing={<span className="font-mono font-bold">{solvedCount} / {totalNodes}</span>} />
             </RegisterList>
           </RegisterColumn>
        )}
      </div>
    </div>
  )
}
