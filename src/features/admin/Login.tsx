/**
 * NEXUS — Admin Login
 * Terminal initialization for bureau access.
 *
 * SECURITY: Admin users are separate from players.
 * Admin credentials are verified through Supabase Auth + admin_users table.
 * NO hardcoded credentials — all validation is server-side.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { useAdmin } from '@/app/providers/AdminProvider'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/app/config'
import { SHOWCASE_CASE } from '@/lib/evidence/showcaseCatalog'

/**
 * Honest boot lines: the only thing this screen can actually know before
 * sign-in is whether the browser sees a network carrier. No checks are faked.
 */
function bootLines(): Array<{ text: string; delay: number }> {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine
  return [
    { text: `NEXUS ECHO // CONTINUITY RECORDS SYSTEM  ${SHOWCASE_CASE.build}`, delay: 90 },
    { text: SHOWCASE_CASE.institution, delay: 70 },
    { text: `TERMINAL ${SHOWCASE_CASE.terminal} / NODE ${SHOWCASE_CASE.node}`, delay: 70 },
    { text: online ? 'CARRIER PRESENT' : 'NO CARRIER — SIGN-IN WILL FAIL UNTIL THE LINK RETURNS', delay: 90 },
    { text: '', delay: 120 },
    { text: 'ACCESS RESTRICTED. AUTHORIZED PERSONNEL ONLY.', delay: 90 },
    { text: 'AWAITING AUTHORIZATION', delay: 140 },
  ]
}

export function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading: authLoading } = useAdmin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [lines] = useState(bootLines)
  const [bootComplete, setBootComplete] = useState(false)
  const [bootIndex, setBootIndex] = useState(0)

  useEffect(() => {
    if (bootIndex < lines.length) {
      const timer = setTimeout(() => {
        setBootIndex(bootIndex + 1)
      }, lines[bootIndex]?.delay ?? 100)
      return () => clearTimeout(timer)
    } else if (bootIndex === lines.length) {
      setBootComplete(true)
    }
  }, [bootIndex, lines])

  // Skippable: any key, or a click on the boot text.
  useEffect(() => {
    if (bootComplete) return
    const skip = () => { setBootIndex(lines.length); setBootComplete(true) }
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [bootComplete, lines.length])

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.ADMIN_DASHBOARD

  const validateForm = () => {
    const newTouched = { email: true, password: true }
    setTouched(newTouched)
    return email.trim().length > 0 && password.trim().length > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || isLoading || authLoading) return

    setIsLoading(true)
    setError('')

    const result = await login(email, password)

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error ?? 'Authentication failed. Contact Bureau command.')
      setIsLoading(false)
    }
  }

  return (
    <div className="nexus-terminal-boot min-h-screen">
      <div className="nexus-terminal-screen">
        <div className="nexus-terminal-window">
          <div className="nexus-terminal-title-bar">
            <span className="nexus-terminal-title">SECURE ACCESS TERMINAL</span>
            <span className="nexus-terminal-window-id">SESSION 01</span>
          </div>

          <div className="nexus-terminal-body">
            {!bootComplete ? (
              <div className="nexus-terminal-output space-y-1">
                {lines.slice(0, bootIndex).map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'font-mono text-[0.72rem] tracking-[0.06em]',
                      line.text.startsWith('NO CARRIER') && 'text-nexus-warning',
                      line.text.startsWith('AWAITING') && 'text-nexus-accent',
                    )}
                  >
                    {line.text === '' ? '\u00A0' : line.text}
                  </div>
                ))}
                <div className="mt-2 h-3 w-3 animate-pulse rounded bg-nexus-accent/50 font-mono text-[0.72rem]" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="nexus-terminal-form space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="form-label">
                    OPERATOR ID
                  </label>
                  <div className="relative">
                    <BureauIcons.Shield
                      className="absolute left-3 top-1/2 -translate-y-1/2 bureau-icon w-4 h-4 text-nexus-textSubtle"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))}
                      placeholder="operator@bureau.nexus"
                      className={cn('terminal-input pl-10', touched.email && !email.trim() && 'terminal-input-error')}
                      autoComplete="username"
                      autoFocus
                      disabled={isLoading || authLoading}
                    />
                  </div>
                  {touched.email && !email.trim() && (
                    <p className="mt-1.5 flex items-center gap-1 text-[0.62rem] text-nexus-danger">
                      <BureauIcons.Alert className="bureau-icon w-3 h-3 flex-shrink-0" />
                      Operator ID is required
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="form-label">
                    ACCESS KEY
                  </label>
                  <div className="relative">
                    <BureauIcons.Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 bureau-icon w-4 h-4 text-nexus-textSubtle"
                      aria-hidden="true"
                    />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))}
                      placeholder="[ CLASSIFIED ]"
                      className={cn('terminal-input pl-10 pr-12', touched.password && !password.trim() && 'terminal-input-error')}
                      autoComplete="current-password"
                      disabled={isLoading || authLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nexus-textSubtle hover:text-nexus-text transition-colors"
                      aria-label={showPassword ? 'Mask key' : 'Show key'}
                    >
                      {showPassword ? (
                        <BureauIcons.EyeOff className="bureau-icon w-4 h-4" />
                      ) : (
                        <BureauIcons.Eye className="bureau-icon w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {touched.password && !password.trim() && (
                    <p className="mt-1.5 flex items-center gap-1 text-[0.62rem] text-nexus-danger">
                      <BureauIcons.Alert className="bureau-icon w-3 h-3 flex-shrink-0" />
                      Access key is required
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded border border-nexus-danger/40 bg-nexus-dangerBg/30 px-3 py-2.5">
                    <BureauIcons.AlertTriangle className="bureau-icon w-4 h-4 flex-shrink-0 text-nexus-danger mt-0.5" />
                    <p className="font-mono text-[0.68rem] text-nexus-danger">{error}</p>
                  </div>
                )}

                <p className="flex justify-between border-y border-nexus-borderSubtle py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
                  <span>ACCESS LEVEL</span><span className="text-nexus-textMuted">ADMINISTRATOR</span>
                </p>

                <button
                  type="submit"
                  disabled={isLoading || authLoading}
                  className={cn(
                    'terminal-button w-full',
                    (isLoading || authLoading) && 'terminal-button-disabled',
                  )}
                >
                  {isLoading || authLoading ? (
                    <>
                      <BureauIcons.Spinner className="bureau-icon w-4 h-4 animate-spin" />
                      <span>AUTHORIZING…</span>
                    </>
                  ) : (
                    <>
                      <BureauIcons.Shield className="bureau-icon w-4 h-4" />
                      <span>AUTHENTICATE</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="nexus-terminal-footer">
            <span className="font-mono text-[0.52rem] uppercase tracking-[0.22em] text-nexus-textSubtle">
              AUTHORIZED PERSONNEL ONLY
            </span>
            <span className="font-mono text-[0.56rem] text-nexus-textSubtle">
              TERMINAL 07 · NODE B-04
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
