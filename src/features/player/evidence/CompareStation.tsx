import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DISCOVERY_NOTICE,
  clueStatus,
  cluesBetween,
  deriveClues,
  describeGap,
  discoverableBy,
  parseEvidenceTime,
  timestampOf,
  type DiscoveryMethod,
  type HiddenClue,
} from '@/lib/evidence/clues'
import { recordDiscoveries, type InvestigationWorkspace } from '@/lib/investigationWorkspace'
import { artifactImageUrl, type CaseArtifact } from './types'
import { cn } from '@/lib/utils'

type CompareMode = 'SIDE' | 'OVERLAY' | 'TIMELINE'

interface CompareStationProps {
  /** Every record in the case file — clues are derived across all of them. */
  artifacts: CaseArtifact[]
  pair: [CaseArtifact, CaseArtifact]
  workspace: InvestigationWorkspace
  onUpdate: (update: (current: InvestigationWorkspace) => InvestigationWorkspace) => void
  /** The side-by-side surface for one record (the archive supplies its inspector). */
  renderRecord: (artifact: CaseArtifact) => ReactNode
}

const MODES: Array<{ id: CompareMode; label: string; method: DiscoveryMethod }> = [
  { id: 'SIDE', label: 'SIDE BY SIDE', method: 'CROSS_REFERENCE' },
  { id: 'OVERLAY', label: 'OVERLAY', method: 'CROSS_REFERENCE' },
  { id: 'TIMELINE', label: 'TIMELINE', method: 'TIMELINE_COMPARISON' },
]

/**
 * Two records, examined together. What this finds depends on how they are
 * examined: a plain comparison turns up cross-references; lining their times up
 * turns up timestamp relationships. Nothing is marked, glowing or counted in
 * advance — the player sees only what they have already found.
 */
export function CompareStation({ artifacts, pair, workspace, onUpdate, renderRecord }: CompareStationProps) {
  const [mode, setMode] = useState<CompareMode>('SIDE')
  const [blend, setBlend] = useState(50)
  const [announced, setAnnounced] = useState<HiddenClue[]>([])
  const [a, b] = pair
  const workspaceRef = useRef(workspace)
  useEffect(() => { workspaceRef.current = workspace })

  const clues = useMemo(() => deriveClues(artifacts), [artifacts])
  const method = MODES.find(entry => entry.id === mode)!.method

  // Declared first so a new pair clears old notices before its own are added.
  useEffect(() => { setAnnounced([]) }, [a.code, b.code])

  useEffect(() => {
    const found = discoverableBy(clues, a.code, b.code, method)
    const fresh = found.filter(clue => !workspaceRef.current.discoveries[clue.id])
    if (fresh.length === 0) return
    onUpdate(current => recordDiscoveries(current, fresh, method))
    setAnnounced(current => [...current, ...fresh])
  }, [clues, a.code, b.code, method, onUpdate])

  const recorded = cluesBetween(clues, a.code, b.code).filter(clue => workspace.discoveries[clue.id])
  const idByCode = (code: string) => artifacts.find(artifact => artifact.code === code)?.id ?? code

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Comparison method" className="flex flex-wrap gap-1">
        {MODES.map(entry => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={mode === entry.id}
            onClick={() => setMode(entry.id)}
            className={cn(
              'min-h-10 border px-3 font-mono text-[0.55rem] uppercase tracking-[0.12em]',
              mode === entry.id ? 'border-nexus-accent text-nexus-accent' : 'border-nexus-border text-nexus-textSubtle',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {announced.length > 0 && (
        <div role="status" className="space-y-1">
          {announced.map(clue => (
            <p key={clue.id} className="border-l-2 border-nexus-warning bg-nexus-warningBg/20 px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-nexus-warning">
              {DISCOVERY_NOTICE[clue.category]} / {clue.evidence.join(' ↔ ')}
            </p>
          ))}
        </div>
      )}

      {mode === 'SIDE' && (
        <div className="grid gap-5 xl:grid-cols-2">
          {pair.map(artifact => <section key={artifact.id} className="min-w-0 border-t border-nexus-borderSubtle pt-2">{renderRecord(artifact)}</section>)}
        </div>
      )}

      {mode === 'OVERLAY' && <OverlayView a={a} b={b} blend={blend} onBlend={setBlend} />}

      {mode === 'TIMELINE' && <TimelineView a={a} b={b} />}

      <section aria-label="Recorded findings" className="border-t border-nexus-borderSubtle pt-2">
        <h3 className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
          RECORDED FINDINGS FOR THIS PAIR / {recorded.length.toString().padStart(2, '0')}
        </h3>
        {recorded.length === 0 ? (
          <p className="mt-1 font-mono text-[0.6rem] text-nexus-textSubtle">Nothing recorded. Examine the records closely, or line their times up.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {recorded.map(clue => (
              <li key={clue.id} className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                <span className="font-mono text-[0.52rem] uppercase text-nexus-warning">
                  {clue.category} / {clueStatus(clue, workspace.discoveries, workspace.hypotheses, idByCode)}
                </span>
                <span className="text-nexus-textMuted">{clue.meaning}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function OverlayView({ a, b, blend, onBlend }: { a: CaseArtifact; b: CaseArtifact; blend: number; onBlend: (value: number) => void }) {
  const first = artifactImageUrl(a)
  const second = artifactImageUrl(b)
  if (!first || !second) {
    return <p className="border-y border-nexus-borderSubtle py-4 font-mono text-xs uppercase text-nexus-textMuted">OVERLAY NEEDS TWO IMAGE RECORDS. {!first ? a.code : b.code} HAS NO IMAGE.</p>
  }
  return (
    <div className="space-y-2">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden border border-nexus-border bg-black">
        <img src={first} alt={`${a.title} (base layer)`} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
        <img src={second} alt={`${b.title} (overlay)`} draggable={false} className="absolute inset-0 h-full w-full object-contain" style={{ opacity: blend / 100 }} />
      </div>
      <label className="flex items-center gap-3 font-mono text-[0.55rem] uppercase text-nexus-textSubtle">
        {a.code}
        <input type="range" min={0} max={100} value={blend} onChange={event => onBlend(Number(event.target.value))} aria-label="Blend between the two records" className="flex-1 accent-nexus-accent" />
        {b.code}
      </label>
    </div>
  )
}

function TimelineView({ a, b }: { a: CaseArtifact; b: CaseArtifact }) {
  const rows = [a, b].map(artifact => ({ artifact, text: timestampOf(artifact), time: parseEvidenceTime(timestampOf(artifact)) }))
  const readable = rows.filter((row): row is typeof row & { time: number } => row.time !== null)
  if (readable.length < 2) {
    return (
      <div className="space-y-1 border-y border-nexus-borderSubtle py-4 font-mono text-xs uppercase text-nexus-textMuted">
        {rows.map(row => <p key={row.artifact.id}>{row.artifact.code}: {row.text ?? 'NO READABLE TIMESTAMP'}</p>)}
        <p className="text-nexus-textSubtle">A timeline needs a time on both records.</p>
      </div>
    )
  }
  const sorted = [...readable].sort((x, y) => x.time - y.time)
  const span = Math.max(1, sorted[1].time - sorted[0].time)
  return (
    <div className="space-y-3">
      <ol className="relative h-24 border-b border-nexus-border" aria-label="Records in time order">
        {sorted.map((row, index) => (
          <li key={row.artifact.id} className="absolute top-2 w-1/2 font-mono text-[0.55rem] uppercase" style={index === 0 ? { left: 0 } : { right: 0, textAlign: 'right' }}>
            <span className="block text-nexus-text">{row.artifact.code}</span>
            <span className="block text-nexus-textMuted">{row.text}</span>
            <span className="mt-1 block text-nexus-textSubtle">{row.artifact.title}</span>
          </li>
        ))}
      </ol>
      <p className="font-mono text-xs uppercase text-nexus-text">
        {sorted[0].artifact.code} → {sorted[1].artifact.code} / {describeGap(span)}
      </p>
    </div>
  )
}
