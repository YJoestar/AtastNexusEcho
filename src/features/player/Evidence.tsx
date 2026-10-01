/**
 * NEXUS — Player Evidence Board
 * Evidence collection displayed as an investigation board.
 * Uses bureau primitives: DocumentShell, EvidenceFrame, EvidenceTag,
 * Field, FieldGrid, RegisterColumn, RegisterList, RegisterRow, Stamp,
 * StatusMark, and bureau glyphs instead of lucide icons.
 */

import { Link } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { BureauIcons } from '@/components/bureau'
import {
  DocumentShell,
  EvidenceFrame,
  EvidenceTag,
  Field,
  FieldGrid,
  RegisterColumn,
  RegisterList,
  RegisterRow,
  Stamp,
  type Classification,
} from '@/components/bureau'
import { useEffect, useState } from 'react'

type EvidenceItem =
  | string
  | {
      code: string
      title: string
      description: string
      type: string
      content?: Record<string, unknown> | null
    }

interface EvidenceTypeOption {
  value: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const EVIDENCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DOCUMENT: BureauIcons.File,
  IMAGE: BureauIcons.Image,
  AUDIO: BureauIcons.Music,
  VIDEO: BureauIcons.Video,
  DATA: BureauIcons.Database,
  PHYSICAL: BureauIcons.Box,
  DIGITAL: BureauIcons.Database,
}

const EVIDENCE_TYPES: EvidenceTypeOption[] = [
  { value: 'all', label: 'All Evidence', Icon: BureauIcons.File },
  { value: 'DOCUMENT', label: 'Documents', Icon: BureauIcons.File },
  { value: 'IMAGE', label: 'Images', Icon: BureauIcons.Image },
  { value: 'AUDIO', label: 'Audio', Icon: BureauIcons.Music },
  { value: 'VIDEO', label: 'Videos', Icon: BureauIcons.Video },
  { value: 'DATA', label: 'Data', Icon: BureauIcons.Database },
  { value: 'PHYSICAL', label: 'Physical', Icon: BureauIcons.Box },
]

type EvidenceFilter = (typeof EVIDENCE_TYPES)[number]['value']

export function PlayerEvidence() {
  const { inventory, isLoading, fetchInventory, teamProgress } = useGameEngine()
  const [filter, setFilter] = useState<EvidenceFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    void fetchInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const evidenceFromApi = (inventory?.evidence ?? []) as EvidenceItem[]
  const evidenceOwnedCodes = teamProgress?.evidenceOwned ?? []

  const evidence: EvidenceItem[] = evidenceFromApi.length > 0 ? evidenceFromApi : evidenceOwnedCodes

  const filteredEvidence = evidence.filter(item => {
    if (typeof item === 'string') {
      if (search) return item.toLowerCase().includes(search.toLowerCase())
      return true
    }
    if (filter !== 'all' && item.type !== filter) return false
    if (search) return item.title.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const classificationFor = (item: EvidenceItem): Classification | undefined => {
    if (typeof item === 'string') return undefined
    if (item.content?.classification) return String(item.content.classification) as Classification
    return undefined
  }

  if (isLoading('inventory') && !inventory) {
    return (
      <div className="page">
        <div className="page-content max-w-2xl mx-auto py-12">
          <DocumentShell
            reference="Evidence Board"
            title="Loading…"
            stock="digital"
            footer={<Stamp variant="incomplete">In progress</Stamp>}
          >
            <div className="space-y-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </DocumentShell>
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
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated touch-target-primary"
            aria-label="Back to game"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="heading-3">Evidence Board</h1>
            <p className="text-nexus-textMuted text-sm">
              {evidence.length} items collected
            </p>
          </div>
          <button
            onClick={() => fetchInventory()}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
            aria-label="Refresh evidence"
            title="Refresh"
          >
            <BureauIcons.Refresh className="bureau-icon w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter */}
        <RegisterColumn heading="Filter evidence">
          <div className="relative">
            <BureauIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 bureau-icon w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search evidence by title…"
              className="input pl-10"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {EVIDENCE_TYPES.map(type => {
              const Icon = type.Icon
              const isActive = filter === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border transition-colors duration-fast',
                    isActive
                      ? 'border-nexus-accent text-nexus-accent'
                      : 'border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated',
                  )}
                  type="button"
                >
                  <Icon className="bureau-icon w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              )
            })}
          </div>
        </RegisterColumn>

        {evidence.length === 0 ? (
          <DocumentShell
            reference="Evidence Board"
            title="Board empty"
            stock="paper"
            footer={<Stamp variant="incomplete">No items</Stamp>}
          >
            <div className="text-center py-8">
              <BureauIcons.Package className="bureau-icon w-12 h-12 text-nexus-textSubtle mx-auto mb-4" aria-hidden="true" />
              <h3 className="heading-4 mb-2">Evidence Board Empty</h3>
              <p className="text-nexus-textMuted max-w-sm mx-auto">
                As you solve puzzles, evidence will appear here. Connect the dots
                between your findings to unlock new investigation paths.
              </p>
            </div>
          </DocumentShell>
        ) : filteredEvidence.length === 0 ? (
          <div className="text-center py-8 border border-nexus-borderSubtle">
            <BureauIcons.File className="bureau-icon w-8 h-8 text-nexus-textSubtle mx-auto mb-3" aria-hidden="true" />
            <p className="text-nexus-textMuted">No evidence matches your search or filter.</p>
          </div>
        ) : (
          <RegisterList>
            {filteredEvidence.map(item => {
              const isString = typeof item === 'string'
              const code = isString ? item : item.code
              const title = isString ? `Evidence ${item}` : item.title
              const description = isString ? 'Recovered investigation evidence' : item.description
              const typeStr = isString ? 'DOCUMENT' : item.type
              const classification = classificationFor(item)
              const IconComponent = isString ? BureauIcons.File : (EVIDENCE_ICONS[code as string] || BureauIcons.File)

              const content = !isString ? item.content : null
              const audioUrl = content?.audio_url ? String(content.audio_url) : null

              return (
                <RegisterRow
                  key={code}
                  id={code}
                  label={
                    <EvidenceFrame seed={`evidence:${code}`} title={title} reference={code}>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 border border-nexus-borderSubtle flex items-center justify-center flex-shrink-0">
                          <IconComponent className="bureau-icon w-6 h-6 text-nexus-textSubtle" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-nexus-text truncate">{title}</h4>
                          <p className="text-xs text-nexus-textMuted mt-0.5 line-clamp-2">
                            {description}
                          </p>
                          <FieldGrid columns={2}>
                            <Field label="Type" value={<span className="font-mono text-xs">{typeStr}</span>} />
                            {classification && (
                              <Field label="Class." value={<span className="font-mono text-xs">{classification}</span>} />
                            )}
                          </FieldGrid>
                          {audioUrl && (
                            <audio
                              key={code}
                              src={audioUrl}
                              controls
                              className="mt-2 w-full"
                            />
                          )}
                        </div>
                      </div>
                    </EvidenceFrame>
                  }
                  trailing={
                    <div className="flex items-center gap-2">
                      <EvidenceTag>{code}</EvidenceTag>
                      {classification && (
                        <Stamp variant={
                          classification === 'RESTRICTED' ? 'restricted'
                            : classification === 'SOURCE' ? 'restricted'
                            : 'verified'
                        } impressed>
                          {classification}
                        </Stamp>
                      )}
                    </div>
                  }
                />
              )
            })}
          </RegisterList>
        )}
      </div>
    </div>
  )
}
