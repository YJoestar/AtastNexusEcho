import { describe, expect, it } from 'vitest'
import {
  emptyInvestigationWorkspace,
  readInvestigationWorkspace,
  writeInvestigationWorkspace,
} from '@/lib/investigationWorkspace'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

describe('investigation workspace persistence', () => {
  it('round-trips private evidence notes, marks, board positions, and hypotheses per team', () => {
    const store = memoryStorage()
    const workspace = emptyInvestigationWorkspace()
    workspace.annotations['EV-01'] = [{
      id: 'note-1',
      kind: 'NOTE',
      text: 'The clock in this frame is three minutes slow.',
      createdAt: '2026-10-02T12:00:00.000Z',
      x: 22,
      y: 38,
    }]
    workspace.marks['EV-01'] = 'CONTRADICTION'
    workspace.placements['EV-01'] = { x: 35, y: 44, rotation: -3, order: 1, pinned: true }
    workspace.hypotheses = [{
      id: 'link-1',
      from: 'EV-01',
      to: 'DOC-02',
      note: 'Possible timestamp conflict',
      createdAt: '2026-10-02T12:01:00.000Z',
    }]

    writeInvestigationWorkspace('team-a', workspace, store)

    expect(readInvestigationWorkspace('team-a', store)).toEqual(workspace)
    expect(readInvestigationWorkspace('team-b', store)).toEqual(emptyInvestigationWorkspace())
  })

  it('recovers from corrupt storage and clamps invalid placement coordinates', () => {
    const store = memoryStorage()
    store.setItem('nexus_case_workspace_v1:team-a', '{not-json')
    expect(readInvestigationWorkspace('team-a', store)).toEqual(emptyInvestigationWorkspace())

    const workspace = emptyInvestigationWorkspace()
    workspace.placements['EV-01'] = { x: 120, y: -4, rotation: 90, order: 0, pinned: false }
    writeInvestigationWorkspace('team-a', workspace, store)
    expect(readInvestigationWorkspace('team-a', store).placements['EV-01']).toEqual({
      x: 100,
      y: 0,
      rotation: 12,
      order: 0,
      pinned: false,
    })
  })
})