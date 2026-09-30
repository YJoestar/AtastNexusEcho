/**
 * NEXUS — Bureau Credential Recovery Tests
 *
 * The other half of the reported dead-end: a team that was created before the
 * codes were ever displayed has to be recoverable. Teams -> team -> Player
 * Access Codes re-issues working codes, and TeamDetail used to throw the
 * generated code away (it called adminAPI.generateCode and discarded the
 * result), so there was no way to ever see a code again.
 *
 * Re-issuing rotates the stored hash, so the confirmation has to make the
 * consequence explicit, and the resulting codes have to be on screen.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { adminAPI } from '@/lib/admin'
import type { TeamDetailFull } from '@/lib/admin'

const reissueCredentials = vi.fn()
const fetchTeamDetail = vi.fn()

const teamDetail: TeamDetailFull = {
  team: {
    id: 'team-1',
    name: 'Acceptance Team',
    code: '23C0A9',
    status: 'READY',
    createdAt: '2026-09-30T00:00:00Z',
    startedAt: null,
    completedAt: null,
    currentNodeId: null,
    score: 0,
    metadata: { registeredBy: 'ADMIN', assignedRoles: true },
    playerCount: 3,
    playerRoles: ['OBSERVER', 'ANALYST', 'OPERATOR'],
    hintsUsed: 0,
    solvedCount: 0,
    currentNodeCode: null,
    gameStartedAt: null,
    gameDeadline: null,
    gameDurationMinutes: 180,
  },
  players: [
    {
      id: 'p-1',
      teamId: 'team-1',
      role: 'OBSERVER',
      displayName: 'Ada Lovelace',
      status: 'INVITED',
      isConnected: false,
      lastSeenAt: null,
      createdAt: '2026-09-30T00:00:00Z',
      joinedAt: '2026-09-30T00:00:00Z',
      loginCodeHash: null,
      authUserId: 'auth-1',
      deviceSessionToken: null,
      deviceFingerprintHash: null,
      hasAuthUser: true,
      deviceBound: false,
      codeExpiresAt: null,
    },
  ],
  progress: null,
  nodeProgress: [],
  hintsUsedHistory: [],
  recentSubmissions: [],
  recentEvents: [],
}

vi.mock('@/hooks/useBureau', () => ({
  useBureau: () => ({
    teams: [],
    teamDetail,
    gameState: null,
    leaderboard: [],
    auditLog: [],
    gameEvents: [],
    isLoading: false,
    error: null,
    fetchTeams: vi.fn().mockResolvedValue(undefined),
    fetchTeamDetail,
    fetchGameState: vi.fn(),
    fetchLeaderboard: vi.fn(),
    fetchAuditLog: vi.fn(),
    fetchGameEvents: vi.fn(),
  }),
}))

async function renderTeamDetail() {
  const { AdminTeamDetail } = await import('@/features/admin/TeamDetail')
  return render(
    <MemoryRouter initialEntries={['/admin/teams/team-1']}>
      <Routes>
        <Route path="/admin/teams/:teamId" element={<AdminTeamDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  reissueCredentials.mockReset()
  reissueCredentials.mockResolvedValue({
    teamCode: '23C0A9',
    credentials: [
      { playerId: 'p-1', displayName: 'Ada Lovelace', role: 'OBSERVER', loginCode: 'NEW12345' },
    ],
  })
  vi.spyOn(adminAPI, 'reissueCredentials').mockImplementation(reissueCredentials)
  fetchTeamDetail.mockClear()
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

describe('Bureau credential recovery', () => {
  it('offers a re-issue path and shows the codes it returns', async () => {
    await renderTeamDetail()

    expect(screen.getByText('No codes on screen', { exact: false })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /RE-ISSUE CODES/i }))
    // The consequence is spelled out before anything is rotated.
    expect(screen.getByText(/stops working immediately/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'RE-ISSUE' }))

    await waitFor(() => {
      expect(reissueCredentials).toHaveBeenCalledWith('team-1', undefined)
    })
    await waitFor(() => {
      expect(screen.getByText('NEW12345')).toBeTruthy()
    })
    // The team code shows in the header badge and in the credentials panel.
    expect(screen.getAllByText('23C0A9').length).toBeGreaterThan(1)
  })

  it('re-issues a single player from that player’s row', async () => {
    await renderTeamDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Re-issue login code for Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'RE-ISSUE' }))

    await waitFor(() => {
      expect(reissueCredentials).toHaveBeenCalledWith('team-1', ['p-1'])
    })
  })

  it('reports a server refusal instead of pretending codes were issued', async () => {
    reissueCredentials.mockRejectedValue(
      new Error('Cannot issue login codes: team is ACTIVE and its roster is locked'),
    )
    await renderTeamDetail()

    fireEvent.click(screen.getByRole('button', { name: /RE-ISSUE CODES/i }))
    fireEvent.click(screen.getByRole('button', { name: 'RE-ISSUE' }))

    await waitFor(() => {
      expect(screen.getByText(/roster is locked/)).toBeTruthy()
    })
    expect(screen.queryByText('NEW12345')).toBeNull()
  })
})
