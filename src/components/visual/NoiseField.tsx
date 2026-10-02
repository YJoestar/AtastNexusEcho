/**
 * NEXUS ECHO — Noise field
 *
 * Film / tape grain from one cached tile. Moves in a handful of discrete steps
 * on the compositor; holds perfectly still when motion is not wanted.
 */
import { useMemo, type FC } from 'react'
import { isLowPowerDevice, prefersReducedMotion } from '@/lib/vfx/glitch'
import { noiseTileURL } from '@/lib/vfx/noise'

interface NoiseFieldProps {
  /** 0..1 strength of the grain. */
  opacity: number
  /** Allow the stepped drift. Ignored (still) on low-power devices and under reduced motion. */
  animated?: boolean
}

export const NoiseField: FC<NoiseFieldProps> = ({ opacity, animated = true }) => {
  const tile = useMemo(() => noiseTileURL(), [])
  const moving = useMemo(() => animated && !prefersReducedMotion() && !isLowPowerDevice(), [animated])
  if (opacity <= 0 || !tile) return null
  return (
    <div
      aria-hidden="true"
      className="nx-noise"
      data-animated={moving}
      style={{ backgroundImage: `url(${tile})`, opacity }}
    />
  )
}
