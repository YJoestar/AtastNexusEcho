/**
 * NEXUS — Game Engine Types
 * Type definitions for puzzle nodes, progression, submissions, and game state
 */

export type PuzzleType =
  | 'OBSERVATION'
  | 'BINARY'
  | 'CIPHER'
  | 'PATTERN'
  | 'GRAPH'
  | 'VISUAL'
  | 'AUDIO'
  | 'MEMORY'
  | 'SPATIAL'
  | 'EXTRACTION'
  | 'CROSS_REFERENCE'
  | 'THREE_PHONE'
  | 'DEDUCTION'
  | 'LOGIC'
  | 'NARRATIVE_INVESTIGATION'
  | 'META'
  | 'FINAL'
  | 'FINAL_BOSS'

export type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'SOLVED' | 'SKIPPED'

export type ValidationMethod = 'exact' | 'case_insensitive' | 'whitespace_normalized' | 'prefix' | 'regex' | 'numeric' | 'symbolic'

export interface PuzzleNode {
  id: string
  code: string
  name: string
  stage: number
  type: PuzzleType
  difficulty: number
  time: string
  location: string
  feeds: string
  unlocks: string | null
  acceptedAnswer: string | string[]
  validationMethod: ValidationMethod
  narrativeObjective: string
  roleDependencyLevel: string
  observer: RoleContent
  analyst: RoleContent
  operator: RoleContent
  operatorInvestigation: OperatorInvestigation
  coordinationChain: CoordinationChain
  failurePropagation: FailurePropagation
  hints: string[]
  fullSolution: string
  whyTeamworkMatters: string
  storyReveal: string
  locationClue: LocationClue
  evidenceUnlocked: EvidenceUnlocked | null
  prerequisiteNodes: string[]
  nextNodes: string[] | null
  branchConditions: BranchCondition[]
  points: number
  stageGroup?: string
  roleContent?: RoleContent | null
}

export interface RoleContent {
  role: 'OBSERVER' | 'ANALYST' | 'OPERATOR'
  screenTitle: string
  dataPayload: string
  visualType?: string
  interactiveData?: Record<string, unknown>
  whatTheySee: string
  taskPrompt: string
  intermediateOutput: string
}

export interface OperatorInvestigation {
  operatorOwnEvidence: string
  operatorTaskDescription: string
  requiredDiscoveries: {
    observerDiscovery: string
    analystDiscovery: string
  }
}

export interface CoordinationChain {
  observerProduces: string
  analystTransforms: string
  operatorExecutes: string
}

export interface FailurePropagation {
  wrongStep: string
  consequence: string
  recoveryGuidance: string
}

export interface LocationClue {
  format: string
  clueText: string
  solution: string
  nextPhysicalLocation: string
  nextQrNode: string | null
  explanation: string
}

export interface EvidenceUnlocked {
  id: string
  category: string
  title: string
  state: string
  timestamp: string
  source: string
  content: string
}

export interface BranchCondition {
  condition: string
  nextNode: string
  description: string
}

export interface RoleContentMap {
  OBSERVER: RoleContent
  ANALYST: RoleContent
  OPERATOR: RoleContent
}

export interface NodeDetailPlayerView {
  unlocked: boolean
  code: string
  title: string
  type: string
  difficulty: number
  estimatedMinutes: number
  location: string
  stage: number
  roleContent: RoleContent | null
}

export interface TeamGameState {
  team: {
    id: string
    name: string
    code: string
    status: string
    score: number
    startedAt: string | null
    deadline: string | null
  }
  progress: {
    solvedCount: number
    currentNodeId: string | null
  }
  currentNode: {
    code: string
    title: string
    type: string
    location: string
    stage: number
  } | null
  unreadNotifications: number
}

export interface SubmissionResult {
  isCorrect: boolean
  pointsAwarded: number
  attemptNumber: number
  nextNodeId?: string | null
  error?: string
}

export interface HintResult {
  hint: string
  penaltySeconds: number
  error?: string
}

export interface LeaderboardEntry {
  rank: number
  teamName: string
  teamCode: string
  score: number
  status: string
  elapsedMinutes: number
  playerCount: number
}

export interface NodeProgressEntry {
  nodeId: string
  nodeCode: string
  title: string
  type: string
  stage: number
  status: NodeStatus
  startedAt: string | null
  solvedAt: string | null
  attempts: number
  hintsUsed: number
  pointsAwarded: number
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  priority: string
  isRead: boolean
  createdAt: string
  actionUrl: string | null
}

export interface InventoryItem {
  code: string
  name: string
  description: string
  type: string
  rarity: string
}

export interface FragmentItem {
  code: string
  label: string
  content: string
  type: string
  role: string
}

export interface EvidenceItem {
  code: string
  title: string
  description: string
  type: string
  content: Record<string, unknown>
}

export interface ContentValidationIssue {
  nodeId: string
  issue: string
  severity: 'ERROR' | 'WARNING'
}

export interface ContentValidationReport {
  valid: boolean
  nodesChecked: number
  issues: ContentValidationIssue[]
}
