// ASCII preview averages away 12px type, so a typed page can look blank even
// when it is full of text. This measures ink coverage instead: the fraction of
// pixels dark enough to be type, ruling or stamp, per horizontal band.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const manifest = JSON.parse(await readFile(join(ROOT, 'public', 'evidence', 'manifest.json'), 'utf8'))

const codes = process.argv.slice(2)
const wanted = codes.length
  ? new Set(codes.map((c) => c.toUpperCase()))
  : new Set(manifest.artifacts.filter((a) => a.type !== 'PHOTOGRAPH' && a.type !== 'SURVEILLANCE').map((a) => a.code))

const targets = manifest.artifacts.filter((a) => wanted.has(a.code.toUpperCase()))

console.log('code          type       ink%   bands(12) dark-per-band')
for (const asset of targets) {
  const path = join(ROOT, 'public', asset.image.replace(/^\//, ''))
  // Artifacts with an irregular silhouette (fragments) are stored with the area
  // outside the shape transparent. Measure ink on the sheet it sits on, not on
  // the empty surround, or every fragment reads as 40% black.
  const { data, info } = await sharp(path)
    .flatten({ background: '#f4f1e8' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  let ink = 0
  const bands = 12
  const bandInk = new Array(bands).fill(0)
  const bandPixels = new Array(bands).fill(0)
  for (let y = 0; y < height; y++) {
    const band = Math.min(bands - 1, Math.floor((y / height) * bands))
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
      bandPixels[band]++
      if (l < 0.55) { ink++; bandInk[band]++ }
    }
  }
  const pct = (ink / (width * height)) * 100
  const bars = bandInk.map((n, b) => {
    const f = n / Math.max(1, bandPixels[b])
    return f > 0.001 ? String(Math.min(9, Math.round(f * 100))) : '.'
  }).join('')
  console.log(`${asset.code.padEnd(14)}${asset.type.padEnd(11)}${pct.toFixed(2).padStart(5)}  ${bars}`)
}