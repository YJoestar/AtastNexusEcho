// Procedural damage. Every damaged artifact in the library carries a physical
// cause: torn from a folder, folded in a pocket, wet, burnt, scraped, or a
// section the archive simply never received.

import { makeRng, makeNoise1d, fractalNoise2d } from './rng.mjs'

/** Jagged tear path across a rectangle. `edge` selects which side tore away. */
export function tearPath({ width, height, edge = 'right', depth = 0.28, seed = 1, roughness = 1 }) {
  const rng = makeRng(seed)
  const noise = makeNoise1d(seed + 17, 4)
  const pts = []
  const steps = 46

  if (edge === 'right') {
    pts.push(`${width},0`)
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const base = width * (1 - depth * (0.35 + 0.65 * Math.sin(t * Math.PI * 0.9 + 0.2)))
      const jag = noise(t * 9) * 26 * roughness + rng.range(-6, 6)
      pts.push(`${Math.max(0, Math.min(width, base + jag)).toFixed(1)},${(t * height).toFixed(1)}`)
    }
  } else if (edge === 'bottom') {
    pts.push(`0,${height}`)
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const base = height * (1 - depth * (0.35 + 0.65 * Math.sin(t * Math.PI * 0.9 + 0.4)))
      const jag = noise(t * 8) * 24 * roughness + rng.range(-5, 5)
      pts.push(`${(t * width).toFixed(1)},${Math.max(0, Math.min(height, base + jag)).toFixed(1)}`)
    }
  } else if (edge === 'left') {
    pts.push(`0,0`)
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const base = width * depth * (0.3 + 0.7 * Math.sin(t * Math.PI * 0.9 + 0.3))
      const jag = noise(t * 8) * 24 * roughness + rng.range(-5, 5)
      pts.push(`${Math.max(0, base + jag).toFixed(1)},${(t * height).toFixed(1)}`)
    }
  } else {
    // corner: an L-shaped loss from the top-right
    const cutX = width * (1 - depth)
    const cutY = height * depth * 1.4
    pts.push(`0,0`, `${cutX},0`)
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = cutX + (width - cutX) * t
      const jag = noise(t * 10) * 20 * roughness
      pts.push(`${Math.min(width, x + jag).toFixed(1)},${(cutY * (1 - t) + noise(t * 5) * 12).toFixed(1)}`)
    }
    pts.push(`${width},${height}`)
  }
  return pts
}

/** SVG mask that removes a torn region, leaving a ragged physical edge. */
export function tearMask({ width, height, edge = 'right', depth = 0.28, seed = 1, id = 'tear', softness = 1.2 }) {
  const pts = tearPath({ width, height, edge, depth, seed })
  const polygon = `M ${edge === 'right' ? width : 0},0 L ${pts.join(' L ')} L ${edge === 'right' ? width : 0},${height} Z`
  return {
    defs: `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>
      <path d="${polygon}" fill="#000" filter="url(#${id}-soft)"/>
    </mask>
    <filter id="${id}-soft" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="${softness}"/>
    </filter>`,
    polygon,
  }
}

/** Irregular fragment outline: a closed shape that never touches the page edges. */
export function fragmentOutline({ width, height, seed = 1, irregularity = 0.16, points = 13 }) {
  const rng = makeRng(seed)
  const noise = makeNoise1d(seed + 3, 3)
  const pts = []
  const cx = width / 2
  const cy = height / 2
  const rx = width / 2
  const ry = height / 2
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2
    const k = 1 - irregularity * 0.5 + rng.range(-irregularity, irregularity) + noise(i * 1.7) * irregularity * 0.5
    pts.push(`${(cx + Math.cos(t) * rx * k).toFixed(1)},${(cy + Math.sin(t) * ry * k).toFixed(1)}`)
  }
  return pts
}

/** Burn: a charred edge that eats into the paper, with a scorch gradient. */
export function burnMask({ width, height, seed = 1, id = 'burn', originX = 0.5, originY = 0.9, radius = 0.3 }) {
  const rng = makeRng(seed)
  const noise = makeNoise1d(seed + 5, 4)
  const cx = width * originX
  const cy = height * originY
  const pts = []
  const steps = 54
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const k = 1 + noise(t * 4.5) * 0.28 + rng.range(-0.04, 0.04)
    pts.push(`${(cx + Math.cos(t) * width * radius * k).toFixed(1)},${(cy + Math.sin(t) * height * radius * k * 1.1).toFixed(1)}`)
  }
  return {
    defs: `<radialGradient id="${id}-heat" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#120a04" stop-opacity="0.97"/>
      <stop offset="52%" stop-color="#2a1608" stop-opacity="0.86"/>
      <stop offset="78%" stop-color="#6b3a12" stop-opacity="0.5"/>
      <stop offset="93%" stop-color="#a06a26" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#a06a26" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id}-rough" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.09" numOctaves="4" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`,
    shape: `<ellipse cx="${cx}" cy="${cy}" rx="${width * radius}" ry="${height * radius * 1.1}" fill="url(#${id}-heat)" filter="url(#${id}-rough)"/>`,
  }
}

/** Water damage: a tide line with a darker rim, the way a dried stain reads. */
export function stain({ width, height, seed = 1, cx = 0.5, cy = 0.5, r = 0.3, id = 'stain' }) {
  const noise = makeNoise1d(seed + 9, 3)
  const x = width * cx
  const y = height * cy
  const pts = []
  const steps = 40
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const k = 1 + noise(t * 3.2) * 0.22
    pts.push(`${(x + Math.cos(t) * width * r * k).toFixed(1)},${(y + Math.sin(t) * height * r * k * 1.15).toFixed(1)}`)
  }
  return {
    defs: `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7a6438" stop-opacity="0.16"/>
      <stop offset="68%" stop-color="#6b5730" stop-opacity="0.2"/>
      <stop offset="88%" stop-color="#5a4726" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#5a4726" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id}-rough" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`,
    shape: `<path d="M ${pts.join(' L ')} Z" fill="url(#${id})" filter="url(#${id}-rough)"/>`,
  }
}

/** A fold crease: a bright line with a shadow beside it. */
export function crease({ x1, y1, x2, y2, width: w = 3, shadow = 0.22 }) {
  return `<g>
    <line x1="${x1}" y1="${y1 + w * 0.7}" x2="${x2}" y2="${y2 + w * 0.7}" stroke="#000000" opacity="${shadow}" stroke-width="${w}"/>
    <line x1="${x1}" y1="${y1 - w * 0.5}" x2="${x2}" y2="${y2 - w * 0.5}" stroke="#ffffff" opacity="0.3" stroke-width="${w * 0.8}"/>
  </g>`
}

/** Scratches across an emulsion or a print surface. */
export function scratches({ width, height, seed = 1, count = 5, color = 'rgba(255,255,255,0.32)', onDark = true }) {
  const rng = makeRng(seed)
  const parts = []
  for (let i = 0; i < count; i++) {
    const x = rng.range(-0.1, 1.1) * width
    const y = rng.range(0, height)
    const length = rng.range(0.08, 0.6) * height
    const angle = rng.range(-0.35, 0.35) + (rng.chance(0.35) ? Math.PI / 2 : 0)
    parts.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + Math.cos(angle) * length).toFixed(1)}" y2="${(y + Math.sin(angle) * length).toFixed(1)}" stroke="${color}" stroke-width="${rng.range(0.5, 1.6).toFixed(1)}" stroke-opacity="${rng.range(0.2, 0.6).toFixed(2)}"/>`)
  }
  void onDark
  return parts.join('')
}

/** Faded section: ink and image lose contrast in one region. */
export function fade({ width, height, seed = 1, cx = 0.5, cy = 0.5, r = 0.35, id = 'fade' }) {
  const noise = makeNoise1d(seed + 21, 3)
  const pts = []
  for (let i = 0; i < 34; i++) {
    const t = (i / 34) * Math.PI * 2
    const k = 1 + noise(t * 3) * 0.3
    pts.push(`${(width * cx + Math.cos(t) * width * r * k).toFixed(1)},${(height * cy + Math.sin(t) * height * r * k).toFixed(1)}`)
  }
  return {
    defs: `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#efe6cf" stop-opacity="0.62"/>
      <stop offset="60%" stop-color="#e6dcc4" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#e6dcc4" stop-opacity="0"/>
    </radialGradient>`,
    shape: `<path d="M ${pts.join(' L ')} Z" fill="url(#${id})"/>`,
  }
}

/** Paper fibre and age mottle shared by every paper artifact. */
export function paperGrain({ width, height, seed = 1, strength = 1, id = 'grain' }) {
  const fbm = fractalNoise2d(seed, 3)
  const rng = makeRng(seed + 31)
  const parts = [`<filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="${seed}" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0 0.30  0 0 0 0.10 0"/>
  </filter>`]
  parts.push(`<rect width="${width}" height="${height}" filter="url(#${id})" opacity="${(0.5 * strength).toFixed(2)}"/>`)
  for (let i = 0; i < 90; i++) {
    const x = rng.range(0, width)
    const y = rng.range(0, height)
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rng.range(0.3, 1.5).toFixed(1)}" fill="#6f6244" opacity="${rng.range(0.02, 0.08).toFixed(3)}"/>`)
  }
  void fbm
  return parts.join('')
}

/** A missing strip: the section the archive never received. */
export function missingStrip({ width, y, h, seed = 1, id = 'missing' }) {
  const rng = makeRng(seed)
  const pts = []
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push(`${(t * width).toFixed(1)},${(y + rng.range(-2, 2)).toFixed(1)}`)
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    pts.push(`${(t * width).toFixed(1)},${(y + h + rng.range(-2, 2)).toFixed(1)}`)
  }
  return {
    defs: `<filter id="${id}-rough" x="-5%" y="-20%" width="110%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06 0.2" numOctaves="3" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`,
    shape: `<path d="M ${pts.join(' L ')} Z" fill="#17150f" filter="url(#${id}-rough)"/>
      <path d="M ${pts.join(' L ')} Z" fill="none" stroke="#8b7a56" stroke-width="1" stroke-opacity="0.5"/>`,
  }
}
