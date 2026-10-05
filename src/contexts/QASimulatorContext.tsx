/* eslint-disable react-refresh/only-export-components */
/**
 * NEXUS — QA Simulator Context
 *
 * In-memory simulation that lets the QA harness walk the full player
 * experience end-to-end without touching production teams, players, scores,
 * or progress.
 *
 * The provider exposes a simulated AppContext surface (what useApp returns)
 * and a simulated game engine surface (what useGameEngine returns). Player
 * screens are unmodified — they consume useApp() and useGameEngine(), both of
 * which detect the QA context and delegate to the simulated data instead of
 * calling Supabase / edge functions.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
  useRef,
} from 'react'
import type {
  Player,
  Team,
  Role,
  GameState,
  TeamProgress,
  Notification,
  PuzzleStage,
} from '@/types'
import type {
  NodeDetailPlayerView,
  SubmissionResult,
  HintResult,
  LeaderboardEntry,
  NodeProgressEntry,
  NodeStatus,
  RoleContent,
  CoordinationChain,
  FailurePropagation,
  LocationClue,
  EvidenceUnlocked,
  InventoryItem,
  FragmentItem,
  EvidenceItem,
} from '@/types/game-engine'
import type { NodeProgress } from '@/types'
import { ALL_PUZZLES, PUZZLES_BY_CODE, PUZZLE_COUNT } from '@/content/puzzles'
import type { NodeIndexEntry } from '@/content/puzzles'
import { adminAPI } from '@/lib/admin'
import type { PuzzleQAEntry, QRCodeEntry } from '@/lib/admin'
import { buildDevelopmentCatalog } from '@/features/admin/evidenceLabCatalog'

export type SimulationType = 'FRESH' | 'PARTIAL' | 'COMPLETE' | 'CUSTOM'

export interface QASimulatorState {
  isActive: boolean
  role: Role
  simulationType: SimulationType
  solvedNodes: Set<string>
  currentNodeId: string | null
  availableNodeIds: string[]
  hintsUsed: number
  score: number
  elapsedMinutes: number
  isOffline: boolean
  isLocked: boolean
  evidenceLabMode: boolean
}

export interface QASimulatorControls {
  setRole: (role: Role) => void
  setSimulationType: (type: SimulationType) => void
  jumpToNode: (nodeId: string) => void
  switchLead: (nodeId: string) => void
  markSolved: (nodeId: string) => void
  markSkipped: (nodeId: string) => void
  resetSimulation: () => void
  advanceProgression: () => void
  toggleOffline: () => void
  toggleLock: () => void
  setCustomProgress: (patch: Partial<QASimulatorState>) => void
  revealAnswer: (nodeId?: string) => string | null
  forceSolve: (nodeId?: string) => void
  revealQR: (nodeId?: string) => string | null
  setEvidenceLabMode: (mode: boolean) => void
  simulateEvidenceUpdate: (code: string, newFields: Record<string, unknown>) => void
  clearWorkspace: () => void
}

export interface QAContextValue extends QASimulatorState, QASimulatorControls {
  /** Simulated player object (mirrors useApp.player) */
  player: Player
  /** Simulated team object (mirrors useApp.team) */
  team: Team
  /** All three simulated players with real role info */
  simulatedPlayers: { id: string; teamId: string; role: Role; displayName: string; status: string; joinedAt: string }[]
  /** Simulated game state */
  gameState: GameState | null
  teamProgress: TeamProgress | null
  notifications: Notification[]
  nodeProgress: NodeProgressEntry[]
  leaderboard: LeaderboardEntry[]
  inventory: { evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] } | null
  allNodesForMap: { code: string; title: string; location: string; stage: number; solved: boolean; available: boolean; isCurrent: boolean; locked: boolean }[]
  /** Simulated getNode — returns role-specific node detail */
  getNode: (nodeId: string, role?: Role) => Promise<NodeDetailPlayerView | null>
  /** Simulated submitAnswer */
  submitAnswer: (nodeId: string, answer: string) => Promise<SubmissionResult>
  requestHint: (nodeId: string, hintNumber: number) => Promise<HintResult>
  scanQR: (qrCode: string) => Promise<{ discovered: boolean; qrLabel?: string; nodeCode?: string; nodeTitle?: string; alreadyClaimed?: boolean; message?: string; error?: string }>
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  refreshGameState: () => Promise<void>
  refreshTeamProgress: () => Promise<void>
  fetchInventory: () => Promise<void>
  fetchLeaderboard: () => Promise<void>
  fetchNodeProgress: () => Promise<void>
  isInitializing: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  login: (accessCode: string, deviceInfo?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
}

const QASimulatorContext = createContext<QAContextValue | null>(null)

export { QASimulatorContext }
export type { Role }

export /**
 * Fold the simulator's own progress into a progress record.
 *
 * `buildDefaultPuzzleProgress` describes a case nobody has played yet: every
 * node locked, zero attempts, nothing solved. What the operator sees on the
 * board has to agree with what the register says, so nodes the run has actually
 * solved are marked solved and every node carries the attempts it has taken.
 */
function withSimulatedAttempts(
  base: Record<string, NodeProgress>,
  solved: ReadonlySet<string>,
  attempts: Record<string, number>,
): Record<string, NodeProgress> {
  const now = new Date().toISOString()
  const next: Record<string, NodeProgress> = {}
  for (const [code, progress] of Object.entries(base)) {
    const isSolved = solved.has(code)
    const attemptCount = attempts[code] ?? 0
    if (!isSolved && attemptCount === 0 && progress.status === 'LOCKED') {
      next[code] = progress
      continue
    }
    next[code] = {
      ...progress,
      status: isSolved ? 'SOLVED' : progress.status === 'LOCKED' ? 'AVAILABLE' : progress.status,
      startedAt: progress.startedAt ?? now,
      solvedAt: isSolved ? (progress.solvedAt ?? now) : null,
      attempts: attemptCount,
      hintsUsed: isSolved ? Math.max(progress.hintsUsed, 1) : progress.hintsUsed,
    }
  }
  return next
}

function buildDefaultPuzzleProgress(): Record<string, NodeProgress> {
  const record: Record<string, NodeProgress> = {}
  for (const puzzle of ALL_PUZZLES) {
    record[puzzle.code] = {
      nodeId: puzzle.id,
      status: 'LOCKED' as PuzzleStage,
      startedAt: null,
      solvedAt: null,
      attempts: 0,
      hintsUsed: 0,
      timeSpentSeconds: 0,
      solvedByRole: null,
      submissions: [],
    }
  }
  return record
}

function generateRoleContent(puzzle: NodeIndexEntry, role: Role): RoleContent {
  const basePrompt = {
    OBSERVER: `Scan the area for physical markers and report all visual anomalies to Analyst and Operator.`,
    ANALYST: `Cross-reference Observer findings against known patterns and produce a structured data packet for the Operator.`,
    OPERATOR: `Coordinate with Observer and Analyst to execute the final solution sequence.`,
  }[role]

  return {
    role,
    screenTitle: `${puzzle.name} — ${role} View`,
    dataPayload: `Simulated payload for ${puzzle.code} (${puzzle.type})`,
    visualType: puzzle.type === 'AUDIO' ? 'audio' : puzzle.type === 'VISUAL' ? 'image' : 'text',
    interactiveData: { simulated: true, puzzleType: puzzle.type },
    whatTheySee: `You are the ${role}. The ${puzzle.name} sits at ${puzzle.location}. Estimate: ${puzzle.time}.`,
    taskPrompt: basePrompt,
    intermediateOutput: `[REDACTED for QA — server would provide here]`,
  }
}

function generateNodeDetail(
  puzzle: NodeIndexEntry,
  role: Role,
  solved: boolean,
  qaData?: PuzzleQAEntry,
): NodeDetailPlayerView {
  const roleContent: RoleContent = qaData?.content?.[role.toLowerCase()] as RoleContent | undefined ?? generateRoleContent(puzzle, role)

  const coordinationChain: CoordinationChain = {
    observerProduces: `Observer reports visual data from ${puzzle.location}`,
    analystTransforms: `Analyst processes the data into actionable intel`,
    operatorExecutes: `Operator executes the solution and enters the answer`,
  }

  const failurePropagation: FailurePropagation = {
    wrongStep: `Incorrect answer or missed step on ${puzzle.name}`,
    consequence: 'Team loses time and hints; investigation stalls.',
    recoveryGuidance: 'Review role briefings and request a hint if stuck.',
  }

  const locationClue: LocationClue = {
    format: 'qr',
    clueText: `Physical marker found at ${puzzle.location}`,
    solution: `[Simulated]`,
    nextPhysicalLocation: puzzle.nextNodes?.[0]
      ? PUZZLES_BY_CODE[puzzle.nextNodes[0]]?.location ?? 'Unknown'
      : 'Investigation continues',
    nextQrNode: puzzle.nextNodes?.[0] ?? null,
    explanation: `${puzzle.name} leads to the next stage.`,
  }

  const evidenceUnlocked: EvidenceUnlocked | null = solved
    ? {
        id: `ev-${puzzle.code}`,
        category: puzzle.type,
        title: `${puzzle.name} — Evidence`,
        state: solved ? 'DISCOVERED' : 'LOCKED',
        timestamp: new Date().toISOString(),
        source: puzzle.code,
        content: `Simulated evidence from ${puzzle.name} at ${puzzle.location}.`,
      }
    : null

  return {
    unlocked: true,
    code: puzzle.code,
    title: puzzle.name,
    type: puzzle.type as string,
    difficulty: puzzle.difficulty,
    estimatedMinutes: puzzle.time ? parseTimeToMinutes(puzzle.time) : 5,
    location: puzzle.location,
    stage: puzzle.stage,
    narrativeObjective: `Investigate ${puzzle.name} at ${puzzle.location}.`,
    roleDependencyLevel: puzzle.type === 'FINAL_BOSS' ? 'TRIAD' : puzzle.type === 'META' ? 'PAIR' : 'SOLO',
    roleContent,
    operatorInvestigation:
      role === 'OPERATOR'
        ? {
            operatorOwnEvidence: `Operator-only evidence for ${puzzle.name}`,
            operatorTaskDescription: `Coordinate Observer and Analyst findings to solve ${puzzle.name}`,
            requiredDiscoveries: {
              observerDiscovery: `Observer must report from ${puzzle.location}`,
              analystDiscovery: 'Analyst must provide processed data',
            },
          }
        : null,
    coordinationChain,
    failurePropagation,
    locationClue,
    evidenceUnlocked,
    storyReveal: `Solving ${puzzle.name} reveals the next piece of the narrative.`,
    whyTeamworkMatters: `The ${role}'s unique perspective on ${puzzle.name} is essential for the team's success.`,
    branchConditions: [],
    points: puzzle.points,
  }
}

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+)([mh])/)
  if (!match) return 0
  const num = parseInt(match[1], 10)
  return match[2] === 'h' ? num * 60 : num
}

function computeAvailableNodes(
  solvedSet: Set<string>,
  currentId: string | null,
  simulationType: SimulationType,
): string[] {
  if (simulationType === 'COMPLETE') {
    return ALL_PUZZLES.filter(p => !solvedSet.has(p.code) && p.code !== currentId)
      .map(p => p.code)
  }

  if (simulationType === 'PARTIAL') {
    const available: string[] = []
    for (const puzzle of ALL_PUZZLES) {
      if (solvedSet.has(puzzle.code)) continue
      if (puzzle.code === currentId) continue
      if (puzzle.prerequisiteNodes.length === 0) {
        available.push(puzzle.code)
      } else if (puzzle.prerequisiteNodes.every(prereq => solvedSet.has(prereq))) {
        available.push(puzzle.code)
      }
    }
    return available
  }

  if (currentId) {
    return [currentId]
  }

  return ALL_PUZZLES.filter(p => p.prerequisiteNodes.length === 0).map(p => p.code)
}

function nodeStatus(puzzle: NodeIndexEntry, solvedSet: Set<string>, available: string[], currentId: string | null): NodeStatus {
  if (solvedSet.has(puzzle.code)) return 'SOLVED'
  if (currentId === puzzle.code) return 'IN_PROGRESS'
  if (available.includes(puzzle.code)) return 'AVAILABLE'
  return 'LOCKED'
}

function generateLeaderboard(_solvedCount: number, score: number): LeaderboardEntry[] {
  return [
    { rank: 1, teamName: 'QA Test Team', teamCode: 'QA001', score: score, status: 'RUNNING', elapsedMinutes: 45, playerCount: 3 },
    { rank: 2, teamName: 'Phantom Protocol', teamCode: 'TP002', score: Math.max(0, score - 200), status: 'ENDED', elapsedMinutes: 52, playerCount: 3 },
    { rank: 3, teamName: 'Echo Division', teamCode: 'ED003', score: Math.max(0, score - 500), status: 'ENDED', elapsedMinutes: 68, playerCount: 3 },
  ]
}

const EVIDENCE_EVOLUTION: Record<string, Array<{ solvedAt: number; content: Record<string, unknown> }>> = {
  'EVID-001': [
    {
      solvedAt: 1,
      content: {
        source: 'P01',
        detail: 'Entry timestamp discrepancy noted.',
      },
    },
    {
      solvedAt: 5,
      content: { timestamp: '2026-10-02T17:22:03Z' },
    },
    {
      solvedAt: 8,
      content: { location: 'ADMIN BUILDING / WEST WING' },
    },
    {
      solvedAt: 10,
      content: { device: 'LOG-SERVER-A', integrity: 'CORRUPTED' },
    },
  ],
  'EVID-002': [
    {
      solvedAt: 3,
      content: {
        source: 'P02',
        detail: 'Mechanism behind the clock face.',
      },
    },
    {
      solvedAt: 7,
      content: { location: 'CLOCK TOWER' },
    },
  ],
  'EVID-003': [
    {
      solvedAt: 9,
      content: {
        source: 'P05',
        detail: 'Unidentified figure visible in reflection.',
        image_url: '/evidence/photographs/photo_nx037_b_06.jpg',
      },
    },
    {
      solvedAt: 11,
      content: { timestamp: '2026-10-02T05:13:41Z', location: 'NORTH ENTRANCE / LOBBY', device: 'FIELD-CAM-02' },
    },
  ],
  'EVID-004': [
    {
      solvedAt: 13,
      content: {
        source: 'P06',
        detail: 'Scheduled at 03:00, but anomalies noted.',
      },
    },
    {
      solvedAt: 15,
      content: { location: 'SECTOR C / MAINTENANCE' },
    },
  ],
}

function generateInventory(
  solvedCount: number,
  fullUnlock = false,
  evidenceOverrides: Record<string, Array<{ solvedAt: number; content: Record<string, unknown> }>> = {},
): { evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] } {
  const evidence: EvidenceItem[] = []
  const inventory: InventoryItem[] = []
  const fragments: FragmentItem[] = []

  if (fullUnlock) {
    const catalog = buildDevelopmentCatalog()
    for (const item of catalog.evidence) {
      evidence.push({
        code: item.code,
        title: item.title,
        description: item.description,
        type: item.type,
        content: { ...item.content, condition: item.condition, classification: item.classification },
      })
    }
    for (const item of catalog.inventoryItems) {
      inventory.push({
        code: item.code,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
      })
    }
    for (const f of catalog.fragments) {
      fragments.push({
        code: f.code,
        label: f.label,
        content: f.content,
        type: f.type,
        role: f.role,
      })
    }
    return { evidence, inventory, fragments }
  }

  const evidenceBase: Record<string, { title: string; description: string; type: string }> = {
    'EVID-001': { title: 'Security Log Excerpt', description: 'Fragment of a security log from the admin building.', type: 'DOCUMENT' },
    'EVID-002': { title: 'Clock Tower Blueprint', description: 'Blueprints showing hidden compartments.', type: 'DOCUMENT' },
    'EVID-003': { title: 'Field Camera Photo', description: 'Security photograph from the north entrance.', type: 'IMAGE' },
    'EVID-004': { title: 'Maintenance Log', description: 'Routine maintenance log for sector C.', type: 'DOCUMENT' },
  }

  for (const [code, stages] of Object.entries(EVIDENCE_EVOLUTION)) {
    const base = evidenceBase[code]
    if (!base) continue

    const effectiveSolvedCount = fullUnlock ? Infinity : solvedCount
    const isAcquired = stages[0].solvedAt <= effectiveSolvedCount
    if (!isAcquired) continue

    const effectiveStages = evidenceOverrides[code] ? [...stages, ...evidenceOverrides[code]] : stages
    const content: Record<string, unknown> = {}
    for (const stage of effectiveStages) {
      if (stage.solvedAt <= effectiveSolvedCount) {
        Object.assign(content, stage.content)
      }
    }
    evidence.push({
      code,
      title: base.title,
      description: base.description,
      type: base.type,
      content,
    })
  }

  if (solvedCount > 5) {
    inventory.push({
      code: 'ITEM-001',
      name: 'Digital Lockpick',
      description: 'A tool for bypassing electronic locks.',
      type: 'DEVICE',
      rarity: 'RARE',
    })
  }
  if (solvedCount > 8) {
    fragments.push({
      code: 'FRAG-001',
      label: 'Fragment Alpha',
      content: 'The signal originates from the old comms array...',
      type: 'AUDIO',
      role: 'ANALYST',
    })
  }
  if (solvedCount > 10) {
    fragments.push({
      code: 'FRAG-002',
      label: 'Fragment Beta',
      content: 'Coordinates converge at the NEXUS CORE.',
      type: 'TEXT',
      role: 'OPERATOR',
    })
  }

  return { evidence, inventory, fragments }
}

function generateNotifications(solvedCount: number, role: Role): Notification[] {
  const notifs: Notification[] = [
    {
      id: 'notif-001',
      teamId: 'qa-team',
      targetRoles: 'ALL',
      type: 'SYSTEM',
      title: 'QA Simulation Active',
      message: 'You are in the QA Simulator. No real data is affected.',
      priority: 'HIGH',
      isRead: false,
      createdAt: new Date().toISOString(),
      readAt: null,
    },
  ]

  if (solvedCount > 0) {
    notifs.push({
      id: 'notif-002',
      teamId: 'qa-team',
      targetRoles: [role],
      type: 'PUZZLE_UNSOLVED' as Notification['type'],
      title: 'First Puzzle Solved',
      message: 'P01 has been solved. New nodes may be available.',
      priority: 'NORMAL',
      isRead: false,
      createdAt: new Date().toISOString(),
      readAt: null,
    })
  }

  return notifs
}

export function QASimulatorProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('OBSERVER')
  const [simulationType, setSimulationType] = useState<SimulationType>('FRESH')
  const [solvedNodes, setSolvedNodes] = useState<Set<string>>(new Set())
  // Re-synced on every render so it can be read synchronously inside an async
  // submit. Two submissions in one tick both close over the same `solvedNodes`,
  // and reading that snapshot is what let a double submit pay out twice.
  const solvedNodesRef = useRef<Set<string>>(solvedNodes)
  solvedNodesRef.current = solvedNodes
  // Markers this team has already claimed, read synchronously for the same
  // reason: a camera held on one marker fires a lookup repeatedly.
  const [scannedMarkers, setScannedMarkers] = useState<Set<string>>(new Set())
  const scannedMarkersRef = useRef<Set<string>>(scannedMarkers)
  scannedMarkersRef.current = scannedMarkers
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [score, setScore] = useState(0)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [evidenceLabMode, setEvidenceLabMode] = useState(false)
  const [localEvidenceOverrides, setLocalEvidenceOverrides] = useState<Record<string, Array<{ solvedAt: number; content: Record<string, unknown> }>>>({})
  const [puzzleQAData, setPuzzleQAData] = useState<Record<string, PuzzleQAEntry>>({})
  const [qrMarkers, setQrMarkers] = useState<QRCodeEntry[]>([])
  const [isQALoaded, setIsQALoaded] = useState(false)
  // The ref is the source of truth for counting, the state mirrors it for
  // rendering. Two submissions in the same tick would both read the same state
  // snapshot and both report the same attempt number.
  const attemptCountsRef = useRef<Record<string, number>>({})
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({})

  const isActive = true
  const isAuthenticated = true
  const isInitializing = false

  const loadPuzzleQA = useCallback(async () => {
    if (isQALoaded) return
    try {
      const data = await adminAPI.listPuzzleQA()
      const map: Record<string, PuzzleQAEntry> = {}
      for (const entry of data) {
        map[entry.code] = entry
      }
      setPuzzleQAData(map)
    } catch (_err) {
      // QA data is optional — simulator falls back to generated content
    }

    // Real markers, so a simulated scan is answered by the same lookup the
    // server performs. Without this the simulator carried its own client-side
    // registry of marker payloads, accepted those, and QA signed off on codes
    // that scan_qr_code rejects on every row.
    try {
      setQrMarkers(await adminAPI.listQRCodes())
    } catch (_err) {
      // Same: a scan that cannot be resolved is reported as unrecognised, which
      // is the truthful answer when the marker list is unavailable.
    } finally {
      setIsQALoaded(true)
    }
  }, [isQALoaded])

  useEffect(() => {
    void loadPuzzleQA()
  }, [loadPuzzleQA])

  const player: Player = useMemo(
    () => ({
      id: 'qa-player',
      teamId: 'qa-team',
      role,
      displayName: `QA ${role}`,
      joinedAt: new Date().toISOString(),
      isConnected: true,
      lastSeenAt: new Date().toISOString(),
      deviceInfo: undefined,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      loginCodeHash: null,
      authUserId: null,
      deviceSessionToken: null,
      deviceFingerprintHash: null,
    }),
    [role],
  )

  const team: Team = useMemo(
    () => ({
      id: 'qa-team',
      name: 'QA Simulation Team',
      code: 'QA001',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      currentNodeId,
      score,
      metadata: { registeredBy: 'ADMIN', assignedRoles: true },
    }),
    [currentNodeId, score],
  )

  const simulatedPlayers = useMemo(
    () => [
      { id: 'qa-player-obs', teamId: 'qa-team', role: 'OBSERVER' as Role, displayName: 'Alex Chen (OBSERVER)', joinedAt: new Date().toISOString(), isConnected: true, lastSeenAt: new Date().toISOString(), status: 'ACTIVE' as const, createdAt: new Date().toISOString() },
      { id: 'qa-player-ana', teamId: 'qa-team', role: 'ANALYST' as Role, displayName: 'Sam Rivera (ANALYST)', joinedAt: new Date().toISOString(), isConnected: true, lastSeenAt: new Date().toISOString(), status: 'ACTIVE' as const, createdAt: new Date().toISOString() },
      { id: 'qa-player-op', teamId: 'qa-team', role: 'OPERATOR' as Role, displayName: 'Morgan Taylor (OPERATOR)', joinedAt: new Date().toISOString(), isConnected: true, lastSeenAt: new Date().toISOString(), status: 'ACTIVE' as const, createdAt: new Date().toISOString() },
    ],
    [],
  )

  const availableNodeIds = useMemo(
    () => computeAvailableNodes(solvedNodes, currentNodeId, simulationType),
    [solvedNodes, currentNodeId, simulationType],
  )

  const solvedCount = solvedNodes.size

  const gameState: GameState = useMemo(
    () => ({
      status: solvedCount >= PUZZLE_COUNT - 1 ? 'ENDED' : 'RUNNING',
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + (180 - elapsedMinutes) * 60_000).toISOString(),
      currentPhase: solvedCount >= PUZZLE_COUNT - 1 ? 'DEBRIEF' : 'GAMEPLAY',
      config: {
        maxTeams: 25,
        playersPerTeam: 3,
        gameDurationMinutes: 180,
        rollingStartIntervalMinutes: 10,
        autoAssignRoles: false,
        requireAllRoles: true,
      },
    }),
    [solvedCount, elapsedMinutes],
  )

  const teamProgress: TeamProgress = useMemo(
    () => ({
      teamId: 'qa-team',
      solvedNodes: withSimulatedAttempts(buildDefaultPuzzleProgress(), solvedNodes, attemptCounts),
      currentNodeId,
      availableNodeIds,
      evidenceOwned: generateInventory(solvedCount).evidence.map(e => e.code),
      inventoryOwned: {},
      fragmentsOwned: generateInventory(solvedCount).fragments.map(f => f.code),
      score,
      hintsUsed,
      hintsAvailable: Math.max(0, 3 - hintsUsed),
      timeElapsedMinutes: elapsedMinutes,
      timeRemainingMinutes: Math.max(0, 180 - elapsedMinutes),
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      metadata: { branchPath: Array.from(solvedNodes), extraData: {} } as unknown as TeamProgress['metadata'],
    }),
    [currentNodeId, availableNodeIds, solvedCount, hintsUsed, elapsedMinutes, score, solvedNodes, attemptCounts],
  )

  const allNodesForMap = useMemo(() => {
    return ALL_PUZZLES.map(puzzle => {
      const status = nodeStatus(puzzle, solvedNodes, availableNodeIds, currentNodeId)
      return {
        code: puzzle.code,
        title: puzzle.name,
        location: puzzle.location,
        stage: puzzle.stage,
        solved: solvedNodes.has(puzzle.code),
        available: status === 'AVAILABLE',
        isCurrent: puzzle.code === currentNodeId,
        locked: status === 'LOCKED',
      }
    })
  }, [solvedNodes, availableNodeIds, currentNodeId])

  const nodeProgress: NodeProgressEntry[] = useMemo(() => {
    return ALL_PUZZLES.map(puzzle => {
      const progress = teamProgress.solvedNodes[puzzle.code]
      const status: NodeStatus = solvedNodes.has(puzzle.code)
        ? 'SOLVED'
        : puzzle.code === currentNodeId
          ? 'IN_PROGRESS'
          : availableNodeIds.includes(puzzle.code)
            ? 'AVAILABLE'
            : 'LOCKED'

      return {
        nodeId: puzzle.id,
        nodeCode: puzzle.code,
        title: puzzle.name,
        type: puzzle.type,
        stage: puzzle.stage,
        status,
        startedAt: progress?.startedAt ?? null,
        solvedAt: progress?.solvedAt ?? null,
        attempts: progress?.attempts ?? 0,
        hintsUsed: progress?.hintsUsed ?? 0,
        pointsAwarded: progress?.solvedAt ? puzzle.points : 0,
      }
    })
  }, [solvedNodes, currentNodeId, availableNodeIds, teamProgress.solvedNodes])

  const leaderboard = useMemo(() => generateLeaderboard(solvedCount, score), [solvedCount, score])

  const inventory = useMemo(() => {
    if (!teamProgress) return null
    return generateInventory(solvedCount, evidenceLabMode, localEvidenceOverrides)
  }, [teamProgress, solvedCount, evidenceLabMode, localEvidenceOverrides])

  const notifications = useMemo(() => generateNotifications(solvedCount, role), [solvedCount, role])

  const getNode = useCallback(
    async (nodeId: string, nodeRole?: Role): Promise<NodeDetailPlayerView | null> => {
      const puzzle = PUZZLES_BY_CODE[nodeId]
      if (!puzzle) return null

      const activeRole = (nodeRole as Role) ?? role
      const isSolved = solvedNodes.has(nodeId)

       return generateNodeDetail(
         puzzle,
         activeRole,
         isSolved,
         puzzleQAData[nodeId],
       )
    },
      [role, solvedNodes, puzzleQAData],
  )

  const submitAnswer = useCallback(
    async (nodeId: string, answer: string): Promise<SubmissionResult> => {
      const puzzle = PUZZLES_BY_CODE[nodeId]
      if (!puzzle || isLocked) {
        return {
          isCorrect: false,
          pointsAwarded: 0,
          attemptNumber: 0,
          nextNodeId: null,
          error: 'Node is locked or does not exist',
        }
      }

      if (isOffline) {
        return {
          isCorrect: false,
          pointsAwarded: 0,
          attemptNumber: 0,
          nextNodeId: null,
          queued: true,
          queuedAt: new Date().toISOString(),
        }
      }

      const qaEntry = puzzleQAData[nodeId]
      const accepted = qaEntry?.answerMetadata?.acceptedAnswer as string | undefined
      const method = (qaEntry?.answerMetadata?.validationMethod as string | undefined) ?? 'case_insensitive'

      let isCorrect = false
      if (accepted && accepted.length > 0) {
        if (method === 'exact') {
          isCorrect = answer === accepted
        } else {
          isCorrect = answer.toUpperCase().trim() === accepted.toUpperCase().trim()
        }
      }

      // A real attempt count, by puzzle.
      //
      // This used to be `solvedNodes.has(nodeId) ? 1 : 1` - a ternary with two
      // identical branches, so every submission reported attempt 1 no matter
      // how many times it had been tried. Combined with a node view that
      // hardcoded `attempts: 0`, the simulator could not express anything that
      // depends on the attempt number: the third-attempt hint penalty, an
      // exhausted-attempts message, an operator watching a counter climb. The
      // whole point of the QA tool is to reach states production will not
      // produce on demand.
      const attemptNumber = (attemptCountsRef.current[nodeId] ?? 0) + 1
      attemptCountsRef.current = { ...attemptCountsRef.current, [nodeId]: attemptNumber }
      setAttemptCounts(attemptCountsRef.current)

      const pointsAwarded = isCorrect ? puzzle.points : 0

      // A once-only claim, decided synchronously.
      //
      // `solvedNodes` is the state as of this render, so two submissions in the
      // same tick - a double click, or a retry firing before the first resolves
      // - both read it as "not solved" and both ran setScore(prev => prev +
      // points). A double submit paid double, in the very tool a tester would
      // use to confirm that a double submit does not.
      //
      // The server settles this with one transaction that moves the node out of
      // a non-solved status and pays out only if that transaction changed the
      // row. The simulator now decides the same claim the same way: the first
      // caller to get here wins, and the loser is told the truth.
      const alreadySolved = solvedNodesRef.current.has(nodeId)
      if (isCorrect && !alreadySolved) {
        const next = new Set([...solvedNodesRef.current, nodeId])
        solvedNodesRef.current = next
        setSolvedNodes(next)
        setScore(prev => prev + pointsAwarded)

        const nextCode = puzzle.nextNodes?.[0] ?? null
        if (nextCode && PUZZLES_BY_CODE[nextCode]) {
          setCurrentNodeId(nextCode)
        }
      }

      const nextId = puzzle.nextNodes?.[0] ?? null
      const paidPoints = isCorrect && alreadySolved ? 0 : pointsAwarded
      return {
        isCorrect,
        pointsAwarded: paidPoints,
        attemptNumber,
        nextNodeId: nextId,
        ...(isCorrect
          ? (alreadySolved ? { alreadySolved: true } : {})
          : {
              error: 'Incorrect answer',
            }),
      }
    },
[isLocked, isOffline, puzzleQAData],
  )
  const requestHint = useCallback(
    async (_nodeId: string, hintNumber: number): Promise<HintResult> => {
      if (isOffline) {
        throw new Error('Cannot request hints while offline. Restore connection to continue.')
      }
      if (isLocked) {
        throw new Error('Game is locked.')
      }

      const hints = [
        `Hint ${hintNumber}: Examine the location details carefully.`,
        `Hint ${hintNumber}: Consider your role's unique perspective on this puzzle.`,
        `Hint ${hintNumber}: The answer relates to the puzzle's theme and stage.`,
      ]

      setHintsUsed(prev => prev + 1)

      return {
        hint: hints[Math.min(hintNumber - 1, hints.length - 1)],
        penaltySeconds: 30,
      }
    },
    [isOffline, isLocked],
  )

  /** The shape a simulated scan answers with; mirrors the server's response. */
interface SimulatedScanResult {
  discovered: boolean
  qrLabel?: string
  nodeCode?: string
  nodeTitle?: string
  alreadyClaimed?: boolean
  message?: string
  reason?: string
  error?: string
  markerId?: string
  manualCode?: string
  deploymentStatus?: string
  qrCode?: string
}

/**
   * Resolve a scanned marker the way scan_qr_code does.
   *
   * The exact-match rule against qr_nodes.code / marker_id / manual_code is the
   * production contract, so the simulator uses the real rows and the same rule.
   * It previously carried its own client-side registry of `NX|V1|...` payloads
   * and accepted those, which meant a QA pass on the scanner proved the scanner
   * works against codes that fail on every marker actually on the wall.
   */
  const scanQR = useCallback(
    async (qrCode: string): Promise<SimulatedScanResult> => {
      if (isOffline) {
        return {
          discovered: false,
          message: 'Cannot scan while offline.',
          error: 'offline',
        }
      }

      const submitted = qrCode.trim()
      const marker = qrMarkers.find(
        m =>
          m.code === submitted ||
          m.markerId === submitted ||
          m.manualCode === submitted,
      )

      if (!marker) {
        return {
          discovered: false,
          message:
            'UNRECOGNISED MARKER. This code is not registered with the Bureau. Check the marker, or enter the manual reference printed beneath it.',
          error: 'Invalid QR code',
        }
      }

      // Whether this team has already claimed this marker. The server keeps
      // `discovered_by_team_id` on the marker and refuses a repeat with
      // {discovered:false, alreadyClaimed:true, qrCode}. The simulator used to
      // answer `discovered: true` for every scan, so a tester holding a camera
      // steady on one marker was shown a fresh discovery every single time and
      // would have signed off on duplicate-scan behaviour production refuses.
      const alreadyClaimed = scannedMarkersRef.current.has(marker.code)
      if (alreadyClaimed) {
        return {
          discovered: false,
          alreadyClaimed: true,
          nodeCode: marker.puzzleNodeCode,
          qrCode: marker.code,
          message: 'ALREADY RECORDED. Your team has used this marker.',
        }
      }

      // The server only records a scan for a puzzle this team has actually been
      // given, and says so plainly rather than pretending the marker is unknown.
      if (marker.puzzleNodeCode) {
        const isSolved = solvedNodes.has(marker.puzzleNodeCode)
        const isOpen =
          marker.puzzleNodeCode === currentNodeId ||
          availableNodeIds.includes(marker.puzzleNodeCode)

        if (!isOpen) {
          return {
            discovered: false,
            nodeCode: marker.puzzleNodeCode,
            alreadyClaimed: isSolved,
            message: isSolved
              ? 'ALREADY RECORDED. Your team has used this marker. Nothing further is unlocked here.'
              : 'SEALED. This marker points to a lead your team has not been given yet.',
            reason: 'node_not_open',
          }
        }

        const claimed = new Set([...scannedMarkersRef.current, marker.code])
        scannedMarkersRef.current = claimed
        setScannedMarkers(claimed)

        return {
          discovered: true,
          alreadyClaimed: false,
          nodeCode: marker.puzzleNodeCode,
          nodeTitle: marker.puzzleNodeTitle,
        }
      }

      const claimed = new Set([...scannedMarkersRef.current, marker.code])
      scannedMarkersRef.current = claimed
      setScannedMarkers(claimed)

      return {
        discovered: true,
        alreadyClaimed: false,
        qrLabel: marker.label,
        markerId: marker.markerId ?? undefined,
        manualCode: marker.manualCode ?? undefined,
        deploymentStatus: marker.deploymentStatus,
        qrCode: marker.code,
      }
    },
    [isOffline, qrMarkers, solvedNodes, currentNodeId, availableNodeIds],
  )

  const markNotificationRead = useCallback((_id: string) => {
    // noop in simulation — notifications regenerate each render
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    // noop in simulation
  }, [])

  const refreshGameState = useCallback(async () => {
    // noop — state is derived from React state
  }, [])

  const refreshTeamProgress = useCallback(async () => {
    // noop — state is derived from React state
  }, [])

  const fetchInventory = useCallback(async () => {
    // noop — inventory is memoized
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    // noop — leaderboard is memoized
  }, [])

  const fetchNodeProgress = useCallback(async () => {
    // noop — node progress is derived
  }, [])

  const resetSimulation = useCallback(() => {
    setSolvedNodes(prev => (prev.size === 0 ? prev : new Set()))
    // A new case has claimed nothing.
    scannedMarkersRef.current = new Set()
    setScannedMarkers(new Set())
    setCurrentNodeId(null)
    setHintsUsed(0)
    setScore(0)
    setElapsedMinutes(0)
    setIsOffline(false)
    setIsLocked(false)
    setEvidenceLabMode(false)
    setLocalEvidenceOverrides({})
    attemptCountsRef.current = {}
    setAttemptCounts({})
    setSimulationType('FRESH')
  }, [])

  const advanceProgression = useCallback(() => {
    setSolvedNodes(prev => {
      const allIds = ALL_PUZZLES.map(p => p.code)
      const unsolved = allIds.filter(id => !prev.has(id))
      if (unsolved.length > 0) {
        const next = unsolved[0]
        return new Set([...prev, next])
      }
      return prev
    })
  }, [])

  const jumpToNode = useCallback((nodeId: string) => {
    const puzzle = PUZZLES_BY_CODE[nodeId]
    if (puzzle) {
      setCurrentNodeId(puzzle.code)
    }
  }, [])

  const switchLead = useCallback((nodeId: string) => {
    const puzzle = PUZZLES_BY_CODE[nodeId]
    if (puzzle) {
      setCurrentNodeId(puzzle.code)
    }
  }, [])

  const markSolved = useCallback((nodeId: string) => {
    const puzzle = PUZZLES_BY_CODE[nodeId]
    if (puzzle) {
      setSolvedNodes(prev => new Set([...prev, nodeId]))
      setScore(prev => prev + puzzle.points)
    }
  }, [])

  const markSkipped = useCallback((nodeId: string) => {
    // Mark as solved without awarding points (simulation helper)
    setSolvedNodes(prev => new Set([...prev, nodeId]))
  }, [])

  const revealAnswer = useCallback((nodeId?: string): string | null => {
    const targetId = nodeId ?? currentNodeId
    if (!targetId) return null
    const entry = puzzleQAData[targetId]
    return entry?.answerMetadata?.acceptedAnswer as string | null ?? null
  }, [currentNodeId, puzzleQAData])

  const forceSolve = useCallback((nodeId?: string) => {
    const targetId = nodeId ?? currentNodeId
    if (!targetId) return
    const puzzle = PUZZLES_BY_CODE[targetId]
    if (!puzzle) return

    setSolvedNodes(prev => new Set([...prev, targetId]))
    setScore(prev => prev + puzzle.points)

    const nextCode = puzzle.nextNodes?.[0] ?? null
    if (nextCode && PUZZLES_BY_CODE[nextCode]) {
      setCurrentNodeId(nextCode)
    }
  }, [currentNodeId])

  const revealQR = useCallback((nodeId?: string): string | null => {
    const targetId = nodeId ?? currentNodeId
    if (!targetId) return null
    const puzzle = PUZZLES_BY_CODE[targetId]
    if (!puzzle) return null
    const num = parseInt(puzzle.code.replace(/\D/g, ''), 10)
    if (!Number.isNaN(num) && num > 0) {
      return `QR-NODE-${String(num + 1).padStart(2, '0')}`
    }
    return null
  }, [currentNodeId])

  const toggleOffline = useCallback(() => setIsOffline(prev => !prev), [])
  const toggleLock = useCallback(() => setIsLocked(prev => !prev), [])

  const setCustomProgress = useCallback((patch: Partial<QASimulatorState>) => {
    if (patch.role !== undefined) setRole(patch.role)
    if (patch.simulationType !== undefined) {
      setSimulationType(patch.simulationType)
      if (patch.simulationType === 'FRESH') {
        setSolvedNodes(new Set())
        setCurrentNodeId(null)
        setScore(0)
        setHintsUsed(0)
      } else if (patch.simulationType === 'PARTIAL') {
        const firstFew = ALL_PUZZLES.slice(0, 5).map(p => p.code)
        setSolvedNodes(new Set(firstFew))
        setCurrentNodeId(firstFew[firstFew.length - 1])
        setScore(firstFew.length * 50)
      } else if (patch.simulationType === 'COMPLETE') {
        const allSolved = ALL_PUZZLES.slice(0, -1).map(p => p.code)
        setSolvedNodes(new Set(allSolved))
        setCurrentNodeId('P36')
        setScore(allSolved.reduce((acc, code) => acc + (PUZZLES_BY_CODE[code]?.points ?? 0), 0))
      }
    }
    if (patch.currentNodeId !== undefined) setCurrentNodeId(patch.currentNodeId)
    if (patch.solvedNodes !== undefined) setSolvedNodes(patch.solvedNodes)
    if (patch.hintsUsed !== undefined) setHintsUsed(patch.hintsUsed)
    if (patch.isOffline !== undefined) setIsOffline(patch.isOffline)
    if (patch.isLocked !== undefined) setIsLocked(patch.isLocked)
  }, [])

  const logout = useCallback(async () => {
    // noop in QA — stays in simulation
  }, [])

  const login = useCallback(
    async (_accessCode: string, _deviceInfo?: Record<string, unknown>) => {
      return { success: true }
    },
    [],
  )

  const handleSetEvidenceLabMode = useCallback((mode: boolean) => {
    setEvidenceLabMode(mode)
  }, [])

  const simulateEvidenceUpdate = useCallback((code: string, newFields: Record<string, unknown>) => {
    const existingKey = Object.keys(EVIDENCE_EVOLUTION).find(k => k.startsWith(code))
    if (!existingKey) return
    const stages = [...EVIDENCE_EVOLUTION[existingKey]]
    stages.push({ solvedAt: 999, content: newFields })
    setLocalEvidenceOverrides(prev => ({ ...prev, [existingKey]: stages }))
  }, [])

  const clearWorkspace = useCallback(() => {
    const key = `nexus_case_workspace_v1:qa-team`
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key)
      if (typeof window !== 'undefined') window.dispatchEvent(new StorageEvent('storage', { key }))
    } catch {
      // noop
    }
  }, [])

  const value = useMemo(
    (): QAContextValue => ({
      isActive,
      role,
      simulationType,
      solvedNodes,
      currentNodeId,
      availableNodeIds,
      hintsUsed,
      score,
      elapsedMinutes,
      isOffline,
    isLocked,
    evidenceLabMode,
    setEvidenceLabMode: handleSetEvidenceLabMode,
    simulateEvidenceUpdate,
    clearWorkspace,
    setRole,
      setSimulationType,
      jumpToNode,
      switchLead,
      markSolved,
      markSkipped,
      resetSimulation,
      advanceProgression,
      toggleOffline,
      toggleLock,
      setCustomProgress,
      revealAnswer,
      forceSolve,
      revealQR,
      player,
      team,
      simulatedPlayers,
      gameState,
      teamProgress,
      notifications,
      nodeProgress,
      leaderboard,
      inventory,
      allNodesForMap,
      getNode,
      submitAnswer,
      requestHint,
      scanQR,
      markNotificationRead,
      markAllNotificationsRead,
      refreshGameState,
      refreshTeamProgress,
      fetchInventory,
      fetchLeaderboard,
      fetchNodeProgress,
      isInitializing,
      isAuthenticated,
      logout,
      login,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      role,
      simulationType,
      solvedNodes,
      currentNodeId,
      availableNodeIds,
      hintsUsed,
      score,
      elapsedMinutes,
      isOffline,
       isLocked,
       evidenceLabMode,
        player,
       team,
       simulatedPlayers,
       gameState,
      teamProgress,
      notifications,
      nodeProgress,
      leaderboard,
      inventory,
      getNode,
      submitAnswer,
      requestHint,
      scanQR,
      isInitializing,
      isAuthenticated,
    ],
  )

  return <QASimulatorContext.Provider value={value}>{children}</QASimulatorContext.Provider>
}

export function useQA() {
  const context = useContext(QASimulatorContext)
  if (!context) {
    throw new Error('useQA must be used within a QASimulatorProvider')
  }
  return context
}

export function useQASimulator() {
  return useQA()
}
