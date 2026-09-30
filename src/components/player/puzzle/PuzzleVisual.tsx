/**
 * NEXUS - Per-puzzle-type visual renderers
 *
 * Every node's role block carries a `visualType` (observation, memory-recall,
 * cipher, puzzle, meta, three-phone, ...) and, usually, an `interactiveData`
 * bag describing what that screen actually shows on the floor: a glyph run, a
 * bit array, a chain of graph nodes, a list of log entries, a document with a
 * redacted line.
 *
 * Previously all of them rendered as one grey paragraph of prose, so a node
 * asking the player to order seven symbols looked identical to a node asking
 * them to read a wall clock. This registry gives each visual type a renderer
 * that draws its own data.
 *
 * SECURITY: renderers receive only the requesting role's redacted block. No
 * renderer reads `intermediateOutput`, `acceptedAnswer` or `fullSolution`, and
 * nothing here validates or compares an answer - that stays server-side in
 * submit_puzzle_answer().
 */

import { useMemo, useState } from 'react'
import { AlertTriangle, Eraser, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  extractFrequencies,
  extractGlyphSequence,
  readBoolean,
  readEntries,
  readGraphNodes,
  readString,
  readStringArray,
  type InteractiveData,
} from './payload'
import {
  GlyphTile,
  KeyValue,
  PayloadText,
  RecallBadge,
  Slot,
  TeamRequiredNote,
  VisualShell,
} from './primitives'
import { CONTENT_VISUAL_TYPES } from './visualTypes'

export interface PuzzleVisualProps {
  /** `roleContent.visualType` as sent by the server; may be unknown or absent. */
  type?: string
  dataPayload: string
  interactiveData: InteractiveData
}

type Renderer = (props: PuzzleVisualProps) => React.JSX.Element

function RecallLine({ data, children }: { data: InteractiveData; children?: React.ReactNode }) {
  const requiresPuzzle = readString(data, 'requiresPuzzle')
  const recallPrompt = readString(data, 'recallPrompt')
  if (!requiresPuzzle && !recallPrompt) return null
  return (
    <div className="space-y-2">
      {requiresPuzzle && <RecallBadge puzzleCode={requiresPuzzle} />}
      {recallPrompt && <PayloadText className="text-nexus-info">{recallPrompt}</PayloadText>}
      {children}
    </div>
  )
}

function TeamRequirementNote({ data }: { data: InteractiveData }) {
  if (readBoolean(data, 'requiresAllRoles')) {
    return <TeamRequiredNote>All three roles hold a part of this screen. Read yours aloud.</TeamRequiredNote>
  }
  if (readBoolean(data, 'simultaneousSubmission')) {
    return (
      <TeamRequiredNote>
        Submitted simultaneously - line the three phones up before anyone commits.
      </TeamRequiredNote>
    )
  }
  return null
}

/* ------------------------------------------------------------------------- */
/* observation / spatial / visual - a field readout of what is on the wall    */
/* ------------------------------------------------------------------------- */

const ObservationVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const glyphs = extractGlyphSequence(dataPayload)
  return (
    <VisualShell label="Field Readout" tone="accent">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        {glyphs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {glyphs.map((glyph, i) => (
              <GlyphTile key={`${glyph}-${i}`} glyph={glyph} index={i} />
            ))}
          </div>
        )}
        <RecallLine data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* memory-recall - an identity dossier built from an earlier node             */
/* ------------------------------------------------------------------------- */

const IdentityVisual: Renderer = ({ dataPayload, interactiveData }) => (
  <VisualShell label="Identity Dossier" tone="warning">
    <div className="space-y-4">
      <PayloadText>{dataPayload}</PayloadText>
      <RecallLine data={interactiveData} />
      <TeamRequirementNote data={interactiveData} />
    </div>
  </VisualShell>
)

/* ------------------------------------------------------------------------- */
/* cipher / graph-network - the cryptogram wheel                              */
/* ------------------------------------------------------------------------- */

const CryptogramVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const glyphs = useMemo(() => {
    const declared = readStringArray(interactiveData, 'symbols')
    if (declared.length > 0) return declared
    return extractGlyphSequence(dataPayload)
  }, [dataPayload, interactiveData])

  return (
    <VisualShell label="Cryptogram Wheel" tone="accent">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        {glyphs.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {glyphs.map((glyph, i) => (
                <GlyphTile key={`${glyph}-${i}`} glyph={glyph} index={i} />
              ))}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-nexus-textSubtle mb-2">
                Decode into
              </p>
              <div className="flex flex-wrap gap-1.5">
                {glyphs.map((_, i) => (
                  <Slot key={i} empty aria-label={`decode slot ${i + 1}`} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <PayloadText className="text-nexus-textSubtle">
            No glyph key is published on this screen - the Observer reads it off the wheel.
          </PayloadText>
        )}
        <RecallLine data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* document-forensics - a physical page, redacted                             */
/* ------------------------------------------------------------------------- */

const DocumentVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const documentText = readString(interactiveData, 'documentText')
  const gmBroadcast = readBoolean(interactiveData, 'gmBroadcast')
  const metaLevel = readBoolean(interactiveData, 'metaLevel')

  return (
    <VisualShell label="Recovered Document">
      <div className="space-y-4">
        {documentText ? (
          <pre className="whitespace-pre-wrap font-mono text-sm text-nexus-text bg-nexus-surfaceElevated border border-nexus-borderSubtle rounded-lg p-4">
            {documentText}
          </pre>
        ) : (
          <PayloadText>{dataPayload}</PayloadText>
        )}
        {(gmBroadcast || metaLevel) && (
          <TeamRequiredNote>
            {gmBroadcast
              ? 'Bureau broadcast - every role reads a different shard of the same message.'
              : 'Meta-level record - it describes the puzzle system rather than the floor.'}
          </TeamRequiredNote>
        )}
        <RecallLine data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* audio - a spectrum readout                                                 */
/* ------------------------------------------------------------------------- */

const AudioVisual: Renderer = ({ dataPayload }) => {
  const frequencies = useMemo(() => extractFrequencies(dataPayload), [dataPayload])
  const peak = frequencies.length > 0 ? Math.max(...frequencies) : 0

  return (
    <VisualShell label="Spectrum" tone="accent">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        {frequencies.length > 0 && (
          <div className="flex items-end gap-2 h-24" role="img" aria-label="Frequency peaks">
            {frequencies.map((hz, i) => (
              <div key={`${hz}-${i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="font-mono text-[10px] text-nexus-textSubtle">{hz}</span>
                <div
                  className="w-full rounded-t-md bg-nexus-accent/60 border border-nexus-accent/40"
                  style={{ height: `${Math.max(8, Math.round((hz / peak) * 100))}%` }}
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-nexus-textSubtle flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5" aria-hidden="true" />
          Report the peaks exactly as shown - precision matters more than rounding.
        </p>
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* binary-technical - the LED array                                          */
/* ------------------------------------------------------------------------- */

const BinaryVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const bytes = useMemo(
    () => readStringArray(interactiveData, 'binarySequence'),
    [interactiveData],
  )

  return (
    <VisualShell label="LED Array" tone="accent">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        {bytes.map((byte, i) => (
          <div key={`${byte}-${i}`} className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-nexus-textSubtle w-5 text-right">
              {i + 1}
            </span>
            <div className="flex gap-[3px]">
              {Array.from(byte).map((bit, b) => (
                <span
                  key={`${byte}-${b}`}
                  className={cn(
                    'w-3 h-6 rounded-sm',
                    bit === '1' ? 'bg-nexus-accent shadow-glow-accent' : 'bg-nexus-borderSubtle',
                  )}
                  aria-label={bit === '1' ? 'lit' : 'dark'}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] text-nexus-textSubtle">
              {String.fromCharCode(parseInt(byte, 2)).replace(/[^\x20-\x7e]/g, '.')}
            </span>
          </div>
        ))}
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* pattern - a sequence with its gaps marked                                  */
/* ------------------------------------------------------------------------- */

const SequenceVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const sequence = useMemo(() => readStringArray(interactiveData, 'sequence'), [interactiveData])
  const missing = useMemo(
    () => new Set(readStringArray(interactiveData, 'missingPositions').map(Number)),
    [interactiveData],
  )
  if (sequence.length === 0) return <ObservationVisual dataPayload={dataPayload} interactiveData={interactiveData} type="observation" />

  return (
    <VisualShell label="Sequence" tone="accent">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        <div className="flex flex-wrap gap-1.5">
          {sequence.map((value, i) => (
            <Slot key={`${value}-${i}`} empty={value === '?'} active={missing.has(i + 1)}>
              {value === '?' ? '?' : value}
            </Slot>
          ))}
        </div>
        <p className="text-xs text-nexus-textSubtle">
          Highlighted slots are the gaps. Say the position number, not the letter.
        </p>
        <RecallLine data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* puzzle - the symbol ordering board (the P20-style sequencing screen)        */
/* ------------------------------------------------------------------------- */

const PuzzleBoardVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const symbols = useMemo(() => readStringArray(interactiveData, 'symbols'), [interactiveData])
  const hint = readString(interactiveData, 'hint')
  const [placements, setPlacements] = useState<(string | null)[]>(() => symbols.map(() => null))
  const [activeSlot, setActiveSlot] = useState<number | null>(null)

  if (symbols.length === 0) {
    return <ObservationVisual dataPayload={dataPayload} interactiveData={interactiveData} type="observation" />
  }

  const place = (symbol: string) => {
    if (activeSlot === null) return
    setPlacements(prev => prev.map((value, i) => (i === activeSlot ? symbol : value)))
  }

  const clear = () => {
    setPlacements(symbols.map(() => null))
    setActiveSlot(0)
  }

  return (
    <VisualShell label="Sequencing Board" tone="accent">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>

        <div className="flex flex-wrap gap-1.5">
          {placements.map((value, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSlot(i)}
              className="rounded-lg focus-visible:ring-2 focus-visible:ring-nexus-accent"
              aria-label={`slot ${i + 1}${value ? ` holding ${value}` : ' empty'}`}
              aria-pressed={activeSlot === i}
            >
              <Slot empty={value === null} active={activeSlot === i}>
                {value ?? i + 1}
              </Slot>
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-nexus-textSubtle mb-2">
            Collected symbols
          </p>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol, i) => (
              <button
                key={`${symbol}-${i}`}
                type="button"
                onClick={() => place(symbol)}
                className="rounded-lg focus-visible:ring-2 focus-visible:ring-nexus-accent"
                aria-label={`place ${symbol}`}
              >
                <Slot>{symbol}</Slot>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-nexus-textSubtle">
            {activeSlot === null
              ? 'Tap a slot, then a symbol.'
              : `Placing into slot ${activeSlot + 1}.`}
          </p>
          <button type="button" onClick={clear} className="btn-ghost text-xs">
            <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
            CLEAR
          </button>
        </div>

        {hint && <PayloadText className="text-nexus-info">{hint}</PayloadText>}
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* dependency-tree - the directed chain                                       */
/* ------------------------------------------------------------------------- */

const DependencyVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const nodes = useMemo(() => readGraphNodes(interactiveData), [interactiveData])
  const convergence = readString(interactiveData, 'convergencePoint')

  return (
    <VisualShell label="Dependency Graph">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        {nodes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {nodes.map((node, i) => (
              <span key={`${node.label}-${i}`} className="flex items-center gap-1.5">
                <Slot>{node.label}</Slot>
                {i < nodes.length - 1 && (
                  <span className="text-nexus-textSubtle" aria-hidden="true">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
        {convergence && (
          <p className="text-sm text-nexus-accent flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{convergence}</span>
          </p>
        )}
        <RecallLine data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* contradiction-hunt / timeline-investigation - the entry ledger              */
/* ------------------------------------------------------------------------- */

const EntryLedgerVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const entries = useMemo(() => readEntries(interactiveData), [interactiveData])

  return (
    <VisualShell label="Entry Ledger">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        {entries.length > 0 && (
          <ul className="space-y-2">
            {entries.map((entry, i) => (
              <li
                key={`${entry.source}-${i}`}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border p-3',
                  entry.flag
                    ? 'border-nexus-borderSubtle bg-nexus-bg'
                    : 'border-nexus-accent/40 bg-nexus-accentBg/20',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wider text-nexus-textSubtle">
                    {entry.source}
                  </span>
                  {!entry.flag && <span className="badge badge-accent text-[10px]">SIGNAL</span>}
                </div>
                <p className="text-sm text-nexus-textMuted break-words">{entry.text}</p>
              </li>
            ))}
          </ul>
        )}
        <RecallLine data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* three-phone - this role's shard, the other two held by teammates           */
/* ------------------------------------------------------------------------- */

const ThreePhoneVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const message = readString(interactiveData, 'message')

  return (
    <VisualShell label="Shard Alignment" tone="accent">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-nexus-accent/40 bg-nexus-accentBg/20 p-3">
            <p className="text-[10px] uppercase tracking-wider text-nexus-accent mb-1">Your shard</p>
            <p className="text-sm text-nexus-text">{message ?? 'Read your phone aloud.'}</p>
          </div>
          {['Left', 'Center'].map(placeholder => (
            <div
              key={placeholder}
              className="rounded-lg border border-dashed border-nexus-border p-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-nexus-textSubtle mb-1">
                {placeholder} shard
              </p>
              <p className="text-sm text-nexus-textSubtle">Held by a teammate</p>
            </div>
          ))}
        </div>
        <TeamRequirementNote data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* meta - the stage aggregator                                                */
/* ------------------------------------------------------------------------- */

const MetaVisual: Renderer = ({ dataPayload, interactiveData }) => {
  const answers = useMemo(() => readStringArray(interactiveData, 'answers'), [interactiveData])
  const symbols = useMemo(() => readStringArray(interactiveData, 'symbols'), [interactiveData])
  const hint = readString(interactiveData, 'hint')

  return (
    <VisualShell label="Stage Aggregator" tone="warning">
      <div className="space-y-4">
        <PayloadText>{dataPayload}</PayloadText>
        {answers.length > 0 && (
          <div className="space-y-1">
            {answers.map((answer, i) => (
              <KeyValue key={`${answer}-${i}`} label={`Link ${i + 1}`} value={answer} />
            ))}
          </div>
        )}
        {symbols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol, i) => (
              <GlyphTile key={`${symbol}-${i}`} glyph={symbol} index={i} />
            ))}
          </div>
        )}
        {hint && <PayloadText className="text-nexus-info">{hint}</PayloadText>}
        <TeamRequirementNote data={interactiveData} />
      </div>
    </VisualShell>
  )
}

/* ------------------------------------------------------------------------- */
/* final-boss                                                                */
/* ------------------------------------------------------------------------- */

const FinalBossVisual: Renderer = ({ dataPayload, interactiveData }) => (
  <VisualShell label="Nexus Core" tone="warning">
    <div className="space-y-4">
      <PayloadText className="text-nexus-text">{dataPayload}</PayloadText>
      <TeamRequirementNote data={interactiveData} />
      <RecallLine data={interactiveData} />
    </div>
  </VisualShell>
)

/* ------------------------------------------------------------------------- */
/* fallback                                                                  */
/* ------------------------------------------------------------------------- */

const GenericVisual: Renderer = ({ dataPayload, interactiveData }) => (
  <VisualShell label="Data Feed">
    <div className="space-y-4">
      <PayloadText>{dataPayload}</PayloadText>
      <RecallLine data={interactiveData} />
    </div>
  </VisualShell>
)

/**
 * visualType -> renderer. Keys are the values the content actually ships; an
 * unknown or absent type falls through to the generic readout rather than
 * rendering nothing.
 */
const RENDERERS: Record<string, Renderer> = {
  observation: ObservationVisual,
  spatial: ObservationVisual,
  visual: ObservationVisual,
  'memory-recall': IdentityVisual,
  identity: IdentityVisual,
  cipher: CryptogramVisual,
  cryptogram: CryptogramVisual,
  'graph-network': CryptogramVisual,
  'document-forensics': DocumentVisual,
  audio: AudioVisual,
  'binary-technical': BinaryVisual,
  pattern: SequenceVisual,
  puzzle: PuzzleBoardVisual,
  'dependency-tree': DependencyVisual,
  'contradiction-hunt': EntryLedgerVisual,
  'timeline-investigation': EntryLedgerVisual,
  'three-phone': ThreePhoneVisual,
  meta: MetaVisual,
  'final-boss': FinalBossVisual,
}

// Development guard: a shipped type with no renderer would silently degrade to
// prose on a player's phone, where nobody would file a bug about it.
if (import.meta.env.DEV) {
  const missing = CONTENT_VISUAL_TYPES.filter(type => !(type in RENDERERS))
  if (missing.length > 0) {
    console.warn('[NEXUS] Puzzle types without a renderer:', missing.join(', '))
  }
}

/**
 * Render the puzzle's own visual. Falls back through the data shape as well as
 * the declared type: a node that says "timeline-investigation" but ships a
 * `sequence` should still get the sequence board, not an empty ledger.
 */
export function PuzzleVisual({ type, dataPayload, interactiveData }: PuzzleVisualProps) {
  const declared = (type ?? '').toLowerCase()
  const hasSequence = readStringArray(interactiveData, 'sequence').length > 0

  const renderer: Renderer =
    (hasSequence ? SequenceVisual : undefined) ??
    RENDERERS[declared] ??
    (readStringArray(interactiveData, 'symbols').length > 0 ? PuzzleBoardVisual : GenericVisual)

  return renderer({ type, dataPayload, interactiveData })
}
