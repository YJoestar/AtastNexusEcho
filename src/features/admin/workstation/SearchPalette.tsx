/**
 * NEXUS ECHO — QUERY ARCHIVE palette (Ctrl/Cmd + K)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { QUERY_FILTERS, queryArchive, type QueryData, type QueryFilter, type QueryResult } from './query'

interface SearchPaletteProps {
  data: QueryData
  /** True while locations / evidence are still being read. */
  loading: boolean
  onClose: () => void
  onOpen: (result: QueryResult) => void
}

export function SearchPalette({ data, loading, onClose, onOpen }: SearchPaletteProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<QueryFilter>('ALL')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => queryArchive(query, filter, data), [query, filter, data])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setCursor(0) }, [query, filter])

  const choose = (result: QueryResult | undefined) => { if (result) onOpen(result) }

  return (
    <div className="fixed inset-0 z-[9400] flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label="Query archive" className="w-full max-w-2xl border border-nexus-accent/50 bg-nexus-surface shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-3 border-b border-nexus-border px-4 py-3">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-nexus-accent">QUERY ARCHIVE</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); event.nativeEvent.stopImmediatePropagation(); onClose() }
              else if (event.key === 'ArrowDown') { event.preventDefault(); setCursor(index => Math.min(results.length - 1, index + 1)) }
              else if (event.key === 'ArrowUp') { event.preventDefault(); setCursor(index => Math.max(0, index - 1)) }
              else if (event.key === 'Enter') { event.preventDefault(); choose(results[cursor]) }
            }}
            placeholder="MODULE, FIELD UNIT, LOCATION, EVIDENCE ID…"
            aria-label="Query"
            role="combobox"
            aria-expanded="true"
            aria-controls="query-results"
            className="min-w-0 flex-1 !border-0 !bg-transparent !p-0 !shadow-none !ring-0 font-mono text-sm text-nexus-text placeholder:text-nexus-textSubtle focus:outline-none"
          />
          <kbd className="border border-nexus-border px-1.5 font-mono text-[0.55rem] text-nexus-textSubtle">ESC</kbd>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-nexus-borderSubtle px-4 py-2" role="group" aria-label="Filter results">
          {QUERY_FILTERS.map(entry => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={filter === entry.id}
              onClick={() => { setFilter(entry.id); inputRef.current?.focus() }}
              className={cn('min-h-8 border px-2 font-mono text-[0.55rem] uppercase tracking-[0.12em]', filter === entry.id ? 'border-nexus-accent text-nexus-accent' : 'border-nexus-border text-nexus-textSubtle hover:text-nexus-text')}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <ul id="query-results" role="listbox" className="max-h-[48vh] overflow-auto">
          {results.map((result, index) => (
            <li key={result.id} role="option" aria-selected={index === cursor}>
              <button
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => choose(result)}
                className={cn('grid w-full grid-cols-[5.5rem_1fr_auto] items-baseline gap-3 px-4 py-2 text-left font-mono', index === cursor ? 'bg-nexus-surfaceElevated' : '')}
              >
                <span className="text-[0.6rem] tracking-[0.1em] text-nexus-accent">{result.code}</span>
                <span className="min-w-0 truncate text-[0.72rem] text-nexus-text">{result.title}</span>
                <span className="text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">{result.kind}</span>
                <span className="col-start-2 col-end-4 truncate text-[0.58rem] text-nexus-textMuted">{result.detail}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-nexus-borderSubtle px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
          {loading ? 'READING ARCHIVE…' : query.trim() && results.length === 0 ? `NOTHING IN THE ARCHIVE MATCHES "${query.trim()}".` : `${results.length} RECORD${results.length === 1 ? '' : 'S'} · ↑↓ SELECT · ENTER OPEN`}
        </div>
      </div>
    </div>
  )
}
