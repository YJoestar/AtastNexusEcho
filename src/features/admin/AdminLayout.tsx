/**
 * NEXUS — Admin Layout
 * Desktop-first layout for Bureau/admin experience
 */

import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Trophy, Gamepad2, FileText, LogOut, ChevronLeft, Wifi, WifiOff, RefreshCw, MapPin, ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/app/config'
import { useAdmin } from '@/app/providers/AdminProvider'
import { useBureauRealtime } from '@/hooks/useBureau'
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

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.ADMIN_LOGIN, { replace: true })
  }

  const isConnected = connectionInfo.isConnected

  return (
    <div className="min-h-screen bg-nexus-bg flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-nexus-surface border-r border-nexus-border transition-all duration-normal flex flex-col',
          isSidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-nexus-borderSubtle">
          <NavLink to={ROUTES.ADMIN_DASHBOARD} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nexus-dangerBg flex items-center justify-center flex-shrink-0">
              <span className="text-nexus-danger font-display font-bold text-xl">N</span>
            </div>
            {!isSidebarCollapsed && (
              <span className="font-display font-bold text-lg text-nexus-danger">BUREAU</span>
            )}
          </NavLink>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-lg text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors flex-shrink-0"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', isSidebarCollapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1" role="list">
            {ADMIN_NAV.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-fast group',
                    isActive
                      ? 'bg-nexus-dangerBg text-nexus-danger'
                      : 'text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated',
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

        {/* Operator Info & Connection Status */}
        {!isSidebarCollapsed && (
          <div className="px-3 py-3 border-t border-nexus-borderSubtle space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  isConnected ? 'bg-nexus-accent animate-pulse' : 'bg-nexus-danger',
                )}
              />
              <span className="text-nexus-textMuted">
                {isConnected ? 'LIVE' : 'RECONNECTING'}
              </span>
            </div>
            {admin && (
              <div className="text-xs text-nexus-textMuted truncate">
                Operator: {admin.username}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-nexus-borderSubtle">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-nexus-danger hover:bg-nexus-dangerBg/50 transition-colors',
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
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-nexus-accent" />
                ) : (
                  <WifiOff className="w-5 h-5 text-nexus-danger animate-pulse" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  isConnected ? 'text-nexus-accent' : 'text-nexus-danger',
                )}>
                  {isConnected ? 'LIVE — Real-time connected' : '⚠ REALTIME CONNECTION LOST'}
                </span>
                {!isConnected && connectionInfo.lastSync && (
                  <span className="text-xs text-nexus-textSubtle">
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
