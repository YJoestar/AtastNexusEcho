/**
 * NEXUS ECHO — Bureau: EvidenceBoard
 *
 * The field investigation surface. Evidence items are pinned to a ruled
 * surface as EvidenceFrame cards arranged in a responsive grid. Related
 * items carry a subtle link indicator — a small marker showing they
 * connect to another pin on the board.
 *
 * Deliberately low-fidelity: a ruled surface with pinned documents.
 * No drag-and-drop theatre, no neon connectors, no parallax.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EvidenceFrame } from './Evidence'

export interface EvidencePin {
  id: string
  title: string
  reference?: string
  seed?: string
  linkTo?: string[]
  children?: ReactNode
}

export interface EvidenceLink {
  from: string
  to: string
  label?: string
}

const PIN_LINK_SET = new Set<string>()

export function EvidenceBoard({
  pins,
  links = [],
  columns = 'repeat(auto-fill, minmax(200px, 1fr))',
  className,
  pinClassName,
}: {
  pins: EvidencePin[]
  links?: EvidenceLink[]
  columns?: string
  className?: string
  pinClassName?: string
}) {
  const pinById = new Map(pins.map(p => [p.id, p]))

  const linkMap = new Map<string, EvidenceLink[]>()
  for (const link of links) {
    if (pinById.has(link.from) && pinById.has(link.to)) {
      const existing = linkMap.get(link.from) ?? []
      existing.push(link)
      linkMap.set(link.from, existing)
    }
  }

  return (
    <div
      className={cn(
        'evidence-board relative overflow-auto border border-nexus-border bg-nexus-surfaceElevated p-6',
        className,
      )}
    >
      {pins.length === 0 ? (
        <div className="evidence-board-empty py-12 text-center text-nexus-textSubtle">
          <p className="font-mono text-[0.875rem] uppercase tracking-[0.16em]">
            No evidence collected
          </p>
        </div>
      ) : (
        <div
          className="evidence-board-grid grid gap-4"
          style={{ gridTemplateColumns: columns }}
        >
          {pins.map(pin => {
            const pinLinks = linkMap.get(pin.id) ?? []
            const connected = pinLinks.length > 0

            return (
              <div
                key={pin.id}
                data-pin-id={pin.id}
                className={cn(
                  'evidence-board-pin relative',
                  pinClassName,
                  connected && 'connected',
                )}
              >
                <EvidenceFrame
                  seed={pin.seed ?? pin.id}
                  reference={pin.reference}
                  title={pin.title}
                  className="w-full"
                  footer={
                    connected && (
                      <div className="flex items-center gap-1.5">
                        <span className="evidence-link-marker font-mono text-[0.75rem] text-nexus-accent">
                          ⓧ
                        </span>
                        <span className="font-mono text-[0.875rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
                          {pinLinks.length} connection{pinLinks.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )
                  }
                >
                  {pin.children}
                </EvidenceFrame>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { PIN_LINK_SET }
