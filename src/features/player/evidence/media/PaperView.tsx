import { artifactCondition, artifactState, contentString } from '../types'
import { captureTimeOf, type TimePrecision } from '@/lib/evidence/series'
import { mediumFacts } from '@/lib/evidence/facts'
import { FactsRow, LinkedRecordsList } from './shared'
import type { MediaProps } from './types'

type PaperVariant = 'DOCUMENT' | 'NOTE' | 'PERSONNEL' | 'FRAGMENT'

const PAPER: Record<PaperVariant, string> = {
  DOCUMENT: 'border border-nexus-border bg-[#d4d0c5] text-[#24231f] shadow-[4px_5px_0_rgba(0,0,0,0.25)]',
  // Ruled paper: the lines are only a texture, they carry no text.
  NOTE: 'border border-nexus-border bg-[#ddd6bf] text-[#24231f] shadow-[4px_5px_0_rgba(0,0,0,0.25)] [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,rgba(80,70,50,0.22)_28px)]',
  PERSONNEL: 'rounded-[6px] border-2 border-[#5f5d55] bg-[#cdd0c6] text-[#22241f] shadow-[3px_4px_0_rgba(0,0,0,0.3)]',
  FRAGMENT: 'border border-dashed border-[#5a574f] bg-[#c9c3b3] text-[#24231f] shadow-[2px_3px_0_rgba(0,0,0,0.35)]',
}

const HEADING: Record<PaperVariant, string> = {
  DOCUMENT: 'NEXUS ECHO / CASE MATERIAL',
  NOTE: 'HANDWRITTEN NOTE',
  PERSONNEL: 'PERSONNEL CARD',
  FRAGMENT: 'RECOVERED FRAGMENT',
}

function PaperSurface({ variant, artifact, imageUrl, thumbUrl, imageStyle, contentText, fields }: MediaProps & { variant: PaperVariant }) {
  if (imageUrl) {
    const personnel = variant === 'PERSONNEL'
    return (
      <div className={`absolute inset-0 flex flex-col ${variant === 'FRAGMENT' ? 'border border-nexus-border bg-[#1b1c1d] p-3' : `${PAPER[variant]} ${personnel ? 'p-2' : 'p-1'}`}`}>
        {personnel && (
          <p className="mb-1 flex justify-between border-b border-[#5f5d55] pb-1 font-mono text-[0.62rem] uppercase tracking-[0.14em]">
            <span>{HEADING[variant]}</span><span>{artifact.code}</span>
          </p>
        )}
        <img
          src={imageUrl}
          alt={artifact.title}
          draggable={false}
          decoding="async"
          className="min-h-0 w-full flex-1 bg-contain bg-center bg-no-repeat object-contain"
          style={{
            ...(thumbUrl && thumbUrl !== imageUrl ? { backgroundImage: `url(${thumbUrl})` } : null),
            ...imageStyle,
          }}
        />
      </div>
    )
  }
  return (
    <article className={`absolute inset-0 overflow-auto p-5 ${PAPER[variant]}`} style={imageStyle}>
      <header className="mb-5 flex items-start justify-between gap-3 border-b border-[#77746c] pb-3">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.15em]">{HEADING[variant]}</p>
          <h3 className="mt-2 font-document text-lg font-semibold">{artifact.title}</h3>
        </div>
        <span className="font-mono text-[0.68rem]">{artifact.code}</span>
      </header>
      <p className="whitespace-pre-wrap font-document text-sm leading-relaxed">{contentText || artifact.description || 'NO TEXTUAL CONTENT ATTACHED.'}</p>
      {fields.length > 0 && (
        <dl className="mt-5 space-y-2 border-t border-[#77746c] pt-3 font-mono text-[0.68rem]">
          {fields.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
              <dt className="text-[#69665e]">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}

const PRECISION_NOTE: Record<TimePrecision, string> = {
  SECOND: 'DATED TO THE SECOND',
  MINUTE: 'DATED TO THE MINUTE',
  DAY: 'DAY ONLY - NO READABLE TIME',
  MONTH: 'MONTH ONLY - DAY NOT RECORDED',
  YEAR: 'YEAR ONLY - MONTH NOT RECORDED',
}

export function DocumentStrip({ artifact }: MediaProps) {
  const issuer = contentString(artifact.content, ['source'])
  const dated = contentString(artifact.content, ['captured_at', 'capturedAt', 'timestamp'])
  const precision = captureTimeOf(artifact)?.precision
  return (
    <dl aria-label="Document provenance" className="grid grid-cols-1 gap-2 border-y border-nexus-borderSubtle py-2 font-mono sm:grid-cols-2">
      <div>
        <dt className="text-[0.64rem] uppercase tracking-[0.12em] text-nexus-textSubtle">ISSUED BY</dt>
        <dd className="mt-0.5 break-words text-[0.8rem] text-nexus-text">{issuer ?? 'ISSUING SOURCE NOT RECORDED'}</dd>
      </div>
      <div>
        <dt className="text-[0.64rem] uppercase tracking-[0.12em] text-nexus-textSubtle">DATE</dt>
        <dd className="mt-0.5 break-words text-[0.8rem] text-nexus-text">
          {dated ?? 'NOT DATED'}
          <span className="block text-[0.66rem] text-nexus-warning">{precision ? PRECISION_NOTE[precision] : dated ? 'DATE NOT READABLE AS WRITTEN' : 'NO DATE ON RECORD'}</span>
        </dd>
      </div>
    </dl>
  )
}

export function NoteStrip({ artifact, ink }: MediaProps) {
  const hand = contentString(artifact.content, ['source'])
  const written = contentString(artifact.content, ['captured_at', 'capturedAt', 'timestamp'])
  return (
    <div className="space-y-2 border-y border-nexus-borderSubtle py-2">
      <button
        type="button"
        onClick={ink.toggle}
        aria-pressed={ink.on}
        className={`min-h-11 w-full border px-3 font-mono text-[0.7rem] uppercase tracking-[0.1em] ${ink.on ? 'border-nexus-warning bg-nexus-warningBg/20 text-nexus-warning' : 'border-nexus-border text-nexus-text'}`}
      >
        {ink.on ? 'HANDWRITING INSPECTION ON - 200% / HIGH CONTRAST' : 'HANDWRITING INSPECTION'}
      </button>
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-nexus-textSubtle">
        HAND: {hand ?? 'NOT RECORDED'} / WRITTEN: {written ?? 'NOT DATED'}
      </p>
    </div>
  )
}

export function PersonnelStrip({ artifact }: MediaProps) {
  return <FactsRow facts={mediumFacts(artifact)} label="Personnel card" />
}

export function FragmentStrip({ artifact, catalog, related, onOpenRelated }: MediaProps) {
  const condition = artifactCondition(artifact)
  const state = artifactState(artifact)
  const integrity = contentString(artifact.content, ['integrity'])
  const found = artifact.location?.trim()
  // A fragment fits with the records it declares a relationship with.
  const byCode = new Map(catalog.map(item => [item.code, item]))
  const fits = new Map(related.map(entry => [entry.artifact.id, entry]))
  for (const link of artifact.relationships ?? []) {
    const other = byCode.get(link.to)
    if (other && !fits.has(other.id)) fits.set(other.id, { artifact: other, kind: link.kind, note: link.note })
  }
  return (
    <div className="space-y-3">
      <dl aria-label="Damage readout" className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-nexus-borderSubtle py-2 font-mono sm:grid-cols-4">
        {([
          ['CONDITION', condition],
          ['STATE', state],
          ['INTEGRITY', integrity ?? 'NOT RECORDED'],
          ['FOUND AT', found ?? 'UNKNOWN'],
        ] as const).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[0.64rem] uppercase tracking-[0.12em] text-nexus-textSubtle">{label}</dt>
            <dd className={`mt-0.5 break-words text-[0.8rem] ${label === 'CONDITION' && condition !== 'NORMAL' ? 'text-nexus-warning' : 'text-nexus-text'}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <LinkedRecordsList
        records={Array.from(fits.values())}
        title="FITS WITH"
        label="Fits with"
        empty="NO RECORD IS LINKED TO THIS FRAGMENT"
        onOpen={onOpenRelated}
      />
    </div>
  )
}

export const DocumentSurface = (props: MediaProps) => <PaperSurface {...props} variant="DOCUMENT" />
export const NoteSurface = (props: MediaProps) => <PaperSurface {...props} variant="NOTE" />
export const PersonnelSurface = (props: MediaProps) => <PaperSurface {...props} variant="PERSONNEL" />
export const FragmentSurface = (props: MediaProps) => <PaperSurface {...props} variant="FRAGMENT" />
