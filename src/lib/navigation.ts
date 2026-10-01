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
  path: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

type IconName = keyof typeof BureauIcons

function bureauIcon(name: IconName) {
  return BureauIcons[name] as ComponentType<SVGProps<SVGSVGElement>>
}

export const NAV_ITEMS: NavItem[] = [
  { path: ROUTES.PLAYER_GAME, label: 'Game', icon: bureauIcon('LayoutDashboard') },
  { path: ROUTES.PLAYER_EVIDENCE, label: 'Evidence', icon: bureauIcon('Package') },
  { path: ROUTES.PLAYER_INVENTORY, label: 'Inventory', icon: bureauIcon('Key') },
  { path: ROUTES.PLAYER_QR, label: 'QR', icon: bureauIcon('QrCode') },
  { path: ROUTES.PLAYER_LEADERBOARD, label: 'Ranking', icon: bureauIcon('Trophy') },
]

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