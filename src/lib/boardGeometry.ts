/**
 * NEXUS ECHO — Investigation board geometry
 *
 * Pure camera maths for the pan / zoom / pinch case board. Placements are
 * stored as percentages of the board so saved layouts survive a resize; the
 * camera works in board pixels:  screen = world * zoom + (view.x, view.y).
 */

export const BOARD_WIDTH = 2800
export const BOARD_HEIGHT = 2000
export const CARD_WIDTH = 210
export const CARD_HEIGHT = 250
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2.5

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 0.8 }

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_CAMERA.zoom
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

export function percentToWorld(x: number, y: number): Point {
  return { x: (x / 100) * BOARD_WIDTH, y: (y / 100) * BOARD_HEIGHT }
}

export function worldToPercent(point: Point): Point {
  return {
    x: Math.max(2, Math.min(98, (point.x / BOARD_WIDTH) * 100)),
    y: Math.max(3, Math.min(97, (point.y / BOARD_HEIGHT) * 100)),
  }
}

export function screenToWorld(camera: Camera, screen: Point): Point {
  return { x: (screen.x - camera.x) / camera.zoom, y: (screen.y - camera.y) / camera.zoom }
}

/** Zoom by `factor`, keeping the world point under `anchor` (viewport px) fixed. */
export function zoomAt(camera: Camera, factor: number, anchor: Point): Camera {
  const zoom = clampZoom(camera.zoom * factor)
  const ratio = zoom / camera.zoom
  return {
    zoom,
    x: anchor.x - (anchor.x - camera.x) * ratio,
    y: anchor.y - (anchor.y - camera.y) * ratio,
  }
}

/**
 * Keep the board on screen: at least `margin` px of it must stay inside the
 * viewport on every side, so the camera can never be flung into empty space.
 */
export function clampCamera(camera: Camera, viewport: Size, margin = 120): Camera {
  const zoom = clampZoom(camera.zoom)
  const w = BOARD_WIDTH * zoom
  const h = BOARD_HEIGHT * zoom
  const m = Math.min(margin, viewport.width / 2, viewport.height / 2)
  return {
    zoom,
    x: Math.max(m - w, Math.min(viewport.width - m, camera.x)),
    y: Math.max(m - h, Math.min(viewport.height - m, camera.y)),
  }
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** World-space bounds of the placed cards, or null when the table is empty. */
export function contentBounds(placements: Array<{ x: number; y: number }>): Bounds | null {
  if (placements.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const placement of placements) {
    const p = percentToWorld(placement.x, placement.y)
    minX = Math.min(minX, p.x - CARD_WIDTH / 2)
    maxX = Math.max(maxX, p.x + CARD_WIDTH / 2)
    minY = Math.min(minY, p.y - CARD_HEIGHT / 2)
    maxY = Math.max(maxY, p.y + CARD_HEIGHT / 2)
  }
  return { minX, minY, maxX, maxY }
}

/** Camera that frames `bounds` (or the whole board) inside the viewport. */
export function fitCamera(bounds: Bounds | null, viewport: Size, padding = 48): Camera {
  const b = bounds ?? { minX: 0, minY: 0, maxX: BOARD_WIDTH, maxY: BOARD_HEIGHT }
  const width = Math.max(1, b.maxX - b.minX)
  const height = Math.max(1, b.maxY - b.minY)
  const zoom = clampZoom(Math.min(
    (viewport.width - padding * 2) / width,
    (viewport.height - padding * 2) / height,
    1.25,
  ))
  return {
    zoom,
    x: (viewport.width - width * zoom) / 2 - b.minX * zoom,
    y: (viewport.height - height * zoom) / 2 - b.minY * zoom,
  }
}

/** Camera centred on one world point, keeping the current zoom (min 0.7). */
export function focusCamera(camera: Camera, world: Point, viewport: Size): Camera {
  const zoom = clampZoom(Math.max(camera.zoom, 0.7))
  return { zoom, x: viewport.width / 2 - world.x * zoom, y: viewport.height / 2 - world.y * zoom }
}

/**
 * Two-finger gesture: derive the next camera from where the two touches were
 * and where they are now. Handles pan (midpoint travel) and zoom (spread).
 */
export function pinchCamera(
  start: Camera,
  from: [Point, Point],
  to: [Point, Point],
): Camera {
  const startDistance = Math.hypot(from[0].x - from[1].x, from[0].y - from[1].y)
  const distance = Math.hypot(to[0].x - to[1].x, to[0].y - to[1].y)
  const factor = startDistance > 0 ? distance / startDistance : 1
  const startMid = { x: (from[0].x + from[1].x) / 2, y: (from[0].y + from[1].y) / 2 }
  const mid = { x: (to[0].x + to[1].x) / 2, y: (to[0].y + to[1].y) / 2 }
  const zoomed = zoomAt(start, factor, startMid)
  return { ...zoomed, x: zoomed.x + (mid.x - startMid.x), y: zoomed.y + (mid.y - startMid.y) }
}

/** Trim a link's endpoints to the card edges so lines meet the cards, not their centres. */
export function edgePoint(from: Point, to: Point, halfW = CARD_WIDTH / 2, halfH = CARD_HEIGHT / 2): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) return from
  const scale = Math.min(
    dx === 0 ? Infinity : halfW / Math.abs(dx),
    dy === 0 ? Infinity : halfH / Math.abs(dy),
  )
  return { x: from.x + dx * scale, y: from.y + dy * scale }
}

/**
 * Lay `count` new cards out in a tidy grid around `centre`, kept inside the
 * board. Returned in reading order, as board percentages.
 */
export function gridSlots(count: number, centre: Point, columns?: number): Point[] {
  if (count <= 0) return []
  const cols = columns ?? Math.max(1, Math.min(12, Math.ceil(Math.sqrt(count * (BOARD_WIDTH / BOARD_HEIGHT)))))
  const rows = Math.ceil(count / cols)
  // Prefer breathing room, but never let the grid leave the board: a huge set
  // tightens its spacing (and overlaps a little) rather than falling off the edge.
  const stepX = cols > 1 ? Math.min(CARD_WIDTH + 40, (BOARD_WIDTH - CARD_WIDTH - 40) / (cols - 1)) : 0
  const stepY = rows > 1 ? Math.min(CARD_HEIGHT + 25, (BOARD_HEIGHT - CARD_HEIGHT - 40) / (rows - 1)) : 0
  const width = (cols - 1) * stepX
  const height = (rows - 1) * stepY
  const left = Math.max(CARD_WIDTH / 2 + 20, Math.min(BOARD_WIDTH - CARD_WIDTH / 2 - 20 - width, centre.x - width / 2))
  const top = Math.max(CARD_HEIGHT / 2 + 20, Math.min(BOARD_HEIGHT - CARD_HEIGHT / 2 - 20 - height, centre.y - height / 2))
  return Array.from({ length: count }, (_, index) => worldToPercent({
    x: left + (index % cols) * stepX,
    y: top + Math.floor(index / cols) * stepY,
  }))
}

/**
 * The nearest spot to `centre` that does not sit on top of an existing card.
 * Searches outward in rings of card-sized cells; falls back to the centre.
 */
export function freeSlot(centre: Point, occupied: Array<{ x: number; y: number }>): Point {
  const stepX = CARD_WIDTH + 30
  const stepY = CARD_HEIGHT + 20
  const taken = occupied.map(spot => percentToWorld(spot.x, spot.y))
  const clear = (point: Point) => taken.every(other =>
    Math.abs(other.x - point.x) >= CARD_WIDTH + 10 || Math.abs(other.y - point.y) >= CARD_HEIGHT + 10)
  for (let ring = 0; ring <= 8; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue
        const candidate = { x: centre.x + dx * stepX, y: centre.y + dy * stepY }
        const inside = candidate.x >= CARD_WIDTH / 2 && candidate.x <= BOARD_WIDTH - CARD_WIDTH / 2
          && candidate.y >= CARD_HEIGHT / 2 && candidate.y <= BOARD_HEIGHT - CARD_HEIGHT / 2
        if (inside && clear(candidate)) return worldToPercent(candidate)
      }
    }
  }
  return worldToPercent(centre)
}
