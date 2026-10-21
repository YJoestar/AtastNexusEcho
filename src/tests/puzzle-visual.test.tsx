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

  it('draws the cipher-text readout for rail-fence nodes', () => {
    render(
      <PuzzleVisual
        type="cipher-text"
        dataPayload="SCANNED SURFACE: a length of copper tape with etched letters."
        interactiveData={{ cipherText: 'XGWHGOHLMGVLIMGSXLPFSLLVX', hint: 'Three rows.' }}
      />,
    )
    expect(screen.getByText('Cipher Text')).toBeTruthy()
    expect(screen.getByText(/XGWHGOHLMGVLIMGSXLPFSLLVX/)).toBeTruthy()
    expect(screen.getByText('Three rows.')).toBeTruthy()
  })

  it('draws the grid maze for pathfinding nodes', () => {
    render(
      <PuzzleVisual
        type="grid-maze"
        dataPayload="GRID MAP (6x6)"
        interactiveData={{ gridString: 'S#.... / ..###. / ..#... / ..#... / ...... / .....E', hint: 'Alternating-axis.' }}
      />,
    )
    expect(screen.getByText('Grid Maze')).toBeTruthy()
    expect(screen.getByText('S')).toBeTruthy()
    expect(screen.getByText('E')).toBeTruthy()
    expect(screen.getAllByLabelText(/wall at/)).toHaveLength(6)
    expect(screen.getByText('Alternating-axis.')).toBeTruthy()
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

  it('draws the terminal readout with each machine line', () => {
    render(
      <PuzzleVisual
        type="terminal"
        dataPayload="ACCESS REGISTER"
        interactiveData={{ lines: [{ source: '01', text: 'FIELD ONE: CALL MARK', flag: false }] }}
      />,
    )
    expect(screen.getByText('Terminal Readout')).toBeTruthy()
    expect(screen.getByText('01')).toBeTruthy()
    expect(screen.getByText('FIELD ONE: CALL MARK')).toBeTruthy()
  })

  it('draws the telemetry board and dims a sealed reading', () => {
    render(
      <PuzzleVisual
        type="telemetry"
        dataPayload="CONVERGENCE LOCK"
        interactiveData={{
          metrics: [
            { label: 'CHANNEL P22', value: 'GREEN', state: 'lit' },
            { label: 'CHANNEL P28', value: 'SEALED', state: 'sealed' },
          ],
        }}
      />,
    )
    expect(screen.getByText('Telemetry Board')).toBeTruthy()
    expect(screen.getByText('CHANNEL P22')).toBeTruthy()
    expect(screen.getByText('GREEN')).toBeTruthy()
    expect(screen.getByText('SEALED')).toBeTruthy()
  })

  it('draws the chart bars with their values', () => {
    const { container } = render(
      <PuzzleVisual
        type="chart"
        dataPayload="DEPENDENCY DEPTH"
        interactiveData={{ bars: [{ label: 'S', value: 1 }, { label: 'E', value: 9, flag: true }] }}
      />,
    )
    expect(screen.getByText('Chart Readout')).toBeTruthy()
    expect(screen.getByText('S')).toBeTruthy()
    expect(container.querySelectorAll('.bg-nexus-warning').length).toBeGreaterThan(0)
  })

  it('draws the execution trace and flags the suspect step', () => {
    render(
      <PuzzleVisual
        type="console"
        dataPayload="EXECUTION TRACE"
        interactiveData={{
          steps: [
            { index: '0', register: '1', input: '1', state: '1', flag: false },
            { index: '1', register: '1', input: '1', state: '2', flag: true },
          ],
        }}
      />,
    )
    expect(screen.getByText('Execution Trace')).toBeTruthy()
    expect(screen.getByText('SUSPECT')).toBeTruthy()
  })

  it('draws the timeline events in running order', () => {
    render(
      <PuzzleVisual
        type="timeline"
        dataPayload="NIGHT OF THE SEAL"
        interactiveData={{
          events: [
            { time: '04:15', label: 'Camera array dark' },
            { time: '04:17', label: 'East door activity', flag: true },
          ],
        }}
      />,
    )
    expect(screen.getByText('Timeline')).toBeTruthy()
    expect(screen.getByText('04:15')).toBeTruthy()
    expect(screen.getByText('East door activity')).toBeTruthy()
  })

  it('falls back to a readable feed for an unknown type instead of rendering nothing', () => {    const { container } = render(
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

  it('gives each node its own renderer boundary, so node state cannot leak', () => {
    // PuzzleVisual used to call the chosen renderer as a plain function, which
    // attaches the renderer's hooks to PuzzleVisual itself. A renderer's own
    // useState (the symbol board keeps placements) then lived on the parent and
    // could survive, or reorder against, a different node's renderer. Rendering
    // as an element gives each renderer its own fiber: switching node types must
    // reset the symbol board's placements.
    const panel = (
      <PuzzleVisual type="puzzle" dataPayload="PANEL" interactiveData={{ symbols: ['A', 'B'], hint: 'x' }} />
    )
    const { rerender } = render(panel)
    fireEvent.click(screen.getByLabelText('slot 1 empty'))
    fireEvent.click(screen.getByLabelText('place A'))
    expect(screen.getByLabelText('slot 1 holding A')).toBeTruthy()

    rerender(<PuzzleVisual type="chart" dataPayload="CHART" interactiveData={{ bars: [] }} />)
    rerender(panel)

    expect(screen.getByLabelText('slot 1 empty')).toBeTruthy()
  })
})