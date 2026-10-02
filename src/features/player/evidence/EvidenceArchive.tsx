import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BureauIcons, DocumentShell, FileTabs, FileRow, Stamp } from '@/components/bureau'
import { ROUTES } from '@/app/config'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import {
  detectEvidenceEvolution,
  recordEvidenceInspection,
  type EvidenceMark,
  type AnnotationKind,
} from '@/lib/investigationWorkspace'
import { ArtifactInspection } from './ArtifactInspection'
import { InvestigationTable } from './InvestigationTable'
import { contentString, type CaseArtifact } from './types'
import { cn } from '@/lib/utils'

type ArchiveClass = 'ALL' | 'PHOTOGRAPHS' | 'DOCUMENTS' | 'AUDIO' | 'SURVEILLANCE' | 'FRAGMENTS' | 'NOTES' | 'VERIFIED' | 'UNRESOLVED' | 'ANOMALOUS'
type WorkspaceMode = 'ARCHIVE' | 'INSPECT' | 'COMPARE' | 'TABLE'

const ARCHIVE_TABS: { id: ArchiveClass; label: string }[] = [
  { id: 'ALL', label: 'ALL FILES' },
  { id: 'PHOTOGRAPHS', label: 'PHOTOGRAPHS' },
  { id: 'DOCUMENTS', label: 'DOCUMENTS' },
  { id: 'AUDIO', label: 'RECORDINGS' },
  { id: 'SURVEILLANCE', label: 'SURVEILLANCE' },
  { id: 'FRAGMENTS', label: 'FRAGMENTS' },
  { id: 'NOTES', label: 'ANNOTATED' },
  { id: 'VERIFIED', label: 'VERIFIED' },
  { id: 'UNRESOLVED', label: 'UNRESOLVED' },
  { id: 'ANOMALOUS', label: 'CONTRADICTIONS' },
]

const MARK_LABEL: Record<EvidenceMark, string> = {
  UNMARKED: 'UNMARKED',
  REVIEW: 'REVIEW',
  IMPORTANT: 'IMPORTANT',
  UNRESOLVED: 'UNRESOLVED',
  VERIFIED: 'PLAYER VERIFIED',
  CONTRADICTION: 'CONTRADICTION',
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86400)}d`
}

function normalizeApiArtifact(
  artifact: { code: string; title: string; description: string; type: string; content?: Record<string, unknown> | null },
): CaseArtifact {
  const content = artifact.content ?? {}
  return {
    id: `evidence:${artifact.code}`,
    code: artifact.code,
    title: artifact.title,
    description: artifact.description,
    type: artifact.type,
    source: 'EVIDENCE',
    content,
    location: contentString(content, ['location', 'location_name', 'building']),
    acquiredAt: contentString(content, ['acquired_at', 'acquiredAt', 'timestamp', 'captured_at']),
  }
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getNewFieldKeys(
  artifact: CaseArtifact,
  seenFields?: Set<string>,
): string[] | undefined {
  if (!seenFields) return undefined
  const contentKeys = Object.keys(artifact.content ?? {})
  return contentKeys.filter(key => !seenFields.has(key))
}

export function PlayerEvidenceArchive() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { inventory, isLoading, fetchInventory, team, teamProgress } = useGameEngine()
  const { workspace, updateWorkspace } = useInvestigationWorkspace(team?.id)
  const [archiveClass, setArchiveClass] = useState<ArchiveClass>('ALL')
  const [search, setSearch] = useState('')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [mode, setMode] = useState<WorkspaceMode>('ARCHIVE')

  useEffect(() => {
    void fetchInventory()
    // The authenticated team session owns the request lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!inventory?.evidence) return
    updateWorkspace(current => {
      let changed = false
      let next = { ...current }
      for (const entry of inventory.evidence) {
        const artifactId = `evidence:${entry.code}`
        const contentKeys = Object.keys(entry.content ?? {})
        const { updated } = detectEvidenceEvolution(artifactId, contentKeys, next)
        if (updated) {
          next = {
            ...next,
            revelations: {
              ...next.revelations,
              [artifactId]: {
                seenFields: next.revelations[artifactId]?.seenFields ?? new Set(),
                firstSeenAt: next.revelations[artifactId]?.firstSeenAt ?? new Date().toISOString(),
                lastInspectedAt: next.revelations[artifactId]?.lastInspectedAt ?? null,
                hasNewInfo: true,
              },
            },
          }
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [inventory?.evidence, updateWorkspace])

  const markInspection = useCallback(
    (artifactId: string, content: Record<string, unknown>) => {
      const contentKeys = Object.keys(content ?? {})
      updateWorkspace(current => {
        const next = { ...current }
        const updated = recordEvidenceInspection(artifactId, contentKeys, next)
        if (updated) {
          next.revelations[artifactId] = {
            ...next.revelations[artifactId],
            seenFields: next.revelations[artifactId]?.seenFields ?? new Set(),
            hasNewInfo: false,
            lastInspectedAt: new Date().toISOString(),
          }
        }
        return next
      })
    },
    [updateWorkspace],
  )

  const artifacts = useMemo(() => {
    const recovered = (inventory?.evidence ?? []).map(normalizeApiArtifact)
    const knownEvidence = new Set(recovered.map(item => item.code))
    const fallbackEvidence = (teamProgress?.evidenceOwned ?? [])
      .filter(code => !knownEvidence.has(code))
      .map(code => normalizeApiArtifact({
        code,
        title: `EVIDENCE ${code}`,
        description: 'The server index confirms recovery; full artifact content is not available in this session.',
        type: 'UNCLASSIFIED',
      }))

    const recoveredItems: CaseArtifact[] = (inventory?.inventory ?? []).map(item => ({
      id: `inventory:${item.code}`,
      code: item.code,
      title: item.name,
      description: item.description,
      type: item.type,
      source: 'INVENTORY',
      content: {},
      location: null,
      acquiredAt: null,
    }))

    const fragments: CaseArtifact[] = (inventory?.fragments ?? []).map(fragment => ({
      id: `fragment:${fragment.code}`,
      code: fragment.code,
      title: fragment.label || fragment.code,
      description: fragment.content,
      type: fragment.type || 'FRAGMENT',
      source: 'FRAGMENT',
      content: { fragment: fragment.content, role: fragment.role },
      location: null,
      acquiredAt: null,
    }))

    const knownFragments = new Set(fragments.map(item => item.code))
    const fallbackFragments: CaseArtifact[] = (teamProgress?.fragmentsOwned ?? [])
      .filter(code => !knownFragments.has(code))
      .map(code => ({
        id: `fragment:${code}`,
        code,
        title: `FRAGMENT ${code}`,
        description: 'Fragment is indexed to this team; source content is unavailable offline.',
        type: 'FRAGMENT',
        source: 'FRAGMENT',
        content: {},
        location: null,
        acquiredAt: null,
      }))

    return [...recovered, ...fallbackEvidence, ...recoveredItems, ...fragments, ...fallbackFragments]
  }, [inventory, teamProgress?.evidenceOwned, teamProgress?.fragmentsOwned])

  const activeId = searchParams.get('artifact')
  const activeArtifact = artifacts.find(artifact => artifact.id === activeId) ?? null
  const comparedArtifacts = compareIds.map(id => artifacts.find(artifact => artifact.id === id)).filter((artifact): artifact is CaseArtifact => !!artifact)

  useEffect(() => {
    if (activeId && activeArtifact) setMode('INSPECT')
    else if (mode === 'INSPECT' && !activeId) setMode('ARCHIVE')
  }, [activeId, activeArtifact, mode])

  const filteredArtifacts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return artifacts.filter(artifact => {
      const mark = workspace.marks[artifact.id] ?? 'UNMARKED'
      const matchesClass = archiveClass === 'ALL'
        || (archiveClass === 'PHOTOGRAPHS' && /IMAGE|PHOTO|PHOTOGRAPH/i.test(artifact.type))
        || (archiveClass === 'DOCUMENTS' && /DOCUMENT|REPORT|TEXT/i.test(artifact.type))
        || (archiveClass === 'AUDIO' && /AUDIO|RECORDING/i.test(artifact.type))
        || (archiveClass === 'SURVEILLANCE' && /VIDEO|SURVEILLANCE|CAMERA/i.test(artifact.type))
        || (archiveClass === 'FRAGMENTS' && artifact.source === 'FRAGMENT')
        || (archiveClass === 'NOTES' && (workspace.annotations[artifact.id]?.length ?? 0) > 0)
        || (archiveClass === 'VERIFIED' && mark === 'VERIFIED')
        || (archiveClass === 'UNRESOLVED' && mark === 'UNRESOLVED')
        || (archiveClass === 'ANOMALOUS' && mark === 'CONTRADICTION')
      if (!matchesClass) return false
      return !term || `${artifact.code} ${artifact.title} ${artifact.type} ${artifact.description}`.toLowerCase().includes(term)
    })
  }, [artifacts, archiveClass, search, workspace.annotations, workspace.marks])

  const openArtifact = (id: string, artifact: CaseArtifact) => {
    setSearchParams({ artifact: id })
    setMode('INSPECT')
    markInspection(id, artifact.content)
  }

  const closeArtifact = () => {
    setSearchParams({}, { replace: true })
    setMode('ARCHIVE')
  }

  const markArtifact = (id: string, mark: EvidenceMark) => updateWorkspace(current => ({
    ...current,
    marks: { ...current.marks, [id]: mark },
  }))

  const addAnnotation = (id: string, kind: AnnotationKind, text: string, point?: { x: number; y: number }) => {
    updateWorkspace(current => ({
      ...current,
      annotations: {
        ...current.annotations,
        [id]: [...(current.annotations[id] ?? []), {
          id: makeId(), kind, text, createdAt: new Date().toISOString(), ...point,
        }],
      },
    }))
  }

  const toggleCompare = (id: string) => setCompareIds(current =>
    current.includes(id) ? current.filter(entry => entry !== id) : [...current.slice(-1), id],
  )

  const placeOnTable = (id: string) => updateWorkspace(current => {
    if (current.placements[id]) return current
    const order = Math.max(0, ...Object.values(current.placements).map(placement => placement.order)) + 1
    const count = Object.keys(current.placements).length
    return {
      ...current,
      placements: {
        ...current.placements,
        [id]: {
          x: 18 + (count % 4) * 21,
          y: 20 + (Math.floor(count / 4) % 4) * 20,
          rotation: count % 2 === 0 ? -1 : 1,
          order,
          pinned: false,
        },
      },
    }
  })

  const newInfoCount = Object.values(workspace.revelations).filter(r => r.hasNewInfo).length

  const modeTabs = [
    { id: 'ARCHIVE', label: `CASE ARCHIVE / ${artifacts.length.toString().padStart(2, '0')}${newInfoCount > 0 ? ` / ${newInfoCount} UPDATED` : ''}` },
    { id: 'TABLE', label: `INVESTIGATION TABLE / ${Object.keys(workspace.placements).length.toString().padStart(2, '0')}` },
    { id: 'COMPARE', label: `COMPARE / ${compareIds.length} SELECTED` },
  ] as const

  if (isLoading('inventory') && !inventory && artifacts.length === 0) {
    return (
      <div className="page">
        <div className="page-content mx-auto max-w-4xl py-12">
          <DocumentShell reference="ARCHIVE QUERY / CASE 037" title="INDEXING RECOVERED MATERIAL" stock="digital" footer={<Stamp variant="incomplete">RETRIEVAL PENDING</Stamp>}>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-nexus-textMuted" role="status" aria-live="polite">READING TEAM EVIDENCE INDEX…</p>
          </DocumentShell>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-content mx-auto max-w-5xl space-y-4">
        <header className="flex items-center gap-3 border-b border-nexus-border pb-3">
          <Link to={ROUTES.PLAYER_GAME} className="flex min-h-10 min-w-10 items-center justify-center border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text" aria-label="RETURN TO FIELD">
            <BureauIcons.Back className="bureau-icon h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">CASE {team?.code ?? 'UNASSIGNED'} / FIELD ARCHIVE</p>
            <h1 className="mt-1 font-mono text-lg font-bold text-nexus-text">RECOVERED MATERIAL</h1>
          </div>
          <span className="hidden text-right font-mono text-[0.52rem] uppercase text-nexus-textSubtle sm:block">
            {Object.values(workspace.annotations).reduce((sum, notes) => sum + notes.length, 0)} NOTES FILED
            <br />
            {Object.keys(workspace.placements).length} OBJECTS ON TABLE
          </span>
          <button type="button" onClick={() => void fetchInventory()} className="flex min-h-10 min-w-10 items-center justify-center border border-nexus-borderSubtle text-nexus-textSubtle hover:text-nexus-text" aria-label="Re-query case archive" title="Re-query archive">
            <BureauIcons.Refresh className="bureau-icon h-4 w-4" />
          </button>
        </header>

        {mode !== 'INSPECT' && (
          <FileTabs
            tabs={modeTabs.map(tab => ({ id: tab.id, label: tab.label }))}
            activeId={mode}
            onSelect={id => setMode(id as WorkspaceMode)}
            className="border-b border-nexus-borderSubtle pb-1"
          />
        )}

        {mode === 'ARCHIVE' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
            <section className="min-w-0">
              <div className="mb-3 flex flex-col gap-2 border-b border-nexus-borderSubtle pb-3">
                <label className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle" htmlFor="archive-query">ARCHIVE QUERY / LOCAL + SERVER INDEX</label>
                <input id="archive-query" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="QUERY REF, TITLE, OR CLASS…" className="min-h-10 border border-nexus-border bg-nexus-bg px-3 font-mono text-xs text-nexus-text placeholder:text-nexus-textSubtle" />
                <FileTabs tabs={ARCHIVE_TABS} activeId={archiveClass} onSelect={id => setArchiveClass(id as ArchiveClass)} />
              </div>

              {filteredArtifacts.length === 0 ? (
                <DocumentShell reference="ARCHIVE QUERY / CASE 037" title={artifacts.length ? 'NO MATCHING FILES' : 'ARCHIVE EMPTY'} stock="paper" footer={<Stamp variant="incomplete">INDEX CHECKED</Stamp>}>
                  <div className="grid grid-cols-[100px_1fr] border-y border-nexus-borderSubtle font-mono text-[0.6rem] uppercase tracking-[0.1em]">
                    <span className="border-r border-nexus-borderSubtle px-3 py-3 text-nexus-textSubtle">RESULT</span>
                    <span className="px-3 py-3 text-nexus-warning">{artifacts.length ? 'QUERY RETURNED NO MATCHING MATERIAL' : 'NO VERIFIED MATERIAL IN TEAM INDEX'}</span>
                    <span className="border-r border-t border-nexus-borderSubtle px-3 py-3 text-nexus-textSubtle">SOURCE</span>
                    <span className="border-t border-nexus-borderSubtle px-3 py-3 text-nexus-textMuted">{artifacts.length ? 'FILTER / SEARCH' : 'AWAITING FIELD RECOVERY'}</span>
                  </div>
                </DocumentShell>
              ) : (
                <div className="divide-y divide-nexus-borderSubtle border-y border-nexus-borderSubtle">
                  {filteredArtifacts.map(artifact => {
                    const mark = workspace.marks[artifact.id] ?? 'UNMARKED'
                    const position = workspace.placements[artifact.id]
                    const noteCount = workspace.annotations[artifact.id]?.length ?? 0
                    const isComparing = compareIds.includes(artifact.id)
                    const revelation = workspace.revelations[artifact.id]
                    const hasNewInfo = revelation?.hasNewInfo ?? false
                    const lastInspected = workspace.lastInspected[artifact.id] ?? revelation?.lastInspectedAt ?? null
                    return (
                      <div key={artifact.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
                        <FileRow
                          reference={artifact.code}
                          title={
                            <span className="inline-flex items-center gap-1">
                              {artifact.title}
                              {hasNewInfo && (
                                <span className="font-mono text-[0.45rem] uppercase tracking-[0.12em] text-nexus-warning">NEW</span>
                              )}
                            </span>
                          }
                          meta={`${artifact.type} / ${artifact.location ?? 'LOCATION UNKNOWN'} / ${MARK_LABEL[mark]}${noteCount ? ` / ${noteCount} NOTES` : ''}${position ? ' / ON TABLE' : ''}`}
                          selected={activeId === artifact.id}
                          onSelect={() => openArtifact(artifact.id, artifact)}
                          trailing={
                            <div className="flex items-center gap-2">
                              {lastInspected && (
                                <time className="font-mono text-[0.45rem] text-nexus-textSubtle" title={`LAST INSPECTED: ${new Date(lastInspected).toLocaleString()}`}>
                                  {formatRelativeTime(lastInspected)}
                                </time>
                              )}
                              {artifact.acquiredAt && (
                                <time className="font-mono text-[0.52rem] text-nexus-textSubtle" title={`ACQUIRED: ${new Date(artifact.acquiredAt).toLocaleString()}`}>
                                  {artifact.acquiredAt}
                                </time>
                              )}
                            </div>
                          }
                        />
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => placeOnTable(artifact.id)} disabled={!!position} className="min-h-9 border border-nexus-border px-2 font-mono text-[0.48rem] uppercase text-nexus-textSubtle disabled:opacity-45" aria-label={`${position ? 'Already on table' : 'Place on table'} ${artifact.title}`} title={position ? 'Already on table' : 'Place on investigation table'}>
                            {position ? 'PLACED' : 'TABLE'}
                          </button>
                          <button type="button" onClick={() => toggleCompare(artifact.id)} aria-pressed={isComparing} className={`min-h-9 border px-2 font-mono text-[0.48rem] uppercase ${isComparing ? 'border-nexus-warning text-nexus-warning' : 'border-nexus-border text-nexus-textSubtle'}`}>
                            COMPARE
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {compareIds.length === 2 && (
                <button type="button" onClick={() => setMode('COMPARE')} className="mt-3 min-h-10 border border-nexus-warning px-3 font-mono text-[0.55rem] uppercase text-nexus-warning">[ OPEN SIDE-BY-SIDE COMPARISON ]</button>
              )}
            </section>

            <aside className="border-l border-nexus-borderSubtle pl-3">
              <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">CASE STATE / LOCAL WORKSPACE</p>
              <dl className="mt-2 space-y-2 font-mono text-[0.58rem]">
                <SummaryField label="EVIDENCE" value={String(artifacts.filter(item => item.source === 'EVIDENCE').length).padStart(2, '0')} />
                <SummaryField label="OBJECTS" value={String(artifacts.filter(item => item.source === 'INVENTORY').length).padStart(2, '0')} />
                <SummaryField label="FRAGMENTS" value={String(artifacts.filter(item => item.source === 'FRAGMENT').length).padStart(2, '0')} />
                <SummaryField label="ANNOTATIONS" value={String(Object.values(workspace.annotations).reduce((sum, notes) => sum + notes.length, 0)).padStart(2, '0')} />
                <SummaryField label="HYPOTHESES" value={String(workspace.hypotheses.length).padStart(2, '0')} />
                <SummaryField label="UPDATED" value={Object.values(workspace.revelations).filter(r => r.hasNewInfo).length.toString().padStart(2, '0')} />
              </dl>
              {artifacts
                .filter(artifact => workspace.lastInspected[artifact.id])
                .sort((a, b) => new Date(workspace.lastInspected[b.id]!).getTime() - new Date(workspace.lastInspected[a.id]!).getTime())
                .slice(0, 5)
                .map(artifact => {
                  const revelation = workspace.revelations[artifact.id]
                  const hasNew = revelation?.hasNewInfo ?? false
                  return (
                    <div key={artifact.id} className="mt-1 grid grid-cols-[minmax(0,1fr)_50px] gap-2 border-t border-nexus-borderSubtle pt-1 font-mono text-[0.55rem]">
                      <span className="truncate text-nexus-textMuted">{artifact.code}</span>
                      <span className={cn('tabular-nums text-nexus-textSubtle', hasNew && 'text-nexus-warning')} title={workspace.lastInspected[artifact.id]}>
                        {formatRelativeTime(workspace.lastInspected[artifact.id]!)}
                      </span>
                    </div>
                  )
                })}
              <p className="mt-4 border-t border-nexus-borderSubtle pt-2 font-mono text-[0.5rem] uppercase leading-relaxed text-nexus-textSubtle">
                PERSONAL NOTES AND TABLE LAYOUT ARE SAVED ON THIS DEVICE. SERVER EVIDENCE IS READ-ONLY.
              </p>
            </aside>
          </div>
        )}

        {mode === 'INSPECT' && activeArtifact && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-nexus-border pb-2">
              <button type="button" onClick={closeArtifact} className="min-h-10 border-r border-nexus-border pr-3 font-mono text-[0.55rem] uppercase text-nexus-textSubtle hover:text-nexus-text">← CASE ARCHIVE</button>
              <span className="truncate font-mono text-[0.55rem] uppercase tracking-[0.12em] text-nexus-textSubtle">OBJECT EXAMINATION / {activeArtifact.code}</span>
            </div>
            <ArtifactInspection
              artifact={activeArtifact}
              mark={workspace.marks[activeArtifact.id] ?? 'UNMARKED'}
              annotations={workspace.annotations[activeArtifact.id] ?? []}
              onMarkChange={mark => markArtifact(activeArtifact.id, mark)}
              onAddAnnotation={(kind, text, point) => addAnnotation(activeArtifact.id, kind, text, point)}
              onPlaceOnTable={() => placeOnTable(activeArtifact.id)}
              isOnTable={!!workspace.placements[activeArtifact.id]}
              seenFields={workspace.revelations[activeArtifact.id]?.seenFields}
              newKeys={workspace.revelations[activeArtifact.id]?.hasNewInfo ? getNewFieldKeys(activeArtifact, workspace.revelations[activeArtifact.id]?.seenFields) : undefined}
            />
          </section>
        )}

        {mode === 'COMPARE' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-nexus-border pb-2">
              <div>
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-nexus-text">SIDE-BY-SIDE EXAMINATION</h2>
                <p className="mt-1 font-mono text-[0.5rem] uppercase text-nexus-textSubtle">NO RELATION IS ASSUMED / COMPARISON IS PLAYER-LED</p>
              </div>
              <button type="button" onClick={() => setMode('ARCHIVE')} className="min-h-10 border border-nexus-border px-2 font-mono text-[0.52rem] uppercase text-nexus-textSubtle">RETURN TO INDEX</button>
            </div>
            {comparedArtifacts.length === 2 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {comparedArtifacts.map(artifact => (
                  <section key={artifact.id} className="min-w-0 border-t border-nexus-borderSubtle pt-2">
                    <button type="button" onClick={() => openArtifact(artifact.id, artifact)} className="mb-2 text-left font-mono text-[0.58rem] uppercase text-nexus-accent">OPEN FULL RECORD / {artifact.code} →</button>
                    <ArtifactInspection
                      compact
                      artifact={artifact}
                      mark={workspace.marks[artifact.id] ?? 'UNMARKED'}
                      annotations={workspace.annotations[artifact.id] ?? []}
                      onMarkChange={mark => markArtifact(artifact.id, mark)}
                      onAddAnnotation={(kind, text, point) => addAnnotation(artifact.id, kind, text, point)}
                      onPlaceOnTable={() => placeOnTable(artifact.id)}
                      isOnTable={!!workspace.placements[artifact.id]}
                      seenFields={workspace.revelations[artifact.id]?.seenFields}
                      newKeys={workspace.revelations[artifact.id]?.hasNewInfo ? getNewFieldKeys(artifact, workspace.revelations[artifact.id]?.seenFields) : undefined}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <div className="border-y border-nexus-borderSubtle py-4 font-mono text-xs uppercase text-nexus-textMuted">SELECT TWO RECORDS IN THE ARCHIVE INDEX TO COMPARE</div>
            )}
          </section>
        )}

        {mode === 'TABLE' && (
          <InvestigationTable
            artifacts={artifacts}
            workspace={workspace}
            onUpdate={updateWorkspace}
            onInspect={id => {
              const artifactToOpen = artifacts.find(item => item.id === id)
              if (artifactToOpen) openArtifact(id, artifactToOpen)
            }}
          />
        )}
      </div>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-nexus-borderSubtle pb-1">
      <dt className="text-[0.52rem] uppercase text-nexus-textSubtle">{label}</dt>
      <dd className="font-bold tabular-nums text-nexus-text">{value}</dd>
    </div>
  )
}