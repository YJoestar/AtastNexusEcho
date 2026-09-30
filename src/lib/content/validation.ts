/**
 * NEXUS — Content Validation
 *
 * Validates the client-side node index for structural integrity.
 *
 * SCOPE: this runs in the browser and can only see src/content/puzzles, which
 * is a map skeleton — codes, titles, locations, dependencies. It deliberately
 * holds no role content, no hints and no answers, so those are validated
 * server-side against puzzle_nodes rather than here. See
 * supabase/migrations/2026093010_server_authoritative_puzzles.sql.
 */

import type { ContentValidationIssue, ContentValidationReport } from '../../types/game-engine'
import { PUZZLE_TYPES } from '../../content/constants'
import { ALL_PUZZLES, PUZZLES_BY_CODE, type NodeIndexEntry } from '../../content/puzzles'

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
    this.validateRoleDependencies()

    return {
      valid: this.issues.filter(i => i.severity === 'ERROR').length === 0,
      nodesChecked: ALL_PUZZLES.length,
      issues: this.issues,
    }
  }

  private validateNode(
    puzzle: NodeIndexEntry,
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

    if (!PUZZLE_TYPES.includes(puzzle.type as (typeof PUZZLE_TYPES)[number])) {
      this.addIssue(code, `Invalid puzzle type: ${puzzle.type}`, 'ERROR')
    }

    if (puzzle.difficulty < 1 || puzzle.difficulty > 5) {
      this.addIssue(code, `Difficulty out of range [1-5]: ${puzzle.difficulty}`, 'WARNING')
    }

    if (!puzzle.name) {
      this.addIssue(code, 'Missing puzzle name', 'ERROR')
    }

    if (!puzzle.location) {
      this.addIssue(code, 'Missing location', 'WARNING')
    }

    if (puzzle.points <= 0) {
      this.addIssue(code, `Non-positive points: ${puzzle.points}`, 'ERROR')
    }

    if (!puzzle.time) {
      this.addIssue(code, 'Missing time estimate', 'WARNING')
    }

    if (puzzle.nextNodes) {
      for (const nextId of puzzle.nextNodes) {
        if (!PUZZLES_BY_CODE[nextId]) {
          this.addIssue(code, `nextNode '${nextId}' does not exist`, 'ERROR')
        }
      }
    }

    for (const prereqId of puzzle.prerequisiteNodes) {
      if (!PUZZLES_BY_CODE[prereqId]) {
        this.addIssue(code, `prerequisite '${prereqId}' does not exist`, 'ERROR')
      }
    }
  }

  private validateProgression(): void {
    const seen = new Set<string>()

    for (const puzzle of ALL_PUZZLES) {
      seen.add(puzzle.code)

      for (const prereq of puzzle.prerequisiteNodes) {
        if (!seen.has(prereq)) {
          this.addIssue(
            puzzle.code,
            `Prerequisite '${prereq}' is not declared earlier in the progression chain`,
            'WARNING',
          )
        }
      }
    }
  }

  /**
   * Difficulty tiers and role content are validated server-side; the client
   * index has neither. Kept as a hook for future index-level checks.
   */
  private validateRoleDependencies(): void {
    // no-op by design
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
