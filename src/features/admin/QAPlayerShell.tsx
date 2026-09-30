/**
 * NEXUS — QA Player Shell
 *
 * Renders the production player screens inside an isolated MemoryRouter so
 * they can be navigated without affecting the main app router. The
 * QASimulatorProvider is provided by the parent QAHub — this shell only adds
 * the router and player layout chrome.
 */

import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export function QAPlayerShell() {
  return (
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
          <Route index element={<Navigate to="/player/game" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/player/game" replace />} />
      </Routes>
    </MemoryRouter>
  )
}
