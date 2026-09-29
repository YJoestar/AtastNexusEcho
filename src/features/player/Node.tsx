/**
 * NEXUS — Player Puzzle Node
 * Data-driven puzzle screen with role-specific content.
 *
 * SECURITY: Never displays acceptedAnswer, fullSolution, or
 * server-side validation patterns. Operators receive
 * coordination instructions instead of intermediate outputs.
 * All answer validation happens server-side via gameAPI.submitAnswer.
 */

import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Flag, Loader2, Send, AlertCircle } from 'lucide-react'
import { useApp } from '@/app/providers'
import { ROUTES, ROLE_LABELS, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useDiscoveryToast } from '@/hooks/useDiscoveryToast'
import { DiscoveryToastContainer } from '@/components/ui/DiscoveryToast'
import { HINT_PENALTIES } from '@/content/constants'
import { useEffect, useState, useRef } from 'react'
import type { PlayerNodeView } from '@/hooks/useGameEngine'

export function PlayerNode() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const navigate = useNavigate()
  const { refreshTeamProgress, refreshGameState } = useApp()
  const engine = useGameEngine()
  const { role, submitAnswer, requestHint, isOffline, fetchNode } = engine
  const { showToast, removeToast, toasts } = useDiscoveryToast()
  const [node, setNode] = useState<PlayerNodeView | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submissions, setSubmissions] = useState<{ answer: string; isCorrect: boolean }[]>([])
  const [hints, setHints] = useState<{ level: number; text: string; penalty: number }[]>([])
  const [showHintPanel, setShowHintPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [justSolved, setJustSolved] = useState(false)
  const hintIndexRef = useRef(0)

  useEffect(() => {
    if (!nodeId || !role) return

    const loadNode = async () => {
      setLoading(true)
      setError(null)
      try {
        const nodeData = await fetchNode(nodeId)
        setNode(nodeData)
        setShowHintPanel(false)
        setJustSolved(false)
        setSubmissions([])
        setHints([])
        setAnswer('')
        hintIndexRef.current = nodeData?.hintsUsed ?? 0
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load node'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    loadNode()
  }, [nodeId, role, fetchNode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || isSubmitting || !nodeId) return

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await submitAnswer(nodeId, answer.trim())

      setSubmissions(prev => [...prev, {
        answer: answer.trim(),
        isCorrect: result.isCorrect,
      }])

      if (result.isCorrect) {
        setJustSolved(true)
        if (result.nextNodeId) {
          refreshGameState()
          refreshTeamProgress()
          showToast(`Node ${nodeId} solved! Next: ${result.nextNodeId}`, 'evidence')
        } else {
          showToast(`Node ${nodeId} solved!`, 'evidence')
          refreshGameState()
          refreshTeamProgress()
        }
        setTimeout(() => {
          navigate(ROUTES.PLAYER_GAME, { replace: true })
        }, 2000)
      }
      setAnswer('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHint = async () => {
    if (!nodeId || !node) return
    const nextHintNumber = hintIndexRef.current + 1
    if (nextHintNumber > 3) return

    try {
      const result = await requestHint(nodeId, nextHintNumber)
      setHints(prev => [...prev, {
        level: nextHintNumber,
        text: result.hint,
        penalty: result.penaltySeconds,
      }])
      hintIndexRef.current = nextHintNumber
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get hint'
      setError(msg)
    }
  }

  const isOperator = role === 'OPERATOR'
  const roleTheme = role && ROLE_THEMES[role]
  const isSolved = node?.isSolved || justSolved

  if (!nodeId) {
    return (
      <div className="page-content max-w-md mx-auto text-center py-12">
        <ArrowLeft className="w-12 h-12 text-nexus-textMuted mx-auto mb-4" />
        <h1 className="heading-3 mb-2">Invalid Node</h1>
        <Link to={ROUTES.PLAYER_GAME} className="btn-secondary w-full">
          Back to Game
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-content max-w-md mx-auto text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-nexus-accent mx-auto mb-4" />
          <p className="text-nexus-textMuted">Loading investigation node…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-content max-w-md mx-auto text-center py-12">
          <Flag className="w-8 h-8 text-nexus-warning mx-auto mb-4" />
          <h3 className="heading-4 mb-2">Error</h3>
          <p className="text-nexus-textMuted mb-4">{error}</p>
          <Link to={ROUTES.PLAYER_GAME} className="btn-secondary w-full">
            Back to Game
          </Link>
        </div>
      </div>
    )
  }

  if (!node) return null

  const isLocked = !node.unlocked && !node.isSolved
  const hintLevel = hintIndexRef.current
  const hintPenaltyMap = { 0: HINT_PENALTIES.hint1, 1: HINT_PENALTIES.hint2, 2: HINT_PENALTIES.hint3 }
  const nextHintCost = hintLevel < 3 ? Math.floor(hintPenaltyMap[hintLevel as 0|1|2] / 60) : 0

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
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'badge',
                node.status === 'SOLVED' ? 'badge-accent' :
                node.unlocked ? 'badge-warning' : 'badge-neutral',
              )}>
                {node.status}
              </span>
              <span className="text-sm text-nexus-textMuted font-mono">Node: {node.code}</span>
            </div>
            <h1 className="heading-3 truncate">{node.title}</h1>
          </div>
        </div>

        {/* Role Indicator + Coordination Info */}
        <div className={cn('panel flex items-center gap-4', roleTheme?.bg)}>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', roleTheme?.bg)}>
            <span className={cn('font-display font-bold text-2xl', roleTheme?.text)}>
              {role?.[0]}
            </span>
          </div>
          <div>
            <p className="text-xs text-nexus-textSubtle uppercase tracking-wider">Your Role</p>
            <p className="font-medium text-nexus-text">{ROLE_LABELS[role ?? 'OBSERVER']}</p>
            <p className={cn('text-xs font-medium', roleTheme?.text)}>
              {roleTheme?.subtitle}
            </p>
          </div>
          {node.isSolved && <Flag className="w-6 h-6 text-nexus-accent ml-auto" />}
        </div>

        {/* Locked State */}
        {isLocked && (
          <div className="panel text-center py-8">
            <Flag className="w-8 h-8 text-nexus-textSubtle mx-auto mb-3" />
            <h3 className="heading-4 mb-2">Node Locked</h3>
            <p className="text-nexus-textMuted">
              Solve prerequisite puzzles or scan the correct QR code to unlock this node.
            </p>
          </div>
        )}

        {/* Role-Specific Content — only when unlocked and not solved */}
        {node.unlocked && node.roleContent && !isSolved && (
          <div className="panel space-y-4">
            <h3 className="heading-4 flex items-center gap-2">
              <span className={roleTheme?.text}>●</span>
              <span>{node.roleContent.screenTitle}</span>
            </h3>

            {/* Data Payload */}
            <div className="p-4 bg-nexus-bg rounded-xl border border-nexus-borderSubtle">
              <p className="text-xs text-nexus-textSubtle uppercase tracking-wider mb-2">
                {node.roleContent.visualType ?? 'Data Feed'}
              </p>
              <p className="text-sm text-nexus-textMuted leading-relaxed">
                {node.roleContent.dataPayload}
              </p>
            </div>

            {/* Mission Brief */}
            <div className="p-4 bg-nexus-surfaceElevated rounded-xl border border-nexus-borderSubtle">
              <p className="text-sm text-nexus-textMuted mb-2">
                <strong className="text-nexus-text">Mission Brief:</strong> {node.roleContent.whatTheySee}
              </p>
              <p className="text-sm text-nexus-textMuted">
                <strong className="text-nexus-text">Your Task:</strong> {node.roleContent.taskPrompt}
              </p>
            </div>

            {/* Coordination Chain — visible to all roles */}
            {node.coordinationChain && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                  Team Coordination
                </h4>
                <div className="p-3 bg-nexus-bg/50 rounded-xl border border-nexus-borderSubtle text-sm">
                  <p className="text-nexus-textMuted">
                    <strong>Observer produces:</strong> {node.coordinationChain.observerProduces}
                  </p>
                  <p className="text-nexus-textMuted mt-1">
                    <strong>Analyst transforms:</strong> {node.coordinationChain.analystTransforms}
                  </p>
                  <p className="text-nexus-textMuted mt-1">
                    <strong>Operator executes:</strong> {node.coordinationChain.operatorExecutes}
                  </p>
                </div>
              </div>
            )}

            {/* Operator Investigation — what to ask teammates */}
            {isOperator && node.operatorInvestigation && (
              <div className={cn('p-4 rounded-xl border', roleTheme?.bg)}>
                <h4 className="text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider mb-2">
                  Investigation Protocol
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-nexus-textMuted">
                    <strong>Your Evidence:</strong> {node.operatorInvestigation.operatorOwnEvidence}
                  </p>
                  <p className="text-nexus-textMuted">
                    <strong>Task:</strong> {node.operatorInvestigation.operatorTaskDescription}
                  </p>
                  <div className="p-3 bg-nexus-bg/70 rounded-lg border border-nexus-borderSubtle mt-2">
                    <p className="text-xs font-semibold text-nexus-textSubtle mb-1.5">
                      Required Discoveries
                    </p>
                    <p className="text-nexus-textMuted">
                      • <strong>From Observer:</strong> {node.operatorInvestigation.requiredDiscoveries.observerDiscovery}
                    </p>
                    <p className="text-nexus-textMuted mt-1">
                      • <strong>From Analyst:</strong> {node.operatorInvestigation.requiredDiscoveries.analystDiscovery}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Failure Propagation */}
            {node.failurePropagation && (
              <div className="p-3 bg-nexus-dangerBg/20 rounded-xl border border-nexus-danger/20">
                <p className="text-xs text-nexus-textSubtle uppercase tracking-wider mb-1">
                  Recovery Note
                </p>
                <p className="text-xs text-nexus-textMuted">
                  <strong>If stuck:</strong> {node.failurePropagation.recoveryGuidance}
                </p>
              </div>
            )}

            {/* Hints Panel */}
            {hints.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-nexus-textSubtle uppercase tracking-wider">
                  Acquired Hints
                </h4>
                {hints.map(h => (
                  <div
                    key={h.level}
                    className="p-3 bg-nexus-warningBg/30 border border-nexus-warning/30 rounded-xl"
                  >
                    <p className="text-sm text-nexus-warning">
                      <strong>Hint {h.level}:</strong> {h.text}
                    </p>
                    {h.penalty > 0 && (
                      <p className="text-xs text-nexus-textSubtle mt-1">
                        Penalty: -{Math.floor(h.penalty / 60)} minutes
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Solved State */}
        {isSolved && (
          <div className="panel bg-nexus-accentBg/20 border-nexus-accent/30 text-center animate-slide-up">
            <Flag className="w-12 h-12 text-nexus-accent mx-auto mb-4" />
            <h2 className="heading-2 text-nexus-accent mb-2">Node Complete</h2>
            <p className="text-nexus-textMuted mb-4">
              {node.storyReveal || 'This investigation node has been completed.'}
            </p>
            <div className="flex justify-center">
              <Link
                to={ROUTES.PLAYER_GAME}
                className="btn-primary touch-target-comfortable"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Game Hub</span>
              </Link>
            </div>
          </div>
        )}

        {/* Submission Area */}
        {!isSolved && node.unlocked && (
          <div className="panel space-y-4">
            <h3 className="heading-4">Submit Answer</h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="answer" className="label">Answer</label>
                <input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder={
                    isOperator ? 'Enter the combined solution…' : 'Enter your answer…'
                  }
                  className="input font-mono text-lg text-center"
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
                className="btn-primary w-full touch-target-comfortable"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </form>

            {/* Submit Status */}
            {submissions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-nexus-textMuted">
                  Recent Attempts ({submissions.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {submissions.slice(-5).map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-nexus-bg rounded-lg text-sm"
                    >
                      <code className="font-mono text-nexus-text truncate">
                        {sub.answer}
                      </code>
                      <span
                        className={cn(
                          'badge text-xs',
                          sub.isCorrect ? 'badge-accent' : 'badge-neutral',
                        )}
                      >
                        {sub.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint Section */}
            {!isSolved && hintLevel < 3 && (
              <div className="pt-2 border-t border-nexus-borderSubtle">
                <button
                  onClick={() => setShowHintPanel(true)}
                  className="btn-ghost w-full touch-target-primary"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Request Hint {hintLevel + 1} of 3</span>
                  <span className="ml-auto text-xs text-nexus-textSubtle">
                    -{nextHintCost}min
                  </span>
                </button>
                {showHintPanel && (
                  <div className="mt-3 p-4 bg-nexus-warningBg/30 border border-nexus-warning/30 rounded-xl animate-slide-down">
                    <p className="text-sm text-nexus-textMuted mb-3">
                      Request Hint {hintLevel + 1}? This will subtract{' '}
                      {Math.floor(hintPenaltyMap[hintLevel as 0|1|2] / 60)} minutes from your
                      final score.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setShowHintPanel(false)
                          await handleHint()
                        }}
                        className="btn-warning flex-1 touch-target-primary"
                      >
                        Request
                      </button>
                      <button
                        onClick={() => setShowHintPanel(false)}
                        className="btn-secondary flex-1 touch-target-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <DiscoveryToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
