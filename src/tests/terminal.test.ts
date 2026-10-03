import { describe, expect, it, vi } from 'vitest'
import { complete, resolveApp, runCommand, type TerminalContext } from '@/features/admin/workstation/terminal'

const TEAM = { id: 't1', code: 'ALPHA1', name: 'Alpha Unit', status: 'ACTIVE', playerCount: 3, solvedCount: 4, hintsUsed: 1, score: 250, currentNodeCode: 'P05' }
const TEAM_B = { id: 't2', code: 'ALPHA2', name: 'Alpine Unit', status: 'PAUSED', playerCount: 2, solvedCount: 0, hintsUsed: 0, score: 0, currentNodeCode: null }

function context(overrides: Partial<TerminalContext> = {}): TerminalContext & { opened: Array<[string, string | undefined]> } {
  const opened: Array<[string, string | undefined]> = []
  return {
    opened,
    teams: async () => [TEAM, TEAM_B] as never,
    gameState: async () => ({ gameStatus: 'RUNNING', statusCounts: {}, totalTeams: 2, config: {} }),
    audit: async () => [{ id: 'a', action: 'start-team', reason: 'go', createdAt: '2026-10-03T02:13:41.000Z' }] as never,
    events: async () => [{ id: 'e', type: 'NODE_SOLVED', timestamp: '2026-10-03T02:14:03.000Z', nodeId: 'P05' }] as never,
    locations: async () => [{ id: 'l', nodeCode: 'P05', name: 'Central Archive', status: 'ACTIVE', nodeTitle: 'Archive' }] as never,
    evidence: async () => [{ id: 'x', code: 'NX-037-B-01', title: 'East Corridor', description: 'empty corridor', type: 'PHOTOGRAPH', condition: 'NORMAL', classification: 'C', content: {}, metadata: {} }] as never,
    connection: { online: true, lastSync: new Date('2026-10-03T02:00:00') },
    operator: { name: 'operator', role: 'SUPER_ADMIN' },
    now: () => new Date('2026-10-03T02:15:22.000Z'),
    openApp: (id, path) => { opened.push([id, path]) },
    openApps: () => ['COMMAND'],
    ...overrides,
  }
}
const text = (result: { lines: Array<{ text: string }> }) => result.lines.map(line => line.text).join('\n')

describe('NEXUS:// commands read real data', () => {
  it('lists the real commands under help, and clear clears', async () => {
    expect(text(await runCommand('help', context()))).toContain('team <code|name>')
    expect((await runCommand('clear', context())).clear).toBe(true)
  })

  it('status reports link, game state and unit counts from the admin API', async () => {
    const result = text(await runCommand('status', context()))
    expect(result).toContain('AVAILABLE')
    expect(result).toContain('RUNNING')
    expect(result).toContain('1 ACTIVE / 2')
    expect(result).toContain('PERSONNEL    5')
  })

  it('status says UNAVAILABLE instead of inventing a value when a source fails', async () => {
    const result = text(await runCommand('status', context({ gameState: async () => { throw new Error('boom') } })))
    expect(result).toContain('GAME STATE   UNAVAILABLE')
    expect(result).toContain('1 ACTIVE / 2')
  })

  it('opens a unit\'s dossier through the same window system', async () => {
    const ctx = context()
    const result = text(await runCommand('team alpha1', ctx))
    expect(ctx.opened).toEqual([['FIELD_UNITS', '/admin/teams/t1']])
    expect(result).toContain('SCORE 250')
  })

  it('asks for a narrower query rather than guessing between units', async () => {
    const ctx = context()
    const result = text(await runCommand('team alp', ctx))
    expect(result).toContain('2 MATCHES')
    expect(ctx.opened).toEqual([])
  })

  it('searches units, locations, evidence and modules together, and reports incomplete results', async () => {
    const full = text(await runCommand('search archive', context()))
    expect(full).toContain('LOCATIONS')
    expect(full).toContain('Central Archive')
    const partial = text(await runCommand('search corridor', context({ teams: async () => { throw new Error('x') } })))
    expect(partial).toContain('NX-037-B-01')
    expect(partial).toContain('1 SOURCE UNAVAILABLE')
  })

  it('shows the access record and field events with their times', async () => {
    expect(text(await runCommand('logs', context()))).toMatch(/\d\d:\d\d:\d\d\s+start-team/)
    expect(text(await runCommand('events 5', context()))).toContain('NODE_SOLVED')
  })

  it('presents a failed read as a system error with the source message', async () => {
    const result = text(await runCommand('logs', context({ audit: async () => { throw new Error('403 forbidden') } })))
    expect(result).toContain('ARCHIVE ERROR')
    expect(result).toContain('403 forbidden')
  })

  it('opens modules by the names people type, and says so when none match', async () => {
    const ctx = context()
    await runCommand('open cctv', ctx)
    await runCommand('open field units', ctx)
    expect(ctx.opened.map(entry => entry[0])).toEqual(['SURVEILLANCE', 'FIELD_UNITS'])
    expect(text(await runCommand('open nonsense', ctx))).toContain('NO MODULE MATCHES')
  })

  it('knows exactly one case and opens it', async () => {
    const ctx = context()
    expect(text(await runCommand('case 037', ctx))).toContain('CASE 037')
    expect(ctx.opened[0][0]).toBe('COMMAND')
    expect(text(await runCommand('case 12', ctx))).toContain('NO CASE')
  })

  it('rejects unknown commands, ignores blanks, never throws', async () => {
    expect(text(await runCommand('frobnicate', context()))).toContain('UNKNOWN COMMAND')
    expect((await runCommand('   ', context())).lines).toEqual([])
    const spy = vi.fn()
    await expect(runCommand('teams', context({ teams: async () => { spy(); throw 'plain string' } }))).resolves.toBeTruthy()
  })
})

describe('completion and aliases', () => {
  it('completes command names and open targets', () => {
    expect(complete('sta')).toEqual(['status'])
    expect(complete('open cc')).toEqual(['open cctv'])
    expect(complete('xyz')).toEqual([])
  })
  it('resolves module titles and ids', () => {
    expect(resolveApp('evidence')).toBe('EVIDENCE')
    expect(resolveApp('operations control')).toBe('OPERATIONS')
    expect(resolveApp('SURVEILLANCE')).toBe('SURVEILLANCE')
    expect(resolveApp('')).toBeNull()
  })
})
