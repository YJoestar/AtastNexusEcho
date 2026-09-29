import type { TeamStatus } from '@/types/domain'

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
