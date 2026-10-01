/**
 * NEXUS ECHO — Bureau: Evidence
 *
 * Recovered material: an item taken into custody, a tag stuck to its bag, a
 * row in the chain-of-custody register, a line the bureau removed from a copy.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { resolveArtifactAnomaly, type NarrativeLevel } from '@/lib/narrative'

/**
 * An exhibit. `seed` is the exhibit's stable identity and is what makes any
 * anomaly on it reproducible — see `resolveArtifactAnomaly`.
 */
export function EvidenceFrame({
  seed,
  level = 0,
  title,
  reference,
  children,
  footer,
  className,
  bodyClassName,
}: {
  seed: string
  level?: NarrativeLevel
  title?: ReactNode
  reference?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
}) {
  const anomaly = resolveArtifactAnomaly(seed, level)
  const offset = anomaly.offsetPx ? { transform: `translateX(${anomaly.offsetPx}px)` } : undefined

  return (
    <figure
      className={cn('evidence-frame', anomaly.className, className)}
      style={offset}
      aria-describedby={anomaly.tell ? `${seed}-anomaly` : undefined}
    >
      {anomaly.tell && (
        <span id={`${seed}-anomaly`} className="sr-only">
          {anomaly.tell}
        </span>
      )}
      {(title || reference) && (
        <figcaption className="bureau-doc-header flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate">{title}</span>
          {reference && <span className="doc-reference shrink-0">{reference}</span>}
        </figcaption>
      )}
      <div className={cn('bureau-doc-body', bodyClassName)}>{children}</div>
      {footer && <div className="bureau-doc-footer">{footer}</div>}
    </figure>
  )
}

/** The tag stuck to a bagged item. */
export function EvidenceTag({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn('evidence-tag', className)}>{children}</span>
}

export interface CustodyEntry {
  /** Exhibit reference, e.g. EV-014. */
  id: ReactNode
  /** What kind of material it is, e.g. RECORDING. */
  type: ReactNode
  /** Where it came from. */
  source?: ReactNode
  /** Who holds it now. */
  custodian?: ReactNode
  /** Its state in the register. */
  status?: ReactNode
}

/**
 * One line of the chain-of-custody register. Columns are ruled rather than
 * boxed so that a long register still reads as a ledger.
 */
export function CustodyRow({ entry, className }: { entry: CustodyEntry; className?: string }) {
  return (
    <div className={cn('custody-row grid-cols-1 sm:grid-cols-[auto_1fr_auto]', className)}>
      <span className="custody-id">{entry.id}</span>
      <span className="min-w-0">
        <span className="custody-type">{entry.type}</span>
        {(entry.source || entry.custodian) && (
          <span className="custody-meta mt-0.5 block">
            {[entry.source, entry.custodian].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      {entry.status && <span className="justify-self-start sm:justify-self-end">{entry.status}</span>}
    </div>
  )
}

export function CustodyRegister({
  entries,
  className,
}: {
  entries: readonly CustodyEntry[]
  className?: string
}) {
  return (
    <div className={cn('divide-y divide-nexus-borderSubtle/60', className)}>
      {entries.map((entry, index) => (
        <CustodyRow key={index} entry={entry} />
      ))}
    </div>
  )
}

/**
 * A line that was removed from the copy the player is reading. Rendered as an
 * absence, with no marker and no explanation — the gap is the content.
 */
export function RedactedLine({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn('block', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className="redacted-line mb-1.5"
          style={{ width: `${88 - index * 7}%` }}
        />
      ))}
    </span>
  )
}

/**
 * A word withheld inline, inside a sentence that is otherwise intact. The
 * sentence keeps its shape; only the word is gone.
 */
export function Redacted({ width = '4.5rem' }: { width?: string }) {
  return <span className="redacted" style={{ width }} aria-label="withheld" role="img" />
}