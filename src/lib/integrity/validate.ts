/**
 * NEXUS — Game Integrity Checks
 *
 * Before an event, an operator needs to know that the graph they are about to
 * hand to a hundred students is coherent: every marker resolves, every marker
 * points somewhere real, every puzzle has a way out, and nothing is reachable
 * only by accident.
 *
 * These checks are pure functions over the rows the admin API already fetches.
 * They deliberately do not touch the database, so they can be unit-tested against
 * hand-built fixtures — including the broken shapes that are hard to reproduce on
 * a live database — and they can also run against real data in the admin UI.
 *
 * Severity is split because the responses differ:
 *
 *   BLOCKER — players will hit this. A marker that resolves to nothing, a puzzle
 *             that dead-ends, a team that cannot finish.
 *   WARNING — probably intended, but the operator should confirm it.
 *   INFO    — worth knowing at a glance (counts, coverage).
 */

export interface IntegrityNode {
  id: string
  code: string
  title?: string | null
  type?: string | null
  stage?: number | null
  /** `branches->>'unlocks'` — the single code this node opens. */
  unlocks?: string | null
  isFinale?: boolean | null
}

export interface IntegrityMarker {
  id: string
  /** `qr_nodes.code` — what the QR image encodes. */
  code: string
  markerId?: string | null
  manualCode?: string | null
  /** `qr_nodes.puzzle_node_id` — what a successful scan unlocks. */
  puzzleNodeId?: string | null
  deploymentStatus?: string | null
  deploymentBatch?: string | null
}

export interface IntegrityLocation {
  nodeId: string
  status?: string | null
}

export type Severity = 'BLOCKER' | 'WARNING' | 'INFO'

export interface IntegrityIssue {
  severity: Severity
  code:
    | 'DUPLICATE_MARKER_CODE'
    | 'DUPLICATE_MARKER_ID'
    | 'DUPLICATE_MANUAL_CODE'
    | 'DUPLICATE_NODE_CODE'
    | 'MARKER_UNASSIGNED'
    | 'MARKER_ORPHANED'
    | 'NODE_WITHOUT_MARKER'
    | 'NODE_DEAD_END'
    | 'NODE_UNREACHABLE'
    | 'UNLOCK_TARGET_MISSING'
    | 'LOCATION_INACTIVE'
    | 'SUMMARY'
  message: string
  /** Node code, marker code, or other handle an operator can search for. */
  ref?: string
}

export interface IntegrityReport {
  issues: IntegrityIssue[]
  blockers: number
  warnings: number
  counts: {
    nodes: number
    markers: number
    assignedMarkers: number
    unassignedMarkers: number
    nodesWithMarkers: number
    reachableNodes: number
  }
  /** True when the deployment can be handed to players. */
  playable: boolean
}

/** Finale nodes legitimately have no successor. */
function isFinaleNode(node: IntegrityNode): boolean {
  return node.isFinale === true || node.type === 'FINAL_BOSS'
}

function tally<T>(items: T[], key: (item: T) => string | null | undefined): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    if (!k) continue
    const bucket = out.get(k)
    if (bucket) bucket.push(item)
    else out.set(k, [item])
  }
  return out
}

export function validateGameIntegrity(
  nodes: IntegrityNode[],
  markers: IntegrityMarker[],
  locations: IntegrityLocation[] = [],
): IntegrityReport {
  const issues: IntegrityIssue[] = []

  const nodesByCode = new Map<string, IntegrityNode>()
  const nodesById = new Map<string, IntegrityNode>()
  for (const n of nodes) {
    if (n.code) nodesByCode.set(n.code, n)
    if (n.id) nodesById.set(n.id, n)
  }

  // --- duplicate identifiers -------------------------------------------------
  // A duplicate code means one of the two can never be scanned or submitted to:
  // the lookup returns the first match every time.
  for (const [code, dupes] of tally(nodes, n => n.code)) {
    if (dupes.length > 1) {
      issues.push({
        severity: 'BLOCKER',
        code: 'DUPLICATE_NODE_CODE',
        message: `${dupes.length} puzzle nodes share the code ${code}. Only the first can ever be resolved.`,
        ref: code,
      })
    }
  }

  for (const [code, dupes] of tally(markers, m => m.code)) {
    if (dupes.length > 1) {
      issues.push({
        severity: 'BLOCKER',
        code: 'DUPLICATE_MARKER_CODE',
        message: `${dupes.length} markers share the code ${code}. A scan of that code is ambiguous.`,
        ref: code,
      })
    }
  }

  for (const [id, dupes] of tally(markers, m => m.markerId)) {
    if (dupes.length > 1) {
      issues.push({
        severity: 'BLOCKER',
        code: 'DUPLICATE_MARKER_ID',
        message: `${dupes.length} markers share the printed marker id ${id}. Players scanning it cannot be told which is which.`,
        ref: id,
      })
    }
  }

  for (const [code, dupes] of tally(markers, m => m.manualCode)) {
    if (dupes.length > 1) {
      issues.push({
        severity: 'BLOCKER',
        code: 'DUPLICATE_MANUAL_CODE',
        message: `${dupes.length} markers share the manual code ${code}. Manual entry becomes ambiguous.`,
        ref: code,
      })
    }
  }

  // --- marker wiring ---------------------------------------------------------
  const nodesWithMarkers = new Set<string>()
  let assignedMarkers = 0

  for (const marker of markers) {
    const target = marker.puzzleNodeId
    if (!target) {
      // Printing an unassigned marker is the classic event-day mistake: the code
      // goes on the wall, it scans fine, and it unlocks nothing.
      issues.push({
        severity: 'BLOCKER',
        code: 'MARKER_UNASSIGNED',
        message: `Marker ${marker.code} is not assigned to any puzzle. Scanning it will resolve nothing.`,
        ref: marker.code,
      })
      continue
    }
    assignedMarkers += 1
    const node = nodesById.get(target)
    if (!node) {
      issues.push({
        severity: 'BLOCKER',
        code: 'MARKER_ORPHANED',
        message: `Marker ${marker.code} points at puzzle node id ${target}, which does not exist.`,
        ref: marker.code,
      })
      continue
    }
    nodesWithMarkers.add(node.code)
  }

  // --- progression wiring ----------------------------------------------------
  const reachable = new Set<string>()

  for (const node of nodes) {
    if (!node.code) continue

    if (!nodesWithMarkers.has(node.code)) {
      // Not necessarily fatal: a node can be reached by unlocking rather than by
      // scanning. Reported so the operator can confirm that is intended.
      issues.push({
        severity: 'WARNING',
        code: 'NODE_WITHOUT_MARKER',
        message: `Puzzle ${node.code} has no marker assigned. Players cannot scan their way to it.`,
        ref: node.code,
      })
    }

    if (isFinaleNode(node)) {
      reachable.add(node.code)
      continue
    }

    const next = node.unlocks?.trim()
    if (!next) {
      issues.push({
        severity: 'BLOCKER',
        code: 'NODE_DEAD_END',
        message: `Puzzle ${node.code} is not a finale and unlocks nothing, so a team that solves it has nowhere to go.`,
        ref: node.code,
      })
      continue
    }

    if (!nodesByCode.has(next)) {
      issues.push({
        severity: 'BLOCKER',
        code: 'UNLOCK_TARGET_MISSING',
        message: `Puzzle ${node.code} unlocks ${next}, which does not exist. Solving ${node.code} ends the run.`,
        ref: node.code,
      })
      continue
    }
    reachable.add(next)
  }

  // A node nobody arrives at and that is not the opener is unreachable. Roots are
  // whatever nobody unlocks.
  const unlockedBySomething = new Set(
    nodes.map(n => n.unlocks?.trim()).filter((c): c is string => !!c && nodesByCode.has(c)),
  )
  for (const node of nodes) {
    if (!node.code) continue
    if (isFinaleNode(node)) continue
    if (!unlockedBySomething.has(node.code)) {
      issues.push({
        severity: 'INFO',
        code: 'NODE_UNREACHABLE',
        message: `Puzzle ${node.code} is not unlocked by any other puzzle. It is only reachable as an opening node.`,
        ref: node.code,
      })
    }
  }

  // --- location overrides ----------------------------------------------------
  for (const loc of locations) {
    if (loc.status && loc.status.toUpperCase() === 'ACTIVE') {
      issues.push({
        severity: 'INFO',
        code: 'LOCATION_INACTIVE',
        message: `Node ${loc.nodeId} has an active location override; players see the overridden text.`,
        ref: loc.nodeId,
      })
    }
  }

  const blockers = issues.filter(i => i.severity === 'BLOCKER').length
  const warnings = issues.filter(i => i.severity === 'WARNING').length

  issues.push({
    severity: 'INFO',
    code: 'SUMMARY',
    message:
      `${nodes.length} puzzles, ${markers.length} markers, ${assignedMarkers} assigned, ` +
      `${nodesWithMarkers.size} puzzles reachable by scanning, ${warnings} warning(s).`,
  })

  return {
    issues,
    blockers,
    warnings,
    counts: {
      nodes: nodes.length,
      markers: markers.length,
      assignedMarkers,
      unassignedMarkers: markers.length - assignedMarkers,
      nodesWithMarkers: nodesWithMarkers.size,
      reachableNodes: reachable.size,
    },
    playable: blockers === 0,
  }
}

/** Issues that must be resolved before players arrive, worst first. */
export function blockersOf(report: IntegrityReport): IntegrityIssue[] {
  return report.issues.filter(i => i.severity === 'BLOCKER')
}
