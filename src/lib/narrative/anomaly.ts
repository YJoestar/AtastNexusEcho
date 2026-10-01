/**
 * NEXUS ECHO — Narrative: Anomaly
 *
 * An anomaly is a structural wrongness in how a piece of material is
 * *presented* — a line that sits 2px out of its column, a second impression of
 * a stamp, an image registered against the wrong rule. It never carries
 * information the server withheld: it never states an answer, never unlocks a
 * node, and never names a location the team has not reached.
 *
 * That is the whole discipline. The horror is that the paperwork is wrong, not
 * that the paperwork explains the case. If a player can extract a solution from
 * an anomaly, the anomaly is a bug.
 *
 * Assignment is deterministic (see `./hash`), so an anomaly a player noticed is
 * still there for their teammates.
 */

import { seededGate, seededInt, seededPick, unitFloat } from './hash'
import { MAX_NARRATIVE_LEVEL, type NarrativeLevel } from './intensity'

export type AnomalyLevel = NarrativeLevel

/**
 * The anomaly ladder, in the order the player is meant to learn it. Each entry
 * corresponds to a class in `globals.css`; there is no styling here on purpose.
 */
export const ANOMALY_CLASSES: Record<AnomalyLevel, string> = {
  0: '',
  1: 'anomaly-offset',
  2: 'anomaly-typebreak',
  3: 'anomaly-duplicated',
  4: 'anomaly-misregistered',
  5: 'anomaly-observed',
  6: 'anomaly-recursive',
}

/**
 * What an agent would say they noticed. Descriptive only — every line describes
 * the physical presentation of the artifact, never its contents.
 */
const TELLS: Record<Exclude<AnomalyLevel, 0>, readonly string[]> = {
  1: [
    'This line does not sit on the rule with the rest of the page.',
    'The left margin is correct on every page except this one.',
    'Two characters have been set slightly out of alignment.',
  ],
  2: [
    'The spacing on this line is not the spacing used elsewhere in the file.',
    'The type here is set differently, as though typed by a different hand.',
    'The character spacing changes mid-sentence and returns to normal after.',
  ],
  3: [
    'There are two impressions of this stamp. Only one was authorised.',
    'This heading appears twice. The second copy has no filing reference.',
    'The same reference number has been stamped into this margin twice.',
  ],
  4: [
    'The image is registered against the wrong rule. It was laid in by hand.',
    'This exhibit does not align with the caption beneath it.',
    'The scan is offset from the original by a consistent few millimetres.',
  ],
  5: [
    'This material has been read before you read it.',
    'The underline in this entry is the underline someone drew for themselves.',
    'There is a bookmark. No one has issued this file for issue.',
  ],
  6: [
    'The file index lists this document twice, under two different cases.',
    'This page appears in a case it was never opened under.',
    'The reference on this sheet belongs to a file that has not been created.',
  ],
}

export interface ArtifactAnomaly {
  level: AnomalyLevel
  /** The `globals.css` class to apply, or '' when the artifact is clean. */
  className: string
  /** Pixel displacement for `anomaly-offset`. Always 0, 1 or 2. */
  offsetPx: number
  /** The observation, or null when the artifact is clean. */
  tell: string | null
}

const CLEAN: ArtifactAnomaly = { level: 0, className: '', offsetPx: 0, tell: null }

/**
 * How rare anomalies are at each narrative level. Nothing is anomalous at
 * level 0; by level 6 roughly a fifth of artifacts qualify. A screen should
 * never be able to make the player expect one on sight.
 */
const RATE: Record<AnomalyLevel, number> = {
  0: 0,
  1: 0.05,
  2: 0.08,
  3: 0.11,
  4: 0.14,
  5: 0.17,
  6: 0.2,
}

/**
 * Decide whether one artifact is anomalous.
 *
 * @param seed      Stable identity of the artifact — team code, node code,
 *                  evidence code. Must not include anything the artifact
 *                  itself contains, or re-rendering could change the answer.
 * @param ceiling   The current narrative level. An artifact can never exceed
 *                  this, so a player who reloads at level 2 never sees a level
 *                  6 anomaly they have not earned.
 */
export function resolveArtifactAnomaly(seed: string, ceiling: NarrativeLevel): ArtifactAnomaly {
  const cap = Math.min(Math.max(0, Math.floor(ceiling)), MAX_NARRATIVE_LEVEL) as AnomalyLevel
  if (cap === 0) return CLEAN

  if (!seededGate(RATE[cap], 'anomaly', seed, cap)) return CLEAN

  // Anomalies cluster at the top of the allowed range: when the story is bad,
  // the worst artifacts are the ones that go wrong, and the mild ones stay mild.
  const drop = unitFloat('anomaly-level', seed) < 0.55 ? 0 : 1
  const level = Math.max(1, cap - drop) as Exclude<AnomalyLevel, 0>

  return {
    level,
    className: ANOMALY_CLASSES[level],
    offsetPx: seededInt(1, 2, 'anomaly-offset', seed),
    tell: seededPick(TELLS[level], 'anomaly-tell', seed, level) ?? null,
  }
}

export function hasAnomaly(anomaly: ArtifactAnomaly): boolean {
  return anomaly.level > 0
}

/**
 * Spread of anomalies across a list of artifacts, so a screen never stacks
 * more than the narrative level can justify.
 */
export function resolveAnomalies(
  seeds: readonly string[],
  ceiling: NarrativeLevel,
): Record<string, ArtifactAnomaly> {
  const result: Record<string, ArtifactAnomaly> = {}
  for (const seed of seeds) {
    result[seed] = resolveArtifactAnomaly(seed, ceiling)
  }
  return result
}

/**
 * A single redaction. Only ever applied where the bureau genuinely removed
 * something from the record — never as a texture, never on a solved node.
 */
export interface Redaction {
  /** True when this line was withheld. */
  redacted: boolean
  /** Text to show, or null when the line is withheld. */
  text: string | null
  className: string
}

export function resolveRedaction(
  seed: string,
  text: string,
  ceiling: NarrativeLevel,
): Redaction {
  const cap = Math.min(Math.max(0, Math.floor(ceiling)), MAX_NARRATIVE_LEVEL) as NarrativeLevel
  if (cap < 3) return { redacted: false, text, className: '' }
  if (!seededGate(0.18, 'redaction', seed, cap)) return { redacted: false, text, className: '' }
  return { redacted: true, text: null, className: 'redacted-line' }
}
