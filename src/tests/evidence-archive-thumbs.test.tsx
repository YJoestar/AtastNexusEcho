import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('archive list media loading', () => {
  const archive = readFileSync('src/features/player/evidence/EvidenceArchive.tsx', 'utf8')
  it('lists thumbnails only through MediumThumb and never reads the full image', () => {
    expect(archive).toContain('<MediumThumb')
    expect(archive).not.toContain('artifactImageUrl')
    expect(archive).not.toMatch(/<img\b/)
  })
})
