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
import { Shield, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-nexus-dangerBg flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-nexus-danger" />
          </div>
          <h1 className="heading-2 text-nexus-danger">NEXUS BUREAU</h1>
          <p className="text-nexus-textMuted mt-2">Authorized personnel only. Bureau credentials required.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="panel space-y-6" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="label">Operator ID (Email)</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
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
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Operator ID is required
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-textSubtle" aria-hidden="true" />
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
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {touched.password && !password.trim() && (
              <p className="mt-1.5 text-sm text-nexus-danger flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Password is required
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
            disabled={isLoading || authLoading}
            className="btn-danger w-full touch-target-comfortable"
          >
            {isLoading || authLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authorizing…</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Access Bureau</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-nexus-textSubtle">
            ATAST Event — ISIMM Monastir — 30/09/2026
          </p>
          <p className="text-xs text-nexus-textSubtle mt-1">
            Authorized operators only. All actions are audited.
          </p>
        </div>
      </div>
    </div>
  )
}
