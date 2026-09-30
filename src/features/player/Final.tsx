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
import { ArrowLeft, Flag, Lock, Unlock, Loader2, AlertCircle, Package, FileText, Key } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

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
    { label: 'Evidence Found', count: evidenceCount, required: 5, icon: FileText },
    { label: 'Inventory Items', count: inventoryCount, required: 3, icon: Package },
    { label: 'Decoded Fragments', count: fragmentsCount, required: 7, icon: Key },
  ]

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 rounded-xl text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="heading-3">Final Protocol</h1>
            <p className="text-nexus-textMuted text-sm">
              The culminating investigation challenge
            </p>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="panel relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-nexus-dangerBg/20 via-nexus-bg to-nexus-dangerBg/20" />
          <div className="relative flex items-center justify-center py-8 px-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center',
                  isCompleted
                    ? 'bg-nexus-accentBg'
                    : unlocked
                      ? 'bg-nexus-accentBg'
                      : 'bg-nexus-dangerBg',
                )}
              >
                {isCompleted || unlocked ? (
                  <Unlock className="w-8 h-8 text-nexus-accent" />
                ) : (
                  <Lock className="w-8 h-8 text-nexus-danger" />
                )}
              </div>
              <div>
                <p className="text-xs text-nexus-textSubtle uppercase tracking-wider">
                  Status
                </p>
                <p
                  className={cn(
                    'font-display font-bold text-xl',
                    isCompleted
                      ? 'text-nexus-accent'
                      : unlocked
                        ? 'text-nexus-accent'
                        : 'text-nexus-danger',
                  )}
                >
                  {!unlocked
                    ? 'LOCKED'
                    : isCompleted
                      ? 'COMPLETED'
                      : 'ACCESS GRANTED'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Locked State */}
        {!unlocked && !isCompleted && (
          <div className="panel space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-nexus-warning" />
              <div>
                <h3 className="heading-4">Access Restricted</h3>
                <p className="text-nexus-textMuted text-sm">
                  Complete prerequisite puzzles to unlock the Final Protocol
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-nexus-textMuted">Puzzles Solved</span>
                <span className="font-mono font-bold text-lg text-nexus-text">
                  {solved} / {totalNodes}
                </span>
              </div>
              <div className="h-3 bg-nexus-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-nexus-warning rounded-full transition-all duration-500"
                  style={{ width: `${(solved / totalNodes) * 100}%` }}
                />
              </div>
              <p className="text-xs text-nexus-textSubtle">
                {totalNodes - solved} more puzzle(s) required to unlock
              </p>
            </div>

            <Link
              to={ROUTES.PLAYER_GAME}
              className="btn-secondary w-full touch-target-comfortable"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Game</span>
            </Link>
          </div>
        )}

        {/* Available — Solving Phase */}
        {(unlocked || isCompleted) && (
          <div className="panel space-y-6">
            <div className="space-y-3">
              <h3 className="heading-4">Final Protocol Briefing</h3>
              <p className="text-nexus-textMuted">
                This is the culminating challenge. All evidence, inventory items,
                and fragments converge here. The solution requires synthesis of
                everything your team has uncovered through coordinated investigation.
              </p>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-nexus-textMuted">
                Required Components
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {requirements.map(item => {
                  const met = item.count >= item.required
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        'p-3 bg-nexus-bg rounded-xl border transition-colors',
                        met
                          ? 'border-nexus-accent/30 bg-nexus-accentBg/10'
                          : 'border-nexus-borderSubtle',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon
                          className={cn(
                            'w-4 h-4',
                            met ? 'text-nexus-accent' : 'text-nexus-textSubtle',
                          )}
                        />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-lg text-nexus-text">
                          {item.count} / {item.required}
                        </span>
                        <div className="h-1.5 w-16 bg-nexus-borderSubtle rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              met ? 'bg-nexus-accent' : 'bg-nexus-textSubtle',
                            )}
                            style={{
                              width: `${Math.min(100, (item.count / item.required) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Answer Submission */}
            {!isCompleted && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="finalAnswer" className="label">
                    Final Code
                  </label>
                  <input
                    id="finalAnswer"
                    type="text"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Enter the combined investigation result"
                    className="input font-mono text-center tracking-wider text-lg"
                    autoComplete="off"
                    disabled={isSubmitting || isOffline}
                  />
                  {isOffline && (
                    <p className="mt-1.5 text-sm text-nexus-danger flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Cannot submit while offline</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim() || isOffline}
                  className="btn-danger w-full touch-target-comfortable"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validating…</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5" />
                      <span>Initiate Protocol</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-nexus-danger flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-nexus-danger">{error}</p>
                  </div>
                )}

                {attempts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-nexus-textMuted">
                      Previous Attempts ({attempts.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {attempts.map((attempt, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-nexus-bg rounded-lg text-sm"
                        >
                          <code className="font-mono text-nexus-text truncate">
                            {attempt}
                          </code>
                          <span className="badge-neutral text-xs">Rejected</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Completed State */}
            {isCompleted && (
              <div className="panel bg-nexus-accentBg/20 border-nexus-accent/30 text-center animate-slide-up">
                <Unlock className="w-12 h-12 text-nexus-accent mx-auto mb-4" />
                <h2 className="heading-2 text-nexus-accent mb-2">
                  PROTOCOL COMPLETE
                </h2>
                <p className="text-nexus-textMuted mb-4">
                  The Final Protocol has been successfully executed.
                </p>
                <Link
                  to={ROUTES.PLAYER_COMPLETE}
                  className="btn-primary touch-target-comfortable"
                >
                  <Flag className="w-4 h-4" />
                  <span>View Completion Report</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Time Warning */}
        {gameState?.endsAt && !isCompleted && unlocked && (
          <div className="panel bg-nexus-dangerBg/30 border border-nexus-danger/30">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-nexus-danger" />
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
