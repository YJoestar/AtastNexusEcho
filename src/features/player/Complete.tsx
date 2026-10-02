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
import { DocumentShell, RegisterList, RegisterRow, StateMarker, Stamp } from '@/components/bureau'
import { useState } from 'react'

export function PlayerComplete() {
  const { player, team, teamProgress, gameState, solvedCount, totalNodes } = useGameEngine()
  const { logout } = useApp()
  const [shareMessage, setShareMessage] = useState<string | null>(null)

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

  const debriefEntries: { label: string; value: string; tone: 'active' | 'warning' | 'neutral' | 'inactive' }[] = [
    { label: 'FINAL SCORE', value: finalScore.toLocaleString(), tone: 'active' },
    { label: 'EVIDENCE VERIFIED', value: `${solvedCount}/${totalNodes}`, tone: 'warning' },
    { label: 'MISSION TIME', value: timeElapsed, tone: 'neutral' },
    { label: 'DECRYPTION AIDS', value: String(hintsUsed), tone: 'inactive' },
    { label: 'ARTIFACTS RECOVERED', value: String(evidenceCount), tone: 'inactive' },
    { label: 'ITEMS COLLECTED', value: String(inventoryCount), tone: 'inactive' },
  ]

  const handleShare = () => {
    const shareText =
      `NEXUS — Mission Complete\n` +
      `Team: ${team?.name ?? 'Unknown'}\n` +
      `Role: ${player?.role ?? '—'}\n` +
      `Score: ${team?.score ?? 0}\n` +
      `Time: ${team?.startedAt ? formatElapsedTime(team.startedAt) : '—'}`
    const url = `${window.location.origin}${ROUTES.PLAYER_COMPLETE}`
    const acknowledge = (message: string) => {
      setShareMessage(message)
      setTimeout(() => setShareMessage(null), 3000)
    }
    const copyReport = () => {
      void navigator.clipboard?.writeText(`${shareText}\n${url}`)
      acknowledge('REPORT COPIED TO DEVICE BUFFER')
    }
    if (navigator.share) {
      void navigator.share({ title: 'NEXUS — Mission Complete', text: shareText, url })
        .then(() => acknowledge('REPORT TRANSMITTED'))
        .catch(copyReport)
    } else {
      copyReport()
    }
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
               <BureauIcons.Check className="bureau-icon w-8 h-8 text-nexus-accent" aria-hidden="true" />
             </div>
             <p className="text-nexus-textMuted">
               Unit {team?.name} has successfully completed NEXUS
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
          title="AFTER-ACTION REGISTER"
          stock="digital"
          footer={<Stamp variant="verified">Filed</Stamp>}
        >
          <RegisterList>
            {debriefEntries.map(entry => (
              <RegisterRow
                key={entry.label}
                id={entry.label}
                label={entry.label}
                meta="CASE 037 / VERIFIED DEBRIEF"
                trailing={
                  <span className="font-mono text-sm font-bold tabular-nums text-nexus-text">
                    {entry.value}
                  </span>
                }
              />
            ))}
          </RegisterList>
        </DocumentShell>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to={ROUTES.PLAYER_LEADERBOARD}
            className="nexus-btn nexus-btn-primary touch-target-comfortable"
          >
            <BureauIcons.Trophy className="bureau-icon w-5 h-5" />
            <span>ACCESS FINAL RECORD</span>
          </Link>
          <button
            onClick={handleShare}
            className="nexus-btn nexus-btn-secondary touch-target-comfortable"
          >
            <BureauIcons.Share className="bureau-icon w-5 h-5" />
            <span>TRANSMIT REPORT</span>
          </button>
          <button
            onClick={() => { void logout() }}
            className="nexus-btn nexus-btn-ghost touch-target-comfortable"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5 rotate-180" />
            <span>RETURN TO LOGIN</span>
          </button>
        </div>

        {shareMessage && (
          <p className="border-l-2 border-nexus-accent px-3 py-2 text-center font-mono text-[0.6rem] uppercase tracking-[0.14em] text-nexus-textMuted" role="status" aria-live="polite">
            {shareMessage}
          </p>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-nexus-textSubtle">
          NEXUS ECHO / CASE 037 / FIELD RECOVERY RECORD
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
