/**
 * NEXUS — Player Access Credentials
 *
 * Single place where generated player access codes are shown. The codes only
 * exist here in plaintext: the server keeps a salted hash and hands the
 * plaintext back exactly once, so the Bureau has to be able to read, copy and
 * hand them out without leaving this panel — and be told exactly how to get
 * new ones if they are lost.
 */

import { useCallback, useRef, useState } from 'react'
import { Check, Copy, Download, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerCredential } from '@/lib/admin'

interface PlayerCredentialsPanelProps {
  teamCode: string | null
  teamName?: string
  credentials: PlayerCredential[]
  /** Explains where these codes came from (created now / re-issued). */
  notice?: string
  className?: string
}

const ROLE_ORDER: Record<string, number> = { OBSERVER: 0, ANALYST: 1, OPERATOR: 2 }

export function PlayerCredentialsPanel({
  teamCode,
  teamName,
  credentials,
  notice,
  className,
}: PlayerCredentialsPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markCopied = useCallback((key: string) => {
    setCopiedKey(key)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      markCopied(key)
    } catch {
      // Clipboard access can be denied; the code is still on screen to read.
    }
  }, [markCopied])

  const copyAll = useCallback(() => {
    const all = [
      teamCode ? `Team code: ${teamCode}` : null,
      ...credentials.map(c => `${c.displayName} (${c.role}): ${c.loginCode}`),
    ].filter((line): line is string => line !== null).join('\n')
    void copy('all', all)
  }, [copy, credentials, teamCode])

  const download = useCallback(() => {
    const lines = [
      'NEXUS — Player access codes',
      teamName ? `Team: ${teamName} (${teamCode ?? '—'})` : `Team code: ${teamCode ?? '—'}`,
      `Issued: ${new Date().toISOString()}`,
      '',
      ...[...credentials]
        .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
        .map(c => `${c.displayName}\t${c.role}\t${c.loginCode}`),
      '',
      'Each code is single-use and is consumed the first time that player logs in.',
      'Lost a code? Re-issue it from Teams → this team → Player Access Codes.',
    ].join('\n')

    if (typeof URL.createObjectURL !== 'function') return
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nexus-team-${teamCode ?? 'codes'}-codes.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    markCopied('download')
  }, [credentials, markCopied, teamCode, teamName])

  return (
    <div className={cn('space-y-4 text-left', className)}>
      {notice && (
        <p className="text-xs text-nexus-textSubtle bg-nexus-bg border border-nexus-border rounded-xl px-3 py-2">
          {notice}
        </p>
      )}

      {teamCode && (
        <div className="p-4 bg-nexus-bg rounded-xl border border-nexus-border">
          <div className="flex items-center justify-between">
            <span className="font-medium text-nexus-text">Team Code</span>
            <CopyButton
              label="Copy team code"
              copied={copiedKey === 'team'}
              onCopy={() => void copy('team', teamCode)}
            />
          </div>
          <code className="text-2xl font-mono font-bold text-nexus-danger mt-1 block tracking-widest">
            {teamCode}
          </code>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-sm font-medium text-nexus-text">
            Player Codes ({credentials.length})
          </span>
          <div className="flex gap-2">
            <button
              onClick={copyAll}
              disabled={credentials.length === 0}
              className="btn-secondary text-xs py-1.5"
            >
              {copiedKey === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedKey === 'all' ? 'COPIED' : 'COPY ALL'}
            </button>
            <button
              onClick={download}
              disabled={credentials.length === 0}
              className="btn-secondary text-xs py-1.5"
            >
              {copiedKey === 'download' ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {copiedKey === 'download' ? 'SAVED' : 'DOWNLOAD'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {credentials.map(c => (
            <div
              key={c.playerId || c.loginCode}
              className="flex items-center justify-between gap-3 p-3 bg-nexus-bg rounded-xl border border-nexus-border"
            >
              <div className="min-w-0">
                <span className="font-medium text-nexus-text block truncate">{c.displayName}</span>
                <span className="text-[10px] uppercase tracking-wider text-nexus-textSubtle">
                  {c.role}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <code className="text-nexus-accent font-mono tracking-wider">{c.loginCode}</code>
                <CopyButton
                  label={`Copy ${c.displayName}'s code`}
                  copied={copiedKey === c.playerId || copiedKey === c.loginCode}
                  onCopy={() => void copy(c.playerId || c.loginCode, c.loginCode)}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-nexus-textSubtle mt-3 flex items-start gap-1.5">
          <Key className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Each code is single-use and is consumed the first time that player logs in. They are
            never shown again — copy or download them now, and re-issue from this team&apos;s page
            if one is lost.
          </span>
        </p>
      </div>
    </div>
  )
}

function CopyButton({
  label,
  copied,
  onCopy,
}: {
  label: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <button
      onClick={onCopy}
      className="p-1 rounded text-nexus-textSubtle hover:text-nexus-text hover:bg-nexus-surfaceElevated transition-colors"
      aria-label={copied ? `${label} — copied` : label}
      title={copied ? `${label} — copied` : label}
    >
      {copied ? <Check className="w-4 h-4 text-nexus-accent" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}
