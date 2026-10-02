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

describe('player investigation table', () => {
  it('places an archive artifact and removes it from the table without deleting it from the archive', () => {
    render(<TableHarness />)

    fireEvent.change(screen.getByLabelText('ADD RECOVERED OBJECT'), { target: { value: 'evidence:PHOTO-A' } })
    fireEvent.click(screen.getByRole('button', { name: '[ PLACE ]' }))
    expect(screen.getByText('01 OBJECTS ON SURFACE')).toBeTruthy()
    expect(screen.getByText('PHOTO A')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'REMOVE' }))
    expect(screen.getByText('00 OBJECTS ON SURFACE')).toBeTruthy()
    expect(screen.getByText('No objects placed. The archive remains intact.')).toBeTruthy()
  })

  it('files a player-authored hypothesis between two selected artifacts', () => {
    const initial = emptyInvestigationWorkspace()
    initial.placements['evidence:PHOTO-A'] = { x: 25, y: 30, rotation: 0, order: 1, pinned: false }
    initial.placements['evidence:DOC-B'] = { x: 70, y: 55, rotation: 0, order: 2, pinned: false }
    render(<TableHarness initial={initial} />)

    fireEvent.click(screen.getByText('PHOTO A').closest('button')!)
    fireEvent.click(screen.getByText('DOC B').closest('button')!)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Matching time marks' } })
    fireEvent.click(screen.getByRole('button', { name: '[ FILE UNVERIFIED LINK ]' }))

    expect(screen.getByText(/PHOTO-A\s*↔\s*DOC-B/)).toBeTruthy()
    expect(screen.getByText('Matching time marks')).toBeTruthy()
    expect(screen.getByText(/NOT SYSTEM-VERIFIED/)).toBeTruthy()
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