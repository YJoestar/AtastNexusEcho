/**
 * NEXUS — Time Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  now,
  nowISO,
  parseISO,
  addMinutes,
  addHours,
  addDays,
  diffMinutes,
  diffSeconds,
  diffHours,
  formatDuration,
  formatMinutes,
  formatTimeRemaining,
  isExpired,
  isFuture,
  isPast,
  startOfDay,
  endOfDay,
  toISOString,
  fromUnixTimestamp,
  toUnixTimestamp,
} from '@/lib/time'

describe('Time Utilities', () => {
   const fixedDate = new Date('2026-09-29T12:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('now', () => {
    it('returns current time', () => {
      expect(now()).toEqual(fixedDate)
    })
  })

  describe('nowISO', () => {
    it('returns ISO string', () => {
      expect(nowISO()).toBe('2026-09-29T12:00:00.000Z')
    })
  })

  describe('parseISO', () => {
    it('parses valid ISO string', () => {
      const date = parseISO('2026-09-29T12:00:00.000Z')
      expect(date).toEqual(fixedDate)
    })

    it('throws on invalid string', () => {
      expect(() => parseISO('invalid')).toThrow()
    })
  })

  describe('addMinutes', () => {
    it('adds minutes correctly', () => {
      const result = addMinutes(fixedDate, 30)
      expect(result).toEqual(new Date('2026-09-29T12:30:00.000Z'))
    })
  })

  describe('addHours', () => {
    it('adds hours correctly', () => {
      const result = addHours(fixedDate, 2)
      expect(result).toEqual(new Date('2026-09-29T14:00:00.000Z'))
    })
  })

  describe('addDays', () => {
    it('adds days correctly', () => {
      const result = addDays(fixedDate, 1)
      expect(result).toEqual(new Date('2026-09-30T12:00:00.000Z'))
    })
  })

  describe('diffMinutes', () => {
    it('calculates difference in minutes', () => {
      const start = new Date('2026-09-29T11:30:00.000Z')
      expect(diffMinutes(start, fixedDate)).toBe(30)
    })
  })

  describe('diffSeconds', () => {
    it('calculates difference in seconds', () => {
      const start = new Date('2026-09-29T11:59:30.000Z')
      expect(diffSeconds(start, fixedDate)).toBe(30)
    })
  })

  describe('diffHours', () => {
    it('calculates difference in hours', () => {
      const start = new Date('2026-09-29T10:00:00.000Z')
      expect(diffHours(start, fixedDate)).toBe(2)
    })
  })

  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms')
    })

    it('formats seconds', () => {
      expect(formatDuration(5000)).toBe('5s')
    })

    it('formats minutes and seconds', () => {
      expect(formatDuration(90000)).toBe('1m 30s')
    })

    it('formats hours', () => {
      expect(formatDuration(3661000)).toBe('1h 1m')
    })
  })

  describe('formatMinutes', () => {
    it('formats minutes', () => {
      expect(formatMinutes(30)).toBe('30m')
      expect(formatMinutes(90)).toBe('1h 30m')
      expect(formatMinutes(150)).toBe('2h 30m')
    })
  })

  describe('formatTimeRemaining', () => {
    it('formats future time', () => {
      const future = new Date('2026-09-29T13:30:00.000Z')
      expect(formatTimeRemaining(future)).toBe('1h 30m')
    })

    it('returns EXPIRED for past time', () => {
      const past = new Date('2026-09-29T11:00:00.000Z')
      expect(formatTimeRemaining(past)).toBe('EXPIRED')
    })
  })

  describe('isExpired', () => {
    it('returns true for past time', () => {
      const past = new Date('2026-09-29T11:00:00.000Z')
      expect(isExpired(past)).toBe(true)
    })

    it('returns false for future time', () => {
      const future = new Date('2026-09-29T13:00:00.000Z')
      expect(isExpired(future)).toBe(false)
    })
  })

  describe('isFuture', () => {
    it('returns true for future date', () => {
      const future = new Date('2026-09-29T13:00:00.000Z')
      expect(isFuture(future)).toBe(true)
    })

    it('returns false for past date', () => {
      const past = new Date('2026-09-29T11:00:00.000Z')
      expect(isFuture(past)).toBe(false)
    })
  })

  describe('isPast', () => {
    it('returns true for past date', () => {
      const past = new Date('2026-09-29T11:00:00.000Z')
      expect(isPast(past)).toBe(true)
    })

    it('returns false for future date', () => {
      const future = new Date('2026-09-29T13:00:00.000Z')
      expect(isPast(future)).toBe(false)
    })
  })

  describe('startOfDay', () => {
    it('returns start of day', () => {
      const result = startOfDay(fixedDate)
      expect(result).toEqual(new Date('2026-09-29T00:00:00.000Z'))
    })
  })

  describe('endOfDay', () => {
    it('returns end of day', () => {
      const result = endOfDay(fixedDate)
      expect(result).toEqual(new Date('2026-09-29T23:59:59.999Z'))
    })
  })

  describe('toISOString', () => {
    it('converts date to ISO string', () => {
      expect(toISOString(fixedDate)).toBe('2026-09-29T12:00:00.000Z')
    })
  })

  describe('fromUnixTimestamp', () => {
    it('converts unix timestamp to date', () => {
      const date = fromUnixTimestamp(1790745600) // 2026-09-29T12:00:00Z
      expect(date.getTime()).toBe(1790745600000)
    })
  })

  describe('toUnixTimestamp', () => {
    it('converts date to unix timestamp', () => {
      expect(toUnixTimestamp(fixedDate)).toBe(1790683200)
    })
  })
})