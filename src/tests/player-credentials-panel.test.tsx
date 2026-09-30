/**
 * NEXUS — Player Access Credentials Tests
 *
 * The generated codes exist in plaintext exactly once, so the panel that shows
 * them has to be genuinely usable: full untruncated codes, per-code copy with
 * feedback, a copy-all for handing out at check-in, and a download for the
 * paper backup. It must also tell the Bureau that the codes will not be shown
 * again and where to get new ones.
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
    render(<PlayerCredentialsPanel teamCode="23C0A9" teamName="Acceptance Team" credentials={credentials} />)

    expect(screen.getByText('23C0A9')).toBeTruthy()
    for (const c of credentials) {
      expect(screen.getByText(c.loginCode)).toBeTruthy()
      expect(screen.getByText(c.displayName)).toBeTruthy()
    }
    // Full codes, never abbreviated into unreadable fragments.
    expect(screen.queryByText(/B9E8…|\.\.\./)).toBeNull()
  })

  it('copies a single code and confirms it', async () => {
    render(<PlayerCredentialsPanel teamCode="23C0A9" credentials={credentials} />)

    fireEvent.click(screen.getByRole('button', { name: "Copy Grace Hopper's code" }))

    expect(writeText).toHaveBeenCalledWith('C4D2EF31')
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: "Copy Grace Hopper's code — copied" }),
      ).toBeTruthy()
    })
  })

  it('copies every code in one action', async () => {
    render(<PlayerCredentialsPanel teamCode="23C0A9" credentials={credentials} />)

    fireEvent.click(screen.getByRole('button', { name: /COPY ALL/i }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain('Team code: 23C0A9')
    for (const c of credentials) {
      expect(copied).toContain(c.loginCode)
      expect(copied).toContain(c.displayName)
    }
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /COPIED/i })).toBeTruthy()
    })
  })

  it('downloads the codes as a text file and releases the object URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:nexus')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<PlayerCredentialsPanel teamCode="23C0A9" teamName="Acceptance Team" credentials={credentials} />)
    fireEvent.click(screen.getByRole('button', { name: /DOWNLOAD/i }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toContain('text/plain')
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nexus')

    click.mockRestore()
  })

  it('warns that the codes are single-use and where to re-issue them', () => {
    render(<PlayerCredentialsPanel teamCode="23C0A9" credentials={credentials} />)

    expect(screen.getByText(/single-use/i)).toBeTruthy()
    expect(screen.getByText(/re-issue/i)).toBeTruthy()
  })

  it('disables copy and download when there is nothing to hand out', () => {
    render(<PlayerCredentialsPanel teamCode={null} credentials={[]} />)

    expect((screen.getByRole('button', { name: /COPY ALL/i }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /DOWNLOAD/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})
