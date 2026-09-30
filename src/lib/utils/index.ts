/**
 * NEXUS — Utility Functions
 * Common helpers used across the application
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { generateLogicCode, LOGIN_CODE_LENGTH } from '@/lib/auth/code-generation'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Kept for existing callers. Delegates to the Logic Code source of truth so
 * there is exactly one alphabet and one CSPRNG in the app.
 */
export function generateCode(length: number = 6): string {
  return generateLogicCode(length || LOGIN_CODE_LENGTH)
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, maxLength: number, suffix: string = '…'): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}

export function formatNumber(num: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-US', options).format(num)
}

export function formatPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)]
}

export function groupBy<T, K extends string | number>(array: T[], key: (item: T) => K): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const k = key(item)
    if (!groups[k]) groups[k] = []
    groups[k].push(item)
    return groups
  }, {} as Record<K, T[]>)
}

export function sortBy<T>(array: T[], key: (item: T) => number | string, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = key(a)
    const bVal = key(b)
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function isEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

export function retry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { attempts = 3, delay = 1000, backoff = 2 } = options
  return fn().catch(err => {
    if (attempts <= 1) throw err
    return new Promise(resolve => setTimeout(resolve, delay)).then(() =>
      retry(fn, { attempts: attempts - 1, delay: delay * backoff, backoff })
    )
  })
}

export function createEventEmitter<T extends Record<string, unknown[]>>() {
  const listeners: { [K in keyof T]?: ((...args: T[K]) => void)[] } = {}

  return {
    on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): () => void {
      if (!listeners[event]) listeners[event] = []
      listeners[event]!.push(listener)
      return () => this.off(event, listener)
    },
    off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void {
      if (!listeners[event]) return
      const index = listeners[event]!.indexOf(listener)
      if (index !== -1) listeners[event]!.splice(index, 1)
    },
    emit<K extends keyof T>(event: K, ...args: T[K]): void {
      if (!listeners[event]) return
      for (const listener of listeners[event]!) {
        listener(...args)
      }
    },
  }
}

export function parseQueryString(query: string): Record<string, string> {
  const params = new URLSearchParams(query)
  const result: Record<string, string> = {}
  for (const [key, value] of params.entries()) {
    result[key] = value
  }
  return result
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value))
    }
  }
  return searchParams.toString()
}

export function sanitizeHtml(html: string): string {
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function capitalizeFirst(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
}

export function titleCase(string: string): string {
  return string
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ')
}

export function kebabToPascal(kebab: string): string {
  return kebab
    .split('-')
    .map(word => capitalizeFirst(word))
    .join('')
}

export function pascalToKebab(pascal: string): string {
  return pascal
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
}

export function bytesToSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function getInitials(name: string | null | undefined, max: number = 2): string {
  const trimmed = (name ?? '').trim()
  if (trimmed.length === 0) return '?'
  return trimmed
    .split(' ')
    .slice(0, max)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

/**
 * Initials for a square avatar badge. Unlike {@link getInitials} this keeps the
 * leading-characters behaviour the admin tables have always used, but tolerates
 * missing or blank names so a malformed record renders a placeholder instead of
 * throwing mid-render and blanking the whole table.
 */
export function getAvatarInitials(name: string | null | undefined, max: number = 2): string {
  const trimmed = (name ?? '').trim()
  if (trimmed.length === 0) return '?'
  return trimmed.slice(0, max).toUpperCase()
}

export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}