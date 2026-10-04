/**
 * NEXUS ECHO — Visual environment: model, profiles and hooks
 *
 * Kept apart from the Provider component (VisualEnvironment.tsx) so that file
 * exports only a component, which React fast refresh requires.
 */
import { createContext, useContext } from 'react'

export type DeviceProfile =
  | 'BUREAU_PC'
  | 'FIELD_DEVICE'
  | 'ARCHIVE_DISPLAY'
  | 'SURVEILLANCE_MONITOR'
  | 'DOCUMENT'
  | 'ANOMALOUS'

export type EffectIntensity = 'off' | 'low' | 'medium' | 'high'

export interface VisualEnvironmentState {
  profile: DeviceProfile
  horrorLevel: number
  signalStrength: number
  isConnected: boolean
  reducedMotion: boolean
}

export interface EffectSettings {
  crt: EffectIntensity
  scanlines: EffectIntensity
  noise: EffectIntensity
  vignette: EffectIntensity
  curvature: EffectIntensity
  phosphor: EffectIntensity
  paperTexture: EffectIntensity
  grain: EffectIntensity
  signalDegradation: EffectIntensity
  monitorGlass: EffectIntensity
  flicker: boolean
  flickerRate: number
}

const EFFECT_INTENSITY_MAP: Record<EffectIntensity, number> = {
  off: 0,
  low: 0.3,
  medium: 0.6,
  high: 1,
}

const EFFECT_PROFILES: Record<DeviceProfile, EffectSettings> = {
  BUREAU_PC: {
    crt: 'medium',
    scanlines: 'low',
    noise: 'low',
    vignette: 'low',
    curvature: 'medium',
    phosphor: 'low',
    paperTexture: 'off',
    grain: 'low',
    signalDegradation: 'off',
    monitorGlass: 'medium',
    flicker: true,
    flickerRate: 0.015,
  },
  FIELD_DEVICE: {
    crt: 'off',
    scanlines: 'off',
    noise: 'medium',
    vignette: 'off',
    curvature: 'off',
    phosphor: 'off',
    paperTexture: 'off',
    grain: 'low',
    signalDegradation: 'low',
    monitorGlass: 'off',
    flicker: false,
    flickerRate: 0,
  },
  ARCHIVE_DISPLAY: {
    crt: 'low',
    scanlines: 'low',
    noise: 'low',
    vignette: 'low',
    curvature: 'low',
    phosphor: 'off',
    paperTexture: 'high',
    grain: 'low',
    signalDegradation: 'off',
    monitorGlass: 'off',
    flicker: false,
    flickerRate: 0,
  },
  SURVEILLANCE_MONITOR: {
    crt: 'low',
    scanlines: 'medium',
    noise: 'medium',
    vignette: 'medium',
    curvature: 'low',
    phosphor: 'low',
    paperTexture: 'off',
    grain: 'medium',
    signalDegradation: 'medium',
    monitorGlass: 'medium',
    flicker: true,
    flickerRate: 0.03,
  },
  DOCUMENT: {
    crt: 'off',
    scanlines: 'off',
    noise: 'off',
    vignette: 'off',
    curvature: 'off',
    phosphor: 'off',
    paperTexture: 'high',
    grain: 'low',
    signalDegradation: 'off',
    monitorGlass: 'off',
    flicker: false,
    flickerRate: 0,
  },
  ANOMALOUS: {
    crt: 'medium',
    scanlines: 'low',
    noise: 'high',
    vignette: 'medium',
    curvature: 'high',
    phosphor: 'off',
    paperTexture: 'off',
    grain: 'high',
    signalDegradation: 'high',
    monitorGlass: 'medium',
    flicker: true,
    flickerRate: 0.08,
  },
}

export const VisualEnvironmentContext = createContext<VisualEnvironmentState | null>(null)

export function useVisualEnvironment() {
  const ctx = useContext(VisualEnvironmentContext)
  if (!ctx) {
    throw new Error('useVisualEnvironment must be used within a VisualEnvironmentProvider')
  }
  return ctx
}

export function useEffectSettings(): EffectSettings {
  const env = useVisualEnvironment()
  const base = EFFECT_PROFILES[env.profile]

  const horrorDrift = (env.horrorLevel / 6) * 0.4
  const signalDecay = (1 - env.signalStrength / 100) * 0.4

  const resolve = (level: EffectIntensity, modifier = 0): EffectIntensity => {
    if (level === 'off') return 'off'
    const value = EFFECT_INTENSITY_MAP[level] + modifier
    if (value <= 0.1) return 'off'
    if (value <= 0.4) return 'low'
    if (value <= 0.75) return 'medium'
    return 'high'
  }

  const flickerRate = base.flickerRate * (1 + horrorDrift * 2)

  return {
    crt: resolve(base.crt, horrorDrift),
    scanlines: resolve(base.scanlines, horrorDrift + signalDecay),
    noise: resolve(base.noise, horrorDrift + signalDecay),
    vignette: resolve(base.vignette, horrorDrift),
    curvature: base.curvature,
    phosphor: base.phosphor,
    paperTexture: base.paperTexture,
    grain: resolve(base.grain, horrorDrift),
    signalDegradation: resolve(base.signalDegradation, signalDecay + horrorDrift),
    monitorGlass: base.monitorGlass,
    flicker: base.flicker && !env.reducedMotion,
    flickerRate,
  }
}
