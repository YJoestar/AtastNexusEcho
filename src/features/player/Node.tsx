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
import { ROUTES, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useDiscoveryToast } from '@/hooks/useDiscoveryToast'
import { DiscoveryToastContainer } from '@/components/ui/DiscoveryToast'
import { PuzzleVisual } from '@/components/player/puzzle/PuzzleVisual'
import { HINT_PENALTIES } from '@/content/constants'
import { useEffect, useState, useRef } from 'react'
import type { PlayerNodeView } from '@/hooks/useGameEngine'
import { BureauIcons } from '@/components/bureau'
import {
  DocumentShell,
  EvidenceFrame,
  StateMarker,
  Stamp,
  type StatusTone,
} from '@/components/bureau'

/**
 * How long a node request may stay pending before the player is told the
 * Bureau did not answer. Long enough for a weak signal, short enough that a
 * stalled request is not mistaken for a loading screen that never ends.
 */
const NODE_LOAD_TIMEOUT_MS = 12_000

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
  const [submissions, setSubmissions] = useState<
    { answer: string; isCorrect: boolean; queued: boolean }[]
  >([])
  const [hints, setHints] = useState<{ level: number; text: string; penalty: number }[]>([])
  const [showHintPanel, setShowHintPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /**
   * Bumped by the retry control. A hung request is a realistic field failure
   * on a weak connection, and without a bound the spinner never resolves and
   * the player has no way to try again.
   */
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [justSolved, setJustSolved] = useState(false)
  const hintIndexRef = useRef(0)

  useEffect(() => {
    // The load used to bail out here without clearing `loading`, so a player
    // whose role had not resolved sat on a permanent spinner with no error and
    // no way back. Every early exit now leaves the screen in a real state.
    if (!nodeId) return

    if (!role) {
      setLoading(false)
      setError('Your field assignment has not been received from the Bureau yet. Reconnect and try again.')
      return
    }

    const loadNode = async () => {
      setLoading(true)
      setError(null)
      try {
        // A request that never settles must not hold the screen. Give it a
        // bound, and let the player ask for another attempt.
        const nodeData = await Promise.race([
          fetchNode(nodeId),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('The Bureau did not respond. Check the signal and try again.')), NODE_LOAD_TIMEOUT_MS)
          }),
        ])
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
  }, [nodeId, role, fetchNode, loadAttempt])

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
        queued: result.queued === true,
      }])

      if (result.queued) {
        showToast('No signal — answer queued and will be sent on reconnect', 'general')
      } else if (result.isCorrect) {
        setJustSolved(true)
        if (result.nextNodeId) {
          refreshGameState()
          refreshTeamProgress()
          showToast(`Node ${nodeId} verified. Next: ${result.nextNodeId}`, 'evidence')
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
          <h1 className="heading-3 mb-2">Investigation blocked</h1>
          <p className="nx-body text-nexus-textMuted mb-6" role="alert">{error}</p>
          {/* Retry first: a stalled request is usually transient, and making
              the player navigate away to try again loses their place. */}
          <button
            type="button"
            onClick={() => {
              setLoadAttempt(attempt => attempt + 1)
            }}
            className="nx-action w-full"
          >
            <BureauIcons.Refresh className="bureau-icon w-4 h-4" />
            <span>Try again</span>
          </button>
          <Link to={ROUTES.PLAYER_GAME} className="nx-action-ghost w-full mt-3">
            <BureauIcons.Back className="bureau-icon w-4 h-4" />
            <span>Return to the case</span>
          </Link>
        </div>
      </div>
    )
  }

  if (!node) {
    // Reachable when the load resolved without a record. Returning null here
    // left the player on an empty screen with no explanation and no exit.
    return (
      <div className="page">
        <div className="page-content max-w-md mx-auto text-center py-12">
          <BureauIcons.File className="bureau-icon w-10 h-10 text-nexus-textMuted mx-auto mb-4" aria-hidden="true" />
          <h1 className="heading-3 mb-2">Nothing filed here</h1>
          <p className="nx-body text-nexus-textMuted mb-6">
            The Bureau returned no record for this item. It may have been withdrawn, or it may not have been
            issued to your team.
          </p>
          <Link to={ROUTES.PLAYER_GAME} className="nx-action w-full">
            <span>Return to the case</span>
            <BureauIcons.Back className="bureau-icon w-4 h-4" />
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
    node.status === 'SOLVED' ? 'active' : node.unlocked ? 'warning' : 'inactive'

  /**
   * Transmitting an answer is the one thing a player does on this screen, so
   * the form is defined once and placed directly beneath the material it
   * answers. It used to sit at the very bottom of the page, below the visual,
   * the brief, the coordination chain and the protocol, which on a handset meant
   * scrolling past everything to reach the only interactive field.
   */
  const submissionPanel = (
    <DocumentShell
      reference={`Node ${node.code}`}
      title="Transmission"
      stock="paper"
      titleAs="h2"
      footer={
        <Stamp variant={isOffline ? 'anomalous' : 'verified'}>{isOffline ? 'Queued' : 'Live'}</Stamp>
      }
    >
      <form onSubmit={handleSubmit} className="nx-stack">
        <div>
          <label htmlFor="answer" className="nx-eyebrow block mb-2">
            Your solution
          </label>
          <input
            id="answer"
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder={isOperator ? 'Combined solution' : 'Your answer'}
            className="input font-mono text-center text-xl"
            autoComplete="off"
            disabled={isSubmitting}
            aria-describedby={isOffline ? 'answer-offline' : undefined}
          />
          {isOffline && (
            <p
              id="answer-offline"
              className="nx-meta text-nexus-warning mt-2 flex items-center gap-1.5"
            >
              <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span>No signal. Your answer will be queued and sent on reconnect.</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !answer.trim()}
          className="nx-action w-full"
        >
          {isSubmitting ? (
            <>
              <BureauIcons.Spinner className="bureau-icon w-4 h-4 animate-spin" />
              <span>Transmitting</span>
            </>
          ) : (
            <>
              <BureauIcons.Send className="bureau-icon w-4 h-4" />
              <span>{isOffline ? 'Queue solution' : 'Transmit'}</span>
            </>
          )}
        </button>
      </form>

      {/* Submission Status */}
      {submissions.length > 0 && (
        <div className="mt-6">
          <div className="nx-section-head">
            <h3 className="nx-eyebrow">Recent attempts</h3>
            <span className="nx-meta text-nexus-textSubtle tabular-nums">{submissions.length}</span>
          </div>
          <div className="mt-3 nx-stack-tight">
            {submissions.slice(-5).map((sub, i) => (
              <div key={i} className="nx-row-between gap-3 border-b border-nexus-borderSubtle pb-2">
                <code className="font-mono nx-body text-nexus-text truncate">{sub.answer}</code>
                <span
                  className="nx-chip shrink-0"
                  data-tone={sub.queued ? 'warning' : sub.isCorrect ? 'verified' : 'danger'}
                >
                  {sub.queued ? 'Queued' : sub.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint Section */}
      {!isSolved && hintLevel < 3 && (
        <div className="mt-6 border-t border-nexus-borderSubtle pt-4">
          <button
            onClick={() => setShowHintPanel(true)}
            className="nx-action-ghost w-full justify-between"
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <BureauIcons.Help className="bureau-icon w-4 h-4" />
              <span>Request hint {hintLevel + 1} of 3</span>
            </span>
            <span className="text-nexus-warning">-{nextHintCost} min</span>
          </button>
          {showHintPanel && (
            <div className="mt-4 nx-panel border-nexus-warning/40">
              <p className="nx-body text-nexus-textMuted">
                Requesting hint {hintLevel + 1} subtracts{' '}
                {Math.floor(hintPenaltyMap[hintLevel as 0 | 1 | 2] / 60)} minutes from your final score.
              </p>
              <div className="nx-row gap-3 mt-4">
                <button
                  onClick={async () => {
                    setShowHintPanel(false)
                    await handleHint()
                  }}
                  className="nx-action flex-1"
                  type="button"
                >
                  <span>Request</span>
                </button>
                <button onClick={() => setShowHintPanel(false)} className="nx-action-ghost flex-1" type="button">
                  <span>Discard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DocumentShell>
  )

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-nexus-border pb-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text"
            aria-label="Return to the case"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="nx-row gap-2 mb-1 flex-wrap">
              <StateMarker glyph="◦" tone={nodeStatusTone} label={node.status} />
              <span className="nx-meta text-nexus-textMuted font-mono">Item {node.code}</span>
            </div>
            <h1 className="nx-title">{node.title}</h1>
          </div>
        </div>

        {/* Locked State */}
        {isLocked && (
          <DocumentShell
            reference={`Node ${node.code}`}
            title="Sealed"
            stock="paper"
            titleAs="h2"
            footer={<Stamp variant="incomplete">Sealed</Stamp>}
          >
            <p className="nx-body text-nexus-textMuted">
              This item stays sealed until the Bureau issues it. Solve the outstanding work, or scan the
              correct field marker.
            </p>
          </DocumentShell>
        )}

        {/* Role-Specific Content — only when unlocked and not solved */}
        {node.unlocked && node.roleContent && !isSolved && (
          <div className="nx-stack-loose">
            {/* The task comes before the material. The player needs to know
                what is being asked before looking at anything. */}
            <section aria-labelledby="task-heading">
              <h2 id="task-heading" className="nx-eyebrow mb-3">
                Assignment
              </h2>
              <div className="nx-stack">
                <p className="nx-lead text-nexus-text">
                  {node.roleContent.whatTheySee}
                </p>
                <div className="nx-panel nx-stack-tight">
                  <span className="nx-eyebrow">Your task</span>
                  <p className="nx-body text-nexus-text">{node.roleContent.taskPrompt}</p>
                </div>
              </div>
            </section>

            {/* Type-specific visual */}
            <EvidenceFrame seed={`node:${node.code}:visual`} title={node.roleContent.visualType ?? 'Data Feed'}>
              <div className="space-y-4">
                <p className="nx-eyebrow">Visual readout</p>
                <PuzzleVisual
                  type={node.roleContent.visualType}
                  dataPayload={node.roleContent.dataPayload}
                  interactiveData={node.roleContent.interactiveData}
                />
              </div>
            </EvidenceFrame>

            {/* The answer sits directly beneath what it answers. */}
            {submissionPanel}

            {/* Supporting material. Present, but deliberately below the fold:
                the player should not have to read protocol before answering. */}
            <section aria-labelledby="support-heading" className="nx-stack-loose">
              <h2 id="support-heading" className="nx-section-head nx-eyebrow">
                Supporting material
              </h2>

              {/* Coordination Chain */}
              {node.coordinationChain && (
                <div className="nx-panel nx-stack-tight">
                  <span className="nx-eyebrow">Team coordination</span>
                  <p className="nx-body text-nexus-textMuted">
                    <strong className="text-nexus-text">Observer produces:</strong>{' '}
                    {node.coordinationChain.observerProduces}
                  </p>
                  <p className="nx-body text-nexus-textMuted">
                    <strong className="text-nexus-text">Analyst transforms:</strong>{' '}
                    {node.coordinationChain.analystTransforms}
                  </p>
                  <p className="nx-body text-nexus-textMuted">
                    <strong className="text-nexus-text">Operator executes:</strong>{' '}
                    {node.coordinationChain.operatorExecutes}
                  </p>
                </div>
              )}

              {/* Operator Investigation */}
              {isOperator && node.operatorInvestigation && (
                <div className={cn('nx-panel nx-stack-tight', roleTheme?.bg)}>
                  <span className="nx-eyebrow">Investigation protocol</span>
                  <p className="nx-body text-nexus-textMuted">
                    <strong className="text-nexus-text">Your evidence:</strong>{' '}
                    {node.operatorInvestigation.operatorOwnEvidence}
                  </p>
                  <p className="nx-body text-nexus-textMuted">
                    <strong className="text-nexus-text">Task:</strong>{' '}
                    {node.operatorInvestigation.operatorTaskDescription}
                  </p>
                  <div className="nx-inset nx-stack-tight p-4 mt-2">
                    <span className="nx-eyebrow">Required discoveries</span>
                    <p className="nx-body text-nexus-textMuted">
                      <strong className="text-nexus-text">From Observer:</strong>{' '}
                      {node.operatorInvestigation.requiredDiscoveries.observerDiscovery}
                    </p>
                    <p className="nx-body text-nexus-textMuted">
                      <strong className="text-nexus-text">From Analyst:</strong>{' '}
                      {node.operatorInvestigation.requiredDiscoveries.analystDiscovery}
                    </p>
                  </div>
                </div>
              )}

              {/* Failure Propagation */}
              {node.failurePropagation && (
                <div className="nx-panel nx-stack-tight border-nexus-warning/40">
                  <span className="nx-eyebrow">Recovery note</span>
                  <p className="nx-body text-nexus-textMuted">{node.failurePropagation.recoveryGuidance}</p>
                </div>
              )}

              {/* Hints Panel */}
              {hints.length > 0 && (
                <div className="nx-stack-tight">
                  {hints.map(h => (
                    <div key={h.level} className="nx-panel nx-stack-tight border-nexus-warning/40">
                      <span className="nx-eyebrow text-nexus-warning">Hint {h.level}</span>
                      <p className="nx-body text-nexus-warning">{h.text}</p>
                      {h.penalty > 0 && (
                        <p className="nx-meta text-nexus-textSubtle">
                          Penalty: -{Math.floor(h.penalty / 60)} minutes
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
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

      </div>
      <DiscoveryToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
