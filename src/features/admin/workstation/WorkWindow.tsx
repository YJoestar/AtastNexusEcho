/**
 * NEXUS ECHO — Workstation window frame
 *
 * A thin forensic header (module code, title, case, status lamp, four small
 * controls) around whatever application is running. Drag and resize mutate the
 * element directly and commit once on release, so the application inside never
 * re-renders while a window is being moved.
 */
import { memo, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { APPS } from './apps'
import { Glyph } from './glyphs'
import { MIN_WINDOW, clampRect, type DeskSize, type Rect, type WindowState } from './windowManager'

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const EDGES: Array<{ edge: Edge; className: string; cursor: string }> = [
  { edge: 'n', className: 'left-2 right-2 -top-px h-1.5', cursor: 'ns-resize' },
  { edge: 's', className: 'left-2 right-2 -bottom-px h-1.5', cursor: 'ns-resize' },
  { edge: 'e', className: '-right-px top-2 bottom-2 w-1.5', cursor: 'ew-resize' },
  { edge: 'w', className: '-left-px top-2 bottom-2 w-1.5', cursor: 'ew-resize' },
  { edge: 'ne', className: '-right-px -top-px h-3 w-3', cursor: 'nesw-resize' },
  { edge: 'nw', className: '-left-px -top-px h-3 w-3', cursor: 'nwse-resize' },
  { edge: 'se', className: '-bottom-px -right-px h-3 w-3', cursor: 'nwse-resize' },
  { edge: 'sw', className: '-bottom-px -left-px h-3 w-3', cursor: 'nesw-resize' },
]

interface WorkWindowProps {
  window: WindowState
  desk: DeskSize
  focused: boolean
  /** Compact desks show one window at a time, full size, with no dragging. */
  compact: boolean
  onFocus: (id: string) => void
  onRect: (id: string, rect: Rect) => void
  onClose: (id: string) => void
  onMinimize: (id: string) => void
  onMaximize: (id: string) => void
  onPin: (id: string) => void
  children: ReactNode
}

function WorkWindowImpl({
  window: win, desk, focused, compact, onFocus, onRect, onClose, onMinimize, onMaximize, onPin, children,
}: WorkWindowProps) {
  const frame = useRef<HTMLElement>(null)
  const gesture = useRef<{ kind: 'move' | Edge; startX: number; startY: number; origin: Rect; next: Rect } | null>(null)
  const definition = APPS[win.app]
  const interactive = !compact && !win.maximized

  const apply = (rect: Rect) => {
    const el = frame.current
    if (!el) return
    el.style.left = `${rect.x}px`
    el.style.top = `${rect.y}px`
    el.style.width = `${rect.w}px`
    el.style.height = `${rect.h}px`
  }

  const begin = (event: ReactPointerEvent<HTMLElement>, kind: 'move' | Edge) => {
    if (!interactive || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const origin = { x: win.x, y: win.y, w: win.w, h: win.h }
    gesture.current = { kind, startX: event.clientX, startY: event.clientY, origin, next: origin }
  }

  const track = (event: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current
    if (!g) return
    const dx = event.clientX - g.startX
    const dy = event.clientY - g.startY
    const { origin } = g
    let { x, y, w, h } = origin
    if (g.kind === 'move') {
      x += dx
      y += dy
    } else {
      if (g.kind.includes('e')) w = origin.w + dx
      if (g.kind.includes('s')) h = origin.h + dy
      if (g.kind.includes('w')) { w = origin.w - dx; x = origin.x + dx }
      if (g.kind.includes('n')) { h = origin.h - dy; y = origin.y + dy }
      // Pin the opposite edge when a minimum size is hit, instead of drifting.
      if (w < MIN_WINDOW.w) { if (g.kind.includes('w')) x = origin.x + origin.w - MIN_WINDOW.w; w = MIN_WINDOW.w }
      if (h < MIN_WINDOW.h) { if (g.kind.includes('n')) y = origin.y + origin.h - MIN_WINDOW.h; h = MIN_WINDOW.h }
    }
    g.next = clampRect({ x, y, w, h }, desk)
    apply(g.next)
  }

  const finish = () => {
    const g = gesture.current
    gesture.current = null
    if (g && (g.next.x !== g.origin.x || g.next.y !== g.origin.y || g.next.w !== g.origin.w || g.next.h !== g.origin.h)) {
      onRect(win.id, g.next)
    }
  }

  const style = compact
    ? { left: 0, top: 0, width: desk.width, height: desk.height, zIndex: win.z, display: focused ? 'flex' : 'none' }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z, display: win.minimized ? 'none' : 'flex' }

  return (
    <section
      ref={frame}
      role="dialog"
      aria-label={`${definition.module} ${definition.title}`}
      data-window-id={win.id}
      data-app={win.app}
      data-focused={focused}
      className={cn(
        'absolute flex-col border bg-nexus-bg',
        focused
          ? 'border-nexus-accent/55 shadow-[0_0_0_1px_rgba(111,179,196,0.12),0_18px_48px_rgba(0,0,0,0.65)]'
          : 'border-nexus-border shadow-[0_10px_28px_rgba(0,0,0,0.5)]',
      )}
      style={style}
      onPointerDownCapture={() => { if (!focused) onFocus(win.id) }}
    >
      <header
        className={cn(
          'flex h-8 shrink-0 select-none items-center gap-2 border-b px-2 font-mono text-[0.6rem] uppercase tracking-[0.16em]',
          focused ? 'border-nexus-accent/40 bg-nexus-surfaceElevated text-nexus-text' : 'border-nexus-border bg-nexus-surface text-nexus-textSubtle',
          interactive && 'cursor-grab active:cursor-grabbing',
        )}
        onPointerDown={event => { if (!(event.target as HTMLElement).closest('button')) begin(event, 'move') }}
        onPointerMove={track}
        onPointerUp={finish}
        onPointerCancel={finish}
        onDoubleClick={event => { if (!compact && !(event.target as HTMLElement).closest('button')) onMaximize(win.id) }}
        style={{ touchAction: 'none' }}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0', focused ? 'bg-nexus-accent' : 'bg-nexus-inactive')} aria-hidden="true" />
        <span className="shrink-0 border border-current/40 px-1 text-[0.5rem] tracking-[0.12em] opacity-80">{definition.module}</span>
        <Glyph name={definition.glyph} size={14} className="shrink-0 opacity-80" />
        <h2 className="min-w-0 flex-1 truncate font-bold tracking-[0.18em]">{definition.title}</h2>
        <span className="hidden shrink-0 text-[0.5rem] tracking-[0.14em] text-nexus-textSubtle sm:inline">CASE 037</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <HeaderButton label={win.pinned ? 'Unpin window' : 'Pin window above others'} pressed={win.pinned} onClick={() => onPin(win.id)}>◆</HeaderButton>
          <HeaderButton label="Minimise window" onClick={() => onMinimize(win.id)}>_</HeaderButton>
          {!compact && <HeaderButton label={win.maximized ? 'Restore window' : 'Maximise window'} onClick={() => onMaximize(win.id)}>{win.maximized ? '❐' : '□'}</HeaderButton>}
          <HeaderButton label="Close window" danger onClick={() => onClose(win.id)}>×</HeaderButton>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto bg-nexus-bg" data-window-body>
        {children}
        {!focused && <div className="pointer-events-none absolute inset-0 bg-black/18" aria-hidden="true" />}
      </div>

      {interactive && EDGES.map(({ edge, className, cursor }) => (
        <div
          key={edge}
          aria-hidden="true"
          className={cn('absolute z-10', className)}
          style={{ cursor, touchAction: 'none' }}
          onPointerDown={event => begin(event, edge)}
          onPointerMove={track}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      ))}
    </section>
  )
}

function HeaderButton({ label, onClick, children, pressed, danger }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center border border-transparent text-[0.7rem] leading-none text-nexus-textMuted hover:border-nexus-border hover:text-nexus-text focus-visible:border-nexus-accent',
        pressed && 'text-nexus-warning',
        danger && 'hover:text-nexus-danger',
      )}
    >
      {children}
    </button>
  )
}

export const WorkWindow = memo(WorkWindowImpl)
