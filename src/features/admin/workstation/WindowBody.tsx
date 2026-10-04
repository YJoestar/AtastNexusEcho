/**
 * NEXUS ECHO — Window body
 *
 * Each window that hosts an existing admin screen runs it inside its own
 * in-memory router (WindowRouter) with the same route table the site uses. That is what keeps
 * every screen working exactly as before — links, parameters, redirects — while
 * several can be open at once.
 *
 * Navigation to a screen that belongs to a different module does not turn this
 * window into that module: it opens (or focuses) the owning window and puts this
 * one back where it was.
 */
import { memo, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { WindowRouter } from './WindowRouter'
import { ROUTES } from '@/app/config'
import { AdminDashboard } from '../Dashboard'
import { AdminTeams } from '../Teams'
import { AdminTeamDetail } from '../TeamDetail'
import { AdminLeaderboard } from '../Leaderboard'
import { AdminGameControl } from '../GameControl'
import { AdminAudit } from '../Audit'
import { AdminLocations } from '../Locations'
import { AdminQAViewer } from '../QAViewer'
import { AdminEvidenceLab } from '../EvidenceLab'
import { QAHub } from '../QAHub'
import { EvidenceShowcase } from '../EvidenceShowcase'
import { APPS, appForPath, type AppId } from './apps'

interface WindowBodyProps {
  app: AppId
  /** Where the shell wants this window to be. */
  path: string
  onPath: (path: string) => void
  onForeign: (app: AppId, path: string) => void
}

function Routing({ app, path, onPath, onForeign }: WindowBodyProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const lastOwn = useRef(path)

  // Another part of the workstation moved this window (terminal, search).
  useEffect(() => {
    if (path !== location.pathname && appForPath(path) === app) {
      lastOwn.current = path
      navigate(path)
    }
    // Only a change of the requested path should navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  // The screen inside navigated.
  useEffect(() => {
    const owner = appForPath(location.pathname)
    if (owner && owner !== app) {
      onForeign(owner, location.pathname)
      navigate(lastOwn.current, { replace: true })
      return
    }
    lastOwn.current = location.pathname
    onPath(location.pathname)
  }, [location.pathname, app, navigate, onForeign, onPath])

  return (
    <Routes>
      <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
      <Route path={ROUTES.ADMIN_TEAMS} element={<AdminTeams />} />
      <Route path={ROUTES.ADMIN_TEAM_DETAIL} element={<AdminTeamDetail />} />
      <Route path={ROUTES.ADMIN_LEADERBOARD} element={<AdminLeaderboard />} />
      <Route path={ROUTES.ADMIN_GAME_CONTROL} element={<AdminGameControl />} />
      <Route path={ROUTES.ADMIN_EVIDENCE_REGISTER} element={<AdminEvidenceLab />} />
      <Route path={ROUTES.ADMIN_EVIDENCE_SHOWCASE} element={<EvidenceShowcase />} />
      <Route path={ROUTES.ADMIN_AUDIT} element={<AdminAudit />} />
      <Route path={ROUTES.ADMIN_LOCATIONS} element={<AdminLocations />} />
      <Route path={ROUTES.ADMIN_QA_VIEWER} element={<AdminQAViewer />} />
      <Route path={ROUTES.ADMIN_QA_HUB} element={<QAHub />} />
      <Route path="*" element={<Navigate to={APPS[app].path ?? ROUTES.ADMIN_DASHBOARD} replace />} />
    </Routes>
  )
}

function WindowBodyImpl(props: WindowBodyProps) {
  // The router's own history starts where the window starts and is then its own.
  const [initial] = useState(props.path)
  return (
    <WindowRouter initial={initial}>
      <div className="min-h-full p-4">
        <Routing {...props} />
      </div>
    </WindowRouter>
  )
}

export const WindowBody = memo(WindowBodyImpl)
