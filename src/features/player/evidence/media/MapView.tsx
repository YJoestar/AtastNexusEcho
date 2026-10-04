import { mediumFacts } from '@/lib/evidence/facts'
import { FactsRow, LinkedRecordsList, NoImage } from './shared'
import { linkedRecordsFor } from './linked'
import type { MediaProps } from './types'

export function MapSurface({ artifact, imageUrl, thumbUrl, imageStyle, contentText }: MediaProps) {
  if (!imageUrl) return <NoImage label="SHEET / NOT ATTACHED" text={contentText || artifact.description || 'No sheet is attached to this record.'} />
  return (
    <div className="absolute inset-0 border border-[#77746c] bg-[#cfc9b6]">
      <img
        src={imageUrl}
        alt={artifact.title}
        draggable={false}
        decoding="async"
        className="h-full w-full bg-contain bg-center bg-no-repeat object-contain"
        style={{
          ...(thumbUrl && thumbUrl !== imageUrl ? { backgroundImage: `url(${thumbUrl})` } : null),
          ...imageStyle,
        }}
      />
    </div>
  )
}

export function MapStrip({ artifact, catalog, related, onOpenRelated }: MediaProps) {
  const records = linkedRecordsFor(artifact, catalog, related, true)
  return (
    <div className="space-y-3">
      <FactsRow facts={mediumFacts(artifact)} label="Map sheet" />
      <LinkedRecordsList
        records={records}
        title="LINKED RECORDS"
        label="Linked records"
        empty="NO OTHER RECORD SHARES THIS MAP'S LOCATION OR RELATIONSHIPS"
        onOpen={onOpenRelated}
      />
    </div>
  )
}
