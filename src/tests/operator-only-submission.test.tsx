/**
 * The operator-only conclusion model.
 *
 * The Observer and the Analyst solve their parts mentally and
 * communicate them verbally. Every screen must reflect that: no answer
 * field, no control, no feedback for them - and the Operator alone
 * types the conclusion. The QA simulator enforces the same rule the
 * database does (2026100601), so a playtest cannot accidentally walk
 * the old three-answer-form flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const h = vi.hoisted(() => ({
  role: 'OBSERVER' as string,
  solvedCount: 0,
  fetchNode: vi.fn(),
  submitAnswer: vi.fn(),
  requestHint: vi.fn(),
  QAData: [] as unknown,
  QRData: [] as unknown,
  app: { isAuthenticated: false, isInitializing: false, login: vi.fn() } as Record<string, unknown>,
}))

vi.mock('@/hooks/useGameEngine', () => ({
  useGameEngine: () => ({
    role: h.role,
    isOffline: false,
    fetchNode: h.fetchNode,
    submitAnswer: h.submitAnswer,
    requestHint: h.requestHint,
    gameState: null,
    teamProgress: null,
    solvedCount: h.solvedCount,
    totalNodes: 40,
  }),
}))

vi.mock('@/app/providers', () => {
  const noop = async () => {}
  return {
    useApp: () => ({
      player: null, team: null, role: null,
      ...h.app,
      refreshGameState: noop,
      refreshTeamProgress: noop,
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

vi.mock('@/components/player/puzzle/PuzzleVisual', () => ({ PuzzleVisual: () => null }))

import { PlayerNode } from '@/features/player/Node'
import { PlayerFinal } from '@/features/player/Final'
import { QASimulatorProvider, useQASimulator } from '@/contexts/QASimulatorContext'

const nodeView = (code: string) => ({
  unlocked: true, code, title: `Title ${code}`, type: 'LOGIC', difficulty: 1, estimatedMinutes: 5,
  location: 'X', stage: 1, narrativeObjective: '', roleDependencyLevel: 'LOW', roleContent: null,
  operatorInvestigation: null, coordinationChain: null, failurePropagation: null, locationClue: null,
  evidenceUnlocked: null, storyReveal: '', whyTeamworkMatters: '', points: 10, hintsUsed: 0,
  isSolved: false, status: 'AVAILABLE', attempts: 0,
})

function renderNode(path = '/node/N1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/node/:nodeId" element={<PlayerNode />} />
        <Route path="/player/game" element={<div>FIELD HUB</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderFinal() {
  return render(
    <MemoryRouter initialEntries={['/player/game/final']}>
      <Routes>
        <Route path="/player/game/final" element={<PlayerFinal />} />
        <Route path="/player/game" element={<div>FIELD HUB</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  h.role = 'OBSERVER'
  h.solvedCount = 0
  h.fetchNode.mockReset().mockImplementation(async (id: string) => nodeView(id))
  h.submitAnswer.mockReset()
  h.requestHint.mockReset()
  h.QAData = [
    {
      code: 'P01',
      answerMetadata: { acceptedAnswer: 'NORTH', validationMethod: 'case_insensitive' },
    },
  ]
  h.QRData = []
})

describe('Node screen carries an answer field for the Operator only', () => {
  it.each(['OBSERVER', 'ANALYST'] as const)(
    'shows %s a verbal channel instead of an answer field',
    async role => {
      h.role = role
      renderNode()
      await waitFor(() => expect(screen.getByText('Title N1')).toBeTruthy())

      // No input of any kind: the role reasons and speaks.
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.queryByLabelText('FINAL CONCLUSION')).toBeNull()
      expect(screen.getByText('No answer is entered on this device')).toBeTruthy()
    },
  )

  it('shows the Operator the final conclusion field', async () => {
    h.role = 'OPERATOR'
    renderNode()
    await waitFor(() => expect(screen.getByText('Title N1')).toBeTruthy())

    expect(screen.getByLabelText('FINAL CONCLUSION')).toBeTruthy()
    expect(screen.getByRole('button', { name: /VERIFY CONCLUSION/i })).toBeTruthy()
    expect(screen.queryByText('No answer is entered on this device')).toBeNull()
  })
})

describe('Final screen carries an answer field for the Operator only', () => {
  beforeEach(() => {
    // The finale only opens once the team is one node from done.
    h.solvedCount = 39
  })

  it.each(['OBSERVER', 'ANALYST'] as const)(
    'shows %s a verbal channel instead of the final code field',
    async role => {
      h.role = role
      renderFinal()
      await waitFor(() => expect(screen.getAllByText(/Final Protocol/i).length).toBeGreaterThan(0))

      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.getByText('No answer is entered on this device')).toBeTruthy()
    },
  )

  it('shows the Operator the final conclusion field', async () => {
    h.role = 'OPERATOR'
    renderFinal()
    await waitFor(() => expect(screen.getAllByText(/Final Protocol/i).length).toBeGreaterThan(0))

    expect(
      screen.getByPlaceholderText("ENTER THE TEAM'S FINAL CONCLUSION…"),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /VERIFY CONCLUSION/i })).toBeTruthy()
    expect(screen.queryByText('No answer is entered on this device')).toBeNull()
  })
})

describe('a wrong conclusion is reported generically', () => {
  it('names no role, clue or partial result', async () => {
    h.role = 'OPERATOR'
    h.submitAnswer.mockResolvedValue({ isCorrect: false, attemptNumber: 1 })
    renderNode()
    await waitFor(() => expect(screen.getByText('Title N1')).toBeTruthy())

    const input = screen.getByLabelText('FINAL CONCLUSION')
    fireEvent.change(input, { target: { value: 'guess' } })
    fireEvent.submit(input.closest('form')!)

    const notice = await screen.findByText('Conclusion Not Verified')
    expect(notice).toBeTruthy()
    // The notice must not say which role, clue or step produced it.
    expect(notice.textContent).not.toMatch(/observer|analyst|clue|step|partial/i)
  })
})

describe('the QA simulator enforces the operator-only rule', () => {
  function Probe({ onReady }: { onReady: (qa: ReturnType<typeof useQASimulator>) => void }) {
    const qa = useQASimulator()
    onReady(qa)
    return null
  }

  function renderProbe() {
    let qa!: ReturnType<typeof useQASimulator>
    const view = render(
      <QASimulatorProvider>
        <Probe onReady={value => { qa = value }} />
      </QASimulatorProvider>,
    )
    return { ...view, qa: () => qa }
  }

  it('refuses a submission from any role but the Operator', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())

    for (const role of ['OBSERVER', 'ANALYST'] as const) {
      await act(async () => { qa().setRole(role) })
      const result = await qa().submitAnswer('P01', 'NORTH')
      expect(result.isCorrect).toBe(false)
      expect(result.error).toBe("Only the Operator may submit the team's conclusion.")
      expect(qa().solvedNodes.has('P01')).toBe(false)
    }
  })

  it('accepts the Operator conclusion through the same path', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())
    await act(async () => { qa().setRole('OPERATOR') })

    const result = await qa().submitAnswer('P01', 'NORTH')
    expect(result.isCorrect).toBe(true)
    await waitFor(() => expect(qa().solvedNodes.has('P01')).toBe(true))
  })

  it('serves no coordination chain or required discoveries to any role', async () => {
    const { qa } = renderProbe()
    await waitFor(() => expect(qa().role).toBeTruthy())
    await act(async () => { qa().setRole('OPERATOR') })

    for (const role of ['OBSERVER', 'ANALYST', 'OPERATOR'] as const) {
      const detail = await qa().getNode('P01', role)
      expect(detail).not.toBeNull()
      expect(detail!.coordinationChain).toBeNull()
      expect(detail!.failurePropagation).toBeNull()
      if (role === 'OPERATOR') {
        expect(detail!.operatorInvestigation).not.toBeNull()
        expect(detail!.operatorInvestigation).not.toHaveProperty('requiredDiscoveries')
        expect(detail!.operatorInvestigation?.operatorOwnEvidence).toBeTruthy()
        expect(detail!.operatorInvestigation?.operatorTaskDescription).toBeTruthy()
      } else {
        expect(detail!.operatorInvestigation).toBeNull()
      }
    }
  })
})
