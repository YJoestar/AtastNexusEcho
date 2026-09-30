/**
 * NEXUS — Admin API Tests
 *
 * Tests the formatting, error handling, and data transformation
 * of the adminAPI client.
 *
 * The Bureau credential contract is covered here too: one wizard session must
 * carry one idempotency key, and re-issuing a team's codes must hand back the
 * plaintext codes the panel can display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminAPIError, adminAPI } from '@/lib/admin'

const invoke = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke } },
  getSupabase: () => ({ functions: { invoke } }),
}))

function lastRequestBody(): Record<string, unknown> {
  return JSON.parse(invoke.mock.calls[0][1].body as string)
}

beforeEach(() => {
  invoke.mockReset()
})

describe('AdminAPIError', () => {
  it('creates error with status and message', () => {
    const err = new AdminAPIError(403, 'Forbidden')
    expect(err.status).toBe(403)
    expect(err.message).toBe('Forbidden')
    expect(err.name).toBe('AdminAPIError')
  })

  it('inherits from Error', () => {
    const err = new AdminAPIError(500, 'Server error')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AdminAPIError)
  })
})

describe('createTeamWithPlayers', () => {
  const roster = [
    { name: 'Ada', deviceId: 'dev-1', role: 'OBSERVER' },
    { name: 'Grace', deviceId: 'dev-2', role: 'ANALYST' },
  ]

  it('sends the idempotency key and maps the issued codes', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        idempotent: false,
        team: { id: 'team-1', code: 'M4X8QZ', name: 'Acceptance Team' },
        players: [
          { player_id: 'p-1', name: 'Ada', role: 'OBSERVER', login_code: 'B9E8BA7W' },
          { player_id: 'p-2', name: 'Grace', role: 'ANALYST', login_code: 'C4D2EF31' },
        ],
      },
      error: null,
    })

    const result = await adminAPI.createTeamWithPlayers({
      teamName: 'Acceptance Team',
      players: roster,
      idempotencyKey: 'wizard-session-1',
    })

    const body = lastRequestBody()
    expect(body.action).toBe('provision-team')
    expect(body.idempotencyKey).toBe('wizard-session-1')
    // Device ids are never sent to the server.
    expect(JSON.stringify(body.players)).not.toContain('dev-1')
    expect(body.players).toEqual([
      { name: 'Ada', role: 'OBSERVER' },
      { name: 'Grace', role: 'ANALYST' },
    ])

    expect(result.success).toBe(true)
    expect(result.idempotent).toBe(false)
    expect(result.teamCode).toBe('M4X8QZ')
    expect(result.playerCodes).toEqual(['B9E8BA7W', 'C4D2EF31'])
    expect(result.provisionedPlayers).toEqual([
      { name: 'Ada', role: 'OBSERVER', loginCode: 'B9E8BA7W' },
      { name: 'Grace', role: 'ANALYST', loginCode: 'C4D2EF31' },
    ])
  })

  it('reports a deduplicated retry instead of a fresh team', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        idempotent: true,
        team: { id: 'team-1', code: 'M4X8QZ', name: 'Acceptance Team' },
        players: [{ player_id: 'p-1', name: 'Ada', role: 'OBSERVER', login_code: 'ZZZZZZZZ' }],
      },
      error: null,
    })

    const result = await adminAPI.createTeamWithPlayers({
      teamName: 'Acceptance Team',
      players: roster,
      idempotencyKey: 'wizard-session-1',
    })

    expect(result.success).toBe(true)
    expect(result.idempotent).toBe(true)
    expect(result.teamId).toBe('team-1')
    expect(result.provisionedPlayers[0].loginCode).toBe('ZZZZZZZZ')
  })

  it('never invents a key when the caller does not supply one', async () => {
    invoke.mockResolvedValue({
      data: { success: true, team: { id: 't', code: 'AAAAAA', name: 'n' }, players: [] },
      error: null,
    })

    await adminAPI.createTeamWithPlayers({ teamName: 'n', players: roster })
    expect(lastRequestBody().idempotencyKey).toBeNull()
  })

  it('returns a failure result instead of throwing when the server rejects', async () => {
    invoke.mockResolvedValue({ data: { success: false, error: 'Role is already assigned' }, error: null })

    const result = await adminAPI.createTeamWithPlayers({
      teamName: 'n',
      players: roster,
      idempotencyKey: 'k',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Role is already assigned')
    expect(result.playerCodes).toEqual([])
  })
})

describe('reissueCredentials', () => {
  it('rotates the codes of the whole team and returns them with the team code', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        team: { id: 'team-1', code: 'M4X8QZ', name: 'Acceptance Team' },
        codes: [
          { playerId: 'p-1', role: 'OBSERVER', displayName: 'Ada', loginCode: 'NEW12345' },
          { playerId: 'p-2', role: 'ANALYST', displayName: 'Grace', loginCode: 'NEW67890' },
        ],
      },
      error: null,
    })

    const result = await adminAPI.reissueCredentials('team-1')

    const body = lastRequestBody()
    expect(body).toEqual({ action: 'reissue-codes', teamId: 'team-1', playerIds: null })
    expect(result.teamCode).toBe('M4X8QZ')
    expect(result.credentials).toEqual([
      { playerId: 'p-1', role: 'OBSERVER', displayName: 'Ada', loginCode: 'NEW12345' },
      { playerId: 'p-2', role: 'ANALYST', displayName: 'Grace', loginCode: 'NEW67890' },
    ])
  })

  it('can rotate a single player', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        team: { id: 'team-1', code: 'M4X8QZ', name: 'Acceptance Team' },
        codes: [{ playerId: 'p-1', role: 'OBSERVER', displayName: 'Ada', loginCode: 'NEW12345' }],
      },
      error: null,
    })

    const result = await adminAPI.reissueCredentials('team-1', ['p-1'])

    expect(lastRequestBody().playerIds).toEqual(['p-1'])
    expect(result.credentials).toHaveLength(1)
  })

  it('surfaces a locked roster as an error rather than empty codes', async () => {
    invoke.mockResolvedValue({
      data: { success: false, error: 'Cannot issue login codes: team is ACTIVE and its roster is locked' },
      error: null,
    })

    await expect(adminAPI.reissueCredentials('team-1')).rejects.toThrow(/roster is locked/)
  })
})

describe('generateCode', () => {
  it('returns the rotated code for a single player', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        playerId: 'p-1',
        displayName: 'Ada',
        role: 'OBSERVER',
        loginCode: 'NEW12345',
      },
      error: null,
    })

    const result = await adminAPI.generateCode('p-1')

    expect(lastRequestBody()).toEqual({ action: 'generate-code', playerId: 'p-1' })
    expect(result).toEqual({
      playerId: 'p-1',
      displayName: 'Ada',
      role: 'OBSERVER',
      loginCode: 'NEW12345',
    })
  })
})
