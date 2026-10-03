/**
 * NEXUS ECHO — Workstation
 *
 * The administrator's computer inside the fiction: a system bar, a desktop of
 * module windows, and a task strip. Nothing here is decoration — each status
 * reads real state, each window runs a real module, and every message is a real
 * change. The old sidebar layout is gone; every old screen is still here.
 *
 * Authentication is unchanged: this component is only mounted behind
 * RequireAdmin.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/app/config'
import { useApp } from '@/app/providers'
import { useAdmin } from '@/app/providers/AdminProvider'
import { CRTOverlay } from '@/components/visual/CRTOverlay'
import { GlitchLayer } from '@/components/visual/GlitchLayer'
import { VisualEnvironmentProvider } from '@/components/visual/VisualEnvironment'
import { useBureau, useBureauRealtime } from '@/hooks/useBureau'
import { adminAPI, type EvidenceLabCatalog, type LocationEntry } from '@/lib/admin'
import { showcaseCatalog, showcaseEnabled, SHOWCASE_CASE } from '@/lib/evidence/showcaseCatalog'
import { levelFromCasePhase } from '@/lib/narrative'
import { cn } from '@/lib/utils'
import { NexusMark } from '@/components/brand/NexusMark'
import { APPS, APP_ORDER, appForPath, type AppId } from './apps'
import { BootSequence } from './BootSequence'
import { bootAlreadyShown } from './bootState'
import { Glyph } from './glyphs'
import { diffSnapshots, withIds, type SystemMessage } from './messages'
import type { QueryResult } from './query'
import { SearchPalette } from './SearchPalette'
import { SurveillanceApp } from './SurveillanceApp'
import { TerminalApp } from './TerminalApp'
import type { TerminalContext } from './terminal'
import { WindowBody } from './WindowBody'
import { WorkWindow } from './WorkWindow'
import {
  bringToFront,
  clampAll,
  closeWindow,
  cycleFocus,
  defaultDesk,
  minimizeWindow,
  moveWindow,
  normalizeDesk,
  openApp,
  resizeWindow,
  serializeDesk,
  setWindowPath,
  toggleMaximize,
  togglePin,
  type DeskSize,
  type DeskState,
  type Rect,
} from './windowManager'

const COMPACT_BELOW = 900
const STORAGE_PREFIX = 'nexus_workstation_v1:'

function storageKey(adminId: string | undefined): string {
  return `${STORAGE_PREFIX}${adminId || 'operator'}`
}

function readStored(key: string, desk: DeskSize): DeskState | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? normalizeDesk(JSON.parse(raw) as unknown, desk) : null
  } catch {
    return null
  }
}

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/** One window's content. Memoised so dragging a window never re-renders its screen. */
const WindowHost = memo(function WindowHost({
  id, app, path, getContext, onPath, onForeign,
}: {
  id: string
  app: AppId
  path: string
  getContext: () => TerminalContext
  onPath: (id: string, path: string) => void
  onForeign: (app: AppId, path: string) => void
}) {
  const reportPath = useCallback((next: string) => onPath(id, next), [id, onPath])
  if (app === 'TERMINAL') return <TerminalApp context={getContext} />
  if (app === 'SURVEILLANCE') return <SurveillanceApp />
  return <WindowBody app={app} path={path} onPath={reportPath} onForeign={onForeign} />
})

export function Workstation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { admin, logout } = useAdmin()
  const { connectionInfo, isConnected } = useBureauRealtime()
  const { gameState } = useApp()
  const { teams, fetchTeams, BUREAU_REFRESH_INTERVAL } = useBureau()

  const deskRef = useRef<HTMLDivElement>(null)
  const [desk, setDesk] = useState<DeskSize>({ width: 0, height: 0 })
  const [layout, setLayout] = useState<DeskState | null>(null)
  const [booting, setBooting] = useState(() => !bootAlreadyShown())
  const [time, setTime] = useState(clock)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [teamsReady, setTeamsReady] = useState(false)
  const [messages, setMessages] = useState<SystemMessage[]>([])
  const [lastEvent, setLastEvent] = useState<{ at: string; type: string } | null | 'unavailable'>(null)
  const [searchData, setSearchData] = useState<{ locations: LocationEntry[]; evidence: EvidenceLabCatalog['evidence'] } | null>(null)

  const key = storageKey(admin?.id)
  const compact = desk.width > 0 && desk.width < COMPACT_BELOW
  const deskRect = useRef(desk)
  deskRect.current = desk
  const initialPath = useRef(location.pathname)
  const restoredCount = useRef(0)

  /* ───────────────────────── desk measurement ───────────────────────── */

  useEffect(() => {
    const el = deskRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setDesk(current => (current.width === Math.round(rect.width) && current.height === Math.round(rect.height)
        ? current
        : { width: Math.round(rect.width), height: Math.round(rect.height) }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /* ───────────────────── initial layout: restore, then honour the URL ───────────────────── */

  useEffect(() => {
    if (layout || desk.width === 0) return
    let state = readStored(key, desk)
    restoredCount.current = state?.windows.length ?? 0
    if (!state) state = defaultDesk(desk, appForPath(initialPath.current) ?? 'COMMAND', initialPath.current)
    const owner = appForPath(initialPath.current)
    // A deep link (/admin/teams/42) always wins over the remembered focus.
    if (owner && initialPath.current !== '/admin' && initialPath.current !== ROUTES.ADMIN_DASHBOARD) {
      state = openApp(state, owner, desk, { path: initialPath.current })
    } else if (owner) {
      state = openApp(state, owner, desk)
    }
    setLayout(state)
  }, [desk, key, layout])

  useEffect(() => {
    if (!layout) return
    const timer = setTimeout(() => {
      try { window.localStorage.setItem(key, serializeDesk(layout)) } catch { /* optional */ }
    }, 300)
    return () => clearTimeout(timer)
  }, [layout, key])

  useEffect(() => {
    if (!layout || desk.width === 0) return
    setLayout(current => (current ? clampAll(current, desk) : current))
    // Re-fit only when the desk itself changes size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desk.width, desk.height])

  // The address bar always names the focused module's screen.
  const focusedWindow = layout?.windows.find(window => window.id === layout.focusedId) ?? null
  useEffect(() => {
    const path = focusedWindow?.path
    if (path && window.location.pathname !== path) window.history.replaceState(null, '', path)
  }, [focusedWindow?.path, focusedWindow?.id])

  /* ───────────────────────── real data ───────────────────────── */

  useEffect(() => {
    const timer = setInterval(() => setTime(clock()), 1000)
    return () => clearInterval(timer)
  }, [])

  const refreshEvents = useCallback(async () => {
    try {
      const events = await adminAPI.getGameEvents(1)
      setLastEvent(events[0] ? { at: events[0].timestamp, type: events[0].type } : null)
    } catch {
      setLastEvent('unavailable')
    }
  }, [])

  useEffect(() => {
    if (!admin) return
    void fetchTeams().then(() => setTeamsReady(true))
    void refreshEvents()
    const interval = window.setInterval(() => { void fetchTeams(); void refreshEvents() }, BUREAU_REFRESH_INTERVAL)
    return () => window.clearInterval(interval)
  }, [admin, fetchTeams, refreshEvents, BUREAU_REFRESH_INTERVAL])

  // Messages: only ever the difference between two real snapshots.
  const snapshot = useRef<ReturnType<typeof makeSnapshot> | null>(null)
  useEffect(() => {
    // Until the first read lands there is nothing real to compare against, and
    // "unit registered" for every unit on load would be a false message.
    if (!teamsReady) return
    const next = makeSnapshot(isConnected, teams)
    const fresh = withIds(diffSnapshots(snapshot.current, next))
    snapshot.current = next
    if (fresh.length === 0) return
    setMessages(current => [...current, ...fresh].slice(-4))
    const ids = new Set(fresh.map(message => message.id))
    const timer = setTimeout(() => setMessages(current => current.filter(message => !ids.has(message.id))), 9000)
    return () => clearTimeout(timer)
  }, [teams, isConnected, teamsReady])

  const narrativeLevel = useMemo(() => levelFromCasePhase(gameState?.currentPhase), [gameState?.currentPhase])

  /* ───────────────────────── window operations ───────────────────────── */

  const edit = useCallback((update: (state: DeskState, size: DeskSize) => DeskState) => {
    setLayout(current => (current ? update(current, deskRect.current) : current))
  }, [])

  const open = useCallback((app: AppId, path?: string) => {
    edit((state, size) => openApp(state, app, size, { path }))
    setMenuOpen(false)
  }, [edit])
  const focus = useCallback((id: string) => edit(state => bringToFront(state, id)), [edit])
  const close = useCallback((id: string) => edit(state => closeWindow(state, id)), [edit])
  const minimize = useCallback((id: string) => edit(state => minimizeWindow(state, id)), [edit])
  const maximize = useCallback((id: string) => edit((state, size) => toggleMaximize(state, id, size)), [edit])
  const pin = useCallback((id: string) => edit(state => togglePin(state, id)), [edit])
  const setRect = useCallback((id: string, rect: Rect) => edit((state, size) => {
    const moved = moveWindow(state, id, rect.x, rect.y, size)
    return resizeWindow(moved, id, rect, size)
  }), [edit])
  const setPath = useCallback((id: string, path: string) => edit(state => setWindowPath(state, id, path)), [edit])
  const reset = useCallback(() => {
    setLayout(defaultDesk(deskRect.current))
    setMenuOpen(false)
    try { window.localStorage.removeItem(key) } catch { /* optional */ }
  }, [key])

  const openTerminal = useCallback(() => {
    edit((state, size) => {
      const terminal = state.windows.find(window => window.app === 'TERMINAL')
      if (terminal && state.focusedId === terminal.id && !terminal.minimized) return minimizeWindow(state, terminal.id)
      return openApp(state, 'TERMINAL', size)
    })
  }, [edit])

  /* ───────────────────────── terminal & search context ───────────────────────── */

  const live = useRef({ isConnected, lastSync: connectionInfo.lastSync, admin, layout, paletteOpen: false, menuOpen: false })
  live.current = { isConnected, lastSync: connectionInfo.lastSync, admin, layout, paletteOpen, menuOpen }

  const getContext = useCallback((): TerminalContext => ({
    teams: () => adminAPI.listTeams(),
    gameState: () => adminAPI.getGameState(),
    audit: limit => adminAPI.getAuditLog(limit),
    events: limit => adminAPI.getGameEvents(limit),
    locations: () => adminAPI.listLocations(),
    evidence: loadEvidence,
    connection: { online: live.current.isConnected, lastSync: live.current.lastSync },
    operator: { name: live.current.admin?.username ?? 'OPERATOR', role: live.current.admin?.role ?? 'UNCLASSIFIED' },
    now: () => new Date(),
    openApp: open,
    openApps: () => (live.current.layout?.windows ?? []).map(window => window.app),
  }), [open])

  useEffect(() => {
    if (!paletteOpen || searchData) return
    let cancelled = false
    void Promise.allSettled([adminAPI.listLocations(), loadEvidence()]).then(([locations, evidence]) => {
      if (cancelled) return
      setSearchData({
        locations: locations.status === 'fulfilled' ? locations.value : [],
        evidence: evidence.status === 'fulfilled' ? evidence.value : [],
      })
    })
    return () => { cancelled = true }
  }, [paletteOpen, searchData])

  const openResult = useCallback((result: QueryResult) => {
    setPaletteOpen(false)
    const target = result.target
    open(target.app, target.kind === 'UNIT' ? target.path : undefined)
  }, [open])

  /* ───────────────────────── keyboard ───────────────────────── */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey
      if (meta && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(value => !value); return }
      if (event.ctrlKey && (event.key === '`' || event.code === 'Backquote')) { event.preventDefault(); openTerminal(); return }
      // `code`, not `key`: Alt changes the character on several layouts.
      if (event.altKey && (event.code === 'BracketLeft' || event.code === 'BracketRight')) {
        event.preventDefault()
        edit(state => cycleFocus(state, event.code === 'BracketRight' ? 1 : -1))
        return
      }
      if (event.key === 'Escape' && !live.current.paletteOpen) {
        if (live.current.menuOpen) { setMenuOpen(false); return }
        const active = document.activeElement as HTMLElement | null
        // Escape belongs to whatever has the keyboard; only an idle desk closes a window.
        const idle = !active || active === document.body || !!active.closest('[data-window-id] > header') || active.matches('[data-window-id]')
        if (idle && live.current.layout?.focusedId) edit(state => (state.focusedId ? closeWindow(state, state.focusedId) : state))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [edit, openTerminal])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.ADMIN_LOGIN, { replace: true })
  }

  const activeUnits = teams.filter(team => team.status === 'ACTIVE').length
  const personnel = teams.reduce((sum, team) => sum + (team.playerCount ?? 0), 0)
  const windows = layout?.windows ?? []

  return (
    <VisualEnvironmentProvider profile="BUREAU_PC" horrorLevel={narrativeLevel} signalStrength={connectionInfo.signalStrength} isConnected={isConnected}>
      <div data-horror={narrativeLevel} data-workstation className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-[#060607] font-mono text-nexus-text antialiased">
        {/* ── system bar ── */}
        <header className="relative z-[60] flex h-9 shrink-0 items-center justify-between gap-4 border-b border-nexus-border bg-nexus-surfaceElevated px-3 text-[0.58rem] uppercase tracking-[0.14em]">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex shrink-0 items-center gap-2 font-bold text-nexus-text"><NexusMark size={20} className="text-nexus-text" />NEXUS ECHO // CONTINUITY RECORDS SYSTEM</span>
            <span className="hidden text-nexus-textSubtle xl:inline">{SHOWCASE_CASE.build}</span>
            <span className="hidden border border-nexus-border px-1.5 text-nexus-textMuted lg:inline">CASE 037 · {(gameState?.status ?? 'STATE UNCONFIRMED').toString()}</span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-nexus-textMuted lg:inline" title="Access level">{admin?.username ?? 'OPERATOR'} · {admin?.role ?? 'UNCLASSIFIED'}</span>
            <span className={cn('hidden items-center gap-1.5 font-semibold md:flex', isConnected ? 'text-nexus-accent' : 'text-nexus-danger')}>
              <span className={cn('h-1.5 w-1.5', isConnected ? 'bg-nexus-accent' : 'bg-nexus-danger')} aria-hidden="true" />NETWORK {isConnected ? 'AVAILABLE' : 'OFFLINE'}
            </span>
            <button type="button" onClick={() => setPaletteOpen(true)} className="min-h-7 border border-nexus-border px-2 text-nexus-textMuted hover:border-nexus-accent hover:text-nexus-accent">QUERY ARCHIVE <span className="text-nexus-textSubtle">Ctrl K</span></button>
            <span className="tabular-nums text-nexus-accent" aria-label="Station time">{time}</span>
            <button type="button" onClick={handleLogout} className="min-h-7 border border-transparent px-2 text-nexus-textSubtle hover:border-nexus-danger hover:text-nexus-danger">TERMINATE SESSION</button>
          </div>
        </header>

        {/* ── desktop ── */}
        <div ref={deskRef} className="relative min-h-0 flex-1 overflow-hidden" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px' }}>
          {!compact && (
            <nav aria-label="Modules" className="absolute left-2 top-3 z-0 flex w-[84px] flex-col gap-1">
              {APP_ORDER.map(id => (
                <button key={id} type="button" onClick={() => open(id)} className="group flex flex-col items-center gap-1 border border-transparent px-1 py-1.5 text-nexus-textMuted hover:border-nexus-border hover:bg-black/30 hover:text-nexus-text focus-visible:border-nexus-accent">
                  <Glyph name={APPS[id].glyph} size={22} />
                  <span className="w-full text-center text-[0.5rem] uppercase leading-tight tracking-[0.06em]">{APPS[id].title}</span>
                </button>
              ))}
            </nav>
          )}

          {!layout && <p className="p-6 text-[0.7rem] uppercase tracking-[0.16em] text-nexus-textSubtle">MOUNTING WORKSTATION…</p>}

          {layout && windows.map(win => (
            <WorkWindow
              key={win.id}
              window={win}
              desk={desk}
              focused={layout.focusedId === win.id}
              compact={compact}
              onFocus={focus}
              onRect={setRect}
              onClose={close}
              onMinimize={minimize}
              onMaximize={maximize}
              onPin={pin}
            >
              <WindowHost id={win.id} app={win.app} path={win.path} getContext={getContext} onPath={setPath} onForeign={open} />
            </WorkWindow>
          ))}

          {layout && windows.every(win => win.minimized) && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.65rem] uppercase tracking-[0.2em] text-nexus-textSubtle">
              {windows.length === 0 ? 'NO MODULE OPEN — USE THE MODULE LIST, OR CTRL K' : 'ALL MODULES MINIMISED'}
            </p>
          )}

          <div className="pointer-events-none absolute bottom-3 right-3 z-[70] flex w-80 flex-col items-stretch gap-1" role="status" aria-live="polite">
            {messages.map(message => (
              <p key={message.id} className={cn('pointer-events-auto border-l-2 bg-black/80 px-3 py-1.5 text-[0.62rem] tracking-[0.06em]', message.tone === 'warn' ? 'border-nexus-warning text-nexus-warning' : message.tone === 'ok' ? 'border-nexus-accent text-nexus-text' : 'border-nexus-border text-nexus-textMuted')}>
                <span className="mr-2 text-nexus-textSubtle">[{message.tag}]</span>{message.text}
              </p>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 z-[80]"><CRTOverlay /></div>
          <GlitchLayer />
        </div>

        {/* ── task strip ── */}
        <footer className="relative z-[60] flex h-9 shrink-0 items-center gap-2 border-t border-nexus-border bg-nexus-surfaceElevated px-2 text-[0.56rem] uppercase tracking-[0.12em]">
          <div className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} className={cn('flex min-h-7 items-center gap-2 border px-2 font-bold', menuOpen ? 'border-nexus-accent text-nexus-accent' : 'border-nexus-border text-nexus-text hover:border-nexus-accent')}>
              <span aria-hidden="true">▤</span> MODULES
            </button>
            {menuOpen && (
              <ul role="menu" className="absolute bottom-9 left-0 z-[90] w-72 border border-nexus-accent/50 bg-nexus-surface py-1 shadow-[0_-12px_36px_rgba(0,0,0,0.7)]">
                {APP_ORDER.map(id => (
                  <li key={id} role="none">
                    <button type="button" role="menuitem" onClick={() => open(id)} className="grid w-full grid-cols-[1.5rem_3rem_1fr] items-center gap-2 px-3 py-1.5 text-left hover:bg-nexus-surfaceElevated focus-visible:bg-nexus-surfaceElevated">
                      <Glyph name={APPS[id].glyph} size={16} />
                      <span className="text-nexus-textSubtle">{APPS[id].module}</span>
                      <span className="truncate text-nexus-text">{APPS[id].title}</span>
                    </button>
                  </li>
                ))}
                <li role="none" className="mt-1 border-t border-nexus-borderSubtle">
                  <button type="button" role="menuitem" onClick={reset} className="w-full px-3 py-1.5 text-left text-nexus-textMuted hover:text-nexus-warning">RESET LAYOUT</button>
                </li>
              </ul>
            )}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="toolbar" aria-label="Open modules">
            {windows.map(win => (
              <button
                key={win.id}
                type="button"
                onClick={() => (layout?.focusedId === win.id && !win.minimized ? minimize(win.id) : focus(win.id))}
                aria-pressed={layout?.focusedId === win.id && !win.minimized}
                className={cn('flex min-h-7 shrink-0 items-center gap-1.5 border px-2', layout?.focusedId === win.id && !win.minimized ? 'border-nexus-accent text-nexus-accent' : win.minimized ? 'border-nexus-borderSubtle text-nexus-textSubtle' : 'border-nexus-border text-nexus-textMuted hover:text-nexus-text')}
              >
                <Glyph name={APPS[win.app].glyph} size={13} />{APPS[win.app].title}{win.pinned && <span aria-label="pinned">◆</span>}
              </button>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-4 text-nexus-textSubtle xl:flex">
            <span>FIELD UNITS {activeUnits} ACTIVE / {teams.length}</span>
            <span>PERSONNEL {personnel}</span>
            <span className={lastEvent === 'unavailable' ? 'text-nexus-warning' : undefined}>
              {lastEvent === 'unavailable' ? 'EVENTS UNAVAILABLE' : lastEvent ? `LAST EVENT ${new Date(lastEvent.at).toTimeString().slice(0, 8)} ${lastEvent.type}` : 'NO FIELD EVENTS'}
            </span>
          </div>
          <button type="button" onClick={openTerminal} className="min-h-7 shrink-0 border border-nexus-border px-2 text-nexus-textMuted hover:border-nexus-accent hover:text-nexus-accent" title="Terminal (Ctrl+`)">NEXUS://</button>
        </footer>

        {paletteOpen && <SearchPalette data={{ teams, locations: searchData?.locations ?? [], evidence: searchData?.evidence ?? [] }} loading={!searchData} onClose={() => setPaletteOpen(false)} onOpen={openResult} />}
        {booting && (
          <BootSequence
            facts={{ operator: admin?.username ?? 'OPERATOR', role: admin?.role ?? 'UNCLASSIFIED', online: isConnected, units: teams.length > 0 || !isConnected ? teams.length : null, windows: restoredCount.current }}
            onDone={() => setBooting(false)}
          />
        )}
      </div>
    </VisualEnvironmentProvider>
  )
}

function makeSnapshot(online: boolean, teams: Array<{ code: string; status: string; currentNodeCode: string | null }>) {
  return { online, units: teams.map(team => ({ code: team.code, status: team.status, node: team.currentNodeCode })) }
}

async function loadEvidence(): Promise<EvidenceLabCatalog['evidence']> {
  const catalog = await adminAPI.listEvidenceLabCatalog().catch(error => {
    if (!showcaseEnabled()) throw error
    return { evidence: [] as EvidenceLabCatalog['evidence'] }
  })
  if (!showcaseEnabled()) return catalog.evidence
  const known = new Set(catalog.evidence.map(item => item.code))
  const extra = showcaseCatalog().filter(item => !known.has(item.code)).map(item => ({
    id: item.id, code: item.code, title: item.title, description: item.description, type: item.type,
    classification: 'SHOWCASE', condition: item.condition?.toString(), content: item.content, metadata: {},
  }))
  return [...catalog.evidence, ...extra]
}
