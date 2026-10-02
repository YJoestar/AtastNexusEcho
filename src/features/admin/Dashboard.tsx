/**
 * NEXUS — Admin Dashboard
 * Bureau overview with live data, team status model, and activity feed
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { TerminalFrame } from '@/components/bureau'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/time'
import { useBureau } from '@/hooks/useBureau'
import { TeamCreationWizard } from '@/components/admin/TeamCreationWizard'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'
import { ConnectionStatus } from '@/components/admin/ConnectionStatus'
import { CustomNotificationModal } from '@/components/admin/CustomNotificationModal'

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

  return (
    <>
      <div className="space-y-6">
        <div className="nexus-case-shell">
          <div className="nexus-ops-header">
            <div>
              <span className="nexus-ops-label">NEXUS INTERNAL // FIELD OPERATIONS</span>
              <h1 className="heading-2 mt-2">CASE 037 / NORTH CAMPUS</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="case-identifier-block">
                <span className="case-identifier-label">NODE</span>
                <span className="case-identifier-value">02</span>
              </div>
              <div className="case-identifier-block">
                <span className="case-identifier-label">SHIFT</span>
                <span className="case-identifier-value">07</span>
              </div>
              <div className="case-identifier-block">
                <span className="case-identifier-label">TIME</span>
                <span className="case-identifier-value">01:47:32</span>
              </div>
            </div>
          </div>

          <div className="nexus-case-body space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="section-label mb-2">Active case board</p>
                <p className="text-nexus-textMuted">
                  {gameState?.totalTeams ?? teams.length} field teams • {stats.totalPlayers} personnel identified • evidence queue active
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ConnectionStatus compact />
                <button
                  onClick={() => void refreshAll()}
                  disabled={isLoading}
                  className="btn-secondary text-xs py-1.5"
                >
                  <BureauIcons.Refresh className={cn('bureau-icon w-4 h-4', isLoading && 'animate-spin')} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="btn-primary"
                >
                  <BureauIcons.Add className="bureau-icon w-4 h-4" />
                  <span>Dispatch unit</span>
                </button>
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="btn-secondary"
                >
                  <BureauIcons.Bell className="bureau-icon w-4 h-4" />
                  <span>Open channel</span>
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_290px]">
              <TerminalFrame title="Case index" reference="Archive" variant="system">
                <div className="space-y-2">
                  {[
                    { id: '037', label: 'North campus', status: 'Active' },
                    { id: '036', label: 'Concierge desk', status: 'Archived' },
                    { id: '035', label: 'Maintenance tunnel', status: 'Flagged' },
                    { id: '034', label: 'Signal drift', status: 'Open' },
                  ].map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'w-full border border-nexus-border bg-nexus-bg px-2.5 py-2 text-left transition-colors',
                        index === 0 && 'border-nexus-text/40 bg-nexus-surfaceElevated',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[0.7rem] tracking-[0.22em] text-nexus-text">{item.id}</span>
                        <span className="text-[0.56rem] uppercase tracking-[0.18em] text-nexus-textSubtle">{item.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-nexus-textMuted">{item.label}</p>
                    </button>
                  ))}
                </div>
              </TerminalFrame>

              <div className="space-y-4">
                <TerminalFrame title="Active case board" reference="Classification / restricted" variant="monitor">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nexus-border pb-3">
                      <div>
                        <p className="text-[0.56rem] uppercase tracking-[0.24em] text-nexus-textSubtle">Subject</p>
                        <p className="mt-1 text-xl font-medium text-nexus-text">CASE 037 / ATTEMPTED RECOVERY</p>
                      </div>
                      <span className="stamp stamp-contradicted">Contradicted</span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="border border-nexus-border bg-nexus-bg p-2.5">
                        <p className="text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Field units</p>
                        <p className="mt-2 font-mono text-lg text-nexus-text">{stats.totalTeams || 0}</p>
                      </div>
                      <div className="border border-nexus-border bg-nexus-bg p-2.5">
                        <p className="text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Signal</p>
                        <p className="mt-2 font-mono text-lg text-nexus-accent">82%</p>
                      </div>
                      <div className="border border-nexus-border bg-nexus-bg p-2.5">
                        <p className="text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Evidence</p>
                        <p className="mt-2 font-mono text-lg text-nexus-text">07</p>
                      </div>
                      <div className="border border-nexus-border bg-nexus-bg p-2.5">
                        <p className="text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Last contact</p>
                        <p className="mt-2 font-mono text-[0.72rem] text-nexus-warning">01:47:32</p>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="border border-nexus-border bg-nexus-bg p-3">
                        <div className="flex items-center justify-between border-b border-nexus-border pb-2">
                          <p className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Current area</p>
                          <span className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-accent">Live</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="border border-nexus-border bg-nexus-surfaceElevated p-2">
                            <p className="text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Location</p>
                            <p className="mt-2 font-mono text-sm text-nexus-text">NX-019</p>
                          </div>
                          <div className="border border-nexus-border bg-nexus-surfaceElevated p-2">
                            <p className="text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Status</p>
                            <p className="mt-2 font-mono text-sm text-nexus-warning">Unresolved</p>
                          </div>
                        </div>
                        <div className="mt-3 relative h-28 overflow-hidden border border-nexus-border bg-nexus-surfaceSubtle">
                          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                          <div className="absolute left-10 top-7 h-3 w-3 border border-nexus-accent bg-nexus-accent/20" />
                          <div className="absolute left-20 top-16 h-3 w-3 border border-nexus-warning bg-nexus-warning/20" />
                          <div className="absolute right-14 top-12 h-3 w-3 border border-nexus-text bg-nexus-surfaceElevated" />
                          <div className="absolute right-20 bottom-8 h-3 w-3 border border-nexus-danger bg-nexus-danger/20" />
                          <div className="absolute inset-x-0 bottom-0 h-px bg-nexus-border" />
                        </div>
                      </div>

                      <div className="border border-nexus-border bg-nexus-bg p-3">
                        <p className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Unresolved</p>
                        <ul className="mt-3 space-y-3 text-sm text-nexus-textMuted">
                          <li>• Timestamp conflict [A-203]</li>
                          <li>• Location trace incomplete</li>
                          <li>• Observer mismatch [OBS-02]</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TerminalFrame>

                <TerminalFrame title="Field units" reference={`${teams.length} linked`} variant="register">
                  <div className="space-y-2">
                    {teams.slice(0, 4).map(team => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => handleTeamClick(team.id)}
                        className="w-full border border-nexus-border bg-nexus-bg px-2.5 py-2 text-left transition-colors hover:bg-nexus-surfaceElevated"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-nexus-text">{team.code}</span>
                          <TeamStatusBadge status={team.status} showDot />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="font-medium text-nexus-text">{team.name}</span>
                          <span className="text-[0.58rem] uppercase tracking-[0.18em] text-nexus-textSubtle">{team.playerCount ?? 0} personnel</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </TerminalFrame>
              </div>

              <div className="space-y-4">
                <TerminalFrame title="Observation" reference="Camera / zone 04" variant="monitor">
                  <div className="border border-nexus-border bg-nexus-bg p-2">
                    <div className="mb-2 flex items-center justify-between text-[0.56rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                      <span>Live feed</span>
                      <span className="text-nexus-accent">REC</span>
                    </div>
                    <div className="surveillance-frame h-44">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(111,179,196,0.18),transparent_35%),linear-gradient(180deg,#0f1214,#0b0c0d)]" />
                      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
                      <div className="absolute left-3 top-3 text-[0.56rem] uppercase tracking-[0.18em] text-nexus-textMuted">CAM-04</div>
                      <div className="absolute right-3 top-3 text-[0.56rem] uppercase tracking-[0.18em] text-nexus-textMuted">01:47:32</div>
                      <div className="absolute inset-x-6 bottom-4 h-1 bg-nexus-accent/60" />
                      <div className="absolute left-8 top-12 h-12 w-12 border border-nexus-border bg-nexus-surfaceElevated/70" />
                      <div className="absolute right-10 top-12 h-16 w-20 border border-nexus-accent/40 bg-nexus-accent/10" />
                      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-nexus-warning/60 bg-nexus-warning/10" />
                    </div>
                  </div>
                </TerminalFrame>

                <TerminalFrame title="Signal lattice" reference="Integrity 82%" variant="system">
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                        <span>Channel 04</span>
                        <span>82%</span>
                      </div>
                      <div className="signal-track"><div className="signal-fill" style={{ width: '82%' }} /><span className="signal-ticks" /></div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                        <span>Noise floor</span>
                        <span>17%</span>
                      </div>
                      <div className="signal-track"><div className="signal-fill-warning" style={{ width: '17%' }} /><span className="signal-ticks" /></div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-nexus-border pt-2 text-[0.58rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
                      <span>Transmission</span>
                      <span className="flex items-center gap-2 text-nexus-accent"><span className="rec-lamp" />SYNC</span>
                    </div>
                  </div>
                </TerminalFrame>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <TerminalFrame title="Evidence register" reference="Recovered items" variant="register">
                <div className="space-y-2">
                  {[
                    ['037-A', 'Photograph', 'Verified'],
                    ['037-B', 'Audio log', 'Unverified'],
                    ['037-C', 'Campus map', 'Contradicted'],
                    ['037-D', 'Signal fragment', 'Restricted'],
                  ].map(([id, type, state]) => (
                    <div key={id} className="flex items-center justify-between gap-3 border border-nexus-border bg-nexus-bg px-2.5 py-2">
                      <div>
                        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-nexus-text">{id}</p>
                        <p className="mt-1 text-sm text-nexus-textMuted">{type}</p>
                      </div>
                      <span className={cn(
                        'text-[0.52rem] uppercase tracking-[0.18em]',
                        state === 'Verified' && 'text-nexus-accent',
                        state === 'Unverified' && 'text-nexus-warning',
                        state === 'Contradicted' && 'text-nexus-danger',
                        state === 'Restricted' && 'text-nexus-textSubtle',
                      )}>{state}</span>
                    </div>
                  ))}
                </div>
              </TerminalFrame>

              <TerminalFrame title="Incident chronology" reference="Recent activity" variant="system" footer={
                <Link to={ROUTES.ADMIN_AUDIT} className="text-xs text-nexus-accent hover:underline">
                  View audit log →
                </Link>
              }>
                <div className="space-y-2">
                  {isLoading && recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-nexus-textMuted">Loading activity…</div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-nexus-textMuted">No recent activity</div>
                  ) : (
                    recentActivity.slice(0, 6).map(action => (
                      <div key={action.id} className="border-b border-nexus-border pb-2 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-nexus-textSubtle">{formatDateTime(action.timestamp)}</span>
                          <span className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-accent">{action.team}</span>
                        </div>
                        <p className="mt-1 text-sm text-nexus-textMuted">{action.type.replace(/_/g, ' ')}</p>
                      </div>
                    ))
                  )}
                </div>
              </TerminalFrame>
            </div>
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




