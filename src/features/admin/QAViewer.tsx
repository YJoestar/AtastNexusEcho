/**
 * NEXUS — Admin QA Viewer
 *
 * Audits all puzzle nodes for content completeness:
 * - Missing or broken audio evidence references
 * - Missing answer metadata
 * - Missing role blocks
 *
 * Provides inline audio playback for audio evidence so QA can verify
 * files exist and play correctly without leaving the page.
 */

import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, AlertCircle, CheckCircle, XCircle, Music, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminAPI } from '@/lib/admin'
import type { PuzzleQAEntry } from '@/lib/admin'

interface AudioPlayerProps {
  url: string
  label: string
}

function AudioPlayer({ url, label }: AudioPlayerProps) {
  const [canPlay, setCanPlay] = useState<boolean | null>(null)

  return (
    <div className="flex items-center gap-2">
      <audio
        src={url}
        controls
        onCanPlayThrough={() => setCanPlay(true)}
        onError={() => setCanPlay(false)}
        className="text-xs"
      >
        Your browser does not support audio playback.
      </audio>
        {canPlay === false && (
        <XCircle className="w-4 h-4 text-nexus-danger" />
      )}
      {canPlay === true && (
        <CheckCircle className="w-4 h-4 text-nexus-accent" />
      )}
      <span className="text-xs text-nexus-textSubtle truncate max-w-[120px]" title={label}>
        {label}
      </span>
    </div>
  )
}

function AudioStatusIcon({ status }: { status: 'ok' | 'broken' | 'missing' }) {
  if (status === 'ok') return <CheckCircle className="w-4 h-4 text-nexus-accent" />
  if (status === 'broken') return <XCircle className="w-4 h-4 text-nexus-danger" />
  return <XCircle className="w-4 h-4 text-nexus-textSubtle" />
}

export function AdminQAViewer() {
  const [puzzles, setPuzzles] = useState<PuzzleQAEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  const [expandedPuzzle, setExpandedPuzzle] = useState<string | null>(null)

  const fetchQA = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await adminAPI.listPuzzleQA()
      setPuzzles(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch puzzle QA data'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchQA()
  }, [])

  const filteredPuzzles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return puzzles.filter(p => {
      if (showOnlyMissing && !p.audioEvidence.some(a => !a.audioExists)) return false
      if (!term) return true
      return (
        p.code.toLowerCase().includes(term) ||
        p.title.toLowerCase().includes(term)
      )
    })
  }, [puzzles, searchTerm, showOnlyMissing])

  const totalAudio = puzzles.reduce((sum, p) => sum + p.audioEvidence.length, 0)
  const brokenAudio = puzzles.reduce(
    (sum, p) => sum + p.audioEvidence.filter(a => !a.audioExists).length,
    0
  )
  const okAudio = totalAudio - brokenAudio

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 w-full rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel p-6 text-center">
        <AlertCircle className="w-12 h-12 text-nexus-danger mx-auto mb-4" />
        <h3 className="heading-4 mb-2">Error Loading QA Data</h3>
        <p className="text-nexus-textMuted">{error}</p>
        <button onClick={() => void fetchQA()} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Puzzle QA Viewer</h1>
          <p className="text-nexus-textMuted mt-1">
            {totalAudio === 0
              ? 'No audio evidence found'
              : `${okAudio}/${totalAudio} audio files OK · ${brokenAudio} ${brokenAudio === 1 ? 'missing' : 'missing'}`}
          </p>
        </div>
        <button
          onClick={() => void fetchQA()}
          className="btn-secondary"
          disabled={isLoading}
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="panel">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search puzzles by code or name..."
              className="input pl-10"
              autoComplete="off"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyMissing}
              onChange={e => setShowOnlyMissing(e.target.checked)}
            />
            Show only missing/broken audio
          </label>
        </div>
      </div>

      {/* Summary */}
      {brokenAudio > 0 && (
        <div className="panel border-l-4 border-nexus-danger">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-nexus-danger mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-nexus-danger">
                {brokenAudio} audio file{brokenAudio !== 1 ? 's' : ''} missing or broken
              </p>
              <p className="text-sm text-nexus-textMuted mt-1">
                Puzzles with missing audio evidence will not play correctly for players.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Puzzle table */}
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nexus-borderSubtle">
              <th className="text-left py-3 px-4 font-medium text-nexus-textMuted">Code</th>
              <th className="text-left py-3 px-4 font-medium text-nexus-textMuted">Title</th>
              <th className="text-left py-3 px-4 font-medium text-nexus-textMuted">Type</th>
              <th className="text-center py-3 px-4 font-medium text-nexus-textMuted">Audio Evidence</th>
              <th className="text-center py-3 px-4 font-medium text-nexus-textMuted">Evidence Items</th>
              <th className="text-center py-3 px-4 font-medium text-nexus-textMuted">Answer</th>
              <th className="w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {filteredPuzzles.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-nexus-textMuted">
                  No puzzles found matching your search.
                </td>
              </tr>
            ) : (
              filteredPuzzles.map(puzzle => {
                const hasMissingAudio = puzzle.audioEvidence.some(a => !a.audioExists)
                const audioStatus: 'ok' | 'broken' | 'missing' = puzzle.audioEvidence.length === 0
                  ? 'missing'
                  : hasMissingAudio
                    ? 'broken'
                    : 'ok'

                return (
                  <tr
                    key={puzzle.id}
                    className={cn(
                      'border-b border-nexus-borderSubtle/50 hover:bg-nexus-surfaceElevated/50',
                      hasMissingAudio && 'bg-nexus-dangerBg/20'
                    )}
                  >
                    <td className="py-3 px-4">
                      <code className="font-mono text-sm font-medium text-nexus-text">
                        {puzzle.code}
                      </code>
                    </td>
                    <td className="py-3 px-4">{puzzle.title}</td>
                    <td className="py-3 px-4 text-nexus-textMuted">{puzzle.type}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <AudioStatusIcon status={audioStatus} />
                        <span className="text-xs text-nexus-textMuted">
                          {puzzle.audioEvidence.length === 0
                            ? 'No audio evidence'
                            : `${puzzle.audioEvidence.filter(a => a.audioExists).length}/${puzzle.audioEvidence.length} OK`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {puzzle.evidence.length === 0 ? (
                          <span className="text-xs text-nexus-textSubtle">None</span>
                        ) : (
                          puzzle.evidence.map(ev => {
                            const Icon = ev.type === 'AUDIO' ? Music : FileText
                            return (
                              <div
                                key={ev.id}
                                className="flex items-center justify-center w-7 h-7 rounded bg-nexus-bg"
                                title={`${ev.type}: ${ev.title}`}
                              >
                                <Icon className="w-3.5 h-3.5 text-nexus-textSubtle" />
                              </div>
                            )
                          })
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {puzzle.answerMetadata ? (
                        <code className="text-xs font-mono text-nexus-accent">
                          {(puzzle.answerMetadata as Record<string, unknown>)?.acceptedAnswer as string}
                        </code>
                      ) : (
                        <span className="text-xs text-nexus-textSubtle">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setExpandedPuzzle(expandedPuzzle === puzzle.id ? null : puzzle.id)}
                        className="text-nexus-textMuted hover:text-nexus-text"
                      >
                        {expandedPuzzle === puzzle.id ? '▼' : '▶'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded audio playback */}
      {expandedPuzzle && (
        <div className="panel">
          {(() => {
            const puzzle = puzzles.find(p => p.id === expandedPuzzle)
            if (!puzzle) return null
            return (
              <div className="space-y-3">
                <h3 className="font-medium text-nexus-text">
                  {puzzle.code} — {puzzle.title} — Audio Playback
                </h3>
                {puzzle.audioEvidence.length === 0 ? (
                  <p className="text-sm text-nexus-textMuted">No audio evidence for this puzzle.</p>
                ) : (
                  <div className="space-y-2">
                    {puzzle.audioEvidence.map(ev => (
                      <AudioPlayer
                        key={ev.id}
                        url={ev.audioUrl ?? ''}
                        label={ev.title}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
