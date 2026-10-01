/**
 * NEXUS — Game Engine Hook
 *
 * Central data-fetching and state management for the player experience.
 *
 * SECURITY: the game is server-authoritative. Player content comes from
 * get_player_node_detail(), which returns only the requesting role's own block
 * and redacts the accepted answer from every player-visible string. Answer
 * validation happens entirely inside submit_puzzle_answer(); no answer ever
 * reaches the browser. The local content bundle in src/content/puzzles carries
 * no answers and is used only for the pre-auth node map, where a locked node's
 * title and location are not a spoiler.
 */

import { useState, useCallback, useEffect, useMemo, useContext } from 'react'
import { useApp } from '@/app/providers'
import { gameAPI } from '@/lib/game'
import { QASimulatorContext, type QAContextValue } from '@/contexts/QASimulatorContext'
import {
  PUZZLES_BY_CODE,
  PUZZLE_COUNT,
  ALL_PUZZLES,
  type NodeIndexEntry,
} from '@/content/puzzles'
import { useOffline } from '@/hooks/useOffline'
import { useConnection } from '@/hooks/useConnection'
import {
  enqueueSubmission,
  flushSubmissionQueue,
  getLastFlush,
  queueSize,
  recordFlush,
} from '@/lib/offlineQueue'
import type {
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
  roleContent: NodeDetailPlayerView['roleContent']
  operatorInvestigation: NodeDetailPlayerView['operatorInvestigation']
  coordinationChain: NodeDetailPlayerView['coordinationChain']
  failurePropagation: NodeDetailPlayerView['failurePropagation']
  locationClue: NonNullable<NodeDetailPlayerView['locationClue']>
  evidenceUnlocked: NodeDetailPlayerView['evidenceUnlocked']
  storyReveal: string
  whyTeamworkMatters: string
}

export interface MergedInventory {
  evidence: ApiEvidenceItem[]
  inventory: ApiInventoryItem[]
  fragments: ApiFragmentItem[]
}

export interface QRScanResult {
  discovered: boolean
  qrLabel?: string
  /** Set when the marker maps to a puzzle node the team has now unlocked. */
  nodeCode?: string
  nodeTitle?: string
  /** Another member of the team already claimed this non-puzzle marker. */
  alreadyClaimed?: boolean
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

const EMPTY_LOCATION_CLUE: NonNullable<NodeDetailPlayerView['locationClue']> = {
  format: '',
  clueText: '',
  solution: '',
  nextPhysicalLocation: '',
  nextQrNode: null,
  explanation: '',
}

/**
 * The server's own rejections are answers ("Rate limited", "Node not
 * accessible", "Game not active") and must reach the player. A transport
 * failure means the request never got an answer at all, which is the only case
 * where the text can safely be kept and replayed later.
 */
const TRANSPORT_FAILURE = /failed to fetch|network ?error|load failed|fetch failed|aborted|timeout/i

function isTransportFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return TRANSPORT_FAILURE.test(message)
}

export function useGameEngine() {
  const qaContext: QAContextValue | null = useContext(QASimulatorContext)

  const app = useApp()
  const {
    player,
    team,
    role,
    isInitializing,
    isAuthenticated,
    refreshGameState,
    refreshTeamProgress,
    gameState,
    teamProgress,
    notifications,
    markNotificationRead,
  } = app
  const { isOffline: browserOffline } = useOffline()
  const connection = useConnection()
  // navigator.onLine alone reports "online" on a dead campus Wi-Fi, so the
  // engine treats a failed server probe exactly like having no link.
  const serverIsOffline = browserOffline || connection.isOffline

  const isOffline = qaContext ? qaContext.isOffline : serverIsOffline

  const [inventory, setInventory] = useState<MergedInventory | null>(null)
  const [leaderboard, setLeaderboard] = useState<ApiLeaderboardEntry[] | null>(null)
  const [nodeProgress, setNodeProgress] = useState<NodeProgressEntry[]>([])
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [queuedCount, setQueuedCount] = useState(() => queueSize())

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
        // Without the server response there is no role-appropriate content to
        // show, so fail closed rather than substituting a different role's
        // block from the local bundle.
        console.warn('getNode failed:', err)
        setLoading('node', false)
        return null
      }

      const localPuzzle: NodeIndexEntry | undefined = PUZZLES_BY_CODE[nodeId]
      const progressEntry = findProgressEntry(nodeId)

      if (!apiNode?.unlocked) {
        setLoading('node', false)
        return null
      }

      const isSolved = progressEntry?.status === 'SOLVED'

      const currentNodeId = teamProgress?.currentNodeId
      const availableIds = teamProgress?.availableNodeIds ?? []
      const code = apiNode.code
      const isCurrent = code === currentNodeId
      const isNextUp = availableIds.includes(code) && !isCurrent && !isSolved

      let status: NodeStatus = 'LOCKED'
      if (isSolved) status = 'SOLVED'
      else if (apiNode.unlocked || isCurrent) status = 'IN_PROGRESS'
      else if (isNextUp) status = 'AVAILABLE'

      setLoading('node', false)

      return {
        code,
        title: apiNode.title,
        type: apiNode.type as PuzzleType,
        difficulty: apiNode.difficulty,
        // The server sends the authoritative estimate; the local bundle is only
        // a fallback for the pre-auth map.
        estimatedMinutes: apiNode.estimatedMinutes || (localPuzzle ? parseTimeToMinutes(localPuzzle.time) : 0),
        location: apiNode.location,
        stage: apiNode.stage,
        unlocked: apiNode.unlocked,
        isSolved,
        isCurrent,
        isNextUp,
        attempts: progressEntry?.attempts ?? 0,
        hintsUsed: progressEntry?.hintsUsed ?? 0,
        points: apiNode.points,
        status,
        narrativeObjective: apiNode.narrativeObjective,
        roleDependencyLevel: apiNode.roleDependencyLevel,
        roleContent: apiNode.roleContent,
        operatorInvestigation: apiNode.operatorInvestigation ?? null,
        coordinationChain: apiNode.coordinationChain ?? null,
        failurePropagation: apiNode.failurePropagation ?? null,
        locationClue: apiNode.locationClue ?? EMPTY_LOCATION_CLUE,
        evidenceUnlocked: apiNode.evidenceUnlocked ?? null,
        storyReveal: apiNode.storyReveal,
        whyTeamworkMatters: apiNode.whyTeamworkMatters,
      }
    },
    [role, findProgressEntry, teamProgress, setLoading],
  )

  /**
   * Submit an answer.
   *
   * With no usable connection the answer is persisted locally and replayed by
   * the flush effect below instead of being thrown away, so a player who loses
   * signal between buildings does not lose a solved puzzle. A link that dies
   * mid-request is treated the same way: the fetch rejects, and the text is
   * queued rather than lost.
   *
   * Hints and QR scans are deliberately NOT queueable - a hint costs time and a
   * scan mutates team state, so neither may be replayed speculatively.
   */
  const submitAnswer = useCallback(
    async (nodeId: string, answer: string): Promise<ApiSubmissionResult> => {
      const trimmed = answer.trim()

      if (isOffline) {
        const entry = enqueueSubmission(nodeId, trimmed)
        setQueuedCount(queueSize())
        return {
          isCorrect: false,
          pointsAwarded: 0,
          attemptNumber: 0,
          nextNodeId: null,
          queued: true,
          queuedAt: entry.queuedAt,
        }
      }

      try {
        return await gameAPI.submitAnswer(nodeId, trimmed)
      } catch (error) {
        // A transport failure is recoverable, so keep the answer. Anything the
        // server actually rejected (wrong answer, rate limit, node not
        // accessible) is a real error and must surface to the player.
        if (!isTransportFailure(error)) throw error
        enqueueSubmission(nodeId, trimmed)
        setQueuedCount(queueSize())
        return {
          isCorrect: false,
          pointsAwarded: 0,
          attemptNumber: 0,
          nextNodeId: null,
          queued: true,
          queuedAt: new Date().toISOString(),
        }
      }
    },
    [isOffline],
  )

  const requestHint = useCallback(
    async (nodeId: string, hintNumber: number): Promise<ApiHintResult> => {
      // Hints are served one at a time by request_hint(), which records the
      // usage and applies the time penalty. There is deliberately no local
      // fallback: a cached copy would hand out a hint without recording it,
      // and the last hint on several nodes states the answer outright.
      if (isOffline) {
        throw new Error('Cannot request hints while offline. Restore connection to continue.')
      }
      return gameAPI.useHint(nodeId, hintNumber)
    },
    [isOffline],
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
          nodeCode: result.nodeCode,
          nodeTitle: result.nodeTitle,
          alreadyClaimed: result.alreadyClaimed,
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
    if (!isAuthenticated || isOffline || qaContext?.isActive) return
    void refreshGameState()
    void fetchNodeProgress()

    const interval = setInterval(() => {
      if (isOffline || qaContext?.isActive) return
      void refreshGameState()
      void fetchNodeProgress()
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated, isOffline, refreshGameState, fetchNodeProgress, qaContext?.isActive])

  /**
   * Replay answers that were typed while the link was down.
   *
   * Runs whenever the connection turns usable and the queue is non-empty. The
   * flush is spaced and capped internally so it cannot trip the server's
   * per-team rate limit, and authoritative state is refreshed afterwards
   * because a replayed correct answer may have unlocked the next node.
   */
  useEffect(() => {
    if (!isAuthenticated || isOffline || queuedCount === 0 || qaContext?.isActive) return

    let cancelled = false
    const flush = async () => {
      const report = await flushSubmissionQueue({
        send: (nodeId, answer) => gameAPI.submitAnswer(nodeId, answer),
      })
      if (cancelled) return
      setQueuedCount(report.remaining)
      if (report.sent.length > 0) {
        recordFlush(report.sent)
        void refreshGameState()
        void refreshTeamProgress()
        void fetchNodeProgress()
      }
    }

    void flush()
    return () => {
      cancelled = true
    }
    // queuedCount is the trigger; re-running on it changing is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isOffline, queuedCount, refreshGameState, refreshTeamProgress, fetchNodeProgress])

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
    if (qaContext?.isActive) return []
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
  }, [teamProgress, solvedNodes, availableNodeIds, qaContext?.isActive])

  // In QA mode, the QASimulatorContext provides all simulated engine behavior
  // and data. Player screens are unmodified — they call useGameEngine() which
  // transparently delegates to the simulator instead of gameAPI.
  if (qaContext?.isActive) {
    const isSolved = (nodeId: string) =>
      !!qaContext.nodeProgress.some(p => p.nodeId === nodeId || p.nodeCode === nodeId)
    return {
      player: qaContext.player,
      team: qaContext.team,
      role: qaContext.player.role,
      isInitializing: false,
      isAuthenticated: true,
      isOffline: qaContext.isOffline,
      connection: { isOffline: qaContext.isOffline, lastProbe: null },
      queuedCount: 0,
      lastFlush: null,
      loading: false,
      isLoading: () => false,
      gameState: qaContext.gameState,
      teamProgress: qaContext.teamProgress,
      notifications: qaContext.notifications,
      unreadCount: qaContext.notifications.filter(n => !n.isRead).length,
      nodeProgress: qaContext.nodeProgress,
      inventory: qaContext.inventory,
      leaderboard: qaContext.leaderboard,
      solvedNodes: Array.from(qaContext.solvedNodes),
      allNodesForMap: qaContext.allNodesForMap,
      totalNodes: PUZZLE_COUNT,
      solvedCount: qaContext.solvedNodes.size,
      availableNodeIds: qaContext.availableNodeIds,
      fetchNode: async (nodeId: string) => {
        const node = await qaContext.getNode(nodeId, qaContext.role)
        if (!node) return null
        const isSolved = qaContext.solvedNodes.has(nodeId)
        const isCurrent = nodeId === qaContext.currentNodeId
        const isNextUp = qaContext.availableNodeIds.includes(nodeId)
        const status: NodeStatus = isSolved ? 'SOLVED' : isCurrent ? 'IN_PROGRESS' : isNextUp ? 'AVAILABLE' : 'LOCKED'
        return {
          code: node.code,
          title: node.title,
          type: node.type as PuzzleType,
          difficulty: node.difficulty,
          estimatedMinutes: node.estimatedMinutes,
          location: node.location,
          stage: node.stage,
          unlocked: true,
          isSolved,
          isCurrent,
          isNextUp,
          attempts: 0,
          hintsUsed: 0,
          points: node.points,
          status,
          narrativeObjective: node.narrativeObjective,
          roleDependencyLevel: node.roleDependencyLevel,
          roleContent: node.roleContent,
          operatorInvestigation: node.operatorInvestigation,
          coordinationChain: node.coordinationChain,
          failurePropagation: node.failurePropagation,
          locationClue: node.locationClue ?? EMPTY_LOCATION_CLUE,
          evidenceUnlocked: node.evidenceUnlocked,
          storyReveal: node.storyReveal,
          whyTeamworkMatters: node.whyTeamworkMatters,
        } as PlayerNodeView
      },
      fetchInventory: qaContext.fetchInventory,
      fetchLeaderboard: qaContext.fetchLeaderboard,
      fetchNodeProgress: qaContext.fetchNodeProgress,
      submitAnswer: qaContext.submitAnswer,
      requestHint: qaContext.requestHint,
      scanQR: qaContext.scanQR,
      markAllNotificationsRead: qaContext.markAllNotificationsRead,
      markNotificationRead: qaContext.markNotificationRead,
      isNodeSolved: isSolved,
    }
  }

  return {
    player,
    team,
    role,
    isInitializing,
    isAuthenticated,
isOffline,
    connection,
    queuedCount,
    lastFlush: getLastFlush(),
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
