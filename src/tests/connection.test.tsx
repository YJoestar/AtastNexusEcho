/**
 * NEXUS - Connection state tests
 *
 * navigator.onLine is not a connectivity check. On campus Wi-Fi it very often
 * reports "online" with no route to the server, which is precisely the case
 * that used to look healthy while every action failed. These tests drive the
 * real hook against a stubbed fetch and the real online/offline events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import { useConnection, __resetConnectionStoreForTests, type ConnectionState } from '@/hooks/useConnection'
import { OfflineBanner } from '@/components/player/OfflineBanner'
import { StrictMode } from 'react'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

function fireConnectionEvent(name: 'online' | 'offline') {
  window.dispatchEvent(new Event(name))
}

let fetchStub: ReturnType<typeof vi.fn>

beforeEach(() => {
  setOnline(true)
  fetchStub = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchStub)
  // Connectivity is now one module-level store shared by every consumer, so its
  // verdict survives between cases unless it is cleared. Without this, a test
  // inherits the previous test's probe result.
  __resetConnectionStoreForTests()
})

afterEach(() => {
  __resetConnectionStoreForTests()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useConnection', () => {
  it('reports online once the health probe succeeds', async () => {
    const { result } = renderHook(() => useConnection())

    await waitFor(() => expect(result.current.status).toBe('online'))
    expect(result.current.isServerReachable).toBe(true)
    expect(result.current.isOffline).toBe(false)
    expect(fetchStub).toHaveBeenCalled()
    expect(String(fetchStub.mock.calls[0][0])).toContain('/auth/v1/health')
  })

  it('reports degraded when the link is up but the server cannot be reached', async () => {
    fetchStub.mockRejectedValue(new Error('Failed to fetch'))
    const { result } = renderHook(() => useConnection())

    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.isBrowserOnline).toBe(true)
    expect(result.current.isServerReachable).toBe(false)
    expect(result.current.isOffline).toBe(true)
  })

  it('reports offline when the device drops the link entirely', async () => {
    setOnline(false)
    const { result } = renderHook(() => useConnection())

    await waitFor(() => expect(result.current.status).toBe('offline'))
    expect(result.current.isOffline).toBe(true)
  })

  it('re-probes when the browser says the link came back', async () => {
    setOnline(false)
    const { result } = renderHook(() => useConnection())
    await waitFor(() => expect(result.current.status).toBe('offline'))

    setOnline(true)
    await act(async () => {
      fireConnectionEvent('online')
    })

    await waitFor(() => expect(result.current.status).toBe('online'))
  })

  it('never claims to be connected when the probe is refused', async () => {
    fetchStub.mockResolvedValue({ ok: false, status: 503 })
    const { result } = renderHook(() => useConnection())

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(result.current.lastProbedAt).not.toBeNull()
  })

  it('does not call a gated 401 "no route to server"', async () => {
    // The regression this protects: the health endpoint answers 401 when the
    // probe omits the project apikey. A 401 proves there IS a route.
    fetchStub.mockResolvedValue({ ok: false, status: 401 })
    const { result } = renderHook(() => useConnection())

    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(result.current.isBrowserOnline).toBe(true)
    expect(result.current.isServerReachable).toBe(true)
    expect(result.current.isServerHealthy).toBe(false)
    expect(result.current.lastProbeStatus).toBe(401)
    expect(result.current.isOffline).toBe(true)
  })

  it('sends the project apikey so the health endpoint does not reject the probe', async () => {
    renderHook(() => useConnection())

    await waitFor(() => expect(fetchStub).toHaveBeenCalled())
    const init = fetchStub.mock.calls[0][1] as RequestInit | undefined
    const headers = (init?.headers ?? {}) as Record<string, string>
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      expect(headers.apikey).toBe(import.meta.env.VITE_SUPABASE_ANON_KEY)
    }
  })
})

describe('OfflineBanner copy', () => {
  const baseConnection: ConnectionState = {
    status: 'offline',
    isBrowserOnline: false,
    isServerReachable: false,
    isServerHealthy: false,
    lastProbeStatus: null,
    isOffline: true,
    lastProbedAt: null,
    probe: async () => {},
  }

  it('tells the player what will happen to a queued answer', () => {
    const { container } = render(<OfflineBanner connection={baseConnection} queuedCount={2} />)
    expect(container.textContent).toContain('OFFLINE')
    expect(container.textContent).toContain('2 submissions will be sent when you reconnect')
  })

  it('names the dead-server case separately from having no signal', () => {
    const { container } = render(
      <OfflineBanner connection={{ ...baseConnection, status: 'degraded', isBrowserOnline: true }} queuedCount={1} />,
    )
    expect(container.textContent).toContain('NO ROUTE TO SERVER')
    expect(container.textContent).toContain('1 submission held locally')
  })

  it('does not blame the network when the server answered and refused', () => {
    const { container } = render(
      <OfflineBanner
        connection={{ ...baseConnection, status: 'unavailable', isBrowserOnline: true, isServerReachable: true }}
      />,
    )
    expect(container.textContent).toContain('BUREAU COMMAND NOT RESPONDING')
    expect(container.textContent).not.toContain('NO ROUTE TO SERVER')
  })

  it('says nothing on screen when the connection is healthy and nothing is queued', () => {
    const { container } = render(
      <OfflineBanner
        connection={{ ...baseConnection, status: 'online', isOffline: false, isServerReachable: true }}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it('acknowledges a replay once the answers are through', () => {
    const { container } = render(
      <OfflineBanner
        connection={{ ...baseConnection, status: 'online', isOffline: false, isServerReachable: true }}
        lastFlush={[{ id: 'a', nodeId: 'P01', answer: 'CDFDEFF', queuedAt: '', attempts: 0 }]}
      />,
    )
    expect(container.textContent).toContain('SUBMITTED')
    expect(container.textContent).toContain('1 queued answer delivered.')
  })
})

/**
 * Connectivity is a property of the device, not of a component.
 *
 * `PlayerLayout` calls the hook and then renders `PlayerHeader`, `OfflineBanner`
 * and `BottomNav`, which each called it again. Every player screen therefore ran
 * four independent probes on a 20s interval — five with the game engine mounted
 * — and because each instance had its own `inFlight` guard those guards
 * deduplicated nothing. In a room of handsets that is four to five identical
 * requests per device per interval, all aimed at the one endpoint players need.
 *
 * It was also possible to see the header read "online" while the banner
 * directly beneath it read "reconnecting": the two had probed at different
 * moments, and which one was right depended on which had finished last.
 */
describe('the probe is shared, not per-component', () => {
  // Five consumers on one screen, as PlayerLayout, its header, the banner and
  // the nav actually are.
  function FiveConsumers() {
    const layout = useConnection()
    const header = useConnection()
    const banner = useConnection()
    const nav = useConnection()
    const engine = useConnection()
    return (
      <div data-testid="statuses">
        {[layout, header, banner, nav, engine].map(s => s.status).join(',')}
      </div>
    )
  }

  it('probes once for the whole screen, however many components read it', async () => {
    render(<FiveConsumers />)

    await waitFor(() => expect(fetchStub).toHaveBeenCalled())
    const afterMount = fetchStub.mock.calls.length

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40))
    })

    // Five consumers, one probe. Before this change each one ran its own.
    expect(afterMount).toBe(1)
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it('shows every consumer the same status at the same time', async () => {
    const { getByTestId } = render(<FiveConsumers />)

    await waitFor(() => expect(getByTestId('statuses').textContent).toBe('online,online,online,online,online'))
  })

  it('cannot disagree mid-flight: a link drop reaches all consumers at once', async () => {
    const { getByTestId } = render(<FiveConsumers />)
    await waitFor(() => expect(getByTestId('statuses').textContent).toBe('online,online,online,online,online'))

    setOnline(false)
    await act(async () => {
      fireConnectionEvent('offline')
    })

    // One event, one shared verdict. There is no window in which the header
    // believes the link is up and the banner beneath it does not.
    expect(getByTestId('statuses').textContent).toBe('offline,offline,offline,offline,offline')
  })

  it('does not re-probe when one consumer replaces another', async () => {
    // The real navigation case: a detail screen unmounts as the next one
    // mounts. While the two overlap there is one shared verdict and no second
    // round trip to re-prove a link that is already known good.
    const first = renderHook(() => useConnection())
    await waitFor(() => expect(first.result.current.status).toBe('online'))
    const afterFirst = fetchStub.mock.calls.length

    const second = renderHook(() => useConnection())
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40))
    })

    expect(fetchStub.mock.calls.length).toBe(afterFirst)
    expect(second.result.current.status).toBe('online')

    first.unmount()
    second.unmount()
  })

  it('re-proves connectivity when the app starts up again after everyone left', async () => {
    const first = renderHook(() => useConnection())
    await waitFor(() => expect(first.result.current.status).toBe('online'))
    const afterFirst = fetchStub.mock.calls.length
    first.unmount()

    // A full teardown means the app genuinely left the screen. A verdict from
    // before that gap must not be presented as current.
    fetchStub.mockResolvedValue({ ok: false, status: 503 })
    const second = renderHook(() => useConnection())
    await waitFor(() => expect(second.result.current.status).toBe('unavailable'))
    expect(fetchStub.mock.calls.length).toBeGreaterThan(afterFirst)
    second.unmount()
  })

  it('still honours an explicit retry from the banner', async () => {
    const { result } = renderHook(() => useConnection())
    await waitFor(() => expect(result.current.status).toBe('online'))
    const before = fetchStub.mock.calls.length

    await act(async () => {
      await result.current.probe()
    })

    expect(fetchStub.mock.calls.length).toBe(before + 1)
  })

  it('survives StrictMode double-mounting with one probe, not two', async () => {
    // The app renders inside <StrictMode>, which mounts, unmounts and remounts
    // every effect. A teardown that treated that first unmount as "the app has
    // left" would tear the probe loop down and immediately build a second one.
    const { result } = renderHook(() => useConnection(), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    })

    await waitFor(() => expect(result.current.status).toBe('online'))
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40))
    })

    expect(fetchStub).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('online')
  })
})