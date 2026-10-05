/**
 * NEXUS — RequireAuth Guard
 *
 * Wraps routes that require a player to be authenticated.
 * On unauthenticated access, redirects to the player login page.
 *
 * One case is deliberately NOT a redirect: a session that is valid but whose
 * case file could not be read. The player is signed in, so sending them to the
 * login form asks them for a one-time code that has already been spent, and
 * every attempt fails the same way - the loop the audit recorded after a team
 * completed the case. The recovery there is another read of the same session,
 * which is what the button does.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode, useState } from 'react'
import { useApp } from '@/app/providers'
import { BureauIcons } from '@/components/bureau'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, sessionLoadError, retrySession } = useApp()
  const location = useLocation()
  const [isRetrying, setIsRetrying] = useState(false)

  if (isInitializing) {
    return <div className="flex items-center justify-center min-h-screen bg-nexus-bg">Loading session…</div>
  }

  if (!isAuthenticated) {
    if (sessionLoadError) {
      return (
        <div className="page">
          <div className="page-content max-w-md mx-auto text-center py-12">
            <BureauIcons.Flag
              className="bureau-icon w-8 h-8 text-nexus-warning mx-auto mb-4"
              aria-hidden="true"
            />
            <h1 className="heading-3 mb-2">CASE FILE UNAVAILABLE</h1>
            <p className="text-nexus-textMuted mb-6" role="alert">
              {sessionLoadError}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsRetrying(true)
                void retrySession().finally(() => setIsRetrying(false))
              }}
              disabled={isRetrying}
              className="nexus-btn nexus-btn-primary w-full touch-target-comfortable"
            >
              {isRetrying ? (
                <>
                  <BureauIcons.Spinner className="bureau-icon w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>RETRYING…</span>
                </>
              ) : (
                <>
                  <BureauIcons.Refresh className="bureau-icon w-5 h-5" aria-hidden="true" />
                  <span>[ RETRY ]</span>
                </>
              )}
            </button>
            <p className="mt-4 text-xs text-nexus-textSubtle">
              Still failing? Tell a Bureau operator — they can restore your case.
            </p>
          </div>
        </div>
      )
    }

    return <Navigate to="/player/login" state={{ from: location }} replace />
  }

  return children
}