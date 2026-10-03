import { describe, expect, it } from 'vitest'
import {
  MIN_WINDOW,
  bringToFront,
  clampAll,
  clampRect,
  closeWindow,
  cycleFocus,
  defaultDesk,
  emptyDesk,
  minimizeWindow,
  moveWindow,
  normalizeDesk,
  openApp,
  resizeWindow,
  serializeDesk,
  setWindowPath,
  toggleMaximize,
  togglePin,
} from '@/features/admin/workstation/windowManager'
import { APPS, appForPath } from '@/features/admin/workstation/apps'

const DESK = { width: 1440, height: 780 }
const win = (state: ReturnType<typeof emptyDesk>, app: string) => state.windows.find(w => w.app === app)!

describe('opening and focusing', () => {
  it('opens an app, focuses it, and puts it inside the desk', () => {
    const state = openApp(emptyDesk(), 'FIELD_UNITS', DESK)
    const w = win(state, 'FIELD_UNITS')
    expect(state.focusedId).toBe(w.id)
    expect(w.x).toBeGreaterThanOrEqual(0)
    expect(w.y).toBeGreaterThanOrEqual(0)
    expect(w.path).toBe('/admin/teams')
  })

  it('focuses a single-instance app instead of opening a second one, and restores it if minimised', () => {
    let state = openApp(emptyDesk(), 'EVIDENCE', DESK)
    state = minimizeWindow(state, win(state, 'EVIDENCE').id)
    expect(state.focusedId).toBeNull()
    state = openApp(state, 'EVIDENCE', DESK)
    expect(state.windows).toHaveLength(1)
    expect(win(state, 'EVIDENCE').minimized).toBe(false)
    expect(state.focusedId).toBe(win(state, 'EVIDENCE').id)
  })

  it('raises the focused window above the others', () => {
    let state = openApp(openApp(emptyDesk(), 'COMMAND', DESK), 'LOCATIONS', DESK)
    state = bringToFront(state, win(state, 'COMMAND').id)
    expect(win(state, 'COMMAND').z).toBeGreaterThan(win(state, 'LOCATIONS').z)
  })

  it('keeps pinned windows above unpinned ones even after another is focused', () => {
    let state = openApp(openApp(emptyDesk(), 'COMMAND', DESK), 'LOCATIONS', DESK)
    state = togglePin(state, win(state, 'COMMAND').id)
    state = bringToFront(state, win(state, 'LOCATIONS').id)
    expect(win(state, 'COMMAND').z).toBeGreaterThan(win(state, 'LOCATIONS').z)
    state = togglePin(state, win(state, 'COMMAND').id)
    expect(win(state, 'COMMAND').pinned).toBe(false)
  })

  it('moves focus to the next window down when the focused one closes or minimises', () => {
    let state = openApp(openApp(emptyDesk(), 'COMMAND', DESK), 'LOCATIONS', DESK)
    const command = win(state, 'COMMAND').id
    state = closeWindow(state, win(state, 'LOCATIONS').id)
    expect(state.focusedId).toBe(command)
    state = minimizeWindow(state, command)
    expect(state.focusedId).toBeNull()
  })

  it('can host a deep path for an app, e.g. one team\'s dossier', () => {
    const state = openApp(emptyDesk(), 'FIELD_UNITS', DESK, { path: '/admin/teams/abc' })
    expect(win(state, 'FIELD_UNITS').path).toBe('/admin/teams/abc')
    const again = openApp(state, 'FIELD_UNITS', DESK, { path: '/admin/teams/xyz' })
    expect(again.windows).toHaveLength(1)
    expect(win(again, 'FIELD_UNITS').path).toBe('/admin/teams/xyz')
  })
})

describe('geometry', () => {
  it('never lets a window be dragged out of reach', () => {
    let state = openApp(emptyDesk(), 'LOCATIONS', DESK)
    const id = win(state, 'LOCATIONS').id
    state = moveWindow(state, id, -9999, -9999, DESK)
    expect(win(state, 'LOCATIONS').y).toBe(0)
    expect(win(state, 'LOCATIONS').x + win(state, 'LOCATIONS').w).toBeGreaterThan(50)
    state = moveWindow(state, id, 99999, 99999, DESK)
    expect(win(state, 'LOCATIONS').x).toBeLessThan(DESK.width)
    expect(win(state, 'LOCATIONS').y).toBeLessThan(DESK.height)
  })

  it('enforces a minimum size and the desk as a maximum', () => {
    let state = openApp(emptyDesk(), 'LOCATIONS', DESK)
    const id = win(state, 'LOCATIONS').id
    state = resizeWindow(state, id, { x: 40, y: 40, w: 10, h: 10 }, DESK)
    expect(win(state, 'LOCATIONS').w).toBe(MIN_WINDOW.w)
    expect(win(state, 'LOCATIONS').h).toBe(MIN_WINDOW.h)
    state = resizeWindow(state, id, { x: 0, y: 0, w: 99999, h: 99999 }, DESK)
    expect(win(state, 'LOCATIONS').w).toBeLessThanOrEqual(DESK.width)
    expect(win(state, 'LOCATIONS').h).toBeLessThanOrEqual(DESK.height)
  })

  it('maximises to the whole desk and restores the exact previous rect', () => {
    let state = openApp(emptyDesk(), 'LOCATIONS', DESK)
    const id = win(state, 'LOCATIONS').id
    const before = { ...win(state, 'LOCATIONS') }
    state = toggleMaximize(state, id, DESK)
    expect(win(state, 'LOCATIONS')).toMatchObject({ x: 0, y: 0, w: DESK.width, h: DESK.height, maximized: true })
    expect(moveWindow(state, id, 300, 300, DESK)).toBe(state)
    state = toggleMaximize(state, id, DESK)
    expect(win(state, 'LOCATIONS')).toMatchObject({ x: before.x, y: before.y, w: before.w, h: before.h, maximized: false })
  })

  it('re-fits windows when the desk shrinks, and re-fills a maximised one when it grows', () => {
    let state = openApp(emptyDesk(), 'COMMAND', DESK)
    state = toggleMaximize(state, win(state, 'COMMAND').id, DESK)
    const grown = clampAll(state, { width: 2560, height: 1300 })
    expect(win(grown, 'COMMAND')).toMatchObject({ w: 2560, h: 1300 })

    const small = clampAll(openApp(emptyDesk(), 'COMMAND', DESK), { width: 700, height: 420 })
    const w = win(small, 'COMMAND')
    expect(w.w).toBeLessThanOrEqual(700)
    expect(w.h).toBeLessThanOrEqual(420)
    expect(clampRect({ x: 9999, y: 9999, w: 400, h: 300 }, { width: 700, height: 420 }).x).toBeLessThan(700)
  })
})

describe('cycling', () => {
  it('visits every window and goes back again', () => {
    let state = emptyDesk()
    for (const app of ['COMMAND', 'LOCATIONS', 'EVIDENCE'] as const) state = openApp(state, app, DESK)
    expect(state.focusedId).toBe(win(state, 'EVIDENCE').id)
    const seen = new Set<string>()
    for (let i = 0; i < 3; i++) { state = cycleFocus(state, 1); seen.add(state.focusedId!) }
    expect(seen.size).toBe(3)
    const back = cycleFocus(state, -1)
    expect(back.focusedId).not.toBe(state.focusedId)
  })
  it('does nothing with fewer than two windows', () => {
    const state = openApp(emptyDesk(), 'COMMAND', DESK)
    expect(cycleFocus(state, 1)).toBe(state)
  })
})

describe('persistence', () => {
  it('round-trips a layout', () => {
    let state = openApp(openApp(emptyDesk(), 'COMMAND', DESK), 'EVIDENCE', DESK)
    state = togglePin(state, win(state, 'EVIDENCE').id)
    state = setWindowPath(state, win(state, 'COMMAND').id, '/admin/teams/abc')
    const back = normalizeDesk(JSON.parse(serializeDesk(state)), DESK)!
    expect(back.windows.map(w => [w.app, w.pinned, w.path])).toEqual([
      ['COMMAND', false, '/admin/teams/abc'],
      ['EVIDENCE', true, '/admin/evidence-register'],
    ])
    expect(back.focusedId).toBe(state.focusedId)
  })

  it('refuses garbage rather than trusting it', () => {
    expect(normalizeDesk(null, DESK)).toBeNull()
    expect(normalizeDesk({ version: 2, windows: [] }, DESK)).toBeNull()
    const state = normalizeDesk({
      version: 1,
      windows: [
        { id: 'a', app: 'NOT_AN_APP', x: 1, y: 1, w: 500, h: 400 },
        { id: 'b', app: 'COMMAND', x: 'far', y: Infinity, w: -5, h: 'tall', path: 'https://evil.example/x' },
        { id: 'c', app: 'COMMAND', x: 5, y: 5, w: 500, h: 400 },
      ],
      focusedId: 'nope',
    }, DESK)!
    expect(state.windows).toHaveLength(1)
    expect(state.windows[0].path).toBe(APPS.COMMAND.path)
    expect(state.windows[0].w).toBeGreaterThanOrEqual(MIN_WINDOW.w)
    expect(state.focusedId).toBeNull()
  })

  it('the default layout is one large command centre', () => {
    const state = defaultDesk(DESK)
    expect(state.windows).toHaveLength(1)
    expect(state.windows[0].app).toBe('COMMAND')
    expect(state.windows[0].w).toBeGreaterThan(DESK.width * 0.6)
  })
})

describe('URL ownership', () => {
  it('maps admin URLs to their app', () => {
    expect(appForPath('/admin/dashboard')).toBe('COMMAND')
    expect(appForPath('/admin')).toBe('COMMAND')
    expect(appForPath('/admin/teams/42')).toBe('FIELD_UNITS')
    expect(appForPath('/admin/audit')).toBe('ACCESS_LOG')
    expect(appForPath('/admin/qa-simulator')).toBe('SIMULATOR')
    expect(appForPath('/admin/unknown')).toBeNull()
  })
})
