/**
 * NEXUS ECHO — Field device components
 *
 * Named for what they are in the investigation, not for how they look: the
 * lead the team is working, a line of new intelligence, the case ledger. They
 * hold no data of their own; screens pass real game state in.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { cn } from '@/lib/utils'

/** The thing the team should be doing right now. One per screen, large. */
export function FieldLead({
  eyebrow,
  title,
  place,
  note,
  action,
}: {
  eyebrow: string
  title: string
  place?: string | null
  note?: ReactNode
  action: ReactNode
}) {
  return (
    <section className="nx-lead" aria-label="Current lead">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-nexus-accent">{eyebrow}</p>
      <h1 className="mt-3 font-type text-[1.65rem] font-bold leading-[1.15] text-nexus-text break-words">{title}</h1>
      {place && (
        <p className="mt-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-nexus-textMuted">
          <BureauIcons.MapPin className="bureau-icon w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{place}</span>
        </p>
      )}
      {note && <div className="mt-4 text-[0.95rem] leading-relaxed text-nexus-textMuted">{note}</div>}
      <div className="mt-6">{action}</div>
    </section>
  )
}

/** A line of real new information, with a destination. Never a decoration. */
export function IntelRow({
  to,
  label,
  detail,
  tone = 'info',
  count,
}: {
  to: string
  label: string
  detail?: string
  tone?: 'info' | 'warning'
  count?: number
}) {
  return (
    <Link
      to={to}
      className="nx-intel flex min-h-14 items-center gap-3 border-b border-nexus-borderSubtle py-3 focus-visible:outline-none"
    >
      <span
        className={cn(
          'flex h-8 min-w-8 shrink-0 items-center justify-center border px-1 font-mono text-sm font-bold tabular-nums',
          tone === 'warning' ? 'border-nexus-warning text-nexus-warning' : 'border-nexus-accent/60 text-nexus-accent',
        )}
        aria-hidden="true"
      >
        {count ?? '·'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[0.78rem] uppercase tracking-[0.1em] text-nexus-text">{label}</span>
        {detail && <span className="mt-0.5 block truncate text-sm text-nexus-textMuted">{detail}</span>}
      </span>
      <BureauIcons.Forward className="bureau-icon w-4 h-4 shrink-0 text-nexus-textSubtle" aria-hidden="true" />
    </Link>
  )
}

/** The case as one strip: a cell for every item, closed ones filled. */
export function FieldLedger({ cells, closed, total }: { cells: boolean[]; closed: number; total: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.14em] text-nexus-textMuted">
        <span>CASE LEDGER</span>
        <span className="tabular-nums text-nexus-text">{closed} / {total} CLOSED</span>
      </div>
      <div
        className="mt-2 flex gap-[3px]"
        role="img"
        aria-label={`${closed} of ${total} items closed`}
      >
        {cells.map((done, index) => (
          <span
            key={index}
            className={cn('h-2.5 flex-1 border', done ? 'border-nexus-accent bg-nexus-accent/70' : 'border-nexus-borderSubtle')}
          />
        ))}
      </div>
    </div>
  )
}

/** A reference reached from the case: site map, recovered objects, field record. */
export function FieldLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-12 flex-1 items-center justify-center border border-nexus-borderSubtle px-2 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-nexus-textMuted active:bg-nexus-surfaceElevated focus-visible:outline-none"
    >
      {label}
    </Link>
  )
}
