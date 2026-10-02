// Text preview + statistics. Used to verify generated artifacts without an
// image-capable viewer: an ASCII luminance map shows composition and geometry,
// and the statistics catch the failure modes that matter (all-black frames,
// blown highlights, no tonal range).
import sharp from 'sharp'

const RAMP = ' .:-=+*#%@'

export async function analyze(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const lum = new Float32Array(width * height)
  let sum = 0
  let min = 1
  let max = 0
  const hist = new Array(16).fill(0)
  let clipped = 0
  for (let i = 0, p = 0; i < data.length; i += channels, p++) {
    const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
    lum[p] = l
    sum += l
    if (l < min) min = l
    if (l > max) max = l
    if (l > 0.995) clipped++
    hist[Math.min(15, Math.floor(l * 16))]++
  }
  const mean = sum / lum.length
  let variance = 0
  for (let i = 0; i < lum.length; i++) variance += (lum[i] - mean) ** 2
  variance /= lum.length
  const std = Math.sqrt(variance)

  const cols = 78
  const rows = Math.max(8, Math.round((cols * height) / width / 2.1))
  const lines = []
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * width) / cols)
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * width) / cols))
      const y0 = Math.floor((r * height) / rows)
      const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * height) / rows))
      let acc = 0
      let n = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) { acc += lum[y * width + x]; n++ }
      }
      const l = acc / n
      line += RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.round(l * (RAMP.length - 1))))]
    }
    lines.push(line)
  }

  return {
    width,
    height,
    mean,
    std,
    min,
    max,
    clip: clipped / lum.length,
    histogram: hist.map(h => h / lum.length),
    preview: lines.join('\n'),
  }
}

/**
 * What a correct artifact of each medium looks like. A corridor photograph in a
 * dim building is dark; a sheet of office paper is bright. Judging both against
 * one threshold flags every document as overexposed and every scene as black, so
 * each profile states its own expected range.
 */
export const PROFILES = {
  scene: { meanMin: 0.03, meanMax: 0.62, stdMin: 0.05, clipMax: 0.2 },
  paper: { meanMin: 0.3, meanMax: 0.93, stdMin: 0.03, clipMax: 0.5 },
  audio: { meanMin: 0.02, meanMax: 0.45, stdMin: 0.05, clipMax: 0.2 },
}

export function defects(stats, profileName = 'scene') {
  const profile = PROFILES[profileName] ?? PROFILES.scene
  const found = []
  if (stats.mean < 0.015) found.push('NEARLY BLACK')
  else if (stats.mean < profile.meanMin) found.push('TOO DARK FOR MEDIUM')
  if (stats.mean > 0.97) found.push('BLOWN')
  else if (stats.mean > profile.meanMax) found.push('TOO BRIGHT FOR MEDIUM')
  if (stats.std < profile.stdMin) found.push('FLAT / NO STRUCTURE')
  if (stats.clip > profile.clipMax) found.push(`CLIPPED ${(stats.clip * 100).toFixed(0)}%`)
  if (stats.max - stats.min < 0.1) found.push('NO DYNAMIC RANGE')
  return found
}

export function report(name, stats, profileName = 'scene') {
  const pct = v => `${(v * 100).toFixed(1)}%`
  return [
    `── ${name}  ${stats.width}x${stats.height}  [${profileName}]`,
    `   mean ${stats.mean.toFixed(3)}  std ${stats.std.toFixed(3)}  min ${stats.min.toFixed(2)}  max ${stats.max.toFixed(2)}  clip ${pct(stats.clip)}  ${defects(stats, profileName).join(' ')}`,
    `   hist ${stats.histogram.map(v => pct(v).padStart(5)).join('')}`,
    stats.preview,
  ].join('\n')
}
