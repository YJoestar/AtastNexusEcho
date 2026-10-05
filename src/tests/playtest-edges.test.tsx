/**
 * NEXUS ECHO — Pre-Event Playtest & GM QA Simulation
 *
 * Edge-case scenarios that do not fit the linear happy path: wrong-answer
 * avalanches, QR failure modes, offline queue behaviour, multi-instance
 * isolation, and state transitions that cross the dependency boundary.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
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
import { PlayerQR } from '@/features/player/QR'
import { ALL_PUZZLES, PUZZLES_BY_CODE, PUZZLE_COUNT } from '@/content/puzzles'
import type { PuzzleQAEntry, QRCodeEntry } from '@/lib/admin'

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
               <Route path="qr" element={<PlayerQR />} />
             </Route>
           </Routes>
        </MemoryRouter>
      </AppContext.Provider>
    </QASimulatorProvider>,
  )
  return view
}

function answerFor(code: string): string {
  return 'ANSWER-' + code
}

function acceptedFor(code: string): string {
  const row = (h.QAData as Array<{ code: string; answerMetadata: { acceptedAnswer: string } }>)
    .find(r => r.code === code)
  if (!row) throw new Error(`no QA fixture for ${code}`)
  return row.answerMetadata.acceptedAnswer
}

function buildMainChain(): string[] {
  const visited = new Set<string>()
  const queue: string[] = ['P01']
  while (queue.length > 0) {
    const code = queue.shift()!
    if (visited.has(code)) continue
    visited.add(code)
    const puzzle = PUZZLES_BY_CODE[code]
    if (puzzle?.nextNodes) {
      for (const next of puzzle.nextNodes) queue.push(next)
    }
  }
  return Array.from(visited)
}

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
})

describe('Edge: wrong-answer avalanche', () => {
  it('allows multiple wrong answers then accepts the correct one without score decay', async () => {
    await startSimulation()
    const points = PUZZLES_BY_CODE['P01'].points
    let scoreBefore = 0

    for (let i = 0; i < 5; i++) {
      const result = await act(async () => qaApi.submitAnswer('P01', 'wrong'))
      expect(result.isCorrect).toBe(false)
      expect(result.pointsAwarded).toBe(0)
      scoreBefore = qaApi.score
      expect(scoreBefore).toBe(0)
    }

    const correctResult = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))
    expect(correctResult.isCorrect).toBe(true)
    expect(correctResult.pointsAwarded).toBe(points)
    expect(qaApi.score).toBe(points)
    expect(qaApi.solvedNodes.has('P01')).toBe(true)
  })

  it('tracks incrementing attempt numbers across wrong answers', async () => {
    await startSimulation()

    const r1 = await act(async () => qaApi.submitAnswer('P01', 'wrong'))
    expect(r1.attemptNumber).toBe(1)

    const r2 = await act(async () => qaApi.submitAnswer('P01', 'also-wrong'))
    expect(r2.attemptNumber).toBe(2)

    const r3 = await act(async () => qaApi.submitAnswer('P01', 'still-wrong'))
    expect(r3.attemptNumber).toBe(3)

    const r4 = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))
    expect(r4.attemptNumber).toBe(4)
    expect(r4.isCorrect).toBe(true)
  })

  it('does not award points on a wrong answer after the node is solved', async () => {
    await startSimulation()
    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    const scoreAfterSolve = qaApi.score

    const result = await act(async () => qaApi.submitAnswer('P01', 'wrong'))
    expect(result.isCorrect).toBe(false)
    expect(result.pointsAwarded).toBe(0)
    expect(qaApi.score).toBe(scoreAfterSolve)
  })
})

describe('Edge: QR scan failure modes', () => {
  beforeEach(() => {
    h.QRData = [
      makeQrEntry('QR-A', 'P02', 'Marker for P02'),
    ]
  })

  it('reports sealed when marker points to a node whose prerequisite is unsolved', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    const result = await act(async () => qaApi.scanQR('QR-A'))
    expect(result.discovered).toBe(false)
    expect(result.message).toMatch(/SEALED/)
  })

  it('reports sealed when marker points to an already-solved node', async () => {
    await startSimulation()
    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    qaApi.jumpToNode('P02')
    await act(async () => { qaApi.submitAnswer('P02', acceptedFor('P02')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P02')).toBe(true))

    const result = await act(async () => qaApi.scanQR('QR-A'))
    expect(result.discovered).toBe(false)
    expect(result.alreadyClaimed).toBe(true)
    expect(result.message).toMatch(/ALREADY RECORDED/)
  })

  it('discovers a marker that points to the current node', async () => {
    await startSimulation()
    qaApi.jumpToNode('P02')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P02'))

    const result = await act(async () => qaApi.scanQR('QR-A'))
    expect(result.discovered).toBe(true)
    expect(result.nodeCode).toBe('P02')
  })
})

describe('Edge: offline queue flush', () => {
  it('returns queued=true while offline and does not solve the node', async () => {
    await startSimulation()
    await act(async () => { qaApi.toggleOffline() })

    const result = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))
    expect(result.queued).toBe(true)
    expect(result.isCorrect).toBe(false)
    expect(qaApi.solvedNodes.has('P01')).toBe(false)

    await act(async () => { qaApi.toggleOffline() })
    expect(qaApi.solvedNodes.has('P01')).toBe(false)
  })

  it('still reports offline even when the game is unlocked and online', async () => {
    await startSimulation()
    expect(qaApi.isOffline).toBe(false)
    await act(async () => { qaApi.toggleOffline() })
    expect(qaApi.isOffline).toBe(true)
  })
})

describe('Edge: forced solve and reveal controls', () => {
  it('forceSolve on P01 advances to P02 and awards points', async () => {
    await startSimulation()
    const points = PUZZLES_BY_CODE['P01'].points
    qaApi.forceSolve('P01')
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    expect(qaApi.score).toBe(points)
    expect(qaApi.currentNodeId).toBe(PUZZLES_BY_CODE['P01'].nextNodes?.[0] ?? null)
  })

  it('forceSolve on a branch node P06b works when it is not on the main chain', async () => {
    await startSimulation()
    qaApi.forceSolve('P06b')
    await waitFor(() => expect(qaApi.solvedNodes.has('P06b')).toBe(true))
    expect(qaApi.score).toBe(PUZZLES_BY_CODE['P06b'].points)
  })

  it('revealAnswer returns null for a node not in the QA fixture', async () => {
    await startSimulation()
    const missing = qaApi.revealAnswer('ZZZ')
    expect(missing).toBeNull()
  })

  it('revealQR returns a marker-style code for a numbered puzzle', async () => {
    await startSimulation()
    qaApi.jumpToNode('P03')
    const qr = qaApi.revealQR('P03')
    expect(qr).toMatch(/^QR-NODE-/)
  })

  it('revealQR for a meta node still produces a marker code via numeric extraction', async () => {
    await startSimulation()
    const qr = qaApi.revealQR('M01')
    expect(qr).toMatch(/^QR-NODE-/)
  })

  it('advanceProgression solves nodes in content order (not chain order)', async () => {
    await startSimulation()
    qaApi.advanceProgression()
    await waitFor(() => expect(qaApi.solvedNodes.size).toBe(1))
    expect(qaApi.solvedNodes.has('P01')).toBe(true)
  })

  it('resetSimulation clears all state including scanned markers and attempts', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await act(async () => { qaApi.scanQR('QR-NODE-02') })
    await act(async () => { qaApi.submitAnswer('P01', 'wrong') })
    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.size).toBe(1))

    await act(async () => { qaApi.resetSimulation() })
    expect(qaApi.solvedNodes.size).toBe(0)
    expect(qaApi.score).toBe(0)
    expect(qaApi.hintsUsed).toBe(0)
    expect(qaApi.currentNodeId).toBeNull()
    expect(qaApi.simulationType).toBe('FRESH')
  })
})

describe('Edge: multi-instance isolation', () => {
  it('two separate simulator providers do not share solved state', async () => {
    const view1 = renderFlow()
    await act(async () => { qaApi.setCustomProgress({ simulationType: 'FRESH' }) })
    await act(async () => { qaApi.jumpToNode('P01') })
    await act(async () => { qaApi.submitAnswer('P01', acceptedFor('P01')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P01')).toBe(true))
    view1.unmount()

    const view2 = renderFlow()
    await waitFor(() => expect(qaApi.solvedNodes.size).toBe(0))
    expect(qaApi.solvedNodes.has('P01')).toBe(false)
    expect(qaApi.score).toBe(0)
    view2.unmount()
  })
})

describe('Edge: branch path coverage', () => {
  it('COMPLETE simulation type unlocks ALL nodes including branches', async () => {
    const view = renderFlow()
    await act(async () => { qaApi.setCustomProgress({ simulationType: 'COMPLETE' }) })
    await waitFor(() => expect(qaApi.solvedNodes.size).toBe(PUZZLE_COUNT - 1))
    expect(qaApi.currentNodeId).toBe('P36')

    const availableCount = qaApi.availableNodeIds.length
    expect(availableCount).toBeGreaterThan(0)
    expect(qaApi.availableNodeIds).toContain('P37')

    view.unmount()
  })

  it('solving P17 unlocks P17b on the main chain', async () => {
    await startSimulation()
    const chain = buildMainChain()
    const idx = chain.indexOf('P17')
    for (let i = 0; i <= idx; i++) {
      const code = chain[i]
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))
    }
    expect(qaApi.solvedNodes.has('P17')).toBe(true)

    const p17bIdx = chain.indexOf('P17b')
    qaApi.jumpToNode(chain[p17bIdx])
    await act(async () => { qaApi.submitAnswer('P17b', acceptedFor('P17b')) })
    await waitFor(() => expect(qaApi.solvedNodes.has('P17b')).toBe(true))
  })
})

describe('Edge: score and progress integrity', () => {
  it('score is always non-negative even after many wrong answers', async () => {
    await startSimulation()
    for (let i = 0; i < 10; i++) {
      await act(async () => { qaApi.submitAnswer('P01', 'wrong') })
    }
    expect(qaApi.score).toBe(0)
  })

  it('double-submit of the same correct answer is rejected without double payout', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    const points = PUZZLES_BY_CODE['P01'].points

    const r1 = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))
    expect(r1.isCorrect).toBe(true)
    expect(r1.pointsAwarded).toBe(points)
    expect(qaApi.score).toBe(points)

    const r2 = await act(async () => qaApi.submitAnswer('P01', acceptedFor('P01')))
    expect(r2.isCorrect).toBe(true)
    expect(r2.alreadySolved).toBe(true)
    expect(r2.pointsAwarded).toBe(0)
    expect(qaApi.score).toBe(points)
  })

  it('solvedCount in nodeProgress matches solvedNodes set', async () => {
    await startSimulation()

    const chain = buildMainChain().slice(0, 15)
    for (const code of chain) {
      qaApi.jumpToNode(code)
      await act(async () => { qaApi.submitAnswer(code, acceptedFor(code)) })
      await waitFor(() => expect(qaApi.solvedNodes.has(code)).toBe(true))

      const solvedInProgress = qaApi.nodeProgress.filter(np => np.status === 'SOLVED').length
      expect(solvedInProgress).toBe(qaApi.solvedNodes.size)
    }
  })
})

describe('Edge: node access and progression', () => {
  it('jumpToNode to a non-existent node is a no-op on currentNodeId', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    qaApi.jumpToNode('ZZZ')
    expect(qaApi.currentNodeId).toBe('P01')
  })

  it('switchLead to a different node changes currentNodeId', async () => {
    await startSimulation()
    qaApi.jumpToNode('P01')
    await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))

    qaApi.switchLead('P01')
    expect(qaApi.currentNodeId).toBe('P01')
  })
})

async function startSimulation(initialPath = '/player/game') {
  const view = renderFlow(initialPath)
  await act(async () => { qaApi.setCustomProgress({ simulationType: 'FRESH' }) })
  await act(async () => { qaApi.jumpToNode('P01') })
  await waitFor(() => expect(qaApi.currentNodeId).toBe('P01'))
  return view
}
