/**
 * The investigation workspace is the player's own work: the notes they write on
 * an artifact, the marks they set, the links they draw between objects and where
 * they left the board camera. None of it is server-authoritative, so once it is
 * gone it is gone for good - there is no copy anywhere else.
 *
 * The hook that owns it reads from storage on mount and writes on change. Those
 * two directions have to be kept strictly ordered, because the destructive
 * failure is always the same shape: a write that happens before the read has
 * finished overwrites a real transcript with an empty one, and the player
 * returns to a blank board with no way to know anything was lost.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import {
  addAnnotation,
  addLinks,
  emptyInvestigationWorkspace,
  writeInvestigationWorkspace,
  type InvestigationWorkspace,
} from '@/lib/investigationWorkspace'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

function readStored(teamId: string): InvestigationWorkspace {
  const raw = window.localStorage.getItem(`nexus_case_workspace_v1:${teamId}`)
  return raw ? JSON.parse(raw) as InvestigationWorkspace : emptyInvestigationWorkspace()
}

describe('investigation workspace survives the life of a screen', () => {
  it('keeps a note written on one visit when the player returns', async () => {
    const first = renderHook(() => useInvestigationWorkspace('team-a'))

    act(() => {
      first.result.current.updateWorkspace(current =>
        addAnnotation(current, 'EV-01', 'NOTE', 'The clock is three minutes slow.', 'note-1'))
    })

    // Leave the screen entirely, as navigating away does.
    first.unmount()

    const second = renderHook(() => useInvestigationWorkspace('team-a'))
    expect(second.result.current.workspace.annotations['EV-01']?.[0]?.text)
      .toBe('The clock is three minutes slow.')
    second.unmount()
  })

  it('keeps links, marks and the board camera, not just notes', async () => {
    const first = renderHook(() => useInvestigationWorkspace('team-a'))

    act(() => {
      first.result.current.updateWorkspace(current => {
        const linked = addLinks(current, ['EV-01', 'DOC-02'], 'TEMPORAL', 'same window', i => `link-${i}`)
        return {
          ...linked,
          marks: { ...linked.marks, 'EV-01': 'CONTRADICTION' },
          view: { x: -120, y: 40, zoom: 1.2 },
        }
      })
    })
    first.unmount()

    const second = renderHook(() => useInvestigationWorkspace('team-a'))
    expect(second.result.current.workspace.hypotheses).toHaveLength(1)
    expect(second.result.current.workspace.marks['EV-01']).toBe('CONTRADICTION')
    expect(second.result.current.workspace.view).toEqual({ x: -120, y: 40, zoom: 1.2 })
    second.unmount()
  })

  it('mounting with no team yet does not erase the board the team owns', async () => {
    // The evidence screen reads `team?.id`, which is null until the session
    // resolves. The first render therefore happens with no team at all, and that
    // first render must not be allowed to persist anything.
    const existing = emptyInvestigationWorkspace()
    existing.annotations['EV-01'] = [
      { id: 'note-1', kind: 'NOTE', text: 'do not lose me', createdAt: '2026-10-02T12:00:00.000Z' },
    ]
    writeInvestigationWorkspace('team-a', existing)

    const unresolved = renderHook(() => useInvestigationWorkspace(null))
    // Simulate the session resolving a moment later, which is the normal shape.
    const { result, rerender } = renderHook(
      ({ teamId }: { teamId: string | null }) => useInvestigationWorkspace(teamId),
      { initialProps: { teamId: null as string | null } },
    )
    void unresolved

    rerender({ teamId: 'team-a' })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.workspace.annotations['EV-01']?.[0]?.text).toBe('do not lose me')
    expect(readStored('team-a').annotations['EV-01']?.[0]?.text).toBe('do not lose me')
  })

  it('switches teams without carrying one board into the other', async () => {
    const a = emptyInvestigationWorkspace()
    a.annotations['EV-01'] = [{ id: 'n', kind: 'NOTE', text: 'team a note', createdAt: '' }]
    writeInvestigationWorkspace('team-a', a)

    const { result, rerender } = renderHook(
      ({ teamId }: { teamId: string }) => useInvestigationWorkspace(teamId),
      { initialProps: { teamId: 'team-a' } },
    )
    expect(result.current.workspace.annotations['EV-01']?.[0]?.text).toBe('team a note')

    rerender({ teamId: 'team-b' })
    await act(async () => { await Promise.resolve() })

    // Team B has its own board, and it starts empty rather than inheriting A's.
    expect(result.current.workspace.annotations['EV-01']).toBeUndefined()
    expect(readStored('team-a').annotations['EV-01']?.[0]?.text).toBe('team a note')
  })
})

describe('investigation workspace and other tabs', () => {
  it('picks up a note written by a teammate on another device sharing the board', async () => {
    const { result } = renderHook(() => useInvestigationWorkspace('team-a'))
    act(() => {
      result.current.updateWorkspace(current =>
        addAnnotation(current, 'EV-01', 'NOTE', 'first', 'note-1'))
    })

    const teammate = emptyInvestigationWorkspace()
    teammate.annotations['EV-01'] = [
      ...(teammate.annotations['EV-01'] ?? []),
      { id: 'note-2', kind: 'QUESTION', text: 'from another device', createdAt: '' },
    ]
    writeInvestigationWorkspace('team-a', teammate)

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'nexus_case_workspace_v1:team-a',
      }))
    })

    expect(result.current.workspace.annotations['EV-01']?.map(n => n.text)).toEqual(['from another device'])
  })

  it('ignores storage events for a different team', async () => {
    const { result } = renderHook(() => useInvestigationWorkspace('team-a'))
    act(() => {
      result.current.updateWorkspace(current =>
        addAnnotation(current, 'EV-01', 'NOTE', 'mine', 'note-1'))
    })

    writeInvestigationWorkspace('team-b', (() => {
      const w = emptyInvestigationWorkspace()
      w.annotations['EV-01'] = [{ id: 'x', kind: 'NOTE', text: 'theirs', createdAt: '' }]
      return w
    })())

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'nexus_case_workspace_v1:team-b',
      }))
    })

    expect(result.current.workspace.annotations['EV-01']?.[0]?.text).toBe('mine')
  })
})

describe('investigation workspace when storage is unavailable', () => {
  it('does not throw and still works for the session', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    try {
      const { result } = renderHook(() => useInvestigationWorkspace('team-a'))
      act(() => {
        result.current.updateWorkspace(current =>
          addAnnotation(current, 'EV-01', 'NOTE', 'in-memory only', 'note-1'))
      })
      // Private notes must never take the game flow down with them.
      expect(result.current.workspace.annotations['EV-01']?.[0]?.text).toBe('in-memory only')
    } finally {
      setItem.mockRestore()
    }
  })
})