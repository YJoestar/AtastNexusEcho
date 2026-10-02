/**
 * NEXUS ECHO — Signal Layer
 *
 * The field handset's picture: faint tape grain, and — only when the link is
 * weak or the case has turned — an occasional short dropout routed through the
 * glitch controller. A healthy handset at the start of a case shows almost
 * nothing, so that later degradation reads as a change.
 *
 * This runs on a phone. There is no per-frame JavaScript: grain is a cached
 * tile on the compositor, dropouts are rare timer-driven events.
 */

import { useEffect, type FC } from 'react'
import { useEffectSettings, type EffectIntensity } from './VisualEnvironment'
import { NoiseField } from './NoiseField'
import { useHorrorLevel } from '@/hooks/useHorrorLevel'
import { glitch } from '@/lib/vfx/glitch'

interface SignalLayerProps {
  signalStrength?: number
  /** Kept for API compatibility; the layer now sizes itself with CSS. */
  width?: number
  height?: number
}

const GRAIN: Record<EffectIntensity, number> = { off: 0, low: 0.02, medium: 0.03, high: 0.055 }

export const SignalLayer: FC<SignalLayerProps> = ({ signalStrength = 100 }) => {
  const settings = useEffectSettings()
  const horrorLevel = useHorrorLevel()
  const decay = 1 - signalStrength / 100

  const wantsDropouts = settings.signalDegradation !== 'off' && (signalStrength < 100 || horrorLevel >= 2)

  useEffect(() => {
    if (!wantsDropouts) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      // A weak link is rare noise, not a strobe: roughly one dropout per 8-19 s.
      const base = Math.max(7000, 22000 - decay * 9000 - horrorLevel * 1000)
      timer = setTimeout(() => {
        if (!document.hidden) {
          glitch({
            type: decay > 0.4 ? 'SIGNAL' : 'LIGHT',
            intensity: 0.2 + decay * 0.35 + horrorLevel * 0.02,
          })
        }
        schedule()
      }, base * (0.6 + Math.random() * 0.8))
    }
    schedule()
    return () => clearTimeout(timer)
  }, [wantsDropouts, decay, horrorLevel])

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ transition: 'opacity 300ms ease' }}
    >
      <NoiseField opacity={GRAIN[settings.noise] + decay * 0.02} />
    </div>
  )
}
