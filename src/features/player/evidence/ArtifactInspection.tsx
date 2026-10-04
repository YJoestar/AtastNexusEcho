import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { BureauIcons } from '@/components/bureau'
import type { EvidenceAnnotation, EvidenceMark, AnnotationKind } from '@/lib/investigationWorkspace'
import { artifactCondition, artifactImageUrl, artifactMediaUrl, artifactThumbUrl, artifactType, contentString, visibleArtifactFields, type CaseArtifact } from './types'
import { glitch, glitchForCondition, glitchForMedium } from '@/lib/vfx/glitch'
import { cn } from '@/lib/utils'
import { traceTerms } from '@/lib/evidence/search'
import { showcaseCatalog } from '@/lib/evidence/showcaseCatalog'
import { MediaOverlay, MediaStrip, MediaSurface } from './media/EvidenceRenderer'
import { mediumView } from './media/views'
import { LinkedRecordsList } from './media/shared'
import { seriesContextFor } from './media/seriesContext'
import { useVideoControl } from './media/useVideoControl'
import type { MediaProps } from './media/types'

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
  /** Records this one is linked to, resolved from the catalogue. */
  related?: Array<{ artifact: CaseArtifact; kind: string; note: string }>
  onOpenRelated?: (id: string) => void
  /** Chase a term (a place, a device, a name) through the whole archive. */
  onTrace?: (term: string) => void
  /** Every record in the case, so a frame can find its series and a map its linked records. */
  catalog?: readonly CaseArtifact[]
  isComparing?: boolean
  onToggleCompare?: () => void
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
  related,
  onOpenRelated,
  onTrace,
  catalog: catalogProp,
  isComparing = false,
  onToggleCompare,
}: ArtifactInspectionProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [sharpen, setSharpen] = useState(false)
  const [markMode, setMarkMode] = useState(false)
  const [noteKind, setNoteKind] = useState<AnnotationKind>('NOTE')
  const [noteDraft, setNoteDraft] = useState('')
  const [inkOn, setInkOn] = useState(false)
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

  // Opening a degraded record, or locking onto a camera feed, is the one moment
  // the screen is allowed to react. Side-by-side comparison stays calm.
  useEffect(() => {
    if (compact) return
    const request = glitchForMedium(artifactType(artifact)) ?? glitchForCondition(artifactCondition(artifact))
    if (request) glitch(request)
    // Keyed on identity: re-renders of the same record must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifact.id, compact])

  // Generated media first, then whatever the server put in the record.
  const imageUrl = artifactImageUrl(artifact)
  const thumbUrl = artifactThumbUrl(artifact)
  const audioUrl = artifactMediaUrl(artifact, 'AUDIO')
  const videoUrl = artifactMediaUrl(artifact, 'VIDEO')
  // A real attached recording or video decides the reader; otherwise the record's own medium does.
  const medium = audioUrl ? 'AUDIO' : videoUrl ? 'SURVEILLANCE' : artifactType(artifact)
  const view = mediumView(medium)
  const video = useVideoControl(artifact.id)
  const catalog = useMemo(() => catalogProp ?? showcaseCatalog(), [catalogProp])
  const series = useMemo(
    () => (medium === 'SURVEILLANCE' ? seriesContextFor(artifact, catalog) : null),
    [medium, artifact, catalog],
  )
  const fields = visibleArtifactFields(artifact.content)

  const enhanced = brightness !== 100 || contrast !== 100 || sharpen

  const toggleInk = () => {
    if (inkOn) {
      setInkOn(false)
      setScale(1)
      setOffset({ x: 0, y: 0 })
      setContrast(100)
    } else {
      setInkOn(true)
      setScale(2)
      setOffset({ x: 0, y: 0 })
      setContrast(180)
    }
  }

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
    const contentWidth = Math.max(1, rect.width - view.inset * 2)
    const contentHeight = Math.max(1, rect.height - view.inset * 2)
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
  const mediaProps: MediaProps = {
    artifact,
    medium,
    imageUrl,
    thumbUrl,
    audioUrl,
    videoUrl,
    contentText,
    fields,
    imageStyle: { filter: enhanced ? `brightness(${brightness}%) contrast(${contrast}%)${sharpen ? ' url(#nx-sharpen)' : ''}` : undefined },
    catalog,
    related: related ?? [],
    onOpenRelated,
    series,
    video,
    ink: { on: inkOn, toggle: toggleInk },
  }

  return (
    <div className={cn('space-y-3', compact && 'text-sm')}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-nexus-borderSubtle py-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => changeScale(-0.2)} className="min-h-10 min-w-10 border border-nexus-border px-2 font-mono text-xs" aria-label="Zoom out">−</button>
          <span className="min-w-12 text-center font-mono text-[0.68rem] tabular-nums text-nexus-textSubtle">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => changeScale(0.2)} className="min-h-10 min-w-10 border border-nexus-border px-2 font-mono text-xs" aria-label="Zoom in">+</button>
          <button type="button" onClick={resetView} className="min-h-10 border border-nexus-border px-2 font-mono text-[0.68rem] uppercase">FIT</button>
          <button type="button" onClick={() => setRotation(current => (current + 90) % 360)} className="min-h-10 border border-nexus-border px-2 font-mono text-[0.68rem] uppercase" aria-label="Rotate artifact">
            <BureauIcons.RotateCcw className="bureau-icon h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMarkMode(current => !current)} aria-pressed={markMode} className={cn('min-h-11 border px-3 font-mono text-[0.7rem] uppercase', markMode ? 'border-nexus-warning text-nexus-warning' : 'border-nexus-border text-nexus-textMuted')}>
            {markMode ? 'TAP A DETAIL TO MARK IT' : 'MARK AREA'}
          </button>
        </div>
      </div>

      {imageUrl && medium !== 'AUDIO' && (
        <details className="border border-nexus-borderSubtle bg-nexus-surfaceSubtle px-3 py-2">
          <summary className="min-h-8 cursor-pointer font-mono text-[0.68rem] uppercase tracking-[0.12em] text-nexus-textMuted">
            ENHANCE{enhanced ? ' / ADJUSTED' : ''} — BRIGHTNESS / CONTRAST / SHARPEN (VIEW ONLY, THE RECORD IS NOT CHANGED)
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 font-mono text-[0.68rem] uppercase text-nexus-textSubtle">
              BRIGHTNESS
              <input type="range" min={40} max={220} value={brightness} onChange={event => setBrightness(Number(event.target.value))} aria-label="Brightness" className="flex-1 accent-nexus-accent" />
              <span className="w-10 text-right tabular-nums">{brightness}%</span>
            </label>
            <label className="flex items-center gap-2 font-mono text-[0.68rem] uppercase text-nexus-textSubtle">
              CONTRAST
              <input type="range" min={40} max={260} value={contrast} onChange={event => setContrast(Number(event.target.value))} aria-label="Contrast" className="flex-1 accent-nexus-accent" />
              <span className="w-10 text-right tabular-nums">{contrast}%</span>
            </label>
          </div>
          <div className="mt-2 flex items-center gap-4 font-mono text-[0.68rem] uppercase text-nexus-textSubtle">
            <label className="flex min-h-8 items-center gap-2">
              <input type="checkbox" checked={sharpen} onChange={event => setSharpen(event.target.checked)} /> SHARPEN
            </label>
            <button type="button" onClick={() => { setBrightness(100); setContrast(100); setSharpen(false) }} className="min-h-8 border border-nexus-border px-2">RESET ADJUSTMENTS</button>
          </div>
          <svg width="0" height="0" aria-hidden="true" className="absolute">
            <filter id="nx-sharpen"><feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" preserveAlpha="true" /></filter>
          </svg>
        </details>
      )}

      <div
        ref={stageRef}
        className={cn(
          'relative h-[min(56vh,560px)] min-h-[300px] select-none overflow-hidden border border-nexus-border',
          view.stageClass,
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
          className="absolute"
          style={{ inset: view.inset, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`, transformOrigin: 'center' }}
        >
          <MediaSurface {...mediaProps} />
          {annotations.filter(annotation => annotation.x !== undefined && annotation.y !== undefined).map((annotation, index) => (
            <span
              key={annotation.id}
              className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-nexus-warning bg-nexus-bg font-mono text-[0.68rem] font-bold text-nexus-warning"
              style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
              title={annotation.text}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          ))}
        </div>
        <MediaOverlay {...mediaProps} />
        <div className="pointer-events-none absolute bottom-2 left-2 z-20 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
          {markMode ? 'MARK MODE / TAP DETAIL' : 'DRAG PAN / PINCH OR WHEEL ZOOM / DOUBLE TAP FIT'}
        </div>
      </div>

      <MediaStrip {...mediaProps} />

      {newKeys && newKeys.length > 0 && (
        <div className="border border-nexus-warning/30 bg-nexus-warningBg/10 px-3 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-nexus-warning">
          RECORD UPDATED — NEW FIELDS: {newKeys.join(', ').toUpperCase()}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_250px]">
        <section className="border border-nexus-border bg-nexus-surfaceElevated p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-nexus-text">INVESTIGATOR ANNOTATIONS / {annotations.length.toString().padStart(2, '0')}</h3>
            <select value={noteKind} onChange={event => setNoteKind(event.target.value as AnnotationKind)} className="min-h-9 border border-nexus-border bg-nexus-bg px-2 font-mono text-[0.68rem] uppercase text-nexus-text" aria-label="Annotation class">
              {NOTE_KINDS.map(kind => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} maxLength={1000} rows={2} placeholder="ADD A PRIVATE CASE NOTE…" className="min-h-12 min-w-0 flex-1 resize-y border border-nexus-border bg-nexus-bg p-2 text-sm text-nexus-text placeholder:text-nexus-textSubtle" />
            <button type="button" disabled={!noteDraft.trim()} onClick={() => { onAddAnnotation(noteKind, noteDraft.trim()); setNoteDraft('') }} className="min-h-12 border border-nexus-accent px-3 font-mono text-[0.68rem] uppercase text-nexus-accent disabled:opacity-40">FILE NOTE</button>
          </div>
          {annotations.length > 0 && (
            <ol className="mt-3 divide-y divide-nexus-borderSubtle border-t border-nexus-borderSubtle">
              {annotations.map(annotation => (
                <li key={annotation.id} className="grid grid-cols-[90px_1fr] gap-2 py-2 text-xs">
                  <span className="font-mono text-[0.68rem] uppercase text-nexus-warning">{annotation.kind}{annotation.x !== undefined ? ` / ${Math.round(annotation.x)}:${Math.round(annotation.y ?? 0)}` : ''}</span>
                  <span className="whitespace-pre-wrap text-nexus-textMuted">{annotation.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <details className="border-y border-nexus-borderSubtle">
          <summary className="flex min-h-11 cursor-pointer items-center font-mono text-[0.68rem] uppercase tracking-[0.14em] text-nexus-textMuted">
            RECORD DETAILS — {artifact.code} / {medium} / {artifactCondition(artifact)}
          </summary>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-3 pt-1 font-mono lg:grid-cols-1">
          <MetaField label="EVIDENCE ID" value={artifact.code} />
          <MetaField label="TYPE" value={artifact.type} />
          <MetaField label="CASE" value="CURRENT CASE" />
          <MetaField
            label="ACQUIRED"
            value={artifact.acquiredAt ?? 'UNKNOWN'}
            isNew={newKeys?.some(key => ['acquired_at', 'acquiredat', 'timestamp', 'captured_at'].includes(key.toLowerCase()))}
          />
          <MetaField label="CONDITION" value={artifactCondition(artifact)} />
          {contentString(artifact.content, ['captured_at', 'capturedAt']) && (
            <MetaField label="CAPTURED" value={contentString(artifact.content, ['captured_at', 'capturedAt']) ?? ''} />
          )}
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
        </details>

        {onTrace && traceTerms(artifact).length > 0 && (
          <section aria-label="Trace" className="border-b border-nexus-borderSubtle pb-3">
            <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-nexus-textSubtle">TRACE — SEARCH THE ARCHIVE FOR</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {traceTerms(artifact).map(term => (
                <button
                  key={term}
                  type="button"
                  onClick={() => onTrace(term)}
                  className="min-h-11 border border-nexus-accent/60 px-3 font-mono text-xs uppercase tracking-[0.08em] text-nexus-accent active:bg-nexus-accentBg/20"
                >
                  {term} →
                </button>
              ))}
            </div>
          </section>
        )}

        {!view.ownsLinked && related && related.length > 0 && (
          <LinkedRecordsList records={related} title="LINKED RECORDS" label="Linked records" onOpen={onOpenRelated} />
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-nexus-borderSubtle pt-2" role="group" aria-label="Classify evidence">
        {MARK_OPTIONS.map(option => (
          <button key={option.value} type="button" aria-pressed={mark === option.value} onClick={() => onMarkChange(option.value)} className={cn('min-h-11 border px-3 font-mono text-[0.62rem] uppercase tracking-[0.08em]', mark === option.value ? 'border-nexus-warning bg-nexus-warningBg/20 text-nexus-warning' : 'border-nexus-border text-nexus-textSubtle hover:text-nexus-text')}>
            {option.label}
          </button>
        ))}
      </div>

      {/* Thumb zone: the two things a player does next with a record. */}
      <div className="nx-actionbar" role="group" aria-label="Record actions">
        <button
          type="button"
          onClick={onPlaceOnTable}
          disabled={isOnTable}
          className="nexus-btn nexus-btn-secondary min-h-14 flex-1 text-xs disabled:opacity-50"
        >
          {isOnTable ? 'ON BOARD' : 'ADD TO BOARD'}
        </button>
        {onToggleCompare && (
          <button
            type="button"
            onClick={onToggleCompare}
            aria-pressed={isComparing}
            className={cn('nexus-btn min-h-14 flex-1 text-xs', isComparing ? 'nexus-btn-primary' : 'nexus-btn-secondary')}
          >
            {isComparing ? 'IN COMPARE' : 'COMPARE'}
          </button>
        )}
      </div>
    </div>
  )
}

function MetaField({ label, value, isNew = false }: { label: string; value: string; isNew?: boolean }) {
  return (
    <div>
      <dt className={cn(
        'text-[0.64rem] uppercase tracking-[0.12em] text-nexus-textSubtle',
        isNew && 'text-nexus-warning',
      )}>
        {label}{isNew && ' · NEW'}
      </dt>
      <dd className="mt-0.5 break-words text-[0.82rem] text-nexus-text">{value}</dd>
    </div>
  )
}
