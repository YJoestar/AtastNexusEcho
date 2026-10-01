/**
 * NEXUS ECHO — Bureau Primitives
 *
 * The shared vocabulary of the institution. Screens are assembled from these
 * rather than from ad-hoc utility class strings, so that a document looks like
 * a document on the player's phone and on the bureau's workstation alike.
 *
 * Rules that hold for every primitive here:
 *   - no rounded glass, no neon, no generic card grid
 *   - state is never carried by colour alone
 *   - motion is short and physical, and disappears entirely under
 *     prefers-reduced-motion (handled once, in globals.css)
 */

export {
  ClassificationTag,
  DocumentShell,
  Field,
  FieldGrid,
  MarginNote,
  Reference,
  type Classification,
  type PaperStock,
} from './Document'

export {
  MeasuredValue,
  Stamp,
  StateMarker,
  StatusMark,
  type StampVariant,
  type StatusTone,
} from './Status'

export {
  FileRow,
  FileTabs,
  RegisterColumn,
  RegisterList,
  RegisterRow,
} from './Register'

export {
  CustodyRegister,
  CustodyRow,
  EvidenceFrame,
  EvidenceTag,
  Redacted,
  RedactedLine,
  type CustodyEntry,
} from './Evidence'

export {
  IllegibleRegion,
  RecordingLamp,
  SignalIntegrity,
  Waveform,
  type SignalTone,
} from './Signal'

export { ScanStation, SurveillanceFrame } from './Surveillance'

export { AnomalyArtifact, WithheldLine } from './Anomaly'

export {
  IncidentGap,
  IncidentLog,
  IncidentRow,
  type IncidentEntry,
} from './IncidentLog'

export { BureauIcons } from './BureauIcons'