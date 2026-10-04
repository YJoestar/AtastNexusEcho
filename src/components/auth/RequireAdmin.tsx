/**
 * NEXUS — RequireAdmin Guard
 *
 * Wraps routes that require Bureau/admin access.
 * On unauthenticated or non-admin access, redirects to the admin login page.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAdmin } from '@/app/providers/AdminProvider'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, isInitialized } = useAdmin()
  const location = useLocation()

  // Only the first check blocks: later re-checks must not unmount the workstation.
  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen bg-nexus-bg">Checking permissions…</div>
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children
}
