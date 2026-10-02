/**
 * NEXUS — Field Personnel & Investigator Dossiers
 *
 * Real-time registry of all field teams and personnel.
 * Rebuilt as a forensic operations register.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BureauIcons, TerminalFrame } from '@/components/bureau'
import { ROUTES } from '@/app/config'
import { cn, formatNumber } from '@/lib/utils'
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

  const openTeamCodes = (team: TeamWithStats) => {
    setCodesTeam(team)
  }

  const handleStartTeam = (team: TeamWithStats) => {
    setConfirmAction({
      team,
      action: 'start',
      title: 'Authorize Field Unit Deployment',
      message: `Deploy ${team.name} into active investigation? Their mission clock will initiate.`,
      variant: 'primary',
      isConfirming: false,
    })
  }

  const handlePauseTeam = (team: TeamWithStats) => {
    setConfirmAction({
      team,
      action: 'pause',
      title: 'Hold Field Unit Operation',
      message: `Signal HOLD to ${team.name}? Their investigation clock will be suspended.`,
      variant: 'warning',
      isConfirming: false,
    })
  }

  const handleResumeTeam = (team: TeamWithStats) => {
    setConfirmAction({
      team,
      action: 'resume',
      title: 'Resume Field Unit Operation',
      message: `Resume investigation channel for ${team.name}?`,
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
        message: `Command Rejected: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }

  const sendNotification = (team: TeamWithStats) => {
    const message = prompt('Enter priority dispatch message for unit:')
    if (message) {
      void adminAPI.sendNotification({
        target: 'single',
        teamIds: [team.id],
        title: 'BUREAU DIRECTIVE',
        message,
        reason: 'Manual directive from Bureau Terminal',
      })
    }
  }

  const copyTeamCode = (code: string) => {
    void navigator.clipboard.writeText(code)
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-nexus-border bg-nexus-surfaceElevated p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-nexus-accent" />
              <span className="text-[0.875rem] tracking-[0.24em] uppercase text-nexus-textSubtle">
                NEXUS ECHO // FIELD PERSONNEL REGISTER
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-nexus-text mt-1">
              FIELD INVESTIGATION UNITS
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="nexus-btn-primary text-xs px-3 py-2"
          >
            <BureauIcons.Users className="bureau-icon w-4 h-4" />
            <span>[ CREATE TEAM / DISPATCH ]</span>
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="mt-3 pt-3 border-t border-nexus-borderSubtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <BureauIcons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-textSubtle" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="SEARCH IDENTIFIER OR CALL SIGN…"
              className="w-full bg-nexus-bg border border-nexus-border text-nexus-text pl-8 pr-3 py-1.5 text-xs placeholder:text-nexus-textSubtle focus:outline-none focus:border-nexus-accent font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-2 py-1 text-[0.875rem] uppercase tracking-[0.14em] border transition-colors',
                  statusFilter === s
                    ? 'border-nexus-accent text-nexus-accent bg-nexus-accentBg/30'
                    : 'border-nexus-borderSubtle text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-bg',
                )}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Personnel Dossier Register */}
      <TerminalFrame
        title="INVESTIGATOR UNITS REGISTER"
        reference={`${filteredTeams.length} OF ${teams.length} LISTED`}
        variant="register"
      >
        {isLoading ? (
          <div className="py-12 text-center text-nexus-textSubtle font-mono text-xs">
            <BureauIcons.Spinner className="bureau-icon w-6 h-6 animate-spin mx-auto mb-2 text-nexus-accent" />
            <span>SYNCHRONIZING FIELD REGISTERS…</span>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="py-12 text-center text-nexus-textSubtle font-mono text-xs">
            <p>ARCHIVE EMPTY // NO MATCHING FIELD RECORDS</p>
            <p className="text-[0.875rem] mt-1 text-nexus-textMuted">ADJUST SEARCH FILTER OR PROVISION A NEW INVESTIGATOR UNIT</p>
          </div>
        ) : (
          <div>
            {filteredTeams.map(team => (
              <TeamDossierRow
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
            ))}
          </div>
        )}
      </TerminalFrame>

      {/* Team Creation Wizard */}
      <TeamCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          void fetchTeams()
        }}
      />

      {/* Team Codes Modal */}
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
            label: confirmAction.action === 'complete' ? 'CONFIRM COMPLETE' : confirmAction.action.toUpperCase(),
            variant: confirmAction.variant,
            loading: confirmAction.isConfirming,
          }}
          onConfirm={executeAction}
        >
          <div className="font-mono text-xs space-y-2">
            <p>{confirmAction.message}</p>
            <p className="text-nexus-textSubtle text-[0.875rem]">
              RECORD: {confirmAction.team.name} [{confirmAction.team.code}]
            </p>
          </div>
        </ConfirmationDialog>
      )}
    </div>
  )
}

function TeamDossierRow({
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
  const statusAction = () => {
    switch (team.status) {
      case 'ACTIVE':
        return (
          <button
            type="button"
            onClick={onPause}
            className="px-1.5 py-0.5 text-[0.8125rem] border border-nexus-warning text-nexus-warning hover:bg-nexus-warningBg/30"
            title="Hold field unit"
          >
            [ HOLD ]
          </button>
        )
      case 'PAUSED':
        return (
          <button
            type="button"
            onClick={onResume}
            className="px-1.5 py-0.5 text-[0.8125rem] border border-nexus-accent text-nexus-accent hover:bg-nexus-accentBg/30"
            title="Resume field unit"
          >
            [ RESUME ]
          </button>
        )
      case 'READY':
      case 'WAITING':
      case 'REGISTERED':
        return (
          <button
            type="button"
            onClick={onStart}
            className="px-1.5 py-0.5 text-[0.8125rem] border border-nexus-accent text-nexus-accent hover:bg-nexus-accentBg/30"
            title="Deploy field unit"
          >
            [ DEPLOY ]
          </button>
        )
      default:
        return null
    }
  }

  return (
    <article className="border-b border-nexus-border px-3 py-3 font-mono transition-colors hover:bg-nexus-surfaceElevated">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-12 border-r border-nexus-border pr-3">
            <span className="block text-[0.75rem] uppercase tracking-[0.16em] text-nexus-textSubtle">UNIT</span>
            <span className="text-xs font-bold text-nexus-accent">{team.code}</span>
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={onTeamClick}
              className="block max-w-full break-words text-left text-sm font-bold text-nexus-text hover:text-nexus-accent hover:underline"
            >
              {team.name}
            </button>
            <span className="mt-0.5 block text-[0.8125rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
              CASE 037 / FIELD PERSONNEL DOSSIER
            </span>
          </div>
        </div>
        <TeamStatusBadge status={team.status} showDot />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 border-y border-nexus-borderSubtle py-2 text-[0.8125rem] sm:grid-cols-4">
        <div>
          <dt className="text-[0.75rem] uppercase tracking-[0.14em] text-nexus-textSubtle">Personnel</dt>
          <dd className="mt-0.5 font-bold text-nexus-text">{team.playerCount ?? 0} ASSIGNED</dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-[0.14em] text-nexus-textSubtle">Current node</dt>
          <dd className="mt-0.5 truncate font-bold text-nexus-text">{team.currentNodeCode ?? 'POSITION UNREPORTED'}</dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-[0.14em] text-nexus-textSubtle">Nodes verified</dt>
          <dd className="mt-0.5 font-bold text-nexus-text">{team.solvedCount ?? 0}</dd>
        </div>
        <div>
          <dt className="text-[0.75rem] uppercase tracking-[0.14em] text-nexus-textSubtle">Case score</dt>
          <dd className="mt-0.5 font-bold text-nexus-text">{formatNumber(team.score ?? 0)}</dd>
        </div>
      </dl>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyCode}
            className="flex min-h-9 items-center gap-1.5 border border-nexus-border px-2 text-[0.8125rem] text-nexus-textSubtle hover:border-nexus-accent hover:text-nexus-accent"
            title="Copy unit identifier"
            aria-label={`Copy identifier for ${team.name}`}
          >
            <BureauIcons.Copy className="bureau-icon h-3 w-3" />
            IDENTIFIER
          </button>
          <button
            type="button"
            onClick={onShowCodes}
            className="min-h-9 border border-nexus-border px-2 text-[0.8125rem] text-nexus-text hover:border-nexus-accent hover:text-nexus-accent"
            aria-label={`Show login codes for ${team.name}`}
          >
            ACCESS CODES
          </button>
          <button
            type="button"
            onClick={onNotify}
            className="min-h-9 border border-nexus-border px-2 text-[0.8125rem] text-nexus-textSubtle hover:border-nexus-text hover:text-nexus-text"
            aria-label={`Transmit directive to ${team.name}`}
          >
            TRANSMIT
          </button>
        </div>
        {statusAction()}
      </div>
    </article>
  )
}
