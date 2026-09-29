/**
 * NEXUS — Discovery Toast
 * Short, non-blocking cinematic notification for important discoveries.
 * Shows messages like "NEW EVIDENCE" or "ARCHIVAL FRAGMENT RECOVERED".
 */

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DiscoveryType } from '@/hooks/useDiscoveryToast'

const TYPE_CONFIG: Record<DiscoveryType, { icon: string; color: string }> = {
  evidence: { icon: '📄', color: 'text-cyan-300' },
  fragment: { icon: '🧩', color: 'text-amber-300' },
  item: { icon: '📦', color: 'text-indigo-300' },
  location: { icon: '📍', color: 'text-nexus-accent' },
  voice: { icon: '🔊', color: 'text-emerald-300' },
  general: { icon: '📡', color: 'text-nexus-warning' },
}

interface DiscoveryToastProps {
  id: string
  message: string
  type: DiscoveryType
  onClose: (id: string) => void
}

export function DiscoveryToast({
  id,
  message,
  type,
  onClose,
}: DiscoveryToastProps) {
  const config = TYPE_CONFIG[type]

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl border text-sm font-medium',
          'animate-slide-down shadow-panel',
          'bg-nexus-surfaceElevated border-nexus-accent/30',
          config.color,
        )}
      >
        <span className="text-2xl" aria-hidden="true">
          {config.icon}
        </span>
        <span className="flex-1">{message}</span>
        <button
          onClick={() => onClose(id)}
          className="p-1 rounded-lg text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surface transition-colors touch-target-primary"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function DiscoveryToastContainer({
  toasts,
  onRemove,
}: {
  toasts: { id: string; message: string; type: DiscoveryType }[]
  onRemove: (id: string) => void
}) {
  return (
    <>
      {toasts.map(toast => (
        <DiscoveryToast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={onRemove}
        />
      ))}
    </>
  )
}
