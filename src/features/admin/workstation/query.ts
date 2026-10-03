/**
 * NEXUS ECHO — QUERY ARCHIVE
 *
 * The global search behind Ctrl/Cmd+K. Pure: given what the workstation already
 * holds, return ranked records. Nothing here fetches.
 */
import type { EvidenceLabCatalog, LocationEntry, TeamWithStats } from '@/lib/admin'
import { APPS, APP_ORDER, type AppId } from './apps'

export type QueryFilter = 'ALL' | 'MODULE' | 'UNIT' | 'LOCATION' | 'EVIDENCE'

export interface QueryData {
  teams: TeamWithStats[]
  locations: LocationEntry[]
  evidence: EvidenceLabCatalog['evidence']
}

export type QueryTarget =
  | { kind: 'MODULE'; app: AppId }
  | { kind: 'UNIT'; app: 'FIELD_UNITS'; path: string }
  | { kind: 'LOCATION'; app: 'LOCATIONS' }
  | { kind: 'EVIDENCE'; app: 'EVIDENCE' }

export interface QueryResult {
  id: string
  kind: Exclude<QueryFilter, 'ALL'>
  /** Record identifier, shown in monospace. */
  code: string
  title: string
  detail: string
  score: number
  target: QueryTarget
}

export const QUERY_FILTERS: Array<{ id: QueryFilter; label: string }> = [
  { id: 'ALL', label: 'ALL' },
  { id: 'MODULE', label: 'MODULES' },
  { id: 'UNIT', label: 'FIELD UNITS' },
  { id: 'LOCATION', label: 'LOCATIONS' },
  { id: 'EVIDENCE', label: 'EVIDENCE' },
]

/** 3 exact, 2 prefix, 1 contains, 0 no match. */
function rank(query: string, ...fields: Array<string | null | undefined>): number {
  let best = 0
  for (const field of fields) {
    const value = field?.toLowerCase()
    if (!value) continue
    if (value === query) return 3
    if (value.startsWith(query)) best = Math.max(best, 2)
    else if (value.includes(query)) best = Math.max(best, 1)
  }
  return best
}

export function queryArchive(rawQuery: string, filter: QueryFilter, data: QueryData, limit = 40): QueryResult[] {
  const query = rawQuery.trim().toLowerCase()
  const results: QueryResult[] = []
  const wants = (kind: QueryFilter) => filter === 'ALL' || filter === kind

  if (wants('MODULE')) {
    for (const id of APP_ORDER) {
      const app = APPS[id]
      const score = query ? Math.max(rank(query, app.title, app.module), rank(query, app.purpose) > 0 ? 1 : 0) : 1
      if (score > 0) results.push({ id: `module:${id}`, kind: 'MODULE', code: app.module, title: app.title, detail: app.purpose, score, target: { kind: 'MODULE', app: id } })
    }
  }
  if (query) {
    if (wants('UNIT')) {
      for (const team of data.teams) {
        const score = rank(query, team.code, team.name)
        if (score > 0) results.push({ id: `unit:${team.id}`, kind: 'UNIT', code: team.code, title: team.name, detail: `${team.status} · ${team.playerCount ?? 0} personnel`, score, target: { kind: 'UNIT', app: 'FIELD_UNITS', path: `/admin/teams/${team.id}` } })
      }
    }
    if (wants('LOCATION')) {
      for (const place of data.locations) {
        const score = rank(query, place.nodeCode, place.name, place.nodeTitle)
        if (score > 0) results.push({ id: `location:${place.id}`, kind: 'LOCATION', code: place.nodeCode, title: place.name, detail: place.nodeTitle, score, target: { kind: 'LOCATION', app: 'LOCATIONS' } })
      }
    }
    if (wants('EVIDENCE')) {
      for (const item of data.evidence) {
        const score = Math.max(rank(query, item.code, item.title), rank(query, item.description, item.type) > 0 ? 1 : 0)
        if (score > 0) results.push({ id: `evidence:${item.id}`, kind: 'EVIDENCE', code: item.code, title: item.title, detail: `${item.type} · ${item.condition ?? 'NORMAL'}`, score, target: { kind: 'EVIDENCE', app: 'EVIDENCE' } })
      }
    }
  }
  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}
