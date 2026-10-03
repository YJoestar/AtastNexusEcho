/**
 * NEXUS — Player Login
 *
 * Field device initialization. The player's handset boots up and requests
 * a Logic Code — the encrypted access credential distributed by the Bureau.
 *
 * Security: the code is never stored. If the device's cipher cannot
 * decrypt it, the honest response is to request a new code from the
 * Bureau, never to guess.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/app/providers'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { NexusMark, NexusWordmark } from '@/components/brand/NexusMark'
import {
  LOGIN_CODE_LENGTH,
  containsForbiddenLogicChars,
  containsUnknownLogicChars,
  describeInvalidLogicCode,
  formatLogicCodeInput,
  isValidLoginCode,
} from '@/lib/auth'

const BOOT_LINES = [
  { text: 'NEXUS FIELD HANDSET', delay: 80 },
  { text: 'MODEL FH-037', delay: 60 },
  { text: 'BOOTING INVESTIGATION OS', delay: 100 },
  { text: 'SECURE CHANNEL ........... ACTIVE', delay: 60 },
  { text: 'LOCAL STORAGE ............ ENCRYPTED', delay: 60 },
  { text: '', delay: 150 },
  { text: 'AWAITING ACCESS CREDENTIAL', delay: 100 },
]

export function PlayerLogin() {
  const navigate = useNavigate()
  const { login } = useApp()
  const [accessCode, setAccessCode] = useState('')
  const [inputWarning, setInputWarning] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [bootComplete, setBootComplete] = useState(() => {
    return process.env.NODE_ENV === 'test'
  })
  const [bootIndex, setBootIndex] = useState(0)

  useEffect(() => {
    if (bootComplete) return
    if (bootIndex < BOOT_LINES.length) {
      const timer = setTimeout(() => {
        setBootIndex(bootIndex + 1)
      }, BOOT_LINES[bootIndex]?.delay ?? 100)
      return () => clearTimeout(timer)
    } else if (bootIndex === BOOT_LINES.length) {
      setBootComplete(true)
    }
  }, [bootIndex, bootComplete])

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
    <div className="nexus-handset-boot min-h-screen">
      <div className="nexus-handset-screen">
        <div className="nexus-handset-window">
          <div className="nexus-handset-title-bar">
            <span className="nexus-handset-title flex items-center gap-2"><NexusMark size={20} className="text-nexus-text" />FH-037</span>
            <span className="nexus-handset-status">
              {bootComplete ? 'READY' : 'INITIALIZING'}
            </span>
          </div>

          <div className="nexus-handset-body">
            {!bootComplete ? (
              <div className="nexus-handset-output space-y-1">
                {BOOT_LINES.slice(0, bootIndex).map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'font-mono text-[0.68rem] tracking-[0.08em]',
                      line.text.includes('ACTIVE') && 'text-nexus-accent',
                      line.text.includes('ENCRYPTED') && 'text-nexus-warning',
                    )}
                  >
                    {line.text === '' ? '\u00A0' : line.text}
                  </div>
                ))}
                <div className="mt-2 h-3 w-3 animate-pulse rounded bg-nexus-textSubtle/30 font-mono text-[0.68rem]" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="nexus-handset-form space-y-5" noValidate>
                {/* The one place the full identity appears on the handset. */}
                <div className="flex flex-col items-center gap-3 pb-2 text-nexus-text">
                  <NexusMark size={72} />
                  <NexusWordmark height={16} />
                </div>
                <div>
                  <label htmlFor="accessCode" className="handset-label">
                    ACCESS CODE
                  </label>
                  <div className="relative">
                    <input
                      id="accessCode"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      value={accessCode}
                      onChange={handleCodeChange}
                      placeholder="────────"
                      className={cn(
                        'handset-input text-center text-2xl tracking-widest uppercase font-mono',
                        accessCode.length > 0 && !isComplete && 'handset-input-error',
                      )}
                      maxLength={LOGIN_CODE_LENGTH}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  {!accessCode && (
                    <p className="mt-2 flex items-start gap-1.5 text-[0.62rem] text-nexus-textSubtle">
                      <span>Enter the {LOGIN_CODE_LENGTH}-character Logic Code from the Bureau. Format: A-Z and 2-9 (no I, O, 0, 1).</span>
                    </p>
                  )}
                  {formatError && (
                    <p className="mt-2 flex items-start gap-1.5 text-[0.62rem] text-nexus-danger" role="alert">
                      <span>• {formatError}</span>
                    </p>
                  )}
                  {inputWarning && (
                    <p className="mt-2 flex items-start gap-1.5 text-[0.62rem] text-nexus-danger" role="alert">
                      <span>• {inputWarning}</span>
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 border border-nexus-danger/40 bg-nexus-dangerBg/20 px-3 py-2.5">
                    <span className="text-[0.68rem] font-mono text-nexus-danger">ACCESS DENIED — {error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !isComplete}
                  className={cn(
                    'handset-button w-full',
                    !isComplete && 'handset-button-inactive',
                  )}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-pulse">⋯</span>
                      <span>VERIFYING CREDENTIAL</span>
                    </>
                  ) : (
                    <span>CONNECT TO INVESTIGATION</span>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="nexus-handset-footer">
            <span className="font-mono text-[0.52rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
              NEXUS ECHO FIELD OPERATIONS
            </span>
            <span className="font-mono text-[0.56rem] text-nexus-textSubtle">
              CASE 037
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
