import type { CSSProperties, ReactNode } from 'react'
import { Waveform } from '@/components/bureau'
import { THUMB_SIZE, fragmentClip } from './thumbGeometry'
import {
  artifactCondition,
  artifactImageUrl,
  artifactThumbUrl,
  artifactType,
  contentString,
  type ArtifactType,
  type CaseArtifact,
} from '../types'

const FRAME: Record<ArtifactType, CSSProperties> = {
  PHOTOGRAPH: { background: '#d8d2c2', padding: '3px 3px 9px', boxShadow: '0 1px 2px rgba(0,0,0,.4)' },
  SURVEILLANCE: { background: '#0a0c0b', border: '2px solid #2d302e', borderRadius: 3, padding: 2 },
  DOCUMENT: { background: '#cbc4ae', border: '1px solid #8d866f', boxShadow: '1px 1px 0 #a39c85, 2px 2px 0 #8d866f' },
  NOTE: { background: '#d9cf9a', padding: 2, transform: 'rotate(-1.2deg)', boxShadow: '0 1px 2px rgba(0,0,0,.35)' },
  MAP: { background: '#17222b', border: '1px solid #36505f', padding: 2 },
  PERSONNEL: { background: '#c7c3b4', borderTop: '6px solid #3b4a5d', borderRadius: 2, padding: 2 },
  FRAGMENT: { background: 'transparent' },
  AUDIO: { background: '#131516', border: '1px solid #3a4146', borderRadius: 2, padding: 2 },
}

const IMG_FILTER: Partial<Record<ArtifactType, string>> = {
  SURVEILLANCE: 'grayscale(1) contrast(1.25) brightness(.9)',
  NOTE: 'sepia(.35) contrast(1.05)',
  MAP: 'saturate(.8)',
}

export interface MediumThumbProps {
  artifact: CaseArtifact
  /** `row` is the archive list slot, `card` fills a board card. */
  variant: 'row' | 'card'
  /** Board only: swap in the full image once the board is zoomed in far enough. */
  detail?: boolean
  className?: string
}

/**
 * The record's real thumbnail inside a frame that says what kind of object it
 * is. Always lazy, async-decoded and sized by intrinsic width/height.
 */
export function MediumThumb({ artifact, variant, detail = false, className }: MediumThumbProps) {
  const medium = artifactType(artifact)
  const condition = artifactCondition(artifact)
  const src = detail ? artifactImageUrl(artifact) : artifactThumbUrl(artifact)
  const [w, h] = THUMB_SIZE[medium]
  const portrait = h > w
  const stamp = contentString(artifact.content, ['timestamp', 'recorded_at', 'captured_at', 'time'])
  const camera = contentString(artifact.content, ['camera_id', 'camera', 'cam', 'device'])
  const row = variant === 'row'

  // Slot box. Rows: fixed width per orientation; cards: full width, portrait capped.
  const box: CSSProperties = row
    ? { width: portrait ? '3.6rem' : '5.5rem', aspectRatio: `${w} / ${h}` }
    : portrait
      ? { height: '8.5rem', aspectRatio: `${w} / ${h}`, margin: '0 auto', maxWidth: '100%' }
      : { width: '100%', aspectRatio: `${w} / ${h}` }

  const frame: CSSProperties = {
    ...FRAME[medium],
    ...(medium === 'FRAGMENT' ? { clipPath: fragmentClip(condition), filter: condition === 'BURNED' ? 'brightness(.8) contrast(1.1)' : undefined } : null),
  }

  let inner: ReactNode
  if (src) {
    inner = (
      <img
        src={src}
        alt=""
        width={w}
        height={h}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block h-full w-full object-cover"
        style={{ filter: IMG_FILTER[medium], mixBlendMode: medium === 'NOTE' || medium === 'DOCUMENT' ? 'multiply' : undefined }}
      />
    )
  } else if (medium === 'AUDIO') {
    inner = <Waveform seed={artifact.id} height={row ? 28 : 32} tone="normal" />
  } else {
    inner = (
      <span className="flex h-full w-full items-center justify-center font-mono text-[0.6rem] text-[#6c6759]" aria-hidden="true">
        {medium.slice(0, 4)}
      </span>
    )
  }

  return (
    <span
      className={`relative block shrink-0 ${className ?? ''}`}
      style={{ ...box, ...frame }}
      data-thumb-medium={medium}
      aria-hidden="true"
    >
      <span className="relative block h-full w-full overflow-hidden">
        {inner}
        {medium === 'SURVEILLANCE' && (
          <>
            <span className="pointer-events-none absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px)' }} />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/70 px-1 font-mono text-[0.42rem] leading-4 text-[#cfe0d4]">
              <span className="flex items-center gap-0.5"><span className="inline-block h-1 w-1 rounded-full bg-[#c24b3f]" />{row ? 'REC' : `REC ${camera ?? ''}`}</span>
              {!row && stamp ? <span className="truncate">{stamp}</span> : null}
            </span>
          </>
        )}
        {medium === 'MAP' && (
          <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(140,180,200,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(140,180,200,.18) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
        )}
        {medium === 'AUDIO' && src && (
          <span className="absolute inset-x-0 top-0 bg-black/60 px-1 font-mono text-[0.42rem] leading-3 text-[#b9c4c8]">REC SLIP</span>
        )}
      </span>
      {medium === 'DOCUMENT' && (
        <span className="pointer-events-none absolute right-0 top-0 h-2 w-2" style={{ background: 'linear-gradient(225deg, #7d775f 50%, transparent 50%)' }} />
      )}
      {medium === 'PHOTOGRAPH' && row && (
        <span className="pointer-events-none absolute -top-1 left-1/2 h-1.5 w-5 -translate-x-1/2" style={{ background: 'rgba(214,205,160,.6)', transform: 'translateX(-50%) rotate(-2deg)' }} />
      )}
      {condition !== 'NORMAL' && row && medium !== 'FRAGMENT' && (
        <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: 'var(--nx-warning)', opacity: 0.85 }} />
      )}
    </span>
  )
}
