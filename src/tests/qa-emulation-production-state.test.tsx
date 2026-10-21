/**
 * NEXUS — Field Device Emulation: production-state fidelity.
 *
 * The emulation exists to certify that what the team sees is what the Bureau
 * stores. That claim is only meaningful if the emulation renders the stored row
 * rather than placeholder prose it invents, and if it says so plainly when the
 * stored row cannot be read.
 *
 * These tests pin three properties:
 *
 *  1. When `list-puzzle-qa` returns a real row, every narrative field the
 *     player screen shows is read from that row (objective, story reveal,
 *     teamwork note, physical clue, operator brief, unlocked evidence).
 *  2. When the stored row carries a `visualType`, the player draws its
 *     dedicated renderer rather than degrading to prose.
 *  3. When `list-puzzle-qa` is refused, the hub shows an explicit failure
 *     banner instead of quietly serving synthetic content.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import type { PuzzleQAEntry } from '@/lib/admin'

/** A real stored row, shape-identical to what `list-puzzle-qa` returns. */
const STORED_ROW: PuzzleQAEntry = {
  id: 'uuid-P11',
  code: 'P11',
  title: 'The Grating',
  type: 'PUZZLE',
  stage: 3,
  location: '[ADMIN BUILDING] - Service Corridor',
  prerequisites: ['P10'],
  branches: null,
  content: {
    observer: {
      role: 'OBSERVER',
      screenTitle: 'Grating Survey',
      dataPayload: 'A cast-iron grating, seven bars, one bar stamped twice.',
      visualType: 'observation',
      whatTheySee: 'A corridor grating whose bars carry stamps.',
      taskPrompt: 'Record each bar stamp in reading order.',
      intermediateOutput: 'Seven stamps recorded.',
    },
    analyst: {
      role: 'ANALYST',
      screenTitle: 'Stamp Ledger',
      dataPayload: 'The bar ledger lists every stamp class the archive uses.',
      visualType: 'document-forensics',
      whatTheySee: 'A ledger of stamp classes.',
      taskPrompt: 'Identify the class of each recorded stamp.',
      intermediateOutput: 'Class list derived.',
    },
    operator: {
      role: 'OPERATOR',
      screenTitle: 'Service Panel',
      dataPayload: 'The panel awaits the class-derived key.',
      visualType: 'terminal',
      whatTheySee: 'An unlit service panel.',
      taskPrompt: 'Enter the derived key.',
      intermediateOutput: 'Awaiting team conclusion.',
    },
    operatorInvestigation: {
      operatorOwnEvidence: 'The sealed panel and its stamped key plate.',
      operatorTaskDescription: 'Cross-check the stamp ledger against the key plate.',
    },
    narrativeObjective: 'Read the grating stamps as a class run, not as decoration.',
    hints: ['Attend to the doubled stamp.', 'Order the stamps by the ledger.', 'The class run names the key.'],
  },
  answerMetadata: { acceptedAnswer: 'CONVERGE' },
  metadata: {
    type: 'PUZZLE',
    storyReveal: 'The corridor grating was installed the week Lina Veyr was sealed in.',
    whyTeamworkMatters: 'Only the Analyst owns the stamp ledger; only the Observer saw the grating.',
    locationClue: {
      format: 'Research-Note',
      clueText: 'LINA S NOTE: Descend to the sub-basement service run.',
      solution: 'Sub-Basement Service Run',
      nextPhysicalLocation: '[ADMIN BUILDING] - Sub-Basement',
      nextQrNode: 'QR-NODE-12',
      explanation: 'Points to the sub-basement.',
    },
    evidenceUnlocked: { id: 'EVID-P11', category: 'Ledger', title: 'Grating Stamp Ledger' },
  },
  evidence: [
    {
      id: 'ev-11',
      type: 'NOTE',
      title: 'Grating Stamp Ledger',
      content: { text: 'The ledger records all eleven stamp classes in the archive.' },
      metadata: { nodeCode: 'P11' },
    },
  ],
  audioEvidence: [],
}

const listPuzzleQAMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue({}),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(), unsubscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
  getSupabase: vi.fn(),
}))

vi.mock('@/lib/admin', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/admin')>()
  return {
    ...actual,
    adminAPI: {
      ...actual.adminAPI,
      listPuzzleQA: () => listPuzzleQAMock(),
      listQRCodes: vi.fn().mockResolvedValue([]),
    },
  }
})

vi.mock('@/lib/game', () => ({
  gameAPI: {
    // The emulation's node-detail fetch is served from the same stored row the
    // QA feed returns, so a test can exercise BOTH the stored and the synthetic
    // branch by changing what `listPuzzleQA` resolves to.
    getNode: vi.fn().mockResolvedValue(null),
    submitAnswer: vi.fn(),
    scanQR: vi.fn(),
    useHint: vi.fn(),
    getNotifications: vi.fn().mockResolvedValue([]),
    markNotificationsRead: vi.fn(),
    getInventory: vi.fn().mockResolvedValue({ evidence: [], inventory: [], fragments: [] }),
    getNodeProgress: vi.fn().mockResolvedValue([]),
    getGameState: vi.fn().mockResolvedValue({
      team: { status: 'ACTIVE', startedAt: null, deadline: null, currentNode: null, score: 0 },
    }),
  },
}))

vi.mock('@/hooks/useConnection', () => ({
  useConnection: () => ({
    status: 'online' as const,
    isBrowserOnline: true,
    isServerReachable: true,
    isOffline: false,
    lastProbedAt: null,
    probe: vi.fn(),
  }),
}))

vi.mock('@/hooks/useOffline', () => ({
  useOffline: () => ({ isOnline: true, isOffline: false }),
}))

import { AppProvider } from '@/app/providers'
import { QASimulatorProvider } from '@/contexts/QASimulatorContext'
import { generateNodeDetail } from '@/contexts/QASimulatorContext'
import { QAHub } from '@/features/admin/QAHub'
import { ALL_PUZZLES, PUZZLES_BY_CODE } from '@/content/puzzles'

function renderHub() {
  return render(
    <AppProvider>
      <QASimulatorProvider>
        <QAHub />
      </QASimulatorProvider>
    </AppProvider>,
  )
}

async function startSimulation() {
  await waitFor(() => {
    expect(screen.getByText('Player Experience Simulator')).toBeTruthy()
  })
  const start = await screen.findByRole('button', { name: /Start Simulation/i })
  await act(async () => {
    fireEvent.click(start)
  })
  await waitFor(() => {
    expect(screen.getByText(/Player View/i)).toBeTruthy()
  })
}

describe('Field Device Emulation — production-state fidelity', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    listPuzzleQAMock.mockReset()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('reports how many stored rows it loaded', async () => {
    listPuzzleQAMock.mockResolvedValue([STORED_ROW])
    renderHub()
    await startSimulation()

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toMatch(/1 STORED NODE ROWS? LOADED/i)
    })
  })

  it('surfaces an explicit banner when the stored rows cannot be read', async () => {
    listPuzzleQAMock.mockRejectedValue(new Error('admin session rejected'))
    renderHub()
    await startSimulation()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/STORED CONTENT UNAVAILABLE/i)
    expect(alert.textContent).toContain('admin session rejected')
  })

  it('does not claim production state when the feed is empty', async () => {
    listPuzzleQAMock.mockResolvedValue([])
    renderHub()
    await startSimulation()

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toMatch(/0 STORED NODE ROWS? LOADED/i)
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Field Device Emulation — node detail reads the stored row', () => {
  // The client puzzle index is a content-free map skeleton, so the emulation's
  // only source of real content is the stored row. A node missing from the index
  // would be a different bug; assert on a real code.
  const puzzle = PUZZLES_BY_CODE['P11'] ?? ALL_PUZZLES[0]

  it('reads the objective, story reveal and teamwork note from the stored row', () => {
    const detail = generateNodeDetail(puzzle, 'OBSERVER', false, STORED_ROW)
    expect(detail.narrativeObjective).toBe(STORED_ROW.content.narrativeObjective)
    expect(detail.storyReveal).toBe(STORED_ROW.metadata?.storyReveal)
    expect(detail.whyTeamworkMatters).toBe(STORED_ROW.metadata?.whyTeamworkMatters)
    expect(detail.contentIsReal).toBe(true)
  })

  it('reads the physical clue from the stored metadata', () => {
    const detail = generateNodeDetail(puzzle, 'ANALYST', false, STORED_ROW)
    expect(detail.locationClue?.nextQrNode).toBe('QR-NODE-12')
    expect(detail.locationClue?.nextPhysicalLocation).toBe('[ADMIN BUILDING] - Sub-Basement')
    expect(detail.locationClue?.clueText).toContain('LINA')
  })

  it('reads the operator brief from the stored content', () => {
    const detail = generateNodeDetail(puzzle, 'OPERATOR', false, STORED_ROW)
    expect(detail.operatorInvestigation?.operatorOwnEvidence).toBe(
      'The sealed panel and its stamped key plate.',
    )
  })

  it('reads unlocked evidence from the stored metadata and linked file', () => {
    const detail = generateNodeDetail(puzzle, 'OPERATOR', true, STORED_ROW)
    expect(detail.evidenceUnlocked?.id).toBe('EVID-P11')
    expect(detail.evidenceUnlocked?.title).toBe('Grating Stamp Ledger')
    expect(detail.evidenceUnlocked?.content).toContain('eleven stamp classes')
  })

  it('passes the stored visualType through to the renderer', () => {
    expect(generateNodeDetail(puzzle, 'OBSERVER', false, STORED_ROW).roleContent?.visualType).toBe('observation')
    expect(generateNodeDetail(puzzle, 'ANALYST', false, STORED_ROW).roleContent?.visualType).toBe('document-forensics')
    expect(generateNodeDetail(puzzle, 'OPERATOR', false, STORED_ROW).roleContent?.visualType).toBe('terminal')
  })

  it('marks content as placeholder when no stored row is available', () => {
    const detail = generateNodeDetail(puzzle, 'OBSERVER', false, undefined)
    expect(detail.contentIsReal).toBe(false)
    expect(detail.narrativeObjective).toContain(puzzle.name)
  })

  it('never leaks the stored answer into a player-facing field', () => {
    const detail = generateNodeDetail(puzzle, 'OBSERVER', false, STORED_ROW)
    const seen = [
      detail.narrativeObjective,
      detail.storyReveal,
      detail.whyTeamworkMatters,
      detail.roleContent?.dataPayload ?? '',
      detail.roleContent?.whatTheySee ?? '',
      detail.locationClue?.clueText ?? '',
    ].join(' ')
    expect(seen.toUpperCase()).not.toContain('CONVERGE')
  })
})

/**
 * The hub computes whether a role's content came from the stored row and, until
 * this repair, never showed it: a tester could read generated placeholder prose
 * under a header reading "NARRATIVE READ FROM PRODUCTION CONTENT" and certify a
 * node against text no player will ever see.
 */
describe('Field Device Emulation — synthetic content is disclosed', () => {
  it('warns that a role block missing from the stored row is placeholder', async () => {
    // The stored row carries versions/decisions but no role blocks at all, so
    // every screen in the emulation is synthesised.
    listPuzzleQAMock.mockResolvedValue([
      { ...STORED_ROW, content: { narrativeObjective: 'Substituted objective.' } },
    ])
    renderHub()
    await startSimulation()
    fireEvent.click(screen.getByRole('button', { name: /STATE INSPECTOR/i }))

    const warning = await screen.findByText(/SYNTHETIC .* CONTENT/i)
    expect(warning.textContent).toMatch(/generated placeholder/i)
    expect(warning.textContent).toMatch(/Do not certify/i)
  })

  it('confirms when the role block really was read from the stored row', async () => {
    listPuzzleQAMock.mockResolvedValue([STORED_ROW])
    renderHub()
    await startSimulation()

    // Jump to the node the stored row belongs to. Every gate in the register has
    // its own Jump button, so scope the click to P11's row.
    fireEvent.click(screen.getByRole('button', { name: /NODE REGISTER/i }))
    const row = screen.getByText('P11').closest('div')!.parentElement!
    await act(async () => {
      fireEvent.click(within(row).getByRole('button', { name: /^Jump$/i }))
    })

    // The inspector reads the current node; its role block resolves as stored
    // content once the fetch settles.
    fireEvent.click(screen.getByRole('button', { name: /STATE INSPECTOR/i }))
    await waitFor(() => {
      expect(screen.getByText(/STORED .* CONTENT/i)).toBeTruthy()
    })
    expect(screen.queryByText(/SYNTHETIC .* CONTENT/i)).toBeNull()
  })
})

/**
 * A tester types constantly - an answer field, the jump-to-node box. The hub's
 * Space ("solve current node") and Ctrl+R ("reset simulation") shortcuts used to
 * fire while a control had focus, so typing a space into a field would solve the
 * node under test and Ctrl+R would wipe the run.
 */
describe('Field Device Emulation — shortcuts do not fire while typing', () => {
  it('leaves Space and Ctrl+R alone when a text field has focus', async () => {
    listPuzzleQAMock.mockResolvedValue([STORED_ROW])
    renderHub()
    await startSimulation()

    const field = screen.getByPlaceholderText(/FIELD NODE CODE/i)
    field.focus()

    // If the guard were absent, preventDefault would be called and the node
    // would be solved; assert the key event survives untouched.
    const spaceEvent = fireEvent.keyDown(field, { code: 'Space', key: ' ' })
    expect(spaceEvent).toBe(true)
    const ctrlREvent = fireEvent.keyDown(field, { code: 'KeyR', key: 'r', ctrlKey: true })
    expect(ctrlREvent).toBe(true)
  })
})
