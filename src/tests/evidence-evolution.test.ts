import { describe, expect, it } from 'vitest'
import {
  emptyInvestigationWorkspace,
  detectEvidenceEvolution,
  recordEvidenceInspection,
  readInvestigationWorkspace,
  writeInvestigationWorkspace,
} from '@/lib/investigationWorkspace'

describe('evidence evolution tracking', () => {
  it('detects new content fields on a fresh evidence artifact', () => {
    const workspace = emptyInvestigationWorkspace()
    const contentKeys = ['source', 'detail']

    const result = detectEvidenceEvolution('evidence:EVID-001', contentKeys, workspace)

    expect(result.updated).toBe(true)
    expect(result.newKeys).toEqual(['source', 'detail'])
  })

  it('does not flag existing fields as new', () => {
    const workspace = emptyInvestigationWorkspace()
    const contentKeys = ['source', 'detail', 'timestamp']

    recordEvidenceInspection('evidence:EVID-001', contentKeys, workspace)
    const result = detectEvidenceEvolution('evidence:EVID-001', contentKeys, workspace)

    expect(result.updated).toBe(false)
    expect(result.newKeys).toEqual([])
  })

  it('detects newly revealed fields when evidence content expands', () => {
    const workspace = emptyInvestigationWorkspace()
    const initialKeys = ['source', 'detail']
    const expandedKeys = ['source', 'detail', 'timestamp', 'location', 'device']

    recordEvidenceInspection('evidence:EVID-001', initialKeys, workspace)

    const result = detectEvidenceEvolution('evidence:EVID-001', expandedKeys, workspace)

    expect(result.updated).toBe(true)
    expect(result.newKeys).toEqual(['timestamp', 'location', 'device'])
  })

  it('records inspection timestamp and updates hasNewInfo flag', () => {
    const workspace = emptyInvestigationWorkspace()

    const hasNew = recordEvidenceInspection('evidence:EVID-001', ['source', 'detail'], workspace)
    expect(hasNew).toBe(true)

    expect(workspace.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)
    expect(workspace.revelations['evidence:EVID-001']?.lastInspectedAt).toBeTruthy()
    expect(workspace.revelations['evidence:EVID-001']?.firstSeenAt).toBeTruthy()
    expect(workspace.revelations['evidence:EVID-001']?.seenFields).toEqual(new Set(['source', 'detail']))

    const hasNewAgain = recordEvidenceInspection('evidence:EVID-001', ['source', 'detail'], workspace)
    expect(hasNewAgain).toBe(false)
    expect(workspace.revelations['evidence:EVID-001']?.hasNewInfo).toBe(false)
  })

  it('clears hasNewInfo when all fields are subsequently inspected', () => {
    const workspace = emptyInvestigationWorkspace()

    recordEvidenceInspection('evidence:EVID-001', ['source'], workspace)
    expect(workspace.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)

    recordEvidenceInspection('evidence:EVID-001', ['source', 'detail', 'timestamp'], workspace)
    expect(workspace.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)
    expect(workspace.revelations['evidence:EVID-001']?.seenFields).toEqual(
      new Set(['source', 'detail', 'timestamp']),
    )

    const result = detectEvidenceEvolution('evidence:EVID-001', ['source', 'detail', 'timestamp'], workspace)
    expect(result.updated).toBe(false)

    workspace.revelations['evidence:EVID-001']!.hasNewInfo = false
    expect(workspace.revelations['evidence:EVID-001']?.hasNewInfo).toBe(false)
  })

  it('persists and restores revelation state with Sets via localStorage', () => {
    const workspace = emptyInvestigationWorkspace()

    recordEvidenceInspection('evidence:EVID-001', ['source', 'timestamp'], workspace)

    const store = new Map<string, string>()
    const mockStore = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    }

    writeInvestigationWorkspace('team-test', workspace, mockStore)

    const restored = readInvestigationWorkspace('team-test', mockStore)
    expect(restored.revelations['evidence:EVID-001']?.seenFields).toEqual(new Set(['source', 'timestamp']))
    expect(restored.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)
    expect(restored.revelations['evidence:EVID-001']?.firstSeenAt).toBeTruthy()
    expect(restored.revelations['evidence:EVID-001']?.lastInspectedAt).toBeTruthy()
  })

  it('serializes seenFields as an array in storage', () => {
    const workspace = emptyInvestigationWorkspace()

    recordEvidenceInspection('evidence:EVID-001', ['source', 'detail'], workspace)

    const store = new Map<string, string>()
    const mockStore = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    }

    writeInvestigationWorkspace('team-test', workspace, mockStore)

    const raw = JSON.parse(store.get('nexus_case_workspace_v1:team-test') ?? '{}')
    expect(Array.isArray(raw.revelations['evidence:EVID-001'].seenFields)).toBe(true)
    expect(raw.revelations['evidence:EVID-001'].seenFields).toEqual(['source', 'detail'])
  })
})
