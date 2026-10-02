/**
 * NEXUS ECHO — Bureau: TerminalFrame
 *
 * The NEXUS System itself. Where DocumentShell is a paper file or a screen
 * showing a document, TerminalFrame is a live system panel — the kind an
 * operator sits at a terminal and reads straight from machine output.
 *
 * Visual signature:
 *   - monospace type (terminal age)
 *   - deep charcoal surface, no paper warmth
 *   - a single institutional-blue edge on the left
 *   - corner brackets, never rounded corners
 *   - a header band carrying a system label and reference
 *   - content never overflows without a ruled separator
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TerminalVariant = 'system' | 'monitor' | 'register'

export function TerminalFrame({
  reference,
  title,
  icon,
  variant = 'system',
  children,
  className,
  bodyClassName,
  headerClassName,
  footer,
}: {
  reference?: string
  title?: ReactNode
  icon?: ReactNode
  variant?: TerminalVariant
  children: ReactNode
  className?: string
  bodyClassName?: string
  headerClassName?: string
  footer?: ReactNode
}) {
  return (
    <section
      className={cn(
        'terminal-frame relative border border-nexus-border bg-nexus-bg text-nexus-text font-mono',
        variant === 'monitor' && 'terminal-monitor',
        variant === 'register' && 'terminal-register',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-0 bottom-0 w-0.5 bg-nexus-accent',
          variant === 'monitor' && 'bg-nexus-warning',
          variant === 'register' && 'bg-nexus-textSubtle',
        )}
        aria-hidden="true"
      />

      <span className="terminal-corner tl" aria-hidden="true" />
      <span className="terminal-corner tr" aria-hidden="true" />

      {(title || reference) && (
        <header
          className={cn(
            'terminal-header flex items-center justify-between gap-2 border-b border-nexus-border px-3 py-2',
            'bg-nexus-surfaceElevated',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            <span className="truncate text-xs uppercase tracking-[0.16em] text-nexus-textSubtle">
              {title}
            </span>
          </div>
          {reference && (
            <span className="font-mono text-[0.875rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
              {reference}
            </span>
          )}
        </header>
      )}

      <div className={cn('terminal-body px-3 py-2 text-sm', bodyClassName)}>
        {children}
      </div>

      {footer && (
        <footer className="terminal-footer border-t border-nexus-border px-3 py-1.5 text-xs">
          {footer}
        </footer>
      )}
    </section>
  )
}
