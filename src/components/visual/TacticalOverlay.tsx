/**
 * NEXUS ECHO — Tactical Map Overlay (SVG)
 *
 * An SVG intelligence overlay rendered on top of the canvas campus map.
 * Adds: building footprints as polygons, coordinate grid, north arrow,
 * scale bar, field annotations, and tactical icons.
 *
 * This layer creates the feeling of a filed site diagram — a real piece
 * of institutional cartography, not a generic map.
 */

import { useMemo, type FC } from 'react'
import { BUILDINGS, CAMPUS_SIZE, type BuildingName } from '@/content/campus'
import type { MapNodeState } from '@/types/campus'
import { cn } from '@/lib/utils'

export interface TacticalOverlayProps {
  nodes: MapNodeState[]
  showCoordinates?: boolean
  showScaleBar?: boolean
  annotations?: Array<{ id: string; position: [number, number]; label: string; type?: 'marker' | 'alert' | 'note' }>
  className?: string
}

const BUILDING_COLOR: Record<BuildingName, string> = {
  ADMIN_BUILDING: '#3a5a6a',
  LIBRARY: '#b8863f',
  SCIENCE_BUILDING: '#6fb3b4',
  ENGINEERING_BLOCK: '#7c2f33',
  SCULPTURE_GARDEN: '#6a6963',
  NEXUS_CORE: '#9e3b34',
}

const GRID_SPACING = 100

export const TacticalOverlay: FC<TacticalOverlayProps> = ({
  nodes,
  showCoordinates = true,
  showScaleBar = true,
  annotations = [],
  className,
}) => {
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; isVertical: boolean }> = []

    for (let x = 0; x <= CAMPUS_SIZE.width; x += GRID_SPACING) {
      lines.push({ x1: x, y1: 0, x2: x, y2: CAMPUS_SIZE.height, label: `${x / 100}`, isVertical: true })
    }
    for (let y = 0; y <= CAMPUS_SIZE.height; y += GRID_SPACING) {
      lines.push({ x1: 0, y1: y, x2: CAMPUS_SIZE.width, y2: y, label: `${y / 100}`, isVertical: false })
    }
    return lines
  }, [])

  return (
    <svg
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      viewBox={`0 0 ${CAMPUS_SIZE.width} ${CAMPUS_SIZE.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Grid */}
      {showCoordinates && (
        <g stroke="rgba(216, 214, 208, 0.12)" strokeWidth="0.5" fill="none">
          {gridLines.map((line, i) => (
            <line
              key={`grid-${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
            />
          ))}
        </g>
      )}

      {/* Grid coordinate labels */}
      {showCoordinates && (
        <g
          fill="rgba(106, 105, 99, 0.5)"
          fontFamily="monospace"
          fontSize="6"
          textAnchor="middle"
        >
          {gridLines
            .filter(l => l.isVertical && l.x1 % 200 === 0)
            .map(line => (
              <text key={`gx-${line.x1}`} x={line.x1} y="10">
                {line.label}00m E
              </text>
            ))}
          {gridLines
            .filter(l => !l.isVertical && l.y1 % 200 === 0)
            .map(line => (
              <text key={`gy-${line.y1}`} x="6" y={line.y1 + 3}>
                {line.label}00m N
              </text>
            ))}
        </g>
      )}

      {/* Building footprints */}
      {Object.entries(BUILDINGS).map(([key, building]) => {
        const points = building.polygon.map(p => `${p[0]},${p[1]}`).join(' ')
        const fillColor = BUILDING_COLOR[key as BuildingName] || '#3a5a6a'

        return (
          <g key={building.id}>
            <polygon
              points={points}
              fill={fillColor}
              fillOpacity={0.12}
              stroke={fillColor}
              strokeWidth="1"
              strokeOpacity={0.4}
            />
            <text
              x={building.center[0] + building.labelOffset[0]}
              y={building.center[1] + building.labelOffset[1]}
              fill="rgba(216, 214, 208, 0.5)"
              fontFamily="monospace"
              fontSize="9"
              textAnchor="middle"
               style={{ textTransform: 'uppercase' }}
            >
              {building.name}
            </text>
          </g>
        )
      })}

      {/* Tactical markers for nodes */}
      <g>
        {nodes.map(node => {
          const x = node.position[0]
          const y = node.position[1]
          const dotSize = 3.5
          const ringSize = 7

          let dotColor = 'rgba(106, 105, 99, 0.6)'
          let ringColor = 'rgba(106, 105, 99, 0.4)'

          if (node.solved) {
            dotColor = 'rgba(215, 214, 208, 0.9)'
            ringColor = 'rgba(215, 214, 208, 0.6)'
          } else if (node.unlocked) {
            dotColor = 'rgba(111, 179, 196, 0.8)'
            ringColor = 'rgba(111, 179, 196, 0.5)'
          } else if (node.available) {
            dotColor = 'rgba(184, 134, 63, 0.8)'
            ringColor = 'rgba(184, 134, 63, 0.5)'
          } else if (node.isCurrent) {
            dotColor = 'rgba(111, 179, 196, 0.9)'
            ringColor = 'rgba(111, 179, 196, 0.7)'
          }

          return (
            <g key={node.code}>
              {/* Outer ring for current or unlocked */}
              {(node.unlocked || node.isCurrent) && (
                <circle
                  cx={x}
                  cy={y}
                  r={ringSize}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="1"
                />
              )}
              {/* Main dot */}
              <circle
                cx={x}
                cy={y}
                r={dotSize}
                fill={dotColor}
                stroke="rgba(216, 214, 208, 0.6)"
                strokeWidth="0.75"
              />
              {/* Node code label */}
              {node.unlocked && (
                <text
                  x={x}
                  y={y - dotSize - 4}
                  fill="rgba(216, 214, 208, 0.6)"
                  fontFamily="monospace"
                  fontSize="6"
                  textAnchor="middle"
                >
                  {node.code}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* North indicator */}
      <g
        transform={`translate(${CAMPUS_SIZE.width - 24}, 24)}`}
        fill="none"
        stroke="rgba(216, 214, 208, 0.4)"
        strokeWidth="0.75"
      >
        <polygon points="0,0 10,-14 20,0 10,4" fill="rgba(184, 134, 63, 0.8)" />
        <line x1="10" y1="0" x2="10" y2="8" />
        <text x="10" y="16" fontFamily="monospace" fontSize="5" textAnchor="middle" fill="rgba(216, 214, 208, 0.5)">
          N
        </text>
      </g>

      {/* Scale bar */}
      {showScaleBar && (
        <g
          transform="translate(24, 24)"
          stroke="rgba(216, 214, 208, 0.4)"
          strokeWidth="0.75"
        >
          <line x1="0" y1="0" x2="60" y2="0" />
          <line x1="0" y1="-3" x2="0" y2="3" />
          <line x1="60" y1="-3" x2="60" y2="3" />
          <text
            x="30"
            y="8"
            fontFamily="monospace"
            fontSize="5"
            textAnchor="middle"
            fill="rgba(216, 214, 208, 0.5)"
          >
            100m
          </text>
        </g>
      )}

      {/* Annotations */}
      {annotations.map(annotation => {
        const markerColor =
          annotation.type === 'alert'
            ? 'rgba(158, 59, 52, 0.8)'
            : annotation.type === 'note'
            ? 'rgba(90, 123, 169, 0.8)'
            : 'rgba(216, 214, 208, 0.7)'

        return (
          <g key={annotation.id} transform={`translate(${annotation.position[0]}, ${annotation.position[1]})`}>
            <circle cx="0" cy="0" r="3" fill={markerColor} />
            <text
              x="0"
              y="-6"
              fontFamily="monospace"
              fontSize="5"
              textAnchor="middle"
              fill="rgba(216, 214, 208, 0.6)"
            >
              {annotation.label}
            </text>
          </g>
        )
      })}

      {/* Site plan metadata */}
      <text
        x={CAMPUS_SIZE.width / 2}
        y={CAMPUS_SIZE.height - 8}
        fill="rgba(106, 105, 99, 0.5)"
        fontFamily="monospace"
        fontSize="6"
        textAnchor="middle"
      >
        NEXUS ECHO — CANVAS INTELLIGENCE MAP • CLASSIFIED // EYES ONLY • {new Date().getFullYear()}
      </text>
    </svg>
  )
}
