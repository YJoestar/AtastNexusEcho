// Institutional paperwork. The documents in this case are not generic text: they
// carry letterheads, control numbers, revision blocks, distribution lists,
// signatures, carbon copies and redactions, because that is what a bureau file
// from 1974-2026 actually looks like.

import { makeRng, makeNoise1d } from './rng.mjs'
import { esc, stamp } from './print.mjs'
import { HAND_FAMILY, HAND_METRICS } from './fontenv.mjs'

const MONO = "'Courier New',Courier,monospace"
const SERIF = "'Times New Roman',Times,serif"
const SANS = "'Arial Narrow',Arial,Helvetica,sans-serif"

export const FONTS = { MONO, SERIF, SANS }

/** Word-wrap a paragraph to a monospace column width. */
export function wrapMono(text, columns) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    if (line.length + word.length + 1 > columns && line.length) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Justified monospace block: the typed form with the ragged edge of a typewriter. */
export function typeBlock(lines, { x, y, columns, size = 12.5, leading = 17, color = '#2a2620', jitter = 0.35, seed = 1, family = MONO, weight = 'normal' } = {}) {
  const rng = makeRng(seed)
  const noise = makeNoise1d(seed + 7, 2)
  const parts = []
  lines.forEach((line, i) => {
    const jx = (rng() - 0.5) * jitter + noise(i * 0.5) * jitter * 0.6
    const jy = (rng() - 0.5) * jitter * 0.5
    // Ribbon strike: occasional weak characters, as on a tired print wheel.
    const opacity = 0.72 + noise(i * 1.7) * 0.22
    parts.push(`<text x="${(x + jx).toFixed(2)}" y="${(y + i * leading + jy).toFixed(2)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" opacity="${opacity.toFixed(2)}" xml:space="preserve">${esc(line)}</text>`)
  })
  void columns
  return parts.join('')
}

export function paragraph(text, { x, y, width, size = 13, leading = 18, color = '#2a2620', family = SERIF, seed = 1 } = {}) {
  const columns = Math.max(20, Math.floor(width / (size * 0.52)))
  const lines = wrapMono(text, columns)
  return typeBlock(lines, { x, y, columns, size, leading, color, family, jitter: 0.2, seed, weight: 'normal' })
}

/** Form field row: a label, a rule, and a value written on the rule. */
export function fieldRow({ x, y, width, label, value, size = 9.5, rule = true, valueColor = '#241f19', labelColor = '#5c5546', underlineValue = true, seed = 1 }) {
  const rng = makeRng(seed)
  const parts = []
  parts.push(`<text x="${x}" y="${y}" font-family="${SANS}" font-size="${size}" letter-spacing="1.1" fill="${labelColor}">${esc(label.toUpperCase())}</text>`)
  if (value !== undefined && value !== null && value !== '') {
    const valueX = x + Math.min(width * 0.46, label.length * 7 + 12)
    parts.push(`<text x="${valueX.toFixed(1)}" y="${y}" font-family="${MONO}" font-size="${size + 1.5}" letter-spacing="0.4" fill="${valueColor}">${esc(String(value))}</text>`)
    if (underlineValue) {
      const w = String(value).length * (size + 1.5) * 0.62
      parts.push(`<line x1="${valueX - 2}" y1="${y + 3.5}" x2="${(valueX + w).toFixed(1)}" y2="${y + 3.5}" stroke="#4a4437" stroke-width="0.6" stroke-opacity="0.7"/>`)
    }
  } else if (rule) {
    const startX = x + Math.min(width * 0.46, label.length * 7 + 12)
    parts.push(`<line x1="${startX}" y1="${y + 3.5}" x2="${x + width}" y2="${y + 3.5}" stroke="#7d7461" stroke-width="0.6" stroke-dasharray="2 3"/>`)
  }
  void rng
  return parts.join('')
}

export function rule(x1, y, x2, { color = '#6f6653', width = 0.7, dash = null, opacity = 1 } = {}) {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="${opacity}"/>`
}

export function boxedTable({ x, y, width, rows, rowHeight = 20, columns = [], size = 9.5, headerFill = 'rgba(60,54,42,0.10)', zebra = true, seed = 1 }) {
  const rng = makeRng(seed)
  const parts = []
  const cols = columns.length
  const colWidth = width / cols
  rows.forEach((row, r) => {
    const ry = y + r * rowHeight
    if (r === 0) parts.push(`<rect x="${x}" y="${ry}" width="${width}" height="${rowHeight}" fill="${headerFill}"/>`)
    else if (zebra && r % 2 === 0) parts.push(`<rect x="${x}" y="${ry}" width="${width}" height="${rowHeight}" fill="rgba(80,72,56,0.045)"/>`)
    parts.push(rule(x, ry + rowHeight, x + width, { color: '#6f6653', width: 0.5, opacity: 0.8 }))
    row.forEach((cell, c) => {
      const cx = x + c * colWidth + 6
      const cy = ry + rowHeight * 0.68
      const isHeader = r === 0
      parts.push(`<text x="${cx}" y="${cy}" font-family="${isHeader ? SANS : MONO}" font-size="${isHeader ? size - 0.5 : size + 0.5}" letter-spacing="${isHeader ? 1 : 0.3}" fill="${isHeader ? '#4a4437' : '#241f19'}" opacity="${isHeader ? 0.95 : 0.9}">${esc(String(cell))}</text>`)
    })
    void rng
  })
  for (let c = 0; c < cols; c++) {
    parts.push(`<line x1="${x + c * colWidth}" y1="${y}" x2="${x + c * colWidth}" y2="${y + rows.length * rowHeight}" stroke="#6f6653" stroke-width="0.4" stroke-opacity="0.5"/>`)
  }
  return parts.join('')
}

const HAND_SCALE = 1.42 // Caveat has a small x-height; this makes `size` read like the old stack

/** Advance width of `text` in the hand face at `size` (px), before per-letter variation. */
export function handWidth(text, size) {
  const { unitsPerEm, advance } = HAND_METRICS
  let w = 0
  for (const ch of text) w += ((advance[ch] ?? 420) / unitsPerEm) * size * HAND_SCALE
  return w
}

/**
 * Ballpoint hand: the vendored Caveat face, set glyph by glyph on its real
 * advance widths, with a slow baseline drift across the line, a slight slant,
 * per-letter wobble and size, and ink pressure that swells and fades by word.
 */
export function handwriting(text, { x, y, size = 15, color = '#232a3a', seed = 1, family = HAND_FAMILY } = {}) {
  const rng = makeRng(seed)
  const drift = makeNoise1d(seed + 13, 3)   // slow, line-wide baseline wander
  const wobble = makeNoise1d(seed + 29, 5)  // letter-scale tremor
  const fs = size * HAND_SCALE
  const slant = -7 + rng.range(-1.5, 1.5)   // degrees of rightward lean
  const parts = []
  const { unitsPerEm, advance } = HAND_METRICS
  let cx = x
  let i = 0
  let wordPress = 0.8
  let startOfWord = true
  for (const ch of text) {
    if (ch === ' ') { cx += fs * (0.2 + rng.range(-0.02, 0.07)); i++; startOfWord = true; continue }
    if (startOfWord) { wordPress = 0.74 + rng.range(0, 0.2); startOfWord = false }
    const dy = drift(cx * 0.012) * 2.2 + wobble(i * 1.1) * 0.7
    const rot = drift(cx * 0.01 + 7) * 1.4 + wobble(i * 0.9 + 3) * 1.6
    const scale = 1 + rng.range(-0.04, 0.05)
    const press = Math.min(0.97, wordPress + rng.range(-0.08, 0.06))
    const t = `translate(${cx.toFixed(1)} ${(y + dy).toFixed(1)}) rotate(${rot.toFixed(2)}) skewX(${slant.toFixed(1)}) scale(${scale.toFixed(3)})`
    const g = c => `<text x="0" y="0" font-family="${family}" font-size="${fs.toFixed(1)}" fill="${color}"${c}>${esc(ch)}</text>`
    parts.push(`<g transform="${t}">${g(` opacity="${(press * 0.3).toFixed(2)}" transform="translate(0.45 0.35)"`)}${g(` opacity="${press.toFixed(2)}"`)}</g>`)
    cx += ((advance[ch] ?? 420) / unitsPerEm) * fs * (1 + rng.range(-0.04, 0.05))
    i++
  }
  // Returned as a String object with `width` attached, so a caller that forgets
  // `.svg` renders the handwriting instead of the text "[object Object]".
  const out = new String(parts.join(''))
  out.svg = out
  out.width = cx - x
  return out
}

/** Wrap on measured hand width (not a monospace column count). */
function wrapHand(text, size, maxWidth) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && handWidth(next, size) > maxWidth) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export function handwrittenLines(lines, { x, y, size = 15, leading = 26, color = '#232a3a', seed = 1, maxWidth = 420 } = {}) {
  const parts = []
  let row = 0
  lines.forEach((line, i) => {
    wrapHand(line, size, maxWidth).forEach((sub, j) => {
      const result = handwriting(sub, { x, y: y + row * leading, size, color, seed: seed + i * 17 + j })
      parts.push(result.svg)
      row++
    })
  })
  return parts.join('')
}

/** Redaction: a solid bar, as applied to a photocopy by hand. */
export function redaction(x, y, width, height, { seed = 1, label = null } = {}) {
  const rng = makeRng(seed)
  const parts = [`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#141210"/>`]
  const n = Math.max(3, Math.floor(width / 9))
  for (let i = 0; i < n; i++) {
    const rx = x + rng.range(0, width)
    parts.push(`<rect x="${rx.toFixed(1)}" y="${(y + rng.range(0, height)).toFixed(1)}" width="${rng.range(1, 5).toFixed(1)}" height="1" fill="#3a352e" opacity="0.5"/>`)
  }
  if (label) {
    parts.push(`<text x="${(x + width / 2).toFixed(1)}" y="${(y + height / 2 + 3).toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="8" letter-spacing="1.4" fill="#8a8272">${esc(label)}</text>`)
  }
  return parts.join('')
}

/** Signature: a written mark, illegible by design, over a printed rule. */
export function signature(x, y, { seed = 1, width = 150, color = '#1b2333', name = null } = {}) {
  const rng = makeRng(seed)
  const noise = makeNoise1d(seed + 5, 4)
  const pts = []
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push(`${(x + t * width).toFixed(1)},${(y - Math.sin(t * 7.5) * 9 * Math.exp(-t * 0.6) - noise(t * 6) * 5).toFixed(1)}`)
  }
  const parts = [`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.8" stroke-linecap="round"/>`]
  const flourish = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    flourish.push(`${(x + width * 0.2 + t * width * 0.75).toFixed(1)},${(y + 4 + Math.sin(t * 5) * 3).toFixed(1)}`)
  }
  parts.push(`<polyline points="${flourish.join(' ')}" fill="none" stroke="${color}" stroke-width="0.9" stroke-opacity="0.6"/>`)
  if (name) {
    parts.push(`<text x="${x}" y="${y + 20}" font-family="${SANS}" font-size="8" letter-spacing="1.2" fill="#5c5546">${esc(name.toUpperCase())}</text>`)
  }
  void rng
  return parts.join('')
}

/** Department letterhead used across the HALDER INSTITUTE paperwork. */
export function letterhead({ x, y, width, institute = 'HALDER INSTITUTE FOR CONTINUITY STUDIES', unit = 'BUREAU OF CONTINUITY RECORDS', form = 'RECORD OF MATERIAL EXAMINATION', control = 'FORM 14-B', revision = 'REV 03' }) {
  const parts = []
  parts.push(`<text x="${x}" y="${y}" font-family="${SERIF}" font-size="21" letter-spacing="1.6" fill="#2b2720">${esc(institute)}</text>`)
  parts.push(`<text x="${x}" y="${y + 15}" font-family="${SANS}" font-size="9.5" letter-spacing="3.4" fill="#5a5344">${esc(unit)}</text>`)
  parts.push(rule(x, y + 24, x + width, { color: '#3c362c', width: 1.4 }))
  parts.push(rule(x, y + 27, x + width, { color: '#3c362c', width: 0.5 }))
  parts.push(`<text x="${x}" y="${y + 46}" font-family="${SANS}" font-size="13" letter-spacing="2.4" fill="#2b2720">${esc(form)}</text>`)
  parts.push(`<text x="${x + width}" y="${y + 46}" text-anchor="end" font-family="${MONO}" font-size="10" letter-spacing="1.2" fill="#5a5344">${esc(control)} · ${esc(revision)}</text>`)
  parts.push(rule(x, y + 52, x + width, { color: '#8d8471', width: 0.6 }))
  return parts.join('')
}

/** Carbon copy ghosting on the sheet below. */
export function carbonGhost({ x, y, width, lines, size = 11.5, leading = 15, color = '#6d6a5e', seed = 1 }) {
  return typeBlock(lines, { x, y, columns: Math.floor(width / 6), size, leading, color, jitter: 0.5, seed })
}

export { stamp, esc }
