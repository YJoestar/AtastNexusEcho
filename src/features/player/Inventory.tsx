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
import { cn } from '@/lib/utils'
import { BureauIcons } from '@/components/bureau'
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
  const { inventory, isLoading, fetchInventory, teamProgress } = useGameEngine()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [inspected, setInspected] = useState<InventoryItemWithQty | null>(null)

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
            <h1 className="heading-3">FIELD INVENTORY</h1>
            <p className="text-nexus-textMuted text-sm">
              {filteredItems.length} items · {fragments.length} fragments
            </p>
          </div>
          <button
            onClick={() => fetchInventory()}
            className="p-2 border border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated touch-target-primary"
            aria-label="Refresh inventory"
            title="Refresh"
          >
            <BureauIcons.Refresh className="bureau-icon w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter */}
        <RegisterColumn heading="Filter items">
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

          <div className="flex flex-wrap gap-2 mt-3">
            {['all', 'TOOL', 'KEY', 'CODE', 'DEVICE', 'CONSUMABLE', 'ARTIFACT'].map(typeVal => {
              const labels: Record<string, string> = {
                all: 'All Items',
                TOOL: 'Tools',
                KEY: 'Keys',
                CODE: 'Codes',
                DEVICE: 'Devices',
                CONSUMABLE: 'Consumables',
                ARTIFACT: 'Artifacts',
              }
              const isActive = filter === typeVal
              return (
                <button
                  key={typeVal}
                  type="button"
                  onClick={() => setFilter(typeVal)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border transition-colors duration-fast',
                    isActive
                      ? 'border-nexus-accent text-nexus-accent'
                      : 'border-nexus-borderSubtle text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated',
                  )}
                >
                  <span>{labels[typeVal]}</span>
                </button>
              )
            })}
          </div>
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
                  trailing={frag.type && <Stamp variant="anomalous" impressed>{frag.type}</Stamp>}
                />
              ))}
            </div>
          </RegisterColumn>
        )}

        {/* Inventory Items */}
        <div className="register">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 border border-nexus-borderSubtle">
              <BureauIcons.Package className="bureau-icon w-12 h-12 text-nexus-textSubtle mx-auto mb-4" aria-hidden="true" />
              <h3 className="heading-4 mb-2">Inventory Empty</h3>
              <p className="text-nexus-textMuted max-w-sm mx-auto">
                {search || filter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Items acquired during the investigation will appear here. Use them to unlock new paths.'}
              </p>
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
                        onClick={() =>
                          setInspected({
                            code: item.code,
                            name: item.name,
                            description: item.description,
                            type: item.type,
                            rarity: item.rarity,
                            quantity: item.quantity,
                          })
                        }
                        className="p-1 border border-nexus-borderSubtle text-nexus-textSubtle hover:text-nexus-text touch-target-primary"
                        aria-label={`Inspect ${item.name}`}
                        type="button"
                      >
                        <BureauIcons.Eye className="bureau-icon w-4 h-4" />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inspect dialog — always reachable, never hover-only (phones have no hover) */}
      {inspected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-nexus-bg/90 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={inspected.name}
          onClick={() => setInspected(null)}
        >
          <div
            className="bg-nexus-surfaceElevated border border-nexus-borderSubtle p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="heading-3">{inspected.name}</h3>
                <p className="text-xs uppercase tracking-wider text-nexus-textSubtle mt-1 font-mono">
                  {inspected.type} · {inspected.rarity}
                </p>
              </div>
              <button
                onClick={() => setInspected(null)}
                className="p-1 -m-1 border border-nexus-borderSubtle text-nexus-textSubtle hover:text-nexus-text"
                aria-label="Close"
                type="button"
              >
                <BureauIcons.Close className="bureau-icon w-5 h-5" />
              </button>
            </div>
            <p className="text-nexus-textMuted whitespace-pre-wrap">{inspected.description}</p>
            <p className="text-xs text-nexus-textSubtle mt-4 font-mono">REF {inspected.code}</p>
            <button
              onClick={() => setInspected(null)}
              className="nexus-btn nexus-btn-primary w-full mt-4 touch-target-comfortable"
              type="button"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
