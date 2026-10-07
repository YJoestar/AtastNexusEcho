/**
 * The QA simulator is a tool for reaching states production will not produce on
 * demand. That only works if the simulator is honest about the state it reports.
 *
 * Both of these controls previously claimed to do something they did not:
 * "Solve Current" submitted a literal answer string that was correct for no
 * puzzle, and every submission reported attempt number 1 while every node
 * reported zero attempts. An operator clicking through the tools had no way to
 * tell that the tools were inert, and no way at all to exercise the states that
 * depend on an attempt count.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { QASimulatorProvider, useQASimulator } from '@/contexts/QASimulatorContext'

const h = vi.hoisted(() => ({ QAData: [] as unknown, QRData: [] as unknown }))

vi.mock('@/app/providers', () => {
  const noop = async () => {}
  return {
    useApp: () => ({
      player: null, team: null, role: null,
      isAuthenticated: false, isInitializing: false,
      login: noop, logout: noop,
      refreshGameState: noop, refreshTeamProgress: noop,
      gameState: null, teamProgress: null,
      notifications: [], unreadCount: 0,
      markNotificationRead: () => {}, markAllNotificationsRead: () => {}, refreshNotifications: noop,
    }),
    AppProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('@/lib/admin', () => ({
  adminAPI: {
    listPuzzleQA: () => Promise.resolve(h.QAData),
    listQRCodes: () => Promise.resolve(h.QRData ?? []),
  },
}))

import { PUZZLES_BY_CODE, ALL_PUZZLES } from '@/content/puzzles'

function Probe({ onReady }: { onReady: (qa: ReturnType<typeof useQASimulator>) => void }) {
  const qa = useQASimulator()
  onReady(qa)
  return (
    <div>
      <span data-testid="solved">{Array.from(qa.solvedNodes).join(',')}</span>
      <span data-testid="score">{qa.score}</span>
      <span data-testid="current">{qa.currentNodeId ?? ''}</span>
    </div>
  )
}

function renderProbe() {
  let qa!: ReturnType<typeof useQASimulator>
  const ui = render(
    <QASimulatorProvider>
      <Probe onReady={value => { qa = value }} />
    </QASimulatorProvider>,
  )
  return { ...ui, qa: () => qa }
}

/** The accepted answer the QA fixture records for a puzzle, if any. */
function acceptedAnswerFor(code: string): string | null {
  const entry = (h.QAData as Array<{ code?: string; answerMetadata?: { acceptedAnswer?: string } }>)
    .find(row => row.code === code)
  return entry?.answerMetadata?.acceptedAnswer ?? null
}

beforeEach(() => {
  h.QAData = [
    {
      code: 'P01',
      answerMetadata: { acceptedAnswer: 'NORTH', validationMethod: 'case_insensitive' },
    },
  ]
  h.QRData = []
})

describe('QA attempt counting', () => {
  it('counts each submission instead of always reporting the first', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())
    // Only the Operator may submit a conclusion.
    act(() => { qa().setRole('OPERATOR') })

    const results = [] as number[]
    for (const answer of ['wrong-one', 'wrong-two', 'wrong-three']) {
      const result = await qa().submitAnswer('P01', answer)
      results.push(result.attemptNumber)
    }

    // The previous implementation returned 1 for every submission via a ternary
    // with two identical branches, so nothing downstream of an attempt number
    // could ever be exercised here.
    expect(results).toEqual([1, 2, 3])
  })

  it('shows the attempt count on the node once a player has tried', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())
    act(() => { qa().setRole('OPERATOR') })

    await qa().submitAnswer('P01', 'wrong')
    await qa().submitAnswer('P01', 'wrong again')

    await waitFor(() => {
      const progress = qa().teamProgress?.solvedNodes['P01']
      expect(progress?.attempts).toBe(2)
    })
  })

  it('reports the real attempt count after a correct answer', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())
    act(() => { qa().setRole('OPERATOR') })
    const accepted = acceptedAnswerFor('P01') ?? 'NORTH'

    await qa().submitAnswer('P01', 'nope')
    const result = await qa().submitAnswer('P01', accepted)

    expect(result.isCorrect).toBe(true)
    expect(result.attemptNumber).toBe(2)
  })

  it('clears attempt counts when the simulation restarts', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())
    act(() => { qa().setRole('OPERATOR') })

    await qa().submitAnswer('P01', 'wrong')
    await waitFor(() => expect(qa().teamProgress?.solvedNodes['P01'].attempts).toBe(1))

    qa().resetSimulation()
    await waitFor(() => expect(qa().teamProgress?.solvedNodes['P01'].attempts).toBe(0))
  })

  it('keeps attempt counts per puzzle', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())
    act(() => { qa().setRole('OPERATOR') })

    await qa().submitAnswer('P01', 'wrong')
    const other = ALL_PUZZLES.find(p => p.code !== 'P01')?.code
    if (!other) return
    await qa().submitAnswer(other, 'wrong')

    await waitFor(() => {
      expect(qa().teamProgress?.solvedNodes['P01'].attempts).toBe(1)
      expect(qa().teamProgress?.solvedNodes[other].attempts).toBe(1)
    })
  })
})

describe('QA solve control actually solves', () => {
  it('marks the current node solved, awards its points and advances', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())

    qa().jumpToNode('P01')
    await waitFor(() => expect(qa().currentNodeId).toBe('P01'))
    const points = PUZZLES_BY_CODE['P01'].points

    qa().forceSolve()

    await waitFor(() => expect(screen.getByTestId('solved').textContent).toContain('P01'))
    expect(Number(screen.getByTestId('score').textContent)).toBe(points)
    expect(qa().currentNodeId).toBe(PUZZLES_BY_CODE['P01'].nextNodes?.[0] ?? null)
  })

  it('agrees with the register about what has been solved', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())

    qa().jumpToNode('P01')
    await waitFor(() => expect(qa().currentNodeId).toBe('P01'))
    qa().forceSolve()

    // The node register and the progress record are two views of one truth.
    await waitFor(() => {
      expect(qa().solvedNodes.has('P01')).toBe(true)
      expect(qa().teamProgress?.solvedNodes['P01'].status).toBe('SOLVED')
      expect(qa().teamProgress?.solvedNodes['P01'].solvedAt).not.toBeNull()
    })
  })

  it('leaves untouched puzzles locked', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())

    const untouched = ALL_PUZZLES.find(p => p.code !== 'P01')
    if (!untouched) return
    await waitFor(() => {
      expect(qa().teamProgress?.solvedNodes[untouched.code].status).toBe('LOCKED')
    })
  })
})
