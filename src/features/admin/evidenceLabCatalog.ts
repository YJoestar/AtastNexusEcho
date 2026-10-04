/**
 * Evidence lab: filters and the development catalog.
 * (Separate from EvidenceLab.tsx so that file exports only a component.)
 */
import type { EvidenceLabCatalog } from '@/lib/admin'
import { contentString, type CaseArtifact } from '@/features/player/evidence/types'

export function matchesFilter(artifact: CaseArtifact, filter: LabFilter): boolean {
  const type = artifact.type.toUpperCase()
  const condition = artifact.content.condition as string | undefined
  const isDamaged = !!condition && condition !== 'NORMAL'
  if (filter === 'ALL') return true
  if (filter === 'PHOTOGRAPHS') return /IMAGE|PHOTO|PHOTOGRAPH/.test(type)
  if (filter === 'SURVEILLANCE') return /SURVEILLANCE|CAMERA|VIDEO/i.test(type)
  if (filter === 'DOCUMENTS') return /DOCUMENT|REPORT|TEXT/.test(type)
  if (filter === 'AUDIO') return /AUDIO|RECORDING/.test(type)
  if (filter === 'FRAGMENTS') return /FRAGMENT/.test(type) || artifact.source === 'FRAGMENT'
  if (filter === 'MAPS') return /MAP|PLAN|DIAGRAM|BLUEPRINT/.test(type) || type.includes('MAP')
  if (filter === 'PERSONNEL') return /PERSONNEL|PROFILE|ID|CREDENTIAL|BADGE/.test(type)
  if (filter === 'NOTES') return /NOTE|FIELD_NOTE|HANDWRITTEN/.test(type)
  if (filter === 'DAMAGED') return isDamaged && !/FRAGMENT/.test(type)
  if (filter === 'UNAVAILABLE') return !contentString(artifact.content, ['image_url', 'imageUrl', 'audio_url', 'audioUrl', 'video_url', 'videoUrl', 'document_url', 'file_url'])
  return true
}

export type LabFilter = 'ALL' | 'PHOTOGRAPHS' | 'SURVEILLANCE' | 'DOCUMENTS' | 'AUDIO' | 'FRAGMENTS' | 'MAPS' | 'PERSONNEL' | 'NOTES' | 'DAMAGED' | 'UNAVAILABLE'

/**
 * Development and QA fixtures point at media rendered locally by
 * scripts/evidence-gen. Nothing in the app may reference a remote image or
 * sample media file: the artifacts have to look the same offline as they do in
 * CI, and a hot-linked photo is both a broken image and a licensing problem.
 */
const SHOWCASE_MEDIA = {
  entrance: '/evidence/photographs/photo_nx037_b_11.jpg',
  tower: '/evidence/photographs/photo_nx037_b_03.jpg',
  lobbyFeed: '/evidence/surveillance/surv_cam01_015203.jpg',
  surveillance: '/evidence/surveillance/surv_cam07_031711.jpg',
  audio: '/evidence/audio/audio_rec16_reinterpretation.jpg',
} as const

export function buildDevelopmentCatalog(): EvidenceLabCatalog {
  return {
    evidence: [
      {
        id: 'dev-ev-001', code: 'EVID-001', title: 'Security Log Excerpt', description: 'Fragment of a security log from the admin building.',
        type: 'DOCUMENT', classification: 'RESTRICTED', condition: 'NORMAL',
        content: { detail: 'Entry timestamp discrepancy noted.', timestamp: '2026-10-02T17:22:03Z', location: 'ADMIN BUILDING / WEST WING', device: 'LOG-SERVER-A', integrity: 'CORRUPTED' },
        metadata: { source: 'P01', case: '037' },
      },
      {
        id: 'dev-ev-002', code: 'EVID-002', title: 'Clock Tower Blueprint', description: 'Blueprints showing hidden compartments.',
        type: 'MAP', classification: 'RESTRICTED', condition: 'NORMAL',
        content: { detail: 'Mechanism behind the clock face. Hidden compartment marked at grid C-7.', location: 'CLOCK TOWER' },
        metadata: { source: 'P02', case: '037' },
      },
      {
        id: 'dev-ev-003', code: 'EVID-003', title: 'Field Camera Photo', description: 'Security photograph from the north entrance.',
        type: 'PHOTO', classification: 'RESTRICTED', condition: 'NORMAL',
        content: {
          detail: 'Unidentified figure visible in reflection.',
          image_url: SHOWCASE_MEDIA.entrance,
          timestamp: '2026-10-02T05:13:41Z', location: 'NORTH ENTRANCE / LOBBY', device: 'FIELD-CAM-02',
        },
        metadata: { source: 'P05', case: '037' },
      },
      {
        id: 'dev-ev-004', code: 'EVID-004', title: 'Maintenance Log', description: 'Routine maintenance log for sector C.',
        type: 'DOCUMENT', classification: 'RESTRICTED', condition: 'NORMAL',
        content: { detail: 'Scheduled at 03:00, but anomalies noted.', location: 'SECTOR C / MAINTENANCE' },
        metadata: { source: 'P06', case: '037' },
      },
      {
        id: 'dev-ev-005', code: 'EVID-005', title: 'Lobby Surveillance Feed', description: 'Static-timestamp feed from the main lobby camera.',
        type: 'SURVEILLANCE', classification: 'CONFIDENTIAL', condition: 'NORMAL',
        content: { timestamp: '2026-10-02T08:47:00Z', camera_id: 'CAM-LOBBY-01', location: 'ADMIN BUILDING LOBBY', device: 'CAM-LOBBY-01', integrity: 'STABLE', video_url: SHOWCASE_MEDIA.lobbyFeed },
        metadata: { source: 'CAM-LOBBY-01', case: '037' },
      },
      {
        id: 'dev-ev-006', code: 'EVID-006', title: 'Audio Recording — Figure', description: 'Low-fidelity recording from a recovered field device.',
        type: 'AUDIO', classification: 'CONFIDENTIAL', condition: 'NORMAL',
        content: { recording_id: 'AUDIO-006', duration: '00:47', source: 'FIELD-DEVICE-A', acquired: '2026-10-02T09:00:00Z', signal_state: 'DEGRADED', audio_url: SHOWCASE_MEDIA.audio },
        metadata: { source: 'FIELD-DEVICE-A', case: '037' },
      },
      {
        id: 'dev-ev-007', code: 'EVID-007', title: 'DAMAGED PHOTOGRAPH — Clock Tower', description: 'Photograph of the clock tower with physical damage.',
        type: 'PHOTO', classification: 'RESTRICTED', condition: 'DAMAGED',
        content: {
          detail: 'Partially burned corner. Right edge torn.',
          image_url: SHOWCASE_MEDIA.tower,
          timestamp: '2026-10-02T05:1__',
          location: 'CLOCK TOWER / BASEMENT',
          device: 'FIELD-CAM-01',
          damage: 'BURNED CORNER / PARTIAL TIMESTAMP LOSS',
        },
        metadata: { source: 'P03', case: '037' },
      },
      {
        id: 'dev-ev-008', code: 'EVID-008', title: 'CAM-07 Surveillance — Figure', description: 'Security footage from corridor camera.',
        type: 'SURVEILLANCE', classification: 'CONFIDENTIAL', condition: 'PARTIAL',
        content: { timestamp: '2026-10-02T03:17:11Z', camera_id: 'CAM-07', location: 'ADMIN BUILDING / EAST CORRIDOR', device: 'CAM-07', integrity: 'INTERRUPTED', video_url: SHOWCASE_MEDIA.surveillance, recording_state: 'INTERRUPTED / 03:17:05–03:17:18 FRAME DROP' },
        metadata: { source: 'CAM-07', case: '037' },
      },
      {
        id: 'dev-ev-009', code: 'EVID-009', title: 'Personnel File — LINA VEY', description: 'Access record and project assignment for Dr. Lina Vey.',
        type: 'PERSONNEL', classification: 'RESTRICTED', condition: 'NORMAL',
        content: { personnel_id: 'L.V.-0029', name: 'LINA VEY', role: 'PROJECT LEAD', department: 'MEMORY RESEARCH', location: 'ADMIN BUILDING / LAB-04', access_level: 'LEVEL 3' },
        metadata: { source: 'ARCHIVE', case: '037' },
      },
      {
        id: 'dev-ev-010', code: 'EVID-010', title: 'Field Note — OBSERVER-02', description: 'Handwritten notes from field observation.',
        type: 'NOTE', classification: 'RESTRICTED', condition: 'NORMAL',
        content: { note_id: 'NOTE-FN-02', written_by: 'OBSERVER-02', timestamp: '2026-10-02T04:30:00Z', location: 'ADMIN BUILDING / BASEMENT', content_text: 'Stairs lead to basement. Door marked "AUTHORIZED PERSONNEL ONLY". No badge readers visible.' },
        metadata: { source: 'FIELD-OBSERVER-02', case: '037' },
      },
      {
        id: 'dev-ev-011', code: 'EVID-011', title: 'Anomalous Personnel Record', description: 'Record with impossible metadata.',
        type: 'PERSONNEL', classification: 'ANOMALOUS', condition: 'NORMAL',
        content: { personnel_id: 'L.V.-0029', name: 'LINA VEY', role: 'PROJECT LEAD', location: 'ADMIN BUILDING / LAB-04', access_level: 'LEVEL 3', anomaly_flag: 'TIMESTAMP 1998-04-17 CONFLICTS WITH POLICY ENACTED 2026' },
        metadata: { source: 'ARCHIVE', case: '037', anomaly: true },
      },
      {
        id: 'dev-ev-012', code: 'EVID-000-REPAIR-LOG', title: 'Contradictory Maintenance Log', description: 'Records a timestamp that conflicts with EVID-001.',
        type: 'DOCUMENT', classification: 'RESTRICTED', condition: 'NORMAL',
        content: { detail: 'Routine maintenance log for sector C.', log_entry: '03:00 — Normal patrol', timestamp: '2026-10-02T03:00:00Z', location: 'SECTOR C / MAINTENANCE', contradiction: 'TIMESTAMP CONFLICTS WITH EVID-001 (17:22:03Z)' },
        metadata: { source: 'P06b', case: '037', contradiction: 'EVID-001' },
      },
      {
        id: 'dev-ev-013', code: 'QR-NODE-QR01', title: 'QR Field Marker — P01', description: 'Physical QR marker recovered from North Entrance.',
        type: 'QR', classification: 'RESTRICTED', condition: 'NORMAL',
        content: { qr_code: 'NX|V1|LOC-001', qr_label: 'NORTH ENTRANCE', node_code: 'P01', location: 'NORTH ENTRANCE / LOBBY', scan_status: 'VERIFIED' },
        metadata: { source: 'QR-SCAN', case: '037' },
      },
    ],
    inventoryItems: [
      {
        id: 'dev-inv-001', code: 'ITEM-001', name: 'Digital Lockpick', description: 'A tool for bypassing electronic locks.',
        type: 'DEVICE', rarity: 'RARE', properties: { weight: 0.2, uses_remaining: 3 }, uses: [], metadata: { source: 'P03' },
      },
      {
        id: 'dev-inv-002', code: 'ITEM-002', name: 'Evidence Marker', description: 'Physical tag for marking evidence items on the table.',
        type: 'TOOL', rarity: 'COMMON', properties: { color: 'RED', qty: 12 }, uses: [], metadata: {},
      },
    ],
    fragments: [
      {
        id: 'dev-frag-001', code: 'FRAG-001', label: 'Fragment Alpha', content: 'The signal originates from the old comms array...',
        type: 'AUDIO', role: 'ANALYST', node_id: 'node-p05', position: 1, metadata: { source: 'P05', condition: 'PARTIAL' },
      },
      {
        id: 'dev-frag-002', code: 'FRAG-002', label: 'Fragment Beta', content: 'Coordinates converge at the NEXUS CORE.',
        type: 'TEXT', role: 'OPERATOR', node_id: 'node-p07b', position: 2, metadata: { source: 'P07b', condition: 'PARTIAL' },
      },
    ],
    nodes: [
      { id: 'node-p01', code: 'P01', title: 'The Facade', location: '[ADMIN BUILDING] — Main Entrance Facade' },
      { id: 'node-p02', code: 'P02', title: 'The Clock', location: '[ADMIN BUILDING] — Lobby Clock Tower' },
      { id: 'node-p03', code: 'P03', title: 'The Facade Pin', location: '[ADMIN BUILDING] — Facade Base Terminal' },
      { id: 'node-p05', code: 'P05', title: 'The Third Figure', location: '[ADMIN BUILDING] — Archive Figure Display' },
      { id: 'node-p06b', code: 'P06b', title: 'Time Remaining', location: '[SCIENCE BUILDING] — Lab Wall Clock' },
      { id: 'node-p07b', code: 'P07b', title: 'The Network', location: '[SCIENCE BUILDING] — Lab Network Diagram' },
      { id: 'node-m01', code: 'M01', title: 'The First Lock', location: '[ADMIN BUILDING] — Central Archive' },
      { id: 'node-m02', code: 'M02', title: 'Memory Transfer', location: '[SCIENCE BUILDING] — Memory Lab' },
    ],
  }
}

