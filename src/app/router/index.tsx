/**
 * NEXUS — Router Configuration
 * Defines all application routes for player and admin experiences
 */

import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Layout } from '@/components/layout/Layout'
import { RouteError } from '@/components/layout/RouteError'

// Route guards (tiny; kept in the entry chunk so the guard logic never lazy-loads)
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireAdmin } from '@/components/auth/RequireAdmin'

// Every screen is its own chunk; <Layout> supplies the Suspense boundary.
const PlayerLayout = lazy(() => import('@/features/player/PlayerLayout').then(m => ({ default: m.PlayerLayout })))
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const Workstation = lazy(() => import('@/features/admin/workstation/Workstation').then(m => ({ default: m.Workstation })))

// Player route components
const PlayerLogin = lazy(() => import('@/features/player/Login').then(m => ({ default: m.PlayerLogin })))
const PlayerWaiting = lazy(() => import('@/features/player/Waiting').then(m => ({ default: m.PlayerWaiting })))
const PlayerGame = lazy(() => import('@/features/player/Game').then(m => ({ default: m.PlayerGame })))
const PlayerNode = lazy(() => import('@/features/player/Node').then(m => ({ default: m.PlayerNode })))
const PlayerEvidence = lazy(() => import('@/features/player/Evidence').then(m => ({ default: m.PlayerEvidence })))
const PlayerInventory = lazy(() => import('@/features/player/Inventory').then(m => ({ default: m.PlayerInventory })))
const PlayerNavigation = lazy(() => import('@/features/player/Navigation').then(m => ({ default: m.PlayerNavigation })))
const PlayerQR = lazy(() => import('@/features/player/QR').then(m => ({ default: m.PlayerQR })))
const PlayerLeaderboard = lazy(() => import('@/features/player/Leaderboard').then(m => ({ default: m.PlayerLeaderboard })))
const PlayerNotifications = lazy(() => import('@/features/player/Notifications').then(m => ({ default: m.PlayerNotifications })))
const PlayerFieldLog = lazy(() => import('@/features/player/FieldLog').then(m => ({ default: m.PlayerFieldLog })))
const PlayerFieldMode = lazy(() => import('@/features/player/FieldMode').then(m => ({ default: m.FieldMode })))
const PlayerFinal = lazy(() => import('@/features/player/Final').then(m => ({ default: m.PlayerFinal })))
const PlayerComplete = lazy(() => import('@/features/player/Complete').then(m => ({ default: m.PlayerComplete })))

// Admin route components
const AdminLogin = lazy(() => import('@/features/admin/Login').then(m => ({ default: m.AdminLogin })))

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
    errorElement: <RouteError />,
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
            path: 'notifications',
            element: (
              <ProtectedPlayerRoute>
                <PlayerNotifications />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'field-log',
            element: (
              <ProtectedPlayerRoute>
                <PlayerFieldLog />
              </ProtectedPlayerRoute>
            ),
          },
          {
            path: 'field',
            element: (
              <ProtectedPlayerRoute>
                <PlayerFieldMode />
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
      // Everything behind the sign-in is one workstation; each old admin screen
      // is a module window inside it and keeps its URL (/admin/teams, ...).
      {
        path: 'admin/*',
        element: (
          <ProtectedAdminRoute>
            <Workstation />
          </ProtectedAdminRoute>
        ),
      },

      // Redirect root to player login
      { index: true, Component: () => <Navigate to="/player/login" replace /> },
    ],
  },
])
