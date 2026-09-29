/**
 * NEXUS — Router Configuration
 * Defines all application routes for player and admin experiences
 */

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { Layout } from '@/components/layout/Layout'
import { PlayerLayout } from '@/features/player/PlayerLayout'
import { AdminLayout } from '@/features/admin/AdminLayout'

// Route guards
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireAdmin } from '@/components/auth/RequireAdmin'

// Player route components
import { PlayerLogin } from '@/features/player/Login'
import { PlayerWaiting } from '@/features/player/Waiting'
import { PlayerGame } from '@/features/player/Game'
import { PlayerNode } from '@/features/player/Node'
import { PlayerEvidence } from '@/features/player/Evidence'
import { PlayerInventory } from '@/features/player/Inventory'
import { PlayerNavigation } from '@/features/player/Navigation'
import { PlayerQR } from '@/features/player/QR'
import { PlayerLeaderboard } from '@/features/player/Leaderboard'
import { PlayerFinal } from '@/features/player/Final'
import { PlayerComplete } from '@/features/player/Complete'

// Admin route components
import { AdminLogin } from '@/features/admin/Login'
import { AdminDashboard } from '@/features/admin/Dashboard'
import { AdminTeams } from '@/features/admin/Teams'
import { AdminTeamDetail } from '@/features/admin/TeamDetail'
import { AdminLeaderboard } from '@/features/admin/Leaderboard'
import { AdminGameControl } from '@/features/admin/GameControl'
import { AdminAudit } from '@/features/admin/Audit'

// eslint-disable-next-line react-refresh/only-export-components
function ProtectedPlayerRoute({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}

// eslint-disable-next-line react-refresh/only-export-components
function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      // Public routes
      { path: 'login', Component: () => <Navigate to="/player/login" replace /> },

      // Player routes
      {
        path: 'player/login',
        Component: PlayerLayout,
        children: [{ index: true, Component: PlayerLogin }],
      },
      {
        path: 'player/waiting',
        Component: PlayerLayout,
        children: [
          {
            index: true,
            element: (
              <ProtectedPlayerRoute>
                <PlayerWaiting />
              </ProtectedPlayerRoute>
            ),
          },
        ],
      },
      {
        path: 'player/game',
        Component: PlayerLayout,
        children: [
          {
            index: true,
            element: (
              <ProtectedPlayerRoute>
                <PlayerGame />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'node/:nodeId',
            element: (
              <ProtectedPlayerRoute>
                <PlayerNode />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'evidence',
            element: (
              <ProtectedPlayerRoute>
                <PlayerEvidence />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'inventory',
            element: (
              <ProtectedPlayerRoute>
                <PlayerInventory />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'navigation',
            element: (
              <ProtectedPlayerRoute>
                <PlayerNavigation />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'qr',
            element: (
              <ProtectedPlayerRoute>
                <PlayerQR />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'leaderboard',
            element: (
              <ProtectedPlayerRoute>
                <PlayerLeaderboard />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'final',
            element: (
              <ProtectedPlayerRoute>
                <PlayerFinal />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'complete',
            element: (
              <ProtectedPlayerRoute>
                <PlayerComplete />
              </ProtectedPlayerRoute>
            ),
          },
        ],
      },

      // Admin routes
      {
        path: 'admin/login',
        Component: AdminLayout,
        children: [{ index: true, Component: AdminLogin }],
      },
      {
        path: 'admin',
        Component: AdminLayout,
        children: [
          {
            path: 'dashboard',
            element: (
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            ),
          },
          {
            path: 'teams',
            element: (
              <ProtectedAdminRoute>
                <AdminTeams />
              </ProtectedAdminRoute>
            ),
          },
          {
            path: 'teams/:teamId',
            element: (
              <ProtectedAdminRoute>
                <AdminTeamDetail />
              </ProtectedAdminRoute>
            ),
          },
          {
            path: 'leaderboard',
            element: (
              <ProtectedAdminRoute>
                <AdminLeaderboard />
              </ProtectedAdminRoute>
            ),
          },
          {
            path: 'game-control',
            element: (
              <ProtectedAdminRoute>
                <AdminGameControl />
              </ProtectedAdminRoute>
            ),
          },
          {
            path: 'audit',
            element: (
              <ProtectedAdminRoute>
                <AdminAudit />
              </ProtectedAdminRoute>
            ),
          },
        ],
      },

      // Redirect root to player login
      { index: true, Component: () => <Navigate to="/player/login" replace /> },
    ],
  },
])
