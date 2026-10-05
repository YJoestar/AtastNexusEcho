/**
 * NEXUS — the Current Lead
 *
 * The case home used to render the current node's title and its `location` string
 * as the lead. That is a quest marker: it tells the team where to go instead of
 * what to think about, which removes the moment the game actually wants — "that
 * points to *that* place".
 *
 * The authored material already existed and was never rendered. The server
 * returns, per node and per role:
 *
 *   narrativeObjective   what this step is investigating
 *   locationClue         clueText — the observable fact that suggests a direction
 *                        nextPhysicalLocation / nextQrNode — the answer, which the
 *                        player must infer and which this module never returns
 *
 * A lead is therefore built from the objective and the clue, never from the
 * destination. `assertNoDestination` exists so that a future edit which wires the
 * location back in fails a test rather than quietly turning the game into a
 * waypoint list.
 *
 * Pure and dependency-free: the node view is passed in, so this is unit-testable
 * without a database or a role.
 */

import type { PlayerNodeView } from '@/hooks/useGameEngine'

export enum LeadStatus {
  UNBRIEFED = 'UNBRIEFED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export interface CaseLead {
  status: LeadStatus
  eyebrow: string
  objective: string
  clue: string | null
  nodeCode: string
  nodeTitle: string
  stage: number
  degraded: boolean
  sourceNodeId?: string
}

/** Fields that would turn a lead back into a waypoint if they were ever rendered. */
const DESTINATION_FIELDS = ['nextPhysicalLocation', 'nextQrNode'] as const

function eyebrowFor(stage: number, hasObjective: boolean, status: LeadStatus): string {
  const stageLabel = stage > 0 ? `LEAD · STAGE ${stage}` : 'LEAD'
  if (status === LeadStatus.UNBRIEFED) return `${stageLabel} · UNBRIEFED`
  if (status === LeadStatus.PAUSED) return `${stageLabel} · PAUSED`
  if (status === LeadStatus.COMPLETED) return `${stageLabel} · COMPLETED`
  if (status === LeadStatus.ABANDONED) return `${stageLabel} · ABANDONED`
  return hasObjective ? stageLabel : `${stageLabel} · UNBRIEFED`
}

/**
 * Build the case lead for a node.
 *
 * `null` in, `null` out: a team with no current node has no lead, and the caller
 * renders its own case-closed or case-not-open state rather than inventing one.
 */
export function buildCaseLead(
  node: PlayerNodeView | null | undefined,
  teamStatus?: string,
): CaseLead | null {
  if (!node || !node.code) return null

  const objective = typeof node.narrativeObjective === 'string' ? node.narrativeObjective.trim() : ''
  const clueText =
    typeof node.locationClue?.clueText === 'string' ? node.locationClue.clueText.trim() : ''

  const degraded = objective.length === 0
  const status = deriveLeadStatus(node, teamStatus)
  const nodeStage = node.stage ?? 0

  return {
    status,
    eyebrow: eyebrowFor(nodeStage, !degraded, status),
    objective: degraded ? node.title : objective,
    clue: clueText.length > 0 ? clueText : null,
    nodeCode: node.code,
    nodeTitle: node.title,
    stage: nodeStage,
    degraded,
    sourceNodeId: node.code,
  }
}

function deriveLeadStatus(node: PlayerNodeView, teamStatus?: string): LeadStatus {
  if (node.isSolved) return LeadStatus.COMPLETED
  if (!node.isCurrent && !node.isNextUp) return LeadStatus.ABANDONED
  if (teamStatus === 'PAUSED') return LeadStatus.PAUSED
  if (!node.narrativeObjective || node.narrativeObjective.trim().length === 0) return LeadStatus.UNBRIEFED
  return LeadStatus.ACTIVE
}

/**
 * True when `text` names a concrete destination rather than describing something
 * to reason about.
 *
 * This is a guard on *authored content*, not a filter on the UI: an operator who
 * writes "go to the library" into `narrativeObjective` has authored a quest
 * marker, and the admin integrity check should say so. Kept deliberately narrow —
 * it looks for imperative navigation verbs, not for place names, because a lead
 * is allowed to mention a building as an observation ("the north stairwell log
 * records…") without telling the team to walk there.
 */
const IMPERATIVE_DESTINATION = /\b(go|head|walk|travel|proceed|move)\s+(to|down|up|over|toward[s]?)\b/i

export function readsAsWaypoint(text: string | null | undefined): boolean {
  if (!text) return false
  return IMPERATIVE_DESTINATION.test(text)
}

/**
 * Diagnostic used by the admin integrity check: reports the destination fields a
 * lead object was about to expose. Always empty for a correctly built lead.
 */
export function assertNoDestination(lead: CaseLead): string[] {
  const leaked: string[] = []
  for (const field of DESTINATION_FIELDS) {
    if (field in (lead as unknown as Record<string, unknown>)) {
      leaked.push(field)
    }
  }
  return leaked
}
