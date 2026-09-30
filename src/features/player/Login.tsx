/**
 * NEXUS — Player Login
 * Mobile-first access code entry with device binding.
 * Clinical investigation aesthetic — clean, focused, accessible.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, AlertCircle, Loader2, Info } from 'lucide-react'
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

export function PlayerLogin() {
  const navigate = useNavigate()
  const { login } = useApp()
  const [accessCode, setAccessCode] = useState('')
  const [inputWarning, setInputWarning] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    // Explain the character before dropping it, so a player who was given a
    // code containing I/O/0/1 learns why the field looks shorter.
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-nexus-accentBg flex items-center justify-center mx-auto mb-4">
            <span className="text-nexus-accent font-display font-bold text-4xl">N</span>
          </div>
          <h1 className="heading-2 text-nexus-text">NEXUS</h1>
          <p className="text-nexus-textMuted mt-2">Investigation Access Terminal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="panel space-y-6" noValidate>
          {/* Access Code */}
          <div>
            <label htmlFor="accessCode" className="label">Access Code</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
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
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Enter the {LOGIN_CODE_LENGTH}-character Logic Code provided by the Bureau.
                  Format: A-Z and 2-9 (excluding I, O, 0, 1).
                </span>
              </p>
            )}
            {formatError && (
              <p className="mt-1.5 text-sm text-nexus-danger flex items-start gap-1.5" role="alert">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{formatError}</span>
              </p>
            )}
            {inputWarning && (
              <p className="mt-1.5 text-sm text-nexus-danger flex items-start gap-1.5" role="alert">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{inputWarning}</span>
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 flex items-start gap-2 animate-slide-down">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-nexus-danger mt-0.5" />
              <p className="text-sm text-nexus-danger">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isComplete}
            className="btn-primary w-full touch-target-comfortable"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <span>Connect to Investigation</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-nexus-textSubtle mt-6">
          ATAST Event — ISIMM Monastir — 30/09/2026
        </p>
      </div>
    </div>
  )
}
