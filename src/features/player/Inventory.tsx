/**
 * NEXUS — Player Inventory
 * Evidence board for physical items and archival fragments.
 * Mobile-first layout using bureau primitives: DocumentShell, EvidenceFrame,
 * Field, FieldGrid, RegisterColumn, RegisterList, RegisterRow, Stamp,
 * StatusMark, StateMarker, and bureau glyphs.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { useInvestigationWorkspace } from '@/hooks/useInvestigationWorkspace'
import { BureauIcons, FileTabs } from '@/components/bureau'
import {
  DocumentShell,
  RegisterColumn,
  RegisterRow,
  StateMarker,
  Stamp,
  type StatusTone,
} from '@/components/bureau'

type InventoryItemWithQty = {
  code: string
  name: string
  description: string
  type: string
  rarity: string
  quantity: number
}

const RARITY_TONE: Record<string, StatusTone> = {
  COMMON: 'inactive',
  UNCOMMON: 'inactive',
  RARE: 'active',
  EPIC: 'warning',
  LEGENDARY: 'active',
}

const INVENTORY_TABS = [
  { id: 'all', label: 'ALL OBJECTS' },
  { id: 'TOOL', label: 'TOOLS' },
  { id: 'KEY', label: 'KEYS' },
  { id: 'CODE', label: 'CODES' },
  { id: 'DEVICE', label: 'DEVICES' },
  { id: 'CONSUMABLE', label: 'CONSUMABLES' },
  { id: 'ARTIFACT', label: 'ARTIFACTS' },
]

function rarityGlyph(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return '·'
    case 'UNCOMMON':
      return '·'
    case 'RARE':
      return '■'
    case 'EPIC':
      return '!'
    case 'LEGENDARY':
      return '★'
    default:
      return '·'
  }
}

export function PlayerInventory() {
  const { inventory, isLoading, fetchInventory, teamProgress, team } = useGameEngine()
  const { workspace, updateWorkspace } = useInvestigationWorkspace(team?.id)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    void fetchInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rawInventory = teamProgress?.inventoryOwned ?? {}
  const items: InventoryItemWithQty[] = inventory?.inventory
    ? inventory.inventory.map(item => ({
        code: item.code,
        name: item.name,
        description: item.description,
        type: item.type,
        rarity: item.rarity,
        quantity: 1,
      }))
    : Object.entries(rawInventory).map(([code, qty]) => ({
        code,
        name: `Item ${code}`,
        description: 'Recovered investigation equipment',
        type: 'TOOL',
        rarity: 'COMMON',
        quantity: qty,
      }))

  const fragments = inventory?.fragments ?? []

  const placeItemOnTable = (code: string, source: 'inventory' | 'fragment' = 'inventory') => {
    const id = `${source}:${code}`
    updateWorkspace(current => {
      if (current.placements[id]) return current
      const count = Object.keys(current.placements).length
      const order = Math.max(0, ...Object.values(current.placements).map(position => position.order)) + 1
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
  }

  const filteredItems = items.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false
    if (search)
      return (
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase())
      )
    return true
  })

  if (isLoading('inventory') && !inventory) {
    return (
      <div className="page">
        <div className="page-content max-w-2xl mx-auto py-12">
          <DocumentShell
            reference="Inventory"
            title="SYNCHRONIZING…"
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
            aria-label="RETURN TO FIELD"
          >
            <BureauIcons.Back className="bureau-icon w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="heading-3">RECOVERED OBJECT REGISTER</h1>
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-nexus-textMuted">
              {filteredItems.length.toString().padStart(2, '0')} OBJECTS / {fragments.length.toString().padStart(2, '0')} FRAGMENTS
            </p>
          </div>
          <Link to={ROUTES.PLAYER_EVIDENCE} className="min-h-10 border border-nexus-accent px-2 py-2 font-mono text-[0.5rem] uppercase text-nexus-accent">
            CASE ARCHIVE
          </Link>
          <button
            onClick={() => fetchInventory()}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated touch-target-primary"
            aria-label="Recalibrate inventory"
            title="RECALIBRATE"
          >
            <BureauIcons.Refresh className="bureau-icon w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter */}
        <RegisterColumn heading="ARCHIVE QUERY / OBJECT CLASS">
          <div className="relative">
            <BureauIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 bureau-icon w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH BY ITEM CODE…"
              className="input pl-10"
              autoComplete="off"
            />
          </div>

          <FileTabs tabs={INVENTORY_TABS} activeId={filter} onSelect={setFilter} className="mt-3 border-t border-nexus-borderSubtle pt-2" />
        </RegisterColumn>

        {/* Archival Fragments */}
        {fragments.length > 0 && (
          <RegisterColumn heading="Archival Fragments">
            <div className="space-y-3">
              {fragments.map(frag => (
                <RegisterRow
                  key={frag.code}
                  id={frag.code}
                  label={frag.label || frag.code}
                  meta={frag.content}
                  trailing={
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {frag.type && <Stamp variant="anomalous" impressed>{frag.type}</Stamp>}
                      <Link to={`${ROUTES.PLAYER_EVIDENCE}?artifact=${encodeURIComponent(`fragment:${frag.code}`)}`} className="min-h-9 border border-nexus-accent px-2 py-2 font-mono text-[0.5rem] uppercase text-nexus-accent">EXAMINE</Link>
                      <button type="button" onClick={() => placeItemOnTable(frag.code, 'fragment')} disabled={!!workspace.placements[`fragment:${frag.code}`]} className="min-h-9 border border-nexus-border px-2 font-mono text-[0.5rem] uppercase text-nexus-textSubtle disabled:opacity-45">
                        {workspace.placements[`fragment:${frag.code}`] ? 'ON TABLE' : 'PLACE'}
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </RegisterColumn>
        )}

        {/* Inventory Items */}
        <div className="register">
          {filteredItems.length === 0 ? (
            <div className="grid min-h-28 grid-cols-[110px_1fr] items-center gap-3 border-y border-nexus-borderSubtle px-4 font-mono text-[0.6rem] uppercase tracking-[0.12em]">
              <span className="border-r border-nexus-borderSubtle py-4 text-nexus-warning">NO RECORD</span>
              <span className="text-nexus-textMuted">{search || filter !== 'all' ? 'OBJECT QUERY RETURNED NO MATCH' : 'NO RECOVERED OBJECTS IN TEAM CUSTODY'}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <RegisterRow
                  key={item.code}
                  id={item.code}
                  label={item.name}
                  meta={
                    <>
                      <span className="text-xs text-nexus-textMuted">{item.description}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StateMarker glyph={rarityGlyph(item.rarity)} tone={RARITY_TONE[item.rarity] ?? 'inactive'} label={item.rarity} />
                        <span className="text-[10px] font-mono text-nexus-textSubtle">{item.type}</span>
                      </div>
                    </>
                  }
                  trailing={
                    <div className="flex items-center gap-2 shrink-0">
                      {item.quantity > 1 && (
                        <span className="font-mono text-xs border border-nexus-borderSubtle px-1.5 py-0.5 text-nexus-textSubtle">
                          {item.quantity}×
                        </span>
                      )}
                      <button
                        className="min-h-9 border border-nexus-borderSubtle px-2 font-mono text-[0.5rem] uppercase text-nexus-textSubtle hover:text-nexus-text"
                        type="button"
                        onClick={() => placeItemOnTable(item.code)}
                        disabled={!!workspace.placements[`inventory:${item.code}`]}
                        aria-label={`Place ${item.name} on the investigation table`}
                      >
                        {workspace.placements[`inventory:${item.code}`] ? 'ON TABLE' : 'PLACE ON TABLE'}
                      </button>
                      <Link
                        to={`${ROUTES.PLAYER_EVIDENCE}?artifact=${encodeURIComponent(`inventory:${item.code}`)}`}
                        className="min-h-9 border border-nexus-accent px-2 py-2 font-mono text-[0.5rem] uppercase text-nexus-accent"
                      >
                        EXAMINE
                      </Link>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
