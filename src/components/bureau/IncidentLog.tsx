/**
 * NEXUS ECHO — Bureau: Incident Log
 *
 * Timestamped entries in a fixed column. A gap in the log is a legitimate entry
 * type: "the system did not record this" carries the same weight as a line of
 * text, and is drawn as one.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface IncidentEntry {
  /** ISO timestamp or a bureau-form time string. */
  time: string
  /** What happened, in the bureau's own register. */
  text: ReactNode
  /** Optional state marker for the entry. */
  marker?: ReactNode
}

export function IncidentRow({
  time,
  text,
  marker,
  className,
}: {
  time: string
  text: ReactNode
  marker?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('incident-row', className)}>
      <span className="incident-time">{time}</span>
      <span className="min-w-0 text-sm text-nexus-textMuted">
        {text}
        {marker && <span className="ml-2 inline-block align-middle">{marker}</span>}
      </span>
    </div>
  )
}

/**
 * A stretch the log does not cover. Drawn as a ruled blank so the absence is
 * visible as a shape rather than implied by a missing child element.
 */
export function IncidentGap({
  note = 'No entry recorded',
  className,
}: {
  note?: string
  className?: string
}) {
  return <p className={cn('incident-gap', className)}>{note}</p>
}

export function IncidentLog({
  entries,
  className,
}: {
  entries: readonly (IncidentEntry | { gap: true; note?: string })[]
  className?: string
}) {
  return (
    <div className={cn('border-t border-nexus-borderSubtle', className)}>
      {entries.map((entry, index) =>
        'gap' in entry ? (
          <IncidentGap key={index} note={entry.note} />
        ) : (
          <IncidentRow key={index} time={entry.time} text={entry.text} marker={entry.marker} />
        )
      )}
    </div>
  )
}