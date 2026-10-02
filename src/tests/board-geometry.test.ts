import { describe, expect, it } from 'vitest'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
  clampCamera,
  contentBounds,
  edgePoint,
  fitCamera,
  focusCamera,
  percentToWorld,
  pinchCamera,
  screenToWorld,
  worldToPercent,
  zoomAt,
} from '@/lib/boardGeometry'

const VIEWPORT = { width: 800, height: 600 }

describe('board camera', () => {
  it('zooms about the cursor so the point under it does not move', () => {
    const camera = { x: -50, y: 30, zoom: 1 }
    const anchor = { x: 400, y: 300 }
    const before = screenToWorld(camera, anchor)
    const next = zoomAt(camera, 1.6, anchor)
    const after = screenToWorld(next, anchor)
    expect(after.x).toBeCloseTo(before.x, 6)
    expect(after.y).toBeCloseTo(before.y, 6)
    expect(next.zoom).toBeCloseTo(1.6, 6)
  })

  it('never zooms outside its limits', () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, 100, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM)
    expect(zoomAt({ x: 0, y: 0, zoom: 1 }, 0.001, { x: 0, y: 0 }).zoom).toBe(MIN_ZOOM)
  })

  it('keeps part of the board on screen however far it is flung', () => {
    const flung = clampCamera({ x: 99999, y: -99999, zoom: 1 }, VIEWPORT)
    expect(flung.x).toBeLessThan(VIEWPORT.width)
    expect(flung.y + BOARD_HEIGHT).toBeGreaterThan(0)
    const left = clampCamera({ x: -99999, y: 0, zoom: 1 }, VIEWPORT)
    expect(left.x + BOARD_WIDTH).toBeGreaterThan(0)
  })

  it('maps percent coordinates to world pixels and back', () => {
    const world = percentToWorld(50, 25)
    expect(world).toEqual({ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 4 })
    const back = worldToPercent(world)
    expect(back.x).toBeCloseTo(50)
    expect(back.y).toBeCloseTo(25)
  })

  it('clamps a dragged card inside the board', () => {
    const edge = worldToPercent({ x: -500, y: BOARD_HEIGHT + 500 })
    expect(edge.x).toBeGreaterThan(0)
    expect(edge.y).toBeLessThan(100)
  })

  it('fits every placed card inside the viewport', () => {
    const bounds = contentBounds([{ x: 10, y: 15 }, { x: 80, y: 70 }])!
    const camera = fitCamera(bounds, VIEWPORT, 40)
    const left = bounds.minX * camera.zoom + camera.x
    const right = bounds.maxX * camera.zoom + camera.x
    const top = bounds.minY * camera.zoom + camera.y
    const bottom = bounds.maxY * camera.zoom + camera.y
    expect(left).toBeGreaterThanOrEqual(39)
    expect(right).toBeLessThanOrEqual(VIEWPORT.width - 39)
    expect(top).toBeGreaterThanOrEqual(39)
    expect(bottom).toBeLessThanOrEqual(VIEWPORT.height - 39)
  })

  it('fits the whole board when the table is empty', () => {
    expect(contentBounds([])).toBeNull()
    const camera = fitCamera(null, VIEWPORT)
    expect(BOARD_WIDTH * camera.zoom).toBeLessThanOrEqual(VIEWPORT.width)
  })

  it('centres the view on a focused object', () => {
    const target = percentToWorld(70, 60)
    const camera = focusCamera({ x: 0, y: 0, zoom: 1 }, target, VIEWPORT)
    const onScreen = { x: target.x * camera.zoom + camera.x, y: target.y * camera.zoom + camera.y }
    expect(onScreen.x).toBeCloseTo(VIEWPORT.width / 2)
    expect(onScreen.y).toBeCloseTo(VIEWPORT.height / 2)
  })
})

describe('pinch gesture', () => {
  it('spreading two fingers zooms in about their midpoint', () => {
    const start = { x: 0, y: 0, zoom: 1 }
    const next = pinchCamera(start, [{ x: 300, y: 300 }, { x: 500, y: 300 }], [{ x: 200, y: 300 }, { x: 600, y: 300 }])
    expect(next.zoom).toBeCloseTo(2)
    const mid = { x: 400, y: 300 }
    expect(screenToWorld(next, mid).x).toBeCloseTo(400)
  })

  it('dragging two fingers together pans without zooming', () => {
    const next = pinchCamera({ x: 0, y: 0, zoom: 1 }, [{ x: 300, y: 300 }, { x: 500, y: 300 }], [{ x: 340, y: 330 }, { x: 540, y: 330 }])
    expect(next.zoom).toBeCloseTo(1)
    expect(next.x).toBeCloseTo(40)
    expect(next.y).toBeCloseTo(30)
  })

  it('survives two fingers on the same spot', () => {
    const next = pinchCamera({ x: 0, y: 0, zoom: 1 }, [{ x: 5, y: 5 }, { x: 5, y: 5 }], [{ x: 9, y: 9 }, { x: 9, y: 9 }])
    expect(Number.isFinite(next.zoom)).toBe(true)
  })
})

describe('link endpoints', () => {
  it('trims a line to the card edge instead of its centre', () => {
    const point = edgePoint({ x: 0, y: 0 }, { x: 1000, y: 0 })
    expect(point.x).toBe(105)
    expect(point.y).toBe(0)
  })

  it('handles two cards on the same spot', () => {
    expect(edgePoint({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({ x: 10, y: 10 })
  })
})

describe('grid placement', () => {
  it('lays new cards out without overlap, inside the board', async () => {
    const { gridSlots, CARD_WIDTH, CARD_HEIGHT } = await import('@/lib/boardGeometry')
    const slots = gridSlots(66, { x: 1300, y: 900 })
    expect(slots).toHaveLength(66)
    const world = slots.map(slot => percentToWorld(slot.x, slot.y))
    for (const point of world) {
      expect(point.x - CARD_WIDTH / 2).toBeGreaterThanOrEqual(0)
      expect(point.x + CARD_WIDTH / 2).toBeLessThanOrEqual(BOARD_WIDTH)
      expect(point.y - CARD_HEIGHT / 2).toBeGreaterThanOrEqual(0)
      expect(point.y + CARD_HEIGHT / 2).toBeLessThanOrEqual(BOARD_HEIGHT)
    }
    const overlapping = world.some((a, i) => world.some((b, j) => i < j
      && Math.abs(a.x - b.x) < CARD_WIDTH && Math.abs(a.y - b.y) < CARD_HEIGHT))
    expect(overlapping).toBe(false)
  })
})

describe('single placement', () => {
  it('never drops a new card on top of an existing one', async () => {
    const { freeSlot, CARD_WIDTH, CARD_HEIGHT } = await import('@/lib/boardGeometry')
    const centre = { x: 1300, y: 900 }
    const taken: Array<{ x: number; y: number }> = []
    for (let i = 0; i < 12; i++) taken.push(freeSlot(centre, taken))
    const world = taken.map(slot => percentToWorld(slot.x, slot.y))
    const overlapping = world.some((a, i) => world.some((b, j) => i < j
      && Math.abs(a.x - b.x) < CARD_WIDTH && Math.abs(a.y - b.y) < CARD_HEIGHT))
    expect(overlapping).toBe(false)
  })
})
