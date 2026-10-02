export type EvidenceMark = 'UNMARKED' | 'REVIEW' | 'IMPORTANT' | 'UNRESOLVED' | 'VERIFIED' | 'CONTRADICTION'
export type AnnotationKind = 'NOTE' | 'QUESTION' | 'CONTRADICTION' | 'REFERENCE' | 'MARKER'

export interface EvidenceAnnotation {
  id: string
  kind: AnnotationKind
  text: string
  createdAt: string
  x?: number
  y?: number
}

export interface BoardPlacement {
  x: number
  y: number
  rotation: number
  order: number
  pinned: boolean
}

export interface EvidenceHypothesis {
  id: string
  from: string
  to: string
  note: string
  createdAt: string
}

export interface EvidenceRevelation {
  seenFields: Set<string>
  firstSeenAt: string
  lastInspectedAt: string | null
  hasNewInfo: boolean
}

export interface InvestigationWorkspace {
  version: 1
  annotations: Record<string, EvidenceAnnotation[]>
  marks: Record<string, EvidenceMark>
  placements: Record<string, BoardPlacement>
  hypotheses: EvidenceHypothesis[]
  lastInspected: Record<string, string>
  revelations: Record<string, EvidenceRevelation>
}

const STORAGE_PREFIX = 'nexus_case_workspace_v1:'
const EVIDENCE_MARKS = new Set<EvidenceMark>([
  'UNMARKED', 'REVIEW', 'IMPORTANT', 'UNRESOLVED', 'VERIFIED', 'CONTRADICTION',
])
const ANNOTATION_KINDS = new Set<AnnotationKind>([
  'NOTE', 'QUESTION', 'CONTRADICTION', 'REFERENCE', 'MARKER',
])

export function emptyInvestigationWorkspace(): InvestigationWorkspace {
  return {
    version: 1,
    annotations: {},
    marks: {},
    placements: {},
    hypotheses: [],
    lastInspected: {},
    revelations: {},
  }
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clampPercent(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : undefined
}

function normalizeWorkspace(value: unknown): InvestigationWorkspace {
  if (!isRecord(value) || value.version !== 1) return emptyInvestigationWorkspace()

  const annotations: InvestigationWorkspace['annotations'] = {}
  if (isRecord(value.annotations)) {
    for (const [artifactId, entries] of Object.entries(value.annotations)) {
      if (!Array.isArray(entries)) continue
      annotations[artifactId] = entries.flatMap(entry => {
        if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.text !== 'string') return []
        if (typeof entry.kind !== 'string' || !ANNOTATION_KINDS.has(entry.kind as AnnotationKind)) return []
        const normalized: EvidenceAnnotation = {
          id: entry.id,
          kind: entry.kind as AnnotationKind,
          text: entry.text.slice(0, 3000),
          createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
        }
        const x = clampPercent(entry.x)
        const y = clampPercent(entry.y)
        if (x !== undefined) normalized.x = x
        if (y !== undefined) normalized.y = y
        return [normalized]
      }).slice(-100)
    }
  }

  const marks: InvestigationWorkspace['marks'] = {}
  if (isRecord(value.marks)) {
    for (const [artifactId, mark] of Object.entries(value.marks)) {
      if (typeof mark === 'string' && EVIDENCE_MARKS.has(mark as EvidenceMark)) {
        marks[artifactId] = mark as EvidenceMark
      }
    }
  }

  const placements: InvestigationWorkspace['placements'] = {}
  if (isRecord(value.placements)) {
    for (const [artifactId, placement] of Object.entries(value.placements)) {
      if (!isRecord(placement)) continue
      const x = clampPercent(placement.x)
      const y = clampPercent(placement.y)
      if (x === undefined || y === undefined) continue
      placements[artifactId] = {
        x,
        y,
        rotation: typeof placement.rotation === 'number' && Number.isFinite(placement.rotation)
          ? Math.max(-12, Math.min(12, placement.rotation))
          : 0,
        order: typeof placement.order === 'number' && Number.isFinite(placement.order) ? placement.order : 0,
        pinned: placement.pinned === true,
      }
    }
  }

  const hypotheses = Array.isArray(value.hypotheses)
    ? value.hypotheses.flatMap(entry => {
        if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.from !== 'string' || typeof entry.to !== 'string') return []
        return [{
          id: entry.id,
          from: entry.from,
          to: entry.to,
          note: typeof entry.note === 'string' ? entry.note.slice(0, 1000) : '',
          createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
        }]
      }).slice(-200)
    : []

  const lastInspected: InvestigationWorkspace['lastInspected'] = {}
  if (isRecord(value.lastInspected)) {
    for (const [artifactId, timestamp] of Object.entries(value.lastInspected)) {
      if (typeof timestamp === 'string') lastInspected[artifactId] = timestamp
    }
  }

  const revelations: InvestigationWorkspace['revelations'] = {}
  if (isRecord(value.revelations)) {
    for (const [artifactId, revelation] of Object.entries(value.revelations)) {
      if (!isRecord(revelation)) continue
      const firstSeenAt = typeof revelation.firstSeenAt === 'string'
        ? revelation.firstSeenAt
        : new Date().toISOString()
      const lastInspectedAt = typeof revelation.lastInspectedAt === 'string'
        ? revelation.lastInspectedAt
        : null
      let seenFields: Set<string>
      if (Array.isArray(revelation.seenFields)) {
        seenFields = new Set(revelation.seenFields.filter(field => typeof field === 'string'))
      } else if (isRecord(revelation.seenFields)) {
        seenFields = new Set(Object.values(revelation.seenFields).filter(field => typeof field === 'string'))
      } else {
        seenFields = new Set()
      }
      revelations[artifactId] = {
        seenFields,
        firstSeenAt,
        lastInspectedAt,
        hasNewInfo: revelation.hasNewInfo === true,
      }
    }
  }

  return { version: 1, annotations, marks, placements, hypotheses, lastInspected, revelations }
}

export function readInvestigationWorkspace(
  teamId: string | null | undefined,
  store: Pick<Storage, 'getItem'> | null = storage(),
): InvestigationWorkspace {
  if (!teamId || !store) return emptyInvestigationWorkspace()
  try {
    const raw = store.getItem(`${STORAGE_PREFIX}${teamId}`)
    return raw ? normalizeWorkspace(JSON.parse(raw) as unknown) : emptyInvestigationWorkspace()
  } catch {
    return emptyInvestigationWorkspace()
  }
}

export function writeInvestigationWorkspace(
  teamId: string | null | undefined,
  workspace: InvestigationWorkspace,
  store: Pick<Storage, 'setItem'> | null = storage(),
): void {
  if (!teamId || !store) return
  try {
    store.setItem(`${STORAGE_PREFIX}${teamId}`, JSON.stringify(serializeWorkspace(workspace)))
  } catch {
    // Personal notes must never interrupt the server-authoritative game flow.
  }
}

function serializeWorkspace(workspace: InvestigationWorkspace): unknown {
  return {
    ...workspace,
    revelations: Object.fromEntries(
      Object.entries(workspace.revelations).map(([artifactId, revelation]) => [
        artifactId,
        {
          seenFields: Array.from(revelation.seenFields),
          firstSeenAt: revelation.firstSeenAt,
          lastInspectedAt: revelation.lastInspectedAt,
          hasNewInfo: revelation.hasNewInfo,
        },
      ]),
    ),
  }
}

export function detectEvidenceEvolution(
  artifactId: string,
  contentKeys: string[],
  workspace: InvestigationWorkspace,
): { updated: boolean; newKeys: string[] } {
  const existing = workspace.revelations[artifactId]
  if (!existing) {
    return {
      updated: contentKeys.length > 0,
      newKeys: contentKeys,
    }
  }

  const seenFields = existing.seenFields
  const newKeys = contentKeys.filter(key => !seenFields.has(key))
  return {
    updated: newKeys.length > 0,
    newKeys,
  }
}

export function recordEvidenceInspection(
  artifactId: string,
  contentKeys: string[],
  workspace: InvestigationWorkspace,
  nowISO: string = new Date().toISOString(),
): boolean {
  const existing = workspace.revelations[artifactId]
  const seenFields = new Set(existing?.seenFields ?? [])
  let hasNewInfo = false

  for (const key of contentKeys) {
    if (!seenFields.has(key)) {
      seenFields.add(key)
      hasNewInfo = true
    }
  }

  workspace.revelations[artifactId] = {
    seenFields,
    firstSeenAt: existing?.firstSeenAt ?? nowISO,
    lastInspectedAt: nowISO,
    hasNewInfo,
  }

  return hasNewInfo
}