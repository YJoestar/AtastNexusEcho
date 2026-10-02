/**
 * NEXUS ECHO — Glitch controller
 *
 * One place decides whether the screen is allowed to misbehave. Callers say
 * what happened (`glitch({ type, intensity, duration })`); the controller
 * decides whether it is shown, how long it may last, and in what form.
 *
 * Rules, enforced here rather than trusted to callers:
 *   - effects are short: every type has a hard duration ceiling
 *   - effects are rare: anything below "strong" is dropped inside a cooldown
 *   - effects never strobe: nothing here repeats faster than the cooldown, and
 *     the renderer never flashes more than once per event
 *   - under prefers-reduced-motion (or the user's own "off") the event is
 *     delivered with `reduced: true` and the renderer must not move anything;
 *     with effects "off" nothing is delivered at all
 *
 * Nothing here draws. `GlitchLayer` subscribes and paints.
 */

export type GlitchType = 'LIGHT' | 'SIGNAL' | 'TRACKING' | 'FRAME' | 'CORRUPTION' | 'FULL'

export interface GlitchRequest {
  type: GlitchType
  /** 0..1. Defaults per type. */
  intensity?: number
  /** ms. Clamped to the type's ceiling. */
  duration?: number
  /** Bypass the cooldown. Reserved for authored story moments. */
  force?: boolean
}

export interface GlitchEvent {
  id: number
  type: GlitchType
  intensity: number
  duration: number
  /** True when motion is not allowed: the renderer must use a still, opacity-only cue. */
  reduced: boolean
}

export type EffectsPreference = 'full' | 'reduced' | 'off'

const MAX_DURATION: Record<GlitchType, number> = {
  LIGHT: 350,
  SIGNAL: 600,
  TRACKING: 700,
  FRAME: 450,
  CORRUPTION: 900,
  FULL: 1400,
}

const DEFAULT_INTENSITY: Record<GlitchType, number> = {
  LIGHT: 0.25,
  SIGNAL: 0.45,
  TRACKING: 0.5,
  FRAME: 0.4,
  CORRUPTION: 0.7,
  FULL: 0.9,
}

const MIN_DURATION = 120
/** Between two non-forced events. Keeps the rate far below any strobe threshold. */
export const GLITCH_COOLDOWN_MS = 2500
/** A strong event earns a longer calm afterwards, so contrast survives. */
export const GLITCH_STRONG_COOLDOWN_MS = 6000
const STRONG = 0.8
const PREFERENCE_KEY = 'nexus_effects_v1'

type Listener = (event: GlitchEvent) => void

const listeners = new Set<Listener>()
let nextId = 1
let lastAt = -Infinity
let lastCooldown = GLITCH_COOLDOWN_MS
let clock: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
let preferenceOverride: EffectsPreference | null = null

function readStoredPreference(): EffectsPreference {
  try {
    const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(PREFERENCE_KEY)
    return stored === 'off' || stored === 'reduced' || stored === 'full' ? stored : 'full'
  } catch {
    return 'full'
  }
}

export function getEffectsPreference(): EffectsPreference {
  return preferenceOverride ?? readStoredPreference()
}

export function setEffectsPreference(preference: EffectsPreference): void {
  preferenceOverride = preference
  try {
    window.localStorage.setItem(PREFERENCE_KEY, preference)
  } catch {
    // Storage is a convenience; the in-memory choice still holds for the session.
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Phones and older machines get still texture and rare, cheap events. */
export function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  // Chrome reports memory in coarse buckets; 2 GB and below is genuinely weak.
  return (nav.deviceMemory !== undefined && nav.deviceMemory <= 2)
    || (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2)
}

export function subscribeGlitch(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/**
 * Ask for a glitch. Returns the delivered event, or null when it was dropped
 * (cooldown, no listeners, or the user turned effects off).
 */
export function glitch(request: GlitchRequest): GlitchEvent | null {
  if (listeners.size === 0) return null
  const preference = getEffectsPreference()
  if (preference === 'off') return null

  const intensity = Math.max(0, Math.min(1, request.intensity ?? DEFAULT_INTENSITY[request.type]))
  if (intensity === 0) return null

  const now = clock()
  if (!request.force && now - lastAt < lastCooldown) return null

  const event: GlitchEvent = {
    id: nextId++,
    type: request.type,
    intensity,
    duration: Math.max(MIN_DURATION, Math.min(MAX_DURATION[request.type], request.duration ?? MAX_DURATION[request.type])),
    reduced: preference === 'reduced' || prefersReducedMotion(),
  }
  lastAt = now
  lastCooldown = intensity >= STRONG ? GLITCH_STRONG_COOLDOWN_MS : GLITCH_COOLDOWN_MS
  listeners.forEach(listener => listener(event))
  return event
}

/** The full degraded-media sequence: freeze, tear, static, frame shift, recover. */
export function signalInterruption(force = false): GlitchEvent | null {
  return glitch({ type: 'FULL', intensity: 0.9, duration: 1100, force })
}

/**
 * How a physical or signal condition should read on screen. Water, folds and
 * stains are things that happened to paper, not to a signal, so they cause no
 * screen effect: the object itself is painted to look that way.
 */
export function glitchForCondition(condition: string | null | undefined): GlitchRequest | null {
  switch ((condition ?? '').toUpperCase()) {
    case 'FADED':
    case 'DEGRADED':
      return { type: 'LIGHT', intensity: 0.25 }
    case 'DAMAGED':
    case 'TORN':
    case 'PARTIAL':
    case 'INCOMPLETE':
    case 'BURNED':
      return { type: 'SIGNAL', intensity: 0.45 }
    case 'ANOMALOUS':
      return { type: 'CORRUPTION', intensity: 0.7 }
    default:
      return null
  }
}

/** Opening a camera feed: a short tracking roll as the signal locks. */
export function glitchForMedium(medium: string): GlitchRequest | null {
  return medium === 'SURVEILLANCE' ? { type: 'TRACKING', intensity: 0.5, duration: 600 } : null
}

/** Test seam. Never called by the app. */
export function __resetGlitchForTests(now?: () => number): void {
  listeners.clear()
  nextId = 1
  lastAt = -Infinity
  lastCooldown = GLITCH_COOLDOWN_MS
  preferenceOverride = null
  clock = now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()))
}
