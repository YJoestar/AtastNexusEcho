/**
 * NEXUS — Submission queue hook
 *
 * Reads the offline submission queue from the queue store so any component can
 * show how many answers are waiting, without pulling the whole game engine in
 * (the banner is rendered by the layout, above every screen).
 */

import { useSyncExternalStore } from 'react'
import {
  clearLastFlush,
  getLastFlush,
  queueSize,
  subscribeToQueue,
  type QueuedSubmission,
} from '@/lib/offlineQueue'

export interface SubmissionQueueState {
  /** Answers typed with no usable connection and not yet delivered. */
  count: number
  /** Answers delivered by the most recent replay. */
  lastFlush: QueuedSubmission[] | null
  clearLastFlush: () => void
}

export function useSubmissionQueue(): SubmissionQueueState {
  const count = useSyncExternalStore(subscribeToQueue, queueSize, queueSize)
  const lastFlush = useSyncExternalStore(subscribeToQueue, getLastFlush, getLastFlush)

  return { count, lastFlush, clearLastFlush }
}