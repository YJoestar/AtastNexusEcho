/**
 * NEXUS — Player Puzzle Node
 * Data-driven puzzle screen with role-specific content.
 *
 * THE ROLE RULE: only the Operator types. The Observer studies
 * their material and speaks their conclusion; the Analyst listens,
 * interprets, and speaks theirs; the Operator combines what was
 * said with their own evidence and submits the team's final
 * conclusion. Observer and Analyst screens carry no answer field,
 * no submit control and no correctness feedback — their results
 * exist as human knowledge inside the team, by design.
 *
 * SECURITY: Never displays acceptedAnswer, fullSolution, or
 * server-side validation patterns. The server serves each role
 * only its own material (2026100602) and accepts a submission
 * from the Operator alone (2026100601). All answer validation
 * happens server-side via gameAPI.submitAnswer.
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
  // A wrong conclusion is reported generically: the team learns
  // that the reconstruction failed, never which part of the
  // chain produced it.
  const [conclusionFailed, setConclusionFailed] = useState(false)
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
        setConclusionFailed(false)
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
        setConclusionFailed(false)
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
        // Deliberately generic. Naming the failing role, the
        // failing clue or any partial correctness would let the
        // team skip the reassessment the game is built on.
        setConclusionFailed(true)
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

  function RoleBriefingInner() {
    if (!node?.roleContent || !role) return null

    // Role briefings describe what the role DOES, never what it
    // should conclude: the chain's intermediate results exist
    // only as things the team says out loud.
    const briefingConfig: Record<string, { label: string; description: string; icon: ReactNode }> = {
      OBSERVER: {
        label: 'OBSERVE AND REPORT',
        description: 'Study the evidence on this screen. When you reach a conclusion, communicate it verbally to your team.',
        icon: <BureauIcons.Eye className="bureau-icon w-5 h-5" />,
      },
      ANALYST: {
        label: 'INTERPRET AND REPORT',
        description: 'Use the information your Observer has communicated to you. Interpret, compare, question — then communicate your conclusion verbally.',
        icon: <BureauIcons.Search className="bureau-icon w-5 h-5" />,
      },
      OPERATOR: {
        label: 'SYNTHESIZE AND CONCLUDE',
        description: 'Combine what the team has communicated with your own evidence below, then state the final conclusion.',
        icon: <BureauIcons.Confirm className="bureau-icon w-5 h-5" />,
      },
    }

    const config = briefingConfig[role]
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

        {/* Role Briefing — what this role does with the material */}
        {node.unlocked && !node.isSolved && node.roleContent && role && (
          <RoleBriefingInner />
        )}

        {/* Locked State */}
        {isLocked && (
          <DocumentShell
            reference={`Node ${node.code}`}
            title="Node Locked"
            stock="paper"
            footer={<Stamp variant="incomplete">Sealed</Stamp>}
          >
            <div className="space-y-3 py-4 text-center">
              <p className="text-nexus-textMuted">
                This node is sealed. Complete the required steps to unlock it.
              </p>
              {node.prerequisites.length > 0 && (
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-nexus-textSubtle">
                  <p className="mb-1">Required:</p>
                  <ul className="space-y-1">
                    {node.prerequisites.map((pr, idx) => (
                      <li key={idx}>
                        {pr.type === 'NODE_SOLVED' && `Solve node ${pr.targetId}`}
                        {pr.type === 'EVIDENCE_OWNED' && `Find evidence ${pr.targetId}`}
                        {pr.type === 'TIME_ELAPSED' && `Wait ${pr.value ?? ''}`}
                        {pr.type === 'ROLE_ACTION' && `${pr.role ?? 'Role'} action: ${pr.targetId}`}
                        {pr.type === 'ADMIN_UNLOCK' && 'Admin unlock required'}
                        {!['NODE_SOLVED', 'EVIDENCE_OWNED', 'TIME_ELAPSED', 'ROLE_ACTION', 'ADMIN_UNLOCK'].includes(pr.type) && pr.targetId}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

            {/* Coordination between roles is verbal. The chain that
                describes each role's expected result is deliberately
                not rendered: reading it would replace the conversation
                the game depends on. */}

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
                </div>
              </div>
            )}

            {/* Recovery guidance is earned through the hint
                system, not handed out on load. */}

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

        {/* Final Reconstruction — the Operator is the only player
            who types. The Observer and the Analyst carry no answer
            field: their results are spoken, not submitted. */}
        {!isSolved && node.unlocked && isOperator && (
          <DocumentShell
            reference={`Node ${node.code}`}
            title="FINAL RECONSTRUCTION"
            stock="paper"
            footer={
              <Stamp variant={isOffline ? 'anomalous' : 'verified'}>
                {isOffline ? 'QUEUED' : 'LIVE'}
              </Stamp>
            }
          >
            {/* Generic failure notice. The team learns only that the
                conclusion was not verified — never which role, clue
                or step produced it. */}
            {conclusionFailed && !actionError && (
              <div className="nexus-panel p-4 border-nexus-danger/30" role="status">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-nexus-danger">
                  Conclusion Not Verified
                </p>
                <p className="mt-1 text-sm text-nexus-textMuted">
                  The submitted conclusion does not match the available
                  evidence. Reassess the investigation.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="answer" className="label">FINAL CONCLUSION</label>
                <input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={e => {
                    setAnswer(e.target.value)
                    setConclusionFailed(false)
                  }}
                  placeholder="STATE THE TEAM'S CONCLUSION…"
                  className="input font-mono text-lg text-center"
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={actionError ? true : undefined}
                  aria-describedby={cn(isOffline && 'answer-offline', actionError && 'answer-error') || undefined}
                />
                <p className="mt-1.5 text-xs text-nexus-textSubtle">
                  You are submitting the team's current reconstruction.
                  Confirm it with your team before verification.
                </p>
                {actionError && (
                  <p id="answer-error" role="alert" className="mt-1.5 text-sm text-nexus-danger">
                    {actionError}
                  </p>
                )}
                {isOffline && (
                  <p id="answer-offline" className="mt-1.5 text-sm text-nexus-warning flex items-center gap-1.5">
                    <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span>No signal — your conclusion will be queued and sent on reconnect</span>
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
                    <span>VERIFYING…</span>
                  </>
                ) : (
                  <>
                    <BureauIcons.Confirm className="bureau-icon w-5 h-5" aria-hidden="true" />
                    <span>{isOffline ? 'QUEUE CONCLUSION' : 'VERIFY CONCLUSION'}</span>
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
                        {sub.queued ? 'QUEUED' : sub.isCorrect ? 'VERIFIED' : 'NOT VERIFIED'}
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

        {/* Verbal channel — the Observer and the Analyst reason and
            speak. There is deliberately no field, no control and no
            feedback here: the application must not replace the
            conversation. */}
        {!isSolved && node.unlocked && !isOperator && role && (
          <DocumentShell
            reference={`Node ${node.code}`}
            title={role === 'OBSERVER' ? 'FIELD OBSERVATION' : 'ANALYSIS WORKBENCH'}
            stock="paper"
            footer={<Stamp variant="incomplete">Verbal</Stamp>}
          >
            <div className="space-y-3 py-2 text-center">
              <p className="text-sm text-nexus-textMuted">
                {role === 'OBSERVER'
                  ? 'Study the evidence above and reason it through. When you reach a conclusion, say it to your team — the Analyst and the Operator depend on hearing it.'
                  : 'Use what your Observer has told you. Interpret and compare it against the evidence above, then say your conclusion to the team — the Operator depends on hearing it.'}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-nexus-textSubtle">
                No answer is entered on this device
              </p>
            </div>
          </DocumentShell>
        )}
      </div>
      <DiscoveryToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
