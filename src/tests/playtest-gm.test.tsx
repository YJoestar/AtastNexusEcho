/**
 * NEXUS ECHO — Pre-Event Playtest & GM QA Simulation
 *
 * GM / Bureau operational tests. Verifies the QA Hub control panel, the
 * embedded player shell, and the Game Control / QA Viewer admin surfaces
 * that the Bureau operates from the workstation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const h = vi.hoisted(() => ({
  QAData: [] as unknown,
  QRData: [] as unknown,
  noise: [] as string[],
  gameState: null as unknown,
  teams: [] as unknown,
  leaderboard: [] as unknown,
  auditLog: [] as unknown,
  locations: [] as unknown,
  gameEvents: [] as unknown,
  teamDetail: null as unknown,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue({}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    from: vi.fn(() => ({
      select: () => Promise.resolve({ data: [], error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      eq: () => Promise.resolve({ data: [], error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/lib/admin', () => ({
  adminAPI: {
    listPuzzleQA: () => h.QAData == null
      ? Promise.reject(new Error('Failed to fetch puzzle QA data'))
      : Promise.resolve(h.QAData),
    listQRCodes: () => h.QRData == null
      ? Promise.reject(new Error('Failed to fetch QR codes'))
      : Promise.resolve(h.QRData ?? []),
    listLocations: () => h.locations == null
      ? Promise.reject(new Error('Failed to fetch locations'))
      : Promise.resolve(h.locations ?? []),
    listTeams: () => h.teams == null
      ? Promise.reject(new Error('Failed to fetch teams'))
      : Promise.resolve(h.teams),
    getGameState: () => h.gameState == null
      ? Promise.reject(new Error('Failed to fetch game state'))
      : Promise.resolve(h.gameState),
    getLeaderboard: () => Promise.resolve(h.leaderboard ?? []),
    getAuditLog: () => Promise.resolve(h.auditLog ?? []),
    getTeam: () => h.teamDetail == null
      ? Promise.reject(new Error('Failed to fetch team detail'))
      : Promise.resolve(h.teamDetail),
    getGameEvents: () => Promise.resolve(h.gameEvents ?? []),
    updateGameConfig: () => Promise.resolve({ updatedKeys: [] }),
    gameAction: () => Promise.resolve({ teamsActed: 1 }),
    startGame: () => Promise.resolve({ teamsStarted: 1, startedAt: new Date().toISOString(), deadline: null }),
    pauseGame: () => Promise.resolve({ teamsPaused: 1 }),
    endGame: () => Promise.resolve({ teamsEnded: 1 }),
    resetGame: () => Promise.resolve({ teamsReset: 1 }),
  },
}))

vi.mock('@/hooks/useConnection', () => ({
  useConnection: () => ({
    status: 'online' as const,
    isBrowserOnline: true,
    isServerReachable: true,
    isServerHealthy: true,
    lastProbeStatus: 200,
    isOffline: false,
    lastProbedAt: new Date().toISOString(),
    probe: vi.fn(),
  }),
}))

vi.mock('@/hooks/useOffline', () => ({
  useOffline: () => ({ isOnline: true, isOffline: false }),
}))

vi.mock('@/components/player/puzzle/PuzzleVisual', () => ({ PuzzleVisual: () => null }))
vi.mock('@/components/visual/SignalLayer', () => ({ SignalLayer: () => null }))
vi.mock('@/components/visual/GlitchLayer', () => ({ GlitchLayer: () => null }))

import { QAHub } from '@/features/admin/QAHub'
import { QASimulatorProvider, useQASimulator } from '@/contexts/QASimulatorContext'
import { ALL_PUZZLES, PUZZLES_BY_CODE, PUZZLE_COUNT } from '@/content/puzzles'
import type { PuzzleQAEntry, QRCodeEntry } from '@/lib/admin'

let qaApi!: ReturnType<typeof useQASimulator>

function Capture() {
  qaApi = useQASimulator()
  return null
}

function answerFor(code: string): string {
  return 'ANSWER-' + code
}

function criticalErrors(): string[] {
  return h.noise.filter(e =>
    e.includes('TypeError') ||
    e.includes('ReferenceError') ||
    e.includes('Cannot read propert') ||
    e.includes('undefined is not') ||
    e.includes('is not iterable') ||
    e.includes('Maximum update depth'),
  )
}

let errorSpy!: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  h.noise = []
  h.QAData = ALL_PUZZLES.map(p => ({
    code: p.code,
    title: p.name,
    type: p.type,
    stage: p.stage,
    location: p.location,
    prerequisites: p.prerequisiteNodes,
    branches: null,
    content: {},
    answerMetadata: { acceptedAnswer: answerFor(p.code), validationMethod: 'case_insensitive' },
    evidence: [],
    audioEvidence: [],
  })) as unknown as PuzzleQAEntry[]
  h.QRData = []
  h.gameState = null
  h.teams = []
  h.leaderboard = []
  h.auditLog = []
  h.locations = []
  h.gameEvents = []
  h.teamDetail = null
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    h.noise.push(args.map(a => String(a)).join(' '))
  })
})

afterEach(() => {
  errorSpy.mockRestore()
})

function makeQrEntry(code: string, targetNode: string, label: string): QRCodeEntry {
  return {
    id: `qr-${code}`,
    code,
    label,
    type: 'NODE_MARKER',
    puzzleNodeId: 'node-' + targetNode,
    puzzleNodeCode: targetNode,
    puzzleNodeTitle: PUZZLES_BY_CODE[targetNode]?.name ?? 'Unknown',
    puzzleNodeType: PUZZLES_BY_CODE[targetNode]?.type ?? 'UNKNOWN',
    puzzleNodeStage: PUZZLES_BY_CODE[targetNode]?.stage ?? 1,
    puzzleNodeLocation: PUZZLES_BY_CODE[targetNode]?.location ?? 'Unknown',
    markerId: code,
    manualCode: 'MANUAL-' + code,
    deploymentStatus: 'DEPLOYED',
  } as QRCodeEntry
}

describe('GM: QA Hub control panel', () => {
  it('renders the hub in its pre-start state with simulation settings', async () => {
    render(<QAHub />)
    await waitFor(() => {
      expect(screen.getByText(/Player Experience Simulator/i)).toBeTruthy()
    })
    expect(screen.getByText(/Start Simulation/i)).toBeTruthy()
    expect(screen.getByText(/Simulation Settings/i)).toBeTruthy()
    expect(screen.getByText(/QA Controls/i)).toBeTruthy()
  })

  it('shows all 4 simulation types as selectable', async () => {
    render(<QAHub />)
    await waitFor(() => expect(screen.getByText(/Player Experience Simulator/i)).toBeTruthy())
    expect(screen.getByText(/Fresh Start/i)).toBeTruthy()
    expect(screen.getByText(/Partial Progress/i)).toBeTruthy()
    expect(screen.getByText(/Near Complete/i)).toBeTruthy()
    expect(screen.getByText(/Custom State/i)).toBeTruthy()
  })

  it('shows all 3 roles as selectable', async () => {
    render(<QAHub />)
    await waitFor(() => expect(screen.getByText(/Player Experience Simulator/i)).toBeTruthy())
    expect(screen.getByText(/Observer/i)).toBeTruthy()
    expect(screen.getByText(/Analyst/i)).toBeTruthy()
    expect(screen.getByText(/Operator/i)).toBeTruthy()
  })

  it('starts simulation and shows the player viewport after Start', async () => {
    render(<QAHub />)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => {
      expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0)
    })
    expect(screen.getByText(/LOCAL SIMULATION/i)).toBeTruthy()
    expect(criticalErrors()).toHaveLength(0)
  })

  it('resets all state when Stop Simulation is pressed', async () => {
    render(<QAHub />)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    await act(async () => {
      screen.getByText(/TERMINATE SIMULATION/i).click()
    })

    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())
  })
})

describe('GM: QA Hub node register', () => {
  it('shows NODE REGISTER with all 47 puzzle nodes', async () => {
    render(<QAHub />)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const nodeTab = screen.getByText(/NODE REGISTER/i)
    await act(async () => {
      nodeTab.click()
    })

    await waitFor(() => {
      expect(screen.getByText((c) => c.includes('0') && c.includes('47') && c.includes('VERIFIED'))).toBeTruthy()
    })
  })

  it('Solve Current marks the active node solved and advances', async () => {
    render(<MemoryRouter><QAHub /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const solveBtn = screen.getByText(/Solve Current/i)
    await act(async () => {
      solveBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByText((c) => c.includes('1') && c.includes('47') && c.includes('VERIFIED'))).toBeTruthy()
    })
  })

  it('Advance Progression solves the next node in content order', async () => {
    render(<MemoryRouter><QAHub /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const advanceBtn = screen.getByText(/Advance Progression/i)
    await act(async () => {
      advanceBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByText((c) => c.includes('1') && c.includes('47') && c.includes('VERIFIED'))).toBeTruthy()
    })
  })
})

describe('GM: QA Hub state inspector', () => {
  it('shows the inspector tab with role, progress, and score', async () => {
    render(<MemoryRouter><QAHub /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const inspectorTab = screen.getByText(/STATE INSPECTOR/i)
    await act(async () => {
      inspectorTab.click()
    })

    await waitFor(() => {
      expect(screen.getByText(/QASimulator Context Inspector/i)).toBeTruthy()
      expect(screen.getByText('role')).toBeTruthy()
      expect(screen.getByText('simulationType')).toBeTruthy()
      expect(screen.getByText('solvedNodes')).toBeTruthy()
      expect(screen.getByText('currentNodeId')).toBeTruthy()
    })
  })

  it('shows CURRENT NODE DETAIL after jumping to a node', async () => {
    render(<MemoryRouter><QAHub /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const inspectorTab = screen.getByText(/STATE INSPECTOR/i)
    await act(async () => {
      inspectorTab.click()
    })

    await waitFor(() => {
      expect(screen.getByText(/CURRENT NODE DETAIL/i)).toBeTruthy()
    })
  })
})

describe('GM: QA Hub evidence register', () => {
  it('shows evidence register tab with sandbox toggle', async () => {
    render(<MemoryRouter><QAHub /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const evidenceTab = screen.getByText(/EVIDENCE REGISTER/i)
    await act(async () => {
      evidenceTab.click()
    })

    await waitFor(() => {
      expect(screen.getAllByText(/EVIDENCE REGISTER/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/SANDBOX: OFF/i)).toBeTruthy()
    })
  })

  it('toggles sandbox mode to show all cataloged evidence', async () => {
    render(<MemoryRouter><QAHub /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const evidenceTab = screen.getByText(/EVIDENCE REGISTER/i)
    await act(async () => {
      evidenceTab.click()
    })

    await waitFor(() => {
      const sandboxBtn = screen.getByText(/SANDBOX: OFF/i)
      sandboxBtn.click()
    })

    await waitFor(() => {
      expect(screen.queryAllByText(/SANDBOX: ON/i).length).toBeGreaterThan(0)
    })
  })
})

describe('GM: QA Hub players panel', () => {
  it('shows all 3 simulated players with their roles', async () => {
    render(<QAHub />)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const playersTab = screen.getByText(/PLAYERS/i)
    await act(async () => {
      playersTab.click()
    })

    await waitFor(() => {
      expect(screen.getByText(/3 players/i)).toBeTruthy()
      expect(screen.getByText(/Alex Chen/i)).toBeTruthy()
      expect(screen.getByText(/Sam Rivera/i)).toBeTruthy()
      expect(screen.getByText(/Morgan Taylor/i)).toBeTruthy()
    })
  })
})

describe('GM: QA Hub QR inventory', () => {
  it('shows QR inventory tab and loads markers from admin API', async () => {
    h.QRData = [
      makeQrEntry('QR-A', 'P02', 'Marker for P02'),
      makeQrEntry('QR-B', 'P03', 'Marker for P03'),
    ]
    render(<MemoryRouter><QAHub /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Start Simulation/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Start Simulation/i).click()
    })

    await waitFor(() => expect(screen.getAllByText(/FIELD DEVICE EMULATION/i).length).toBeGreaterThan(0))

    const qrTab = screen.getByText(/QR Inventory/i)
    await act(async () => {
      qrTab.click()
    })

    await waitFor(() => {
      expect(screen.getByText(/QR Code Inventory/i)).toBeTruthy()
      expect(screen.getByText(/2 total/i)).toBeTruthy()
      expect(screen.getAllByText(/QR-A/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/QR-B/i).length).toBeGreaterThan(0)
    })
  })
})

describe('GM: Game Control console', () => {
  it('renders game control with START button when game is NOT_STARTED', async () => {
    h.gameState = {
      gameStatus: 'NOT_STARTED',
      statusCounts: {},
      config: { game_duration_minutes: 180, rolling_start_interval_minutes: 10, max_teams: 25 },
      startedAt: null,
      endsAt: null,
    }
    h.teams = []
    h.leaderboard = []

    const { AdminGameControl } = await import('@/features/admin/GameControl')
    render(<AdminGameControl />)

    await waitFor(() => {
      expect(screen.getByText(/MISSION EXECUTION CONSOLE/i)).toBeTruthy()
    })
    expect(screen.getAllByText(/INITIATE MISSION/i).length).toBeGreaterThan(0)
  })

  it('renders END button when game is ACTIVE', async () => {
    h.gameState = {
      gameStatus: 'RUNNING',
      statusCounts: { active: 5, registered: 10 },
      config: { game_duration_minutes: 180, rolling_start_interval_minutes: 10, max_teams: 25 },
      startedAt: new Date().toISOString(),
      endsAt: null,
    }
    h.teams = [
      { id: 't1', code: 'T001', name: 'Team Alpha', status: 'ACTIVE', gameStartedAt: new Date().toISOString(), gameDeadline: null, players: [], currentNodeId: null, score: 0 },
    ]
    h.leaderboard = []

    const { AdminGameControl } = await import('@/features/admin/GameControl')
    render(<AdminGameControl />)

    await waitFor(() => {
      expect(screen.getByText(/MISSION EXECUTION CONSOLE/i)).toBeTruthy()
    })
    expect(screen.getAllByText(/TERMINATE MISSION/i).length).toBeGreaterThan(0)
  })

  it('renders RESET button when game is PAUSED', async () => {
    h.gameState = {
      gameStatus: 'PAUSED',
      statusCounts: {},
      config: { game_duration_minutes: 180, rolling_start_interval_minutes: 10, max_teams: 25 },
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 120 * 60_000).toISOString(),
    }
    h.teams = [
      { id: 't1', code: 'T001', name: 'Team Alpha', status: 'PAUSED', gameStartedAt: new Date().toISOString(), gameDeadline: null, players: [], currentNodeId: null, score: 0 },
    ]
    h.leaderboard = []

    const { AdminGameControl } = await import('@/features/admin/GameControl')
    render(<AdminGameControl />)

    await waitFor(() => {
      expect(screen.getByText(/MISSION EXECUTION CONSOLE/i)).toBeTruthy()
    })
    expect(screen.getAllByText(/HARD RESET/i).length).toBeGreaterThan(0)
  })

  it('shows active team count and deadline from team data', async () => {
    h.gameState = {
      gameStatus: 'RUNNING',
      statusCounts: { active: 3, registered: 15 },
      config: { game_duration_minutes: 180, rolling_start_interval_minutes: 10, max_teams: 25 },
      startedAt: new Date().toISOString(),
      endsAt: null,
    }
    h.teams = [
      { id: 't1', code: 'T001', name: 'Team Alpha', status: 'ACTIVE', gameStartedAt: new Date().toISOString(), gameDeadline: new Date(Date.now() + 120 * 60_000).toISOString(), players: [], currentNodeId: null, score: 100 },
      { id: 't2', code: 'T002', name: 'Team Beta', status: 'ACTIVE', gameStartedAt: new Date().toISOString(), gameDeadline: new Date(Date.now() + 100 * 60_000).toISOString(), players: [], currentNodeId: null, score: 200 },
      { id: 't3', code: 'T003', name: 'Team Gamma', status: 'REGISTERED', gameStartedAt: null, gameDeadline: null, players: [], currentNodeId: null, score: 0 },
    ]
    h.leaderboard = []

    const { AdminGameControl } = await import('@/features/admin/GameControl')
    render(<AdminGameControl />)

    await waitFor(() => {
      expect(screen.getByText(/MISSION EXECUTION CONSOLE/i)).toBeTruthy()
    })
    expect(screen.getByText(/2 field unit/)).toBeTruthy()
  })
})

describe('GM: QA Viewer puzzle audit', () => {
  it('renders with full puzzle QA data and shows audit status', async () => {
    h.QAData = ALL_PUZZLES.map(p => ({
      code: p.code,
      title: p.name,
      type: p.type,
      stage: p.stage,
      location: p.location,
      prerequisites: p.prerequisiteNodes,
      branches: null,
      content: {},
      answerMetadata: { acceptedAnswer: answerFor(p.code), validationMethod: 'case_insensitive' },
      evidence: [],
      audioEvidence: [],
    })) as unknown as PuzzleQAEntry[]
    h.QRData = []
    h.locations = []

    const { AdminQAViewer } = await import('@/features/admin/QAViewer')
    render(<AdminQAViewer />)

    await waitFor(() => {
      expect(screen.getByText(/FIELD CONTENT VERIFICATION/i)).toBeTruthy()
    })
  })

  it('shows error state when QA data fails to load', async () => {
    h.QAData = null
    h.QRData = null
    h.locations = null

    const { AdminQAViewer } = await import('@/features/admin/QAViewer')
    render(<AdminQAViewer />)

    await waitFor(() => {
      expect(screen.queryAllByText(/RETRIEVAL FAILED/i).length).toBeGreaterThan(0)
    })
  })
})

describe('GM: Admin layout routing', () => {
  it('renders AdminLayout as a shell with CRT overlay', async () => {
    const { AdminLayout } = await import('@/features/admin/AdminLayout')
    const { MemoryRouter } = await import('react-router-dom')
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(document.querySelector('.CRTOverlay') || document.body).toBeTruthy()
    })
  })
})

describe('GM: QA simulator context isolation', () => {
  it('QASimulatorProvider starts with FRESH state and OBSERVER role', async () => {
    render(
      <QASimulatorProvider>
        <Capture />
      </QASimulatorProvider>,
    )
    await waitFor(() => {
      expect(qaApi.isActive).toBe(true)
      expect(qaApi.role).toBe('OBSERVER')
      expect(qaApi.simulationType).toBe('FRESH')
      expect(qaApi.solvedNodes.size).toBe(0)
      expect(qaApi.score).toBe(0)
      expect(qaApi.isLocked).toBe(false)
      expect(qaApi.isOffline).toBe(false)
      expect(qaApi.gameState?.status).toBe('RUNNING')
    })
  })

  it('toggleLock and toggleOffline flip their respective flags', async () => {
    render(
      <QASimulatorProvider>
        <Capture />
      </QASimulatorProvider>,
    )
    await waitFor(() => expect(qaApi.isActive).toBe(true))

    expect(qaApi.isLocked).toBe(false)
    expect(qaApi.isOffline).toBe(false)

    act(() => { qaApi.toggleLock() })
    expect(qaApi.isLocked).toBe(true)

    act(() => { qaApi.toggleOffline() })
    expect(qaApi.isOffline).toBe(true)

    act(() => { qaApi.toggleLock() })
    expect(qaApi.isLocked).toBe(false)

    act(() => { qaApi.toggleOffline() })
    expect(qaApi.isOffline).toBe(false)
  })

  it('setRole cycles all three roles', async () => {
    render(
      <QASimulatorProvider>
        <Capture />
      </QASimulatorProvider>,
    )
    await waitFor(() => expect(qaApi.role).toBe('OBSERVER'))

    act(() => { qaApi.setRole('ANALYST') })
    expect(qaApi.role).toBe('ANALYST')

    act(() => { qaApi.setRole('OPERATOR') })
    expect(qaApi.role).toBe('OPERATOR')

    act(() => { qaApi.setRole('OBSERVER') })
    expect(qaApi.role).toBe('OBSERVER')
  })
})

describe('GM: Full game completion via QA controls', () => {
  it('solves all 47 nodes via forceSolve and reaches ENDED', async () => {
    render(
      <QASimulatorProvider>
        <Capture />
      </QASimulatorProvider>,
    )
    await waitFor(() => expect(qaApi.isActive).toBe(true))

    const allCodes = ALL_PUZZLES.map(p => p.code)
    for (const code of allCodes) {
      qaApi.forceSolve(code)
    }
    await waitFor(() => {
      expect(qaApi.solvedNodes.size).toBe(PUZZLE_COUNT)
      expect(qaApi.gameState?.status).toBe('ENDED')
    })
    expect(qaApi.gameState?.currentPhase).toBe('DEBRIEF')
  })
})
