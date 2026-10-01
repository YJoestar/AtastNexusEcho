/**
 * NEXUS ECHO — Bureau: Register
 *
 * Registers and file indexes. Rows separated by rules, not boxes: a bureau
 * register is a ruled column in a ledger, and an identical rounded card per
 * row is what makes an interface read as a dashboard.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function RegisterList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('register', className)}>{children}</div>
}

/**
 * One register entry: a reference in a fixed gutter, then the entry itself,
 * then its state.
 */
export function RegisterRow({
  id,
  label,
  meta,
  trailing,
  className,
}: {
  id?: ReactNode
  label: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('register-row', className)}>
      {id && <span className="register-id w-24 shrink-0 truncate">{id}</span>}
      <span className="register-main min-w-0">
        <span className="register-label block truncate">{label}</span>
        {meta && <span className="register-meta block truncate">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </div>
  )
}

/**
 * A row in a file index. Renders as a button when `onSelect` is given so that
 * the index stays keyboard-navigable and screen-reader legible; the selected row
 * is drawn as pulled from the drawer, not as a highlighted pill.
 */
export function FileRow({
  reference,
  title,
  meta,
  trailing,
  selected = false,
  onSelect,
  className,
}: {
  reference?: ReactNode
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  selected?: boolean
  onSelect?: () => void
  className?: string
}) {
  const content = (
    <>
      {reference && <span className="register-id shrink-0">{reference}</span>}
      <span className="min-w-0 flex-1">
        <span className="register-label block truncate">{title}</span>
        {meta && <span className="register-meta block truncate">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'file-row w-full text-left',
          selected && 'file-row-selected',
          'hover:bg-nexus-surfaceElevated',
          className,
        )}
      >
        {content}
      </button>
    )
  }

  return <div className={cn('file-row', selected && 'file-row-selected', className)}>{content}</div>
}

/** The tabs of an open file drawer. */
export function FileTabs({
  tabs,
  activeId,
  onSelect,
  className,
}: {
  tabs: readonly { id: string; label: string }[]
  activeId: string
  onSelect: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} role="tablist">
      {tabs.map(tab => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={cn(
              active ? 'file-tab-active' : 'file-tab text-nexus-textSubtle hover:text-nexus-text',
              'min-h-[36px] transition-colors duration-fast',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * A column of a register with its own heading rule. Used where a real ledger
 * would have a ruled vertical divider between columns.
 */
export function RegisterColumn({
  heading,
  children,
  className,
}: {
  heading: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('min-w-0', className)}>
      <h3 className="section-label border-b border-nexus-borderSubtle pb-1.5">{heading}</h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}