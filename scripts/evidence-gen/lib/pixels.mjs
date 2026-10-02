// Photographic and analog post-processing. Everything here operates on a linear
// float RGB buffer and is what separates "a render" from "a recovered print":
// lens behaviour, sensor noise, highlight bloom, film grain, dust, scratches,
// print border, and paper material for documents.

import { makeNoise2d, fractalNoise2d, makeRng } from './rng.mjs'

export function createCanvas(width, height) {
  return { width, height, data: new Float32Array(width * height * 3) }
}

export function cloneCanvas(source) {
  const out = createCanvas(source.width, source.height)
  out.data.set(source.data)
  return out
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

export function mapCanvas(canvas, fn) {
  const { data } = canvas
  for (let i = 0, p = 0; i < data.length; i += 3, p++) {
    const out = fn(data[i], data[i + 1], data[i + 2], p)
    data[i] = out[0]
    data[i + 1] = out[1]
    data[i + 2] = out[2]
  }
  return canvas
}

/** Rec.709-ish tone curve with black lift, so shadows stay analogue, not digital. */
export function toneMap(canvas, { exposure = 1, blackLift = 0.012, contrast = 1.06, whitePoint = 1 } = {}) {
  return mapCanvas(canvas, (r, g, b) => {
    const curve = v => {
      const lifted = v * exposure
      const shaped = Math.pow(clamp01(lifted), 1 / whitePoint)
      return clamp01(blackLift + (shaped - blackLift) * contrast)
    }
    return [curve(r), curve(g), curve(b)]
  })
}

export function desaturate(canvas, amount = 1, tint = [1, 1, 1]) {
  return mapCanvas(canvas, (r, g, b) => {
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return [
      clamp01((r * (1 - amount) + luma * amount) * tint[0]),
      clamp01((g * (1 - amount) + luma * amount) * tint[1]),
      clamp01((b * (1 - amount) + luma * amount) * tint[2]),
    ]
  })
}

export function colorGrade(canvas, { shadows = [0, 0, 0], highlights = [0, 0, 0], mix = 1 } = {}) {
  return mapCanvas(canvas, (r, g, b) => {
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const t = (1 - luma) * mix
    return [
      clamp01(r + shadows[0] * t + highlights[0] * luma * mix),
      clamp01(g + shadows[1] * t + highlights[1] * luma * mix),
      clamp01(b + shadows[2] * t + highlights[2] * luma * mix),
    ]
  })
}

export function vignette(canvas, { strength = 0.55, radius = 0.78, softness = 0.55, aspect = 1 } = {}) {
  const { width, height, data } = canvas
  const cx = width / 2
  const cy = height / 2
  const maxRadius = Math.hypot(cx, cy) / radius
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / maxRadius
      const dy = ((y - cy) / maxRadius) * aspect
      const d = Math.hypot(dx, dy)
      const falloff = clamp01((d - (1 - softness)) / softness)
      const factor = 1 - strength * falloff * falloff
      const index = (y * width + x) * 3
      data[index] *= factor
      data[index + 1] *= factor
      data[index + 2] *= factor
    }
  }
  return canvas
}

/** Separable box blur, run three times to approximate a gaussian. */
export function blur(canvas, radius = 2, passes = 3) {
  if (radius < 0.5) return canvas
  const { width, height } = canvas
  let src = canvas.data
  let dst = new Float32Array(src.length)
  const r = Math.max(1, Math.round(radius))

  for (let pass = 0; pass < passes; pass++) {
    // Horizontal
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sr = 0
        let sg = 0
        let sb = 0
        let count = 0
        for (let k = -r; k <= r; k++) {
          const sx = x + k
          if (sx < 0 || sx >= width) continue
          const index = (y * width + sx) * 3
          sr += src[index]
          sg += src[index + 1]
          sb += src[index + 2]
          count++
        }
        const index = (y * width + x) * 3
        dst[index] = sr / count
        dst[index + 1] = sg / count
        dst[index + 2] = sb / count
      }
    }
    ;[src, dst] = [dst, src]
    // Vertical
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sr = 0
        let sg = 0
        let sb = 0
        let count = 0
        for (let k = -r; k <= r; k++) {
          const sy = y + k
          if (sy < 0 || sy >= height) continue
          const index = (sy * width + x) * 3
          sr += src[index]
          sg += src[index + 1]
          sb += src[index + 2]
          count++
        }
        const index = (y * width + x) * 3
        dst[index] = sr / count
        dst[index + 1] = sg / count
        dst[index + 2] = sb / count
      }
    }
    ;[src, dst] = [dst, src]
  }

  canvas.data.set(src)
  return canvas
}

/** Blur that grows with distance from a focus point — a cheap depth of field. */
export function depthOfField(canvas, { focusX = 0.5, focusY = 0.5, maxRadius = 3, focusSpread = 0.35 } = {}) {
  const { width, height, data } = canvas
  const copy = new Float32Array(data)
  const r = Math.max(1, Math.round(maxRadius))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot((x / width - focusX), (y / height - focusY))
      const amount = clamp01((d - focusSpread) / (1 - focusSpread))
      const radius = Math.round(amount * r)
      if (radius < 1) continue
      let sr = 0
      let sg = 0
      let sb = 0
      let count = 0
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const sx = x + kx
          const sy = y + ky
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
          const index = (sy * width + sx) * 3
          sr += copy[index]
          sg += copy[index + 1]
          sb += copy[index + 2]
          count++
        }
      }
      const index = (y * width + x) * 3
      data[index] = data[index] * (1 - 0.75) + (sr / count) * 0.75
      data[index + 1] = data[index + 1] * (1 - 0.75) + (sg / count) * 0.75
      data[index + 2] = data[index + 2] * (1 - 0.75) + (sb / count) * 0.75
    }
  }
  return canvas
}

/** Highlight bloom: light sources bleed into the emulsion. */
export function bloom(canvas, { threshold = 0.72, radius = 14, strength = 0.5 } = {}) {
  const { width, height, data } = canvas
  const bright = createCanvas(width, height)
  for (let i = 0, p = 0; i < data.length; i += 3, p++) {
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    const amount = Math.max(0, luma - threshold) / Math.max(0.0001, 1 - threshold)
    bright.data[i] = data[i] * amount
    bright.data[i + 1] = data[i + 1] * amount
    bright.data[i + 2] = data[i + 2] * amount
  }
  blur(bright, radius, 2)
  for (let i = 0; i < data.length; i++) {
    data[i] = clamp01(data[i] + bright.data[i] * strength)
  }
  return canvas
}

/**
 * Sensor noise that respects luminance: shadows get chroma noise and blotching,
 * highlights get fine grain. This is the single most convincing film cue.
 */
export function sensorNoise(canvas, seed, { amount = 0.06, chroma = 0.5, shadowBias = 1.4 } = {}) {
  const rng = makeRng(seed)
  const { data } = canvas
  const blockNoise = makeNoise2d(seed + 11, 64)
  for (let i = 0, p = 0; i < data.length; i += 3, p++) {
    const x = p % canvas.width
    const y = (p / canvas.width) | 0
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    const shadowWeight = 1 + (1 - luma) * (shadowBias - 1)
    const mono = (rng() - 0.5) * amount * shadowWeight
    const cr = (rng() - 0.5) * amount * chroma * shadowWeight
    const cg = (rng() - 0.5) * amount * chroma * shadowWeight
    const cb = (rng() - 0.5) * amount * chroma * shadowWeight
    const blotch = (blockNoise(x * 0.06, y * 0.06) - 0.5) * amount * 1.1
    data[i] = clamp01(data[i] + mono + cr + blotch)
    data[i + 1] = clamp01(data[i + 1] + mono + cg + blotch)
    data[i + 2] = clamp01(data[i + 2] + mono + cb + blotch)
  }
  return canvas
}

/** Film grain: coarser, monochrome, applied after the tone curve. */
export function filmGrain(canvas, seed, amount = 0.05, size = 1) {
  const rng = makeRng(seed)
  const { width, height, data } = canvas
  const gw = Math.ceil(width / size)
  const gh = Math.ceil(height / size)
  const field = new Float32Array(gw * gh)
  for (let i = 0; i < field.length; i++) field[i] = rng() - 0.5
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = field[(Math.floor(y / size) % gh) * gw + (Math.floor(x / size) % gw)]
      const index = (y * width + x) * 3
      const luma = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
      // Grain is strongest in the midtones, as on real emulsion.
      const weight = 1 - Math.abs(luma - 0.45) * 1.3
      const delta = g * amount * Math.max(0, weight)
      data[index] = clamp01(data[index] + delta)
      data[index + 1] = clamp01(data[index + 1] + delta)
      data[index + 2] = clamp01(data[index + 2] + delta)
    }
  }
  return canvas
}

/** Barrel distortion with lateral chromatic aberration — cheap glass character. */
export function lensDistortion(canvas, { amount = 0.06, chromatic = 1.2 } = {}) {
  const { width, height, data } = canvas
  const src = new Float32Array(data)
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.hypot(cx, cy)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / maxR
      const dy = (y - cy) / maxR
      const r2 = dx * dx + dy * dy
      const factor = 1 + amount * r2
      for (let channel = 0; channel < 3; channel++) {
        const scale = 1 + (chromatic * (channel - 1)) / maxR * 0.02 * r2
        const sx = cx + dx * maxR * factor * scale
        const sy = cy + dy * maxR * factor * scale
        data[(y * width + x) * 3 + channel] = sampleBilinear(src, width, height, sx, sy, channel)
      }
    }
  }
  return canvas
}

function sampleBilinear(src, width, height, x, y, channel) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const at = (sx, sy) => {
    const cx = Math.max(0, Math.min(width - 1, sx))
    const cy = Math.max(0, Math.min(height - 1, sy))
    return src[(cy * width + cx) * 3 + channel]
  }
  const a = at(x0, y0)
  const b = at(x0 + 1, y0)
  const c = at(x0, y0 + 1)
  const d = at(x0 + 1, y0 + 1)
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}

/** Radial flash falloff — the signature of a handheld shot in a dark building. */
export function flashFalloff(canvas, { centerX = 0.5, centerY = 0.46, radius = 0.95, strength = 0.55, softness = 0.5 } = {}) {
  const { width, height, data } = canvas
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x / width - centerX) * (width / height)
      const dy = y / height - centerY
      const d = Math.hypot(dx, dy) / radius
      const t = clamp01(1 - d)
      const gain = 1 + strength * Math.pow(t, 1 + softness * 3)
      const index = (y * width + x) * 3
      data[index] = clamp01(data[index] * gain)
      data[index + 1] = clamp01(data[index + 1] * gain)
      data[index + 2] = clamp01(data[index + 2] * gain)
    }
  }
  return canvas
}

/** Dust specks, hairline scratches and emulsion damage on the recovered print. */
export function physicalImperfections(canvas, seed, { dust = 60, scratches = 4, smudges = 3 } = {}) {
  const rng = makeRng(seed)
  const { width, height, data } = canvas
  const setPx = (x, y, v) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const index = (y * width + x) * 3
    data[index] = clamp01(v[0])
    data[index + 1] = clamp01(v[1])
    data[index + 2] = clamp01(v[2])
  }

  for (let i = 0; i < dust; i++) {
    const x = Math.floor(rng.range(0, width))
    const y = Math.floor(rng.range(0, height))
    const size = rng.chance(0.15) ? rng.int(2, 5) : 1
    const bright = rng.chance(0.62)
    const alpha = rng.range(0.12, bright ? 0.5 : 0.35)
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const index = ((y + dy) * width + (x + dx)) * 3
        if (bright) {
          data[index] = clamp01(data[index] + alpha)
          data[index + 1] = clamp01(data[index + 1] + alpha)
          data[index + 2] = clamp01(data[index + 2] + alpha * 0.9)
        } else {
          data[index] = clamp01(data[index] * (1 - alpha))
          data[index + 1] = clamp01(data[index + 1] * (1 - alpha))
          data[index + 2] = clamp01(data[index + 2] * (1 - alpha))
        }
      }
    }
  }

  for (let i = 0; i < scratches; i++) {
    const startX = rng.range(0, width)
    const startY = rng.range(0, height)
    const length = rng.range(height * 0.1, height * 0.6)
    const angle = rng.range(-0.5, 0.5) + (rng.chance(0.5) ? 0 : Math.PI / 2)
    const bright = rng.chance(0.55)
    for (let t = 0; t < length; t++) {
      const x = startX + Math.cos(angle) * t
      const y = startY + Math.sin(angle) * t
      const alpha = rng.range(0.04, 0.16)
      const existing = [(y * width + x) * 3]
      const current = [data[existing[0]], data[existing[0] + 1], data[existing[0] + 2]]
      setPx(
        Math.round(x),
        Math.round(y),
        bright
          ? [current[0] + alpha, current[1] + alpha, current[2] + alpha * 0.8]
          : [current[0] * (1 - alpha), current[1] * (1 - alpha), current[2] * (1 - alpha)],
      )
    }
  }

  const smudgeNoise = fractalNoise2d(seed + 313, 3)
  for (let i = 0; i < smudges; i++) {
    const cx = rng.range(0.2, 0.8) * width
    const cy = rng.range(0.2, 0.8) * height
    const radius = rng.range(width * 0.04, width * 0.13)
    const strengthValue = rng.range(0.05, 0.16)
    for (let y = Math.max(0, cy - radius) | 0; y < Math.min(height, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius) | 0; x < Math.min(width, cx + radius); x++) {
        const d = Math.hypot(x - cx, y - cy) / radius
        if (d > 1) continue
        const n = smudgeNoise(x * 0.02, y * 0.02)
        const alpha = strengthValue * (1 - d) * n
        const index = (y * width + x) * 3
        data[index] = clamp01(data[index] * (1 - alpha * 0.7))
        data[index + 1] = clamp01(data[index + 1] * (1 - alpha * 0.75))
        data[index + 2] = clamp01(data[index + 2] * (1 - alpha * 0.6))
      }
    }
  }

  return canvas
}

/** Interlaced-scan compression blocking — the signature of a CCTV DVR. */
export function compressionBlocks(canvas, seed, { block = 8, strength = 0.5, banding = 0.35 } = {}) {
  const rng = makeRng(seed)
  const { width, height, data } = canvas
  const blockW = Math.ceil(width / block)
  const blockH = Math.ceil(height / block)
  const offsets = new Float32Array(blockW * blockH)
  for (let i = 0; i < offsets.length; i++) offsets[i] = rng() - 0.5

  for (let by = 0; by < blockH; by++) {
    for (let bx = 0; bx < blockW; bx++) {
      const offset = offsets[by * blockW + bx] * strength * 0.16
      for (let y = by * block; y < Math.min(height, (by + 1) * block); y++) {
        for (let x = bx * block; x < Math.min(width, (bx + 1) * block); x++) {
          const index = (y * width + x) * 3
          data[index] = clamp01(data[index] + offset)
          data[index + 1] = clamp01(data[index + 1] + offset)
          data[index + 2] = clamp01(data[index + 2] + offset)
        }
      }
    }
  }

  // Macroblock-aligned horizontal banding.
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / block)
    const delta = (offsets[(row % blockH) * blockW] ?? 0) * banding * 0.08
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3
      data[index] = clamp01(data[index] + delta)
      data[index + 1] = clamp01(data[index + 1] + delta)
      data[index + 2] = clamp01(data[index + 2] + delta)
    }
  }
  return canvas
}

/** Interlace comb on moving content and rolling-shutter skew. */
export function interlace(canvas, seed, { skew = 0.6, dropChance = 0.04 } = {}) {
  const rng = makeRng(seed)
  const { width, height, data } = canvas
  for (let y = 0; y < height; y++) {
    const shift = Math.round(Math.sin(y * 0.05) * skew)
    for (let x = 0; x < width; x++) {
      const sx = Math.max(0, Math.min(width - 1, x + shift))
      const index = (y * width + x) * 3
      const other = (y * width + sx) * 3
      if (y % 2 === 0) {
        data[index] = data[index] * 0.72 + data[other] * 0.28
        data[index + 1] = data[index + 1] * 0.72 + data[other + 1] * 0.28
        data[index + 2] = data[index + 2] * 0.72 + data[other + 2] * 0.28
      }
    }
  }
  if (dropChance > 0) {
    for (let i = 0; i < Math.round(height * dropChance * 0.2); i++) {
      const y = Math.floor(rng.range(0, height))
      const h = rng.int(1, 4)
      const alpha = rng.range(0.1, 0.35)
      for (let yy = y; yy < Math.min(height, y + h); yy++) {
        for (let x = 0; x < width; x++) {
          const index = (yy * width + x) * 3
          data[index] *= 1 - alpha
          data[index + 1] *= 1 - alpha
          data[index + 2] *= 1 - alpha
        }
      }
    }
  }
  return canvas
}

/** Horizontal signal tear across a band — a dropped frame on tape. */
export function signalTear(canvas, seed, { y, height: bandHeight, strength = 0.7 } = {}) {
  const rng = makeRng(seed)
  const { width, height, data } = canvas
  const y0 = Math.max(0, y)
  const y1 = Math.min(height, y + bandHeight)
  for (let yy = y0; yy < y1; yy++) {
    const t = (yy - y0) / Math.max(1, y1 - y0)
    const edge = 1 - Math.abs(t - 0.5) * 2
    for (let x = 0; x < width; x++) {
      const index = (yy * width + x) * 3
      const amount = strength * (0.35 + edge * 0.65)
      data[index] *= 1 - amount
      data[index + 1] *= 1 - amount
      data[index + 2] *= 1 - amount
      if (rng.chance(0.08)) {
        data[index] = clamp01(data[index] + rng.range(0.1, 0.5))
        data[index + 1] = clamp01(data[index + 1] + rng.range(0.1, 0.5))
        data[index + 2] = clamp01(data[index + 2] + rng.range(0.1, 0.5))
      }
    }
  }
  return canvas
}

/** An unusable region: sensor failure, water, or a segment the archive lost. */
export function deadRegion(canvas, seed, { x = 0.5, y = 0.5, w = 0.2, h = 0.2, style = 'noise' } = {}) {
  const rng = makeRng(seed)
  const { width, height, data } = canvas
  const x0 = Math.max(0, Math.floor((x - w / 2) * width))
  const x1 = Math.min(width, Math.ceil((x + w / 2) * width))
  const y0 = Math.max(0, Math.floor((y - h / 2) * height))
  const y1 = Math.min(height, Math.ceil((y + h / 2) * height))

  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const index = (yy * width + xx) * 3
      if (style === 'black') {
        data[index] = 0.01
        data[index + 1] = 0.012
        data[index + 2] = 0.014
      } else if (style === 'white') {
        data[index] = 0.96
        data[index + 1] = 0.95
        data[index + 2] = 0.92
      } else {
        const v = rng.range(0.05, 0.85)
        data[index] = v
        data[index + 1] = v
        data[index + 2] = v * 0.98
      }
    }
  }
  return canvas
}

/** Convert float buffer to a sharp-compatible raw RGB buffer. */
export function toRaw(canvas) {
  const { data } = canvas
  const out = Buffer.allocUnsafe(data.length)
  for (let i = 0; i < data.length; i++) {
    const v = data[i]
    out[i] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255)
  }
  return out
}

/** Resample a float canvas to a new size (used for thumbnails before encoding). */
export function resizeCanvas(canvas, width, height) {
  const out = createCanvas(width, height)
  for (let y = 0; y < height; y++) {
    const sy = Math.min(canvas.height - 1, (y * canvas.height) / height)
    const y0 = Math.floor(sy)
    const fy = sy - y0
    const y1 = Math.min(canvas.height - 1, y0 + 1)
    for (let x = 0; x < width; x++) {
      const sx = Math.min(canvas.width - 1, (x * canvas.width) / width)
      const x0 = Math.floor(sx)
      const fx = sx - x0
      const x1 = Math.min(canvas.width - 1, x0 + 1)
      for (let c = 0; c < 3; c++) {
        const a = canvas.data[(y0 * canvas.width + x0) * 3 + c]
        const b = canvas.data[(y0 * canvas.width + x1) * 3 + c]
        const d = canvas.data[(y1 * canvas.width + x0) * 3 + c]
        const e = canvas.data[(y1 * canvas.width + x1) * 3 + c]
        out.data[(y * width + x) * 3 + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy
      }
    }
  }
  return out
}
