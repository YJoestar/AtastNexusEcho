/**
 * NEXUS ECHO — Window router
 *
 * React Router refuses to nest one <Router> inside another, but each workstation
 * window needs its own location so a team dossier can open in one window while
 * the ledger stays put in another. This provides the same three contexts the
 * real <Router> provides, backed by a small in-memory history, which is all
 * <Routes>, <Link>, useNavigate and friends need.
 */
import { useMemo, useState, type ReactNode } from 'react'
import {
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_RouteContext as RouteContext,
  type Location,
  type To,
} from 'react-router-dom'

interface History {
  stack: string[]
  index: number
}

function toPath(to: To): string {
  if (typeof to === 'string') return to
  return `${to.pathname ?? '/'}${to.search ?? ''}${to.hash ?? ''}`
}

function toLocation(path: string, key: string): Location {
  const hashAt = path.indexOf('#')
  const searchAt = path.indexOf('?')
  const end = (a: number) => (a === -1 ? path.length : a)
  const pathname = path.slice(0, Math.min(end(hashAt), end(searchAt))) || '/'
  const search = searchAt === -1 ? '' : path.slice(searchAt, end(hashAt) > searchAt ? hashAt : path.length)
  const hash = hashAt === -1 ? '' : path.slice(hashAt)
  return { pathname, search, hash, state: null, key }
}

const ROUTE_ROOT = { outlet: null, matches: [], isDataRoute: false }

export function WindowRouter({ initial, children }: { initial: string; children: ReactNode }) {
  const [history, setHistory] = useState<History>({ stack: [initial], index: 0 })

  const navigator = useMemo(() => ({
    createHref: (to: To) => toPath(to),
    go: (delta: number) => setHistory(current => ({ ...current, index: Math.max(0, Math.min(current.stack.length - 1, current.index + delta)) })),
    push: (to: To) => setHistory(current => ({ stack: [...current.stack.slice(0, current.index + 1), toPath(to)], index: current.index + 1 })),
    replace: (to: To) => setHistory(current => ({ ...current, stack: current.stack.map((entry, i) => (i === current.index ? toPath(to) : entry)) })),
  }), [])

  const location = useMemo(
    () => toLocation(history.stack[history.index], `${history.index}:${history.stack[history.index]}`),
    [history],
  )

  const navigation = useMemo(() => ({ navigator, static: false, basename: '/', future: { v7_relativeSplatPath: false } }), [navigator])
  const locationValue = useMemo(() => ({ location, navigationType: 'POP' as const }), [location])

  return (
    <NavigationContext.Provider value={navigation as never}>
      <LocationContext.Provider value={locationValue as never}>
        <RouteContext.Provider value={ROUTE_ROOT as never}>{children}</RouteContext.Provider>
      </LocationContext.Provider>
    </NavigationContext.Provider>
  )
}
