/**
 * NEXUS — Root Layout
 * Top-level layout wrapper. Owns the Suspense boundary for lazily loaded routes.
 */

import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center min-h-screen bg-nexus-bg text-nexus-text"
    >
      Loading…
    </div>
  )
}

export function Layout() {
  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text nexus-archive-shell">
      <Suspense fallback={<RouteLoading />}>
        <Outlet />
      </Suspense>
    </div>
  )
}
