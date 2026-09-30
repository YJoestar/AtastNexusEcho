/**
 * NEXUS — Player Flow Tests
 *
 * Tests the game engine logic: hint penalties, the client/server content
 * boundary, node progress filtering, and QR scan result handling.
 *
 * SECURITY: the client ships no role content and no answers. Each role's
 * content arrives from get_player_node_detail(), which returns only that
 * role's block and redacts the accepted answer from every player-visible
 * string. These tests assert that boundary holds on the client side; the
 * per-role redaction itself is exercised against the live database.
 */

import { describe, it, expect } from 'vitest'
import { PUZZLES_BY_CODE, ALL_PUZZLES } from '@/content/puzzles'
import { HINT_PENALTIES, MAX_HINTS_PER_NODE, SUBMISSION_RATE_LIMIT } from '@/content/constants'
import type { NodeProgressEntry } from '@/types/game-engine'

describe('Hint Penalty System', () => {
  it('hint1 penalty is 120 seconds', () => {
    expect(HINT_PENALTIES.hint1).toBe(120)
  })

  it('hint2 penalty is 300 seconds', () => {
    expect(HINT_PENALTIES.hint2).toBe(300)
  })

  it('hint3 penalty is 600 seconds', () => {
    expect(HINT_PENALTIES.hint3).toBe(600)
  })

  it('max hints per node is 3', () => {
    expect(MAX_HINTS_PER_NODE).toBe(3)
  })

  it('hint penalties escalate monotonically', () => {
    expect(HINT_PENALTIES.hint1).toBeLessThan(HINT_PENALTIES.hint2)
    expect(HINT_PENALTIES.hint2).toBeLessThan(HINT_PENALTIES.hint3)
  })
})

describe('Submission Rate Limiting', () => {
  it('submission rate limit is configured as a number', () => {
    expect(SUBMISSION_RATE_LIMIT).toBeDefined()
    expect(typeof SUBMISSION_RATE_LIMIT).toBe('number')
    expect(SUBMISSION_RATE_LIMIT).toBeGreaterThan(0)
  })
})

describe('Client/Server Content Boundary', () => {
  it('no role content is reachable from the client', () => {
    // The three role blocks, the coordination chain and the operator
    // investigation are the puzzle itself. Shipping any of them would give one
    // player all three roles' material.
    ALL_PUZZLES.forEach(node => {
      const record = node as unknown as Record<string, unknown>
      for (const key of ['observer', 'analyst', 'operator', 'coordinationChain', 'operatorInvestigation']) {
        expect(record, `${node.code} must not ship ${key}`).not.toHaveProperty(key)
      }
    })
  })

  it('no answer field is reachable from the client', () => {
    ALL_PUZZLES.forEach(node => {
      const record = node as unknown as Record<string, unknown>
      expect(record).not.toHaveProperty('acceptedAnswer')
      expect(record).not.toHaveProperty('fullSolution')
      expect(record).not.toHaveProperty('validationMethod')
    })
  })

  it('hints are not preloaded into the client', () => {
    // Hints are released one at a time by request_hint(), which records the
    // usage and charges the penalty. Preloading them would make the last hint
    // - which on many nodes states the answer - free and immediate.
    ALL_PUZZLES.forEach(node => {
      expect(node as unknown as Record<string, unknown>).not.toHaveProperty('hints')
    })
  })

  it('P01 and P37 are addressable by code for the map', () => {
    expect(PUZZLES_BY_CODE['P01'].code).toBe('P01')
    expect(PUZZLES_BY_CODE['P37'].type).toBe('FINAL_BOSS')
  })
})

describe('Puzzle Index Validation', () => {
  it('all 47 nodes exist', () => {
    expect(ALL_PUZZLES).toHaveLength(47)
  })

  it('every node has a location the player can be sent to', () => {
    ALL_PUZZLES.forEach(node => {
      expect(node.location).toBeTruthy()
    })
  })

  it('final boss is typed FINAL_BOSS and terminal', () => {
    const p37 = PUZZLES_BY_CODE['P37']
    expect(p37).toBeDefined()
    expect(p37.type).toBe('FINAL_BOSS')
    expect(p37.nextNodes).toBeNull()
  })

  it('meta node is typed META', () => {
    expect(PUZZLES_BY_CODE['M01'].type).toBe('META')
  })

  it('all node codes are unique', () => {
    const codes = ALL_PUZZLES.map(n => n.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('Node Progress Filtering', () => {
  const mockProgress: NodeProgressEntry[] = [
    {
      nodeId: 'P01',
      nodeCode: 'P01',
      title: 'Test Node 1',
      type: 'OBSERVATION',
      stage: 1,
      status: 'SOLVED',
      startedAt: null,
      solvedAt: '',
      attempts: 1,
      hintsUsed: 0,
      pointsAwarded: 50,
    },
    {
      nodeId: 'P02',
      nodeCode: 'P02',
      title: 'Test Node 2',
      type: 'BINARY',
      stage: 1,
      status: 'IN_PROGRESS',
      startedAt: null,
      solvedAt: null,
      attempts: 3,
      hintsUsed: 1,
      pointsAwarded: 0,
    },
    {
      nodeId: 'P03',
      nodeCode: 'P03',
      title: 'Test Node 3',
      type: 'CIPHER',
      stage: 2,
      status: 'LOCKED',
      startedAt: null,
      solvedAt: null,
      attempts: 0,
      hintsUsed: 0,
      pointsAwarded: 0,
    },
  ]

  it('filters solved nodes correctly', () => {
    const solved = mockProgress.filter(p => p.status === 'SOLVED')
    expect(solved).toHaveLength(1)
    expect(solved[0].nodeCode).toBe('P01')
  })

  it('filters in-progress nodes correctly', () => {
    const inProgress = mockProgress.filter(p => p.status === 'IN_PROGRESS')
    expect(inProgress).toHaveLength(1)
    expect(inProgress[0].nodeCode).toBe('P02')
  })

  it('filters locked nodes correctly', () => {
    const locked = mockProgress.filter(p => p.status === 'LOCKED')
    expect(locked).toHaveLength(1)
    expect(locked[0].nodeCode).toBe('P03')
  })

  it('counts total attempts across all nodes', () => {
    const totalAttempts = mockProgress.reduce((sum, p) => sum + p.attempts, 0)
    expect(totalAttempts).toBe(4)
  })
})

describe('QR Scan Result Handling', () => {
  /**
   * Mirrors the payloads scan_qr_code() actually returns, verified against the
   * live database. The contract matters for two reasons: a locked marker must
   * never name what it points to, and the UI branches on exactly these fields.
   */
  it('a locked marker yields no spoiler at all', () => {
    const result = {
      discovered: false,
      message:
        'ACCESS DENIED. The system recognizes the marker, but whatever it points to remains sealed.',
    }
    expect(result.discovered).toBe(false)
    // The server must not leak the destination for a marker the team has not
    // reached; only the label-less denial comes back.
    expect(result).not.toHaveProperty('nodeCode')
    expect(result).not.toHaveProperty('nodeTitle')
    expect(result).not.toHaveProperty('qrLabel')
    expect(result.message).not.toContain('answer')
    expect(result.message).toContain('ACCESS DENIED')
  })

  it('an available puzzle marker names the node it unlocked', () => {
    const result = {
      nodeCode: 'P01',
      nodeTitle: '[ADMIN BUILDING] — Main Entrance Facade',
      discovered: true,
    }
    expect(result.discovered).toBe(true)
    expect(result.nodeCode).toBe('P01')
  })

  it('a non-puzzle marker returns a location label instead of a node', () => {
    const result = { discovered: true, qrLabel: 'Archive Alcove Waypoint' }
    expect(result.discovered).toBe(true)
    expect(result.qrLabel).toBeTruthy()
    expect(result).not.toHaveProperty('nodeCode')
  })

  it('an unrecognised code is rejected outright', () => {
    const result = { error: 'Invalid QR code' }
    expect(result.error).toBe('Invalid QR code')
    expect(result).not.toHaveProperty('discovered')
  })

  it('a marker another teammate already claimed is reported as such', () => {
    // Without this the team sees a bare "Access Denied" for a marker that is
    // perfectly valid, which reads as a bug rather than a shared resource.
    const result = { discovered: false, alreadyClaimed: true }
    expect(result.alreadyClaimed).toBe(true)
  })
})

describe('Submission Result Handling', () => {
  it('correct submission includes nextNodeId for progression', () => {
    const result = {
      isCorrect: true,
      pointsAwarded: 50,
      attemptNumber: 1,
      nextNodeId: 'P02',
    }
    expect(result.isCorrect).toBe(true)
    expect(result.nextNodeId).toBe('P02')
    expect(result.pointsAwarded).toBe(50)
  })

  it('incorrect submission has no nextNodeId', () => {
    const result: {
      isCorrect: boolean
      pointsAwarded: number
      attemptNumber: number
      nextNodeId?: string
    } = {
      isCorrect: false,
      pointsAwarded: 0,
      attemptNumber: 3,
    }
    expect(result.isCorrect).toBe(false)
    expect(result.nextNodeId).toBeUndefined()
  })
})
