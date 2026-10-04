#!/usr/bin/env node
// Offline evidence build.
//
//   node scripts/evidence-gen/build.mjs [--only code,code] [--force] [--no-qa]
//
// Reads the CASE NX-037 registry, renders every artifact locally with sharp,
// writes JPEGs plus thumbnails under public/evidence/, emits a manifest for the
// asset pipeline, and generates the typed client catalog the app imports.
//
// No network access, no external image assets. Output is deterministic: the
// same registry always produces byte-identical files.

import { mkdir, writeFile, readFile, rm, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import './lib/fontenv.mjs'
import {
  ARTIFACT_REGISTRY, ENVELOPES, CASE, PERSONNEL_ROSTER, LOCATION_CODES,
} from './library.mjs'
import { composePhotograph, composeSurveillance } from './lib/photo.mjs'
import {
  composeDocument, composeFragment, composeMap, composePersonnel, composeNote, composeWaveform,
} from './lib/paper.mjs'
import { analyze, defects, PROFILES } from './lib/qa.mjs'

/** Which medium each type is judged against. */
const PROFILE = {
  PHOTOGRAPH: 'scene',
  SURVEILLANCE: 'scene',
  FRAGMENT: 'scene',
  DOCUMENT: 'paper',
  MAP: 'paper',
  NOTE: 'paper',
  PERSONNEL: 'paper',
  AUDIO: 'audio',
}
void PROFILES

/**
 * Artifacts whose whole point is that they carry almost no image. CAM-06 is a
 * camera that was not transmitting: the frame is nearly black by design, and
 * flagging it every build would train us to ignore the QA output.
 */
const EXPECTED = {
  'NX-CAM-06': ['FLAT / NO STRUCTURE', 'TOO DARK FOR MEDIUM'],
}

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..')
const OUT = join(ROOT, 'public', 'evidence')
const THUMBS = join(OUT, 'thumb')
const CATALOG = join(ROOT, 'src', 'lib', 'evidence', 'assetLibrary.generated.ts')

const args = process.argv.slice(2)
const only = argValue('--only')
const force = args.includes('--force')
const runQa = !args.includes('--no-qa')

function argValue(flag) {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : null
}

/** Stable 32-bit hash so specs without an explicit seed still reproduce. */
function hashSeed(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 100000
}

const COMPOSERS = {
  PHOTOGRAPH: composePhotograph,
  SURVEILLANCE: composeSurveillance,
  DOCUMENT: composeDocument,
  FRAGMENT: composeFragment,
  MAP: composeMap,
  PERSONNEL: composePersonnel,
  NOTE: composeNote,
  AUDIO: composeWaveform,
}

const FOLDER = {
  PHOTOGRAPH: 'photographs',
  SURVEILLANCE: 'surveillance',
  DOCUMENT: 'documents',
  FRAGMENT: 'fragments',
  MAP: 'maps',
  PERSONNEL: 'personnel',
  NOTE: 'notes',
  AUDIO: 'audio',
}

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(join(OUT, 'manifest.json'), 'utf8'))
  } catch {
    return null
  }
}

function countTypes(list, damaged) {
  const counts = {}
  for (const item of list) counts[item.type] = (counts[item.type] ?? 0) + 1
  return {
    ...counts,
    DAMAGED: list.filter((a) => a.condition && a.condition !== 'NORMAL').length || damaged,
    TOTAL: list.length,
  }
}

/**
 * Resolve every artifact into `{ spec, compose }` with a guaranteed seed.
 * Audio waveforms get their own seed salt so they never mirror a note.
 */
function plan() {
  const selected = only
    ? new Set(only.split(',').map((s) => s.trim()).filter(Boolean))
    : null
  const jobs = []
  const problems = []

  for (const raw of ARTIFACT_REGISTRY) {
    if (selected && !selected.has(raw.code) && !selected.has(raw.asset)) continue
    const compose = COMPOSERS[raw.type]
    if (!compose) {
      problems.push(`${raw.code}: no composer for type ${raw.type}`)
      continue
    }
    const seed = typeof raw.seed === 'number'
      ? raw.seed
      : hashSeed(raw.type === 'AUDIO' ? `audio:${raw.asset}` : raw.asset)
    jobs.push({ raw, seed, compose })
  }

  // Relationship integrity: an edge to a code that does not exist is a hole in
  // the case, not a decoration.
  const codes = new Set(ARTIFACT_REGISTRY.map((a) => a.code))
  for (const raw of ARTIFACT_REGISTRY) {
    for (const rel of raw.relationships ?? []) {
      if (!codes.has(rel.to)) problems.push(`${raw.code}: relationship -> missing ${rel.to}`)
    }
  }

  const required = { ...CASE.requirements }
  const counts = {}
  for (const raw of ARTIFACT_REGISTRY) counts[raw.type] = (counts[raw.type] ?? 0) + 1
  for (const [type, min] of Object.entries(required)) {
    if ((counts[type] ?? 0) < min) problems.push(`coverage: ${type} has ${counts[type] ?? 0}, needs ${min}`)
  }
  const damaged = ARTIFACT_REGISTRY.filter((a) => a.condition && a.condition !== 'NORMAL').length
  if (damaged < 5) problems.push(`coverage: only ${damaged} damaged artifacts, needs 5`)

  return { jobs, problems, counts, damaged }
}

async function run() {
  const started = Date.now()
  const { jobs, problems, counts, damaged } = plan()
  const selected = Boolean(only)

  console.log(`CASE ${CASE.id} — ${jobs.length} artifacts`)
  console.log(`  ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join('  ')}`)
  console.log(`  damaged ${damaged}`)

  if (problems.length) {
    console.log('\nregistry problems:')
    for (const p of problems) console.log(`  ! ${p}`)
  }

  if (!jobs.length) {
    console.log('nothing selected')
    return
  }

  if (force) {
    for (const dir of [OUT, THUMBS]) {
      if (await exists(dir)) await rm(dir, { recursive: true, force: true })
    }
  }
  await mkdir(OUT, { recursive: true })
  await mkdir(THUMBS, { recursive: true })

  const entries = []
  const failures = []
  const warnings = []
  let index = 0

  for (const { raw, seed, compose } of jobs) {
    index += 1
    const folder = FOLDER[raw.type]
    const dir = join(OUT, folder)
    await mkdir(dir, { recursive: true })

    const spec = { ...raw, seed }
    const label = `[${String(index).padStart(2, '0')}/${jobs.length}] ${raw.code}`
    try {
      const result = await compose(spec)
      if (!result?.full?.length) throw new Error('composer returned no image buffer')

      const fullPath = join(dir, `${raw.asset}.jpg`)
      const thumbPath = join(THUMBS, `${raw.asset}.jpg`)
      await writeFile(fullPath, result.full)
      if (result.thumb?.length) await writeFile(thumbPath, result.thumb)

      const rel = `evidence/${folder}/${raw.asset}.jpg`
      const relThumb = result.thumb?.length ? `evidence/thumb/${raw.asset}.jpg` : null

      if (runQa) {
        const stats = await analyze(result.full)
        const found = defects(stats, PROFILE[raw.type] ?? 'scene')
        const expected = EXPECTED[raw.code] ?? []
        const unexpected = found.filter(d => !expected.includes(d))
        const acknowledged = found.filter(d => expected.includes(d))
        if (unexpected.length) {
          warnings.push(`${raw.code}: ${unexpected.join(', ')} — mean ${stats.mean.toFixed(3)} std ${stats.std.toFixed(3)} clip ${(stats.clip * 100).toFixed(0)}%`)
        }
        if (acknowledged.length && only) {
          console.log(`  = ${raw.code}: ${acknowledged.join(', ')} (expected for this artifact)`)
        }
      }

      entries.push({
        code: raw.code,
        asset: raw.asset,
        type: raw.type,
        condition: raw.condition ?? 'NORMAL',
        state: raw.state ?? 'UNREVIEWED',
        title: raw.title,
        description: raw.description ?? '',
        location: raw.location ?? null,
        device: raw.device ?? null,
        capturedAt: raw.capturedAt ?? null,
        acquiredAt: raw.acquiredAt ?? null,
        integrity: raw.integrity ?? null,
        source: raw.source ?? null,
        duration: raw.duration ?? null,
        seed,
        image: `/${rel}`,
        thumb: relThumb ? `/${relThumb}` : null,
        relationships: (raw.relationships ?? []).map((r) => ({ to: r.to, kind: r.kind, note: r.note })),
      })

      console.log(`${label} ok -> ${rel}`)
    } catch (error) {
      failures.push(`${raw.code}: ${error.message}`)
      console.log(`${label} FAILED ${error.message}`)
    }
  }

  // A partial run must not shrink the register: merge into what is already
  // written so `--only` can iterate on one artifact without losing the set.
  const merged = new Map()
  if (selected) {
    const previous = await readManifest()
    for (const entry of previous?.artifacts ?? []) merged.set(entry.code, entry)
  }
  for (const entry of entries) merged.set(entry.code, entry)
  const all = [...merged.values()]

  const manifest = {
    case: CASE.id,
    generatedBy: 'scripts/evidence-gen/build.mjs',
    generatorVersion: '1.0.0',
    counts: countTypes(all, damaged),
    personnel: PERSONNEL_ROSTER,
    locations: LOCATION_CODES,
    artifacts: all,
  }
  await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`\nmanifest -> evidence/manifest.json (${all.length} artifacts${selected ? `, ${entries.length} rendered this run` : ''})`)

  await writeCatalog(all, manifest)

  if (warnings.length) {
    console.log('\nqa warnings:')
    for (const w of warnings) console.log(`  ~ ${w}`)
  }
  if (problems.length) {
    console.log('\nregistry problems (see above):')
    console.log(`  ${problems.length} unresolved`)
  }
  if (failures.length) {
    console.log('\nfailures:')
    for (const f of failures) console.log(`  x ${f}`)
    process.exitCode = 1
  }

  console.log(`\ndone in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

function ts(value) {
  return JSON.stringify(value)
}

async function writeCatalog(entries, manifest) {
  const rows = entries.map((e) => [
    `  {`,
    `    code: ${ts(e.code)},`,
    `    asset: ${ts(e.asset)},`,
    `    type: ${ts(e.type)},`,
    `    condition: ${ts(e.condition)},`,
    `    state: ${ts(e.state)},`,
    `    title: ${ts(e.title)},`,
    `    description: ${ts(e.description)},`,
    `    image: ${ts(e.image)},`,
    `    thumb: ${ts(e.thumb)},`,
    `    location: ${ts(e.location)},`,
    `    device: ${ts(e.device)},`,
    `    capturedAt: ${ts(e.capturedAt)},`,
    `    acquiredAt: ${ts(e.acquiredAt)},`,
    `    integrity: ${ts(e.integrity)},`,
    `    source: ${ts(e.source)},`,
    `    duration: ${ts(e.duration)},`,
    `    seed: ${e.seed},`,
    `    relationships: [`,
    ...e.relationships.map((r) => `      { to: ${ts(r.to)}, kind: ${ts(r.kind)}, note: ${ts(r.note)} },`),
    `    ],`,
    `  },`,
  ].join('\n')).join('\n')

  const source = `// GENERATED FILE — do not edit by hand.
// Rebuild with: node scripts/evidence-gen/build.mjs
//
// Every artifact below is rendered locally from scripts/evidence-gen/library.mjs
// and written to public/evidence/. The images are the artifact; this file is only
// the index the app uses to reach them.

export type AssetType =
  | 'PHOTOGRAPH'
  | 'SURVEILLANCE'
  | 'DOCUMENT'
  | 'FRAGMENT'
  | 'MAP'
  | 'PERSONNEL'
  | 'NOTE'
  | 'AUDIO'

export type AssetRelationshipKind =
  | 'REFERENCE'
  | 'PERSONNEL'
  | 'SOURCE'
  | 'TEMPORAL'
  | 'SPATIAL'
  | 'CONTRADICTION'
  | 'SUPPORTS'

export interface AssetRelationship {
  to: string
  kind: AssetRelationshipKind
  note: string
}

export interface GeneratedAsset {
  code: string
  asset: string
  type: AssetType
  condition: string
  state: string
  title: string
  description: string
  image: string
  thumb: string | null
  location: string | null
  device: string | null
  capturedAt: string | null
  acquiredAt: string | null
  integrity: string | null
  source: string | null
  duration: string | null
  seed: number
  relationships: AssetRelationship[]
}

export const GENERATED_ASSET_MANIFEST = ${JSON.stringify({
    case: manifest.case,
    generatorVersion: manifest.generatorVersion,
    counts: manifest.counts,
  }, null, 2).replace(/\n/g, '\n')}

export const GENERATED_ASSETS: GeneratedAsset[] = [
${rows}
]

const BY_CODE = new Map(GENERATED_ASSETS.map((a) => [a.code, a]))

export function generatedAsset(code: string): GeneratedAsset | undefined {
  return BY_CODE.get(code)
}

export function generatedAssetsOfType(type: AssetType): GeneratedAsset[] {
  return GENERATED_ASSETS.filter((a) => a.type === type)
}

export function generatedAssetCounts(): Record<string, number> {
  return GENERATED_ASSETS.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1
    return acc
  }, {})
}
`
  await mkdir(dirname(CATALOG), { recursive: true })
  await writeFile(CATALOG, source, 'utf8')
  console.log(`catalog -> ${CATALOG.replace(ROOT, '.')}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

void ENVELOPES