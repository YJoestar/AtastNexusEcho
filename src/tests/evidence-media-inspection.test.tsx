import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ArtifactInspection } from '@/features/player/evidence/ArtifactInspection'
import type { CaseArtifact } from '@/features/player/evidence/types'
import { showcaseCatalog } from '@/lib/evidence/showcaseCatalog'
import { keyTimeOffset, seriesContextFor } from '@/features/player/evidence/media/seriesContext'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const catalog = showcaseCatalog()
const byCode = (code: string): CaseArtifact => {
  const found = catalog.find(item => item.code === code)
  if (!found) throw new Error(`missing ${code}`)
  return found
}

function open(artifact: CaseArtifact, extra: Partial<React.ComponentProps<typeof ArtifactInspection>> = {}) {
  return render(
    <ArtifactInspection
      artifact={artifact}
      mark="UNMARKED"
      annotations={[]}
      onMarkChange={() => {}}
      onAddAnnotation={() => {}}
      onPlaceOnTable={() => {}}
      isOnTable={false}
      catalog={catalog}
      {...extra}
    />,
  )
}

describe('surveillance monitor', () => {
  it('reads its on-screen stamp, steps through the real series and shows the key-time offset', () => {
    const onOpenRelated = vi.fn()
    const cam = byCode('NX-CAM-06')
    open(cam, { onOpenRelated })

    expect(screen.getAllByText('14 OCT 94 03:16:00').length).toBeGreaterThan(0)
    expect(screen.getByText('FRAME 8 OF 9 / TAPE 6')).toBeTruthy()
    expect(screen.getByText(/1 min 11 s BEFORE KEY TIME/)).toBeTruthy()
    expect(screen.getByText('STILL FRAME - NO VIDEO ATTACHED')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Next frame, NX-CAM-07/ }))
    expect(onOpenRelated).toHaveBeenCalledWith('evidence:NX-CAM-07')
    fireEvent.click(screen.getByRole('button', { name: /Previous frame, NX-CAM-08/ }))
    expect(onOpenRelated).toHaveBeenLastCalledWith('evidence:NX-CAM-08')
  })

  it('disables the stepper at the ends of the series', () => {
    open(byCode('NX-CAM-01'), { onOpenRelated: () => {} })
    expect((screen.getByRole('button', { name: /Previous frame, none/ }) as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    open(byCode('NX-CAM-07'), { onOpenRelated: () => {} })
    expect((screen.getByRole('button', { name: /Next frame, none/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/SAME INSTANT AS KEY TIME/)).toBeTruthy()
  })

  it('offers real play and pause only when a video is attached', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
    const pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const cam = { ...byCode('NX-CAM-06'), content: { ...byCode('NX-CAM-06').content, video_url: '/media/frame.mp4' } }
    open(cam)

    expect(screen.queryByText('STILL FRAME - NO VIDEO ATTACHED')).toBeNull()
    const video = screen.getByLabelText(/video$/) as HTMLVideoElement
    const button = screen.getByRole('button', { name: 'PLAY' })
    fireEvent.click(button)
    expect(play).toHaveBeenCalledTimes(1)
    fireEvent.play(video)
    expect(screen.getByRole('button', { name: 'PAUSE' }).getAttribute('aria-pressed')).toBe('true')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }))
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('keeps the offset blank when the stamp is too coarse to read', () => {
    const coarse: CaseArtifact = { ...byCode('NX-CAM-06'), content: { ...byCode('NX-CAM-06').content, captured_at: '14 OCT 94' } }
    expect(keyTimeOffset(coarse)).toBeNull()
    expect(keyTimeOffset(byCode('NX-CAM-06'))?.label).toBe('1 min 11 s BEFORE KEY TIME')
    expect(seriesContextFor(byCode('NX-037-D-02'), catalog)?.total).toBe(2)
  })
})

describe('paper media', () => {
  it('handwriting inspection presets 2x zoom and high contrast, and undoes both', () => {
    const note = { ...byCode('NX-037-N-01'), imageUrl: '/evidence/notes/n01.jpg' }
    open(note)
    const toggle = screen.getByRole('button', { name: /HANDWRITING INSPECTION/ })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)
    expect(screen.getByText('200%')).toBeTruthy()
    const image = screen.getByAltText(note.title) as HTMLImageElement
    expect(image.style.filter).toContain('contrast(180%)')
    expect(screen.getByRole('button', { name: /HANDWRITING INSPECTION/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /HANDWRITING INSPECTION/ }))
    expect(screen.queryByText('200%')).toBeNull()
    expect(image.style.filter).toBe('')
  })

  it('states the precision of a document date and its issuing source', () => {
    const doc: CaseArtifact = { ...byCode('NX-037-D-02'), content: { ...byCode('NX-037-D-02').content, captured_at: 'MAR 94', source: 'FACILITIES ENGINEERING' } }
    open(doc)
    expect(screen.getByLabelText('Document provenance')).toBeTruthy()
    expect(screen.getByText('MONTH ONLY - DAY NOT RECORDED')).toBeTruthy()
    expect(screen.getAllByText('FACILITIES ENGINEERING').length).toBeGreaterThan(0)
  })

  it('lists what a fragment fits with, from its real relationships, and opens them', () => {
    const onOpenRelated = vi.fn()
    const fragment = catalog.find(item => item.code.includes('-F-') && (item.relationships ?? []).length > 0)
    if (!fragment) throw new Error('no related fragment')
    open(fragment, { onOpenRelated })
    const fits = screen.getByRole('region', { name: 'Fits with' })
    const targets = (fragment.relationships ?? []).map(link => link.to)
    const buttons = within(fits).getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
    fireEvent.click(buttons[0])
    expect(targets.some(code => onOpenRelated.mock.calls[0]?.[0] === `evidence:${code}`)).toBe(true)
    expect(screen.getByLabelText('Damage readout')).toBeTruthy()
  })
})

describe('map, photograph and audio', () => {
  it('shows linked records for a map and opens one', () => {
    const onOpenRelated = vi.fn()
    const map = byCode('NX-037-M-01')
    open(map, { onOpenRelated })
    const list = screen.getByRole('region', { name: 'Linked records' })
    expect(within(list).getByText('LINKED RECORDS')).toBeTruthy()
    const first = within(list).getAllByRole('button')[0]
    fireEvent.click(first)
    expect(onOpenRelated).toHaveBeenCalledTimes(1)
    expect(String(onOpenRelated.mock.calls[0][0])).toMatch(/^evidence:/)
  })

  it('keeps pan/zoom on a photograph and adds print data from real fields', () => {
    const photo = { ...byCode('NX-037-B-01') }
    open(photo)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByText('120%')).toBeTruthy()
    expect(screen.getByText(/PRINT DATA/)).toBeTruthy()
  })

  it('is honest about audio that is not attached, and offers a scrubber when it is', () => {
    const tape = byCode('NX-037-A-01')
    open(tape)
    expect(screen.getByText('AUDIO SOURCE / NOT ATTACHED')).toBeTruthy()
    expect(screen.getByText('01:12')).toBeTruthy()
    expect(screen.queryByLabelText('Recording timeline')).toBeNull()
    cleanup()
    open({ ...tape, content: { ...tape.content, audio_url: '/media/a01.mp3' } })
    expect(screen.getByLabelText('Recording timeline')).toBeTruthy()
    expect(screen.queryByText('AUDIO SOURCE / NOT ATTACHED')).toBeNull()
  })

  it('keeps record details collapsible', () => {
    open(byCode('NX-037-B-01'))
    const summary = screen.getByText(/RECORD DETAILS/)
    expect(summary.closest('details')?.hasAttribute('open')).toBe(false)
  })
})
