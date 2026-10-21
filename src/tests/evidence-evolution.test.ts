import { describe, expect, it } from 'vitest'
import {
  emptyInvestigationWorkspace,
  clearEvidenceNewInfo,
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

    const recorded = recordEvidenceInspection('evidence:EVID-001', contentKeys, workspace)
    const result = detectEvidenceEvolution('evidence:EVID-001', contentKeys, recorded)

    expect(result.updated).toBe(false)
    expect(result.newKeys).toEqual([])
  })

  it('detects newly revealed fields when evidence content expands', () => {
    const workspace = emptyInvestigationWorkspace()
    const initialKeys = ['source', 'detail']
    const expandedKeys = ['source', 'detail', 'timestamp', 'location', 'device']

    const recorded = recordEvidenceInspection('evidence:EVID-001', initialKeys, workspace)

    const result = detectEvidenceEvolution('evidence:EVID-001', expandedKeys, recorded)

    expect(result.updated).toBe(true)
    expect(result.newKeys).toEqual(['timestamp', 'location', 'device'])
  })

  it('records inspection timestamp and updates hasNewInfo flag', () => {
    const workspace = emptyInvestigationWorkspace()

    const hasNew = recordEvidenceInspection('evidence:EVID-001', ['source', 'detail'], workspace)
    expect(hasNew.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)

    expect(hasNew.revelations['evidence:EVID-001']?.lastInspectedAt).toBeTruthy()
    expect(hasNew.revelations['evidence:EVID-001']?.firstSeenAt).toBeTruthy()
    expect(hasNew.revelations['evidence:EVID-001']?.seenFields).toEqual(new Set(['source', 'detail']))

    const hasNewAgain = recordEvidenceInspection('evidence:EVID-001', ['source', 'detail'], hasNew)
    expect(hasNewAgain.revelations['evidence:EVID-001']?.hasNewInfo).toBe(false)
  })

  it('clears hasNewInfo when all fields are subsequently inspected', () => {
    const workspace = emptyInvestigationWorkspace()

    const first = recordEvidenceInspection('evidence:EVID-001', ['source'], workspace)
    expect(first.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)

    const second = recordEvidenceInspection('evidence:EVID-001', ['source', 'detail', 'timestamp'], first)
    // A brand-new field is present, so the badge legitimately stays up.
    expect(second.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)
    expect(second.revelations['evidence:EVID-001']?.seenFields).toEqual(
      new Set(['source', 'detail', 'timestamp']),
    )

    const result = detectEvidenceEvolution('evidence:EVID-001', ['source', 'detail', 'timestamp'], second)
    expect(result.updated).toBe(false)

    const cleared = clearEvidenceNewInfo('evidence:EVID-001', second)
    expect(cleared.revelations['evidence:EVID-001']?.hasNewInfo).toBe(false)
  })

  it('persists and restores revelation state with Sets via localStorage', () => {
    const workspace = emptyInvestigationWorkspace()

    const recorded = recordEvidenceInspection('evidence:EVID-001', ['source', 'timestamp'], workspace)

    const store = new Map<string, string>()
    const mockStore = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    }

    writeInvestigationWorkspace('team-test', recorded, mockStore)

    const restored = readInvestigationWorkspace('team-test', mockStore)
    expect(restored.revelations['evidence:EVID-001']?.seenFields).toEqual(new Set(['source', 'timestamp']))
    expect(restored.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)
    expect(restored.revelations['evidence:EVID-001']?.firstSeenAt).toBeTruthy()
    expect(restored.revelations['evidence:EVID-001']?.lastInspectedAt).toBeTruthy()
  })

  it('serializes seenFields as an array in storage', () => {
    const workspace = emptyInvestigationWorkspace()

    const recorded = recordEvidenceInspection('evidence:EVID-001', ['source', 'detail'], workspace)

    const store = new Map<string, string>()
    const mockStore = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    }

    writeInvestigationWorkspace('team-test', recorded, mockStore)

    const raw = JSON.parse(store.get('nexus_case_workspace_v1:team-test') ?? '{}')
    expect(Array.isArray(raw.revelations['evidence:EVID-001'].seenFields)).toBe(true)
    expect(raw.revelations['evidence:EVID-001'].seenFields).toEqual(['source', 'detail'])
  })

  /**
   * The defect this suite was extended to pin: `recordEvidenceInspection` used to
   * write straight into `workspace.revelations`, returning a bare boolean. The
   * workspace arrives from React state via `setStored(current => ...)`, whose
   * `current` is the state object already committed - so the mutation edited the
   * PREVIOUS state in place, and a component holding the old reference saw it
   * change under them.
   */
  it('never mutates the workspace it is given', () => {
    const workspace = emptyInvestigationWorkspace()
    const before = JSON.stringify(workspace.revelations)

    recordEvidenceInspection('evidence:EVID-001', ['source', 'detail'], workspace)

    expect(workspace.revelations['evidence:EVID-001']).toBeUndefined()
    expect(JSON.stringify(workspace.revelations)).toBe(before)
  })

  it('returns a new workspace object, leaving the old reference untouched', () => {
    const workspace = emptyInvestigationWorkspace()
    const recorded = recordEvidenceInspection('evidence:EVID-001', ['source'], workspace)

    expect(recorded).not.toBe(workspace)
    expect(recorded.revelations).not.toBe(workspace.revelations)
    expect(recorded.revelations['evidence:EVID-001']?.seenFields).toEqual(new Set(['source']))
  })

  it('clears the new-intel badge without touching the input workspace', () => {
    const recorded = recordEvidenceInspection('evidence:EVID-001', ['source'], emptyInvestigationWorkspace())
    expect(recorded.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)

    const cleared = clearEvidenceNewInfo('evidence:EVID-001', recorded)
    expect(cleared.revelations['evidence:EVID-001']?.hasNewInfo).toBe(false)
    // The badge flag was cleared on the NEW workspace only.
    expect(recorded.revelations['evidence:EVID-001']?.hasNewInfo).toBe(true)
  })

  it('leaves a workspace with nothing to clear untouched', () => {
    const workspace = emptyInvestigationWorkspace()
    const same = clearEvidenceNewInfo('evidence:EVID-001', workspace)
    expect(same).toBe(workspace)
    expect(same.revelations['evidence:EVID-001']).toBeUndefined()
  })
})
