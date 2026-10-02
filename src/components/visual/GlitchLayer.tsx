/**
 * NEXUS ECHO — Glitch layer
 *
 * Paints the events issued by `glitch()`. Mounted once per shell. It owns no
 * policy: duration ceilings, cooldowns, reduced-motion and the player's own
 * "effects off" are all decided upstream. When an event is `reduced` this
 * layer shows a single still dim and moves nothing.
 *
 * Everything drawn is a transform or an opacity change on a fixed overlay —
 * no filters, no blur, no per-frame JavaScript.
 */
import { useEffect, useState, type CSSProperties, type FC } from 'react'
import { subscribeGlitch, type GlitchEvent } from '@/lib/vfx/glitch'
import { noiseTileURL } from '@/lib/vfx/noise'

/** Deterministic spread so a given event always looks the same. */
function spread(seed: number, index: number, min: number, max: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return min + (x - Math.floor(x)) * (max - min)
}

const BAND_COUNT: Record<GlitchEvent['type'], number> = {
  LIGHT: 0, SIGNAL: 3, TRACKING: 1, FRAME: 1, CORRUPTION: 5, FULL: 5,
}

export const GlitchLayer: FC = () => {
  const [active, setActive] = useState<GlitchEvent | null>(null)

  useEffect(() => subscribeGlitch(setActive), [])

  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    if (!active.reduced && (active.type === 'FRAME' || active.type === 'FULL')) {
      root.dataset.nxGlitch = active.type
      root.style.setProperty('--nx-glitch-ms', `${active.duration}ms`)
      root.style.setProperty('--nx-glitch-i', String(active.intensity))
    }
    const timer = setTimeout(() => {
      setActive(current => (current?.id === active.id ? null : current))
    }, active.duration + 60)
    return () => {
      clearTimeout(timer)
      delete root.dataset.nxGlitch
    }
  }, [active])

  if (!active) return null

  const style = {
    '--nx-glitch-ms': `${active.duration}ms`,
    '--nx-glitch-i': active.intensity,
    '--nx-noise-url': `url(${noiseTileURL()})`,
  } as CSSProperties
  const bands = Array.from({ length: BAND_COUNT[active.type] }, (_, index) => ({
    top: spread(active.id, index, 4, 92),
    height: spread(active.id, index + 9, 1.2, 5.5),
    shift: spread(active.id, index + 21, -26, 26) * active.intensity,
    delay: spread(active.id, index + 33, 0, 0.35),
  }))

  return (
    <div
      key={active.id}
      className="nx-glitch"
      data-type={active.type}
      data-reduced={active.reduced}
      style={style}
      aria-hidden="true"
    >
      <i className="nx-g-dim" />
      <i className="nx-g-roll" />
      {bands.map((band, index) => (
        <i
          key={index}
          className="nx-g-band"
          style={{
            top: `${band.top}%`,
            height: `${band.height}%`,
            '--nx-dx': `${band.shift}px`,
            animationDelay: `calc(var(--nx-glitch-ms) * ${band.delay.toFixed(2)})`,
          } as CSSProperties}
        />
      ))}
      <i className="nx-g-fringe" />
      <i className="nx-g-static" />
    </div>
  )
}
