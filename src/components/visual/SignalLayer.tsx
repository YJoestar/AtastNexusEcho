/**
 * NEXUS ECHO — Signal Layer
 *
 * Canvas-based signal degradation overlay for the field device.
 */

import { useEffect, useRef, type FC } from 'react'
import { useEffectSettings } from './VisualEnvironment'
import { useHorrorLevel } from '@/hooks/useHorrorLevel'

interface SignalLayerProps {
  signalStrength?: number
  width?: number
  height?: number
}

export const SignalLayer: FC<SignalLayerProps> = ({
  signalStrength = 100,
  width: w,
  height: h,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
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

    const signalDecay = 1 - signalStrength / 100
    const baseNoise = settings.noise !== 'off' ? 0.02 + signalDecay * 0.03 : 0
    const dropoutChance = settings.signalDegradation !== 'off' ? 0.02 + signalDecay * 0.05 : 0
    const staticChance = settings.flicker && horrorLevel > 0
      ? 0.001 + (horrorLevel / 6) * 0.02
      : 0

    const renderCtx = ctx

    function draw() {
      renderCtx.clearRect(0, 0, cw, ch)

      // Analog noise
      if (baseNoise > 0 && typeof renderCtx.createImageData === 'function') {
        renderCtx.globalCompositeOperation = 'screen'
        const imageData = renderCtx.createImageData(cw, ch)
        const bytes = new Uint8ClampedArray(imageData.data.buffer)
        const burst = Math.floor(baseNoise * 255)
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

      // Signal dropout — occasional horizontal bands
      if (dropoutChance > 0 && Math.random() < dropoutChance) {
        const bandY = Math.random() * ch
        const bandHeight = 2 + Math.random() * 8
        const opacity = 0.4 + Math.random() * 0.3
        renderCtx.fillStyle = 'rgba(0, 0, 0, ' + opacity + ')'
        renderCtx.fillRect(0, bandY, cw, bandHeight)
      }

      // Static burst — rare full-frame flash
      if (staticChance > 0 && Math.random() < staticChance) {
        renderCtx.fillStyle = 'rgba(255, 255, 255, ' + (0.05 + Math.random() * 0.1) + ')'
        renderCtx.fillRect(0, 0, cw, ch)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [settings, signalStrength, horrorLevel, w, h])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        opacity: (settings.noise !== 'off' || settings.signalDegradation !== 'off') ? 0.6 : 0,
        transition: 'opacity 300ms ease',
      }}
    />
  )
}
