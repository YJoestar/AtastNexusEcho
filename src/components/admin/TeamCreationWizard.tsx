/**
 * NEXUS — Team Creation Wizard
 *
 * Multi-step flow:
 *  1. Create team (name, color, tag)
 *  2. Register players (name, device ID)
 *  3. Assign roles (captain, hacker, coder, speaker)
 *  4. Generate unique access codes
 *
 * All actions go through adminAPI — server authoritative.
 */

import { useState, useCallback } from 'react'
import { X, Plus, Check, Trash2, Copy } from 'lucide-react'
import { cn, generateId } from '@/lib/utils'
import { adminAPI } from '@/lib/admin'
import { TEAM_COLORS, MAX_PLAYERS_PER_TEAM, PLAYER_ROLES } from '@/app/config'

type Step = 1 | 2 | 3 | 4

interface PlayerInput {
  id: string
  name: string
  deviceId: string
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

export function TeamCreationWizard({ isOpen, onClose, onSuccess: _onSuccess }: TeamCreationWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Team details
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState<typeof TEAM_COLORS[number]>(TEAM_COLORS[0])
  const [teamTag, setTeamTag] = useState('')

  // Step 2 — Players
  const [players, setPlayers] = useState<PlayerInput[]>([
    { id: '1', name: '', deviceId: '' },
    { id: '2', name: '', deviceId: '' },
  ])

  // Step 3 — Role assignments
  const [roleAssignments, setRoleAssignments] = useState<TeamRoleAssignment[]>([])

  // Step 4 — Generated codes
  const [generatedCodes, setGeneratedCodes] = useState<{ team: string; players: string[] } | null>(null)

  const resetWizard = useCallback(() => {
    setStep(1)
    setError('')
    setTeamName('')
    setTeamColor(TEAM_COLORS[0])
    setTeamTag('')
    setPlayers([{ id: '1', name: '', deviceId: '' }, { id: '2', name: '', deviceId: '' }])
    setRoleAssignments([])
    setGeneratedCodes(null)
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
    setPlayers([...players, { id: generateId(), name: '', deviceId: '' }])
  }

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id))
    setRoleAssignments(roleAssignments.filter(ra => ra.playerId !== id))
  }

  const updatePlayer = (id: string, field: 'name' | 'deviceId', value: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const getValidPlayers = () => players.filter(p => p.name.trim() && p.deviceId.trim())

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
      if (getValidPlayers().length < 2) {
        setError('At least 2 players are required')
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
    setIsSubmitting(true)
    setError('')

    const result = await adminAPI.createTeamWithPlayers({
      teamName: teamName,
      players: getValidPlayers().map(p => ({
        name: p.name,
        deviceId: p.deviceId,
        role: (roleAssignments.find(ra => ra.playerId === p.id)?.role) ?? 'OBSERVER',
      })),
    })

    if (result.success) {
      setGeneratedCodes({
        team: result.teamCode,
        players: result.playerCodes,
      })
    } else {
      setError(result.error ?? 'Failed to create team')
      setIsSubmitting(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-nexus-borderSubtle flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                step === s
                  ? 'bg-nexus-danger text-white'
                  : 'bg-nexus-borderSubtle/30 text-nexus-textMuted',
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
              <X className="w-5 h-5 text-nexus-danger mt-0.5 flex-shrink-0" />
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
                  <Plus className="w-4 h-4" />
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
                    <div className="flex-1">
                      <label className="label text-xs">Device ID</label>
                      <input
                        type="text"
                        value={p.deviceId}
                        onChange={e => updatePlayer(p.id, 'deviceId', e.target.value)}
                        placeholder="Device identifier"
                        className="input font-mono text-xs"
                      />
                    </div>
                    {players.length > 2 && (
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="pb-2 text-nexus-danger hover:text-nexus-danger/80 transition-colors"
                        aria-label="Remove player"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-nexus-textSubtle mt-2">
                Device ID is the unique identifier for the player's device at the event.
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
                      <span className="text-xs text-nexus-textSubtle ml-2">{p.deviceId}</span>
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

          {/* Step 4: Generate Codes */}
          {step === 4 && generatedCodes && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-nexus-accentBg">
                <Check className="w-8 h-8 text-nexus-accent" />
              </div>
              <h3 className="heading-3">Team Created Successfully</h3>
              <p className="text-nexus-textMuted">
                Your team and player codes are ready. Distribute them at check-in.
              </p>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-nexus-bg rounded-xl border border-nexus-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-nexus-text">Team Code</span>
                    <button
                      onClick={() => copyCode(generatedCodes.team)}
                      className="p-1 rounded text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surfaceElevated"
                      aria-label="Copy team code"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <code className="text-2xl font-mono font-bold text-nexus-danger mt-1 block">
                    {generatedCodes.team}
                  </code>
                </div>

                <div>
                  <span className="block text-sm font-medium text-nexus-text mb-2">Player Codes</span>
                  <div className="space-y-2">
                {getValidPlayers().map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-nexus-bg rounded-xl border border-nexus-border">
                        <div>
                          <span className="font-medium text-nexus-text">{p.name}</span>
                          <code className="ml-2 text-nexus-accent font-mono">{generatedCodes.players[idx] ?? 'N/A'}</code>
                        </div>
                        <button
                          onClick={() => copyCode(generatedCodes.players[idx] ?? '')}
                          className="p-1 rounded text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surfaceElevated"
                          aria-label={`Copy ${p.name}'s code`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-nexus-borderSubtle bg-nexus-bg/30 rounded-b-2xl">
          {step === 1 ? (
            <div />
          ) : (
            <button onClick={prevStep} className="btn-secondary" disabled={isSubmitting}>
              BACK
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            {step < 4 && (
              <button
                onClick={step === 4 ? handleCreateTeam : nextStep}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {step === 4 ? (isSubmitting ? 'CREATING…' : 'GENERATE CODES') : 'NEXT'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
