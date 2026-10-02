import { memo, type CSSProperties } from 'react'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  edgePoint,
  percentToWorld,
  type Point,
} from '@/lib/boardGeometry'
import type { BoardPlacement, EvidenceHypothesis } from '@/lib/investigationWorkspace'
import { LINK_STATUS_STYLE } from './linkStyle'

interface BoardLinksProps {
  links: EvidenceHypothesis[]
  placements: Record<string, BoardPlacement>
  /** Live drag position, so lines follow a card that is being moved. */
  preview: { id: string; x: number; y: number } | null
  selectedLinkId: string | null
  freshLinkId: string | null
  onSelect: (linkId: string) => void
}

function resolve(
  id: string,
  placements: Record<string, BoardPlacement>,
  preview: BoardLinksProps['preview'],
): Point | null {
  const placement = placements[id]
  if (!placement) return null
  const live = preview?.id === id ? preview : placement
  return percentToWorld(live.x, live.y)
}

function BoardLinksImpl({ links, placements, preview, selectedLinkId, freshLinkId, onSelect }: BoardLinksProps) {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={BOARD_WIDTH}
      height={BOARD_HEIGHT}
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      aria-label="Relationships between objects on the table"
      role="group"
      style={{ zIndex: 50000, overflow: 'visible' }}
    >
      {links.map(link => {
        const a = resolve(link.from, placements, preview)
        const b = resolve(link.to, placements, preview)
        if (!a || !b) return null
        const start = edgePoint(a, b)
        const end = edgePoint(b, a)
        const style = LINK_STATUS_STYLE[link.status]
        const selected = link.id === selectedLinkId
        const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
        const length = Math.hypot(end.x - start.x, end.y - start.y)
        const label = `${link.kind} ${style.glyph} ${link.status}`
        const labelWidth = label.length * 6.4 + 16
        const fresh = link.id === freshLinkId
        return (
          <g
            key={link.id}
            className="nx-link-hit pointer-events-auto"
            role="button"
            tabIndex={0}
            aria-label={`Relationship ${link.kind}, ${link.status}`}
            aria-pressed={selected}
            data-link-id={link.id}
            onClick={event => { event.stopPropagation(); onSelect(link.id) }}
            onPointerDown={event => event.stopPropagation()}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(link.id) }
            }}
          >
            {/* Wide invisible stroke so a thumb can hit a hairline. */}
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth={28} />
            <line
              className={`nx-link-line ${fresh ? 'nx-link-draw' : ''}`}
              style={fresh ? ({ '--nx-link-length': length } as CSSProperties) : undefined}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={style.stroke}
              strokeWidth={selected ? 4 : 2.5}
              strokeDasharray={fresh ? undefined : style.dash}
              strokeLinecap="round"
            />
            <circle cx={start.x} cy={start.y} r={5} fill={style.stroke} />
            <circle cx={end.x} cy={end.y} r={5} fill={style.stroke} />
            <g transform={`translate(${mid.x}, ${mid.y})`}>
              <rect
                x={-labelWidth / 2}
                y={-11}
                width={labelWidth}
                height={22}
                fill="#17160f"
                stroke={selected ? '#f0e4c0' : style.stroke}
                strokeWidth={selected ? 2 : 1}
              />
              <text
                textAnchor="middle"
                y={4}
                fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
                fontSize={10.5}
                letterSpacing={0.8}
                fill={selected ? '#f0e4c0' : style.stroke}
              >
                {label}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

export const BoardLinks = memo(BoardLinksImpl)
