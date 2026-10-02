/**
 * CASE NX-037 showcase catalog.
 *
 * The generated art pipeline (scripts/evidence-gen) produces real images and a
 * real register. This adapter exposes them to the app as ordinary
 * `CaseArtifact`s so the archive, the viewer and the table can be exercised
 * against the finished look.
 *
 * It is development-only by construction: every record is flagged
 * `simulation: true`, `showcaseCatalog()` returns nothing unless the app is
 * running a dev build, and `showcaseLabel()` marks the screen. Production runs
 * read the server catalog and never see these records.
 */
import {
  GENERATED_ASSETS,
  generatedAssetCounts,
  type GeneratedAsset,
} from './assetLibrary.generated'
import type { ArtifactCondition, ArtifactState, ArtifactType, CaseArtifact } from '@/features/player/evidence/types'

export const SHOWCASE_CASE = {
  id: 'NX-037',
  title: 'EAST CORRIDOR',
  institution: 'HALDER INSTITUTE FOR CONTINUITY STUDIES',
  bureau: 'BUREAU OF CONTINUITY RECORDS',
  node: 'B-04',
  terminal: '07',
  build: 'NX-4.17',
  keyTime: '03:17:11',
  locationCode: 'LOC-C214',
  officer: 'OBSERVATION / A. REHAL',
} as const

export const SHOWCASE_LABEL = 'SIMULATION DATA'

/** Showcase records exist only in development. */
export function showcaseEnabled(): boolean {
  return import.meta.env.DEV === true
}

export function showcaseCounts(): Record<string, number> {
  return generatedAssetCounts()
}

function toArtifact(asset: GeneratedAsset): CaseArtifact {
  return {
    // Matches the id contract used by workspace state, the ?artifact= deep link,
    // and cross-screen links, so a showcase record behaves like a real one.
    id: `evidence:${asset.code}`,
    code: asset.code,
    title: asset.title,
    description: asset.description,
    type: asset.type as ArtifactType,
    source: 'EVIDENCE',
    condition: asset.condition as ArtifactCondition,
    state: asset.state as ArtifactState,
    imageUrl: asset.image,
    thumbUrl: asset.thumb,
    relationships: asset.relationships,
    location: asset.location,
    acquiredAt: asset.acquiredAt,
    simulation: true,
    content: {
      condition: asset.condition,
      state: asset.state,
      location: asset.location,
      device: asset.device,
      captured_at: asset.capturedAt,
      acquired_at: asset.acquiredAt,
      integrity: asset.integrity,
      source: asset.source,
      duration: asset.duration,
      image_url: asset.image,
    },
  }
}

export function showcaseCatalog(): CaseArtifact[] {
  if (!showcaseEnabled()) return []
  return GENERATED_ASSETS.map(toArtifact)
}

export function showcaseByCode(code: string): CaseArtifact | undefined {
  return showcaseCatalog().find((artifact) => artifact.code === code)
}

export function showcaseTypeCounts(): Array<{ type: ArtifactType; count: number }> {
  const counts = showcaseCounts()
  return (Object.keys(counts) as ArtifactType[])
    .map((type) => ({ type, count: counts[type] ?? 0 }))
    .sort((a, b) => b.count - a.count)
}
