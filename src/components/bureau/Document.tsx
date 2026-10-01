/**
 * NEXUS ECHO — Bureau: Document
 *
 * The shell every piece of bureau material sits in: a reference, a title, a
 * classification, and a page number. Nothing in the game is a bare card.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Classification = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'SOURCE'

const CLASSIFICATION_CLASS: Record<Classification, string> = {
  PUBLIC: 'classification-public',
  INTERNAL: 'classification-internal',
  RESTRICTED: 'classification-restricted',
  SOURCE: 'classification-internal-source',
}

const CLASSIFICATION_LABEL: Record<Classification, string> = {
  PUBLIC: 'Public',
  INTERNAL: 'Internal',
  RESTRICTED: 'Restricted',
  SOURCE: 'Restricted — Source',
}

export function ClassificationTag({
  level,
  className,
}: {
  level: Classification
  className?: string
}) {
  return (
    <span className={cn(CLASSIFICATION_CLASS[level], className)}>{CLASSIFICATION_LABEL[level]}</span>
  )
}

export type PaperStock = 'paper' | 'carbon' | 'digital'

/**
 * A bureau document.
 *
 * `paper` and `carbon` are recovered physical stock — warm, slightly lighter
 * than the surrounding room. `digital` is the live system, which is a screen
 * and therefore cold. The distinction is load-bearing: when a document is
 * rendered as digital, it is the institution talking, not a person.
 */
export function DocumentShell({
  reference,
  title,
  subtitle,
  classification,
  revision,
  children,
  footer,
  stock = 'paper',
  lit = false,
  className,
}: {
  reference?: string
  title: ReactNode
  subtitle?: ReactNode
  classification?: Classification
  revision?: string
  children: ReactNode
  footer?: ReactNode
  stock?: PaperStock
  lit?: boolean
  className?: string
}) {
  return (
    <section
      className={cn(
        stock === 'digital' && 'bg-nexus-surfaceElevated',
        stock === 'carbon' && 'carbon-copy',
        stock === 'paper' && 'paper-stock archive-paper',
        lit && 'lit-surface',
        className,
      )}
    >
      <header className="bureau-doc-header flex items-start justify-between gap-3">
        <div className="min-w-0">
          {reference && <p className="bureau-doc-subtitle">{reference}</p>}
          <h2 className="bureau-doc-title">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-nexus-textMuted">{subtitle}</p>}
        </div>
        {(classification || revision) && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {classification && <ClassificationTag level={classification} />}
            {revision && <span className="doc-reference">Rev {revision}</span>}
          </div>
        )}
      </header>

      <div className="bureau-doc-body">{children}</div>

      {footer && <footer className="bureau-doc-footer">{footer}</footer>}
    </section>
  )
}

/**
 * The ruled margin of a form. Used where a real document would carry notes in
 * the left gutter, so the eye knows the content is a transcription.
 */
export function MarginNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('meta border-l border-nexus-borderSubtle pl-2', className)}>{children}</p>
}

/** A label/value pair as it appears on a form. */
export function Field({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string
  value: ReactNode
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={className}>
      <dt className="label">{label}</dt>
      <dd className={cn('text-sm text-nexus-text', valueClassName)}>{value}</dd>
    </div>
  )
}

/** Field grid — a definition list laid out as a form's field rows. */
export function FieldGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode
  columns?: 1 | 2 | 3
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-4 gap-y-3',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {children}
    </dl>
  )
}

/** Monospaced reference string. Always monospaced, always uppercase. */
export function Reference({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[0.6875rem] uppercase tracking-[0.16em]', className)}>{children}</span>
}