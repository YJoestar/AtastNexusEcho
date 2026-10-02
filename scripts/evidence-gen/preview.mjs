// Print an ASCII luminance map of generated artifacts so composition and
// geometry can be checked without an image-capable viewer.
//
//   node scripts/evidence-gen/preview.mjs                    all, one per type
//   node scripts/evidence-gen/preview.mjs NX-037-B-01 NX-037-D-01
//
import { readFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyze } from './lib/qa.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const manifest = JSON.parse(await readFile(join(ROOT, 'public', 'evidence', 'manifest.json'), 'utf8'))

const codes = process.argv.slice(2)
let targets = manifest.artifacts
if (codes.length) {
  const wanted = new Set(codes.map((c) => c.toUpperCase()))
  targets = manifest.artifacts.filter((a) => wanted.has(a.code.toUpperCase()))
  if (!targets.length) {
    console.log(`no match for ${codes.join(', ')}`)
    process.exit(1)
  }
} else {
  const seen = new Set()
  targets = manifest.artifacts.filter((a) => (seen.has(a.type) ? false : (seen.add(a.type), true)))
}

for (const asset of targets) {
  const stats = await analyze(join(ROOT, 'public', asset.image.replace(/^\//, '')))
  console.log(`\n${asset.code}  ${asset.type}  ${asset.condition}/${asset.state}`)
  console.log(`  ${asset.title}`)
  console.log(`  ${asset.width ?? ''}${stats.width}x${stats.height}  mean ${stats.mean.toFixed(3)}  std ${stats.std.toFixed(3)}  clip ${(stats.clip * 100).toFixed(1)}%`)
  console.log(stats.preview)
}