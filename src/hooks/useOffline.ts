/**
 * NEXUS — Offline Detection Hook
 * Tracks network connectivity status for graceful degradation
 */

import { useState, useEffect } from 'react'

export interface OfflineState {
  isOnline: boolean
  isOffline: boolean
}

export function useOffline(): OfflineState {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, isOffline: !isOnline }
}
