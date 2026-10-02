import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEFAULT_CAMERA,
  clampCamera,
  contentBounds,
  fitCamera,
  focusCamera,
  freeSlot,
  gridSlots,
  percentToWorld,
  pinchCamera,
  screenToWorld,
  worldToPercent,
  zoomAt,
  type Camera,
  type Point,
  type Size,
} from '@/lib/boardGeometry'
import {
  addAnnotation,
  addLinks,
  deleteAnnotation,
  editAnnotation,
  findLink,
  isLinkLive,
  linkAnnotationKey,
  pruneWorkspace,
  removeLink,
  updateLink,
  type AnnotationKind,
  type BoardPlacement,
  type InvestigationWorkspace,
  type LinkKind,
} from '@/lib/investigationWorkspace'
import { artifactType, type CaseArtifact } from './types'
import { BoardCard } from './board/BoardCard'
import { BoardLinks } from './board/BoardLinks'
import { BoardInspector } from './board/BoardInspector'

interface InvestigationTableProps {
  artifacts: CaseArtifact[]
  workspace: InvestigationWorkspace
  onUpdate: (update: (current: InvestigationWorkspace) => InvestigationWorkspace) => void
  onInspect: (artifactId: string) => void
}

interface UndoEntry {
  label: string
  undo: () => void
}

const TAP_SLOP = 5
const PAN_STEP = 80
const TYPE_FILTERS = ['ALL', 'PHOTOGRAPH', 'SURVEILLANCE', 'DOCUMENT', 'NOTE', 'AUDIO', 'MAP', 'PERSONNEL', 'FRAGMENT'] as const

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function nextOrder(workspace: InvestigationWorkspace): number {
  return Math.max(0, ...Object.values(workspace.placements).map(placement => placement.order)) + 1
}

export function InvestigationTable({ artifacts, workspace, onUpdate, onInspect }: InvestigationTableProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const inspectorRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [wide, setWide] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(() => Object.keys(workspace.placements).length === 0)

  const cameraRef = useRef<Camera>(workspace.view ?? DEFAULT_CAMERA)
  const viewportRef = useRef<Size>({ width: 0, height: 0 })
  const initialisedRef = useRef(false)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workspaceRef = useRef(workspace)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    workspaceRef.current = workspace
    onUpdateRef.current = onUpdate
  })

  const pointers = useRef(new Map<number, Point>())
  const pan = useRef<{ start: Point; camera: Camera; moved: boolean } | null>(null)
  const pinch = useRef<{ camera: Camera; from: [Point, Point] } | null>(null)
  const drag = useRef<{
    id: string
    pointerId: number
    startClient: Point
    originWorld: Point
    moved: boolean
  } | null>(null)
  const previewRef = useRef<{ id: string; x: number; y: number } | null>(null)

  const [zoomLabel, setZoomLabel] = useState(Math.round(cameraRef.current.zoom * 100))
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null)
  const [panning, setPanning] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)
  const [freshLinkId, setFreshLinkId] = useState<string | null>(null)
  const [placeCode, setPlaceCode] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('ALL')
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null)
  const [announce, setAnnounce] = useState('')

  const artifactById = useMemo(() => new Map(artifacts.map(artifact => [artifact.id, artifact])), [artifacts])
  const placed = useMemo(() => Object.entries(workspace.placements)
    .map(([id, position]) => ({ artifact: artifactById.get(id), id, position }))
    .filter((entry): entry is { artifact: CaseArtifact; id: string; position: BoardPlacement } => !!entry.artifact),
  [artifactById, workspace.placements])
  const unplaced = artifacts.filter(artifact => !workspace.placements[artifact.id])

  // A link is live when both objects are on the table AND still in the case file.
  const liveLinks = useMemo(() => workspace.hypotheses.filter(link =>
    isLinkLive(link, workspace) && artifactById.has(link.from) && artifactById.has(link.to)),
  [workspace, artifactById])
  const dormantLinks = useMemo(() => workspace.hypotheses.filter(link =>
    artifactById.has(link.from) && artifactById.has(link.to) && !isLinkLive(link, workspace)),
  [workspace, artifactById])
  const staleCount = workspace.hypotheses.length - liveLinks.length - dormantLinks.length

  const linkCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const link of liveLinks) {
      counts.set(link.from, (counts.get(link.from) ?? 0) + 1)
      counts.set(link.to, (counts.get(link.to) ?? 0) + 1)
    }
    return counts
  }, [liveLinks])

  const matches = useCallback((artifact: CaseArtifact) => {
    if (typeFilter !== 'ALL' && artifactType(artifact) !== typeFilter) return false
    const query = search.trim().toLowerCase()
    if (!query) return true
    const notes = (workspace.annotations[artifact.id] ?? []).map(note => note.text).join(' ')
    return `${artifact.code} ${artifact.title} ${artifact.description} ${artifact.location ?? ''} ${notes}`
      .toLowerCase().includes(query)
  }, [search, typeFilter, workspace.annotations])
  const filtering = search.trim() !== '' || typeFilter !== 'ALL'
  const matchCount = placed.filter(entry => matches(entry.artifact)).length

  const selectedLink = selectedLinkId ? workspace.hypotheses.find(link => link.id === selectedLinkId) ?? null : null
  const selectedArtifacts = selected
    .map(id => artifactById.get(id))
    .filter((artifact): artifact is CaseArtifact => !!artifact)

  /* ───────────────────────────── camera ───────────────────────────── */

  const persistCamera = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const view = cameraRef.current
      onUpdateRef.current(current => ({ ...current, view: { x: view.x, y: view.y, zoom: view.zoom } }))
    }, 500)
  }, [])

  useEffect(() => () => { if (persistTimer.current) clearTimeout(persistTimer.current) }, [])

  const applyCamera = useCallback((next: Camera, persist = true) => {
    const viewport = viewportRef.current
    const camera = viewport.width > 0 ? clampCamera(next, viewport) : next
    cameraRef.current = camera
    if (worldRef.current) {
      worldRef.current.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`
    }
    const label = Math.round(camera.zoom * 100)
    setZoomLabel(current => (current === label ? current : label))
    if (persist) persistCamera()
  }, [persistCamera])

  useLayoutEffect(() => {
    applyCamera(cameraRef.current, false)
  }, [applyCamera])

  const fit = useCallback(() => {
    const bounds = contentBounds(Object.values(workspaceRef.current.placements))
    applyCamera(fitCamera(bounds, viewportRef.current))
  }, [applyCamera])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const measure = () => {
      const rect = surface.getBoundingClientRect()
      viewportRef.current = { width: rect.width, height: rect.height }
      if (rect.width > 0 && !initialisedRef.current) {
        initialisedRef.current = true
        if (workspaceRef.current.view) applyCamera(workspaceRef.current.view, false)
        else if (Object.keys(workspaceRef.current.placements).length > 0) {
          applyCamera(fitCamera(contentBounds(Object.values(workspaceRef.current.placements)), viewportRef.current), false)
        }
      } else if (rect.width > 0) {
        applyCamera(cameraRef.current, false)
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(surface)
    return () => observer.disconnect()
  }, [applyCamera])

  // Layout follows the room the table actually has, not the window: the
  // simulator embeds this screen in a narrow frame on a wide monitor.
  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0
      setWide(current => (current === width >= 900 ? current : width >= 900))
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Wheel: ctrl/pinch-on-trackpad and a physical wheel zoom; two-finger scroll pans.
  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = surface.getBoundingClientRect()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      const physicalWheel = event.deltaMode !== 0 || (event.deltaX === 0 && Math.abs(event.deltaY) >= 50)
      if (event.ctrlKey || physicalWheel) {
        const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0016))
        applyCamera(zoomAt(cameraRef.current, factor, anchor))
      } else {
        const camera = cameraRef.current
        applyCamera({ ...camera, x: camera.x - event.deltaX, y: camera.y - event.deltaY })
      }
    }
    surface.addEventListener('wheel', onWheel, { passive: false })
    return () => surface.removeEventListener('wheel', onWheel)
  }, [applyCamera])

  const zoomBy = useCallback((factor: number) => {
    const { width, height } = viewportRef.current
    applyCamera(zoomAt(cameraRef.current, factor, { x: width / 2, y: height / 2 }))
  }, [applyCamera])

  const focusArtifact = useCallback((id: string) => {
    const placement = workspaceRef.current.placements[id]
    if (!placement) return
    applyCamera(focusCamera(cameraRef.current, percentToWorld(placement.x, placement.y), viewportRef.current))
  }, [applyCamera])

  /* ─────────────────────────── board mutations ─────────────────────────── */

  const update = useCallback((fn: (current: InvestigationWorkspace) => InvestigationWorkspace) => {
    onUpdateRef.current(fn)
  }, [])

  const remember = useCallback((label: string, undo: () => void) => {
    setUndoEntry({ label, undo })
    setAnnounce(label)
  }, [])

  useEffect(() => {
    if (!undoEntry) return
    const timer = setTimeout(() => setUndoEntry(null), 10000)
    return () => clearTimeout(timer)
  }, [undoEntry])

  useEffect(() => {
    if (!freshLinkId) return
    const timer = setTimeout(() => setFreshLinkId(null), 700)
    return () => clearTimeout(timer)
  }, [freshLinkId])

  const viewCentre = useCallback((): Point => {
    const { width, height } = viewportRef.current
    return screenToWorld(cameraRef.current, { x: width / 2 || 400, y: height / 2 || 300 })
  }, [])

  const placeArtifacts = useCallback((ids: string[]) => {
    const centre = viewCentre()
    update(current => {
      const fresh = ids.filter(id => !current.placements[id])
      const slots = gridSlots(fresh.length, centre, fresh.length === 1 ? 1 : undefined)
      const occupied = Object.values(current.placements)
      const placements = { ...current.placements }
      let order = nextOrder(current)
      fresh.forEach((id, index) => {
        const slot = slots[index]
        // A single object lands at the centre of what the player is looking at.
        const spot = fresh.length === 1 ? freeSlot(centre, occupied) : slot
        placements[id] = { x: spot.x, y: spot.y, rotation: index % 2 === 0 ? -1.5 : 1.25, order: order++, pinned: false }
      })
      return { ...current, placements }
    })
    setPlaceCode('')
  }, [update, viewCentre])

  const togglePin = useCallback((id: string) => update(current => ({
    ...current,
    placements: { ...current.placements, [id]: { ...current.placements[id], pinned: !current.placements[id]?.pinned } },
  })), [update])

  const rotate = useCallback((id: string) => update(current => {
    const rotation = current.placements[id]?.rotation ?? 0
    return {
      ...current,
      placements: { ...current.placements, [id]: { ...current.placements[id], rotation: rotation + 3 > 12 ? -12 : rotation + 3 } },
    }
  }), [update])

  const removeFromTable = useCallback((id: string) => {
    const previous = workspaceRef.current.placements[id]
    if (!previous) return
    update(current => {
      const placements = { ...current.placements }
      delete placements[id]
      return { ...current, placements }
    })
    setSelected(current => current.filter(item => item !== id))
    remember('OBJECT REMOVED FROM TABLE / ARCHIVE INTACT', () => update(current => ({
      ...current,
      placements: { ...current.placements, [id]: previous },
    })))
  }, [remember, update])

  const toggleSelected = useCallback((id: string) => {
    setSelectedLinkId(null)
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }, [])

  const createLink = useCallback((kind: LinkKind, note: string) => {
    const ids = selected
    if (ids.length < 2) return
    // Ids are minted up front: the update below may run more than once.
    const linkIds = ids.slice(1).map(() => newId())
    const isNew = !!ids.slice(1).find(other => !findLink(workspaceRef.current, ids[0], other))
    update(current => addLinks(current, ids, kind, note, index => linkIds[index]))
    setSelected([])
    if (isNew) {
      setFreshLinkId(linkIds[0])
      setAnnounce(`${kind} link filed`)
    } else {
      setAnnounce('Those objects are already linked')
    }
  }, [selected, update])

  const removeLinkWithUndo = useCallback((linkId: string) => {
    const link = workspaceRef.current.hypotheses.find(entry => entry.id === linkId)
    if (!link) return
    const key = linkAnnotationKey(linkId)
    const notes = workspaceRef.current.annotations[key]
    update(current => removeLink(current, linkId))
    setSelectedLinkId(null)
    remember('RELATIONSHIP DISCONNECTED', () => update(current => ({
      ...current,
      hypotheses: [...current.hypotheses, link],
      annotations: notes ? { ...current.annotations, [key]: notes } : current.annotations,
    })))
  }, [remember, update])

  /* ───────────────────────────── gestures ───────────────────────────── */

  const relative = (event: { clientX: number; clientY: number }): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  const capture = (pointerId: number) => {
    try { surfaceRef.current?.setPointerCapture(pointerId) } catch { /* pointer already gone */ }
  }

  const handleCardPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>, id: string, pinned: boolean) => {
    const control = (event.target as HTMLElement).closest('button')
    if (control && !control.hasAttribute('data-drag-handle')) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (pointers.current.size > 1) return
    const placement = workspaceRef.current.placements[id]
    if (!placement) return
    drag.current = {
      id,
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      originWorld: percentToWorld(placement.x, placement.y),
      moved: false,
    }
    if (pinned) drag.current.moved = false
    event.stopPropagation()
  }, [])

  // Capture phase: every finger counts, wherever it lands — even on a card
  // button — so a second touch always turns the gesture into a pinch.
  const handleSurfaceDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') pointers.current.clear()
    pointers.current.set(event.pointerId, relative(event))
    if (pointers.current.size === 2) {
      drag.current = null
      previewRef.current = null
      setPreview(null)
      pan.current = null
      const [a, b] = Array.from(pointers.current.values())
      pinch.current = { camera: cameraRef.current, from: [a, b] }
      setPanning(true)
    }
  }

  const handleSurfaceDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Controls on a card or a link are plain buttons: they must not start a pan,
    // and a tap on one must not look like a tap on bare table.
    if ((event.target as HTMLElement).closest('button, [data-link-id]')) return
    if (pinch.current || drag.current || pointers.current.size !== 1) return
    pan.current = { start: relative(event), camera: cameraRef.current, moved: false }
  }

  const handleSurfaceMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, relative(event))

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      applyCamera(pinchCamera(pinch.current.camera, pinch.current.from, [a, b]))
      return
    }

    const activeDrag = drag.current
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      const dx = event.clientX - activeDrag.startClient.x
      const dy = event.clientY - activeDrag.startClient.y
      if (!activeDrag.moved && Math.hypot(dx, dy) < TAP_SLOP) return
      const pinned = workspaceRef.current.placements[activeDrag.id]?.pinned
      if (pinned) return
      if (!activeDrag.moved) {
        activeDrag.moved = true
        capture(event.pointerId)
      }
      const zoom = cameraRef.current.zoom
      const percent = worldToPercent({
        x: activeDrag.originWorld.x + dx / zoom,
        y: activeDrag.originWorld.y + dy / zoom,
      })
      const next = { id: activeDrag.id, x: percent.x, y: percent.y }
      previewRef.current = next
      setPreview(next)
      return
    }

    const activePan = pan.current
    if (activePan) {
      const point = relative(event)
      const dx = point.x - activePan.start.x
      const dy = point.y - activePan.start.y
      if (!activePan.moved && Math.hypot(dx, dy) < TAP_SLOP) return
      if (!activePan.moved) {
        activePan.moved = true
        capture(event.pointerId)
        setPanning(true)
      }
      applyCamera({ ...activePan.camera, x: activePan.camera.x + dx, y: activePan.camera.y + dy })
    }
  }

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wasPointer = pointers.current.delete(event.pointerId)
    if (!wasPointer) return
    try { surfaceRef.current?.releasePointerCapture(event.pointerId) } catch { /* not captured */ }

    if (pinch.current) {
      if (pointers.current.size < 2) {
        pinch.current = null
        pan.current = null
        setPanning(false)
      }
      return
    }

    const activeDrag = drag.current
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      drag.current = null
      const final = previewRef.current
      previewRef.current = null
      setPreview(null)
      if (activeDrag.moved && final?.id === activeDrag.id) {
        update(current => current.placements[activeDrag.id]
          ? {
              ...current,
              placements: {
                ...current.placements,
                [activeDrag.id]: { ...current.placements[activeDrag.id], x: final.x, y: final.y, order: nextOrder(current) },
              },
            }
          : current)
      } else if (!activeDrag.moved && event.type === 'pointerup') {
        toggleSelected(activeDrag.id)
      }
      return
    }

    const activePan = pan.current
    pan.current = null
    setPanning(false)
    if (activePan && !activePan.moved && event.type === 'pointerup') {
      // A tap on bare table lets go of everything.
      setSelected([])
      setSelectedLinkId(null)
    }
  }

  const handleSurfaceKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const camera = cameraRef.current
    switch (event.key) {
      case 'ArrowLeft': applyCamera({ ...camera, x: camera.x + PAN_STEP }); break
      case 'ArrowRight': applyCamera({ ...camera, x: camera.x - PAN_STEP }); break
      case 'ArrowUp': applyCamera({ ...camera, y: camera.y + PAN_STEP }); break
      case 'ArrowDown': applyCamera({ ...camera, y: camera.y - PAN_STEP }); break
      case '+': case '=': zoomBy(1.2); break
      case '-': case '_': zoomBy(1 / 1.2); break
      case '0': fit(); break
      case 'Escape': setSelected([]); setSelectedLinkId(null); break
      case 'Delete': case 'Backspace':
        if (selectedLinkId) removeLinkWithUndo(selectedLinkId)
        break
      default: return
    }
    event.preventDefault()
  }

  const getPosition = (id: string, placement: BoardPlacement) =>
    preview?.id === id ? { ...placement, x: preview.x, y: preview.y } : placement

  const noteCountFor = (id: string) => workspace.annotations[id]?.length ?? 0

  const handleOpen = useCallback((id: string) => onInspect(id), [onInspect])
  const clearSelection = useCallback(() => { setSelected([]); setSelectedLinkId(null) }, [])
  const selectLink = useCallback((id: string) => { setSelected([]); setSelectedLinkId(id) }, [])

  return (
    <section ref={sectionRef} className="space-y-3" aria-label="Persistent investigation table">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-nexus-border pb-2">
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-nexus-text">INVESTIGATION TABLE</h2>
          <p className="mt-1 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            {placed.length.toString().padStart(2, '0')} PLACED / {artifacts.length.toString().padStart(2, '0')} CASE OBJECTS / {liveLinks.length.toString().padStart(2, '0')} LINKS / SAVED ON THIS DEVICE
          </p>
        </div>
      </header>

      {!wide && (
        <button
          type="button"
          onClick={() => setToolsOpen(open => !open)}
          aria-expanded={toolsOpen}
          className="min-h-10 w-full border border-nexus-border px-3 text-left font-mono text-[0.58rem] uppercase tracking-[0.12em] text-nexus-textMuted"
        >
          {toolsOpen ? '[ − ] HIDE TABLE TOOLS' : `[ + ] TABLE TOOLS / SEARCH / ADD OBJECTS / ${unplaced.length} IN ARCHIVE`}
        </button>
      )}

      <div className={`${wide || toolsOpen ? '' : 'hidden'} space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="table-search" className="sr-only">Search the table</label>
        <input
          id="table-search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="SEARCH TABLE / CODE, TITLE, NOTE…"
          className="min-h-10 min-w-0 flex-1 border border-nexus-border bg-nexus-bg px-2 font-mono text-xs text-nexus-text"
        />
        <label htmlFor="table-type" className="sr-only">Filter by object type</label>
        <select id="table-type" value={typeFilter} onChange={event => setTypeFilter(event.target.value as typeof typeFilter)} className="min-h-10 border border-nexus-border bg-nexus-bg px-2 font-mono text-xs text-nexus-text">
          {TYPE_FILTERS.map(option => <option key={option} value={option}>{option === 'ALL' ? 'ALL OBJECTS' : option}</option>)}
        </select>
        {filtering && <span className="font-mono text-[0.55rem] uppercase text-nexus-textMuted">{matchCount} / {placed.length} MATCH</span>}
      </div>

      {unplaced.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-nexus-borderSubtle pb-3">
          <label htmlFor="table-artifact" className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">ADD RECOVERED OBJECT</label>
          <select id="table-artifact" value={placeCode} onChange={event => setPlaceCode(event.target.value)} className="min-h-10 min-w-0 flex-1 border border-nexus-border bg-nexus-bg px-2 font-mono text-xs text-nexus-text">
            <option value="">SELECT FROM CASE ARCHIVE</option>
            {unplaced.map(artifact => <option key={artifact.id} value={artifact.id}>{artifact.code} / {artifact.title}</option>)}
          </select>
          <button type="button" disabled={!placeCode} onClick={() => placeArtifacts([placeCode])} className="min-h-10 border border-nexus-accent px-3 font-mono text-[0.55rem] uppercase text-nexus-accent disabled:opacity-40">[ PLACE ]</button>
          <button type="button" onClick={() => placeArtifacts(unplaced.map(artifact => artifact.id))} className="min-h-10 border border-nexus-border px-3 font-mono text-[0.55rem] uppercase text-nexus-textMuted">[ PLACE ALL / {unplaced.length} ]</button>
        </div>
      )}
      </div>

      <div className={wide ? 'grid grid-cols-[minmax(0,1fr)_21rem] gap-3' : 'grid gap-3'}>
        <div className="relative border border-nexus-border bg-[#22221f] p-1.5">
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 border border-nexus-border bg-[#17160f]/90 p-1" role="group" aria-label="Table view controls">
            <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out" className="min-h-10 min-w-10 border border-nexus-border font-mono text-sm text-nexus-text">−</button>
            <output aria-label="Zoom level" className="w-11 text-center font-mono text-[0.6rem] tabular-nums text-nexus-textMuted">{zoomLabel}%</output>
            <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in" className="min-h-10 min-w-10 border border-nexus-border font-mono text-sm text-nexus-text">+</button>
            <button type="button" onClick={fit} className="min-h-10 border border-nexus-border px-2.5 font-mono text-[0.55rem] uppercase text-nexus-text">FIT</button>
            <button type="button" onClick={() => applyCamera(DEFAULT_CAMERA)} className="min-h-10 border border-nexus-border px-2.5 font-mono text-[0.55rem] uppercase text-nexus-textMuted">RESET VIEW</button>
          </div>

          <div
            ref={surfaceRef}
            role="application"
            aria-label="Investigation table. Arrow keys pan, plus and minus zoom, zero fits all objects, Escape clears the selection."
            tabIndex={0}
            data-panning={panning}
            className={`nx-board-surface relative overflow-hidden border border-[#5d5a50] ${wide ? 'h-[calc(100dvh-17rem)] min-h-[30rem]' : 'h-[62dvh] min-h-[22rem]'}`}
            onPointerDownCapture={handleSurfaceDownCapture}
            onPointerDown={handleSurfaceDown}
            onPointerMove={handleSurfaceMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            onKeyDown={handleSurfaceKeyDown}
          >
            <div
              ref={worldRef}
              className="absolute left-0 top-0 will-change-transform"
              style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transformOrigin: '0 0' }}
            >
              <div className="pointer-events-none absolute left-6 top-4 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#b5ae96]">CASE 037 / WORK SURFACE / PRIVATE HYPOTHESES</div>

              <BoardLinks
                links={liveLinks}
                placements={workspace.placements}
                preview={preview}
                selectedLinkId={selectedLinkId}
                freshLinkId={freshLinkId}
                onSelect={selectLink}
              />

              {placed.map(({ artifact, id, position }) => {
                const current = getPosition(id, position)
                const world = percentToWorld(current.x, current.y)
                return (
                  <BoardCard
                    key={id}
                    artifact={artifact}
                    placement={current}
                    worldX={world.x}
                    worldY={world.y}
                    selectedIndex={selected.indexOf(id)}
                    dim={filtering && !matches(artifact)}
                    dragging={preview?.id === id}
                    hasNewInfo={workspace.revelations[id]?.hasNewInfo ?? false}
                    noteCount={noteCountFor(id)}
                    linkCount={linkCounts.get(id) ?? 0}
                    detail={zoomLabel >= 110}
                    onPointerDown={handleCardPointerDown}
                    onToggleSelect={toggleSelected}
                    onOpen={handleOpen}
                    onTogglePin={togglePin}
                    onRotate={rotate}
                    onRemove={removeFromTable}
                  />
                )
              })}
            </div>

            {placed.length === 0 && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 border-l border-[#b5ae96] pl-4 font-mono">
                <p className="text-[0.56rem] uppercase tracking-[0.16em] text-[#d3b87b]">TABLE / UNSET</p>
                <p className="mt-2 text-xs text-[#c0bcaf]">No objects placed. The archive remains intact.</p>
                <p className="mt-1 text-[0.6rem] text-[#9a9684]">Place recovered objects above, then arrange and connect them here.</p>
              </div>
            )}
          </div>

          {(selected.length > 0 || selectedLink) && (
            <div className={`absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 border border-[#d3b87b]/60 bg-[#17160f]/95 px-3 py-2 font-mono text-[0.58rem] uppercase text-[#e0d6b8] ${wide ? 'hidden' : ''}`}>
              <span>{selectedLink ? 'LINK SELECTED' : `${selected.length} SELECTED`}</span>
              <span className="flex gap-1">
                <button type="button" className="min-h-10 border border-[#d3b87b]/50 px-3" onClick={() => inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  {selected.length >= 2 ? 'LINK' : 'DETAILS'}
                </button>
                {selected.length === 1 && <button type="button" className="min-h-10 border border-[#d3b87b]/50 px-3" onClick={() => focusArtifact(selected[0])}>FOCUS</button>}
                <button type="button" className="min-h-10 border border-[#d3b87b]/50 px-3" onClick={clearSelection}>CLEAR</button>
              </span>
            </div>
          )}

          <div className="mt-1.5 flex justify-between gap-2 font-mono text-[0.48rem] uppercase tracking-[0.12em] text-[#b5ae96]">
            <span>DRAG TO ARRANGE / DRAG TABLE TO PAN / PINCH OR SCROLL TO ZOOM / REMOVE NEVER DELETES CASE EVIDENCE</span>
            <span>{placed.length.toString().padStart(2, '0')} OBJECTS ON SURFACE</span>
          </div>
        </div>

        <div ref={inspectorRef} className="min-w-0 scroll-mt-4">
          <BoardInspector
            workspace={workspace}
            artifactById={artifactById}
            selectedArtifacts={selectedArtifacts}
            selectedLink={selectedLink}
            liveLinks={liveLinks}
            dormantLinks={dormantLinks}
            onCreateLink={createLink}
            onUpdateLink={(id, patch) => update(current => updateLink(current, id, patch))}
            onRemoveLink={removeLinkWithUndo}
            onSelectLink={selectLink}
            onAddNote={(key, kind: AnnotationKind, text) => update(current => addAnnotation(current, key, kind, text, newId()))}
            onEditNote={(key, id, text) => update(current => editAnnotation(current, key, id, { text }))}
            onDeleteNote={(key, id) => update(current => deleteAnnotation(current, key, id))}
            onOpen={handleOpen}
            onFocus={focusArtifact}
            onClear={clearSelection}
          />
          {staleCount > 0 && (
            <div className="mt-2 flex items-center justify-between gap-2 border border-nexus-border p-2 font-mono text-[0.52rem] uppercase text-nexus-textSubtle">
              <span>{staleCount} LINK{staleCount > 1 ? 'S' : ''} POINT AT OBJECTS NOT IN THIS CASE FILE</span>
              <button
                type="button"
                className="min-h-8 border border-nexus-border px-2 text-nexus-textMuted"
                onClick={() => update(current => pruneWorkspace(current, new Set(artifacts.map(artifact => artifact.id))))}
              >
                PURGE
              </button>
            </div>
          )}
        </div>
      </div>

      {undoEntry && (
        <div role="status" className="flex items-center justify-between gap-3 border border-nexus-borderStrong bg-nexus-surfaceElevated px-3 py-2 font-mono text-[0.58rem] uppercase text-nexus-textMuted">
          <span>{undoEntry.label}</span>
          <button type="button" className="min-h-8 border border-nexus-accent px-3 text-nexus-accent" onClick={() => { undoEntry.undo(); setUndoEntry(null) }}>UNDO</button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </section>
  )
}

