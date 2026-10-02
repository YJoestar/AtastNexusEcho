import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { emptyInvestigationWorkspace, type InvestigationWorkspace } from '@/lib/investigationWorkspace'
import { CompareStation } from '@/features/player/evidence/CompareStation'
import type { CaseArtifact } from '@/features/player/evidence/types'

const base = { type: 'PHOTOGRAPH', source: 'EVIDENCE' as const, description: '', location: null, acquiredAt: null }
const A: CaseArtifact = {
  ...base, id: 'evidence:A', code: 'A', title: 'East corridor', content: { captured_at: '14 OCT 94 03:12:44' },
  relationships: [
    { to: 'B', kind: 'TEMPORAL', note: 'B covers the same segment two minutes later.' },
    { to: 'B', kind: 'SPATIAL', note: 'Both name the east corridor.' },
  ],
}
const B: CaseArtifact = { ...base, id: 'evidence:B', code: 'B', title: 'Camera 7', imageUrl: '/b.jpg', content: { captured_at: '14-10-94 03:14:53' } }
const C: CaseArtifact = { ...base, id: 'evidence:C', code: 'C', title: 'Unrelated', content: {} }

function Harness({ pair }: { pair: [CaseArtifact, CaseArtifact] }) {
  const [workspace, setWorkspace] = useState<InvestigationWorkspace>(emptyInvestigationWorkspace())
  return (
    <CompareStation
      artifacts={[A, B, C]}
      pair={pair}
      workspace={workspace}
      onUpdate={update => setWorkspace(current => update(current))}
      renderRecord={artifact => <p>{artifact.title}</p>}
    />
  )
}

describe('compare station', () => {
  it('says nothing is recorded before anything has been found, and does not reveal how many clues exist', () => {
    render(<Harness pair={[A, C]} />)
    expect(screen.getByText(/Nothing recorded/)).toBeTruthy()
    expect(screen.getByText(/FOR THIS PAIR \/ 00/)).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('finds a cross-reference by plain comparison, in restrained language, with the case\'s own words', () => {
    render(<Harness pair={[A, B]} />)
    expect(screen.getByRole('status').textContent).toMatch(/LOCATION MATCH \/ A ↔ B/)
    expect(screen.getByText('Both name the east corridor.')).toBeTruthy()
    // The timestamp relationship is NOT found yet.
    expect(screen.queryByText('B covers the same segment two minutes later.')).toBeNull()
  })

  it('finds the timestamp relationship only by lining the times up', () => {
    render(<Harness pair={[A, B]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'TIMELINE' }))
    expect(screen.getByText(/A → B \/ 2 min 09 s/)).toBeTruthy()
    expect(screen.getByText('B covers the same segment two minutes later.')).toBeTruthy()
    expect(screen.getByText(/TIMESTAMP RELATIONSHIP RECORDED/)).toBeTruthy()
  })

  it('refuses a timeline when a record has no readable time, and finds nothing', () => {
    render(<Harness pair={[A, C]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'TIMELINE' }))
    expect(screen.getByText(/needs a time on both records/)).toBeTruthy()
    expect(screen.getByText(/FOR THIS PAIR \/ 00/)).toBeTruthy()
  })

  it('says why an overlay is impossible when a record has no image', () => {
    render(<Harness pair={[A, B]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'OVERLAY' }))
    expect(screen.getByText(/OVERLAY NEEDS TWO IMAGE RECORDS/)).toBeTruthy()
  })
})
