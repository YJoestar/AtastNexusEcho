/**
 * `get_team_node_progress` names the node's code `code`. The client called it
 * `nodeCode`. Nothing warned about it, because TypeScript had no way to see the
 * value - only the shape - and every read of the mismatched field fell back to
 * something harmless-looking.
 *
 * The app addresses nodes by code everywhere (routes carry "P01"), so every code
 * comparison failed at runtime while still type-checking:
 *
 *   findProgressEntry('P01')  -> undefined, so a solved node read as unsolved
 *   solvedNodes               -> UUIDs, so the map and ledger never lit a cell
 *   useCampusMap              -> same, so no node ever showed a real status
 *
 * This is the regression test for that: the wire shape is the real one from
 * migration 2026093001, and the parsed result must still answer code lookups.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const invoke = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}))

const { gameAPI } = await import('@/lib/game')

/** Exactly the object jsonb_build_object produces, key for key. */
const serverRow = {
  nodeId: '11111111-1111-1111-1111-111111111111',
  code: 'P01',
  title: 'The Facade',
  type: 'OBSERVATION',
  difficulty: 2,
  location: 'Archive Building',
  stage: 1,
  status: 'SOLVED',
  solvedAt: '2026-02-02T10:00:00Z',
  attempts: 3,
  hintsUsed: 1,
  isCurrent: false,
  pointsAwarded: 50,
}

beforeEach(() => {
  invoke.mockReset().mockResolvedValue({ data: { success: true, progress: [serverRow] }, error: null })
})

describe('getNodeProgress', () => {
  it('exposes the node code under the name the client actually reads', async () => {
    const [entry] = await gameAPI.getNodeProgress()
    expect(entry.nodeCode).toBe('P01')
  })

  it('keeps the counters the server published instead of dropping them', async () => {
    const [entry] = await gameAPI.getNodeProgress()
    expect(entry.attempts).toBe(3)
    expect(entry.hintsUsed).toBe(1)
    expect(entry.solvedAt).toBe('2026-02-02T10:00:00Z')
    expect(entry.status).toBe('SOLVED')
  })

  it('reports startedAt as null rather than inventing it', async () => {
    // The RPC publishes solvedAt but not startedAt. Undefined leaking into a
    // `string | null` field is how a `new Date(undefined)` reaches the UI.
    const [entry] = await gameAPI.getNodeProgress()
    expect(entry.startedAt).toBeNull()
  })

  it('still accepts a server that sends nodeCode directly', async () => {
    invoke.mockResolvedValue({
      data: { success: true, progress: [{ ...serverRow, code: undefined, nodeCode: 'P09' }] },
      error: null,
    })
    const [entry] = await gameAPI.getNodeProgress()
    expect(entry.nodeCode).toBe('P09')
  })

  it('normalises a malformed row instead of propagating undefined', async () => {
    invoke.mockResolvedValue({ data: { success: true, progress: [null, {}, 'nonsense'] }, error: null })
    const rows = await gameAPI.getNodeProgress()
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(typeof row.nodeId).toBe('string')
      expect(typeof row.nodeCode).toBe('string')
      expect(typeof row.attempts).toBe('number')
      expect(Number.isNaN(row.stage)).toBe(false)
    }
  })
})

describe('a 200 that reports failure', () => {
  it('raises rather than handing the caller an envelope with no payload', async () => {
    // No `error` string. The old guard required one, so `!result.success &&
    // result.error` was false and the envelope was returned as if it had worked -
    // the next line then read a field that was never sent.
    invoke.mockResolvedValue({ data: { success: false }, error: null })
    await expect(gameAPI.getGameState()).rejects.toThrow(/could not complete/i)
  })

  it('raises when a successful response omits its payload', async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null })
    await expect(gameAPI.getGameState()).rejects.toThrow(/no gameState/i)
  })

  it('raises on an empty body rather than returning undefined', async () => {
    invoke.mockResolvedValue({ data: null, error: null })
    await expect(gameAPI.getGameState()).rejects.toThrow(/no response/i)
  })
})
