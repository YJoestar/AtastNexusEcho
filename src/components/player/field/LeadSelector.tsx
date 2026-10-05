import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { MapNodeEntry } from '@/hooks/useCaseLead'
import { ROUTES } from '@/app/config'

interface LeadSelectorProps {
  leads: MapNodeEntry[]
  onSelect?: (nodeId: string) => void
  disabled?: boolean
}

export function LeadSelector({ leads, onSelect, disabled }: LeadSelectorProps) {
  if (leads.length === 0) return null

  return (
    <section aria-label="Available leads" className="space-y-2">
      <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-nexus-textSubtle">AVAILABLE LEADS</h2>
      <div className="space-y-1">
        {leads.map(lead => (
          <Link
            key={lead.code}
            to={ROUTES.PLAYER_NODE.replace(':nodeId', lead.code)}
            onClick={() => onSelect?.(lead.code)}
            className={cn(
              'flex min-h-12 items-center justify-between border border-nexus-borderSubtle px-3 font-mono text-xs uppercase tracking-[0.12em] text-nexus-textMuted transition-colors',
              'active:bg-nexus-surfaceElevated focus-visible:outline-none',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <span className="truncate">{lead.title}</span>
            <span className="ml-2 shrink-0 text-[0.62rem] text-nexus-textSubtle">STAGE {lead.stage}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
