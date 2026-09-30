/**
 * NEXUS — Player Evidence Board
 * Evidence collection displayed as an investigation board.
 * Cards show type, source, and content preview.
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Image, Music, Video, Database, Box, Search, Filter } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

const EVIDENCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DOCUMENT: FileText,
  IMAGE: Image,
  AUDIO: Music,
  VIDEO: Video,
  DATA: Database,
  PHYSICAL: Box,
  DIGITAL: Database,
}

const EVIDENCE_TYPES = [
  { value: 'all', label: 'All Evidence', icon: FileText },
  { value: 'DOCUMENT', label: 'Documents', icon: FileText },
  { value: 'IMAGE', label: 'Images', icon: Image },
  { value: 'AUDIO', label: 'Audio', icon: Music },
  { value: 'VIDEO', label: 'Videos', icon: Video },
  { value: 'DATA', label: 'Data', icon: Database },
  { value: 'PHYSICAL', label: 'Physical', icon: Box },
] as const

type EvidenceType = (typeof EVIDENCE_TYPES)[number]['value']

export function PlayerEvidence() {
  const { inventory, isLoading, fetchInventory, teamProgress } = useGameEngine()
  const [filter, setFilter] = useState<EvidenceType>('all')
  const [search, setSearch] = useState('')

  // Evidence is server-authoritative; load it on open rather than on button press.
  useEffect(() => {
    void fetchInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const evidenceFromApi = inventory?.evidence ?? []
  const evidenceOwnedCodes = teamProgress?.evidenceOwned ?? []

  const evidence = evidenceFromApi.length > 0 ? evidenceFromApi : evidenceOwnedCodes

  const filteredEvidence = evidence.filter(item => {
    if (typeof item === 'string') {
      if (search) return item.toLowerCase().includes(search.toLowerCase())
      return true
    }
    if (filter !== 'all' && item.type !== filter) return false
    if (search) return item.title.toLowerCase().includes(search.toLowerCase())
    return true
  })

  if (isLoading('inventory') && !inventory) {
    return (
      <div className="page">
        <div className="page-content max-w-2xl mx-auto py-12 text-center">
          <div className="space-y-3">
            <div className="skeleton h-6 w-3/4 mx-auto rounded" />
            <div className="skeleton h-4 w-1/2 mx-auto rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-content max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.PLAYER_GAME}
            className="p-2 rounded-xl text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="heading-3">Evidence Board</h1>
            <p className="text-nexus-textMuted text-sm">
              {evidence.length} items collected
            </p>
          </div>
          <button
            onClick={() => fetchInventory()}
            className="p-2 rounded-xl text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
            aria-label="Refresh evidence"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.418 0v-5m-6 5v10a2 2 0 002 2h2a2 2 0 002-2v-3m-6-7H9a2 2 0 00-2 2v3a2 2 0 002 2h6a2 2 0 002-2v-3a2 2 0 00-2-2h-1z" />
            </svg>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="panel space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search evidence by title..."
              className="input pl-10"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-nexus-textSubtle" />
            <span className="text-xs text-nexus-textSubtle">Filter:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {EVIDENCE_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setFilter(type.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-fast flex-shrink-0',
                  filter === type.value
                    ? 'bg-nexus-accentBg text-nexus-accent'
                    : 'text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated',
                )}
              >
                <type.icon className="w-4 h-4" />
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {evidence.length === 0 ? (
          <div className="panel text-center py-12">
            <FileText className="w-12 h-12 text-nexus-textSubtle mx-auto mb-4" />
            <h3 className="heading-4 mb-2">Evidence Board Empty</h3>
            <p className="text-nexus-textMuted max-w-sm mx-auto">
              As you solve puzzles, evidence will appear here. Connect the dots
              between your findings to unlock new investigation paths.
            </p>
          </div>
        ) : filteredEvidence.length === 0 ? (
          <div className="panel text-center py-8">
            <FileText className="w-8 h-8 text-nexus-textSubtle mx-auto mb-3" />
            <p className="text-nexus-textMuted">
              No evidence matches your search or filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredEvidence.map(item => {
              const isString = typeof item === 'string'
              const IconComponent = !isString
                ? (EVIDENCE_ICONS[item.type] || FileText)
                : FileText
              const code = isString ? item : item.code
              const title = isString ? `Evidence ${item}` : item.title
              const description = isString ? 'Recovered investigation evidence' : item.description
              const typeStr = isString ? 'DOCUMENT' : item.type
              const classification = !isString && item.content ? String(item.content.classification) : undefined

              return (
                <div
                  key={code}
                  className="panel flex items-start gap-3 p-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-nexus-bg flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-6 h-6 text-nexus-textSubtle" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-nexus-text truncate">
                      {title}
                    </h4>
                    <p className="text-xs text-nexus-textMuted mt-0.5 line-clamp-2">
                      {description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-bg text-nexus-textSubtle font-mono">
                        {typeStr}
                      </span>
                      {classification && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-warningBg/30 text-nexus-warning font-mono">
                          {String(classification)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
