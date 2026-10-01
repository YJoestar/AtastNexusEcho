/**
 * NEXUS — Admin Dashboard
 * Bureau overview with live data, team status model, and activity feed
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { TerminalFrame } from '@/components/bureau'
import { ROUTES } from '@/app/config'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import { formatDateTime, formatTimeRemaining } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import { TeamCreationWizard } from '@/components/admin/TeamCreationWizard'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'
import { ConnectionStatus } from '@/components/admin/ConnectionStatus'
import { CustomNotificationModal } from '@/components/admin/CustomNotificationModal'
import type { TeamStatus } from '@/types'

const TEAM_STATUS_GROUPS: Record<string, TeamStatus[]> = {
  'Pending Start': ['REGISTERED', 'FORMING', 'READY', 'WAITING'],
  'In Progress': ['ACTIVE', 'PAUSED'],
  'Finished': ['COMPLETED', 'DISQUALIFIED', 'ABANDONED', 'RESET'],
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const {
    teams,
    gameState,
    gameEvents,
    isLoading,
    fetchTeams,
    fetchGameState,
    fetchGameEvents,
    refreshAll,
  } = useBureau()

  useEffect(() => {
    void fetchTeams()
    void fetchGameState()
    void fetchGameEvents(50)
  }, [fetchTeams, fetchGameState, fetchGameEvents])

  const stats = useMemo(() => {
    const totalTeams = teams.length
    const activeTeams = teams.filter(t => t.status === 'ACTIVE').length
    const pausedTeams = teams.filter(t => t.status === 'PAUSED').length
    const completedTeams = teams.filter(t => ['COMPLETED', 'DISQUALIFIED', 'ABANDONED'].includes(t.status)).length
    const waitingTeams = teams.filter(t => ['REGISTERED', 'FORMING', 'READY', 'WAITING'].includes(t.status)).length
    const totalPlayers = teams.reduce((sum, t) => sum + (t.playerCount ?? 0), 0)
    const avgScore = totalTeams > 0
      ? Math.round(teams.reduce((sum, t) => sum + (t.score ?? 0), 0) / totalTeams)
      : 0
    const completionRate = totalTeams > 0 ? completedTeams / totalTeams : 0

    return {
      totalTeams,
      activeTeams,
      pausedTeams,
      completedTeams,
      waitingTeams,
      totalPlayers,
      avgScore,
      completionRate,
    }
  }, [teams])

  const teamsByGroup = useMemo(() => {
    return Object.entries(TEAM_STATUS_GROUPS).map(([group, statuses]) => ({
      group,
      teams: teams.filter(t => statuses.includes(t.status)),
    }))
  }, [teams])

  const recentActivity = useMemo(() => {
    const adminEvents = gameEvents
      .filter(e => e.type?.startsWith('TEAM_') || e.type === 'ADMIN_ACTION')
      .slice(0, 10)

    return adminEvents.map(e => {
      const team = e.teamId ? teams.find(t => t.id === e.teamId) : null
      return {
        id: e.id ?? '',
        type: e.type,
        teamName: team?.name ?? e.teamId ?? 'System',
        time: e.payload?.reason ?? e.payload?.action ?? '',
        timestamp: e.timestamp,
        team: team?.name ?? 'System',
      }
    })
  }, [gameEvents, teams])

  const handleTeamClick = (teamId: string) => {
    navigate(`${ROUTES.ADMIN_TEAMS}/${teamId}`)
  }

  const getEventIcon = (type: string) => {
    if (type.includes('STARTED')) return <BureauIcons.Play className="bureau-icon w-4 h-4 text-nexus-accent" />
    if (type.includes('PAUSED')) return <BureauIcons.Pause className="bureau-icon w-4 h-4 text-nexus-warning" />
    if (type.includes('COMPLETED')) return <BureauIcons.Target className="bureau-icon w-4 h-4 text-nexus-accent" />
    if (type.includes('DISQUALIFIED')) return <BureauIcons.AlertTriangle className="bureau-icon w-4 h-4 text-nexus-danger" />
    if (type.includes('NODE_UNLOCKED')) return <BureauIcons.Unlock className="bureau-icon w-4 h-4 text-nexus-info" />
    if (type.includes('HINT')) return <BureauIcons.Lightbulb className="bureau-icon w-4 h-4 text-nexus-info" />
    return <BureauIcons.TrendingUp className="bureau-icon w-4 h-4 text-nexus-textSubtle" />
  }

  return (
    <>
      <div className="space-y-6">
        <div className="nexus-case-shell">
          <div className="nexus-ops-header">
            <div>
              <span className="nexus-ops-label">Nexus Investigations Bureau</span>
              <h1 className="heading-2 mt-2">Operations Room</h1>
            </div>
            <div className="case-identifier-block">
              <span className="case-identifier-label">SHIFT</span>
              <span className="case-identifier-value">NIGHT 07</span>
            </div>
          </div>

          <div className="nexus-case-body space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="section-label mb-2">Active case board</p>
                <p className="text-nexus-textMuted">
                  {gameState?.totalTeams ?? teams.length} field teams • {stats.totalPlayers} personnel identified
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ConnectionStatus compact />
                <button
                  onClick={() => void refreshAll()}
                  disabled={isLoading}
                  className="btn-secondary text-xs py-1.5"
                >
                  <BureauIcons.Refresh className={cn('bureau-icon w- h-4', isLoading && 'animate-spin')} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="btn-primary"
                >
                  <BureauIcons.Add className="bureau-icon w-4 h-4" />
                  <span>Create Team</span>
                </button>
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="btn-secondary"
                >
                  <BureauIcons.Bell className="bureau-icon w-4 h-4" />
                  <span>Send Notification</span>
                </button>
              </div>
            </div>

            {gameState && <GameTimer gameState={gameState} />}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard title="Total Teams" value={stats.totalTeams} icon={BureauIcons.Users} variant="system" subtitle={`${stats.activeTeams} active • ${stats.completedTeams} done`} />
              <StatCard title="Active Players" value={stats.totalPlayers} icon={BureauIcons.Users} variant="system" subtitle={`${stats.waitingTeams} teams waiting`} />
              <StatCard title="Avg Score" value={formatNumber(stats.avgScore)} icon={BureauIcons.TrendingUp} variant="system" subtitle="Across all field units" />
              <StatCard title="Completion" value={formatPercent(stats.completionRate)} icon={BureauIcons.Target} variant="system" subtitle={`${stats.completedTeams} of ${stats.totalTeams} teams`} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {teamsByGroup.map(({ group, teams: groupTeams }) => (
                <TeamStatusCard key={group} title={group} teams={groupTeams} onTeamClick={handleTeamClick} />
              ))}
            </div>

            <TerminalFrame
              title="Incident log"
              reference="Recent activity"
              variant="system"
              footer={
                <Link to={ROUTES.ADMIN_AUDIT} className="text-xs text-nexus-accent hover:underline">
                  View audit log →
                </Link>
              }
            >
              <div className="space-y-2">
                {isLoading && recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-nexus-textMuted">Loading activity…</div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-nexus-textMuted">No recent activity</div>
                ) : (
                  recentActivity.map(action => (
                    <div key={action.id} className="flex items-center justify-between border border-nexus-border bg-nexus-bg px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="bureau-icon w-8 h-8 flex items-center justify-center border border-nexus-border bg-nexus-surfaceElevated">
                          {getEventIcon(action.type)}
                        </div>
                        <div>
                          <p className="font-medium text-nexus-text">{action.team}</p>
                          <p className="text-xs text-nexus-textMuted">{action.type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-nexus-textSubtle">{formatDateTime(action.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TerminalFrame>
          </div>
        </div>

        <TeamCreationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            setIsWizardOpen(false)
            void fetchTeams()
          }}
        />
      </div>

      <CustomNotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        teams={teams}
        onNotificationSent={() => {
          void fetchTeams()
          setIsNotificationsOpen(false)
        }}
      />
    </>
  )
}

function GameTimer({ gameState }: { gameState: NonNullable<ReturnType<typeof useBureau>['gameState']> }) {
  const { gameStatus, config } = gameState
  const deadline = gameState.config?.game_deadline as string | null

  const statusColor = useMemo(() => {
    if (gameStatus === 'RUNNING') return 'text-nexus-accent'
    if (gameStatus === 'PAUSED') return 'text-nexus-warning'
    if (gameStatus === 'ENDED') return 'text-nexus-textMuted'
    return 'text-nexus-info'
  }, [gameStatus])

  return (
    <TerminalFrame
      title={gameStatus}
      icon={<BureauIcons.Clock className={cn('bureau-icon w-6 h-6', statusColor)} />}
      variant={gameStatus === 'RUNNING' ? 'monitor' : 'register'}
    >
      <div className="terminal-grid flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-nexus-textSubtle">Game Status</p>
            <p className={cn('font-display font-bold text-xl', statusColor)}>
              {gameStatus}
            </p>
          </div>
        </div>
        <div className="text-right terminal-data">
          <p className="text-xs text-nexus-textSubtle">Shift duration</p>
          <p className="font-mono text-sm text-nexus-text">
            {Number(config?.game_duration_minutes ?? 180)} minutes
          </p>
          {deadline && gameStatus === 'RUNNING' && (
            <p className="text-xs text-nexus-warning mt-1">
              Ends: {formatTimeRemaining(deadline)}
            </p>
          )}
        </div>
      </div>
    </TerminalFrame>
  )
}

function TeamStatusCard({
  title,
  teams,
  onTeamClick,
}: {
  title: string
  teams: ReturnType<typeof useBureau>['teams']
  onTeamClick: (id: string) => void
}) {
  return (
    <TerminalFrame
      title="Field unit status"
      reference={title as string}
      variant="register"
      className="h-full"
    >
      {teams.length === 0 ? (
        <div className="text-center py-6 text-nexus-textSubtle text-sm">
          No teams in this status
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => onTeamClick(team.id)}
              className="w-full flex items-center gap-3 p-2.5 text-left border border-nexus-border bg-nexus-bg hover:bg-nexus-surfaceElevated transition-colors"
            >
              <TeamStatusBadge status={team.status} showDot />
              <span className="font-medium flex-1 truncate">{team.name}</span>
              <span className="text-xs text-nexus-textSubtle font-mono">{team.code}</span>
            </button>
          ))}
        </div>
      )}
    </TerminalFrame>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'system',
  subtitle,
}: {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'system' | 'monitor' | 'register'
  subtitle: string
}) {
  return (
    <TerminalFrame
      title={title}
      icon={<Icon className="bureau-icon w-5 h-5 text-nexus-text" />}
      variant={variant}
    >
      <div className="text-center py-2">
        <p className="font-display font-bold text-3xl text-nexus-text leading-tight">
          {value}
        </p>
        <p className="text-xs text-nexus-textSubtle mt-1.5">{subtitle}</p>
      </div>
    </TerminalFrame>
  )
}




