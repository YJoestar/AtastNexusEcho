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

/** What the player believes the two objects have in common. */
export type LinkKind =
  | 'CORROBORATES'
  | 'CONTRADICTS'
  | 'TEMPORAL'
  | 'LOCATION'
  | 'PERSON'
  | 'OBJECT'
  | 'UNKNOWN'
  | 'HYPOTHESIS'

/** How far the player trusts the link. Never system-verified. */
export type LinkStatus = 'CONNECTED' | 'UNCONFIRMED' | 'CONFIRMED' | 'CONTRADICTED' | 'UNKNOWN'

export const LINK_KINDS: readonly LinkKind[] = [
  'CORROBORATES', 'CONTRADICTS', 'TEMPORAL', 'LOCATION', 'PERSON', 'OBJECT', 'UNKNOWN', 'HYPOTHESIS',
]
export const LINK_STATUSES: readonly LinkStatus[] = [
  'CONNECTED', 'UNCONFIRMED', 'CONFIRMED', 'CONTRADICTED', 'UNKNOWN',
]

export interface EvidenceHypothesis {
  id: string
  from: string
  to: string
  note: string
  createdAt: string
  kind: LinkKind
  status: LinkStatus
  updatedAt: string
}

/** Saved camera of the investigation board, in board percent-space pixels. */
export interface BoardView {
  x: number
  y: number
  zoom: number
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
  view: BoardView | null
}

/** Annotations on a link are stored beside object annotations under this key. */
export function linkAnnotationKey(linkId: string): string {
  return `link:${linkId}`
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
    view: null,
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
        const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : ''
        return [{
          id: entry.id,
          from: entry.from,
          to: entry.to,
          note: typeof entry.note === 'string' ? entry.note.slice(0, 1000) : '',
          createdAt,
          kind: LINK_KINDS.includes(entry.kind as LinkKind) ? entry.kind as LinkKind : 'HYPOTHESIS',
          status: LINK_STATUSES.includes(entry.status as LinkStatus) ? entry.status as LinkStatus : 'UNCONFIRMED',
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : createdAt,
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

  let view: BoardView | null = null
  if (isRecord(value.view)) {
    const { x, y, zoom } = value.view
    if (typeof x === 'number' && typeof y === 'number' && typeof zoom === 'number'
      && Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(zoom)) {
      view = { x, y, zoom: Math.max(0.2, Math.min(2.5, zoom)) }
    }
  }

  return { version: 1, annotations, marks, placements, hypotheses, lastInspected, revelations, view }
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

/* ───────────────────── board operations (pure, undoable) ───────────────────── */

function stamp(nowISO?: string): string {
  return nowISO ?? new Date().toISOString()
}

/** Links that join two placed objects are live; others are dormant until both return. */
export function isLinkLive(link: EvidenceHypothesis, workspace: InvestigationWorkspace): boolean {
  return Boolean(workspace.placements[link.from] && workspace.placements[link.to])
}

export function findLink(workspace: InvestigationWorkspace, a: string, b: string): EvidenceHypothesis | undefined {
  return workspace.hypotheses.find(link =>
    (link.from === a && link.to === b) || (link.from === b && link.to === a))
}

/**
 * Link one object to every other in `ids`, in the order given. A pair already
 * linked is left untouched so repeated clicks never stack duplicates.
 */
export function addLinks(
  workspace: InvestigationWorkspace,
  ids: string[],
  kind: LinkKind,
  note: string,
  makeId: (index: number) => string,
  nowISO?: string,
): InvestigationWorkspace {
  const [first, ...rest] = Array.from(new Set(ids))
  if (!first || rest.length === 0) return workspace
  const at = stamp(nowISO)
  const added: EvidenceHypothesis[] = []
  for (const other of rest) {
    if (findLink(workspace, first, other)) continue
    added.push({
      id: makeId(added.length),
      from: first,
      to: other,
      note: note.trim().slice(0, 1000),
      createdAt: at,
      updatedAt: at,
      kind,
      status: kind === 'CONTRADICTS' ? 'CONTRADICTED' : 'CONNECTED',
    })
  }
  return added.length === 0 ? workspace : { ...workspace, hypotheses: [...workspace.hypotheses, ...added] }
}

export function updateLink(
  workspace: InvestigationWorkspace,
  linkId: string,
  patch: Partial<Pick<EvidenceHypothesis, 'kind' | 'status' | 'note'>>,
  nowISO?: string,
): InvestigationWorkspace {
  return {
    ...workspace,
    hypotheses: workspace.hypotheses.map(link => link.id === linkId
      ? { ...link, ...patch, note: (patch.note ?? link.note).slice(0, 1000), updatedAt: stamp(nowISO) }
      : link),
  }
}

/** Removes the link and every annotation attached to it. */
export function removeLink(workspace: InvestigationWorkspace, linkId: string): InvestigationWorkspace {
  const annotations = { ...workspace.annotations }
  delete annotations[linkAnnotationKey(linkId)]
  return { ...workspace, annotations, hypotheses: workspace.hypotheses.filter(link => link.id !== linkId) }
}

export function addAnnotation(
  workspace: InvestigationWorkspace,
  targetKey: string,
  kind: AnnotationKind,
  text: string,
  id: string,
  nowISO?: string,
): InvestigationWorkspace {
  const clean = text.trim().slice(0, 3000)
  if (!clean) return workspace
  const existing = workspace.annotations[targetKey] ?? []
  return {
    ...workspace,
    annotations: {
      ...workspace.annotations,
      [targetKey]: [...existing, { id, kind, text: clean, createdAt: stamp(nowISO) }].slice(-100),
    },
  }
}

export function editAnnotation(
  workspace: InvestigationWorkspace,
  targetKey: string,
  annotationId: string,
  patch: { text?: string; kind?: AnnotationKind },
): InvestigationWorkspace {
  const existing = workspace.annotations[targetKey]
  if (!existing) return workspace
  const next = existing.flatMap(note => {
    if (note.id !== annotationId) return [note]
    const text = (patch.text ?? note.text).trim().slice(0, 3000)
    return text ? [{ ...note, text, kind: patch.kind ?? note.kind }] : []
  })
  return { ...workspace, annotations: { ...workspace.annotations, [targetKey]: next } }
}

export function deleteAnnotation(
  workspace: InvestigationWorkspace,
  targetKey: string,
  annotationId: string,
): InvestigationWorkspace {
  const existing = workspace.annotations[targetKey]
  if (!existing) return workspace
  return {
    ...workspace,
    annotations: { ...workspace.annotations, [targetKey]: existing.filter(note => note.id !== annotationId) },
  }
}

/**
 * Drop anything that points at an artifact the case no longer contains.
 * Evidence is server-authoritative, so a vanished id means a stale reference —
 * never leave a link, note or placement hanging off it.
 */
export function pruneWorkspace(
  workspace: InvestigationWorkspace,
  validArtifactIds: ReadonlySet<string>,
): InvestigationWorkspace {
  const placements = Object.fromEntries(
    Object.entries(workspace.placements).filter(([id]) => validArtifactIds.has(id)))
  const hypotheses = workspace.hypotheses.filter(link =>
    validArtifactIds.has(link.from) && validArtifactIds.has(link.to))
  const liveLinkKeys = new Set(hypotheses.map(link => linkAnnotationKey(link.id)))
  const annotations = Object.fromEntries(
    Object.entries(workspace.annotations).filter(([key]) =>
      key.startsWith('link:') ? liveLinkKeys.has(key) : validArtifactIds.has(key)))
  const unchanged = Object.keys(placements).length === Object.keys(workspace.placements).length
    && hypotheses.length === workspace.hypotheses.length
    && Object.keys(annotations).length === Object.keys(workspace.annotations).length
  return unchanged ? workspace : { ...workspace, placements, hypotheses, annotations }
}
