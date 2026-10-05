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
  /**
   * Why a recognised marker produced nothing, when the server said so:
   * 'node_not_open' (this team's puzzle is not at that stage) or
   * 'node_not_reached' (the marker is real but leads a puzzle the team has not
   * been given). Absent on success and on an unrecognised code.
   */
  reason?: string
  error?: string
  markerId?: string
  manualCode?: string
  deploymentStatus?: string
  qrCode?: string
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

  // A 200 carrying `success: false` is still a failure. The old guard required an
  // `error` string as well, so a failure that arrived without one - a function
  // that ran out of work mid-request - was passed to the caller as if it had
  // succeeded, and the next line read a field that was never there.
  if (result.success === false) {
    throw new GameAPIError(500, typeof result.error === 'string' && result.error ? result.error : 'The Bureau could not complete that request.')
  }

  return data as unknown as T
}

/**
 * Read one field out of a function envelope, or refuse.
 *
 * Every function here answers `{success, <key>: ...}`, and every caller then
 * dereferenced that key: `getGameState().team.status`, `scanQR(result.discovered)`.
 * The envelope is a runtime value, not a type - TypeScript checked the shape of
 * `T`, never that the server actually sent one. A function that returned 200 with
 * an unexpected body therefore turned into `Cannot read properties of undefined`,
 * which every caller caught as a generic warning and turned into an empty screen.
 *
 * A missing payload is a real fault, so it is reported as one.
 */
function requirePayload<T>(envelope: unknown, key: string): T {
  if (!envelope || typeof envelope !== 'object') {
    throw new GameAPIError(500, 'The Bureau sent an empty response')
  }
  const value = (envelope as Record<string, unknown>)[key]
  if (value === undefined || value === null) {
    throw new GameAPIError(500, `The Bureau sent no ${key} in its response`)
  }
  return value as T
}

/**
 * Normalise one `get_team_node_progress` row.
 *
 * The database names the node's code `code`:
 *
 *   jsonb_build_object('nodeId', np.node_id::text, 'code', n.code, ...)
 *                                                  ^^^^^
 *   (supabase/migrations/2026093001_fix_team_aggregate_order_by.sql:37)
 *
 * but `NodeProgressEntry` declares `nodeCode`, and every client read used that
 * name. At runtime `p.nodeCode` was therefore always `undefined`, and every
 * lookup that compared it against a node code - which is how the app addresses
 * nodes everywhere, because URLs carry codes like "P01" - silently matched
 * nothing. The consequences were all invisible rather than loud:
 *
 *   - `findProgressEntry('P01')` never matched, so a node the team had solved
 *     was reported `isSolved: false` and `attempts: 0`;
 *   - `solvedNodes` fell back to the UUID (`p.nodeCode ?? p.nodeId`), and the map
 *     and ledger compare against codes, so a solved node never lit up - the
 *     player's own progress was invisible on every screen that reads it.
 *
 * Read at the boundary rather than renamed in the database: this is the one
 * place that knows both shapes, it tolerates either name, and no caller has to
 * be changed. `startedAt` is not published by the server at all, so it is
 * normalised to null rather than invented.
 */
function normalizeProgressEntry(raw: unknown): NodeProgressEntry {
  const row = (raw ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    nodeId: str(row.nodeId),
    // `nodeCode` first so a future server rename wins; `code` is what it sends now.
    nodeCode: str(row.nodeCode ?? row.code),
    title: str(row.title),
    type: str(row.type),
    stage: num(row.stage),
    status: str(row.status) as NodeProgressEntry['status'],
    startedAt: typeof row.startedAt === 'string' ? row.startedAt : null,
    solvedAt: typeof row.solvedAt === 'string' ? row.solvedAt : null,
    attempts: num(row.attempts),
    hintsUsed: num(row.hintsUsed),
    pointsAwarded: num(row.pointsAwarded),
  }
}

export const gameAPI = {
  async getNode(nodeId: string, role?: string): Promise<NodeDetailPlayerView> {
    return callFunction<{ node: NodeDetailPlayerView }>('game-get-node', { nodeId, role })
      .then(res => requirePayload<NodeDetailPlayerView>(res, 'node'))
  },

  async getGameState(): Promise<TeamGameState> {
    return callFunction<{ gameState: TeamGameState }>('game-get-state')
      .then(res => requirePayload<TeamGameState>(res, 'gameState'))
  },

  async submitAnswer(nodeId: string, answer: string): Promise<SubmissionResult> {
    return callFunction<{ result: SubmissionResult }>('game-submit', { nodeId, answer })
      .then(res => requirePayload<SubmissionResult>(res, 'result'))
  },

  async scanQR(qrCode: string): Promise<QRScanResponse> {
    return callFunction<{ result: QRScanResponse }>('game-scan-qr', { qrCode })
      .then(res => requirePayload<QRScanResponse>(res, 'result'))
  },

  async useHint(nodeId: string, hintNumber: number): Promise<HintResult> {
    return callFunction<{ result: HintResult }>('game-use-hint', { nodeId, hintNumber })
      .then(res => requirePayload<HintResult>(res, 'result'))
  },

  async getNotifications(unreadOnly = true): Promise<Notification[]> {
    const res = await callFunction<{ notifications: Notification[] }>('game-notifications', { unreadOnly })
    // An empty list is the normal, correct answer here, so only `undefined` is a
    // fault - a missing key means the caller got no list at all.
    return requirePayload<Notification[]>(res, 'notifications')
  },

  async markNotificationsRead(): Promise<void> {
    await callFunction('game-mark-read')
  },

  async getInventory(): Promise<{ evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] }> {
    return callFunction<{ inventory: { evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] } }>('game-inventory')
      .then(res => requirePayload<{ evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] }>(res, 'inventory'))
  },

  async getNodeProgress(): Promise<NodeProgressEntry[]> {
    const res = await callFunction<{ progress: unknown[] }>('game-node-progress')
    return requirePayload<unknown[]>(res, 'progress').map(normalizeProgressEntry)
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return callFunction<{ leaderboard: LeaderboardEntry[] }>('game-leaderboard')
      .then(res => requirePayload<LeaderboardEntry[]>(res, 'leaderboard'))
  },
}

export { GameAPIError }
