import type { ArtifactType } from '../types'
import { AudioSurface } from './AudioView'
import { MapStrip, MapSurface } from './MapView'
import { DocumentStrip, DocumentSurface, FragmentStrip, FragmentSurface, NoteStrip, NoteSurface, PersonnelStrip, PersonnelSurface } from './PaperView'
import { PhotographStrip, PhotographSurface } from './PhotographView'
import { SurveillanceOverlay, SurveillanceStrip, SurveillanceSurface } from './SurveillanceView'
import type { MediumView } from './types'

const VIEWS: Record<ArtifactType, MediumView> = {
  PHOTOGRAPH: { inset: 12, stageClass: 'bg-[#15171a]', Surface: PhotographSurface, Strip: PhotographStrip },
  SURVEILLANCE: { inset: 10, stageClass: 'rounded-[14px] bg-black', Surface: SurveillanceSurface, Overlay: SurveillanceOverlay, Strip: SurveillanceStrip },
  DOCUMENT: { inset: 16, stageClass: 'bg-nexus-bg', Surface: DocumentSurface, Strip: DocumentStrip },
  FRAGMENT: { inset: 16, stageClass: 'bg-[#101112]', Surface: FragmentSurface, Strip: FragmentStrip, ownsLinked: true },
  MAP: { inset: 12, stageClass: 'bg-[#2a2c2b]', Surface: MapSurface, Strip: MapStrip, ownsLinked: true },
  PERSONNEL: { inset: 16, stageClass: 'bg-nexus-bg', Surface: PersonnelSurface, Strip: PersonnelStrip },
  NOTE: { inset: 16, stageClass: 'bg-nexus-bg', Surface: NoteSurface, Strip: NoteStrip },
  AUDIO: { inset: 12, stageClass: 'bg-nexus-bg', Surface: AudioSurface },
}

/** The per-medium behaviours: how the stage looks and what sits under it. */
export function mediumView(medium: ArtifactType): MediumView {
  return VIEWS[medium]
}
