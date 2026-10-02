import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Waveform } from '@/components/bureau'
import type { BoardPlacement, EvidenceHypothesis, InvestigationWorkspace } from '@/lib/investigationWorkspace'
import { artifactMediaUrl, type CaseArtifact } from './types'

interface InvestigationTableProps {
  artifacts: CaseArtifact[]
  workspace: InvestigationWorkspace
  onUpdate: (update: (current: InvestigationWorkspace) => InvestigationWorkspace) => void
  onInspect: (artifactId: string) => void
}

const BOARD_WIDTH = 1280
const BOARD_HEIGHT = 900

function nextPlacement(count: number, order: number): BoardPlacement {
  const column = count % 4
  const row = Math.floor(count / 4) % 4
  return {
    x: 17 + column * 22 + (row % 2) * 3,
    y: 19 + row * 21 + (column % 2) * 2,
    rotation: column % 2 === 0 ? -1.5 : 1.25,
    order,
    pinned: false,
  }
}

export function InvestigationTable({ artifacts, workspace, onUpdate, onInspect }: InvestigationTableProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const dragId = useRef<string | null>(null)
  const previewRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const [scale, setScale] = useState(0.8)
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [hypothesisNote, setHypothesisNote] = useState('')
  const [placeCode, setPlaceCode] = useState('')

  const artifactById = useMemo(() => new Map(artifacts.map(artifact => [artifact.id, artifact])), [artifacts])
  const placed = useMemo(() => Object.entries(workspace.placements)
    .map(([id, position]) => ({ artifact: artifactById.get(id), id, position }))
    .filter((entry): entry is { artifact: CaseArtifact; id: string; position: BoardPlacement } => !!entry.artifact),
  [artifactById, workspace.placements])
  const unplaced = artifacts.filter(artifact => !workspace.placements[artifact.id])

  const placeArtifact = (id: string) => {
    const order = Math.max(0, ...Object.values(workspace.placements).map(placement => placement.order)) + 1
    onUpdate(current => ({
      ...current,
      placements: {
        ...current.placements,
        [id]: nextPlacement(Object.keys(current.placements).length, order),
      },
    }))
    setPlaceCode('')
  }

  const moveArtifact = (id: string, x: number, y: number) => {
    const position = { id, x, y }
    previewRef.current = position
    setPreview(position)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>, id: string, pinned: boolean) => {
    if (pinned || (event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragId.current = id
    setSelected(current => current.includes(id) ? current : [...current.slice(-1), id])
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragId.current || !boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = Math.max(4, Math.min(96, (event.clientX - rect.left) / rect.width * 100))
    const y = Math.max(5, Math.min(95, (event.clientY - rect.top) / rect.height * 100))
    moveArtifact(dragId.current, x, y)
  }

  const handlePointerUp = () => {
    if (!dragId.current) return
    const id = dragId.current
    dragId.current = null
    const finalPosition = previewRef.current
    previewRef.current = null
    setPreview(null)
    if (finalPosition?.id === id) {
      onUpdate(workspaceCurrent => ({
        ...workspaceCurrent,
        placements: {
          ...workspaceCurrent.placements,
          [id]: { ...workspaceCurrent.placements[id], x: finalPosition.x, y: finalPosition.y },
        },
      }))
    }
  }

  const togglePin = (id: string) => onUpdate(current => ({
    ...current,
    placements: {
      ...current.placements,
      [id]: { ...current.placements[id], pinned: !current.placements[id]?.pinned },
    },
  }))

  const rotate = (id: string) => onUpdate(current => ({
    ...current,
    placements: {
      ...current.placements,
      [id]: { ...current.placements[id], rotation: ((current.placements[id]?.rotation ?? 0) + 3) % 360 },
    },
  }))

  const removeFromTable = (id: string) => {
    onUpdate(current => {
      const placements = { ...current.placements }
      delete placements[id]
      return { ...current, placements }
    })
    setSelected(current => current.filter(item => item !== id))
  }

  const toggleSelected = (id: string) => setSelected(current =>
    current.includes(id) ? current.filter(item => item !== id) : [...current.slice(-1), id],
  )

  const addHypothesis = () => {
    if (selected.length !== 2) return
    const hypothesis: EvidenceHypothesis = {
      id: crypto.randomUUID(),
      from: selected[0],
      to: selected[1],
      note: hypothesisNote.trim() || 'UNRESOLVED RELATIONSHIP',
      createdAt: new Date().toISOString(),
    }
    onUpdate(current => ({ ...current, hypotheses: [...current.hypotheses, hypothesis] }))
    setSelected([])
    setHypothesisNote('')
  }

  const getPosition = (id: string, position: BoardPlacement) =>
    preview?.id === id ? { ...position, x: preview.x, y: preview.y } : position

  return (
    <section className="space-y-3" aria-label="Persistent investigation table">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-nexus-border pb-2">
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-nexus-text">INVESTIGATION TABLE</h2>
          <p className="mt-1 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            {placed.length.toString().padStart(2, '0')} PLACED / {artifacts.length.toString().padStart(2, '0')} CASE OBJECTS / POSITIONS SAVED ON THIS DEVICE
          </p>
        </div>
        <label className="flex items-center gap-2 font-mono text-[0.75rem] uppercase text-nexus-textSubtle">
          SCALE
          <input type="range" min="0.55" max="1" step="0.05" value={scale} onChange={event => setScale(Number(event.target.value))} aria-label="Investigation table scale" />
          <span className="w-8 text-right tabular-nums">{Math.round(scale * 100)}%</span>
        </label>
      </header>

      {unplaced.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-nexus-borderSubtle pb-3">
          <label htmlFor="table-artifact" className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-nexus-textSubtle">ADD RECOVERED OBJECT</label>
          <select id="table-artifact" value={placeCode} onChange={event => setPlaceCode(event.target.value)} className="min-h-10 min-w-0 flex-1 border border-nexus-border bg-nexus-bg px-2 font-mono text-xs text-nexus-text">
            <option value="">SELECT FROM CASE ARCHIVE</option>
            {unplaced.map(artifact => <option key={artifact.id} value={artifact.id}>{artifact.code} / {artifact.title}</option>)}
          </select>
          <button type="button" disabled={!placeCode} onClick={() => placeArtifact(placeCode)} className="min-h-10 border border-nexus-accent px-3 font-mono text-[0.8125rem] uppercase text-nexus-accent disabled:opacity-40">[ PLACE ]</button>
        </div>
      )}

      <div className="border border-nexus-border bg-[#22221f] p-2">
        <div className="max-h-[68vh] overflow-auto overscroll-contain" aria-label="Scrollable evidence table">
          <div
            ref={boardRef}
            className="relative overflow-hidden border border-[#5d5a50] bg-[#35342e]"
            style={{ width: `${BOARD_WIDTH * scale}px`, height: `${BOARD_HEIGHT * scale}px`, minWidth: `${Math.min(BOARD_WIDTH * scale, 100)}px` }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 31px, rgba(207,197,164,0.18) 32px)' }} />
            <div className="pointer-events-none absolute left-4 top-3 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-[#b5ae96]">CASE 037 / WORK SURFACE / PRIVATE HYPOTHESES</div>

            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {workspace.hypotheses.map(hypothesis => {
                const from = workspace.placements[hypothesis.from]
                const to = workspace.placements[hypothesis.to]
                if (!from || !to) return null
                return (
                  <g key={hypothesis.id}>
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(211,184,123,.8)" strokeWidth="0.22" strokeDasharray="0.8 0.5" />
                    <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="0.7" fill="#d3b87b" />
                  </g>
                )
              })}
            </svg>

            {placed.map(({ artifact, id, position }) => {
              const current = getPosition(id, position)
              const imageUrl = artifactMediaUrl(artifact, 'IMAGE')
              const isSelected = selected.includes(id)
              const hasNewInfo = workspace.revelations[id]?.hasNewInfo ?? false
              return (
                <article
                  key={id}
                  onPointerDown={event => handlePointerDown(event, id, current.pinned)}
                  onLostPointerCapture={handlePointerUp}
                  className={`absolute w-[210px] touch-none border p-2 shadow-[4px_5px_7px_rgba(0,0,0,0.28)] ${artifact.type.toUpperCase().includes('IMAGE') || artifact.type.toUpperCase().includes('PHOTO') ? 'border-[#b8b1a0] bg-[#d0cabc] text-[#282720]' : 'border-nexus-border bg-nexus-surface text-nexus-text'} ${isSelected ? 'outline outline-1 outline-nexus-warning' : ''} ${current.pinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                  style={{ left: `${current.x}%`, top: `${current.y}%`, zIndex: current.order, transform: `translate(-50%, -50%) rotate(${current.rotation}deg)` }}
                  aria-label={`Table artifact ${artifact.code}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => toggleSelected(id)} className="min-w-0 flex-1 text-left" aria-pressed={isSelected}>
                      <span className="block font-mono text-[0.75rem] uppercase tracking-[0.14em] opacity-70">{artifact.type} / {artifact.code}</span>
                      <span className="mt-1 block break-words font-document text-sm font-semibold">{artifact.title}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {hasNewInfo && <span className="font-mono text-[0.75rem] uppercase text-nexus-warning">NEW</span>}
                      <button type="button" onClick={() => togglePin(id)} className="min-h-8 min-w-8 border border-current/30 p-1" aria-label={current.pinned ? `Unpin ${artifact.code}` : `Pin ${artifact.code}`} aria-pressed={current.pinned} title={current.pinned ? 'UNPIN' : 'PIN'}>
                        <span className="font-mono text-[0.75rem] uppercase">{current.pinned ? 'FIXED' : 'PIN'}</span>
                      </button>
                    </div>
                  </div>
                  {imageUrl ? (
                    <img src={imageUrl} alt="" loading="lazy" draggable={false} className="mt-2 max-h-24 w-full object-cover" />
                  ) : artifact.type.toUpperCase() === 'AUDIO' ? (
                    <Waveform seed={artifact.id} height={32} tone="normal" />
                  ) : (
                    <p className="mt-2 line-clamp-3 font-document text-[0.875rem] leading-relaxed opacity-75">{artifact.description || artifact.code}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-1 border-t border-current/20 pt-1">
                    <button type="button" onClick={() => onInspect(id)} className="min-h-8 px-1 font-mono text-[0.75rem] uppercase">OPEN</button>
                    <button type="button" onClick={() => rotate(id)} className="min-h-8 px-1 font-mono text-[0.75rem] uppercase" aria-label={`Rotate ${artifact.code}`}>ROTATE</button>
                    <button type="button" onClick={() => removeFromTable(id)} className="min-h-8 px-1 font-mono text-[0.75rem] uppercase text-nexus-warning">REMOVE</button>
                  </div>
                </article>
              )
            })}

            {placed.length === 0 && (
              <div className="absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 border-l border-[#b5ae96] pl-4 font-mono">
                <p className="text-[0.8125rem] uppercase tracking-[0.16em] text-[#d3b87b]">TABLE / UNSET</p>
                <p className="mt-2 text-xs text-[#c0bcaf]">No objects placed. The archive remains intact.</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 flex justify-between gap-2 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[#b5ae96]">
          <span>DRAG TO ARRANGE / REMOVE NEVER DELETES CASE EVIDENCE</span>
          <span>{placed.length.toString().padStart(2, '0')} OBJECTS ON SURFACE</span>
        </div>
      </div>

      {selected.length === 2 && (
        <section className="grid gap-2 border-y border-nexus-borderSubtle py-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block font-mono text-[0.75rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            PLAYER HYPOTHESIS / {selected.map(id => artifactById.get(id)?.code ?? id).join(' ↔ ')}
            <input value={hypothesisNote} onChange={event => setHypothesisNote(event.target.value)} maxLength={300} placeholder="RECORD A SUSPECTED RELATION…" className="mt-1 min-h-10 w-full border border-nexus-border bg-nexus-bg px-2 font-sans text-sm normal-case tracking-normal text-nexus-text" />
          </label>
          <button type="button" onClick={addHypothesis} className="min-h-10 border border-nexus-warning px-3 font-mono text-[0.8125rem] uppercase text-nexus-warning">[ FILE UNVERIFIED LINK ]</button>
        </section>
      )}

      {workspace.hypotheses.length > 0 && (
        <section className="border-t border-nexus-borderSubtle pt-2">
          <h3 className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-nexus-textSubtle">PLAYER-FILED HYPOTHESES / NOT SYSTEM-VERIFIED</h3>
          <ul className="mt-1 divide-y divide-nexus-borderSubtle">
            {workspace.hypotheses.map(hypothesis => (
              <li key={hypothesis.id} className="grid grid-cols-[1fr_auto] gap-2 py-2 font-mono text-[0.8125rem]">
                <span className="min-w-0 text-nexus-textMuted">
                  <b className="text-nexus-text">{artifactById.get(hypothesis.from)?.code ?? hypothesis.from} ↔ {artifactById.get(hypothesis.to)?.code ?? hypothesis.to}</b>
                  <span className="ml-2">{hypothesis.note}</span>
                </span>
                <button type="button" onClick={() => onUpdate(current => ({ ...current, hypotheses: current.hypotheses.filter(entry => entry.id !== hypothesis.id) }))} className="min-h-8 px-2 text-[0.75rem] uppercase text-nexus-textSubtle hover:text-nexus-warning">REMOVE LINK</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}