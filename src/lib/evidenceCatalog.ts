import type { EvidenceLabCatalog } from '@/lib/admin'
import { contentString, type CaseArtifact } from '@/features/player/evidence/types'

function recordCode(id: string, metadata: Record<string, unknown>): string {
  const explicit = contentString(metadata, ['evidenceCode', 'evidence_code', 'code'])
  if (explicit) return explicit
  return id.replace(/-/g, '').slice(0, 10).toUpperCase()
}

export function buildEvidenceCatalog(catalog: EvidenceLabCatalog): CaseArtifact[] {
  const nodeById = new Map(catalog.nodes.map(node => [node.id, node]))
  const artifacts: CaseArtifact[] = []

  for (const evidence of catalog.evidence) {
    const nodeCode = typeof evidence.metadata.nodeCode === 'string' ? evidence.metadata.nodeCode : null
    const node = nodeCode ? catalog.nodes.find(candidate => candidate.code === nodeCode) : undefined
    const content = {
      ...evidence.content,
      ...evidence.metadata,
      classification: evidence.classification,
      ...(node && { node_title: node.title, node_location: node.location }),
    }
    artifacts.push({
      id: `evidence:${evidence.id}`,
      code: evidence.code || recordCode(evidence.id, evidence.metadata),
      title: evidence.title,
      description: evidence.description,
      type: evidence.type,
      source: 'EVIDENCE',
      content,
      location: (node?.location ?? contentString(content, ['location', 'building'])) || null,
      acquiredAt: contentString(content, ['acquiredAt', 'acquired_at', 'timestamp', 'captured_at']),
    })
  }

  for (const item of catalog.inventoryItems) {
    const content = {
      ...item.properties,
      ...item.metadata,
      uses: item.uses,
      rarity: item.rarity,
    }
    artifacts.push({
      id: `inventory:${item.code}`,
      code: item.code,
      title: item.name,
      description: item.description,
      type: item.type,
      source: 'INVENTORY',
      content,
      location: contentString(content, ['location', 'building']),
      acquiredAt: contentString(content, ['acquiredAt', 'acquired_at', 'timestamp']),
    })
  }

  for (const fragment of catalog.fragments) {
    const node = nodeById.get(fragment.node_id)
    const content = {
      text: fragment.content,
      role: fragment.role,
      position: fragment.position,
      ...fragment.metadata,
      ...(node && { node_code: node.code, node_title: node.title, node_location: node.location }),
    }
    artifacts.push({
      id: `fragment:${fragment.code}`,
      code: fragment.code,
      title: fragment.label,
      description: fragment.content,
      type: fragment.type,
      source: 'FRAGMENT',
      content,
      location: node?.location ?? contentString(content, ['location', 'building']),
      acquiredAt: contentString(content, ['acquiredAt', 'acquired_at', 'timestamp']),
    })
  }

  return artifacts.sort((a, b) => a.code.localeCompare(b.code))
}