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
 *
 * Two things here are load-bearing under React StrictMode, which mounts, tears
 * down and re-runs every effect:
 *
 *   1. `subscribe` must return an unsubscribe FUNCTION. React uses the return
 *      value directly as the effect cleanup, so returning Set.delete's boolean
 *      made StrictMode's teardown throw, which left this pane permanently
 *      empty.
 *   2. The second root must never be torn down with `unmount()`. React tears
 *      effects down while it is still rendering, where a synchronous unmount
 *      loses the race and takes the rendered tree with it. The root is created
 *      once and cleared with `render(null)`, which is scheduled and safe.
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
  return () => {
    qaContextStore.listeners.delete(callback)
  }
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

    // Publish before the first render: the store-backed root reads this value
    // during its initial render, and there is no notification to wait for on a
    // value that was already set.
    qaContextStore.value = qaContext
    qaContextStore.listeners.forEach(l => l())

    // Create the second root exactly once and keep it for the shell's life.
    // StrictMode tears this effect down and runs it again immediately; calling
    // unmount() in that window leaves the pane empty for the rest of the
    // session, which is how a simulator ends up showing nothing at all.
    if (!rootRef.current) {
      rootRef.current = createRoot(container)
    }
    rootRef.current.render(<QAPlayerShellInner />)

    return () => {
      // Clear the tree rather than unmounting the root. render(null) is
      // scheduled, so it is safe to issue while React is still rendering;
      // unmount() is not.
      rootRef.current?.render(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    qaContextStore.value = qaContext
    qaContextStore.listeners.forEach(l => l())
  }, [qaContext])

  return <div ref={containerRef} />
}
