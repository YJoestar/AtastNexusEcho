// Paper artifacts: documents, fragments, maps, personnel records, field notes and
// recording artifacts. Each is built from a real form structure — letterhead,
// control block, ruled ledger, title block, signature — so that hiding the
// metadata still leaves something that reads as a specific institution.

import sharp from 'sharp'
import { makeRng, makeNoise1d } from './rng.mjs'
import { esc, stamp, penAnnotation } from './print.mjs'
import {
  FONTS, wrapMono, typeBlock, paragraph, fieldRow, rule, boxedTable,
  handwriting, handwrittenLines, redaction, signature, letterhead, carbonGhost,
} from './docpaper.mjs'
import { paperGrain, tearMask, burnMask, stain, crease, scratches, fade, fragmentOutline, missingStrip } from './damage.mjs'

const { MONO, SERIF, SANS } = FONTS

/** Paper ground: stock colour, fibre, age mottling, and a soft sheet shadow. */
function paperGround({ width, height, seed = 1, tone = '#d9d3c2', warmth = 0.5, stock = 'bond' }) {
  const rng = makeRng(seed)
  const parts = []
  parts.push(`<defs>
    <linearGradient id="pg-tone-${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tone}"/>
      <stop offset="52%" stop-color="${tone}"/>
      <stop offset="100%" stop-color="${shade(tone, -14 * warmth)}"/>
    </linearGradient>
    <radialGradient id="pg-vig-${seed}" cx="50%" cy="44%" r="72%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="78%" stop-color="#6b5a34" stop-opacity="${(0.05 * warmth).toFixed(3)}"/>
      <stop offset="100%" stop-color="#5c4a28" stop-opacity="${(0.2 * warmth).toFixed(3)}"/>
    </radialGradient>
  </defs>`)
  parts.push(`<rect width="${width}" height="${height}" fill="url(#pg-tone-${seed})"/>`)
  if (stock === 'carbon') {
    // A carbon sheet is thinner: the fibre shows more and the ink is greyer.
    parts.push(`<rect width="${width}" height="${height}" fill="#7d86a0" fill-opacity="0.16"/>`)
  }
  if (stock === 'blueprint' || stock === 'vellum') {
    parts.push(`<rect width="${width}" height="${height}" fill="#3a5f8c" fill-opacity="0.55"/>`)
  }
  for (let i = 0; i < 150; i++) {
    parts.push(`<circle cx="${rng.range(0, width).toFixed(1)}" cy="${rng.range(0, height).toFixed(1)}" r="${rng.range(0.3, 1.4).toFixed(1)}" fill="#6f6244" opacity="${rng.range(0.02, 0.075).toFixed(3)}"/>`)
  }
  // Edge darkening from handling.
  const edge = Math.min(width, height) * 0.06
  parts.push(`<rect x="0" y="0" width="${width}" height="${edge}" fill="#6b5a34" opacity="${(0.05 * warmth).toFixed(3)}"/>`)
  parts.push(`<rect x="0" y="${height - edge}" width="${width}" height="${edge}" fill="#6b5a34" opacity="${(0.07 * warmth).toFixed(3)}"/>`)
  parts.push(`<rect width="${width}" height="${height}" fill="url(#pg-vig-${seed})"/>`)
  return parts.join('')
}

function shade(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const num = parseInt(m[1], 16)
  const clamp = v => Math.max(0, Math.min(255, v))
  const r = clamp(((num >> 16) & 255) + amount)
  const g = clamp(((num >> 8) & 255) + amount)
  const b = clamp((num & 255) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Punch holes, staple, and the sheet furniture a filed document accumulates. */
function sheetFurniture({ width, height, holes = 0, staple = false, clip = false, skew = 0 }) {
  const parts = []
  if (holes > 0) {
    for (let i = 0; i < holes; i++) {
      const cy = ((i + 0.5) / holes) * height
      parts.push(`<circle cx="26" cy="${cy.toFixed(1)}" r="9" fill="#0e0d0b" opacity="0.85"/>`)
      parts.push(`<circle cx="26" cy="${cy.toFixed(1)}" r="9" fill="none" stroke="#8a7f66" stroke-width="0.8" stroke-opacity="0.5"/>`)
    }
  }
  if (staple) {
    parts.push(`<g opacity="0.7"><rect x="${width / 2 - 14}" y="20" width="28" height="7" fill="#6e6a62"/><rect x="${width / 2 - 14}" y="20" width="28" height="2" fill="#a9a49a"/><rect x="${width / 2 - 14}" y="25" width="28" height="2" fill="#2a2724"/></g>`)
  }
  if (clip) {
    parts.push(`<g opacity="0.85" transform="translate(${width - 46} 12)">
      <path d="M 0 0 L 0 34 L 10 34 L 10 12 L 20 12 L 20 40" fill="none" stroke="#8d8b86" stroke-width="3"/>
      <path d="M 0 0 L 0 34 L 10 34 L 10 12" fill="none" stroke="#c2bfb8" stroke-width="1"/>
    </g>`)
  }
  if (skew) {
    parts.push(`<g transform="rotate(${skew} ${width / 2} ${height / 2})">`)
  }
  return parts.join('')
}

/** Common footer: control number, page, distribution, filing stamp. */
function documentFooter({ width, height, control, page = '1 OF 1', filed, seed = 1, retention = 'RET 30Y' }) {
  const rng = makeRng(seed)
  const y = height - 44
  const parts = [rule(56, y - 12, width - 56, { color: '#6f6653', width: 0.7 })]
  parts.push(`<text x="56" y="${y + 2}" font-family="${SANS}" font-size="8" letter-spacing="1.3" fill="#5c5546">${esc(control)}</text>`)
  parts.push(`<text x="${width / 2}" y="${y + 2}" text-anchor="middle" font-family="${MONO}" font-size="8" letter-spacing="1" fill="#5c5546">PAGE ${esc(page)} · ${esc(retention)}</text>`)
  parts.push(`<text x="${width - 56}" y="${y + 2}" text-anchor="end" font-family="${SANS}" font-size="8" letter-spacing="1.3" fill="#5c5546">FILED ${esc(filed)}</text>`)
  if (rng.chance(0.5)) {
    parts.push(`<circle cx="${rng.range(80, width - 80).toFixed(0)}" cy="${rng.range(height * 0.3, height * 0.7).toFixed(0)}" r="${rng.range(18, 34).toFixed(0)}" fill="none" stroke="#4a5c6e" stroke-width="2" stroke-opacity="0.14"/>`)
  }
  return parts.join('')
}

function damageLayer({ width, height, spec }) {
  const seed = spec.seed ?? 1
  if (!spec.condition || spec.condition === 'NORMAL') return ''
  const kind = spec.condition === 'PARTIAL' ? (spec.damageKind ?? 'TORN') : (spec.damageKind ?? spec.condition)
  const parts = [`<defs>`]
  const shapes = []
  if (kind === 'TORN' || kind === 'PARTIAL' || kind === 'INCOMPLETE') {
    const mask = tearMask({ width, height, edge: spec.tearEdge ?? 'right', depth: spec.tearDepth ?? 0.14, seed, id: `tm${seed}` })
    parts.push(mask.defs)
    shapes.push(`<path d="${mask.polygon}" fill="#0d0c09" fill-opacity="0.94" filter="url(#tm${seed}-soft)"/>`)
  }
  if (kind === 'BURNED') {
    const burn = burnMask({ width, height, seed, id: `bn${seed}`, originX: spec.burnX ?? 0.8, originY: spec.burnY ?? 0.85, radius: spec.burnR ?? 0.24 })
    parts.push(burn.defs)
    shapes.push(burn.shape)
  }
  if (kind === 'STAIN') {
    const s = stain({ width, height, seed, cx: spec.stainX ?? 0.24, cy: spec.stainY ?? 0.74, r: spec.stainR ?? 0.22, id: `st${seed}` })
    parts.push(s.defs)
    shapes.push(s.shape)
  }
  if (kind === 'FADED') {
    const f = fade({ width, height, seed, cx: 0.5, cy: 0.5, r: 0.62, id: `fd${seed}` })
    parts.push(f.defs)
    shapes.push(f.shape)
  }
  if (kind === 'MISSING') {
    const m = missingStrip({ width, height, y: height * (spec.missingY ?? 0.42), h: height * (spec.missingH ?? 0.05), seed, id: `ms${seed}` })
    parts.push(m.defs)
    shapes.push(m.shape)
  }
  if (kind === 'FOLDED') {
    shapes.push(crease({ x1: width * 0.34, y1: 0, x2: width * 0.34, y2: height, width: 3, shadow: 0.2 }))
    shapes.push(crease({ x1: 0, y1: height * 0.62, x2: width, y2: height * 0.62, width: 2.4, shadow: 0.15 }))
  }
  parts.push(`</defs>`)
  shapes.push(scratches({ width, height, seed: seed + 3, count: kind === 'DAMAGED' ? 6 : 3, color: 'rgba(255,255,255,0.3)' }))
  if (spec.annotated) {
    shapes.push(penAnnotation({ cx: width * (spec.annotateX ?? 0.5), cy: height * (spec.annotateY ?? 0.42), r: Math.min(width, height) * 0.16, note: spec.annotateNote ?? '?', color: '#8a2f24', rotation: -7, seed: seed + 5 }))
  }
  return parts.join('') + shapes.join('')
}

/** Doc-matrix look: a printer that skips a pin now and then. */
function dotMatrix(lines, options) {
  const id = `dm${options.seed ?? 1}`
  const svg = typeBlock(lines, options)
  return `<g mask="url(#${id})">${svg}</g>
    <defs><mask id="${id}"><rect x="0" y="0" width="2000" height="2000" fill="#fff"/>
    <g fill="#000" opacity="0.5">${Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${i * 23 + 4}" width="2000" height="1.4"/>`).join('')}</g>
    </mask></defs>`
}

async function finish(svg, width, height, { thumbSize = 240, quality = 88, format = 'jpeg' } = {}) {
  const full = format === 'png'
    ? await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
    : await sharp(Buffer.from(svg)).jpeg({ quality, chromaSubsampling: '4:4:4' }).toBuffer()
  const thumb = await sharp(full)
    .resize(thumbSize, thumbSize, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer()
  void width
  void height
  return { full, thumb }
}

/* ─────────────────────────── typed documents ─────────────────────────── */

function incidentReport(spec) {
  const W = 850
  const H = 1100
  const seed = spec.seed ?? 1
  const body = []
  body.push(paperGround({ width: W, height: H, seed, tone: '#dcd6c4', warmth: 0.8 }))
  body.push(`<g transform="rotate(${(spec.skew ?? 0).toFixed(2)} ${W / 2} ${H / 2})">`)
  body.push(letterhead({
    x: 56, y: 74, width: W - 112,
    form: 'INCIDENT RECORD — SECTION 4 / EAST WING',
    control: 'FORM 4-C',
    revision: spec.revision ?? 'REV 03',
  }))
  body.push(`<g transform="rotate(${(-0.6).toFixed(2)} ${W / 2} ${H / 2})">`)
  const y0 = 178
  body.push(fieldRow({ x: 56, y: y0, width: W - 112, label: 'Control no.', value: spec.control ?? 'IR-037-04' }))
  body.push(fieldRow({ x: 56, y: y0 + 24, width: W - 112, label: 'Location', value: spec.location ?? 'EAST CORRIDOR / LOC-C214' }))
  body.push(fieldRow({ x: 56, y: y0 + 48, width: W - 112, label: 'Date of record', value: spec.date ?? '14 OCT 94' }))
  body.push(fieldRow({ x: 56, y: y0 + 72, width: W - 112, label: 'Time of record', value: spec.time ?? '03:17' }))
  body.push(fieldRow({ x: 56, y: y0 + 96, width: W - 112, label: 'Reporting officer', value: spec.officer ?? 'OBSERVER-02' }))
  body.push(rule(56, y0 + 112, W - 56, { color: '#8d8471', width: 0.6 }))

  body.push(`<text x="56" y="${y0 + 136}" font-family="${SANS}" font-size="10" letter-spacing="2" fill="#3c362c">1. SUMMARY OF OCCURRENCE</text>`)
  const summaryY = y0 + 162
  const summaryLines = wrapMono(spec.summary ?? '', 96)
  body.push(paragraph(spec.summary ?? '', { x: 56, y: summaryY, width: W - 112, size: 12.5, leading: 17, color: '#2a2620', family: MONO, seed: seed + 2 }))
  let y = summaryY + summaryLines.length * 17 + 20

  body.push(`<text x="56" y="${y}" font-family="${SANS}" font-size="10" letter-spacing="2" fill="#3c362c">2. MATERIAL RECOVERED</text>`)
  y += 24
  body.push(boxedTable({
    x: 56, y, width: W - 112, rowHeight: 22, size: 9, seed: seed + 3,
    columns: ['ITEM', 'DESCRIPTION', 'CONDITION', 'CONTROL'],
    rows: [
      ['A', 'Photographic print, 1 of 4', 'DAMAGED', 'NX-037-B-01'],
      ['B', 'Motion picture frame, partial', 'INCOMPLETE', 'NX-CAM-07'],
      ['C', 'Maintenance label, torn', 'FRAGMENT', 'NX-037-F-02'],
      ['D', 'Access record, duplicate', 'UNRESOLVED', 'NX-037-P-05'],
    ],
  }))
  y += 22 * 5 + 26

  body.push(`<text x="56" y="${y}" font-family="${SANS}" font-size="10" letter-spacing="2" fill="#3c362c">3. ATTESTATION</text>`)
  y += 30
  body.push(paragraph(spec.attestation ?? '', { x: 56, y, width: W - 112, size: 12, leading: 16.5, color: '#2a2620', family: MONO, seed: seed + 4 }))
  const attestLines = wrapMono(spec.attestation ?? '', 94)
  y += attestLines.length * 16.5 + 30

  if (spec.signed !== false) {
    body.push(rule(56, y, 320, { color: '#4a4437', width: 0.7 }))
    body.push(signature(60, y - 6, { seed: seed + 5, width: 190, name: spec.signer ?? 'A. REHAL / OBSERVATION' }))
    body.push(rule(W - 300, y, W - 56, { color: '#4a4437', width: 0.7 }))
    body.push(signature(W - 296, y - 6, { seed: seed + 6, width: 150, name: 'WITNESS / FILED' }))
  }
  body.push(`</g>`)
  body.push(stamp({ x: 520, y: 200, text: spec.stampText ?? 'RESTRICTED', sub: spec.stampSub ?? 'CASE NX-037', rotation: -8, size: 17, color: '#7a2b26' }))
  if (spec.secondStamp) {
    body.push(stamp({ x: 120, y: H - 320, text: spec.secondStamp, sub: 'REVIEWED', rotation: 6, size: 13, color: '#2c4a6b', double: true }))
  }
  if (spec.redactions?.length) {
    for (const r of spec.redactions) body.push(redaction(r.x, r.y, r.w, r.h, { seed: seed + 7, label: r.label }))
  }
  body.push(documentFooter({ width: W, height: H, control: `IR-037-04 ${spec.revision ?? 'REV 03'}`, page: '1 OF 2', filed: spec.filed ?? '19 OCT 94', seed }))
  body.push(`</g>`)
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 1.1 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

function maintenanceLog(spec) {
  const W = 850
  const H = 1100
  const seed = spec.seed ?? 1
  const body = []
  body.push(paperGround({ width: W, height: H, seed, tone: '#cfc9b4', warmth: 1.0, stock: 'ledger' }))
  body.push(`<g transform="rotate(${(spec.skew ?? -0.4).toFixed(2)} ${W / 2} ${H / 2})">`)
  // Ledger ruling: this is a bound book, and the rules are printed on the page.
  for (let i = 0; i < 34; i++) {
    body.push(`<line x1="40" y1="${150 + i * 26}" x2="${W - 40}" y2="${150 + i * 26}" stroke="#8a9a8c" stroke-width="0.7" stroke-opacity="0.5"/>`)
  }
  body.push(`<line x1="104" y1="120" x2="104" y2="${H - 60}" stroke="#a8636a" stroke-width="1" stroke-opacity="0.5"/>`)
  body.push(`<text x="56" y="86" font-family="${SERIF}" font-size="18" letter-spacing="1.4" fill="#2b2720">${esc(spec.sheetTitle ?? spec.title ?? 'MAINTENANCE LOG — SECTOR C')}</text>`)
  body.push(`<text x="${W - 56}" y="86" text-anchor="end" font-family="${MONO}" font-size="10" fill="#5a5344">${esc(spec.bookRef ?? 'VOL. 3 / PG. 118')}</text>`)
  body.push(rule(40, 106, W - 40, { color: '#3c362c', width: 1 }))
  body.push(`<text x="46" y="140" font-family="${SANS}" font-size="8" letter-spacing="1.2" fill="#5c5546">DATE</text>`)
  body.push(`<text x="112" y="140" font-family="${SANS}" font-size="8" letter-spacing="1.2" fill="#5c5546">ENTRY / TECHNICIAN</text>`)
  const entries = spec.entries ?? []
  entries.forEach((entry, i) => {
    const y = 150 + i * 26
    body.push(handwriting(entry[0], { x: 46, y: y + 17, size: 12.5, color: '#25304a', seed: seed + i * 31 }).svg)
    body.push(handwriting(entry[1], { x: 112, y: y + 17, size: 12.5, color: '#25304a', seed: seed + i * 31 + 7 }).svg)
  })
  body.push(documentFooter({ width: W, height: H, control: spec.control ?? 'LOG-C-V3', page: 'PG 118', filed: 'CONTINUOUS', seed }))
  body.push(`</g>`)
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 1.3 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

function terminalPrintout(spec) {
  const W = 760
  const H = 1100
  const seed = spec.seed ?? 1
  const body = []
  // Continuous fanfold paper: perforated tractor-feed edges.
  body.push(`<defs><pattern id="perf-${seed}" width="10" height="10" patternUnits="userSpaceOnUse">
    <circle cx="5" cy="5" r="2.1" fill="#0e0d0b" fill-opacity="0.55"/></pattern></defs>`)
  body.push(`<rect width="${W}" height="${H}" fill="#e2e0d2"/>`)
  body.push(`<rect x="0" y="0" width="24" height="${H}" fill="url(#perf-${seed})"/>`)
  body.push(`<rect x="${W - 24}" y="0" width="24" height="${H}" fill="url(#perf-${seed})"/>`)
  for (let i = 0; i < 40; i++) {
    body.push(`<circle cx="${W / 2 + 8}" cy="${14 + i * 27}" r="2.1" fill="#0e0d0b" fill-opacity="0.35"/>`)
  }
  const lines = []
  lines.push('HALDER INSTITUTE :: CONTINUITY REGISTRY  NODE B-04')
  lines.push('ACCESS CONTROL EXPORT            BUILD NX-4.17')
  lines.push('='.repeat(72))
  lines.push('')
  for (const row of spec.rows ?? []) lines.push(row)
  lines.push('')
  lines.push('='.repeat(72))
  lines.push(`RECORDS ${String((spec.rows ?? []).length).padStart(5, '0')}   QUERY COMPLETE   ${spec.queryAt ?? '03:17:11Z'}`)
  if (spec.trailer) lines.push(spec.trailer)
  body.push(dotMatrix(lines, { x: 40, y: 40, size: 12, leading: 22, color: '#1c1a16', jitter: 0.4, seed }))
  // Green-bar paper tinting every fifth line, as continuous stock had.
  for (let i = 0; i < 40; i++) {
    if (i % 2 === 1) body.push(`<rect x="24" y="${26 + i * 27}" width="${W - 48}" height="27" fill="#8fa89a" fill-opacity="0.10"/>`)
  }
  body.push(documentFooter({ width: W, height: H, control: 'ACC-EXP-2214', page: 'CONTINUOUS', filed: 'PULLED 14 OCT 94', seed }))
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 0.8 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

function memoSheet(spec) {
  const W = 850
  const H = 1100
  const seed = spec.seed ?? 1
  const body = []
  body.push(paperGround({ width: W, height: H, seed, tone: '#e0dccb', warmth: 0.7, stock: spec.carbon ? 'carbon' : 'bond' }))
  body.push(`<g transform="rotate(${(spec.skew ?? 0.5).toFixed(2)} ${W / 2} ${H / 2})">`)
  const mx = 300
  body.push(`<text x="${mx}" y="120" font-family="${SANS}" font-size="26" letter-spacing="6" fill="#2b2720">MEMORANDUM</text>`)
  body.push(rule(56, 132, W - 56, { color: '#6f6653', width: 0.8 }))
  const rows = [
    ['TO', spec.to ?? 'FILE / CASE NX-037'],
    ['FROM', spec.from ?? 'A. RAHAL, OBSERVATION'],
    ['DATE', spec.date ?? '14 OCT 94'],
    ['RE', spec.re ?? 'RECOVERED MATERIAL — EAST CORRIDOR'],
    ['REF', spec.ref ?? 'IR-037-04 / CAM-07'],
  ]
  rows.forEach(([label, value], i) => {
    body.push(`<text x="56" y="${164 + i * 26}" font-family="${SANS}" font-size="10" letter-spacing="1.6" fill="#5c5546">${esc(label)}</text>`)
    body.push(`<text x="150" y="${164 + i * 26}" font-family="${MONO}" font-size="13" fill="#241f19">${esc(value)}</text>`)
    body.push(rule(150, 168 + i * 26, W - 56, { color: '#8d8471', width: 0.5 }))
  })
  body.push(rule(56, 300, W - 56, { color: '#6f6653', width: 0.8 }))
  let y = 336
  const paragraphs = spec.paragraphs ?? []
  for (const p of paragraphs) {
    const lines = wrapMono(p, 92)
    body.push(typeBlock(lines, { x: 56, y, size: 12.5, leading: 18, color: '#2a2620', jitter: 0.35, seed: seed + paragraphs.indexOf(p) }))
    y += lines.length * 18 + 18
  }
  if (spec.carbon) {
    // Set-off from the sheet above, offset up the page.
    const ghostLines = wrapMono(spec.carbonText ?? spec.paragraphs?.[0] ?? '', 92)
    body.push(`<g opacity="0.3">${carbonGhost({ x: 62, y: y - ghostLines.length * 15 - 6, width: W - 124, lines: ghostLines, size: 11.5, leading: 15, seed: seed + 11 })}</g>`)
  }
  if (spec.signed !== false) {
    body.push(rule(56, y + 26, 300, { color: '#4a4437', width: 0.7 }))
    body.push(signature(60, y + 20, { seed: seed + 21, width: 180, name: spec.signer ?? 'A. REHAL' }))
  }
  body.push(`</g>`)
  if (spec.carbon) {
    body.push(`<text x="${W - 60}" y="${H - 90}" text-anchor="end" font-family="${SANS}" font-size="11" letter-spacing="2" fill="#5a6a7a">CARBON COPY</text>`)
    body.push(`<text x="${W - 60}" y="${H - 72}" text-anchor="end" font-family="${SANS}" font-size="9" letter-spacing="1.4" fill="#5a6a7a">NOT THE ORIGINAL</text>`)
  }
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 1 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

function accessCard(spec) {
  const W = 900
  const H = 560
  const seed = spec.seed ?? 1
  const body = []
  body.push(`<defs>
    <linearGradient id="card-${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${spec.cardTone ?? '#dcd6c4'}"/>
      <stop offset="60%" stop-color="${spec.cardTone ?? '#dcd6c4'}"/>
      <stop offset="100%" stop-color="#b9b39f"/>
    </linearGradient>
  </defs>`)
  body.push(`<rect width="${W}" height="${H}" fill="url(#card-${seed})"/>`)
  // Worn laminate: scuffs concentrated where a thumb rests.
  const rng = makeRng(seed + 3)
  for (let i = 0; i < 40; i++) {
    const x = rng.chance(0.6) ? rng.range(W * 0.66, W) : rng.range(0, W)
    const y = rng.range(0, H)
    body.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rng.range(4, 30).toFixed(1)}" ry="${rng.range(2, 12).toFixed(1)}" fill="#ffffff" opacity="${rng.range(0.03, 0.1).toFixed(3)}"/>`)
  }
  body.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#8a8271" stroke-width="1.5"/>`)
  body.push(`<rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="${spec.bandColor ?? '#7a2b26'}" stroke-width="2"/>`)
  body.push(`<rect x="0" y="196" width="${W}" height="86" fill="${spec.bandColor ?? '#7a2b26'}" fill-opacity="0.9"/>`)
  body.push(`<text x="34" y="152" font-family="${SANS}" font-size="15" letter-spacing="4" fill="#3c362c">HALDER INSTITUTE</text>`)
  body.push(`<text x="34" y="252" font-family="${SANS}" font-size="30" letter-spacing="7" fill="#f2eee0">${esc(spec.level ?? 'LEVEL 3')}</text>`)
  body.push(`<text x="34" y="316" font-family="${SANS}" font-size="11" letter-spacing="3" fill="#3c362c">${esc(spec.zone ?? 'RESEARCH DIVISION')}</text>`)
  body.push(`<text x="34" y="360" font-family="${MONO}" font-size="15" fill="#241f19">${esc(spec.holder ?? 'L. VEY  L.V.-0029')}</text>`)
  body.push(`<text x="34" y="392" font-family="${MONO}" font-size="12" fill="#4a4437">CARD ${esc(spec.cardNumber ?? '03-4471-886')}</text>`)
  body.push(`<text x="34" y="440" font-family="${MONO}" font-size="11" fill="#4a4437">ISSUED ${esc(spec.issued ?? '04 MAR 94')}   EXP ${esc(spec.expires ?? '31 MAR 97')}</text>`)
  body.push(`<text x="34" y="470" font-family="${MONO}" font-size="10" fill="#6a6455">PROPERTY OF HALDER INSTITUTE · RETURN ON CHANGE</text>`)
  // Portrait panel: a degraded ID photograph, not a placeholder box.
  const px = W - 250
  const py = 96
  body.push(`<rect x="${px - 6}" y="${py - 6}" width="200" height="248" fill="#b3ac98"/>`)
  body.push(`<rect x="${px}" y="${py}" width="188" height="236" fill="#6d6a60"/>`)
  body.push(`<rect x="${px}" y="${py}" width="188" height="236" fill="url(#idphoto-${seed})"/>`)
  body.push(`<defs><linearGradient id="idphoto-${seed}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#8d8a80"/><stop offset="100%" stop-color="#4c4a44"/></linearGradient></defs>`)
  body.push(`<text x="${W - 40}" y="${py + 262}" text-anchor="end" font-family="${SANS}" font-size="8" letter-spacing="1.4" fill="#6a6455">BEARER SIGNATURE</text>`)
  body.push(signature(px, py + 262, { seed: seed + 9, width: 150 }))
  if (spec.hologram) {
    body.push(`<circle cx="${px + 94}" cy="${py + 118}" r="52" fill="none" stroke="#b8b09a" stroke-width="1" stroke-dasharray="4 5" opacity="0.5"/>`)
  }
  if (spec.punched) {
    body.push(`<circle cx="18" cy="${H / 2}" r="9" fill="#0e0d0b" opacity="0.8"/>`)
  }
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 0.7 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

function custodyForm(spec) {
  const W = 850
  const H = 1100
  const seed = spec.seed ?? 1
  const body = []
  body.push(paperGround({ width: W, height: H, seed, tone: '#dbd6c6', warmth: 0.75 }))
  body.push(`<g transform="rotate(${(spec.skew ?? 0.3).toFixed(2)} ${W / 2} ${H / 2})">`)
  body.push(letterhead({ x: 56, y: 74, width: W - 112, form: 'CHAIN OF CUSTODY — RECOVERED MATERIAL', control: 'FORM 2-A', revision: 'REV 06' }))
  const y0 = 176
  body.push(fieldRow({ x: 56, y: y0, width: W - 112, label: 'Case', value: spec.caseNo ?? 'NX-037' }))
  body.push(fieldRow({ x: 56, y: y0 + 26, width: W - 112, label: 'Item control', value: spec.itemControl ?? 'NX-037-B-01' }))
  body.push(fieldRow({ x: 56, y: y0 + 52, width: W - 112, label: 'Recovered at', value: spec.recoveredAt ?? 'EAST CORRIDOR' }))
  body.push(fieldRow({ x: 56, y: y0 + 78, width: W - 112, label: 'Recovered by', value: spec.recoveredBy ?? 'OBSERVER-02' }))
  body.push(rule(56, y0 + 96, W - 56, { color: '#8d8471', width: 0.6 }))
  body.push(`<text x="56" y="${y0 + 124}" font-family="${SANS}" font-size="10" letter-spacing="2" fill="#3c362c">TRANSFER RECORD</text>`)
  const transfers = spec.transfers ?? []
  body.push(boxedTable({
    x: 56, y: y0 + 136, width: W - 112, rowHeight: 26, size: 8.5, seed: seed + 2,
    columns: ['DT/TIME', 'FROM', 'TO', 'PURPOSE', 'INIT'],
    rows: transfers.map(t => [t[0], t[1], t[2], t[3], t[4]]),
  }))
  const ty = y0 + 136 + 26 * (transfers.length + 1) + 30
  body.push(`<text x="56" y="${ty}" font-family="${SANS}" font-size="10" letter-spacing="2" fill="#3c362c">CONDITION ON RECEIPT</text>`)
  const conditionText = spec.conditionText ?? ''
  body.push(paragraph(conditionText, { x: 56, y: ty + 24, width: W - 112, size: 12, leading: 16, color: '#2a2620', family: MONO, seed: seed + 3 }))
  const clines = wrapMono(conditionText, 92)
  let sy = ty + 24 + clines.length * 16 + 40
  body.push(rule(56, sy, 300, { color: '#4a4437', width: 0.7 }))
  body.push(signature(60, sy - 6, { seed: seed + 4, width: 170, name: 'RECEIVING OFFICER' }))
  body.push(rule(W - 320, sy, W - 56, { color: '#4a4437', width: 0.7 }))
  body.push(signature(W - 316, sy - 6, { seed: seed + 5, width: 160, name: 'WITNESS' }))
  body.push(`</g>`)
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 1.1 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

const DOCUMENT_BUILDERS = {
  incident: incidentReport,
  ledger: maintenanceLog,
  printout: terminalPrintout,
  memo: memoSheet,
  card: accessCard,
  custody: custodyForm,
}

export async function composeDocument(spec) {
  const build = DOCUMENT_BUILDERS[spec.form ?? 'incident']
  const svg = build(spec)
  return finish(svg, 0, 0, { quality: spec.quality ?? 88 })
}

/* ──────────────────────────── fragments ──────────────────────────── */

export async function composeFragment(spec) {
  const W = spec.width ?? 760
  const H = spec.height ?? 520
  const seed = spec.seed ?? 1
  const base = spec.base?.() ?? ''
  const outline = fragmentOutline({ width: W, height: H, seed, irregularity: spec.irregularity ?? 0.2, points: spec.points ?? 14 })
  const body = []
  body.push(`<defs>
    <clipPath id="frag-${seed}"><path d="M ${outline.join(' L ')} Z"/></clipPath>
    <filter id="fragshadow-${seed}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="4" dy="7" stdDeviation="6" flood-color="#000" flood-opacity="0.55"/>
    </filter>
  </defs>`)
  body.push(`<g filter="url(#fragshadow-${seed})" transform="rotate(${spec.rotation ?? 0} ${W / 2} ${H / 2})">`)
  body.push(`<g clip-path="url(#frag-${seed})">`)
  body.push(paperGround({ width: W, height: H, seed, tone: spec.tone ?? '#dcd6c4', warmth: 0.8, stock: spec.stock ?? 'bond' }))
  body.push(base)
  if (spec.stamp) body.push(stamp({ x: spec.stampX ?? 60, y: spec.stampY ?? 60, text: spec.stamp, sub: spec.stampSub, rotation: -9, size: 13, color: '#7a2b26' }))
  body.push(damageLayer({ width: W, height: H, spec: { ...spec, condition: 'NORMAL' } }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 1.2 }))
  if (spec.burned) {
    const burn = burnMask({ width: W, height: H, seed, id: `fb${seed}`, originX: spec.burnX ?? 0.2, originY: 0.9, radius: 0.34 })
    body.push(`<defs>${burn.defs}</defs>${burn.shape}`)
  }
  if (spec.wet) {
    const s = stain({ width: W, height: H, seed, cx: 0.7, cy: 0.6, r: 0.3, id: `fs${seed}` })
    body.push(`<defs>${s.defs}</defs>${s.shape}`)
  }
  body.push(`</g>`)
  // Frayed fibre along the tear: the edge of a torn sheet is never clean.
  const noise = makeNoise1d(seed + 41, 3)
  const fibres = []
  for (let i = 0; i < outline.length; i++) {
    const [x, y] = outline[i].split(',').map(Number)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const n = noise(i * 1.3)
    if (Math.abs(n) < 0.42) continue
    const len = 3 + Math.abs(n) * 12
    const nx = (n > 0 ? 1 : -1) * (0.6 + Math.abs(n) * 0.8)
    const ny = Math.abs(n) > 0.7 ? (i % 2 ? 1 : -1) : 0
    fibres.push(`<line x1="${x}" y1="${y}" x2="${(x + nx * len).toFixed(1)}" y2="${(y + ny * len).toFixed(1)}" stroke="#a89f88" stroke-width="0.7" stroke-opacity="0.5"/>`)
  }
  body.push(fibres.join(''))
  body.push(`</g>`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
  const full = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
  const thumb = await sharp(full).resize(240, 240, { fit: 'inside' }).png({ compressionLevel: 9 }).toBuffer()
  return { full, thumb }
}

/* ─────────────────────────────── maps ─────────────────────────────── */

function architecturalPlan(spec) {
  const W = spec.width ?? 1180
  const H = spec.height ?? 860
  const seed = spec.seed ?? 1
  const rooms = spec.rooms ?? []
  const body = []
  const blueprint = spec.sheet === 'blueprint'

  body.push(paperGround({
    width: W, height: H, seed,
    tone: blueprint ? '#2f5480' : '#ded9c7',
    warmth: blueprint ? 0.3 : 0.6,
    stock: blueprint ? 'blueprint' : 'bond',
  }))

  const ink = blueprint ? 'rgba(226,232,240,0.92)' : '#2b2a24'
  const inkThin = blueprint ? 'rgba(210,220,232,0.6)' : '#5c5546'

  // Drawing grid.
  for (let i = 0; i <= 24; i++) {
    const x = 60 + i * ((W - 120) / 24)
    body.push(`<line x1="${x.toFixed(1)}" y1="60" x2="${x.toFixed(1)}" y2="${H - 150}" stroke="${inkThin}" stroke-width="0.4" stroke-opacity="0.3" stroke-dasharray="2 6"/>`)
  }
  for (let i = 0; i <= 15; i++) {
    const y = 60 + i * ((H - 210) / 15)
    body.push(`<line x1="60" y1="${y.toFixed(1)}" x2="${W - 60}" y2="${y.toFixed(1)}" stroke="${inkThin}" stroke-width="0.4" stroke-opacity="0.3" stroke-dasharray="2 6"/>`)
  }

  // Walls: drawn as a double line, the way a real plan shows wall thickness.
  for (const room of rooms) {
    const { x, y, w, h, label, code, door, window: hasWindow, note, hatch } = room
    body.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${hatch ? 'url(#hatchA)' : 'none'}" stroke="${ink}" stroke-width="2.2"/>`)
    body.push(`<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="none" stroke="${ink}" stroke-width="0.8" stroke-opacity="0.7"/>`)
    if (door) {
      const d = door.side ?? 'bottom'
      const dw = door.width ?? 40
      body.push(`<rect x="${door.x ?? x + w / 2 - dw / 2}" y="${d === 'bottom' ? y - 4 : y + h - 2}" width="${dw}" height="6" fill="${blueprint ? '#2f5480' : '#ded9c7'}"/>`)
      const cx = door.x ?? x + w / 2
      const cy = d === 'bottom' ? y : y + h
      body.push(`<path d="M ${cx} ${cy} A ${dw} ${dw} 0 0 ${d === 'bottom' ? 1 : 0} ${cx + (d === 'bottom' ? dw : 0)} ${cy + (d === 'bottom' ? 0 : -dw)}" fill="none" stroke="${inkThin}" stroke-width="0.9"/>`)
    }
    if (hasWindow) {
      body.push(`<line x1="${x + 12}" y1="${y + 2}" x2="${x + w - 12}" y2="${y + 2}" stroke="${ink}" stroke-width="3.4" stroke-dasharray="1 5"/>`)
    }
    if (label) {
      body.push(`<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" font-family="${SANS}" font-size="11" letter-spacing="1.4" fill="${ink}" opacity="0.9">${esc(label)}</text>`)
    }
    if (code) {
      body.push(`<text x="${x + w / 2}" y="${y + h / 2 + 15}" text-anchor="middle" font-family="${MONO}" font-size="9" fill="${inkThin}">${esc(code)}</text>`)
    }
    if (note) {
      body.push(`<text x="${x + 6}" y="${y + h - 8}" font-family="${MONO}" font-size="8" fill="${inkThin}" opacity="0.8">${esc(note)}</text>`)
    }
  }

  // Dimension lines along the top and left.
  body.push(`<line x1="60" y1="44" x2="${W - 60}" y2="44" stroke="${inkThin}" stroke-width="0.7"/>`)
  for (let i = 0; i <= 6; i++) {
    const x = 60 + i * ((W - 120) / 6)
    body.push(`<line x1="${x}" y1="40" x2="${x}" y2="48" stroke="${inkThin}" stroke-width="0.7"/>`)
    body.push(`<text x="${x}" y="34" text-anchor="middle" font-family="${MONO}" font-size="8" fill="${inkThin}">${(i * 3.6).toFixed(1)}</text>`)
  }
  body.push(`<text x="${W - 60}" y="34" text-anchor="end" font-family="${SANS}" font-size="8" letter-spacing="1" fill="${inkThin}">METRES</text>`)

  // Title block, bottom right — the mark of a real drawing.
  const tbW = 330
  const tbH = 92
  const tbX = W - 60 - tbW
  const tbY = H - 60 - tbH
  body.push(`<rect x="${tbX}" y="${tbY}" width="${tbW}" height="${tbH}" fill="none" stroke="${ink}" stroke-width="1.6"/>`)
  body.push(`<line x1="${tbX}" y1="${tbY + 30}" x2="${tbX + tbW}" y2="${tbY + 30}" stroke="${ink}" stroke-width="0.8"/>`)
  body.push(`<line x1="${tbX}" y1="${tbY + 60}" x2="${tbX + tbW}" y2="${tbY + 60}" stroke="${ink}" stroke-width="0.8"/>`)
  body.push(`<line x1="${tbX + 190}" y1="${tbY + 30}" x2="${tbX + 190}" y2="${tbY + tbH}" stroke="${ink}" stroke-width="0.8"/>`)
  body.push(`<text x="${tbX + 10}" y="${tbY + 20}" font-family="${SERIF}" font-size="13" letter-spacing="1" fill="${ink}">${esc(spec.sheetTitle ?? spec.title ?? 'ADMIN BUILDING — GROUND FLOOR')}</text>`)
  body.push(`<text x="${tbX + 10}" y="${tbY + 48}" font-family="${MONO}" font-size="9" fill="${inkThin}">DWG ${esc(spec.dwg ?? 'A-201-G')}</text>`)
  body.push(`<text x="${tbX + 10}" y="${tbY + 78}" font-family="${MONO}" font-size="9" fill="${inkThin}">SCALE 1:100</text>`)
  body.push(`<text x="${tbX + 200}" y="${tbY + 48}" font-family="${MONO}" font-size="9" fill="${inkThin}">ISS ${esc(spec.issue ?? '03')}</text>`)
  body.push(`<text x="${tbX + 200}" y="${tbY + 78}" font-family="${MONO}" font-size="9" fill="${inkThin}">${esc(spec.issueDate ?? 'MAR 94')}</text>`)
  body.push(`<text x="60" y="${H - 26}" font-family="${SANS}" font-size="9" letter-spacing="1.6" fill="${inkThin}">HALDER INSTITUTE · FACILITIES ENGINEERING · NOT FOR DISTRIBUTION</text>`)
  if (spec.control) {
    body.push(`<text x="${W / 2}" y="${H - 26}" text-anchor="middle" font-family="${MONO}" font-size="10" fill="${inkThin}">${esc(spec.control)}</text>`)
  }

  body.push(`<defs><pattern id="hatchA" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="8" stroke="${inkThin}" stroke-width="1"/></pattern></defs>`)

  if (spec.marked) {
    // Investigation markup: a camera position and the corridor under dispute.
    body.push(`<g opacity="0.9">
      <rect x="${spec.markX ?? 400}" y="${spec.markY ?? 200}" width="${spec.markW ?? 300}" height="${spec.markH ?? 90}" fill="none" stroke="#a8322a" stroke-width="2.4" stroke-dasharray="9 5"/>
      <text x="${(spec.markX ?? 400) + 4}" y="${(spec.markY ?? 200) - 8}" font-family="${SANS}" font-size="11" letter-spacing="1.2" fill="#a8322a">${esc(spec.markLabel ?? 'DISPUTED SEGMENT')}</text>
    </g>`)
    for (const cam of spec.cameras ?? []) {
      body.push(`<g>
        <path d="M ${cam.x} ${cam.y} L ${cam.x - 9} ${cam.y - 15} L ${cam.x + 9} ${cam.y - 15} Z" fill="none" stroke="#a8322a" stroke-width="1.6"/>
        <path d="M ${cam.x - 9} ${cam.y - 15} L ${cam.x} ${cam.y - 30} L ${cam.x + 9} ${cam.y - 15}" fill="none" stroke="#a8322a" stroke-width="1.6"/>
        <text x="${cam.x}" y="${cam.y + 16}" text-anchor="middle" font-family="${MONO}" font-size="9" fill="#a8322a">${esc(cam.label)}</text>
      </g>`)
    }
  }
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 0.9, id: `mapg${seed}` }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

export async function composeMap(spec) {
  return finish(architecturalPlan(spec), 0, 0, { quality: 90 })
}

/* ──────────────────────── personnel records ──────────────────────── */

/** A degraded archival portrait: a face that was scanned badly in 1994. */
function idPortrait(spec, x, y, w, h, seed) {
  const rng = makeRng(seed)
  const parts = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6f6b60"/>`]
  parts.push(`<clipPath id="idp-${seed}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`)
  parts.push(`<g clip-path="url(#idp-${seed})">`)
  // Head and shoulders, lit from the front-left, as a passport photo would be.
  const cx = x + w / 2
  const headR = w * 0.21
  const headY = y + h * 0.34
  parts.push(`<ellipse cx="${cx}" cy="${y + h * 0.98}" rx="${w * 0.52}" ry="${h * 0.46}" fill="#3a3630"/>`)
  parts.push(`<ellipse cx="${cx}" cy="${headY}" rx="${headR}" ry="${headR * 1.28}" fill="#8d8272"/>`)
  parts.push(`<ellipse cx="${cx}" cy="${headY - headR * 0.62}" rx="${headR * 1.12}" ry="${headR * 0.72}" fill="#4a443c"/>`)
  parts.push(`<ellipse cx="${cx - headR * 0.3}" cy="${headY + headR * 0.16}" rx="${headR * 0.3}" ry="${headR * 0.42}" fill="#3a352e" opacity="0.75"/>`)
  parts.push(`<ellipse cx="${cx + headR * 0.3}" cy="${headY + headR * 0.16}" rx="${headR * 0.3}" ry="${headR * 0.42}" fill="#3a352e" opacity="0.75"/>`)
  parts.push(`<rect x="${cx - headR * 0.4}" y="${headY + headR * 0.72}" width="${headR * 0.8}" height="${headR * 0.1}" fill="#4a443c" opacity="0.6"/>`)
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#idpgrad-${seed})"/>`)
  parts.push(`<defs><linearGradient id="idpgrad-${seed}" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0%" stop-color="#d8d2c0" stop-opacity="0.34"/>
    <stop offset="60%" stop-color="#3a3630" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#1a1815" stop-opacity="0.42"/></linearGradient></defs>`)
  parts.push(`</g>`)
  // Halftone scan artefacts and dust.
  for (let i = 0; i < 90; i++) {
    parts.push(`<rect x="${(x + rng.range(0, w)).toFixed(1)}" y="${(y + rng.range(0, h)).toFixed(1)}" width="${rng.range(0.6, 2).toFixed(1)}" height="${rng.range(0.6, 2).toFixed(1)}" fill="#e8e2d0" opacity="${rng.range(0.05, 0.3).toFixed(2)}"/>`)
  }
  parts.push(`<line x1="${x}" y1="${y + h * 0.66}" x2="${x + w}" y2="${y + h * 0.64}" stroke="#efe8d6" stroke-width="1.2" stroke-opacity="0.2"/>`)
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#4a4437" stroke-width="1.4"/>`)
  return parts.join('')
}

function personnelRecord(spec) {
  const W = 850
  const H = 1100
  const seed = spec.seed ?? 1
  const body = []
  body.push(paperGround({ width: W, height: H, seed, tone: '#d8d3c0', warmth: 0.85 }))
  body.push(`<g transform="rotate(${(spec.skew ?? -0.35).toFixed(2)} ${W / 2} ${H / 2})">`)
  body.push(letterhead({ x: 56, y: 74, width: W - 112, form: 'PERSONNEL RECORD — INSTITUTIONAL', control: 'FORM P-1', revision: spec.revision ?? 'REV 04' }))
  const top = 172
  body.push(idPortrait(spec, W - 236, top - 6, 176, 224, seed))
  body.push(fieldRow({ x: 56, y: top, width: 520, label: 'Name', value: spec.name ?? 'VEY, LINA MARGARET' }))
  body.push(fieldRow({ x: 56, y: top + 26, width: 520, label: 'Personnel no.', value: spec.personnelId ?? 'L.V.-0029' }))
  body.push(fieldRow({ x: 56, y: top + 52, width: 520, label: 'Date of birth', value: spec.dob ?? '11 JUN 1954' }))
  body.push(fieldRow({ x: 56, y: top + 78, width: 520, label: 'Appointed', value: spec.appointed ?? '14 SEP 1981' }))
  body.push(fieldRow({ x: 56, y: top + 104, width: 520, label: 'Grade', value: spec.grade ?? 'RESEARCH / GRADE 4' }))
  body.push(fieldRow({ x: 56, y: top + 130, width: 520, label: 'Unit', value: spec.unit ?? 'MEMORY RESEARCH' }))
  body.push(fieldRow({ x: 56, y: top + 156, width: 520, label: 'Access', value: spec.access ?? 'LEVEL 3 — LAB 04' }))
  body.push(rule(56, top + 176, W - 56, { color: '#8d8471', width: 0.6 }))
  let y = top + 206
  body.push(`<text x="56" y="${y}" font-family="${SANS}" font-size="10" letter-spacing="2" fill="#3c362c">ASSIGNMENT HISTORY</text>`)
  y += 24
  body.push(boxedTable({
    x: 56, y, width: W - 112, rowHeight: 22, size: 8.5, seed: seed + 2,
    columns: ['FROM', 'TO', 'POST', 'LOCATION'],
    rows: (spec.history ?? []).map(h => [h[0], h[1], h[2], h[3]]),
  }))
  y += 22 * ((spec.history ?? []).length + 1) + 26
  body.push(`<text x="56" y="${y}" font-family="${SANS}" font-size="10" letter-spacing="2" fill="#3c362c">ENDORSEMENTS</text>`)
  y += 22
  const endorsements = spec.endorsements ?? []
  endorsements.forEach((e, i) => {
    body.push(handwriting(e[0], { x: 56, y: y + i * 46 + 14, size: 13, color: '#25304a', seed: seed + i * 13 }).svg)
    body.push(`<text x="56" y="${y + i * 46 + 30}" font-family="${SANS}" font-size="8" letter-spacing="1.1" fill="#5c5546">${esc(e[1])}</text>`)
  })
  if (spec.badgeHeight) {
    // An issued institutional badge, photographed onto the sheet.
    const bx = 120
    const by = H - 300
    body.push(`<g transform="rotate(-4 ${bx + 110} ${by + 70})">
      <rect x="${bx}" y="${by}" width="220" height="140" fill="#cfc8b2" stroke="#7d7461" stroke-width="1.4"/>
      <rect x="${bx + 8}" y="${by + 8}" width="204" height="124" fill="none" stroke="#4a5c6e" stroke-width="1.4"/>
      <rect x="${bx}" y="${by + 44}" width="220" height="34" fill="#4a5c6e" fill-opacity="0.85"/>
      <text x="${bx + 110}" y="${by + 66}" text-anchor="middle" font-family="${SANS}" font-size="15" letter-spacing="3" fill="#e8e4d6">VISITOR</text>
      <text x="${bx + 14}" y="${by + 28}" font-family="${MONO}" font-size="11" fill="#2b2720">${esc(spec.name ?? '')}</text>
      <text x="${bx + 14}" y="${by + 120}" font-family="${MONO}" font-size="10" fill="#2b2720">${esc(spec.personnelId ?? '')}</text>
    </g>`)
  }
  body.push(`</g>`)
  if (spec.anomalous) {
    // The record contradicts itself. The player has to notice.
    body.push(`<g>
      <text x="56" y="${H - 190}" font-family="${MONO}" font-size="11" fill="#7a2b26">RECONCILIATION: APPOINTED 14 SEP 1981</text>
      <text x="56" y="${H - 172}" font-family="${MONO}" font-size="11" fill="#7a2b26">SYSTEM ENTRY PREDATES SOURCE BY 27 YRS</text>
      ${redaction(56, H - 200, 420, 46, { seed: seed + 6 })}
    </g>`)
  }
  body.push(stamp({ x: 470, y: 240, text: spec.stamp ?? 'RESTRICTED', sub: 'PERSONNEL', rotation: -7, size: 14, color: '#7a2b26' }))
  if (spec.closedStamp) {
    body.push(stamp({ x: 140, y: H - 420, text: spec.closedStamp, sub: 'FILE', rotation: 5, size: 15, color: '#2c4a6b' }))
  }
  body.push(documentFooter({ width: W, height: H, control: `P-1 ${spec.personnelId ?? ''}`, page: '1 OF 1', filed: spec.filed ?? 'FILE OPEN', seed }))
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 1.1 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

export async function composePersonnel(spec) {
  return finish(personnelRecord(spec), 0, 0, { quality: 88 })
}

/* ─────────────────────────── field notes ─────────────────────────── */

function fieldNote(spec) {
  const W = spec.width ?? 780
  const H = spec.height ?? 1000
  const seed = spec.seed ?? 1
  const body = []
  const ruled = spec.ruled !== false
  body.push(paperGround({ width: W, height: H, seed, tone: spec.tone ?? '#e3ddc8', warmth: 0.55 }))
  if (ruled) {
    for (let i = 0; i < 30; i++) {
      const y = 150 + i * 28
      body.push(`<line x1="52" y1="${y}" x2="${W - 52}" y2="${y}" stroke="#8fa0a8" stroke-width="0.7" stroke-opacity="0.55"/>`)
    }
    body.push(`<line x1="92" y1="40" x2="92" y2="${H - 60}" stroke="#a8636a" stroke-width="1" stroke-opacity="0.5"/>`)
  }
  body.push(`<text x="104" y="${spec.headerY ?? 88}" font-family="${SANS}" font-size="12" letter-spacing="2.4" fill="#3c362c">${esc(spec.header ?? 'FIELD OBSERVATION — SHEET 2')}</text>`)
  body.push(`<text x="${W - 52}" y="${spec.headerY ?? 88}" text-anchor="end" font-family="${MONO}" font-size="10" fill="#5c5546">${esc(spec.headerRef ?? 'OBS-02 / 037')}</text>`)
  body.push(rule(52, (spec.headerY ?? 88) + 12, W - 52, { color: '#6f6653', width: 0.9 }))
  body.push(`<text x="104" y="${(spec.headerY ?? 88) + 30}" font-family="${MONO}" font-size="10" fill="#5a5344">${esc(spec.timeLine ?? '14 OCT 94 — 03:12 TO 03:41')}</text>`)
  body.push(handwrittenLines(spec.lines ?? [], { x: 104, y: 200, size: spec.handSize ?? 15, leading: 28, color: '#22293a', seed: seed + 3, maxWidth: W - 168 }))
  if (spec.sketch) {
    body.push(spec.sketch(seed))
  }
  if (spec.stamp) body.push(stamp({ x: spec.stampX ?? 96, y: spec.stampY ?? H - 170, text: spec.stamp, sub: spec.stampSub, rotation: -8, size: 12, color: '#7a2b26' }))
  if (spec.tape) {
    body.push(`<g opacity="0.55" transform="rotate(-3 ${W / 2} 60)">
      <rect x="${W / 2 - 92}" y="46" width="184" height="34" fill="#ddd6bf" fill-opacity="0.9" stroke="#b8ae92" stroke-width="0.6"/>
      <text x="${W / 2}" y="${68}" text-anchor="middle" font-family="${MONO}" font-size="10" letter-spacing="1" fill="#5a5344">${esc(spec.tape)}</text>
    </g>`)
  }
  body.push(damageLayer({ width: W, height: H, spec }))
  body.push(paperGrain({ width: W, height: H, seed, strength: 1 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

export async function composeNote(spec) {
  return finish(fieldNote(spec), 0, 0, { quality: 88 })
}

/* ─────────────────────── recording artifacts ─────────────────────── */

/**
 * A waveform derived from a synthetic signal, not a decorative squiggle: the
 * envelope has speech-like bursts, room tone between them, and — for damaged
 * recordings — an interval where the tape simply was not.
 */
function waveformSpec(spec) {
  const W = spec.width ?? 1000
  const H = spec.height ?? 260
  const seed = spec.seed ?? 1
  const rng = makeRng(seed)
  const body = []
  body.push(paperGround({ width: W, height: H, seed, tone: '#171a18', warmth: 0 }))
  // Ruling: the waveform is printed on a strip, not floating in a box.
  for (let i = 0; i <= 40; i++) {
    const x = 40 + i * ((W - 80) / 40)
    body.push(`<line x1="${x.toFixed(1)}" y1="34" x2="${x.toFixed(1)}" y2="${H - 34}" stroke="#3a4a44" stroke-width="0.5" stroke-opacity="0.5"/>`)
  }
  for (let i = 0; i <= 6; i++) {
    const y = 34 + i * ((H - 68) / 6)
    body.push(`<line x1="40" y1="${y.toFixed(1)}" x2="${W - 40}" y2="${y.toFixed(1)}" stroke="#3a4a44" stroke-width="0.5" stroke-opacity="0.6"/>`)
  }
  body.push(`<line x1="40" y1="${H / 2}" x2="${W - 40}" y2="${H / 2}" stroke="#4a5c54" stroke-width="0.8" stroke-opacity="0.9"/>`)

  const mid = H / 2
  const amp = (H - 80) / 2
  const points = []
  const samples = W - 80
  const segments = spec.segments ?? 9
  const missingRanges = spec.missing ?? []
  for (let i = 0; i < samples; i++) {
    const t = i / samples
    const x = 40 + i
    let envelope = 0.05
    // Speech bursts: each segment has an attack, a body and a decay.
    for (let s = 0; s < segments; s++) {
      const start = s / segments
      const width = (0.55 + rng.range(0, 0.5)) / segments
      if (t >= start && t <= start + width) {
        const local = (t - start) / width
        const shape = Math.sin(local * Math.PI) ** 0.7
        envelope += shape * (0.35 + rng.range(0, 0.55))
      }
    }
    const carrier = Math.sin(t * 420 + seed) * 0.35 + Math.sin(t * 1130 + seed * 2) * 0.2 + (rng() - 0.5) * 0.5
    let value = envelope * (0.55 + carrier * 0.45) * amp
    for (const [from, to] of missingRanges) {
      if (t >= from && t <= to) value *= 0.03
    }
    points.push(`${x},${(mid - Math.max(-amp, Math.min(amp, value))).toFixed(1)}`)
  }
  // Mirror for the lower half.
  const mirrored = points.map(p => {
    const [x, y] = p.split(',')
    return `${x},${(mid + (Number(mid) - Number(y))).toFixed(1)}`
  })
  body.push(`<polyline points="${points.join(' ')}" fill="none" stroke="#8fd6b4" stroke-width="1.3" stroke-opacity="0.95"/>`)
  body.push(`<polyline points="${mirrored.join(' ')}" fill="none" stroke="#8fd6b4" stroke-width="1.3" stroke-opacity="0.95"/>`)
  body.push(`<rect x="40" y="34" width="${W - 80}" height="${H - 68}" fill="none" stroke="#4a5c54" stroke-width="1"/>`)

  // Clip indicator: silence reads as silence, not as a flat decorative line.
  for (const [from, to] of missingRanges) {
    const x0 = 40 + from * (W - 80)
    const x1 = 40 + to * (W - 80)
    body.push(`<rect x="${x0.toFixed(1)}" y="34" width="${(x1 - x0).toFixed(1)}" height="${H - 68}" fill="#0b0d0c" fill-opacity="0.55"/>`)
    body.push(`<line x1="${x0.toFixed(1)}" y1="34" x2="${x0.toFixed(1)}" y2="${H - 34}" stroke="#c8503c" stroke-width="1.4" stroke-dasharray="4 3"/>`)
    body.push(`<line x1="${x1.toFixed(1)}" y1="34" x2="${x1.toFixed(1)}" y2="${H - 34}" stroke="#c8503c" stroke-width="1.4" stroke-dasharray="4 3"/>`)
    body.push(`<text x="${((x0 + x1) / 2).toFixed(1)}" y="${mid + 4}" text-anchor="middle" font-family="'Courier New',monospace" font-size="10" letter-spacing="1" fill="#c8503c">NO SIGNAL</text>`)
  }
  if (spec.noiseFloor) {
    for (let i = 0; i < 900; i++) {
      const x = rng.range(40, W - 40)
      const y = rng.range(34, H - 34)
      body.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="0.6" fill="#7fbf9f" opacity="${rng.range(0.05, 0.3).toFixed(2)}"/>`)
    }
  }
  // Header strip: the recorder's own identification of the take.
  body.push(`<rect x="0" y="0" width="${W}" height="26" fill="#101312"/>`)
  body.push(`<text x="14" y="18" font-family="'Courier New',monospace" font-size="12" letter-spacing="1.2" fill="#9fd8bc">${esc(spec.header ?? 'REC-16 · DICTAPHONE · TAPE 2')}</text>`)
  body.push(`<text x="${W - 14}" y="18" text-anchor="end" font-family="'Courier New',monospace" font-size="12" letter-spacing="1.2" fill="${spec.headerColor ?? '#9fd8bc'}">${esc(spec.headerRight ?? 'CH 1 · NORMAL')}</text>`)
  body.push(`<rect x="0" y="${H - 24}" width="${W}" height="24" fill="#101312"/>`)
  const scale = spec.scale ?? '0 → 0.5 → 1.0 (FULL SCALE) · 25 mm/s'
  body.push(`<text x="14" y="${H - 7}" font-family="'Courier New',monospace" font-size="10" fill="#7aa893">${esc(scale)}</text>`)
  body.push(`<text x="${W - 14}" y="${H - 7}" text-anchor="end" font-family="'Courier New',monospace" font-size="10" fill="#7aa893">${esc(spec.footer ?? 'BUREAU OF CONTINUITY RECORDS · COPY 2 OF 2')}</text>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body.join('')}</svg>`
}

export async function composeWaveform(spec) {
  const svg = waveformSpec(spec)
  const full = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
  const thumb = await sharp(full).resize(240, 240, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()
  return { full, thumb }
}

export { paperGround, damageLayer, finish, DOCUMENT_BUILDERS, fieldNote, personnelRecord, architecturalPlan, waveformSpec, sheetFurniture, documentFooter }
