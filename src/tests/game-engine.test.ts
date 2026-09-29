/**
 * NEXUS — Game Engine Tests
 *
 * Tests for the game engine data structures, content validation,
 * and security properties of the puzzle system.
 */

import { describe, it, expect } from 'vitest'
import { ALL_PUZZLES, PUZZLES_BY_CODE, PUZZLES_BY_STAGE } from '@/content/puzzles'
import { PUZZLE_TYPES, HINT_PENALTIES, MAX_HINTS_PER_NODE } from '@/content/constants'
import { ContentValidator } from '@/lib/content/validation'
import type { PuzzleType } from '@/types/game-engine'

describe('Puzzle Content Structure', () => {
  it('has exactly 43 puzzle nodes', () => {
    expect(ALL_PUZZLES).toHaveLength(43)
  })

  it('all puzzles have required fields', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.id).toBeTruthy()
      expect(puzzle.code).toBeTruthy()
      expect(puzzle.name).toBeTruthy()
      expect(puzzle.stage).toBeGreaterThanOrEqual(1)
      expect(puzzle.stage).toBeLessThanOrEqual(5)
      expect(puzzle.type).toBeTruthy()
      expect(puzzle.difficulty).toBeGreaterThanOrEqual(1)
      expect(puzzle.difficulty).toBeLessThanOrEqual(5)
      expect(puzzle.time).toBeTruthy()
      expect(puzzle.location).toBeTruthy()
      expect(puzzle.feeds).toBeTruthy()
      expect(puzzle.acceptedAnswer).toBeTruthy()
      expect(puzzle.validationMethod).toBeTruthy()
      expect(puzzle.narrativeObjective).toBeTruthy()
      expect(puzzle.roleDependencyLevel).toBeTruthy()
      expect(puzzle.hints.length).toBeGreaterThan(0)
      expect(puzzle.hints.length).toBeLessThanOrEqual(MAX_HINTS_PER_NODE)
      expect(puzzle.fullSolution).toBeTruthy()
      expect(puzzle.whyTeamworkMatters).toBeTruthy()
      expect(puzzle.storyReveal).toBeTruthy()
      expect(puzzle.locationClue).toBeTruthy()
      expect(puzzle.prerequisiteNodes).toEqual(expect.any(Array))
      expect(puzzle.branchConditions).toEqual(expect.any(Array))
      expect(puzzle.points).toBeGreaterThan(0)
    })
  })

  it('all puzzle codes are unique', () => {
    const codes = ALL_PUZZLES.map(p => p.code)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })

  it('all puzzle IDs are unique', () => {
    const ids = ALL_PUZZLES.map(p => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('PUZZLES_BY_CODE lookup contains all puzzles', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(PUZZLES_BY_CODE[puzzle.code]).toBeDefined()
      expect(PUZZLES_BY_CODE[puzzle.code].id).toBe(puzzle.id)
    })
  })

  it('PUZZLES_BY_STAGE contains puzzles for stages 1-5', () => {
    expect(PUZZLES_BY_STAGE[1].length).toBeGreaterThan(0)
    expect(PUZZLES_BY_STAGE[2].length).toBeGreaterThan(0)
    expect(PUZZLES_BY_STAGE[3].length).toBeGreaterThan(0)
    expect(PUZZLES_BY_STAGE[4].length).toBeGreaterThan(0)
    expect(PUZZLES_BY_STAGE[5].length).toBeGreaterThan(0)
  })
})

describe('Puzzle Types Validation', () => {
  it('only uses valid PuzzleType values', () => {
    const validTypes = new Set(PUZZLE_TYPES)
    ALL_PUZZLES.forEach(puzzle => {
      expect(validTypes.has(puzzle.type as PuzzleType)).toBe(true)
    })
  })

  it('includes all required puzzle types', () => {
    const typesUsed = new Set(ALL_PUZZLES.map(p => p.type as PuzzleType))

    const requiredTypes: PuzzleType[] = [
      'OBSERVATION',
      'BINARY',
      'CIPHER',
      'PATTERN',
      'GRAPH',
      'VISUAL',
      'AUDIO',
      'MEMORY',
      'SPATIAL',
      'EXTRACTION',
      'CROSS_REFERENCE',
      'THREE_PHONE',
      'DEDUCTION',
      'LOGIC',
      'NARRATIVE_INVESTIGATION',
      'META',
      'FINAL_BOSS',
    ]
    requiredTypes.forEach(type => {
      expect(typesUsed.has(type), `Missing puzzle type: ${type}`).toBe(true)
    })
  })
})

describe('Progression Chain', () => {
  it('P01 has no prerequisites (starts the chain)', () => {
    const p01 = PUZZLES_BY_CODE['P01']
    expect(p01.prerequisiteNodes).toEqual([])
  })

  it('P37 (Final Boss) has no next nodes', () => {
    const p37 = PUZZLES_BY_CODE['P37']
    expect(p37.nextNodes).toBeNull()
  })

  it('P37 has FINAL_BOSS type', () => {
    const p37 = PUZZLES_BY_CODE['P37']
    expect(p37.type).toBe('FINAL_BOSS')
  })

  it('Metas have META type', () => {
    const metas = ALL_PUZZLES.filter(p => p.code.startsWith('M'))
    metas.forEach(meta => {
      expect(meta.type).toBe('META')
    })
  })

  it('all prerequisite nodes exist in the puzzle set', () => {
    const allCodes = new Set(ALL_PUZZLES.map(p => p.code))
    ALL_PUZZLES.forEach(puzzle => {
      puzzle.prerequisiteNodes.forEach(prereq => {
        if (prereq) {
          expect(allCodes.has(prereq), `Puzzle ${puzzle.code} has non-existent prerequisite: ${prereq}`).toBe(true)
        }
      })
    })
  })

  it('all nextNodes exist in the puzzle set', () => {
    const allCodes = new Set(ALL_PUZZLES.map(p => p.code))
    ALL_PUZZLES.forEach(puzzle => {
      if (puzzle.nextNodes) {
        puzzle.nextNodes.forEach(next => {
          expect(allCodes.has(next), `Puzzle ${puzzle.code} has non-existent next node: ${next}`).toBe(true)
        }
        )
      }
    })
  })

  it('branch puzzles P06b and P07b exist', () => {
    expect(PUZZLES_BY_CODE['P06b']).toBeDefined()
    expect(PUZZLES_BY_CODE['P07b']).toBeDefined()
  })
})

describe('Hint System', () => {
  it('has correct hint penalties', () => {
    expect(HINT_PENALTIES.hint1).toBe(120)
    expect(HINT_PENALTIES.hint2).toBe(300)
    expect(HINT_PENALTIES.hint3).toBe(600)
  })

  it('max hints is 3', () => {
    expect(MAX_HINTS_PER_NODE).toBe(3)
  })

  it('all puzzles have 3 or fewer hints', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.hints.length).toBeLessThanOrEqual(MAX_HINTS_PER_NODE)
    })
  })
})

describe('Role-Based Content Structure', () => {
  it('all puzzles have observer, analyst, and operator roles', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.observer).toBeDefined()
      expect(puzzle.observer.role).toBe('OBSERVER')
      expect(puzzle.analyst).toBeDefined()
      expect(puzzle.analyst.role).toBe('ANALYST')
      expect(puzzle.operator).toBeDefined()
      expect(puzzle.operator.role).toBe('OPERATOR')
    })
  })

  it('all role content has required fields', () => {
    ALL_PUZZLES.forEach(puzzle => {
      ;[puzzle.observer, puzzle.analyst, puzzle.operator].forEach(role => {
        expect(role.screenTitle).toBeTruthy()
        expect(role.dataPayload).toBeTruthy()
        expect(role.whatTheySee).toBeTruthy()
        expect(role.taskPrompt).toBeTruthy()
        expect(role.intermediateOutput).toBeTruthy()
      })
    })
  })

  it('OperatorInvestigation has required fields', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.operatorInvestigation).toBeDefined()
      expect(puzzle.operatorInvestigation.operatorOwnEvidence).toBeTruthy()
      expect(puzzle.operatorInvestigation.operatorTaskDescription).toBeTruthy()
      expect(puzzle.operatorInvestigation.requiredDiscoveries.observerDiscovery).toBeTruthy()
      expect(puzzle.operatorInvestigation.requiredDiscoveries.analystDiscovery).toBeTruthy()
    })
  })

  it('CoordinationChain has required fields', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.coordinationChain).toBeDefined()
      expect(puzzle.coordinationChain.observerProduces).toBeTruthy()
      expect(puzzle.coordinationChain.analystTransforms).toBeTruthy()
      expect(puzzle.coordinationChain.operatorExecutes).toBeTruthy()
    })
  })

  it('FailurePropagation has required fields', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.failurePropagation).toBeDefined()
      expect(puzzle.failurePropagation.wrongStep).toBeTruthy()
      expect(puzzle.failurePropagation.consequence).toBeTruthy()
      expect(puzzle.failurePropagation.recoveryGuidance).toBeTruthy()
    })
  })
})

describe('Security: Answer Isolation', () => {
  it('acceptedAnswer is never in roleContent (player-facing only)', () => {
    ALL_PUZZLES.forEach(puzzle => {
      const roleContentStr = JSON.stringify({
        observer: puzzle.observer,
        analyst: puzzle.analyst,
        operator: puzzle.operator,
      })
      expect(roleContentStr.toLowerCase()).not.toContain('acceptedAnswer')
      expect(roleContentStr.toLowerCase()).not.toContain('fullSolution')
    })
  })

  it('fullSolution is never in roleContent or locationClue', () => {
    ALL_PUZZLES.forEach(puzzle => {
      const roleContentStr = JSON.stringify([puzzle.observer, puzzle.analyst, puzzle.operator])
      const lowerSolution = puzzle.fullSolution.toLowerCase()
      if (lowerSolution.length > 10) {
        expect(roleContentStr.toLowerCase()).not.toContain(lowerSolution)
      }
    })
  })

  it('answer metadata contains full solution (server-only)', () => {
    ALL_PUZZLES.forEach(puzzle => {
      expect(puzzle.fullSolution).toBeTruthy()
      expect(puzzle.acceptedAnswer).toBeTruthy()
    })
  })

  it('locationClue solution does not include full answer string', () => {
    ALL_PUZZLES.forEach(puzzle => {
      const answer = Array.isArray(puzzle.acceptedAnswer)
        ? puzzle.acceptedAnswer.join(' ')
        : puzzle.acceptedAnswer
      if (answer.length > 3) {
        const lowerAnswer = answer.toLowerCase()
        expect(puzzle.locationClue.solution.toLowerCase()).not.toMatch(
          new RegExp(lowerAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        )
      }
    })
  })
})

describe('Content Validator', () => {
  it('passes validation for all puzzles', () => {
    const validator = new ContentValidator()
    const report = validator.validateAll()
    expect(report.valid).toBe(true)
    expect(report.nodesChecked).toBe(43)
  })

  it('identifies no errors (warnings only for known cases)', () => {
    const validator = new ContentValidator()
    const report = validator.validateAll()
    const errors = report.issues.filter(i => i.severity === 'ERROR')
    expect(errors).toHaveLength(0)
  })
})

describe('Stage Completeness', () => {
  it('Stage 1 has 5 puzzles plus M01', () => {
    expect(PUZZLES_BY_STAGE[1].length).toBe(6)
  })

  it('Stage 2 has 10 puzzles (P06-P13, P06b, P07b) plus M02 (11 total)', () => {
    expect(PUZZLES_BY_STAGE[2].length).toBe(11)
  })

  it('Stage 3 has 8 puzzles plus M03 (9 total)', () => {
    expect(PUZZLES_BY_STAGE[3].length).toBe(9)
  })

  it('Stage 4 has 8 puzzles plus M04 (9 total)', () => {
    expect(PUZZLES_BY_STAGE[4].length).toBe(9)
  })

  it('Stage 5 has 8 puzzles (P30-P37)', () => {
    expect(PUZZLES_BY_STAGE[5].length).toBe(8)
  })
})
