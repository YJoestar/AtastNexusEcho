/**
 * NEXUS — Time Utilities
 * Centralized time handling for game logic
 */

export const MS_PER_SECOND = 1000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

export function now(): Date {
  return new Date()
}

export function nowISO(): string {
  return now().toISOString()
}

export function parseISO(dateString: string): Date {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date string: ${dateString}`)
  }
  return date
}

export function formatDateTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDateTimeFull(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function formatDate(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatRelativeTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate
  const diffMs = date.getTime() - now().getTime()
  const absDiff = Math.abs(diffMs)
  const isFuture = diffMs > 0

  if (absDiff < MS_PER_SECOND * 5) return isFuture ? 'just now' : 'just now'
  if (absDiff < MS_PER_MINUTE) return `${Math.floor(absDiff / MS_PER_SECOND)}s ${isFuture ? 'left' : 'ago'}`
  if (absDiff < MS_PER_HOUR) return `${Math.floor(absDiff / MS_PER_MINUTE)}m ${isFuture ? 'left' : 'ago'}`
  if (absDiff < MS_PER_DAY) return `${Math.floor(absDiff / MS_PER_HOUR)}h ${isFuture ? 'left' : 'ago'}`
  return `${Math.floor(absDiff / MS_PER_DAY)}d ${isFuture ? 'left' : 'ago'}`
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE)
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * MS_PER_HOUR)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

export function diffMinutes(start: Date, end: Date = now()): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_MINUTE)
}

export function diffSeconds(start: Date, end: Date = now()): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_SECOND)
}

export function diffHours(start: Date, end: Date = now()): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_HOUR)
}

export function formatDuration(ms: number): string {
  if (ms < MS_PER_SECOND) return `${ms}ms`
  if (ms < MS_PER_MINUTE) return `${Math.floor(ms / MS_PER_SECOND)}s`
  if (ms < MS_PER_HOUR) return `${Math.floor(ms / MS_PER_MINUTE)}m ${Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND)}s`
  return `${Math.floor(ms / MS_PER_HOUR)}h ${Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE)}m`
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export function formatTimeRemaining(endTime: Date | string): string {
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime
  const diff = end.getTime() - now().getTime()
  if (diff <= 0) return 'EXPIRED'
  return formatDuration(diff)
}

export function isExpired(endTime: Date | string): boolean {
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime
  return now() >= end
}

export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return d > now()
}

export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date
  return d < now()
}

export function startOfDay(date: Date = now()): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date = now()): Date {
  const d = new Date(date)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

export function toISOString(date: Date): string {
  return date.toISOString()
}

export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000)
}

export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}