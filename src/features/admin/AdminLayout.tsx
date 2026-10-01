/**
 * NEXUS ECHO — Admin Layout
 *
 * The bureau workstation shell: a persistent case rail, the live-link state,
 * and the operator's own identity. Desktop-first.
 *
 * Like the player shell it carries the narrative level on one element, so the
 * whole workstation drains colour as the case advances. The operator's screen
 * follows the case lifecycle rather than any one team's conduct — see
 * `levelFromCasePhase`.
 */

import { useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Trophy, Gamepad2, FileText, LogOut, ChevronLeft, Wifi, WifiOff, RefreshCw, MapPin, ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/app/config'
import { useAdmin } from '@/app/providers/AdminProvider'
import { useApp } from '@/app/providers'
import { useBureauRealtime } from '@/hooks/useBureau'
import { levelFromCasePhase } from '@/lib/narrative'
import { formatDateTime } from '@/lib/time'

const ADMIN_NAV = [
  { path: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { path: ROUTES.ADMIN_TEAMS, label: 'Teams', icon: Users },
  { path: ROUTES.ADMIN_LEADERBOARD, label: 'Leaderboard', icon: Trophy },
  { path: ROUTES.ADMIN_GAME_CONTROL, label: 'Game Control', icon: Gamepad2 },
  { path: ROUTES.ADMIN_LOCATIONS, label: 'Locations', icon: MapPin },
  { path: ROUTES.ADMIN_QA_VIEWER, label: 'QA Viewer', icon: ShieldQuestion },
  { path: ROUTES.ADMIN_QA_HUB, label: 'Player Simulator', icon: Users },
  { path: ROUTES.ADMIN_AUDIT, label: 'Audit Log', icon: FileText },
] as const

export function AdminLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
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
    <div data-horror={narrativeLevel} className="min-h-screen bg-nexus-bg flex">
      {/* Case rail */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-nexus-surface border-r border-nexus-border transition-all duration-normal flex flex-col',
          isSidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Masthead */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-nexus-borderSubtle">
          <NavLink to={ROUTES.ADMIN_DASHBOARD} className="flex items-center gap-3">
            <div className="w-10 h-10 border border-nexus-border bg-nexus-surfaceElevated flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-nexus-text text-sm font-bold tracking-widest">NX</span>
            </div>
            {!isSidebarCollapsed && (
              <span className="flex flex-col">
                <span className="font-display font-bold text-sm text-nexus-text tracking-tight">BUREAU</span>
                <span className="section-label">Operations</span>
              </span>
            )}
          </NavLink>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors flex-shrink-0"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', isSidebarCollapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-0.5" role="list">
            {ADMIN_NAV.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-fast border-l-2 group',
                    isActive
                      ? 'bg-nexus-surfaceElevated text-nexus-text border-l-nexus-text'
                      : 'text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated/60 border-l-transparent',
                  )}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Operator identity & live link */}
        {!isSidebarCollapsed && (
          <div className="px-4 py-3 border-t border-nexus-borderSubtle space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn('w-2 h-2 flex-shrink-0', isConnected ? 'status-active' : 'status-danger')}
                aria-hidden="true"
              />
              <span className="section-label">{isConnected ? 'Live link' : 'Link down'}</span>
            </div>
            {admin && (
              <p className="meta truncate">
                Operator: <span className="text-nexus-textMuted">{admin.username}</span>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-nexus-borderSubtle">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 text-sm text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors border-l-2 border-transparent',
              isSidebarCollapsed && 'justify-center',
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 min-h-screen overflow-auto transition-all duration-normal',
          isSidebarCollapsed ? 'ml-16' : 'ml-64',
        )}
      >
        <div className="p-6 md:p-8 lg:p-10">
          {location.pathname === ROUTES.ADMIN_LOGIN ? null : (
            <div className="mb-6 border-b border-nexus-borderSubtle pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-nexus-accent" aria-hidden="true" />
                ) : (
                  <WifiOff className="w-4 h-4 text-nexus-danger" aria-hidden="true" />
                )}
                <span className="section-label">
                  {isConnected ? 'Live — real-time connected' : 'Real-time connection lost'}
                </span>
                {!isConnected && connectionInfo.lastSync && (
                  <span className="meta">
                    Last synchronized: {formatDateTime(connectionInfo.lastSync.toISOString())}
                  </span>
                )}
              </div>
              {!isConnected && (
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary text-xs py-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </button>
              )}
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
