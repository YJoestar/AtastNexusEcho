import { contentString } from '../types'
import { mediumFacts } from '@/lib/evidence/facts'
import { FactsRow, NoImage } from './shared'
import type { MediaProps } from './types'

export function PhotographSurface({ artifact, imageUrl, thumbUrl, imageStyle, contentText }: MediaProps) {
  if (!imageUrl) {
    return <NoImage label="IMAGE SOURCE / NOT ATTACHED" text={contentText || artifact.description || 'No image payload is available in this recovered record.'} />
  }
  return (
    // A print: pale border, wider at the foot, on the stage's dark table.
    <div className="absolute inset-0 bg-[#e8e4d8] p-2 pb-8 shadow-[0_6px_18px_rgba(0,0,0,0.5)]">
      {/* The cached thumbnail sits behind the full frame so opening never starts on black. */}
      <img
        src={imageUrl}
        alt={artifact.title}
        draggable={false}
        decoding="async"
        className="h-full w-full bg-black bg-contain bg-center bg-no-repeat object-contain"
        style={{
          ...(thumbUrl && thumbUrl !== imageUrl ? { backgroundImage: `url(${thumbUrl})` } : null),
          ...imageStyle,
        }}
      />
      <span className="pointer-events-none absolute bottom-2 left-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[#4a473f]">{artifact.code}</span>
    </div>
  )
}

export function PhotographStrip({ artifact }: MediaProps) {
  const facts = mediumFacts(artifact).filter(fact => fact.label !== 'INTEGRITY')
  const where = artifact.location?.trim()
  if (where) facts.push({ label: 'LOCATION', value: where })
  if (facts.length === 0) return null
  return (
    <details className="border border-nexus-borderSubtle bg-nexus-surfaceSubtle px-3">
      <summary className="flex min-h-11 cursor-pointer items-center font-mono text-[0.68rem] uppercase tracking-[0.12em] text-nexus-textMuted">
        PRINT DATA — {contentString(artifact.content, ['captured_at', 'capturedAt']) ?? 'NO CAPTURE TIME ON RECORD'}
      </summary>
      <FactsRow facts={facts} label="Photograph data" />
    </details>
  )
}
