/**
 * NEXUS — Location Editor Modal
 *
 * Inline editor for a single puzzle node's physical location.
 * Uses the adminAPI to create, update, or delete location overrides.
 * Location changes are audited through the location_history table.
 */

import { useState } from 'react'
import { BureauIcons } from '@/components/bureau'
import { cn } from '@/lib/utils'
import type { LocationEntry } from '@/lib/admin'
import type { NodeIndexEntry } from '@/content/puzzles'

interface LocationEditorProps {
  isOpen: boolean
  onClose: () => void
  node: NodeIndexEntry
  existingLocation: LocationEntry | null
  onSaved: () => void
}

const LOCATION_STATUS_OPTIONS: Array<{ value: 'ACTIVE' | 'INACTIVE'; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export function LocationEditor({
  isOpen,
  onClose,
  node,
  existingLocation,
  onSaved,
}: LocationEditorProps) {
  const [name, setName] = useState(existingLocation?.name ?? node.location)
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(existingLocation?.status ?? 'ACTIVE')
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isEditing = !!existingLocation
  const canSave = name.trim().length > 0 && isEditing ? name !== existingLocation?.name || status !== existingLocation?.status : !!name.trim()

  const handleSave = async () => {
    if (!node.code) return
    if (!name.trim()) {
      setError('Location name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const adminAPI = (await import('@/lib/admin')).adminAPI
      await adminAPI.saveLocation({
        nodeCode: node.code,
        name: name.trim(),
        status,
        reason: reason.trim() || `Location ${isEditing ? 'updated' : 'created'} via Bureau`,
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save location')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!node.code || !existingLocation) return

    setIsDeleting(true)
    setError(null)

    try {
      const adminAPI = (await import('@/lib/admin')).adminAPI
      await adminAPI.deleteLocationByCode(node.code, reason.trim() || 'Location override removed')
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove location')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (isSaving || isDeleting) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-nexus-surface border border-nexus-border rounded-2xl shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-nexus-borderSubtle">
          <div className="flex items-center gap-3">
             <BureauIcons.MapPin className="bureau-icon w-5 h-5 text-nexus-info" />
            <div>
              <h2 className="heading-3">
                {isEditing ? 'Edit Location' : 'Set Location'}
              </h2>
              <p className="text-sm text-nexus-textSubtle mt-1">
                Node: {node.code} — {node.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving || isDeleting}
            className="p-2 rounded-lg text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors"
          >
            <BureauIcons.Close className="bureau-icon w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-nexus-dangerBg/20 border border-nexus-danger/30 text-nexus-danger text-sm flex items-start gap-2">
               <BureauIcons.Alert className="bureau-icon w-4 h-4 mt-0.5 flex-shrink-0" />
               <span>{error}</span>
            </div>
          )}

          {/* Current default location (read-only reference) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-textSubtle">
              Default Location (from puzzle definition)
            </label>
            <p className="text-sm text-nexus-text px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border">
              {node.location || 'No default location set'}
            </p>
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Runtime Location <span className="text-nexus-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving || isDeleting}
              placeholder="e.g. [SCIENCE BUILDING] — Auditorium Basement Archive"
              className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent disabled:opacity-50"
            />
            <p className="text-xs text-nexus-textSubtle">
              This overrides the default location shown to players when they scan the node's QR code.
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Status
            </label>
            <div className="flex gap-3">
              {LOCATION_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    status === opt.value
                      ? 'border-nexus-accent bg-nexus-accentBg text-nexus-accent'
                      : 'border-nexus-border text-nexus-textMuted hover:bg-nexus-bg',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexus-text">
              Reason <span className="text-nexus-textSubtle">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSaving || isDeleting}
              placeholder="e.g. HVT relocated to Science Building"
              className="w-full px-3 py-2 rounded-xl bg-nexus-bg border border-nexus-border text-nexus-text text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent disabled:opacity-50"
            />
          </div>

          {/* Warning for INACTIVE */}
          {status === 'INACTIVE' && (
            <div className="p-3 rounded-xl bg-nexus-warningBg/20 border border-nexus-warning/30 text-nexus-warning text-sm flex items-start gap-2">
               <BureauIcons.Alert className="bureau-icon w-4 h-4 mt-0.5 flex-shrink-0" />
               <span>
                 Setting this location to INACTIVE means the node will fall back to its default location
                ({node.location || 'no default'}).
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-nexus-borderSubtle bg-nexus-bg/50 rounded-b-2xl">
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              className="btn-secondary text-nexus-danger hover:bg-nexus-dangerBg/30 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block mr-2" />
                  REMOVING…
                </>
              ) : (
                <>
                  <BureauIcons.Trash className="bureau-icon w-4 h-4 mr-2" />
                  Remove Override
                </>
              )}
            </button>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 text-sm font-medium text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated rounded-xl transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting || !canSave}
              className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block mr-2" />
                  SAVING…
                </>
              ) : (
                <>
                  <BureauIcons.Save className="bureau-icon w-4 h-4 mr-2" />
                  {isEditing ? 'UPDATE' : 'CREATE'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
