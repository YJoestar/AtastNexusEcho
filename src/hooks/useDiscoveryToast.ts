/**
 * NEXUS — Discovery Toast Hook
 * Manages cinematic discovery notifications for the player experience.
 */

import { useCallback, useState } from 'react'
import { generateId } from '@/lib/utils'

export type DiscoveryType =
  | 'evidence'
  | 'fragment'
  | 'item'
  | 'location'
  | 'voice'
  | 'general'

export interface DiscoveryToastState {
  id: string
  message: string
  type: DiscoveryType
}

export function useDiscoveryToast() {
  const [toasts, setToasts] = useState<DiscoveryToastState[]>([])

  // Stable identities: these are returned to consumers, and an identity that
  // changes every render is a landmine for any caller that puts one in an effect
  // dependency list.
  const showToast = useCallback((message: string, type: DiscoveryType = 'general') => {
    setToasts(prev => [...prev, { id: generateId(), message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { showToast, removeToast, toasts }
}
