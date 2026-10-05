/**
 * NEXUS - Bottom navigation scope tests
 *
 * The bottom bar used to render on every player route. On the pages that are
 * not one of its five destinations — a puzzle node, navigation, notifications,
 * the final protocol, the completion report — it covered content and could
 * never highlight anything, which reads as a broken route rather than as a
 * detail screen. Those screens carry their own back control instead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const useApp = vi.fn()
const useConnection = vi.fn()
const useSubmissionQueue = vi.fn()

vi.mock('@/app/providers', () => ({
  useApp: () => useApp(),
}))
vi.mock('@/hooks/useConnection', () => ({
  useConnection: () => useConnection(),
}))
vi.mock('@/hooks/useSubmissionQueue', () => ({
  useSubmissionQueue: () => useSubmissionQueue(),
}))

const { BottomNav } = await import('@/components/player/BottomNav')
const { NAV_ITEMS, navDestinationFor, navItemFor, shouldRenderBottomNav } = await import('@/lib/navigation')

describe('navItemFor', () => {
  it('names the seven investigation spaces', () => {
    expect(NAV_ITEMS.map(item => item.id)).toEqual(['CASE', 'FIELD', 'EVIDENCE', 'BOARD', 'SCAN', 'COMMS', 'LOG'])
  })

  it('tells Evidence from Board on their shared route', () => {
    expect(navItemFor('/player/game/evidence', '')?.id).toBe('EVIDENCE')
    expect(navItemFor('/player/game/evidence', '?artifact=x')?.id).toBe('EVIDENCE')
    expect(navItemFor('/player/game/evidence', '?view=table')?.id).toBe('BOARD')
  })

  it('returns null off the bar', () => {
    expect(navItemFor('/player/game/node/P01')).toBeNull()
  })
})

describe('navDestinationFor', () => {
  it('matches each of the five listed destinations exactly', () => {
    for (const item of NAV_ITEMS) {
      expect(navDestinationFor(item.path)).toBe(item.path)
    }
  })

  it('tolerates a trailing slash', () => {
    expect(navDestinationFor('/player/game/')).toBe('/player/game')
  })

  it('returns null for player subpages that are not listed destinations', () => {
    const unlisted = [
      '/player/game/node/P01',
      '/player/game/navigation',
      '/player/game/inventory',
      '/player/game/leaderboard',
      '/player/game/final',
      '/player/game/complete',
      '/player/waiting',
      '/player/login',
    ]
    for (const path of unlisted) {
      expect(navDestinationFor(path), path).toBeNull()
      expect(shouldRenderBottomNav(path), path).toBe(false)
    }
  })

  it('does not let a subpage claim the Game tab', () => {
    // Prefix matching would light up "Game" on a puzzle screen, which is
    // exactly the wrong active state to show a player mid-puzzle.
    expect(navDestinationFor('/player/game/node/P01')).not.toBe('/player/game')
  })
})

beforeEach(() => {
  useApp.mockReset()
  useApp.mockReturnValue({ player: { id: 'p1', role: 'OBSERVER' } })
  useConnection.mockReset()
  useConnection.mockReturnValue({ status: 'online', isOffline: false, probe: () => {} })
  useSubmissionQueue.mockReset()
  useSubmissionQueue.mockReturnValue({ count: 0, lastFlush: null, clearLastFlush: () => {} })
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/player/game" element={<BottomNav />} />
        <Route path="/player/game/evidence" element={<BottomNav />} />
        <Route path="/player/game/inventory" element={<BottomNav />} />
        <Route path="/player/game/qr" element={<BottomNav />} />
        <Route path="/player/game/leaderboard" element={<BottomNav />} />
        <Route path="/player/game/node/:nodeId" element={<BottomNav />} />
        <Route path="/player/game/notifications" element={<BottomNav />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('renders nothing without an authenticated player', () => {
    useApp.mockReturnValue({ player: null })
    const { container } = renderAt('/player/game')
    expect(container.querySelector('nav')).toBeNull()
  })

  it('shows unread dispatches on Comms', () => {
    useApp.mockReturnValue({ player: { id: 'p1', role: 'OBSERVER' }, unreadCount: 3 })
    const { getByLabelText } = renderAt('/player/game')
    expect(getByLabelText('COMMS, 3 unread')).toBeTruthy()
  })

  it('renders the five destinations on a listed route', () => {
    const { container } = renderAt('/player/game/evidence')
    expect(container.querySelector('nav')).not.toBeNull()
    expect(container.querySelectorAll('a')).toHaveLength(NAV_ITEMS.length)
  })

  it('renders nothing on an unlisted player subpage', () => {
    const { container } = renderAt('/player/game/node/P01')
    expect(container.querySelector('nav')).toBeNull()
  })

  it('marks the QR tab when the connection is not healthy', () => {
    useConnection.mockReturnValue({ status: 'degraded', isOffline: true, probe: () => {} })
    const { container } = renderAt('/player/game')
    expect(container.querySelectorAll('.bg-nexus-danger')).toHaveLength(1)
  })
})