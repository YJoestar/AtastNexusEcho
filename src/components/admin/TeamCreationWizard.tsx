/**
 * NEXUS — Team Creation Wizard
 *
 * Multi-step flow:
 *  1. Create team (name, color, tag)
 *  2. Register players (name)
 *  3. Assign roles (captain, hacker, coder, speaker)
 *  4. Generate unique access codes
 *
 * All actions go through adminAPI — server authoritative.
 */

import { useState, useCallback, useRef } from 'react'
import { BureauIcons } from '@/components/bureau'
import { cn, generateId } from '@/lib/utils'
import { adminAPI } from '@/lib/admin'
import { TEAM_COLORS, MAX_PLAYERS_PER_TEAM, PLAYER_ROLES } from '@/app/config'
import { PlayerCredentialsPanel } from '@/components/admin/PlayerCredentialsPanel'

type Step = 1 | 2 | 3 | 4

interface PlayerInput {
  id: string
  name: string
}

interface TeamRoleAssignment {
  playerId: string
  role: string
}

interface TeamCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const TEAM_CREATION_MAX_PLAYERS = MAX_PLAYERS_PER_TEAM
export const TEAM_CREATION_MIN_PLAYERS = MAX_PLAYERS_PER_TEAM

export function TeamCreationWizard({ isOpen, onClose, onSuccess }: TeamCreationWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Team details
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState<typeof TEAM_COLORS[number]>(TEAM_COLORS[0])
  const [teamTag, setTeamTag] = useState('')

  // Step 2 — Players
  const [players, setPlayers] = useState<PlayerInput[]>([
    { id: '1', name: '' },
    { id: '2', name: '' },
    { id: '3', name: '' },
  ])

  // Step 3 — Role assignments
  const [roleAssignments, setRoleAssignments] = useState<TeamRoleAssignment[]>([])

  // Step 4 — Generated codes
  const [generatedCodes, setGeneratedCodes] = useState<{
    team: string
    players: Array<{ name: string; role: string; loginCode: string }>
    idempotent?: boolean
  } | null>(null)

  /**
   * One idempotency key per wizard session. A double submit, or a retry after a
   * lost response, resolves to the same team with freshly rotated codes instead
   * of creating a second team and orphaning the first roster.
   */
  const idempotencyKeyRef = useRef(generateId())

  const resetWizard = useCallback(() => {
    setStep(1)
    setError('')
    setTeamName('')
    setTeamColor(TEAM_COLORS[0])
    setTeamTag('')
    setPlayers([
      { id: '1', name: '' },
      { id: '2', name: '' },
      { id: '3', name: '' },
    ])
    setRoleAssignments([])
    setGeneratedCodes(null)
    idempotencyKeyRef.current = generateId()
  }, [])

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  // --- Player Management ---
  const addPlayer = () => {
    if (players.length >= TEAM_CREATION_MAX_PLAYERS) {
      setError(`Maximum ${TEAM_CREATION_MAX_PLAYERS} players per team`)
      return
    }
    setPlayers([...players, { id: generateId(), name: '' }])
  }

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id))
    setRoleAssignments(roleAssignments.filter(ra => ra.playerId !== id))
  }

  const updatePlayer = (id: string, field: 'name', value: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const getValidPlayers = () => players.filter(p => p.name.trim())

  // --- Role Assignment Auto-Assign ---
  const autoAssignRoles = () => {
    const validPlayers = getValidPlayers()
    const roles = PLAYER_ROLES.slice(0, validPlayers.length)
    setRoleAssignments(validPlayers.map((p, i) => ({
      playerId: p.id,
      role: roles[i],
    })))
  }

  const assignRole = (playerId: string, role: string) => {
    setRoleAssignments(prev => {
      const filtered = prev.filter(ra => ra.playerId !== playerId)
      return [...filtered, { playerId, role }]
    })
  }

  const getPlayerRole = (playerId: string) => roleAssignments.find(ra => ra.playerId === playerId)?.role ?? ''

  const canProceedToStep = (targetStep: Step) => {
    setError('')
    if (targetStep === 2) {
      if (!teamName.trim() || !teamTag.trim()) {
        setError('Team name and tag are required')
        return false
      }
    }
    if (targetStep === 3) {
      if (getValidPlayers().length < TEAM_CREATION_MIN_PLAYERS) {
        setError(`All ${TEAM_CREATION_MIN_PLAYERS} players are required — a team cannot start with fewer`)
        return false
      }
    }
    if (targetStep === 4) {
      if (roleAssignments.filter(ra => ra.role).length < getValidPlayers().length) {
        setError('All players must have a role assigned')
        return false
      }
    }
    return true
  }

  const nextStep = () => {
    if (!canProceedToStep(step + 1 as Step)) return
    setStep(step + 1 as Step)
  }

  const prevStep = () => {
    setError('')
    setStep(step - 1 as Step)
  }

  const handleCreateTeam = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')

    const roster = getValidPlayers().map(p => ({
      name: p.name.trim(),
      role: (roleAssignments.find(ra => ra.playerId === p.id)?.role) ?? '',
    }))

    // Guard the exact conditions the server enforces, so the Bureau gets a
    // precise message instead of a generic failure.
    if (roster.some(r => !r.role)) {
      setError('All players must have a role assigned')
      setIsSubmitting(false)
      return
    }
    const duplicateRole = roster.find(
      (r, i) => roster.findIndex(o => o.role === r.role) !== i,
    )
    if (duplicateRole) {
      setError(`Role ${duplicateRole.role} is assigned to more than one player`)
      setIsSubmitting(false)
      return
    }

    const result = await adminAPI.createTeamWithPlayers({
      teamName: teamName.trim(),
      players: roster,
      idempotencyKey: idempotencyKeyRef.current,
    })

    if (result.success) {
      setGeneratedCodes({
        team: result.teamCode,
        players: result.provisionedPlayers,
        idempotent: result.idempotent,
      })
      setIsSubmitting(false)
      // Stay mounted on the credentials step: these codes are shown exactly
      // once, so the parent must not close the wizard here.
      onSuccess()
      return
    }

    setError(result.error ?? 'Failed to create team')
    setIsSubmitting(false)
  }

  const finishWizard = () => {
    resetWizard()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nexus-bg/90 backdrop-blur-sm">
      <div className="bg-nexus-surface border border-nexus-border rounded-2xl shadow-panel w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-nexus-borderSubtle">
          <h2 className="heading-3">Create Team</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors"
            aria-label="Close"
          >
            <BureauIcons.Close className="bureau-icon w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-nexus-borderSubtle flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn(
                'w-8 h-8 flex items-center justify-center text-sm font-medium transition-all border',
                step === s
                  ? 'border-nexus-danger bg-nexus-dangerBg/20 text-nexus-danger'
                  : 'border-nexus-borderSubtle bg-nexus-borderSubtle/10 text-nexus-textMuted',
              )}>
                {s}
              </div>
              {s < 4 && <span className="w-8 h-px bg-nexus-borderSubtle" />}
            </div>
          ))}
          <div className="ml-auto text-xs text-nexus-textSubtle">
            Step {step} of 4
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 flex items-start gap-2 animate-slide-down">
               <BureauIcons.Close className="bureau-icon w-5 h-5 text-nexus-danger mt-0.5 flex-shrink-0" />
              <p className="text-sm text-nexus-danger">{error}</p>
            </div>
          )}

          {/* Step 1: Team Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="teamName" className="label">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Quantum Coders"
                  className="input"
                  maxLength={50}
                />
              </div>
              <div>
                <label htmlFor="teamTag" className="label">Team Tag</label>
                <input
                  id="teamTag"
                  type="text"
                  value={teamTag}
                  onChange={e => setTeamTag(e.target.value.toUpperCase())}
                  placeholder="e.g. QCODE"
                  className="input font-mono uppercase"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="label">Team Color</label>
                <div className="flex gap-2 flex-wrap">
                  {TEAM_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setTeamColor(c)}
                      className={cn(
                        'w-10 h-10 rounded-xl border-2 transition-all',
                        teamColor.value === c.value
                          ? 'border-white scale-110'
                          : 'border-nexus-border hover:border-nexus-textMuted',
                      )}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.name}
                      aria-selected={teamColor.value === c.value}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Players */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-nexus-text">Players ({getValidPlayers().length}/{TEAM_CREATION_MAX_PLAYERS})</h3>
                <button
                  onClick={addPlayer}
                  disabled={players.length >= TEAM_CREATION_MAX_PLAYERS}
                  className="btn-secondary text-xs py-1.5"
                >
                  <BureauIcons.Add className="bureau-icon w-4 h-4" />
                  Add Player
                </button>
              </div>
              <div className="space-y-3">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="label text-xs">#{idx + 1} Name</label>
                      <input
                        type="text"
                        value={p.name}
                        onChange={e => updatePlayer(p.id, 'name', e.target.value)}
                        placeholder="Player name"
                        className="input"
                      />
                    </div>
                    {players.length > TEAM_CREATION_MIN_PLAYERS && (
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="pb-2 text-nexus-danger hover:text-nexus-danger/80 transition-colors"
                        aria-label="Remove player"
                      >
                        <BureauIcons.Trash className="bureau-icon w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-nexus-textSubtle mt-2">
                Each player gets their own device automatically when they log in on their
                phone. Nothing to enter here.
              </p>
            </div>
          )}

          {/* Step 3: Role Assignment */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-nexus-text">Assign Roles</h3>
                <button
                  onClick={autoAssignRoles}
                  disabled={getValidPlayers().length === 0}
                  className="btn-secondary text-xs py-1.5"
                >
                  Auto-assign
                </button>
              </div>
              <div className="space-y-3">
                {getValidPlayers().map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-nexus-bg rounded-xl border border-nexus-border">
                    <div className="flex-1">
                      <span className="font-medium text-nexus-text">{p.name}</span>
                    </div>
                    <div className="w-48">
                      <select
                        value={getPlayerRole(p.id)}
                        onChange={e => assignRole(p.id, e.target.value)}
                        className="input"
                      >
                        <option value="">Select role</option>
                        {PLAYER_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review & Generate Codes */}
          {step === 4 && !generatedCodes && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-nexus-text">Review</h3>
                <p className="text-xs text-nexus-textSubtle mt-1">
                  Creating the team saves it, registers all {getValidPlayers().length} players and
                  generates one login code per player in a single atomic operation. If any part
                  fails, nothing is saved.
                </p>
              </div>

              <div className="p-4 bg-nexus-bg rounded-xl border border-nexus-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-nexus-textSubtle">Team</span>
                  <span className="font-medium text-nexus-text">{teamName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-nexus-textSubtle">Tag</span>
                  <span className="font-mono text-nexus-text">{teamTag}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-nexus-text mb-2">
                  Roster &amp; roles
                </h3>
                <div className="space-y-2">
                  {getValidPlayers().map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-nexus-bg rounded-xl border border-nexus-border"
                    >
                      <span className="font-medium text-nexus-text">{p.name}</span>
                      <span className="text-xs font-mono uppercase text-nexus-accent">
                        {getPlayerRole(p.id) || 'NO ROLE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: generated Logic Codes — the Bureau cannot leave without seeing these */}
          {step === 4 && generatedCodes && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-nexus-accentBg">
                <BureauIcons.Check className="bureau-icon w-8 h-8 text-nexus-accent" />
              </div>
              <div>
                <h3 className="heading-3">TEAM READY</h3>
                <p className="text-nexus-textMuted mt-2 max-w-sm mx-auto">
                  Give each player their Logic Code. They will use this code to enter the
                  game. Copy them now — a code is only shown once.
                </p>
              </div>

              <PlayerCredentialsPanel
                teamCode={generatedCodes.team}
                teamName={teamName}
                credentials={generatedCodes.players.map((p, i) => ({
                  playerId: `${generatedCodes.team}-${i}`,
                  displayName: p.name,
                  role: p.role,
                  loginCode: p.loginCode,
                }))}
                notice={
                  generatedCodes.idempotent
                    ? 'This submission had already gone through, so the original team was used and its codes were rotated. No duplicate team was created.'
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-nexus-borderSubtle bg-nexus-bg/30 rounded-b-2xl">
          {step === 1 || generatedCodes ? (
            <div />
          ) : (
            <button onClick={prevStep} className="btn-secondary" disabled={isSubmitting}>
              BACK
            </button>
          )}
          <div className="flex gap-2">
            {generatedCodes ? (
              <button onClick={finishWizard} className="btn-primary">
                RETURN TO TEAM MANAGEMENT
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  CANCEL
                </button>
                {step < 4 && (
                  <button onClick={nextStep} className="btn-primary" disabled={isSubmitting}>
                    NEXT
                  </button>
                )}
                {step === 4 && (
                  <button
                    onClick={handleCreateTeam}
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'CREATING…' : 'CREATE TEAM'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
