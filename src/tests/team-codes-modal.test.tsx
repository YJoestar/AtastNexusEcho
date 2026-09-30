/**
 * NEXUS — SHOW TEAM CODES
 *
 * The rule this screen exists to keep: looking at a code must never change it.
 * A player is standing at the desk holding the code that is on the screen; if
 * merely opening this view rotated anything, the code they are reading would be
 * dead the moment it was read.
 *
 * So these tests pin the two halves of that promise: the display shows what
 * already exists, and it says the truth about the codes that are gone instead of
 * quietly making up new ones.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamCodesModal } from '@/components/admin/TeamCodesModal'
import { adminAPI } from '@/lib/admin'
import type { RevealedTeamCodes } from '@/lib/admin'

const revealTeamCodes = vi.fn()

function codes(overrides: Partial<RevealedTeamCodes> = {}): RevealedTeamCodes {
  return {
    teamId: 'team-1',
    teamCode: 'M4X8QZ',
    teamName: 'Acceptance Team',
    players: [
      { playerId: 'p-1', displayName: 'Ada Lovelace', role: 'OBSERVER', status: 'INVITED', loginCode: 'K7MP2QRT', needsReissue: false, used: false },
      { playerId: 'p-2', displayName: 'Grace Hopper', role: 'ANALYST', status: 'INVITED', loginCode: 'W3XZ8NDJ', needsReissue: false, used: false },
      { playerId: 'p-3', displayName: 'Alan Turing', role: 'OPERATOR', status: 'INVITED', loginCode: 'B9HC4VKM', needsReissue: false, used: false },
    ],
    ...overrides,
  }
}

function open(overrides: Partial<RevealedTeamCodes> = {}) {
  revealTeamCodes.mockResolvedValue(codes(overrides))
  return render(
    <TeamCodesModal
      isOpen
      teamId="team-1"
      teamNameHint="Acceptance Team"
      onClose={() => {}}
    />,
  )
}

describe('TeamCodesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(adminAPI, 'revealTeamCodes').mockImplementation(revealTeamCodes)
  })

  it('shows every player code as soon as it opens', async () => {
    open()

    expect(await screen.findByText('K7MP2QRT')).toBeTruthy()
    expect(screen.getByText('W3XZ8NDJ')).toBeTruthy()
    expect(screen.getByText('B9HC4VKM')).toBeTruthy()
  })

  it('reads the codes without ever asking the server to change them', async () => {
    open()

    await screen.findByText('K7MP2QRT')
    expect(revealTeamCodes).toHaveBeenCalledTimes(1)
    expect(revealTeamCodes).toHaveBeenCalledWith('team-1')

    // The modal exposes no way to rotate: re-issue stays its own explicit action.
    expect(screen.queryByRole('button', { name: /re-issue/i })).toBeNull()
  })

  it('names each player so nobody has to ask which code is theirs', async () => {
    open()

    await screen.findByText('K7MP2QRT')
    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('Grace Hopper')).toBeTruthy()
    expect(screen.getByText('Alan Turing')).toBeTruthy()
    expect(screen.getByText('Player 1')).toBeTruthy()
    expect(screen.getByText('Player 2')).toBeTruthy()
    expect(screen.getByText('Player 3')).toBeTruthy()
  })

  it('shows the team code next to the team it belongs to', async () => {
    open()

    await screen.findByText('K7MP2QRT')
    expect(screen.getByLabelText(/Login codes for Acceptance Team/)).toBeTruthy()
    expect(screen.getByText('M4X8QZ')).toBeTruthy()
  })

  it('reports a player who already logged in instead of inventing a code', async () => {
    open({
      players: [
        { playerId: 'p-1', displayName: 'Ada Lovelace', role: 'OBSERVER', status: 'ACTIVE', loginCode: null, needsReissue: false, used: true },
      ],
    })

    expect(await screen.findByText('Already logged in')).toBeTruthy()
    expect(screen.getByText(/no longer exists/)).toBeTruthy()
  })

  it('flags a live code it cannot decrypt as needing a re-issue, not as missing', async () => {
    open({
      players: [
        { playerId: 'p-1', displayName: 'Ada Lovelace', role: 'OBSERVER', status: 'INVITED', loginCode: null, needsReissue: true, used: false },
      ],
    })

    expect(await screen.findByText('Re-issue needed')).toBeTruthy()
    expect(screen.getByText(/has to be re-issued/)).toBeTruthy()
  })

  it('never re-reads the codes on a timer', async () => {
    const { rerender } = open()
    await screen.findByText('K7MP2QRT')

    rerender(
      <TeamCodesModal
        isOpen
        teamId="team-1"
        teamNameHint="Acceptance Team"
        onClose={() => {}}
      />,
    )

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(revealTeamCodes).toHaveBeenCalledTimes(1)
  })

  it('leaves on Escape, on the × and on CLOSE', async () => {
    const onClose = vi.fn()
    revealTeamCodes.mockResolvedValue(codes())

    const { rerender } = render(
      <TeamCodesModal isOpen teamId="team-1" onClose={onClose} />,
    )
    await screen.findByText('K7MP2QRT')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }))
    expect(onClose).toHaveBeenCalledTimes(3)

    rerender(<TeamCodesModal isOpen={false} teamId="team-1" onClose={onClose} />)
    expect(screen.queryByText('K7MP2QRT')).toBeNull()
  })

  it('tells the Bureau when the codes could not be read at all', async () => {
    revealTeamCodes.mockRejectedValue(new Error('Team not found'))
    render(<TeamCodesModal isOpen teamId="team-1" onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Team not found'))
  })

  it('lays a four-player team out in a grid, with no sideways scrolling', async () => {
    open({
      players: [
        { playerId: 'p-1', displayName: 'A', role: 'OBSERVER', status: 'INVITED', loginCode: 'K7MP2QRT', needsReissue: false, used: false },
        { playerId: 'p-2', displayName: 'B', role: 'ANALYST', status: 'INVITED', loginCode: 'W3XZ8NDJ', needsReissue: false, used: false },
        { playerId: 'p-3', displayName: 'C', role: 'OPERATOR', status: 'INVITED', loginCode: 'B9HC4VKM', needsReissue: false, used: false },
        { playerId: 'p-4', displayName: 'D', role: 'OPERATOR', status: 'INVITED', loginCode: 'Z2LP7HXC', needsReissue: false, used: false },
      ],
    })

    await screen.findByText('Z2LP7HXC')
    const grid = screen.getByText('K7MP2QRT').closest('.grid')
    expect(grid?.className).toContain('grid-cols-1')
    expect(grid?.className).toContain('xl:grid-cols-4')
  })

  it('copies one code on its own, for a player who wants it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    open()
    await screen.findByText('K7MP2QRT')

    fireEvent.click(screen.getByRole('button', { name: /Copy Ada Lovelace's code/ }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('K7MP2QRT'))
  })

  it('handles a single-player team without an empty-looking grid', async () => {
    open({
      players: [
        { playerId: 'p-1', displayName: 'Solo', role: 'OPERATOR', status: 'INVITED', loginCode: 'K7MP2QRT', needsReissue: false, used: false },
      ],
    })

    await screen.findByText('K7MP2QRT')
    expect(screen.getByText('Solo')).toBeTruthy()
  })
})
