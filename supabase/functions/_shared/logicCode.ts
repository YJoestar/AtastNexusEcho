/**
 * NEXUS — Logic Code (edge functions)
 *
 * The server-side half of the single source of truth. Keep identical to
 * src/lib/auth/code-generation.ts and to nexus_code_alphabet() in SQL.
 *
 * A Logic Code is 8 characters for a player and 6 for a team, drawn from
 * A-Z and 2-9 with I, O, 0 and 1 removed.
 *
 * Before this existed, player-login validated with /^[A-Z2-9]{8}$/ — a range
 * that silently allows I and O. That is a looser rule than the generator used,
 * so a code the game would never issue passed server-side validation and then
 * failed as an unknown code. Every endpoint now uses this validator instead.
 */

export const LOGIC_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const FORBIDDEN_LOGIC_CODE_CHARS = 'IO01'
export const LOGIN_CODE_LENGTH = 8
export const TEAM_CODE_LENGTH = 6

const LOGIC_CODE_PATTERN = new RegExp(`^[${LOGIC_CODE_ALPHABET}]+$`)

export function isValidLogicCode(code: unknown, length: number): boolean {
  if (typeof code !== 'string' || code.length !== length) return false
  return LOGIC_CODE_PATTERN.test(code)
}

export function isValidLoginCode(code: unknown): boolean {
  return isValidLogicCode(code, LOGIN_CODE_LENGTH)
}

export function isValidTeamCode(code: unknown): boolean {
  return isValidLogicCode(code, TEAM_CODE_LENGTH)
}

/** Normalise a submitted code without ever widening what is accepted. */
export function normalizeLoginCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let out = ''
  for (const char of raw.toUpperCase().replace(/[\s\-_.]/g, '')) {
    if (LOGIC_CODE_ALPHABET.includes(char)) out += char
    if (out.length === LOGIN_CODE_LENGTH) break
  }
  return out
}
