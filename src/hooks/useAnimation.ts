/**
 * NEXUS ECHO — GSAP Animation Hooks
 *
 * Choreographed animation timelines for game-like interactions.
 * Each hook returns a ref callback that drives GSAP timelines.
 */

import { useRef, useCallback } from 'react'
import gsap from 'gsap'

export type AnimationVariant =
  | 'boot'
  | 'stamp'
  | 'document'
  | 'panel'
  | 'signal'
  | 'reveal'

export interface AnimationOptions {
  delay?: number
  stagger?: number
  onComplete?: () => void
}

export function useAnimation(variant: AnimationVariant, options?: AnimationOptions) {
  const elementRef = useRef<HTMLElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const animate = useCallback((target?: Element | null) => {
    const el = (target as HTMLElement) ?? elementRef.current
    if (!el) return

    const tl = gsap.timeline({
      defaults: {
        ease: 'cubic-bezier(0.16, 0.84, 0.44, 1)',
      },
      onComplete: options?.onComplete,
    })

    switch (variant) {
      case 'boot':
        tl.fromTo(
          el,
          { opacity: 0, y: 8, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4 },
        )
        break

      case 'stamp':
        tl.fromTo(
          el,
          { opacity: 0, scale: 0.7, rotation: -10 },
          { opacity: 1, scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(1.7)' },
        )
        break

      case 'document':
        tl.fromTo(
          el,
          { opacity: 0, y: 12, clipPath: 'inset(100% 0 0 0)' },
          {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0 0 0 0)',
            duration: 0.5,
            ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          },
        )
        break

      case 'panel':
        tl.fromTo(
          el,
          { opacity: 0, scale: 0.97 },
          { opacity: 1, scale: 1, duration: 0.3, delay: options?.delay ?? 0 },
        )
        break

      case 'signal':
        tl.fromTo(
          el,
          { opacity: 0, height: 0 },
          { opacity: 1, height: 'auto', duration: 0.2, ease: 'power2.out' },
        )
        break

      case 'reveal':
        tl.fromTo(
          el,
          { opacity: 0, filter: 'blur(4px)' },
          { opacity: 1, filter: 'blur(0px)', duration: 0.4 },
        )
        break
    }

    timelineRef.current = tl
    return tl
  }, [variant, options])

  const animateStagger = useCallback((targets: Element[]) => {
    if (!targets.length) return

    const tl = gsap.timeline({ defaults: { ease: 'cubic-bezier(0.16, 0.84, 0.44, 1)' } })
    tl.fromTo(
      targets,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        stagger: options?.stagger ?? 0.04,
      },
    )
    return tl
  }, [options?.stagger])

  return {
    ref: elementRef,
    animate,
    animateStagger,
    timeline: timelineRef,
  }
}

export function useGSAP() {
  return {
    timeline: () => gsap.timeline(),
    to: (...args: Parameters<typeof gsap.to>) => gsap.to(...args),
    from: (...args: Parameters<typeof gsap.from>) => gsap.from(...args),
    fromTo: (...args: Parameters<typeof gsap.fromTo>) => gsap.fromTo(...args),
    delayedCall: (...args: Parameters<typeof gsap.delayedCall>) => gsap.delayedCall(...args),
  }
}
