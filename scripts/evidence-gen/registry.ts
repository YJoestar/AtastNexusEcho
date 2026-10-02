/**
 * Evidence asset registry + content lock.
 *
 *   npx vite-node scripts/evidence-gen/registry.ts          write the registry
 *   npx vite-node scripts/evidence-gen/registry.ts --check  fail if canonical content drifted
 *
 * The registry records, per record, what the asset is, how it is rendered, the
 * canonical facts that must never change in a visual regeneration, and the
 * clues derived from the relationships the case already declares. The content
 * lock is a hash of those canonical facts: regenerate every pixel you like, the
 * hash must not move.
 */
import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { GENERATED_ASSETS } from '../../src/lib/evidence/assetLibrary.generated'
import { clueCategory, deriveClues } from '../../src/lib/evidence/clues'
import type { CaseArtifact } from '../../src/features/player/evidence/types'

const ROOT = join(__dirname, '..', '..')
const JSON_PATH = join(ROOT, 'docs', 'evidence', 'asset-registry.json')
const MD_PATH = join(ROOT, 'EVIDENCE_ASSET_REGISTRY.md')

/** What the renderer does for each medium. Mirrors scripts/evidence-gen/lib. */
const MEDIUM_TREATMENT: Record<string, string> = {
  PHOTOGRAPH: 'Software-rendered room → lens, flash, sensor noise, grain → print border, caption strip, evidence label',
  SURVEILLANCE: 'Software-rendered room → low-res CCD treatment, compression blocks, interlace, tracking tear → on-screen display (camera, REC, date/time, frame counter)',
  DOCUMENT: 'Typeset form on paper stock → ink variation, photocopy/carbon artefacts, stamps and redaction',
  NOTE: 'Handwritten/typed sheet on paper stock',
  MAP: 'Plan drawing on paper stock',
  PERSONNEL: 'Issued card/file layout on card stock',
  FRAGMENT: 'Torn/partial sheet with damage masks',
  AUDIO: 'Recording log card with waveform',
}

/** Reviewed by eye after the renderer fix (see ARCHITECTURE_NOTES.md). */
const QA_NOTES: Record<string, string> = {
  'NX-037-B-05': 'Bright lab, slightly high key. Accepted.',
  'NX-037-B-07': 'Blown out by design: the case calls it the rejected frame.',
  'NX-CAM-06': 'Near-black by design: the camera was not transmitting.',
}

/** Media types whose contact sheets were actually looked at after the renderer fix. */
const REVIEWED_BY_EYE = new Set(['PHOTOGRAPH', 'SURVEILLANCE', 'DOCUMENT'])

function toArtifact(asset: (typeof GENERATED_ASSETS)[number]): CaseArtifact {
  return {
    id: `evidence:${asset.code}`, code: asset.code, title: asset.title, description: asset.description,
    type: asset.type, source: 'EVIDENCE', content: { captured_at: asset.capturedAt },
    location: asset.location, acquiredAt: asset.acquiredAt, relationships: asset.relationships,
  }
}

function canonical(asset: (typeof GENERATED_ASSETS)[number]) {
  return {
    code: asset.code, type: asset.type, title: asset.title, description: asset.description,
    location: asset.location, device: asset.device, capturedAt: asset.capturedAt,
    acquiredAt: asset.acquiredAt, source: asset.source, integrity: asset.integrity,
    condition: asset.condition, state: asset.state,
    relationships: [...asset.relationships].sort((a, b) => `${a.to}${a.kind}`.localeCompare(`${b.to}${b.kind}`)),
  }
}

const lock = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)

const clues = deriveClues(GENERATED_ASSETS.map(toArtifact))

const entries = GENERATED_ASSETS.map(asset => {
  const file = join(ROOT, 'public', asset.image)
  const mine = clues.filter(clue => clue.evidence.includes(asset.code))
  return {
    id: asset.code,
    type: asset.type,
    asset: asset.image,
    thumb: asset.thumb,
    bytes: statSync(file).size,
    condition: asset.condition,
    treatment: MEDIUM_TREATMENT[asset.type] ?? 'unspecified',
    contentLock: lock(canonical(asset)),
    canonical: {
      title: asset.title, location: asset.location, capturedAt: asset.capturedAt, device: asset.device,
      source: asset.source, description: asset.description,
    },
    clues: mine.map(clue => ({
      id: clue.id, category: clue.category, method: clue.method, difficulty: clue.difficulty,
      with: clue.evidence.find(code => code !== asset.code), meaning: clue.meaning,
    })),
    generation: 'procedural (scripts/evidence-gen), renderer fix 2026-10',
    qa: QA_NOTES[asset.code]
      ?? (REVIEWED_BY_EYE.has(asset.type) ? 'Build QA clean; seen on a contact sheet.' : 'Build QA clean; not individually reviewed by eye.'),
  }
})

const output = { case: 'NX-037', generated: 'deterministic', entries }

if (process.argv.includes('--check')) {
  const saved = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as typeof output
  const savedLocks = new Map(saved.entries.map(entry => [entry.id, entry.contentLock]))
  const drift = entries.filter(entry => savedLocks.get(entry.id) !== entry.contentLock).map(entry => entry.id)
  const missing = saved.entries.filter(entry => !entries.some(now => now.id === entry.id)).map(entry => entry.id)
  if (drift.length || missing.length) {
    console.error(`CONTENT LOCK FAILED. Changed: ${drift.join(', ') || '-'}  Missing: ${missing.join(', ') || '-'}`)
    process.exit(1)
  }
  console.log(`content lock holds for ${entries.length} records`)
  process.exit(0)
}

writeFileSync(JSON_PATH, JSON.stringify(output, null, 2) + '\n')

const byDifficulty = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'].map(level => `${level}: ${clues.filter(clue => clue.difficulty === level).length}`).join(' · ')
const byCategory = Array.from(new Set(clues.map(clue => clue.category)))
  .map(category => `${category}: ${clues.filter(clue => clue.category === category).length}`).join(' · ')

const md = [
  '# NEXUS ECHO — Evidence asset registry (CASE NX-037)',
  '',
  'Generated by `npx vite-node scripts/evidence-gen/registry.ts`. Do not edit by hand.',
  'Machine-readable copy: `docs/evidence/asset-registry.json`. **Not** under `public/`: it lists the clues.',
  '',
  '## Content lock',
  '',
  'Each record carries a hash of its canonical facts (title, description, location, device, times, source, integrity, condition, state, relationships). A visual regeneration may change pixels freely; the hash must not move. `npx vite-node scripts/evidence-gen/registry.ts --check` fails if it does.',
  '',
  '## Clue layers',
  '',
  `${clues.length} clues, all derived from relationships the case data already declares. Nothing is invented; the text a player sees on discovery is the relationship's own note.`,
  '',
  `By difficulty — ${byDifficulty}`,
  '',
  `By category — ${byCategory}`,
  '',
  '| Relation kind | Category | Method | Difficulty |',
  '|---|---|---|---|',
  ...['SOURCE', 'SPATIAL', 'PERSONNEL', 'REFERENCE', 'TEMPORAL', 'CONTRADICTION'].map(kind => {
    const sample = clues.find(clue => clue.sourceKind === kind)
    return `| ${kind} | ${clueCategory(kind)} | ${sample?.method ?? '—'} | ${sample?.difficulty ?? '—'} |`
  }),
  '',
  'Timeline-method clues (a TEMPORAL or CONTRADICTION relation between two records that both carry a readable time) appear only when the player lines the two times up. Every other clue appears when the pair is compared.',
  '',
  '## Records',
  '',
  '| ID | Type | Asset | Condition | Lock | Clues | QA |',
  '|---|---|---|---|---|---|---|',
  ...entries.map(entry => `| ${entry.id} | ${entry.type} | \`${entry.asset.replace('/evidence/', '')}\` | ${entry.condition} | \`${entry.contentLock}\` | ${entry.clues.length} | ${entry.qa} |`),
  '',
  '## Per-record clue detail',
  '',
  ...entries.filter(entry => entry.clues.length > 0).flatMap(entry => [
    `### ${entry.id} — ${entry.canonical.title}`,
    `*${entry.treatment}*`,
    '',
    ...entry.clues.map(clue => `- **${clue.category}** (${clue.difficulty}, ${clue.method}) with \`${clue.with}\`: ${clue.meaning}`),
    '',
  ]),
].join('\n')

writeFileSync(MD_PATH, md + '\n')
console.log(`registry written: ${entries.length} records, ${clues.length} clues`)
