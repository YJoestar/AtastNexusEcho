/**
 * NEXUS — Providers Export
 * Central export point for all context providers
 */

export { AppProvider, useApp, AppContext } from './AppProvider'
export type { AppContextValue } from './AppProvider'
export {
  AccessibilityProvider,
  AccessibilityContext,
  useAccessibility,
  SCALE_LABELS,
  SCALE_ORDER,
} from './AccessibilityProvider'
export type {
  AccessibilityPreferences,
  AccessibilityContextValue,
  UIScale,
  ContrastMode,
  MotionMode,
  TransparencyMode,
} from './AccessibilityProvider'
export { AdminProvider, useAdmin } from './AdminProvider'
export { QASimulatorProvider, useQA, useQASimulator, QASimulatorContext } from '@/contexts/QASimulatorContext'
