/**
 * NEXUS — Player Inventory
 * Evidence board for physical items and archival fragments.
 * Mobile-first card layout with search and category filters.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Package, Key, Hash, Cpu, Pill, Gem, Search, Eye, Info, X } from 'lucide-react'
import { useGameEngine } from '@/hooks/useGameEngine'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'

const ITEM_TYPES = [
  { value: 'all', label: 'All Items', icon: Package },
  { value: 'TOOL', label: 'Tools', icon: Package },
  { value: 'KEY', label: 'Keys', icon: Key },
  { value: 'CODE', label: 'Codes', icon: Hash },
  { value: 'DEVICE', label: 'Devices', icon: Cpu },
  { value: 'CONSUMABLE', label: 'Consumables', icon: Pill },
  { value: 'ARTIFACT', label: 'Artifacts', icon: Gem },
] as const

type ItemType = (typeof ITEM_TYPES)[number]['value']

export function PlayerInventory() {
  const { inventory, isLoading, fetchInventory, teamProgress } = useGameEngine()
  const [filter, setFilter] = useState<ItemType>('all')
  const [search, setSearch] = useState('')
  const [inspected, setInspected] = useState<{ name: string; description: string; type: string; rarity: string; code: string } | null>(null)

  // Inventory is server-authoritative; load it when the screen is opened rather
  // than relying on the player pressing refresh.
  useEffect(() => {
    void fetchInventory()
    // fetchInventory is stable enough for a mount-and-on-unmount fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rawInventory = teamProgress?.inventoryOwned ?? {}
  type InventoryItemWithQty = {
    code: string
    name: string
    description: string
    type: string
    rarity: string
    quantity: number
  }
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
    if (search) return item.name.toLowerCase().includes(search.toLowerCase()) || item.code.toLowerCase().includes(search.toLowerCase())
    return true
  })

  if (isLoading('inventory') && !inventory) {
    return (
      <div className="page">
        <div className="page-content max-w-2xl mx-auto py-12">
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
            <h1 className="heading-3">Inventory</h1>
            <p className="text-nexus-textMuted text-sm">
              {filteredItems.length} items · {fragments.length} fragments
            </p>
          </div>
          <button
            onClick={() => fetchInventory()}
            className="p-2 rounded-xl text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
            aria-label="Refresh inventory"
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
              placeholder="Search items..."
              className="input pl-10"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {ITEM_TYPES.map(type => (
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

        {/* Archival Fragments */}
        {fragments.length > 0 && (
          <div className="panel space-y-3">
            <h3 className="heading-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-nexus-warning" />
              <span>Archival Fragments ({fragments.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fragments.map(frag => (
                <div
                  key={frag.code}
                  className="p-3 bg-nexus-bg rounded-xl border border-nexus-borderSubtle"
                >
                  <div className="flex items-start gap-2">
                    <Key className="w-5 h-5 text-nexus-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-nexus-text text-sm">
                        {frag.label || frag.code}
                      </p>
                      <p className="text-xs text-nexus-textSubtle mt-1">
                        {frag.content}
                      </p>
                      {frag.type && (
                        <span className="text-[10px] px-1.5 py-0.5 mt-1 inline-block rounded bg-nexus-warningBg/30 text-nexus-warning font-mono">
                          {frag.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Items */}
        <div className="panel">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="w-12 h-12 text-nexus-textSubtle mx-auto mb-4" />
              <h3 className="heading-4 mb-2">Inventory Empty</h3>
              <p className="text-nexus-textMuted max-w-sm mx-auto">
                {search || filter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Items acquired during the investigation will appear here. Use them to unlock new paths.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => {
                const IconComponent = Package
                const rarityColor: Record<string, string> = {
                  COMMON: 'text-neutral-400',
                  UNCOMMON: 'text-green-400',
                  RARE: 'text-cyan-400',
                  EPIC: 'text-purple-400',
                  LEGENDARY: 'text-nexus-warning',
                }
                return (
                  <div
                    key={item.code}
                    className="flex items-center gap-3 p-3 bg-nexus-bg rounded-xl border border-nexus-borderSubtle group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-nexus-surfaceElevated flex items-center justify-center flex-shrink-0">
                      <IconComponent className={cn(
                        'w-6 h-6',
                        rarityColor[item.rarity ?? 'COMMON'] ?? 'text-nexus-textSubtle',
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-nexus-text">
                          {item.name}
                        </p>
                        {item.quantity > 1 && (
                          <span className="badge-neutral text-xs">{item.quantity}x</span>
                        )}
                      </div>
                      <p className="text-xs text-nexus-textMuted mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-mono',
                          rarityColor[item.rarity ?? 'COMMON'] ?? 'text-nexus-textSubtle',
                          'bg-nexus-borderSubtle/30',
                        )}>
                          {item.rarity}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-bg text-nexus-textSubtle font-mono">
                          {item.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setInspected({
                        name: item.name,
                        description: item.description,
                        type: item.type,
                        rarity: item.rarity,
                        code: item.code,
                      })}
                      className="p-2 rounded-lg text-nexus-textMuted hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors touch-target-primary"
                      aria-label={`Inspect ${item.name}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Empty State with Guidance */}
        {filteredItems.length === 0 && fragments.length === 0 && search === '' && filter === 'all' && (
          <div className="panel text-center py-8">
            <div className="flex items-start justify-center gap-2">
              <Info className="w-5 h-5 text-nexus-textSubtle flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-nexus-text mb-1">Investigation Tools & Evidence</h4>
                <p className="text-sm text-nexus-textMuted">
                  Items and fragments collected during the investigation will appear here.
                  Use them to solve puzzles and progress the investigation.
                </p>
              </div>
            </div>
          </div>
        )}
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
            className="panel w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="heading-3">{inspected.name}</h3>
                <p className="text-xs uppercase tracking-wider text-nexus-textSubtle mt-1 font-mono">
                  {inspected.type} · {inspected.rarity}
                </p>
              </div>
              <button
                onClick={() => setInspected(null)}
                className="p-2 -m-1 rounded-lg text-nexus-textSubtle hover:text-nexus-text"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-nexus-textMuted whitespace-pre-wrap">{inspected.description}</p>
            <p className="text-xs text-nexus-textSubtle mt-4 font-mono">REF {inspected.code}</p>
            <button onClick={() => setInspected(null)} className="btn-primary w-full mt-4">
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
