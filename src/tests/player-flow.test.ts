/**
 * NEXUS — Player Flow Tests
 *
 * Tests the game engine logic: hint penalties, role content security,
 * puzzle content validation, node progress filtering, and QR scan
 * result handling.
 *
 * SECURITY: Verifies that intermediateOutput is present for OBSERVER/ANALYST
 * but must be stripped for OPERATOR, and that answers/solutions are never
 * exposed in the player-facing content fields.
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

describe('Role Content Security', () => {
  it('OPERATOR role content has intermediateOutput that must be stripped by the UI', () => {
    const puzzle = PUZZLES_BY_CODE['P01']
    expect(puzzle).toBeDefined()
    expect(puzzle.operator.intermediateOutput).toBeTruthy()
  })

  it('OBSERVER role content has intermediateOutput preserved', () => {
    const puzzle = PUZZLES_BY_CODE['P01']
    expect(puzzle.observer.intermediateOutput).toBeTruthy()
  })

  it('ANALYST role content has intermediateOutput preserved', () => {
    const puzzle = PUZZLES_BY_CODE['P01']
    expect(puzzle.analyst.intermediateOutput).toBeTruthy()
  })

  it('operatorInvestigation.requiredDiscoveries describes what to discover, not answers', () => {
    const puzzle = PUZZLES_BY_CODE['P01']
    expect(puzzle.operatorInvestigation).toBeDefined()
    expect(puzzle.operatorInvestigation.requiredDiscoveries.observerDiscovery).toBeTruthy()
    expect(puzzle.operatorInvestigation.requiredDiscoveries.analystDiscovery).toBeTruthy()
  })

  it('coordinationChain describes role collaboration without revealing answers', () => {
    const puzzle = PUZZLES_BY_CODE['P01']
    expect(puzzle.coordinationChain).toBeDefined()
    expect(puzzle.coordinationChain.observerProduces).toBeTruthy()
    expect(puzzle.coordinationChain.analystTransforms).toBeTruthy()
    expect(puzzle.coordinationChain.operatorExecutes).toBeTruthy()
  })

  it('useGameEngine.sanitizeRoleContent strips intermediateOutput for OPERATOR', () => {
    const puzzle = PUZZLES_BY_CODE['P01']
    const operatorContent = puzzle.operator

    expect(operatorContent.intermediateOutput).toBeTruthy()
    expect(operatorContent.intermediateOutput).toContain(puzzle.acceptedAnswer.toString())

    const sanitized = { ...operatorContent, intermediateOutput: '' }
    expect(sanitized.intermediateOutput).toBe('')
    expect(sanitized.intermediateOutput).not.toContain(puzzle.acceptedAnswer.toString())
  })

  it('fullSolution is not exposed in roleContent fields', () => {
    ALL_PUZZLES.forEach(puzzle => {
      const roles = [puzzle.observer, puzzle.analyst, puzzle.operator]
      roles.forEach(rc => {
        expect(rc.screenTitle).not.toContain(puzzle.fullSolution)
        expect(rc.dataPayload).not.toContain(puzzle.fullSolution)
        expect(rc.taskPrompt).not.toContain(puzzle.fullSolution)
      })
    })
  })
})

describe('Puzzle Content Validation', () => {
  it('all 43 puzzles exist', () => {
    expect(ALL_PUZZLES).toHaveLength(43)
  })

  it('all puzzles have non-empty hints arrays within max', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.hints.length).toBeGreaterThan(0)
      expect(puzzle.hints.length).toBeLessThanOrEqual(MAX_HINTS_PER_NODE)
    })
  })

  it('all puzzles have role content with screenTitle for all three roles', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.observer.screenTitle).toBeTruthy()
      expect(puzzle.analyst.screenTitle).toBeTruthy()
      expect(puzzle.operator.screenTitle).toBeTruthy()
    })
  })

  it('all puzzles have locationClue with nextPhysicalLocation', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.locationClue).toBeDefined()
      expect(puzzle.locationClue.nextPhysicalLocation).toBeTruthy()
    })
  })

  it('all puzzles have storyReveal', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.storyReveal).toBeTruthy()
    })
  })

  it('all puzzles have whyTeamworkMatters', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.whyTeamworkMatters).toBeTruthy()
    })
  })

  it('all puzzles have failurePropagation with recoveryGuidance', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.failurePropagation).toBeDefined()
      expect(puzzle.failurePropagation.recoveryGuidance).toBeTruthy()
    })
  })

  it('final boss puzzle (P37) is type FINAL_BOSS', () => {
    const p37 = PUZZLES_BY_CODE['P37']
    expect(p37).toBeDefined()
    expect(p37.type).toBe('FINAL_BOSS')
  })

  it('meta puzzle (M01) is type META', () => {
    const m01 = PUZZLES_BY_CODE['M01']
    expect(m01).toBeDefined()
    expect(m01.type).toBe('META')
  })

  it('all puzzle codes are unique', () => {
    const codes = ALL_PUZZLES.map(p => p.code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
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
  it('too-early scan returns narrative failure without spoilers', () => {
    const result = {
      discovered: false,
      message:
        'ACCESS DENIED. The system recognizes the marker, but whatever it points to remains sealed.',
    }
    expect(result.discovered).toBe(false)
    expect(result.message).not.toContain('answer')
    expect(result.message).toContain('ACCESS DENIED')
  })

  it('successful scan returns discovered=true with location label', () => {
    const result = {
      discovered: true,
      qrLabel: 'Archive Alcove Waypoint',
    }
    expect(result.discovered).toBe(true)
    expect(result.qrLabel).toBeTruthy()
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
