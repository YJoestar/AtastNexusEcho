/**
 * NEXUS ECHO — Bureau: Anomaly
 *
 * Structural wrongness, applied to material rather than to the page. See
 * `src/lib/narrative/anomaly.ts` for the discipline: an anomaly describes how a
 * document is presented and never what it says.
 */

import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { resolveArtifactAnomaly, type NarrativeLevel } from '@/lib/narrative'

/**
 * Wraps one artifact and lets the narrative layer decide how it is wrong.
 *
 * The observation is exposed to assistive technology and hidden visually: the
 * player should have to *look* at the artifact to notice, and a screen-reader
 * user should still be told the same thing the sighted player saw.
 */
export function AnomalyArtifact({
  seed,
  level = 0,
  children,
  className,
  as: Tag = 'div',
}: {
  seed: string
  level?: NarrativeLevel
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'figure' | 'li'
}) {
  const anomaly = resolveArtifactAnomaly(seed, level)
  const style: CSSProperties | undefined =
    anomaly.offsetPx > 0 ? { transform: `translateX(${anomaly.offsetPx}px)` } : undefined

  return (
    <Tag
      className={cn(anomaly.className, className)}
      style={style}
      aria-describedby={anomaly.tell ? `${seed}-observation` : undefined}
    >
      {children}
      {anomaly.tell && (
        <span id={`${seed}-observation`} className="sr-only">
          {anomaly.tell}
        </span>
      )}
    </Tag>
  )
}

/**
 * A redacted line, shown only where the bureau actually withheld something.
 * Kept as a component so that "this was removed" is always a deliberate act in
 * the code and never an incidental style.
 */
export function WithheldLine({ className }: { className?: string }) {
  return <span className={cn('redacted-line block h-2.5 w-4/5', className)} aria-hidden="true" />
}