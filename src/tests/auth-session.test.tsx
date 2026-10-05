/**
 * Auth / session robustness: expired session, refresh failure, multi-tab
 * sign-out and sign-in, double submit, unmount safety and storage failures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'

type AuthCallback = (event: string, session: { user: { id: string } } | null) => void

const h = vi.hoisted(() => {
  const state = {
    authCallbacks: [] as Array<(event: string, session: unknown) => void>,
    getSession: vi.fn(),
    setSession: vi.fn(),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(),
    invoke: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    removeChannel: vi.fn(),
    channel: vi.fn(),
    unsubscribe: vi.fn(),
  }
  return state
})

vi.mock('@/lib/supabase', () => {
  const query = { select: () => query, eq: () => query, single: h.single, maybeSingle: h.maybeSingle }
  return {
    supabase: {
      auth: {
        getSession: h.getSession,
        setSession: h.setSession,
        signOut: h.signOut,
        signInWithPassword: h.signInWithPassword,
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          h.authCallbacks.push(cb)
          return { data: { subscription: { unsubscribe: h.unsubscribe } } }
        },
      },
      from: () => query,
      functions: { invoke: h.invoke },
      channel: h.channel,
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
import { AdminProvider, useAdmin } from '@/app/providers/AdminProvider'
import { RequireAdmin } from '@/components/auth/RequireAdmin'

const playerRow = (id: string, authUserId: string, name = 'Alpha') => ({
  data: {
    id,
    team_id: `team-${id}`,
    role: 'NAVIGATOR',
    display_name: name,
    joined_at: null,
    is_connected: true,
    last_seen_at: null,
    device_info: null,
    status: 'ACTIVE',
    created_at: '2026-01-01',
    login_code_hash: null,
    auth_user_id: authUserId,
    device_session_token: null,
    device_fingerprint_hash: null,
    teams: {
      id: `team-${id}`, name: `Team ${name}`, code: 'T1', status: 'ACTIVE', created_at: '2026-01-01',
      started_at: null, completed_at: null, current_node_id: null, score: 0, metadata: {},
    },
  },
  error: null,
})

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>

const emit = async (event: string, session: unknown) => {
  await act(async () => {
    h.authCallbacks.forEach(cb => (cb as AuthCallback)(event, session as { user: { id: string } } | null))
    await new Promise(r => setTimeout(r, 5))
  })
}

beforeEach(() => {
  h.authCallbacks.length = 0
  h.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null })
  h.setSession.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  h.signOut.mockReset().mockResolvedValue({ error: null })
  h.signInWithPassword.mockReset()
  h.invoke.mockReset()
  h.single.mockReset()
  h.removeChannel.mockReset()
  h.unsubscribe.mockReset()
  const chain = { on: () => chain, subscribe: () => chain }
  h.channel.mockReset().mockReturnValue(chain)
  window.localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('player session', () => {
  it('finishes initializing as signed-out when getSession rejects (no stuck loading guard)', async () => {
    h.getSession.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('treats an expired session whose refresh failed (session null + error) as signed out', async () => {
    h.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid Refresh Token' } })
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('restores an existing session', async () => {
    h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    h.single.mockResolvedValue(playerRow('p1', 'u1'))
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.player?.displayName).toBe('Alpha')
  })

  it('restores a finished team, whose own row was once unreadable', async () => {
    // `select('*, teams(*)')` resolves the embed under the "Players can read own
    // team" policy, and that policy used to exclude COMPLETED, DISQUALIFIED,
    // ABANDONED and RESET. PostgREST returns NULL for a to-one embed the caller
    // cannot read, rather than an error, so there is no status code to branch
    // on. The client dereferenced it, threw a TypeError, swallowed it, and left
    // the player signed out - so a team that completed the case could never
    // load the ending screen, and logging in again was undone by the next
    // refresh. Migration 2026100503 repairs the policy; this pins the client so
    // a null embed recovers instead of crashing.
    h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    const row = playerRow('p1', 'u1')
    h.single.mockResolvedValue({ ...row, data: { ...row.data, teams: null } })
    // The embed was refused, but the row itself is readable.
    h.maybeSingle.mockResolvedValue({ data: { ...row.data.teams, status: 'COMPLETED' }, error: null })

    const { result } = renderHook(() => useApp(), { wrapper })

    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    // The player identity survives, so the guard does not bounce them to login,
    // and the team carries its REAL status rather than a REGISTERED placeholder -
    // a placeholder would drop a finished team back into gameplay and hide the
    // ending, and would report a score of 0 against its real total.
    expect(result.current.player?.displayName).toBe('Alpha')
    expect(result.current.team?.status).toBe('COMPLETED')
    expect(result.current.sessionLoadError).toBeNull()
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('reports a recoverable error instead of inventing a team when the row cannot be read at all', async () => {
    // Both the embed and the single re-read refused. There is nothing truthful to
    // put in `team`, so the recovery has to be visible rather than fabricated.
    h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    const row = playerRow('p1', 'u1')
    h.single.mockResolvedValue({ ...row, data: { ...row.data, teams: null } })
    h.maybeSingle.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useApp(), { wrapper })

    await waitFor(() => expect(result.current.sessionLoadError).toBeTruthy())
    expect(result.current.team).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.sessionLoadError).toMatch(/case file/i)
  })

  it('signs out when another tab signs out (or refresh fails: SIGNED_OUT)', async () => {
    h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    h.single.mockResolvedValue(playerRow('p1', 'u1'))
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await emit('SIGNED_OUT', null)
    expect(result.current.isAuthenticated).toBe(false)
    expect(h.removeChannel).toHaveBeenCalled()
  })

  it('does not drop the session on TOKEN_REFRESHED', async () => {
    h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    h.single.mockResolvedValue(playerRow('p1', 'u1'))
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    await emit('TOKEN_REFRESHED', { user: { id: 'u1' } })
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('switches player when another tab signs in as a different user', async () => {
    h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    h.single.mockResolvedValueOnce(playerRow('p1', 'u1', 'Alpha'))
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.player?.displayName).toBe('Alpha'))

    h.single.mockResolvedValueOnce(playerRow('p2', 'u2', 'Bravo'))
    await emit('SIGNED_IN', { user: { id: 'u2' } })
    await waitFor(() => expect(result.current.player?.displayName).toBe('Bravo'))
  })

  const loginResponse = {
    data: {
      success: true,
      player: { id: 'p1', teamId: 't1', role: 'NAVIGATOR', displayName: 'Alpha' },
      team: { name: 'Team A', status: 'ACTIVE' },
      session: { access_token: 'a', refresh_token: 'r' },
    },
    error: null,
  }

  it('double-submit joins the in-flight login: one request, one result', async () => {
    let release: (v: unknown) => void = () => undefined
    h.invoke.mockReturnValue(new Promise(res => { release = res }))
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))

    let first!: Promise<{ success: boolean }>
    let second!: Promise<{ success: boolean }>
    act(() => {
      first = result.current.login('ABCD2345')
      second = result.current.login('ABCD2345')
    })
    await act(async () => { release(loginResponse) })
    await expect(first).resolves.toEqual({ success: true })
    await expect(second).resolves.toEqual({ success: true })
    expect(h.invoke).toHaveBeenCalledTimes(1)

    // The guard is released afterwards.
    h.invoke.mockResolvedValue(loginResponse)
    await act(async () => { await result.current.login('ABCD2345') })
    expect(h.invoke).toHaveBeenCalledTimes(2)
  })

  it('login still succeeds when localStorage.setItem throws (quota / private mode)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    h.invoke.mockResolvedValue(loginResponse)
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    let outcome!: { success: boolean }
    await act(async () => { outcome = await result.current.login('ABCD2345') })
    expect(outcome.success).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('login fails cleanly when the session cannot be set', async () => {
    h.invoke.mockResolvedValue(loginResponse)
    h.setSession.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } })
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    let outcome!: { success: boolean; error?: string }
    await act(async () => { outcome = await result.current.login('ABCD2345') })
    expect(outcome.success).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logout clears local state even when signOut rejects, with no unhandled rejection', async () => {
    h.invoke.mockResolvedValue(loginResponse)
    h.signOut.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    await act(async () => { await result.current.login('ABCD2345') })
    expect(result.current.isAuthenticated).toBe(true)
    await act(async () => { await result.current.logout() })
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('does not set state after unmount while init is pending', async () => {
    let resolveSession: (v: unknown) => void = () => undefined
    h.getSession.mockReturnValue(new Promise(res => { resolveSession = res }))
    const errorSpy = vi.spyOn(console, 'error')
    const { unmount } = renderHook(() => useApp(), { wrapper })
    unmount()
    await act(async () => { resolveSession({ data: { session: { user: { id: 'u1' } } }, error: null }) })
    expect(h.single).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

const adminWrapper = ({ children }: { children: ReactNode }) => <AdminProvider>{children}</AdminProvider>
const adminOk = { data: { authenticated: true, isAdmin: true, adminRole: 'ADMIN', username: 'root', userId: 'a1' }, error: null }

describe('admin session', () => {
  it('initializes as non-admin when getSession rejects', async () => {
    h.getSession.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useAdmin(), { wrapper: adminWrapper })
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    expect(result.current.isAdmin).toBe(false)
  })

  it('signs the admin out on SIGNED_OUT from another tab', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    h.invoke.mockResolvedValue(adminOk)
    const { result } = renderHook(() => useAdmin(), { wrapper: adminWrapper })
    await waitFor(() => expect(result.current.isAdmin).toBe(true))
    await emit('SIGNED_OUT', null)
    expect(result.current.isAdmin).toBe(false)
  })

  it('does not re-run the admin check on TOKEN_REFRESHED', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    h.invoke.mockResolvedValue(adminOk)
    const { result } = renderHook(() => useAdmin(), { wrapper: adminWrapper })
    await waitFor(() => expect(result.current.isAdmin).toBe(true))
    const calls = h.invoke.mock.calls.length
    await emit('TOKEN_REFRESHED', { user: { id: 'a1' } })
    expect(h.invoke.mock.calls.length).toBe(calls)
    expect(result.current.isAdmin).toBe(true)
  })

  it('a stale slow check cannot overwrite a newer result', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    let releaseFirst: (v: unknown) => void = () => undefined
    h.invoke
      .mockReturnValueOnce(new Promise(res => { releaseFirst = res }))
      .mockResolvedValueOnce({ data: { authenticated: true, isAdmin: false }, error: null })
    const { result } = renderHook(() => useAdmin(), { wrapper: adminWrapper })
    await waitFor(() => expect(h.invoke).toHaveBeenCalledTimes(1))
    await act(async () => { await result.current.checkAdmin() })
    expect(result.current.isAdmin).toBe(false)
    await act(async () => { releaseFirst(adminOk) })
    expect(result.current.isAdmin).toBe(false)
  })

  it('double-submit of admin login signs in once', async () => {
    h.getSession.mockResolvedValue({ data: { session: null } })
    let release: (v: unknown) => void = () => undefined
    h.signInWithPassword.mockReturnValue(new Promise(res => { release = res }))
    h.invoke.mockResolvedValue(adminOk)
    const { result } = renderHook(() => useAdmin(), { wrapper: adminWrapper })
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    let a!: Promise<unknown>
    let b!: Promise<unknown>
    act(() => {
      a = result.current.login('a@b.c', 'pw')
      b = result.current.login('a@b.c', 'pw')
    })
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    await act(async () => { release({ data: { session: { access_token: 't' } }, error: null }) })
    await expect(a).resolves.toEqual({ success: true })
    await expect(b).resolves.toEqual({ success: true })
    expect(h.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('signs out a non-admin account and survives signOut rejecting', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    h.invoke.mockResolvedValue({ data: { authenticated: true, isAdmin: false }, error: null })
    h.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    h.signOut.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useAdmin(), { wrapper: adminWrapper })
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    let out!: { success: boolean }
    await act(async () => { out = await result.current.login('a@b.c', 'pw') })
    expect(out.success).toBe(false)
  })

  it('keeps the protected screen mounted during a background re-check', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    h.invoke.mockResolvedValue(adminOk)
    let mounts = 0
    function Probe() {
      mounts++
      return <div>secret</div>
    }
    render(
      <AdminProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin" element={<RequireAdmin><Probe /></RequireAdmin>} />
            <Route path="/admin/login" element={<div>login</div>} />
          </Routes>
        </MemoryRouter>
      </AdminProvider>,
    )
    await screen.findByText('secret')
    // A slow background re-check (new sign-in event) must not swap the page for the spinner.
    h.invoke.mockReturnValue(new Promise(() => undefined))
    await emit('SIGNED_IN', { user: { id: 'a1' } })
    expect(screen.queryByText('Checking permissions…')).toBeNull()
    expect(screen.getByText('secret')).toBeTruthy()
    expect(mounts).toBeGreaterThan(0)
  })

  it('redirects to login after the admin signs out in another tab', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    h.invoke.mockResolvedValue(adminOk)
    render(
      <AdminProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin" element={<RequireAdmin><div>secret</div></RequireAdmin>} />
            <Route path="/admin/login" element={<div>login page</div>} />
          </Routes>
        </MemoryRouter>
      </AdminProvider>,
    )
    await screen.findByText('secret')
    await emit('SIGNED_OUT', null)
    await screen.findByText('login page')
  })
})
