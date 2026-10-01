/**
 * NEXUS — Player Waiting Screen
 * Shown after login until game starts.
 * Displays team status, role assignment, and countdown.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, Shield, Loader2, CheckCircle, User } from 'lucide-react'
import { useApp } from '@/app/providers'
import { ROUTES, ROLE_LABELS, ROLE_SUBTITLES, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'

export function PlayerWaiting() {
  const navigate = useNavigate()
  const { player, team, gameState, refreshGameState } = useApp()
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    refreshGameState()
    const interval = setInterval(() => {
      refreshGameState()
    }, 5000)
    return () => clearInterval(interval)
  }, [refreshGameState])

  useEffect(() => {
    if (gameState?.startedAt) {
      const startTime = new Date(gameState.startedAt).getTime()
      const now = Date.now()
      if (startTime > now) {
        const interval = setInterval(() => {
          const diff = Math.max(0, Math.ceil((startTime - Date.now()) / 1000))
          setCountdown(diff)
          if (diff === 0) {
            clearInterval(interval)
            navigate(ROUTES.PLAYER_GAME, { replace: true })
          }
        }, 1000)
        return () => clearInterval(interval)
      } else {
        navigate(ROUTES.PLAYER_GAME, { replace: true })
      }
    }
  }, [gameState, navigate])

  if (!player || !team) {
    return (
      <div className="page flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nexus-accent animate-spin" />
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const roleTheme = player.role && ROLE_THEMES[player.role]
  const isStarted = gameState?.status === 'RUNNING'

  return (
    <div className="page flex flex-col items-center justify-center p-4">
      {/* Status Header */}
      <div className="w-full max-w-md text-center mb-8">
        <div className={cn(
          'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium mb-4 border',
          isStarted
            ? 'border-nexus-accent/30 bg-nexus-accentBg/20 text-nexus-accent'
            : 'border-nexus-warning/30 bg-nexus-warningBg/20 text-nexus-warning',
        )}>
          {isStarted ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Game in Progress</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span>Waiting for Start</span>
            </>
          )}
        </div>

        <h1 className="heading-2 mb-2">{team.name}</h1>
        <p className="text-nexus-textMuted">
          Team Code: <span className="font-mono text-nexus-text">{team.code}</span>
        </p>
      </div>

      {/* Countdown or Game Start */}
      <div className="w-full max-w-md nexus-document text-center animate-slide-up">
        {!isStarted ? (
          <>
            <div className="mb-6">
              <Loader2 className="w-12 h-12 text-nexus-accent animate-spin mx-auto mb-4" />
              <h2 className="heading-3 mb-2">Session Initializing</h2>
              <p className="text-nexus-textMuted max-w-sm mx-auto">
                The Bureau will begin the session shortly. Keep this screen active
                and stay ready with your teammates.
              </p>
            </div>

            {countdown > 0 && (
              <div className="nexus-panel p-6 mb-6 text-center">
                <div className="text-5xl md:text-7xl font-mono font-bold text-nexus-accent tabular-nums">
                  {formatTime(countdown)}
                </div>
                <p className="text-nexus-textMuted mt-2 text-sm">until game start</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="nexus-panel p-3 text-center">
                <Users className="w-6 h-6 text-nexus-accent mx-auto mb-2" />
                <p className="text-sm text-nexus-textMuted">Team Size</p>
                <p className="font-mono text-lg text-nexus-text">3</p>
              </div>
              <div className="nexus-panel p-3 text-center">
                <Clock className="w-6 h-6 text-nexus-warning mx-auto mb-2" />
                <p className="text-sm text-nexus-textMuted">Duration</p>
                <p className="font-mono text-lg text-nexus-text">3h</p>
              </div>
              <div className="nexus-panel p-3 text-center">
                <Shield className="w-6 h-6 text-nexus-info mx-auto mb-2" />
                <p className="text-sm text-nexus-textMuted">Your Role</p>
                <p className="font-medium text-nexus-text">{ROLE_LABELS[player.role]}</p>
              </div>
            </div>
          </>
        ) : (
          <button
            onClick={() => navigate(ROUTES.PLAYER_GAME)}
            className="nexus-btn nexus-btn-primary w-full touch-target-comfortable"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Enter Game</span>
          </button>
        )}
      </div>

      {/* Role Reminder */}
      <div className={cn(
        'w-full max-w-md mt-6 nexus-document',
        roleTheme?.bg,
      )}>
        <h3 className="heading-4 mb-4 flex items-center gap-2">
          <div className={cn('w-8 h-8 flex items-center justify-center border border-nexus-border', roleTheme?.bg)}>
            <User className={cn('w-5 h-5', roleTheme?.text)} />
          </div>
          <span className={roleTheme?.text}>Your Role: {ROLE_LABELS[player.role]}</span>
        </h3>
        <p className="text-nexus-textMuted text-sm mb-2">
          <strong>{ROLE_SUBTITLES[player.role]}</strong>
        </p>
        <p className="text-nexus-textMuted text-sm">
          Communicate with your teammates verbally — the app does not provide chat.
          Each role holds a piece of the puzzle. Share your findings.
        </p>
      </div>
    </div>
  )
}
