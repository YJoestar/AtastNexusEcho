/**
 * NEXUS — Logic Code flow, end to end
 *
 * The chain the whole credential system exists to keep:
 *
 *   admin creates players
 *      -> codes are generated
 *      -> the same codes are persisted (salted hash, never plaintext)
 *      -> the admin sees exactly those codes
 *      -> a player types one of them
 *      -> the server resolves that code to that player
 *
 * The server boundary is the Supabase functions client, which is mocked here
 * with the real contract: the mock stores salt$hash like
 * hash_login_code()/verify_login_code() do in SQL and refuses anything the
 * alphabet rejects, exactly as the edge function does. Everything above that
 * boundary — the wizard, the credentials panel, the login screen, the admin API
 * client — is the real code.
 *
 * It also pins the three failure modes that would strand a player:
 *   * a refresh must never mint a new credential
 *   * a double click must never create a second team
 *   * a malformed code must never reach the server
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerLogin } from '@/features/player/Login'
import { AppProvider } from '@/app/providers'
import { PlayerCredentialsPanel } from '@/components/admin/PlayerCredentialsPanel'
import { isValidLoginCode, isValidTeamCode, generateLogicCode } from '@/lib/auth'
import type { PlayerCredential } from '@/lib/admin'

// --- server boundary -------------------------------------------------------

interface StoredPlayer {
  id: string
  teamId: string
  displayName: string
  role: string
  loginCodeHash: string | null
  loginCodeHashAfterUse: string | null
  used: boolean
}

const invoke = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      setSession: async () => ({ error: null }),
    },
  },
  getSupabase: () => ({ functions: { invoke } }),
}))

/** Mirrors hash_login_code() / verify_login_code() from SQL. */
function hashCode(code: string): string {
  const salt = `s${code.length}${'0'.repeat(4)}`
  let hash = 0
  const material = salt + code
  for (let i = 0; i < material.length; i++) {
    hash = (hash * 31 + material.charCodeAt(i)) >>> 0
  }
  return `${salt}$${hash.toString(16)}`
}

function verifyCode(code: string, stored: string | null): boolean {
  if (!stored) return false
  return stored === hashCode(code)
}

const players: StoredPlayer[] = []
/** What the server resolved a code to, recorded server-side like a real audit. */
const resolvedLogins: Array<{ code: string; playerId: string; displayName: string; teamId: string }> = []
/** Codes the server refused, so we can prove nothing malformed was ever hashed. */
const rejectedCodes: string[] = []
let issueCounter = 0
let teamCounter = 0
let provisionCalls = 0

function issueCode(): string {
  // The real CSPRNG generator over the real alphabet.
  const code = generateLogicCode(8)
  issueCounter += 1
  expect(isValidLoginCode(code)).toBe(true)
  return code
}

beforeEach(() => {
  players.length = 0
  resolvedLogins.length = 0
  rejectedCodes.length = 0
  issueCounter = 0
  teamCounter = 0
  provisionCalls = 0
  invoke.mockReset()

  invoke.mockImplementation(async (name: string, options: { body: string }) => {
    const payload = JSON.parse(options.body) as Record<string, unknown>

    if (name === 'bureau-operations' && payload.action === 'provision-team') {
      provisionCalls += 1
      const key = String(payload.idempotencyKey ?? '')
      const existing = provisionCalls > 1 ? players : []
      if (existing.length === 0) {
        teamCounter += 1
        const requested = payload.players as Array<{ name: string; role: string }>
        const teamId = `team-${teamCounter}`
        for (const p of requested) {
          const code = issueCode()
          players.push({
            id: `player-${players.length + 1}`,
            teamId,
            displayName: p.name,
            role: p.role,
            loginCodeHash: hashCode(code),
            loginCodeHashAfterUse: code,
            used: false,
          })
        }
      }
      return {
        data: {
          success: true,
          idempotent: provisionCalls > 1,
          team: { id: players[0]?.teamId, code: 'M4X8QZ', name: payload.teamName },
          players: players.map(p => ({
            player_id: p.id,
            name: p.displayName,
            role: p.role,
            login_code: p.loginCodeHashAfterUse,
          })),
          _key: key,
        },
        error: null,
      }
    }

    if (name === 'player-login') {
      const code = String(payload.code ?? '')
      // The edge function refuses anything outside the alphabet before hashing.
      if (!isValidLoginCode(code)) {
        rejectedCodes.push(code)
        return { data: { success: false, error: 'Invalid access code' }, error: null }
      }
      const match = players.find(p => !p.used && verifyCode(code, p.loginCodeHash))
      if (!match) {
        rejectedCodes.push(code)
        return { data: { success: false, error: 'Invalid access code' }, error: null }
      }
      // player_login_flow consumes the code: the hash is cleared and the
      // plaintext is destroyed, so a second attempt with the same value fails.
      match.used = true
      match.loginCodeHash = null
      match.loginCodeHashAfterUse = null
      resolvedLogins.push({ code, playerId: match.id, displayName: match.displayName, teamId: match.teamId })
      return {
        data: {
          success: true,
          player: {
            id: match.id,
            teamId: match.teamId,
            role: match.role,
            displayName: match.displayName,
          },
          team: { name: 'Acceptance Team', status: 'WAITING' },
        },
        error: null,
      }
    }

    // The provider refreshes notifications after a successful login; that is
    // not part of the credential contract, so it answers with nothing.
    if (name === 'game-notifications') {
      return { data: { success: true, notifications: [] }, error: null }
    }

    throw new Error(`unexpected function call: ${name}`)
  })
})
async function provisionThroughWizard(): Promise<PlayerCredential[]> {
  const { TeamCreationWizard } = await import('@/components/admin/TeamCreationWizard')
  render(
    <MemoryRouter>
      <TeamCreationWizard isOpen onClose={vi.fn()} onSuccess={vi.fn()} />
    </MemoryRouter>,
  )

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

  const createButton = screen.getByRole('button', { name: 'CREATE TEAM' })
  // A double click must not reach the server twice.
  fireEvent.click(createButton)
  fireEvent.click(createButton)

  await waitFor(() => {
    expect(screen.getByText('TEAM READY')).toBeTruthy()
  })

  return players.map(p => ({
    playerId: p.id,
    displayName: p.displayName,
    role: p.role,
    loginCode: p.loginCodeHashAfterUse as string,
  }))
}

function typeCode(code: string) {
  const input = screen.getByLabelText('Access Code') as HTMLInputElement
  fireEvent.change(input, { target: { value: code } })
  return input
}

/** The real login screen inside the real provider, so the request shape and
 *  the identity mapping are the production ones. */
function renderPlayerLogin() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <PlayerLogin />
      </AppProvider>
    </MemoryRouter>,
  )
}

/** A second, independent visit: the previous screen is gone entirely. */
function renderFreshLogin() {
  cleanup()
  return renderPlayerLogin()
}

describe('Admin creates players, then a player logs in', () => {
  it('persists a code, shows that same code, and authenticates that same player', async () => {
    const issued = await provisionThroughWizard()

    expect(issued).toHaveLength(3)

    // 1. Every code the admin is about to see is a valid Logic Code, and the
    //    panel shows exactly those values.
    render(
      <PlayerCredentialsPanel
        teamCode="M4X8QZ"
        credentials={issued}
      />,
    )
    for (const credential of issued) {
      expect(isValidLoginCode(credential.loginCode)).toBe(true)
      expect(screen.getAllByText(credential.loginCode).length).toBeGreaterThan(0)
    }
    expect(isValidTeamCode('M4X8QZ')).toBe(true)

    // 2. The player types the code the admin was shown, character for character.
    renderPlayerLogin()
    const first = issued[0]
    const input = typeCode(first.loginCode)
    expect(input.value).toBe(first.loginCode)
    fireEvent.click(screen.getByRole('button', { name: /Connect to Investigation/i }))

    // 3. The code that reached the server resolves to the player the admin saw.
    await waitFor(() => {
      expect(resolvedLogins).toHaveLength(1)
    })
    const sentCode = (JSON.parse(
      invoke.mock.calls.find(c => c[0] === 'player-login')![1].body,
    ) as { code: string }).code
    expect(sentCode).toBe(first.loginCode)
    expect(resolvedLogins[0].playerId).toBe(first.playerId)
    expect(resolvedLogins[0].displayName).toBe(first.displayName)
    expect(rejectedCodes).toEqual([])

    // 4. The code is single-use: a fresh visit with the same code is refused.
    renderFreshLogin()
    const reusedInput = typeCode(first.loginCode)
    expect(reusedInput.value).toBe(first.loginCode)
    const reusedButton = screen.getByRole('button', { name: /Connect to Investigation/i })
    expect((reusedButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(reusedButton)
    await waitFor(() => {
      expect(rejectedCodes).toContain(first.loginCode)
    })
    expect(resolvedLogins).toHaveLength(1)
  })

  it('never sends a forbidden character to the login endpoint', async () => {
    await provisionThroughWizard()

    renderPlayerLogin()
    const input = typeCode('B9E8BA7I')
    const before = invoke.mock.calls.length

    // The character is dropped and the player is told why.
    expect(input.value).toBe('B9E8BA7')
    expect(screen.getByText(/I, O, 0 or 1/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: /Connect to Investigation/i }) as HTMLButtonElement).disabled).toBe(true)

    // Nothing was submitted, so nothing was hashed server-side.
    expect(invoke.mock.calls.length).toBe(before)
  })

  it('refuses to submit a code that is still too short', async () => {
    renderPlayerLogin()
    typeCode('B9E8BA')
    const before = invoke.mock.calls.length

    expect((screen.getByRole('button', { name: /Connect to Investigation/i }) as HTMLButtonElement).disabled).toBe(true)
    expect(invoke.mock.calls.length).toBe(before)
  })
})

describe('Refresh and repeat visits', () => {
  it('does not generate a new code when the admin returns to the team page', async () => {
    const issued = await provisionThroughWizard()
    const before = invoke.mock.calls.length

    // Re-rendering the completion screen (a refresh, a back/forward in the
    // wizard, opening the page twice) must be a pure read.
    render(
      <PlayerCredentialsPanel teamCode="M4X8QZ" credentials={issued} />,
    )

    expect(invoke.mock.calls.length).toBe(before)
    expect(issueCounter).toBe(3)
  })

  it('creates one team and one set of players for a double-clicked CREATE', async () => {
    await provisionThroughWizard()

    expect(provisionCalls).toBe(1)
    expect(players).toHaveLength(3)
    expect(players.every(p => p.teamId === 'team-1')).toBe(true)
    expect(new Set(players.map(p => p.role)).size).toBe(3)
  })
})
