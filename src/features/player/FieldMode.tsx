/**
 * NEXUS ECHO — Field Mode
 *
 * Simplified mobile-first view for physical movement.
 * Prioritizes: current lead, recent discovery, scanner, pinned evidence, field log.
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { BureauIcons } from '@/components/bureau'

export function FieldMode() {
  const {
    team,
    gameState,
    inventory,
  } = useGameEngine()
  const { workspace } = useInvestigationWorkspace(team?.id)

  const [showLog, setShowLog] = useState(false)

  const gameStatus = gameState?.status

  const pinnedEvidence = useMemo(() => {
    if (!team || !inventory) return []
    return Object.entries(workspace.marks)
      .filter(([, mark]) => mark === 'IMPORTANT' || mark === 'VERIFIED')
      .map(([id]) => {
        const code = id.replace('evidence:', '')
        const item = inventory.evidence.find(e => e.code === code)
        return item ? { id: item.code, title: item.title } : null
      })
      .filter((entry): entry is { id: string; title: string } => entry !== null)
      .slice(0, 2)
  }, [team, inventory, workspace.marks])

  const recentDiscovery = useMemo(() => {
    const entries = Object.entries(workspace.revelations)
      .filter(([, r]) => r.hasNewInfo && r.lastInspectedAt)
      .sort((a, b) => new Date(b[1].lastInspectedAt!).getTime() - new Date(a[1].lastInspectedAt!).getTime())
    if (entries.length === 0) return null
    const [code] = entries[0]
    const item = inventory?.evidence.find(e => e.code === code.replace('evidence:', ''))
    return item ? item.title : code.replace('evidence:', '')
  }, [inventory, workspace.revelations])

  if (!team) return null

  const isRunning = gameStatus === 'RUNNING'
  const isPaused = gameStatus === 'PAUSED'
  const isEnded = gameStatus === 'ENDED'

  return (
    <div className="page nx-wake">
      <div className="page-content mx-auto max-w-md space-y-6 pb-6 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-nexus-textSubtle truncate">
            {team.name}
          </span>
          <span className={cn(
            'font-mono text-xs uppercase tracking-[0.12em]',
            isPaused && 'text-nexus-warning',
            isRunning && 'text-nexus-accent',
            isEnded && 'text-nexus-textMuted',
          )}>
            {isRunning ? 'FIELD ACTIVE' : isPaused ? 'SUSPENDED' : isEnded ? 'CLOSED' : 'STANDBY'}
          </span>
        </div>

        {isRunning && (
          <div className="space-y-4">
            <Link
              to={ROUTES.PLAYER_QR}
              className="nexus-btn nexus-btn-primary flex min-h-16 w-full items-center justify-center gap-2 text-base"
            >
              <BureauIcons.QrCode className="bureau-icon h-6 w-6" />
              <span>SCAN MARKER</span>
            </Link>

            {pinnedEvidence.length > 0 && (
              <section aria-label="Pinned evidence" className="space-y-2">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-nexus-textSubtle">PINNED</h2>
                <div className="space-y-1">
                  {pinnedEvidence.map(item => (
                    <Link
                      key={item.id}
                      to={ROUTES.PLAYER_EVIDENCE}
                      className="flex min-h-12 items-center justify-between border border-nexus-borderSubtle px-3 font-mono text-xs uppercase tracking-[0.12em] text-nexus-textMuted"
                    >
                      <span className="truncate">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {recentDiscovery && (
              <section aria-label="Recent discovery" className="space-y-2">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-nexus-textSubtle">LATEST FIND</h2>
                <p className="border border-nexus-borderSubtle px-3 py-3 font-mono text-xs text-nexus-textMuted">
                  {recentDiscovery}
                </p>
              </section>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLog(!showLog)}
                className="nexus-btn nexus-btn-secondary flex-1 min-h-12"
              >
                {showLog ? 'HIDE LOG' : 'FIELD LOG'}
              </button>
              <Link to={ROUTES.PLAYER_GAME} className="nexus-btn nexus-btn-secondary flex-1 min-h-12">
                FULL HUB
              </Link>
            </div>

            {showLog && (
              <section aria-label="Field log" className="space-y-2">
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-nexus-textSubtle">RECENT ACTIVITY</h2>
                <div className="border border-nexus-borderSubtle p-3">
                  <p className="font-mono text-xs text-nexus-textMuted">
                    Field log entries will appear here as the team progresses.
                  </p>
                </div>
              </section>
            )}
          </div>
        )}

        {!isRunning && (
          <div className="space-y-4">
            <p className="font-mono text-sm text-nexus-textMuted">
              {isPaused ? 'The case is suspended. Awaiting bureau resumption.' : isEnded ? 'The case file is closed.' : 'Waiting for the case to open.'}
            </p>
            <Link to={ROUTES.PLAYER_GAME} className="nexus-btn nexus-btn-primary w-full min-h-14">
              OPEN FIELD HUB
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
