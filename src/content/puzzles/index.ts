/**
 * NEXUS — Puzzle Content Seed
 *
 * This file contains the canonical puzzle definitions for all 46 nodes
 * (P01-P37, M01-M04, GM, FB).
 *
 * Answers are stored server-side only (in answer_metadata JSONB field).
 * Player-facing content (roleContent) does NOT contain answers.
 */

import type { PuzzleNode } from '../../types/game-engine'
import { STAGE_1_PUZZLES } from './stages/stage-1'
import { STAGE_2_PUZZLES } from './stages/stage-2'
import { STAGE_3_PUZZLES } from './stages/stage-3'
import { STAGE_4_PUZZLES } from './stages/stage-4'
import { STAGE_5_PUZZLES } from './stages/stage-5'
import { META_PUZZLES } from './stages/metas'

export const ALL_PUZZLES: PuzzleNode[] = [
  ...STAGE_1_PUZZLES,
  ...STAGE_2_PUZZLES,
  ...STAGE_3_PUZZLES,
  ...META_PUZZLES,
  ...STAGE_4_PUZZLES,
  ...STAGE_5_PUZZLES,
]

export const PUZZLES_BY_CODE: Record<string, PuzzleNode> = ALL_PUZZLES.reduce(
  (acc, puzzle) => {
    acc[puzzle.code] = puzzle
    return acc
  },
  {} as Record<string, PuzzleNode>,
)

export const PUZZLES_BY_STAGE: Record<number, PuzzleNode[]> = ALL_PUZZLES.reduce(
  (acc, puzzle) => {
    if (!acc[puzzle.stage]) acc[puzzle.stage] = []
    acc[puzzle.stage].push(puzzle)
    return acc
  },
  {} as Record<number, PuzzleNode[]>,
)

export const PUZZLE_COUNT = ALL_PUZZLES.length
