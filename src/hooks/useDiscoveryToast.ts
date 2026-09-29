/**
 * NEXUS — Discovery Toast Hook
 * Manages cinematic discovery notifications for the player experience.
 */

import { useState } from 'react'

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

  const showToast = (message: string, type: DiscoveryType = 'general') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { showToast, removeToast, toasts }
}
