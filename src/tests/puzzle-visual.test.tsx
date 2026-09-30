/**
 * NEXUS - Puzzle renderer tests
 *
 * Every `visualType` the seeded content ships used to render as the same grey
 * paragraph of prose, so a node asking a player to order seven symbols looked
 * identical to one asking them to read a wall clock. These tests pin the
 * registry down: each shipped type draws its own data, unknown types fall back
 * rather than rendering nothing, and no renderer ever reaches for the answer.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PuzzleVisual } from '@/components/player/puzzle/PuzzleVisual'
import {
  CONTENT_VISUAL_TYPES,
  isDedicatedVisualType,
} from '@/components/player/puzzle/visualTypes'
import {
  extractFrequencies,
  extractGlyphSequence,
  readEntries,
  readGraphNodes,
  readStringArray,
} from '@/components/player/puzzle/payload'

/** A payload carrying enough of every shape to exercise a renderer. */
const ALL_SHAPES = {
  binarySequence: ['01001001', '01010011'],
  symbols: ['⟁', '⧉', '⬡'],
  answers: ['CDFDEFF', '21:47'],
  sequence: ['A', 'B', '?', 'D'],
  missingPositions: [3],
  entries: [
    { source: 'Row 17', text: 'FILTER THE NOISE', flag: false },
    { source: 'Noise Log', text: 'gibberish', flag: true },
  ],
  nodes: [
    { label: 'S', pos: 1 },
    { label: 'T', pos: 2 },
  ],
  documentText: 'MEMO\nResult: [REDACTED]',
  requiresPuzzle: 'P01',
  recallPrompt: 'Recall the P01 facade.',
  requiresAllRoles: true,
  message: 'The Observer sees all paths.',
}

const PAYLOAD = 'SPECTRUM: peaks at 1747 Hz and 2147 Hz. SLOTS: ⟁ ⧉ ⬡ ⧫ ⌬ ⍟ ⎔'

describe('payload readers', () => {
  it('pulls the glyph run out of prose, not a stray mark', () => {
    expect(extractGlyphSequence('SLOTS: ⟁ ⧉ ⬡ — see wall')).toEqual(['⟁', '⧉', '⬡'])
  })

  it('reads frequencies regardless of unit casing', () => {
    expect(extractFrequencies('peaks at 1747 Hz and 2147Hz')).toEqual([1747, 2147])
  })

  it('reads entries, graph nodes and arrays defensively', () => {
    expect(readEntries({ entries: 'nope' })).toEqual([])
    expect(readStringArray({ answers: [1, 'ok', null] }, 'answers')).toEqual(['ok'])
    expect(readGraphNodes({ nodes: [{ label: 'E', pos: 2 }, { label: 'S', pos: 1 }] })).toEqual([
      { label: 'S', pos: 1 },
      { label: 'E', pos: 2 },
    ])
  })
})

describe('PuzzleVisual registry', () => {
  it('has a dedicated renderer for every type the content ships', () => {
    const missing = CONTENT_VISUAL_TYPES.filter(type => !isDedicatedVisualType(type))
    expect(missing).toEqual([])
  })

  it('renders something for every shipped type, including ones with no interactive data', () => {
    for (const type of CONTENT_VISUAL_TYPES) {
      const { container, unmount } = render(
        <PuzzleVisual type={type} dataPayload={PAYLOAD} interactiveData={ALL_SHAPES} />,
      )
      expect(container.textContent?.length, type).toBeGreaterThan(0)
      unmount()
    }
  })

  it('draws the cryptogram wheel for cipher nodes, with a slot per glyph', () => {
    render(
      <PuzzleVisual
        type="cipher"
        dataPayload="WHEEL SHOWS: ⟁ ⧉ ⬡ ⧫ ⌬ ⍟ ⎔"
        interactiveData={{}}
      />,
    )
    expect(screen.getByText('Cryptogram Wheel')).toBeTruthy()
    expect(screen.getAllByText('⟁').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/decode slot/)).toHaveLength(7)
  })

  it('draws the symbol board for a `puzzle` node and places symbols into slots', () => {
    render(
      <PuzzleVisual
        type="puzzle"
        dataPayload="PANEL: seven slots"
        interactiveData={{ symbols: ['⟁', '⧉', '⬡'], hint: 'Order of discovery.' }}
      />,
    )
    expect(screen.getByText('Sequencing Board')).toBeTruthy()
    expect(screen.getByText('Order of discovery.')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('slot 2 empty'))
    fireEvent.click(screen.getByLabelText('place ⧉'))

    expect(screen.getByLabelText('slot 2 holding ⧉')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.getByLabelText('slot 2 empty')).toBeTruthy()
  })

  it('draws the identity dossier for memory-recall nodes', () => {
    render(
      <PuzzleVisual
        type="memory-recall"
        dataPayload="PROMPT: recall the first fragment"
        interactiveData={{ requiresPuzzle: 'P05', recallPrompt: 'Recall Fragment 1.' }}
      />,
    )
    expect(screen.getByText('Identity Dossier')).toBeTruthy()
    expect(screen.getByText('RECALL · P05')).toBeTruthy()
    expect(screen.getByText('Recall Fragment 1.')).toBeTruthy()
  })

  it('draws the recovered document with its redaction intact', () => {
    render(
      <PuzzleVisual
        type="document-forensics"
        dataPayload="CLASSIFIED MEMO"
        interactiveData={{ documentText: 'MEMO\nResult: [REDACTED]' }}
      />,
    )
    expect(screen.getByText(/Result: \[REDACTED\]/)).toBeTruthy()
  })

  it('draws the LED array for binary nodes', () => {
    const { container } = render(
      <PuzzleVisual
        type="binary-technical"
        dataPayload="LED PATTERN"
        interactiveData={{ binarySequence: ['01001001'] }}
      />,
    )
    expect(screen.getByText('LED Array')).toBeTruthy()
    expect(container.querySelectorAll('[aria-label="lit"]')).toHaveLength(3)
    expect(container.querySelectorAll('[aria-label="dark"]')).toHaveLength(5)
  })

  it('draws the sequence board and marks the gap positions', () => {
    render(
      <PuzzleVisual
        type="pattern"
        dataPayload="SEQUENCE"
        interactiveData={{ sequence: ['A', 'B', '?', 'D'], missingPositions: [3] }}
      />,
    )
    expect(screen.getByText('Sequence')).toBeTruthy()
    expect(screen.getByText('Highlighted slots are the gaps. Say the position number, not the letter.'))
      .toBeTruthy()
  })

  it('draws the entry ledger and flags the signal row', () => {
    render(
      <PuzzleVisual
        type="contradiction-hunt"
        dataPayload="NOISE"
        interactiveData={ALL_SHAPES.entries ? { entries: ALL_SHAPES.entries } : {}}
      />,
    )
    expect(screen.getByText('Entry Ledger')).toBeTruthy()
    expect(screen.getByText('Row 17')).toBeTruthy()
    expect(screen.getByText('SIGNAL')).toBeTruthy()
  })

  it('draws the dependency chain', () => {
    render(
      <PuzzleVisual
        type="dependency-tree"
        dataPayload="GRAPH"
        interactiveData={{ nodes: [{ label: 'S', pos: 1 }, { label: 'T', pos: 2 }] }}
      />,
    )
    expect(screen.getByText('Dependency Graph')).toBeTruthy()
    expect(screen.getByText('S')).toBeTruthy()
    expect(screen.getByText('T')).toBeTruthy()
  })

  it('draws the meta aggregator with its answer chain', () => {
    render(
      <PuzzleVisual
        type="meta"
        dataPayload="STAGE 1 ANSWERS"
        interactiveData={{ answers: ['3425', 'VEY'], hint: 'Take the first letter.' }}
      />,
    )
    expect(screen.getByText('Stage Aggregator')).toBeTruthy()
    expect(screen.getByText('3425')).toBeTruthy()
    expect(screen.getByText('Take the first letter.')).toBeTruthy()
  })

  it('draws the three-phone shard with the other two masked', () => {
    render(
      <PuzzleVisual
        type="three-phone"
        dataPayload="SHARD 1"
        interactiveData={{ message: 'The Observer sees all paths.' }}
      />,
    )
    expect(screen.getByText('Your shard')).toBeTruthy()
    expect(screen.getAllByText('Held by a teammate')).toHaveLength(2)
  })

  it('falls back to a readable feed for an unknown type instead of rendering nothing', () => {
    const { container } = render(
      <PuzzleVisual type="something-new" dataPayload="UNKNOWN PAYLOAD" interactiveData={null} />,
    )
    expect(screen.getByText('Data Feed')).toBeTruthy()
    expect(container.textContent).toContain('UNKNOWN PAYLOAD')
  })

  it('never renders the intermediate output or any answer field', () => {
    const { container } = render(
      <PuzzleVisual
        type="meta"
        dataPayload="STAGE 1 ANSWERS"
        interactiveData={{ answers: ['3425'], intermediateOutput: 'Submit: 3425' }}
      />,
    )
    expect(container.textContent).not.toContain('Submit: 3425')
  })
})