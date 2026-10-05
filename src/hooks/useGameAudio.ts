/**
 * NEXUS ECHO — Game Audio
 *
 * Lightweight procedural audio via Web Audio API.
 * No external assets. Sounds are short synth events that reinforce state
 * changes without becoming music or atmosphere by themselves.
 */

const CTX =
  typeof window !== 'undefined'
    ? (() => {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        return Ctor ? new Ctor() : null
      })()
    : null

function resume() {
  if (CTX && typeof (CTX as unknown as { resume?: () => Promise<void> }).resume === 'function') {
    void (CTX as unknown as { resume: () => Promise<void> }).resume()
  }
}

function tone(freq: number, duration = 0.12, type: OscillatorType = 'square', gain = 0.04) {
  if (!CTX) return
  resume()
  const t = CTX.currentTime
  const osc = CTX.createOscillator()
  const g = CTX.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g)
  g.connect(CTX.destination)
  osc.start(t)
  osc.stop(t + duration)
}

function noise(duration = 0.18, gain = 0.02) {
  if (!CTX) return
  resume()
  const t = CTX.currentTime
  const bufferSize = Math.floor(CTX.sampleRate * duration)
  const buffer = CTX.createBuffer(1, bufferSize, CTX.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
  const src = CTX.createBufferSource()
  const g = CTX.createGain()
  src.buffer = buffer
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(g)
  g.connect(CTX.destination)
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
