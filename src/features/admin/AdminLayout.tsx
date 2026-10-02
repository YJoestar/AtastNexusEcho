/**
 * NEXUS ECHO — Admin Layout
 *
 * The bureau workstation shell:
 *   LEFT   — case index / filing spine (NOT a SaaS sidebar)
 *   CENTER — active investigation workspace
 *   RIGHT  — observation / signal / telemetry rail
 *   BOTTOM — machine status strip & station clock
 */

import { useMemo, useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BureauIcons, SignalIntegrity } from '@/components/bureau'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/app/config'
import { useAdmin } from '@/app/providers/AdminProvider'
import { useApp } from '@/app/providers'
import { useBureau, useBureauRealtime } from '@/hooks/useBureau'
import { levelFromCasePhase } from '@/lib/narrative'
import { formatDateTime } from '@/lib/time'

const CASE_INDEX = [
  { path: ROUTES.ADMIN_DASHBOARD, label: 'CASE 037', sub: 'North campus · active', active: true },
]

const FIELD_INDEX = [
  { path: ROUTES.ADMIN_TEAMS, label: 'FIELD UNITS', sub: 'Personnel Dossiers', icon: BureauIcons.Users },
  { path: ROUTES.ADMIN_LOCATIONS, label: 'LOCATIONS', sub: 'Campus Archive', icon: BureauIcons.MapPin },
  { path: ROUTES.ADMIN_GAME_CONTROL, label: 'OPERATIONS CONTROL', sub: 'Master Switches', icon: BureauIcons.Key },
  { path: ROUTES.ADMIN_LEADERBOARD, label: 'OPERATIONAL RECORD', sub: 'Field Ledger', icon: BureauIcons.BarChart },
]

const SYSTEM_INDEX = [
  { path: ROUTES.ADMIN_QA_HUB, label: 'FIELD SIMULATOR', sub: 'Handset Emulation', icon: BureauIcons.Smartphone },
  { path: ROUTES.ADMIN_AUDIT, label: 'SYSTEM ACCESS RECORD', sub: 'Chrono-Audit', icon: BureauIcons.File },
  { path: ROUTES.ADMIN_QA_VIEWER, label: 'QA MONITOR', sub: 'Content Inspection', icon: BureauIcons.ShieldQuestion },
]

export function AdminLayout() {
  const [isIndexCollapsed, setIsIndexCollapsed] = useState(false)
  const [stationTime, setStationTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  )
  const navigate = useNavigate()
  const location = useLocation()
  const { admin, logout } = useAdmin()
  const { connectionInfo, isConnected } = useBureauRealtime()
  const { gameState } = useApp()
  const { teams, fetchTeams, BUREAU_REFRESH_INTERVAL } = useBureau()

  useEffect(() => {
    if (!admin) return
    void fetchTeams()
    const interval = window.setInterval(() => void fetchTeams(), BUREAU_REFRESH_INTERVAL)
    return () => window.clearInterval(interval)
  }, [admin, fetchTeams, BUREAU_REFRESH_INTERVAL])

  useEffect(() => {
    const timer = setInterval(() => {
      setStationTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const narrativeLevel = useMemo(() => levelFromCasePhase(gameState?.currentPhase), [gameState?.currentPhase])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.ADMIN_LOGIN, { replace: true })
  }

  const activeTeamsCount = teams.filter(t => t.status === 'ACTIVE').length
  const totalPersonnel = teams.reduce((sum, t) => sum + (t.playerCount ?? 0), 0)

  return (
    <div
      data-horror={narrativeLevel}
      className="min-h-screen bg-nexus-bg text-nexus-text font-mono antialiased"
    >
      <div className="nexus-bureau-bezel">
        {/* Workstation Machine Status Bar */}
        <div className="nexus-bureau-status-bar flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="nexus-bureau-status-item flex items-center gap-1.5 font-bold text-nexus-text">
              <span className="w-2 h-2 bg-nexus-accent" />
              NEXUS ECHO // INTERNAL WORKSTATION
            </span>
            <span className="nexus-bureau-status-item">NODE 02</span>
            <span className="nexus-bureau-status-item">SHIFT 07</span>
            <span className="nexus-bureau-status-item text-nexus-textMuted">
              OPERATOR: {admin?.username ?? 'BUREAU-OPERATOR'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className={cn(
              'nexus-bureau-status-item flex items-center gap-1.5 font-semibold',
              isConnected ? 'text-nexus-accent' : 'text-nexus-danger'
            )}>
              <span className={cn('h-1.5 w-1.5', isConnected ? 'bg-nexus-accent' : 'bg-nexus-danger')} />
              NETWORK: {isConnected ? 'AVAILABLE' : 'OFFLINE'}
            </span>
            <span className={cn(
              'nexus-bureau-status-item font-semibold',
              connectionInfo.lastSync ? 'text-nexus-textMuted' : 'text-nexus-warning'
            )}>
              ACK: {connectionInfo.lastSync ? formatDateTime(connectionInfo.lastSync.toISOString()) : 'NOT ESTABLISHED'}
            </span>
            <span className="nexus-bureau-status-item text-nexus-accent font-bold">
              {stationTime}
            </span>
          </div>
        </div>

        <div className="nexus-bureau-workarea">
          {/* Left Filing Spine / Case Index */}
          <aside className={cn(
            'nexus-case-index border-r border-nexus-border bg-nexus-surfaceElevated transition-all duration-normal flex flex-col',
            isIndexCollapsed ? 'w-12' : 'w-60',
          )}>
            <div className="border-b border-nexus-border px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
                {isIndexCollapsed ? '▌' : 'CASE ARCHIVE & INDEX'}
              </span>
              <button
                type="button"
                onClick={() => setIsIndexCollapsed(!isIndexCollapsed)}
                className="p-1 text-nexus-textSubtle hover:text-nexus-text transition-colors"
                aria-label={isIndexCollapsed ? 'Expand case index' : 'Collapse case index'}
              >
                <BureauIcons.ChevronLeft className={cn('bureau-icon w-4 h-4 transition-transform', isIndexCollapsed && 'rotate-180')} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-1">
              {!isIndexCollapsed && (
                <>
                  {/* Active Investigation Cases */}
                  <div className="px-3 py-1.5 border-b border-nexus-border">
                    <span className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
                      ACTIVE INVESTIGATIONS
                    </span>
                  </div>
                  <ul role="list" className="space-y-0.5 px-2 py-1">
                    {CASE_INDEX.map(item => (
                      <li key={item.label}>
                        <button
                          type="button"
                          onClick={() => navigate(item.path)}
                          className={cn(
                            'w-full border-l-2 px-2.5 py-1.5 text-left transition-colors font-mono',
                            location.pathname === ROUTES.ADMIN_DASHBOARD && item.active
                              ? 'border-nexus-accent bg-nexus-bg text-nexus-text'
                              : 'border-transparent text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-bg hover:border-nexus-border'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[0.6875rem] tracking-[0.16em] font-bold text-nexus-text">
                              {item.label}
                            </span>
                            {item.active && (
                              <span className="text-[0.5rem] px-1 py-0.2 border border-nexus-accent text-nexus-accent uppercase">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[0.56rem] tracking-[0.08em] text-nexus-textSubtle mt-0.5">
                            {item.sub}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Field Operations */}
                  <div className="px-3 py-1.5 border-b border-nexus-border mt-2">
                    <span className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
                      FIELD OPERATIONS
                    </span>
                  </div>
                  <ul role="list" className="space-y-0.5 px-2 py-1">
                    {FIELD_INDEX.map(item => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 px-2.5 py-1.5 text-[0.6875rem] tracking-[0.14em] transition-colors border-l-2 font-mono',
                            isActive
                              ? 'border-nexus-accent text-nexus-text bg-nexus-bg'
                              : 'border-transparent text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-bg hover:border-nexus-border',
                          )}
                        >
                          <item.icon className="bureau-icon w-3.5 h-3.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="block truncate">{item.label}</span>
                          </div>
                        </NavLink>
                      </li>
                    ))}
                  </ul>

                  {/* System & Simulation */}
                  <div className="px-3 py-1.5 border-b border-nexus-border mt-2">
                    <span className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
                      SYSTEM & DIAGNOSTICS
                    </span>
                  </div>
                  <ul role="list" className="space-y-0.5 px-2 py-1">
                    {SYSTEM_INDEX.map(item => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 px-2.5 py-1.5 text-[0.6875rem] tracking-[0.14em] transition-colors border-l-2 font-mono',
                            isActive
                              ? 'border-nexus-accent text-nexus-text bg-nexus-bg'
                              : 'border-transparent text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-bg hover:border-nexus-border',
                          )}
                        >
                          <item.icon className="bureau-icon w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>

            <div className="border-t border-nexus-borderSubtle px-3 py-2">
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 text-[0.6875rem] text-nexus-textSubtle hover:text-nexus-danger hover:bg-nexus-dangerBg/20 transition-colors border-l-2 border-transparent',
                  !isIndexCollapsed && 'justify-start',
                  isIndexCollapsed && 'justify-center',
                )}
              >
                <BureauIcons.LogOut className="bureau-icon w-4 h-4 flex-shrink-0" />
                {!isIndexCollapsed && <span className="tracking-[0.16em]">TERMINATE SESSION</span>}
              </button>
            </div>
          </aside>

          {/* Center Workspace Canvas */}
          <main className="nexus-bureau-canvas flex-1 overflow-auto bg-nexus-bg">
            <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
              {!isConnected && location.pathname !== ROUTES.ADMIN_LOGIN && (
                <div className="mb-4 flex items-center justify-between gap-2 px-3 py-2 border border-nexus-danger bg-nexus-dangerBg/30 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-nexus-danger animate-ping" />
                    <span className="font-mono text-nexus-danger font-semibold tracking-[0.1em]">
                      SIGNAL CARRIER LOST · TELEMETRY STALE · LAST CONFIRMED: {connectionInfo.lastSync ? formatDateTime(connectionInfo.lastSync.toISOString()) : 'UNKNOWN'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-nexus-text underline hover:text-nexus-accent"
                  >
                    [ RE-ESTABLISH LINK ]
                  </button>
                </div>
              )}
              <Outlet />
            </div>
          </main>

          {/* Right Observation & Live Telemetry Rail */}
          <aside className="nexus-observation-rail w-64 min-w-[256px] border-l border-nexus-border bg-nexus-surfaceElevated flex flex-col">
            <div className="border-b border-nexus-borderSubtle px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-[0.52rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
                OBSERVATION RAIL
              </span>
              <span className="w-1.5 h-1.5 bg-nexus-accent" />
            </div>

            <div className="p-3 space-y-4 flex-1 overflow-y-auto font-mono text-xs">
              {/* Telemetry Channel */}
              <div className="space-y-2">
                <p className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                  TELEMETRY LINK
                </p>
                {connectionInfo.lastSync ? (
                  <SignalIntegrity value={connectionInfo.signalStrength / 100} known label="LINK ACK FRESHNESS" />
                ) : (
                  <div className="border border-nexus-borderSubtle px-2 py-2 font-mono">
                    <span className="block text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">SERVER HANDSHAKE</span>
                    <span className="mt-1 block text-[0.625rem] font-bold uppercase tracking-[0.1em] text-nexus-warning">NOT ESTABLISHED</span>
                  </div>
                )}
              </div>

              {/* Station Operator Details */}
              <div className="space-y-1.5 pt-2 border-t border-nexus-borderSubtle">
                <p className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                  STATION OPERATOR
                </p>
                <div className="text-nexus-text font-bold">
                  {admin?.username ?? 'BUREAU-OPERATOR'}
                </div>
                <div className="text-[0.625rem] text-nexus-textSubtle">
                  CLEARANCE: {admin?.role ?? 'NOT CLASSIFIED'}
                </div>
              </div>

              {/* Mission Phase Telemetry */}
              <div className="space-y-2 pt-2 border-t border-nexus-borderSubtle">
                <p className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                  MISSION LIFECYCLE
                </p>
                <div className="space-y-1.5 text-[0.6875rem]">
                  <div className="flex justify-between">
                    <span className="text-nexus-textSubtle">PHASE</span>
                    <span className="text-nexus-text font-semibold uppercase">
                      {gameState?.currentPhase ?? 'AWAITING STATE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-textSubtle">STATUS</span>
                    <span className="text-nexus-accent uppercase">
                      {gameState?.status ?? 'UNCONFIRMED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-textSubtle">FIELD UNITS</span>
                    <span className="text-nexus-text font-bold">
                      {activeTeamsCount} ACTIVE / {teams.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-textSubtle">PERSONNEL</span>
                    <span className="text-nexus-text font-bold">
                      {totalPersonnel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Team Positions */}
              {teams.filter(team => team.status === 'ACTIVE').length > 0 && (
                <div className="pt-2 border-t border-nexus-borderSubtle">
                  <p className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle mb-2">
                    ACTIVE FIELD POSITIONS
                  </p>
                  <div className="space-y-1.5 text-[0.6875rem]">
                    {teams.filter(team => team.status === 'ACTIVE').slice(0, 4).map(team => (
                      <div key={team.id} className="flex justify-between">
                        <span className="text-nexus-textMuted truncate">{team.code}</span>
                        <span className="text-nexus-text font-mono">
                          {team.currentNodeCode ?? 'STANDBY'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diegetic Station Note */}
              <div className="pt-2 border-t border-nexus-borderSubtle">
                <p className="text-[0.5rem] tracking-[0.12em] text-nexus-textSubtle/70 leading-relaxed uppercase">
                  UNAUTHORIZED DUPLICATION OR DISCLOSURE OF INCIDENT RECORDS SUBJECT TO ARTICLE 9 INVESTIGATION CODES.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Workstation Machine Footer */}
        <div className="nexus-bureau-footer flex items-center justify-between">
          <span className="font-mono text-[0.52rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
            NEXUS ECHO // CLASSIFIED BUREAU ASSET — OPERATIONAL RECORD 037
          </span>
          <span className="font-mono text-[0.56rem] text-nexus-textSubtle font-bold">
            NODE-02 // SHIFT 07 // {stationTime}
          </span>
        </div>
      </div>
    </div>
  )
}
