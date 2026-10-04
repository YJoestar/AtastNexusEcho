import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { EvidenceLabCatalog } from '@/lib/admin'
import { buildEvidenceCatalog } from '@/lib/evidenceCatalog'
import { AdminEvidenceLab } from '@/features/admin/EvidenceLab'
import { buildDevelopmentCatalog, matchesFilter, type LabFilter } from '@/features/admin/evidenceLabCatalog'
import type { CaseArtifact } from '@/features/player/evidence/types'

const CATALOG: EvidenceLabCatalog = {
  evidence: [
    {
      id: 'evidence-photo',
      code: 'NX-PHOTO-01',
      title: 'North entrance photograph',
      description: 'Recovered print',
      type: 'IMAGE',
      classification: 'RESTRICTED',
      content: { text: 'Recovered print', image_url: '/evidence/north.jpg' },
      metadata: { nodeCode: 'P01', source: 'FIELD CAMERA' },
    },
    {
      id: 'evidence-audio',
      code: 'NX-AUDIO-02',
      title: 'Intercom recording',
      description: 'A recording attached to the case.',
      type: 'AUDIO',
      classification: 'RESTRICTED',
      content: { audio_url: '/audio/intercom.mp3' },
      metadata: { nodeCode: 'P01' },
    },
  ],
  inventoryItems: [{
    id: 'item-key',
    code: 'ITEM-KEY-01',
    name: 'Service key',
    description: 'A brass key with a filed tooth.',
    type: 'KEY',
    rarity: 'UNCOMMON',
    properties: { weight: '12g' },
    uses: ['unlock cabinet'],
    metadata: { location: 'ADMIN BUILDING' },
  }],
  fragments: [{
    id: 'fragment-01',
    code: 'FRAG-01',
    label: 'Operator fragment',
    content: 'The second clock is not on the wall.',
    type: 'TEXT',
    role: 'OPERATOR',
    node_id: 'node-2',
    position: 1,
    metadata: {},
  }],
  nodes: [
    { id: 'node-1', code: 'P01', title: 'The Facade', location: '[ADMIN BUILDING] Main entrance' },
    { id: 'node-2', code: 'P02', title: 'The Clock', location: '[LIBRARY] Lobby' },
  ],
}

describe('admin evidence lab catalog', () => {
  it('loads every source category without team-progress filtering and retains real node provenance', () => {
    const artifacts = buildEvidenceCatalog(CATALOG)

    expect(artifacts).toHaveLength(4)
    expect(new Set(artifacts.map(item => item.title))).toEqual(new Set([
      'North entrance photograph',
      'Intercom recording',
      'Service key',
      'Operator fragment',
    ]))
    expect(artifacts.find(item => item.code === 'NX-PHOTO-01')?.content.image_url).toBe('/evidence/north.jpg')
    expect(artifacts.find(item => item.code === 'NX-PHOTO-01')?.location).toContain('Main entrance')
    expect(artifacts.find(item => item.code === 'FRAG-01')?.location).toContain('[LIBRARY]')
    expect(artifacts.find(item => item.code === 'ITEM-KEY-01')?.source).toBe('INVENTORY')
  })
})

describe('development catalog covers all evidence categories', () => {
  it('includes at least one item in every source category', () => {
    const catalog = buildDevelopmentCatalog()

    const types = new Set(catalog.evidence.map(item => item.type.toUpperCase()))
    expect(types).toContain('DOCUMENT')
    expect(types).toContain('MAP')
    expect(types).toContain('PHOTO')
    expect(types.has('DOCUMENT')).toBe(true)
    expect(types).toContain('SURVEILLANCE')
    expect(types).toContain('AUDIO')
    expect(types).toContain('PERSONNEL')
    expect(types).toContain('NOTE')
    expect(types).toContain('QR')

    const fragmentsByType = new Set(catalog.fragments.map(f => f.type.toUpperCase()))
    expect(fragmentsByType.has('AUDIO')).toBe(true)
    expect(fragmentsByType.has('TEXT')).toBe(true)

    const inventoryTypes = new Set(catalog.inventoryItems.map(item => item.type.toUpperCase()))
    expect(inventoryTypes.has('DEVICE')).toBe(true)
    expect(inventoryTypes.has('TOOL')).toBe(true)

    expect(catalog.nodes.length).toBeGreaterThanOrEqual(7)
  })

  it('includes damaged evidence and anomalous/contradictory records', () => {
    const catalog = buildDevelopmentCatalog()

    const conditionSet = new Set(catalog.evidence.map(item => item.condition))
    expect(conditionSet).toContain('NORMAL')
    expect(conditionSet).toContain('DAMAGED')
    expect(conditionSet).toContain('PARTIAL')

    const classifications = new Set(catalog.evidence.map(item => item.classification))
    expect(classifications).toContain('RESTRICTED')
    expect(classifications).toContain('CONFIDENTIAL')
    expect(classifications).toContain('ANOMALOUS')

    const hasContradiction = catalog.evidence.some(item => Object.keys(item.metadata).some(k => k === 'contradiction'))
    expect(hasContradiction).toBe(true)

    const hasDamagedPhoto = catalog.evidence.find(item => item.type === 'PHOTO' && item.condition === 'DAMAGED')
    expect(hasDamagedPhoto).toBeTruthy()
  })

  it('provides content with media or metadata fields for every evidence item', () => {
    const catalog = buildDevelopmentCatalog()
    for (const item of catalog.evidence) {
      expect(Object.keys(item.content).length).toBeGreaterThan(0)
      expect(item.metadata).toBeTruthy()
    }
  })
})

describe('matchesFilter', () => {
  const artifacts: CaseArtifact[] = buildEvidenceCatalog(buildDevelopmentCatalog())

  function matches(filter: string): CaseArtifact[] {
    return artifacts.filter(a => matchesFilter(a, filter as LabFilter))
  }

  it('PHOTOGRAPHS filter catches IMAGE and PHOTO types but not others', () => {
    const filtered = matches('PHOTOGRAPHS')
    const allTypes = new Set(filtered.map(a => a.type.toUpperCase()))
    expect(allTypes.has('DOCUMENT')).toBe(false)
    expect(allTypes.has('AUDIO')).toBe(false)
    expect(filtered.some(a => a.type.toUpperCase() === 'PHOTO' || a.type.toUpperCase() === 'IMAGE')).toBe(true)
  })

   it('DOCUMENTS filter catches DOCUMENT types', () => {
    const filtered = matches('DOCUMENTS')
    expect(filtered.every(a => /DOCUMENT|REPORT|TEXT/.test(a.type.toUpperCase()))).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('AUDIO filter catches AUDIO types', () => {
    const filtered = matches('AUDIO')
    expect(filtered.every(a => a.type.toUpperCase() === 'AUDIO')).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('SURVEILLANCE filter catches SURVEILLANCE types', () => {
    const filtered = matches('SURVEILLANCE')
    expect(filtered.every(a => a.type.toUpperCase() === 'SURVEILLANCE')).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
  })

   it('FRAGMENTS filter catches FRAGMENT source items', () => {
    const filtered = matches('FRAGMENTS')
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every(a => /FRAGMENT/.test(a.type.toUpperCase()) || a.source === 'FRAGMENT')).toBe(true)
  })

  it('MAPS filter catches MAP and IMAGE types with map-like content', () => {
    const filtered = matches('MAPS')
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.some(a => a.type.toUpperCase() === 'MAP')).toBe(true)
  })

  it('PERSONNEL filter catches PERSONNEL types', () => {
    const filtered = matches('PERSONNEL')
    expect(filtered.every(a => a.type.toUpperCase() === 'PERSONNEL')).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('NOTES filter catches NOTE types', () => {
    const filtered = matches('NOTES')
    expect(filtered.every(a => a.type.toUpperCase() === 'NOTE')).toBe(true)
    expect(filtered.length).toBeGreaterThan(0)
  })

  it('DAMAGED filter catches items with condition != NORMAL (excluding fragments)', () => {
    const damagedRaw = artifacts.filter(a => {
      const cond = (a.content as { condition?: string }).condition
      return cond && cond !== 'NORMAL'
    })
    const filtered = matches('DAMAGED')
    expect(filtered.length).toBe(damagedRaw.length)
  })

  it('ALL filter matches everything', () => {
    const filtered = matches('ALL')
    expect(filtered.length).toBe(artifacts.length)
  })
})

const mockListEvidenceLabCatalog = vi.hoisted(() => vi.fn())
vi.mock('@/lib/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin')>()
  return {
    ...actual,
    adminAPI: { ...actual.adminAPI, listEvidenceLabCatalog: mockListEvidenceLabCatalog },
  }
})
vi.mock('@/app/providers/AdminProvider', () => ({ useAdmin: () => ({ admin: { id: 'test-admin' } }) }))

describe('admin evidence lab component', () => {
  beforeEach(() => {
    mockListEvidenceLabCatalog.mockReset()
    localStorage.clear()
  })

  it('falls back to development catalog when API fails', async () => {
    mockListEvidenceLabCatalog.mockRejectedValueOnce(new Error('Network error'))
    render(<MemoryRouter><AdminEvidenceLab /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(/DEVELOPMENT FALLBACK DATA/)).toBeTruthy()
    })
  })

  it('renders the full catalog and shows record count', async () => {
    mockListEvidenceLabCatalog.mockResolvedValueOnce(buildDevelopmentCatalog())
    render(<MemoryRouter><AdminEvidenceLab /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText(/EVIDENCE REGISTER/)).toBeTruthy()
    })
    expect(screen.getByText(/\d+ RECORDS LOADED/)).toBeTruthy()
  })

  it('navigates into inspection via record click', async () => {
    mockListEvidenceLabCatalog.mockResolvedValueOnce(buildDevelopmentCatalog())
    render(<MemoryRouter><AdminEvidenceLab /></MemoryRouter>)

    await waitFor(() => screen.getByText(/EVIDENCE REGISTER/))

    const sortedArtifacts = buildEvidenceCatalog(buildDevelopmentCatalog())
    const firstArtifact = sortedArtifacts[0]
    const codeElement = await screen.findByText(firstArtifact.code)
    fireEvent.click(codeElement)

    await waitFor(() => {
      expect(screen.getByText(`INSPECT / ${firstArtifact.code}`)).toBeTruthy()
    })
  })

  it('cycles mark type with M key when inspecting', async () => {
    mockListEvidenceLabCatalog.mockResolvedValueOnce(buildDevelopmentCatalog())
    render(<MemoryRouter><AdminEvidenceLab /></MemoryRouter>)

    await waitFor(() => screen.getByText(/EVIDENCE REGISTER/))

    const sortedArtifacts = buildEvidenceCatalog(buildDevelopmentCatalog())
    const firstArtifact = sortedArtifacts[0]
    fireEvent.click(await screen.findByText(firstArtifact.code))

    await waitFor(() => screen.getByText(/INSPECT \//))

    act(() => {
      fireEvent.keyDown(window, { key: 'm' })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'REVIEW' })).toBeTruthy()
    })

    act(() => {
      fireEvent.keyDown(window, { key: 'm' })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'IMPORTANT' })).toBeTruthy()
    })
  })

  it('adds to table with T key when inspecting', async () => {
    mockListEvidenceLabCatalog.mockResolvedValueOnce(buildDevelopmentCatalog())
    render(<MemoryRouter><AdminEvidenceLab /></MemoryRouter>)

    await waitFor(() => screen.getByText(/EVIDENCE REGISTER/))

    const sortedArtifacts = buildEvidenceCatalog(buildDevelopmentCatalog())
    const firstArtifact = sortedArtifacts[0]
    fireEvent.click(await screen.findByText(firstArtifact.code))

    await waitFor(() => screen.getByText(/INSPECT \//))

    act(() => {
      fireEvent.keyDown(window, { key: 't' })
    })

    await waitFor(() => {
      expect(screen.getByText('TABLE / 1')).toBeTruthy()
    })

    expect(screen.getAllByText(firstArtifact.title).length).toBeGreaterThan(0)
  })

  it('exits inspection with ESC key', async () => {
    mockListEvidenceLabCatalog.mockResolvedValueOnce(buildDevelopmentCatalog())
    render(<MemoryRouter><AdminEvidenceLab /></MemoryRouter>)

    await waitFor(() => screen.getByText(/EVIDENCE REGISTER/))

    const sortedArtifacts = buildEvidenceCatalog(buildDevelopmentCatalog())
    const firstArtifact = sortedArtifacts[0]
    fireEvent.click(await screen.findByText(firstArtifact.code))

    await waitFor(() => screen.getByText(/INSPECT \//))

    act(() => {
      fireEvent.keyDown(window, { key: 'escape' })
    })

    await waitFor(() => {
      expect(screen.getByText(/SELECT A RECORD FROM THE INDEX/)).toBeTruthy()
    })
  })

  it('simulates evidence update and shows contradiction flag', async () => {
    mockListEvidenceLabCatalog.mockResolvedValueOnce(buildDevelopmentCatalog())
    render(<MemoryRouter><AdminEvidenceLab /></MemoryRouter>)

    await waitFor(() => screen.getByText(/EVIDENCE REGISTER/))

    const sortedArtifacts = buildEvidenceCatalog(buildDevelopmentCatalog())
    const firstArtifact = sortedArtifacts[0]
    fireEvent.click(await screen.findByText(firstArtifact.code))

    await waitFor(() => screen.getByText(/INSPECT \//))

    await waitFor(() => {
      expect(screen.getByText('[ SIMULATE RECORD UPDATE ]')).toBeTruthy()
    })

    act(() => {
      fireEvent.click(screen.getByText('[ SIMULATE RECORD UPDATE ]'))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'CONTRADICTION' })).toBeTruthy()
    })

    act(() => {
      fireEvent.click(screen.getByText('[ SIMULATE CONTRADICTION ]'))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'CONTRADICTION' })).toBeTruthy()
    })
  })
})