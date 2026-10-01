/**
 * NEXUS — Player Waiting Screen
 * Shown after login until game starts.
 * Displays team status, role assignment, and countdown.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/app/providers'
import { ROUTES, ROLE_LABELS, ROLE_SUBTITLES, ROLE_THEMES } from '@/app/config'
import { cn } from '@/lib/utils'
import { BureauIcons } from '@/components/bureau'

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
        <BureauIcons.Spinner className="bureau-icon w-8 h-8 text-nexus-accent animate-spin" />
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
    <div className="page flex items-center justify-center p-4 md:p-8">
      <div className="nexus-case-shell w-full max-w-lg">
        <div className="nexus-case-header">
          <span className="section-label">Field Operations</span>
          <span className="case-number-tag">CASE 037</span>
        </div>

        <div className="nexus-case-body space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-nexus-border pb-4">
            <div className="flex items-center gap-4">
              <div className="nexus-case-mark">N</div>
              <div>
                <p className="section-label mb-1">Team assignment</p>
                <h1 className="heading-2">{team.name}</h1>
              </div>
            </div>
            <div className="case-identifier-block">
              <span className="case-identifier-label">CODE</span>
              <span className="case-identifier-value">{team.code}</span>
            </div>
          </div>

          <div className={cn(
            'nexus-ops-panel border-l-2',
            isStarted ? 'border-nexus-accent' : 'border-nexus-warning',
          )}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="nexus-ops-label">Status</span>
                <p className="mt-2 text-sm text-nexus-textMuted">
                  {isStarted ? 'Game in progress' : 'Awaiting launch'}
                </p>
              </div>
              <div className={cn(
                'inline-flex items-center gap-2 px-2 py-1 text-[0.6rem] uppercase tracking-[0.22em] border',
                isStarted ? 'border-nexus-accent/40 bg-nexus-accentBg/20 text-nexus-accent' : 'border-nexus-warning/40 bg-nexus-warningBg/20 text-nexus-warning'
              )}>
                {isStarted ? <BureauIcons.Check className="bureau-icon w-3.5 h-3.5" /> : <BureauIcons.Clock className="bureau-icon w-3.5 h-3.5" />}
                {isStarted ? 'Live' : 'Standby'}
              </div>
            </div>

            {!isStarted ? (
              <>
                <div className="mt-5 mb-4">
                  <BureauIcons.Spinner className="bureau-icon mr-3 inline-block w-5 h-5 text-nexus-accent animate-spin" />
                  <span className="text-nexus-textMuted">Session initialising</span>
                </div>

                {countdown > 0 && (
                  <div className="border border-nexus-border bg-nexus-bg p-4 text-center mb-4">
                    <div className="text-4xl md:text-5xl font-mono font-bold text-nexus-accent tabular-nums">
                      {formatTime(countdown)}
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-nexus-textSubtle">until deployment</p>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-5">
                <button
                  onClick={() => navigate(ROUTES.PLAYER_GAME)}
                  className="nexus-btn nexus-btn-primary w-full touch-target-comfortable"
                >
                  <BureauIcons.Check className="bureau-icon w-5 h-5" />
                  <span>Enter Game</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="nexus-ops-panel p-3">
              <BureauIcons.Users className="bureau-icon w-5 h-5 text-nexus-accent mx-auto mb-2" />
              <p className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Team</p>
              <p className="font-mono text-lg text-nexus-text">{team.code}</p>
            </div>
            <div className="nexus-ops-panel p-3">
              <BureauIcons.Clock className="bureau-icon w-5 h-5 text-nexus-warning mx-auto mb-2" />
              <p className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Slot</p>
              <p className="font-mono text-lg text-nexus-text">3h</p>
            </div>
            <div className="nexus-ops-panel p-3">
              <BureauIcons.Shield className="bureau-icon w-5 h-5 text-nexus-info mx-auto mb-2" />
              <p className="text-[0.56rem] uppercase tracking-[0.2em] text-nexus-textSubtle">Role</p>
              <p className="text-base font-medium text-nexus-text">{ROLE_LABELS[player.role]}</p>
            </div>
          </div>

          <div className={cn('nexus-ops-panel', roleTheme?.bg)}>
            <span className="nexus-ops-label">Assigned role</span>
            <h3 className="heading-4 mt-3 flex items-center gap-2">
              <div className={cn('w-8 h-8 flex items-center justify-center border border-nexus-border', roleTheme?.bg)}>
                <BureauIcons.User className={cn('bureau-icon w-4 h-4', roleTheme?.text)} />
              </div>
              <span className={roleTheme?.text}>{ROLE_LABELS[player.role]}</span>
            </h3>
            <p className="mt-2 text-sm text-nexus-textMuted">
              <strong className="text-nexus-text">{ROLE_SUBTITLES[player.role]}</strong>
            </p>
            <p className="mt-2 text-sm text-nexus-textMuted">
              Keep this device active and coordinate with your team. Each role carries a fragment of the case.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
