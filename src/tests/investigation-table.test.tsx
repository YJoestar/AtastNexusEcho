import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyInvestigationWorkspace, type InvestigationWorkspace } from '@/lib/investigationWorkspace'
import { InvestigationTable } from '@/features/player/evidence/InvestigationTable'
import { ArtifactInspection } from '@/features/player/evidence/ArtifactInspection'
import type { CaseArtifact } from '@/features/player/evidence/types'

const ARTIFACTS: CaseArtifact[] = [
  {
    id: 'evidence:PHOTO-A',
    code: 'PHOTO-A',
    title: 'PHOTO A',
    description: 'Recovered print, north entrance.',
    type: 'IMAGE',
    source: 'EVIDENCE',
    content: {},
    location: 'NORTH ENTRANCE',
    acquiredAt: null,
  },
  {
    id: 'evidence:DOC-B',
    code: 'DOC-B',
    title: 'DOC B',
    description: 'Typed incident report.',
    type: 'DOCUMENT',
    source: 'EVIDENCE',
    content: {},
    location: null,
    acquiredAt: null,
  },
]

function TableHarness({ initial = emptyInvestigationWorkspace() }: { initial?: InvestigationWorkspace }) {
  const [workspace, setWorkspace] = useState(initial)
  return (
    <InvestigationTable
      artifacts={ARTIFACTS}
      workspace={workspace}
      onUpdate={update => setWorkspace(current => update(current))}
      onInspect={() => {}}
    />
  )
}

function placedWorkspace() {
  const initial = emptyInvestigationWorkspace()
  initial.placements['evidence:PHOTO-A'] = { x: 25, y: 30, rotation: 0, order: 1, pinned: false }
  initial.placements['evidence:DOC-B'] = { x: 70, y: 55, rotation: 0, order: 2, pinned: false }
  return initial
}

function selectBoth() {
  fireEvent.click(screen.getByText('PHOTO A').closest('button')!)
  fireEvent.click(screen.getByText('DOC B').closest('button')!)
}

describe('player investigation table', () => {
  it('places an archive artifact and removes it from the table without deleting it from the archive', () => {
    render(<TableHarness />)

    fireEvent.change(screen.getByLabelText('ADD RECOVERED OBJECT'), { target: { value: 'evidence:PHOTO-A' } })
    fireEvent.click(screen.getByRole('button', { name: '[ PLACE ]' }))
    expect(screen.getByText('01 OBJECTS ON SURFACE')).toBeTruthy()
    expect(screen.getByText('PHOTO A')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Remove PHOTO-A from table/ }))
    expect(screen.getByText('00 OBJECTS ON SURFACE')).toBeTruthy()
    expect(screen.getByText('No objects placed. The archive remains intact.')).toBeTruthy()

    // Removal is undoable and restores the object where it was.
    fireEvent.click(screen.getByRole('button', { name: 'UNDO' }))
    expect(screen.getByText('01 OBJECTS ON SURFACE')).toBeTruthy()
  })

  it('files a typed player-authored link between two selected artifacts', () => {
    render(<TableHarness initial={placedWorkspace()} />)

    selectBoth()
    fireEvent.change(screen.getByLabelText(/RELATIONSHIP TYPE/), { target: { value: 'TEMPORAL' } })
    fireEvent.change(screen.getByPlaceholderText('RECORD A SUSPECTED RELATION…'), { target: { value: 'Matching time marks' } })
    fireEvent.click(screen.getByRole('button', { name: '[ FILE UNVERIFIED LINK ]' }))

    // The link is a real object on the board, with its type and status readable as text.
    expect(screen.getByRole('button', { name: 'Relationship TEMPORAL, CONNECTED' })).toBeTruthy()
    expect(screen.getAllByText(/PHOTO-A\s*↔\s*DOC-B/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Matching time marks').length).toBeGreaterThan(0)
    expect(screen.getByText(/NOT SYSTEM-VERIFIED/)).toBeTruthy()
  })

  it('lets the player inspect a link, change its status, and disconnect it with undo', () => {
    render(<TableHarness initial={placedWorkspace()} />)
    selectBoth()
    fireEvent.click(screen.getByRole('button', { name: '[ FILE UNVERIFIED LINK ]' }))

    fireEvent.click(screen.getByRole('button', { name: 'Relationship HYPOTHESIS, CONNECTED' }))
    fireEvent.change(screen.getByLabelText(/^STATUS/), { target: { value: 'CONTRADICTED' } })
    expect(screen.getByRole('button', { name: 'Relationship HYPOTHESIS, CONTRADICTED' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '[ DISCONNECT ]' }))
    expect(screen.getByRole('alertdialog', { name: 'Remove relationship' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'REMOVE LINK' }))
    expect(screen.queryByRole('button', { name: /^Relationship / })).toBeNull()
    expect(screen.getByText('No relationship has been filed.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'UNDO' }))
    expect(screen.getByRole('button', { name: 'Relationship HYPOTHESIS, CONTRADICTED' })).toBeTruthy()
  })

  it('adds, edits and deletes an investigator note on an object', () => {
    render(<TableHarness initial={placedWorkspace()} />)
    fireEvent.click(screen.getByText('PHOTO A').closest('button')!)

    fireEvent.change(screen.getByLabelText('Investigator note'), { target: { value: 'Blood appears fresh.' } })
    fireEvent.click(screen.getByRole('button', { name: 'FILE NOTE' }))
    expect(screen.getByText('Blood appears fresh.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Edit note' }))
    fireEvent.change(screen.getByLabelText('Edit note', { selector: 'textarea' }), { target: { value: 'Blood appears dried.' } })
    fireEvent.click(screen.getByRole('button', { name: 'SAVE NOTE' }))
    expect(screen.getByText('Blood appears dried.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(screen.queryByText('Blood appears dried.')).toBeNull()
    expect(screen.getByText('No investigator notes recorded.')).toBeTruthy()
  })

  it('keeps links dormant, not lost, while an object is off the table', () => {
    render(<TableHarness initial={placedWorkspace()} />)
    selectBoth()
    fireEvent.click(screen.getByRole('button', { name: '[ FILE UNVERIFIED LINK ]' }))

    fireEvent.click(screen.getByRole('button', { name: /Remove DOC-B from table/ }))
    expect(screen.queryByRole('button', { name: /^Relationship / })).toBeNull()
    expect(screen.getByText(/DORMANT$/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'UNDO' }))
    expect(screen.getByRole('button', { name: /^Relationship / })).toBeTruthy()
  })

  it('pins and unpins an object', () => {
    render(<TableHarness initial={placedWorkspace()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pin PHOTO-A' }))
    expect(screen.getByRole('button', { name: 'Unpin PHOTO-A' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unpin PHOTO-A' }))
    expect(screen.getByRole('button', { name: 'Pin PHOTO-A' })).toBeTruthy()
  })

  it('dims objects that do not match the table search', () => {
    render(<TableHarness initial={placedWorkspace()} />)
    fireEvent.change(screen.getByPlaceholderText(/SEARCH TABLE/), { target: { value: 'incident report' } })
    expect(screen.getByText('1 / 2 MATCH')).toBeTruthy()
    expect(screen.getByLabelText('Table artifact PHOTO-A').getAttribute('data-dim')).toBe('true')
    expect(screen.getByLabelText('Table artifact DOC-B').getAttribute('data-dim')).toBe('false')
  })

  it('zooms with the on-screen controls and resets the view', () => {
    render(<TableHarness initial={placedWorkspace()} />)
    const before = screen.getByLabelText('Zoom level').textContent
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByLabelText('Zoom level').textContent).not.toBe(before)
    fireEvent.click(screen.getByRole('button', { name: 'RESET VIEW' }))
    expect(screen.getByLabelText('Zoom level').textContent).toBe('80%')
  })
})

describe('player evidence inspection', () => {
  it('supports zoom, spatial area marks, and persistent investigator notes', () => {
    const onAddAnnotation = vi.fn()
    const artifact = {
      ...ARTIFACTS[0],
      content: { image_url: '/evidence/photo-a.jpg' },
    }

    render(
      <ArtifactInspection
        artifact={artifact}
        mark="UNMARKED"
        annotations={[]}
        onMarkChange={() => {}}
        onAddAnnotation={onAddAnnotation}
        onPlaceOnTable={() => {}}
        isOnTable={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByText('120%')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /MARK AREA/ }))
    fireEvent.click(screen.getByRole('group', { name: /IMAGE inspection surface/ }))
    expect(onAddAnnotation.mock.calls[0]?.[0]).toBe('MARKER')
    expect(onAddAnnotation.mock.calls[0]?.[1]).toBe('AREA MARKED FOR REVIEW')
    expect(onAddAnnotation.mock.calls[0]?.[2]).toHaveProperty('x')

    fireEvent.change(screen.getByPlaceholderText('ADD A PRIVATE CASE NOTE…'), {
      target: { value: 'Compare this frame with the night register.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'FILE NOTE' }))
    expect(onAddAnnotation.mock.calls[1]?.[0]).toBe('NOTE')
    expect(onAddAnnotation.mock.calls[1]?.[1]).toBe('Compare this frame with the night register.')
  })
})