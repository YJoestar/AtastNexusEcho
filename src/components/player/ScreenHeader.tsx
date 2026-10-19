/**
 * NEXUS ECHO — Player: Screen Header
 *
 * The one back-header for handset screens. Every sub-screen (node, evidence,
 * inventory, scanner, navigation, leaderboard, final protocol) opens with the
 * same gesture: a back control to the field hub, an optional eyebrow row for
 * state markers, the screen title, an optional subtitle, and an optional
 * actions slot on the right.
 *
 * Before this existed each screen hand-rolled its own variant with drifting
 * gaps, hover fills and aria-labels (MOBILE_UI_UX_AUDIT #12); this component
 * is the single source for that pattern.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { BureauIcons } from '@/components/bureau'

interface ScreenHeaderProps {
  /** Destination of the back control. Pass `null` for a header with no back control. */
  backTo?: string | null
  /** Accessible name of the back control. */
  backLabel?: string
  /** Row above the title — state markers, node codes, status lines. */
  eyebrow?: ReactNode
  title: ReactNode
  /** Extra classes for the title (screens that keep a smaller register title). */
  titleClassName?: string
  /** Rendered under the title; pass the screen's own styled element. */
  subtitle?: ReactNode
  /** Right-hand controls: refresh, cross-links, counters. */
  actions?: ReactNode
  className?: string
}

export function ScreenHeader({
  backTo = ROUTES.PLAYER_GAME,
  backLabel = 'RETURN TO FIELD',
  eyebrow,
  title,
  titleClassName,
  subtitle,
  actions,
  className,
}: ScreenHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {backTo && (
        <Link
          to={backTo}
          aria-label={backLabel}
          className="shrink-0 touch-target-primary border border-nexus-borderSubtle p-2 text-nexus-textMuted transition-colors duration-fast hover:bg-nexus-surfaceElevated hover:text-nexus-text"
        >
          <BureauIcons.Back className="bureau-icon w-5 h-5" aria-hidden="true" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow}
        <h1 className={cn('heading-3 truncate', titleClassName)}>{title}</h1>
        {subtitle}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
