/**
 * NEXUS ECHO — Evidence showcase inspection overlay
 *
 * The evidence takes the whole screen: a thin header with the record's
 * identity and ◀ ▶ through its medium, and below it the player's own
 * ArtifactInspection, unchanged. Marks, notes and the board are kept in a
 * sandbox workspace keyed to this showcase, never in a team's progress.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAdmin } from '@/app/providers/AdminProvider'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { ArtifactInspection } from '@/features/player/evidence/ArtifactInspection'
import type { CaseArtifact } from '@/features/player/evidence/types'
import type { AnnotationKind, EvidenceMark } from '@/lib/investigationWorkspace'
import { SHOWCASE_LABEL } from '@/lib/evidence/showcaseCatalog'
import type { ShowcaseModel, ShowcaseRecord } from './evidenceShowcaseModel'

interface OverlayProps {
  record: ShowcaseRecord
  model: ShowcaseModel
  /** The record's medium, in showcase order, for previous / next. */
  siblings: ShowcaseRecord[]
  onSelect: (code: string) => void
  onClose: () => void
}

const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `n-${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function EvidenceShowcaseOverlay({ record, model, siblings, onSelect, onClose }: OverlayProps) {
  const { admin } = useAdmin()
  const { workspace, updateWorkspace } = useInvestigationWorkspace(`admin-evidence-showcase:${admin?.id ?? 'operator'}`)
  const closeRef = useRef<HTMLButtonElement>(null)
  const artifact = record.artifact
  const index = siblings.findIndex(item => item.artifact.code === artifact.code)
  const previous = index > 0 ? siblings[index - 1] : null
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null

  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => returnTo?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      else if (event.altKey && event.key === 'ArrowLeft' && previous) { event.preventDefault(); onSelect(previous.artifact.code) }
      else if (event.altKey && event.key === 'ArrowRight' && next) { event.preventDefault(); onSelect(next.artifact.code) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onSelect, previous, next])

  const related = useMemo(() => record.related.flatMap(code => {
    const other = model.byCode.get(code)?.artifact
    if (!other) return []
    const link = artifact.relationships?.find(entry => entry.to === code)
      ?? other.relationships?.find(entry => entry.to === artifact.code)
    return [{ artifact: other, kind: link?.kind ?? 'REFERENCE', note: link?.note ?? '' }]
  }), [record.related, model.byCode, artifact])

  const mark = useCallback((id: string, status: EvidenceMark) => updateWorkspace(current => ({
    ...current, marks: { ...current.marks, [id]: status },
  })), [updateWorkspace])

  const annotate = useCallback((id: string, kind: AnnotationKind, text: string, point?: { x: number; y: number }) => updateWorkspace(current => ({
    ...current,
    annotations: {
      ...current.annotations,
      [id]: [...(current.annotations[id] ?? []), { id: makeId(), kind, text, createdAt: new Date().toISOString(), ...point }],
    },
  })), [updateWorkspace])

  const place = useCallback((id: string) => updateWorkspace(current => {
    if (current.placements[id]) return current
    const order = Math.max(0, ...Object.values(current.placements).map(item => item.order)) + 1
    const count = Object.keys(current.placements).length
    return {
      ...current,
      placements: {
        ...current.placements,
        [id]: { x: 18 + (count % 4) * 21, y: 20 + (Math.floor(count / 4) % 4) * 20, rotation: count % 2 === 0 ? -1 : 1, order, pinned: false },
      },
    }
  }), [updateWorkspace])

  const openRelated = useCallback((id: string) => {
    const other = model.artifacts.find((item: CaseArtifact) => item.id === id)
    if (other) onSelect(other.code)
  }, [model.artifacts, onSelect])

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Evidence inspection ${artifact.code}`}
      data-testid="showcase-overlay"
      className="fixed inset-0 z-[200] flex flex-col bg-[#050506] font-mono text-nexus-text"
    >
      <header className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-nexus-border bg-nexus-surfaceElevated px-2 py-1 text-[0.58rem] uppercase tracking-[0.12em] sm:px-3">
        <button ref={closeRef} type="button" onClick={onClose} className="min-h-10 shrink-0 border border-nexus-border px-2.5 font-bold text-nexus-text hover:border-nexus-accent hover:text-nexus-accent focus-visible:border-nexus-accent">
          ← ARCHIVE<span className="ml-2 hidden text-nexus-textSubtle sm:inline">ESC</span>
        </button>
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-nexus-textSubtle">
            <span className="text-nexus-accent">{artifact.code}</span> · {record.type} · {record.condition}
          </p>
          <p className="truncate text-[0.68rem] font-bold tracking-[0.06em] text-nexus-text">{artifact.title}</p>
        </div>
        <span className="hidden border border-nexus-info/60 px-1.5 py-0.5 text-nexus-textMuted md:inline">{SHOWCASE_LABEL}</span>
        <nav aria-label="Records in this medium" className="flex shrink-0 items-center gap-1">
          <button type="button" disabled={!previous} onClick={() => previous && onSelect(previous.artifact.code)} aria-label="Previous record" className="min-h-10 min-w-10 border border-nexus-border px-2 hover:border-nexus-accent disabled:opacity-30">◀</button>
          <span className="min-w-12 text-center tabular-nums text-nexus-textMuted">{index + 1} / {siblings.length}</span>
          <button type="button" disabled={!next} onClick={() => next && onSelect(next.artifact.code)} aria-label="Next record" className="min-h-10 min-w-10 border border-nexus-border px-2 hover:border-nexus-accent disabled:opacity-30">▶</button>
        </nav>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1500px] p-2 sm:p-4 [&_.nx-actionbar]:bottom-0">
          <ArtifactInspection
            key={artifact.id}
            artifact={artifact}
            mark={workspace.marks[artifact.id] ?? 'UNMARKED'}
            annotations={workspace.annotations[artifact.id] ?? []}
            onMarkChange={status => mark(artifact.id, status)}
            onAddAnnotation={(kind, text, point) => annotate(artifact.id, kind, text, point)}
            onPlaceOnTable={() => place(artifact.id)}
            isOnTable={!!workspace.placements[artifact.id]}
            related={related}
            onOpenRelated={openRelated}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
