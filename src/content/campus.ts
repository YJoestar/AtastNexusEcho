/**
 * NEXUS ECHO — Campus Environment Data
 *
 * Topographic skeleton of the investigation campus. Buildings, POIs, and bounds
 * only — no answers, no role blocks, no hints. Every coordinate is a location
 * label, not a solution.
 *
 * Coordinate space: 1000 x 1100 world units. Origin (0,0) is top-left.
 * X increases eastward, Y increases southward (screen convention).
 */

import { ALL_PUZZLES } from './puzzles'
import type { NodeIndexEntry } from './puzzles'

export type BuildingName =
  | 'ADMIN_BUILDING'
  | 'LIBRARY'
  | 'SCIENCE_BUILDING'
  | 'ENGINEERING_BLOCK'
  | 'SCULPTURE_GARDEN'
  | 'NEXUS_CORE'

export interface Building {
  id: BuildingName
  name: string
  polygon: [number, number][]
  center: [number, number]
  color: string
  labelOffset: [number, number]
}

export interface CampusPOI {
  code: string
  name: string
  position: [number, number]
  building: BuildingName
  stage: number
}

export const BUILDINGS: Record<BuildingName, Building> = {
  ADMIN_BUILDING: {
    id: 'ADMIN_BUILDING',
    name: 'ADMINISTRATION BUILDING',
    polygon: [
      [80, 120], [290, 120], [290, 620], [80, 620],
    ],
    center: [185, 370],
    color: 'nexus-accent',
    labelOffset: [0, -20],
  },
  LIBRARY: {
    id: 'LIBRARY',
    name: 'BRILLOUIN LIBRARY',
    polygon: [
      [330, 80], [530, 80], [530, 300], [330, 300],
    ],
    center: [430, 190],
    color: 'nexus-warning',
    labelOffset: [0, -20],
  },
  SCIENCE_BUILDING: {
    id: 'SCIENCE_BUILDING',
    name: 'SCIENCE BUILDING',
    polygon: [
      [360, 340], [580, 340], [580, 720], [360, 720],
    ],
    center: [470, 530],
    color: 'nexus-blue',
    labelOffset: [0, -20],
  },
  ENGINEERING_BLOCK: {
    id: 'ENGINEERING_BLOCK',
    name: 'ENGINEERING BLOCK',
    polygon: [
      [610, 430], [930, 430], [930, 920], [610, 920],
    ],
    center: [770, 675],
    color: 'nexus-restricted',
    labelOffset: [0, -20],
  },
  SCULPTURE_GARDEN: {
    id: 'SCULPTURE_GARDEN',
    name: 'SCULPTURE GARDEN',
    polygon: [
      [420, 700], [620, 700], [620, 880], [420, 880],
    ],
    center: [520, 790],
    color: 'nexus-textSubtle',
    labelOffset: [0, 16],
  },
  NEXUS_CORE: {
    id: 'NEXUS_CORE',
    name: 'NEXUS CORE',
    polygon: [
      [760, 860], [960, 860], [960, 1080], [760, 1080],
    ],
    center: [860, 970],
    color: 'nexus-danger',
    labelOffset: [0, -20],
  },
}

export const BUILDING_NAMES: Record<BuildingName, string> = {
  ADMIN_BUILDING: 'Administration Building',
  LIBRARY: 'Brillouin Library',
  SCIENCE_BUILDING: 'Science Building',
  ENGINEERING_BLOCK: 'Engineering Block',
  SCULPTURE_GARDEN: 'Sculpture Garden',
  NEXUS_CORE: 'Nexus Core',
}

export const CAMPUS_BOUNDS: [number, number, number, number] = [0, 0, 1000, 1100]

export const CAMPUS_SIZE = { width: 1000, height: 1100 } as const

function extractBuilding(location: string): BuildingName | null {
  const upper = location.toUpperCase()
  if (upper.includes('[NEXUS CORE]')) return 'NEXUS_CORE'
  if (upper.includes('[ENGINEERING BLOCK]')) return 'ENGINEERING_BLOCK'
  if (upper.includes('[SCIENCE BUILDING]')) return 'SCIENCE_BUILDING'
  if (upper.includes('[LIBRARY]')) return 'LIBRARY'
  if (upper.includes('[ADMIN BUILDING]')) return 'ADMIN_BUILDING'
  if (upper.includes('[CAMPUS]')) return 'SCULPTURE_GARDEN'
  return null
}

function buildingCenter(building: BuildingName): [number, number] {
  return BUILDINGS[building].center
}

function offsetFromCenter(
  building: BuildingName,
  offsetX: number,
  offsetY: number,
): [number, number] {
  const [cx, cy] = buildingCenter(building)
  return [cx + offsetX, cy + offsetY]
}

const POI_LOCATIONS: Record<string, [number, number]> = (() => {
  const positions: Record<string, [number, number]> = {}

  positions['P01'] = offsetFromCenter('ADMIN_BUILDING', -35, -180)
  positions['P03'] = offsetFromCenter('ADMIN_BUILDING', -55, -160)
  positions['P02'] = offsetFromCenter('ADMIN_BUILDING', 0, -80)
  positions['P04'] = offsetFromCenter('ADMIN_BUILDING', 30, -10)
  positions['P05'] = offsetFromCenter('ADMIN_BUILDING', 30, 40)
  positions['P08'] = offsetFromCenter('ADMIN_BUILDING', 50, -10)
  positions['P09'] = offsetFromCenter('ADMIN_BUILDING', 50, 60)
  positions['P10'] = offsetFromCenter('ADMIN_BUILDING', 30, 140)
  positions['P11'] = offsetFromCenter('ADMIN_BUILDING', 60, 160)
  positions['P12'] = offsetFromCenter('ADMIN_BUILDING', -45, 100)
  positions['P20'] = offsetFromCenter('ADMIN_BUILDING', 0, -120)
  positions['P21'] = offsetFromCenter('ADMIN_BUILDING', 0, -135)
  positions['M01'] = offsetFromCenter('ADMIN_BUILDING', 0, 100)
  positions['M03'] = offsetFromCenter('ADMIN_BUILDING', 0, 110)

  positions['P06'] = offsetFromCenter('LIBRARY', -50, -40)
  positions['P15'] = offsetFromCenter('LIBRARY', -60, -70)
  positions['P18'] = offsetFromCenter('LIBRARY', 50, -10)
  positions['P07'] = offsetFromCenter('LIBRARY', 40, 70)

  positions['P13'] = offsetFromCenter('SCIENCE_BUILDING', 10, -80)
  positions['P06b'] = offsetFromCenter('SCIENCE_BUILDING', -20, -40)
  positions['P07b'] = offsetFromCenter('SCIENCE_BUILDING', 20, -20)
  positions['M02'] = offsetFromCenter('SCIENCE_BUILDING', -10, 40)
  positions['P14'] = offsetFromCenter('SCIENCE_BUILDING', -10, 50)
  positions['P16'] = offsetFromCenter('SCIENCE_BUILDING', -30, 100)
  positions['P17'] = offsetFromCenter('SCIENCE_BUILDING', -30, 140)
  positions['P17b'] = offsetFromCenter('SCIENCE_BUILDING', 20, 160)
  positions['P22'] = offsetFromCenter('SCIENCE_BUILDING', 10, -80)

  positions['P19'] = offsetFromCenter('SCULPTURE_GARDEN', 0, -40)

  positions['M04'] = offsetFromCenter('ENGINEERING_BLOCK', 0, 180)
  positions['P23'] = offsetFromCenter('ENGINEERING_BLOCK', -60, -100)
  positions['P23b'] = offsetFromCenter('ENGINEERING_BLOCK', -50, -120)
  positions['P24'] = offsetFromCenter('ENGINEERING_BLOCK', 90, -120)
  positions['P24b'] = offsetFromCenter('ENGINEERING_BLOCK', 70, -90)
  positions['P25'] = offsetFromCenter('ENGINEERING_BLOCK', -20, 0)
  positions['P26'] = offsetFromCenter('ENGINEERING_BLOCK', 40, 20)
  positions['P27'] = offsetFromCenter('ENGINEERING_BLOCK', -60, 100)
  positions['P27b'] = offsetFromCenter('ENGINEERING_BLOCK', -50, 120)
  positions['P28'] = offsetFromCenter('ENGINEERING_BLOCK', 0, 130)
  positions['P29'] = offsetFromCenter('ENGINEERING_BLOCK', 30, 160)

  positions['P30'] = offsetFromCenter('NEXUS_CORE', -40, -70)
  positions['P31'] = offsetFromCenter('NEXUS_CORE', 40, -30)
  positions['P32'] = offsetFromCenter('NEXUS_CORE', -60, 40)
  positions['P33'] = offsetFromCenter('NEXUS_CORE', 60, 60)
  positions['P34'] = offsetFromCenter('NEXUS_CORE', 0, 20)
  positions['P35'] = offsetFromCenter('NEXUS_CORE', 20, 120)
  positions['P36'] = offsetFromCenter('NEXUS_CORE', -60, 140)
  positions['P37'] = offsetFromCenter('NEXUS_CORE', 0, 180)

  return positions
})()

export const ALL_POIS: CampusPOI[] = ALL_PUZZLES.map((puzzle: NodeIndexEntry) => {
  const building = extractBuilding(puzzle.location) ?? 'ADMIN_BUILDING'
  const position = POI_LOCATIONS[puzzle.code] ?? buildingCenter(building)

  return {
    code: puzzle.code,
    name: puzzle.name,
    position,
    building,
    stage: puzzle.stage,
  }
})

export function getPOI(code: string): CampusPOI | undefined {
  return ALL_POIS.find(p => p.code === code)
}

export function getPOIsForBuilding(building: BuildingName): CampusPOI[] {
  return ALL_POIS.filter(p => p.building === building)
}

export function getBuildingForLocation(location: string): BuildingName | null {
  return extractBuilding(location)
}

export function locationFromNode(nodeCode: string): CampusPOI | undefined {
  return getPOI(nodeCode)
}
