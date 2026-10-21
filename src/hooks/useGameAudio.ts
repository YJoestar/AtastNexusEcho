/**
 * NEXUS ECHO — Game Audio
 *
 * Lightweight procedural audio via Web Audio API.
 * No external assets. Sounds are short synth events that reinforce state
 * changes without becoming music or atmosphere by themselves.
 *
 * The player can mute every event (the toggle lives in the handset header);
 * the choice persists on the device. Muting gates the synth at the source,
 * so no oscillator or noise buffer is even created while muted.
 */
import { useEffect, useReducer } from 'react'

const MUTE_KEY = 'nexus_audio_muted'

/**
 * The audio context is created LAZILY, on the first sound the game actually
 * plays.
 *
 * It used to be constructed at module scope, the moment this file was imported.
 * Browsers apply an autoplay policy to AudioContext: a context created before
 * any user gesture starts `suspended`, and one created at import time is
 * created before any gesture could possibly have happened. The old code then
 * called `resume()` on every tone, which is only granted once the page has
 * already been interacted with - so the first sounds of a session were silently
 * dropped. Creating it on demand means it is built inside the gesture that
 * asked for it, when the policy permits it to start running.
 */
let ctx: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    // A browser may refuse construction outright (rare, and not fatal): the
    // game simply runs silent rather than crashing a screen over sound.
    ctx = null
  }
  return ctx
}

let muted =
  typeof window !== 'undefined'
    ? (() => { try { return window.localStorage.getItem(MUTE_KEY) === '1' } catch { return false } })()
    : false

const muteListeners = new Set<() => void>()

/** Persist and publish a new mute state. */
export function setAudioMuted(next: boolean) {
  if (next === muted) return
  muted = next
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(MUTE_KEY, next ? '1' : '0') } catch { /* storage denied — state holds for this session */ }
  }
  muteListeners.forEach((notify) => notify())
}

/** React view of the mute state: current value + toggle. */
export function useAudioMute() {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    muteListeners.add(rerender)
    return () => { muteListeners.delete(rerender) }
  }, [])
  return { muted, toggle: () => setAudioMuted(!muted) }
}

function resume(active: AudioContext) {
  if (typeof active.resume === 'function' && active.state === 'suspended') {
    void active.resume()
  }
}

function tone(freq: number, duration = 0.12, type: OscillatorType = 'square', gain = 0.04) {
  if (muted) return
  const active = audioContext()
  if (!active) return
  resume(active)
  const t = active.currentTime
  const osc = active.createOscillator()
  const g = active.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g)
  g.connect(active.destination)
  osc.start(t)
  osc.stop(t + duration)
}

function noise(duration = 0.18, gain = 0.02) {
  if (muted) return
  const active = audioContext()
  if (!active) return
  resume(active)
  const t = active.currentTime
  const bufferSize = Math.floor(active.sampleRate * duration)
  const buffer = active.createBuffer(1, bufferSize, active.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
  const src = active.createBufferSource()
  const g = active.createGain()
  src.buffer = buffer
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(g)
  g.connect(active.destination)
  src.start(t)
}

export const SFX = {
  scannerArm: () => { tone(220, 0.08, 'square', 0.03); setTimeout(() => tone(440, 0.06, 'square', 0.02), 80) },
  scanTick: () => tone(660, 0.04, 'sine', 0.015),
  verified: () => { tone(523, 0.08, 'square', 0.03); setTimeout(() => tone(784, 0.12, 'square', 0.025), 70) },
  error: () => { tone(110, 0.25, 'sawtooth', 0.035); noise(0.2, 0.025) },
  evidenceRecover: () => { tone(330, 0.1, 'triangle', 0.03); setTimeout(() => tone(660, 0.1, 'triangle', 0.025), 90) },
  pin: () => tone(880, 0.06, 'sine', 0.02),
  roleHandoff: () => { tone(440, 0.1, 'triangle', 0.025); setTimeout(() => tone(554, 0.1, 'triangle', 0.02), 100) },
  contradiction: () => { tone(185, 0.15, 'sawtooth', 0.025); noise(0.15, 0.02) },
  submit: () => tone(520, 0.1, 'square', 0.03),
  success: () => { tone(523, 0.1, 'square', 0.03); setTimeout(() => tone(659, 0.1, 'square', 0.025), 80) },
  failure: () => { tone(150, 0.3, 'sawtooth', 0.03); noise(0.25, 0.02) },
}

export function useGameAudio() {
  return SFX
}
