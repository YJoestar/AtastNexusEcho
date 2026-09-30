/**
 * NEXUS — SHOW TEAM CODES
 *
 * The admin PC is the reference screen. Players stand next to it, read their own
 * Logic Code off it, and type that code into their phone. So this screen exists
 * to be shown to a room, not read quietly by the Bureau:
 *
 *   * one click from the team list, and it opens immediately
 *   * codes large enough to read from the far side of a table
 *   * a grid that adapts to the roster instead of a scrolling list
 *   * each code sits under the player's number and name, so nobody has to ask
 *     "which one is mine?"
 *   * no horizontal scrolling on a phone-sized screen
 *   * Escape, the × and CLOSE all leave the codes in the players' hands
 *
 * What it will never do: change anything. Looking at a code must not rotate it,
 * because the player standing there is holding the old one. A code that is gone
 * is reported as gone, with the reason, rather than quietly replaced.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy, Download, Loader2, Maximize2, Minimize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminAPI } from '@/lib/admin'
import type { RevealedPlayerCode, RevealedTeamCodes } from '@/lib/admin'

interface TeamCodesModalProps {
  isOpen: boolean
  teamId: string | null
  /** Shown in the heading while loading, before the server confirms the name. */
  teamNameHint?: string | null
  onClose: () => void
  /** The one action that may rotate a code — never triggered from here. */
  onReissue?: (teamId: string) => void
}

const ROLE_ORDER: Record<string, number> = { OBSERVER: 0, ANALYST: 1, OPERATOR: 2 }

/**
 * Column count follows the roster, capped at the largest sensible grid. A
 * one-player team does not get a lonely 4-wide grid, and a four-player team is
 * not squeezed into a column.
 */
function gridColumns(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
}

function sortByRole(a: RevealedPlayerCode, b: RevealedPlayerCode): number {
  return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
}

export function TeamCodesModal({
  isOpen,
  teamId,
  teamNameHint,
  onClose,
  onReissue,
}: TeamCodesModalProps) {
  const [codes, setCodes] = useState<RevealedTeamCodes | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markCopied = useCallback((key: string) => {
    setCopiedKey(key)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopiedKey(null), 2500)
  }, [])

  const load = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      setCodes(await adminAPI.revealTeamCodes(id))
    } catch (loadError: unknown) {
      setCodes(null)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not read this team\'s codes.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Reads the codes once per open. Never re-reads on a timer, and never asks
  // the server to change anything.
  useEffect(() => {
    if (!isOpen || !teamId) return
    void load(teamId)
  }, [isOpen, teamId, load])

  useEffect(() => {
    if (!isOpen) {
      setCodes(null)
      setError(null)
      setIsFullscreen(false)
    }
  }, [isOpen])

  // Escape leaves the codes, from anywhere on the screen, without a mouse.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const players = useMemo(
    () => [...(codes?.players ?? [])].sort(sortByRole),
    [codes],
  )
  const readable = useMemo(() => players.filter(p => p.loginCode !== null), [players])
  const missing = useMemo(() => players.filter(p => p.loginCode === null), [players])

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      markCopied(key)
    } catch {
      // Clipboard can be denied; the code is on screen to be read aloud.
    }
  }, [markCopied])

  const copyAll = useCallback(() => {
    const lines = [
      codes?.teamCode ? `Team: ${codes.teamCode}` : null,
      ...readable.map((p, i) => `Player ${i + 1} — ${p.loginCode}`),
    ].filter((line): line is string => line !== null).join('\n')
    if (lines) void copy('all', lines)
  }, [codes?.teamCode, copy, readable])

  const download = useCallback(() => {
    const lines = [
      'NEXUS — Team Logic Codes',
      `Team: ${codes?.teamName ?? ''} (${codes?.teamCode ?? '—'})`,
      `Read: ${new Date().toISOString()}`,
      '',
      ...players.map((p, i) =>
        p.loginCode
          ? `Player ${i + 1} — ${p.loginCode}  (${p.displayName}, ${p.role})`
          : `Player ${i + 1} — no code (${p.used ? 'already logged in' : 'needs a re-issue'})`,
      ),
    ].join('\n')

    if (typeof URL.createObjectURL !== 'function') return
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nexus-team-${codes?.teamCode ?? 'codes'}-codes.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    markCopied('download')
  }, [codes, markCopied, players])

  if (!isOpen) return null

  const heading = codes?.teamName ?? teamNameHint ?? 'this team'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-nexus-bg/90 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Login codes for ${heading}`}
    >
      <div
        className={cn(
          'bg-nexus-surface border border-nexus-border shadow-panel w-full flex flex-col my-0 sm:my-8',
          isFullscreen
            ? 'min-h-screen sm:min-h-0 sm:rounded-none border-0'
            : 'rounded-t-2xl sm:rounded-2xl max-h-none sm:max-h-[92vh] sm:max-w-5xl',
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-nexus-borderSubtle">
          <div className="min-w-0">
            <h2 className="heading-3 text-nexus-text break-words">{heading}</h2>
            <p className="text-sm text-nexus-textSubtle mt-1">
              {codes?.teamCode ? (
                <>
                  Team code{' '}
                  <span className="font-mono font-bold text-nexus-danger tracking-widest">
                    {codes.teamCode}
                  </span>
                </>
              ) : (
                'Read each player their own code.'
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="px-5 sm:px-8 py-5 sm:py-6 flex-1 min-h-0 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-16 text-nexus-textSubtle">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              <span className="text-lg">Reading codes…</span>
            </div>
          )}

          {!isLoading && error && (
            <div
              className="flex items-start gap-3 p-4 bg-nexus-dangerBg border border-nexus-danger/30 rounded-xl text-nexus-danger"
              role="alert"
            >
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!isLoading && !error && players.length === 0 && (
            <p className="py-16 text-center text-nexus-textSubtle text-lg">
              This team has no players yet.
            </p>
          )}

          {!isLoading && !error && players.length > 0 && (
            <div className={cn('grid gap-4 sm:gap-5', gridColumns(players.length))}>
              {players.map((player, index) => (
                <CodeTile
                  key={player.playerId}
                  player={player}
                  index={index}
                  copied={copiedKey === player.playerId}
                  onCopy={() => {
                    if (player.loginCode) void copy(player.playerId, player.loginCode)
                  }}
                />
              ))}
            </div>
          )}

          {!isLoading && !error && missing.length > 0 && (
            <div className="mt-6 p-4 bg-nexus-warningBg border border-nexus-warning/30 rounded-xl">
              <p className="text-sm text-nexus-warning">
                {missing.every(p => p.used) ? (
                  <>
                    {missing.length === 1 ? 'One player has' : `${missing.length} players have`} already
                    logged in, so {missing.length === 1 ? 'their' : 'their'} code was used and is gone
                    for good. That is expected — a code is single-use.
                  </>
                ) : (
                  <>
                    {missing.length} player{missing.length === 1 ? '' : 's'} cannot show a code.
                    {onReissue && ' Re-issue to give them a fresh one — their old code stops working.'}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-3 px-5 sm:px-8 py-4 border-t border-nexus-borderSubtle bg-nexus-bg/30">
          <button onClick={onClose} className="btn-primary px-6 py-3 text-base">
            CLOSE
          </button>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <SecondaryButton
              onClick={() => setIsFullscreen(value => !value)}
              label={isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
              icon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            />
            <SecondaryButton
              onClick={copyAll}
              disabled={readable.length === 0}
              label={copiedKey === 'all' ? 'Copied' : 'Copy all'}
              icon={<Copy className="w-4 h-4" />}
            />
            <SecondaryButton
              onClick={download}
              disabled={players.length === 0}
              label={copiedKey === 'download' ? 'Saved' : 'Export'}
              icon={<Download className="w-4 h-4" />}
            />
          </div>
        </footer>
      </div>
    </div>
  )
}

function CodeTile({
  player,
  index,
  copied,
  onCopy,
}: {
  player: RevealedPlayerCode
  index: number
  copied: boolean
  onCopy: () => void
}) {
  const hasCode = player.loginCode !== null

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5 text-center flex flex-col items-center justify-center',
        hasCode
          ? 'bg-nexus-bg border-nexus-border'
          : 'bg-nexus-bg/40 border-dashed border-nexus-borderSubtle',
      )}
    >
      <span className="text-xs uppercase tracking-widest text-nexus-textSubtle">
        Player {index + 1}
      </span>
      <span className="text-base sm:text-lg font-medium text-nexus-text mt-1 break-words">
        {player.displayName || '—'}
      </span>
      <span className="text-xs uppercase tracking-widest text-nexus-textSubtle mt-0.5">
        {player.role}
      </span>

      {hasCode ? (
        <>
          {/* The code itself is the loudest thing on the screen: it is meant to
              be read aloud across a table, not squinted at. */}
          <code
            className="font-mono font-bold text-nexus-text tracking-[0.2em] mt-4 mb-3 break-all"
            style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)', lineHeight: 1.1 }}
          >
            {player.loginCode}
          </code>
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-2 text-sm text-nexus-textSubtle hover:text-nexus-text transition-colors"
            aria-label={`Copy ${player.displayName}'s code`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-nexus-success" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                Copy
              </>
            )}
          </button>
        </>
      ) : (
        <div className="mt-4 mb-3 py-6 w-full">
          <span className="block text-lg text-nexus-textSubtle">
            {player.used ? 'Already logged in' : 'Re-issue needed'}
          </span>
          <span className="block text-xs text-nexus-textSubtle mt-1 px-2">
            {player.used
              ? 'This code was used and no longer exists.'
              : 'This code cannot be displayed and has to be re-issued.'}
          </span>
        </div>
      )}
    </div>
  )
}

function SecondaryButton({
  onClick,
  label,
  icon,
  disabled,
}: {
  onClick: () => void
  label: string
  icon: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-secondary inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  )
}
