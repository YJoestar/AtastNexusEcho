/**
 * NEXUS — Team Creation Wizard Tests
 *
 * REGRESSION TEST for the Bureau "Create Team" dead-end.
 *
 * The wizard's primary footer button used to be wrapped in `{step < 4 && ...}`
 * while its onClick was `step === 4 ? handleCreateTeam : nextStep`. Because the
 * `step === 4` branch could therefore never render, `handleCreateTeam` was
 * unreachable: step 4 rendered a blank body (it only rendered when
 * `generatedCodes` was already set) and offered no button at all. No team,
 * player or login code was ever created.
 *
 * These tests drive the real component through all four steps and assert the
 * team actually gets provisioned, plus the related provisioning invariants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamCreationWizard, TEAM_CREATION_MIN_PLAYERS } from '@/components/admin/TeamCreationWizard'
import { adminAPI } from '@/lib/admin'

const createTeamWithPlayers = vi.fn()

beforeEach(() => {
  createTeamWithPlayers.mockReset()
  vi.spyOn(adminAPI, 'createTeamWithPlayers').mockImplementation(createTeamWithPlayers)
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

/** Fill in steps 1-3 and land on the review/generate step. */
function advanceToStepFour() {
  fireEvent.change(screen.getByLabelText('Team Name'), { target: { value: 'Acceptance Team' } })
  fireEvent.change(screen.getByLabelText('Team Tag'), { target: { value: 'ACME' } })
  fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))

  const nameInputs = screen.getAllByPlaceholderText('Player name')
  nameInputs.forEach((el, i) => {
    fireEvent.change(el, { target: { value: `Player ${i + 1}` } })
  })
  fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))

  fireEvent.click(screen.getByRole('button', { name: 'Auto-assign' }))
  fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
}

describe('TeamCreationWizard', () => {
  it('requires the full roster before allowing step 3', () => {
    const onClose = vi.fn()
    render(<TeamCreationWizard isOpen onClose={onClose} onSuccess={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Team Name'), { target: { value: 'T' } })
    fireEvent.change(screen.getByLabelText('Team Tag'), { target: { value: 'T' } })
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))

    expect(screen.getByText(/All 3 players are required/)).toBeTruthy()
    expect(screen.getByText('Step 2 of 4')).toBeTruthy()
  })

  it('renders a working CREATE TEAM action on step 4 (the dead-end regression)', async () => {
    createTeamWithPlayers.mockResolvedValue({
      success: true,
      teamId: 'team-1',
      teamCode: 'M4X8QZ',
      playerCodes: ['B9E8BA7W', 'C4D2EF31', 'D5A61B02'],
      provisionedPlayers: [
        { name: 'Player 1', role: 'OBSERVER', loginCode: 'B9E8BA7W' },
        { name: 'Player 2', role: 'ANALYST', loginCode: 'C4D2EF31' },
        { name: 'Player 3', role: 'OPERATOR', loginCode: 'D5A61B02' },
      ],
    })
    const onSuccess = vi.fn()
    render(<TeamCreationWizard isOpen onClose={vi.fn()} onSuccess={onSuccess} />)

    advanceToStepFour()
    expect(screen.getByText('Step 4 of 4')).toBeTruthy()

    // The button that triggers provisioning must actually be present.
    const createButton = screen.getByRole('button', { name: 'CREATE TEAM' })
    expect(createButton).toBeTruthy()
    expect((createButton as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(createTeamWithPlayers).toHaveBeenCalledTimes(1)
    })
    const payload = createTeamWithPlayers.mock.calls[0][0]
    expect(payload.teamName).toBe('Acceptance Team')
    expect(payload.players).toHaveLength(TEAM_CREATION_MIN_PLAYERS)
    expect(payload.players.map((p: { role: string }) => p.role).sort()).toEqual(
      ['ANALYST', 'OBSERVER', 'OPERATOR'],
    )

    // Step 4 now shows the issued credentials and reports success upward.
    await waitFor(() => {
      expect(screen.getByText('TEAM READY')).toBeTruthy()
    })
    expect(screen.getByText('M4X8QZ')).toBeTruthy()
    expect(screen.getByText('B9E8BA7W')).toBeTruthy()
    expect(screen.getByText('C4D2EF31')).toBeTruthy()
    expect(screen.getByText('D5A61B02')).toBeTruthy()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('surfaces the real server error and stays on the wizard', async () => {
    createTeamWithPlayers.mockResolvedValue({
      success: false,
      teamId: '',
      teamCode: '',
      playerCodes: [],
      provisionedPlayers: [],
      error: 'Role OBSERVER is already assigned on this team',
    })
    render(<TeamCreationWizard isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    advanceToStepFour()
    fireEvent.click(screen.getByRole('button', { name: 'CREATE TEAM' }))

    await waitFor(() => {
      expect(screen.getByText('Role OBSERVER is already assigned on this team')).toBeTruthy()
    })
    // No fabricated success state, and the action stays retryable.
    expect(screen.queryByText('TEAM READY')).toBeNull()
    expect((screen.getByRole('button', { name: 'CREATE TEAM' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('blocks submission when a role is missing rather than guessing one', async () => {
    render(<TeamCreationWizard isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Team Name'), { target: { value: 'T' } })
    fireEvent.change(screen.getByLabelText('Team Tag'), { target: { value: 'T' } })
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))

    const nameInputs = screen.getAllByPlaceholderText('Player name')
    nameInputs.forEach((el, i) => {
      fireEvent.change(el, { target: { value: `Player ${i + 1}` } })
    })
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    // Deliberately skip role assignment.
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    expect(screen.getByText('All players must have a role assigned')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    expect(createTeamWithPlayers).not.toHaveBeenCalled()
  })

  it('refuses a roster with a duplicated role', async () => {
    render(<TeamCreationWizard isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Team Name'), { target: { value: 'T' } })
    fireEvent.change(screen.getByLabelText('Team Tag'), { target: { value: 'T' } })
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))

    const nameInputs = screen.getAllByPlaceholderText('Player name')
    nameInputs.forEach((el, i) => {
      fireEvent.change(el, { target: { value: `Player ${i + 1}` } })
    })
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))

    // Assign OBSERVER to every player by hand.
    const selects = screen.getAllByRole('combobox')
    selects.forEach(sel => fireEvent.change(sel, { target: { value: 'OBSERVER' } }))
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    fireEvent.click(screen.getByRole('button', { name: 'CREATE TEAM' }))

    await waitFor(() => {
      expect(screen.getByText('Role OBSERVER is assigned to more than one player')).toBeTruthy()
    })
    expect(createTeamWithPlayers).not.toHaveBeenCalled()
  })
})
