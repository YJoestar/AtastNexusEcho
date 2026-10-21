/**
 * NEXUS - game audio lifecycle
 *
 * The audio context used to be constructed at module scope, i.e. the instant
 * `useGameAudio` was imported. Browsers gate AudioContext behind an autoplay
 * policy: a context built before any user gesture starts `suspended`, and
 * `resume()` is only granted once the page has been interacted with. So the
 * old module-scope context was born suspended, before any gesture could have
 * happened, and the opening sounds of a session were silently discarded.
 *
 * These tests pin the fix: the context is built lazily, inside the call that
 * actually needs it (which is a gesture handler), it is never built merely by
 * importing the module, and a mute is honoured without touching audio at all.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

type FakeCtx = {
  state: string
  resumeCalls: number
  oscillators: number
  destinations: number
  resume: () => Promise<void>
  createOscillator: () => unknown
  createGain: () => unknown
  createBuffer: (channels: number, length: number, rate: number) => unknown
  createBufferSource: () => unknown
}

const built: FakeCtx[] = []

function installAudioContext() {
  class FakeAudioContext implements FakeCtx {
    state = 'suspended'
    resumeCalls = 0
    oscillators = 0
    destinations = 0
    currentTime = 0
    sampleRate = 48000
    destination = { kind: 'destination' }
    constructor() {
      built.push(this as unknown as FakeCtx)
    }
    resume() {
      this.resumeCalls += 1
      this.state = 'running'
      return Promise.resolve()
    }
    createOscillator() {
      this.oscillators += 1
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      }
    }
    createGain() {
      this.destinations += 1
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
      }
    }
    createBuffer(_channels: number, length: number) {
      return { getChannelData: () => new Float32Array(length) }
    }
    createBufferSource() {
      return { buffer: null, connect: () => {}, start: () => {} }
    }
  }
  ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext
}

/**
 * The module keeps its context in a module-level variable, so each test needs a
 * fresh copy of the module to observe construction from zero.
 */
async function freshModule() {
  vi.resetModules()
  return import('@/hooks/useGameAudio')
}

beforeEach(() => {
  built.length = 0
  localStorage.clear()
  installAudioContext()
})

describe('game audio lifecycle', () => {
  it('does not construct an AudioContext merely by importing the module', async () => {
    const audio = await freshModule()
    expect(typeof audio.SFX.verified).toBe('function')
    expect(built.length, 'an AudioContext was built at import time').toBe(0)
  })

  it('constructs the context on the first sound, and only once', async () => {
    const { SFX } = await freshModule()
    SFX.scanTick()
    expect(built.length).toBe(1)
    SFX.verified()
    SFX.submit()
    expect(built.length, 'the context should be reused, not rebuilt per sound').toBe(1)
  })

  it('resumes a suspended context rather than playing into it', async () => {
    const { SFX } = await freshModule()
    SFX.scanTick()
    expect(built[0].resumeCalls).toBe(1)
    expect(built[0].oscillators).toBe(1)
    // Once running, further sounds must not keep re-requesting a resume.
    SFX.scanTick()
    expect(built[0].resumeCalls).toBe(1)
  })

  it('builds no context while muted, and no oscillator is ever created', async () => {
    const { setAudioMuted, SFX, useAudioMute } = await freshModule()
    expect(typeof useAudioMute).toBe('function')
    setAudioMuted(true)
    SFX.error()
    SFX.verified()
    expect(built.length, 'muting must gate the synth at the source').toBe(0)

    setAudioMuted(false)
    SFX.verified()
    expect(built.length).toBe(1)
  })

  it('runs silent, not fatally, when the browser has no AudioContext at all', async () => {
    const audio = await freshModule()
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
    expect(() => audio.SFX.verified()).not.toThrow()
    expect(built.length).toBe(0)
  })
})
