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
import { LeadSelector } from './LeadSelector'

/** The thing the team should be doing right now. One per screen, large. */
export function FieldLead({
  eyebrow,
  title,
  clue,
  note,
  action,
}: {
  eyebrow: string
  title: string
  /**
   * The observable fact that suggests a direction — what the team should reason
   * over. This replaced a `place` prop that rendered the node's location string
   * under a MapPin icon, which made the case home a waypoint: it told the team
   * where to go instead of what to think about. The destination is the team's to
   * infer from the clue.
   */
  clue?: string | null
  note?: ReactNode
  action: ReactNode
}) {
  return (
    <section className="nx-lead" aria-label="Current lead">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-nexus-textSubtle">{eyebrow}</p>
      <h1 className="mt-2 font-type text-[1.55rem] font-medium leading-[1.18] text-nexus-text break-words tracking-tight">{title}</h1>
      {clue && (
        <blockquote className="mt-3 ml-1 border-l border-nexus-borderSubtle pl-3 font-type text-[0.92rem] leading-relaxed text-nexus-textMuted italic">
          {clue}
        </blockquote>
      )}
      {note && <div className="mt-3 ml-1 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-nexus-textSubtle">{note}</div>}
      <div className="mt-5">{action}</div>
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
  timestamp,
}: {
  to: string
  label: string
  detail?: string
  tone?: 'info' | 'warning'
  count?: number
  timestamp?: string
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
        <div className="flex items-center gap-2">
          <span className="block font-mono text-[0.72rem] uppercase tracking-[0.1em] text-nexus-text">{label}</span>
          {timestamp && (
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-nexus-textSubtle">
              {formatRelativeTime(timestamp)}
            </span>
          )}
        </div>
        {detail && <span className="mt-0.5 block truncate text-[0.82rem] text-nexus-textMuted">{detail}</span>}
      </span>
      <BureauIcons.Forward className="bureau-icon w-4 h-4 shrink-0 text-nexus-textSubtle" aria-hidden="true" />
    </Link>
  )
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const absDiff = Math.abs(diffMs)

  const MS_PER_SECOND = 1000
  const MS_PER_MINUTE = 60 * MS_PER_SECOND
  const MS_PER_HOUR = 60 * MS_PER_MINUTE
  const MS_PER_DAY = 24 * MS_PER_HOUR

  if (absDiff < MS_PER_SECOND * 5) return 'JUST NOW'
  if (absDiff < MS_PER_MINUTE) return `${Math.floor(absDiff / MS_PER_SECOND)}S AGO`
  if (absDiff < MS_PER_HOUR) return `${Math.floor(absDiff / MS_PER_MINUTE)}M AGO`
  if (absDiff < MS_PER_DAY) return `${Math.floor(absDiff / MS_PER_HOUR)}H AGO`
  return `${Math.floor(absDiff / MS_PER_DAY)}D AGO`
}

/** The case as one strip: a cell for every item, closed ones filled. */
export function FieldLedger({ cells, closed, total }: { cells: boolean[]; closed: number; total: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.14em] text-nexus-textMuted">
        <span>CASE LEDGER</span>
        <span className="tabular-nums text-nexus-text">{closed} / {total} NODES RESOLVED</span>
      </div>
      <div
        className="mt-2 flex gap-[3px]"
        role="img"
        aria-label={`${closed} of ${total} items closed`}
      >
        {cells.map((done, index) => (
          <span
            key={index}
            className={cn('h-2.5 flex-1 border', done ? 'border-nexus-verified bg-nexus-verified/70' : 'border-nexus-borderSubtle')}
          />
        ))}
      </div>
      <p className="mt-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-nexus-textSubtle">CASE PROGRESSION</p>
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

export { LeadSelector }
