/**
 * NEXUS ECHO — Bureau: Status
 *
 * Institutional state markers. Two rules hold everywhere:
 *
 *   1. State is never carried by colour alone. Every mark has a glyph, a
 *      border treatment, or a word.
 *   2. A stamp is selective. One per document at most. A screen full of stamps
 *      is a screen where none of them mean anything.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StampVariant =
  | 'verified'
  | 'restricted'
  | 'anomalous'
  | 'archived'
  | 'incomplete'
  | 'unresolved'
  | 'contradicted'

const STAMP_GLYPH: Record<StampVariant, string> = {
  verified: '✓',
  restricted: '■',
  anomalous: '!',
  archived: '·',
  incomplete: '◌',
  unresolved: '?',
  contradicted: '✗',
}

const STAMP_CLASS: Record<StampVariant, string> = {
  verified: 'stamp-verified',
  restricted: 'stamp-restricted',
  anomalous: 'stamp-anomalous',
  archived: 'stamp-archived',
  incomplete: 'stamp-incomplete',
  unresolved: 'stamp-unresolved',
  contradicted: 'stamp-contradicted',
}

export function Stamp({
  variant,
  children,
  impressed = false,
  className,
}: {
  variant: StampVariant
  children: ReactNode
  /** Laid onto paper at a slight angle, like a rubber stamp. */
  impressed?: boolean
  className?: string
}) {
  if (impressed) {
    return (
      <span className={cn('stamp-impressed', STAMP_CLASS[variant], className)} aria-hidden="true">
        {children}
      </span>
    )
  }
  return (
    <span className={cn(STAMP_CLASS[variant], className)}>
      <span aria-hidden="true">{STAMP_GLYPH[variant]}</span>
      {children}
    </span>
  )
}

export type StatusTone = 'active' | 'warning' | 'danger' | 'neutral' | 'inactive'

const STATUS_DOT: Record<StatusTone, string> = {
  active: 'status-active',
  warning: 'status-warning',
  danger: 'status-danger',
  neutral: 'status-neutral',
  inactive: 'status-inactive',
}

/**
 * Status plus its word. The label is not optional in practice — a bare dot is
 * decoration, and a dot nobody can read is not information.
 */
export function StatusMark({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-nexus-textMuted', className)}>
      <span className={cn('status-dot', STATUS_DOT[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}

/** A boxed glyph for a state that needs to sit inside a dense grid. */
export function StateMarker({
  glyph,
  tone = 'neutral',
  className,
  label,
}: {
  glyph: string
  tone?: StatusTone
  className?: string
  label: string
}) {
  return (
    <span
      className={cn(
        'state-marker',
        tone === 'active' && 'text-nexus-accent border-nexus-accent/40',
        tone === 'warning' && 'text-nexus-warning border-nexus-warning/40',
        tone === 'danger' && 'text-nexus-danger border-nexus-danger/40',
        (tone === 'neutral' || tone === 'inactive') && 'text-nexus-textSubtle border-nexus-borderSubtle',
        className,
      )}
      title={label}
    >
      <span aria-hidden="true">{glyph}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

/**
 * A word used as a label where a number would imply precision the bureau does
 * not have. Deliberately not a percentage.
 */
export function MeasuredValue({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn('font-mono text-xs tabular-nums text-nexus-textMuted', className)}>{children}</span>
}