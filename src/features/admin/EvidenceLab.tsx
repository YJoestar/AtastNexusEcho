import { useEffect, useMemo, useState, useCallback } from 'react'
import { FileRow, FileTabs, TerminalFrame } from '@/components/bureau'
import { useAdmin } from '@/app/providers/AdminProvider'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { adminAPI, type EvidenceLabCatalog } from '@/lib/admin'
import { buildEvidenceCatalog } from '@/lib/evidenceCatalog'
import { cn } from '@/lib/utils'
import { ArtifactInspection } from '@/features/player/evidence/ArtifactInspection'
import { InvestigationTable } from '@/features/player/evidence/InvestigationTable'
import { artifactType, artifactCondition, artifactState, artifactThumbUrl, type CaseArtifact } from '@/features/player/evidence/types'
import { showcaseCatalog, showcaseEnabled, SHOWCASE_LABEL, SHOWCASE_CASE } from '@/lib/evidence/showcaseCatalog'
import { type EvidenceMark } from '@/lib/investigationWorkspace'

import { buildDevelopmentCatalog, matchesFilter, type LabFilter } from './evidenceLabCatalog'

type LabMode = 'REGISTER' | 'INSPECT' | 'COMPARE' | 'TABLE'

const LAB_FILTERS: { id: LabFilter; label: string }[] = [
  { id: 'ALL', label: 'ALL MATERIAL' },
  { id: 'PHOTOGRAPHS', label: 'PHOTOGRAPHS' },
  { id: 'SURVEILLANCE', label: 'SURVEILLANCE' },
  { id: 'DOCUMENTS', label: 'DOCUMENTS' },
  { id: 'AUDIO', label: 'RECORDINGS' },
  { id: 'FRAGMENTS', label: 'FRAGMENTS' },
  { id: 'MAPS', label: 'MAPS' },
  { id: 'PERSONNEL', label: 'PERSONNEL' },
  { id: 'NOTES', label: 'NOTES' },
  { id: 'DAMAGED', label: 'DAMAGED' },
  { id: 'UNAVAILABLE', label: 'DAMAGED / MISSING' },
]

export function AdminEvidenceLab() {
  const { admin } = useAdmin()
  const simulationKey = `admin-evidence-lab:${admin?.id ?? 'operator'}`
  const { workspace, updateWorkspace, clearWorkspace } = useInvestigationWorkspace(simulationKey)
  const [catalog, setCatalog] = useState<EvidenceLabCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [usingDevFallback, setUsingDevFallback] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LabFilter>('ALL')
  const [mode, setMode] = useState<LabMode>('REGISTER')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showcaseLoaded, setShowcaseLoaded] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    adminAPI.listEvidenceLabCatalog()
      .then(result => {
        if (active) {
          setCatalog(result)
          setApiError(null)
          setUsingDevFallback(false)
        }
      })
      .catch(cause => {
        if (active) {
          setCatalog(buildDevelopmentCatalog())
          setUsingDevFallback(true)
          setApiError(cause instanceof Error ? cause.message : 'Evidence index unavailable')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const artifacts = useMemo(() => buildEvidenceCatalog(catalog ?? { evidence: [], inventoryItems: [], fragments: [], nodes: [] }), [catalog])

  // The generated CASE NX-037 register is loaded explicitly rather than folded
  // in silently: the live index is the source of truth, and mixing the two would
  // make it impossible to tell a production record from a simulation record.
  const showcaseArtifacts = useMemo(() => (showcaseEnabled() ? showcaseCatalog() : []), [])
  const visibleArtifacts = useMemo(() => {
    if (!showcaseLoaded || showcaseArtifacts.length === 0) return artifacts
    const known = new Set(artifacts.map(item => item.code))
    return [...artifacts, ...showcaseArtifacts.filter(item => !known.has(item.code))]
  }, [artifacts, showcaseArtifacts, showcaseLoaded])

  const filteredArtifacts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return visibleArtifacts.filter(artifact => matchesFilter(artifact, filter)
      && (!query || `${artifact.code} ${artifact.title} ${artifact.type} ${artifact.location ?? ''} ${artifact.description}`.toLowerCase().includes(query)))
  }, [visibleArtifacts, filter, search])
  const selectedArtifact = visibleArtifacts.find(artifact => artifact.id === selectedId) ?? null
  const comparedArtifacts = compareIds.map(id => visibleArtifacts.find(artifact => artifact.id === id)).filter((item): item is CaseArtifact => !!item)
  const annotationsCount = Object.values(workspace.annotations).reduce((total, entries) => total + entries.length, 0)

  const openArtifact = (id: string) => {
    setSelectedId(id)
    setMode('INSPECT')
    const artifact = artifacts.find(item => item.id === id)
    if (!artifact) return
    updateWorkspace(current => {
      const contentKeys = Object.keys(artifact.content)
      const previous = current.revelations[id]
      const newFields = previous ? contentKeys.filter(key => !previous.seenFields.has(key)) : contentKeys
      const seenFields = new Set(previous?.seenFields ?? [])
      return {
        ...current,
        lastInspected: { ...current.lastInspected, [id]: new Date().toISOString() },
        revelations: {
          ...current.revelations,
          [id]: {
            seenFields,
            firstSeenAt: previous?.firstSeenAt ?? new Date().toISOString(),
            lastInspectedAt: new Date().toISOString(),
            hasNewInfo: newFields.length > 0,
          },
        },
      }
    })
  }

  const mark = useCallback((id: string, status: EvidenceMark) => updateWorkspace(current => ({
    ...current,
    marks: { ...current.marks, [id]: status },
  })), [updateWorkspace])

  const placeOnTable = useCallback((id: string) => updateWorkspace(current => {
    if (current.placements[id]) return current
    const order = Math.max(0, ...Object.values(current.placements).map(item => item.order)) + 1
    const count = Object.keys(current.placements).length
    return {
      ...current,
      placements: {
        ...current.placements,
        [id]: { x: 18 + (count % 4) * 21, y: 20 + (Math.floor(count / 4) % 4) * 20, rotation: count % 2 ? 1 : -1, order, pinned: false },
      },
    }
  }), [updateWorkspace])

  const resetSimulation = () => {
    clearWorkspace()
    setCompareIds([])
    setSelectedId(null)
    setMode('REGISTER')
  }

  const clearMarks = () => updateWorkspace(current => ({ ...current, marks: {} }))
  const clearAnnotations = () => updateWorkspace(current => ({ ...current, annotations: {} }))
  const clearBoard = () => updateWorkspace(current => ({ ...current, placements: {}, hypotheses: [] }))

  const navigateToArtifact = useCallback((id: string) => {
    setSelectedId(id)
    setMode('INSPECT')
  }, [])

  const goNext = useCallback(() => {
    if (!selectedId) {
      if (filteredArtifacts.length > 0) navigateToArtifact(filteredArtifacts[0].id)
      return
    }
    const idx = filteredArtifacts.findIndex(artifact => artifact.id === selectedId)
    if (idx >= 0 && idx < filteredArtifacts.length - 1) {
      navigateToArtifact(filteredArtifacts[idx + 1].id)
    }
  }, [filteredArtifacts, selectedId, navigateToArtifact])

  const goPrev = useCallback(() => {
    if (!selectedId) return
    const idx = filteredArtifacts.findIndex(artifact => artifact.id === selectedId)
    if (idx > 0) {
      navigateToArtifact(filteredArtifacts[idx - 1].id)
    }
  }, [filteredArtifacts, selectedId, navigateToArtifact])

  const simulateEvidenceUpdate = useCallback((artifactId: string) => {
    if (!selectedArtifact) return
    updateWorkspace(current => {
      const existing = current.revelations[artifactId]
      const seenFields = existing?.seenFields ?? new Set()
      seenFields.add('simulated_update')
      return {
        ...current,
        revelations: {
          ...current.revelations,
          [artifactId]: {
            seenFields,
            firstSeenAt: existing?.firstSeenAt ?? new Date().toISOString(),
            lastInspectedAt: existing?.lastInspectedAt ?? null,
            hasNewInfo: true,
          },
        },
      }
    })
  }, [selectedArtifact, updateWorkspace])

  const simulateContradiction = useCallback(() => {
    if (!selectedId) return
    updateWorkspace(current => {
      const existing = current.revelations[selectedId] || {
        seenFields: new Set(),
        firstSeenAt: new Date().toISOString(),
        lastInspectedAt: null,
        hasNewInfo: false,
      }
      existing.seenFields.add('contradiction_flag')
      existing.hasNewInfo = true
      return {
        ...current,
        marks: { ...current.marks, [selectedId]: 'CONTRADICTION' },
        revelations: { ...current.revelations, [selectedId]: existing },
      }
    })
  }, [selectedId, updateWorkspace])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.target instanceof HTMLTextAreaElement) return
      const active = document.activeElement?.tagName?.toLowerCase()
      if (active === 'button' || active === 'a') return

      switch (event.key.toLowerCase()) {
        case 'arrowleft':
          event.preventDefault()
          goPrev()
          break
        case 'arrowright':
          event.preventDefault()
          goNext()
          break
        case 'f':
          event.preventDefault()
          setMode(mode === 'INSPECT' ? mode : mode)
          break
        case 't':
          event.preventDefault()
          if (selectedArtifact) placeOnTable(selectedArtifact.id)
          break
        case 'm':
          event.preventDefault()
          if (selectedArtifact) {
            const currentMark = workspace.marks[selectedArtifact.id] ?? 'UNMARKED'
            const marks: EvidenceMark[] = ['UNMARKED', 'REVIEW', 'IMPORTANT', 'UNRESOLVED', 'VERIFIED', 'CONTRADICTION']
            const idx = marks.indexOf(currentMark)
            const next = marks[(idx + 1) % marks.length]
            mark(selectedArtifact.id, next)
          }
          break
        case 'escape':
          event.preventDefault()
          if (mode === 'INSPECT') setSelectedId(null)
          setMode('REGISTER')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, selectedArtifact, selectedId, workspace, goNext, goPrev, mark, placeOnTable])

  if (loading) {
    return <TerminalFrame title="EVIDENCE REGISTER / SIMULATION" reference="FULL CATALOG RETRIEVAL" variant="system"><p className="p-4 font-mono text-xs uppercase tracking-[0.14em] text-nexus-textMuted">INDEXING ALL EVIDENCE RECORDS…</p></TerminalFrame>
  }

  return (
    <div className="space-y-3 font-mono">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-nexus-border pb-3">
        <div>
          <p className="text-[0.52rem] uppercase tracking-[0.18em] text-nexus-textSubtle">NEXUS / INTERNAL EVIDENCE SYSTEM / NODE 02</p>
          <h1 className="mt-1 text-xl font-bold text-nexus-text">EVIDENCE REGISTER</h1>
          <p className="mt-1 text-[0.55rem] uppercase tracking-[0.14em] text-nexus-warning">CASE 037 / FULL SIMULATION / ALL CATALOGED MATERIAL ACCESSIBLE</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            {showcaseEnabled() && (
              <button
                type="button"
                onClick={() => setShowcaseLoaded(current => !current)}
                aria-pressed={showcaseLoaded}
                className={cn(
                  'min-h-9 border px-2 py-1 font-mono text-[0.5rem] uppercase',
                  showcaseLoaded ? 'border-nexus-info text-nexus-info' : 'border-nexus-border text-nexus-textMuted',
                )}
              >[ SHOWCASE {SHOWCASE_CASE.id} / {showcaseArtifacts.length} {SHOWCASE_LABEL} ]</button>
            )}
            <span className="border border-nexus-accent px-2 py-1 text-[0.5rem] uppercase text-nexus-accent">SANDBOX / NO LIVE PROGRESSION</span>
            <button type="button" onClick={resetSimulation} className="min-h-9 border border-nexus-danger px-2 font-mono text-[0.5rem] uppercase text-nexus-danger">[ RESET SIMULATION ]</button>
          </div>
      </header>

      {usingDevFallback && (
        <div className="border border-nexus-warning/40 bg-nexus-warningBg/10 px-3 py-2 font-mono text-[0.5rem] uppercase">
          DEVELOPMENT FALLBACK DATA — LIVE INDEX UNAVAILABLE: {apiError}
        </div>
      )}

      <div className="grid gap-3 2xl:grid-cols-[230px_minmax(0,1fr)_270px]">
        <aside className="min-w-0 border-r border-nexus-borderSubtle pr-3">
          <p className="border-b border-nexus-borderSubtle pb-1 text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">EVIDENCE INDEX / {filteredArtifacts.length} OF {artifacts.length}</p>
          <div className="py-2">
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="QUERY ID / TYPE / LOCATION" className="min-h-9 w-full border border-nexus-border bg-nexus-bg px-2 font-mono text-[0.55rem] text-nexus-text" aria-label="Search evidence catalog" />
            <FileTabs tabs={LAB_FILTERS} activeId={filter} onSelect={id => setFilter(id as LabFilter)} className="mt-2 max-h-44 overflow-auto" />
          </div>
          <div className="max-h-[62vh] overflow-auto border-y border-nexus-borderSubtle">
            {filteredArtifacts.map(artifact => {
              const currentMark = workspace.marks[artifact.id] ?? 'UNMARKED'
              const onTable = !!workspace.placements[artifact.id]
              const isSelectedForCompare = compareIds.includes(artifact.id)
              const thumb = artifactThumbUrl(artifact)
              const condition = artifactCondition(artifact)
              const state = artifactState(artifact)
              return (
                <div key={artifact.id} className={cn('border-b border-nexus-borderSubtle/50', selectedId === artifact.id && 'border-l-2 border-l-nexus-accent bg-nexus-surfaceElevated')}>
                  <div className="grid grid-cols-[38px_minmax(0,1fr)] items-start gap-2 px-2 pt-1.5">
                    {thumb ? (
                      <div className="relative h-[38px] w-[38px] overflow-hidden border border-nexus-borderSubtle bg-nexus-bg">
                        <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                        {condition !== 'NORMAL' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-nexus-warning" aria-hidden="true" />}
                      </div>
                    ) : (
                      <div className="flex h-[38px] w-[38px] items-center justify-center border border-nexus-borderSubtle font-mono text-[0.4rem] text-nexus-textSubtle" aria-hidden="true">
                        {artifactType(artifact).slice(0, 3)}
                      </div>
                    )}
                    <FileRow
                      reference={artifact.code}
                      title={artifact.title}
                      meta={`${artifactType(artifact)} / ${artifact.location ?? 'LOCATION UNKNOWN'}`}
                      selected={selectedId === artifact.id}
                      onSelect={() => openArtifact(artifact.id)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1 px-2 pb-1.5 text-[0.46rem] uppercase text-nexus-textSubtle">
                    <span className="truncate">
                      {condition !== 'NORMAL' && <span className="text-nexus-warning">{condition} / </span>}
                      {(state === 'CONTRADICTED' || state === 'ANOMALOUS') && <span className="text-nexus-danger">{state} / </span>}
                      {artifact.simulation && <span className="text-nexus-info">{SHOWCASE_LABEL} / </span>}
                      {currentMark}{onTable ? ' / PLACED' : ''}
                    </span>
                    <button type="button" onClick={() => setCompareIds(current => current.includes(artifact.id) ? current.filter(id => id !== artifact.id) : [...current.slice(-1), artifact.id])} aria-pressed={isSelectedForCompare} className={cn('shrink-0 border px-1.5 py-1', isSelectedForCompare ? 'border-nexus-warning text-nexus-warning' : 'border-nexus-border')}>COMPARE</button>
                  </div>
                </div>
              )
            })}
            {filteredArtifacts.length === 0 && <p className="py-4 font-mono text-[0.52rem] uppercase text-nexus-textSubtle">NO MATCHING RECORDS</p>}
          </div>
        </aside>

        <main className="min-w-0">
          <FileTabs
            tabs={[
              { id: 'REGISTER', label: 'REGISTER' },
              { id: 'INSPECT', label: selectedArtifact ? `INSPECT / ${selectedArtifact.code}` : 'INSPECT / NONE' },
              { id: 'COMPARE', label: `COMPARE / ${compareIds.length}` },
              { id: 'TABLE', label: `TABLE / ${Object.keys(workspace.placements).length}` },
            ]}
            activeId={mode}
            onSelect={id => setMode(id as LabMode)}
            className="mb-2 border-b border-nexus-borderSubtle pb-2"
          />

          {mode === 'REGISTER' && (
            <div className="grid min-h-[460px] place-items-center border border-nexus-borderSubtle bg-nexus-bg p-6 text-center">
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-nexus-accent">{artifacts.length.toString().padStart(2, '0')} RECORDS LOADED / PROGRESSION BYPASS</p>
                <h2 className="mt-3 font-mono text-lg font-bold text-nexus-text">SELECT A RECORD FROM THE INDEX</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-nexus-textMuted">All cataloged evidence is available in this isolated lab. Test marks, annotations, inspection, comparison, and table placement without changing a team’s inventory.</p>
              </div>
            </div>
          )}

          {mode === 'INSPECT' && selectedArtifact && (
            <div className="border border-nexus-border p-2">
              <div className="mb-2 flex items-center justify-between border-b border-nexus-borderSubtle pb-2 font-mono text-[0.52rem] uppercase text-nexus-textSubtle">
                <span>INTERNAL INSPECTION / SIMULATION ONLY</span>
                <button type="button" onClick={() => placeOnTable(selectedArtifact.id)} className="border border-nexus-accent px-2 py-1 text-nexus-accent">[ ADD TO TABLE ]</button>
              </div>
              <ArtifactInspection
                artifact={selectedArtifact}
                mark={workspace.marks[selectedArtifact.id] ?? 'UNMARKED'}
                annotations={workspace.annotations[selectedArtifact.id] ?? []}
                onMarkChange={status => mark(selectedArtifact.id, status)}
                onAddAnnotation={(kind, text, point) => updateWorkspace(current => ({
                  ...current,
                  annotations: { ...current.annotations, [selectedArtifact.id]: [...(current.annotations[selectedArtifact.id] ?? []), { id: crypto.randomUUID(), kind, text, createdAt: new Date().toISOString(), ...point }] },
                }))}
                onPlaceOnTable={() => placeOnTable(selectedArtifact.id)}
                isOnTable={!!workspace.placements[selectedArtifact.id]}
              />
            </div>
          )}

          {mode === 'COMPARE' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-nexus-borderSubtle pb-2">
                <div><p className="text-xs font-bold uppercase text-nexus-text">COMPARISON BAY</p><p className="text-[0.5rem] uppercase text-nexus-textSubtle">PLAYER-DEFINED / NO AUTOMATIC RELATION ASSERTED</p></div>
                {comparedArtifacts.length === 2 && <span className="font-mono text-[0.5rem] text-nexus-warning">2 RECORDS IN BAY</span>}
              </div>
              {comparedArtifacts.length === 2 ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {comparedArtifacts.map(artifact => <div key={artifact.id} className="min-w-0 border border-nexus-border p-2"><p className="mb-2 font-mono text-[0.52rem] uppercase text-nexus-accent">{artifact.code} / {artifact.title}</p><ArtifactInspection compact artifact={artifact} mark={workspace.marks[artifact.id] ?? 'UNMARKED'} annotations={workspace.annotations[artifact.id] ?? []} onMarkChange={status => mark(artifact.id, status)} onAddAnnotation={(kind, text, point) => updateWorkspace(current => ({ ...current, annotations: { ...current.annotations, [artifact.id]: [...(current.annotations[artifact.id] ?? []), { id: crypto.randomUUID(), kind, text, createdAt: new Date().toISOString(), ...point }] } }))} onPlaceOnTable={() => placeOnTable(artifact.id)} isOnTable={!!workspace.placements[artifact.id]} /></div>)}
                </div>
              ) : <p className="border-y border-nexus-borderSubtle py-6 text-center font-mono text-[0.55rem] uppercase text-nexus-textSubtle">SELECT TWO RECORDS IN THE INDEX</p>}
            </div>
          )}

          {mode === 'TABLE' && <InvestigationTable artifacts={artifacts} workspace={workspace} onUpdate={updateWorkspace} onInspect={id => { setSelectedId(id); setMode('INSPECT') }} />}
        </main>

        <aside className="border-l border-nexus-borderSubtle pl-3">
          <p className="border-b border-nexus-borderSubtle pb-1 text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">SIMULATION INTERLOCKS</p>
          <p className="py-2 font-mono text-[0.5rem] uppercase leading-relaxed text-nexus-accent">ISOLATED LOCAL STATE / LIVE EVIDENCE READ-ONLY</p>
          <div className="space-y-1 border-y border-nexus-borderSubtle py-2">
            <StateReadout label="CATALOG RECORDS" value={visibleArtifacts.length} />
            <StateReadout label="PLACED" value={Object.keys(workspace.placements).length} />
            <StateReadout label="ANNOTATIONS" value={annotationsCount} />
            <StateReadout label="HYPOTHESES" value={workspace.hypotheses.length} />
          </div>
           <div className="mt-3 space-y-1">
             <button type="button" onClick={clearBoard} className="min-h-9 w-full border border-nexus-border px-2 text-left font-mono text-[0.48rem] uppercase text-nexus-textMuted">[ CLEAR BOARD / RELATIONS ]</button>
             <button type="button" onClick={clearAnnotations} className="min-h-9 w-full border border-nexus-border px-2 text-left font-mono text-[0.48rem] uppercase text-nexus-textMuted">[ CLEAR ANNOTATIONS ]</button>
             <button type="button" onClick={clearMarks} className="min-h-9 w-full border border-nexus-border px-2 text-left font-mono text-[0.48rem] uppercase text-nexus-textMuted">[ RESET MARKS ]</button>
            <button type="button" onClick={resetSimulation} className="min-h-9 w-full border border-nexus-danger px-2 text-left font-mono text-[0.48rem] uppercase text-nexus-danger">[ RESET SIMULATION ]</button>
          </div>

          {selectedArtifact && (
            <>
              <div className="mt-3 space-y-1 border-t border-nexus-borderSubtle pt-3">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">TEST SIMULATION</p>
                <button
                  type="button"
                  onClick={() => simulateEvidenceUpdate(selectedArtifact.id)}
                  className="min-h-9 w-full border border-nexus-border px-2 text-left font-mono text-[0.48rem] uppercase text-nexus-textMuted hover:border-nexus-info hover:text-nexus-info"
                >[ SIMULATE RECORD UPDATE ]</button>
                <button
                  type="button"
                  onClick={simulateContradiction}
                  className="min-h-9 w-full border border-nexus-border px-2 text-left font-mono text-[0.48rem] uppercase text-nexus-warning hover:border-nexus-warning hover:text-nexus-warning"
                >[ SIMULATE CONTRADICTION ]</button>
                <button
                  type="button"
                  onClick={() => placeOnTable(selectedArtifact.id)}
                  disabled={!!workspace.placements[selectedArtifact.id]}
                  className="min-h-9 w-full border border-nexus-border px-2 text-left font-mono text-[0.48rem] uppercase text-nexus-textMuted disabled:opacity-40"
                >[ ADD TO TABLE ]</button>
              </div>

              <div className="mt-2 space-y-0.5 border-t border-nexus-borderSubtle pt-2">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">KEYBOARD SHORTCUTS</p>
                <div className="grid grid-cols-[48px_1fr] gap-1 font-mono text-[0.55rem]">
                  <span className="text-nexus-textSubtle">← →</span><span className="text-nexus-textMuted">PREV / NEXT EVIDENCE</span>
                  <span className="text-nexus-textSubtle">T</span><span className="text-nexus-textMuted">ADD TO TABLE</span>
                  <span className="text-nexus-textSubtle">M</span><span className="text-nexus-textMuted">CYCLE MARK TYPE</span>
                  <span className="text-nexus-textSubtle">ESC</span><span className="text-nexus-textMuted">EXIT INSPECTION</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-nexus-borderSubtle pt-2">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">STATE INSPECTOR</p>
                <StateLine label="ID" value={selectedArtifact.code} />
                <StateLine label="TYPE" value={artifactType(selectedArtifact)} />
                <StateLine label="COND" value={artifactCondition(selectedArtifact)} />
                <StateLine label="STATE" value={artifactState(selectedArtifact)} />
                <StateLine label="CASE" value={selectedArtifact.simulation ? `${SHOWCASE_CASE.id} / ${SHOWCASE_LABEL}` : '037 / SIMULATION'} />
                <StateLine label="SOURCE" value={selectedArtifact.content.source ? String(selectedArtifact.content.source) : 'UNKNOWN'} />
                <StateLine label="LOCATION" value={selectedArtifact.location ?? 'UNKNOWN'} />
                <StateLine label="MARK" value={workspace.marks[selectedArtifact.id] ?? 'UNMARKED'} />
                <StateLine label="BOARD" value={workspace.placements[selectedArtifact.id] ? 'PLACED' : 'UNPLACED'} />
                <StateLine label="NOTES" value={workspace.annotations[selectedArtifact.id]?.length ?? 0} />
                <StateLine label="LINKS" value={workspace.hypotheses.filter(item => item.from === selectedArtifact.id || item.to === selectedArtifact.id).length} />
              </div>

              <RelationList artifact={selectedArtifact} onOpen={openArtifact} />
            </>
          )}
          <p className="mt-4 border-t border-nexus-borderSubtle pt-2 text-[0.48rem] uppercase leading-relaxed text-nexus-textSubtle">RESET CLEARS ONLY THIS OPERATOR’S LOCAL SIMULATION. PRODUCTION INVENTORY IS NEVER MUTATED.</p>
        </aside>
      </div>
    </div>
  )
}

/**
 * Relations are the point of the case: the generated register links every
 * artifact to the ones that corroborate or contradict it. Showing them turns a
 * pile of files into a graph an operator can walk.
 */
function RelationList({ artifact, onOpen }: { artifact: CaseArtifact; onOpen: (id: string) => void }) {
  const relations = artifact.relationships ?? []
  if (relations.length === 0) return null
  return (
    <div className="mt-3 border-t border-nexus-borderSubtle pt-2">
      <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">RELATIONS / {relations.length}</p>
      <ul className="mt-1 space-y-1">
        {relations.map(relation => (
          <li key={`${relation.kind}-${relation.to}`} className="border-l border-nexus-border pl-2">
            <button
              type="button"
              onClick={() => onOpen(`evidence:${relation.to}`)}
              className="text-left font-mono text-[0.5rem] uppercase text-nexus-info hover:underline"
            >{relation.kind} → {relation.to}</button>
            <p className="text-[0.48rem] leading-snug text-nexus-textSubtle">{relation.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StateReadout({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-2 font-mono text-[0.52rem]"><span className="uppercase text-nexus-textSubtle">{label}</span><span className="font-bold tabular-nums text-nexus-text">{value.toString().padStart(2, '0')}</span></div>
}

function StateLine({ label, value }: { label: string; value: string | number }) {
  return <div className="grid grid-cols-[62px_1fr] gap-2 font-mono text-[0.5rem]"><span className="uppercase text-nexus-textSubtle">{label}</span><span className="break-words text-nexus-text">{value}</span></div>
}