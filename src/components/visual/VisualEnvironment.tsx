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

import { useMemo, type ReactNode } from 'react'
import { VisualEnvironmentContext, type DeviceProfile, type VisualEnvironmentState } from './visualEnvironmentCore'

export type { DeviceProfile, EffectIntensity, EffectSettings, VisualEnvironmentState } from './visualEnvironmentCore'

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
