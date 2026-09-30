/**
 * NEXUS — Logic Code
 *
 * THE single source of truth for every code the game hands out or accepts.
 *
 * A Logic Code is a short, human-transcribed credential. The alphabet is
 * deliberately Crockford-style: letters A-Z and digits 2-9, with the four
 * visually ambiguous characters removed.
 *
 *     I  O  0  1   are FORBIDDEN everywhere
 *
 * They are excluded because a code read aloud at a check-in desk ("is that a
 * one or an I?") or copied off a phone camera is the single most likely way a
 * player fails to enter the game. Nothing in this project may invent a
 * different alphabet, a different length, or a looser validator:
 *
 *   - generation  -> generateLogicCode()
 *   - validation  -> isValidLogicCode() / isValidLoginCode() / isValidTeamCode()
 *   - input       -> formatLogicCodeInput() (uppercase, separator-free)
 *   - SQL side    -> nexus_code_alphabet() / nexus_is_valid_logic_code() in
 *                    supabase/migrations, kept identical to this file
 *
 * Lengths are per-credential and never change: a player Logic Code is 8
 * characters (that is what is stored, hashed, and what player-login accepts),
 * a team code is 6 (that is what teams.code is and what the leaderboard shows).
 */

export const LOGIC_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** The characters that must never appear in a generated or accepted code. */
export const FORBIDDEN_LOGIC_CODE_CHARS = 'IO01'

/** Characters a player code is built from. 8 is the game's intended length. */
export const LOGIN_CODE_LENGTH = 8

/** teams.code is CHAR(6); team codes keep their existing length. */
export const TEAM_CODE_LENGTH = 6

/** Backwards-compatible alias — same string, one definition. */
export const LOGIN_CODE_CHARS = LOGIC_CODE_ALPHABET as typeof LOGIC_CODE_ALPHABET

/** Separators people paste in from a printed sheet or a screenshot. */
const CODE_SEPARATORS = /[\s\-_.]/

const LOGIC_CODE_PATTERN = new RegExp(
  `^[${LOGIC_CODE_ALPHABET}]+$`,
)

const FORBIDDEN_PATTERN = new RegExp(`[${FORBIDDEN_LOGIC_CODE_CHARS}]`)

function isSeparator(char: string): boolean {
  return CODE_SEPARATORS.test(char)
}

/** True when `code` is exactly `length` characters of the alphabet. */
export function isValidLogicCode(code: unknown, length: number): boolean {
  if (typeof code !== 'string' || code.length !== length) return false
  return LOGIC_CODE_PATTERN.test(code)
}

/** A player Logic Code: exactly LOGIN_CODE_LENGTH characters. */
export function isValidLoginCode(code: unknown): boolean {
  return isValidLogicCode(code, LOGIN_CODE_LENGTH)
}

/** A team code: exactly TEAM_CODE_LENGTH characters. */
export function isValidTeamCode(code: unknown): boolean {
  return isValidLogicCode(code, TEAM_CODE_LENGTH)
}

/** Kept for existing callers. Same rule as isValidLoginCode(). */
export function validateLoginCodeFormat(code: string): boolean {
  return isValidLoginCode(code)
}

/**
 * Normalise what a player typed: uppercase, drop the separators people paste
 * ("B9E8 BA7W", "B9E8-BA7W") and cap the length. Characters outside the
 * alphabet are dropped too — see containsForbiddenLogicChars() to tell the
 * player why their code appears to be missing characters.
 */
export function formatLogicCodeInput(raw: string, length: number = LOGIN_CODE_LENGTH): string {
  if (typeof raw !== 'string') return ''
  const strippedSeparators = raw.replace(CODE_SEPARATORS, '')
  let out = ''
  for (const char of strippedSeparators.toUpperCase()) {
    if (LOGIC_CODE_ALPHABET.includes(char)) out += char
    if (out.length === length) break
  }
  return out
}

/** True when the raw input contained I, O, 0 or 1 (so we can explain the drop). */
export function containsForbiddenLogicChars(raw: string): boolean {
  if (typeof raw !== 'string') return false
  return FORBIDDEN_PATTERN.test(raw.toUpperCase())
}

/** True when the raw input had characters the alphabet does not contain. */
export function containsUnknownLogicChars(raw: string): boolean {
  if (typeof raw !== 'string' || raw === '') return false
  return [...raw.toUpperCase()].some(
    char => !isSeparator(char) && !LOGIC_CODE_ALPHABET.includes(char),
  )
}

/** The one true error message, so the frontend and tests cannot disagree. */
export function describeInvalidLogicCode(length: number = LOGIN_CODE_LENGTH): string {
  return (
    `Invalid logic code format. Use ${length} characters: A-Z and 2-9. ` +
    `I, O, 0 and 1 are not allowed.`
  )
}

/**
 * Generate a Logic Code of `length` characters from the alphabet, using the
 * platform CSPRNG. `chars[i] % 32` is unbiased because the alphabet has 32
 * symbols and a byte is 256 = 8 x 32.
 */
export function generateLogicCode(length: number = LOGIN_CODE_LENGTH): string {
  if (!Number.isInteger(length) || length < 1) {
    throw new Error(`Logic code length must be a positive integer, got ${length}`)
  }
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += LOGIC_CODE_ALPHABET[bytes[i] % LOGIC_CODE_ALPHABET.length]
  }
  return result
}

/** Kept for existing callers. */
export function generateLoginCode(length: number = LOGIN_CODE_LENGTH): string {
  return generateLogicCode(length)
}
