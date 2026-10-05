/**
 * NEXUS — Offline submission queue
 *
 * A player walking between campus buildings loses signal constantly. Previously
 * an answer submitted in that window was simply rejected with "Cannot submit
 * while offline", so a solved puzzle could be lost to a lift door.
 *
 * Answers typed while offline are persisted here and replayed, in order, as soon
 * as the connection is back. The server remains the only validator:
 * submit_puzzle_answer() still decides correctness, still applies the rate limit
 * and still charges the attempt, and a replayed answer that has since gone
 * stale is rejected exactly as it would have been online.
 *
 * SECURITY: this queue only ever holds text the player typed on this device.
 * No answer key, hint, token or other server data is written here.
 */

export interface QueuedSubmission {
  /** Stable local id, so a replayed entry can be removed exactly once. */
  id: string
  nodeId: string
  answer: string
  queuedAt: string
  /** How many times the flush has tried this entry. */
  attempts: number
}

export const SUBMISSION_QUEUE_KEY = 'nexus_submission_queue'

/** Enough headroom for a walk between buildings, bounded so storage cannot grow. */
export const SUBMISSION_QUEUE_LIMIT = 20

/**
 * submit_puzzle_answer() allows 5 submissions per minute per team, so replays
 * are spaced out rather than fired in a burst.
 */
export const SUBMISSION_FLUSH_INTERVAL_MS = 13_000

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    // Safari in private mode throws on localStorage access.
    return null
  }
}

function isQueuedSubmission(value: unknown): value is QueuedSubmission {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.nodeId === 'string' &&
    typeof entry.answer === 'string' &&
    typeof entry.queuedAt === 'string'
  )
}

export function readQueue(): QueuedSubmission[] {
  const store = storage()
  if (!store) return []
  try {
    const raw = store.getItem(SUBMISSION_QUEUE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(isQueuedSubmission)
      .map(entry => ({ ...entry, attempts: typeof entry.attempts === 'number' ? entry.attempts : 0 }))
      .slice(0, SUBMISSION_QUEUE_LIMIT)
  } catch {
    return []
  }
}

export function writeQueue(items: QueuedSubmission[]): void {
  const store = storage()
  if (store) {
    try {
      if (items.length === 0) {
        store.removeItem(SUBMISSION_QUEUE_KEY)
      } else {
        store.setItem(SUBMISSION_QUEUE_KEY, JSON.stringify(items.slice(0, SUBMISSION_QUEUE_LIMIT)))
      }
    } catch {
      // A full or unavailable store must never break submission handling.
    }
  }
  notify()
}

export function enqueueSubmission(nodeId: string, answer: string): QueuedSubmission {
  const queue = readQueue()
  const trimmed = answer.trim()

  // Re-submitting the same text for the same node is a retry, not a new
  // attempt to remember; collapsing it keeps a stuck connection from
  // filling the queue with duplicates of one answer.
  const duplicate = queue.find(item => item.nodeId === nodeId && item.answer === trimmed)
  if (duplicate) return duplicate

  const entry: QueuedSubmission = {
    id: `${nodeId}-${Date.now()}-${queue.length}`,
    nodeId,
    answer: trimmed,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  }

  const next = [...queue, entry]
  writeQueue(next)
  return entry
}

export function removeSubmission(id: string): void {
  writeQueue(readQueue().filter(item => item.id !== id))
}

export function clearQueue(): void {
  writeQueue([])
}

export function queueSize(): number {
  return readQueue().length
}

/* ------------------------------------------------------------------------ */
/* subscription store                                                         */
/*                                                                            */
/* The banner is rendered by the layout, above every screen, so it must not    */
/* depend on a screen that only mounts inside the game. A tiny external store  */
/* keeps the count and the last flush readable from anywhere without adding a  */
/* second polling hook.                                                        */
/* ------------------------------------------------------------------------ */

type Listener = () => void

const listeners = new Set<Listener>()
let lastFlush: QueuedSubmission[] | null = null

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeToQueue(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Remember what the last replay delivered, so the player gets an acknowledgement. */
export function recordFlush(sent: QueuedSubmission[]): void {
  lastFlush = sent.length > 0 ? [...sent] : null
  notify()
}

export function getLastFlush(): QueuedSubmission[] | null {
  return lastFlush
}

export function clearLastFlush(): void {
  lastFlush = null
  notify()
}

export interface FlushReport {
  sent: QueuedSubmission[]
  /** Entries that got a definitive answer back from the server. */
  results: Array<{ submission: QueuedSubmission; isCorrect: boolean; nextNodeId?: string | null }>
  /** Entries still queued after the flush. */
  remaining: number
  /** Entries that exceeded max attempts and were dropped. */
  deadLetter: QueuedSubmission[]
}

export interface FlushOptions {
  send: (nodeId: string, answer: string) => Promise<{ isCorrect: boolean; nextNodeId?: string | null }>
  /** Milliseconds to wait between replays. */
  intervalMs?: number
  /** Stop after this many entries in one pass. */
  maxToSend?: number
  /** Injectable for tests. */
  delay?: (ms: number) => Promise<void>
}

const defaultDelay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/** Retries that reached this count are removed from the queue. */
export const MAX_QUEUE_ATTEMPTS = 5

/**
 * Replay the queue in order.
 *
 * Stops at the first entry that fails: the server sees submissions for a team
 * in order, and a burst of failures almost always means the link is down again
 * rather than that this one entry is bad. Entries stay in the queue with their
 * attempt count incremented, so the next pass retries them.
 *
 * Entries that exceed `MAX_QUEUE_ATTEMPTS` are dropped so they cannot
 * head-of-line block the rest of the queue forever.
 */
export async function flushSubmissionQueue(options: FlushOptions): Promise<FlushReport> {
  const {
    send,
    intervalMs = SUBMISSION_FLUSH_INTERVAL_MS,
    maxToSend = 3,
    delay = defaultDelay,
  } = options

  const results: FlushReport['results'] = []
  const sent: QueuedSubmission[] = []
  const deadLetter: QueuedSubmission[] = []
  let queue = readQueue()

  for (const [index, entry] of queue.slice(0, maxToSend).entries()) {
    if (index > 0 && intervalMs > 0) await delay(intervalMs)

    try {
      const result = await send(entry.nodeId, entry.answer)
      sent.push(entry)
      results.push({
        submission: entry,
        isCorrect: result.isCorrect,
        nextNodeId: result.nextNodeId ?? null,
      })
      queue = queue.filter(item => item.id !== entry.id)
      writeQueue(queue)
    } catch {
      const nextAttempts = entry.attempts + 1
      if (nextAttempts >= MAX_QUEUE_ATTEMPTS) {
        deadLetter.push(entry)
        queue = queue.filter(item => item.id !== entry.id)
        writeQueue(queue)
      } else {
        writeQueue(
          queue.map(item =>
            item.id === entry.id ? { ...item, attempts: nextAttempts } : item,
          ),
        )
        break
      }
    }
  }

  return { sent, results, remaining: queueSize(), deadLetter }
}