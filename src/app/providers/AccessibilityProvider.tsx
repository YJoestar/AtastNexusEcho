/**
 * NEXUS — Accessibility Provider
 *
 * The Bureau controls its own legibility settings instead of delegating them
 * to whatever the handset happens to offer. Four levers, each one a real
 * preference a player can change without a developer:
 *
 *   scale        text, spacing and glyphs grow together; layouts reflow
 *   contrast     the palette mirror is re-pointed to a high-contrast pass
 *   motion       transitions and animation collapse to instant state changes
 *   transparency surfaces stop pretending to be glass
 *
 * Two rules govern this file:
 *
 *   1. It sits ABOVE auth. The login screen is the first thing a player ever
 *      reads, so the settings have to apply before anyone signs in.
 *   2. Every default is inherited from the operating system. Choosing nothing
 *      still respects prefers-reduced-motion and prefers-contrast, because a
 *      player should never have to ask for a legible screen.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type UIScale = 'compact' | 'standard' | 'large' | 'xlarge'
export type ContrastMode = 'standard' | 'boost'
export type MotionMode = 'full' | 'reduced'
export type TransparencyMode = 'full' | 'reduced'

export interface AccessibilityPreferences {
  scale: UIScale
  contrast: ContrastMode
  motion: MotionMode
  transparency: TransparencyMode
}

export interface AccessibilityContextValue extends AccessibilityPreferences {
  setScale: (scale: UIScale) => void
  setContrast: (contrast: ContrastMode) => void
  setMotion: (motion: MotionMode) => void
  setTransparency: (transparency: TransparencyMode) => void
  resetPreferences: () => void
  /** True when a value came from the OS rather than from the player. */
  scaleFollowsSystem: boolean
}

const STORAGE_KEY = 'nexus_accessibility'

/**
 * The scale ladder. The ratios are chosen so that the largest step is roughly
 * double the smallest, which is the range a player can actually use without
 * the interface becoming a different product.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const SCALE_ORDER: UIScale[] = ['compact', 'standard', 'large', 'xlarge']

// eslint-disable-next-line react-refresh/only-export-components
export const SCALE_LABELS: Record<UIScale, string> = {
  compact: 'Compact',
  standard: 'Standard',
  large: 'Large',
  xlarge: 'Largest',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readStored(): Partial<AccessibilityPreferences> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? (parsed as Partial<AccessibilityPreferences>) : {}
  } catch {
    // A corrupt or unreadable store must never keep the app from rendering.
    return {}
  }
}

/**
 * Reads a media query defensively.
 *
 * matchMedia is present but useless in more environments than it looks:
 * jsdom stubs it out, and some embedded webviews expose a function that
 * returns nothing. An unhandled stub must degrade to "no preference", never
 * to a crash on the first render.
 */
function queryMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia(query)?.matches === true
  } catch {
    return false
  }
}

function systemPrefersReducedMotion(): boolean {
  return queryMatches('(prefers-reduced-motion: reduce)')
}

function systemPrefersMoreContrast(): boolean {
  return queryMatches('(prefers-contrast: more)')
}

const OS_DEFAULTS: AccessibilityPreferences = {
  scale: 'standard',
  contrast: 'standard',
  motion: 'full',
  transparency: 'full',
}

// eslint-disable-next-line react-refresh/only-export-components
export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    const stored = readStored()
    return {
      scale: stored.scale ?? OS_DEFAULTS.scale,
      contrast: stored.contrast ?? OS_DEFAULTS.contrast,
      motion: stored.motion ?? (systemPrefersReducedMotion() ? 'reduced' : OS_DEFAULTS.motion),
      transparency: stored.transparency ?? OS_DEFAULTS.transparency,
    }
  })

  const update = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Private browsing and full disks both throw here. The preference
        // still applies for this session; it just will not be remembered.
      }
      return next
    })
  }, [])

  const setScale = useCallback((scale: UIScale) => update('scale', scale), [update])
  const setContrast = useCallback((contrast: ContrastMode) => update('contrast', contrast), [update])
  const setMotion = useCallback((motion: MotionMode) => update('motion', motion), [update])
  const setTransparency = useCallback(
    (transparency: TransparencyMode) => update('transparency', transparency),
    [update],
  )

  const resetPreferences = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // See update() — nothing to recover from.
    }
    setPreferences(prev => ({
      ...OS_DEFAULTS,
      // Restoring defaults must not throw away an operating system request
      // for less movement or more contrast.
      motion: systemPrefersReducedMotion() ? 'reduced' : 'full',
      contrast: systemPrefersMoreContrast() ? 'boost' : 'standard',
      scale: prev.scale,
    }))
  }, [])

  /**
   * Publish the preferences to the document. The stylesheet reads these as
   * data attributes, so a single write re-scales or re-contrasts the entire
   * interface without React having to re-render a single screen.
   */
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.uiScale = preferences.scale
    root.dataset.contrast = preferences.contrast
    root.dataset.motion = preferences.motion
    root.dataset.transparency = preferences.transparency
  }, [preferences])

  /**
   * Follow the OS while the player has not chosen for themselves. An explicit
   * choice always wins; only the unset values keep tracking the system.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    let contrastQuery: MediaQueryList
    try {
      contrastQuery = window.matchMedia('(prefers-contrast: more)')
    } catch {
      return
    }
    if (!contrastQuery || typeof contrastQuery.addEventListener !== 'function') return

    const onContrastChange = (event: MediaQueryListEvent) => {
      if (readStored().contrast) return
      setPreferences(prev => (prev.contrast === 'boost' || !event.matches ? prev : { ...prev, contrast: 'boost' }))
    }

    contrastQuery.addEventListener('change', onContrastChange)
    return () => contrastQuery.removeEventListener('change', onContrastChange)
  }, [])

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...preferences,
      setScale,
      setContrast,
      setMotion,
      setTransparency,
      resetPreferences,
      scaleFollowsSystem: readStored().scale === undefined,
    }),
    [preferences, setScale, setContrast, setMotion, setTransparency, resetPreferences],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext)
  // A missing provider is a wiring mistake, not a player-facing condition, so
  // it fails loudly in development rather than silently degrading the UI.
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}
