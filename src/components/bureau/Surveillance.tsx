/**
 * NEXUS ECHO — Bureau: Surveillance
 *
 * An observation frame. Quarters, corner brackets, a reference and a timestamp.
 * It should look like a monitor in a room with one light in it — not like a
 * camera feed in a video game.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { RecordingLamp } from './Signal'

export function SurveillanceFrame({
  reference,
  timestamp,
  recording = false,
  startedAt,
  children,
  className,
  innerClassName,
}: {
  reference?: string
  timestamp?: string
  recording?: boolean
  startedAt?: string | null
  children: ReactNode
  className?: string
  innerClassName?: string
}) {
  return (
    <figure className={cn('surveillance-frame', className)}>
      <span className="surveillance-corner left-1 top-1 border-l border-t" aria-hidden="true" />
      <span className="surveillance-corner right-1 top-1 border-r border-t" aria-hidden="true" />
      <span className="surveillance-corner bottom-1 left-1 border-b border-l" aria-hidden="true" />
      <span className="surveillance-corner bottom-1 right-1 border-b border-r" aria-hidden="true" />

      <div className={cn('h-full w-full', innerClassName)}>{children}</div>

      <figcaption className="flex items-center justify-between gap-2 border-t border-nexus-borderSubtle px-2 py-1">
        <RecordingLamp active={recording} startedAt={startedAt} />
        <span className="font-mono text-[0.875rem] tabular-nums tracking-[0.14em] text-nexus-textSubtle">
          {[reference, timestamp].filter(Boolean).join(' · ')}
        </span>
      </figcaption>
    </figure>
  )
}

/**
 * The scan station: a frame the player aims at a marker. Deliberately
 * unadorned — no crosshair, no pulsing reticle, no "scanning…" theatre.
 */
export function ScanStation({
  children,
  hint,
  className,
}: {
  children: ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('bracketed relative bg-nexus-bg p-1', className)}>
      <div className="relative aspect-square w-full overflow-hidden">{children}</div>
      {hint && <p className="section-label mt-3 text-center">{hint}</p>}
    </div>
  )
}