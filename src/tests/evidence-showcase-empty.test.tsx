import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EvidenceShowcase } from '@/features/admin/EvidenceShowcase'

vi.mock('@/app/providers/AdminProvider', () => ({ useAdmin: () => ({ admin: null }) }))
// What a production build sees: the showcase catalog is empty.
vi.mock('@/lib/evidence/showcaseCatalog', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/evidence/showcaseCatalog')>()),
  showcaseCatalog: () => [],
}))

describe('evidence showcase without a catalog (production)', () => {
  it('shows a clear empty state and no records, even for a deep link', () => {
    render(<MemoryRouter initialEntries={['/admin/evidence-showcase?type=SURVEILLANCE&code=CAM-07']}><EvidenceShowcase /></MemoryRouter>)
    expect(screen.getByTestId('showcase-empty')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('NO EVIDENCE RECORDS LOADED')
    expect(screen.queryByTestId('showcase-record')).toBeNull()
    expect(screen.queryByTestId('showcase-overlay')).toBeNull()
    expect(screen.getByRole('button', { name: 'OPEN EVIDENCE REGISTER' })).toBeTruthy()
  })
})
