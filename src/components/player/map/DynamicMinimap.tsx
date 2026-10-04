/**
 * NEXUS ECHO — Dynamic Minimap
 *
 * A player-centered canvas radar showing the investigator's position, team
 * contacts, and local terrain. Uses requestAnimationFrame for smooth
 * updates, interpolates camera position, and clips contacts to the viewport
 * edge when the player approaches a boundary.
 *
 * Orientation modes:
 *   - "north": the map is fixed with north at top (surveyor's orientation)
 *   - "player": the map rotates with the player's facing direction
 *
 * Contacts are rendered as solid dots — never arrows or labels. A dot's
 * position is its own signal; direction is implied by movement over time.
 */

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type FC,
} from 'react'
import { BUILDINGS, ALL_POIS } from '@/content/campus'
import type { MapNodeState, KnowledgeState, TeamMember, MapOrientation } from '@/types/campus'
import { cn } from '@/lib/utils'

export interface DynamicMinimapProps {
  /** Player's current world position, derived from current node POI. */
  playerPosition: [number, number]
  /** Player's facing direction in degrees (0 = north/up). */
  playerRotation?: number
  /** Team members visible on the radar. */
  teamMembers?: TeamMember[]
  /** Node states for rendering POI markers on the minimap. */
  nodes: MapNodeState[]
  /** Current orientation mode. */
  orientation?: MapOrientation
  /** Whether the minimap follows the player (true) or is static. */
  playerCentered?: boolean
  /** Radius of the visible area around the player in world units. */
  viewRadius?: number
  /** Size of the canvas in pixels. */
  size?: number
  /** Called when the player clicks a node marker. */
  onNodeSelect?: (code: string) => void
  /** Additional class names. */
  className?: string
}

const DEFAULT_VIEW_RADIUS = 280
const DEFAULT_SIZE = 200

/** World coordinates → minimap pixels. Shared by drawing and hit-testing. */
function projectToMinimap(
  wx: number, wy: number, camX: number, camY: number,
  orientation: 'north' | 'player', playerRotation: number, size: number, halfView: number,
): [number, number] {
  const center = size / 2
  const dx = wx - camX
  const dy = wy - camY
  if (orientation === 'player') {
    const rad = (playerRotation * Math.PI) / 180
    const cos = Math.cos(-rad)
    const sin = Math.sin(-rad)
    const rx = dx * cos - dy * sin
    const ry = dx * sin + dy * cos
    return [center + (rx / halfView) * center, center + (ry / halfView) * center]
  }
  return [center + (dx / halfView) * center, center + (dy / halfView) * center]
}

export const DynamicMinimap: FC<DynamicMinimapProps> = ({
  playerPosition,
  playerRotation = 0,
  teamMembers = [],
  nodes,
  orientation = 'north',
  playerCentered = true,
  viewRadius = DEFAULT_VIEW_RADIUS,
  size = DEFAULT_SIZE,
  onNodeSelect,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const interpolatedPosRef = useRef<[number, number]>([playerPosition[0], playerPosition[1]])
  const [compassRotation, setCompassRotation] = useState(0)

  const nodeMap = useMemo(() => {
    const map = new Map<string, MapNodeState>()
    for (const n of nodes) map.set(n.code, n)
    return map
  }, [nodes])

  const pois = useMemo(() => {
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
    const dprSize = size * pixelRatio
    // Resizing a canvas clears it and reallocates its bitmap: only do it when the size changed.
    if (canvas.width !== dprSize || canvas.height !== dprSize) {
      canvas.width = dprSize
      canvas.height = dprSize
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    const center = size / 2
    const halfView = viewRadius

    const worldToScreen = (wx: number, wy: number, camX: number, camY: number) =>
      projectToMinimap(wx, wy, camX, camY, orientation, playerRotation, size, halfView)

    ctx.clearRect(0, 0, size, size)

    ctx.fillStyle = 'rgba(10, 10, 11, 0.92)'
    ctx.fillRect(0, 0, size, size)

    const camX = interpolatedPosRef.current[0]
    const camY = interpolatedPosRef.current[1]

    ctx.strokeStyle = 'rgba(43, 43, 46, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.arc(center, center, center - 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    for (const building of Object.values(BUILDINGS)) {
      const screenPoints = building.polygon.map(p => worldToScreen(p[0], p[1], camX, camY))

      const visible = screenPoints.some(
        p => p[0] >= -20 && p[0] <= size + 20 && p[1] >= -20 && p[1] <= size + 20,
      )
      if (!visible) continue

      ctx.fillStyle = 'rgba(16, 16, 18, 0.7)'
      ctx.strokeStyle = 'rgba(43, 43, 46, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(screenPoints[0][0], screenPoints[0][1])
      for (let i = 1; i < screenPoints.length; i++) {
        ctx.lineTo(screenPoints[i][0], screenPoints[i][1])
      }
      ctx.closePath()
      ctx.fill('evenodd')
      ctx.stroke()
    }

    for (const poi of pois) {
      const state = poi.state
      const knowledge = state?.knowledge ?? 'UNKNOWN'
      if (knowledge === 'UNKNOWN') continue

      const [sx, sy] = worldToScreen(poi.position[0], poi.position[1], camX, camY)

      if (sx < -10 || sx > size + 10 || sy < -10 || sy > size + 10) continue

      const radius = Math.max(2, Math.min(5, 4 * (1 - 0)))

      const fillColors: Record<KnowledgeState, string> = {
        UNKNOWN: 'rgba(106, 105, 99, 0.3)',
        DISCOVERED: 'rgba(145, 143, 137, 0.5)',
        VISITED: 'rgba(111, 179, 196, 0.8)',
        OBSERVED: 'rgba(90, 123, 169, 0.85)',
        INVESTIGATED: 'rgba(184, 134, 63, 0.85)',
        VERIFIED: 'rgba(215, 214, 208, 0.95)',
      }

      ctx.fillStyle = fillColors[knowledge] || fillColors.UNKNOWN
      ctx.strokeStyle = 'rgba(10, 10, 11, 0.95)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(sx, sy, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (state?.isCurrent) {
        ctx.strokeStyle = 'rgba(111, 179, 196, 0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(sx, sy, radius + 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    for (const member of teamMembers) {
      if (member.isCurrent) continue

      let targetX = member.position[0]
      let targetY = member.position[1]
      let clamped = false

      if (playerCentered) {
        const dxToPlayer = targetX - camX
        const dyToPlayer = targetY - camY
        const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer)

        if (distToPlayer > halfView * 0.8) {
          const angle = Math.atan2(dyToPlayer, dxToPlayer)
          const edgeDist = center * 0.85
          targetX = camX + Math.cos(angle) * edgeDist
          targetY = camY + Math.sin(angle) * edgeDist
          clamped = true
        }
      }

      const [sx, sy] = worldToScreen(targetX, targetY, camX, camY)

      if (sx < -15 || sx > size + 15 || sy < -15 || sy > size + 15) continue

      const memberRadius = clamped ? 4 : 6
      const colorMap: Record<string, string> = {
        OBSERVER: 'rgba(111, 179, 196, 0.85)',
        ANALYST: 'rgba(184, 134, 63, 0.85)',
        OPERATOR: 'rgba(90, 107, 150, 0.85)',
      }
      const memberColor = colorMap[member.role] || 'rgba(216, 214, 208, 0.7)'

      ctx.fillStyle = memberColor
      ctx.strokeStyle = 'rgba(10, 10, 11, 0.95)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(sx, sy, memberRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (clamped) {
        ctx.strokeStyle = memberColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(center, center)
        ctx.lineTo(sx, sy)
        ctx.stroke()
      }
    }

    const [px, py] = interpolatedPosRef.current
    const [playerScreenX, playerScreenY] = worldToScreen(px, py, camX, camY)

    if (playerScreenX >= -15 && playerScreenX <= size + 15 &&
        playerScreenY >= -15 && playerScreenY <= size + 15) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.strokeStyle = 'rgba(111, 179, 196, 0.95)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(playerScreenX, playerScreenY, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const dirRad = (playerRotation * Math.PI) / 180
      ctx.strokeStyle = 'rgba(111, 179, 196, 0.95)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(playerScreenX, playerScreenY)
      ctx.lineTo(
        playerScreenX + Math.sin(dirRad) * 12,
        playerScreenY - Math.cos(dirRad) * 12,
      )
      ctx.stroke()
    }
  }, [pois, playerRotation, orientation, playerCentered, viewRadius, size, teamMembers])

  // Ease the camera toward the player and redraw while it moves. Once it has
  // arrived the loop stops: a static minimap must not redraw 60 times a second.
  useEffect(() => {
    let running = true
    const step = () => {
      if (!running) return
      const target = playerPosition
      let moving = false
      if (playerCentered) {
        const dx = target[0] - interpolatedPosRef.current[0]
        const dy = target[1] - interpolatedPosRef.current[1]
        if (Math.hypot(dx, dy) > 0.5) {
          interpolatedPosRef.current[0] += dx * 0.12
          interpolatedPosRef.current[1] += dy * 0.12
          moving = true
        } else {
          interpolatedPosRef.current[0] = target[0]
          interpolatedPosRef.current[1] = target[1]
        }
      } else {
        interpolatedPosRef.current[0] = target[0]
        interpolatedPosRef.current[1] = target[1]
      }
      draw()
      if (moving) animationFrameRef.current = requestAnimationFrame(step)
    }
    step()
    return () => {
      running = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [draw, playerPosition, playerCentered])

  useEffect(() => {
    setCompassRotation(orientation === 'player' ? playerRotation : 0)
  }, [playerRotation, orientation])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeSelect) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((event.clientX - rect.left) / rect.width) * size
    const y = ((event.clientY - rect.top) / rect.height) * size
    const [camX, camY] = interpolatedPosRef.current
    let best: { code: string; distance: number } | null = null
    for (const poi of pois) {
      if (!poi.state?.unlocked) continue
      const [px, py] = projectToMinimap(poi.position[0], poi.position[1], camX, camY, orientation, playerRotation, size, viewRadius)
      const distance = Math.hypot(px - x, py - y)
      // 22 px: a fingertip, not a pixel.
      if (distance <= 22 && (!best || distance < best.distance)) best = { code: poi.code, distance }
    }
    if (best) onNodeSelect(best.code)
  }

  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Team radar minimap"
        onClick={handleCanvasClick}
      />
      <div
        className="absolute top-1 left-1/2 -translate-x-1/2"
        style={{
          width: size * 0.28,
          height: size * 0.28,
          transform: `rotate(${compassRotation}deg)`,
          transition: 'transform 120ms ease-out',
        }}
        aria-hidden="true"
      >
        <CompassRose />
      </div>
    </div>
  )
}

function CompassRose(): JSX.Element {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="12" stroke="rgba(216,214,208,0.4)" strokeWidth="1" />
      <circle cx="50" cy="50" r="4" fill="rgba(111,179,196,0.6)" />
      <line x1="50" y1="14" x2="50" y2="38" stroke="rgba(216,214,208,0.6)" strokeWidth="1" />
      <line x1="62" y1="50" x2="86" y2="50" stroke="rgba(216,214,208,0.4)" strokeWidth="1" />
      <line x1="50" y1="62" x2="50" y2="86" stroke="rgba(216,214,208,0.4)" strokeWidth="1" />
      <line x1="14" y1="50" x2="38" y2="50" stroke="rgba(216,214,208,0.4)" strokeWidth="1" />
      <polygon points="50,6 53,16 47,16" fill="rgba(216,214,208,0.6)" />
    </svg>
  )
}

