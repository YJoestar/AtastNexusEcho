/**
 * NEXUS — Admin Login
 * Bureau authentication via Supabase Auth
 *
 * SECURITY: Admin users are separate from players.
 * Admin credentials are verified through Supabase Auth + admin_users table.
 * NO hardcoded credentials — all validation is server-side.
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BureauIcons } from '@/components/bureau'
import { useAdmin } from '@/app/providers/AdminProvider'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/app/config'

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
    <div className="min-h-screen flex items-center justify-center p-6 md:p-8">
      <div className="nexus-case-shell w-full max-w-xl">
        <div className="nexus-case-header">
          <span className="section-label">NEXUS INVESTIGATIONS BUREAU</span>
          <span className="case-number-tag">BUREAU 02</span>
        </div>

        <div className="nexus-case-body">
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-nexus-border pb-4">
            <div className="flex items-center gap-4">
              <div className="nexus-case-mark">N</div>
              <div>
                <p className="section-label mb-1">Authorized Personnel</p>
                <h1 className="heading-2 text-nexus-text">Bureau Access</h1>
              </div>
            </div>
            <div className="case-identifier-block">
              <span className="case-identifier-label">AUTH</span>
              <span className="case-identifier-value">NEX-37</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="label">Operator ID (Email)</label>
              <div className="relative">
                <BureauIcons.Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  placeholder="operator@bureau.nexus"
                  className={cn('input pl-10', touched.email && !email.trim() && 'input-error')}
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading || authLoading}
                />
              </div>
              {touched.email && !email.trim() && (
                <p className="mt-1.5 text-sm text-nexus-danger flex items-center gap-1">
                  <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0" />
                  Operator ID is required
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <BureauIcons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  className={cn('input pl-10 pr-12', touched.password && !password.trim() && 'input-error')}
                  autoComplete="current-password"
                  disabled={isLoading || authLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nexus-textSubtle hover:text-nexus-text transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <BureauIcons.EyeOff className="bureau-icon w-5 h-5" /> : <BureauIcons.Eye className="bureau-icon w-5 h-5" />}
                </button>
              </div>
              {touched.password && !password.trim() && (
                <p className="mt-1.5 text-sm text-nexus-danger flex items-center gap-1">
                  <BureauIcons.Alert className="bureau-icon w-3.5 h-3.5 flex-shrink-0" />
                  Password is required
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-nexus-dangerBg border border-nexus-danger/30 flex items-start gap-2 animate-slide-down">
                <BureauIcons.Alert className="bureau-icon w-5 h-5 flex-shrink-0 text-nexus-danger mt-0.5" />
                <p className="text-sm text-nexus-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="nexus-btn nexus-btn-primary w-full touch-target-comfortable"
            >
              {isLoading || authLoading ? (
                <>
                  <BureauIcons.Spinner className="bureau-icon w-5 h-5 animate-spin" />
                  <span>Authorizing…</span>
                </>
              ) : (
                <>
                  <BureauIcons.Shield className="bureau-icon w-5 h-5" />
                  <span>Access Bureau</span>
                </>
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



