/**
 * NEXUS ECHO — CRT Overlay
 *
 * The bureau workstation's screen: scanlines, a faint phosphor glow, grain and
 * a vignette. All of it is static paint or a compositor-only transform, so the
 * cost is constant and tiny — it used to be a full-viewport canvas rewritten
 * per pixel on every animation frame.
 *
 * Strength follows the device profile and the narrative level through
 * `useEffectSettings`; motion (grain drift, tube flicker) is dropped under
 * prefers-reduced-motion by the settings and by `NoiseField`.
 */

import type { CSSProperties, FC } from 'react'
import { useEffectSettings, type EffectIntensity } from './visualEnvironmentCore'
import { NoiseField } from './NoiseField'

interface CRTOverlayProps {
  /** Kept for API compatibility; the overlay now sizes itself with CSS. */
  width?: number
  height?: number
}

const SCAN: Record<EffectIntensity, number> = { off: 0, low: 0.1, medium: 0.14, high: 0.2 }
const VIGNETTE: Record<EffectIntensity, number> = { off: 0, low: 0.28, medium: 0.4, high: 0.55 }
const GRAIN: Record<EffectIntensity, number> = { off: 0, low: 0.03, medium: 0.045, high: 0.07 }
const GLOW: Record<EffectIntensity, number> = { off: 0, low: 0.035, medium: 0.055, high: 0.08 }

export const CRTOverlay: FC<CRTOverlayProps> = () => {
  const settings = useEffectSettings()
  const style = {
    opacity: settings.crt === 'off' ? 0 : 1,
    transition: 'opacity 300ms ease',
    '--nx-scan': SCAN[settings.scanlines],
    '--nx-vig': VIGNETTE[settings.vignette],
    '--nx-glow': GLOW[settings.phosphor === 'off' ? settings.crt : settings.phosphor],
  } as CSSProperties

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none ${settings.flicker ? 'nx-flicker' : ''}`}
      style={style}
    >
      <div className="nx-phosphor" />
      <NoiseField opacity={GRAIN[settings.noise]} />
      {settings.scanlines !== 'off' && <div className="nx-scanlines" />}
      {settings.vignette !== 'off' && <div className="nx-vignette" />}
    </div>
  )
}
