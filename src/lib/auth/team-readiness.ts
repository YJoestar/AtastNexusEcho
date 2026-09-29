import type { Role, Player } from '@/types/domain'
import { ROLES } from '@/types/domain'

export function hasDuplicateRole(players: Player[], role: Role): boolean {
  return players.some(p => p.role === role)
}

export function getMissingRoles(players: Player[]): Role[] {
  const filled = new Set(players.map(p => p.role))
  return ROLES.filter(role => !filled.has(role))
}

export function isTeamReady(players: Player[]): boolean {
  if (players.length !== 3) return false
  const roles = players.map(p => p.role)
  return ROLES.every(role => roles.includes(role))
}

export function getPlayerByRole(players: Player[], role: Role): Player | undefined {
  return players.find(p => p.role === role)
}

export function canAssignRole(
  players: Player[],
  newRole: Role,
  options: { reconfigure?: boolean } = {}
): boolean {
  if (options.reconfigure) return true
  return !hasDuplicateRole(players, newRole)
}

export function isRoleLocked(teamStatus: string): boolean {
  return teamStatus === 'ACTIVE' || teamStatus === 'PAUSED' || teamStatus === 'COMPLETED'
}

export function validateTeamPlayers(players: Player[]): { valid: boolean; error?: string } {
  if (players.length !== 3) {
    return { valid: false, error: `Team must have exactly 3 players, has ${players.length}` }
  }

  const roles = players.map(p => p.role)
  for (const role of ROLES) {
    const count = roles.filter(r => r === role).length
    if (count === 0) {
      return { valid: false, error: `Missing player with role: ${role}` }
    }
    if (count > 1) {
      return { valid: false, error: `Duplicate role: ${role}` }
    }
  }

  return { valid: true }
}
