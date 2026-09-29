/**
 * NEXUS — RequireAuth Guard
 *
 * Wraps routes that require a player to be authenticated.
 * On unauthenticated access, redirects to the player login page.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useApp } from '@/app/providers'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useApp()
  const location = useLocation()

  if (isInitializing) {
    return <div className="flex items-center justify-center min-h-screen bg-nexus-bg">Loading session…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/player/login" state={{ from: location }} replace />
  }

  return children
}
