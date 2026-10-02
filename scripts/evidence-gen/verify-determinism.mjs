// Confirm the build is reproducible: render every artifact twice and compare
// byte-for-byte. A pipeline whose output shifts between runs cannot be used as
// evidence art, because a "damaged" file that is differently damaged each time
// is indistinguishable from a bug.
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { ARTIFACT_REGISTRY } from './library.mjs'
import { composePhotograph, composeSurveillance } from './lib/photo.mjs'
import {
  composeDocument, composeFragment, composeMap, composePersonnel, composeNote, composeWaveform,
} from './lib/paper.mjs'

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

function hashSeed(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 100000
}

const digest = buffer => createHash('sha256').update(buffer).digest('hex').slice(0, 16)

let unstable = 0
let checked = 0

for (const raw of ARTIFACT_REGISTRY) {
  const compose = COMPOSERS[raw.type]
  const seed = typeof raw.seed === 'number'
    ? raw.seed
    : hashSeed(raw.type === 'AUDIO' ? `audio:${raw.asset}` : raw.asset)
  const first = await compose({ ...raw, seed })
  const second = await compose({ ...raw, seed })
  const a = digest(first.full)
  const b = digest(second.full)
  checked += 1
  if (a !== b) {
    unstable += 1
    console.log(`UNSTABLE ${raw.code} ${a} != ${b}`)
  }

  const meta = await sharp(first.full).metadata()
  if (!meta.width || !meta.height) console.log(`NO DIMENSIONS ${raw.code}`)
}

console.log(`\n${checked} artifacts checked, ${unstable} unstable`)
process.exitCode = unstable ? 1 : 0