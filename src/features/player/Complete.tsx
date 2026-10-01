/**
 * NEXUS — Player Complete
 * Mission completion screen with final statistics and team summary.
 * Bureau primitives: DocumentShell, Stamp, Field, FieldGrid, StateMarker.
 * Bureau glyphs instead of emoji/lucide. No confetti.
 */

import { Link } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useApp } from '@/app/providers'
import { ROUTES, ROLE_LABELS } from '@/app/config'
import { BureauIcons } from '@/components/bureau'
import { DocumentShell, Field, FieldGrid, StateMarker, Stamp } from '@/components/bureau'
import { useState } from 'react'

export function PlayerComplete() {
  const { player, team, teamProgress, gameState, solvedCount, totalNodes } = useGameEngine()
  const { logout } = useApp()
  const [showShareAck, setShowShareAck] = useState(false)

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

  const statCards: { label: string; value: string; glyph: string; tone: 'active' | 'warning' | 'neutral' | 'inactive' }[] = [
    { label: 'Final Score', value: finalScore.toLocaleString(), glyph: '#', tone: 'active' },
    { label: 'Puzzles Solved', value: `${solvedCount}/${totalNodes}`, glyph: '✓', tone: 'warning' },
    { label: 'Time Elapsed', value: timeElapsed, glyph: '⌚', tone: 'neutral' },
    { label: 'Hints Used', value: String(hintsUsed), glyph: '?', tone: 'inactive' },
    { label: 'Evidence Found', value: String(evidenceCount), glyph: '□', tone: 'inactive' },
    { label: 'Items Collected', value: String(inventoryCount), glyph: '♦', tone: 'inactive' },
  ]

  const handleShare = () => {
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
    setShowShareAck(true)
    setTimeout(() => setShowShareAck(false), 3000)
  }

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Completion Banner */}
        <DocumentShell
          reference="Case 037"
          title="MISSION COMPLETE"
          classification="RESTRICTED"
          stock="carbon"
          footer={
            <Stamp variant="archived" impressed>
              Closed
            </Stamp>
          }
        >
          <div className="text-center py-6">
            <div className="w-20 h-20 border-2 border-nexus-borderSubtle flex items-center justify-center mx-auto mb-4">
              <span className="font-display text-3xl text-nexus-accent">✓</span>
            </div>
            <p className="text-nexus-textMuted">
              Team {team?.name} has successfully completed NEXUS
            </p>
          </div>
        </DocumentShell>

        {/* Role Summary */}
        {player && (
          <DocumentShell
            reference="Operator Identity"
            title="Investigation Complete"
            stock="paper"
            footer={
              <StateMarker
                glyph={player.role?.[0] ?? '?'}
                tone="active"
                label={roleLabel ?? 'Unknown role'}
              />
            }
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-nexus-borderSubtle flex items-center justify-center">
                <span className="font-display font-bold text-xl text-nexus-textMuted">
                  {player.role?.[0]}
                </span>
              </div>
              <div>
                <p className="font-medium text-nexus-text">{roleLabel}</p>
                <p className="text-sm text-nexus-textMuted">
                  {player.displayName}
                </p>
              </div>
            </div>
          </DocumentShell>
        )}

        {/* Final Stats — as a field grid */}
        <DocumentShell
          reference="After Action Report"
          title="Final Statistics"
          stock="digital"
          footer={<Stamp variant="verified">Filed</Stamp>}
        >
          <FieldGrid columns={2}>
            {statCards.map(stat => (
              <Field
                key={stat.label}
                label={stat.label}
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base" aria-hidden="true">
                      {stat.glyph}
                    </span>
                    <span className="font-mono text-lg font-bold text-nexus-text">
                      {stat.value}
                    </span>
                  </div>
                }
              />
            ))}
          </FieldGrid>
        </DocumentShell>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to={ROUTES.PLAYER_LEADERBOARD}
            className="nexus-btn nexus-btn-primary touch-target-comfortable"
          >
            <BureauIcons.Trophy className="bureau-icon w-5 h-5" />
            <span>View Final Leaderboard</span>
          </Link>
          <button
            onClick={handleShare}
            className="nexus-btn nexus-btn-secondary touch-target-comfortable"
          >
            <BureauIcons.Share className="bureau-icon w-5 h-5" />
            <span>Share Results</span>
          </button>
          <button
            onClick={() => { void logout() }}
            className="nexus-btn nexus-btn-ghost touch-target-comfortable"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5 rotate-180" />
            <span>Exit to Login</span>
          </button>
        </div>

        {showShareAck && (
          <p className="text-center text-xs text-nexus-textMuted">
            Results copied to clipboard.
          </p>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-nexus-textSubtle">
          NEXUS — ATAST Event • ISIMM Monastir • 30/09/2026
        </p>
      </div>
    </div>
  )
}

function formatElapsedTime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}
