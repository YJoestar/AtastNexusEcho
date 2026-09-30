/**
 * NEXUS - Offline submission queue tests
 *
 * A player walking between buildings loses signal constantly, and an answer
 * submitted in that window used to be rejected outright - a solved puzzle lost
 * to a lift door. These tests pin the queue's contract: what is stored, what is
 * replayed, and - importantly - what is deliberately never replayed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SUBMISSION_QUEUE_KEY,
  enqueueSubmission,
  flushSubmissionQueue,
  queueSize,
  readQueue,
  recordFlush,
  getLastFlush,
  clearLastFlush,
  subscribeToQueue,
} from '@/lib/offlineQueue'

beforeEach(() => {
  localStorage.clear()
  clearLastFlush()
})

describe('queue storage', () => {
  it('starts empty and survives a malformed payload', () => {
    expect(queueSize()).toBe(0)
    localStorage.setItem(SUBMISSION_QUEUE_KEY, '{not json')
    expect(readQueue()).toEqual([])

    localStorage.setItem(SUBMISSION_QUEUE_KEY, JSON.stringify([{ nope: true }, 42]))
    expect(readQueue()).toEqual([])
  })

  it('stores the trimmed answer with the node it belongs to', () => {
    const entry = enqueueSubmission('P01', '  CDFDEFF  ')
    expect(entry.nodeId).toBe('P01')
    expect(entry.answer).toBe('CDFDEFF')
    expect(readQueue()).toHaveLength(1)
  })

  it('collapses a retry of the same answer instead of queueing it twice', () => {
    const first = enqueueSubmission('P01', 'CDFDEFF')
    const second = enqueueSubmission('P01', 'CDFDEFF')
    expect(second.id).toBe(first.id)
    expect(queueSize()).toBe(1)
  })

  it('keeps distinct answers for the same node', () => {
    enqueueSubmission('P01', 'CDFDEFF')
    enqueueSubmission('P01', 'WRONG')
    expect(queueSize()).toBe(2)
  })

  it('preserves submission order', () => {
    enqueueSubmission('P01', 'A')
    enqueueSubmission('P02', 'B')
    expect(readQueue().map(item => item.nodeId)).toEqual(['P01', 'P02'])
  })
})

describe('flush', () => {
  const noDelay = () => Promise.resolve()

  it('replays queued answers in order and removes them once accepted', async () => {
    enqueueSubmission('P01', 'CDFDEFF')
    enqueueSubmission('P02', 'VEY')

    const sent: string[] = []
    const report = await flushSubmissionQueue({
      send: async (nodeId, answer) => {
        sent.push(`${nodeId}:${answer}`)
        return { isCorrect: false }
      },
      intervalMs: 0,
      delay: noDelay,
    })

    expect(sent).toEqual(['P01:CDFDEFF', 'P02:VEY'])
    expect(report.sent).toHaveLength(2)
    expect(report.remaining).toBe(0)
    expect(queueSize()).toBe(0)
  })

  it('keeps an entry and stops the pass when the link is still down', async () => {
    enqueueSubmission('P01', 'CDFDEFF')
    enqueueSubmission('P02', 'VEY')

    const send = vi.fn().mockRejectedValue(new Error('Failed to fetch'))

    const report = await flushSubmissionQueue({
      send: send as never,
      intervalMs: 0,
      delay: noDelay,
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(report.remaining).toBe(2)
    // The failed entry keeps its place at the head and remembers the attempt.
    expect(readQueue()[0].nodeId).toBe('P01')
    expect(readQueue()[0].attempts).toBe(1)
  })

  it('caps how many entries one pass replays, so it cannot trip the rate limit', async () => {
    for (let i = 0; i < 6; i++) enqueueSubmission(`P0${i}`, `answer-${i}`)

    const send = vi.fn().mockResolvedValue({ isCorrect: false })
    const report = await flushSubmissionQueue({
      send: send as never,
      intervalMs: 0,
      maxToSend: 2,
      delay: noDelay,
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(report.sent).toHaveLength(2)
    expect(queueSize()).toBe(4)
  })

  it('leaves nothing to replay when the queue is empty', async () => {
    const send = vi.fn()
    const report = await flushSubmissionQueue({ send: send as never, delay: noDelay })
    expect(send).not.toHaveBeenCalled()
    expect(report).toEqual({ sent: [], results: [], remaining: 0 })
  })
})

describe('flush acknowledgement store', () => {
  it('notifies subscribers when the queue changes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToQueue(listener)

    enqueueSubmission('P01', 'CDFDEFF')
    expect(listener).toHaveBeenCalled()

    unsubscribe()
    enqueueSubmission('P02', 'VEY')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('remembers what the last replay delivered', () => {
    expect(getLastFlush()).toBeNull()
    const entry = enqueueSubmission('P01', 'CDFDEFF')
    recordFlush([entry])
    expect(getLastFlush()).toHaveLength(1)
    clearLastFlush()
    expect(getLastFlush()).toBeNull()
  })
})