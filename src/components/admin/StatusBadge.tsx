/**
 * NEXUS — Status Badge
 *
 * Unified badge component for team statuses, game phases, etc.
 * Pulls from STATUS_COLORS design system.
 */

import { cn } from '@/lib/utils'
import { STATUS_COLORS, type StatusColorKey } from '@/app/config'

export type BadgeVariant = StatusColorKey | 'default' | 'outline'

const variantStyles: Record<string, string> = {
  danger: 'bg-nexus-dangerBg text-nexus-danger border-nexus-danger/30',
  warning: 'bg-nexus-warningBg text-nexus-warning border-nexus-warning/30',
  success: 'bg-nexus-accentBg text-nexus-accent border-nexus-accent/30',
  info: 'bg-nexus-infoBg text-nexus-info border-nexus-info/30',
  accent: 'bg-nexus-accentBg text-nexus-accent border-nexus-accent/30',
  muted: 'bg-nexus-borderSubtle/30 text-nexus-textMuted border-nexus-borderSubtle',
  outline: 'border border-nexus-border text-nexus-textMuted bg-transparent',
  default: 'bg-nexus-surfaceElevated text-nexus-text border-nexus-border',
}

export function StatusBadge({
  children,
  variant = 'default',
  className,
  icon,
  dot = false,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  icon?: React.ReactNode
  dot?: boolean
}) {
  const style = variantStyles[variant] ?? variantStyles.default
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.75 text-xs border',
      dot && 'pl-2',
      style,
      className,
    )}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {icon && <span className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

export function TeamStatusBadge({
  status,
  showDot = true,
  className,
}: {
  status: string
  showDot?: boolean
  className?: string
}) {
  const statusKey = status.toLowerCase() as StatusColorKey
  const variant = (statusKey in STATUS_COLORS ? statusKey : 'outline') as BadgeVariant

  return (
    <StatusBadge variant={variant} dot={showDot} className={className}>
      {status}
    </StatusBadge>
  )
}

export function TeamPhaseBadge({
  phase,
  className,
}: {
  phase: string
  className?: string
}) {
  const variant = (phase.toLowerCase() as StatusColorKey) in STATUS_COLORS
    ? (phase.toLowerCase() as BadgeVariant)
    : 'outline'

  return (
    <StatusBadge variant={variant} className={className}>
      {phase}
    </StatusBadge>
  )
}
