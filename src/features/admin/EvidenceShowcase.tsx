/**
 * NEXUS ECHO — EVIDENCE ARCHIVE (admin showcase, M-12)
 *
 * The case's eight media, record by record. Each group shows the records that
 * carry the most weight (importance, then clues), straight from the catalog's
 * own fields — nothing is described that the record does not state. OPEN /
 * INSPECT puts the record under the player's inspection component in a
 * full-screen surface.
 *
 * The catalog is the generated NX-037 simulation set, compiled into development
 * builds only. In a production build it is empty and this screen says so.
 *
 * Deep link: ?type=SURVEILLANCE&code=CAM-07 scrolls to the medium and opens the
 * record (the code may be short or full).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/config'
import { artifactImageUrl, type ArtifactType } from '@/features/player/evidence/types'
import { showcaseCatalog, SHOWCASE_CASE, SHOWCASE_LABEL } from '@/lib/evidence/showcaseCatalog'
import { cn } from '@/lib/utils'
import { EvidenceShowcaseOverlay } from './EvidenceShowcaseOverlay'
import {
  buildShowcaseModel,
  findRecord,
  parseDeepLink,
  type ShowcaseGroup,
  type ShowcaseRecord,
} from './evidenceShowcaseModel'

const IMPORTANCE_TONE: Record<string, string> = {
  CRITICAL: 'border-nexus-danger text-nexus-danger',
  IMPORTANT: 'border-nexus-warning text-nexus-warning',
  SUPPORTING: 'border-nexus-border text-nexus-textMuted',
  BACKGROUND: 'border-nexus-borderSubtle text-nexus-textSubtle',
}

const pad = (value: number) => String(value).padStart(2, '0')

function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={cn('inline-block border px-1.5 py-0.5 text-[0.56rem] leading-none tracking-[0.1em]', tone ?? 'border-nexus-border text-nexus-textMuted')}>{children}</span>
}

function RecordCard({ record, highlighted, onOpen }: { record: ShowcaseRecord; highlighted: boolean; onOpen: (code: string) => void }) {
  const { artifact } = record
  const image = artifactImageUrl(artifact)
  const [failed, setFailed] = useState(false)
  const damaged = record.condition !== 'NORMAL'
  const flagged = record.state === 'CONTRADICTED' || record.state === 'ANOMALOUS'
  const series = record.series
  const seriesText = series
    ? `${series.unit ? `${series.unit} · ` : ''}${series.series.source} · ${series.position}/${series.total}`
    : 'STANDALONE RECORD'

  return (
    <article
      data-testid="showcase-record"
      data-code={artifact.code}
      className={cn('flex min-w-0 flex-col border bg-nexus-surface', highlighted ? 'border-nexus-accent' : 'border-nexus-border')}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Inspect ${artifact.code}`}
        onClick={() => onOpen(artifact.code)}
        className="relative block h-[15rem] w-full overflow-hidden border-b border-nexus-border bg-[#070708] p-2 sm:h-[17rem]"
      >
        {image && !failed ? (
          <img
            src={image}
            alt={`${artifact.code} ${artifact.title}`}
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[0.6rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
            {image ? 'IMAGE UNAVAILABLE' : 'NO IMAGE ATTACHED'}
          </span>
        )}
        {damaged && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-nexus-warning" aria-hidden="true" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[0.7rem] font-bold tracking-[0.1em] text-nexus-accent">{artifact.code}</p>
          <p className="text-[0.56rem] uppercase tracking-[0.12em] text-nexus-textSubtle">{record.type}</p>
        </div>
        <h3 className="text-[0.8rem] font-bold leading-snug tracking-[0.02em] text-nexus-text">{artifact.title}</h3>

        <div className="flex flex-wrap gap-1">
          <Chip tone={damaged ? 'border-nexus-warning text-nexus-warning' : undefined}>{record.condition}</Chip>
          <Chip tone={flagged ? 'border-nexus-danger text-nexus-danger' : undefined}>{record.state}</Chip>
          <Chip tone={IMPORTANCE_TONE[record.importance.importance]}>{record.importance.importance}</Chip>
        </div>

        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[0.62rem] uppercase leading-snug">
          {record.facts.map(fact => (
            <div key={fact.label} className="contents">
              <dt className="text-nexus-textSubtle">{fact.label}</dt>
              <dd className="break-words text-nexus-text">{fact.value}</dd>
            </div>
          ))}
          {artifact.location && (
            <div className="contents">
              <dt className="text-nexus-textSubtle">LOCATION</dt>
              <dd className="break-words text-nexus-text">{artifact.location}</dd>
            </div>
          )}
          <div className="contents">
            <dt className="text-nexus-textSubtle">SERIES</dt>
            <dd className="break-words text-nexus-textMuted">{seriesText}</dd>
          </div>
          <div className="contents">
            <dt className="text-nexus-textSubtle">RELATED</dt>
            <dd className="text-nexus-textMuted">{record.related.length === 0 ? 'NONE' : `${record.related.length} RECORD${record.related.length === 1 ? '' : 'S'}`}{record.importance.contradictions > 0 ? ` · ${record.importance.contradictions} CONTRADICTION${record.importance.contradictions === 1 ? '' : 'S'}` : ''}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => onOpen(artifact.code)}
          className="mt-auto min-h-10 w-full border border-nexus-accent/70 px-3 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-nexus-accent hover:bg-nexus-accentBg focus-visible:bg-nexus-accentBg"
        >
          OPEN / INSPECT
        </button>
      </div>
    </article>
  )
}

export function EvidenceShowcase() {
  const location = useLocation()
  const navigate = useNavigate()
  const catalog = useMemo(() => showcaseCatalog(), [])
  const model = useMemo(() => buildShowcaseModel(catalog), [catalog])

  // The window's own router carries only the pathname, so a deep link is read
  // from the memory location first and the address bar second.
  const [link] = useState(() => parseDeepLink(location.search || window.location.search))
  const linked = useMemo(() => findRecord(model, link.code, link.type), [model, link])
  const linkMissing = link.code !== null && linked === null

  const [openCode, setOpenCode] = useState<string | null>(linked?.artifact.code ?? null)
  const [expanded, setExpanded] = useState<ReadonlySet<ArtifactType>>(() => {
    if (!linked) return new Set<ArtifactType>()
    const group = model.groups.find(candidate => candidate.type === linked.type)
    return group && !group.representatives.includes(linked) ? new Set<ArtifactType>([linked.type]) : new Set<ArtifactType>()
  })
  const [active, setActive] = useState<ArtifactType | null>(linked?.type ?? link.type)
  const groupRefs = useRef(new Map<ArtifactType, HTMLElement>())

  const goTo = useCallback((type: ArtifactType) => {
    setActive(type)
    groupRefs.current.get(type)?.scrollIntoView?.({ block: 'start' })
  }, [])

  useEffect(() => {
    const type = linked?.type ?? link.type
    if (!type) return
    const frame = window.requestAnimationFrame(() => groupRefs.current.get(type)?.scrollIntoView?.({ block: 'start' }))
    return () => window.cancelAnimationFrame(frame)
  }, [linked, link.type])

  const openRecord = openCode ? model.byCode.get(openCode) ?? null : null
  const siblings = openRecord ? model.groups.find(group => group.type === openRecord.type)?.records ?? [] : []
  const toggleExpanded = (type: ArtifactType) => setExpanded(current => {
    const next = new Set(current)
    if (next.has(type)) next.delete(type); else next.add(type)
    return next
  })

  if (model.total === 0) {
    return (
      <div className="mx-auto max-w-xl py-10 font-mono" data-testid="showcase-empty">
        <p className="text-[0.56rem] uppercase tracking-[0.18em] text-nexus-textSubtle">NEXUS ECHO / EVIDENCE ARCHIVE</p>
        <h1 className="mt-2 text-lg font-bold tracking-[0.08em] text-nexus-text">NO EVIDENCE RECORDS LOADED</h1>
        <p className="mt-3 text-xs leading-relaxed text-nexus-textMuted">
          This module shows the generated CASE {SHOWCASE_CASE.id} simulation set. That set is compiled into development builds only,
          so there is nothing to display here. Live evidence is held in the Evidence Register.
        </p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.ADMIN_EVIDENCE_REGISTER)}
          className="mt-4 min-h-10 border border-nexus-accent px-4 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-nexus-accent hover:bg-nexus-accentBg"
        >
          OPEN EVIDENCE REGISTER
        </button>
      </div>
    )
  }

  const damaged = model.groups.reduce((sum, group) => sum + group.nonNormal, 0)

  return (
    <div className="font-mono" data-testid="showcase">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-nexus-border pb-3">
        <div className="min-w-0">
          <p className="text-[0.54rem] uppercase tracking-[0.18em] text-nexus-textSubtle">{SHOWCASE_CASE.institution} / CASE {SHOWCASE_CASE.id}</p>
          <h1 className="mt-1 text-lg font-bold tracking-[0.1em] text-nexus-text sm:text-xl">NEXUS ECHO — EVIDENCE ARCHIVE</h1>
          <p className="mt-1 text-[0.58rem] uppercase tracking-[0.12em] text-nexus-textMuted">
            {pad(model.total)} RECORDS · {pad(model.groups.length)} MEDIA · {pad(damaged)} NOT IN NORMAL CONDITION
          </p>
        </div>
        <span className="border border-nexus-warning px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-nexus-warning" data-testid="simulation-label">{SHOWCASE_LABEL}</span>
      </header>

      <nav aria-label="Media" className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-b border-nexus-borderSubtle bg-nexus-bg/95 px-4 py-2 backdrop-blur-sm">
        {model.groups.map(group => (
          <button
            key={group.type}
            type="button"
            onClick={() => goTo(group.type)}
            aria-current={active === group.type ? 'true' : undefined}
            className={cn(
              'min-h-9 shrink-0 border px-2.5 text-[0.58rem] uppercase tracking-[0.12em]',
              active === group.type ? 'border-nexus-accent text-nexus-accent' : 'border-nexus-border text-nexus-textMuted hover:border-nexus-borderHover hover:text-nexus-text',
            )}
          >
            {group.label} <span className="text-nexus-textSubtle">{pad(group.records.length)}</span>
          </button>
        ))}
      </nav>

      {linkMissing && (
        <p role="alert" className="mt-3 border border-nexus-warning/60 bg-nexus-warningBg/20 px-3 py-2 text-[0.6rem] uppercase tracking-[0.1em] text-nexus-warning">
          NO RECORD {link.code}{link.type ? ` IN ${link.type}` : ''} — SHOWING THE ARCHIVE
        </p>
      )}

      <div className="space-y-8 pt-4">
        {model.groups.map((group: ShowcaseGroup) => {
          const all = expanded.has(group.type)
          const shown = all ? group.records : group.representatives
          return (
            <section
              key={group.type}
              ref={element => { if (element) groupRefs.current.set(group.type, element); else groupRefs.current.delete(group.type) }}
              id={`group-${group.type.toLowerCase()}`}
              data-testid={`group-${group.type}`}
              aria-labelledby={`group-title-${group.type}`}
              className="scroll-mt-14"
            >
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-nexus-borderSubtle pb-2">
                <div>
                  <h2 id={`group-title-${group.type}`} className="text-sm font-bold tracking-[0.18em] text-nexus-text">{group.label}</h2>
                  <p className="mt-0.5 text-[0.56rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
                    {pad(group.records.length)} IN ARCHIVE · {pad(group.nonNormal)} NOT NORMAL · SHOWING {pad(shown.length)} BY IMPORTANCE
                  </p>
                </div>
                {group.records.length > group.representatives.length && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(group.type)}
                    aria-expanded={all}
                    className="min-h-9 border border-nexus-border px-2.5 text-[0.58rem] uppercase tracking-[0.12em] text-nexus-textMuted hover:border-nexus-accent hover:text-nexus-accent"
                  >
                    {all ? `SHOW ${group.representatives.length} KEY RECORDS` : `SHOW ALL ${group.records.length}`}
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {shown.map(record => (
                  <RecordCard key={record.artifact.id} record={record} highlighted={linked?.artifact.code === record.artifact.code} onOpen={setOpenCode} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <p className="mt-8 border-t border-nexus-borderSubtle pt-3 text-[0.54rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
        {SHOWCASE_LABEL} / GENERATED CASE {SHOWCASE_CASE.id} CATALOG / DEVELOPMENT BUILDS ONLY / MARKS AND NOTES STAY IN THIS SANDBOX
      </p>

      {openRecord && (
        <EvidenceShowcaseOverlay
          record={openRecord}
          model={model}
          siblings={siblings}
          onSelect={setOpenCode}
          onClose={() => setOpenCode(null)}
        />
      )}
    </div>
  )
}
