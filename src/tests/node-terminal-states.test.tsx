/**
 * The puzzle node screen is the one place a player can get properly stuck.
 *
 * An earlier audit pass could not capture this screen at all: it rendered
 * instantly and then sat on "LOADING INVESTIGATION NODE…" forever. The cause
 * was not slowness but a terminal state with no exit — the load effect bailed
 * out early without clearing the loading flag, so a player whose role had not
 * resolved was left on a permanent spinner with no message and no way back.
 *
 * These tests pin that regression. The loaded and puzzle states are exercised
 * through the QA simulator integration suite, which drives the real provider
 * stack; this file covers the paths that only appear when the load does not
 * succeed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppProvider, AccessibilityProvider } from '@/app/providers'
import { PlayerNode } from '@/features/player/Node'

const NODE_ID = 'NX-037-P-01'

// No session is established, so no role is ever assigned.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      setSession: async () => ({ data: {}, error: null }),
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
  },
}))

// The engine's own requests resolve immediately rather than reaching a network,
// so the component reaches a settled state instead of waiting on a socket.
vi.mock('@/lib/game', () => ({
  gameAPI: {
    getNode: async () => {
      throw new Error('no record issued')
    },
    getNodeProgress: async () => [],
    getGameState: async () => ({
      team: { status: 'RUNNING', score: 0, startedAt: null, deadline: null },
      progress: { availableNodeIds: [] },
      currentNode: null,
    }),
  },
}))

function renderNode() {
  return render(
    <MemoryRouter initialEntries={[`/player/game/node/${NODE_ID}`]}>
      <AccessibilityProvider>
        <AppProvider>
          <Routes>
            <Route path="/player/game/node/:nodeId" element={<PlayerNode />} />
          </Routes>
        </AppProvider>
      </AccessibilityProvider>
    </MemoryRouter>,
  )
}

describe('player node load failure states', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('leaves the loading screen when the role has not arrived', async () => {
    renderNode()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/assignment has not been received/i)

    // The regression: this used to stay on the spinner indefinitely.
    expect(screen.queryByText(/LOADING INVESTIGATION NODE/i)).toBeNull()
  })

  it('announces the failure rather than only showing it', async () => {
    renderNode()

    // role="alert" means the reason is spoken, not just drawn.
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).not.toBe('')
  })

  it('offers both a retry and a way back', async () => {
    renderNode()

    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: /Try again/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Return to the case/i })).toBeTruthy()
  })

  it('keeps the recovery controls at a usable target size', async () => {
    renderNode()

    await screen.findByRole('alert')

    const retry = screen.getByRole('button', { name: /Try again/i })
    expect(retry.className).toMatch(/min-h-\[5[0-9]px\]|nx-action/)
  })
})