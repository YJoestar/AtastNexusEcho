import { memo, type PointerEvent as ReactPointerEvent } from 'react'
import { Waveform } from '@/components/bureau'
import type { BoardPlacement } from '@/lib/investigationWorkspace'
import {
  artifactCondition,
  artifactImageUrl,
  artifactThumbUrl,
  artifactType,
  contentString,
  type CaseArtifact,
} from '../types'

export interface BoardCardProps {
  artifact: CaseArtifact
  placement: BoardPlacement
  /** World-space centre, already converted from the stored percentage. */
  worldX: number
  worldY: number
  selectedIndex: number
  dim: boolean
  dragging: boolean
  hasNewInfo: boolean
  noteCount: number
  linkCount: number
  /** Zoomed in far enough that the 220px thumbnail would be soft. */
  detail: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, id: string, pinned: boolean) => void
  onToggleSelect: (id: string) => void
  onOpen: (id: string) => void
  onTogglePin: (id: string) => void
  onRotate: (id: string) => void
  onRemove: (id: string) => void
}

const MEDIUM_LABEL: Record<string, string> = {
  PHOTOGRAPH: 'PHOTO',
  SURVEILLANCE: 'CCTV',
  DOCUMENT: 'DOC',
  NOTE: 'NOTE',
  AUDIO: 'REC',
  MAP: 'MAP',
  PERSONNEL: 'PERS',
  FRAGMENT: 'FRAG',
}

function BoardCardImpl(props: BoardCardProps) {
  const {
    artifact, placement, worldX, worldY, selectedIndex, dim, dragging,
    hasNewInfo, noteCount, linkCount, detail,
    onPointerDown, onToggleSelect, onOpen, onTogglePin, onRotate, onRemove,
  } = props
  const medium = artifactType(artifact)
  const condition = artifactCondition(artifact)
  const imageUrl = detail ? artifactImageUrl(artifact) : artifactThumbUrl(artifact)
  const isSelected = selectedIndex >= 0
  const camera = contentString(artifact.content, ['camera_id', 'camera', 'cam'])
  const stamp = contentString(artifact.content, ['timestamp', 'recorded_at', 'time'])

  return (
    <article
      className="nx-card"
      data-medium={medium}
      data-condition={condition}
      data-pinned={placement.pinned}
      data-selected={isSelected}
      data-dim={dim}
      data-dragging={dragging}
      data-card-id={artifact.id}
      aria-label={`Table artifact ${artifact.code}`}
      tabIndex={0}
      onDoubleClick={event => { if (!(event.target as HTMLElement).closest('button')) onOpen(artifact.id) }}
      onPointerDown={event => onPointerDown(event, artifact.id, placement.pinned)}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter') { event.preventDefault(); onOpen(artifact.id) }
        if (event.key === ' ') { event.preventDefault(); onToggleSelect(artifact.id) }
      }}
      style={{
        left: worldX,
        top: worldY,
        zIndex: dragging ? 100000 : placement.order,
        transform: `translate(-50%, -50%) rotate(${placement.pinned ? placement.rotation * 0.4 : placement.rotation}deg)`,
      }}
    >
      {placement.pinned ? <span className="nx-pin" aria-hidden="true" /> : medium === 'PHOTOGRAPH' || medium === 'NOTE' ? <span className="nx-tape" aria-hidden="true" /> : null}

      {isSelected && (
        <span
          className="absolute -left-2 -top-2 z-[3] flex h-5 min-w-5 items-center justify-center border border-[#d3b87b] bg-[#1b1912] px-1 font-mono text-[0.55rem] font-bold text-[#d3b87b]"
          aria-label={`Selection order ${selectedIndex + 1}`}
        >
          {selectedIndex + 1}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          data-drag-handle
          // Pointer taps are resolved by the board (a press that moves is a drag,
          // one that does not is a selection). Keyboard activation has detail 0.
          onClick={event => { if (event.detail === 0) onToggleSelect(artifact.id) }}
          className="min-w-0 flex-1 text-left"
          aria-pressed={isSelected}
        >
          <span className="block font-mono text-[0.5rem] uppercase tracking-[0.14em] opacity-70">
            {MEDIUM_LABEL[medium] ?? medium} / {artifact.code}
          </span>
          <span className="mt-0.5 block break-words font-type text-[0.82rem] font-bold leading-tight">{artifact.title}</span>
        </button>
        <div className="flex items-center gap-1">
          {hasNewInfo && <span className="font-mono text-[0.45rem] font-bold uppercase text-[#d3b87b]">NEW</span>}
          <button
            type="button"
            onClick={() => onTogglePin(artifact.id)}
            className="min-h-8 min-w-8 border border-current/30 p-1"
            aria-label={placement.pinned ? `Unpin ${artifact.code}` : `Pin ${artifact.code}`}
            aria-pressed={placement.pinned}
            title={placement.pinned ? 'UNPIN' : 'PIN'}
          >
            <span className="font-mono text-[0.45rem] uppercase">{placement.pinned ? 'FIXED' : 'PIN'}</span>
          </button>
        </div>
      </div>

      <div className="nx-card-media relative mt-2">
        {imageUrl ? (
          <div className={medium === 'SURVEILLANCE' ? 'nx-card-scan relative' : 'relative'}>
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className={`h-24 w-full object-cover ${medium === 'SURVEILLANCE' ? 'grayscale contrast-125 brightness-90' : ''}`}
            />
            {medium === 'SURVEILLANCE' && (
              <span className="absolute left-1 top-1 flex items-center gap-1 font-mono text-[0.45rem] text-[#e8e2d0]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c24b3f]" aria-hidden="true" />
                REC {camera ?? ''}
              </span>
            )}
            {medium === 'SURVEILLANCE' && stamp && (
              <span className="absolute bottom-1 right-1 font-mono text-[0.45rem] text-[#e8e2d0]">{stamp}</span>
            )}
          </div>
        ) : medium === 'AUDIO' ? (
          <Waveform seed={artifact.id} height={32} tone="normal" />
        ) : (
          <p className="line-clamp-3 font-type text-[0.68rem] leading-relaxed opacity-80">{artifact.description || artifact.code}</p>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[0.45rem] uppercase tracking-[0.1em] opacity-75">
        <span>COND: {condition}</span>
        <span>
          {noteCount > 0 && <span>NOTES {noteCount}</span>}
          {noteCount > 0 && linkCount > 0 && ' / '}
          {linkCount > 0 && <span>LINKS {linkCount}</span>}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-1 border-t border-current/20 pt-1">
        <button type="button" onClick={() => onOpen(artifact.id)} className="min-h-8 px-1 font-mono text-[0.48rem] uppercase">OPEN</button>
        <button type="button" onClick={() => onRotate(artifact.id)} className="min-h-8 px-1 font-mono text-[0.48rem] uppercase" aria-label={`Rotate ${artifact.code}`}>ROTATE</button>
        <button type="button" onClick={() => onRemove(artifact.id)} className="min-h-8 px-1 font-mono text-[0.48rem] uppercase" aria-label={`Remove ${artifact.code} from table`}>REMOVE</button>
      </div>
    </article>
  )
}

export const BoardCard = memo(BoardCardImpl)
