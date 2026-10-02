/**
 * NEXUS ECHO — Admin Layout
 *
 * The bureau workstation shell:
 *   LEFT   — case index / filing spine (NOT a SaaS sidebar)
 *   CENTER — active investigation
 *   RIGHT  — observation / signal / personnel rail
 *   BOTTOM — system status strip
 *
 * The operator's screen follows the case lifecycle rather than any one
 * team's conduct — see `levelFromCasePhase`.
 */

import { useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/app/config'
import { useAdmin } from '@/app/providers/AdminProvider'
import { useApp } from '@/app/providers'
import { useBureauRealtime } from '@/hooks/useBureau'
import { levelFromCasePhase } from '@/lib/narrative'
import { formatDateTime } from '@/lib/time'

const CASE_INDEX = [
  { path: ROUTES.ADMIN_DASHBOARD, label: 'CASE 037', sub: 'North campus · active' },
  { path: ROUTES.ADMIN_DASHBOARD, label: 'CASE 036', sub: 'Concierge desk · archived' },
  { path: ROUTES.ADMIN_DASHBOARD, label: 'CASE 035', sub: 'Maintenance tunnel · flagged' },
  { path: ROUTES.ADMIN_DASHBOARD, label: 'CASE 034', sub: 'Signal drift · open' },
]

const FIELD_INDEX = [
  { path: ROUTES.ADMIN_TEAMS, label: 'FIELD UNITS', icon: BureauIcons.Users },
  { path: ROUTES.ADMIN_LOCATIONS, label: 'LOCATIONS', icon: BureauIcons.MapPin },
  { path: ROUTES.ADMIN_QA_HUB, label: 'SIMULATOR', icon: BureauIcons.Smartphone },
]

const SYSTEM_INDEX = [
  { path: ROUTES.ADMIN_AUDIT, label: 'ACCESS RECORD', icon: BureauIcons.File },
  { path: ROUTES.ADMIN_QA_VIEWER, label: 'QA MONITOR', icon: BureauIcons.ShieldQuestion },
]

export function AdminLayout() {
  const [isIndexCollapsed, setIsIndexCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { admin, logout } = useAdmin()
  const { connectionInfo } = useBureauRealtime()
  const { gameState } = useApp()

  const narrativeLevel = useMemo(() => levelFromCasePhase(gameState?.currentPhase), [gameState?.currentPhase])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.ADMIN_LOGIN, { replace: true })
  }

  const isConnected = connectionInfo.isConnected

  return (
    <div
      data-horror={narrativeLevel}
      className="min-h-screen bg-nexus-bg text-nexus-text font-mono"
    >
      <div className="nexus-bureau-bezel">
        <div className="nexus-bureau-status-bar">
          <span className="nexus-bureau-status-item">
            NEXUS / INTERNAL — NODE 02
          </span>
          <span className="nexus-bureau-status-item">
            SHIFT 07
          </span>
          <span className="nexus-bureau-status-item">
            OPERATOR: {admin?.username ?? '—'}
          </span>
          <span className="nexus-bureau-status-item">
            SIGNAL: {isConnected ? 'LIVE' : 'DOWN'}
          </span>
        </div>

        <div className="nexus-bureau-workarea">

          <aside className={cn(
            'nexus-case-index border-r border-nexus-border bg-nexus-surfaceElevated transition-all duration-normal flex flex-col',
            isIndexCollapsed ? 'w-12' : 'w-56',
          )}>
            <div className="border-b border-nexus-border px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
                {isIndexCollapsed ? '▌' : 'CASE INDEX'}
              </span>
              <button
                onClick={() => setIsIndexCollapsed(!isIndexCollapsed)}
                className="p-1 text-nexus-textSubtle hover:text-nexus-text transition-colors"
                aria-label={isIndexCollapsed ? 'Expand case index' : 'Collapse case index'}
              >
                <BureauIcons.ChevronLeft className="bureau-icon w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-1">
              {!isIndexCollapsed && (
                <>
                  <div className="px-3 py-1.5 border-b border-nexus-border">
                    <span className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
                      CASE FILES
                    </span>
                  </div>
                  <ul role="list" className="space-y-0.5 px-2">
                    {CASE_INDEX.map(item => (
                      <li key={item.label}>
                        <button
                          type="button"
                          onClick={() => navigate(item.path)}
                          className="w-full border-l-2 border-transparent px-3 py-2 text-left transition-colors hover:bg-nexus-bg hover:border-nexus-text/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-nexus-text/70"
                        >
                          <div className="font-mono text-[0.68rem] tracking-[0.18em] text-nexus-text">
                            {item.label}
                          </div>
                          <p className="font-mono text-[0.56rem] tracking-[0.12em] text-nexus-textSubtle mt-0.5">
                            {item.sub}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="px-3 py-1.5 border-b border-nexus-border">
                    <span className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
                      FIELD
                    </span>
                  </div>
                  <ul role="list" className="space-y-0.5 px-2">
                    {FIELD_INDEX.map(item => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 px-3 py-2 text-[0.68rem] tracking-[0.18em] transition-colors border-l-2',
                            isActive
                              ? 'border-nexus-text/40 text-nexus-text bg-nexus-bg'
                              : 'border-transparent text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-bg hover:border-nexus-text/20',
                          )}
                        >
                          <item.icon className="bureau-icon w-3.5 h-3.5 flex-shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>

                  <div className="px-3 py-1.5 border-b border-nexus-border">
                    <span className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
                      SYSTEM
                    </span>
                  </div>
                  <ul role="list" className="space-y-0.5 px-2">
                    {SYSTEM_INDEX.map(item => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 px-3 py-2 text-[0.68rem] tracking-[0.18em] transition-colors border-l-2',
                            isActive
                              ? 'border-nexus-text/40 text-nexus-text bg-nexus-bg'
                              : 'border-transparent text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-bg hover:border-nexus-text/20',
                          )}
                        >
                          <item.icon className="bureau-icon w-3.5 h-3.5 flex-shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>

            <div className="border-t border-nexus-borderSubtle px-3 py-2">
              <button
                onClick={handleLogout}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 text-[0.68rem] text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-bg transition-colors border-l-2 border-transparent',
                  !isIndexCollapsed && 'justify-start',
                  isIndexCollapsed && 'justify-center',
                )}
              >
                <BureauIcons.LogOut className="bureau-icon w-4 h-4 flex-shrink-0" />
                {!isIndexCollapsed && <span>END SESSION</span>}
              </button>
            </div>
          </aside>

          <main className="nexus-bureau-canvas flex-1 overflow-auto">
            <div className="p-6 md:p-8">
              {!isConnected && location.pathname !== ROUTES.ADMIN_LOGIN && (
                <div className="mb-4 flex items-center gap-2 px-3 py-1.5 border border-nexus-border bg-nexus-bg text-xs">
                  <span className="status-danger" />
                  <span className="font-mono text-nexus-textSubtle">
                    Live link down · last synchronized: {connectionInfo.lastSync ? formatDateTime(connectionInfo.lastSync.toISOString()) : 'never'}
                  </span>
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.16em] text-nexus-accent hover:underline"
                  >
                    RETRY
                  </button>
                </div>
              )}
              <Outlet />
            </div>
          </main>

          <aside className="nexus-observation-rail w-64 min-w-[256px] border-l border-nexus-border bg-nexus-surfaceElevated flex flex-col">
            <div className="border-b border-nexus-borderSubtle px-3 py-2">
              <span className="font-mono text-[0.52rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
                OBSERVATION
              </span>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                  SIGNAL CHANNEL
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2', isConnected ? 'status-active' : 'status-danger')} />
                  <span className="font-mono text-xs text-nexus-text">
                    {isConnected ? 'Channel Open' : 'Channel Down'}
                  </span>
                </div>
              </div>

              {admin && (
                <div className="space-y-2">
                  <p className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                    OPERATOR
                  </p>
                  <div className="font-mono text-xs text-nexus-text">
                    {admin.username}
                  </div>
                  <div className="font-mono text-[0.62rem] text-nexus-textSubtle">
                    NODE 02
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-nexus-border">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">
                  GAME STATE
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-mono text-[0.6rem] text-nexus-textSubtle">Phase</span>
                    <span className="font-mono text-[0.6rem] text-nexus-text">
                      {gameState?.currentPhase?.toLowerCase() ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[0.6rem] text-nexus-textSubtle">Status</span>
                    <span className="font-mono text-[0.6rem] text-nexus-text">
                      {gameState?.status?.toLowerCase() ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[0.6rem] text-nexus-textSubtle">Teams</span>
                    <span className="font-mono text-[0.6rem] text-nexus-text">
                      —
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="nexus-bureau-footer">
          <span className="font-mono text-[0.52rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
            NEXUS ECHO INTERNAL — AUTHORIZED PERSONNEL ONLY
          </span>
          <span className="font-mono text-[0.56rem] text-nexus-textSubtle">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>
      </div>
    </div>
  )
}
