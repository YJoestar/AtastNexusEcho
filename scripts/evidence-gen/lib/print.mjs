// Physical presentation of a capture: the paper border, the caption strip, the
// evidence label, the corner registration marks. Without these a photograph is
// just an image; with them it is an object that was handled.

import { makeRng, makeNoise1d } from './rng.mjs'

export function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Wrap a caption into a fixed-width strip of monospace fields, the way a
 * processing lab writes the negative number and frame on the back of a print.
 */
export function captionFields(fields, maxChars = 78) {
  const rng = makeRng(fields.join('|'))
  const lines = []
  let current = ''
  for (const field of fields) {
    const piece = `${field}   `
    if (current.length + piece.length > maxChars && current.length > 0) {
      lines.push(current.trimEnd())
      current = ''
    }
    current += piece
  }
  if (current.trim()) lines.push(current.trimEnd())
  void rng
  return lines
}

/**
 * A recovered photographic print: white border, image window, caption strip
 * written in the lab's hand, and a gummed evidence label in the lower left.
 */
export function photoPrint({
  imageDataUrl,
  width,
  height,
  border = 26,
  captionBottom = 0,
  caption,
  label,
  cornerMarks = true,
  paperTint = '#e8e3d4',
  paperAge = 0.5,
  seed = 1,
  rotated = 0,
  labelTone = 'amber',
}) {
  const inner = { x: border, y: border, w: width - border * 2, h: height - border * 2 - captionBottom }
  const parts = []

  parts.push(`<rect width="${width}" height="${height}" fill="${paperTint}"/>`)

  // Paper stock: warm at the edges where the print has been handled most.
  const rng = makeRng(seed)
  const ageGradient = `paper-edge-${seed}`
  parts.push(`<defs>
    <radialGradient id="${ageGradient}" cx="50%" cy="46%" r="72%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="72%" stop-color="#6b5a3a" stop-opacity="${(0.05 * paperAge).toFixed(3)}"/>
      <stop offset="100%" stop-color="#5a4a2c" stop-opacity="${(0.16 * paperAge).toFixed(3)}"/>
    </radialGradient>
  </defs>`)
  parts.push(`<rect width="${width}" height="${height}" fill="url(#${ageGradient})"/>`)

  for (let i = 0; i < 26; i++) {
    const x = rng.range(0, width)
    const y = rng.range(0, height)
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rng.range(0.4, 1.6).toFixed(1)}" fill="#6a5a3c" opacity="${rng.range(0.03, 0.1).toFixed(3)}"/>`)
  }

  // Image window with a hairline keyline — the emulsion edge.
  parts.push(`<rect x="${inner.x - 1}" y="${inner.y - 1}" width="${inner.w + 2}" height="${inner.h + 2}" fill="#1b1a18"/>`)
  parts.push(`<image href="${imageDataUrl}" x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" preserveAspectRatio="xMidYMid slice" />`)
  parts.push(`<rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="1"/>`)

  if (cornerMarks) {
    const m = 9
    const len = 18
    const color = '#6f6a5c'
    const corners = [
      [inner.x, inner.y, 1, 1],
      [inner.x + inner.w, inner.y, -1, 1],
      [inner.x, inner.y + inner.h, 1, -1],
      [inner.x + inner.w, inner.y + inner.h, -1, -1],
    ]
    for (const [cx, cy, sx, sy] of corners) {
      parts.push(`<path d="M ${cx} ${cy + sy * m} L ${cx} ${cy} L ${cx + sx * m} ${cy}" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.7"/>`)
      parts.push(`<path d="M ${cx + sx * len} ${cy} L ${cx + sx * m} ${cy}" fill="none" stroke="${color}" stroke-width="0.5" stroke-opacity="0.4"/>`)
    }
  }

  // Caption strip: written on the back edge by the processing lab.
  if (captionBottom > 0 && caption?.length) {
    const capY = inner.y + inner.h + 12
    // The gummed label sits bottom-left; the caption starts to its right.
    const capX = label ? border + Math.max(96, label.length * 8.4 + 22) + 16 : border + 2
    const lines = caption
    lines.forEach((line, i) => {
      parts.push(`<text x="${capX}" y="${capY + 12 + i * 13}" font-family="'Courier New',Courier,monospace" font-size="10.5" letter-spacing="0.6" fill="#3b382f" opacity="0.9">${esc(line)}</text>`)
    })
  }

  // Gummed evidence label.
  if (label) {
    const lw = Math.max(96, label.length * 8.4 + 22)
    const lh = 34
    const lx = border + 2
    const ly = height - border - lh - 2
    const tone = labelTone === 'amber'
      ? { bg: '#d8b463', fg: '#2b2415', border: '#8a6f2f' }
      : { bg: '#cfc9b6', fg: '#33302a', border: '#7a7466' }
    parts.push(`<g transform="rotate(${rng.range(-1.6, 0.8).toFixed(2)} ${lx + lw / 2} ${ly + lh / 2})">
      <rect x="${lx}" y="${ly + 2}" width="${lw}" height="${lh}" fill="#000000" opacity="0.18"/>
      <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" fill="${tone.bg}" stroke="${tone.border}" stroke-width="0.8"/>
      <rect x="${lx + 3}" y="${ly + 3}" width="${lw - 6}" height="${lh - 6}" fill="none" stroke="${tone.border}" stroke-width="0.4" stroke-opacity="0.6"/>
      <text x="${lx + lw / 2}" y="${ly + 15}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="7.5" letter-spacing="1.4" fill="${tone.fg}" opacity="0.72">EVIDENCE / CONTROLLED</text>
      <text x="${lx + lw / 2}" y="${ly + 28}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="12" font-weight="bold" letter-spacing="0.8" fill="${tone.fg}">${esc(label)}</text>
    </g>`)
  }

  // Manufacturer's border text, printed on the paper stock itself.
  parts.push(`<text x="${width - border - 2}" y="${height - border - 4}" text-anchor="end" font-family="'Courier New',Courier,monospace" font-size="7" letter-spacing="1.1" fill="#7b7565" opacity="0.65">KODAK PORTRA 400 · NX BUREAU LAB 3</text>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g transform="rotate(${rotated} ${width / 2} ${height / 2})">${parts.join('')}</g>
</svg>`
}

/**
 * Surveillance on-screen display. Deliberately restrained: the frame is the
 * subject, the text is an instrument reading.
 */
export function surveillanceOsd({
  width,
  height,
  camera,
  location,
  date,
  time,
  state = 'REC',
  signal = 'STABLE',
  integrity = 'RECORD INTACT',
  frame,
  total,
  seed = 1,
  fontSize = 15,
}) {
  const pad = 10
  const parts = []
  const white = 'rgba(232,236,232,0.94)'
  const dim = 'rgba(214,220,214,0.7)'

  parts.push(`<text x="${pad}" y="${pad + fontSize}" font-family="'Courier New',Courier,monospace" font-size="${fontSize}" fill="${white}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2.5">${esc(camera)}</text>`)
  parts.push(`<text x="${pad}" y="${pad + fontSize * 2.3}" font-family="'Courier New',Courier,monospace" font-size="${fontSize * 0.86}" fill="${dim}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2">${esc(location)}</text>`)

  // Recording indicator: a filled dot, not a giant overlay.
  const dotX = width - pad - 12
  parts.push(`<circle cx="${dotX}" cy="${pad + 8}" r="5.5" fill="${state === 'REC' ? '#e04a3c' : 'rgba(180,180,180,0.5)'}"/>`)
  parts.push(`<text x="${width - pad - 22}" y="${pad + fontSize}" text-anchor="end" font-family="'Courier New',Courier,monospace" font-size="${fontSize}" fill="${state === 'REC' ? white : dim}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2.5">${esc(state)}</text>`)
  parts.push(`<text x="${width - pad}" y="${pad + fontSize * 2.3}" text-anchor="end" font-family="'Courier New',Courier,monospace" font-size="${fontSize * 0.86}" fill="${dim}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2">${esc(signal)}</text>`)

  const baseY = height - pad
  parts.push(`<text x="${pad}" y="${baseY - fontSize * 1.1}" font-family="'Courier New',Courier,monospace" font-size="${fontSize * 1.1}" fill="${white}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2.5">${esc(date)}</text>`)
  parts.push(`<text x="${pad}" y="${baseY}" font-family="'Courier New',Courier,monospace" font-size="${fontSize * 1.1}" fill="${white}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2.5">${esc(time)}</text>`)
  parts.push(`<text x="${width / 2}" y="${baseY}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="${fontSize * 0.8}" fill="${dim}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2">${esc(integrity)}</text>`)
  if (frame !== undefined && total !== undefined) {
    parts.push(`<text x="${width - pad}" y="${baseY}" text-anchor="end" font-family="'Courier New',Courier,monospace" font-size="${fontSize * 0.9}" fill="${white}" style="paint-order:stroke" stroke="rgba(0,0,0,0.75)" stroke-width="2.5">F ${String(frame).padStart(6, '0')}/${String(total).padStart(6, '0')}</text>`)
  }

  // Signal bars — a real DVR drew these, and they are the only gauge present.
  const bars = signal === 'STABLE' ? 4 : signal === 'DEGRADED' ? 2 : signal === 'LOW' ? 1 : 0
  for (let i = 0; i < 4; i++) {
    const bh = 5 + i * 4
    parts.push(`<rect x="${width - pad - 62 + i * 6}" y="${pad + 22 - bh}" width="4" height="${bh}" fill="${i < bars ? white : 'rgba(120,124,120,0.35)'}"/>`)
  }
  void seed
  return parts.join('')
}

/**
 * A field archive envelope: the paper sleeve an artifact is stored in. Used as
 * the identity of a fragment in the register.
 */
export function evidenceEnvelope({ width, height, code, title, type, condition, state, seed = 1 }) {
  const rng = makeRng(seed)
  const parts = []
  parts.push(`<rect width="${width}" height="${height}" fill="#cdc6b1"/>`)
  parts.push(`<rect x="6" y="6" width="${width - 12}" height="${height - 12}" fill="none" stroke="#8d8367" stroke-width="1"/>`)
  parts.push(`<path d="M 0 ${height * 0.34} L ${width} ${height * 0.28} L ${width} 0 L 0 0 Z" fill="#c3bba4"/>`)
  parts.push(`<path d="M 0 ${height * 0.34} L ${width} ${height * 0.28}" stroke="#9a9078" stroke-width="1.4" fill="none"/>`)
  parts.push(`<text x="${width / 2}" y="${height * 0.2}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="15" letter-spacing="2" fill="#3b382e">NEXUS ECHO</text>`)
  parts.push(`<text x="${width / 2}" y="${height * 0.2 + 15}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="9" letter-spacing="3" fill="#6a6455">BUREAU OF CONTINUITY RECORDS</text>`)
  parts.push(`<text x="18" y="${height * 0.5}" font-family="'Courier New',Courier,monospace" font-size="20" font-weight="bold" letter-spacing="1" fill="#2b2820">${esc(code)}</text>`)
  parts.push(`<text x="18" y="${height * 0.5 + 20}" font-family="'Courier New',Courier,monospace" font-size="12" fill="#4a463c">${esc(title)}</text>`)
  parts.push(`<text x="18" y="${height * 0.5 + 42}" font-family="'Courier New',Courier,monospace" font-size="10" letter-spacing="1.5" fill="#6a6455">${esc(type)} / ${esc(condition)} / ${esc(state)}</text>`)
  for (let i = 0; i < 20; i++) {
    parts.push(`<circle cx="${rng.range(8, width - 8).toFixed(1)}" cy="${rng.range(8, height - 8).toFixed(1)}" r="${rng.range(0.3, 1.1).toFixed(1)}" fill="#6b5c3c" opacity="${rng.range(0.03, 0.09).toFixed(3)}"/>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`
}

/** Rubber stamp, slightly misregistered, as applied to case paper. */
export function stamp({ x, y, text, sub, color = '#7a2b26', rotation = -7, size = 15, weight = 'bold', opacity = 0.72, double = true }) {
  const w = Math.max(96, text.length * size * 0.72)
  const h = size * 3.1
  const parts = []
  parts.push(`<g transform="translate(${x} ${y}) rotate(${rotation})" opacity="${opacity}">`)
  if (double) {
    parts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="2.4"/>`)
    parts.push(`<rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="${color}" stroke-width="0.9"/>`)
  }
  parts.push(`<text x="${w / 2}" y="${h * 0.46}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="${size}" font-weight="${weight}" letter-spacing="1.5" fill="${color}">${esc(text)}</text>`)
  if (sub) parts.push(`<text x="${w / 2}" y="${h * 0.72}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="${size * 0.52}" letter-spacing="2" fill="${color}">${esc(sub)}</text>`)
  parts.push(`</g>`)
  return parts.join('')
}

/** Freehand ink annotation: a circled region with a leader line and a note. */
export function penAnnotation({ cx, cy, r, note, color = '#8a2f24', rotation = 0, seed = 1, style = 'circle' }) {
  const rng = makeRng(seed)
  const wobble = makeNoise1d(seed, 3)
  const parts = []
  parts.push(`<g opacity="0.82" transform="rotate(${rotation} ${cx} ${cy})">`)
  if (style === 'circle') {
    // Two overlapping passes, the way a hand actually circles something.
    for (let pass = 0; pass < 2; pass++) {
      const pts = []
      const steps = 40
      const rr = r * (pass === 0 ? 1 : 0.94 + rng.range(-0.03, 0.05))
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2
        const w = 1 + wobble(i * 0.4 + pass * 3) * 0.06
        pts.push(`${(cx + Math.cos(t) * rr * w * 1.14).toFixed(1)},${(cy + Math.sin(t) * rr * w).toFixed(1)}`)
      }
      parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${pass === 0 ? 2.1 : 1.3}" stroke-opacity="${pass === 0 ? 0.85 : 0.6}" stroke-linecap="round"/>`)
    }
  } else {
    const pts = []
    const steps = 26
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      pts.push(`${(cx - r + t * r * 2).toFixed(1)},${(cy - r * 0.5 + t * r + wobble(i * 0.7) * 3).toFixed(1)}`)
    }
    parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.8" stroke-linecap="round"/>`)
  }
  if (note) {
    const nx = cx + r * 1.2
    const ny = cy - r * 1.15
    parts.push(`<line x1="${cx + r * 0.72}" y1="${cy - r * 0.72}" x2="${nx - 6}" y2="${ny + 6}" stroke="${color}" stroke-width="1.3" stroke-opacity="0.7"/>`)
    parts.push(`<text x="${nx}" y="${ny}" font-family="'Segoe Print','Bradley Hand',cursive" font-size="13" fill="${color}">${esc(note)}</text>`)
  }
  parts.push(`</g>`)
  return parts.join('')
}
