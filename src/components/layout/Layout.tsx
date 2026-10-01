/**
 * NEXUS — Root Layout
 * Top-level layout wrapper
 */

import { Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text nexus-archive-shell">
      <Outlet />
    </div>
  )
}