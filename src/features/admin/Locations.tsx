/**
 * NEXUS — Admin Location Management
 *
 * Runtime-configurable physical puzzle locations. Each puzzle node can have
 * one location override; changes are audited through the location_history table.
 * QR codes identify nodes (not locations), so relocating a node does NOT
 * require QR regeneration.
 */

import { useEffect, useMemo, useState } from 'react'
import { BureauIcons } from '@/components/bureau'
import { cn, getAvatarInitials } from '@/lib/utils'
import { useBureau } from '@/hooks/useBureau'
import { ALL_PUZZLES } from '@/content/puzzles'
import { LocationEditor } from '@/components/admin/LocationEditor'
import { adminAPI } from '@/lib/admin'
import { generateQRCodeSheet } from '@/lib/qr-download'
import type { LocationEntry } from '@/lib/admin'
import type { NodeIndexEntry } from '@/content/puzzles'
import { PUZZLE_TYPE_LABELS } from '@/app/config'

export function AdminLocations() {
  const {
    locations,
    isLoading,
    error,
    fetchLocations,
  } = useBureau()

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorNode, setEditorNode] = useState<NodeIndexEntry | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Location Management</h1>
          <p className="text-nexus-textMuted mt-1">
            Override physical locations for puzzle nodes without regenerating QR codes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setIsDownloading(true)
              setDownloadError(null)
              try {
                const qrCodes = await adminAPI.listQRCodes()
                const result = await generateQRCodeSheet(qrCodes)
                if (!result.success) {
                  setDownloadError(result.error ?? 'Failed to generate QR sheet')
                }
              } catch (err: unknown) {
                setDownloadError(err instanceof Error ? err.message : 'Failed to generate QR sheet')
              } finally {
                setIsDownloading(false)
              }
            }}
            disabled={isDownloading}
            className="btn-primary text-xs py-1.5"
          >
            {isDownloading ? (
              <>
                <BureauIcons.Spinner className="bureau-icon w-4 h-4 animate-spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <BureauIcons.Download className="bureau-icon w-4 h-4" />
                <span>⬇️ Download All QR Codes</span>
              </>
            )}
          </button>
          <button
            onClick={() => void fetchLocations()}
            disabled={isLoading}
            className="btn-secondary text-xs py-1.5"
          >
            <BureauIcons.Refresh className={cn('bureau-icon w- h-4', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {(error || downloadError) && (
        <div className="p-3 rounded-xl bg-nexus-dangerBg/20 border border-nexus-danger/30 text-nexus-danger text-sm flex items-start gap-2">
          <BureauIcons.Alert className="bureau-icon w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error || downloadError}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <BureauIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-textSubtle" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by node code, name, location, or type..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-nexus-surfaceElevated border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent"
        />
      </div>

      {/* Locations Table */}
      {isLoading ? (
        <div className="text-center py-12 text-nexus-textSubtle">
          <BureauIcons.Refresh className="bureau-icon w-6 h-6 animate-spin mx-auto mb-2" />
          Loading locations…
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nexus-borderSubtle">
                  <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Node</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Location</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Stage</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-nexus-textSubtle uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map(node => {
                  const loc = locationMap.get(node.id)
                  const displayLocation = loc?.name ?? node.location
                  const displayStatus = loc?.status ?? 'ACTIVE'
                  const hasOverride = !!loc

                  return (
                    <tr
                      key={node.id}
                      className="border-b border-nexus-borderSubtle/50 hover:bg-nexus-bg/50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="bureau-icon w-8 h-8 rounded-lg bg-nexus-surfaceElevated flex items-center justify-center">
                            <span className="font-display font-bold text-sm text-nexus-danger">
                              {getAvatarInitials(node.code)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-nexus-text">{node.code}</span>
                            <div className="text-xs text-nexus-textSubtle font-mono">
                              {PUZZLE_TYPE_LABELS[node.type as keyof typeof PUZZLE_TYPE_LABELS] ?? node.type}
                            </div>
                          </div>
                          <span className="text-sm text-nexus-text">{node.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <BureauIcons.MapPin className="bureau-icon w-4 h-4 text-nexus-textSubtle mt-0.5 flex-shrink-0" />
                          <span className={cn(
                            'text-sm',
                            hasOverride ? 'text-nexus-accent font-medium' : 'text-nexus-textSubtle',
                          )}>
                            {displayLocation || 'No location set'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
                          displayStatus === 'ACTIVE'
                            ? 'bg-nexus-accentBg/20 text-nexus-accent'
                            : 'bg-nexus-warningBg/20 text-nexus-warning',
                        )}>
                          {hasOverride ? (displayStatus === 'ACTIVE' ? 'Overridden' : 'Overridden (Inactive)') : 'Default'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-nexus-textMuted">
                        Stage {node.stage}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditor(node)}
                          className="btn-icon btn-secondary"
                          title={hasOverride ? 'Edit location override' : 'Set location override'}
                        >
                          <BureauIcons.Edit className="bureau-icon w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {filteredNodes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-nexus-textSubtle">
                      No nodes match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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




