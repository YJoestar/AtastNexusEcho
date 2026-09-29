/**
 * NEXUS — Admin Dashboard
 * Bureau overview with live data, team status model, and activity feed
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, Target, AlertTriangle, TrendingUp, Clock, Play, Pause,
  Lightbulb, Unlock, RefreshCw, Plus,
} from 'lucide-react'
import { ROUTES } from '@/app/config'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import { formatDateTime, formatTimeRemaining } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import { TeamCreationWizard } from '@/components/admin/TeamCreationWizard'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'
import { ConnectionStatus } from '@/components/admin/ConnectionStatus'
import type { TeamStatus } from '@/types'

const TEAM_STATUS_GROUPS: Record<string, TeamStatus[]> = {
  'Pending Start': ['REGISTERED', 'FORMING', 'READY', 'WAITING'],
  'In Progress': ['ACTIVE', 'PAUSED'],
  'Finished': ['COMPLETED', 'DISQUALIFIED', 'ABANDONED', 'RESET'],
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
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
    if (type.includes('STARTED')) return <Play className="w-4 h-4 text-nexus-accent" />
    if (type.includes('PAUSED')) return <Pause className="w-4 h-4 text-nexus-warning" />
    if (type.includes('COMPLETED')) return <Target className="w-4 h-4 text-nexus-accent" />
    if (type.includes('DISQUALIFIED')) return <AlertTriangle className="w-4 h-4 text-nexus-danger" />
    if (type.includes('NODE_UNLOCKED')) return <Unlock className="w-4 h-4 text-purple-400" />
    if (type.includes('HINT')) return <Lightbulb className="w-4 h-4 text-nexus-info" />
    return <TrendingUp className="w-4 h-4 text-nexus-textSubtle" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Bureau Dashboard</h1>
          <p className="text-nexus-textMuted mt-1">
            {gameState?.totalTeams ?? teams.length} teams • {stats.totalPlayers} players registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus compact />
          <button
            onClick={() => void refreshAll()}
            disabled={isLoading}
            className="btn-secondary text-xs py-1.5"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        </div>
      </div>

      {/* Game Timer */}
      {gameState && (
        <GameTimer gameState={gameState} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Teams"
          value={stats.totalTeams}
          icon={Users}
          color="text-nexus-info"
          subtitle={`${stats.activeTeams} active • ${stats.completedTeams} done`}
        />
        <StatCard
          title="Active Players"
          value={stats.totalPlayers}
          icon={Users}
          color="text-nexus-accent"
          subtitle={`${stats.waitingTeams} teams waiting`}
        />
        <StatCard
          title="Avg Score"
          value={formatNumber(stats.avgScore)}
          icon={TrendingUp}
          color="text-nexus-warning"
          subtitle="Across all teams"
        />
        <StatCard
          title="Completion"
          value={formatPercent(stats.completionRate)}
          icon={Target}
          color="text-nexus-accent"
          subtitle={`${stats.completedTeams} of ${stats.totalTeams} teams`}
        />
      </div>

      {/* Team Status Model */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {teamsByGroup.map(({ group, teams: groupTeams }) => (
          <TeamStatusCard
            key={group}
            title={group}
            teams={groupTeams}
            onTeamClick={handleTeamClick}
          />
        ))}
      </div>

      {/* Live Activity Feed */}
      <div className="panel">
        <div className="flex items-center justify-between p-4 border-b border-nexus-borderSubtle">
          <h2 className="heading-3">Recent Activity</h2>
          <Link
            to={ROUTES.ADMIN_AUDIT}
            className="text-sm text-nexus-accent hover:underline"
          >
            View audit log
          </Link>
        </div>
        <div className="p-4 space-y-2">
          {isLoading && recentActivity.length === 0 ? (
            <div className="text-center py-8 text-nexus-textMuted">Loading activity…</div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8 text-nexus-textMuted">No recent activity</div>
          ) : (
            recentActivity.map(action => (
              <div key={action.id} className="flex items-center justify-between p-3 bg-nexus-bg rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center">
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
      </div>

      {/* Team Creation Wizard */}
      <TeamCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setIsWizardOpen(false)
          void fetchTeams()
        }}
      />
    </div>
  )
}

function GameTimer({ gameState }: { gameState: NonNullable<ReturnType<typeof useBureau>['gameState']> }) {
  const { gameStatus, config } = gameState
  const deadline = gameState.config?.game_deadline as string | null

  return (
    <div className={cn(
      'panel border',
      gameStatus === 'RUNNING' && 'bg-nexus-accentBg/10 border-nexus-accent/30',
      gameStatus === 'PAUSED' && 'bg-nexus-warningBg/10 border-nexus-warning/30',
      gameStatus === 'ENDED' && 'bg-nexus-borderSubtle/10 border-nexus-border',
      gameStatus === 'NOT_STARTED' && 'bg-nexus-infoBg/10 border-nexus-info/30',
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={cn('w-8 h-8',
            gameStatus === 'RUNNING' && 'text-nexus-accent',
            gameStatus === 'PAUSED' && 'text-nexus-warning',
            gameStatus === 'ENDED' && 'text-nexus-textMuted',
            gameStatus === 'NOT_STARTED' && 'text-nexus-info',
          )} />
          <div>
            <p className="text-sm text-nexus-textMuted">Game Status</p>
            <p className={cn('font-display font-bold text-xl',
              gameStatus === 'RUNNING' && 'text-nexus-accent',
              gameStatus === 'PAUSED' && 'text-nexus-warning',
              gameStatus === 'ENDED' && 'text-nexus-textMuted',
              gameStatus === 'NOT_STARTED' && 'text-nexus-info',
            )}>
              {gameStatus}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-nexus-textMuted">Duration</p>
            <p className="font-mono text-nexus-text">
              {Number(config?.game_duration_minutes ?? 180)} minutes
          </p>
          {deadline && gameStatus === 'RUNNING' && (
            <p className="text-sm text-nexus-warning mt-1">
              Ends: {formatTimeRemaining(deadline)}
            </p>
          )}
        </div>
      </div>
    </div>
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
  const statusColors: Record<string, string> = {
    'Pending Start': 'text-nexus-textMuted',
    'In Progress': 'text-nexus-accent',
    'Finished': 'text-nexus-textMuted',
  }

  return (
    <div className="panel">
      <h3 className={cn('heading-4 mb-4', statusColors[title])}>{title}</h3>
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
              className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-nexus-bg transition-colors border border-nexus-border hover:border-nexus-borderSubtle"
            >
              <TeamStatusBadge status={team.status} showDot />
              <span className="font-medium flex-1 truncate">{team.name}</span>
              <span className="text-xs text-nexus-textSubtle font-mono">{team.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
  subtitle: string
}) {
  return (
    <div className="panel panel-hover p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-nexus-textMuted">{title}</p>
        <Icon className={cn('w-6 h-6 opacity-50', color)} />
      </div>
      <p className={cn('font-display font-bold text-2xl', color)}>{value}</p>
      <p className="text-xs text-nexus-textSubtle mt-1">{subtitle}</p>
    </div>
  )
}
