/**
 * NEXUS — Logic Code tests
 *
 * A Logic Code is the only thing standing between a player and the game, so
 * the rules are tested where they are defined, not where they are used:
 *
 *   - the alphabet and the two code lengths (player 8, team 6)
 *   - the four forbidden characters, I O 0 1, in every position
 *   - the codes named in the specification: valid ones accepted, invalid ones
 *     rejected
 *   - a large batch of generated codes: length, case, alphabet, uniqueness,
 *     and that the generator cannot emit a forbidden character
 *   - input normalisation, so a pasted "b9e8-ba7w" still reaches the server
 *     as B9E8BA7W
 *
 * The edge function and SQL carry the same rule; supabase/tests/ logic is
 * asserted in the database self-test.
 */

import { describe, it, expect } from 'vitest'
import {
  LOGIC_CODE_ALPHABET,
  FORBIDDEN_LOGIC_CODE_CHARS,
  LOGIN_CODE_LENGTH,
  LOGIN_CODE_CHARS,
  TEAM_CODE_LENGTH,
  containsForbiddenLogicChars,
  containsUnknownLogicChars,
  describeInvalidLogicCode,
  formatLogicCodeInput,
  generateLogicCode,
  generateLoginCode,
  isValidLogicCode,
  isValidLoginCode,
  isValidTeamCode,
  validateLoginCodeFormat,
} from '@/lib/auth'

describe('Logic code alphabet', () => {
  it('is the 24 letters without I and O, plus the digits 2-9', () => {
    expect(LOGIC_CODE_ALPHABET).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
    expect(LOGIC_CODE_ALPHABET).toHaveLength(32)
  })

  it('never contains a forbidden character', () => {
    for (const char of FORBIDDEN_LOGIC_CODE_CHARS) {
      expect(LOGIC_CODE_ALPHABET).not.toContain(char)
    }
    expect([...FORBIDDEN_LOGIC_CODE_CHARS].sort().join('')).toBe('01IO')
  })

  it('is the same string under the backwards-compatible name', () => {
    expect(LOGIN_CODE_CHARS).toBe(LOGIC_CODE_ALPHABET)
  })

  it('keeps the lengths the game already uses', () => {
    expect(LOGIN_CODE_LENGTH).toBe(8)
    expect(TEAM_CODE_LENGTH).toBe(6)
  })
})

describe('Valid codes are accepted', () => {
  it('accepts the specification examples at team-code length', () => {
    for (const code of ['A7K92P', 'M4X8QZ', 'Q2T6WB', '7F3RKT']) {
      expect(isValidTeamCode(code)).toBe(true)
      expect(isValidLogicCode(code, TEAM_CODE_LENGTH)).toBe(true)
    }
  })

  it('accepts the same alphabet at player-code length', () => {
    for (const code of ['A7K92PQW', 'M4X8QZ27', 'Q2T6WB9K', '7F3RKTXC']) {
      expect(isValidLoginCode(code)).toBe(true)
    }
  })

  it('accepts codes that use the whole alphabet', () => {
    expect(isValidLoginCode('ABCDEFGH')).toBe(true)
    expect(isValidLoginCode('JKLMNPQR')).toBe(true)
    expect(isValidLoginCode('STUVWXYZ')).toBe(true)
    expect(isValidLoginCode('23456789')).toBe(true)
    expect(isValidTeamCode('ABCDEF')).toBe(true)
  })
})

describe('Invalid codes are rejected', () => {
  it('rejects the specification examples', () => {
    for (const code of ['A1K92P', 'A0K92P', 'AIK92P', 'AOK92P']) {
      expect(isValidTeamCode(code)).toBe(false)
      expect(isValidLogicCode(code, TEAM_CODE_LENGTH)).toBe(false)
    }
  })

  it('rejects 31E3E5, the team code that exposed the generator bug', () => {
    expect(isValidTeamCode('31E3E5')).toBe(false)
  })

  it('rejects a forbidden character in any position', () => {
    for (const forbidden of ['I', 'O', '0', '1']) {
      for (let i = 0; i < LOGIN_CODE_LENGTH; i++) {
        const chars = 'ABCDEFGHJ'.split('')
        const code = [...chars.slice(0, i), forbidden, ...chars.slice(i)].join('')
        expect(isValidLoginCode(code)).toBe(false)
      }
    }
  })

  it('rejects the wrong length, lowercase, and punctuation', () => {
    expect(isValidLoginCode('B9E8BA7')).toBe(false)
    expect(isValidLoginCode('B9E8BA7WX')).toBe(false)
    expect(isValidLoginCode('b9e8ba7w')).toBe(false)
    expect(isValidLoginCode('B9E8 BA7W')).toBe(false)
    expect(isValidLoginCode('B9E8-BA7W')).toBe(false)
    expect(isValidLoginCode('B9E8BA7!')).toBe(false)
    expect(isValidLoginCode('')).toBe(false)
  })

  it('rejects values that are not strings', () => {
    expect(isValidLoginCode(null)).toBe(false)
    expect(isValidLoginCode(undefined)).toBe(false)
    expect(isValidLoginCode(12345678)).toBe(false)
    expect(isValidLoginCode(['B', '9'])).toBe(false)
  })

  it('keeps validateLoginCodeFormat in step with the new rule', () => {
    expect(validateLoginCodeFormat('B9E8BA7W')).toBe(true)
    expect(validateLoginCodeFormat('B9E8BA7I')).toBe(false)
  })
})

describe('Generation', () => {
  it('produces a large batch with the right length, case and alphabet', () => {
    const batchSize = 2000
    const seen = new Set<string>()

    for (let i = 0; i < batchSize; i++) {
      const code = generateLoginCode()

      expect(code).toHaveLength(LOGIN_CODE_LENGTH)
      expect(code).toBe(code.toUpperCase())
      expect(code).not.toMatch(/[IO01]/)
      for (const char of code) {
        expect(LOGIC_CODE_ALPHABET).toContain(char)
      }
      expect(isValidLoginCode(code)).toBe(true)

      // Collisions are astronomically unlikely but must be detectable.
      expect(seen.has(code)).toBe(false)
      seen.add(code)
    }

    expect(seen.size).toBe(batchSize)
  })

  it('uses every symbol of the alphabet across a batch', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      for (const char of generateLoginCode()) seen.add(char)
    }
    for (const symbol of LOGIC_CODE_ALPHABET) {
      expect([...seen]).toContain(symbol)
    }
    // 32 symbols over 4000 characters: astronomically unlikely to miss one.
    expect(seen.size).toBe(LOGIC_CODE_ALPHABET.length)
  })

  it('generates team codes at six characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateLogicCode(TEAM_CODE_LENGTH)
      expect(code).toHaveLength(TEAM_CODE_LENGTH)
      expect(isValidTeamCode(code)).toBe(true)
    }
  })

  it('carries enough entropy for the length it claims', () => {
    const bits = Math.log2(LOGIC_CODE_ALPHABET.length ** LOGIN_CODE_LENGTH)
    // 32^8 = 40 bits. The md5-derived generator it replaced could only ever
    // reach 18 symbols, so this is the check that the alphabet really widened.
    expect(bits).toBeGreaterThanOrEqual(40)
  })

  it('refuses a nonsensical length instead of returning a broken code', () => {
    expect(() => generateLogicCode(0)).toThrow()
    expect(() => generateLogicCode(-1)).toThrow()
    expect(() => generateLogicCode(1.5)).toThrow()
  })
})

describe('Input normalisation', () => {
  it('uppercases and strips separators from a pasted code', () => {
    expect(formatLogicCodeInput('b9e8 ba7w')).toBe('B9E8BA7W')
    expect(formatLogicCodeInput('B9E8-BA7W')).toBe('B9E8BA7W')
    expect(formatLogicCodeInput('  B9E8_BA7W  ')).toBe('B9E8BA7W')
  })

  it('drops forbidden characters rather than passing them to the server', () => {
    expect(formatLogicCodeInput('B9E8BA7I')).toBe('B9E8BA7')
    expect(formatLogicCodeInput('31E3E5')).toBe('3E3E5')
  })

  it('caps the input at the code length', () => {
    expect(formatLogicCodeInput('B9E8BA7WEXTRA')).toBe('B9E8BA7W')
    expect(formatLogicCodeInput('M4X8QZ9', TEAM_CODE_LENGTH)).toBe('M4X8QZ')
  })

  it('never returns a string the validator would reject', () => {
    const inputs = ['b9e8ba7w', 'B9E8 BA7W', 'B9E8BA7I', '31E3E5', '', '!!!!', 'IO01IO01']
    for (const input of inputs) {
      const formatted = formatLogicCodeInput(input)
      if (formatted.length === LOGIN_CODE_LENGTH) {
        expect(isValidLoginCode(formatted)).toBe(true)
      }
    }
  })

  it('detects the characters it had to drop', () => {
    expect(containsForbiddenLogicChars('B9E8BA7I')).toBe(true)
    expect(containsForbiddenLogicChars('b9e8ba7o')).toBe(true)
    expect(containsForbiddenLogicChars('B9E8BA7W')).toBe(false)
    expect(containsUnknownLogicChars('B9E8#A7W')).toBe(true)
    expect(containsUnknownLogicChars('B9E8-BA7W')).toBe(false)
  })
})

describe('Error message', () => {
  it('states the length, the alphabet and the banned characters once', () => {
    const message = describeInvalidLogicCode(LOGIN_CODE_LENGTH)
    expect(message).toContain('8 characters')
    expect(message).toContain('A-Z and 2-9')
    expect(message).toContain('I, O, 0 and 1 are not allowed')
  })

  it('describes a team code with its own length', () => {
    expect(describeInvalidLogicCode(TEAM_CODE_LENGTH)).toContain('6 characters')
  })
})
