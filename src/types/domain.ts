/**
 * NEXUS — Core Domain Types
 * Single source of truth for all domain concepts
 */

// ============================================================================
// ROLES & IDENTITY
// ============================================================================

export type Role = 'OBSERVER' | 'ANALYST' | 'OPERATOR'

export const ROLES: readonly Role[] = ['OBSERVER', 'ANALYST', 'OPERATOR'] as const

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role)
}

export const ROLE_LABELS: Record<Role, string> = {
  OBSERVER: 'Observer',
  ANALYST: 'Analyst',
  OPERATOR: 'Operator',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OBSERVER: 'Gathers visual intelligence. Scans environments. Identifies patterns.',
  ANALYST: 'Processes data. Decodes signals. Connects fragments.',
  OPERATOR: 'Executes actions. Manipulates systems. Bridges physical and digital.',
}

// ============================================================================
// TEAM & PLAYER
// ============================================================================

export type TeamStatus =
  | 'REGISTERED'
  | 'FORMING'
  | 'READY'
  | 'WAITING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'DISQUALIFIED'
  | 'ABANDONED'
  | 'RESET'

export const TEAM_STATUSES: readonly TeamStatus[] = [
  'REGISTERED',
  'FORMING',
  'READY',
  'WAITING',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'DISQUALIFIED',
  'ABANDONED',
  'RESET',
] as const

export interface Team {
  id: string
  name: string
  code: string
  status: TeamStatus
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  currentNodeId: string | null
  score: number
  metadata: TeamMetadata
}

export interface TeamMetadata {
  registeredBy: 'PLAYER' | 'ADMIN'
  assignedRoles: boolean
  notes?: string
}

export type PlayerStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'OFFLINE'
  | 'REMOVED'

export const PLAYER_STATUSES: readonly PlayerStatus[] = [
  'INVITED',
  'ACTIVE',
  'OFFLINE',
  'REMOVED',
] as const

export interface Player {
  id: string
  teamId: string
  role: Role
  displayName: string
  joinedAt: string
  isConnected: boolean
  lastSeenAt: string | null
  deviceInfo?: DeviceInfo
  status: PlayerStatus
  createdAt: string
  loginCodeHash: string | null
  authUserId: string | null
  deviceSessionToken: string | null
  deviceFingerprintHash: string | null
}

export interface DeviceInfo {
  userAgent: string
  screenWidth: number
  screenHeight: number
  isMobile: boolean
}

export interface AdminUser {
  id: string
  authUserId: string
  username: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  createdAt: string
  lastLoginAt: string | null
}

export interface AuditLogEntry {
  id: string
  adminId: string
  action: AdminActionType
  targetTeamId: string | null
  targetPlayerId: string | null
  targetNodeId: string | null
  payload: Record<string, unknown>
  reason: string
  createdAt: string
  ipAddress: string | null
}

export interface PlayerSession {
  playerId: string
  teamId: string
  role: Role
  displayName: string
  teamName: string
  teamStatus: TeamStatus
  deviceFingerprint: string
  createdAt: string
}

export interface PlayerWithCode {
  id: string
  teamId: string
  role: Role
  displayName: string
  loginCode: string | null
  status: PlayerStatus
  createdAt: string
  joinedAt: string | null
}

export interface TeamWithPlayers {
  id: string
  name: string
  code: string
  status: TeamStatus
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  score: number
  metadata: TeamMetadata
  players: Player[]
}

export interface PlayerLoginResult {
  success: boolean
  error?: string
  player?: Player
  team?: Team
  session?: PlayerSession
  deviceBound: boolean
  requiresDeviceBinding: boolean
}

// ============================================================================
// GAME STATE
// ============================================================================

export type GameStatus =
  | 'NOT_STARTED'
  | 'RUNNING'
  | 'PAUSED'
  | 'ENDED'

export interface GameState {
  status: GameStatus
  startedAt: string | null
  endsAt: string | null
  currentPhase: GamePhase
  /**
   * Optional because the player-facing `game-get-state` endpoint does not return
   * game parameters. This used to be populated with hardcoded constants (25
   * teams, 3 players, 180 minutes) that looked like server state and were read by
   * nobody — so an operator changing `game_config` in the database saw no change
   * here. Absent is honest; invented numbers are not.
   */
  config?: GameConfig
}

export type GamePhase = 'REGISTRATION' | 'BRIEFING' | 'GAMEPLAY' | 'FINAL' | 'DEBRIEF'

export interface GameConfig {
  maxTeams: number
  playersPerTeam: number
  gameDurationMinutes: number
  rollingStartIntervalMinutes: number
  autoAssignRoles: boolean
  requireAllRoles: boolean
}

// ============================================================================
// PUZZLE NODES & STRUCTURE
// ============================================================================

export type PuzzleType =
  | 'OBSERVATION'
  | 'DECODING'
  | 'LOGIC'
  | 'PATTERN'
  | 'PHYSICAL'
  | 'META'
  | 'FINAL'

export type PuzzleStage =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'SOLVED'
  | 'FAILED'
  | 'SKIPPED'

export interface PuzzleNode {
  id: string
  code: string
  title: string
  type: PuzzleType
  difficulty: number // 1-5
  estimatedMinutes: number
  position: NodePosition
  prerequisites: Prerequisite[]
  branches: BranchCondition[]
  content: PuzzleContent
  rewards: PuzzleRewards
  metadata: PuzzleMetadata
}

export interface NodePosition {
  x: number
  y: number
  layer: number
}

export interface Prerequisite {
  type: 'NODE_SOLVED' | 'EVIDENCE_OWNED' | 'FRAGMENT_OWNED' | 'ROLE_ACTION' | 'TIME_ELAPSED' | 'ADMIN_UNLOCK'
  targetId: string
  role?: Role
  value?: number | string
}

export interface BranchCondition {
  id: string
  label: string
  condition: Prerequisite[]
  targetNodeId: string
  isDefault: boolean
}

export interface PuzzleContent {
  // Role-specific content
  observer?: RoleContent
  analyst?: RoleContent
  operator?: RoleContent
  // Shared content visible to all
  shared?: SharedContent
  // Bureau-only solution data
  solution?: SolutionData
}

export interface RoleContent {
  briefing: string
  instructions: string[]
  assets: ContentAsset[]
  constraints?: ContentConstraint[]
}

export interface SharedContent {
  title: string
  description: string
  assets: ContentAsset[]
}

export interface ContentAsset {
  id: string
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'QR_CODE' | 'FRAGMENT'
  url: string
  metadata?: Record<string, unknown>
}

export interface ContentConstraint {
  type: 'TIME_LIMIT' | 'ATTEMPT_LIMIT' | 'ROLE_REQUIRED' | 'LOCATION_REQUIRED'
  value: number | string
  message: string
}

export interface SolutionData {
  answer: string
  validationType: 'EXACT' | 'REGEX' | 'FUNCTION' | 'MULTIPLE_CHOICE'
  validationPattern?: string
  acceptedVariants: string[]
  explanation: string
  hints: Hint[]
}

export interface Hint {
  id: string
  level: number // 1 = subtle, 2 = moderate, 3 = explicit
  text: string
  unlockCondition?: Prerequisite
  penaltyMinutes: number
}

export interface PuzzleRewards {
  score: number
  evidence: EvidenceReward[]
  inventory: InventoryReward[]
  fragments: FragmentReward[]
  unlocks: string[] // node IDs
  storyEvents: StoryEvent[]
}

export interface EvidenceReward {
  evidenceId: string
  quantity: number
  role?: Role
}

export interface InventoryReward {
  itemId: string
  quantity: number
  role?: Role
}

export interface FragmentReward {
  fragmentId: string
  quantity: number
  role?: Role
}

export interface StoryEvent {
  id: string
  type: 'NARRATIVE' | 'ALERT' | 'SYSTEM' | 'BRANCH'
  title: string
  message: string
  timestamp: string
  targetRoles?: Role[]
  metadata?: Record<string, unknown>
}

export interface PuzzleMetadata {
  author: string
  createdAt: string
  updatedAt: string
  version: number
  tags: string[]
  isMeta: boolean
  isFinal: boolean
  locationTrace?: LocationTrace
}

export interface LocationTrace {
  required: boolean
  coordinates?: { lat: number; lng: number }
  radiusMeters?: number
  qrCodeId?: string
}

// ============================================================================
// SUBMISSIONS & VALIDATION
// ============================================================================

export type SubmissionResult =
  | 'CORRECT'
  | 'INCORRECT'
  | 'PARTIAL'
  | 'ALREADY_SOLVED'
  | 'PREREQUISITE_MISSING'
  | 'RATE_LIMITED'
  | 'INVALID_FORMAT'
  | 'GAME_NOT_ACTIVE'
  | 'ROLE_MISMATCH'

export interface Submission {
  id: string
  teamId: string
  playerId: string
  nodeId: string
  role: Role
  answer: string
  result: SubmissionResult
  submittedAt: string
  validatedAt: string | null
  attempts: number
  timeSpentSeconds: number
  metadata?: Record<string, unknown>
}

export interface ValidationContext {
  team: Team
  player: Player
  node: PuzzleNode
  teamProgress: TeamProgress
  gameState: GameState
}

// ============================================================================
// EVIDENCE & INVENTORY
// ============================================================================

export interface Evidence {
  id: string
  code: string
  title: string
  description: string
  type: EvidenceType
  classification: EvidenceClassification
  content: EvidenceContent
  metadata: EvidenceMetadata
}

export type EvidenceType =
  | 'DOCUMENT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DATA'
  | 'PHYSICAL'
  | 'DIGITAL'

export type EvidenceClassification =
  | 'PUBLIC'
  | 'RESTRICTED'
  | 'CLASSIFIED'
  | 'TOP_SECRET'

export interface EvidenceContent {
  primaryAsset: ContentAsset
  supportingAssets: ContentAsset[]
  transcript?: string
  analysis?: string
}

export interface EvidenceMetadata {
  sourceNodeId: string
  discoveredAt: string
  discoveredByRole: Role
  tags: string[]
  isShareable: boolean
  expiresAt?: string
}

export interface InventoryItem {
  id: string
  code: string
  name: string
  description: string
  type: InventoryItemType
  rarity: InventoryRarity
  properties: Record<string, unknown>
  uses: InventoryUse[]
  metadata: InventoryMetadata
}

export type InventoryItemType =
  | 'TOOL'
  | 'KEY'
  | 'CODE'
  | 'DEVICE'
  | 'CONSUMABLE'
  | 'ARTIFACT'
  | 'FRAGMENT_CONTAINER'

export type InventoryRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'

export interface InventoryUse {
  action: string
  targetType: 'NODE' | 'EVIDENCE' | 'INVENTORY' | 'SYSTEM'
  targetId?: string
  consumesItem: boolean
  cooldownSeconds?: number
}

export interface InventoryMetadata {
  sourceNodeId?: string
  acquiredAt: string
  acquiredByRole: Role
  isTransferable: boolean
  maxStack: number
}

export interface Fragment {
  id: string
  code: string
  label: string
  content: string
  type: FragmentType
  puzzleNodeId: string
  role: Role
  position: number
  metadata: FragmentMetadata
}

export type FragmentType =
  | 'TEXT'
  | 'CIPHER'
  | 'COORDINATE'
  | 'KEYWORD'
  | 'SYMBOL'
  | 'SEQUENCE'

export interface FragmentMetadata {
  isRevealed: boolean
  revealedAt: string | null
  revealedByRole: Role | null
  dependencies: string[] // other fragment IDs
}

// ============================================================================
// QR & NAVIGATION
// ============================================================================

export interface QRNode {
  id: string
  code: string
  label: string
  type: QRNodeType
  puzzleNodeId: string | null
  position: { x: number; y: number; floor?: number }
  metadata: QRNodeMetadata
}

export type QRNodeType =
  | 'START'
  | 'PUZZLE'
  | 'EVIDENCE'
  | 'INVENTORY'
  | 'NAVIGATION'
  | 'CHECKPOINT'
  | 'FINAL'

export interface QRNodeMetadata {
  isActive: boolean
  scannedBy: string[] // team IDs
  firstScannedAt: string | null
  lastScannedAt: string | null
  requiresRole?: Role
  unlocksNodeId?: string
}

// ============================================================================
// TEAM PROGRESS & LEADERBOARD
// ============================================================================

export interface TeamProgress {
  teamId: string
  solvedNodes: Record<string, NodeProgress>
  currentNodeId: string | null
  availableNodeIds: string[]
  evidenceOwned: string[]
  inventoryOwned: Record<string, number>
  fragmentsOwned: string[]
  score: number
  hintsUsed: number
  hintsAvailable: number
  timeElapsedMinutes: number
  timeRemainingMinutes: number
  startedAt: string | null
  lastActivityAt: string
  metadata: ProgressMetadata
}

export interface NodeProgress {
  nodeId: string
  status: PuzzleStage
  startedAt: string | null
  solvedAt: string | null
  attempts: number
  hintsUsed: number
  timeSpentSeconds: number
  solvedByRole: Role | null
  submissions: Submission[]
}

export interface ProgressMetadata {
  branchPath: string[] // node IDs taken
  skippedNodes: string[]
  roleActions: Record<Role, number>
  specialAchievements: string[]
}

export interface LeaderboardEntry {
  rank: number
  teamId: string
  teamName: string
  teamCode: string
  score: number
  solvedCount: number
  totalNodes: number
  timeElapsedMinutes: number
  status: TeamStatus
  completedAt: string | null
  isCurrentTeam?: boolean
}

// ============================================================================
// NOTIFICATIONS & EVENTS
// ============================================================================

export type NotificationType =
  | 'SYSTEM'
  | 'PUZZLE_UNLOCKED'
  | 'PUZZLE_SOLVED'
  | 'EVIDENCE_FOUND'
  | 'ITEM_ACQUIRED'
  | 'FRAGMENT_REVEALED'
  | 'HINT_AVAILABLE'
  | 'TIME_WARNING'
  | 'ROLE_ACTION_REQUIRED'
  | 'ADMIN_MESSAGE'
  | 'GAME_PHASE_CHANGE'
  | 'TEAM_STATUS_CHANGE'

export interface Notification {
  id: string
  teamId: string
  targetRoles: Role[] | 'ALL'
  type: NotificationType
  title: string
  message: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  isRead: boolean
  createdAt: string
  readAt: string | null
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface GameEvent {
  id: string
  type: GameEventType
  timestamp: string
  teamId: string | null
  playerId: string | null
  nodeId: string | null
  payload: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export type GameEventType =
  | 'TEAM_REGISTERED'
  | 'TEAM_STARTED'
  | 'TEAM_PAUSED'
  | 'TEAM_RESUMED'
  | 'TEAM_COMPLETED'
  | 'TEAM_DISQUALIFIED'
  | 'NODE_UNLOCKED'
  | 'NODE_STARTED'
  | 'NODE_SOLVED'
  | 'NODE_FAILED'
  | 'NODE_SKIPPED'
  | 'SUBMISSION_MADE'
  | 'SUBMISSION_VALIDATED'
  | 'EVIDENCE_DISCOVERED'
  | 'EVIDENCE_SHARED'
  | 'ITEM_ACQUIRED'
  | 'ITEM_USED'
  | 'ITEM_TRANSFERRED'
  | 'FRAGMENT_REVEALED'
  | 'HINT_REQUESTED'
  | 'HINT_CONSUMED'
  | 'QR_SCANNED'
  | 'ROLE_ACTION_PERFORMED'
  | 'ADMIN_ACTION'
  | 'GAME_PHASE_CHANGED'
  | 'SYSTEM_ALERT'

// ============================================================================
// ADMIN
// ============================================================================

export type AdminActionType =
  | 'TEAM_CREATE'
  | 'TEAM_UPDATE'
  | 'TEAM_DELETE'
  | 'TEAM_START'
  | 'TEAM_PAUSE'
  | 'TEAM_RESUME'
  | 'TEAM_COMPLETE'
  | 'TEAM_DISQUALIFY'
  | 'ROLE_ASSIGN'
  | 'ROLE_REASSIGN'
  | 'NODE_UNLOCK'
  | 'NODE_LOCK'
  | 'NODE_SKIP'
  | 'SUBMISSION_OVERRIDE'
  | 'SCORE_ADJUST'
  | 'TIME_ADJUST'
  | 'HINT_GRANT'
  | 'EVIDENCE_GRANT'
  | 'ITEM_GRANT'
  | 'FRAGMENT_REVEAL'
  | 'GAME_START'
  | 'GAME_PAUSE'
  | 'GAME_RESUME'
  | 'GAME_END'
  | 'CONFIG_UPDATE'
   | 'ANNOUNCEMENT_SEND'
   | 'LOCATION_CREATE'
   | 'LOCATION_UPDATE'
   | 'LOCATION_DELETE'
   | 'QR_DOWNLOAD'

export interface AdminAction {
  id: string
  adminId: string
  type: AdminActionType
  targetTeamId: string | null
  targetPlayerId: string | null
  targetNodeId: string | null
  payload: Record<string, unknown>
  reason: string
  createdAt: string
  revertedAt: string | null
  revertedBy: string | null
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type UUID = string & { readonly __brand: unique symbol }
export type ISODateString = string & { readonly __brand: unique symbol }

export function uuid(value: string): UUID {
  return value as UUID
}

export function isoDate(value: string): ISODateString {
  return value as ISODateString
}

export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type EntityMap<T extends { id: string }> = Map<T['id'], T>
export type EntityRecord<T extends { id: string }> = Record<T['id'], T>

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ResponseMeta {
  timestamp: string
  requestId: string
  version: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta & {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}