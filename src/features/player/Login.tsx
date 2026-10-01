/**
 * NEXUS — Player Login
 * Mobile-first access code entry with device binding.
 * Clinical investigation aesthetic — clean, focused, accessible.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/app/providers'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import {
  LOGIN_CODE_LENGTH,
  containsForbiddenLogicChars,
  containsUnknownLogicChars,
  describeInvalidLogicCode,
  formatLogicCodeInput,
  isValidLoginCode,
} from '@/lib/auth'
import { BureauIcons } from '@/components/bureau'

export function PlayerLogin() {
  const navigate = useNavigate()
  const { login } = useApp()
  const [accessCode, setAccessCode] = useState('')
  const [inputWarning, setInputWarning] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    if (containsForbiddenLogicChars(raw)) {
      setInputWarning('That code contains I, O, 0 or 1, which are not part of a logic code. Check your code with the Bureau.')
    } else if (containsUnknownLogicChars(raw)) {
      setInputWarning(describeInvalidLogicCode(LOGIN_CODE_LENGTH))
    } else {
      setInputWarning('')
    }

    setAccessCode(formatLogicCodeInput(raw, LOGIN_CODE_LENGTH))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidLoginCode(accessCode) || isLoading) return

    setIsLoading(true)
    setError('')

    const result = await login(accessCode)

    if (result.success) {
      navigate(ROUTES.PLAYER_WAITING, { replace: true })
    } else {
      setError(result.error ?? 'Login failed. Please try again.')
      setIsLoading(false)
    }
  }

  const isComplete = isValidLoginCode(accessCode)
  const formatError = accessCode && !isComplete ? describeInvalidLogicCode(LOGIN_CODE_LENGTH) : ''

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="nexus-case-shell w-full max-w-xl">
        <div className="nexus-case-header">
          <span className="section-label">NEXUS ARCHIVE</span>
          <span className="case-number-tag">CASE 037</span>
        </div>

        <div className="nexus-case-body">
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-nexus-border pb-4">
            <div className="flex items-center gap-4">
              <div className="nexus-case-mark">N</div>
              <div>
                <p className="section-label mb-1">Investigation Access Terminal</p>
                <h1 className="heading-2 text-nexus-text">NEXUS</h1>
              </div>
            </div>
            <div className="case-identifier-block">
              <span className="case-identifier-label">ACCESS</span>
              <span className="case-identifier-value">037-AR-01</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="accessCode" className="label">Access Code</label>
              <div className="relative">
                <BureauIcons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 bureau-icon w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
                <input
                  id="accessCode"
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  value={accessCode}
                  onChange={handleCodeChange}
                  placeholder="────────"
                  className={cn(
                    'input pl-10 text-center text-2xl tracking-widest uppercase font-mono',
                    accessCode.length > 0 && !isComplete && 'input-error',
                  )}
                  maxLength={LOGIN_CODE_LENGTH}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              {!accessCode && (
                <p className="mt-1.5 text-sm text-nexus-textMuted flex items-start gap-1.5">
                  <BureauIcons.Info className="bureau-icon w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Enter the {LOGIN_CODE_LENGTH}-character Logic Code provided by the Bureau.
                    Format: A-Z and 2-9 (excluding I, O, 0, 1).
                  </span>
                </p>
              )}
              {formatError && (
                <p className="mt-1.5 text-sm text-nexus-danger flex items-start gap-1.5" role="alert">
                  <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{formatError}</span>
                </p>
              )}
              {inputWarning && (
                <p className="mt-1.5 text-sm text-nexus-danger flex items-start gap-1.5" role="alert">
                  <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{inputWarning}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 border border-nexus-danger/30 bg-nexus-dangerBg/20 flex items-start gap-2 animate-slide-down">
                <BureauIcons.Alert className="bureau-icon w-5 h-5 flex-shrink-0 text-nexus-danger mt-0.5" />
                <p className="text-sm text-nexus-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isComplete}
              className="nexus-btn nexus-btn-primary w-full touch-target-comfortable"
            >
              {isLoading ? (
                <>
                  <BureauIcons.Spinner className="bureau-icon w-5 h-5 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <span>Connect to Investigation</span>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-nexus-border pt-4 text-xs uppercase tracking-[0.22em] text-nexus-textSubtle">
            <span>ATAST Event</span>
            <span>ISIMM Monastir</span>
            <span>30/09/2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}
