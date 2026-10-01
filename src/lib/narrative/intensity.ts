/**
 * NEXUS ECHO — Narrative: Intensity
 *
 * One number, 0 through 6, that describes how wrong the institution currently
 * is behaving. It is derived only from real game state, so it is a consequence
 * of what players have actually done rather than a scripted timer.
 *
 * The number does exactly one thing visually: it selects the palette drain in
 * `globals.css` via `[data-horror="0..6"]`. It never gates content, never
 * reveals anything the server did not already return, and never changes what a
 * player is allowed to do.
 */

export type NarrativeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface NarrativeSignals {
  /** Nodes the team has actually solved. */
  solvedCount: number
  /** Total nodes in the case. */
  totalNodes: number
  /** Stage the team is currently on, 1-based. */
  currentStage: number
  /** Number of stages in the case. */
  totalStages: number
  /** Submissions made on the current node beyond the first. */
  attempts: number
  /** Hints drawn, including repeat draws. */
  hintsUsed: number
  /** The link to the bureau is down. */
  isOffline: boolean
  /** Answers the client holds but the server has not accepted. */
  queuedCount: number
  /** Unread directives. */
  unreadCount: number
  /** Anomalies the player has already been shown. */
  observedAnomalies: number
}

export interface NarrativeState {
  level: NarrativeLevel
  /** 0..1, the raw pressure the level was cut from. */
  pressure: number
  /** Short in-fiction name for the current state. */
  label: string
  /** The one-line thing an agent would notice about it. */
  observation: string
}

interface Band {
  threshold: number
  label: string
  observation: string
}

/**
 * The ladder. Each step is a different kind of wrong, not a bigger version of
 * the previous one — the escalation should stay legible as narrative rather
 * than dissolve into visual noise.
 */
const BANDS: readonly Band[] = [
  {
    threshold: 0,
    label: 'CONTACT',
    observation: 'Routine. The file is being worked as written.',
  },
  {
    threshold: 0.1,
    label: 'TRACE',
    observation: 'Some material is not accounted for. Nothing is claiming responsibility.',
  },
  {
    threshold: 0.24,
    label: 'DISCREPANCY',
    observation: 'Two entries disagree. The system has already picked one of them.',
  },
  {
    threshold: 0.4,
    label: 'RECURSION',
    observation: 'The same reference keeps appearing in files it has no business being in.',
  },
  {
    threshold: 0.56,
    label: 'SUBJECT AWARENESS',
    observation: 'Material is behaving as though it has been read.',
  },
  {
    threshold: 0.72,
    label: 'RECOGNITION',
    observation: 'The system has stopped describing the case and started describing the team.',
  },
  {
    threshold: 0.88,
    label: 'ATTRIBUTION',
    observation: 'The record attributes this investigation to the person reading it.',
  },
]

export const MAX_NARRATIVE_LEVEL: NarrativeLevel = 6

function ratio(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0
  return Math.min(1, Math.max(0, value / total))
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Weighted pressure. The weights are chosen so that the strongest contributor
 * is divergence between the client's record and the server's — that is the one
 * thing in this game the institution can genuinely not control, and it is
 * therefore the thing it should be most upset about.
 */
export function narrativePressure(signals: NarrativeSignals): number {
  const progress = ratio(signals.solvedCount, signals.totalNodes)
  const stage = ratio(Math.max(0, signals.currentStage - 1), Math.max(1, signals.totalStages - 1))

  // Struggling is not the same as being wrong, but repeated failure is what
  // leaves an agent reading a file long enough to notice it.
  const struggle = clamp01((signals.attempts + signals.hintsUsed * 2) / 12)

  // The record and the world disagreeing: the system's own integrity failing.
  const offline = signals.isOffline ? 0.5 : 0
  const queued = clamp01(signals.queuedCount / 3) * 0.5
  const divergence = clamp01(offline + queued)

  const directives = clamp01(signals.unreadCount / 5)
  const anomalies = clamp01(signals.observedAnomalies / 6)

  return clamp01(
    progress * 0.3 +
      stage * 0.15 +
      struggle * 0.15 +
      divergence * 0.25 +
      directives * 0.05 +
      anomalies * 0.1
  )
}

export function levelFromPressure(pressure: number): NarrativeLevel {
  let level: NarrativeLevel = 0
  for (let i = 0; i < BANDS.length; i++) {
    if (pressure >= BANDS[i].threshold) level = i as NarrativeLevel
  }
  return level
}

export function deriveNarrativeState(signals: NarrativeSignals): NarrativeState {
  const pressure = narrativePressure(signals)
  const level = levelFromPressure(pressure)
  const band = BANDS[level]
  return { level, pressure, label: band.label, observation: band.observation }
}

export function levelLabel(level: NarrativeLevel): string {
  return BANDS[level].label
}

export function levelObservation(level: NarrativeLevel): string {
  return BANDS[level].observation
}

/**
 * The bureau's own view of the case.
 *
 * An operator is watching the whole investigation, not conducting one, so their
 * screen follows the case lifecycle rather than an individual's conduct. The
 * mapping is deliberately coarse: a workstation does not need the granular
 * model, only the fact that the case has stopped behaving.
 *
 * Unknown or absent phases return 0. The resting state of the system must be
 * ordinary, so nothing escalates by accident.
 */
export function levelFromCasePhase(phase: string | null | undefined): NarrativeLevel {
  switch (phase) {
    case 'BRIEFING':
      return 1
    case 'GAMEPLAY':
      return 3
    case 'FINAL':
      return 5
    case 'DEBRIEF':
      return 6
    default:
      return 0
  }
}

/**
 * Nearest lower level, so a component can render the *previous* beat of the
 * story without recomputing the whole pressure model.
 */
export function previousLevel(level: NarrativeLevel): NarrativeLevel {
  return (level <= 0 ? 0 : level - 1) as NarrativeLevel
}

/**
 * A team that has not started yet. This is also the safe default for any
 * screen that has no game state, so an unfinished screen can never present the
 * player with a level it has not earned.
 */
export const EMPTY_SIGNALS: NarrativeSignals = {
  solvedCount: 0,
  totalNodes: 0,
  currentStage: 0,
  totalStages: 0,
  attempts: 0,
  hintsUsed: 0,
  isOffline: false,
  queuedCount: 0,
  unreadCount: 0,
  observedAnomalies: 0,
}

/**
 * Merge whatever a shell happens to know into a complete signal set. Shells
 * hold different subsets — the player knows attempts, the bureau knows teams —
 * so both go through here rather than each hand-rolling a partial.
 */
export function createSignals(partial: Partial<NarrativeSignals> = {}): NarrativeSignals {
  return { ...EMPTY_SIGNALS, ...partial }
}
