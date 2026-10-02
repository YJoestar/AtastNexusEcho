import { useEffect, useMemo, useState, useCallback } from 'react'
import { FileRow, FileTabs, TerminalFrame } from '@/components/bureau'
import { useAdmin } from '@/app/providers/AdminProvider'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { adminAPI, type EvidenceLabCatalog } from '@/lib/admin'
import { buildEvidenceCatalog } from '@/lib/evidenceCatalog'
import { cn } from '@/lib/utils'
import { ArtifactInspection } from '@/features/player/evidence/ArtifactInspection'
import { InvestigationTable } from '@/features/player/evidence/InvestigationTable'
import { contentString, type CaseArtifact } from '@/features/player/evidence/types'
import { type EvidenceMark } from '@/lib/investigationWorkspace'

type LabMode = 'REGISTER' | 'INSPECT' | 'COMPARE' | 'TABLE'
type LabFilter = 'ALL' | 'PHOTOGRAPHS' | 'DOCUMENTS' | 'AUDIO' | 'SURVEILLANCE' | 'FRAGMENTS' | 'UNAVAILABLE'

const LAB_FILTERS: { id: LabFilter; label: string }[] = [
  { id: 'ALL', label: 'ALL MATERIAL' },
  { id: 'PHOTOGRAPHS', label: 'PHOTOGRAPHS' },
  { id: 'DOCUMENTS', label: 'DOCUMENTS' },
  { id: 'AUDIO', label: 'AUDIO' },
  { id: 'SURVEILLANCE', label: 'SURVEILLANCE' },
  { id: 'FRAGMENTS', label: 'FRAGMENTS' },
  { id: 'UNAVAILABLE', label: 'DAMAGED / MISSING' },
]

function matchesFilter(artifact: CaseArtifact, filter: LabFilter): boolean {
  const type = artifact.type.toUpperCase()
  if (filter === 'ALL') return true
  if (filter === 'PHOTOGRAPHS') return /IMAGE|PHOTO|PHOTOGRAPH/.test(type)
  if (filter === 'DOCUMENTS') return /DOCUMENT|REPORT|TEXT/.test(type)
  if (filter === 'AUDIO') return /AUDIO|RECORDING/.test(type)
  if (filter === 'SURVEILLANCE') return /VIDEO|SURVEILLANCE|CAMERA/.test(type)
  if (filter === 'FRAGMENTS') return /FRAGMENT/.test(type)
  return !contentString(artifact.content, ['image_url', 'imageUrl', 'audio_url', 'audioUrl', 'video_url', 'videoUrl', 'document_url', 'file_url'])
}

function buildDevelopmentCatalog(): EvidenceLabCatalog {
  return {
    evidence: [
      {
        id: 'dev-ev-001', code: 'EVID-001', title: 'Security Log Excerpt', description: 'Fragment of a security log from the admin building.',
        type: 'DOCUMENT', classification: 'RESTRICTED',
        content: { detail: 'Entry timestamp discrepancy noted.', timestamp: '2026-10-02T17:22:03Z', location: 'ADMIN BUILDING / WEST WING', device: 'LOG-SERVER-A', integrity: 'CORRUPTED' },
        metadata: { source: 'P01', case: '037' },
      },
      {
        id: 'dev-ev-002', code: 'EVID-002', title: 'Clock Tower Blueprint', description: 'Blueprints showing hidden compartments.',
        type: 'DOCUMENT', classification: 'RESTRICTED',
        content: { detail: 'Mechanism behind the clock face.', location: 'CLOCK TOWER' },
        metadata: { source: 'P02', case: '037' },
      },
      {
        id: 'dev-ev-003', code: 'EVID-003', title: 'Field Camera Photo', description: 'Security photograph from the north entrance.',
        type: 'IMAGE', classification: 'RESTRICTED',
        content: {
          detail: 'Unidentified figure visible in reflection.',
          image_url: 'https://images.unsplash.com/photo-1581090700227-1cbcb5a2a9ed?w=800&h=600',
          timestamp: '2026-10-02T05:13:41Z', location: 'NORTH ENTRANCE / LOBBY', device: 'FIELD-CAM-02',
        },
        metadata: { source: 'P05', case: '037' },
      },
      {
        id: 'dev-ev-004', code: 'EVID-004', title: 'Maintenance Log', description: 'Routine maintenance log for sector C.',
        type: 'DOCUMENT', classification: 'RESTRICTED',
        content: { detail: 'Scheduled at 03:00, but anomalies noted.', location: 'SECTOR C / MAINTENANCE' },
        metadata: { source: 'P06', case: '037' },
      },
      {
        id: 'dev-ev-005', code: 'EVID-005', title: 'Surveillance Feed — Lobby', description: 'Static-timestamp feed from the main lobby camera.',
        type: 'SURVEILLANCE', classification: 'CONFIDENTIAL',
        content: { timestamp: '2026-10-02T08:47:00Z', camera_id: 'CAM-LOBBY-01', location: 'ADMIN BUILDING LOBBY', device: 'CAM-LOBBY-01', integrity: 'STABLE' },
        metadata: { source: 'CAM-LOBBY-01', case: '037' },
      },
      {
        id: 'dev-ev-006', code: 'EVID-006', title: 'Audio Recording — Figure', description: 'Low-fidelity recording from a recovered field device.',
        type: 'AUDIO', classification: 'CONFIDENTIAL',
        content: { recording_id: 'AUDIO-006', duration: '00:47', source: 'FIELD-DEVICE-A', acquired: '2026-10-02T09:00:00Z', signal_state: 'DEGRADED' },
        metadata: { source: 'FIELD-DEVICE-A', case: '037' },
      },
    ],
    inventoryItems: [
      {
        id: 'dev-inv-001', code: 'ITEM-001', name: 'Digital Lockpick', description: 'A tool for bypassing electronic locks.',
        type: 'DEVICE', rarity: 'RARE', properties: { weight: 0.2, uses_remaining: 3 }, uses: [], metadata: { source: 'P03' },
      },
      {
        id: 'dev-inv-002', code: 'ITEM-002', name: 'Evidence Marker', description: 'Physical tag for marking evidence items on the table.',
        type: 'TOOL', rarity: 'COMMON', properties: { color: 'RED', qty: 12 }, uses: [], metadata: {},
      },
    ],
    fragments: [
      {
        id: 'dev-frag-001', code: 'FRAG-001', label: 'Fragment Alpha', content: 'The signal originates from the old comms array...',
        type: 'AUDIO', role: 'ANALYST', node_id: 'node-p05', position: 1, metadata: { source: 'P05' },
      },
      {
        id: 'dev-frag-002', code: 'FRAG-002', label: 'Fragment Beta', content: 'Coordinates converge at the NEXUS CORE.',
        type: 'TEXT', role: 'OPERATOR', node_id: 'node-p07b', position: 2, metadata: { source: 'P07b' },
      },
    ],
    nodes: [
      { id: 'node-p01', code: 'P01', title: 'The Facade', location: '[ADMIN BUILDING] — Main Entrance Facade' },
      { id: 'node-p02', code: 'P02', title: 'The Clock', location: '[ADMIN BUILDING] — Lobby Clock Tower' },
      { id: 'node-p03', code: 'P03', title: 'The Facade Pin', location: '[ADMIN BUILDING] — Facade Base Terminal' },
      { id: 'node-p05', code: 'P05', title: 'The Third Figure', location: '[ADMIN BUILDING] — Archive Figure Display' },
      { id: 'node-p07b', code: 'P07b', title: 'The Network', location: '[SCIENCE BUILDING] — Lab Network Diagram' },
      { id: 'node-m01', code: 'M01', title: 'The First Lock', location: '[ADMIN BUILDING] — Central Archive' },
    ],
  }
}

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
  const filteredArtifacts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return artifacts.filter(artifact => matchesFilter(artifact, filter)
      && (!query || `${artifact.code} ${artifact.title} ${artifact.type} ${artifact.location ?? ''} ${artifact.description}`.toLowerCase().includes(query)))
  }, [artifacts, filter, search])
  const selectedArtifact = artifacts.find(artifact => artifact.id === selectedId) ?? null
  const comparedArtifacts = compareIds.map(id => artifacts.find(artifact => artifact.id === id)).filter((item): item is CaseArtifact => !!item)
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
        case 'ArrowLeft':
          event.preventDefault()
          goPrev()
          break
        case 'ArrowRight':
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
        case 'Escape':
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
              return (
                <div key={artifact.id} className={cn('border-b border-nexus-borderSubtle/50', selectedId === artifact.id && 'border-l-2 border-l-nexus-accent bg-nexus-surfaceElevated')}>
                  <FileRow
                    reference={artifact.code}
                    title={artifact.title}
                    meta={`${artifact.type} / ${artifact.location ?? 'LOCATION UNKNOWN'}`}
                    selected={selectedId === artifact.id}
                    onSelect={() => openArtifact(artifact.id)}
                  />
                  <div className="flex items-center justify-between gap-1 px-2 pb-1.5 text-[0.46rem] uppercase text-nexus-textSubtle">
                    <span className="truncate">{currentMark}{onTable ? ' / PLACED' : ''}</span>
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
            <StateReadout label="CATALOG RECORDS" value={artifacts.length} />
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
                <StateLine label="TYPE" value={selectedArtifact.type} />
                <StateLine label="CASE" value="037 / SIMULATION" />
                <StateLine label="SOURCE" value={selectedArtifact.content.source ? String(selectedArtifact.content.source) : 'UNKNOWN'} />
                <StateLine label="LOCATION" value={selectedArtifact.location ?? 'UNKNOWN'} />
                <StateLine label="MARK" value={workspace.marks[selectedArtifact.id] ?? 'UNMARKED'} />
                <StateLine label="BOARD" value={workspace.placements[selectedArtifact.id] ? 'PLACED' : 'UNPLACED'} />
                <StateLine label="NOTES" value={workspace.annotations[selectedArtifact.id]?.length ?? 0} />
                <StateLine label="LINKS" value={workspace.hypotheses.filter(item => item.from === selectedArtifact.id || item.to === selectedArtifact.id).length} />
              </div>
            </>
          )}
          <p className="mt-4 border-t border-nexus-borderSubtle pt-2 text-[0.48rem] uppercase leading-relaxed text-nexus-textSubtle">RESET CLEARS ONLY THIS OPERATOR’S LOCAL SIMULATION. PRODUCTION INVENTORY IS NEVER MUTATED.</p>
        </aside>
      </div>
    </div>
  )
}

function StateReadout({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-2 font-mono text-[0.52rem]"><span className="uppercase text-nexus-textSubtle">{label}</span><span className="font-bold tabular-nums text-nexus-text">{value.toString().padStart(2, '0')}</span></div>
}

function StateLine({ label, value }: { label: string; value: string | number }) {
  return <div className="grid grid-cols-[62px_1fr] gap-2 font-mono text-[0.5rem]"><span className="uppercase text-nexus-textSubtle">{label}</span><span className="break-words text-nexus-text">{value}</span></div>
}