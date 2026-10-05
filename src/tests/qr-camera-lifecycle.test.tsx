/**
 * NEXUS — Field scanner: camera ownership and one-lookup-at-a-time
 *
 * The scanner is the one screen where a resource leak is not cosmetic. A camera
 * track that nothing holds a reference to cannot be stopped: the phone's camera
 * indicator stays lit, the sensor stays held, and the next attempt to arm the
 * reader commonly fails with NotReadableError. On a wall of markers at a live
 * event that is a dead scanner, and the player cannot get it back without
 * reloading the page.
 *
 * These tests drive the real component with a fake camera rather than asserting
 * on the source text, because the leak was a property of the ORDER of operations
 * (a ref overwritten before the previous resource was released), not of any one
 * line.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerQR } from '@/features/player/QR'

const scanQR = vi.fn()

vi.mock('@/hooks/useGameEngine', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useGameEngine')>(
    '@/hooks/useGameEngine',
  )
  return { ...actual, useGameEngine: () => ({ scanQR }) }
})

const connectionState = { isOffline: false }
vi.mock('@/hooks/useConnection', () => ({
  useConnection: () => connectionState,
}))

vi.mock('@/contexts/QASimulatorContext', () => ({
  QASimulatorContext: { isActive: false },
}))

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>
}

interface FakeStream {
  getVideoTracks: () => FakeTrack[]
  getTracks: () => FakeTrack[]
}

function fakeStream(): FakeStream & { tracks: FakeTrack[] } {
  const tracks: FakeTrack[] = [{ stop: vi.fn() }]
  return {
    tracks,
    getVideoTracks: () => tracks,
    getTracks: () => tracks,
  }
}

/** A promise whose resolution the test controls, so a camera can arrive late. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

let streams: FakeStream[] = []
let getUserMedia: ReturnType<typeof vi.fn>

function renderScanner() {
  return render(
    <MemoryRouter>
      <PlayerQR />
    </MemoryRouter>,
  )
}

async function arm() {
  const button = screen.getByRole('button', { name: /ARM OPTICAL READER/i })
  await act(async () => {
    fireEvent.click(button)
  })
}

beforeEach(() => {
  streams = []
  scanQR.mockReset()
  scanQR.mockResolvedValue({ discovered: true, nodeCode: 'P02' })
  connectionState.isOffline = false

  getUserMedia = vi.fn(async () => {
    const stream = fakeStream()
    streams.push(stream)
    return stream
  })

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    writable: true,
    value: { getUserMedia },
  })
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    writable: true,
    value: true,
  })
  // jsdom has no media pipeline, so play() needs to be a real resolved promise.
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the scanner owns exactly one camera', () => {
  it('releases the camera when the player backs out of an arm that is still pending', async () => {
    const camera = deferred<FakeStream>()
    getUserMedia.mockImplementationOnce(() => camera.promise as unknown as Promise<MediaStream>)

    renderScanner()
    fireEvent.click(screen.getByRole('button', { name: /ARM OPTICAL READER/i }))
    await act(async () => {})
    await waitFor(() => expect(screen.getByRole('button', { name: /Exit viewfinder/i })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Exit viewfinder/i }))

    const late = fakeStream()
    await act(async () => {
      camera.resolve(late)
      await Promise.resolve()
    })
    expect(late.tracks[0].stop).toHaveBeenCalledTimes(1)
  })

  it('does not leave a live track behind to block the next scanner', async () => {
    // The real-world symptom of the leak: the phone still holds the sensor, so
    // re-opening the reader fails with NotReadableError and the player cannot
    // scan at all. Here the fake camera refuses to arm while a track is live,
    // which makes the leak fail loudly instead of silently.
    let live = 0
    getUserMedia.mockImplementation(async () => {
      if (live > 0) throw Object.assign(new Error('device in use'), { name: 'NotReadableError' })
      const stream = fakeStream()
      live += 1
      stream.getTracks = () => [
        {
          stop: vi.fn(() => {
            live -= 1
          }),
        } as FakeTrack,
      ]
      stream.getVideoTracks = () => stream.getTracks()
      streams.push(stream)
      return stream
    })

    const first = renderScanner()
    await arm()
    await waitFor(() => expect(streams).toHaveLength(1))

    first.unmount()
    expect(live).toBe(0)

    // A fresh scanner must be able to arm. With the leak this throws
    // NotReadableError and the player is stuck with a camera they cannot restart.
    renderScanner()
    await arm()
    await waitFor(() => expect(streams).toHaveLength(2))
  })

  it('stops a camera that arrives after the screen is gone', async () => {
    // The permission prompt is outside our control: the player can hit back
    // while it is up. The stream still arrives, and a stream that arrives with
    // nothing waiting for it has to be released where it lands.
    const camera = deferred<FakeStream>()
    getUserMedia.mockImplementationOnce(() => camera.promise as unknown as Promise<MediaStream>)

    const { unmount } = renderScanner()
    fireEvent.click(screen.getByRole('button', { name: /ARM OPTICAL READER/i }))

    // Let the click handler reach its await before the screen goes away.
    await act(async () => {})
    unmount()

    const late = fakeStream()
    await act(async () => {
      camera.resolve(late)
      await Promise.resolve()
    })

    expect(late.tracks[0].stop).toHaveBeenCalledTimes(1)
  })

  it('does not arm a second camera when the player double-taps the arm button', async () => {
    // A double-tap is one event pair, so both handlers run before React has
    // re-rendered to hide the button. That is enough to issue two getUserMedia
    // calls for one tap, and with single-slot refs one of the two streams is
    // then never referenced by anything that could stop it.
    const camera = deferred<FakeStream>()
    getUserMedia.mockImplementation(() => camera.promise as unknown as Promise<MediaStream>)

    renderScanner()
    const button = screen.getByRole('button', { name: /ARM OPTICAL READER/i })

    // Both clicks in a single batch: no re-render between them.
    await act(async () => {
      button.click()
      button.click()
      button.click()
    })

    expect(getUserMedia).toHaveBeenCalledTimes(1)

    const stream = fakeStream()
    await act(async () => {
      camera.resolve(stream)
      await Promise.resolve()
    })
    expect(streams).toHaveLength(0)
  })
})

describe('one marker produces one lookup', () => {
  it('sends a single lookup when the same code is submitted again mid-flight', async () => {
    // The submit button being disabled is a UI guard, not a correctness one: the
    // form still submits on Enter, and a player retyping the reference printed
    // under a marker is an ordinary thing to do while waiting for an answer.
    const scan = deferred<{ discovered: boolean; nodeCode: string }>()
    scanQR.mockImplementation(() => scan.promise)

    renderScanner()
    fireEvent.click(screen.getByRole('button', { name: /SERVICE PORT \/ MANUAL ENTRY/i }))

    const input = screen.getByLabelText(/marker code/i)
    const form = input.closest('form')!

    const submitSameCodeTwice = async () => {
      await act(async () => {
        fireEvent.change(input, { target: { value: 'QR-NODE-02' } })
      })
      fireEvent.submit(form)
      fireEvent.submit(form)
    }

    await submitSameCodeTwice()
    await submitSameCodeTwice()

    expect(scanQR).toHaveBeenCalledTimes(1)

    await act(async () => {
      scan.resolve({ discovered: true, nodeCode: 'P02' })
      await Promise.resolve()
    })
  })

  it('accepts the next code once the previous lookup has settled', async () => {
    // The gate is the promise, not a timer. A slow Bureau answer used to let the
    // next marker through while the first was still in flight.
    renderScanner()
    fireEvent.click(screen.getByRole('button', { name: /SERVICE PORT \/ MANUAL ENTRY/i }))
    const input = screen.getByLabelText(/marker code/i)
    const form = input.closest('form')!

const first = deferred<{ discovered: boolean; nodeCode: string }>()
    scanQR.mockImplementationOnce(() => first.promise)

    await act(async () => {
      fireEvent.change(input, { target: { value: 'QR-NODE-02' } })
    })
    fireEvent.submit(form)
    expect(scanQR).toHaveBeenCalledTimes(1)

    // Blocked while in flight.
    await act(async () => {
      fireEvent.change(input, { target: { value: 'QR-NODE-03' } })
    })
    fireEvent.submit(form)
    expect(scanQR).toHaveBeenCalledTimes(1)

    await act(async () => {
      first.resolve({ discovered: true, nodeCode: 'P03' })
      await Promise.resolve()
    })

    await act(async () => {
      fireEvent.change(input, { target: { value: 'QR-NODE-03' } })
    })
    fireEvent.submit(form)
    await waitFor(() => expect(scanQR).toHaveBeenCalledTimes(2))
    expect(scanQR).toHaveBeenLastCalledWith('QR-NODE-03')
  })
})

describe('a refused scan is explained rather than feared', () => {
  it('does not tell a player their camera needs TLS when the link is simply down', async () => {
    // `isOffline` is true while the link is still coming up on a cold load.
    // Claiming a TLS problem there sends them to solve a problem they do not have.
    connectionState.isOffline = true
    renderScanner()

    await waitFor(() =>
      expect(screen.getByText(/OPTICAL ACQUISITION UNAVAILABLE \/ OFFLINE/i)).toBeTruthy(),
    )
    expect(screen.queryByText(/SECURE CHANNEL REQUIRED/i)).toBeNull()
  })

  it('cannot be armed at all while offline', async () => {
    connectionState.isOffline = true
    renderScanner()
    expect(screen.getByRole('button', { name: /ARM OPTICAL READER/i })).toHaveProperty('disabled', true)
    expect(getUserMedia).not.toHaveBeenCalled()
  })
})