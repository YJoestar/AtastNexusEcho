/**
 * NEXUS ECHO — Visual Environment
 *
 * Device-aware visual effect system. Each fictional device gets its own
 * profile: CRT for the bureau workstation, signal degradation for the field
 * handset, paper texture for documents, etc.
 *
 * The environment is state-driven — effects respond to narrative level,
 * connection status, and device type, never applied arbitrarily.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'

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

const VisualEnvironmentContext = createContext<VisualEnvironmentState | null>(null)

export function VisualEnvironmentProvider({
  profile,
  horrorLevel = 0,
  signalStrength = 100,
  isConnected = true,
  children,
}: {
  profile: DeviceProfile
  horrorLevel?: number
  signalStrength?: number
  isConnected?: boolean
  children: ReactNode
}) {
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const state: VisualEnvironmentState = useMemo(
    () => ({
      profile,
      horrorLevel: Math.min(6, Math.max(0, horrorLevel)),
      signalStrength: Math.max(0, Math.min(100, signalStrength)),
      isConnected,
      reducedMotion,
    }),
    [profile, horrorLevel, signalStrength, isConnected, reducedMotion],
  )

  return (
    <VisualEnvironmentContext.Provider value={state}>
      {children}
    </VisualEnvironmentContext.Provider>
  )
}

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
