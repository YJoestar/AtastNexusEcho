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
  ReactNode,
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
import { validateAnyCode, toQRScanResult } from '@/lib/qr'

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
}

export interface QASimulatorControls {
  setRole: (role: Role) => void
  setSimulationType: (type: SimulationType) => void
  jumpToNode: (nodeId: string) => void
  markSolved: (nodeId: string) => void
  markSkipped: (nodeId: string) => void
  resetSimulation: () => void
  advanceProgression: () => void
  toggleOffline: () => void
  toggleLock: () => void
  setCustomProgress: (patch: Partial<QASimulatorState>) => void
}

export interface QAContextValue extends QASimulatorState, QASimulatorControls {
  /** Simulated player object (mirrors useApp.player) */
  player: Player
  /** Simulated team object (mirrors useApp.team) */
  team: Team
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

export function buildDefaultPuzzleProgress(): Record<string, NodeProgress> {
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
): NodeDetailPlayerView {
  const roleContent = solved ? null : generateRoleContent(puzzle, role)

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

function generateInventory(solvedCount: number): { evidence: EvidenceItem[]; inventory: InventoryItem[]; fragments: FragmentItem[] } {
  const evidence: EvidenceItem[] = []
  const inventory: InventoryItem[] = []
  const fragments: FragmentItem[] = []

  if (solvedCount > 0) {
    evidence.push({
      code: 'EVID-001',
      title: 'Security Log Excerpt',
      description: 'Fragment of a security log from the admin building',
      type: 'DOCUMENT',
      content: { source: 'P01', detail: 'Entry timestamp discrepancy noted.' },
    })
  }
  if (solvedCount > 2) {
    evidence.push({
      code: 'EVID-002',
      title: 'Clock Tower Blueprint',
      description: 'Blueprints showing hidden compartments',
      type: 'DOCUMENT',
      content: { source: 'P02', detail: 'Mechanism behind the clock face.' },
    })
  }
  if (solvedCount > 5) {
    inventory.push({
      code: 'ITEM-001',
      name: 'Digital Lockpick',
      description: 'A tool for bypassing electronic locks',
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
      content: 'Coordinates converge at the NEXUS CORE',
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
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [score, setScore] = useState(0)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const isActive = true
  const isAuthenticated = true
  const isInitializing = false

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
      solvedNodes: buildDefaultPuzzleProgress(),
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
    [currentNodeId, availableNodeIds, solvedCount, hintsUsed, elapsedMinutes, score, solvedNodes],
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
    return generateInventory(solvedCount)
  }, [teamProgress, solvedCount])

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
      )
    },
     [role, solvedNodes],
  )

  const submitAnswer = useCallback(
    async (nodeId: string, _answer: string): Promise<SubmissionResult> => {
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

      const isCorrect = true
      const pointsAwarded = puzzle.points

      if (isCorrect && !solvedNodes.has(nodeId)) {
        setSolvedNodes(prev => new Set([...prev, nodeId]))
        setScore(prev => prev + pointsAwarded)
        setHintsUsed(prev => Math.max(0, prev - 1))
      }

      const nextId = puzzle.nextNodes?.[0] ?? null
      return {
        isCorrect,
        pointsAwarded,
        attemptNumber: 1,
        nextNodeId: nextId,
      }
    },
    [solvedNodes, isLocked, isOffline],
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

  const scanQR = useCallback(
    async (qrCode: string): Promise<{
      discovered: boolean
      qrLabel?: string
      nodeCode?: string
      nodeTitle?: string
      alreadyClaimed?: boolean
      message?: string
      error?: string
    }> => {
      if (isOffline) {
        return {
          discovered: false,
          message: 'Cannot scan while offline.',
          error: 'offline',
        }
      }

      const validationResult = validateAnyCode(qrCode)
      const scanResult = toQRScanResult(validationResult)

      return {
        discovered: scanResult.discovered,
        qrLabel: scanResult.qrLabel,
        nodeCode: scanResult.nodeCode,
        nodeTitle: scanResult.nodeTitle,
        alreadyClaimed: scanResult.alreadyClaimed,
        message: scanResult.message,
        error: scanResult.error,
      }
    },
    [isOffline],
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
    setCurrentNodeId(null)
    setHintsUsed(0)
    setScore(0)
    setElapsedMinutes(0)
    setIsOffline(false)
    setIsLocked(false)
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
      setRole,
      setSimulationType,
      jumpToNode,
      markSolved,
      markSkipped,
      resetSimulation,
      advanceProgression,
      toggleOffline,
      toggleLock,
      setCustomProgress,
      player,
      team,
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
      player,
      team,
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
