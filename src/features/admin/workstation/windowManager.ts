/**
 * NEXUS ECHO — Workstation window manager (pure)
 *
 * No React in here. The workstation shell keeps a `DeskState` and feeds it
 * through these functions; everything is deterministic and unit-tested, and the
 * whole desk serialises to one small JSON document so a layout can persist.
 *
 * Rules the functions enforce, so no caller has to remember them:
 *   - a window can never be dragged or resized wholly out of reach
 *   - single-instance apps are focused, not duplicated
 *   - focus raises; pinned windows always stay above unpinned ones
 *   - a minimised window cannot hold focus
 */
import type { AppId } from './apps'
import { APPS } from './apps'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface DeskSize {
  width: number
  height: number
}

export interface WindowState extends Rect {
  id: string
  app: AppId
  /** Where this window's own router currently is (admin apps only). */
  path: string
  z: number
  minimized: boolean
  maximized: boolean
  pinned: boolean
  /** Geometry to return to when un-maximised. */
  restore: Rect | null
}

export interface DeskState {
  version: 1
  windows: WindowState[]
  focusedId: string | null
  nextZ: number
}

export const MIN_WINDOW = { w: 360, h: 240 }
/** At least this much of a title bar must stay on screen. */
const GRAB = 96
const PIN_BAND = 100000

export function emptyDesk(): DeskState {
  return { version: 1, windows: [], focusedId: null, nextZ: 1 }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Keep a rect reachable: title bar on screen, size within the desk. */
export function clampRect(rect: Rect, desk: DeskSize): Rect {
  const w = clamp(rect.w, Math.min(MIN_WINDOW.w, desk.width), Math.max(Math.min(MIN_WINDOW.w, desk.width), desk.width))
  const h = clamp(rect.h, Math.min(MIN_WINDOW.h, desk.height), Math.max(Math.min(MIN_WINDOW.h, desk.height), desk.height))
  return {
    w,
    h,
    x: clamp(rect.x, GRAB - w, Math.max(GRAB - w, desk.width - GRAB)),
    y: clamp(rect.y, 0, Math.max(0, desk.height - 36)),
  }
}

function find(state: DeskState, id: string): WindowState | undefined {
  return state.windows.find(window => window.id === id)
}

function map(state: DeskState, id: string, update: (window: WindowState) => WindowState): DeskState {
  return { ...state, windows: state.windows.map(window => (window.id === id ? update(window) : window)) }
}

/** Highest-stacked visible window, or null. Pinned windows win ties by z band. */
function topVisible(state: DeskState): WindowState | null {
  return state.windows
    .filter(window => !window.minimized)
    .sort((a, b) => b.z - a.z)[0] ?? null
}

/** Cascade slot for the nth window, clamped to the desk. */
export function cascadeRect(index: number, size: { w: number; h: number }, desk: DeskSize): Rect {
  const step = 34
  const base = clampRect({ x: 28 + (index % 8) * step, y: 20 + (index % 8) * step, w: size.w, h: size.h }, desk)
  return base
}

export function bringToFront(state: DeskState, id: string): DeskState {
  const target = find(state, id)
  if (!target) return state
  const z = state.nextZ
  return {
    ...map(state, id, window => ({ ...window, z: window.pinned ? PIN_BAND + z : z, minimized: false })),
    focusedId: id,
    nextZ: z + 1,
  }
}

export function openApp(
  state: DeskState,
  app: AppId,
  desk: DeskSize,
  options: { path?: string; id?: string } = {},
): DeskState {
  const definition = APPS[app]
  const existing = state.windows.find(window => window.app === app)
  if (existing && !definition.multiple) {
    const focused = bringToFront(state, existing.id)
    return options.path ? map(focused, existing.id, window => ({ ...window, path: options.path ?? window.path })) : focused
  }
  const id = options.id ?? `${app}-${state.nextZ}`
  const size = {
    w: Math.min(definition.size.w, desk.width - 24),
    h: Math.min(definition.size.h, desk.height - 24),
  }
  const rect = cascadeRect(state.windows.length, size, desk)
  const window: WindowState = {
    id,
    app,
    path: options.path ?? definition.path ?? '',
    ...rect,
    z: state.nextZ,
    minimized: false,
    maximized: false,
    pinned: false,
    restore: null,
  }
  return { ...state, windows: [...state.windows, window], focusedId: id, nextZ: state.nextZ + 1 }
}

export function closeWindow(state: DeskState, id: string): DeskState {
  const windows = state.windows.filter(window => window.id !== id)
  const next = { ...state, windows }
  if (state.focusedId !== id) return next
  const top = topVisible(next)
  return { ...next, focusedId: top?.id ?? null }
}

export function minimizeWindow(state: DeskState, id: string): DeskState {
  const next = map(state, id, window => ({ ...window, minimized: true }))
  if (state.focusedId !== id) return next
  return { ...next, focusedId: topVisible(next)?.id ?? null }
}

export function toggleMaximize(state: DeskState, id: string, desk: DeskSize): DeskState {
  const target = find(state, id)
  if (!target) return state
  const next = target.maximized
    ? map(state, id, window => ({
        ...window,
        ...(window.restore ? clampRect(window.restore, desk) : cascadeRect(0, { w: 900, h: 600 }, desk)),
        maximized: false,
        restore: null,
      }))
    : map(state, id, window => ({
        ...window,
        restore: { x: window.x, y: window.y, w: window.w, h: window.h },
        x: 0,
        y: 0,
        w: desk.width,
        h: desk.height,
        maximized: true,
      }))
  return bringToFront(next, id)
}

export function moveWindow(state: DeskState, id: string, x: number, y: number, desk: DeskSize): DeskState {
  const target = find(state, id)
  if (!target || target.maximized) return state
  const rect = clampRect({ x, y, w: target.w, h: target.h }, desk)
  return map(state, id, window => ({ ...window, x: rect.x, y: rect.y }))
}

export function resizeWindow(state: DeskState, id: string, rect: Rect, desk: DeskSize): DeskState {
  const target = find(state, id)
  if (!target || target.maximized) return state
  const next = clampRect(
    { ...rect, w: Math.max(MIN_WINDOW.w, rect.w), h: Math.max(MIN_WINDOW.h, rect.h) },
    desk,
  )
  return map(state, id, window => ({ ...window, ...next }))
}

export function togglePin(state: DeskState, id: string): DeskState {
  const target = find(state, id)
  if (!target) return state
  const pinned = !target.pinned
  const base = target.z >= PIN_BAND ? target.z - PIN_BAND : target.z
  return map(state, id, window => ({ ...window, pinned, z: pinned ? PIN_BAND + base : base }))
}

export function setWindowPath(state: DeskState, id: string, path: string): DeskState {
  const target = find(state, id)
  if (!target || target.path === path) return state
  return map(state, id, window => ({ ...window, path }))
}

/**
 * Cycle focus through the visible, unpinned windows. "Next" raises the one at
 * the back (so repeated presses visit every window); "previous" sends the one
 * in front to the back and raises the one behind it.
 */
export function cycleFocus(state: DeskState, direction: 1 | -1 = 1): DeskState {
  const ring = state.windows.filter(window => !window.minimized && !window.pinned).sort((a, b) => a.z - b.z)
  if (ring.length < 2) return state
  if (direction === 1) return bringToFront(state, ring[0].id)
  const front = ring[ring.length - 1]
  const behind = ring[ring.length - 2]
  const sent = map(state, front.id, window => ({ ...window, z: ring[0].z - 1 }))
  return bringToFront(sent, behind.id)
}

/** Re-fit every window after the desk changed size (resize, rotate, zoom). */
export function clampAll(state: DeskState, desk: DeskSize): DeskState {
  return {
    ...state,
    windows: state.windows.map(window => {
      if (window.maximized) return { ...window, x: 0, y: 0, w: desk.width, h: desk.height }
      return { ...window, ...clampRect(window, desk) }
    }),
  }
}

/** The default desk: the command centre, large, and nothing else. */
export function defaultDesk(desk: DeskSize, initial: AppId = 'COMMAND', path?: string): DeskState {
  const opened = openApp(emptyDesk(), initial, desk, { path })
  const first = opened.windows[0]
  if (!first) return opened
  // Fill most of a big screen so the first view is a place, not a floating card.
  // Leave the module column on the left visible: the desktop is a place with things on it.
  const x = desk.width >= 1100 ? 100 : 16
  const w = Math.min(Math.max(first.w, Math.round(desk.width * 0.74)), desk.width - x - 16)
  const h = Math.min(Math.max(first.h, Math.round(desk.height * 0.86)), desk.height - 20)
  return map(opened, first.id, window => ({ ...window, x, y: 12, w, h }))
}

/* ───────────────────────────── persistence ───────────────────────────── */

const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

/** Defensive load: anything malformed is dropped rather than trusted. */
export function normalizeDesk(raw: unknown, desk: DeskSize): DeskState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const source = raw as Record<string, unknown>
  if (source.version !== 1 || !Array.isArray(source.windows)) return null
  const seen = new Set<string>()
  const windows: WindowState[] = []
  for (const entry of source.windows) {
    if (typeof entry !== 'object' || entry === null) continue
    const item = entry as Record<string, unknown>
    const app = item.app as AppId
    if (typeof item.id !== 'string' || !(app in APPS) || seen.has(item.id)) continue
    const definition = APPS[app]
    if (!definition.multiple && windows.some(window => window.app === app)) continue
    seen.add(item.id)
    const rect = clampRect(
      { x: num(item.x, 40), y: num(item.y, 40), w: num(item.w, definition.size.w), h: num(item.h, definition.size.h) },
      desk,
    )
    const path = typeof item.path === 'string' && item.path.startsWith('/admin/') ? item.path : definition.path ?? ''
    windows.push({
      id: item.id,
      app,
      path,
      ...rect,
      z: num(item.z, 1),
      minimized: item.minimized === true,
      maximized: item.maximized === true,
      pinned: item.pinned === true,
      restore: null,
    })
  }
  const focusedId = typeof source.focusedId === 'string' && seen.has(source.focusedId) ? source.focusedId : null
  const state: DeskState = { version: 1, windows, focusedId, nextZ: Math.max(num(source.nextZ, 1), ...windows.map(window => (window.z % PIN_BAND) + 1), 1) }
  return clampAll(state, desk)
}

export function serializeDesk(state: DeskState): string {
  return JSON.stringify(state)
}
