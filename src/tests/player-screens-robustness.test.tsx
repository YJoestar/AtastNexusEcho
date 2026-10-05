/**
 * Player screens: Node unmount/stale/double-submit safety, inline action errors,
 * login accessibility wiring, and lazy-routed auth guards.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'

const h = vi.hoisted(() => ({
  fetchNode: vi.fn(),
  submitAnswer: vi.fn(),
  requestHint: vi.fn(),
  app: { isAuthenticated: false, isInitializing: false, login: vi.fn() } as Record<string, unknown>,
}))

vi.mock('@/hooks/useGameEngine', () => ({
  useGameEngine: () => ({
    role: 'OBSERVER',
    isOffline: false,
    fetchNode: h.fetchNode,
    submitAnswer: h.submitAnswer,
    requestHint: h.requestHint,
  }),
}))

vi.mock('@/app/providers', () => ({
  useApp: () => ({
    refreshTeamProgress: vi.fn(),
    refreshGameState: vi.fn(),
    ...h.app,
  }),
}))

vi.mock('@/components/player/puzzle/PuzzleVisual', () => ({ PuzzleVisual: () => null }))

import { PlayerNode } from '@/features/player/Node'
import { PlayerLogin } from '@/features/player/Login'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Layout } from '@/components/layout/Layout'
import { lazy } from 'react'

const nodeView = (code: string) => ({
  unlocked: true, code, title: `Title ${code}`, type: 'LOGIC', difficulty: 1, estimatedMinutes: 5,
  location: 'X', stage: 1, narrativeObjective: '', roleDependencyLevel: 'LOW', roleContent: null,
  operatorInvestigation: null, coordinationChain: null, failurePropagation: null, locationClue: null,
  evidenceUnlocked: null, storyReveal: '', whyTeamworkMatters: '', points: 10, hintsUsed: 0,
  isSolved: false, status: 'AVAILABLE', attempts: 0,
})

function renderNode(path = '/node/N1') {
  const ui = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/node/:nodeId" element={<PlayerNode />} />
        <Route path="/player/game" element={<div>FIELD HUB</div>} />
      </Routes>
    </MemoryRouter>
  )
  return render(ui)
}

beforeEach(() => {
  h.fetchNode.mockReset().mockImplementation(async (id: string) => nodeView(id))
  h.submitAnswer.mockReset()
  h.requestHint.mockReset()
  h.app = { isAuthenticated: false, isInitializing: false, login: vi.fn() }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PlayerNode', () => {
  it('keeps the puzzle on screen and shows an inline alert when a submit fails (e.g. expired session)', async () => {
    h.submitAnswer.mockRejectedValue(new Error('JWT expired'))
    renderNode()
    const input = await screen.findByLabelText('SOLUTION')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.submit(input.closest('form')!)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('JWT expired')
    expect(screen.getByLabelText('SOLUTION').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText('SOLUTION').getAttribute('aria-describedby')).toContain('answer-error')
    expect(screen.queryByText('INVESTIGATION BLOCKED')).toBeNull()
  })

  it('shows the blocking screen only when the node itself fails to load', async () => {
    h.fetchNode.mockRejectedValue(new Error('nope'))
    renderNode()
    expect(await screen.findByText('INVESTIGATION BLOCKED')).toBeTruthy()
  })

  it('ignores a slow load for a node the player already left', async () => {
    let releaseFirst: (v: unknown) => void = () => undefined
    h.fetchNode
      .mockImplementationOnce(() => new Promise(res => { releaseFirst = res }))
      .mockImplementationOnce(async () => nodeView('N2'))
    render(
      <MemoryRouter initialEntries={['/node/N1']}>
        <Link to="/node/N2">go</Link>
        <Routes><Route path="/node/:nodeId" element={<PlayerNode />} /></Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('go'))
    expect(await screen.findByText('Title N2')).toBeTruthy()
    await act(async () => { releaseFirst(nodeView('N1')) })
    expect(screen.queryByText('Title N1')).toBeNull()
    expect(screen.getByText('Title N2')).toBeTruthy()
  })

  it('never renders a blank screen when the node cannot be described', async () => {
    // The engine resolves null for a node this client cannot describe at all:
    // a code that is in neither the server's register nor the local bundle. The
    // screen used to `return null` there, so the player was left staring at an
    // empty page with no explanation and no way back.
    h.fetchNode.mockResolvedValue(null)
    const { container } = renderNode()

    await waitFor(() => expect(container.textContent?.trim()).not.toBe(''))
    expect(screen.getByText(/NOT IN THE REGISTER|NOT IN THE CASE FILE/i)).toBeTruthy()
    // ...and a way out, so the screen is a dead end with no exit.
    expect(screen.getByRole('link', { name: /RETURN TO FIELD/i }).getAttribute('href')).toBe('/player/game')
  })

  it('redirects to the field hub after a correct answer when still mounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    h.submitAnswer.mockResolvedValue({ isCorrect: true, nextNodeId: null })
    renderNode()
    const input = await screen.findByLabelText('SOLUTION')
    fireEvent.change(input, { target: { value: 'abc' } })
    await act(async () => { fireEvent.submit(input.closest('form')!) })
    await act(async () => { vi.advanceTimersByTime(2100) })
    expect(screen.getByText('FIELD HUB')).toBeTruthy()
  })
})

describe('PlayerLogin accessibility', () => {
  it('labels the input, announces errors and links messages to the field', async () => {
    h.app.login = vi.fn().mockResolvedValue({ success: false, error: 'Code not recognised' })
    render(<MemoryRouter><PlayerLogin /></MemoryRouter>)
    const input = screen.getByLabelText('ACCESS CODE')
    expect(input.getAttribute('aria-describedby')).toBe('accessCode-hint')

    fireEvent.change(input, { target: { value: 'ABC' } })
    await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'))
    expect(input.getAttribute('aria-describedby')).toContain('accessCode-format')
    expect(document.getElementById('accessCode-format')).toBeTruthy()

    fireEvent.change(input, { target: { value: 'ABCD2345' } })
    fireEvent.submit(input.closest('form')!)
    const alert = await screen.findByText(/ACCESS DENIED/)
    expect(alert.closest('[role="alert"]')).toBeTruthy()
    expect(screen.getByRole('button', { name: /CONNECT TO INVESTIGATION/ })).toBeTruthy()
  })
})

describe('lazy routes keep their guards', () => {
  const Secret = lazy(async () => ({ default: () => <div>SECRET SCREEN</div> }))
  const tree = (
    <MemoryRouter initialEntries={['/player/waiting']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/player/login" element={<div>LOGIN SCREEN</div>} />
          <Route path="/player/waiting" element={<RequireAuth><Secret /></RequireAuth>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

  it('redirects unauthenticated users to login without loading the screen', async () => {
    render(tree)
    expect(await screen.findByText('LOGIN SCREEN')).toBeTruthy()
    expect(screen.queryByText('SECRET SCREEN')).toBeNull()
  })

  it('shows the Suspense fallback then the lazy screen when authenticated', async () => {
    h.app = { isAuthenticated: true, isInitializing: false }
    render(tree)
    expect(await screen.findByText('SECRET SCREEN')).toBeTruthy()
  })
})
