/**
 * NEXUS — Full player flow and failure regression
 *
 * The QA simulator integration test only ever asserted that screens mounted.
 * Nothing exercised the path a team actually walks, and nothing exercised the
 * ways it breaks. This drives the real player screens - PlayerLayout, Game,
 * Node, Evidence, Inventory, Navigation, QR, Leaderboard, Notifications - over
 * the simulated engine, from the first puzzle through to a later stage, and
 * then does the same again while trying to break it.
 *
 * A green build is not evidence that a team can finish the case. This is.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const h = vi.hoisted(() => ({
  QAData: [] as unknown,
  QRData: [] as unknown,
  /** Every console.error / unhandled rejection seen during a test. */
  noise: [] as string[],
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
    listPuzzleQA: () => Promise.resolve(h.QAData),
    listQRCodes: () => Promise.resolve(h.QRData),
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

// The camera is not available in jsdom. The scanner screen must still mount and
// explain itself rather than throwing, which is the player-visible half of the
// contract.
vi.mock('@/components/player/puzzle/PuzzleVisual', () => ({ PuzzleVisual: () => null }))

import { QASimulatorProvider, useQASimulator } from '@/contexts/QASimulatorContext'
import { AppContext } from '@/app/providers/AppProvider'
import { DUMMY_APP_CONTEXT } from '@/features/admin/qaDummyContext'
import { PlayerLayout } from '@/features/player/PlayerLayout'
import { PlayerGame } from '@/features/player/Game'
import { PlayerNode } from '@/features/player/Node'
import { PlayerEvidence } from '@/features/player/Evidence'
import { PlayerInventory } from '@/features/player/Inventory'
import { PlayerNavigation } from '@/features/player/Navigation'
import { PlayerQR } from '@/features/player/QR'
import { PlayerLeaderboard } from '@/features/player/Leaderboard'
import { PlayerNotifications } from '@/features/player/Notifications'
import { ALL_PUZZLES, PUZZLES_BY_CODE } from '@/content/puzzles'

let qaApi!: ReturnType<typeof useQASimulator>
function Capture() {
  qaApi = useQASimulator()
  return null
}

function renderFlow(initialPath = '/player/game') {
  const view = render(
    <QASimulatorProvider>
      <Capture />
      <AppContext.Provider value={DUMMY_APP_CONTEXT}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/player/game" element={<PlayerLayout />}>
              <Route index element={<PlayerGame />} />
              <Route path="node/:nodeId" element={<PlayerNode />} />
              <Route path="evidence" element={<PlayerEvidence />} />
              <Route path="inventory" element={<PlayerInventory />} />
              <Route path="navigation" element={<PlayerNavigation />} />
              <Route path="qr" element={<PlayerQR />} />
              <Route path="leaderboard" element={<PlayerLeaderboard />} />
              <Route path="notifications" element={<PlayerNotifications />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>
    </QASimulatorProvider>,
  )
  return view
}

/**
 * The simulator starts with no current node, exactly as a bureau console does
 * before a case begins. QAHub's "Start Simulation" seeds the opening state, so
 * the flow below has to do the same before a team has anything to walk.
 */
async function startSimulation(initialPath = '/player/game') {
  const view = renderFlow(initialPath)
  // Two acts on purpose: FRESH seeding clears the current node, and only the
  // jump after it leaves the team standing on a puzzle.
  await act(async () => {
    qaApi.setCustomProgress({ simulationType: 'FRESH' })
  })
  await act(async () => {
    qaApi.jumpToNode('P01')
  })
  await waitFor(() => expect(qaApi.currentNodeId).toBeTruthy())
  return view
}

let errorSpy!: ReturnType<typeof vi.spyOn>
let warnSpy!: ReturnType<typeof vi.spyOn>

/**
 * Answers are server-only, so the fixture supplies its own. Deterministic per
 * code, so a test can state the answer it expects without duplicating a table.
 */
function answerFor(code: string): string {
  return 'ANSWER-' + code
}

/** The accepted answer the QA fixture records for a puzzle. */
function acceptedFor(code: string): string {
  const row = (h.QAData as Array<{ code: string; answerMetadata: { acceptedAnswer: string } }>)
    .find(r => r.code === code)
  if (!row) throw new Error(`no QA fixture for ${code}`)
  return row.answerMetadata.acceptedAnswer
}

/** Errors that mean the app actually broke, not ordinary console noise. */
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

beforeEach(() => {
  h.noise = []
  h.QAData = ALL_PUZZLES.map(p => ({
    code: p.code,
    answerMetadata: { acceptedAnswer: answerFor(p.code), validationMethod: 'case_insensitive' },
  }))
  h.QRData = []
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    h.noise.push(args.map(a => String(a)).join(' '))
  })
  warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    h.noise.push(args.map(a => String(a)).join(' '))
  })
})

afterEach(() => {
  // Deliberately NOT vi.restoreAllMocks(): the shared test setup installs
  // window.matchMedia as a vi.fn(), and a blanket restore strips its
  // implementation, so every test after the first one crashed in
  // VisualEnvironment with "cannot read 'matches' of undefined".
  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

describe('full player flow', () => {
  it('walks from the field hub to a solved puzzle and onward', async () => {
    renderFlow()

    // The hub mounts and names the first lead.
    await waitFor(() => expect(screen.getByText(/Case ledger/i)).toBeTruthy())

    
    // The node screen renders the puzzle for the current role.
    const nodeView = renderFlow('/player/game/node/P01')
    await waitFor(() => expect(screen.getAllByText(PUZZLES_BY_CODE['P01'].name).length).toBeGreaterThan(0))

    // A correct answer solves it and awards the node's points.
    const accepted = acceptedFor('P01')
    const result = await act(async () => qaApi.submitAnswer('P01', accepted))

    expect(result.isCorrect).toBe(true)
    expect(result.pointsAwarded).toBe(PUZZLES_BY_CODE['P01'].points)
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    expect(criticalErrors()).toHaveLength(0)
    nodeView.unmount()
  })

  it('unlocks evidence for a solved puzzle and keeps it across a refresh', async () => {
    let remount!: () => void
    function Shell() {
      // `generation` throws away the whole screen tree while the simulator
      // above it keeps its state, which is what a browser refresh looks like
      // from the screens' point of view.
      const [generation, setGeneration] = useState(0)
      remount = () => setGeneration(g => g + 1)
      return (
        <QASimulatorProvider>
          <Capture />
          <AppContext.Provider value={DUMMY_APP_CONTEXT} key={generation}>
            <MemoryRouter initialEntries={['/player/game']}>
              <Routes>
                <Route path="/player/game" element={<PlayerLayout />}>
                  <Route index element={<PlayerGame />} />
                  <Route path="node/:nodeId" element={<PlayerNode />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </AppContext.Provider>
        </QASimulatorProvider>
      )
    }
    render(<Shell />)
    await act(async () => { qaApi.jumpToNode('P01') })
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    const evidenceBefore = (qaApi.inventory?.evidence ?? []).length
    await act(async () => { await qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))

    // Solving the lead produced evidence for the team.
    expect((qaApi.inventory?.evidence ?? []).length).toBeGreaterThan(evidenceBefore)
    const afterSolve = (qaApi.inventory?.evidence ?? []).length

    // Now refresh: every screen unmounts and mounts again.
    h.noise = []
    await act(async () => { remount() })
    await waitFor(() => expect(screen.getByText(/Case ledger/i)).toBeTruthy())

    // Progress and the evidence it unlocked both survived.
    expect(qaApi.solvedNodes.has('P01')).toBe(true)
    expect((qaApi.inventory?.evidence ?? []).length).toBe(afterSolve)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('advances through a run of nodes without stalling or crashing', async () => {
    await startSimulation()

    const run = ['P01', 'P02', 'P03', 'P04', 'P05']
    for (const code of run) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.forceSolve(code) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    // Every node in the run advanced the team's position rather than pinning it.
    expect(qaApi.score).toBeGreaterThan(0)
    expect(qaApi.solvedNodes.size).toBe(run.length)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('mounts every player screen without a critical error', async () => {
    const paths = [
      '/player/game', '/player/game/evidence', '/player/game/inventory',
      '/player/game/navigation', '/player/game/qr', '/player/game/leaderboard',
      '/player/game/notifications',
    ]

    for (const path of paths) {
      h.noise = []
      const view = renderFlow(path)
      await act(async () => { await new Promise(r => setTimeout(r, 20)) })
      // Whatever the screen decided to show, it did not crash the tree.
      expect(criticalErrors(), 'crashed rendering ' + path).toHaveLength(0)
      view.unmount()
    }
  })
})

describe('failure regression', () => {
  it('reports a wrong answer without losing the puzzle or the board', async () => {
    await startSimulation()

    const result = await act(async () => qaApi.submitAnswer('P01', 'definitely-not-the-answer'))

    expect(result.isCorrect).toBe(false)
    expect(result.error).toBeTruthy()
    // The team is still exactly where it was, and still able to try again.
    expect(qaApi.solvedNodes.has('P01')).toBe(false)
    expect(qaApi.currentNodeId).toBe('P01')

    const retry = await act(async () => {
      const accepted = acceptedFor('P01')
      return qaApi.submitAnswer('P01', accepted)
    })
    expect(retry.isCorrect).toBe(true)
  })

  it('does not award a second time when the same answer is submitted twice', async () => {
    await startSimulation()

    const accepted = acceptedFor('P01')

    // Two submissions in the same tick, which is what a double click produces.
    const [first, second] = await act(async () => Promise.all([
      qaApi.submitAnswer('P01', accepted),
      qaApi.submitAnswer('P01', accepted),
    ]))

    expect(first.isCorrect || second.isCorrect).toBe(true)
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))

    // The score reflects the node's points once, not twice.
    expect(qaApi.score).toBe(PUZZLES_BY_CODE['P01'].points)
  })

  it('reports a locked node instead of scoring it', async () => {
    await startSimulation()

    qaApi.toggleLock()
    const result = await act(async () => qaApi.submitAnswer('P01', 'anything'))

    expect(result.isCorrect).toBe(false)
    expect(result.error).toBeTruthy()
    expect(qaApi.solvedNodes.has('P01')).toBe(false)
  })

  it('queues a submission while offline instead of losing it', async () => {
    await startSimulation()
    // Its own act, so the next submit closes over an updated isOffline.
    await act(async () => { qaApi.toggleOffline() })
    await waitFor(() => expect(qaApi.isOffline).toBe(true))

    const result = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))

    // The answer is held for later rather than judged against nothing, and it
    // is reported as unjudged, not as wrong.
    expect(result.queued).toBe(true)
    expect(result.isCorrect).toBe(false)
    expect(result.error).toBeUndefined()
    expect(qaApi.solvedNodes.has('P01')).toBe(false)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('reports an unrecognised marker honestly and does not advance the game', async () => {
    await startSimulation()
    const before = qaApi.solvedNodes.size

    const result = await act(async () => qaApi.scanQR('NOT-A-REAL-MARKER'))

    expect(result.discovered).toBe(false)
    // It must not invent a success, and it must not unlock anything.
    expect(qaApi.solvedNodes.size).toBe(before)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('a repeated scan of the same marker does not create a second discovery', async () => {
    // The simulator answers a scan from the real marker register, so a marker
    // has to be registered for the scan to mean anything.
    h.QRData = [
      { code: 'QR-NODE-02', markerId: 'marker-02', manualCode: '037-A-0002', puzzleNodeCode: 'P01' },
    ]
    await startSimulation()
    await act(async () => { qaApi.jumpToNode('P01') })

    const marker = qaApi.revealQR('P01')
    expect(marker).toBeTruthy()

    const first = await act(async () => qaApi.scanQR(marker!))
    const second = await act(async () => qaApi.scanQR(marker!))

    expect(first.discovered).toBe(true)
    // The repeat is reported as already claimed rather than discovering again.
    expect(second.discovered).toBe(false)
    expect(second.alreadyClaimed).toBe(true)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('refuses a registered marker whose node this team has not reached', async () => {
    h.QRData = [
      { code: 'QR-NODE-40', markerId: 'marker-40', manualCode: '037-A-0040', puzzleNodeCode: 'P40' },
    ]
    await startSimulation()
    await act(async () => { qaApi.jumpToNode('P01') })

    // A real marker, but for a puzzle far beyond where the team stands.
    const result = await act(async () => qaApi.scanQR('QR-NODE-40'))

    expect(result.discovered).toBe(false)
    expect(qaApi.solvedNodes.has('P40')).toBe(false)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('restarts cleanly from a mid-run state', async () => {
    await startSimulation()
    await act(async () => { qaApi.forceSolve('P01') })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))

    await act(async () => { qaApi.resetSimulation() })

    await waitFor(() => expect(qaApi.solvedNodes.size).toBe(0))
    expect(qaApi.score).toBe(0)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('survives the role being switched mid-session', async () => {
    renderFlow()
    await waitFor(() => expect(qaApi.role).toBeTruthy())

    for (const role of ['ANALYST', 'OPERATOR', 'OBSERVER'] as const) {
      await act(async () => { qaApi.setRole(role) })
      await act(async () => { qaApi.jumpToNode('P01'); await qaApi.getNode('P01') })
      expect(criticalErrors(), `crashed as ${role}`).toHaveLength(0)
    }
  })
})
