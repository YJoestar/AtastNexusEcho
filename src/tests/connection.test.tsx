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
import { useConnection, type ConnectionState } from '@/hooks/useConnection'
import { OfflineBanner } from '@/components/player/OfflineBanner'

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
})

afterEach(() => {
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

    await waitFor(() => expect(result.current.status).toBe('degraded'))
    expect(result.current.lastProbedAt).not.toBeNull()
  })
})

describe('OfflineBanner copy', () => {
  const baseConnection: ConnectionState = {
    status: 'offline',
    isBrowserOnline: false,
    isServerReachable: false,
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