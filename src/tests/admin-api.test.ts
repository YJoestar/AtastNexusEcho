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

  it('extracts the real error from a non-2xx response context instead of a generic message', async () => {
    const httpError = new Error('Edge Function returned a non-2xx status code')
    Object.assign(httpError, { context: {
      response: { error: 'Cannot issue login codes: team is ACTIVE and its roster is locked' },
      status: 403,
    } })

    invoke.mockResolvedValue({ data: null, error: httpError })

    await expect(adminAPI.reissueCredentials('team-1')).rejects.toThrow(/roster is locked/)
    await expect(adminAPI.reissueCredentials('team-1')).rejects.toMatchObject({ status: 403 })
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

describe('listQRCodes', () => {
  it('normalizes camelCase and snake_case fields from the edge function', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        qrCodes: [
          {
            id: 'qr-1',
            code: 'QR-NODE-02',
            label: '[ADMIN BUILDING] — Main Entrance Facade',
            type: 'NAVIGATION',
            puzzle_node_id: 'node-1',
            position: { x: 0, y: 0 },
            metadata: { puzzleCode: 'P01', stage: 1 },
            marker_id: 'NX-037-A',
            manual_code: '037-A-4821',
            deployment_status: 'GENERATED',
            deployment_batch: 'BATCH-01',
            puzzle_nodes: {
              code: 'P01',
              title: 'The Facade',
              type: 'OBSERVATION',
              stage: 1,
              location: '[ADMIN BUILDING] — Main Entrance Facade',
            },
          },
          {
            id: 'qr-2',
            code: 'QR-NODE-37',
            label: '[NEXUS CORE] — GM Observation Deck',
            type: 'NAVIGATION',
            puzzle_node_id: 'node-2',
            position: { x: 0, y: 35 },
            metadata: { puzzleCode: 'P36', stage: 5 },
            puzzle_nodes: {
              code: 'P36',
              title: 'The GM Intervention',
              type: 'META',
              stage: 5,
              location: '[NEXUS CORE] — GM Observation Deck',
            },
          },
        ],
      },
      error: null,
    })

    const result = await adminAPI.listQRCodes()

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'qr-1',
      code: 'QR-NODE-02',
      label: '[ADMIN BUILDING] — Main Entrance Facade',
      type: 'NAVIGATION',
      puzzleNodeCode: 'P01',
      puzzleNodeTitle: 'The Facade',
      puzzleNodeType: 'OBSERVATION',
      puzzleNodeStage: 1,
      puzzleNodeLocation: '[ADMIN BUILDING] — Main Entrance Facade',
      markerId: 'NX-037-A',
      manualCode: '037-A-4821',
      deploymentStatus: 'GENERATED',
      deploymentBatch: 'BATCH-01',
      caseNumber: '037',
      building: 'ADMIN BUILDING',
    })
    expect(result[1].puzzleNodeStage).toBe(5)
    expect(lastRequestBody().action).toBe('list-qr-codes')
  })

  it('returns empty array when no qrCodes field is present', async () => {
    invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    })

    const result = await adminAPI.listQRCodes()
    expect(result).toEqual([])
    expect(lastRequestBody().action).toBe('list-qr-codes')
  })
})

describe('listPuzzleQA', () => {
  it('calls the list-puzzle-qa action and returns puzzles', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        puzzles: [
          {
            id: 'node-1',
            code: 'P17',
            title: 'The Audio Log',
            type: 'AUDIO',
            stage: 4,
            location: '[SCIENCE BUILDING] — Auditorium Stage',
            prerequisites: ['P16'],
            branches: { nextNodes: ['P18'], unlocks: 'P18' },
            content: { observer: { dataPayload: 'SPECTRUM: 1747 Hz, 2147 Hz' } },
            answerMetadata: { acceptedAnswer: 'ECHO' },
            evidence: [],
            audioEvidence: [
              {
                id: 'node-1-content',
                title: 'Puzzle Content Audio (P17)',
                type: 'AUDIO',
                audioUrl: '/audio/p17-audio-log-transmission.mp3',
                audioExists: true,
                nodeCode: 'P17',
              },
            ],
          },
          {
            id: 'node-2',
            code: 'P24b',
            title: 'The Audio Contradiction',
            type: 'NARRATIVE_INVESTIGATION',
            stage: 4,
            location: '[ENGINEERING BLOCK] — Antenna Deck',
            prerequisites: ['P24'],
            branches: { nextNodes: ['P25'], unlocks: 'P25' },
            content: { observer: { dataPayload: 'AUDIO TRANSCRIPT' } },
            answerMetadata: { acceptedAnswer: 'VALE' },
            evidence: [
              {
                id: 'evid-1',
                type: 'AUDIO',
                title: 'Interrogation Recording REC-19',
                content: { text: '...', audio_url: '/audio/dictaphone-rec-24-gm-key.mp3' },
                metadata: { nodeCode: 'P32' },
              },
            ],
            audioEvidence: [],
          },
        ],
      },
      error: null,
    })

    const result = await adminAPI.listPuzzleQA()

    expect(lastRequestBody().action).toBe('list-puzzle-qa')
    expect(result).toHaveLength(2)
    expect(result[0].code).toBe('P17')
    expect(result[0].audioEvidence).toHaveLength(1)
    expect(result[0].audioEvidence[0].audioExists).toBe(true)
    expect(result[1].answerMetadata?.acceptedAnswer).toBe('VALE')
  })

  it('returns empty array when no puzzles field is present', async () => {
    invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    })

    const result = await adminAPI.listPuzzleQA()
    expect(result).toEqual([])
    expect(lastRequestBody().action).toBe('list-puzzle-qa')
  })
})

describe('formatTeamWithStats camelCase', () => {
  it('reads camelCase fields returned by list-teams edge function', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        teams: [
          {
            id: 'team-1',
            name: 'Alpha',
            code: 'A1B2C3',
            status: 'COMPLETED',
            createdAt: '2026-09-30T00:00:00Z',
            startedAt: '2026-09-30T01:00:00Z',
            completedAt: '2026-09-30T04:00:00Z',
            score: 150,
            currentNodeId: 'node-1',
            currentNodeCode: 'P35',
            playerCount: 3,
            playerRoles: ['OBSERVER', 'ANALYST', 'OPERATOR'],
            hintsUsed: 2,
            solvedCount: 30,
            gameStartedAt: '2026-09-30T01:00:00Z',
            gameDeadline: '2026-09-30T04:30:00Z',
            gameDurationMinutes: 180,
            metadata: {},
          },
        ],
      },
      error: null,
    })

    const result = await adminAPI.listTeams()
    expect(result[0].playerCount).toBe(3)
    expect(result[0].playerRoles).toEqual(['OBSERVER', 'ANALYST', 'OPERATOR'])
    expect(result[0].hintsUsed).toBe(2)
    expect(result[0].solvedCount).toBe(30)
    expect(result[0].currentNodeCode).toBe('P35')
    expect(result[0].gameStartedAt).toBe('2026-09-30T01:00:00Z')
    expect(result[0].gameDurationMinutes).toBe(180)
    expect(result[0].createdAt).toBe('2026-09-30T00:00:00Z')
  })

  it('still reads snake_case fields for backward compatibility', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        teams: [
          {
            id: 'team-2',
            name: 'Beta',
            code: 'D4E5F6',
            status: 'ACTIVE',
            created_at: '2026-09-30T00:00:00Z',
            started_at: '2026-09-30T01:00:00Z',
            completed_at: null,
            score: 75,
            current_node_id: 'node-2',
            current_node_code: 'P20',
            player_count: 2,
            player_roles: ['OBSERVER', 'OPERATOR'],
            hints_used: 1,
            solved_count: 15,
            game_started_at: '2026-09-30T01:00:00Z',
            game_deadline: '2026-09-30T04:30:00Z',
            game_duration_minutes: 180,
            metadata: {},
          },
        ],
      },
      error: null,
    })

    const result = await adminAPI.listTeams()
    expect(result[0].playerCount).toBe(2)
    expect(result[0].hintsUsed).toBe(1)
    expect(result[0].solvedCount).toBe(15)
    expect(result[0].createdAt).toBe('2026-09-30T00:00:00Z')
  })
})
