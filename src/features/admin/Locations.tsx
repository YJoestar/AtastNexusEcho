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
import { LocationEditor } from '@/components/admin/LocationEditor'
import { adminAPI } from '@/lib/admin'
import { generateQRCodeSheet } from '@/lib/qr-download'
import type { LocationEntry } from '@/lib/admin'
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

  useEffect(() => {
    void fetchLocations()
  }, [fetchLocations])

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
              onClick={async () => {
                setIsDownloading(true)
                setDownloadError(null)
                try {
                  const qrCodes = await adminAPI.listQRCodes()
                  const result = await generateQRCodeSheet(qrCodes)
                  if (!result.success) {
                    setDownloadError(result.error ?? 'FAILED TO GENERATE QR SHEET')
                  }
                } catch (err: unknown) {
                  setDownloadError(err instanceof Error ? err.message : 'FAILED TO GENERATE QR SHEET')
                } finally {
                  setIsDownloading(false)
                }
              }}
              disabled={isDownloading}
              className="nexus-btn-primary text-xs px-3 py-1.5 min-h-[36px]"
            >
              <BureauIcons.Download className="bureau-icon w-3.5 h-3.5" aria-hidden="true" />
              <span>[ FIELD MARKER SHEET ]</span>
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
    </div>
  )
}




