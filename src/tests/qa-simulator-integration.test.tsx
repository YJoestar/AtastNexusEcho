/**
 * NEXUS — QA Simulator Integration Test (Real Providers)
 *
 * Unlike qa-simulator.test.tsx (which mocks @/app/providers), this test uses the
 * REAL AppProvider + useApp() so the QA delegation path is exercised. This
 * catches crashes that only appear in production when player screens render
 * inside the QAPlayerShell's MemoryRouter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue({}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(), unsubscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
  getSupabase: vi.fn(),
}))

vi.mock('@/lib/game', () => ({
  gameAPI: {
    getNode: vi.fn().mockResolvedValue(null),
    submitAnswer: vi.fn(),
    scanQR: vi.fn(),
    useHint: vi.fn(),
    getNotifications: vi.fn().mockResolvedValue([]),
    markNotificationsRead: vi.fn(),
    getInventory: vi.fn().mockResolvedValue({ evidence: [], inventory: [], fragments: [] }),
    getNodeProgress: vi.fn().mockResolvedValue([]),
    getGameState: vi.fn().mockResolvedValue({
      team: { status: 'ACTIVE', startedAt: null, deadline: null, currentNode: null, score: 0 },
    }),
  },
}))

vi.mock('@/hooks/useConnection', () => ({
  useConnection: () => ({
    status: 'online' as const,
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

import { AppProvider } from '@/app/providers'
import { QASimulatorProvider } from '@/contexts/QASimulatorContext'
import { QAHub } from '@/features/admin/QAHub'

function renderWithRealProviders(ui: React.ReactElement) {
  return render(
    <AppProvider>
      <QASimulatorProvider>{ui}</QASimulatorProvider>
    </AppProvider>,
  )
}

describe('QA Simulator — Real Providers Integration', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let reactErrors: string[]

  beforeEach(() => {
    reactErrors = []
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      reactErrors.push(args.map(a => String(a)).join(' '))
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('starts simulation and renders player screens without crashing', async () => {
    renderWithRealProviders(<QAHub />)

    await waitFor(() => {
      expect(screen.getByText('Player Experience Simulator')).toBeTruthy()
    })

    const startButton = await screen.findByRole('button', { name: /Start Simulation/i })

    await act(async () => {
      fireEvent.click(startButton)
    })

    await waitFor(() => {
      expect(screen.getByText(/Player View/i)).toBeTruthy()
    })

    await new Promise(r => setTimeout(r, 100))

    await waitFor(() => {
      expect(screen.getByText(/Case ledger/i)).toBeTruthy()
    })

    const criticalErrors = reactErrors.filter(
      e => e.includes('TypeError') || (e.includes('Cannot read') && !e.includes('is not a function')),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  it('renders PlayerHeader with QA team data when simulation is active', async () => {
    renderWithRealProviders(<QAHub />)

    await waitFor(() => {
      expect(screen.getByText('Player Experience Simulator')).toBeTruthy()
    })

    const startButton = await screen.findByRole('button', { name: /Start Simulation/i })
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/Player View/i)).toBeTruthy()
    })

    const teamNames = screen.getAllByText('QA Simulation Team')
    expect(teamNames.length).toBeGreaterThanOrEqual(1)
  })

  it('renders BottomNav navigation items when simulation is active', async () => {
    renderWithRealProviders(<QAHub />)

    await waitFor(() => {
      expect(screen.getByText('Player Experience Simulator')).toBeTruthy()
    })

    const startButton = await screen.findByRole('button', { name: /Start Simulation/i })
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/Player View/i)).toBeTruthy()
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'EVIDENCE' })).toBeTruthy()
    })
  })
})
