/**
 * NEXUS - Puzzle renderer primitives
 *
 * Small shared building blocks for the per-visualType renderers. Kept separate
 * from the registry so each piece stays trivially testable and so the renderers
 * file can export components only (react-refresh lint rule).
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function VisualShell({
  label,
  children,
  tone = 'neutral',
  className,
}: {
  label?: string
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'warning'
  className?: string
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-nexus-accent/30 bg-nexus-accentBg/10'
      : tone === 'warning'
        ? 'border-nexus-warning/30 bg-nexus-warningBg/10'
        : 'border-nexus-borderSubtle bg-nexus-bg'

  return (
    <div className={cn('rounded-xl border p-4', toneClass, className)}>
      {label && (
        <p className="text-xs uppercase tracking-wider text-nexus-textSubtle mb-3">{label}</p>
      )}
      {children}
    </div>
  )
}

export function PayloadText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm text-nexus-textMuted leading-relaxed whitespace-pre-wrap', className)}>
      {children}
    </p>
  )
}

export function Slot({
  children,
  empty = false,
  active = false,
  className,
  'aria-label': ariaLabel,
}: {
  children?: ReactNode
  empty?: boolean
  active?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-w-[2.25rem] min-h-[2.25rem] items-center justify-center px-2 rounded-lg border text-lg',
        empty
          ? 'border-dashed border-nexus-border text-nexus-textSubtle'
          : 'border-nexus-border bg-nexus-surfaceElevated text-nexus-text',
        active && 'border-nexus-accent bg-nexus-accentBg/30 text-nexus-accent',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function GlyphTile({ glyph, index }: { glyph: string; index: number }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <Slot>{glyph}</Slot>
      <span className="font-mono text-[10px] text-nexus-textSubtle">
        {String(index + 1).padStart(2, '0')}
      </span>
    </span>
  )
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs uppercase tracking-wider text-nexus-textSubtle shrink-0">{label}</span>
      <span className="font-mono text-sm text-nexus-text text-right break-all">{value}</span>
    </div>
  )
}

export function RecallBadge({ puzzleCode }: { puzzleCode: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-nexus-info/30 bg-nexus-infoBg/40 text-nexus-info text-xs font-medium">
      RECALL · {puzzleCode}
    </span>
  )
}

export function TeamRequiredNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-nexus-warning flex items-start gap-2">
      <span aria-hidden="true">◈</span>
      <span>{children}</span>
    </p>
  )
}
