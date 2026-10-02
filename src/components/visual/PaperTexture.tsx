/**
 * NEXUS ECHO — Paper Texture
 *
 * Generates a procedural paper texture for document evidence surfaces.
 * Cached as a data URL for performance.
 */

import { useEffect, useRef, type FC, type ReactNode } from 'react'
import { useEffectSettings } from './VisualEnvironment'

interface PaperTextureProps {
  children?: ReactNode
  className?: string
  width?: number
  height?: number
}

const CACHE_SIZE = 256
let cachedDataURL: string | null = null

function getPaperDataURL(): string {
  if (cachedDataURL) return cachedDataURL

  const canvas = document.createElement('canvas')
  canvas.width = CACHE_SIZE
  canvas.height = CACHE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    cachedDataURL = ''
    return cachedDataURL
  }

  // Base paper color
  ctx.fillStyle = '#1a1917'
  ctx.fillRect(0, 0, CACHE_SIZE, CACHE_SIZE)

  // Paper fibers
  ctx.fillStyle = 'rgba(216, 214, 208, 0.03)'
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * CACHE_SIZE
    const y = Math.random() * CACHE_SIZE
    const size = 0.5 + Math.random() * 1.5
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  // Subtle creases
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * CACHE_SIZE
    const y1 = Math.random() * CACHE_SIZE * 0.3
    const y2 = CACHE_SIZE - Math.random() * CACHE_SIZE * 0.3
    ctx.beginPath()
    ctx.moveTo(x, y1)
    ctx.lineTo(x + (Math.random() - 0.5) * 20, y2)
    ctx.stroke()
  }

  // Age spots
  ctx.fillStyle = 'rgba(0, 0, 0, 0.015)'
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * CACHE_SIZE
    const y = Math.random() * CACHE_SIZE
    const size = 2 + Math.random() * 6
    ctx.globalAlpha = 0.2 + Math.random() * 0.3
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  cachedDataURL = canvas.toDataURL('image/png')
  return cachedDataURL
}

export const PaperTexture: FC<PaperTextureProps> = ({
  children,
  className,
  width = CACHE_SIZE,
  height = CACHE_SIZE,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const settings = useEffectSettings()

  useEffect(() => {
    if (!containerRef.current) return

    const intensity = settings.paperTexture !== 'off'
      ? 0.15 + ({ low: 0.02, medium: 0.04, high: 0.06 }[settings.paperTexture] ?? 0)
      : 0

    if (intensity === 0) {
      containerRef.current.style.removeProperty('background-image')
      return
    }

    const dataURL = getPaperDataURL()
    containerRef.current.style.backgroundImage = `url('${dataURL}')`
    containerRef.current.style.backgroundSize = '256px 256px'
  }, [settings, width, height])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        backgroundColor: settings.paperTexture !== 'off' ? '#1a1917' : undefined,
      }}
    >
      {children}
    </div>
  )
}
