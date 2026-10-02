import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GLITCH_COOLDOWN_MS,
  GLITCH_STRONG_COOLDOWN_MS,
  __resetGlitchForTests,
  glitch,
  glitchForCondition,
  glitchForMedium,
  setEffectsPreference,
  signalInterruption,
  subscribeGlitch,
  type GlitchEvent,
} from '@/lib/vfx/glitch'

let time = 0
let events: GlitchEvent[] = []
let stop: () => void

beforeEach(() => {
  time = 10_000
  __resetGlitchForTests(() => time)
  events = []
  stop = subscribeGlitch(event => events.push(event))
})
afterEach(() => {
  stop()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('glitch controller', () => {
  it('delivers an event with intensity and duration clamped', () => {
    const event = glitch({ type: 'LIGHT', intensity: 7, duration: 99_999 })
    expect(event).toMatchObject({ type: 'LIGHT', intensity: 1, duration: 350, reduced: false })
    time += GLITCH_STRONG_COOLDOWN_MS
    expect(glitch({ type: 'FULL', intensity: -1 })).toBeNull()
    expect(glitch({ type: 'SIGNAL', duration: 1 })?.duration).toBeGreaterThanOrEqual(120)
  })

  it('never exceeds a type\'s ceiling', () => {
    time += 100_000
    expect(glitch({ type: 'FULL', intensity: 0.5, duration: 60_000 })?.duration).toBe(1400)
  })

  it('drops a second effect inside the cooldown so nothing can strobe', () => {
    expect(glitch({ type: 'SIGNAL' })).not.toBeNull()
    time += GLITCH_COOLDOWN_MS - 1
    expect(glitch({ type: 'SIGNAL' })).toBeNull()
    time += 1
    expect(glitch({ type: 'SIGNAL' })).not.toBeNull()
    expect(events).toHaveLength(2)
  })

  it('leaves a longer calm after a strong event', () => {
    expect(glitch({ type: 'CORRUPTION', intensity: 0.95 })).not.toBeNull()
    time += GLITCH_COOLDOWN_MS + 1
    expect(glitch({ type: 'LIGHT' })).toBeNull()
    time = 10_000 + GLITCH_STRONG_COOLDOWN_MS
    expect(glitch({ type: 'LIGHT' })).not.toBeNull()
  })

  it('lets an authored story moment through the cooldown', () => {
    glitch({ type: 'SIGNAL' })
    expect(glitch({ type: 'FULL', force: true })).not.toBeNull()
  })

  it('does nothing when nothing is listening', () => {
    stop()
    expect(glitch({ type: 'SIGNAL' })).toBeNull()
  })

  it('is silent when the player turned effects off', () => {
    setEffectsPreference('off')
    expect(glitch({ type: 'FULL', force: true })).toBeNull()
    expect(events).toHaveLength(0)
  })

  it('marks events reduced for the "reduced" preference and for prefers-reduced-motion', () => {
    setEffectsPreference('reduced')
    expect(glitch({ type: 'SIGNAL' })?.reduced).toBe(true)

    __resetGlitchForTests(() => time)
    stop = subscribeGlitch(event => events.push(event))
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as MediaQueryList)
    expect(glitch({ type: 'SIGNAL' })?.reduced).toBe(true)
  })

  it('signalInterruption is a FULL event that stays under the ceiling', () => {
    const event = signalInterruption()
    expect(event).toMatchObject({ type: 'FULL' })
    expect(event!.duration).toBeLessThanOrEqual(1400)
  })
})

describe('what a condition looks like on screen', () => {
  it('leaves undamaged and merely physical conditions alone', () => {
    for (const condition of [undefined, null, 'NORMAL', 'STAINED', 'FOLDED', 'normal']) {
      expect(glitchForCondition(condition)).toBeNull()
    }
  })

  it('escalates with how much of the record was lost', () => {
    expect(glitchForCondition('faded')?.type).toBe('LIGHT')
    expect(glitchForCondition('DAMAGED')?.type).toBe('SIGNAL')
    expect(glitchForCondition('BURNED')?.type).toBe('SIGNAL')
    expect(glitchForCondition('ANOMALOUS')?.type).toBe('CORRUPTION')
    expect(glitchForCondition('ANOMALOUS')!.intensity!).toBeGreaterThan(glitchForCondition('DAMAGED')!.intensity!)
  })

  it('only camera feeds roll a tracking bar', () => {
    expect(glitchForMedium('SURVEILLANCE')?.type).toBe('TRACKING')
    expect(glitchForMedium('DOCUMENT')).toBeNull()
  })
})
