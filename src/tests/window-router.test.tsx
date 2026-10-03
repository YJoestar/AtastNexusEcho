import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WindowRouter } from '@/features/admin/workstation/WindowRouter'

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname}{location.search}</p>
}

function Team() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  return (
    <div>
      <p>team {teamId}</p>
      <button onClick={() => navigate(-1)}>back</button>
      <button onClick={() => navigate('/admin/audit', { replace: true })}>replace</button>
    </div>
  )
}

function Screens() {
  return (
    <>
      <Where />
      <Routes>
        <Route path="/admin/teams" element={<Link to="/admin/teams/t9">open t9</Link>} />
        <Route path="/admin/teams/:teamId" element={<Team />} />
        <Route path="/admin/audit" element={<p>audit</p>} />
      </Routes>
    </>
  )
}

describe('WindowRouter', () => {
  it('runs routes, links, params and history inside another router, and keeps each window\'s location separate', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <WindowRouter initial="/admin/teams"><div data-testid="a"><Screens /></div></WindowRouter>
        <WindowRouter initial="/admin/audit"><div data-testid="b"><Screens /></div></WindowRouter>
        <Where />
      </MemoryRouter>,
    )
    const [first, second, outer] = screen.getAllByTestId('where')
    expect(first.textContent).toBe('/admin/teams')
    expect(second.textContent).toBe('/admin/audit')
    expect(outer.textContent).toBe('/admin/dashboard')

    fireEvent.click(screen.getByText('open t9'))
    expect(screen.getAllByTestId('where')[0].textContent).toBe('/admin/teams/t9')
    expect(screen.getByText('team t9')).toBeTruthy()
    // The other window and the outer router did not move.
    expect(screen.getAllByTestId('where')[1].textContent).toBe('/admin/audit')
    expect(screen.getAllByTestId('where')[2].textContent).toBe('/admin/dashboard')

    fireEvent.click(screen.getByText('back'))
    expect(screen.getAllByTestId('where')[0].textContent).toBe('/admin/teams')

    fireEvent.click(screen.getByText('open t9'))
    fireEvent.click(screen.getByText('replace'))
    expect(screen.getAllByTestId('where')[0].textContent).toBe('/admin/audit')
  })
})
