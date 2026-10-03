/**
 * NEXUS ECHO — Workstation application registry
 *
 * Every window on the workstation is one of these. Nine of them are the
 * existing admin screens, unchanged in behaviour and still reachable at their
 * original URLs; TERMINAL and SURVEILLANCE are built on data the admin already
 * has. Names are the institution's own vocabulary (carried over from the old
 * sidebar), not generic admin labels.
 */
import { ROUTES } from '@/app/config'

export type AppId =
  | 'COMMAND'
  | 'FIELD_UNITS'
  | 'LOCATIONS'
  | 'OPERATIONS'
  | 'RECORD'
  | 'EVIDENCE'
  | 'SURVEILLANCE'
  | 'ACCESS_LOG'
  | 'SIMULATOR'
  | 'QA_MONITOR'
  | 'TERMINAL'

export interface AppDefinition {
  id: AppId
  /** Short module code shown in the window header. */
  module: string
  title: string
  /** One line: what it is for. */
  purpose: string
  /** Router path for apps that host an existing admin screen. */
  path: string | null
  size: { w: number; h: number }
  /** Allow more than one window of this app. */
  multiple: boolean
  glyph: GlyphName
}

export type GlyphName =
  | 'dossier'
  | 'personnel'
  | 'site'
  | 'switchboard'
  | 'ledger'
  | 'plate'
  | 'camera'
  | 'tape'
  | 'handset'
  | 'inspect'
  | 'prompt'

export const APPS: Record<AppId, AppDefinition> = {
  COMMAND: { id: 'COMMAND', module: 'M-01', title: 'COMMAND CENTER', purpose: 'Active investigation, field status and telemetry', path: ROUTES.ADMIN_DASHBOARD, size: { w: 1180, h: 780 }, multiple: false, glyph: 'dossier' },
  FIELD_UNITS: { id: 'FIELD_UNITS', module: 'M-02', title: 'FIELD UNITS', purpose: 'Teams, personnel dossiers and credentials', path: ROUTES.ADMIN_TEAMS, size: { w: 1040, h: 720 }, multiple: false, glyph: 'personnel' },
  LOCATIONS: { id: 'LOCATIONS', module: 'M-03', title: 'LOCATIONS', purpose: 'Campus archive, nodes and QR codes', path: ROUTES.ADMIN_LOCATIONS, size: { w: 1040, h: 720 }, multiple: false, glyph: 'site' },
  OPERATIONS: { id: 'OPERATIONS', module: 'M-04', title: 'OPERATIONS CONTROL', purpose: 'Game state and master switches', path: ROUTES.ADMIN_GAME_CONTROL, size: { w: 920, h: 700 }, multiple: false, glyph: 'switchboard' },
  RECORD: { id: 'RECORD', module: 'M-05', title: 'OPERATIONAL RECORD', purpose: 'Field ledger and rankings', path: ROUTES.ADMIN_LEADERBOARD, size: { w: 920, h: 640 }, multiple: false, glyph: 'ledger' },
  EVIDENCE: { id: 'EVIDENCE', module: 'M-06', title: 'EVIDENCE REGISTER', purpose: 'Full evidence inventory and inspection', path: ROUTES.ADMIN_EVIDENCE_REGISTER, size: { w: 1120, h: 760 }, multiple: false, glyph: 'plate' },
  SURVEILLANCE: { id: 'SURVEILLANCE', module: 'M-07', title: 'SURVEILLANCE CONTROL', purpose: 'Camera feeds recovered into the case', path: null, size: { w: 1000, h: 700 }, multiple: false, glyph: 'camera' },
  ACCESS_LOG: { id: 'ACCESS_LOG', module: 'M-08', title: 'SYSTEM ACCESS RECORD', purpose: 'Every administrative action, in order', path: ROUTES.ADMIN_AUDIT, size: { w: 960, h: 660 }, multiple: false, glyph: 'tape' },
  SIMULATOR: { id: 'SIMULATOR', module: 'M-09', title: 'FIELD SIMULATOR', purpose: 'Handset emulation in isolated memory', path: ROUTES.ADMIN_QA_HUB, size: { w: 1100, h: 780 }, multiple: false, glyph: 'handset' },
  QA_MONITOR: { id: 'QA_MONITOR', module: 'M-10', title: 'QA MONITOR', purpose: 'Puzzle content inspection', path: ROUTES.ADMIN_QA_VIEWER, size: { w: 1000, h: 700 }, multiple: false, glyph: 'inspect' },
  TERMINAL: { id: 'TERMINAL', module: 'M-11', title: 'NEXUS://', purpose: 'Command line to the same data', path: null, size: { w: 720, h: 460 }, multiple: false, glyph: 'prompt' },
}

export const APP_ORDER: AppId[] = [
  'COMMAND', 'FIELD_UNITS', 'LOCATIONS', 'OPERATIONS', 'RECORD', 'EVIDENCE',
  'SURVEILLANCE', 'ACCESS_LOG', 'SIMULATOR', 'QA_MONITOR', 'TERMINAL',
]

/** Which app owns an admin URL (team detail belongs to FIELD_UNITS). */
export function appForPath(pathname: string): AppId | null {
  const clean = pathname.replace(/\/+$/, '')
  if (clean === '/admin' || clean === '') return 'COMMAND'
  const match = APP_ORDER.find(id => {
    const path = APPS[id].path
    return path !== null && (clean === path || clean.startsWith(`${path}/`))
  })
  return match ?? null
}
