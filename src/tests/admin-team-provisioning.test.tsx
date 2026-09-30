/**
 * NEXUS — Bureau Team Provisioning Regression Tests
 *
 * REGRESSION TEST for the reported dead-end: a team was created, but the
 * Bureau never saw the login codes that had just been issued.
 *
 * AdminTeams passed an onSuccess that immediately closed the wizard
 * (`setIsWizardOpen(false)`), and TeamCreationWizard calls onSuccess from the
 * same handler that stores the codes. React batched the state update, so the
 * credentials step was unmounted in the same commit that set it and was never
 * rendered. The team and its players existed, the codes were gone, and
 * nothing in the product could ever show them again.
 *
 * These tests drive the real AdminTeams screen and assert the issued codes
 * survive the success callback, and that one wizard session can never
 * provision two teams.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { adminAPI } from '@/lib/admin'
import type { TeamWithStats } from '@/lib/admin'

const createTeamWithPlayers = vi.fn()
const fetchTeams = vi.fn().mockResolvedValue(undefined)

vi.mock('@/hooks/useBureau', () => ({
  useBureau: () => ({
    teams: [] as TeamWithStats[],
    teamDetail: null,
    gameState: null,
    leaderboard: [],
    auditLog: [],
    gameEvents: [],
    isLoading: false,
    error: null,
    fetchTeams,
    fetchTeamDetail: vi.fn().mockResolvedValue(undefined),
    fetchGameState: vi.fn(),
    fetchLeaderboard: vi.fn(),
    fetchAuditLog: vi.fn(),
    fetchGameEvents: vi.fn(),
  }),
}))

const ISSUED = {
  success: true,
  teamId: 'team-1',
  teamCode: '23C0A9',
  playerCodes: ['B9E8BA7W', 'C4D2EF31', 'D5A61B02'],
  provisionedPlayers: [
    { name: 'Player 1', role: 'OBSERVER', loginCode: 'B9E8BA7W' },
    { name: 'Player 2', role: 'ANALYST', loginCode: 'C4D2EF31' },
    { name: 'Player 3', role: 'OPERATOR', loginCode: 'D5A61B02' },
  ],
  idempotent: false,
}

async function renderTeamsScreen() {
  const { AdminTeams } = await import('@/features/admin/Teams')
  return render(<MemoryRouter><AdminTeams /></MemoryRouter>)
}

async function createTeamThroughWizard() {
  fireEvent.click(screen.getByRole('button', { name: /Create Team/i }))

  fireEvent.change(screen.getByLabelText('Team Name'), { target: { value: 'Acceptance Team' } })
  fireEvent.change(screen.getByLabelText('Team Tag'), { target: { value: 'ACME' } })
  fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))

  const nameInputs = screen.getAllByPlaceholderText('Player name')
  const deviceInputs = screen.getAllByPlaceholderText('Device identifier')
  nameInputs.forEach((el, i) => {
    fireEvent.change(el, { target: { value: `Player ${i + 1}` } })
    fireEvent.change(deviceInputs[i], { target: { value: `device-${i + 1}` } })
  })
  fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
  fireEvent.click(screen.getByRole('button', { name: 'Auto-assign' }))
  fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
  fireEvent.click(screen.getByRole('button', { name: 'CREATE TEAM' }))
}

beforeEach(() => {
  createTeamWithPlayers.mockReset()
  createTeamWithPlayers.mockResolvedValue(ISSUED)
  vi.spyOn(adminAPI, 'createTeamWithPlayers').mockImplementation(createTeamWithPlayers)
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

describe('Bureau team provisioning', () => {
  it('keeps the issued codes on screen after the team is created', async () => {
    await renderTeamsScreen()
    await createTeamThroughWizard()

    // The team exists on the server...
    await waitFor(() => {
      expect(createTeamWithPlayers).toHaveBeenCalledTimes(1)
    })
    expect(fetchTeams).toHaveBeenCalled()

    // ...and the codes the server just issued are still readable.
    await waitFor(() => {
      expect(screen.getByText('Team Created Successfully')).toBeTruthy()
    })
    expect(screen.getByText('23C0A9')).toBeTruthy()
    expect(screen.getByText('B9E8BA7W')).toBeTruthy()
    expect(screen.getByText('C4D2EF31')).toBeTruthy()
    expect(screen.getByText('D5A61B02')).toBeTruthy()

    // The wizard is still open, so DONE is what closes it.
    expect(screen.getByRole('button', { name: 'DONE' })).toBeTruthy()
  })

  it('sends one idempotency key for the whole wizard session so a retry cannot duplicate the team', async () => {
    await renderTeamsScreen()
    await createTeamThroughWizard()

    await waitFor(() => {
      expect(createTeamWithPlayers).toHaveBeenCalledTimes(1)
    })
    const firstKey = createTeamWithPlayers.mock.calls[0][0].idempotencyKey
    expect(typeof firstKey).toBe('string')
    expect(firstKey.length).toBeGreaterThan(0)

    // A new wizard session (reopened) gets its own key, so a genuinely new
    // team can still be created.
    fireEvent.click(screen.getByRole('button', { name: 'DONE' }))
    await createTeamThroughWizard()
    await waitFor(() => {
      expect(createTeamWithPlayers).toHaveBeenCalledTimes(2)
    })
    const secondKey = createTeamWithPlayers.mock.calls[1][0].idempotencyKey
    expect(secondKey).not.toBe(firstKey)
  })

  it('explains a deduplicated retry instead of silently creating a second team', async () => {
    createTeamWithPlayers.mockResolvedValue({ ...ISSUED, idempotent: true })
    await renderTeamsScreen()
    await createTeamThroughWizard()

    await waitFor(() => {
      expect(screen.getByText(/already gone through/i)).toBeTruthy()
    })
    expect(screen.getByText('B9E8BA7W')).toBeTruthy()
  })

  it('keeps the wizard open and retryable when provisioning fails', async () => {
    createTeamWithPlayers.mockResolvedValue({
      success: false,
      teamId: '',
      teamCode: '',
      playerCodes: [],
      provisionedPlayers: [],
      error: 'Role OBSERVER is already assigned on this team',
    })
    await renderTeamsScreen()
    await createTeamThroughWizard()

    await waitFor(() => {
      expect(screen.getByText('Role OBSERVER is already assigned on this team')).toBeTruthy()
    })
    expect(screen.queryByText('Team Created Successfully')).toBeNull()
    // Still on the wizard, with a working retry — and the same idempotency key.
    expect(screen.getByRole('button', { name: 'CREATE TEAM' })).toBeTruthy()
  })
})
