// Deterministic seeded randomness. Every asset in the NEXUS ECHO art library is
// reproducible: the same seed always produces the same photograph, the same tear,
// the same surveillance frame. Nothing in the library is random at build time.

export function hashSeed(text) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export function makeRng(seed) {
  let state = (typeof seed === 'number' ? seed : hashSeed(String(seed))) >>> 0
  if (state === 0) state = 0x9e3779b9

  const next = () => {
    // xorshift32
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }

  const rng = () => next()

  rng.range = (min, max) => min + next() * (max - min)
  rng.int = (min, max) => Math.floor(min + next() * (max - min + 1))
  rng.pick = list => list[Math.floor(next() * list.length) % list.length]
  rng.chance = p => next() < p
  rng.sign = () => (next() < 0.5 ? -1 : 1)

  // Box-Muller, cached
  let spare = null
  rng.normal = (mean = 0, sd = 1) => {
    if (spare !== null) {
      const value = spare
      spare = null
      return mean + sd * value
    }
    let u = 0
    let v = 0
    let s = 0
    do {
      u = next() * 2 - 1
      v = next() * 2 - 1
      s = u * u + v * v
    } while (s === 0 || s >= 1)
    const mul = Math.sqrt((-2 * Math.log(s)) / s)
    spare = v * mul
    return mean + sd * u * mul
  }

  rng.shuffle = list => {
    const out = list.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      const tmp = out[i]
      out[i] = out[j]
      out[j] = tmp
    }
    return out
  }

  return rng
}

// Smooth 1D value noise used for hand-drawn wobble, tears and signal drift.
export function makeNoise1d(seed, octaves = 3) {
  const rng = makeRng(seed)
  const tables = []
  for (let o = 0; o < octaves; o++) {
    const size = 64
    const table = new Float32Array(size)
    for (let i = 0; i < size; i++) table[i] = rng() * 2 - 1
    tables.push({ size, table, amp: 1 / Math.pow(2, o) })
  }
  let total = 0
  for (const t of tables) total += t.amp
  return x => {
    let sum = 0
    for (const { size, table, amp } of tables) {
      const scaled = (x * size) / 8
      const i0 = Math.floor(scaled)
      const f = scaled - i0
      const a = table[((i0 % size) + size) % size]
      const b = table[(((i0 + 1) % size) + size) % size]
      const t = f * f * (3 - 2 * f)
      sum += (a + (b - a) * t) * amp
    }
    return sum / total
  }
}

// Smooth 2D value noise — paper fibre, sensor noise fields, surface mottling.
export function makeNoise2d(seed, size = 64) {
  const rng = makeRng(seed)
  const table = new Float32Array(size * size)
  for (let i = 0; i < table.length; i++) table[i] = rng()
  const at = (x, y) => table[(((y % size) + size) % size) * size + (((x % size) + size) % size)]
  return (x, y) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const n00 = at(x0, y0)
    const n10 = at(x0 + 1, y0)
    const n01 = at(x0, y0 + 1)
    const n11 = at(x0 + 1, y0 + 1)
    return (n00 + (n10 - n00) * sx) * (1 - sy) + (n01 + (n11 - n01) * sx) * sy
  }
}

export function fractalNoise2d(seed, octaves = 4) {
  const layers = []
  let amplitude = 1
  let frequency = 1
  let total = 0
  for (let i = 0; i < octaves; i++) {
    layers.push({ noise: makeNoise2d(seed + i * 7919, 64), amplitude, frequency })
    total += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return (x, y) => {
    let sum = 0
    for (const layer of layers) sum += layer.noise(x * layer.frequency, y * layer.frequency) * layer.amplitude
    return sum / total
  }
}
