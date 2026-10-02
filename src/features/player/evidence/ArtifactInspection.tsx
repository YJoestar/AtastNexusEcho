import { useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { BureauIcons, Waveform } from '@/components/bureau'
import type { EvidenceAnnotation, EvidenceMark, AnnotationKind } from '@/lib/investigationWorkspace'
import { artifactMediaUrl, contentString, visibleArtifactFields, type CaseArtifact } from './types'
import { cn } from '@/lib/utils'

interface ArtifactInspectionProps {
  artifact: CaseArtifact
  mark: EvidenceMark
  annotations: EvidenceAnnotation[]
  onMarkChange: (mark: EvidenceMark) => void
  onAddAnnotation: (kind: AnnotationKind, text: string, point?: { x: number; y: number }) => void
  onPlaceOnTable: () => void
  isOnTable: boolean
  seenFields?: Set<string>
  newKeys?: string[]
  compact?: boolean
}

const MARK_OPTIONS: { value: EvidenceMark; label: string }[] = [
  { value: 'UNMARKED', label: 'UNMARKED' },
  { value: 'REVIEW', label: 'REVIEW' },
  { value: 'IMPORTANT', label: 'IMPORTANT' },
  { value: 'UNRESOLVED', label: 'UNRESOLVED' },
  { value: 'VERIFIED', label: 'VERIFIED' },
  { value: 'CONTRADICTION', label: 'CONTRADICTION' },
]

const NOTE_KINDS: AnnotationKind[] = ['NOTE', 'QUESTION', 'CONTRADICTION', 'REFERENCE']

function displayMark(mark: EvidenceMark) {
  return mark.replace(/_/g, ' ')
}

export function ArtifactInspection({
  artifact,
  mark,
  annotations,
  onMarkChange,
  onAddAnnotation,
  onPlaceOnTable,
  isOnTable,
  newKeys,
  compact = false,
}: ArtifactInspectionProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [markMode, setMarkMode] = useState(false)
  const [noteKind, setNoteKind] = useState<AnnotationKind>('NOTE')
  const [noteDraft, setNoteDraft] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    mode: 'pan' | 'pinch'
    startX: number
    startY: number
    offsetX: number
    offsetY: number
    distance: number
    scale: number
  } | null>(null)
  const moved = useRef(false)

  const imageUrl = artifactMediaUrl(artifact, 'IMAGE')
  const audioUrl = artifactMediaUrl(artifact, 'AUDIO')
  const videoUrl = artifactMediaUrl(artifact, 'VIDEO')
  const isAudio = artifact.type.toUpperCase() === 'AUDIO' || !!audioUrl
  const isVideo = artifact.type.toUpperCase().includes('VIDEO') || artifact.type.toUpperCase().includes('SURVEILLANCE') || !!videoUrl
  const isImage = ['IMAGE', 'PHOTO', 'PHOTOGRAPH'].some(type => artifact.type.toUpperCase().includes(type)) || !!imageUrl
  const fields = visibleArtifactFields(artifact.content)

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
  }

  const changeScale = (delta: number) => {
    setScale(current => Math.max(0.65, Math.min(4, current + delta)))
  }

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    moved.current = false
    if (pointers.current.size === 1) {
      gesture.current = {
        mode: 'pan', startX: event.clientX, startY: event.clientY,
        offsetX: offset.x, offsetY: offset.y, distance: 0, scale,
      }
    } else if (pointers.current.size === 2) {
      const [first, second] = Array.from(pointers.current.values())
      gesture.current = {
        mode: 'pinch', startX: 0, startY: 0,
        offsetX: offset.x, offsetY: offset.y,
        distance: distance(first, second), scale,
      }
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const currentGesture = gesture.current
    if (!currentGesture) return
    if (pointers.current.size >= 2 && currentGesture.mode === 'pinch') {
      const [first, second] = Array.from(pointers.current.values())
      const currentDistance = distance(first, second)
      if (Math.abs(currentDistance - currentGesture.distance) > 2) moved.current = true
      setScale(Math.max(0.65, Math.min(4, currentGesture.scale * currentDistance / Math.max(currentGesture.distance, 1))))
      return
    }
    if (pointers.current.size === 1 && currentGesture.mode === 'pan') {
      const deltaX = event.clientX - currentGesture.startX
      const deltaY = event.clientY - currentGesture.startY
      if (Math.hypot(deltaX, deltaY) > 4) moved.current = true
      setOffset({ x: currentGesture.offsetX + deltaX, y: currentGesture.offsetY + deltaY })
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) {
      gesture.current = null
    } else if (pointers.current.size === 1) {
      const [remaining] = Array.from(pointers.current.values())
      gesture.current = {
        mode: 'pan', startX: remaining.x, startY: remaining.y,
        offsetX: offset.x, offsetY: offset.y, distance: 0, scale,
      }
    }
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    changeScale(event.deltaY < 0 ? 0.12 : -0.12)
  }

  const handleMarkPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!markMode || moved.current || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const contentWidth = Math.max(1, rect.width - 48)
    const contentHeight = Math.max(1, rect.height - 48)
    const localX = event.clientX - rect.left - rect.width / 2 - offset.x
    const localY = event.clientY - rect.top - rect.height / 2 - offset.y
    const radians = -rotation * Math.PI / 180
    const imageX = (localX * Math.cos(radians) - localY * Math.sin(radians)) / scale + contentWidth / 2
    const imageY = (localX * Math.sin(radians) + localY * Math.cos(radians)) / scale + contentHeight / 2
    const x = Math.max(0, Math.min(100, imageX / contentWidth * 100))
    const y = Math.max(0, Math.min(100, imageY / contentHeight * 100))
    onAddAnnotation('MARKER', noteDraft.trim() || 'AREA MARKED FOR REVIEW', { x, y })
    setNoteDraft('')
    setMarkMode(false)
  }

  const contentText = contentString(artifact.content, ['text', 'transcript', 'body', 'document_text', 'description'])

  return (
    <div className={cn('space-y-3', compact && 'text-sm')}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-nexus-borderSubtle py-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => changeScale(-0.2)} className="min-h-10 min-w-10 border border-nexus-border px-2 font-mono text-xs" aria-label="Zoom out">−</button>
          <span className="min-w-12 text-center font-mono text-[0.8125rem] tabular-nums text-nexus-textSubtle">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => changeScale(0.2)} className="min-h-10 min-w-10 border border-nexus-border px-2 font-mono text-xs" aria-label="Zoom in">+</button>
          <button type="button" onClick={resetView} className="min-h-10 border border-nexus-border px-2 font-mono text-[0.75rem] uppercase">FIT</button>
          <button type="button" onClick={() => setRotation(current => (current + 90) % 360)} className="min-h-10 border border-nexus-border px-2 font-mono text-[0.75rem] uppercase" aria-label="Rotate artifact">
            <BureauIcons.RotateCcw className="bureau-icon h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMarkMode(current => !current)} aria-pressed={markMode} className={cn('min-h-10 border px-2 font-mono text-[0.75rem] uppercase', markMode ? 'border-nexus-warning text-nexus-warning' : 'border-nexus-border text-nexus-textMuted')}>
            {markMode ? '[ TAP ARTIFACT TO MARK ]' : '[ MARK AREA ]'}
          </button>
          <button type="button" onClick={onPlaceOnTable} disabled={isOnTable} className="min-h-10 border border-nexus-accent px-2 font-mono text-[0.75rem] uppercase text-nexus-accent disabled:opacity-45">
            {isOnTable ? '[ ON TABLE ]' : '[ PLACE ON TABLE ]'}
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={cn(
          'relative h-[min(52vh,520px)] min-h-[300px] select-none overflow-hidden border border-nexus-border bg-nexus-bg',
          markMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing',
        )}
        role="group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleMarkPoint}
        onDoubleClick={resetView}
        onKeyDown={event => {
          if (event.key === '+' || event.key === '=') changeScale(0.2)
          if (event.key === '-') changeScale(-0.2)
          if (event.key === '0') resetView()
        }}
        tabIndex={0}
        aria-label={`${artifact.type} inspection surface. Drag to pan, use wheel or pinch to zoom.`}
        style={{ touchAction: 'none' }}
      >
        <div
          className="absolute inset-6"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`, transformOrigin: 'center' }}
        >
          {isAudio ? (
            <div className="absolute inset-0 flex flex-col justify-center border border-nexus-border bg-nexus-surfaceElevated p-5" onPointerDown={event => event.stopPropagation()}>
              <p className="mb-2 font-mono text-[0.8125rem] uppercase tracking-[0.16em] text-nexus-textSubtle">ARCHIVAL RECORDING / {artifact.code}</p>
              <Waveform seed={artifact.id} height={92} tone="normal" />
              {audioUrl ? (
                <AudioScrubber key={artifact.id} src={audioUrl} />
              ) : (
                <p className="mt-4 border-l border-nexus-warning pl-3 font-mono text-xs text-nexus-warning">AUDIO SOURCE / NOT ATTACHED</p>
              )}
              {contentText && <p className="mt-4 max-h-32 overflow-auto whitespace-pre-wrap border-t border-nexus-borderSubtle pt-3 text-xs leading-relaxed text-nexus-textMuted">{contentText}</p>}
            </div>
          ) : isImage ? (
            imageUrl ? (
              <img src={imageUrl} alt={artifact.title} draggable={false} loading="lazy" className="absolute inset-0 h-full w-full object-contain bg-black" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center border border-nexus-border bg-nexus-surfaceElevated p-6 text-center">
                <BureauIcons.Image className="bureau-icon mb-4 h-8 w-8 text-nexus-textSubtle" aria-hidden="true" />
                <p className="font-mono text-[0.8125rem] uppercase tracking-[0.16em] text-nexus-warning">IMAGE SOURCE / NOT ATTACHED</p>
                <p className="mt-2 max-w-sm text-sm text-nexus-textMuted">{contentText || artifact.description || 'No image payload is available in this recovered record.'}</p>
              </div>
            )
          ) : isVideo ? (
            videoUrl ? (
              <video src={videoUrl} controls className="absolute inset-0 h-full w-full bg-black object-contain" />
            ) : (
              <div className="absolute inset-0 flex flex-col justify-center border border-nexus-border bg-[#111416] p-5 font-mono">
                <div className="mb-4 flex items-center justify-between border-b border-nexus-border pb-2 text-[0.75rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
                  <span>SURVEILLANCE REVIEW / {artifact.code}</span><span>SOURCE UNAVAILABLE</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-nexus-textMuted">{contentText || artifact.description || 'NO PLAYABLE FOOTAGE ATTACHED TO THIS RECORD.'}</p>
              </div>
            )
          ) : (
            <article className="absolute inset-0 overflow-auto border border-nexus-border bg-[#d4d0c5] p-5 text-[#24231f] shadow-[4px_5px_0_rgba(0,0,0,0.25)]">
              <header className="mb-5 flex items-start justify-between gap-3 border-b border-[#77746c] pb-3">
                <div>
                  <p className="font-mono text-[0.8125rem] uppercase tracking-[0.15em]">NEXUS ECHO / CASE MATERIAL</p>
                  <h3 className="mt-2 font-document text-lg font-semibold">{artifact.title}</h3>
                </div>
                <span className="font-mono text-[0.8125rem]">{artifact.code}</span>
              </header>
              <p className="whitespace-pre-wrap font-document text-sm leading-relaxed">{contentText || artifact.description || 'NO TEXTUAL CONTENT ATTACHED.'}</p>
              {fields.length > 0 && (
                <dl className="mt-5 space-y-2 border-t border-[#77746c] pt-3 font-mono text-[0.8125rem]">
                  {fields.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
                      <dt className="text-[#69665e]">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          )}
          {annotations.filter(annotation => annotation.x !== undefined && annotation.y !== undefined).map((annotation, index) => (
            <span
              key={annotation.id}
              className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-nexus-warning bg-nexus-bg font-mono text-[0.8125rem] font-bold text-nexus-warning"
              style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
              title={annotation.text}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
          {markMode ? 'MARK MODE / TAP DETAIL' : 'DRAG PAN / PINCH OR WHEEL ZOOM / DOUBLE TAP FIT'}
        </div>
      </div>

      {newKeys && newKeys.length > 0 && (
        <div className="border border-nexus-warning/30 bg-nexus-warningBg/10 px-3 py-2 font-mono text-[0.8125rem] uppercase tracking-[0.1em] text-nexus-warning">
          RECORD UPDATED — NEW FIELDS: {newKeys.join(', ').toUpperCase()}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px]">
        <section className="border border-nexus-border bg-nexus-surfaceElevated p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-nexus-text">INVESTIGATOR ANNOTATIONS / {annotations.length.toString().padStart(2, '0')}</h3>
            <select value={noteKind} onChange={event => setNoteKind(event.target.value as AnnotationKind)} className="min-h-9 border border-nexus-border bg-nexus-bg px-2 font-mono text-[0.8125rem] uppercase text-nexus-text" aria-label="Annotation class">
              {NOTE_KINDS.map(kind => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} maxLength={1000} rows={2} placeholder="ADD A PRIVATE CASE NOTE…" className="min-h-12 min-w-0 flex-1 resize-y border border-nexus-border bg-nexus-bg p-2 text-sm text-nexus-text placeholder:text-nexus-textSubtle" />
            <button type="button" disabled={!noteDraft.trim()} onClick={() => { onAddAnnotation(noteKind, noteDraft.trim()); setNoteDraft('') }} className="min-h-12 border border-nexus-accent px-3 font-mono text-[0.8125rem] uppercase text-nexus-accent disabled:opacity-40">FILE NOTE</button>
          </div>
          {annotations.length > 0 && (
            <ol className="mt-3 divide-y divide-nexus-borderSubtle border-t border-nexus-borderSubtle">
              {annotations.map(annotation => (
                <li key={annotation.id} className="grid grid-cols-[90px_1fr] gap-2 py-2 text-xs">
                  <span className="font-mono text-[0.75rem] uppercase text-nexus-warning">{annotation.kind}{annotation.x !== undefined ? ` / ${Math.round(annotation.x)}:${Math.round(annotation.y ?? 0)}` : ''}</span>
                  <span className="whitespace-pre-wrap text-nexus-textMuted">{annotation.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-y border-nexus-borderSubtle py-3 font-mono text-[0.8125rem] lg:grid-cols-1">
          <MetaField label="EVIDENCE ID" value={artifact.code} />
          <MetaField label="TYPE" value={artifact.type} />
          <MetaField label="CASE" value="CURRENT CASE" />
          <MetaField
            label="ACQUIRED"
            value={artifact.acquiredAt ?? 'UNKNOWN'}
            isNew={newKeys?.some(key => ['acquired_at', 'acquiredat', 'timestamp', 'captured_at'].includes(key.toLowerCase()))}
          />
          <MetaField
            label="LOCATION"
            value={artifact.location ?? 'UNKNOWN'}
            isNew={newKeys?.some(key => ['location', 'location_name', 'building'].includes(key.toLowerCase()))}
          />
          <MetaField label="SOURCE" value={artifact.source === 'EVIDENCE' ? 'RECOVERED' : artifact.source} />
          <MetaField label="STATUS" value={displayMark(mark)} />
          <MetaField
            label="DEVICE"
            value={contentString(artifact.content, ['device', 'device_id', 'source_device']) ?? 'UNKNOWN'}
            isNew={newKeys?.some(key => ['device', 'device_id', 'source_device'].includes(key.toLowerCase()))}
          />
          <MetaField
            label="INTEGRITY"
            value={contentString(artifact.content, ['integrity', 'integrity_status']) ?? 'UNVERIFIED'}
            isNew={newKeys?.some(key => ['integrity', 'integrity_status'].includes(key.toLowerCase()))}
          />
        </dl>
      </div>

      <div className="flex flex-wrap gap-1 border-t border-nexus-borderSubtle pt-2" role="group" aria-label="Classify evidence">
        {MARK_OPTIONS.map(option => (
          <button key={option.value} type="button" aria-pressed={mark === option.value} onClick={() => onMarkChange(option.value)} className={cn('min-h-9 border px-2 font-mono text-[0.75rem] uppercase tracking-[0.08em]', mark === option.value ? 'border-nexus-warning bg-nexus-warningBg/20 text-nexus-warning' : 'border-nexus-border text-nexus-textSubtle hover:text-nexus-text')}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MetaField({ label, value, isNew = false }: { label: string; value: string; isNew?: boolean }) {
  return (
    <div>
      <dt className={cn(
        'text-[0.75rem] uppercase tracking-[0.12em] text-nexus-textSubtle',
        isNew && 'text-nexus-warning',
      )}>
        {label}{isNew && ' · NEW'}
      </dt>
      <dd className="mt-0.5 break-words text-[0.8125rem] text-nexus-text">{value}</dd>
    </div>
  )
}

function AudioScrubber({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

  return (
    <div className="mt-4 border-t border-nexus-border pt-3">
      <audio
        ref={audioRef}
        src={src}
        controls
        preload="metadata"
        className="w-full"
        onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)}
      />
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(current, duration)}
        onChange={event => {
          const value = Number(event.target.value)
          if (audioRef.current) audioRef.current.currentTime = value
          setCurrent(value)
        }}
        aria-label="Recording timeline"
        className="mt-2 w-full accent-nexus-accent"
        disabled={!duration}
      />
      <div className="flex justify-between font-mono text-[0.75rem] tabular-nums text-nexus-textSubtle">
        <span>{format(current)}</span><span>{duration ? format(duration) : 'DURATION UNKNOWN'}</span>
      </div>
    </div>
  )
}