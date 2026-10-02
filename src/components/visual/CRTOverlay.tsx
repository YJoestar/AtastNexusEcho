/**
 * NEXUS ECHO — CRT Overlay
 *
 * Canvas-based CRT simulation for the bureau workstation.
 */

import { useEffect, useRef, type FC } from 'react'
import { useEffectSettings } from './VisualEnvironment'
import { useHorrorLevel } from '@/hooks/useHorrorLevel'

interface CRTOverlayProps {
  width?: number
  height?: number
}

const SCANLINE_COUNT = 48

export const CRTOverlay: FC<CRTOverlayProps> = ({ width: w, height: h }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const timeRef = useRef(0)
  const settings = useEffectSettings()
  const horrorLevel = useHorrorLevel()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    const cw = (w ?? rect.width) || window.innerWidth
    const ch = (h ?? rect.height) || window.innerHeight

    canvas.width = cw * dpr
    canvas.height = ch * dpr
    ctx.scale(dpr, dpr)

    const scanlineIntensity = settings.scanlines !== 'off' ? 0.12 : 0
    const noiseIntensity = settings.noise !== 'off' ? 0.05 * (1 + horrorLevel / 6) : 0
    const vignetteIntensity = settings.vignette !== 'off' ? 0.35 : 0
    const flicker = settings.flicker ? 0.02 : 0

    // Capture for closure
    const renderCtx = ctx
    const renderCanvas = canvas

    function draw(time: number) {
      timeRef.current = time
      const elapsed = timeRef.current * 0.001 + Math.random() * 0.001

      renderCtx.clearRect(0, 0, cw, ch)

      // Scanlines
      if (scanlineIntensity > 0) {
        renderCtx.fillStyle = 'rgba(0, 0, 0, ' + scanlineIntensity + ')'
        for (let i = 0; i < SCANLINE_COUNT; i++) {
          const y = (i / SCANLINE_COUNT) * ch
          const thin = (i % 2 === 0) ? 1 : 0
          renderCtx.fillRect(0, y, cw, thin)
        }
      }

      // Noise grain
      if (noiseIntensity > 0 && typeof renderCtx.createImageData === 'function') {
        renderCtx.globalCompositeOperation = 'screen'
        const imageData = renderCtx.createImageData(cw, ch)
        const bytes = new Uint8ClampedArray(imageData.data.buffer)
        const burst = Math.floor(noiseIntensity * 255)
        for (let i = 0; i < bytes.length; i += 4) {
          const v = (Math.random() * burst) | 0
          bytes[i] = v
          bytes[i + 1] = v
          bytes[i + 2] = v
          bytes[i + 3] = v
        }
        renderCtx.putImageData(imageData, 0, 0)
        renderCtx.globalCompositeOperation = 'source-over'
      }

      // Vignette via radial gradient
      if (vignetteIntensity > 0) {
        const gradient = renderCtx.createRadialGradient(
          cw / 2, ch / 2, cw * 0.4,
          cw / 2, ch / 2, Math.max(cw, ch) / 2,
        )
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, ' + vignetteIntensity + ')')
        renderCtx.fillStyle = gradient
        renderCtx.fillRect(0, 0, cw, ch)
      }

      // Subtle flicker
      if (flicker > 0) {
        const flickerAmount = Math.sin(elapsed * (1 + Math.random())) * flicker * 0.5 + 1
        renderCanvas.style.opacity = flickerAmount.toFixed(3)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [settings, horrorLevel, w, h])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        opacity: settings.crt === 'off' ? 0 : 1,
        transition: 'opacity 300ms ease',
      }}
    />
  )
}
