/**
 * NEXUS — Teams Management
 *
 * Real-time team list with status management.
 * All mutations flow through adminAPI → Edge Functions.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Search, Play, Pause, Loader2, Copy, Send, Key,
} from 'lucide-react'
import { ROUTES } from '@/app/config'
import { cn, formatNumber, getAvatarInitials } from '@/lib/utils'
import { useBureau } from '@/hooks/useBureau'
import { TeamCreationWizard } from '@/components/admin/TeamCreationWizard'
import { TeamCodesModal } from '@/components/admin/TeamCodesModal'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmationDialog } from '@/components/admin/ConfirmationDialog'
import { adminAPI } from '@/lib/admin'
import type { TeamWithStats } from '@/lib/admin'
import type { TeamStatus } from '@/types'

const STATUS_FILTERS: (TeamStatus | 'ALL')[] = [
  'ALL', 'REGISTERED', 'READY', 'WAITING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'DISQUALIFIED',
]

export function AdminTeams() {
  const navigate = useNavigate()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [codesTeam, setCodesTeam] = useState<TeamWithStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<TeamStatus | 'ALL'>('ALL')
  const [confirmAction, setConfirmAction] = useState<{
    team: TeamWithStats
    action: string
    title: string
    message: string
    variant: 'danger' | 'warning' | 'primary'
    isConfirming: boolean
  } | null>(null)

  const {
    teams,
    isLoading,
    fetchTeams,
  } = useBureau()

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  const filteredTeams = teams.filter(team => {
    const matchesSearch = searchTerm
      ? team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.code.toLowerCase().includes(searchTerm.toLowerCase())
      : true
    const matchesStatus = statusFilter === 'ALL' || team.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // One click, straight to the codes. No confirmation step: reading a code
  // changes nothing, and a player waiting at the desk should not face a dialog.
  const openTeamCodes = (team: TeamWithStats) => {
    setCodesTeam(team)
  }

  const handleStartTeam = (team: TeamWithStats) => {    setConfirmAction({
      team,
      action: 'start',
      title: 'Start Team',
      message: `Start ${team.name}? They will enter the active game with the current timer.`,
      variant: 'primary',
      isConfirming: false,
    })
  }

  const handlePauseTeam = (team: TeamWithStats) => {
    setConfirmAction({
      team,
      action: 'pause',
      title: 'Pause Team',
      message: `Pause ${team.name}? Their game timer will stop.`,
      variant: 'warning',
      isConfirming: false,
    })
  }

  const handleResumeTeam = (team: TeamWithStats) => {
    setConfirmAction({
      team,
      action: 'resume',
      title: 'Resume Team',
      message: `Resume ${team.name}? Their game timer will continue.`,
      variant: 'primary',
      isConfirming: false,
    })
   }

  const executeAction = async () => {
    if (!confirmAction) return

    setConfirmAction({ ...confirmAction, isConfirming: true })

    try {
      switch (confirmAction.action) {
        case 'start':
          await adminAPI.startTeam(confirmAction.team.id)
          break
        case 'pause':
          await adminAPI.pauseTeam(confirmAction.team.id)
          break
        case 'resume':
          await adminAPI.resumeTeam(confirmAction.team.id)
          break
        case 'complete':
          await adminAPI.completeTeam(confirmAction.team.id)
          break
        case 'disqualify':
          await adminAPI.disqualifyTeam(confirmAction.team.id)
          break
      }
      void fetchTeams()
      setConfirmAction(null)
    } catch (err: unknown) {
      setConfirmAction({
        ...confirmAction,
        isConfirming: false,
        message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }

  const sendNotification = (team: TeamWithStats) => {
    const message = prompt('Enter notification message:')
    if (message) {
      void adminAPI.sendNotification({
        target: 'single',
        teamIds: [team.id],
        title: 'Bureau Notice',
        message,
        reason: 'Manual notification from Bureau',
      })
    }
  }

  const copyTeamCode = (code: string) => {
    void navigator.clipboard.writeText(code)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="heading-2">Teams Management</h1>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="btn-primary"
        >
          <Users className="w-4 h-4" />
          <span>Create Team</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or code…"
            className="input pl-10"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-nexus-dangerBg text-nexus-danger'
                  : 'text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated',
              )}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nexus-borderSubtle">
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Team</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Status</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Players</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Solved</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Score</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-nexus-textSubtle">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading teams…
                  </td>
                </tr>
              ) : filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-nexus-textSubtle">
                    {teams.length === 0 ? 'No teams registered' : 'No teams match filter'}
                  </td>
                </tr>
              ) : (
                filteredTeams.map(team => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    onTeamClick={() => navigate(`${ROUTES.ADMIN_TEAMS}/${team.id}`)}
                    onCopyCode={() => copyTeamCode(team.code)}
                    onStart={() => handleStartTeam(team)}
                    onPause={() => handlePauseTeam(team)}
                    onResume={() => handleResumeTeam(team)}
                    onNotify={() => sendNotification(team)}
                    onShowCodes={() => openTeamCodes(team)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Creation Wizard — stays open on the credentials step on success,
          so the freshly issued codes can be read out before it is closed. */}
      <TeamCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          void fetchTeams()
        }}
      />

      {/* Read-only code display — one click per team, never rotates a code. */}
      <TeamCodesModal
        isOpen={codesTeam !== null}
        teamId={codesTeam?.id ?? null}
        teamNameHint={codesTeam?.name ?? null}
        onClose={() => setCodesTeam(null)}
      />

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmationDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          confirmAction={{
            label: confirmAction.action === 'complete' ? 'COMPLETE' : confirmAction.action.toUpperCase(),
            variant: confirmAction.variant,
            loading: confirmAction.isConfirming,
          }}
          onConfirm={executeAction}
        >
          <p>{confirmAction.message}</p>
          <p className="mt-2 text-xs">
            Team: {confirmAction.team.name} ({confirmAction.team.code})
          </p>
        </ConfirmationDialog>
      )}
    </div>
  )
}

function TeamRow({
  team,
  onTeamClick,
  onCopyCode,
  onStart,
  onPause,
  onResume,
  onNotify,
  onShowCodes,
}: {
  team: TeamWithStats
  onTeamClick: () => void
  onCopyCode: () => void
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onNotify: () => void
  onShowCodes: () => void
}) {
  const statusActionMap: Record<string, JSX.Element> = {
    ACTIVE: (
      <button onClick={onPause} className="btn-icon btn-secondary" title="Pause team">
        <Pause className="w-4 h-4" />
      </button>
    ),
    PAUSED: (
      <button onClick={onResume} className="btn-icon btn-primary" title="Resume team">
        <Play className="w-4 h-4" />
      </button>
    ),
    READY: (
      <button onClick={onStart} className="btn-icon btn-primary" title="Start team">
        <Play className="w-4 h-4" />
      </button>
    ),
    WAITING: (
      <button onClick={onStart} className="btn-icon btn-primary" title="Start team">
        <Play className="w-4 h-4" />
      </button>
    ),
    REGISTERED: (
      <button onClick={onStart} className="btn-icon btn-primary" title="Start team">
        <Play className="w-4 h-4" />
      </button>
    ),
    COMPLETED: <span className="text-xs text-nexus-accent">Done</span>,
    DISQUALIFIED: <span className="text-xs text-nexus-danger">Disq.</span>,
    ABANDONED: <span className="text-xs text-nexus-textMuted">Aban.</span>,
  }

  return (
    <tr className="border-b border-nexus-borderSubtle/50 hover:bg-nexus-bg/50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-nexus-surfaceElevated flex items-center justify-center">
            <span className="font-display font-bold text-sm text-nexus-danger">
              {getAvatarInitials(team.name)}
            </span>
          </div>
          <div>
            <button
              onClick={onTeamClick}
              className="font-medium text-nexus-text hover:underline text-left"
            >
              {team.name}
            </button>
            <div className="flex items-center gap-1 text-xs text-nexus-textSubtle font-mono">
              {team.code}
              <button
                onClick={onCopyCode}
                className="p-0.5 rounded hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors"
                title="Copy code"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <TeamStatusBadge status={team.status} />
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-nexus-text font-medium">{team.playerCount ?? 0}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-nexus-text font-medium">{team.solvedCount ?? 0}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="font-mono font-medium text-nexus-text">
          {formatNumber(team.score ?? 0)}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-center gap-1">
          {statusActionMap[team.status] ?? (
            <button onClick={onStart} className="btn-icon btn-primary" title="Start team">
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onShowCodes}
            className="btn-icon btn-secondary"
            title="Show team codes"
            aria-label={`Show login codes for ${team.name}`}
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={onNotify}
            className="btn-icon btn-secondary"
            title="Send notification"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
