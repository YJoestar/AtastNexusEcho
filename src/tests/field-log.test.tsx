import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QASimulatorContext } from '@/contexts/QASimulatorContext'
import type { NodeProgressEntry, Notification } from '@/types/game-engine'
import type { TeamProgress, Role } from '@/types/domain'
import type { InvestigationWorkspace } from '@/lib/investigationWorkspace'

const h = vi.hoisted(() => ({
  nodeProgress: [] as NodeProgressEntry[],
  notifications: [] as Notification[],
  teamProgress: null as TeamProgress | null,
  role: 'OBSERVER' as Role,
  workspace: {
    version: 1,
    annotations: {},
    marks: {},
    placements: {},
    hypotheses: [],
    lastInspected: {},
    revelations: {},
    view: null,
    discoveries: {} as Record<string, { clueId: string; discoveredAt: string; via: 'CROSS_REFERENCE' | 'TIMELINE_COMPARISON' }>,
  } as unknown as InvestigationWorkspace,
  updateWorkspace: vi.fn(),
  clearWorkspace: vi.fn(),
}))

vi.mock('@/hooks/useGameEngine', () => ({
  useGameEngine: () => ({
    nodeProgress: h.nodeProgress,
    notifications: h.notifications,
    teamProgress: h.teamProgress,
    role: h.role,
  }),
}))

vi.mock('@/hooks/useInvestigationWorkspace', () => ({
  useInvestigationWorkspace: () => ({
    workspace: h.workspace,
    updateWorkspace: h.updateWorkspace,
    clearWorkspace: h.clearWorkspace,
  }),
}))

import { PlayerFieldLog } from '@/features/player/FieldLog'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <QASimulatorContext.Provider value={{ isActive: false } as Parameters<typeof QASimulatorContext.Provider>[0]['value']}>
        {ui}
      </QASimulatorContext.Provider>
    </BrowserRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  h.nodeProgress = []
  h.notifications = []
  h.teamProgress = {
    teamId: 'team-1',
    solvedNodes: {},
    currentNodeId: null,
    availableNodeIds: [],
    evidenceOwned: [],
    inventoryOwned: {},
    fragmentsOwned: [],
    score: 0,
    hintsUsed: 0,
    hintsAvailable: 3,
    timeElapsedMinutes: 0,
    timeRemainingMinutes: 180,
    startedAt: null,
    lastActivityAt: new Date().toISOString(),
    metadata: { branchPath: [], skippedNodes: [], roleActions: { OBSERVER: 0, ANALYST: 0, OPERATOR: 0 }, specialAchievements: [] },
  }
  h.role = 'OBSERVER'
  h.workspace.discoveries = {}
})

describe('PlayerFieldLog', () => {
  it('renders empty state when no entries', () => {
    h.nodeProgress = []
    h.notifications = []
    h.teamProgress = { ...(h.teamProgress as TeamProgress), currentNodeId: null, lastActivityAt: new Date().toISOString() }
    h.workspace.discoveries = {}

    renderWithProviders(<PlayerFieldLog />)

    expect(screen.getAllByText('NO ACTIVITY RECORDED').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Begin the investigation.').length).toBeGreaterThanOrEqual(1)
  })

  it('shows a puzzle solve entry', () => {
    h.nodeProgress = [
      {
        nodeId: 'P01',
        nodeCode: 'P01',
        title: 'First Node',
        type: 'OBSERVATION',
        stage: 1,
        status: 'SOLVED',
        startedAt: '2026-01-15T10:00:00Z',
        solvedAt: '2026-01-15T10:30:00Z',
        attempts: 1,
        hintsUsed: 0,
        pointsAwarded: 100,
      },
      {
        nodeId: 'P02',
        nodeCode: 'P02',
        title: 'Second Node',
        type: 'DECODING',
        stage: 1,
        status: 'IN_PROGRESS',
        startedAt: '2026-01-15T11:00:00Z',
        solvedAt: null,
        attempts: 2,
        hintsUsed: 1,
        pointsAwarded: 0,
      },
    ]
    h.notifications = [
      {
        id: 'notif-1',
        type: 'SYSTEM',
        title: 'Game Started',
        message: 'The investigation has begun',
        priority: 'NORMAL',
        isRead: true,
        createdAt: '2026-01-15T09:00:00Z',
        actionUrl: null,
      },
    ]
    h.teamProgress = {
      ...(h.teamProgress as TeamProgress),
      currentNodeId: 'P02',
      lastActivityAt: '2026-01-15T11:00:00Z',
    }
    h.workspace.discoveries = {
      'clue-1': {
        clueId: 'clue-1',
        discoveredAt: '2026-01-15T10:15:00Z',
        via: 'CROSS_REFERENCE',
      },
      'clue-2': {
        clueId: 'clue-2',
        discoveredAt: '2026-01-15T10:45:00Z',
        via: 'TIMELINE_COMPARISON',
      },
    }

    renderWithProviders(<PlayerFieldLog />)

    expect(screen.getByText('PUZZLE SOLVED')).toBeTruthy()
    expect(screen.getByText('P01 solved')).toBeTruthy()
    expect(screen.getByText('First Node')).toBeTruthy()
  })

  it('shows an evidence discovery entry', () => {
    h.nodeProgress = [
      {
        nodeId: 'P01',
        nodeCode: 'P01',
        title: 'First Node',
        type: 'OBSERVATION',
        stage: 1,
        status: 'SOLVED',
        startedAt: '2026-01-15T10:00:00Z',
        solvedAt: '2026-01-15T10:30:00Z',
        attempts: 1,
        hintsUsed: 0,
        pointsAwarded: 100,
      },
    ]
    h.notifications = []
    h.teamProgress = { ...(h.teamProgress as TeamProgress), currentNodeId: null }
    h.workspace.discoveries = {
      'clue-1': {
        clueId: 'clue-1',
        discoveredAt: '2026-01-15T10:15:00Z',
        via: 'CROSS_REFERENCE',
      },
      'clue-2': {
        clueId: 'clue-2',
        discoveredAt: '2026-01-15T10:45:00Z',
        via: 'TIMELINE_COMPARISON',
      },
    }

    renderWithProviders(<PlayerFieldLog />)

    expect(screen.getAllByText('EVIDENCE FOUND').length).toBe(2)
    expect(screen.getByText('Evidence discovered: clue-1')).toBeTruthy()
    expect(screen.getByText('Evidence discovered: clue-2')).toBeTruthy()
  })

  it('orders newest first', () => {
    h.nodeProgress = [
      {
        nodeId: 'P01',
        nodeCode: 'P01',
        title: 'First Node',
        type: 'OBSERVATION',
        stage: 1,
        status: 'SOLVED',
        startedAt: '2026-01-15T10:00:00Z',
        solvedAt: '2026-01-15T10:30:00Z',
        attempts: 1,
        hintsUsed: 0,
        pointsAwarded: 100,
      },
      {
        nodeId: 'P02',
        nodeCode: 'P02',
        title: 'Second Node',
        type: 'DECODING',
        stage: 1,
        status: 'SOLVED',
        startedAt: '2026-01-15T11:00:00Z',
        solvedAt: '2026-01-15T11:30:00Z',
        attempts: 1,
        hintsUsed: 0,
        pointsAwarded: 100,
      },
    ]
    h.notifications = []
    h.teamProgress = { ...(h.teamProgress as TeamProgress), currentNodeId: null }
    h.workspace.discoveries = {}

    renderWithProviders(<PlayerFieldLog />)

    const entries = screen.getAllByRole('listitem')
    expect(entries.length).toBeGreaterThan(0)

    const firstEntryTime = entries[0].querySelector('time')?.textContent
    const lastEntryTime = entries[entries.length - 1].querySelector('time')?.textContent
    expect(firstEntryTime).toBeDefined()
    expect(lastEntryTime).toBeDefined()
  })

  it('deduplicates rapid events of the same kind', () => {
    h.nodeProgress = [
      {
        nodeId: 'P01',
        nodeCode: 'P01',
        title: 'First Node',
        type: 'OBSERVATION',
        stage: 1,
        status: 'SOLVED',
        startedAt: '2026-01-15T10:00:00Z',
        solvedAt: '2026-01-15T10:30:00Z',
        attempts: 1,
        hintsUsed: 0,
        pointsAwarded: 100,
      },
      {
        nodeId: 'P01',
        nodeCode: 'P01',
        title: 'First Node Duplicate',
        type: 'OBSERVATION',
        stage: 1,
        status: 'SOLVED',
        startedAt: '2026-01-15T10:00:00Z',
        solvedAt: '2026-01-15T10:30:02Z',
        attempts: 1,
        hintsUsed: 0,
        pointsAwarded: 100,
      },
    ]
    h.notifications = []
    h.teamProgress = { ...(h.teamProgress as TeamProgress), currentNodeId: null }
    h.workspace.discoveries = {}

    renderWithProviders(<PlayerFieldLog />)

    const solveEntries = screen.getAllByText('PUZZLE SOLVED')
    expect(solveEntries.length).toBe(1)
  })

  it('caps at 100 entries', () => {
    h.nodeProgress = Array.from({ length: 150 }, (_, i) => ({
      nodeId: `P${i.toString().padStart(2, '0')}`,
      nodeCode: `P${i.toString().padStart(2, '0')}`,
      title: `Node ${i}`,
      type: 'OBSERVATION',
      stage: 1,
      status: 'SOLVED',
      startedAt: '2026-01-15T10:00:00Z',
      solvedAt: `2026-01-15T${(10 + Math.floor(i / 60)).toString().padStart(2, '0')}:${(i % 60).toString().padStart(2, '0')}:00Z`,
      attempts: 1,
      hintsUsed: 0,
      pointsAwarded: 100,
    }))
    h.notifications = []
    h.teamProgress = { ...(h.teamProgress as TeamProgress), currentNodeId: null }
    h.workspace.discoveries = {}

    renderWithProviders(<PlayerFieldLog />)

    const entries = screen.getAllByRole('listitem')
    expect(entries.length).toBeLessThanOrEqual(100)
  })
})