/**
 * NEXUS — Validation Schemas
 * Zod schemas for all domain entities
 */

import { z } from 'zod'

// ============================================================================
// PRIMITIVE SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid()
export const isoDateSchema = z.string().datetime({ offset: true })
export const roleSchema = z.enum(['OBSERVER', 'ANALYST', 'OPERATOR'])
export const teamStatusSchema = z.enum([
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
])
export const playerStatusSchema = z.enum(['INVITED', 'ACTIVE', 'OFFLINE', 'REMOVED'])
export const gameStatusSchema = z.enum(['NOT_STARTED', 'RUNNING', 'PAUSED', 'ENDED'])
export const puzzleTypeSchema = z.enum(['OBSERVATION', 'DECODING', 'LOGIC', 'PATTERN', 'PHYSICAL', 'META', 'FINAL'])
export const puzzleStageSchema = z.enum(['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'SOLVED', 'FAILED', 'SKIPPED'])
export const submissionResultSchema = z.enum([
  'CORRECT',
  'INCORRECT',
  'PARTIAL',
  'ALREADY_SOLVED',
  'PREREQUISITE_MISSING',
  'RATE_LIMITED',
  'INVALID_FORMAT',
  'GAME_NOT_ACTIVE',
  'ROLE_MISMATCH',
])

// ============================================================================
// COMPOSITE SCHEMAS
// ============================================================================

export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  layer: z.number().int().nonnegative(),
})

export const prerequisiteSchema = z.object({
  type: z.enum(['NODE_SOLVED', 'EVIDENCE_OWNED', 'FRAGMENT_OWNED', 'ROLE_ACTION', 'TIME_ELAPSED', 'ADMIN_UNLOCK']),
  targetId: z.string(),
  role: roleSchema.optional(),
  value: z.union([z.number(), z.string()]).optional(),
})

export const branchConditionSchema = z.object({
  id: z.string(),
  label: z.string(),
  condition: z.array(prerequisiteSchema),
  targetNodeId: z.string(),
  isDefault: z.boolean(),
})

export const contentAssetSchema = z.object({
  id: z.string(),
  type: z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'QR_CODE', 'FRAGMENT']),
  url: z.string().url(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const contentConstraintSchema = z.object({
  type: z.enum(['TIME_LIMIT', 'ATTEMPT_LIMIT', 'ROLE_REQUIRED', 'LOCATION_REQUIRED']),
  value: z.union([z.number(), z.string()]),
  message: z.string(),
})

export const roleContentSchema = z.object({
  briefing: z.string(),
  instructions: z.array(z.string()),
  assets: z.array(contentAssetSchema),
  constraints: z.array(contentConstraintSchema).optional(),
})

export const sharedContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  assets: z.array(contentAssetSchema),
})

export const hintSchema = z.object({
  id: z.string(),
  level: z.number().int().min(1).max(3),
  text: z.string(),
  unlockCondition: prerequisiteSchema.optional(),
  penaltyMinutes: z.number().int().nonnegative(),
})

export const solutionDataSchema = z.object({
  answer: z.string(),
  validationType: z.enum(['EXACT', 'REGEX', 'FUNCTION', 'MULTIPLE_CHOICE']),
  validationPattern: z.string().optional(),
  acceptedVariants: z.array(z.string()),
  explanation: z.string(),
  hints: z.array(hintSchema),
})

export const puzzleContentSchema = z.object({
  observer: roleContentSchema.optional(),
  analyst: roleContentSchema.optional(),
  operator: roleContentSchema.optional(),
  shared: sharedContentSchema.optional(),
  solution: solutionDataSchema.optional(),
})

export const evidenceRewardSchema = z.object({
  evidenceId: z.string(),
  quantity: z.number().int().positive(),
  role: roleSchema.optional(),
})

export const inventoryRewardSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().positive(),
  role: roleSchema.optional(),
})

export const fragmentRewardSchema = z.object({
  fragmentId: z.string(),
  quantity: z.number().int().positive(),
  role: roleSchema.optional(),
})

export const storyEventSchema = z.object({
  id: z.string(),
  type: z.enum(['NARRATIVE', 'ALERT', 'SYSTEM', 'BRANCH']),
  title: z.string(),
  message: z.string(),
  timestamp: isoDateSchema,
  targetRoles: z.array(roleSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const puzzleRewardsSchema = z.object({
  score: z.number().int().nonnegative(),
  evidence: z.array(evidenceRewardSchema),
  inventory: z.array(inventoryRewardSchema),
  fragments: z.array(fragmentRewardSchema),
  unlocks: z.array(z.string()),
  storyEvents: z.array(storyEventSchema),
})

export const locationTraceSchema = z.object({
  required: z.boolean(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  radiusMeters: z.number().positive().optional(),
  qrCodeId: z.string().optional(),
})

export const puzzleMetadataSchema = z.object({
  author: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  version: z.number().int().positive(),
  tags: z.array(z.string()),
  isMeta: z.boolean(),
  isFinal: z.boolean(),
  locationTrace: locationTraceSchema.optional(),
})

export const puzzleNodeSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1).max(20),
  title: z.string().min(1).max(100),
  type: puzzleTypeSchema,
  difficulty: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().positive(),
  position: nodePositionSchema,
  prerequisites: z.array(prerequisiteSchema),
  branches: z.array(branchConditionSchema),
  content: puzzleContentSchema,
  rewards: puzzleRewardsSchema,
  metadata: puzzleMetadataSchema,
})

// ============================================================================
// TEAM & PLAYER SCHEMAS
// ============================================================================

export const teamMetadataSchema = z.object({
  registeredBy: z.enum(['PLAYER', 'ADMIN']),
  assignedRoles: z.boolean(),
  notes: z.string().optional(),
})

export const teamSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(50),
  code: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
  status: teamStatusSchema,
  createdAt: isoDateSchema,
  startedAt: isoDateSchema.nullable(),
  completedAt: isoDateSchema.nullable(),
  currentNodeId: uuidSchema.nullable(),
  score: z.number().int().nonnegative(),
  metadata: teamMetadataSchema,
})

export const deviceInfoSchema = z.object({
  userAgent: z.string(),
  screenWidth: z.number().int().positive(),
  screenHeight: z.number().int().positive(),
  isMobile: z.boolean(),
})

export const playerSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  role: roleSchema,
  displayName: z.string().min(1).max(30),
  joinedAt: isoDateSchema,
  isConnected: z.boolean(),
  lastSeenAt: isoDateSchema.nullable(),
  deviceInfo: deviceInfoSchema.optional(),
})

// ============================================================================
// GAME STATE SCHEMAS
// ============================================================================

export const gameConfigSchema = z.object({
  maxTeams: z.number().int().positive(),
  playersPerTeam: z.number().int().min(1).max(10),
  gameDurationMinutes: z.number().int().positive(),
  rollingStartIntervalMinutes: z.number().int().nonnegative(),
  autoAssignRoles: z.boolean(),
  requireAllRoles: z.boolean(),
})

export const gameStateSchema = z.object({
  status: gameStatusSchema,
  startedAt: isoDateSchema.nullable(),
  endsAt: isoDateSchema.nullable(),
  currentPhase: z.enum(['REGISTRATION', 'BRIEFING', 'GAMEPLAY', 'FINAL', 'DEBRIEF']),
  config: gameConfigSchema,
})

// ============================================================================
// SUBMISSION SCHEMAS
// ============================================================================

export const submissionSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  playerId: uuidSchema,
  nodeId: uuidSchema,
  role: roleSchema,
  answer: z.string().max(500),
  result: submissionResultSchema,
  submittedAt: isoDateSchema,
  validatedAt: isoDateSchema.nullable(),
  attempts: z.number().int().positive(),
  timeSpentSeconds: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const validationContextSchema = z.object({
  team: teamSchema,
  player: playerSchema,
  node: puzzleNodeSchema,
  teamProgress: z.unknown(), // TeamProgress schema would go here
  gameState: gameStateSchema,
})

// ============================================================================
// EVIDENCE & INVENTORY SCHEMAS
// ============================================================================

export const evidenceContentSchema = z.object({
  primaryAsset: contentAssetSchema,
  supportingAssets: z.array(contentAssetSchema),
  transcript: z.string().optional(),
  analysis: z.string().optional(),
})

export const evidenceMetadataSchema = z.object({
  sourceNodeId: uuidSchema,
  discoveredAt: isoDateSchema,
  discoveredByRole: roleSchema,
  tags: z.array(z.string()),
  isShareable: z.boolean(),
  expiresAt: isoDateSchema.optional(),
})

export const evidenceSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1).max(20),
  title: z.string().min(1).max(100),
  description: z.string(),
  type: z.enum(['DOCUMENT', 'IMAGE', 'AUDIO', 'VIDEO', 'DATA', 'PHYSICAL', 'DIGITAL']),
  classification: z.enum(['PUBLIC', 'RESTRICTED', 'CLASSIFIED', 'TOP_SECRET']),
  content: evidenceContentSchema,
  metadata: evidenceMetadataSchema,
})

export const inventoryUseSchema = z.object({
  action: z.string(),
  targetType: z.enum(['NODE', 'EVIDENCE', 'INVENTORY', 'SYSTEM']),
  targetId: z.string().optional(),
  consumesItem: z.boolean(),
  cooldownSeconds: z.number().int().nonnegative().optional(),
})

export const inventoryMetadataSchema = z.object({
  sourceNodeId: uuidSchema.optional(),
  acquiredAt: isoDateSchema,
  acquiredByRole: roleSchema,
  isTransferable: z.boolean(),
  maxStack: z.number().int().positive(),
})

export const inventoryItemSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  description: z.string(),
  type: z.enum(['TOOL', 'KEY', 'CODE', 'DEVICE', 'CONSUMABLE', 'ARTIFACT', 'FRAGMENT_CONTAINER']),
  rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']),
  properties: z.record(z.string(), z.unknown()),
  uses: z.array(inventoryUseSchema),
  metadata: inventoryMetadataSchema,
})

export const fragmentMetadataSchema = z.object({
  isRevealed: z.boolean(),
  revealedAt: isoDateSchema.nullable(),
  revealedByRole: roleSchema.nullable(),
  dependencies: z.array(z.string()),
})

export const fragmentSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1).max(20),
  label: z.string().min(1).max(50),
  content: z.string(),
  type: z.enum(['TEXT', 'CIPHER', 'COORDINATE', 'KEYWORD', 'SYMBOL', 'SEQUENCE']),
  puzzleNodeId: uuidSchema,
  role: roleSchema,
  position: z.number().int().nonnegative(),
  metadata: fragmentMetadataSchema,
})

// ============================================================================
// QR NODE SCHEMAS
// ============================================================================

export const qrNodeMetadataSchema = z.object({
  isActive: z.boolean(),
  scannedBy: z.array(z.string()),
  firstScannedAt: isoDateSchema.nullable(),
  lastScannedAt: isoDateSchema.nullable(),
  requiresRole: roleSchema.optional(),
  unlocksNodeId: uuidSchema.optional(),
})

export const qrNodeSchema = z.object({
  id: uuidSchema,
  code: z.string().min(1).max(20),
  label: z.string().min(1).max(50),
  type: z.enum(['START', 'PUZZLE', 'EVIDENCE', 'INVENTORY', 'NAVIGATION', 'CHECKPOINT', 'FINAL']),
  puzzleNodeId: uuidSchema.nullable(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    floor: z.number().optional(),
  }),
  metadata: qrNodeMetadataSchema,
})

// ============================================================================
// PROGRESS & LEADERBOARD SCHEMAS
// ============================================================================

export const nodeProgressSchema = z.object({
  nodeId: uuidSchema,
  status: puzzleStageSchema,
  startedAt: isoDateSchema.nullable(),
  solvedAt: isoDateSchema.nullable(),
  attempts: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  timeSpentSeconds: z.number().int().nonnegative(),
  solvedByRole: roleSchema.nullable(),
  submissions: z.array(submissionSchema),
})

export const progressMetadataSchema = z.object({
  branchPath: z.array(z.string()),
  skippedNodes: z.array(z.string()),
  roleActions: z.record(roleSchema, z.number().int().nonnegative()),
  specialAchievements: z.array(z.string()),
})

export const teamProgressSchema = z.object({
  teamId: uuidSchema,
  solvedNodes: z.record(z.string(), nodeProgressSchema),
  currentNodeId: uuidSchema.nullable(),
  availableNodeIds: z.array(z.string()),
  evidenceOwned: z.array(z.string()),
  inventoryOwned: z.record(z.string(), z.number().int().nonnegative()),
  fragmentsOwned: z.array(z.string()),
  score: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  hintsAvailable: z.number().int().nonnegative(),
  timeElapsedMinutes: z.number().int().nonnegative(),
  timeRemainingMinutes: z.number().int().nonnegative(),
  startedAt: isoDateSchema.nullable(),
  lastActivityAt: isoDateSchema,
  metadata: progressMetadataSchema,
})

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  teamId: uuidSchema,
  teamName: z.string(),
  teamCode: z.string().length(6),
  score: z.number().int().nonnegative(),
  solvedCount: z.number().int().nonnegative(),
  totalNodes: z.number().int().positive(),
  timeElapsedMinutes: z.number().int().nonnegative(),
  status: teamStatusSchema,
  completedAt: isoDateSchema.nullable(),
  isCurrentTeam: z.boolean().optional(),
})

// ============================================================================
// NOTIFICATION & EVENT SCHEMAS
// ============================================================================

export const notificationSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  targetRoles: z.union([z.array(roleSchema), z.literal('ALL')]),
  type: z.enum([
    'SYSTEM',
    'PUZZLE_UNLOCKED',
    'PUZZLE_SOLVED',
    'EVIDENCE_FOUND',
    'ITEM_ACQUIRED',
    'FRAGMENT_REVEALED',
    'HINT_AVAILABLE',
    'TIME_WARNING',
    'ROLE_ACTION_REQUIRED',
    'ADMIN_MESSAGE',
    'GAME_PHASE_CHANGE',
    'TEAM_STATUS_CHANGE',
  ]),
  title: z.string(),
  message: z.string(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  isRead: z.boolean(),
  createdAt: isoDateSchema,
  readAt: isoDateSchema.nullable(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const gameEventSchema = z.object({
  id: uuidSchema,
  type: z.enum([
    'TEAM_REGISTERED',
    'TEAM_STARTED',
    'TEAM_PAUSED',
    'TEAM_RESUMED',
    'TEAM_COMPLETED',
    'TEAM_DISQUALIFIED',
    'NODE_UNLOCKED',
    'NODE_STARTED',
    'NODE_SOLVED',
    'NODE_FAILED',
    'NODE_SKIPPED',
    'SUBMISSION_MADE',
    'SUBMISSION_VALIDATED',
    'EVIDENCE_DISCOVERED',
    'EVIDENCE_SHARED',
    'ITEM_ACQUIRED',
    'ITEM_USED',
    'ITEM_TRANSFERRED',
    'FRAGMENT_REVEALED',
    'HINT_REQUESTED',
    'HINT_CONSUMED',
    'QR_SCANNED',
    'ROLE_ACTION_PERFORMED',
    'ADMIN_ACTION',
    'GAME_PHASE_CHANGED',
    'SYSTEM_ALERT',
  ]),
  timestamp: isoDateSchema,
  teamId: uuidSchema.nullable(),
  playerId: uuidSchema.nullable(),
  nodeId: uuidSchema.nullable(),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const adminActionSchema = z.object({
  id: uuidSchema,
  adminId: z.string(),
  type: z.enum([
    'TEAM_CREATE',
    'TEAM_UPDATE',
    'TEAM_DELETE',
    'TEAM_START',
    'TEAM_PAUSE',
    'TEAM_RESUME',
    'TEAM_COMPLETE',
    'TEAM_DISQUALIFY',
    'ROLE_ASSIGN',
    'ROLE_REASSIGN',
    'NODE_UNLOCK',
    'NODE_LOCK',
    'NODE_SKIP',
    'SUBMISSION_OVERRIDE',
    'SCORE_ADJUST',
    'TIME_ADJUST',
    'HINT_GRANT',
    'EVIDENCE_GRANT',
    'ITEM_GRANT',
    'FRAGMENT_REVEAL',
    'GAME_START',
    'GAME_PAUSE',
    'GAME_RESUME',
    'GAME_END',
    'CONFIG_UPDATE',
    'ANNOUNCEMENT_SEND',
  ]),
  targetTeamId: uuidSchema.nullable(),
  targetPlayerId: uuidSchema.nullable(),
  targetNodeId: uuidSchema.nullable(),
  payload: z.record(z.string(), z.unknown()),
  reason: z.string().min(1).max(500),
  createdAt: isoDateSchema,
  revertedAt: isoDateSchema.nullable(),
  revertedBy: z.string().nullable(),
})

// ============================================================================
// AUTH & BUREAU REQUEST SCHEMAS (Phase 2)
// ============================================================================

export const loginCodeSchema = z
  .string()
  .length(8)
  .regex(/^[A-Z2-9]{8}$/)
  .refine(val => !/[IO01]/.test(val), {
    message: 'Login code contains invalid characters',
  })

export const playerLoginRequestSchema = z.object({
  code: loginCodeSchema,
  deviceFingerprint: z.string().min(1),
  deviceInfo: z.object({
    userAgent: z.string(),
    screenWidth: z.number().int().positive(),
    screenHeight: z.number().int().positive(),
    isMobile: z.boolean(),
  }),
})

export const createTeamRequestSchema = z.object({
  teamName: z.string().min(1).max(50),
})

export const addPlayerRequestSchema = z.object({
  teamId: uuidSchema,
  displayName: z.string().min(1).max(30),
  role: roleSchema,
})

export const reassignRoleRequestSchema = z.object({
  playerId: uuidSchema,
  newRole: roleSchema,
  reason: z.string().min(1).max(500),
})

export const startTeamRequestSchema = z.object({
  teamId: uuidSchema,
  reason: z.string().min(1).max(500).optional(),
})

export const resetTeamRequestSchema = z.object({
  teamId: uuidSchema,
  reason: z.string().min(1).max(500),
})

export const generateAccessCodesRequestSchema = z.object({
  teamId: uuidSchema,
})

export const teamStatusTransitionRequestSchema = z.object({
  teamId: uuidSchema,
  newStatus: teamStatusSchema,
  reason: z.string().min(1).max(500).optional(),
})

export const adminLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const adminUserSchema = z.object({
  id: uuidSchema,
  authUserId: uuidSchema,
  username: z.string().min(1).max(50),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
  createdAt: isoDateSchema,
  lastLoginAt: isoDateSchema.nullable(),
})

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export const responseMetaSchema = z.object({
  timestamp: isoDateSchema,
  requestId: z.string(),
  version: z.string(),
})

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    error: apiErrorSchema.nullable(),
    meta: responseMetaSchema.optional(),
  })

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema).nullable(),
    error: apiErrorSchema.nullable(),
    meta: responseMetaSchema.extend({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  })

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RoleSchema = z.infer<typeof roleSchema>
export type TeamStatusSchema = z.infer<typeof teamStatusSchema>
export type GameStatusSchema = z.infer<typeof gameStatusSchema>
export type PuzzleTypeSchema = z.infer<typeof puzzleTypeSchema>
export type PuzzleStageSchema = z.infer<typeof puzzleStageSchema>
export type SubmissionResultSchema = z.infer<typeof submissionResultSchema>

export type TeamSchema = z.infer<typeof teamSchema>
export type PlayerSchema = z.infer<typeof playerSchema>
export type PuzzleNodeSchema = z.infer<typeof puzzleNodeSchema>
export type SubmissionSchema = z.infer<typeof submissionSchema>
export type EvidenceSchema = z.infer<typeof evidenceSchema>
export type InventoryItemSchema = z.infer<typeof inventoryItemSchema>
export type FragmentSchema = z.infer<typeof fragmentSchema>
export type QRNodeSchema = z.infer<typeof qrNodeSchema>
export type TeamProgressSchema = z.infer<typeof teamProgressSchema>
export type LeaderboardEntrySchema = z.infer<typeof leaderboardEntrySchema>
export type NotificationSchema = z.infer<typeof notificationSchema>
export type GameEventSchema = z.infer<typeof gameEventSchema>
export type AdminActionSchema = z.infer<typeof adminActionSchema>

export type LoginCodeSchema = z.infer<typeof loginCodeSchema>
export type PlayerLoginRequestSchema = z.infer<typeof playerLoginRequestSchema>
export type CreateTeamRequestSchema = z.infer<typeof createTeamRequestSchema>
export type AddPlayerRequestSchema = z.infer<typeof addPlayerRequestSchema>
export type ReassignRoleRequestSchema = z.infer<typeof reassignRoleRequestSchema>
export type StartTeamRequestSchema = z.infer<typeof startTeamRequestSchema>
export type ResetTeamRequestSchema = z.infer<typeof resetTeamRequestSchema>
export type GenerateAccessCodesRequestSchema = z.infer<typeof generateAccessCodesRequestSchema>
export type TeamStatusTransitionRequestSchema = z.infer<typeof teamStatusTransitionRequestSchema>
export type AdminLoginRequestSchema = z.infer<typeof adminLoginRequestSchema>
export type AdminUserSchema = z.infer<typeof adminUserSchema>
export type PlayerStatusSchema = z.infer<typeof playerStatusSchema>