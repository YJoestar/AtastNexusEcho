import { BureauIcons } from '@/components/bureau'
import type { Fact } from '@/lib/evidence/facts'
import type { RelatedRecord } from './types'

export function FactsRow({ facts, label }: { facts: Fact[]; label: string }) {
  if (facts.length === 0) return null
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-nexus-borderSubtle py-2 font-mono sm:grid-cols-3">
      {facts.map(fact => (
        <div key={fact.label} className="min-w-0">
          <dt className="text-[0.64rem] uppercase tracking-[0.12em] text-nexus-textSubtle">{fact.label}</dt>
          <dd className="mt-0.5 break-words text-[0.8rem] text-nexus-text">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function LinkedRecordsList({
  records,
  title,
  label,
  empty,
  onOpen,
}: {
  records: RelatedRecord[]
  title: string
  label: string
  empty?: string
  onOpen?: (id: string) => void
}) {
  if (records.length === 0 && !empty) return null
  return (
    <section aria-label={label} className="border-b border-nexus-borderSubtle pb-3">
      <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-nexus-textSubtle">{title}</h3>
      {records.length === 0 ? (
        <p className="mt-2 font-mono text-xs uppercase text-nexus-textMuted">{empty}</p>
      ) : (
        <ul className="mt-1 divide-y divide-nexus-borderSubtle">
          {records.map(({ artifact: other, kind, note }) => (
            <li key={other.id}>
              <button type="button" onClick={() => onOpen?.(other.id)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[0.68rem] uppercase tracking-[0.1em] text-nexus-warning">{kind} · {other.code}</span>
                  <span className="block truncate text-sm text-nexus-text">{other.title}</span>
                  {note && <span className="block text-xs text-nexus-textMuted">{note}</span>}
                </span>
                <BureauIcons.Forward className="bureau-icon h-4 w-4 shrink-0 text-nexus-textSubtle" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function NoImage({ label, text }: { label: string; text: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center border border-nexus-border bg-nexus-surfaceElevated p-6 text-center">
      <BureauIcons.Image className="bureau-icon mb-4 h-8 w-8 text-nexus-textSubtle" aria-hidden="true" />
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-nexus-warning">{label}</p>
      <p className="mt-2 max-w-sm text-sm text-nexus-textMuted">{text}</p>
    </div>
  )
}
