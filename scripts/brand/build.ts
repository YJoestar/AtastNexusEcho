/**
 * Builds the NEXUS ECHO brand asset kit into public/brand from the geometry in
 * src/lib/brand/geometry.ts. Run: npx vite-node scripts/brand/build.ts
 *
 * Output: symbol (dark, light, mono), compact symbol, wordmark, lockups,
 * favicon, device/app mark, evidence stamp, apple-touch-icon.png.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  BRACKETS, ECHO_OFFSET, NODES, N_PATH,
  WORDMARK_ECHO_OFFSET, WORDMARK_STROKE, translatePath, wordmark, wordmarkStacked,
} from '../../src/lib/brand/geometry'

const sharp = createRequire(import.meta.url)('sharp')
const OUT = 'public/brand'
mkdirSync(OUT, { recursive: true })

const PALETTE = {
  ink: '#0a0a0b',          // CRT black
  offwhite: '#d8d6d0',     // primary text
  accent: '#6fb3c4',       // cold cyan: live / technical
  paper: '#d4d0c5',        // recovered paper
}

type Variant = { fg: string; node: string; bg: string | null }
const DARK: Variant = { fg: PALETTE.offwhite, node: PALETTE.accent, bg: null }
const LIGHT: Variant = { fg: PALETTE.ink, node: '#2f6f80', bg: null }
const MONO_BLACK: Variant = { fg: '#000', node: '#000', bg: null }
const MONO_WHITE: Variant = { fg: '#fff', node: '#fff', bg: null }

function markBody(v: Variant, full: boolean): string {
  const parts: string[] = []
  const strokeN = full ? 4.5 : 6
  if (full) {
    parts.push(`<g fill="none" stroke="${v.fg}" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="1.6">${BRACKETS.map(d => `<path d="${d}"/>`).join('')}</g>`)
  }
  // Echo: thinner, dimmer, displaced.
  const echoD = translatePath(N_PATH, ECHO_OFFSET.x * (full ? 1 : 0.8), ECHO_OFFSET.y * (full ? 1 : 0.8))
  parts.push(`<path d="${echoD}" fill="none" stroke="${v.fg}" stroke-opacity="0.42" stroke-width="${full ? 2 : 3}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="1.6"/>`)
  parts.push(`<path d="${N_PATH}" fill="none" stroke="${v.fg}" stroke-width="${strokeN}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="1.6"/>`)
  for (const [cx, cy, size] of NODES) {
    const s = full ? size : size + 2
    parts.push(`<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${v.node}"/>`)
  }
  return parts.join('')
}

function svg(w: number, h: number, body: string, bg: string | null, title: string, extra = ''): string {
  const bgRect = bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}"${extra}>${bgRect}${body}</svg>\n`
}

const write = (name: string, content: string) => writeFileSync(`${OUT}/${name}`, content)

// Symbol
write('symbol-dark.svg', svg(64, 64, markBody(DARK, true), null, 'NEXUS ECHO'))
write('symbol-light.svg', svg(64, 64, markBody(LIGHT, true), null, 'NEXUS ECHO'))
write('symbol-mono-black.svg', svg(64, 64, markBody(MONO_BLACK, true), null, 'NEXUS ECHO'))
write('symbol-mono-white.svg', svg(64, 64, markBody(MONO_WHITE, true), null, 'NEXUS ECHO'))
write('symbol-compact-dark.svg', svg(64, 64, markBody(DARK, false), null, 'NEXUS ECHO'))

// Favicon / device mark: compact symbol on CRT black, square (no rounding: the brand is square).
write('favicon.svg', svg(64, 64, markBody(DARK, false), PALETTE.ink, 'NEXUS ECHO'))
write('device-mark.svg', svg(64, 64, markBody(DARK, true), PALETTE.ink, 'NEXUS ECHO field device'))

// Wordmark
function wordmarkSvg(v: Variant, stacked: boolean): string {
  const w = stacked ? wordmarkStacked() : wordmark()
  const pad = 2
  const stroke = WORDMARK_STROKE
  const width = w.width + pad * 2 + WORDMARK_ECHO_OFFSET.x
  const height = w.height + pad * 2 + WORDMARK_ECHO_OFFSET.y
  const ghost = translatePath(w.d, WORDMARK_ECHO_OFFSET.x, WORDMARK_ECHO_OFFSET.y)
  const body = `<g transform="translate(${pad} ${pad})" fill="none" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="1.6">`
    + `<path d="${ghost}" stroke="${v.fg}" stroke-opacity="0.35" stroke-width="${stroke * 0.7}"/>`
    + `<path d="${w.d}" stroke="${v.fg}" stroke-width="${stroke}"/></g>`
  return svg(round(width), round(height), body, v.bg, 'NEXUS ECHO')
}
const round = (n: number) => Math.round(n * 100) / 100
write('wordmark-dark.svg', wordmarkSvg(DARK, false))
write('wordmark-light.svg', wordmarkSvg(LIGHT, false))
write('wordmark-mono-black.svg', wordmarkSvg(MONO_BLACK, false))
write('wordmark-stacked-dark.svg', wordmarkSvg(DARK, true))

// Lockup: symbol left, stacked wordmark right
function lockup(v: Variant): string {
  const w = wordmarkStacked()
  const scale = 3 // wordmark unit -> lockup px (symbol is 64)
  const wmW = (w.width + WORDMARK_ECHO_OFFSET.x) * scale
  const wmH = (w.height + WORDMARK_ECHO_OFFSET.y) * scale
  const gap = 18
  const H = 64
  const ghost = translatePath(w.d, WORDMARK_ECHO_OFFSET.x, WORDMARK_ECHO_OFFSET.y)
  const wm = `<g transform="translate(${64 + gap} ${(H - wmH) / 2 + 0.9 * scale}) scale(${scale})" fill="none" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="1.6">`
    + `<path d="${ghost}" stroke="${v.fg}" stroke-opacity="0.35" stroke-width="${WORDMARK_STROKE * 0.7}"/>`
    + `<path d="${w.d}" stroke="${v.fg}" stroke-width="${WORDMARK_STROKE}"/></g>`
  return svg(round(64 + gap + wmW + 2), H, markBody(v, true) + wm, v.bg, 'NEXUS ECHO')
}
write('lockup-dark.svg', lockup(DARK))
write('lockup-light.svg', lockup(LIGHT))

// Evidence stamp: a recovered-record mark, symbol over a rule, label as drawn caps.
write('stamp-recovered.svg', svg(132, 40,
  `<rect x="1" y="1" width="130" height="38" fill="none" stroke="${PALETTE.accent}" stroke-width="1.5"/>`
  + `<g transform="translate(6 6) scale(0.4375)">${markBody({ fg: PALETTE.accent, node: PALETTE.accent, bg: null }, false)}</g>`
  + `<text x="40" y="17" fill="${PALETTE.accent}" font-family="IBM Plex Mono, monospace" font-size="8" letter-spacing="1.6">RECOVERED</text>`
  + `<text x="40" y="29" fill="${PALETTE.accent}" fill-opacity="0.7" font-family="IBM Plex Mono, monospace" font-size="6.5" letter-spacing="1.2">NEX / RECORD</text>`,
  null, 'Recovered record stamp'))

// Raster: apple-touch-icon (180) and PWA sizes from the device mark.
const deviceSvg = Buffer.from(svg(64, 64, markBody(DARK, true), PALETTE.ink, 'NEXUS ECHO'))
for (const size of [180, 192, 512]) {
  await sharp(deviceSvg, { density: 384 }).resize(size, size).png().toFile(`${OUT}/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`)
}
console.log('brand kit written to', OUT)
