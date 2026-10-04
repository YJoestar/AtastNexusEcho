/**
 * NEXUS ECHO — NEXUS:// command interpreter
 *
 * Every command reads the same admin API the graphical applications use. There
 * are no commands that only animate. When a read fails the terminal says so in
 * the system's own voice and returns the underlying message, nothing invented.
 *
 * Pure with respect to React: the shell injects the data and the one side
 * effect (opening a window) through `TerminalContext`.
 */
import type {
  AuditLogEntryAdmin,
  EvidenceLabCatalog,
  GameEventAdmin,
  GameStateAdmin,
  LocationEntry,
  TeamWithStats,
} from '@/lib/admin'
import { APPS, APP_ORDER, type AppId } from './apps'

export type LineTone = 'out' | 'dim' | 'ok' | 'warn' | 'err' | 'cmd'
export interface TerminalLine {
  text: string
  tone: LineTone
}
export interface CommandResult {
  lines: TerminalLine[]
  clear?: boolean
}

export interface TerminalContext {
  teams: () => Promise<TeamWithStats[]>
  gameState: () => Promise<GameStateAdmin>
  audit: (limit: number) => Promise<AuditLogEntryAdmin[]>
  events: (limit: number) => Promise<GameEventAdmin[]>
  locations: () => Promise<LocationEntry[]>
  evidence: () => Promise<EvidenceLabCatalog['evidence']>
  connection: { online: boolean; lastSync: Date | null }
  operator: { name: string; role: string }
  now: () => Date
  openApp: (id: AppId, path?: string) => void
  openApps: () => AppId[]
}

export const COMMANDS: Array<{ name: string; usage: string; summary: string }> = [
  { name: 'help', usage: 'help', summary: 'list commands' },
  { name: 'status', usage: 'status', summary: 'link, game state and field units' },
  { name: 'cases', usage: 'cases', summary: 'cases on this system' },
  { name: 'case', usage: 'case 037', summary: 'open the case in the command center' },
  { name: 'teams', usage: 'teams', summary: 'list field units' },
  { name: 'team', usage: 'team <code|name>', summary: 'one field unit, and open its dossier' },
  { name: 'evidence', usage: 'evidence [query]', summary: 'search the evidence register' },
  { name: 'locations', usage: 'locations [query]', summary: 'search the campus archive' },
  { name: 'search', usage: 'search <query>', summary: 'search units, locations, evidence and modules' },
  { name: 'logs', usage: 'logs [n]', summary: 'latest administrative actions' },
  { name: 'events', usage: 'events [n]', summary: 'latest field events' },
  { name: 'open', usage: 'open <module>', summary: 'open a module window' },
  { name: 'apps', usage: 'apps', summary: 'modules, and which are open' },
  { name: 'whoami', usage: 'whoami', summary: 'operator and clearance' },
  { name: 'time', usage: 'time', summary: 'station time' },
  { name: 'clear', usage: 'clear', summary: 'clear the screen' },
]

const out = (text: string, tone: LineTone = 'out'): TerminalLine => ({ text, tone })

/** Module names a person would type: "evidence", "field units", "log". */
const ALIASES: Record<string, AppId> = {
  command: 'COMMAND', dashboard: 'COMMAND', center: 'COMMAND', centre: 'COMMAND',
  teams: 'FIELD_UNITS', units: 'FIELD_UNITS', field: 'FIELD_UNITS',
  locations: 'LOCATIONS', sites: 'LOCATIONS',
  operations: 'OPERATIONS', control: 'OPERATIONS', game: 'OPERATIONS',
  record: 'RECORD', ledger: 'RECORD', leaderboard: 'RECORD',
  evidence: 'EVIDENCE', register: 'EVIDENCE',
  archive: 'ARCHIVE', showcase: 'ARCHIVE',
  surveillance: 'SURVEILLANCE', cameras: 'SURVEILLANCE', cctv: 'SURVEILLANCE',
  log: 'ACCESS_LOG', logs: 'ACCESS_LOG', audit: 'ACCESS_LOG', access: 'ACCESS_LOG',
  simulator: 'SIMULATOR', sim: 'SIMULATOR', handset: 'SIMULATOR',
  qa: 'QA_MONITOR', monitor: 'QA_MONITOR',
  terminal: 'TERMINAL', nexus: 'TERMINAL',
}

export function resolveApp(query: string): AppId | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  if (ALIASES[q]) return ALIASES[q]
  const byId = APP_ORDER.find(id => id.toLowerCase() === q.replace(/\s+/g, '_'))
  if (byId) return byId
  const byTitle = APP_ORDER.find(id => APPS[id].title.toLowerCase().includes(q))
  return byTitle ?? null
}

const pad = (value: string | number, width: number) => String(value).padEnd(width).slice(0, width)

function stamp(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '--:--:--' : date.toTimeString().slice(0, 8)
}

function archiveError(what: string, error: unknown): CommandResult {
  const message = error instanceof Error ? error.message : String(error)
  return {
    lines: [
      out('ARCHIVE ERROR', 'err'),
      out(`Unable to retrieve ${what}.`, 'err'),
      out(`SOURCE: ${message}`, 'dim'),
    ],
  }
}

const matches = (query: string, ...fields: Array<string | null | undefined>) => {
  const q = query.toLowerCase()
  return fields.some(field => field?.toLowerCase().includes(q))
}

export async function runCommand(raw: string, ctx: TerminalContext): Promise<CommandResult> {
  const input = raw.trim()
  if (!input) return { lines: [] }
  const [name, ...rest] = input.split(/\s+/)
  const argument = rest.join(' ')
  const command = name.toLowerCase()

  try {
    switch (command) {
      case 'help':
        return {
          lines: [
            out('COMMANDS', 'dim'),
            ...COMMANDS.map(entry => out(`  ${pad(entry.usage, 22)} ${entry.summary}`)),
          ],
        }

      case 'clear':
        return { lines: [], clear: true }

      case 'whoami':
        return { lines: [out(`${ctx.operator.name}`), out(`ACCESS LEVEL: ${ctx.operator.role}`, 'dim')] }

      case 'time': {
        const now = ctx.now()
        return { lines: [out(now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'), out(now.toTimeString().slice(0, 8) + ' STATION', 'dim')] }
      }

      case 'apps':
        return {
          lines: APP_ORDER.map(id => {
            const open = ctx.openApps().includes(id)
            return out(`  ${APPS[id].module}  ${pad(APPS[id].title, 24)} ${open ? 'OPEN' : '    '}  ${APPS[id].purpose}`, open ? 'ok' : 'out')
          }),
        }

      case 'open': {
        if (!argument) return { lines: [out('USAGE: open <module>   (type apps for the list)', 'warn')] }
        const id = resolveApp(argument)
        if (!id) return { lines: [out(`NO MODULE MATCHES "${argument}". TYPE apps.`, 'err')] }
        ctx.openApp(id)
        return { lines: [out(`OPENING ${APPS[id].module} ${APPS[id].title}`, 'ok')] }
      }

      case 'cases':
        return { lines: [out('CASE 037   North campus   ACTIVE'), out('1 case on this system. Type "case 037".', 'dim')] }

      case 'case': {
        if (argument.replace(/^0+/, '') !== '37') return { lines: [out(`NO CASE "${argument || '?'}" ON THIS SYSTEM. TYPE cases.`, 'err')] }
        ctx.openApp('COMMAND')
        return { lines: [out('OPENING CASE 037 / COMMAND CENTER', 'ok')] }
      }

      case 'status': {
        const lines: TerminalLine[] = [
          out(`LINK         ${ctx.connection.online ? 'AVAILABLE' : 'OFFLINE'}`, ctx.connection.online ? 'ok' : 'err'),
          out(`LAST ACK     ${ctx.connection.lastSync ? ctx.connection.lastSync.toTimeString().slice(0, 8) : 'NOT ESTABLISHED'}`, ctx.connection.lastSync ? 'out' : 'warn'),
        ]
        const [state, teams] = await Promise.allSettled([ctx.gameState(), ctx.teams()])
        if (state.status === 'fulfilled') lines.push(out(`GAME STATE   ${state.value.gameStatus}`))
        else lines.push(out('GAME STATE   UNAVAILABLE', 'warn'))
        if (teams.status === 'fulfilled') {
          const active = teams.value.filter(team => team.status === 'ACTIVE').length
          lines.push(out(`FIELD UNITS  ${active} ACTIVE / ${teams.value.length}`))
          lines.push(out(`PERSONNEL    ${teams.value.reduce((sum, team) => sum + (team.playerCount ?? 0), 0)}`))
        } else lines.push(out('FIELD UNITS  UNAVAILABLE', 'warn'))
        lines.push(out(`MODULES OPEN ${ctx.openApps().length}`, 'dim'))
        return { lines }
      }

      case 'teams': {
        const teams = await ctx.teams()
        if (teams.length === 0) return { lines: [out('No field units registered.', 'dim')] }
        return {
          lines: [
            out(`${pad('CODE', 10)} ${pad('NAME', 22)} ${pad('STATUS', 12)} ${pad('PLAYERS', 8)} NODE`, 'dim'),
            ...teams.map(team => out(`${pad(team.code, 10)} ${pad(team.name, 22)} ${pad(team.status, 12)} ${pad(team.playerCount ?? 0, 8)} ${team.currentNodeCode ?? '—'}`)),
          ],
        }
      }

      case 'team': {
        if (!argument) return { lines: [out('USAGE: team <code|name>', 'warn')] }
        const teams = await ctx.teams()
        const found = teams.filter(team => matches(argument, team.code, team.name))
        if (found.length === 0) return { lines: [out(`NO FIELD UNIT MATCHES "${argument}".`, 'err')] }
        if (found.length > 1) return { lines: [out(`${found.length} MATCHES. BE MORE SPECIFIC:`, 'warn'), ...found.map(team => out(`  ${team.code}  ${team.name}`))] }
        const team = found[0]
        ctx.openApp('FIELD_UNITS', `/admin/teams/${team.id}`)
        return {
          lines: [
            out(`${team.code}  ${team.name}`, 'ok'),
            out(`STATUS ${team.status}   SCORE ${team.score}   SOLVED ${team.solvedCount}   HINTS ${team.hintsUsed}`),
            out(`PLAYERS ${team.playerCount}   NODE ${team.currentNodeCode ?? '—'}`, 'dim'),
            out('OPENING DOSSIER', 'dim'),
          ],
        }
      }

      case 'locations': {
        const locations = await ctx.locations()
        const hits = argument ? locations.filter(item => matches(argument, item.name, item.nodeCode, item.nodeTitle)) : locations
        if (hits.length === 0) return { lines: [out(argument ? `NO LOCATION MATCHES "${argument}".` : 'No locations recorded.', 'dim')] }
        return { lines: hits.slice(0, 40).map(item => out(`${pad(item.nodeCode, 8)} ${pad(item.name, 30)} ${item.status}`)).concat(hits.length > 40 ? [out(`… ${hits.length - 40} more. Narrow the query.`, 'dim')] : []) }
      }

      case 'evidence': {
        const evidence = await ctx.evidence()
        const hits = argument ? evidence.filter(item => matches(argument, item.code, item.title, item.description, item.type)) : evidence
        if (hits.length === 0) return { lines: [out(argument ? `NO EVIDENCE MATCHES "${argument}".` : 'The register holds no records.', 'dim')] }
        return {
          lines: [
            out(`${pad('ID', 14)} ${pad('CLASS', 12)} ${pad('CONDITION', 10)} TITLE`, 'dim'),
            ...hits.slice(0, 40).map(item => out(`${pad(item.code, 14)} ${pad(item.type, 12)} ${pad(item.condition ?? 'NORMAL', 10)} ${item.title}`)),
            ...(hits.length > 40 ? [out(`… ${hits.length - 40} more. Narrow the query.`, 'dim')] : []),
          ],
        }
      }

      case 'search': {
        if (!argument) return { lines: [out('USAGE: search <query>', 'warn')] }
        const [teams, locations, evidence] = await Promise.allSettled([ctx.teams(), ctx.locations(), ctx.evidence()])
        const lines: TerminalLine[] = []
        const apps = APP_ORDER.filter(id => matches(argument, APPS[id].title, APPS[id].purpose))
        if (apps.length) { lines.push(out('MODULES', 'dim')); apps.forEach(id => lines.push(out(`  ${APPS[id].module}  ${APPS[id].title}`))) }
        if (teams.status === 'fulfilled') {
          const hits = teams.value.filter(team => matches(argument, team.code, team.name))
          if (hits.length) { lines.push(out('FIELD UNITS', 'dim')); hits.slice(0, 10).forEach(team => lines.push(out(`  ${pad(team.code, 10)} ${team.name}`))) }
        }
        if (locations.status === 'fulfilled') {
          const hits = locations.value.filter(item => matches(argument, item.name, item.nodeCode, item.nodeTitle))
          if (hits.length) { lines.push(out('LOCATIONS', 'dim')); hits.slice(0, 10).forEach(item => lines.push(out(`  ${pad(item.nodeCode, 8)} ${item.name}`))) }
        }
        if (evidence.status === 'fulfilled') {
          const hits = evidence.value.filter(item => matches(argument, item.code, item.title, item.description))
          if (hits.length) { lines.push(out('EVIDENCE', 'dim')); hits.slice(0, 10).forEach(item => lines.push(out(`  ${pad(item.code, 14)} ${item.title}`))) }
        }
        const failed = [teams, locations, evidence].filter(result => result.status === 'rejected').length
        if (lines.length === 0) lines.push(out(`NOTHING MATCHES "${argument}".`, 'dim'))
        if (failed) lines.push(out(`${failed} SOURCE${failed > 1 ? 'S' : ''} UNAVAILABLE — RESULTS INCOMPLETE`, 'warn'))
        return { lines }
      }

      case 'logs': {
        const count = Math.max(1, Math.min(50, Number.parseInt(argument, 10) || 10))
        const entries = await ctx.audit(count)
        if (entries.length === 0) return { lines: [out('No administrative actions recorded.', 'dim')] }
        return { lines: entries.slice(0, count).map(entry => out(`${stamp(entry.createdAt)}  ${pad(entry.action, 22)} ${entry.reason ?? ''}`.trimEnd())) }
      }

      case 'events': {
        const count = Math.max(1, Math.min(50, Number.parseInt(argument, 10) || 10))
        const entries = await ctx.events(count)
        if (entries.length === 0) return { lines: [out('No field events recorded.', 'dim')] }
        return { lines: entries.slice(0, count).map(entry => out(`${stamp(entry.timestamp)}  ${pad(entry.type, 24)} ${entry.nodeId ?? ''}`.trimEnd())) }
      }

      default:
        return { lines: [out(`UNKNOWN COMMAND: ${name}. TYPE help.`, 'err')] }
    }
  } catch (error) {
    return archiveError(command === 'logs' ? 'the access record' : command === 'events' ? 'field events' : `${command} data`, error)
  }
}

/** Tab completion over command names and module aliases. */
export function complete(partial: string): string[] {
  const [first, ...rest] = partial.split(/\s+/)
  if (rest.length === 0) return COMMANDS.map(entry => entry.name).filter(name => name.startsWith(first.toLowerCase()))
  if (first.toLowerCase() === 'open') {
    const last = rest.join(' ').toLowerCase()
    return Object.keys(ALIASES).filter(alias => alias.startsWith(last)).map(alias => `open ${alias}`)
  }
  return []
}
