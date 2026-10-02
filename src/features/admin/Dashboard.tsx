/**
 * NEXUS ECHO — Admin: Operations Room / Active Investigation Terminal
 *
 * It is 01:47 AM. The campus is mostly empty.
 * The operator is at an investigation workstation monitoring field units,
 * live signals, recovered evidence, and timestamp discrepancies.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BureauIcons, TerminalFrame, IncidentLog, type IncidentEntry } from '@/components/bureau'
import { CampusMap } from '@/components/player/map/CampusMap'
import { TacticalOverlay } from '@/components/visual/TacticalOverlay'
import { ROUTES } from '@/app/config'
import { cn } from '@/lib/utils'
import { useBureau, useBureauRealtime } from '@/hooks/useBureau'
import { TeamCreationWizard } from '@/components/admin/TeamCreationWizard'
import { TeamStatusBadge } from '@/components/admin/StatusBadge'
import { CustomNotificationModal } from '@/components/admin/CustomNotificationModal'
import { ALL_PUZZLES } from '@/content/puzzles'
import { ALL_POIS } from '@/content/campus'
import type { MapNodeState } from '@/types/campus'

export function AdminDashboard() {
  const navigate = useNavigate()
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  )

  const {
    teams,
    gameEvents,
    isLoading,
    fetchTeams,
    fetchGameState,
    fetchGameEvents,
    fetchLocations,
    refreshAll,
  } = useBureau()

  const { isConnected } = useBureauRealtime()

  // Keep live clock updated
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    void fetchTeams()
    void fetchGameState()
    void fetchGameEvents(50)
    void fetchLocations()
  }, [fetchTeams, fetchGameState, fetchGameEvents, fetchLocations])

  // Calculated operational telemetry
  const telemetry = useMemo(() => {
    const totalTeams = teams.length
    const activeTeams = teams.filter(t => t.status === 'ACTIVE').length
    const totalPlayers = teams.reduce((sum, t) => sum + (t.playerCount ?? 0), 0)
    const totalNodes = ALL_PUZZLES.length

    const latestEvent = gameEvents.reduce<typeof gameEvents[number] | null>((latest, event) => {
      if (!latest || new Date(event.timestamp).getTime() > new Date(latest.timestamp).getTime()) return event
      return latest
    }, null)
    const lastContactTime = latestEvent
      ? new Date(latestEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      : 'NO RECORD'

    return {
      totalTeams,
      activeTeams,
      totalPlayers,
      totalNodes,
      lastContactTime,
    }
  }, [teams, gameEvents])

  // Only a recorded NODE_SOLVED event is treated as recovered evidence.
  const evidenceRegister = useMemo(() => {
    const byIdentifier = new Map(ALL_PUZZLES.flatMap(puzzle => [[puzzle.id, puzzle], [puzzle.code, puzzle]]))
    const recovered: Array<{
      code: string
      nodeCode: string | null
      title: string
      type: string
      location: string
      teamLabel: string
      timestamp: string
    }> = []

    for (const event of gameEvents) {
      if (event.type !== 'NODE_SOLVED') continue
      const identifiers = [
        event.metadata?.nodeCode,
        event.metadata?.node_code,
        event.payload.nodeCode,
        event.payload.node_code,
        event.nodeId,
      ]
      const puzzle = identifiers
        .filter((value): value is string => typeof value === 'string')
        .map(identifier => byIdentifier.get(identifier))
        .find(Boolean)
      const team = event.teamId ? teams.find(candidate => candidate.id === event.teamId) : null
      recovered.push({
        code: `EVT-${event.id.slice(0, 6).toUpperCase()}`,
        nodeCode: puzzle?.code ?? null,
        title: puzzle?.name ?? 'NODE RECOVERY',
        type: puzzle?.type.replace(/_/g, ' ') ?? 'NODE SOLVED',
        location: puzzle?.location ?? (event.nodeId ? `NODE REF ${event.nodeId.slice(0, 8).toUpperCase()}` : 'LOCATION UNRESOLVED'),
        teamLabel: team?.code ?? 'UNIT UNRESOLVED',
        timestamp: event.timestamp,
      })
    }

    return recovered
  }, [gameEvents, teams])

  const mapNodes = useMemo((): MapNodeState[] => {
    const currentCodes = new Set(teams.map(team => team.currentNodeCode).filter((code): code is string => !!code))
    const verifiedCodes = new Set(evidenceRegister.flatMap(item => item.nodeCode ? [item.nodeCode] : []))

    return ALL_POIS.map(poi => {
      const solved = verifiedCodes.has(poi.code)
      const isCurrent = currentCodes.has(poi.code)
      return {
        code: poi.code,
        title: poi.name,
        location: poi.building,
        building: poi.building,
        stage: poi.stage,
        position: poi.position,
        knowledge: solved ? 'VERIFIED' : isCurrent ? 'INVESTIGATED' : 'UNKNOWN',
        reality: 'NORMAL',
        unlocked: solved || isCurrent,
        solved,
        isCurrent,
        available: false,
        status: solved ? 'SOLVED' : isCurrent ? 'IN_PROGRESS' : 'LOCKED',
      }
    })
  }, [teams, evidenceRegister])

  // Incident log entries formatted as forensic chronology
  const incidentEntries: (IncidentEntry | { gap: true; note?: string })[] = useMemo(() => {
    if (gameEvents.length === 0) {
      return [
        { gap: true, note: '[NO TRANSMISSION RECORDS IN BUFFER]' },
      ]
    }

    const entries: (IncidentEntry | { gap: true; note?: string })[] = []

    gameEvents.slice(0, 8).forEach((e, idx) => {
      const time = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      const team = e.teamId ? teams.find(t => t.id === e.teamId) : null
      const teamLabel = team?.name ?? team?.code ?? 'FIELD-UNIT'

      let eventDescription = e.type.replace(/_/g, ' ')
      if (e.type === 'NODE_SOLVED') {
        eventDescription = `${teamLabel} VERIFIED EVIDENCE RECORD`
      } else if (e.type === 'NODE_STARTED') {
        eventDescription = `${teamLabel} ACQUIRED LOCATION MARKER`
      } else if (e.type === 'SUBMISSION_MADE') {
        eventDescription = `${teamLabel} TRANSMITTED TELEMETRY PACKET`
      } else if (e.type === 'QR_SCANNED') {
        eventDescription = `${teamLabel} SCANNED PHYSICAL MARKER`
      } else if (e.type === 'HINT_REQUESTED') {
        eventDescription = `${teamLabel} REQUESTED DECRYPTION AID`
      }

      entries.push({
        time,
        text: (
          <span>
            <strong className="text-nexus-text font-mono mr-2">[{teamLabel}]</strong>
            {eventDescription}
          </span>
        ),
      })

      const olderEvent = gameEvents[idx + 1]
      if (olderEvent) {
        const gapMinutes = Math.floor((new Date(e.timestamp).getTime() - new Date(olderEvent.timestamp).getTime()) / 60000)
        if (gapMinutes >= 5) {
          entries.push({ gap: true, note: `[NO TRANSMISSION FOR ${gapMinutes} MINUTES]` })
        }
      }
    })

    return entries
  }, [gameEvents, teams])

  const handleTeamClick = (teamId: string) => {
    navigate(`${ROUTES.ADMIN_TEAMS}/${teamId}`)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Terminal Header & Machine Identification Strip */}
        <div className="border border-nexus-border bg-nexus-surfaceElevated p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-nexus-accent animate-pulse" />
                <span className="font-mono text-[0.625rem] tracking-[0.24em] uppercase text-nexus-textSubtle">
                  NEXUS ECHO // FIELD OPERATIONS COMMAND
                </span>
                <span className="stamp stamp-restricted ml-2">RESTRICTED // EYES ONLY</span>
              </div>
              <h1 className="font-mono text-xl font-bold tracking-tight text-nexus-text mt-1">
                CASE 037 — ACTIVE INVESTIGATION
              </h1>
            </div>

            {/* Readout Identifiers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="border border-nexus-border bg-nexus-bg px-3 py-1.5 font-mono text-xs">
                <span className="text-nexus-textSubtle block text-[0.5rem] tracking-[0.2em] uppercase">NODE</span>
                <span className="text-nexus-text font-semibold">02-BUREAU</span>
              </div>
              <div className="border border-nexus-border bg-nexus-bg px-3 py-1.5 font-mono text-xs">
                <span className="text-nexus-textSubtle block text-[0.5rem] tracking-[0.2em] uppercase">SHIFT</span>
                <span className="text-nexus-text font-semibold">07</span>
              </div>
              <div className="border border-nexus-border bg-nexus-bg px-3 py-1.5 font-mono text-xs">
                <span className="text-nexus-textSubtle block text-[0.5rem] tracking-[0.2em] uppercase">STATION TIME</span>
                <span className="text-nexus-accent font-semibold">{currentTime}</span>
              </div>
            </div>
          </div>

          {/* Machine Controls Toolbar */}
          <div className="mt-3 pt-3 border-t border-nexus-borderSubtle flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-nexus-textSubtle">
                CHANNEL STATUS:
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] px-2 py-0.5 border',
                isConnected ? 'border-nexus-accent/40 text-nexus-accent bg-nexus-accentBg/30' : 'border-nexus-danger text-nexus-danger bg-nexus-dangerBg/30'
              )}>
                {isConnected ? 'LIVE FEED ACTIVE' : 'CONNECTION FAILING'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={isLoading}
                className="nexus-btn-secondary text-xs px-3 py-1.5 min-h-[36px]"
              >
                <BureauIcons.Refresh className={cn('bureau-icon w-3.5 h-3.5', isLoading && 'animate-spin')} />
                <span>[ FORCE SYNCHRONIZATION ]</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="nexus-btn-primary text-xs px-3 py-1.5 min-h-[36px]"
              >
                <BureauIcons.Add className="bureau-icon w-3.5 h-3.5" />
                <span>[ DISPATCH FIELD UNIT ]</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNotificationsOpen(true)}
                className="nexus-btn-secondary text-xs px-3 py-1.5 min-h-[36px]"
              >
                <BureauIcons.Bell className="bureau-icon w-3.5 h-3.5" />
                <span>[ OPEN FIELD CHANNEL ]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active case surface: canonical site map, field register, and real event records. */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(290px,0.8fr)]">
          <section className="min-w-0 space-y-4">
            <TerminalFrame title="CAMPUS INTELLIGENCE MAP" reference="FIELD POSITIONS // CANONICAL SITE PLAN" variant="monitor">
              <div className="p-2">
                <div className="relative h-[min(58vh,560px)] min-h-[340px] border border-nexus-border bg-nexus-bg">
                  <CampusMap nodes={mapNodes} showFog />
                  <TacticalOverlay nodes={mapNodes} showCoordinates showScaleBar />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-nexus-borderSubtle pt-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
                  <span>FIELD MARKERS: {teams.filter(team => !!team.currentNodeCode).length.toString().padStart(2, '0')}</span>
                  <span>VERIFIED IN EVENT BUFFER: {evidenceRegister.length.toString().padStart(2, '0')}</span>
                  <Link to={ROUTES.ADMIN_LOCATIONS} className="text-nexus-accent hover:underline">
                    OPEN SITE ARCHIVE →
                  </Link>
                </div>
              </div>
            </TerminalFrame>

            <TerminalFrame title="RECOVERED MATERIAL REGISTER" reference={`EVENT BUFFER // ${evidenceRegister.length} VERIFIED`} variant="register">
              {evidenceRegister.length === 0 ? (
                <div className="grid min-h-24 grid-cols-[110px_1fr] items-center gap-3 px-4 font-mono text-[0.625rem] uppercase tracking-[0.12em]">
                  <span className="border-r border-nexus-border py-4 text-nexus-warning">NO RECORD</span>
                  <span className="text-nexus-textSubtle">No verified node recovery in the available event buffer.</span>
                </div>
              ) : (
                <div className="font-mono">
                  <div className="grid grid-cols-[64px_minmax(0,1fr)_88px] gap-2 border-b border-nexus-border px-3 py-1.5 text-[0.52rem] uppercase tracking-[0.16em] text-nexus-textSubtle">
                    <span>NODE</span><span>RECOVERED RECORD</span><span className="text-right">TIME</span>
                  </div>
                  {evidenceRegister.map(item => (
                    <div key={item.code} className="grid grid-cols-[64px_minmax(0,1fr)_88px] items-center gap-2 border-b border-nexus-borderSubtle px-3 py-2 text-xs">
                      <span className="font-bold text-nexus-accent">{item.code}</span>
                      <span className="min-w-0 truncate text-nexus-text">
                        {item.title}<span className="ml-2 text-[0.56rem] text-nexus-textSubtle">{item.teamLabel} / {item.type}</span>
                      </span>
                      <time className="text-right text-[0.625rem] tabular-nums text-nexus-textSubtle">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </TerminalFrame>
          </section>

          <aside className="min-w-0 space-y-4">
            <TerminalFrame title="OPERATIONAL TELEMETRY" reference="CASE 037" variant="system">
              <dl className="space-y-0 px-3 py-1 font-mono text-xs">
                <div className="flex justify-between gap-3 border-b border-nexus-borderSubtle py-2">
                  <dt className="text-nexus-textMuted">FIELD UNITS</dt>
                  <dd className="text-right font-bold text-nexus-text">{telemetry.activeTeams.toString().padStart(2, '0')} ACTIVE / {telemetry.totalTeams.toString().padStart(2, '0')} TOTAL</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-nexus-borderSubtle py-2">
                  <dt className="text-nexus-textMuted">PERSONNEL</dt>
                  <dd className="text-right font-bold text-nexus-text">{telemetry.totalPlayers.toString().padStart(2, '0')} REGISTERED</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-nexus-borderSubtle py-2">
                  <dt className="text-nexus-textMuted">WORKSTATION LINK</dt>
                  <dd className={cn('text-right font-bold', isConnected ? 'text-nexus-accent' : 'text-nexus-danger')}>
                    {isConnected ? 'NETWORK AVAILABLE' : 'CARRIER LOST'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-nexus-borderSubtle py-2">
                  <dt className="text-nexus-textMuted">LAST CONTACT</dt>
                  <dd className="text-right tabular-nums text-nexus-warning">{telemetry.lastContactTime}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-nexus-textMuted">NODE CATALOGUE</dt>
                  <dd className="text-right font-bold text-nexus-text">{telemetry.totalNodes.toString().padStart(2, '0')} INDEXED</dd>
                </div>
              </dl>
            </TerminalFrame>

            <TerminalFrame title="FIELD UNIT REGISTER" reference={`${teams.length} PERSONNEL FILES`} variant="register">
              {teams.length === 0 ? (
                <div className="px-3 py-6 font-mono text-xs text-nexus-textSubtle">
                  <p>PERSONNEL REGISTER / NO FILES</p>
                  <p className="mt-1 text-[0.625rem] text-nexus-textMuted">No field units are assigned to this case.</p>
                </div>
              ) : (
                <div className="divide-y divide-nexus-borderSubtle">
                  {teams.slice(0, 6).map(team => (
                    <button key={team.id} type="button" onClick={() => handleTeamClick(team.id)} className="w-full px-3 py-2 text-left transition-colors hover:bg-nexus-surfaceElevated">
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <span className="truncate text-xs font-bold text-nexus-text">{team.code} / {team.name}</span>
                        <TeamStatusBadge status={team.status} showDot />
                      </div>
                      <div className="mt-1 flex justify-between gap-2 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-nexus-textSubtle">
                        <span>{team.playerCount ?? 0} PERSONNEL</span>
                        <span>{team.currentNodeCode ? `NODE ${team.currentNodeCode}` : 'POSITION UNREPORTED'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TerminalFrame>

            <TerminalFrame title="INBOUND TRANSMISSION" reference="LATEST EVENT RECORD" variant="system">
              {gameEvents.length === 0 ? (
                <div className="px-3 py-5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
                  <p>CHANNEL OPEN</p>
                  <p className="mt-1 text-nexus-textMuted">No field transmissions in the event buffer.</p>
                </div>
              ) : gameEvents.slice(0, 4).map(event => {
                const team = event.teamId ? teams.find(candidate => candidate.id === event.teamId) : null
                return (
                  <div key={event.id} className="grid grid-cols-[54px_1fr] gap-2 border-b border-nexus-borderSubtle px-3 py-2 font-mono text-[0.625rem]">
                    <time className="tabular-nums text-nexus-warning">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </time>
                    <span className="min-w-0 text-nexus-text">
                      <span className="block truncate font-bold">{team?.code ?? 'UNASSIGNED UNIT'} / {event.type.replace(/_/g, ' ')}</span>
                      <span className="block truncate text-nexus-textSubtle">{event.nodeId ? `NODE REF ${event.nodeId}` : 'NO NODE REFERENCE'}</span>
                    </span>
                  </div>
                )
              })}
            </TerminalFrame>
          </aside>
        </div>

        {/* BOTTOM SECTION: Forensic Chronology Log */}
        <TerminalFrame
          title="FORENSIC INCIDENT CHRONOLOGY"
          reference="CHRONO-LOG / CASE 037"
          variant="system"
          footer={
            <div className="flex justify-between items-center w-full font-mono text-xs">
              <span className="text-nexus-textSubtle text-[0.625rem]">
                SHOWING RECENT LOG TRANSACTIONS · ALL FIELD ACTIVITY RECORDED
              </span>
              <Link to={ROUTES.ADMIN_AUDIT} className="text-nexus-accent hover:underline text-[0.6875rem] uppercase tracking-[0.16em]">
                OPEN SYSTEM ACCESS RECORD →
              </Link>
            </div>
          }
        >
          <div className="p-1">
            <IncidentLog entries={incidentEntries} />
          </div>
        </TerminalFrame>
      </div>

      {/* Modals & Wizards */}
      <TeamCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setIsWizardOpen(false)
          void fetchTeams()
        }}
      />

      <CustomNotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        teams={teams}
        onNotificationSent={() => {
          void fetchTeams()
          setIsNotificationsOpen(false)
        }}
      />
    </>
  )
}
