/**
 * NEXUS — App Configuration
 * Centralized configuration constants
 */

export const APP_CONFIG = {
  name: 'NEXUS',
  version: '0.1.0',
  description: 'Cooperative Puzzle Hunt Platform',
  eventDate: '2026-09-30',
  maxTeams: 25,
  playersPerTeam: 3,
  gameDurationMinutes: 180,
  rollingStartIntervalMinutes: 10,
} as const

export const ROUTES = {
  // Player routes
  PLAYER_LOGIN: '/player/login',
  PLAYER_WAITING: '/player/waiting',
  PLAYER_GAME: '/player/game',
  PLAYER_NODE: '/player/game/node/:nodeId',
  PLAYER_EVIDENCE: '/player/game/evidence',
  PLAYER_INVENTORY: '/player/game/inventory',
  PLAYER_NAVIGATION: '/player/game/navigation',
  PLAYER_QR: '/player/game/qr',
  PLAYER_LEADERBOARD: '/player/game/leaderboard',
  PLAYER_NOTIFICATIONS: '/player/game/notifications',
  PLAYER_FINAL: '/player/game/final',
  PLAYER_COMPLETE: '/player/game/complete',

  // Admin routes
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_TEAMS: '/admin/teams',
  ADMIN_TEAM_DETAIL: '/admin/teams/:teamId',
  ADMIN_LEADERBOARD: '/admin/leaderboard',
  ADMIN_GAME_CONTROL: '/admin/game-control',
  ADMIN_AUDIT: '/admin/audit',
   ADMIN_LOCATIONS: '/admin/locations',
   ADMIN_QA_VIEWER: '/admin/qa-viewer',

  // Shared
  HOME: '/',
  NOT_FOUND: '*',
} as const

export const STORAGE_KEYS = {
  PLAYER_SESSION: 'nexus_player_session',
  ADMIN_SESSION: 'nexus_admin_session',
  TEAM_CODE: 'nexus_team_code',
  PLAYER_ROLE: 'nexus_player_role',
  DEVICE_INFO: 'nexus_device_info',
} as const

export const QUERY_KEYS = {
  TEAM: 'team',
  PLAYER: 'player',
  PUZZLE_NODES: 'puzzleNodes',
  TEAM_PROGRESS: 'teamProgress',
  SUBMISSIONS: 'submissions',
  EVIDENCE: 'evidence',
  INVENTORY: 'inventory',
  FRAGMENTS: 'fragments',
  QR_NODES: 'qrNodes',
  NOTIFICATIONS: 'notifications',
  LEADERBOARD: 'leaderboard',
  GAME_STATE: 'gameState',
  ADMIN_TEAMS: 'adminTeams',
  ADMIN_ACTIONS: 'adminActions',
} as const

export const REALTIME_CHANNELS = {
  TEAM_PROGRESS: 'team_progress',
  NOTIFICATIONS: 'notifications',
  GAME_EVENTS: 'game_events',
  ADMIN_ACTIONS: 'admin_actions',
} as const

export const ROLES = ['OBSERVER', 'ANALYST', 'OPERATOR'] as const

export const ROLE_LABELS = {
  OBSERVER: 'Observer',
  ANALYST: 'Analyst',
  OPERATOR: 'Operator',
} as const

export const ROLE_DESCRIPTIONS = {
  OBSERVER: 'Gathers visual intelligence. Scans environments. Identifies patterns.',
  ANALYST: 'Processes data. Decodes signals. Connects fragments.',
  OPERATOR: 'Executes actions. Manipulates systems. Bridges physical and digital.',
} as const

export const TEAM_STATUSES = [
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

export const PLAYER_STATUSES = ['INVITED', 'ACTIVE', 'OFFLINE', 'REMOVED'] as const

export const ROLE_COLORS = {
  OBSERVER: { bg: 'bg-cyan-950/30', text: 'text-cyan-300', border: 'border-cyan-800/40', icon: 'eye' },
  ANALYST: { bg: 'bg-amber-950/30', text: 'text-amber-300', border: 'border-amber-800/40', icon: 'brain' },
  OPERATOR: { bg: 'bg-indigo-950/30', text: 'text-indigo-300', border: 'border-indigo-800/40', icon: 'wrench' },
} as const

export const ROLE_SUBTITLES: Record<string, string> = {
  OBSERVER: 'FIELD OBSERVATION',
  ANALYST: 'PATTERN ANALYSIS',
  OPERATOR: 'SYSTEM SYNTHESIS',
} as const

export const ROLE_THEMES: Record<string, {
  subtitle: string
  icon: string
  bg: string
  text: string
  border: string
  accent: string
  badge: string
}> = {
  OBSERVER: {
    subtitle: 'FIELD OBSERVATION',
    icon: 'Eye',
    bg: 'bg-cyan-950/30',
    text: 'text-cyan-300',
    border: 'border-cyan-800/40',
    accent: 'bg-cyan-400',
    badge: 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/30',
  },
  ANALYST: {
    subtitle: 'PATTERN ANALYSIS',
    icon: 'Brain',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    border: 'border-amber-800/40',
    accent: 'bg-amber-400',
    badge: 'bg-amber-900/40 text-amber-300 border border-amber-700/30',
  },
  OPERATOR: {
    subtitle: 'SYSTEM SYNTHESIS',
    icon: 'Wrench',
    bg: 'bg-indigo-950/30',
    text: 'text-indigo-300',
    border: 'border-indigo-800/40',
    accent: 'bg-indigo-400',
    badge: 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/30',
  },
} as const

export const STATUS_COLORS = {
  REGISTERED: { bg: 'bg-neutral-900/40', text: 'text-neutral-300', dot: 'bg-neutral-400' },
  FORMING: { bg: 'bg-blue-900/40', text: 'text-blue-300', dot: 'bg-blue-400' },
  READY: { bg: 'bg-cyan-900/40', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  WAITING: { bg: 'bg-yellow-900/40', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  ACTIVE: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  PAUSED: { bg: 'bg-blue-900/40', text: 'text-blue-300', dot: 'bg-blue-400' },
  COMPLETED: { bg: 'bg-purple-900/40', text: 'text-purple-300', dot: 'bg-purple-400' },
  DISQUALIFIED: { bg: 'bg-red-900/40', text: 'text-red-300', dot: 'bg-red-400' },
  ABANDONED: { bg: 'bg-gray-900/40', text: 'text-gray-300', dot: 'bg-gray-400' },
  RESET: { bg: 'bg-neutral-900/40', text: 'text-neutral-400', dot: 'bg-neutral-500' },
} as const

export type StatusColorKey = keyof typeof STATUS_COLORS

export const MAX_PLAYERS_PER_TEAM = 3

export const TEAM_COLORS = [
  { name: 'Red', value: 'red', hex: '#EF4444' },
  { name: 'Blue', value: 'blue', hex: '#3B82F6' },
  { name: 'Green', value: 'green', hex: '#10B981' },
  { name: 'Purple', value: 'purple', hex: '#8B5CF6' },
  { name: 'Amber', value: 'amber', hex: '#F59E0B' },
  { name: 'Cyan', value: 'cyan', hex: '#06B6D4' },
  { name: 'Rose', value: 'rose', hex: '#F43F5E' },
  { name: 'Indigo', value: 'indigo', hex: '#6366F1' },
] as const

export const PLAYER_ROLES = ['OBSERVER', 'ANALYST', 'OPERATOR'] as const

export type PlayerRole = (typeof PLAYER_ROLES)[number]

export const PLAYER_STATUS_COLORS = {
  INVITED: { bg: 'bg-neutral-900/40', text: 'text-neutral-300', dot: 'bg-neutral-400' },
  ACTIVE: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  OFFLINE: { bg: 'bg-gray-900/40', text: 'text-gray-300', dot: 'bg-gray-400' },
  REMOVED: { bg: 'bg-red-900/40', text: 'text-red-300', dot: 'bg-red-400' },
} as const

export const DIFFICULTY_LABELS = {
  1: 'Trivial',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Expert',
} as const

export const PUZZLE_TYPE_LABELS = {
  OBSERVATION: 'Observation',
  DECODING: 'Decoding',
  LOGIC: 'Logic',
  PATTERN: 'Pattern',
  PHYSICAL: 'Physical',
  META: 'Meta',
  FINAL: 'Final',
} as const

export const NOTIFICATION_TYPE_OPTIONS = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'ADMIN_MESSAGE', label: 'Admin Message' },
  { value: 'PUZZLE_UNLOCKED', label: 'Puzzle Unlocked' },
  { value: 'PUZZLE_SOLVED', label: 'Puzzle Solved' },
  { value: 'HINT_AVAILABLE', label: 'Hint Available' },
  { value: 'EVIDENCE_FOUND', label: 'Evidence Found' },
  { value: 'ITEM_ACQUIRED', label: 'Item Acquired' },
  { value: 'FRAGMENT_REVEALED', label: 'Fragment Revealed' },
  { value: 'TIME_WARNING', label: 'Time Warning' },
  { value: 'ROLE_ACTION_REQUIRED', label: 'Role Action Required' },
  { value: 'GAME_PHASE_CHANGE', label: 'Game Phase Change' },
  { value: 'TEAM_STATUS_CHANGE', label: 'Team Status Change' },
] as const

export const NOTIFICATION_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const

export const LOCATION_STATUSES = ['ACTIVE', 'INACTIVE'] as const