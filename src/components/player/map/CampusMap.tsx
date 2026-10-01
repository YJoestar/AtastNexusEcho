/**
 * NEXUS ECHO — Campus Map Renderer
 *
 * Canvas-based top-down map of the investigation campus. Renders building
 * footprints as orthogonal polygons, POI markers with KnowledgeState and
 * RealityState overlays, and a fog-of-war that lifts as knowledge accumulates.
 *
 * The map is a static reference sheet — a filed site diagram. Interaction
 * (node selection) is handled by the parent component through the onNodeSelect
 * callback.
 */

import {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type FC,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { BUILDINGS, ALL_POIS, type CampusPOI, CAMPUS_SIZE } from '@/content/campus'
import type { MapNodeState, KnowledgeState, RealityState } from '@/types/campus'
import { cn } from '@/lib/utils'

export interface CampusMapProps {
  /** Current state of each node on the map. */
  nodes: MapNodeState[]
  /** Current zoom level (1 = 100%). */
  zoom?: number
  /** Whether to render fog of war over unexplored areas. */
  showFog?: boolean
  /** Called when a node marker is clicked. */
  onNodeSelect?: (code: string) => void
  /** Called with hover state for a node. */
  onNodeHover?: (code: string | null) => void
  /** Additional class names. */
  className?: string
}

interface CanvasNode extends CampusPOI {
  state: MapNodeState | undefined
}

const NODE_SIZE = 20
const NODE_RING = 28

const REALITY_OVERLAY: Record<RealityState, string> = {
  NORMAL: '',
  SUSPICIOUS: 'rgba(184, 134, 63, 0.18)',
  ANOMALOUS: 'rgba(158, 59, 52, 0.28)',
  CONFIRMED_ANOMALY: 'rgba(158, 59, 52, 0.42)',
}

const KNOWLEDGE_FILL: Record<KnowledgeState, string> = {
  UNKNOWN: 'rgba(106, 105, 99, 0.4)',
  DISCOVERED: 'rgba(145, 143, 137, 0.6)',
  VISITED: 'rgba(111, 179, 196, 0.7)',
  OBSERVED: 'rgba(90, 123, 169, 0.75)',
  INVESTIGATED: 'rgba(184, 134, 63, 0.7)',
  VERIFIED: 'rgba(215, 214, 208, 0.85)',
}

function realityRank(r: RealityState): number {
  return ['NORMAL', 'SUSPICIOUS', 'ANOMALOUS', 'CONFIRMED_ANOMALY'].indexOf(r)
}

export const CampusMap: FC<CampusMapProps> = ({
  nodes,
  zoom = 1,
  showFog = true,
  onNodeSelect,
  onNodeHover,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef<string | null>(null)
  const animationFrameRef = useRef<number>()

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapNodeState>()
    for (const n of nodes) {
      map.set(n.code, n)
    }
    return map
  }, [nodes])

  const canvasNodes = useMemo((): CanvasNode[] => {
    return ALL_POIS.map(poi => ({
      ...poi,
      state: nodeMap.get(poi.code),
    }))
  }, [nodeMap])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pixelRatio = window.devicePixelRatio || 1
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    ctx.scale(pixelRatio, pixelRatio)

    const scaleX = width / CAMPUS_SIZE.width
    const scaleY = height / CAMPUS_SIZE.height
    const scale = Math.min(scaleX, scaleY) * zoom
    const offsetX = (width - CAMPUS_SIZE.width * scale) / 2
    const offsetY = (height - CAMPUS_SIZE.height * scale) / 2

    const worldToScreen = (x: number, y: number): [number, number] => [
      offsetX + x * scale,
      offsetY + y * scale,
    ]

    const screenDist = (worldUnits: number) => worldUnits * scale

    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(10, 10, 11, 1)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(216, 214, 208, 0.06)'
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    for (let i = 0; i <= 10; i++) {
      const x = i * 100 * scale + offsetX
      ctx.moveTo(x, offsetY)
      ctx.lineTo(x, offsetY + CAMPUS_SIZE.height * scale)
    }
    for (let i = 0; i <= 11; i++) {
      const y = i * 100 * scale + offsetY
      ctx.moveTo(offsetX, y)
      ctx.lineTo(offsetX + CAMPUS_SIZE.width * scale, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    for (const building of Object.values(BUILDINGS)) {
      const screenPoints = building.polygon.map(p => worldToScreen(p[0], p[1]))

      ctx.fillStyle = 'rgba(16, 16, 18, 0.85)'
      ctx.strokeStyle = 'rgba(43, 43, 46, 0.8)'
      ctx.lineWidth = Math.max(1, 2 / scale)
      ctx.beginPath()
      ctx.moveTo(screenPoints[0][0], screenPoints[0][1])
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i][0], screenPoints[i][1])
      }
      ctx.closePath()
      ctx.fill('evenodd')
      ctx.stroke()

      const [labelX, labelY] = worldToScreen(
        building.center[0] + building.labelOffset[0],
        building.center[1] + building.labelOffset[1],
      )
      ctx.fillStyle = 'rgba(106, 105, 99, 0.8)'
      ctx.font = `${Math.max(8, 11 * scale)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(building.name, labelX, labelY)
    }

    for (const node of canvasNodes) {
      const [sx, sy] = worldToScreen(node.position[0], node.position[1])
      const dotRadius = Math.max(3, NODE_SIZE * 0.35 * scale)
      const ringRadius = screenDist(NODE_RING / 2)

      const state = node.state
      const knowledge = state?.knowledge ?? 'UNKNOWN'
      const reality = state?.reality ?? 'NORMAL'

      if (showFog && knowledge === 'UNKNOWN') {
        const fogRadius = Math.max(4, dotRadius * 1.5)
        ctx.fillStyle = 'rgba(106, 105, 99, 0.25)'
        ctx.beginPath()
        ctx.arc(sx, sy, fogRadius, 0, Math.PI * 2)
        ctx.fill()
        continue
      }

      if (reality !== 'NORMAL' && realityRank(reality) > 0) {
        const overlay = REALITY_OVERLAY[reality]
        if (overlay) {
          const anomalyRadius = Math.max(6, ringRadius * 1.4)
          ctx.fillStyle = overlay
          ctx.beginPath()
          ctx.arc(sx, sy, anomalyRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const fillColor = KNOWLEDGE_FILL[knowledge] || KNOWLEDGE_FILL.UNKNOWN
      ctx.fillStyle = fillColor
      ctx.strokeStyle = 'rgba(216, 214, 208, 0.6)'
      ctx.lineWidth = Math.max(1, 1.5 / scale)
      ctx.beginPath()
      ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (knowledge === 'VERIFIED') {
        ctx.strokeStyle = 'rgba(215, 214, 208, 0.9)'
        ctx.lineWidth = Math.max(1, 1.5 / scale)
        ctx.beginPath()
        ctx.arc(sx, sy, dotRadius + 3 * scale, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (state?.isCurrent) {
        ctx.strokeStyle = 'rgba(111, 179, 196, 0.9)'
        ctx.lineWidth = Math.max(2, 3 / scale)
        ctx.setLineDash([3 / scale, 2 / scale])
        ctx.beginPath()
        ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (state?.available && !state?.solved && !state?.isCurrent) {
        ctx.strokeStyle = 'rgba(184, 134, 63, 0.8)'
        ctx.lineWidth = Math.max(1, 2 / scale)
        ctx.beginPath()
        ctx.arc(sx, sy, dotRadius + 2 * scale, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (state?.unlocked && screenDist(NODE_SIZE) > 16) {
        const label = state.code
        ctx.fillStyle = 'rgba(216, 214, 208, 0.7)'
        ctx.font = `${Math.max(6, 9 * scale)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(label, sx, sy - dotRadius - 2)
      }
    }
  }, [canvasNodes, zoom, showFog])

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      const scaleX = width / CAMPUS_SIZE.width
      const scaleY = height / CAMPUS_SIZE.height
      const scale = Math.min(scaleX, scaleY) * zoom
      const offsetX = (width - CAMPUS_SIZE.width * scale) / 2
      const offsetY = (height - CAMPUS_SIZE.height * scale) / 2

      const invX = (x - offsetX) / scale
      const invY = (y - offsetY) / scale

      const hitRadius = NODE_SIZE * 1.5
      let found: string | null = null
      for (const node of canvasNodes) {
        const dx = node.position[0] - invX
        const dy = node.position[1] - invY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < hitRadius) {
          found = node.code
          break
        }
      }

      if (found !== hoverRef.current) {
        hoverRef.current = found
        onNodeHover?.(found)
      }
    },
    [canvasNodes, zoom, onNodeHover],
  )

  const handleClick = useCallback(() => {
    if (!onNodeSelect || !hoverRef.current) return
    const node = canvasNodes.find(n => n.code === hoverRef.current)
    if (node?.state?.unlocked) {
      onNodeSelect(node.code)
    }
  }, [canvasNodes, onNodeSelect])

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      draw()
    })
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [draw])

  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'w-full h-full cursor-crosshair',
        'border border-nexus-borderSubtle bg-nexus-bg',
        className,
      )}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      aria-label="Campus investigation map"
    />
  )
}
