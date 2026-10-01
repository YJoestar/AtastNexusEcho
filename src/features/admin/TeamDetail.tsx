/**
 * NEXUS — Team Detail
 *
 * Full team management interface with all admin actions:
 * start, pause, resume, complete, disqualify, reset,
 * assign roles, grant hints, notify, and unlock nodes.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { ROUTES } from '@/app/config'
import { cn, formatNumber, getAvatarInitials } from '@/lib/utils'
import { formatDateTime, formatDuration } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import { ConfirmationDialog } from '@/components/admin/ConfirmationDialog'
import { PlayerCredentialsPanel } from '@/components/admin/PlayerCredentialsPanel'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'
import { adminAPI } from '@/lib/admin'
import type { TeamDetailFull, PlayerWithAdminView, TeamWithStats, PlayerCredential } from '@/lib/admin'
import { PLAYER_ROLES } from '@/app/config'

export function AdminTeamDetail() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const [showNotifyDialog, setShowNotifyDialog] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notifyLoading, setNotifyLoading] = useState(false)

  // Player access codes exist in plaintext only while the Bureau is looking at
  // them. Re-issuing rotates the stored hash, so an earlier code stops working.
  const [issuedCodes, setIssuedCodes] = useState<{
    teamCode: string
    credentials: PlayerCredential[]
  } | null>(null)
  const [reissueScope, setReissueScope] = useState<{
    title: string
    message: string
    playerIds?: string[]
  } | null>(null)
  const [isReissuing, setIsReissuing] = useState(false)
  const [credentialError, setCredentialError] = useState<string | null>(null)

  interface PendingAction {
    title: string
    message: string
    variant: 'danger' | 'warning' | 'primary'
    execute: () => Promise<unknown>
  }
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const {
    teamDetail,
    isLoading,
    error,
    fetchTeamDetail,
    fetchTeams,
  } = useBureau()

  useEffect(() => {
    if (teamId) {
      void fetchTeamDetail(teamId)
    }
  }, [teamId, fetchTeamDetail])

  if (!teamId) {
    return <div className="py-12 text-center text-nexus-textMuted">No team ID specified</div>
  }

  if (!teamDetail && isLoading) {
    return (
      <div className="py-12 text-center text-nexus-textSubtle">
        <BureauIcons.Spinner className="bureau-icon w-8 h-8 animate-spin mx-auto mb-4 text-nexus-info" />
        <p>Loading team data…</p>
      </div>
    )
  }

  if (error && !teamDetail) {
    return (
      <div className="py-12 text-center">
        <BureauIcons.AlertTriangle className="bureau-icon w-8 h-8 mx-auto mb-4 text-nexus-danger" />
        <p className="text-nexus-danger">{error}</p>
        <button onClick={() => void fetchTeamDetail(teamId)} className="btn-primary mt-3">
          Retry
        </button>
      </div>
    )
  }
  if (!teamDetail) {
    return <div className="py-12 text-center text-nexus-textMuted">Team not found</div>
  }

  const { team, players, progress, nodeProgress } = teamDetail

  const executePendingAction = async () => {
    if (!pendingAction) return
    setIsExecuting(true)
    try {
      await pendingAction.execute()
      setPendingAction(null)
      void fetchTeamDetail(team.id)
      void fetchTeams()
    } catch (err: unknown) {
      setPendingAction({
        ...pendingAction,
        message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'danger',
      })
    } finally {
      setIsExecuting(false)
    }
  }

  /** Rotate login codes and show the new plaintext values exactly once. */
  const runReissue = async (playerIds?: string[]) => {
    setIsReissuing(true)
    setCredentialError(null)
    try {
      const result = await adminAPI.reissueCredentials(team.id, playerIds)
      if (result.credentials.length === 0) {
        setCredentialError('No login codes were issued.')
        return
      }
      setIssuedCodes({
        teamCode: result.teamCode ?? team.code,
        credentials: result.credentials,
      })
      void fetchTeamDetail(team.id)
    } catch (err: unknown) {
      setCredentialError(
        err instanceof Error ? err.message : 'Failed to re-issue login codes',
      )
    } finally {
      setIsReissuing(false)
      setReissueScope(null)
    }
  }

  const getStatusConfig = (status: TeamWithStats['status']) => {
    const configs: Record<string, { icon: JSX.Element; canStart: boolean; canPause: boolean; canResume: boolean; canComplete: boolean }> = {
      REGISTERED: { icon: <BureauIcons.Shield className="bureau-icon w-5 h-5 text-nexus-textSubtle" />, canStart: true, canPause: false, canResume: false, canComplete: false },
      FORMING: { icon: <BureauIcons.Users className="bureau-icon w-5 h-5 text-nexus-accent" />, canStart: true, canPause: false, canResume: false, canComplete: false },
      READY: { icon: <BureauIcons.Check className="bureau-icon w-5 h-5 text-nexus-accent" />, canStart: true, canPause: false, canResume: false, canComplete: false },
      WAITING: { icon: <BureauIcons.Clock className="bureau-icon w-5 h-5 text-nexus-warning" />, canStart: true, canPause: false, canResume: false, canComplete: false },
      ACTIVE: { icon: <BureauIcons.Play className="bureau-icon w-5 h-5 text-nexus-accent" />, canStart: false, canPause: true, canResume: false, canComplete: true },
      PAUSED: { icon: <BureauIcons.Pause className="bureau-icon w-5 h-5 text-nexus-accent" />, canStart: false, canPause: false, canResume: true, canComplete: true },
      COMPLETED: { icon: <BureauIcons.Target className="bureau-icon w-5 h-5 text-nexus-info" />, canStart: false, canPause: false, canResume: false, canComplete: false },
      DISQUALIFIED: { icon: <BureauIcons.AlertTriangle className="bureau-icon w-5 h-5 text-nexus-danger" />, canStart: false, canPause: false, canResume: false, canComplete: false },
      ABANDONED: { icon: <BureauIcons.AlertTriangle className="bureau-icon w-5 h-5 text-nexus-textSubtle" />, canStart: false, canPause: false, canResume: false, canComplete: false },
    }
    return configs[status] ?? configs.REGISTERED
  }

  const config = getStatusConfig(team.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(ROUTES.ADMIN_TEAMS)}
            className="text-nexus-textSubtle hover:text-nexus-text"
          >
            ← Teams
          </button>
          <div className="flex items-center gap-3">
            {config.icon}
            <h1 className="heading-2">{team.name}</h1>
            <TeamStatusBadge status={team.status} showDot />
          </div>
        </div>
        <TeamCodeBadge code={team.code} onCopy={() => navigator.clipboard.writeText(team.code)} />
      </div>

      {/* Team Identity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel">
          <p className="text-xs text-nexus-textSubtle uppercase mb-2">Score</p>
          <p className="font-display font-bold text-3xl text-nexus-warning">{formatNumber(team.score)}</p>
          <p className="text-xs text-nexus-textSubtle mt-1">Current node: {team.currentNodeCode ?? 'None'}</p>
        </div>
        <div className="panel">
          <p className="text-xs text-nexus-textSubtle uppercase mb-2">Progress</p>
          <p className="font-display font-bold text-3xl text-nexus-accent">{team.solvedCount ?? 0}</p>
          <p className="text-xs text-nexus-textSubtle mt-1">Nodes solved</p>
        </div>
        <div className="panel">
          <p className="text-xs text-nexus-textSubtle uppercase mb-2">Hints Used</p>
          <p className="font-display font-bold text-3xl text-nexus-info">{team.hintsUsed ?? 0}</p>
          <p className="text-xs text-nexus-textSubtle mt-1">Total across nodes</p>
        </div>
      </div>

      {/* Team Status Actions */}
      <div className="panel">
        <h2 className="heading-3 mb-4">Team Lifecycle</h2>
        <div className="flex flex-wrap gap-3">
          {config.canStart && (
            <button
              onClick={() => setPendingAction({
                title: 'Start Team',
                message: `Start "${team.name}"? The team will enter the active game with the current timer.`,
                variant: 'primary',
                execute: () => adminAPI.startTeam(team.id),
              })}
              className="btn-primary"
            >
              <BureauIcons.Play className="bureau-icon w-4 h-4" />
              Start Team
            </button>
          )}
          {config.canPause && (
            <button
              onClick={() => setPendingAction({
                title: 'Pause Team',
                message: `Pause "${team.name}"? Their game timer will stop.`,
                variant: 'warning',
                execute: () => adminAPI.pauseTeam(team.id, 'Paused from detail page'),
              })}
              className="btn-warning"
            >
              <BureauIcons.Pause className="bureau-icon w-4 h-4" />
              Pause Team
            </button>
          )}
          {config.canResume && (
            <button
              onClick={() => setPendingAction({
                title: 'Resume Team',
                message: `Resume "${team.name}"? Their game timer will continue.`,
                variant: 'primary',
                execute: () => adminAPI.resumeTeam(team.id),
              })}
              className="btn-primary"
            >
              <BureauIcons.Play className="bureau-icon w-4 h-4" />
              Resume Team
            </button>
          )}
          {config.canComplete && (
            <button
              onClick={() => setPendingAction({
                title: 'Mark Complete',
                message: `Mark "${team.name}" as completed? This cannot be undone.`,
                variant: 'danger',
                execute: () => adminAPI.completeTeam(team.id),
              })}
              className="btn-secondary"
            >
              <BureauIcons.Check className="bureau-icon w-4 h-4" />
              Mark Complete
            </button>
          )}
          {team.status === 'ACTIVE' && (
            <button
              onClick={() => setShowNotifyDialog(true)}
              className="btn-secondary"
            >
              <BureauIcons.Send className="bureau-icon w-4 h-4" />
              Send Notification
            </button>
          )}
          <button
            onClick={() => setPendingAction({
              title: 'Disqualify Team',
              message: `Disqualify "${team.name}"? They will be removed from active play.`,
              variant: 'danger',
              execute: () => adminAPI.disqualifyTeam(team.id, 'Disqualified from detail page'),
            })}
            className="btn-secondary"
          >
            <BureauIcons.AlertTriangle className="bureau-icon w-4 h-4" />
            Disqualify
          </button>
          {(team.status === 'COMPLETED' || team.status === 'DISQUALIFIED') && (
            <button
              onClick={() => setPendingAction({
                title: 'Reset Team',
                message: `Reset "${team.name}" to registered status? All progress will be cleared.`,
                variant: 'warning',
                execute: () => adminAPI.resetTeam(team.id, 'Reset from detail page'),
              })}
              className="btn-secondary"
            >
              <BureauIcons.RotateCcw className="bureau-icon w-4 h-4" />
              Reset Team
            </button>
          )}
        </div>
      </div>

      {/* Players List */}
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-3">Players ({players.length})</h2>
          <Link
            to={ROUTES.ADMIN_TEAMS}
            className="text-sm text-nexus-accent hover:underline"
          >
            Manage →
          </Link>
        </div>
        <div className="space-y-2">
          {players.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              onReassignRole={(newRole) =>
                setPendingAction({
                  title: 'Reassign Role',
                  message: `Change ${player.displayName}'s role to ${newRole}?`,
                  variant: 'primary',
                  execute: () => adminAPI.reassignRole(player.id, newRole, 'Role reassigned from detail page'),
                })
              }
              onReissueCode={() =>
                setReissueScope({
                  title: 'Re-issue login code',
                  message: `Re-issue ${player.displayName}'s login code? Any code already distributed for this player stops working immediately.`,
                  playerIds: [player.id],
                })
              }
            />
          ))}
        </div>
      </div>

      {/* Player Access Codes — the recovery path for a lost or uncollected code */}
      <div className="panel">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="heading-3">Player Logic Codes</h2>
            <p className="text-xs text-nexus-textSubtle mt-1">
              Codes are stored as hashes and are never shown again, so they cannot be recovered
              after the fact. Re-issuing rotates them, which immediately invalidates any code
              already handed out for these players. Refreshing this page never issues anything.
            </p>
          </div>
          <button
            onClick={() => setReissueScope({
              title: 'Re-issue all login codes',
              message: `Re-issue login codes for every player on "${team.name}"? Any code already distributed for these players stops working immediately.`,
            })}
            disabled={isReissuing || players.length === 0}
            className="btn-secondary"
          >
            {isReissuing ? <BureauIcons.Spinner className="bureau-icon w-4 h-4 animate-spin" /> : <BureauIcons.Key className="bureau-icon w-4 h-4" />}
            {isReissuing ? 'ISSUING…' : 'RE-ISSUE CODES'}
          </button>
        </div>

        {credentialError && (
          <p className="mb-3 p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 text-sm text-nexus-danger">
            {credentialError}
          </p>
        )}

        {issuedCodes ? (
          <div className="space-y-3">
            <PlayerCredentialsPanel
              teamCode={issuedCodes.teamCode}
              teamName={team.name}
              credentials={issuedCodes.credentials}
              notice="These codes were just issued. Read them out now — or reopen them any time with Show codes on the Teams list, up until each player logs in."
            />
            <button
              onClick={() => setIssuedCodes(null)}
              className="btn-secondary text-xs py-1.5"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-nexus-textMuted">
              No codes on screen. Re-issue them to print, copy or download a fresh set.
            </p>

            {/* Credential state comes from the persisted player rows, so it is
                correct after any refresh and never invents a new code. */}
            <div className="mt-4 space-y-2">
              {players.map((p, i) => {
                const state = credentialState(p)
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 bg-nexus-bg rounded-xl border border-nexus-border"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-nexus-textSubtle">
                        Player {i + 1}
                      </span>
                      <span className="font-medium text-nexus-text block truncate">
                        {p.displayName}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-nexus-textSubtle">
                        {p.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'text-xs px-2 py-1 rounded-lg',
                          state.tone === 'live' && 'bg-nexus-accentBg text-nexus-accent',
                          state.tone === 'used' && 'bg-nexus-surfaceElevated text-nexus-textMuted',
                          state.tone === 'none' && 'bg-nexus-dangerBg text-nexus-danger',
                        )}
                      >
                        {state.label}
                      </span>
                      <button
                        onClick={() => setReissueScope({
                          title: 'Re-issue Logic Code',
                          message: `Re-issue ${p.displayName}'s Logic Code? Any code already distributed for this player stops working immediately.`,
                          playerIds: [p.id],
                        })}
                        disabled={isReissuing}
                        className="btn-secondary text-xs py-1.5"
                        aria-label={`Re-issue Logic Code for ${p.displayName}`}
                      >
                        {isReissuing ? <BureauIcons.Spinner className="bureau-icon w-4 h-4 animate-spin" /> : <BureauIcons.Key className="bureau-icon w-4 h-4" />}
                        RE-ISSUE
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Node Progress */}
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-3">Node Progress</h2>
        </div>
        <div className="space-y-2">
          {nodeProgress.length === 0 ? (
            <p className="text-nexus-textSubtle text-sm">No node attempts recorded</p>
          ) : (
            nodeProgress.map(np => (
              <NodeProgressRow key={np.nodeId} nodeProgress={np} />
            ))
          )}
        </div>
      </div>

      {/* Game Progress Details */}
      {progress && (
        <div className="panel">
          <h2 className="heading-3 mb-4">Game Progress</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ProgressDetail label="Time Elapsed" value={formatDuration((progress.timeElapsedMinutes ?? 0) * 60000)} icon={<BureauIcons.Clock />} />
            <ProgressDetail label="Time Remaining" value={formatDuration((progress.timeRemainingMinutes ?? 0) * 60000)} icon={<BureauIcons.Clock />} />
            <ProgressDetail label="Hints Used" value={String(progress.hintsUsed ?? 0)} icon={<BureauIcons.Lightbulb />} />
            <ProgressDetail label="Score" value={formatNumber(progress.score ?? 0)} icon={<BureauIcons.Trophy />} />
          </div>
          {progress.evidenceOwned.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-nexus-textSubtle mb-2">Evidence Owned ({progress.evidenceOwned.length})</p>
              <div className="flex flex-wrap gap-2">
                {progress.evidenceOwned.map(e => (
                  <span key={e} className="text-xs font-mono px-2 py-1 bg-nexus-bg rounded">{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {pendingAction && (
        <ConfirmationDialog
          isOpen={!!pendingAction}
          onClose={() => setPendingAction(null)}
          title={pendingAction.title}
          confirmAction={{
            label: 'CONFIRM',
            variant: pendingAction.variant,
            loading: isExecuting,
          }}
          onConfirm={executePendingAction}
          danger={pendingAction.variant === 'danger'}
        >
          <p>{pendingAction.message}</p>
          <p className="mt-2 text-xs">Team: {team.name} ({team.code})</p>
        </ConfirmationDialog>
      )}

      {/* Re-issue confirmation */}
      {reissueScope && (
        <ConfirmationDialog
          isOpen
          onClose={() => setReissueScope(null)}
          title={reissueScope.title}
          confirmAction={{ label: 'RE-ISSUE', variant: 'warning', loading: isReissuing }}
          onConfirm={() => runReissue(reissueScope.playerIds)}
        >
          <p>{reissueScope.message}</p>
          <p className="mt-2 text-xs">Team: {team.name} ({team.code})</p>
        </ConfirmationDialog>
      )}

      {/* Notification Dialog */}
      {showNotifyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nexus-bg/80 backdrop-blur-sm">
          <div className="bg-nexus-surface border border-nexus-border rounded-2xl shadow-panel w-full max-w-md">
            <div className="p-6">
              <h3 className="heading-3 mb-4">Send Notification</h3>
              <textarea
                value={notificationMessage}
                onChange={e => setNotificationMessage(e.target.value)}
                placeholder="Enter notification message…"
                className="input min-h-[100px]"
                maxLength={500}
              />
              <div className="mt-2 text-xs text-nexus-textSubtle">
                {notificationMessage.length}/500 characters
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-nexus-borderSubtle bg-nexus-bg/30 rounded-b-2xl">
              <button
                onClick={() => setShowNotifyDialog(false)}
                className="btn-secondary"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  setNotifyLoading(true)
                  try {
                    await adminAPI.sendNotification({
                      target: 'single',
                      teamIds: [team.id],
                      title: 'Bureau Notice',
                      message: notificationMessage,
                      reason: 'Manual notification',
                    })
                    setShowNotifyDialog(false)
                    setNotificationMessage('')
                  } catch {
                    /* error handled by API */
                  } finally {
                    setNotifyLoading(false)
                  }
                }}
                disabled={notifyLoading || !notificationMessage.trim()}
                className="btn-primary"
              >
                {notifyLoading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * A player's credential state, read from the persisted row only.
 *
 * player_login_flow clears login_code_hash on a successful login, so a NULL
 * hash plus a bound device means "already used", a NULL hash with no device
 * means "no way in yet", and an auth user with no bound device means "code
 * issued, not yet used". Nothing here can mint a credential.
 */
function credentialState(player: PlayerWithAdminView): { label: string; tone: 'live' | 'used' | 'none' } {
  if (player.deviceBound) return { label: 'CODE USED', tone: 'used' }
  if (player.hasAuthUser) return { label: 'CODE ISSUED', tone: 'live' }
  return { label: 'NO CODE', tone: 'none' }
}

function PlayerRow({
  player,
  onReassignRole,
  onReissueCode,
}: {
  player: PlayerWithAdminView
  onReassignRole: (newRole: string) => void
  onReissueCode: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-nexus-bg rounded-xl border border-nexus-border">
      <div className="flex items-center gap-3">
        <div className="bureau-icon w-8 h-8 rounded-lg bg-nexus-surfaceElevated flex items-center justify-center">
          <span className="font-display font-bold text-sm">
            {getAvatarInitials(player.displayName)}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-nexus-text">{player.displayName}</span>
            <TeamStatusBadge status={player.status} showDot={false} />
            {player.role && (
              <span className="text-xs font-mono text-nexus-textSubtle bg-nexus-borderSubtle/30 px-1.5 py-0.5 rounded">
                {player.role}
              </span>
            )}
          </div>
          <div className="text-xs text-nexus-textSubtle space-y-0.5">
            <p>Has auth user: {player.hasAuthUser ? 'Yes' : 'No'} • Device bound: {player.deviceBound ? 'Yes' : 'No'}</p>
            {player.lastSeenAt && <p>Last seen: {formatDateTime(player.lastSeenAt)}</p>}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReissueCode}
          className="btn-icon btn-secondary"
          title={`Re-issue login code for ${player.displayName}`}
          aria-label={`Re-issue login code for ${player.displayName}`}
        >
          <BureauIcons.Key className="bureau-icon w-4 h-4" />
        </button>
        <RoleAssignmentSelect
          currentRole={player.role}
          onChange={onReassignRole}
          disabled={!player.role}
        />
      </div>
    </div>
  )
}

function RoleAssignmentSelect({
  currentRole,
  onChange,
  disabled,
}: {
  currentRole: string
  onChange: (role: string) => void
  disabled: boolean
}) {
  return (
    <select
      value={currentRole}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="text-xs bg-nexus-surfaceElevated border border-nexus-border rounded-lg px-2 py-1 text-nexus-text hover:border-nexus-borderSubtle focus:outline-none"
      title="Reassign role"
    >
      <option value="" disabled>Role</option>
      {PLAYER_ROLES.map(role => (
        <option key={role} value={role}>{role}</option>
      ))}
    </select>
  )
}

function NodeProgressRow({ nodeProgress }: { nodeProgress: NonNullable<TeamDetailFull['nodeProgress']>[number] }) {
  const statusConfig: Record<string, { color: string; bg: string }> = {
    SOLVED: { color: 'text-nexus-accent', bg: 'bg-nexus-accentBg/20' },
    IN_PROGRESS: { color: 'text-nexus-info', bg: 'bg-nexus-infoBg/20' },
    FAILED: { color: 'text-nexus-danger', bg: 'bg-nexus-dangerBg/20' },
    SKIPPED: { color: 'text-nexus-textMuted', bg: 'bg-nexus-borderSubtle/20' },
  }

  const cfg = statusConfig[nodeProgress.status] ?? statusConfig.IN_PROGRESS

  return (
    <div className="flex items-center justify-between p-3 bg-nexus-bg rounded-xl border border-nexus-border">
      <div className="flex items-center gap-3">
        <div className="font-mono text-xs text-nexus-textSubtle">{nodeProgress.nodeCode}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-nexus-text">{nodeProgress.nodeTitle}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded', cfg.bg, cfg.color)}>
              {nodeProgress.status}
            </span>
          </div>
          <div className="text-xs text-nexus-textSubtle mt-0.5">
            {nodeProgress.nodeType} • Stage {nodeProgress.stage} • Attempts: {nodeProgress.attempts}
          </div>
        </div>
      </div>
      <div className="text-right text-sm">
        <span className="font-mono font-medium text-nexus-text">{formatNumber(nodeProgress.pointsAwarded ?? 0)}</span>
        {nodeProgress.hintsUsed > 0 && (
          <span className="text-xs text-nexus-info block mt-1">+{nodeProgress.hintsUsed} hints</span>
        )}
      </div>
    </div>
  )
}

function ProgressDetail({ label, value, icon }: { label: string; value: string; icon: JSX.Element }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-nexus-bg rounded-xl border border-nexus-border">
      <div className="text-nexus-textSubtle">{icon}</div>
      <div>
        <p className="text-xs text-nexus-textSubtle">{label}</p>
        <p className="font-medium text-nexus-text">{value}</p>
      </div>
    </div>
  )
}

function TeamCodeBadge({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-nexus-bg rounded-xl border border-nexus-border font-mono text-lg font-bold">
      <span className="text-nexus-text">{code}</span>
      <button
        onClick={onCopy}
        className="p-0.5 rounded text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors"
        title="Copy team code"
      >
        <BureauIcons.Copy className="bureau-icon w-4 h-4" />
      </button>
    </div>
  )
}





