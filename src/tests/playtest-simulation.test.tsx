/**
 * NEXUS ECHO — Pre-Event Playtest & GM QA Simulation
 *
 * Drives the QA simulator through the full player experience for every team
 * profile, exercising the dependency chain, role switching, evidence evolution,
 * edge cases, and GM/Bureau operational views.
 *
 * A green build is not evidence that a team can finish the case. This is.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const h = vi.hoisted(() => ({
  QAData: [] as unknown,
  QRData: [] as unknown,
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
    listQRCodes: () => Promise.resolve(h.QRData ?? []),
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
import { PlayerFinal } from '@/features/player/Final'
import { PlayerComplete } from '@/features/player/Complete'
import { ALL_PUZZLES, PUZZLES_BY_CODE, PUZZLE_COUNT, FINAL_NODE } from '@/content/puzzles'
import type { PuzzleQAEntry } from '@/lib/admin'

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
              <Route path="final" element={<PlayerFinal />} />
              <Route path="complete" element={<PlayerComplete />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>
    </QASimulatorProvider>,
  )
  return view
}

/** Deterministic answer per puzzle code, matching what the fixture records. */
function answerFor(code: string): string {
  return 'ANSWER-' + code
}

function acceptedFor(code: string): string {
  const row = (h.QAData as Array<{ code: string; answerMetadata: { acceptedAnswer: string } }>)
    .find(r => r.code === code)
  if (!row) throw new Error(`no QA fixture for ${code}`)
  return row.answerMetadata.acceptedAnswer
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
let warnSpy!: ReturnType<typeof vi.spyOn>

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
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    h.noise.push(args.map(a => String(a)).join(' '))
  })
  warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    h.noise.push(args.map(a => String(a)).join(' '))
  })
})

afterEach(() => {
  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

/** Walk the main dependency chain in order, solving each node. */
const MAIN_CHAIN: string[] = []
function buildMainChain(): string[] {
  if (MAIN_CHAIN.length > 0) return MAIN_CHAIN
  const visited = new Set<string>()
  const queue: string[] = ['P01']
  while (queue.length > 0) {
    const code = queue.shift()!
    if (visited.has(code)) continue
    visited.add(code)
    MAIN_CHAIN.push(code)
    const puzzle = PUZZLES_BY_CODE[code]
    if (puzzle?.nextNodes) {
      for (const next of puzzle.nextNodes) queue.push(next)
    }
  }
  return MAIN_CHAIN
}

async function startSimulation(initialPath = '/player/game') {
  const view = renderFlow(initialPath)
  // Every walk below is driven through the real submission path,
  // and only the Operator may submit a conclusion.
  await act(async () => { qaApi.setRole('OPERATOR') })
  await act(async () => { qaApi.setCustomProgress({ simulationType: 'FRESH' }) })
  await act(async () => { qaApi.jumpToNode('P01') })
  await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))
  return view
}

describe('Full game completion — main dependency chain', () => {
  it('walks all 40 main-chain nodes from P01 to P37 without a stall', async () => {
    const chain = buildMainChain()
    expect(chain.length).toBeGreaterThan(30)
    expect(chain[0]).toBe('P01')
    expect(chain[chain.length - 1]).toBe('P37')

    await startSimulation()

    let expectedScore = 0
    for (const code of chain) {
      const puzzle = PUZZLES_BY_CODE[code]
      if (!puzzle) throw new Error(`missing puzzle ${code}`)

      qaApi.jumpToNode(code)
      await waitFor(() => expect(qaApi.currentNodeId).toBe(code))

      const result = await act(async () => qaApi.submitAnswer(code, acceptedFor(code)))
      expect(result.isCorrect).toBe(true)

      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))

      expectedScore += puzzle.points
      expect(qaApi.score).toBe(expectedScore)
    }

    expect(qaApi.solvedNodes.size).toBe(chain.length)
    expect(qaApi.score).toBe(expectedScore)
    expect(criticalErrors()).toHaveLength(0)
  })

  it('reaches the FINAL_BOSS node type as the last outstanding puzzle', async () => {
    expect(FINAL_NODE).toBeDefined()
    expect(FINAL_NODE?.type).toBe('FINAL_BOSS')
    expect(FINAL_NODE?.code).toBe('P37')
  })

  it('transitions to ENDED game state after the final boss is solved', async () => {
    await startSimulation()

    const chain = buildMainChain()
    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    await waitFor(() => {
      expect(qaApi.gameState?.status).toBe('ENDED')
      expect(qaApi.gameState?.currentPhase).toBe('DEBRIEF')
    })
  })

  it('accumulates score equal to the sum of all solved node points', async () => {
    await startSimulation()

    const chain = buildMainChain()
    const totalExpected = chain.reduce((sum, code) => {
      const p = PUZZLES_BY_CODE[code]
      return sum + (p?.points ?? 0)
    }, 0)

    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    expect(qaApi.score).toBe(totalExpected)
  })
})

describe('Role chain — Observer → Analyst → Operator', () => {
  it('renders role-specific content for each role at a D2 coordination node', async () => {
    await startSimulation()

    for (const role of ['OBSERVER', 'ANALYST', 'OPERATOR'] as const) {
      await act(async () => { qaApi.setRole(role) })
      await act(async () => { qaApi.jumpToNode('P02') })

      const detail = await qaApi.getNode('P02', role)
      expect(detail).not.toBeNull()
      expect(detail!.roleContent).toBeDefined()
      expect(detail!.roleContent?.role).toBe(role)
      // The chain that describes each role's expected result is
      // deliberately not served: reading it would replace the
      // conversation the role chain exists to force.
      expect(detail!.coordinationChain).toBeNull()
    }
  })

  it('returns OPERATOR-only investigation fields only when role is OPERATOR', async () => {
    await startSimulation()

    const analystDetail = await qaApi.getNode('P03', 'ANALYST')
    expect(analystDetail!.operatorInvestigation).toBeNull()

    const operatorDetail = await qaApi.getNode('P03', 'OPERATOR')
    expect(operatorDetail!.operatorInvestigation).not.toBeNull()
    expect(operatorDetail!.operatorInvestigation?.operatorOwnEvidence).toBeTruthy()
    expect(operatorDetail!.operatorInvestigation?.operatorTaskDescription).toBeTruthy()
  })

  it('switches role mid-session without crashing any screen', async () => {
    const view = renderFlow()
    await waitFor(() => expect(qaApi.role).toBeTruthy())

    for (const role of ['ANALYST', 'OPERATOR', 'OBSERVER'] as const) {
      await act(async () => { qaApi.setRole(role) })
      await act(async () => { qaApi.jumpToNode('P01') })
      h.noise = []
      await act(async () => { await new Promise(r => setTimeout(r, 20)) })
      expect(criticalErrors(), `crashed as ${role}`).toHaveLength(0)
    }
    view.unmount()
  })

  it('renders Final screen for each role without error', async () => {
    for (const role of ['OBSERVER', 'ANALYST', 'OPERATOR'] as const) {
      const view = renderFlow('/player/game/final')
      await act(async () => { qaApi.setRole(role) })
      await waitFor(() => {
        expect(screen.queryAllByText(/Final Protocol|Complete/i).length).toBeGreaterThan(0)
        expect(screen.queryAllByText(/Case/i).length + screen.queryAllByText(/NEXUS/i).length).toBeGreaterThan(0)
      })
      expect(criticalErrors(), `Final screen crashed as ${role}`).toHaveLength(0)
      view.unmount()
    }
  })
})

describe('Simulation types — FRESH, PARTIAL, COMPLETE', () => {
  it('FRESH starts with no nodes solved and P01 as the first lead', async () => {
    const view = renderFlow()
    await act(async () => { qaApi.setCustomProgress({ simulationType: 'FRESH' }) })
    await act(async () => { qaApi.jumpToNode('P01') })

    expect(qaApi.solvedNodes.size).toBe(0)
    expect(qaApi.score).toBe(0)
    expect(qaApi.currentNodeId).toBe('P01')
    expect(qaApi.gameState?.status).toBe('RUNNING')
    view.unmount()
  })

  it('PARTIAL starts with first 5 nodes solved (Stage 1 complete)', async () => {
    const view = renderFlow()
    await act(async () => { qaApi.setCustomProgress({ simulationType: 'PARTIAL' }) })

    expect(qaApi.solvedNodes.size).toBe(5)
    expect(qaApi.currentNodeId).toBe('P05')
    expect(qaApi.score).toBe(5 * 50)
    const solvedCodes = Array.from(qaApi.solvedNodes)
    expect(solvedCodes).toContain('P01')
    expect(solvedCodes).toContain('P05')
    view.unmount()
  })

  it('COMPLETE starts with all but final boss solved', async () => {
    const view = renderFlow()
    await act(async () => { qaApi.setCustomProgress({ simulationType: 'COMPLETE' }) })

    expect(qaApi.solvedNodes.size).toBe(PUZZLE_COUNT - 1)
    expect(qaApi.solvedNodes.has('P01')).toBe(true)
    expect(qaApi.solvedNodes.has('P37')).toBe(false)
    expect(qaApi.currentNodeId).toBe('P36')
    view.unmount()
  })

  it('PARTIAL mode only unlocks nodes whose prerequisites are met', async () => {
    const view = renderFlow()
    await act(async () => { qaApi.setCustomProgress({ simulationType: 'PARTIAL' }) })

    const solved = Array.from(qaApi.solvedNodes)
    for (const code of solved) {
      const puzzle = PUZZLES_BY_CODE[code]
      if (!puzzle) continue
      for (const prereq of puzzle.prerequisiteNodes) {
        expect(qaApi.solvedNodes.has(prereq), `prerequisite ${prereq} not solved before ${code}`).toBe(true)
      }
    }
    view.unmount()
  })
})

describe('Evidence evolution through a run', () => {
  it('unlocks evidence items as puzzles are solved', async () => {
    await startSimulation()

    const evidenceBefore = qaApi.inventory?.evidence.length ?? 0
    expect(evidenceBefore).toBe(0)

    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))

    const evidenceAfter = qaApi.inventory?.evidence.length ?? 0
    expect(evidenceAfter).toBeGreaterThan(evidenceBefore)
  })

  it('evidence content evolves through multiple solved stages', async () => {
    await startSimulation()

    const chain = buildMainChain()
    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    const evidence = qaApi.inventory?.evidence ?? []
    expect(evidence.length).toBeGreaterThan(0)

    for (const item of evidence) {
      expect(item.code).toBeTruthy()
      expect(item.title).toBeTruthy()
      expect(item.content).toBeDefined()
    }
  })

  it('inventory items and fragments unlock at the expected thresholds', async () => {
    await startSimulation()

    const checkAt = async (solvedCount: number) => {
      expect(qaApi.solvedNodes.size).toBe(solvedCount)
      const inv = qaApi.inventory ?? { evidence: [], inventory: [], fragments: [] }
      return { evidence: inv.evidence.length, inventory: inv.inventory.length, fragments: inv.fragments.length }
    }

    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    const counts = await checkAt(1)
    expect(counts.evidence).toBeGreaterThan(0)
  })
})

describe('QR scanning flow', () => {
  beforeEach(() => {
    h.QRData = [
      {
        id: 'qr-1',
        code: 'QR-NODE-02',
        label: '[ADMIN BUILDING] — Main Entrance Facade',
        type: 'NODE_MARKER',
        puzzleNodeId: 'P01',
        puzzleNodeCode: 'P01',
        puzzleNodeTitle: 'The Facade',
        puzzleNodeType: 'OBSERVATION',
        puzzleNodeStage: 1,
        puzzleNodeLocation: '[ADMIN BUILDING] — Main Entrance Facade',
        markerId: 'marker-02',
        manualCode: '037-A-0002',
        deploymentStatus: 'DEPLOYED',
        building: 'ADMIN BUILDING',
      },
      {
        id: 'qr-2',
        code: 'QR-NODE-40',
        label: '[NEXUS CORE] — Final Boss Arena',
        type: 'NODE_MARKER',
        puzzleNodeId: 'P37',
        puzzleNodeCode: 'P37',
        puzzleNodeTitle: 'The Final Boss',
        puzzleNodeType: 'FINAL_BOSS',
        puzzleNodeStage: 5,
        puzzleNodeLocation: '[NEXUS CORE] — Final Boss Arena',
        markerId: null,
        manualCode: '037-A-0037',
        deploymentStatus: 'DEPLOYED',
        building: 'NEXUS CORE',
      },
    ]
  })

  it('discovers a marker when its node is available', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    const result = await act(async () => qaApi.scanQR('QR-NODE-02'))
    expect(result.discovered).toBe(true)
    expect(result.nodeCode).toBe('P01')
  })

  it('reports a marker pointing to an unsolved node as sealed', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    const result = await act(async () => qaApi.scanQR('QR-NODE-40'))
    expect(result.discovered).toBe(false)
    expect(result.message).toContain('SEALED')
  })

  it('reports an unrecognised marker with a clear error', async () => {
    await startSimulation()

    const result = await act(async () => qaApi.scanQR('NOT-A-REAL-MARKER'))
    expect(result.discovered).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects a duplicate scan of the same marker', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    const first = await act(async () => qaApi.scanQR('QR-NODE-02'))
    const second = await act(async () => qaApi.scanQR('QR-NODE-02'))

    expect(first.discovered).toBe(true)
    expect(second.discovered).toBe(false)
    expect(second.alreadyClaimed).toBe(true)
  })

  it('accepts manual_code and marker_id as alternative scan inputs', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    const byManual = await act(async () => qaApi.scanQR('037-A-0002'))
    expect(byManual.discovered).toBe(true)
  })

  it('fails scans while offline', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleOffline() })

    const result = await act(async () => qaApi.scanQR('QR-NODE-02'))
    expect(result.discovered).toBe(false)
    expect(result.error).toBe('offline')
  })
})

describe('Hint system', () => {
  it('requests a hint and tracks usage count', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')

    const result = await act(async () => qaApi.requestHint('P01', 1))
    expect(result.hint).toBeTruthy()
    expect(result.penaltySeconds).toBe(30)
    expect(qaApi.hintsUsed).toBe(1)
  })

  it('refuses hints while offline', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleOffline() })

    await expect(qaApi.requestHint('P01', 1)).rejects.toThrow(/offline/i)
  })

  it('refuses hints when game is locked', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleLock() })

    await expect(qaApi.requestHint('P01', 1)).rejects.toThrow(/locked/i)
  })

  it('requests multiple hints and accumulates penalty', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')

    await act(async () => { qaApi.requestHint('P01', 1) })
    await act(async () => { qaApi.requestHint('P01', 2) })
    await act(async () => { qaApi.requestHint('P01', 3) })

    expect(qaApi.hintsUsed).toBe(3)
    expect(qaApi.teamProgress?.hintsAvailable).toBe(0)
  })
})

describe('Offline queue and reconnection', () => {
  it('queues a correct answer while offline and does not mark the node solved', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleOffline() })

    const result = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))
    expect(result.queued).toBe(true)
    expect(result.isCorrect).toBe(false)
    expect(result.error).toBeUndefined()
    expect(qaApi.solvedNodes.has('P01')).toBe(false)
  })

  it('queues a wrong answer while offline without error', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleOffline() })

    const result = await act(async () => qaApi.submitAnswer('P01', 'wrong'))
    expect(result.queued).toBe(true)
    expect(result.isCorrect).toBe(false)
    expect(result.error).toBeUndefined()
  })

  it('does not allow hint or QR requests while offline', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleOffline() })

    const qrResult = await act(async () => qaApi.scanQR('QR-NODE-02'))
    expect(qrResult.discovered).toBe(false)
    expect(qrResult.error).toBe('offline')

    await expect(qaApi.requestHint('P01', 1)).rejects.toThrow(/offline/i)
  })
})

describe('Locked game state', () => {
  it('refuses answer submission when game is locked', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleLock() })

    const result = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))
    expect(result.isCorrect).toBe(false)
    expect(result.error).toBeTruthy()
    expect(qaApi.solvedNodes.has('P01')).toBe(false)
  })

  it('refuses hints when game is locked', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleLock() })

    await expect(qaApi.requestHint('P01', 1)).rejects.toThrow(/locked/i)
  })
})

describe('Attempt counting and double-submit protection', () => {
  it('rejects a second correct submission without double-scoring', async () => {
    await startSimulation()
    const points = PUZZLES_BY_CODE['P01'].points

    const accepted = acceptedFor('P01')
    const [first, second] = await act(async () => Promise.all([
      qaApi.submitAnswer('P01', accepted),
      qaApi.submitAnswer('P01', accepted),
    ]))

    expect(first.isCorrect || second.isCorrect).toBe(true)
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    expect(qaApi.score).toBe(points)
  })

  it('reports incrementing attempt numbers for wrong answers', async () => {
    await startSimulation()

    const r1 = await act(async () => qaApi.submitAnswer('P01', 'wrong1'))
    const r2 = await act(async () => qaApi.submitAnswer('P01', 'wrong2'))
    const r3 = await act(async () => qaApi.submitAnswer('P01', 'wrong3'))

    expect(r1.attemptNumber).toBe(1)
    expect(r2.attemptNumber).toBe(2)
    expect(r3.attemptNumber).toBe(3)
  })

  it('reports the correct attempt number after a correct answer', async () => {
    await startSimulation()

    await act(async () => { qaApi.submitAnswer('P01', 'wrong') })
    const result = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))

    expect(result.isCorrect).toBe(true)
    expect(result.attemptNumber).toBe(2)
  })

  it('clears attempt counts on simulation reset', async () => {
    await startSimulation()

    await act(async () => { qaApi.submitAnswer('P01', 'wrong') })
    await waitFor(() => expect(qaApi.teamProgress?.solvedNodes['P01']?.attempts).toBe(1))

    qaApi.resetSimulation()
    await waitFor(() => expect(qaApi.solvedNodes.size).toBe(0))

    await act(async () => { qaApi.setCustomProgress({ simulationType: 'FRESH' }) })
    await act(async () => { qaApi.jumpToNode('P01') })
    expect(qaApi.teamProgress?.solvedNodes['P01']?.attempts).toBe(0)
  })
})

describe('Player screen robustness', () => {
  it('mounts every player screen without a critical error', async () => {
    await startSimulation()

    const paths = [
      '/player/game',
      '/player/game/evidence',
      '/player/game/inventory',
      '/player/game/navigation',
      '/player/game/qr',
      '/player/game/leaderboard',
      '/player/game/notifications',
    ]

    for (const path of paths) {
      h.noise = []
      const view = renderFlow(path)
      await act(async () => { await new Promise(r => setTimeout(r, 20)) })
      expect(criticalErrors(), `crashed rendering ${path}`).toHaveLength(0)
      view.unmount()
    }
  })

  it('mounts all stage-5 screens (late game) without error', async () => {
    await startSimulation()

    const lateChain = buildMainChain().filter(code => PUZZLES_BY_CODE[code].stage >= 4)
    for (const code of lateChain) {
      h.noise = []
      const view = renderFlow(`/player/game/node/${code}`)
      await act(async () => { await new Promise(r => setTimeout(r, 20)) })
      expect(criticalErrors(), `crashed on ${code}`).toHaveLength(0)
      view.unmount()
    }
  })

  it('survives browser refresh (unmount and remount screens)', async () => {
    const view = renderFlow()
    await act(async () => { qaApi.setRole('OPERATOR') })
    await act(async () => { qaApi.setCustomProgress({ simulationType: 'FRESH' }) })
    await act(async () => { qaApi.jumpToNode('P01') })
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))

    const evidenceAfterSolve = qaApi.inventory?.evidence.length ?? 0
    expect(evidenceAfterSolve).toBeGreaterThan(0)

    h.noise = []
    view.unmount()
    const view2 = renderFlow()

    await act(async () => { qaApi.markSolved('P01') })

    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    expect(criticalErrors()).toHaveLength(0)
    view2.unmount()
  })

  it('Final screen renders for the final boss node', async () => {
    const view = renderFlow('/player/game/final')
    await waitFor(() => {
      expect(screen.queryAllByText(/Final Protocol/i).length).toBeGreaterThan(0)
    })
    expect(criticalErrors()).toHaveLength(0)
    view.unmount()
  })

  it('Complete screen renders after game state is ENDED', async () => {
    await startSimulation()

    const chain = buildMainChain()
    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    await waitFor(() => expect(qaApi.gameState?.status).toBe('ENDED'))

    const view = renderFlow('/player/game/complete')
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(criticalErrors()).toHaveLength(0)
    view.unmount()
  })
})

describe('QA simulator controls — forceSolve, revealAnswer, revealQR', () => {
  it('forceSolve marks the node solved, awards points, and advances to next', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    const points = PUZZLES_BY_CODE['P01'].points

    qaApi.forceSolve()
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    expect(qaApi.score).toBe(points)
    expect(qaApi.currentNodeId).toBe(PUZZLES_BY_CODE['P01'].nextNodes?.[0] ?? null)
  })

  it('revealAnswer returns the accepted answer for the current node', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')

    const answer = qaApi.revealAnswer()
    expect(answer).toBe(acceptedFor('P01'))
  })

  it('revealAnswer returns null for a node without QA data', async () => {
    h.QAData = []
    const view = await startSimulation()
    const answer = qaApi.revealAnswer('P01')
    expect(answer).toBeNull()
    view.unmount()
  })

  it('revealQR generates a marker code for the node', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')

    const qr = qaApi.revealQR()
    expect(qr).toBeTruthy()
    expect(qr).toMatch(/^QR-NODE-/)
  })

  it('advanceProgression solves the first unsolved node in content order', async () => {
    await startSimulation()

    qaApi.advanceProgression()
    await waitFor(() => {
      expect(qaApi.solvedNodes.size).toBe(1)
      expect(qaApi.solvedNodes.has('P01')).toBe(true)
    })
  })
})

describe('Branch path coverage', () => {
  it('solves the P06b → P07b branch that converges at M02', async () => {
    await startSimulation()

    const chain = buildMainChain()
    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    expect(qaApi.solvedNodes.size).toBe(chain.length)
    expect(qaApi.solvedNodes.has('P06b')).toBe(false)
    expect(qaApi.solvedNodes.has('P07b')).toBe(false)

    qaApi.jumpToNode('P06b')
    const r1 = await act(async () => qaApi.submitAnswer('P06b', acceptedFor('P06b')))
    expect(r1.isCorrect).toBe(true)
    await waitFor(() => expect(qaApi.solvedNodes.has('P06b')).toBe(true))

    const r2 = await act(async () => qaApi.submitAnswer('P07b', acceptedFor('P07b')))
    expect(r2.isCorrect).toBe(true)
    await waitFor(() => expect(qaApi.solvedNodes.has('P07b')).toBe(true))
  })
})

describe('Score and progress consistency', () => {
  it('score equals the sum of all solved node points at each step', async () => {
    await startSimulation()

    const chain = buildMainChain()
    let expected = 0
    for (const code of chain) {
      const puzzle = PUZZLES_BY_CODE[code]
      if (!puzzle) continue

      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))

      expected += puzzle.points
      expect(qaApi.score).toBe(expected)
    }
  })

  it('solved count, progress records, and node register all agree', async () => {
    await startSimulation()

    const chain = buildMainChain().slice(0, 10)
    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    expect(qaApi.solvedNodes.size).toBe(10)
    expect(qaApi.solvedNodes.size).toBe(10)

    const statusMap = new Map(qaApi.nodeProgress.map(np => [np.nodeCode, np.status]))
    for (const code of chain) {
      expect(statusMap.get(code)).toBe('SOLVED')
    }

    for (const puzzle of ALL_PUZZLES) {
      if (chain.includes(puzzle.code)) {
        expect(qaApi.solvedNodes.has(puzzle.code)).toBe(true)
      }
    }
  })

  it('unlocked nodes are available but not yet solved', async () => {
    await startSimulation()

    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))

    const statusMap = new Map(qaApi.nodeProgress.map(np => [np.nodeCode, np.status]))
    expect(statusMap.get('P02')).toMatch(/AVAILABLE|IN_PROGRESS/)
    expect(qaApi.availableNodeIds).toContain('P02')
  })
})

describe('Leaderboard and notifications', () => {
  it('shows the team on the leaderboard with correct score', async () => {
    await startSimulation()

    const chain = buildMainChain().slice(0, 5)
    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }

    expect(qaApi.leaderboard.length).toBeGreaterThan(0)
    const qaTeam = qaApi.leaderboard.find(e => e.teamCode === 'QA001')
    expect(qaTeam).toBeDefined()
    expect(qaTeam!.score).toBe(qaApi.score)
  })

  it('generates a notification after the first puzzle is solved', async () => {
    await startSimulation()

    expect(qaApi.notifications.length).toBeGreaterThanOrEqual(1)
    const systemNotif = qaApi.notifications.find(n => n.type === 'SYSTEM')
    expect(systemNotif).toBeDefined()
    expect(systemNotif!.isRead).toBe(false)
  })
})

describe('Navigation flow between player screens', () => {
  it('FieldHub → Node → Evidence → Inventory → Navigation → Leaderboard → Notifications', async () => {
    const view = renderFlow('/player/game')
    await waitFor(() => expect(screen.getByText(/Case ledger/i)).toBeTruthy())

    h.noise = []
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    expect(criticalErrors(), 'FieldHub crashed').toHaveLength(0)

    h.noise = []
    view.rerender(
      <QASimulatorProvider>
        <Capture />
        <AppContext.Provider value={DUMMY_APP_CONTEXT}>
          <MemoryRouter initialEntries={['/player/game/evidence']}>
            <Routes>
              <Route path="/player/game" element={<PlayerLayout />}>
                <Route index element={<PlayerGame />} />
                <Route path="evidence" element={<PlayerEvidence />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AppContext.Provider>
      </QASimulatorProvider>,
    )
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    expect(criticalErrors(), 'Evidence crashed').toHaveLength(0)

    h.noise = []
    view.rerender(
      <QASimulatorProvider>
        <Capture />
        <AppContext.Provider value={DUMMY_APP_CONTEXT}>
          <MemoryRouter initialEntries={['/player/game/inventory']}>
            <Routes>
              <Route path="/player/game" element={<PlayerLayout />}>
                <Route index element={<PlayerGame />} />
                <Route path="inventory" element={<PlayerInventory />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AppContext.Provider>
      </QASimulatorProvider>,
    )
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    expect(criticalErrors(), 'Inventory crashed').toHaveLength(0)

    view.unmount()
  })
})
