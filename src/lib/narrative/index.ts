/**
 * NEXUS ECHO — Narrative Layer
 *
 * The bureau's behaviour model. Everything here is pure and deterministic so
 * that the same case, read by the same team, is wrong in the same places on
 * every device and every reload.
 *
 *   ./hash       stable FNV-1a hashing; the only stand-in for randomness
 *   ./intensity  one number, 0..6, derived from real game state
 *   ./anomaly    per-artifact structural wrongness, capped by intensity
 *
 * Security: this layer never produces puzzle content, answers, locations, or
 * unlock state. It only describes how existing material is presented.
 */

export {
  stableHash,
  seededHash,
  unitFloat,
  seededInt,
  seededPick,
  seededGate,
} from './hash'

export {
  MAX_NARRATIVE_LEVEL,
  EMPTY_SIGNALS,
  createSignals,
  deriveNarrativeState,
  narrativePressure,
  levelFromPressure,
  levelLabel,
  levelObservation,
  levelFromCasePhase,
  previousLevel,
  type NarrativeLevel,
  type NarrativeSignals,
  type NarrativeState,
} from './intensity'

export {
  ANOMALY_CLASSES,
  hasAnomaly,
  resolveArtifactAnomaly,
  resolveAnomalies,
  resolveRedaction,
  type AnomalyLevel,
  type ArtifactAnomaly,
  type Redaction,
} from './anomaly'
