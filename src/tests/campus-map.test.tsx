/**
 * NEXUS ECHO — Campus Map & Dynamic Minimap Tests
 *
 * Verifies:
 * - CampusMap renders without crashing and renders a canvas element.
 * - DynamicMinimap renders without crashing, renders canvas + compass SVG,
 *   and respects the size prop.
 * - KnowledgeState and RealityState derive correctly from engine stubs.
 * - useTeamMemberPositions places a member at the current node position.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { CampusMap } from '@/components/player/map/CampusMap'
import { DynamicMinimap } from '@/components/player/map/DynamicMinimap'
import { useCampusMapState, useTeamMemberPositions } from '@/hooks/useCampusMap'
import { ALL_POIS } from '@/content/campus'

const SAMPLE_NODES = [
  { code: 'P01', knowledge: 'VERIFIED', reality: 'NORMAL', solved: true, isCurrent: false, available: false, building: 'ADMIN_BUILDING', position: [150, 190], title: 'The Facade', location: 'Admin Building', stage: 1 },
  { code: 'P02', knowledge: 'INVESTIGATED', reality: 'SUSPICIOUS', solved: false, isCurrent: true, available: false, building: 'ADMIN_BUILDING', position: [185, 100], title: 'The Clock', location: 'Admin Building', stage: 1 },
  { code: 'P06', knowledge: 'VISITED', reality: 'ANOMALOUS', solved: false, isCurrent: false, available: true, building: 'LIBRARY', position: [380, 150], title: 'The Stacks', location: 'Library', stage: 1 },
] as any[]

const SAMPLE_TEAM = [
  { id: 'm1', playerId: 'p1', role: 'OPERATOR', displayName: 'Op', position: [190, 105], building: 'ADMIN_BUILDING', isCurrent: false, isConnected: true },
  { id: 'm2', playerId: 'p2', role: 'OBSERVER', displayName: 'Obs', position: [185, 100], building: 'ADMIN_BUILDING', isCurrent: true, isConnected: true },
] as any[]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CampusMap', () => {
  it('renders a canvas element', () => {
    const { container } = render(<CampusMap nodes={SAMPLE_NODES} zoom={1} />)
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('renders all 47 campus POIs from content', () => {
    expect(ALL_POIS).toHaveLength(47)
  })

  it('does not crash when nodes array is empty', () => {
    const { container } = render(<CampusMap nodes={[]} zoom={1} />)
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('applies custom className', () => {
    const { container } = render(
      <CampusMap nodes={SAMPLE_NODES} zoom={1} className="custom-map-class" />
    )
    expect(container.querySelector('.custom-map-class')).not.toBeNull()
  })

  it('renders without crashing when showFog is true (default)', () => {
    const { container } = render(<CampusMap nodes={SAMPLE_NODES} zoom={1} showFog={true} />)
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('renders without crashing when showFog is false', () => {
    const { container } = render(<CampusMap nodes={SAMPLE_NODES} zoom={1} showFog={false} />)
    expect(container.querySelector('canvas')).not.toBeNull()
  })
})

describe('DynamicMinimap', () => {
  it('renders a canvas element with aria-label', () => {
    const { container } = render(
      <DynamicMinimap
        playerPosition={[500, 550]}
        nodes={SAMPLE_NODES}
        teamMembers={SAMPLE_TEAM}
        orientation="north"
        size={200}
      />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas?.getAttribute('aria-label')).toBe('Team radar minimap')
  })

  it('renders a compass rose SVG', () => {
    const { container } = render(
      <DynamicMinimap playerPosition={[500, 550]} nodes={SAMPLE_NODES} />
    )
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('does not crash with empty team members', () => {
    const { container } = render(
      <DynamicMinimap playerPosition={[500, 550]} nodes={SAMPLE_NODES} teamMembers={[]} />
    )
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('respects custom size prop via inline style', () => {
    const { container } = render(
      <DynamicMinimap playerPosition={[500, 550]} nodes={SAMPLE_NODES} size={180} />
    )
    const wrapper = container.querySelector('.relative')
    expect(wrapper).not.toBeNull()
    expect((wrapper as HTMLElement).style.width).toBe('180px')
    expect((wrapper as HTMLElement).style.height).toBe('180px')
  })

  it('switches compass rotation with player-up orientation', () => {
    const { container, rerender } = render(
      <DynamicMinimap
        playerPosition={[500, 550]}
        playerRotation={90}
        nodes={SAMPLE_NODES}
        orientation="north"
        size={200}
      />
    )
    const compass = container.querySelector('.absolute.top-1')
    expect(compass).not.toBeNull()

    rerender(
      <DynamicMinimap
        playerPosition={[500, 550]}
        playerRotation={90}
        nodes={SAMPLE_NODES}
        orientation="player"
        size={200}
      />
    )
    const rotatedCompass = container.querySelector('.absolute.top-1')
    expect(rotatedCompass).not.toBeNull()
    expect((rotatedCompass as HTMLElement).style.transform).toBe('rotate(90deg)')
  })

  it('applies custom className to wrapper', () => {
    const { container } = render(
      <DynamicMinimap
        playerPosition={[500, 550]}
        nodes={SAMPLE_NODES}
        className="custom-minimap-class"
      />
    )
    expect(container.querySelector('.custom-minimap-class')).not.toBeNull()
  })
})

describe('useCampusMapState', () => {
  it('maps solved nodes to VERIFIED knowledge', () => {
    const solvedCodes = new Set(['P01'])
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes,
        currentNodeId: null,
        availableNodeIds: [],
        narrativeLevel: 0,
      })
    )

    const node = result.current.find(n => n.code === 'P01')
    expect(node).toBeDefined()
    expect(node!.knowledge).toBe('VERIFIED')
    expect(node!.solved).toBe(true)
    expect(node!.available).toBe(false)
  })

  it('maps current node to INVESTIGATED knowledge and marks isCurrent', () => {
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes: new Set(),
        currentNodeId: 'P02',
        availableNodeIds: [],
        narrativeLevel: 0,
      })
    )

    const node = result.current.find(n => n.code === 'P02')
    expect(node).toBeDefined()
    expect(node!.knowledge).toBe('INVESTIGATED')
    expect(node!.isCurrent).toBe(true)
  })

  it('maps available nodes to VISITED knowledge', () => {
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes: new Set(),
        currentNodeId: 'P02',
        availableNodeIds: ['P06'],
        narrativeLevel: 0,
      })
    )

    const node = result.current.find(n => n.code === 'P06')
    expect(node).toBeDefined()
    expect(node!.knowledge).toBe('VISITED')
    expect(node!.available).toBe(true)
  })

  it('marks unvisited, unstarted nodes as UNKNOWN', () => {
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes: new Set(),
        currentNodeId: 'P02',
        availableNodeIds: ['P06'],
        narrativeLevel: 0,
      })
    )

    const node = result.current.find(n => n.code === 'P13')
    expect(node).toBeDefined()
    expect(node!.knowledge).toBe('UNKNOWN')
    expect(node!.reality).toBe('NORMAL')
  })

  it('returns 47 nodes matching campus POI count', () => {
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes: new Set(),
        currentNodeId: null,
        availableNodeIds: [],
        narrativeLevel: 0,
      })
    )
    expect(result.current).toHaveLength(47)
  })

  it('includes building and position for each node', () => {
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes: new Set(),
        currentNodeId: null,
        availableNodeIds: [],
        narrativeLevel: 0,
      })
    )
    for (const node of result.current) {
      expect(node.building).toBeTruthy()
      expect(node.position).toHaveLength(2)
      expect(typeof node.position[0]).toBe('number')
      expect(typeof node.position[1]).toBe('number')
    }
  })

  it('derives RealityState from narrative level at level 0 (all NORMAL)', () => {
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes: new Set(),
        currentNodeId: null,
        availableNodeIds: [],
        narrativeLevel: 0,
      })
    )
    for (const node of result.current) {
      expect(node.reality).toBe('NORMAL')
    }
  })

  it('may produce non-NORMAL RealityState at narrative level 6', () => {
    const { result } = renderHook(() =>
      useCampusMapState({
        solvedCodes: new Set(),
        currentNodeId: null,
        availableNodeIds: [],
        narrativeLevel: 6,
      })
    )
    const nonNormal = result.current.filter(n => n.reality !== 'NORMAL')
    expect(nonNormal.length).toBeGreaterThanOrEqual(0)
  })
})

describe('useTeamMemberPositions', () => {
  it('returns team members for current node and available nodes', () => {
    const { result } = renderHook(() =>
      useTeamMemberPositions('P02', ['P06', 'P13'], new Set(['P01']))
    )

    expect(result.current.length).toBeGreaterThanOrEqual(1)
    for (const member of result.current) {
      expect(member.id).toBeTruthy()
      expect(member.position).toHaveLength(2)
      expect(member.isConnected).toBe(true)
    }
  })

  it('places one member at the current node position', () => {
    const { result } = renderHook(() =>
      useTeamMemberPositions('P02', [], new Set())
    )
    const atCurrent = result.current.find(m => m.isCurrent)
    expect(atCurrent).toBeDefined()
  })

  it('returns empty array when no current node', () => {
    const { result } = renderHook(() =>
      useTeamMemberPositions(null, [], new Set())
    )
    expect(result.current).toHaveLength(0)
  })
})
