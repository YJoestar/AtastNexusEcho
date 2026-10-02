/**
 * NEXUS — Player Final Protocol
 * Culminating investigation challenge. Requires synthesis of all
 * evidence, inventory items, and fragments.
 *
 * SECURITY: All role-specific content and coordination data is passed
 * through the existing secure channels — no answers are exposed here.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { BureauIcons } from '@/components/bureau'
import {
  DocumentShell,
  Field,
  FieldGrid,
  RegisterColumn,
  StateMarker,
  Stamp,
} from '@/components/bureau'

/**
 * The final answer is validated against the FINAL_BOSS node (P37, "The Final
 * Boss"). The previous implementation submitted to a node id "FINAL", which
 * does not exist in the content graph, so the server could never validate a
 * final answer and this screen could never complete.
 */
const FINAL_NODE_ID = 'P37'

export function PlayerFinal() {
  const navigate = useNavigate()
  const {
    gameState,
    teamProgress,
    solvedCount,
    totalNodes,
    submitAnswer,
    isOffline,
  } = useGameEngine()
  const [attempts, setAttempts] = useState<string[]>([])
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const solved = solvedCount
  const unlocked = solved >= totalNodes - 1
  const isCompleted = gameState?.status === 'ENDED' || solved === totalNodes

  const evidenceCount = teamProgress?.evidenceOwned.length ?? 0
  const inventoryCount = Object.values(teamProgress?.inventoryOwned ?? {}).reduce(
    (a, b) => a + b,
    0,
  )
  const fragmentsCount = teamProgress?.fragmentsOwned.length ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || isSubmitting || isOffline) return

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await submitAnswer(FINAL_NODE_ID, answer.trim())
      setAttempts(prev => [...prev, answer.trim()])

      if (result.isCorrect) {
        setTimeout(() => {
          navigate(ROUTES.PLAYER_COMPLETE)
        }, 1500)
      }
      setAnswer('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const requirements = [
    { label: 'Evidence Verified', count: evidenceCount, required: 5 },
    { label: 'Inventory Items', count: inventoryCount, required: 3 },
    { label: 'Decoded Fragments', count: fragmentsCount, required: 7 },
  ]

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text touch-target-primary"
            aria-label="RETURN TO FIELD"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div>
            <h1 className="heading-3">Final Protocol</h1>
            <p className="text-nexus-textMuted text-sm">
              The culminating investigation challenge
            </p>
          </div>
        </div>

        {/* Access state. Named for the state it reports rather than repeating
            the page title directly above it. */}
        <DocumentShell
          reference="Protocol Status"
          title={isCompleted || unlocked ? 'Access granted' : 'Locked'}
          stock="digital"
          footer={
            isCompleted || unlocked
              ? <Stamp variant="verified" impressed>{isCompleted ? 'COMPLETED' : 'ACCESS GRANTED'}</Stamp>
              : <Stamp variant="incomplete" impressed>{isCompleted ? 'COMPLETED' : 'LOCKED'}</Stamp>
          }
        >
           <div className="flex items-center justify-center py-6">
             <div className={cn(
               'w-16 h-16 flex items-center justify-center border-2',
               isCompleted || unlocked
                 ? 'border-nexus-accent/30 bg-nexus-accentBg'
                 : 'border-nexus-danger/30 bg-nexus-dangerBg',
             )}>
               {isCompleted || unlocked ? (
                 <BureauIcons.Check className="bureau-icon w-8 h-8 text-nexus-accent" aria-hidden="true" />
               ) : (
                 <BureauIcons.Lock className="bureau-icon w-8 h-8 text-nexus-danger" aria-hidden="true" />
               )}
             </div>
           </div>
        </DocumentShell>

        {/* Locked State */}
        {!unlocked && !isCompleted && (
          <DocumentShell reference="Access Control" title="Access Restricted" stock="paper">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <BureauIcons.Lock className="bureau-icon w-6 h-6 text-nexus-warning" />
                <p className="text-nexus-textMuted text-sm">
                  Complete prerequisite puzzles to unlock the Final Protocol
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-nexus-textMuted">Puzzles Solved</span>
                  <span className="font-mono font-bold text-lg text-nexus-text">
                    {solved} / {totalNodes}
                  </span>
                </div>
                <div className="h-3 bg-nexus-bg overflow-hidden border border-nexus-border">
                  <div
                    className="h-full bg-nexus-warning transition-all duration-500"
                    style={{ width: `${(solved / totalNodes) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-nexus-textSubtle">
                  {totalNodes - solved} more puzzle(s) required to unlock
                </p>
              </div>

            <Link
              to={ROUTES.PLAYER_GAME}
              className="nexus-btn nexus-btn-secondary touch-target-comfortable w-full"
            >
              <BureauIcons.Back className="bureau-icon w-4 h-4" />
              <span>RETURN TO FIELD</span>
            </Link>
            </div>
          </DocumentShell>
        )}

        {/* Available — Solving Phase */}
        {(unlocked || isCompleted) && (
          <div className="space-y-6">
            <DocumentShell reference="Briefing" title="Final Protocol Briefing" stock="paper">
              <div className="space-y-3">
            <p className="text-nexus-textMuted">
              The culminating investigation challenge. All evidence, inventory items,
              and fragments converge here. The solution requires synthesis of
              everything your team has uncovered through coordinated investigation.
            </p>
              </div>
            </DocumentShell>

            {/* Requirements Checklist */}
            <RegisterColumn heading="Required Components">
              <div className="space-y-2">
                {requirements.map(item => {
                  const met = item.count >= item.required
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        'flex items-center justify-between gap-3 p-3 border',
                        met
                          ? 'border-nexus-accent/30 bg-nexus-accentBg/10'
                          : 'border-nexus-borderSubtle',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg text-nexus-text">
                          {item.count} / {item.required}
                        </span>
                        <StateMarker
                          glyph={met ? '✓' : '✗'}
                          tone={met ? 'active' : 'inactive'}
                          label={met ? 'VERIFIED' : 'UNVERIFIED'}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </RegisterColumn>

            {/* Answer Submission */}
            {!isCompleted && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FieldGrid columns={1}>
                  <Field
                    label="Final Code"
                    value={
                      <input
                        id="finalAnswer"
                        type="text"
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                         placeholder="ENTER RESOLVED CASE CODE"
                        className="input font-mono text-center tracking-wider text-lg"
                        autoComplete="off"
                        disabled={isSubmitting || isOffline}
                      />
                    }
                  />
                </FieldGrid>

                {isOffline && (
                  <p className="mt-1.5 text-sm text-nexus-danger flex items-center gap-1.5">
                    <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span>Cannot submit while offline</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim() || isOffline}
                  className="nexus-btn nexus-btn-primary w-full touch-target-comfortable"
                >
                  {isSubmitting ? (
                    <>
                      <BureauIcons.Spinner className="bureau-icon w-5 h-5 animate-spin" />
                      <span>VERIFYING SOLUTION…</span>
                    </>
                  ) : (
                    <>
                      <BureauIcons.Unlock className="bureau-icon w-5 h-5" />
                      <span>SUBMIT SOLUTION</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-3 border border-nexus-danger/30 flex items-start gap-2">
                    <BureauIcons.Alert className="bureau-icon w-5 h-5 text-nexus-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-nexus-danger">{error}</p>
                  </div>
                )}

                {attempts.length > 0 && (
                  <RegisterColumn heading={`Previous Attempts (${attempts.length})`}>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {attempts.map((attempt, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 border-b border-nexus-borderSubtle text-sm"
                        >
                          <code className="font-mono text-nexus-text truncate">
                            {attempt}
                          </code>
                          <Stamp variant="contradicted" impressed>
                            Rejected
                          </Stamp>
                        </div>
                      ))}
                    </div>
                  </RegisterColumn>
                )}
              </form>
            )}

            {/* Completed State */}
            {isCompleted && (
              <DocumentShell
                reference="Protocol Result"
                title="PROTOCOL COMPLETE"
                stock="carbon"
                classification="RESTRICTED"
                footer={<Stamp variant="verified" impressed>Closed</Stamp>}
              >
                <div className="text-center py-6">
                 <div className="w-16 h-16 border-2 border-nexus-accent/30 bg-nexus-accentBg flex items-center justify-center mx-auto mb-4">
                   <BureauIcons.Check className="bureau-icon w-8 h-8 text-nexus-accent" aria-hidden="true" />
                 </div>
                  <p className="text-nexus-textMuted mb-4">
                    The Final Protocol has been successfully executed.
                  </p>
                  <Link
                    to={ROUTES.PLAYER_COMPLETE}
                    className="nexus-btn nexus-btn-primary touch-target-comfortable"
                  >
                    <BureauIcons.Flag className="bureau-icon w-4 h-4" />
                    <span>ACCESS COMPLETION REPORT</span>
                  </Link>
                </div>
              </DocumentShell>
            )}
          </div>
        )}

        {/* Time Warning */}
        {gameState?.endsAt && !isCompleted && unlocked && (
          <div className="nexus-document border-nexus-danger/30">
            <div className="flex items-center gap-2">
              <BureauIcons.Alert className="bureau-icon w-5 h-5 text-nexus-danger" aria-hidden="true" />
              <span className="font-medium text-nexus-danger">Time Critical</span>
            </div>
            <p className="text-sm text-nexus-textMuted mt-1">
              Final Protocol must be completed before time expires.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
