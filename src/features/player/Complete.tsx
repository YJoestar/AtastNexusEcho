/**
 * NEXUS — Player Complete
 * Mission completion screen with final statistics and team summary.
 */

import { Link } from 'react-router-dom'
import { Trophy, Flag, Clock, Users, Star, Share2, ArrowLeft, FileText, Package } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useApp } from '@/app/providers'
import { ROUTES, ROLE_LABELS } from '@/app/config'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

export function PlayerComplete() {
  const { player, team, teamProgress, gameState, solvedCount, totalNodes } = useGameEngine()
  const { logout } = useApp()
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const finalScore = teamProgress?.score ?? 0
  const timeElapsed = gameState?.startedAt
    ? formatElapsedTime(gameState.startedAt)
    : '—'
  const evidenceCount = teamProgress?.evidenceOwned.length ?? 0
  const inventoryCount = Object.values(teamProgress?.inventoryOwned ?? {}).reduce(
    (a, b) => a + b,
    0,
  )
  const hintsUsed = teamProgress?.hintsUsed ?? 0
  const roleLabel = player?.role && ROLE_LABELS[player.role]

  const statCards = [
    { label: 'Final Score', value: finalScore.toLocaleString(), icon: Trophy, color: 'text-nexus-accent' },
    { label: 'Puzzles Solved', value: `${solvedCount}/${totalNodes}`, icon: Flag, color: 'text-nexus-warning' },
    { label: 'Time Elapsed', value: timeElapsed, icon: Clock, color: 'text-nexus-info' },
    { label: 'Hints Used', value: hintsUsed, icon: Star, color: 'text-purple-400' },
    { label: 'Evidence Found', value: evidenceCount, icon: FileText, color: 'text-green-400' },
    { label: 'Items Collected', value: inventoryCount, icon: Package, color: 'text-orange-400' },
  ]

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6 text-center">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full animate-bounce"
                style={{
                  backgroundColor: ['#00d4aa', '#ffb800', '#00b4d8'][i % 3],
                  left: `${10 + (i * 4) % 80}%`,
                  top: `${10 + (i * 7) % 80}%`,
                  animationDuration: `${1 + (i % 2)}s`,
                  animationDelay: `${(i * 0.1) % 1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Completion Banner */}
        <div className="panel bg-nexus-accentBg/30 border-nexus-accent/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-nexus-accent/10 via-transparent to-nexus-accent/10" />
          <div className="relative py-8 px-4">
            <div className="w-20 h-20 rounded-full bg-nexus-accentBg flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Trophy className="w-10 h-10 text-nexus-accent" />
            </div>
            <h1 className="heading-2 text-nexus-accent mb-2">MISSION COMPLETE</h1>
            <p className="text-nexus-textMuted">
              Team {team?.name} has successfully completed NEXUS
            </p>
          </div>
        </div>

        {/* Role Summary */}
        {player && (
          <div className="panel flex items-center justify-center gap-4">
            <Users className="w-6 h-6 text-nexus-textMuted" />
            <div>
              <p className="font-medium text-nexus-text">{roleLabel}</p>
              <p className="text-sm text-nexus-textMuted">
                {player.displayName} — Investigation Complete
              </p>
            </div>
          </div>
        )}

        {/* Final Stats */}
        <div className="panel space-y-3">
          <h3 className="heading-4 text-center">Final Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(stat => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to={ROUTES.PLAYER_LEADERBOARD}
            className="btn-primary touch-target-comfortable"
          >
            <Trophy className="w-5 h-5" />
            <span>View Final Leaderboard</span>
          </Link>
          <button
            onClick={() => {
              const shareText =
                `NEXUS — Mission Complete\n` +
                `Team: ${team?.name ?? 'Unknown'}\n` +
                `Role: ${player?.role ?? '—'}\n` +
                `Score: ${team?.score ?? 0}\n` +
                `Time: ${team?.startedAt ? formatElapsedTime(team.startedAt) : '—'}`
              const url = `${window.location.origin}${ROUTES.PLAYER_COMPLETE}`
              if (navigator.share) {
                void navigator.share({ title: 'NEXUS — Mission Complete', text: shareText, url }).catch(() => {
                  void navigator.clipboard?.writeText(`${shareText}\n${url}`)
                })
              } else {
                void navigator.clipboard?.writeText(`${shareText}\n${url}`)
              }
            }}
            className="btn-secondary touch-target-comfortable"
          >
            <Share2 className="w-5 h-5" />
            <span>Share Results</span>
          </button>
          <button
            onClick={() => { void logout() }}
            className="btn-ghost touch-target-comfortable"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Exit to Login</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-nexus-textSubtle">
          NEXUS — ATAST Event • ISIMM Monastir • 30/09/2026
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="p-3 bg-nexus-bg rounded-xl text-center">
      <Icon className={cn('w-6 h-6 mx-auto mb-1', color)} />
      <p className="text-xl font-mono font-bold text-nexus-text">{value}</p>
      <p className="text-xs text-nexus-textMuted">{label}</p>
    </div>
  )
}

function formatElapsedTime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}
