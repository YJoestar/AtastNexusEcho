/**
 * Session recovery: a valid session whose case file cannot be read.
 *
 * `AppProvider` restores a session with `.from('players').select('*, teams(*)')`,
 * which PostgREST resolves as a to-one embed evaluated under the caller's RLS
 * policy. A refused row comes back as NULL, not as an error, so there is no
 * status code to branch on - and the old handler dereferenced it. The TypeError
 * was swallowed, player and team stayed null, `isAuthenticated` was false, and a
 * player who had just logged in successfully was bounced back to the login form
 * with no explanation.
 *
 * Two things are wrong with that and both are pinned here:
 *
 *   1. the recovery is NOT another login. The access code is one-time and has
 *      already been spent, so every login attempt fails the same way - a loop.
 *      The recovery is another read of the session already in hand.
 *   2. the fallback must NOT be a fabricated team. Inventing a REGISTERED row
 *      for a team that has actually completed the case sends it back into
 *      gameplay, hides the ending screen, and reports a score of 0 against the
 *      team's real total.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
  invoke: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  unsubscribe: vi.fn(),
  removeChannel: vi.fn(),
  teamQueries: [] as string[],
}))

// A real channel builder: AppProvider subscribes to its team's realtime row as
// soon as a team is attached, and a stub returning undefined would mask the
// behaviour under test behind an unrelated crash.
function fakeChannel() {
  const chain = {
    on: () => chain,
    subscribe: () => chain,
  }
  return chain
}

vi.mock('@/lib/supabase', () => {
  // One builder per table, so a test can answer the player embed and the team
  // re-read differently - which is the whole point of the fallback.
  const make = (terminal: 'single' | 'maybeSingle') => {
    const query = {
      select: () => query,
      eq: () => query,
      single: () => (terminal === 'single' ? h.single() : h.maybeSingle()),
      maybeSingle: () => (terminal === 'maybeSingle' ? h.maybeSingle() : h.single()),
    }
    return query
  }
  return {
    supabase: {
      auth: {
        getSession: h.getSession,
        setSession: h.setSession,
        signOut: h.signOut,
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: h.unsubscribe } } }),
      },
      from: (table: string) => {
        h.teamQueries.push(table)
        return make(table === 'teams' ? 'maybeSingle' : 'single')
      },
      functions: { invoke: h.invoke },
      channel: () => fakeChannel(),
      removeChannel: h.removeChannel,
    },
  }
})

vi.mock('@/lib/game', () => ({
  gameAPI: {
    getGameState: vi.fn(),
    getNodeProgress: vi.fn(),
    getNotifications: vi.fn().mockResolvedValue([]),
    markNotificationsRead: vi.fn(),
  },
}))

import { AppProvider, useApp } from '@/app/providers/AppProvider'
import { RequireAuth } from '@/components/auth/RequireAuth'

const USER = 'auth-user-1'

const playerRow = (teams: unknown) => ({
  data: {
    id: 'p1',
    team_id: 'team-1',
    role: 'OBSERVER',
    display_name: 'Alpha',
    joined_at: null,
    is_connected: true,
    last_seen_at: null,
    device_info: null,
    status: 'ACTIVE',
    created_at: '2026-01-01',
    login_code_hash: null,
    auth_user_id: USER,
    device_session_token: null,
    device_fingerprint_hash: null,
    teams,
  },
  error: null,
})

const teamRow = (status: string) => ({
  id: 'team-1',
  name: 'Team Alpha',
  code: 'T1',
  status,
  created_at: '2026-01-01',
  started_at: null,
  completed_at: null,
  current_node_id: null,
  score: 750,
  metadata: {},
})

const Secret = () => <div>PLAYER SCREEN</div>

const tree = (children: ReactNode) => (
  <MemoryRouter>
    <AppProvider>{children}</AppProvider>
  </MemoryRouter>
)

beforeEach(() => {
  h.teamQueries.length = 0
  h.getSession.mockReset().mockResolvedValue({
    data: { session: { user: { id: USER } } },
    error: null,
  })
  h.single.mockReset()
  h.maybeSingle.mockReset()
})

describe('a valid session whose team row is refused', () => {
  it('offers a retry instead of a login form, and the retry re-reads the same session', async () => {
    h.single.mockResolvedValue(playerRow(null))
    // The direct re-read of `teams` is refused too.
    h.maybeSingle.mockResolvedValue({ data: null, error: null })

    render(tree(
      <RequireAuth>
        <Secret />
      </RequireAuth>,
    ))

    expect(await screen.findByText(/CASE FILE UNAVAILABLE/i)).toBeTruthy()
    expect(screen.queryByText('PLAYER SCREEN')).toBeNull()
    // Crucially: not the login form. The access code is spent.
    expect(h.invoke).not.toHaveBeenCalled()

    const retry = screen.getByRole('button', { name: /RETRY/i })
    // The recovery is another read of the session already held.
    expect(h.single).toHaveBeenCalledTimes(1)
    h.maybeSingle.mockResolvedValue({ data: teamRow('COMPLETED'), error: null })
    await act(async () => { retry.click() })

    await waitFor(() => expect(screen.getByText('PLAYER SCREEN')).toBeTruthy())
    // The team comes back with its REAL status and score, not a placeholder.
    expect(h.teamQueries).toContain('teams')
  })

  it('never invents a team when the row cannot be read', async () => {
    h.single.mockResolvedValue(playerRow(null))
    h.maybeSingle.mockResolvedValue({ data: null, error: null })

    render(tree(
      <RequireAuth>
        <Secret />
      </RequireAuth>,
    ))

    await screen.findByText(/CASE FILE UNAVAILABLE/i)
    // A fabricated REGISTERED row would have put this team back into gameplay
    // with a score of 0 - a finished run silently restarted, and the leaderboard
    // rewritten. The screen must not render a player area at all instead.
    expect(screen.queryByText('PLAYER SCREEN')).toBeNull()
    expect(document.body.textContent).not.toMatch(/Case Archive/)
  })

  it('recovers through the single re-read when only the embed was refused', async () => {
    h.single.mockResolvedValue(playerRow(null))
    // The embed is refused but the team row itself is readable: a real recovery,
    // and the reason the fallback re-reads instead of giving up.
    h.maybeSingle.mockResolvedValue({ data: teamRow('COMPLETED'), error: null })

    render(tree(
      <RequireAuth>
        <Secret />
      </RequireAuth>,
    ))

    await waitFor(() => expect(screen.getByText('PLAYER SCREEN')).toBeTruthy())
    expect(screen.queryByText(/CASE FILE UNAVAILABLE/i)).toBeNull()
  })

  it('shows the real completed status rather than treating it as unstarted', async () => {
    h.single.mockResolvedValue(playerRow(null))
    h.maybeSingle.mockResolvedValue({ data: teamRow('COMPLETED'), error: null })

    let seen: { status: string; score: number } | null = null
    function Probe() {
      const { team } = useApp()
      if (team) seen = { status: team.status, score: team.score }
      return <div>PLAYER SCREEN</div>
    }

    render(tree(<RequireAuth><Probe /></RequireAuth>))
    await waitFor(() => expect(screen.getByText('PLAYER SCREEN')).toBeTruthy())
    expect(seen).toEqual({ status: 'COMPLETED', score: 750 })
  })
})

describe('an unauthenticated caller', () => {
  it('is still redirected to the login form, not given a retry screen', async () => {
    h.getSession.mockResolvedValue({ data: { session: null }, error: null })

    render(tree(
      <RequireAuth>
        <Secret />
      </RequireAuth>,
    ))

    // The retry screen is for "your case file could not be read". A caller who is
    // genuinely not signed in belongs on the login form.
    await waitFor(() => expect(screen.queryByText(/CASE FILE UNAVAILABLE/i)).toBeNull())
    expect(screen.queryByText('PLAYER SCREEN')).toBeNull()
  })
})
