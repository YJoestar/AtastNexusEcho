/**
 * Player screens: the load effect must not be able to loop, and must not eat
 * what the player typed.
 *
 * `useGameEngine` hands out a fresh `fetchNode` closure on every render when the
 * QA simulator is driving the engine. Any effect that lists it as a dependency
 * re-runs itself: the load sets fresh `submissions`/`hints` arrays, that
 * re-renders, which mints a new closure, which re-runs the load. It looked fine
 * on a happy path and then behaved like a bug on the one screen where a player
 * types an answer — every pass ran `setAnswer('')`, so the field went blank
 * while they were still typing in it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const h = vi.hoisted(() => ({
  /** How many times the engine has been read, i.e. how many renders happened. */
  engineReads: 0,
  fetchNode: vi.fn(),
  submitAnswer: vi.fn(),
  requestHint: vi.fn(),
}))

vi.mock('@/hooks/useGameEngine', () => ({
  useGameEngine: () => {
    h.engineReads += 1
    return {
      role: 'OPERATOR',
      isOffline: false,
      // A NEW closure on every render, exactly as the QA engine does.
      fetchNode: (...args: unknown[]) =>
        (h.fetchNode as (...a: unknown[]) => unknown)(...args),
      submitAnswer: h.submitAnswer,
      requestHint: h.requestHint,
    }
  },
}))

vi.mock('@/app/providers', () => ({
  useApp: () => ({
    refreshTeamProgress: vi.fn(),
    refreshGameState: vi.fn(),
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(),
  }),
}))

vi.mock('@/components/player/puzzle/PuzzleVisual', () => ({ PuzzleVisual: () => null }))

import { PlayerNode } from '@/features/player/Node'

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

beforeEach(() => {
  h.engineReads = 0
  h.fetchNode.mockReset().mockImplementation(async (id: string) => nodeView(id))
  h.submitAnswer.mockReset()
  h.requestHint.mockReset()
})

describe('PlayerNode loads the puzzle exactly once', () => {
  it('does not re-fetch when the engine hands out a new fetchNode every render', async () => {
    renderNode()
    await waitFor(() => expect(screen.getByText('Title N1')).toBeTruthy())

    // Let any loop run: a re-fetching effect settles after a few passes.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 60))
    })

    expect(h.fetchNode).toHaveBeenCalledTimes(1)
    // The scenario is only real if the screen actually re-renders. It does —
    // loading flips true then false — and each render produced a different
    // fetchNode identity, which is precisely what used to re-run this effect.
    expect(h.engineReads).toBeGreaterThan(1)
  })

  it('keeps what the player has typed while the engine re-renders', async () => {
    renderNode()
    await waitFor(() => expect(screen.getByText('Title N1')).toBeTruthy())

    const input = screen.getByRole('textbox') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { value: 'NEX' } })
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 60))
    })

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('NEX')
    expect(h.fetchNode).toHaveBeenCalledTimes(1)
  })
})

describe('the discovery toast survives an origin without crypto.randomUUID', () => {
  it('still creates a toast id when crypto.randomUUID is unavailable', async () => {
    // crypto.randomUUID is secure-context-only. The dev server is reached over
    // http://<lan-ip>:3000 for a multi-phone event, where it is simply undefined,
    // and the unguarded call threw immediately after a correct answer - taking the
    // auto-advance with it and replacing the celebration with a raw JS error.
    const original = globalThis.crypto.randomUUID
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    })

    try {
      const { generateId } = await import('@/lib/utils')
      expect(() => generateId()).not.toThrow()
      expect(generateId()).toBeTruthy()
      // Still unique, which is what the toast list relies on.
      expect(generateId()).not.toBe(generateId())
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: original,
      })
    }
  })

  it('still produces an idempotency key without randomUUID', async () => {
    // The team-creation wizard calls generateId() during render, so on a
    // plain-HTTP origin this threw and the whole Bureau wizard failed to mount.
    const original = globalThis.crypto.randomUUID
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    })

    try {
      const { generateId } = await import('@/lib/utils')
      const ids = new Set(Array.from({ length: 200 }, () => generateId()))
      expect(ids.size).toBe(200)
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: original,
      })
    }
  })
})