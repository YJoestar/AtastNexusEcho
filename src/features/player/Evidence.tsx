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
  { value: 'all', label: 'ALL RECORDS' },
  { value: 'DOCUMENT', label: 'DOCUMENT' },
  { value: 'IMAGE', label: 'IMAGE' },
  { value: 'AUDIO', label: 'AUDIO' },
  { value: 'VIDEO', label: 'VIDEO' },
  { value: 'DATA', label: 'DATA' },
  { value: 'PHYSICAL', label: 'PHYSICAL' },
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
            reference="ARCHIVE QUERY / CASE 037"
            title="INDEXING RECOVERED MATERIAL"
            stock="digital"
            footer={<Stamp variant="incomplete">Retrieval pending</Stamp>}
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
            aria-label="RETURN TO FIELD"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="heading-3">RECOVERED MATERIAL</h1>
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textMuted">
              CASE FILE / {evidence.length.toString().padStart(2, '0')} RECORDS FILED
            </p>
          </div>
          <button
            onClick={() => fetchInventory()}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
            aria-label="Re-query evidence archive"
            title="Re-query archive"
          >
            <BureauIcons.Refresh className="bureau-icon w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter */}
        <RegisterColumn heading="ARCHIVE QUERY / FILTER BY RECORD CLASS">
          <div className="relative">
            <BureauIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 bureau-icon w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
               placeholder="QUERY CODE OR RECORD TITLE…"
              className="input pl-10"
              autoComplete="off"
            />
          </div>

          <div className="mt-3 flex overflow-x-auto border border-nexus-borderSubtle" role="group" aria-label="Filter recovered material by class">
            {EVIDENCE_TYPES.map(type => {
              const isActive = filter === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  aria-pressed={isActive}
                  className={cn(
                    'min-h-10 shrink-0 px-3 font-mono text-[0.56rem] uppercase tracking-[0.1em] transition-colors duration-fast',
                    isActive
                      ? 'bg-nexus-accentBg/30 text-nexus-accent'
                      : 'text-nexus-textMuted hover:bg-nexus-surfaceElevated hover:text-nexus-text',
                  )}
                  type="button"
                >
                  {type.label}
                </button>
              )
            })}
          </div>
        </RegisterColumn>

        {evidence.length === 0 ? (
          <DocumentShell
            reference="ARCHIVE QUERY / CASE 037"
            title="NO VERIFIED MATERIAL"
            stock="paper"
            footer={<Stamp variant="incomplete">Index present / content absent</Stamp>}
          >
            <div className="grid grid-cols-[100px_1fr] border-y border-nexus-borderSubtle font-mono text-[0.625rem] uppercase tracking-[0.12em]">
              <span className="border-r border-nexus-borderSubtle px-3 py-3 text-nexus-textSubtle">RESULT</span>
              <span className="px-3 py-3 text-nexus-warning">NO RECORDS ASSOCIATED WITH THIS CASE</span>
              <span className="border-r border-t border-nexus-borderSubtle px-3 py-3 text-nexus-textSubtle">INDEX</span>
              <span className="border-t border-nexus-borderSubtle px-3 py-3 text-nexus-text">ACTIVE / AWAITING RECOVERY</span>
            </div>
          </DocumentShell>
        ) : filteredEvidence.length === 0 ? (
          <div className="text-center py-8 border border-nexus-borderSubtle">
            <BureauIcons.File className="bureau-icon w-8 h-8 text-nexus-textSubtle mx-auto mb-3" aria-hidden="true" />
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-nexus-textMuted">QUERY RETURNED NO MATCHING RECORDS</p>
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
              const IconComponent = isString ? BureauIcons.File : (EVIDENCE_ICONS[typeStr.toUpperCase()] || BureauIcons.File)

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
