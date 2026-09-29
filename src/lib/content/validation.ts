/**
 * NEXUS — Content Validation
 * Validates puzzle seed content for structural integrity and data correctness
 */

import type { PuzzleNode, ContentValidationIssue, ContentValidationReport } from '../../types/game-engine'
import { PUZZLE_TYPES } from '../../content/constants'
import { ALL_PUZZLES, PUZZLES_BY_CODE } from '../../content/puzzles'

export class ContentValidator {
  private issues: ContentValidationIssue[] = []

  validateAll(): ContentValidationReport {
    this.issues = []
    const seenCodes = new Set<string>()
    const seenIds = new Set<string>()

    for (const puzzle of ALL_PUZZLES) {
      this.validateNode(puzzle, seenCodes, seenIds)
    }

    this.validateProgression()
    this.validateCrossReferences()
    this.validateRoleDependencies()

    return {
      valid: this.issues.filter(i => i.severity === 'ERROR').length === 0,
      nodesChecked: ALL_PUZZLES.length,
      issues: this.issues,
    }
  }

  private validateNode(
    puzzle: PuzzleNode,
    seenCodes: Set<string>,
    seenIds: Set<string>,
  ): void {
    const code = puzzle.code

    if (seenCodes.has(code)) {
      this.addIssue(code, `Duplicate puzzle code: ${code}`, 'ERROR')
    }
    seenCodes.add(code)

    if (seenIds.has(puzzle.id)) {
      this.addIssue(code, `Duplicate puzzle id: ${puzzle.id}`, 'ERROR')
    }
    seenIds.add(puzzle.id)

    if (!PUZZLE_TYPES.includes(puzzle.type)) {
      this.addIssue(code, `Invalid puzzle type: ${puzzle.type}`, 'ERROR')
    }

    if (puzzle.difficulty < 1 || puzzle.difficulty > 5) {
      this.addIssue(code, `Difficulty out of range [1-5]: ${puzzle.difficulty}`, 'WARNING')
    }

    if (!puzzle.name || puzzle.name.length < 1) {
      this.addIssue(code, 'Missing puzzle name', 'ERROR')
    }

    if (!puzzle.location || puzzle.location.length < 1) {
      this.addIssue(code, 'Missing location', 'WARNING')
    }

    if (!puzzle.acceptedAnswer) {
      this.addIssue(code, 'Missing accepted answer', 'ERROR')
    }

    if (!puzzle.hints || puzzle.hints.length === 0) {
      this.addIssue(code, 'No hints defined', 'WARNING')
    }

    if (puzzle.hints && puzzle.hints.length > 3) {
      this.addIssue(code, `Too many hints: ${puzzle.hints.length} (max 3)`, 'WARNING')
    }

    if (!puzzle.observer || !puzzle.analyst || !puzzle.operator) {
      this.addIssue(code, 'Missing role-specific content for one or more roles', 'ERROR')
    }

    if (puzzle.nextNodes && puzzle.nextNodes.length > 0) {
      for (const nextId of puzzle.nextNodes) {
        if (!PUZZLES_BY_CODE[nextId] && !nextId.startsWith('M') && !nextId.startsWith('GM') && !nextId.startsWith('FB')) {
          this.addIssue(code, `next_node_id '${nextId}' does not exist`, 'ERROR')
        }
      }
    }

    if (puzzle.prerequisiteNodes) {
      for (const prereqId of puzzle.prerequisiteNodes) {
        if (!PUZZLES_BY_CODE[prereqId]) {
          this.addIssue(code, `prerequisite '${prereqId}' does not exist`, 'ERROR')
        }
      }
    }
  }

  private validateProgression(): void {
    const solved = new Set<string>()

    for (const puzzle of ALL_PUZZLES) {
      solved.add(puzzle.code)

      if (puzzle.prerequisiteNodes) {
        for (const prereq of puzzle.prerequisiteNodes) {
          if (!solved.has(prereq) && !prereq.startsWith('M') && !prereq.startsWith('GM') && !prereq.startsWith('FB')) {
            this.addIssue(puzzle.code, `Prerequisite '${prereq}' not yet solved in progression chain`, 'WARNING')
          }
        }
      }
    }
  }

  private validateCrossReferences(): void {
    for (const puzzle of ALL_PUZZLES) {
      if (puzzle.fullSolution && puzzle.fullSolution.length < 3) {
        this.addIssue(puzzle.code, 'fullSolution appears too brief (may be incomplete)', 'WARNING')
      }
    }
  }

  private validateRoleDependencies(): void {
    for (const puzzle of ALL_PUZZLES) {
      if (puzzle.roleDependencyLevel === 'D5' && !puzzle.operatorInvestigation) {
        this.addIssue(puzzle.code, 'D5 difficulty requires operatorInvestigation with requiredDiscoveries', 'WARNING')
      }
    }
  }

  private addIssue(nodeId: string, issue: string, severity: 'ERROR' | 'WARNING'): void {
    this.issues.push({ nodeId, issue, severity })
  }

  getReport(): ContentValidationReport {
    return this.validateAll()
  }
}

export function validateContent(): ContentValidationReport {
  const validator = new ContentValidator()
  return validator.getReport()
}

export function getContentValidationReport(): ContentValidationReport {
  return validateContent()
}
