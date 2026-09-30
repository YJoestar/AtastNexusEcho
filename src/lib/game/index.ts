/**
 * NEXUS — Game Engine Client API
 *
 * Typed wrappers around the game edge functions.
 * SECURITY: This client NEVER requests or returns answers/solutions.
 * All answer validation happens server-side via RPC functions.
 */

import { supabase } from '../supabase/client'
import type {
  NodeDetailPlayerView,
  TeamGameState,
  SubmissionResult,
  HintResult,
  Notification,
  InventoryItem,
  FragmentItem,
  EvidenceItem,
  LeaderboardEntry,
  NodeProgressEntry,
} from '../../types/game-engine'

class GameAPIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GameAPIError'
    this.status = status
  }
}

/**
 * scan_qr_code() never reveals what a locked marker points to. It answers with
 * {discovered:false} for anything the team has not reached yet, so a marker
 * cannot be used to scout ahead.
 */
export interface QRScanResponse {
  discovered: boolean
  qrLabel?: string
  nodeCode?: string
  nodeTitle?: string
  alreadyClaimed?: boolean
  error?: string
}

async function callFunction<T>(name: string, body: unknown = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

  if (error) {
    let message = error.message
    let status = 500

    const ctx = (error as { context?: { response?: unknown; status?: number } }).context
    if (ctx) {
      if (typeof ctx.status === 'number') status = ctx.status
      const resp = ctx.response
      if (resp != null) {
        if (typeof resp === 'string') {
          try {
            const parsed = JSON.parse(resp)
            if (parsed?.error) message = String(parsed.error)
          } catch {
            message = resp
          }
        } else if (typeof resp === 'object') {
          const b = resp as { error?: string; message?: string }
          if (b.error) message = b.error
          else if (b.message) message = b.message
        }
      }
    }

    throw new GameAPIError(status, message)
  }

  const result = data as { success?: boolean; error?: string } | null

  if (!result) {
    throw new GameAPIError(500, 'No response from server')
  }

  if (!result.success && result.error) {
    throw new GameAPIError(500, result.error)
  }

  return data as unknown as T
}

export const gameAPI = {
  async getNode(nodeId: string, role?: string): Promise<NodeDetailPlayerView> {
    return callFunction<{ node: NodeDetailPlayerView }>('game-get-node', { nodeId, role })
      .then(res => res.node)
  },

  async getGameState(): Promise<TeamGameState> {
    return callFunction<{ gameState: TeamGameState }>('game-get-state')
      .then(res => res.gameState)
  },

  async submitAnswer(nodeId: string, answer: string): Promise<SubmissionResult> {
    return callFunction<{ result: SubmissionResult }>('game-submit', { nodeId, answer })
      .then(res => res.result)
  },

  async scanQR(qrCode: string): Promise<QRScanResponse> {
    return callFunction<{ result: QRScanResponse }>('game-scan-qr', { qrCode })
      .then(res => res.result)
  },

  async useHint(nodeId: string, hintNumber: number): Promise<HintResult> {
    return callFunction<{ result: HintResult }>('game-use-hint', { nodeId, hintNumber })
      .then(res => res.result)
  },

  async getNotifications(unreadOnly = true): Promise<Notification[]> {
    return callFunction<{ notifications: Notification[] }>('game-notifications', { unreadOnly })
      .then(res => res.notifications)
  },

  async markNotificationsRead(): Promise<void> {
    await callFunction('game-mark-read')
  },

  async getInventory(): Promise<{ evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] }> {
    return callFunction<{ inventory: { evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] } }>('game-inventory')
      .then(res => res.inventory)
  },

  async getNodeProgress(): Promise<NodeProgressEntry[]> {
    return callFunction<{ progress: NodeProgressEntry[] }>('game-node-progress')
      .then(res => res.progress)
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return callFunction<{ leaderboard: LeaderboardEntry[] }>('game-leaderboard')
      .then(res => res.leaderboard)
  },
}

export { GameAPIError }
