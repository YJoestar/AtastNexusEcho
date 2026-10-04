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
import { BureauIcons, TerminalFrame } from '@/components/bureau'
import { cn } from '@/lib/utils'
import { adminAPI } from '@/lib/admin'
import type { PuzzleQAEntry, QRCodeEntry, LocationEntry } from '@/lib/admin'
import { validateGameIntegrity } from '@/lib/integrity/validate'

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
        <BureauIcons.Error className="bureau-icon w-4 h-4 text-nexus-danger" />
      )}
      {canPlay === true && (
        <BureauIcons.Success className="bureau-icon w-4 h-4 text-nexus-accent" />
      )}
      <span className="text-xs text-nexus-textSubtle truncate max-w-[120px]" title={label}>
        {label}
      </span>
    </div>
  )
}

function AudioStatusIcon({ status }: { status: 'ok' | 'broken' | 'missing' }) {
  if (status === 'ok') return <BureauIcons.Success className="bureau-icon w-4 h-4 text-nexus-accent" />
  if (status === 'broken') return <BureauIcons.Error className="bureau-icon w-4 h-4 text-nexus-danger" />
  return <BureauIcons.Error className="bureau-icon w-4 h-4 text-nexus-textSubtle" />
}

export function AdminQAViewer() {
  const [puzzles, setPuzzles] = useState<PuzzleQAEntry[]>([])
  const [markers, setMarkers] = useState<QRCodeEntry[]>([])
  const [locations, setLocations] = useState<LocationEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  const [expandedPuzzle, setExpandedPuzzle] = useState<string | null>(null)

  const fetchQA = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [data, qr, loc] = await Promise.all([
        adminAPI.listPuzzleQA(),
        adminAPI.listQRCodes(),
        adminAPI.listLocations(),
      ])
      setPuzzles(data)
      setMarkers(qr)
      setLocations(loc)
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

  const integrity = useMemo(
    () =>
      validateGameIntegrity(
        puzzles.map(p => ({
          id: p.id,
          code: p.code,
          title: p.title,
          type: p.type,
          stage: p.stage,
          unlocks: p.branches?.unlocks ?? null,
          isFinale: p.type === 'FINAL_BOSS',
        })),
        markers.map(m => ({
          id: m.id,
          code: m.code,
          markerId: m.markerId ?? null,
          manualCode: m.manualCode ?? null,
          puzzleNodeId: m.puzzleNodeId ?? null,
        })),
        locations.map(l => ({ nodeId: l.nodeId, status: l.status })),
      ),
    [puzzles, markers, locations],
  )

  const blockingIssues = integrity.issues.filter(i => i.severity !== 'INFO')

  if (isLoading) {
    return (
      <TerminalFrame title="FIELD CONTENT AUDIT" reference="ARCHIVE QUERY" variant="system">
        <div className="space-y-3 p-4 font-mono text-xs uppercase tracking-[0.14em] text-nexus-textMuted" role="status" aria-live="polite">
          <p>INDEXING CONTENT RECORDS…</p>
          <div className="h-px w-full bg-nexus-border"><div className="h-px w-1/3 bg-nexus-accent animate-pulse" /></div>
          <p className="text-[0.56rem] text-nexus-textSubtle">VERIFYING MEDIA REFERENCES / NODE METADATA</p>
        </div>
      </TerminalFrame>
    )
  }

  if (error) {
    return (
      <TerminalFrame title="FIELD CONTENT AUDIT" reference="RETRIEVAL FAILED" variant="system">
        <div className="space-y-3 p-5 font-mono">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-nexus-danger">INDEX PRESENT / CONTENT UNAVAILABLE</p>
          <p className="text-xs text-nexus-textMuted">{error}</p>
          <button onClick={() => void fetchQA()} className="nexus-btn-secondary min-h-10">
            [ RE-QUERY CONTENT ARCHIVE ]
          </button>
        </div>
      </TerminalFrame>
    )
  }

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle">NEXUS ECHO / CONTENT INTEGRITY OFFICE</p>
          <h1 className="mt-1 text-xl font-bold text-nexus-text">FIELD CONTENT VERIFICATION</h1>
          <p className="mt-1 text-xs text-nexus-textMuted">
            {totalAudio === 0
              ? 'NO AUDIO RECORDS INDEXED'
              : `${okAudio}/${totalAudio} MEDIA REFERENCES PRESENT / ${brokenAudio} UNAVAILABLE`}
          </p>
        </div>
        <button
          onClick={() => void fetchQA()}
          className="nexus-btn-secondary min-h-10 px-3 text-xs"
          disabled={isLoading}
          aria-label="POLL CHANNEL"
        >
          <BureauIcons.Refresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Progression integrity */}
      <TerminalFrame
        title="DEPLOYMENT INTEGRITY"
        reference={integrity.playable ? 'HANDOFF CLEARED' : `${integrity.blockers} BLOCKING`}
        variant={integrity.playable ? 'system' : 'monitor'}
      >
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[0.625rem] uppercase tracking-[0.14em]">
            <span className={integrity.playable ? 'text-nexus-accent' : 'text-nexus-danger'}>
              {integrity.playable
                ? 'MARKERS RESOLVE / PROGRESSION CLOSES'
                : `NOT SAFE TO DEPLOY / ${integrity.blockers} BLOCKER(S)`}
            </span>
            <span className="text-nexus-textSubtle">
              {integrity.counts.nodesWithMarkers}/{integrity.counts.nodes} PUZZLES SCANNABLE
            </span>
            <span className="text-nexus-textSubtle">
              {integrity.counts.assignedMarkers}/{integrity.counts.markers} MARKERS ASSIGNED
            </span>
            {integrity.warnings > 0 && (
              <span className="text-nexus-warning">{integrity.warnings} WARNING(S)</span>
            )}
          </div>

          {blockingIssues.length === 0 ? (
            <p className="text-xs text-nexus-textMuted">
              Every marker is assigned to a real puzzle, and every non-finale puzzle unlocks a
              puzzle that exists.
            </p>
          ) : (
            <ul className="divide-y divide-nexus-borderSubtle">
              {blockingIssues.map((issue, i) => (
                <li key={`${issue.code}-${issue.ref ?? i}-${i}`} className="flex items-start gap-3 py-2">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 border px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.1em]',
                      issue.severity === 'BLOCKER'
                        ? 'border-nexus-danger text-nexus-danger'
                        : 'border-nexus-warning text-nexus-warning',
                    )}
                  >
                    {issue.severity}
                  </span>
                  <span className="text-xs text-nexus-textMuted">
                    {issue.ref && (
                      <span className="font-bold text-nexus-text">{issue.ref} — </span>
                    )}
                    {issue.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </TerminalFrame>

      {/* Filters */}
      <div className="panel">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <BureauIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="FILTER BY NODE CODE OR NAME…"
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
        <div className="border-l-2 border-nexus-danger bg-nexus-dangerBg/20 px-4 py-3">
          <div className="flex items-start gap-3">
            <BureauIcons.Alert className="bureau-icon w-5 h-5 text-nexus-danger mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-nexus-danger">
                {brokenAudio} MEDIA REFERENCE{brokenAudio !== 1 ? 'S' : ''} UNAVAILABLE
              </p>
              <p className="mt-1 text-xs text-nexus-textMuted">
                Affected field records may be incomplete during player playback.
              </p>
            </div>
          </div>
        </div>
      )}

      <TerminalFrame title="FIELD VERIFICATION SHEETS" reference={`${filteredPuzzles.length} / ${puzzles.length} NODES`} variant="register">
        {filteredPuzzles.length === 0 ? (
          <div className="grid min-h-24 grid-cols-[100px_1fr] items-center gap-3 px-4 font-mono text-[0.625rem] uppercase tracking-[0.12em]">
            <span className="border-r border-nexus-border py-3 text-nexus-warning">NO RECORD</span>
            <span className="text-nexus-textSubtle">QUERY RETURNED NO MATCHING NODE SHEETS</span>
          </div>
        ) : (
          <ol className="divide-y divide-nexus-borderSubtle">
            {filteredPuzzles.map(puzzle => {
              const hasMissingAudio = puzzle.audioEvidence.some(audio => !audio.audioExists)
              const audioStatus: 'ok' | 'broken' | 'missing' = puzzle.audioEvidence.length === 0
                ? 'missing'
                : hasMissingAudio ? 'broken' : 'ok'
              const isExpanded = expandedPuzzle === puzzle.id
              const acceptedAnswer = (puzzle.answerMetadata as Record<string, unknown> | null)?.acceptedAnswer

              return (
                <li key={puzzle.id} className={cn(hasMissingAudio && 'bg-nexus-dangerBg/10')}>
                  <button
                    type="button"
                    onClick={() => setExpandedPuzzle(isExpanded ? null : puzzle.id)}
                    aria-expanded={isExpanded}
                    className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left hover:bg-nexus-surfaceElevated"
                  >
                    <span className="border-r border-nexus-border pr-2 font-mono text-xs font-bold text-nexus-accent">{puzzle.code}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-nexus-text">{puzzle.title}</span>
                      <span className="mt-1 block font-mono text-[0.52rem] uppercase tracking-[0.1em] text-nexus-textSubtle">
                        {puzzle.type} / {puzzle.evidence.length} EVIDENCE OBJECTS
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <AudioStatusIcon status={audioStatus} />
                      <span className="font-mono text-[0.56rem] uppercase text-nexus-textMuted">
                        {puzzle.audioEvidence.length === 0 ? 'NO AUDIO' : `${puzzle.audioEvidence.filter(audio => audio.audioExists).length}/${puzzle.audioEvidence.length} MEDIA`}
                      </span>
                      <span aria-hidden="true" className="font-mono text-xs text-nexus-textSubtle">{isExpanded ? '−' : '+'}</span>
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-nexus-borderSubtle bg-nexus-bg px-3 py-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-2 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">EVIDENCE OBJECTS</p>
                          {puzzle.evidence.length === 0 ? (
                            <p className="font-mono text-xs text-nexus-textMuted">NO EVIDENCE OBJECTS ATTACHED</p>
                          ) : (
                            <ul className="space-y-1">
                              {puzzle.evidence.map(item => (
                                <li key={item.id} className="border-b border-nexus-borderSubtle py-1 font-mono text-xs text-nexus-text">
                                  {item.type} / {item.title}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-3 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">ANSWER METADATA</p>
                          <code className="mt-1 block break-all text-xs text-nexus-accent">
                            {typeof acceptedAnswer === 'string' ? acceptedAnswer : 'NOT INDEXED'}
                          </code>
                        </div>
                        <div>
                          <p className="mb-2 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">AUDIO REFERENCE CHECK</p>
                          {puzzle.audioEvidence.length === 0 ? (
                            <p className="font-mono text-xs text-nexus-textMuted">NO AUDIO MATERIAL ASSOCIATED</p>
                          ) : (
                            <div className="space-y-2">
                              {puzzle.audioEvidence.map(audio => (
                                <AudioPlayer key={audio.id} url={audio.audioUrl ?? ''} label={audio.title} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </TerminalFrame>
    </div>
  )
}



