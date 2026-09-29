/**
 * NEXUS — Game Engine Hook
 *
 * Central data-fetching and state management for the player experience.
 * Merges server API responses with local puzzle content.
 *
 * SECURITY: This hook NEVER returns acceptedAnswer, fullSolution,
 * or any server-side validation patterns to the UI layer.
 * intermediateOutput is filtered out for OPERATOR role.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useApp } from '@/app/providers'
import { gameAPI } from '@/lib/game'
import { PUZZLES_BY_CODE, PUZZLE_COUNT, ALL_PUZZLES } from '@/content/puzzles'
import { HINT_PENALTIES } from '@/content/constants'
import { useOffline } from '@/hooks/useOffline'
import type { Role } from '@/types'
import type {
  PuzzleNode,
  RoleContent,
  OperatorInvestigation,
  CoordinationChain,
  FailurePropagation,
  LocationClue,
  EvidenceUnlocked,
  NodeDetailPlayerView,
  HintResult as ApiHintResult,
  SubmissionResult as ApiSubmissionResult,
  InventoryItem as ApiInventoryItem,
  FragmentItem as ApiFragmentItem,
  EvidenceItem as ApiEvidenceItem,
  LeaderboardEntry as ApiLeaderboardEntry,
  NodeProgressEntry,
  NodeStatus,
  PuzzleType,
} from '@/types/game-engine'

export interface PlayerNodeView {
  code: string
  title: string
  type: PuzzleType
  difficulty: number
  estimatedMinutes: number
  location: string
  stage: number
  unlocked: boolean
  isSolved: boolean
  isCurrent: boolean
  isNextUp: boolean
  attempts: number
  hintsUsed: number
  points: number
  status: NodeStatus
  narrativeObjective: string
  roleDependencyLevel: string
  roleContent: RoleContent | null
  operatorInvestigation: OperatorInvestigation | null
  coordinationChain: CoordinationChain | null
  failurePropagation: FailurePropagation | null
  locationClue: LocationClue
  evidenceUnlocked: EvidenceUnlocked | null
  storyReveal: string
  whyTeamworkMatters: string
  hints: string[]
}

export interface MergedInventory {
  evidence: ApiEvidenceItem[]
  inventory: ApiInventoryItem[]
  fragments: ApiFragmentItem[]
}

export interface QRScanResult {
  discovered: boolean
  qrLabel?: string
  message?: string
  error?: string
}

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+)([mh])/)
  if (!match) return 0
  const num = parseInt(match[1], 10)
  if (match[2] === 'h') return num * 60
  return num
}

function getRoleContent(puzzle: PuzzleNode, role: Role): RoleContent {
  switch (role) {
    case 'OBSERVER':
      return puzzle.observer
    case 'ANALYST':
      return puzzle.analyst
    case 'OPERATOR':
      return puzzle.operator
    default:
      return puzzle.observer
  }
}

function sanitizeRoleContent(content: RoleContent, role: Role): RoleContent {
  if (role === 'OPERATOR') {
    return {
      ...content,
      intermediateOutput: '',
    }
  }
  return content
}

export function useGameEngine() {
  const app = useApp()
  const {
    player,
    team,
    role,
    isInitializing,
    isAuthenticated,
    refreshGameState,
    gameState,
    teamProgress,
    notifications,
    markNotificationRead,
  } = app
  const { isOffline } = useOffline()

  const [inventory, setInventory] = useState<MergedInventory | null>(null)
  const [leaderboard, setLeaderboard] = useState<ApiLeaderboardEntry[] | null>(null)
  const [nodeProgress, setNodeProgress] = useState<NodeProgressEntry[]>([])
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingKeys(prev => {
      const next = new Set(prev)
      if (value) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const isLoading = (key: string) => loadingKeys.has(key)

  const fetchInventory = useCallback(async () => {
    setLoading('inventory', true)
    try {
      const data = await gameAPI.getInventory()
      setInventory(data)
    } catch (err) {
      console.warn('Failed to fetch inventory (offline fallback):', err)
      setInventory(null)
    } finally {
      setLoading('inventory', false)
    }
   }, [setLoading])

  const fetchLeaderboard = useCallback(async () => {
    setLoading('leaderboard', true)
    try {
      const data = await gameAPI.getLeaderboard()
      setLeaderboard(data)
    } catch (err) {
      console.warn('Failed to fetch leaderboard:', err)
      setLeaderboard(null)
    } finally {
      setLoading('leaderboard', false)
    }
  }, [setLoading])

  const fetchNodeProgress = useCallback(async () => {
    setLoading('progress', true)
    try {
      const data = await gameAPI.getNodeProgress()
      setNodeProgress(data)
    } catch (err) {
      console.warn('Failed to fetch node progress:', err)
      setNodeProgress([])
    } finally {
      setLoading('progress', false)
    }
  }, [setLoading])

  const findProgressEntry = useCallback(
    (nodeId: string): NodeProgressEntry | undefined => {
      return nodeProgress.find(p => p.nodeId === nodeId || p.nodeCode === nodeId)
    },
    [nodeProgress],
  )

  const fetchNode = useCallback(
    async (nodeId: string): Promise<PlayerNodeView | null> => {
      if (!role) return null

      setLoading('node', true)

      let apiNode: NodeDetailPlayerView | null = null
      try {
        apiNode = await gameAPI.getNode(nodeId, role)
      } catch (err) {
        console.warn('API getNode failed, using local data:', err)
      }

      const puzzle = PUZZLES_BY_CODE[nodeId]
      const progress = findProgressEntry(nodeId)

      if (!puzzle && !apiNode) {
        setLoading('node', false)
        return null
      }

      if (!puzzle && apiNode) {
        setLoading('node', false)
        return {
          code: apiNode.code,
          title: apiNode.title,
          type: apiNode.type as PuzzleType,
          difficulty: apiNode.difficulty,
          estimatedMinutes: apiNode.estimatedMinutes,
          location: apiNode.location,
          stage: apiNode.stage,
          unlocked: apiNode.unlocked,
          isSolved: false,
          isCurrent: false,
          isNextUp: false,
          attempts: 0,
          hintsUsed: 0,
          points: 0,
          status: apiNode.unlocked ? 'AVAILABLE' : 'LOCKED',
          narrativeObjective: '',
          roleDependencyLevel: '',
          roleContent: apiNode.roleContent,
          operatorInvestigation: null,
          coordinationChain: null,
          failurePropagation: null,
          locationClue: {
            format: '',
            clueText: '',
            solution: '',
            nextPhysicalLocation: '',
            nextQrNode: null,
            explanation: '',
          },
          evidenceUnlocked: null,
          storyReveal: '',
          whyTeamworkMatters: '',
          hints: [],
        }
      }

      if (!puzzle) {
        setLoading('node', false)
        return null
      }

      const apiRoleContent = apiNode?.roleContent
      const localRoleContent = getRoleContent(puzzle, role)
      const roleContent = sanitizeRoleContent(
        apiRoleContent ?? localRoleContent,
        role,
      )

      const progressEntry = progress
      const isSolved = progressEntry?.status === 'SOLVED'

      const currentNodeId = teamProgress?.currentNodeId
      const availableIds = teamProgress?.availableNodeIds ?? []
      const isCurrent = puzzle.code === currentNodeId
      const isNextUp = availableIds.includes(puzzle.code) && !isCurrent && !isSolved

      let status: NodeStatus = 'LOCKED'
      if (isSolved) status = 'SOLVED'
      else if (apiNode?.unlocked || isCurrent) status = 'IN_PROGRESS'
      else if (isNextUp) status = 'AVAILABLE'

      setLoading('node', false)

      return {
        code: puzzle.code,
        title: puzzle.name,
        type: puzzle.type,
        difficulty: puzzle.difficulty,
        estimatedMinutes: parseTimeToMinutes(puzzle.time),
        location: puzzle.location,
        stage: puzzle.stage,
        unlocked: apiNode?.unlocked ?? puzzle.prerequisiteNodes.length === 0,
        isSolved,
        isCurrent,
        isNextUp,
        attempts: progressEntry?.attempts ?? 0,
        hintsUsed: progressEntry?.hintsUsed ?? 0,
        points: puzzle.points,
        status,
        narrativeObjective: puzzle.narrativeObjective,
        roleDependencyLevel: puzzle.roleDependencyLevel,
        roleContent,
        operatorInvestigation: puzzle.operatorInvestigation ?? null,
        coordinationChain: puzzle.coordinationChain ?? null,
        failurePropagation: puzzle.failurePropagation ?? null,
        locationClue: puzzle.locationClue,
        evidenceUnlocked: puzzle.evidenceUnlocked ?? null,
        storyReveal: puzzle.storyReveal,
        whyTeamworkMatters: puzzle.whyTeamworkMatters,
        hints: puzzle.hints,
      }
    },
    [role, findProgressEntry, teamProgress, setLoading],
  )

  const submitAnswer = useCallback(
    async (nodeId: string, answer: string): Promise<ApiSubmissionResult> => {
      if (isOffline) {
        throw new Error('Cannot submit while offline. Restore connection to submit.')
      }
      return gameAPI.submitAnswer(nodeId, answer)
    },
    [isOffline],
  )

  const requestHint = useCallback(
    async (nodeId: string, hintNumber: number): Promise<ApiHintResult> => {
      try {
        return await gameAPI.useHint(nodeId, hintNumber)
      } catch (err) {
        const puzzle = PUZZLES_BY_CODE[nodeId]
        if (puzzle && puzzle.hints[hintNumber - 1]) {
          const penaltyMap: Record<number, number> = {
            1: HINT_PENALTIES.hint1,
            2: HINT_PENALTIES.hint2,
            3: HINT_PENALTIES.hint3,
          }
          return {
            hint: puzzle.hints[hintNumber - 1],
            penaltySeconds: penaltyMap[hintNumber] ?? 0,
          }
        }
        throw err
      }
    },
    [],
  )

  const scanQR = useCallback(
    async (qrCode: string): Promise<QRScanResult> => {
      if (isOffline) {
        return {
          discovered: false,
          message: 'Cannot scan while offline.',
          error: 'offline',
        }
      }
      try {
        const result = await gameAPI.scanQR(qrCode)
        return {
          discovered: result.discovered,
          qrLabel: result.qrLabel,
          message: result.discovered
            ? undefined
            : 'ACCESS DENIED. The system recognizes the marker, but whatever it points to remains sealed.',
          error: result.error,
        }
      } catch {
        return {
          discovered: false,
          message:
            'ACCESS DENIED. The system recognizes the marker, but whatever it points to remains sealed.',
          error: 'scan_failed',
        }
      }
    },
    [isOffline],
  )

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await gameAPI.markNotificationsRead()
    } catch (err) {
      console.warn('Failed to mark notifications read:', err)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || isOffline) return
    void refreshGameState()
    void fetchNodeProgress()

    const interval = setInterval(() => {
      if (isOffline) return
      void refreshGameState()
      void fetchNodeProgress()
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated, isOffline, refreshGameState, fetchNodeProgress])

  const solvedNodes = useMemo(
    () =>
      nodeProgress
        .filter(p => p.status === 'SOLVED')
        .map(p => p.nodeCode ?? p.nodeId),
    [nodeProgress],
  )

  const availableNodeIds = useMemo(
    () => teamProgress?.availableNodeIds ?? [],
    [teamProgress?.availableNodeIds],
  )

  const allNodesForMap = useMemo(() => {
    if (!teamProgress && solvedNodes.length === 0) return []
    const solvedSet = new Set(solvedNodes)
    const currentId = teamProgress?.currentNodeId
    const availableSet = new Set(availableNodeIds)

    return ALL_PUZZLES.map(puzzle => {
      const solved = solvedSet.has(puzzle.code)
      const isCurrent = puzzle.code === currentId
      const isAvailable =
        (availableSet.has(puzzle.code) || puzzle.prerequisiteNodes.length === 0) &&
        !solved &&
        puzzle.code !== currentId

      const locked = !solved && !isCurrent && !isAvailable

      return {
        code: puzzle.code,
        title: puzzle.name,
        location: puzzle.location,
        stage: puzzle.stage,
        solved,
        available: isAvailable,
        isCurrent,
        locked,
      }
    })
  }, [teamProgress, solvedNodes, availableNodeIds])

  return {
    player,
    team,
    role,
    isInitializing,
    isAuthenticated,
    isOffline,
    loading: loadingKeys.size > 0,
    isLoading,
    gameState,
    teamProgress,
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    nodeProgress,
    inventory,
    leaderboard,
    solvedNodes,
    allNodesForMap,
    totalNodes: PUZZLE_COUNT,
    solvedCount: solvedNodes.length,
    availableNodeIds,
    fetchNode,
    fetchInventory,
    fetchLeaderboard,
    fetchNodeProgress,
    submitAnswer,
    requestHint,
    scanQR,
    markAllNotificationsRead,
    markNotificationRead,
    isNodeSolved: (nodeId: string) =>
      !!findProgressEntry(nodeId) || solvedNodes.includes(nodeId),
  }
}
