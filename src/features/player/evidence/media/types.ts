import type { ComponentType, CSSProperties } from 'react'
import type { ArtifactType, CaseArtifact } from '../types'
import type { SeriesContext } from './seriesContext'
import type { VideoControl } from './useVideoControl'

export interface RelatedRecord {
  artifact: CaseArtifact
  kind: string
  note: string
}

/** Everything a medium view may read. All of it comes from the record or the catalogue. */
export interface MediaProps {
  artifact: CaseArtifact
  medium: ArtifactType
  imageUrl: string | null
  thumbUrl: string | null
  audioUrl: string | null
  videoUrl: string | null
  contentText: string | null
  fields: Array<[string, string]>
  /** View-only enhancement filter for the image element, if any. */
  imageStyle: CSSProperties
  catalog: readonly CaseArtifact[]
  related: RelatedRecord[]
  onOpenRelated?: (id: string) => void
  series: SeriesContext | null
  video: VideoControl
  /** Handwriting inspection preset (zoom 2x + high contrast on ink). */
  ink: { on: boolean; toggle: () => void }
}

/**
 * What differs between media. `Surface` lives inside the pan/zoom layer,
 * `Overlay` is fixed glass over the stage (never interactive), `Strip` sits
 * under the stage and holds the medium's own controls.
 */
export interface MediumView {
  /** Space between the stage edge and the pan/zoom layer, in px. */
  inset: number
  stageClass: string
  Surface: ComponentType<MediaProps>
  Overlay?: ComponentType<MediaProps>
  Strip?: ComponentType<MediaProps>
  /** The medium lists linked records itself, so the generic list is hidden. */
  ownsLinked?: boolean
}
