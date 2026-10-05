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
import { useApp } from '@/app/providers'
import { ROUTES, ROLE_LABELS, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useDiscoveryToast } from '@/hooks/useDiscoveryToast'
import { DiscoveryToastContainer } from '@/components/ui/DiscoveryToast'
import { PuzzleVisual } from '@/components/player/puzzle/PuzzleVisual'
import { HINT_PENALTIES } from '@/content/constants'
import { useEffect, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import type { PlayerNodeView } from '@/hooks/useGameEngine'
import { useGameAudio } from '@/hooks/useGameAudio'
import { BureauIcons } from '@/components/bureau'
import {
  DocumentShell,
  EvidenceFrame,
  RegisterColumn,
  StateMarker,
  Stamp,
  type StatusTone,
} from '@/components/bureau'

export function PlayerNode() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const navigate = useNavigate()
  const { refreshTeamProgress, refreshGameState } = useApp()
  const engine = useGameEngine()
  const { role, submitAnswer, requestHint, isOffline, fetchNode } = engine
  const audio = useGameAudio()
  const { showToast, removeToast, toasts } = useDiscoveryToast()
  const [node, setNode] = useState<PlayerNodeView | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submissions, setSubmissions] = useState<
    { answer: string; isCorrect: boolean; queued: boolean }[]
  >([])
  const [hints, setHints] = useState<{ level: number; text: string; penalty: number }[]>([])
  const [showHintPanel, setShowHintPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // A failed submit or hint keeps the puzzle on screen; only a failed load blocks it.
  const [actionError, setActionError] = useState<string | null>(null)
  const [justSolved, setJustSolved] = useState(false)
  const hintIndexRef = useRef(0)
  const hintBusyRef = useRef(false)
  // A ref, not the `isSubmitting` state, for the same reason as the hint guard.
  //
  // `isSubmitting` is the state as of this render. React batches the update, so
  // a second click inside the same tick - the ordinary double tap on a phone,
  // which is exactly how players hit TRANSMIT twice - still reads it as `false`
  // and starts a second submission. That burns a real attempt on the server,
  // shows two entries in the attempt log, and arms two leave-timers.
  //
  // The server settles the money question atomically (2026100501 pays out only
  // for the transition that changed the row), so this cannot corrupt
  // progression. It is still wrong: the player is charged for one guess twice.
  const submitBusyRef = useRef(false)
  const mountedRef = useRef(true)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // `fetchNode` is not a stable dependency: under the QA simulator the engine
  // hands out a fresh closure on every render. Listing it in this effect's deps
  // made every load a loop - each pass set fresh `submissions`/`hints` arrays,
  // which re-rendered, which minted a new closure, which re-ran the effect - and
  // `setAnswer('')` at the bottom wiped what the player had typed on every pass.
  // The latest closure is tracked in a ref; the effect keys on what actually
  // changes the answer.
  const fetchNodeRef = useRef(fetchNode)
  fetchNodeRef.current = fetchNode

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!nodeId || !role) return

    // A slow response for a node the player already left must not overwrite the current one.
    let cancelled = false
    const loadNode = async () => {
      setLoading(true)
      setError(null)
      setActionError(null)
      try {
        const nodeData = await fetchNodeRef.current(nodeId)
        if (cancelled) return
        setNode(nodeData)
        setShowHintPanel(false)
        setJustSolved(false)
        setSubmissions([])
        setHints([])
        setAnswer('')
        hintIndexRef.current = nodeData?.hintsUsed ?? 0
      } catch (err: unknown) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Failed to load node'
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadNode()
    return () => { cancelled = true }
  }, [nodeId, role])

  const waitingActive = node?.unlocked && !node.isSolved && !!node.roleContent && !!role
  const prevWaitingRef = useRef(waitingActive)
  useEffect(() => {
    if (waitingActive && !prevWaitingRef.current) {
      audio.roleHandoff()
    }
    prevWaitingRef.current = waitingActive
  }, [waitingActive, audio])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || !nodeId || submitBusyRef.current) return

    submitBusyRef.current = true
    setIsSubmitting(true)
    setActionError(null)
    try {
      const result = await submitAnswer(nodeId, answer.trim())
      if (!mountedRef.current) return

      setSubmissions(prev => [...prev, {
        answer: answer.trim(),
        isCorrect: result.isCorrect,
        queued: result.queued === true,
      }])

      if (result.queued) {
        showToast('No signal — answer queued and will be sent on reconnect', 'general')
        audio.failure()
      } else if (result.isCorrect) {
        setJustSolved(true)
        audio.success()
        if (result.nextNodeId) {
          refreshGameState()
          refreshTeamProgress()
          showToast(`Node ${nodeId} verified. Next: ${result.nextNodeId}`, 'evidence')
        } else {
          showToast(`Node ${nodeId} solved!`, 'evidence')
          refreshGameState()
          refreshTeamProgress()
        }
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
        leaveTimerRef.current = setTimeout(() => {
          navigate(ROUTES.PLAYER_GAME, { replace: true })
        }, 2000)
      } else {
        audio.failure()
      }
      setAnswer('')
    } catch (err: unknown) {
      if (!mountedRef.current) return
      const msg = err instanceof Error ? err.message : 'Submission failed'
      setActionError(msg)
      audio.failure()
    } finally {
      submitBusyRef.current = false
      if (mountedRef.current) setIsSubmitting(false)
    }
  }

  const handleHint = async () => {
    if (!nodeId || !node) return
    const nextHintNumber = hintIndexRef.current + 1
    if (nextHintNumber > 3) return
    // Each hint costs time: a double tap must not buy two.
    if (hintBusyRef.current) return
    hintBusyRef.current = true

    try {
      const result = await requestHint(nodeId, nextHintNumber)
      if (!mountedRef.current) return
      setHints(prev => [...prev, {
        level: nextHintNumber,
        text: result.hint,
        penalty: result.penaltySeconds,
      }])
      hintIndexRef.current = nextHintNumber
    } catch (err: unknown) {
      if (!mountedRef.current) return
      const msg = err instanceof Error ? err.message : 'Failed to get hint'
      setActionError(msg)
    } finally {
      hintBusyRef.current = false
    }
  }

  const isOperator = role === 'OPERATOR'
  const roleTheme = role && ROLE_THEMES[role]
  const isSolved = node?.isSolved || justSolved

  if (!nodeId) {
    return (
      <div className="page-content max-w-md mx-auto text-center py-12">
        <BureauIcons.Back className="bureau-icon w-12 h-12 text-nexus-textMuted mx-auto mb-4" aria-hidden="true" />
        <h1 className="heading-3 mb-2">Invalid Node</h1>
        <Link to={ROUTES.PLAYER_GAME} className="nexus-btn nexus-btn-secondary w-full touch-target-comfortable">
          RETURN TO FIELD
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-content max-w-md mx-auto text-center py-12">
          <BureauIcons.Spinner className="bureau-icon w-8 h-8 text-nexus-accent animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-nexus-textMuted">LOADING INVESTIGATION NODE…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-content max-w-md mx-auto text-center py-12">
          <BureauIcons.Flag className="bureau-icon w-8 h-8 text-nexus-warning mx-auto mb-4" aria-hidden="true" />
          <h3 className="heading-4 mb-2">INVESTIGATION BLOCKED</h3>
          <p className="text-nexus-textMuted mb-4">{error}</p>
          <Link to={ROUTES.PLAYER_GAME} className="nexus-btn nexus-btn-secondary w-full touch-target-comfortable">
RETURN TO FIELD
          </Link>
        </div>
      </div>
    )
  }

  // The engine resolved null: this client cannot describe the node at all. That
  // happens for a code in neither the server's register nor the local bundle -
  // a stale link, an operator deleting a node mid-session, a typo in a pasted
  // URL. It used to `return null`, which is a blank page with no explanation and
  // no way back: the acceptance test for this screen is "no blank critical
  // screens", and a puzzle that cannot be opened is still a screen.
  if (!node) {
    return (
      <div className="page">
        <div className="page-content max-w-md mx-auto text-center py-12">
          <BureauIcons.Flag className="bureau-icon w-8 h-8 text-nexus-warning mx-auto mb-4" aria-hidden="true" />
          <h1 className="heading-3 mb-2">NOT IN THE REGISTER</h1>
          <p className="text-nexus-textMuted mb-6">
            Node <span className="font-mono">{nodeId}</span> is not part of this case. It may have been
            sealed, or the link may be from another run.
          </p>
          <Link to={ROUTES.PLAYER_GAME} className="nexus-btn nexus-btn-primary w-full touch-target-comfortable">
            RETURN TO FIELD
          </Link>
        </div>
      </div>
    )
  }

  const isLocked = !node.unlocked && !node.isSolved
  const hintLevel = hintIndexRef.current
  const hintPenaltyMap = { 0: HINT_PENALTIES.hint1, 1: HINT_PENALTIES.hint2, 2: HINT_PENALTIES.hint3 }
  const nextHintCost = hintLevel < 3 ? Math.floor(hintPenaltyMap[hintLevel as 0 | 1 | 2] / 60) : 0

  const nodeStatusTone: StatusTone =
    node!.status === 'SOLVED' ? 'active' : node!.unlocked ? 'warning' : 'inactive'

  function RoleWaitingStateInner() {
    if (!node?.roleContent || !role) return null
    const chain = node.coordinationChain
    if (!chain) return null

    const waitingConfig: Record<string, { label: string; description: string; icon: ReactNode }> = {
      OBSERVER: {
        label: 'AWAITING YOUR FIELD REPORT',
        description: 'Inspect the scene and submit your findings. The Analyst is waiting for your observation.',
        icon: <BureauIcons.Eye className="bureau-icon w-5 h-5" />,
      },
      ANALYST: {
        label: 'AWAITING ANALYST INTERPRETATION',
        description: 'The Observer has reported. Use their findings to interpret the evidence. The Operator needs your analysis.',
        icon: <BureauIcons.Search className="bureau-icon w-5 h-5" />,
      },
      OPERATOR: {
        label: 'AWAITING OPERATOR VERIFICATION',
        description: 'The team has gathered evidence. Verify the combined solution and submit the final answer.',
        icon: <BureauIcons.Confirm className="bureau-icon w-5 h-5" />,
      },
    }

    const config = waitingConfig[role]
    if (!config) return null

    return (
      <div className="nexus-panel border-nexus-warning/30 bg-nexus-warningBg/10 p-4">
        <div className="flex items-start gap-3">
          <div className="text-nexus-warning mt-0.5">{config.icon}</div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-nexus-warning">
              {config.label}
            </p>
            <p className="mt-1 text-sm text-nexus-textMuted">
              {config.description}
            </p>
            {role === 'ANALYST' && (
              <p className="mt-2 text-xs text-nexus-textSubtle">
                Observer produced: <span className="text-nexus-text">{chain.observerProduces}</span>
              </p>
            )}
            {role === 'OPERATOR' && (
              <div className="mt-2 space-y-1 text-xs text-nexus-textSubtle">
                <p>Observer produced: <span className="text-nexus-text">{chain.observerProduces}</span></p>
                <p>Analyst produced: <span className="text-nexus-text">{chain.analystTransforms}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

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
            <BureauIcons.Back className="bureau-icon w-5 h-5" aria-hidden="true" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StateMarker glyph="◦" tone={nodeStatusTone} label={node.status} />
              <span className="text-sm text-nexus-textMuted font-mono">Node: {node.code}</span>
            </div>
            <h1 className="heading-3 truncate">{node.title}</h1>
          </div>
        </div>

        {/* Role Indicator + Coordination Info */}
        <div className={cn('nexus-ops-panel flex items-center gap-4', roleTheme?.bg)}>
          <div className={cn('w-12 h-12 flex items-center justify-center border border-nexus-borderSubtle', roleTheme?.bg)}>
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
          {node.isSolved && <BureauIcons.Flag className="bureau-icon w-6 h-6 text-nexus-accent ml-auto" />}
        </div>

        {/* Role Waiting State — when this role needs another role's input */}
        {node.unlocked && !node.isSolved && node.roleContent && role && (
          <RoleWaitingStateInner />
        )}

        {/* Locked State */}
        {isLocked && (
          <DocumentShell
            reference={`Node ${node.code}`}
            title="Node Locked"
            stock="paper"
            footer={<Stamp variant="incomplete">Sealed</Stamp>}
          >
            <div className="text-center py-6">
              <p className="text-nexus-textMuted">
                Solve prerequisite puzzles or scan the correct QR code to unlock this node.
              </p>
            </div>
          </DocumentShell>
        )}

        {/* Role-Specific Content — only when unlocked and not solved */}
        {node.unlocked && node.roleContent && !isSolved && (
          <div className="nexus-document space-y-6">
            <h3 className="heading-4 flex items-center gap-2">
              <span className={roleTheme?.text}>●</span>
              <span>{node.roleContent.screenTitle}</span>
            </h3>

            {/* Type-specific visual */}
            <EvidenceFrame seed={`node:${node.code}:visual`} title={node.roleContent.visualType ?? 'Data Feed'}>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wider text-nexus-textSubtle">
                  Visual readout
                </p>
                <PuzzleVisual
                  type={node.roleContent.visualType}
                  dataPayload={node.roleContent.dataPayload}
                  interactiveData={node.roleContent.interactiveData}
                />
              </div>
            </EvidenceFrame>

            {/* Mission Brief */}
            <div className="nexus-panel space-y-3">
              <p className="text-sm text-nexus-textMuted">
                <strong className="text-nexus-text">Mission Brief:</strong> {node.roleContent.whatTheySee}
              </p>
              <p className="text-sm text-nexus-textMuted">
                <strong className="text-nexus-text">Your Task:</strong> {node.roleContent.taskPrompt}
              </p>
            </div>

            {/* Coordination Chain */}
            {node.coordinationChain && (
              <RegisterColumn heading="Team Coordination">
                <div className="nexus-panel p-3 space-y-2 text-sm">
                  <p className="text-nexus-textMuted">
                    <strong>Observer produces:</strong> {node.coordinationChain.observerProduces}
                  </p>
                  <p className="text-nexus-textMuted">
                    <strong>Analyst transforms:</strong> {node.coordinationChain.analystTransforms}
                  </p>
                  <p className="text-nexus-textMuted">
                    <strong>Operator executes:</strong> {node.coordinationChain.operatorExecutes}
                  </p>
                </div>
              </RegisterColumn>
            )}

            {/* Operator Investigation */}
            {isOperator && node.operatorInvestigation && (
              <div className={cn('nexus-panel p-4 space-y-2', roleTheme?.bg)}>
                <h4 className="text-xs uppercase tracking-wider text-nexus-textSubtle">
                  Investigation Protocol
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-nexus-textMuted">
                    <strong>Your Evidence:</strong> {node.operatorInvestigation.operatorOwnEvidence}
                  </p>
                  <p className="text-nexus-textMuted">
                    <strong>Task:</strong> {node.operatorInvestigation.operatorTaskDescription}
                  </p>
                  <div className="nexus-panel p-3 mt-2 bg-nexus-bg/70 border-nexus-borderSubtle">
                    <p className="text-xs uppercase tracking-wider text-nexus-textSubtle mb-1.5">
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
              <div className="nexus-panel p-3 border-nexus-warning/30">
                <p className="text-xs uppercase tracking-wider text-nexus-textSubtle mb-1">
                  Recovery Note
                </p>
                <p className="text-xs text-nexus-textMuted">
                  <strong>If stuck:</strong> {node.failurePropagation.recoveryGuidance}
                </p>
              </div>
            )}

            {/* Hints Panel */}
            {hints.length > 0 && (
              <RegisterColumn heading="Acquired Hints">
                <div className="space-y-2">
                  {hints.map(h => (
                    <div
                      key={h.level}
                      className="nexus-panel p-3 border-nexus-warning/30 bg-nexus-warningBg/20"
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
              </RegisterColumn>
            )}
          </div>
        )}

        {/* Solved State */}
        {isSolved && (
          <DocumentShell
            reference={`Node ${node.code}`}
            title="Node Complete"
            stock="carbon"
            classification="RESTRICTED"
            footer={<Stamp variant="verified" impressed>Solved</Stamp>}
          >
            <div className="text-center py-6">
              <div className="w-16 h-16 border-2 border-nexus-accent/30 bg-nexus-accentBg flex items-center justify-center mx-auto mb-4">
                <span className="font-display text-3xl text-nexus-accent" aria-hidden="true">✓</span>
              </div>
              <p className="text-nexus-textMuted mb-4">
                {node.storyReveal || 'This investigation node has been completed.'}
              </p>
              <div className="flex justify-center">
                <Link
                  to={ROUTES.PLAYER_GAME}
                  className="nexus-btn nexus-btn-primary touch-target-comfortable"
                >
                  <BureauIcons.Back className="bureau-icon w-4 h-4" />
                    <span>RETURN TO FIELD HUB</span>
                </Link>
              </div>
            </div>
          </DocumentShell>
        )}

        {/* Submission Area */}
        {!isSolved && node.unlocked && (
          <DocumentShell
            reference={`Node ${node.code}`}
            title="SOLUTION TRANSMISSION"
            stock="paper"
            footer={
              <Stamp variant={isOffline ? 'anomalous' : 'verified'}>
                {isOffline ? 'QUEUED' : 'LIVE'}
              </Stamp>
            }
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="answer" className="label">SOLUTION</label>
                <input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                   placeholder={
                     isOperator ? 'ENTER THE COMBINED SOLUTION…' : 'ENTER YOUR ANSWER…'
                   }
                  className="input font-mono text-lg text-center"
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={actionError ? true : undefined}
                  aria-describedby={cn(isOffline && 'answer-offline', actionError && 'answer-error') || undefined}
                />
                {actionError && (
                  <p id="answer-error" role="alert" className="mt-1.5 text-sm text-nexus-danger">
                    {actionError}
                  </p>
                )}
                {isOffline && (
                  <p id="answer-offline" className="mt-1.5 text-sm text-nexus-warning flex items-center gap-1.5">
                    <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span>No signal — your answer will be queued and sent on reconnect</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !answer.trim()}
                className="nexus-btn nexus-btn-primary w-full touch-target-comfortable"
              >
                {isSubmitting ? (
                  <>
                    <BureauIcons.Spinner className="bureau-icon w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>TRANSMITTING…</span>
                  </>
                ) : (
                  <>
                    <BureauIcons.Send className="bureau-icon w-5 h-5" aria-hidden="true" />
                    <span>{isOffline ? 'QUEUE SOLUTION' : 'TRANSMIT'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Submission Status */}
            {submissions.length > 0 && (
              <RegisterColumn heading={`Recent Attempts (${submissions.length})`}>
                <div className="space-y-1 max-h-40 overflow-y-auto" role="log" aria-live="polite" aria-label="Recent attempts">
                  {submissions.slice(-5).map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 border-b border-nexus-borderSubtle text-sm"
                    >
                      <code className="font-mono text-nexus-text truncate">
                        {sub.answer}
                      </code>
                      <Stamp variant={
                        sub.queued
                          ? 'anomalous'
                          : sub.isCorrect
                            ? 'verified'
                            : 'contradicted'
                      } impressed>
                        {sub.queued ? 'QUEUED' : sub.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </Stamp>
                    </div>
                  ))}
                </div>
              </RegisterColumn>
            )}

            {/* Hint Section */}
            {!isSolved && hintLevel < 3 && (
              <div className="border-t border-nexus-borderSubtle pt-2">
                <button
                  onClick={() => setShowHintPanel(true)}
                  className="nexus-btn nexus-btn-ghost w-full touch-target-primary"
                  type="button"
                >
                  <BureauIcons.Help className="bureau-icon w-4 h-4" />
                  <span>Request Hint {hintLevel + 1} of 3</span>
                  <span className="ml-auto text-xs text-nexus-textSubtle">
                    -{nextHintCost}min
                  </span>
                </button>
                {showHintPanel && (
                  <div className="mt-3 p-4 border-nexus-warning/30 bg-nexus-warningBg/20">
                    <p className="text-sm text-nexus-textMuted mb-3">
                      Request Hint {hintLevel + 1}? This will subtract{' '}
                      {Math.floor(hintPenaltyMap[hintLevel as 0 | 1 | 2] / 60)} minutes from your
                      final score.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setShowHintPanel(false)
                          await handleHint()
                        }}
                        className="nexus-btn nexus-btn-warning flex-1 touch-target-primary"
                        type="button"
                      >
                        Request
                      </button>
                      <button
                        onClick={() => setShowHintPanel(false)}
                        className="nexus-btn nexus-btn-secondary flex-1 touch-target-primary"
                        type="button"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DocumentShell>
        )}
      </div>
      <DiscoveryToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
