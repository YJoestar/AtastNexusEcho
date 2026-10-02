/**
 * NEXUS — Admin Location Management
 *
 * Runtime-configurable physical puzzle locations. Each puzzle node can have
 * one location override; changes are audited through the location_history table.
 * QR codes identify nodes (not locations), so relocating a node does NOT
 * require QR regeneration.
 */

import { useEffect, useMemo, useState } from 'react'
import { TerminalFrame } from '@/components/bureau'
import { BureauIcons } from '@/components/bureau'
import { cn } from '@/lib/utils'
import { useBureau } from '@/hooks/useBureau'
import { ALL_POIS } from '@/content/campus'
import { useCampusMapState } from '@/hooks/useCampusMap'
import { CampusMap } from '@/components/player/map/CampusMap'
import { TacticalOverlay } from '@/components/visual/TacticalOverlay'
import { FieldMarker } from '@/components/visual/FieldMarker'
import { LocationEditor } from '@/components/admin/LocationEditor'
import { adminAPI } from '@/lib/admin'
import { generateQRCodeSheet } from '@/lib/qr-download'
import type { QRCodeEntry, LocationEntry } from '@/lib/admin'
import type { NodeIndexEntry } from '@/content/puzzles'
import { PUZZLE_TYPE_LABELS } from '@/app/config'
import { ALL_PUZZLES } from '@/content/puzzles'

export function AdminLocations() {
  const {
    locations,
    isLoading,
    error,
    fetchLocations,
    teams,
  } = useBureau()

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorNode, setEditorNode] = useState<NodeIndexEntry | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNodeCode, setSelectedNodeCode] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [qrCodes, setQrCodes] = useState<QRCodeEntry[]>([])
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [showDeploymentTool, setShowDeploymentTool] = useState(false)
  const [selectedBatchName, setSelectedBatchName] = useState('ALL')

  useEffect(() => {
    void fetchLocations()
  }, [fetchLocations])

  const loadQRCodes = async () => {
    setIsQrLoading(true)
    setQrError(null)
    try {
      const codes = await adminAPI.listQRCodes()
      setQrCodes(codes)
    } catch (err: unknown) {
      setQrError(err instanceof Error ? err.message : 'Failed to load QR codes')
    } finally {
      setIsQrLoading(false)
    }
  }

  // Duplicate detection
  const duplicateManualCodes = useMemo(() => {
    const seen = new Map<string, number>()
    const dups: string[] = []
    for (const qr of qrCodes) {
      const manual = qr.manualCode
      if (!manual) continue
      const count = seen.get(manual) ?? 0
      seen.set(manual, count + 1)
      if (count === 1) dups.push(manual)
    }
    return dups
  }, [qrCodes])

  const duplicateMarkerIds = useMemo(() => {
    const seen = new Map<string, number>()
    const dups: string[] = []
    for (const qr of qrCodes) {
      const id = qr.markerId ?? qr.code
      const count = seen.get(id) ?? 0
      seen.set(id, count + 1)
      if (count === 1) dups.push(id)
    }
    return dups
  }, [qrCodes])

  const filteredQRCodes = useMemo(() => {
    if (selectedBatchName === 'ALL') return qrCodes
    const batchCodes = qrCodes.filter(q => q.deploymentBatch === selectedBatchName)
    return batchCodes.length > 0 ? batchCodes : qrCodes
  }, [qrCodes, selectedBatchName])

  const batchSummary = useMemo(() => {
    if (selectedBatchName === 'ALL') {
      return {
        totalMarkers: qrCodes.length,
        pages: Math.ceil(qrCodes.length / 4),
        duplicates: [...new Set([...duplicateManualCodes, ...duplicateMarkerIds])].length,
        deployed: qrCodes.filter(q => q.deploymentStatus === 'DEPLOYED').length,
        active: qrCodes.filter(q => q.deploymentStatus === 'ACTIVE').length,
      }
    }
    const batchCodes = qrCodes.filter(q => q.deploymentBatch === selectedBatchName)
    const set = batchCodes.length > 0 ? batchCodes : qrCodes
    return {
      totalMarkers: set.length,
      pages: Math.ceil(set.length / 4),
      duplicates: [...new Set([...duplicateManualCodes, ...duplicateMarkerIds])].length,
      deployed: set.filter(q => q.deploymentStatus === 'DEPLOYED').length,
      active: set.filter(q => q.deploymentStatus === 'ACTIVE').length,
    }
  }, [qrCodes, duplicateManualCodes, duplicateMarkerIds, selectedBatchName])

  const locationMap = useMemo(() => {
    const map = new Map<string, LocationEntry>()
    for (const loc of locations) {
      map.set(loc.nodeCode, loc)
    }
    return map
  }, [locations])

  const filteredNodes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return ALL_PUZZLES

    return ALL_PUZZLES.filter(node =>
      node.code.toLowerCase().includes(term) ||
      node.name.toLowerCase().includes(term) ||
      node.location.toLowerCase().includes(term) ||
      node.type.toLowerCase().includes(term)
    )
  }, [searchTerm])

  const solvedCodes = useMemo(() => {
    const set = new Set<string>()
    for (const t of teams) {
      // @ts-expect-error – solvedNodes shape is internal
      const solved = t.solvedNodes ?? {}
      for (const code of Object.keys(solved)) set.add(code)
    }
    return set
  }, [teams])

  const availableNodeIds = useMemo(() => {
    return teams.flatMap(t => t.solvedCount ? [] : [])
  }, [teams])

  const mapNodes = useCampusMapState({
    solvedCodes,
    currentNodeId: selectedNodeCode,
    availableNodeIds,
    narrativeLevel: 0,
  })

  const openEditor = (node: NodeIndexEntry) => {
    setEditorNode(node)
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorNode(null)
    setIsEditorOpen(false)
  }

  const handleSave = async () => {
    await fetchLocations()
  }

  const handleNodeSelect = (code: string) => {
    setSelectedNodeCode(code)
    const puzzle = ALL_POIS.find(p => p.code === code)
    if (puzzle) {
      // Find the full puzzle entry by code to open the editor
      const puzzleEntry = ALL_PUZZLES.find(p => p.code === code)
      if (puzzleEntry) openEditor(puzzleEntry)
    }
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-nexus-border bg-nexus-surfaceElevated p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-nexus-accent" />
              <span className="text-[0.625rem] tracking-[0.24em] uppercase text-nexus-textSubtle">
                NEXUS ECHO // CAMPUS INVESTIGATION ARCHIVE
              </span>
            </div>
            <h1 className="font-mono text-xl font-bold tracking-tight text-nexus-text mt-1">
              FIELD NODE REGISTER
            </h1>
          </div>

          <div className="flex items-center gap-2">
             <button
               type="button"
               onClick={() => {
                 void loadQRCodes()
                 setShowDeploymentTool(true)
               }}
               disabled={isQrLoading}
               className="nexus-btn-primary text-xs px-3 py-1.5 min-h-[36px]"
             >
               <BureauIcons.Download className="bureau-icon w-3.5 h-3.5" aria-hidden="true" />
               <span>[ DEPLOYMENT TOOL ]</span>
             </button>

            <button
              type="button"
              onClick={() => void fetchLocations()}
              disabled={isLoading}
              className="nexus-btn-secondary text-xs px-3 py-1.5 min-h-[36px]"
            >
              <BureauIcons.RotateCcw className={cn('bureau-icon w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>[ POLL STATUS ]</span>
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-nexus-borderSubtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <BureauIcons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-textSubtle" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="FILTER BY NODE CODE, NAME, OR LOCATION…"
              className="w-full bg-nexus-bg border border-nexus-border text-nexus-text pl-8 pr-3 py-1.5 text-xs placeholder:text-nexus-textSubtle focus:outline-none focus:border-nexus-accent font-mono"
            />
          </div>

          <div className="text-[0.56rem] uppercase tracking-[0.16em] text-nexus-textSubtle">
            {filteredNodes.length} NODES CATALOGUED
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {(error || downloadError) && (
        <div className="p-3 bg-nexus-dangerBg/30 border border-nexus-danger text-nexus-danger text-xs flex items-center gap-2">
          <BureauIcons.AlertTriangle className="bureau-icon w-4 h-4 shrink-0" />
          <span>ARCHIVE ERROR: {error || downloadError}</span>
        </div>
      )}

      {/* Spatial Telemetry & Node Register */}
      <div className="grid gap-4 xl:grid-cols-[480px_minmax(0,1fr)]">
        {/* Campus Map as Primary Interface */}
        <TerminalFrame title="CAMPUS CARTOGRAPHY" reference="SECTOR MAP" variant="monitor">
          <div className="p-2">
            <div className="relative border border-nexus-border bg-nexus-bg h-80">
              <CampusMap
                nodes={mapNodes}
                showFog={true}
                onNodeSelect={handleNodeSelect}
                onNodeHover={() => {}}
              />
              <TacticalOverlay nodes={mapNodes} />
            </div>
            <div className="mt-2 text-[0.56rem] font-mono uppercase tracking-[0.14em] text-nexus-textSubtle flex justify-between">
              <span>LEGEND</span>
              <span>CLICK MARKER TO INSPECT</span>
            </div>
            <div className="mt-1 flex gap-3 text-[0.625rem]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-nexus-accent" />
                <span className="text-nexus-textSubtle">VERIFIED</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-nexus-textMuted" />
                <span className="text-nexus-textSubtle">UNKNOWN</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 border border-nexus-warning" />
                <span className="text-nexus-textSubtle">ACTIVE</span>
              </span>
            </div>
          </div>
        </TerminalFrame>

        {/* Node Register */}
        <TerminalFrame
          title="FIELD NODE REGISTER"
          reference={`${filteredNodes.length} OF ${ALL_PUZZLES.length} NODES`}
          variant="register"
        >
          {isLoading ? (
            <div className="py-12 text-center text-nexus-textSubtle font-mono text-xs">
              <BureauIcons.Spinner className="bureau-icon w-6 h-6 animate-spin mx-auto mb-2 text-nexus-accent" />
              <span>SYNCHRONIZING FIELD NODE REGISTERS…</span>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="py-12 text-center text-nexus-textSubtle font-mono text-xs">
              <p>NO FIELD NODES MATCH FILTER</p>
              <p className="text-[0.625rem] mt-1 text-nexus-textMuted">ADJUST FILTER PARAMETERS OR CATALOG A NEW NODE</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[100px_140px_1fr_100px_80px] gap-2 px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.18em] text-nexus-textSubtle border-b border-nexus-border">
                <span>MARKER</span>
                <span>CLASSIFICATION</span>
                <span>LOCATION</span>
                <span>STAGE</span>
                <span className="text-right">STATUS</span>
              </div>

              {filteredNodes.map(node => {
                const loc = locationMap.get(node.id)
                const displayLocation = loc?.name ?? node.location
                const displayStatus = loc?.status ?? 'ACTIVE'
                const hasOverride = !!loc
                const statusText = hasOverride
                  ? displayStatus === 'ACTIVE'
                    ? 'OVERRIDDEN'
                    : 'INACTIVE'
                  : 'DEFAULT'

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => openEditor(node)}
                    className="w-full grid grid-cols-[100px_140px_1fr_100px_80px] gap-2 px-3 py-2 text-xs items-center border-b border-nexus-borderSubtle/50 hover:bg-nexus-surfaceElevated transition-colors font-mono text-left"
                  >
                    <span className="font-bold text-nexus-accent">{node.code}</span>
                    <span className="text-nexus-textMuted truncate">
                      {PUZZLE_TYPE_LABELS[node.type as keyof typeof PUZZLE_TYPE_LABELS] ?? node.type}
                    </span>
                    <span
                      className={cn(
                        'truncate',
                        hasOverride ? 'text-nexus-accent font-medium' : 'text-nexus-textMuted',
                      )}
                      title={displayLocation}
                    >
                      {displayLocation || 'NO LOCATION SET'}
                    </span>
                    <span className="text-nexus-textMuted">
                      Stage {node.stage}
                    </span>
                    <div className="text-right">
                      <span
                        className={cn(
                          'inline-block text-[0.56rem] font-mono px-1 py-0.5 border uppercase tracking-[0.12em]',
                          statusText === 'OVERRIDDEN' && 'border-nexus-accent text-nexus-accent',
                          statusText === 'INACTIVE' && 'border-nexus-warning text-nexus-warning',
                          statusText === 'DEFAULT' && 'border-nexus-borderSubtle text-nexus-textSubtle',
                        )}
                      >
                        {statusText}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </TerminalFrame>
      </div>

      {/* Location Editor Modal */}
      {isEditorOpen && editorNode && (
        <LocationEditor
          isOpen={isEditorOpen}
          onClose={closeEditor}
          node={editorNode}
          existingLocation={locationMap.get(editorNode.id) ?? null}
          onSaved={handleSave}
        />
      )}

      {/* Deployment Tool Modal */}
      {showDeploymentTool && (
        <DeploymentTool
          qrCodes={filteredQRCodes}
          isLoading={isQrLoading}
          error={qrError}
          batchName={selectedBatchName}
          onBatchNameChange={setSelectedBatchName}
          onReload={loadQRCodes}
          onClose={() => setShowDeploymentTool(false)}
          onGenerate={async () => {
            setIsDownloading(true)
            setDownloadError(null)
            try {
              const result = await generateQRCodeSheet(filteredQRCodes, { batchName: selectedBatchName })
              if (!result.success) {
                setDownloadError(result.error ?? 'FAILED TO GENERATE QR SHEET')
              }
            } catch (err: unknown) {
              setDownloadError(err instanceof Error ? err.message : 'FAILED TO GENERATE QR SHEET')
            } finally {
              setIsDownloading(false)
            }
          }}
          isGenerating={isDownloading}
          generateError={downloadError}
          duplicateManualCodes={duplicateManualCodes}
          duplicateMarkerIds={duplicateMarkerIds}
          batchSummary={batchSummary}
          FieldMarkerComponent={FieldMarker}
        />
      )}
    </div>
  )
}

interface DeploymentToolProps {
  qrCodes: QRCodeEntry[]
  isLoading: boolean
  error: string | null
  batchName: string
  onBatchNameChange: (name: string) => void
  onReload: () => void
  onClose: () => void
  onGenerate: () => void
  isGenerating: boolean
  generateError: string | null
  duplicateManualCodes: string[]
  duplicateMarkerIds: string[]
  batchSummary: { totalMarkers: number; pages: number; duplicates: number; deployed: number; active: number }
  FieldMarkerComponent: React.ComponentType<{ qrCode: QRCodeEntry; variant?: 'preview' | 'print'; className?: string }>
}

function DeploymentTool({
  qrCodes,
  isLoading,
  error,
  batchName,
  onBatchNameChange,
  onReload,
  onClose,
  onGenerate,
  isGenerating,
  generateError,
  duplicateManualCodes,
  duplicateMarkerIds,
  batchSummary,
  FieldMarkerComponent,
}: DeploymentToolProps) {
  const [previewItem, setPreviewItem] = useState<QRCodeEntry | null>(null)

  const hasIssues = duplicateManualCodes.length > 0 || duplicateMarkerIds.length > 0

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-nexus-paper max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-nexus-border">
        {/* Header */}
        <div className="border-b border-nexus-borderSubtle px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-nexus-textSubtle">
              NEXUS ECHO // FIELD DEPLOYMENT WORKSTATION
            </h2>
            <div className="font-mono text-lg font-bold text-nexus-text mt-1">
              MARKER DEPLOYMENT TOOL
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-nexus-textMuted hover:text-nexus-text"
          >
            <BureauIcons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-nexus-borderSubtle space-y-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle mb-1">
                DEPLOYMENT BATCH
              </label>
              <select
                value={batchName}
                onChange={e => onBatchNameChange(e.target.value)}
                className="input w-full font-mono text-xs"
              >
                <option value="ALL">ALL BATCHES ({qrCodes.length})</option>
                <option value="BATCH-01">BATCH-01 (36)</option>
                <option value="BATCH-02">BATCH-02 (11)</option>
              </select>
            </div>
            <button
              onClick={onReload}
              disabled={isLoading}
              className="nexus-btn-secondary text-xs px-3 py-1.5"
            >
              {isLoading ? (
                <BureauIcons.Spinner className="bureau-icon w-3 h-3 animate-spin" />
              ) : (
                <BureauIcons.RotateCcw className="bureau-icon w-3 h-3" />
              )}
              <span>[ REFRESH ]</span>
            </button>
          </div>

          {/* Batch Summary */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="border border-nexus-borderSubtle p-2">
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">TOTAL</div>
              <div className="font-mono text-xl font-bold text-nexus-text">{batchSummary.totalMarkers}</div>
            </div>
            <div className="border border-nexus-borderSubtle p-2">
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">PAGES</div>
              <div className="font-mono text-xl font-bold text-nexus-accent">{batchSummary.pages}</div>
            </div>
            <div className="border border-nexus-borderSubtle p-2">
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">DEPLOYED</div>
              <div className="font-mono text-xl font-bold text-nexus-warning">{batchSummary.deployed}</div>
            </div>
            <div className="border border-nexus-borderSubtle p-2">
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">ACTIVE</div>
              <div className="font-mono text-xl font-bold text-nexus-accent">{batchSummary.active}</div>
            </div>
            <div className="border border-nexus-borderSubtle p-2">
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">ISSUES</div>
              <div className={cn(
                'font-mono text-xl font-bold',
                batchSummary.duplicates === 0 ? 'text-nexus-text' : 'text-nexus-danger'
              )}>{batchSummary.duplicates}</div>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-2 bg-nexus-dangerBg/30 border border-nexus-danger text-nexus-danger text-xs">
              {error}
            </div>
          )}

          {(duplicateManualCodes.length > 0 || duplicateMarkerIds.length > 0) && (
            <div className="p-2 bg-nexus-warningBg/30 border border-nexus-warning text-nexus-warning text-xs">
              <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] mb-1">DUPLICATE DETECTED</div>
              {duplicateManualCodes.length > 0 && (
                <div>Manual codes: {duplicateManualCodes.join(', ')}</div>
              )}
              {duplicateMarkerIds.length > 0 && (
                <div>Marker IDs: {duplicateMarkerIds.join(', ')}</div>
              )}
            </div>
          )}
        </div>

        {/* Markers Grid */}
        <div className="p-4">
          <div className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle mb-3">
            MARKER PREVIEW — CLICK ANY UNIT FOR FULL VIEW
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-nexus-textMuted">
              <BureauIcons.Spinner className="bureau-icon w-6 h-6 animate-spin mx-auto mb-2" />
              LOADING MARKER REGISTER
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="text-center py-8 text-nexus-textMuted">
              NO MARKERS FOUND
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {qrCodes.slice(0, 12).map(qr => (
                <button
                  key={qr.code}
                  onClick={() => setPreviewItem(qr)}
                  className="cursor-pointer focus:outline-none focus:ring-1 focus:ring-nexus-accent"
                >
                  <FieldMarkerComponent qrCode={qr} variant="preview" className="w-full max-w-[180px] mx-auto" />
                </button>
              ))}
              {qrCodes.length > 12 && (
                <div className="text-[0.56rem] font-mono uppercase tracking-[0.12em] text-nexus-textSubtle">
                  …and {qrCodes.length - 12} more markers
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generator */}
        <div className="border-t border-nexus-borderSubtle p-4 flex justify-between items-center">
          <div>
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
              {qrCodes.length} markers • {batchSummary.pages} pages (2×2) • PDF will download automatically
            </p>
            {generateError && (
              <p className="text-xs text-nexus-danger mt-1">{generateError}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="nexus-btn-secondary text-xs px-3 py-1.5"
            >
              [ CANCEL ]
            </button>
            <button
              onClick={onGenerate}
              disabled={isGenerating || qrCodes.length === 0 || hasIssues}
              className="nexus-btn-primary text-xs px-4 py-1.5 min-h-[36px]"
            >
              {isGenerating ? (
                <BureauIcons.Spinner className="bureau-icon w-3.5 h-3.5 animate-spin" />
              ) : (
                <BureauIcons.Download className="bureau-icon w-3.5 h-3.5" />
              )}
              <span>[ GENERATE DEPLOYMENT SHEET ]</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full-size preview modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-nexus-paper max-w-[320px] w-full border border-nexus-border">
            <div className="border-b border-nexus-borderSubtle p-2 flex justify-between items-center">
              <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
                MARKER PREVIEW
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 text-nexus-textMuted hover:text-nexus-text"
              >
                <BureauIcons.Close className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2">
              <FieldMarkerComponent qrCode={previewItem} variant="print" className="w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




