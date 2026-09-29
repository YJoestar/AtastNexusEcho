/**
 * NEXUS — Utility Tests
 * Core utility function tests
 */

import { describe, it, expect } from 'vitest'
import {
  cn,
  generateCode,
  generateId,
  slugify,
  truncate,
  clamp,
  lerp,
  shuffleArray,
  uniqueArray,
  groupBy,
  sortBy,
  deepClone,
  isEqual,
  omit,
  pick,
  parseQueryString,
  buildQueryString,
  escapeRegExp,
  capitalizeFirst,
  titleCase,
  kebabToPascal,
  pascalToKebab,
  bytesToSize,
  getInitials,
  hashString,
} from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (classnames)', () => {
    it('combines class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c')
    })

    it('handles conditional classes', () => {
      const isActive = true
      const isHidden = false
      expect(cn('base', isActive && 'active', isHidden && 'hidden')).toBe('base active')
    })

    it('merges tailwind classes correctly', () => {
      expect(cn('p-2 p-4')).toBe('p-4')
      expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500')
    })
  })

  describe('generateCode', () => {
    it('generates code of correct length', () => {
      expect(generateCode(6)).toHaveLength(6)
      expect(generateCode(8)).toHaveLength(8)
    })

    it('uses only valid characters', () => {
      const code = generateCode(20)
      expect(code).toMatch(/^[A-Z0-9]+$/)
      expect(code).not.toMatch(/[IO10]/)
    })
  })

  describe('generateId', () => {
    it('generates valid UUID', () => {
      const id = generateId()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('generates unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('slugify', () => {
    it('converts to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('removes special characters', () => {
      expect(slugify('Hello @ World!')).toBe('hello-world')
    })

    it('handles multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world')
    })

    it('trims leading/trailing dashes', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world')
    })
  })

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello W…')
    })

    it('returns original if shorter', () => {
      expect(truncate('Hi', 10)).toBe('Hi')
    })

    it('uses custom suffix', () => {
      expect(truncate('Hello World', 8, '...')).toBe('Hello...')
    })
  })

  describe('clamp', () => {
    it('clamps to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('clamps to max', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('returns value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })
  })

  describe('lerp', () => {
    it('interpolates correctly', () => {
      expect(lerp(0, 10, 0)).toBe(0)
      expect(lerp(0, 10, 0.5)).toBe(5)
      expect(lerp(0, 10, 1)).toBe(10)
    })
  })

  describe('shuffleArray', () => {
    it('returns same length', () => {
      const arr = [1, 2, 3, 4, 5]
      expect(shuffleArray(arr)).toHaveLength(5)
    })

    it('contains same elements', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(arr)
      expect(shuffled.sort()).toEqual(arr.sort())
    })

    it('does not mutate original', () => {
      const arr = [1, 2, 3, 4, 5]
      const original = [...arr]
      shuffleArray(arr)
      expect(arr).toEqual(original)
    })
  })

  describe('uniqueArray', () => {
    it('removes duplicates', () => {
      expect(uniqueArray([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
    })

    it('preserves order of first occurrence', () => {
      expect(uniqueArray(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
    })
  })

  describe('groupBy', () => {
    it('groups by key function', () => {
      const arr = [{ type: 'a', v: 1 }, { type: 'b', v: 2 }, { type: 'a', v: 3 }]
      const grouped = groupBy(arr, item => item.type)
      expect(grouped.a).toHaveLength(2)
      expect(grouped.b).toHaveLength(1)
    })
  })

  describe('sortBy', () => {
    it('sorts ascending by default', () => {
      expect(sortBy([3, 1, 2], x => x)).toEqual([1, 2, 3])
    })

    it('sorts descending when specified', () => {
      expect(sortBy([3, 1, 2], x => x, 'desc')).toEqual([3, 2, 1])
    })

    it('sorts by object property', () => {
      const arr = [{ v: 3 }, { v: 1 }, { v: 2 }]
      expect(sortBy(arr, x => x.v)).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }])
    })
  })

  describe('deepClone', () => {
    it('creates deep copy', () => {
      const obj = { a: 1, b: { c: 2 } }
      const cloned = deepClone(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.b).not.toBe(obj.b)
    })
  })

  describe('isEqual', () => {
    it('returns true for equal objects', () => {
      expect(isEqual({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toBe(true)
    })

    it('returns false for different objects', () => {
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false)
    })
  })

  describe('omit', () => {
    it('removes specified keys', () => {
      expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 })
    })
  })

  describe('pick', () => {
    it('keeps only specified keys', () => {
      expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 })
    })
  })

  describe('parseQueryString', () => {
    it('parses query string', () => {
      expect(parseQueryString('a=1&b=2')).toEqual({ a: '1', b: '2' })
    })

    it('handles empty string', () => {
      expect(parseQueryString('')).toEqual({})
    })
  })

  describe('buildQueryString', () => {
    it('builds query string', () => {
      expect(buildQueryString({ a: 1, b: 'hello' })).toBe('a=1&b=hello')
    })

    it('omits undefined and null', () => {
      expect(buildQueryString({ a: 1, b: undefined, c: null })).toBe('a=1')
    })
  })

  describe('escapeRegExp', () => {
    it('escapes special characters', () => {
      expect(escapeRegExp('hello.world')).toBe('hello\\.world')
      expect(escapeRegExp('a*b?c')).toBe('a\\*b\\?c')
    })
  })

  describe('capitalizeFirst', () => {
    it('capitalizes first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello')
      expect(capitalizeFirst('HELLO')).toBe('Hello')
    })
  })

  describe('titleCase', () => {
    it('capitalizes each word', () => {
      expect(titleCase('hello world')).toBe('Hello World')
      expect(titleCase('THE QUICK BROWN FOX')).toBe('The Quick Brown Fox')
    })
  })

  describe('kebabToPascal', () => {
    it('converts kebab-case to PascalCase', () => {
      expect(kebabToPascal('hello-world')).toBe('HelloWorld')
      expect(kebabToPascal('my-component-name')).toBe('MyComponentName')
    })
  })

  describe('pascalToKebab', () => {
    it('converts PascalCase to kebab-case', () => {
      expect(pascalToKebab('HelloWorld')).toBe('hello-world')
      expect(pascalToKebab('MyComponentName')).toBe('my-component-name')
    })
  })

  describe('bytesToSize', () => {
    it('formats bytes correctly', () => {
      expect(bytesToSize(0)).toBe('0 Bytes')
      expect(bytesToSize(1024)).toBe('1 KB')
      expect(bytesToSize(1024 * 1024)).toBe('1 MB')
      expect(bytesToSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('getInitials', () => {
    it('extracts initials', () => {
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('John')).toBe('J')
      expect(getInitials('John Michael Doe')).toBe('JM')
    })
  })

  describe('hashString', () => {
    it('returns consistent hash', () => {
      expect(hashString('hello')).toBe(hashString('hello'))
    })

    it('returns positive number', () => {
      expect(hashString('test')).toBeGreaterThanOrEqual(0)
    })
  })
})