import type { GameStatus, TeamStatus } from '@/types/domain'

export const TEAM_TRANSITIONS: Record<TeamStatus, TeamStatus[]> = {
  REGISTERED: ['FORMING', 'RESET', 'ABANDONED', 'DISQUALIFIED'],
  FORMING: ['READY', 'REGISTERED', 'ABANDONED', 'DISQUALIFIED'],
  READY: ['WAITING', 'FORMING', 'ABANDONED', 'DISQUALIFIED'],
  WAITING: ['ACTIVE', 'PAUSED', 'ABANDONED', 'DISQUALIFIED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'ABANDONED', 'DISQUALIFIED'],
  PAUSED: ['ACTIVE', 'COMPLETED', 'ABANDONED', 'DISQUALIFIED'],
  COMPLETED: ['RESET', 'ABANDONED'],
  DISQUALIFIED: ['RESET'],
  ABANDONED: ['RESET'],
  RESET: ['REGISTERED'],
}

export const TEAM_TRANSITION_LABELS: Record<string, string> = {
  'REGISTERED->FORMING': 'Players being added',
  'FORMING->READY': 'All roles assigned',
  'READY->WAITING': 'Access codes generated, awaiting player login',
  'WAITING->ACTIVE': 'Game started by Bureau',
  'ACTIVE->PAUSED': 'Game paused by Bureau',
  'PAUSED->ACTIVE': 'Game resumed by Bureau',
  'ACTIVE->COMPLETED': 'Team completed the game',
  'ANY->RESET': 'Team reset for re-registration',
  'ANY->DISQUALIFIED': 'Team disqualified',
  'ANY->ABANDONED': 'Team abandoned',
}

export function canTransitionTeamStatus(current: TeamStatus, next: TeamStatus): boolean {
  if (current === next) return true
  return TEAM_TRANSITIONS[current]?.includes(next) ?? false
}

export function getValidTransitions(current: TeamStatus): TeamStatus[] {
  return [...(TEAM_TRANSITIONS[current] ?? [])]
}

export function getTransitionKey(current: TeamStatus, next: TeamStatus): string {
  return `${current}->${next}`
}

export function getTransitionDescription(current: TeamStatus, next: TeamStatus): string {
  const key = getTransitionKey(current, next)
  return TEAM_TRANSITION_LABELS[key] ?? TEAM_TRANSITION_LABELS['ANY->' + next] ?? `${current} → ${next}`
}

export const TEAM_STATUS_ORDER: TeamStatus[] = [
  'REGISTERED',
  'FORMING',
  'READY',
  'WAITING',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'DISQUALIFIED',
  'ABANDONED',
  'RESET',
]

/**
 * Translate the database's team status into the coarser `GameStatus` the
 * player UI speaks.
 *
 * The player screens used to be handed the raw database status through an
 * `as GameStatus` cast. The two vocabularies are not the same — the database
 * says ACTIVE and COMPLETED, the UI switches on RUNNING and ENDED — so every
 * live status fell through to its `default` branch and rendered "Unknown", and
 * the "no active lead" branch could never be reached. A cast hides exactly the
 * mismatch it creates, so the translation is written down here instead.
 */
export function toGameStatus(status: string | null | undefined): GameStatus {
  switch (status) {
    case 'ACTIVE':
      return 'RUNNING'
    case 'PAUSED':
      return 'PAUSED'
    case 'COMPLETED':
    case 'DISQUALIFIED':
    case 'ABANDONED':
      return 'ENDED'
    case 'REGISTERED':
    case 'FORMING':
    case 'READY':
    case 'WAITING':
    case 'RESET':
      return 'NOT_STARTED'
    default:
      return 'NOT_STARTED'
  }
}
