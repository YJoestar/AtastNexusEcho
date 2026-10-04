import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BoardCard } from '@/features/player/evidence/board/BoardCard'
import { MediumThumb } from '@/features/player/evidence/board/MediumThumb'
import { THUMB_SIZE, fragmentClip } from '@/features/player/evidence/board/thumbGeometry'
import type { CaseArtifact } from '@/features/player/evidence/types'

function make(type: string, extra: Partial<CaseArtifact> = {}): CaseArtifact {
  return {
    id: `evidence:${type}`, code: `X-${type.slice(0, 3)}`, title: `T ${type}`, description: 'd', type,
    source: 'EVIDENCE', content: {}, location: null, acquiredAt: null,
    thumbUrl: '/evidence/thumb/a.jpg', imageUrl: '/evidence/full/a.jpg', ...extra,
  }
}

describe('MediumThumb', () => {
  it.each(['PHOTOGRAPH', 'SURVEILLANCE', 'DOCUMENT', 'NOTE', 'MAP', 'PERSONNEL', 'FRAGMENT'])('%s uses the thumbnail, lazily, with intrinsic size', type => {
    const artifact = make(type, type === 'FRAGMENT' ? { source: 'FRAGMENT', type: 'FRAGMENT' } : {})
    const { container } = render(<MediumThumb artifact={artifact} variant="row" />)
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe('/evidence/thumb/a.jpg')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('decoding')).toBe('async')
    const [w, h] = THUMB_SIZE[container.querySelector('[data-thumb-medium]')!.getAttribute('data-thumb-medium') as keyof typeof THUMB_SIZE]
    expect(img.getAttribute('width')).toBe(String(w))
    expect(img.getAttribute('height')).toBe(String(h))
  })

  it('surveillance carries a timestamp bar on cards', () => {
    const { container } = render(<MediumThumb artifact={make('SURVEILLANCE', { content: { timestamp: '03:17:11', camera_id: 'CAM-07' } })} variant="card" />)
    expect(container.textContent).toContain('03:17:11')
    expect(container.textContent).toContain('CAM-07')
  })

  it('fragment edge follows condition', () => {
    expect(fragmentClip('TORN')).not.toBe(fragmentClip('NORMAL'))
    expect(fragmentClip('BURNED')).not.toBe(fragmentClip('DAMAGED'))
  })
})

describe('BoardCard media', () => {
  const placement = { x: 50, y: 50, rotation: 0, order: 1, pinned: true }
  function card(artifact: CaseArtifact, detail = false) {
    return render(
      <BoardCard artifact={artifact} placement={placement} worldX={0} worldY={0} selectedIndex={-1} dim={false} dragging={false}
        hasNewInfo={false} noteCount={0} linkCount={0} detail={detail}
        onPointerDown={vi.fn()} onToggleSelect={vi.fn()} onOpen={vi.fn()} onTogglePin={vi.fn()} onRotate={vi.fn()} onRemove={vi.fn()} />,
    )
  }
  it('pins a thumbnail, and the full image only when zoomed in', () => {
    expect(card(make('PHOTOGRAPH')).container.querySelector('img')!.getAttribute('src')).toBe('/evidence/thumb/a.jpg')
    expect(card(make('PHOTOGRAPH'), true).container.querySelector('img')!.getAttribute('src')).toBe('/evidence/full/a.jpg')
  })
  it('keeps each medium distinct', () => {
    const photo = card(make('PHOTOGRAPH')).container
    const doc = card(make('DOCUMENT')).container
    expect(photo.querySelector('[data-thumb-medium="PHOTOGRAPH"]')).toBeTruthy()
    expect(doc.querySelector('[data-thumb-medium="DOCUMENT"]')).toBeTruthy()
  })
  it('audio shows a tape slip without an image', () => {
    const { container } = card(make('AUDIO', { thumbUrl: null, imageUrl: null, content: { duration: '01:12' } }))
    expect(container.textContent).toContain('TAPE SLIP')
    expect(container.textContent).toContain('01:12')
  })
})
