/**
 * NEXUS — QA Player Shell
 *
 * Renders the production player screens inside an isolated React root with its
 * own MemoryRouter. Rendering MemoryRouter inside the main app's RouterProvider
 * triggers a production-only crash (React Error #261) because React Router
 * forbids nested routers. By creating a second createRoot we give the player
 * screens a completely separate router context while still re-using the QA
 * simulator's in-memory context from the parent QAHub.
 *
 * Context propagation between the two roots uses useSyncExternalStore so the
 * root is created once and subsequent QA context updates flow through React's
 * own subscription mechanism — no repeated root.render() calls.
 */

import { useEffect, useRef, useContext, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QASimulatorContext } from '@/contexts/QASimulatorContext'
import type { QAContextValue } from '@/contexts/QASimulatorContext'
import { AppContext } from '@/app/providers/AppProvider'
import type { AppContextValue } from '@/app/providers/AppProvider'
import { PlayerLayout } from '@/features/player/PlayerLayout'
import { PlayerGame } from '@/features/player/Game'
import { PlayerNode } from '@/features/player/Node'
import { PlayerEvidence } from '@/features/player/Evidence'
import { PlayerInventory } from '@/features/player/Inventory'
import { PlayerNavigation } from '@/features/player/Navigation'
import { PlayerQR } from '@/features/player/QR'
import { PlayerLeaderboard } from '@/features/player/Leaderboard'
import { PlayerNotifications } from '@/features/player/Notifications'
import { PlayerFinal } from '@/features/player/Final'
import { PlayerComplete } from '@/features/player/Complete'

const DUMMY_APP_CONTEXT: AppContextValue = {
  player: null,
  team: null,
  role: null,
  isAuthenticated: false,
  isInitializing: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshGameState: async () => {},
  refreshTeamProgress: async () => {},
  gameState: null,
  teamProgress: null,
  notifications: [],
  unreadCount: 0,
  markNotificationRead: () => {},
  refreshNotifications: async () => {},
  markAllNotificationsRead: async () => {},
}

const qaContextStore: {
  value: QAContextValue | null
  listeners: Set<() => void>
} = { value: null, listeners: new Set() }

function subscribe(callback: () => void): () => void {
  qaContextStore.listeners.add(callback)
  return () => qaContextStore.listeners.delete(callback)
}

function getSnapshot(): QAContextValue | null {
  return qaContextStore.value
}

function QAPlayerShellInner() {
  const qaContext = useSyncExternalStore(subscribe, getSnapshot)

  if (!qaContext) return null

  return (
    <AppContext.Provider value={DUMMY_APP_CONTEXT}>
      <QASimulatorContext.Provider value={qaContext}>
        <MemoryRouter initialEntries={['/player/game']}>
          <Routes>
            <Route path="/player/game" element={<PlayerLayout />}>
              <Route index element={<PlayerGame />} />
              <Route path="node/:nodeId" element={<PlayerNode />} />
              <Route path="evidence" element={<PlayerEvidence />} />
              <Route path="inventory" element={<PlayerInventory />} />
              <Route path="navigation" element={<PlayerNavigation />} />
              <Route path="qr" element={<PlayerQR />} />
              <Route path="leaderboard" element={<PlayerLeaderboard />} />
              <Route path="notifications" element={<PlayerNotifications />} />
              <Route path="final" element={<PlayerFinal />} />
              <Route path="complete" element={<PlayerComplete />} />
            </Route>
            <Route path="*" element={<Navigate to="/player/game" replace />} />
          </Routes>
        </MemoryRouter>
      </QASimulatorContext.Provider>
    </AppContext.Provider>
  )
}

export function QAPlayerShell() {
  const qaContext = useContext(QASimulatorContext)
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<Root | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    qaContextStore.value = qaContext

    rootRef.current = createRoot(container)
    rootRef.current.render(<QAPlayerShellInner />)

    return () => {
      rootRef.current?.unmount()
      rootRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    qaContextStore.value = qaContext
    qaContextStore.listeners.forEach(l => l())
  }, [qaContext])

  return <div ref={containerRef} />
}
