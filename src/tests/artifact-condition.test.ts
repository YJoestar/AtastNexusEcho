import { describe, expect, it } from 'vitest'
import { artifactCondition, type CaseArtifact } from '@/features/player/evidence/types'

const base: CaseArtifact = {
  id: 'evidence:X', code: 'X', title: 'X', description: '', type: 'DOCUMENT',
  source: 'EVIDENCE', content: {}, location: null, acquiredAt: null,
}

describe('artifact condition vocabulary', () => {
  it('reads the generator\'s STAIN as the painted STAINED condition', () => {
    expect(artifactCondition({ ...base, condition: 'STAIN' })).toBe('STAINED')
    expect(artifactCondition({ ...base, content: { condition: 'stain' } })).toBe('STAINED')
  })
  it('defaults to NORMAL and upper-cases the rest', () => {
    expect(artifactCondition(base)).toBe('NORMAL')
    expect(artifactCondition({ ...base, condition: 'burned' })).toBe('BURNED')
  })
})
