/**
 * NEXUS — Player navigation map
 *
 * The five core gameplay destinations, and the rule for which screens the
 * bottom bar belongs on.
 *
 * The bar is scoped to these five routes on purpose. Node, Navigation,
 * Notifications, Final and Complete are focused, full-attention surfaces that
 * carry their own back control; showing a five-item bar there would cover
 * content and highlight nothing, which reads as a broken route rather than as a
 * detail screen.
 */

import { BureauIcons } from '@/components/bureau'
import type { ComponentType, SVGProps } from 'react'
import { ROUTES } from '@/app/config'

export interface NavItem {
  /** Stable identity: two destinations may share a route (Evidence / Board). */
  id: 'CASE' | 'EVIDENCE' | 'BOARD' | 'SCAN' | 'COMMS' | 'LOG'
  path: string
  /** Query string that selects the destination within a shared route. */
  search?: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

type IconName = keyof typeof BureauIcons

function bureauIcon(name: IconName) {
  return BureauIcons[name] as ComponentType<SVGProps<SVGSVGElement>>
}

/**
 * The five investigation spaces of the field device. Inventory, the site map and
 * the field record are reached from the case itself; they are references, not
 * places a team works from.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'CASE', path: ROUTES.PLAYER_GAME, label: 'Case', icon: bureauIcon('Case') },
  { id: 'EVIDENCE', path: ROUTES.PLAYER_EVIDENCE, label: 'Evidence', icon: bureauIcon('Evidence') },
  { id: 'BOARD', path: ROUTES.PLAYER_EVIDENCE, search: '?view=table', label: 'Board', icon: bureauIcon('Board') },
  { id: 'SCAN', path: ROUTES.PLAYER_QR, label: 'Scan', icon: bureauIcon('Scan') },
  { id: 'COMMS', path: ROUTES.PLAYER_NOTIFICATIONS, label: 'Comms', icon: bureauIcon('Comms') },
  { id: 'LOG', path: ROUTES.PLAYER_FIELD_LOG, label: 'Log', icon: bureauIcon('File') },
]

/** Which destination a location belongs to. Evidence and Board share a route. */
export function navItemFor(pathname: string, search = ''): NavItem | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const onRoute = NAV_ITEMS.filter(item => item.path === normalized)
  if (onRoute.length === 0) return null
  if (onRoute.length === 1) return onRoute[0]
  const view = new URLSearchParams(search).get('view')
  return onRoute.find(item => item.search && new URLSearchParams(item.search).get('view') === view) ?? onRoute[0]
}

const NAV_PATHS = NAV_ITEMS.map(item => item.path)

/**
 * The nav destination a pathname belongs to, or null when it belongs to none.
 *
 * Normalises a trailing slash and matches exactly, so a subpage such as
 * /player/game/node/P01 resolves to null rather than silently claiming to be
 * the Game tab.
 */
export function navDestinationFor(pathname: string): string | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return NAV_PATHS.find(path => path === normalized) ?? null
}

/** True when the bottom bar should render for this pathname. */
export function shouldRenderBottomNav(pathname: string): boolean {
  return navDestinationFor(pathname) !== null
}