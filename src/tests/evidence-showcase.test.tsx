import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EvidenceShowcase } from '@/features/admin/EvidenceShowcase'
import {
  MEDIA_ORDER,
  REPRESENTATIVES_PER_MEDIUM,
  buildShowcaseModel,
  findRecord,
  parseDeepLink,
} from '@/features/admin/evidenceShowcaseModel'
import { APPS, appForPath } from '@/features/admin/workstation/apps'
import { ROUTES } from '@/app/config'
import { showcaseCatalog } from '@/lib/evidence/showcaseCatalog'

vi.mock('@/app/providers/AdminProvider', () => ({
  useAdmin: () => ({ admin: { id: 'test-admin', username: 'T', role: 'ADMIN' } }),
}))

const COUNTS = { PHOTOGRAPH: 12, SURVEILLANCE: 9, DOCUMENT: 9, FRAGMENT: 10, NOTE: 9, PERSONNEL: 6, AUDIO: 6, MAP: 5 }

function renderAt(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><EvidenceShowcase /></MemoryRouter>)
}

describe('evidence showcase model', () => {
  const model = buildShowcaseModel(showcaseCatalog())

  it('groups the real library by exactly the eight media', () => {
    expect(model.groups.map(group => group.type)).toEqual([...MEDIA_ORDER])
    expect(Object.fromEntries(model.groups.map(group => [group.type, group.records.length]))).toEqual(COUNTS)
    expect(model.total).toBe(66)
  })

  it('shows at most a handful of representatives, most important first', () => {
    for (const group of model.groups) {
      expect(group.representatives.length).toBeLessThanOrEqual(REPRESENTATIVES_PER_MEDIUM)
      const ranks = ['BACKGROUND', 'SUPPORTING', 'IMPORTANT', 'CRITICAL']
      const levels = group.records.map(record => ranks.indexOf(record.importance.importance))
      expect(levels).toEqual([...levels].sort((a, b) => b - a))
    }
    const surveillance = model.groups.find(group => group.type === 'SURVEILLANCE')
    expect(surveillance?.records[0].artifact.code).toMatch(/CAM-07$/)
  })

  it('reads series position and related count from the real clue layer', () => {
    const cam = findRecord(model, 'CAM-07', 'SURVEILLANCE')
    expect(cam).not.toBeNull()
    expect(cam?.series?.total).toBe(9)
    expect(cam?.related.length).toBeGreaterThan(5)
  })

  it('parses the deep link and tolerates short codes and lower case', () => {
    expect(parseDeepLink('?type=surveillance&code=cam-07')).toEqual({ type: 'SURVEILLANCE', code: 'CAM-07' })
    expect(parseDeepLink('?type=BOGUS')).toEqual({ type: null, code: null })
    expect(findRecord(model, 'CAM-07', 'PHOTOGRAPH')).toBeNull()
    expect(findRecord(model, 'NOPE-99', null)).toBeNull()
  })
})

describe('evidence showcase screen', () => {
  it('renders every medium with simulation label, real fields and an OPEN / INSPECT control', () => {
    renderAt(ROUTES.ADMIN_EVIDENCE_SHOWCASE)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('EVIDENCE ARCHIVE')
    expect(screen.getByTestId('simulation-label').textContent).toBe('SIMULATION DATA')
    for (const type of MEDIA_ORDER) {
      const group = screen.getByTestId(`group-${type}`)
      const cards = within(group).getAllByTestId('showcase-record')
      expect(cards.length).toBe(Math.min(COUNTS[type], REPRESENTATIVES_PER_MEDIUM))
      expect(within(cards[0]).getByRole('button', { name: 'OPEN / INSPECT' })).toBeTruthy()
      expect(within(cards[0]).getByText('RELATED')).toBeTruthy()
      expect(within(cards[0]).getByText('SERIES')).toBeTruthy()
    }
    expect(screen.queryByTestId('showcase-overlay')).toBeNull()
  })

  it('opens the player inspection in an overlay and closes with Escape', () => {
    renderAt(ROUTES.ADMIN_EVIDENCE_SHOWCASE)
    const card = within(screen.getByTestId('group-NOTE')).getAllByTestId('showcase-record')[0]
    const code = card.getAttribute('data-code') ?? ''
    fireEvent.click(within(card).getByRole('button', { name: 'OPEN / INSPECT' }))
    const overlay = screen.getByTestId('showcase-overlay')
    expect(overlay.getAttribute('aria-modal')).toBe('true')
    expect(within(overlay).getAllByText(new RegExp(code)).length).toBeGreaterThan(0)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('showcase-overlay')).toBeNull()
  })

  it('opens the linked record from ?type=&code=', () => {
    renderAt(`${ROUTES.ADMIN_EVIDENCE_SHOWCASE}?type=SURVEILLANCE&code=CAM-07`)
    const overlay = screen.getByTestId('showcase-overlay')
    expect(overlay.getAttribute('aria-label')).toBe('Evidence inspection NX-CAM-07')
    fireEvent.click(within(overlay).getByRole('button', { name: 'Next record' }))
    expect(screen.getByTestId('showcase-overlay').getAttribute('aria-label')).not.toBe('Evidence inspection NX-CAM-07')
  })

  it('says so when a deep-linked record does not exist, and still shows the archive', () => {
    renderAt(`${ROUTES.ADMIN_EVIDENCE_SHOWCASE}?type=SURVEILLANCE&code=ZZ-99`)
    expect(screen.getByRole('alert').textContent).toContain('ZZ-99')
    expect(screen.queryByTestId('showcase-overlay')).toBeNull()
    expect(screen.getByTestId('group-PHOTOGRAPH')).toBeTruthy()
  })

  it('expands a medium to every record', () => {
    renderAt(ROUTES.ADMIN_EVIDENCE_SHOWCASE)
    fireEvent.click(within(screen.getByTestId('group-PHOTOGRAPH')).getByRole('button', { name: 'SHOW ALL 12' }))
    expect(within(screen.getByTestId('group-PHOTOGRAPH')).getAllByTestId('showcase-record')).toHaveLength(12)
  })
})

describe('evidence showcase wiring', () => {
  it('is a workstation module that owns /admin/evidence-showcase', () => {
    expect(ROUTES.ADMIN_EVIDENCE_SHOWCASE).toBe('/admin/evidence-showcase')
    expect(appForPath('/admin/evidence-showcase')).toBe('ARCHIVE')
    expect(APPS.ARCHIVE.path).toBe(ROUTES.ADMIN_EVIDENCE_SHOWCASE)
    // The register keeps its own URL.
    expect(appForPath('/admin/evidence-register')).toBe('EVIDENCE')
  })
})
