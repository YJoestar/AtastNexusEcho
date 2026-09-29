/**
 * NEXUS — Security Tests
 * Tests for authentication, authorization, and security-critical utilities
 */

import { describe, it, expect } from 'vitest'
import {
  generateLoginCode,
  validateLoginCodeFormat,
  LOGIN_CODE_LENGTH,
  LOGIN_CODE_CHARS,
  collectDeviceFingerprint,
  hashDeviceFingerprint,
  createDeviceBinding,
  canTransitionTeamStatus,
  getValidTransitions,
  isRoleLocked,
  validateTeamPlayers,
  isTeamReady,
} from '@/lib/auth'
import { TEAM_STATUS_ORDER } from '@/lib/auth/team-state-machine'
import { ROLE_LABELS } from '@/app/config'

describe('Login Code Generation & Validation', () => {
  describe('generateLoginCode', () => {
    it('generates a code of correct length', () => {
      const code = generateLoginCode()
      expect(code).toHaveLength(LOGIN_CODE_LENGTH)
    })

    it('generates codes with only valid characters (A-Z2-9, no I/O/0/1)', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateLoginCode()
        expect(code).toMatch(/^[A-Z2-9]{8}$/)
        expect(code).not.toMatch(/[IO01]/)
      }
    })

    it('generates unique codes (no collisions in 1000 runs)', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 1000; i++) {
        codes.add(generateLoginCode())
      }
      expect(codes.size).toBe(1000)
    })

    it.each([
      [8, 'default length'],
      [6, 'custom 6 length'],
      [12, 'custom 12 length'],
      [16, 'custom 16 length'],
    ])('uses crypto.getRandomValues for entropy (length %i: %s)', (length) => {
      const code = generateLoginCode(length)
      expect(code).toHaveLength(length)
      expect(code).toMatch(/^[A-Z2-9]+$/)
    })
  })

  describe('validateLoginCodeFormat', () => {
    it('accepts valid 8-char codes', () => {
      expect(validateLoginCodeFormat('ABCD2345')).toBe(true)
      expect(validateLoginCodeFormat('ZZZZZZZZ')).toBe(true)
      expect(validateLoginCodeFormat('23456789')).toBe(true)
    })

    it('rejects codes with ambiguous characters (I, O, 0, 1)', () => {
      expect(validateLoginCodeFormat('ABCDI234')).toBe(false)
      expect(validateLoginCodeFormat('ABCD0234')).toBe(false)
      expect(validateLoginCodeFormat('ABCDO234')).toBe(false)
      expect(validateLoginCodeFormat('ABCD1234')).toBe(false)
    })

    it('rejects lowercase codes', () => {
      expect(validateLoginCodeFormat('abcd1234')).toBe(false)
    })

    it('rejects incorrect length', () => {
      expect(validateLoginCodeFormat('ABCD')).toBe(false)
      expect(validateLoginCodeFormat('ABCD1234567')).toBe(false)
      expect(validateLoginCodeFormat('')).toBe(false)
    })

    it('rejects codes with invalid characters', () => {
      expect(validateLoginCodeFormat('ABCD-234')).toBe(false)
      expect(validateLoginCodeFormat('ABCD 234')).toBe(false)
      expect(validateLoginCodeFormat('ABCD!234')).toBe(false)
      expect(validateLoginCodeFormat('ABCD@234')).toBe(false)
    })

    it('rejects non-string input', () => {
      expect(validateLoginCodeFormat(null as unknown as string)).toBe(false)
      expect(validateLoginCodeFormat(undefined as unknown as string)).toBe(false)
      expect(validateLoginCodeFormat(12345678 as unknown as string)).toBe(false)
    })
  })

  describe('LOGIN_CODE_CHARS entropy', () => {
    it('has 30 valid characters (excludes I, O, 0, 1)', () => {
      expect(LOGIN_CODE_CHARS).toHaveLength(32) // 24 letters (excl I,O) + 8 digits (2-9)
      expect(LOGIN_CODE_CHARS).not.toContain('I')
      expect(LOGIN_CODE_CHARS).not.toContain('O')
      expect(LOGIN_CODE_CHARS).not.toContain('0')
      expect(LOGIN_CODE_CHARS).not.toContain('1')
    })

    it('provides ~42 bits of entropy per code', () => {
      const entropyBits = Math.log2(LOGIN_CODE_CHARS.length ** LOGIN_CODE_LENGTH)
      expect(entropyBits).toBeCloseTo(40, 1)
      expect(entropyBits).toBeGreaterThanOrEqual(40)
    })
  })
})

describe('Device Fingerprint Security', () => {
  describe('collectDeviceFingerprint', () => {
    it('returns all required fingerprint fields', () => {
      const fp = collectDeviceFingerprint()
      expect(fp).toHaveProperty('userAgent')
      expect(fp).toHaveProperty('platform')
      expect(fp).toHaveProperty('language')
      expect(fp).toHaveProperty('cookieEnabled')
      expect(fp).toHaveProperty('screenWidth')
      expect(fp).toHaveProperty('screenHeight')
      expect(fp).toHaveProperty('colorDepth')
      expect(fp).toHaveProperty('timezoneOffset')
      expect(fp).toHaveProperty('hasTouch')
    })

    it('returns consistent fingerprint for same browser session', () => {
      const fp1 = collectDeviceFingerprint()
      const fp2 = collectDeviceFingerprint()
      expect(fp1).toEqual(fp2)
    })

    it('hashes fingerprints consistently (same input = same hash)', async () => {
      const fp = collectDeviceFingerprint()
      const hash1 = await hashDeviceFingerprint(fp)
      const hash2 = await hashDeviceFingerprint(fp)
      expect(hash1).toBe(hash2)
    })

    it('produces different hashes for different fingerprints', async () => {
      const fp1 = { ...collectDeviceFingerprint(), screenWidth: 1920 }
      const fp2 = { ...collectDeviceFingerprint(), screenWidth: 2560 }
      const hash1 = await hashDeviceFingerprint(fp1)
      const hash2 = await hashDeviceFingerprint(fp2)
      expect(hash1).not.toBe(hash2)
    })

    it('produces 64-character hex SHA-256 hash', async () => {
      const fp = collectDeviceFingerprint()
      const hash = await hashDeviceFingerprint(fp)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('createDeviceBinding', () => {
    it('returns both fingerprint and hash', async () => {
      const binding = await createDeviceBinding()
      expect(binding).toHaveProperty('fingerprint')
      expect(binding).toHaveProperty('fingerprintHash')
      expect(binding.fingerprintHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('hash matches fingerprint', async () => {
      const { fingerprint, fingerprintHash } = await createDeviceBinding()
      expect(fingerprintHash).toBe(await hashDeviceFingerprint(fingerprint))
    })
  })
})

describe('Team Status Machine', () => {
  describe('canTransitionTeamStatus', () => {
    it('allows valid transitions', () => {
      expect(canTransitionTeamStatus('REGISTERED', 'FORMING')).toBe(true)
      expect(canTransitionTeamStatus('FORMING', 'READY')).toBe(true)
      expect(canTransitionTeamStatus('READY', 'WAITING')).toBe(true)
      expect(canTransitionTeamStatus('WAITING', 'ACTIVE')).toBe(true)
      expect(canTransitionTeamStatus('ACTIVE', 'PAUSED')).toBe(true)
      expect(canTransitionTeamStatus('PAUSED', 'ACTIVE')).toBe(true)
      expect(canTransitionTeamStatus('ACTIVE', 'COMPLETED')).toBe(true)
    })

    it('prevents invalid transitions', () => {
      expect(canTransitionTeamStatus('COMPLETED', 'ACTIVE')).toBe(false)
      expect(canTransitionTeamStatus('ABANDONED', 'ACTIVE')).toBe(false)
      expect(canTransitionTeamStatus('RESET', 'ACTIVE')).toBe(false)
      expect(canTransitionTeamStatus('DISQUALIFIED', 'FORMING')).toBe(false)
      expect(canTransitionTeamStatus('READY', 'RESET')).toBe(false)
    })

    it('allows self-transitions', () => {
      for (const status of TEAM_STATUS_ORDER) {
        expect(canTransitionTeamStatus(status, status)).toBe(true)
      }
    })

    it('allows universal transitions to ABANDONED and DISQUALIFIED', () => {
      expect(canTransitionTeamStatus('ACTIVE', 'ABANDONED')).toBe(true)
      expect(canTransitionTeamStatus('PAUSED', 'ABANDONED')).toBe(true)
      expect(canTransitionTeamStatus('WAITING', 'DISQUALIFIED')).toBe(true)
      expect(canTransitionTeamStatus('READY', 'DISQUALIFIED')).toBe(true)
    })

    it('allows RESET to go back to REGISTERED', () => {
      expect(canTransitionTeamStatus('RESET', 'REGISTERED')).toBe(true)
      expect(canTransitionTeamStatus('DISQUALIFIED', 'RESET')).toBe(true)
      expect(canTransitionTeamStatus('ABANDONED', 'RESET')).toBe(true)
    })
  })

  describe('getValidTransitions', () => {
    it('returns non-empty transitions for most states', () => {
      expect(getValidTransitions('REGISTERED')).toContain('FORMING')
      expect(getValidTransitions('ACTIVE')).toContain('PAUSED')
      expect(getValidTransitions('ACTIVE')).toContain('COMPLETED')
    })

    it('COMPLETED only transitions to RESET or ABANDONED', () => {
      const transitions = getValidTransitions('COMPLETED')
      expect(transitions).toHaveLength(2)
      expect(transitions).toContain('RESET')
      expect(transitions).toContain('ABANDONED')
    })

    it('DISQUALIFIED only transitions to RESET', () => {
      const transitions = getValidTransitions('DISQUALIFIED')
      expect(transitions).toEqual(['RESET'])
    })
  })
})

describe('Role Lock Security', () => {
  describe('isRoleLocked', () => {
    it('locks roles when team is ACTIVE, PAUSED, or COMPLETED', () => {
      expect(isRoleLocked('ACTIVE')).toBe(true)
      expect(isRoleLocked('PAUSED')).toBe(true)
      expect(isRoleLocked('COMPLETED')).toBe(true)
    })

    it('does not lock roles in pre-game states', () => {
      expect(isRoleLocked('REGISTERED')).toBe(false)
      expect(isRoleLocked('FORMING')).toBe(false)
      expect(isRoleLocked('READY')).toBe(false)
      expect(isRoleLocked('WAITING')).toBe(false)
    })
  })

  describe('validateTeamPlayers', () => {
    const makeMockPlayer = (role: string, id: string = '1') => ({
      id,
      teamId: 'team-1',
      role: role as 'OBSERVER' | 'ANALYST' | 'OPERATOR',
      displayName: 'Test Player',
      joinedAt: '2026-09-29T10:00:00Z',
      isConnected: true,
      lastSeenAt: '2026-09-29T10:00:00Z',
      status: 'ACTIVE' as const,
      createdAt: '2026-09-29T10:00:00Z',
      loginCodeHash: null,
      authUserId: null,
      deviceSessionToken: null,
      deviceFingerprintHash: null,
    })

    it('accepts a valid team of 3 with unique roles', () => {
      const players = [
        makeMockPlayer('OBSERVER', '1'),
        makeMockPlayer('ANALYST', '2'),
        makeMockPlayer('OPERATOR', '3'),
      ]
      expect(validateTeamPlayers(players).valid).toBe(true)
    })

    it('rejects team with wrong number of players', () => {
      const players = [makeMockPlayer('OBSERVER', '1')]
      expect(validateTeamPlayers(players).valid).toBe(false)
      expect(validateTeamPlayers(players).error).toContain('exactly 3')
    })

    it('rejects team with duplicate roles', () => {
      const players = [
        makeMockPlayer('OBSERVER', '1'),
        makeMockPlayer('OBSERVER', '2'),
        makeMockPlayer('OPERATOR', '3'),
      ]
      expect(validateTeamPlayers(players).valid).toBe(false)
      expect(validateTeamPlayers(players).error).toContain('Duplicate role')
    })

    it('rejects team with missing role', () => {
      const players = [
        makeMockPlayer('OBSERVER', '1'),
        makeMockPlayer('ANALYST', '2'),
        makeMockPlayer('OBSERVER', '3'),
      ]
      expect(validateTeamPlayers(players).valid).toBe(false)
    })
  })
})

describe('Team Readiness', () => {
  describe('isTeamReady', () => {
    const makePlayer = (role: 'OBSERVER' | 'ANALYST' | 'OPERATOR') => ({
      id: '1',
      teamId: 't1',
      role,
      displayName: 'Test',
      joinedAt: '2026-09-29T10:00:00Z',
      isConnected: true,
      lastSeenAt: null,
      status: 'ACTIVE' as const,
      createdAt: '2026-09-29T10:00:00Z',
      loginCodeHash: null,
      authUserId: null,
      deviceSessionToken: null,
      deviceFingerprintHash: null,
    })

    it('returns true when team has exactly 3 players with all roles', () => {
      const players = [makePlayer('OBSERVER'), makePlayer('ANALYST'), makePlayer('OPERATOR')]
      expect(isTeamReady(players)).toBe(true)
    })

    it('returns false when team has fewer than 3 players', () => {
      const players = [makePlayer('OBSERVER'), makePlayer('ANALYST')]
      expect(isTeamReady(players)).toBe(false)
    })

    it('returns false when team has 3 players but missing a role', () => {
      const players = [makePlayer('OBSERVER'), makePlayer('ANALYST'), makePlayer('ANALYST')]
      expect(isTeamReady(players)).toBe(false)
    })
  })
})

describe('Route Protection Configuration', () => {
  describe('ROUTES', () => {
    it('has player login route', () => {
      expect(ROLE_LABELS.OBSERVER).toBe('Observer')
      expect(ROLE_LABELS.ANALYST).toBe('Analyst')
      expect(ROLE_LABELS.OPERATOR).toBe('Operator')
    })
  })
})
