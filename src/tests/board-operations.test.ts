import { describe, expect, it } from 'vitest'
import {
  addAnnotation,
  addLinks,
  deleteAnnotation,
  editAnnotation,
  emptyInvestigationWorkspace,
  isLinkLive,
  linkAnnotationKey,
  pruneWorkspace,
  removeLink,
  updateLink,
  type InvestigationWorkspace,
} from '@/lib/investigationWorkspace'

const NOW = '2026-10-02T12:00:00.000Z'

function boardWith(ids: string[]): InvestigationWorkspace {
  const workspace = emptyInvestigationWorkspace()
  ids.forEach((id, index) => {
    workspace.placements[id] = { x: 20 + index * 10, y: 30, rotation: 0, order: index + 1, pinned: false }
  })
  return workspace
}

let counter = 0
const makeId = () => `link-${++counter}`

describe('board relationships', () => {
  it('links the first selected object to each of the others, once', () => {
    const base = boardWith(['A', 'B', 'C'])
    const linked = addLinks(base, ['A', 'B', 'C'], 'CORROBORATES', ' same night ', makeId, NOW)
    expect(linked.hypotheses.map(link => [link.from, link.to])).toEqual([['A', 'B'], ['A', 'C']])
    expect(linked.hypotheses[0]).toMatchObject({ kind: 'CORROBORATES', status: 'CONNECTED', note: 'same night' })

    // Repeating the same selection stacks nothing, in either direction.
    expect(addLinks(linked, ['B', 'A'], 'LOCATION', '', makeId, NOW)).toBe(linked)
    expect(addLinks(linked, ['A'], 'LOCATION', '', makeId, NOW)).toBe(linked)
  })

  it('starts a CONTRADICTS link as contradicted', () => {
    const [link] = addLinks(boardWith(['A', 'B']), ['A', 'B'], 'CONTRADICTS', '', makeId, NOW).hypotheses
    expect(link.status).toBe('CONTRADICTED')
  })

  it('persists type, status and basis edits and stamps the change', () => {
    const base = addLinks(boardWith(['A', 'B']), ['A', 'B'], 'HYPOTHESIS', '', () => 'L', NOW)
    const next = updateLink(base, 'L', { status: 'CONFIRMED', kind: 'PERSON', note: 'same hand' }, '2026-10-02T13:00:00.000Z')
    expect(next.hypotheses[0]).toMatchObject({
      status: 'CONFIRMED', kind: 'PERSON', note: 'same hand', createdAt: NOW, updatedAt: '2026-10-02T13:00:00.000Z',
    })
  })

  it('moving or re-placing an object never alters its links', () => {
    const linked = addLinks(boardWith(['A', 'B']), ['A', 'B'], 'LOCATION', '', () => 'L', NOW)
    const moved = { ...linked, placements: { ...linked.placements, A: { ...linked.placements.A, x: 80, y: 70 } } }
    expect(moved.hypotheses).toEqual(linked.hypotheses)
    expect(isLinkLive(moved.hypotheses[0], moved)).toBe(true)
  })

  it('goes dormant, not missing, when an object leaves the table, and returns with it', () => {
    const linked = addLinks(boardWith(['A', 'B']), ['A', 'B'], 'LOCATION', '', () => 'L', NOW)
    const placements = { ...linked.placements }
    const saved = placements.B
    delete placements.B
    const off = { ...linked, placements }
    expect(isLinkLive(off.hypotheses[0], off)).toBe(false)
    expect(off.hypotheses).toHaveLength(1)
    const back = { ...off, placements: { ...off.placements, B: saved } }
    expect(isLinkLive(back.hypotheses[0], back)).toBe(true)
  })

  it('removing a link removes its notes and nothing else', () => {
    let workspace = addLinks(boardWith(['A', 'B']), ['A', 'B'], 'LOCATION', '', () => 'L', NOW)
    workspace = addAnnotation(workspace, linkAnnotationKey('L'), 'NOTE', 'timestamps agree', 'n1', NOW)
    workspace = addAnnotation(workspace, 'A', 'NOTE', 'object note', 'n2', NOW)
    const removed = removeLink(workspace, 'L')
    expect(removed.hypotheses).toHaveLength(0)
    expect(removed.annotations[linkAnnotationKey('L')]).toBeUndefined()
    expect(removed.annotations.A).toHaveLength(1)
  })
})

describe('board annotations', () => {
  it('adds, edits and deletes notes attached to an object', () => {
    let workspace = addAnnotation(emptyInvestigationWorkspace(), 'A', 'QUESTION', '  Who signed this?  ', 'n1', NOW)
    expect(workspace.annotations.A).toEqual([{ id: 'n1', kind: 'QUESTION', text: 'Who signed this?', createdAt: NOW }])

    workspace = editAnnotation(workspace, 'A', 'n1', { text: 'Who signed page 2?', kind: 'NOTE' })
    expect(workspace.annotations.A[0]).toMatchObject({ text: 'Who signed page 2?', kind: 'NOTE' })

    workspace = deleteAnnotation(workspace, 'A', 'n1')
    expect(workspace.annotations.A).toEqual([])
  })

  it('ignores empty notes and deletes a note whose edit empties it', () => {
    const empty = emptyInvestigationWorkspace()
    expect(addAnnotation(empty, 'A', 'NOTE', '   ', 'n1', NOW)).toBe(empty)
    const withNote = addAnnotation(empty, 'A', 'NOTE', 'x', 'n1', NOW)
    expect(editAnnotation(withNote, 'A', 'n1', { text: '  ' }).annotations.A).toEqual([])
  })
})

describe('stale references', () => {
  it('prunes placements, links and notes that point at objects no longer in the case', () => {
    let workspace = boardWith(['A', 'B', 'GONE'])
    workspace = addLinks(workspace, ['A', 'B'], 'LOCATION', '', () => 'keep', NOW)
    workspace = addLinks(workspace, ['A', 'GONE'], 'LOCATION', '', () => 'drop', NOW)
    workspace = addAnnotation(workspace, linkAnnotationKey('drop'), 'NOTE', 'ghost note', 'g1', NOW)
    workspace = addAnnotation(workspace, 'GONE', 'NOTE', 'ghost note', 'g2', NOW)
    workspace = addAnnotation(workspace, linkAnnotationKey('keep'), 'NOTE', 'real note', 'r1', NOW)

    const pruned = pruneWorkspace(workspace, new Set(['A', 'B']))
    expect(Object.keys(pruned.placements).sort()).toEqual(['A', 'B'])
    expect(pruned.hypotheses.map(link => link.id)).toEqual(['keep'])
    expect(Object.keys(pruned.annotations)).toEqual([linkAnnotationKey('keep')])
  })

  it('returns the same object when nothing is stale', () => {
    const workspace = addLinks(boardWith(['A', 'B']), ['A', 'B'], 'LOCATION', '', () => 'L', NOW)
    expect(pruneWorkspace(workspace, new Set(['A', 'B']))).toBe(workspace)
  })
})

describe('link identity', () => {
  it('mints a distinct id for every link created in one selection', () => {
    const ids = ['x', 'y']
    const linked = addLinks(boardWith(['A', 'B', 'C']), ['A', 'B', 'C'], 'LOCATION', '', index => ids[index], NOW)
    expect(linked.hypotheses.map(link => link.id)).toEqual(['x', 'y'])
  })
})

describe('recorded discoveries', () => {
  it('records a clue once and returns the same object when nothing is new', async () => {
    const { recordDiscoveries } = await import('@/lib/investigationWorkspace')
    const base = emptyInvestigationWorkspace()
    const found = recordDiscoveries(base, [{ id: 'clue:A~B:TEMPORAL' }], 'TIMELINE_COMPARISON', NOW)
    expect(found.discoveries['clue:A~B:TEMPORAL']).toEqual({ clueId: 'clue:A~B:TEMPORAL', discoveredAt: NOW, via: 'TIMELINE_COMPARISON' })
    expect(recordDiscoveries(found, [{ id: 'clue:A~B:TEMPORAL' }], 'CROSS_REFERENCE', '2027-01-01T00:00:00.000Z')).toBe(found)
  })
})
