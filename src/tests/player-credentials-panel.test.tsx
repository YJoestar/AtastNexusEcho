/**
 * NEXUS — Player Logic Codes panel
 *
 * The panel is the only place a player Logic Code is ever readable, so it has
 * to be usable at a check-in desk: every code in full, one button per player
 * that copies only that code, one button that copies the whole roster, and a
 * plain-text download. It also refuses to look authoritative if the server ever
 * hands it a code the login screen would reject.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlayerCredentialsPanel } from '@/components/admin/PlayerCredentialsPanel'
import type { PlayerCredential } from '@/lib/admin'

const writeText = vi.fn().mockResolvedValue(undefined)

const credentials: PlayerCredential[] = [
  { playerId: 'p-1', displayName: 'Ada Lovelace', role: 'OBSERVER', loginCode: 'B9E8BA7W' },
  { playerId: 'p-2', displayName: 'Grace Hopper', role: 'ANALYST', loginCode: 'C4D2EF31' },
  { playerId: 'p-3', displayName: 'Alan Turing', role: 'OPERATOR', loginCode: 'D5A61B02' },
]

beforeEach(() => {
  writeText.mockClear()
  Object.assign(navigator, { clipboard: { writeText } })
})

describe('PlayerCredentialsPanel', () => {
  it('shows the team code and every player code in full', () => {
    render(<PlayerCredentialsPanel teamCode="M4X8QZ" teamName="Acceptance Team" credentials={credentials} />)

    expect(screen.getByText('M4X8QZ')).toBeTruthy()
    for (const c of credentials) {
      expect(screen.getByText(c.loginCode)).toBeTruthy()
      expect(screen.getByText(c.displayName)).toBeTruthy()
    }
    // Full codes, never abbreviated into unreadable fragments.
    expect(screen.queryByText(/B9E8…|\.\.\./)).toBeNull()
  })

  it('copies one code and nothing else, and confirms it', async () => {
    render(<PlayerCredentialsPanel teamCode="M4X8QZ" credentials={credentials} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Copy the Logic Code for Grace Hopper' }),
    )

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('C4D2EF31')
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Copy the Logic Code for Grace Hopper — copied' }),
      ).toBeTruthy()
    })
  })

  it('copies every code in one clean, numbered list', async () => {
    render(<PlayerCredentialsPanel teamCode="M4X8QZ" credentials={credentials} />)

    fireEvent.click(screen.getByRole('button', { name: /Copy all codes/i }))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toBe(
      'Team: M4X8QZ\n' +
      'Player 1 — B9E8BA7W\n' +
      'Player 2 — C4D2EF31\n' +
      'Player 3 — D5A61B02',
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied/i })).toBeTruthy()
    })
  })

  it('downloads the codes as a text file and releases the object URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:nexus')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<PlayerCredentialsPanel teamCode="M4X8QZ" teamName="Acceptance Team" credentials={credentials} />)
    fireEvent.click(screen.getByRole('button', { name: /Download/i }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toContain('text/plain')
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nexus')

    click.mockRestore()
  })

  it('warns that codes are single-use and where to get new ones', () => {
    render(<PlayerCredentialsPanel teamCode="M4X8QZ" credentials={credentials} />)

    expect(screen.getByText(/single-use/i)).toBeTruthy()
    expect(screen.getByText(/Re-issue from/i)).toBeTruthy()
  })

  it('refuses to present a code the login screen would reject', () => {
    render(
      <PlayerCredentialsPanel
        teamCode="M4X8QZ"
        credentials={[{ playerId: 'p-9', displayName: 'Bad Actor', role: 'OBSERVER', loginCode: 'B9E8BA1W' }]}
      />,
    )

    expect(screen.getByRole('alert').textContent).toMatch(/not a valid logic code/i)
  })

  it('flags a team code outside the alphabet, the way 31E3E5 was', () => {
    render(<PlayerCredentialsPanel teamCode="31E3E5" credentials={credentials} />)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('31E3E5')
    expect(alert.textContent).toMatch(/do not hand it out/i)
  })

  it('disables copy and download when there is nothing to hand out', () => {
    render(<PlayerCredentialsPanel teamCode={null} credentials={[]} />)

    expect((screen.getByRole('button', { name: /Copy all codes/i }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Download/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})
