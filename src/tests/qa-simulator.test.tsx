/**
 * NEXUS — QA Simulator E2E Render Test
 *
 * Regression test for the infinite render loop that crashed production at
 * /admin/qa-simulator when clicking "Start Simulation".
 *
 * Root cause: resetSimulation() called setSolvedNodes(new Set()) directly,
 * creating a new Set reference every time. Combined with unmarked `player`
 * and `team` object literals (recreated every render, feeding into the
 * context useMemo), the context value reference changed on every render,
 * causing the useEffect in QAHubInner to re-run and call resetSimulation
 * again — an infinite loop.
 *
 * Fix: (1) resetSimulation uses setSolvedNodes(prev => prev.size === 0 ? prev : new Set())
 *         (2) player and team objects are wrapped in useMemo.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/app/providers', () => {
  const noop = async () => {}

  function useApp() {
    return {
      player: null,
      team: null,
      role: null,
      isAuthenticated: false,
      isInitializing: false,
      login: noop,
      logout: noop,
      refreshGameState: noop,
      refreshTeamProgress: noop,
      gameState: null,
      teamProgress: null,
      notifications: [],
      unreadCount: 0,
      markNotificationRead: () => {},
      refreshNotifications: noop,
      markAllNotificationsRead: noop,
    }
  }

  return { useApp, AppProvider: ({ children }: { children: React.ReactNode }) => children }
})

vi.mock('@/hooks/useConnection', () => ({
  useConnection: () => ({
    status: 'online',
    isBrowserOnline: true,
    isServerReachable: true,
    isOffline: false,
    lastProbedAt: null,
    probe: vi.fn(),
  }),
}))

vi.mock('@/hooks/useOffline', () => ({
  useOffline: () => ({ isOnline: true, isOffline: false }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
  getSupabase: vi.fn(),
}))

vi.mock('@/lib/game', () => ({
  gameAPI: {
    getNode: vi.fn(),
    submitAnswer: vi.fn(),
    scanQR: vi.fn(),
    useHint: vi.fn(),
    getNotifications: vi.fn().mockResolvedValue([]),
    markNotificationsRead: vi.fn(),
    getInventory: vi.fn(),
    getNodeProgress: vi.fn(),
    getLeaderboard: vi.fn(),
  },
}))

import { QAHub } from '@/features/admin/QAHub'

describe('QA Simulator', () => {
  it('renders the QA hub without an infinite render loop', async () => {
    render(<QAHub />)

    await waitFor(() => {
      expect(screen.getByText('Player Experience Simulator')).toBeTruthy()
    })
  })

  it('starts simulation and renders the embedded player view', async () => {
    render(<QAHub />)

    await waitFor(() => {
      expect(screen.getByText('Player Experience Simulator')).toBeTruthy()
    })

    const startButton = await screen.findByRole('button', { name: /Start Simulation/i })
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/Player View/i)).toBeTruthy()
    })
  })
})
