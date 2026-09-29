/**
 * NEXUS — Content Constants
 */

export const PUZZLE_TYPES = [
  'OBSERVATION',
  'BINARY',
  'CIPHER',
  'PATTERN',
  'GRAPH',
  'VISUAL',
  'AUDIO',
  'MEMORY',
  'SPATIAL',
  'EXTRACTION',
  'CROSS_REFERENCE',
  'THREE_PHONE',
  'DEDUCTION',
  'LOGIC',
  'NARRATIVE_INVESTIGATION',
  'META',
  'FINAL',
  'FINAL_BOSS',
] as const

export const STAGE_GROUPS = ['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4', 'STAGE_5', 'META', 'FINAL'] as const

export const HINT_PENALTIES = {
  hint1: 120,
  hint2: 300,
  hint3: 600,
} as const

export const MAX_HINTS_PER_NODE = 3 as const

export const SUBMISSION_RATE_LIMIT = 5 as const

export const SUBMISSION_RATE_LIMIT_WINDOW_MS = 60_000 as const

export const ANTI_SPAM_COOLDOWN_SECONDS = 3 as const

export const DEFAULT_GAME_DURATION_MINUTES = 180 as const

export const LOGIN_CODE_TTL_MINUTES = 15 as const
