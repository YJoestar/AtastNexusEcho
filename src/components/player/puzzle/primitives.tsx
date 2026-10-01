/**
 * NEXUS — Puzzle renderer primitives
 *
 * Small shared building blocks for the per-visualType renderers.
 * Uses NEXUS border language: partial borders, not rounded rectangles.
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
      ? 'border-l-2 border-t-2 border-nexus-accent/30'
      : tone === 'warning'
        ? 'border-l-2 border-t-2 border-nexus-warning/30'
        : 'border-nexus-border'

  return (
    <div className={cn('bg-nexus-surfaceElevated border p-4', toneClass, className)}>
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
        'inline-flex min-w-[2.25rem] min-h-[2.25rem] items-center justify-center px-2 text-lg',
        'border border-nexus-border bg-nexus-bg text-nexus-text',
        empty && 'border-dashed border-nexus-borderSubtle text-nexus-textSubtle',
        active && 'border-l-2 border-t-2 border-nexus-accent text-nexus-accent',
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
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-nexus-border/30">
      <span className="text-xs uppercase tracking-wider text-nexus-textSubtle shrink-0">{label}</span>
      <span className="font-mono text-sm text-nexus-text text-right break-all">{value}</span>
    </div>
  )
}

export function RecallBadge({ puzzleCode }: { puzzleCode: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-nexus-accent/30 bg-nexus-accentBg/20 text-nexus-accent text-xs font-medium">
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
