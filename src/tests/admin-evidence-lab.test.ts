import { describe, expect, it } from 'vitest'
import type { EvidenceLabCatalog } from '@/lib/admin'
import { buildEvidenceCatalog } from '@/lib/evidenceCatalog'

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