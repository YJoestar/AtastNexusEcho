// Scene construction. These are the actual rooms of the HALDER INSTITUTE: a
// 1974 institutional building with painted block walls, terrazzo corridors,
// fluorescent troffers, steel shelving and lab benches. Every photograph and
// surveillance frame in the art library is a render of one of these rooms.

import { v3, box, quad, face } from './render3d.mjs'
import { makeNoise2d, makeRng } from './rng.mjs'

const plaster = (seed, tint = 1) => {
  const n = makeNoise2d(seed, 48)
  const m = makeNoise2d(seed + 5, 16)
  return (x, y) => tint * (0.86 + n(x * 1.6, y * 1.6) * 0.14 + m(x * 0.22, y * 0.22) * 0.12)
}

const paintedBlock = (seed, tint = 1) => {
  const n = makeNoise2d(seed, 48)
  // Mortar courses: a horizontal line every 0.22m in Y, running joints offset.
  return (x, y, z) => {
    const course = Math.abs(((y % 0.22) + 0.22) % 0.22)
    const along = Math.abs(((x + z) % 0.44 + 0.44) % 0.44)
    const joint = course < 0.008 || (Math.abs(course - 0.11) < 0.006 && along < 0.012) ? 0.86 : 1
    return tint * joint * (0.9 + n(x * 3, y * 3) * 0.1)
  }
}

const terrazzo = (seed, tint = 1) => {
  const speck = makeNoise2d(seed, 64)
  const grit = makeNoise2d(seed + 9, 32)
  return (x, z) => {
    const tileX = Math.abs(((x % 0.6) + 0.6) % 0.6)
    const tileZ = Math.abs(((z % 0.6) + 0.6) % 0.6)
    const grout = tileX < 0.012 || tileZ < 0.012 ? 0.72 : 1
    const chips = speck(x * 34, z * 34) > 0.78 ? 1.22 : speck(x * 34, z * 34) < 0.2 ? 0.82 : 1
    return tint * grout * chips * (0.94 + grit(x * 2, z * 2) * 0.1)
  }
}

const brushedMetal = (seed, tint = 1) => {
  const n = makeNoise2d(seed, 32)
  return (x, y, z) => tint * (0.9 + n((x + z) * 26, y * 3) * 0.14)
}

const ceilingTile = (seed, tint = 1) => {
  const n = makeNoise2d(seed, 32)
  return (x, z) => {
    const gx = Math.abs(((x % 0.61) + 0.61) % 0.61)
    const gz = Math.abs(((z % 0.61) + 0.61) % 0.61)
    const grid = gx < 0.016 || gz < 0.016 ? 0.66 : 1
    // Water staining in the corner tiles.
    const stain = n(x * 0.7, z * 0.7) > 0.72 ? 0.86 : 1
    return tint * grid * stain * (0.95 + n(x * 6, z * 6) * 0.08)
  }
}

/** Emissive ceiling troffer — the only real light source in a night corridor. */
export function troffer(cx, cy, cz, sx, sz, options = {}) {
  return quad(v3(cx - sx / 2, cy, cz - sz / 2), v3(sx, 0, 0), v3(0, 0, sz), {
    color: options.color ?? [210, 214, 206],
    emissive: options.emissive ?? 0.62,
    roughness: 1,
    doubleSided: true,
    tag: 'fixture',
  })
}

export function wallSign(x, y, z, w, h, rotY, color, emissive = 0) {
  // A flat plate in the XY plane at depth z, facing +Z or -Z.
  const dir = rotY === 0 ? 1 : -1
  return face(
    [v3(x, y, z), v3(x + w * dir, y, z), v3(x + w * dir, y + h, z), v3(x, y + h, z)],
    { color, emissive, doubleSided: true, roughness: 0.7, tag: 'sign' },
  )
}

/**
 * A door in a wall. By default the wall faces +Z (an end wall) and the leaf
 * runs along X. For a corridor's side walls pass `wall: 'side'` and `inward`
 * (+1 or -1, the direction into the room): the leaf then runs along Z in the
 * wall plane, and `open` swings it into the room. Side-wall doors used to be
 * built along X, which stood every door across the corridor like a slab.
 */
export function addDoor(faces, { x, y, z, width, height, frame = [126, 118, 104], panel = [92, 84, 72], open = 0, kick = true, wall = 'end', inward = 1 }) {
  const side = wall === 'side'
  const along = (t, lift) => (side
    ? v3(x + inward * t * Math.sin(open), y + lift, z + t * Math.cos(open))
    : v3(x + t * Math.cos(open), y + lift, z + t * Math.sin(open)))
  const at = (t, lift, push = 0) => {
    const p = along(t, lift)
    return side ? v3(p.x + inward * push, p.y, p.z) : v3(p.x, p.y, p.z + push)
  }
  faces.push(
    face(
      [at(0, 0), at(width, 0), at(width, height), at(0, height)],
      { color: panel, roughness: 0.75, doubleSided: true, texture: brushedMetal(7, 1), tag: 'door' },
    ),
  )
  faces.push(...(side
    ? box(x + inward * 0.06, y + height / 2 + 0.06, z + width / 2, 0.12, height + 0.12, width + 0.14, { color: frame, sideColor: frame, topColor: frame })
    : box(x + width / 2, y + height / 2 + 0.06, z + 0.06, width + 0.14, height + 0.12, 0.12, { color: frame, sideColor: frame, topColor: frame })))
  if (kick) {
    faces.push(face(
      [at(0.04, 0.02, 0.07), at(width, 0.02, 0.07), at(width, 0.32, 0.07), at(0.04, 0.32, 0.07)],
      { color: [70, 68, 64], roughness: 0.5, doubleSided: true, tag: 'kick' },
    ))
  }
}

export function addWindow(faces, { x, y, z, w, h, boarded = false, glow = 0, tint = [120, 150, 165] }) {
  if (glow > 0) {
    faces.push(face(
      [v3(x, y, z), v3(x + w, y, z), v3(x + w, y + h, z), v3(x, y + h, z)],
      { color: tint, emissive: glow, doubleSided: true, roughness: 0.4, tag: 'window' },
    ))
  } else {
    faces.push(face(
      [v3(x, y, z), v3(x + w, y, z), v3(x + w, y + h, z), v3(x, y + h, z)],
      { color: [26, 30, 34], roughness: 0.15, doubleSided: true, tag: 'window' },
    ))
  }
  if (boarded) {
    const rng = makeRng(Math.round(x * 100 + z * 17))
    const boards = rng.int(3, 5)
    for (let i = 0; i < boards; i++) {
      const by = y + (h / boards) * i + rng.range(-0.03, 0.03)
      faces.push(face(
        [v3(x - 0.03, by, z + 0.05), v3(x + w + 0.03, by + rng.range(-0.04, 0.04), z + 0.05), v3(x + w + 0.03, by + 0.19, z + 0.05), v3(x - 0.03, by + 0.19, z + 0.05)],
        { color: [96, 78, 56], roughness: 0.95, doubleSided: true, tag: 'board' },
      ))
    }
  }
  faces.push(...box(x + w / 2, y + h / 2, z + 0.03, w + 0.12, h + 0.12, 0.06, {
    color: [104, 100, 92], sideColor: [104, 100, 92], topColor: [104, 100, 92],
  }))
}

export function addShelving(faces, { x, y, z, w, h, d, shelves = 4, seed = 3 }) {
  const rng = makeRng(seed)
  const frameColor = [78, 84, 88]
  for (let s = 0; s <= shelves; s++) {
    const sy = y + (h / shelves) * s
    faces.push(...box(x + w / 2, sy, z, w, 0.035, d, { color: frameColor, sideColor: frameColor, topColor: frameColor, roughness: 0.6 }))
  }
  for (const px of [x, x + w]) {
    for (const pz of [z - d / 2, z + d / 2]) {
      faces.push(...box(px, y + h / 2, pz, 0.05, h, 0.05, { color: frameColor, sideColor: frameColor, topColor: frameColor, roughness: 0.6 }))
    }
  }
  // Boxes and folders on the shelves.
  for (let s = 0; s < shelves; s++) {
    const shelfY = y + (h / shelves) * s + 0.02
    let cursor = x + 0.06
    while (cursor < x + w - 0.12) {
      if (rng.chance(0.24)) { cursor += rng.range(0.05, 0.18); continue }
      const bw = rng.range(0.16, 0.36)
      const bh = rng.range(0.16, 0.3)
      const bd = rng.range(d * 0.6, d * 0.92)
      const shade = rng.range(0.72, 1.12)
      faces.push(...box(cursor + bw / 2, shelfY + bh / 2, z + rng.range(-0.03, 0.03), bw, bh, bd, {
        color: [128 * shade, 112 * shade, 84 * shade],
        sideColor: [118 * shade, 104 * shade, 78 * shade],
        topColor: [136 * shade, 120 * shade, 92 * shade],
        roughness: 0.95,
      }))
      cursor += bw + rng.range(0.01, 0.06)
    }
  }
}

export function addDesk(faces, { x, y, z, w, d, height = 0.74, seed = 5, monitor = false, paper = true }) {
  const rng = makeRng(seed)
  const wood = [96, 76, 54]
  faces.push(...box(x, y + height, z, w, 0.045, d, { color: wood, sideColor: [78, 60, 42], topColor: [110, 88, 62], roughness: 0.6 }))
  for (const dx of [-w / 2 + 0.08, w / 2 - 0.08]) {
    for (const dz of [-d / 2 + 0.07, d / 2 - 0.07]) {
      faces.push(...box(x + dx, y + height / 2, z + dz, 0.05, height, 0.05, { color: [64, 62, 58], sideColor: [58, 56, 52], topColor: [64, 62, 58], roughness: 0.5 }))
    }
  }
  // Pedestal drawer unit.
  faces.push(...box(x - w / 2 + 0.28, y + height / 2 + 0.03, z, 0.48, height - 0.06, d - 0.08, {
    color: [88, 84, 76], sideColor: [78, 74, 68], topColor: [92, 88, 80], roughness: 0.7,
  }))
  if (paper) {
    const count = rng.int(1, 4)
    for (let i = 0; i < count; i++) {
      const px = x + rng.range(-w / 4, w / 4)
      const pz = z + rng.range(-d / 4, d / 4)
      faces.push(face(
        [v3(px, y + height + 0.024, pz), v3(px + 0.21, y + height + 0.024, pz + 0.01), v3(px + 0.21, y + height + 0.026, pz + 0.29), v3(px, y + height + 0.026, pz + 0.28)],
        { color: [176, 172, 160], roughness: 1, doubleSided: true, tag: 'paper' },
      ))
    }
  }
  if (monitor) {
    const mx = x + rng.range(-0.3, 0.3)
    faces.push(...box(mx, y + height + 0.02, z - 0.1, 0.3, 0.02, 0.2, { color: [56, 54, 52], sideColor: [50, 48, 46], topColor: [60, 58, 56] }))
    faces.push(...box(mx, y + height + 0.13, z - 0.1, 0.06, 0.2, 0.06, { color: [52, 50, 48] }))
    faces.push(...box(mx, y + height + 0.35, z - 0.11, 0.42, 0.32, 0.34, {
      color: [70, 70, 66], sideColor: [58, 58, 54], topColor: [76, 76, 72], roughness: 0.5,
    }))
    faces.push(face(
      [v3(mx - 0.18, y + height + 0.22, z - 0.28), v3(mx + 0.18, y + height + 0.22, z - 0.28), v3(mx + 0.18, y + height + 0.48, z - 0.28), v3(mx - 0.18, y + height + 0.48, z - 0.28)],
      { color: [64, 96, 92], emissive: 0.16, doubleSided: true, tag: 'screen' },
    ))
  }
}

export function addLabBench(faces, { x, y, z, w, d, seed = 7 }) {
  const rng = makeRng(seed)
  const steel = [132, 136, 138]
  faces.push(...box(x, y + 0.9, z, w, 0.05, d, { color: steel, sideColor: [110, 114, 116], topColor: [146, 150, 152], roughness: 0.35, texture: brushedMetal(seed, 1) }))
  faces.push(...box(x, y + 0.44, z, w - 0.06, 0.04, d - 0.06, { color: [96, 100, 102], sideColor: [88, 92, 94], topColor: [104, 108, 110] }))
  for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) {
    for (const dz of [-d / 2 + 0.1, d / 2 - 0.1]) {
      faces.push(...box(x + dx, y + 0.45, z + dz, 0.05, 0.9, 0.05, { color: [88, 92, 94], sideColor: [82, 86, 88], topColor: [92, 96, 98] }))
    }
  }
  // Glassware and instruments on the bench.
  const items = rng.int(3, 6)
  for (let i = 0; i < items; i++) {
    const px = x + rng.range(-w / 2 + 0.2, w / 2 - 0.2)
    const pz = z + rng.range(-d / 2 + 0.15, d / 2 - 0.15)
    const kind = rng.int(0, 2)
    if (kind === 0) {
      const h = rng.range(0.14, 0.26)
      faces.push(face(
        [v3(px - 0.05, y + 0.925, pz), v3(px + 0.05, y + 0.925, pz), v3(px + 0.05, y + 0.925 + h, pz), v3(px - 0.05, y + 0.925 + h, pz)],
        { color: [180, 200, 196], roughness: 0.1, doubleSided: true, alpha: 0.55, tag: 'glass' },
      ))
      faces.push(face(
        [v3(px - 0.04, y + 0.927, pz + 0.001), v3(px + 0.04, y + 0.927, pz + 0.001), v3(px + 0.04, y + 0.927 + h * 0.45, pz + 0.001), v3(px - 0.04, y + 0.927 + h * 0.45, pz + 0.001)],
        { color: [148, 168, 96], roughness: 0.3, doubleSided: true, alpha: 0.6, tag: 'fluid' },
      ))
    } else if (kind === 1) {
      faces.push(...box(px, y + 0.95, pz, 0.18, 0.05, 0.14, { color: [66, 66, 62], sideColor: [58, 58, 56], topColor: [72, 72, 68] }))
      faces.push(face(
        [v3(px - 0.07, y + 0.976, pz - 0.05), v3(px + 0.07, y + 0.976, pz - 0.05), v3(px + 0.07, y + 0.976, pz + 0.05), v3(px - 0.07, y + 0.976, pz + 0.05)],
        { color: [72, 108, 96], emissive: 0.1, doubleSided: true, tag: 'screen' },
      ))
    } else {
      faces.push(...box(px, y + 0.98, pz, 0.1, 0.11, 0.1, { color: [148, 144, 132], sideColor: [138, 134, 122], topColor: [156, 152, 140] }))
    }
  }
}

export function addCrate(faces, { x, y, z, w, h, d, seed = 11, tilt = 0 }) {
  const rng = makeRng(seed)
  const shade = rng.range(0.8, 1.15)
  faces.push(...box(x, y + h / 2, z, w, h, d, {
    color: [118 * shade, 94 * shade, 62 * shade],
    sideColor: [104 * shade, 82 * shade, 54 * shade],
    topColor: [132 * shade, 106 * shade, 72 * shade],
    roughness: 0.95,
  }))
  // Stencilled shipping mark.
  faces.push(face(
    [v3(x - w * 0.3, y + h * 0.45, z - d / 2 - 0.002), v3(x + w * 0.3, y + h * 0.45, z - d / 2 - 0.002), v3(x + w * 0.3, y + h * 0.66, z - d / 2 - 0.002), v3(x - w * 0.3, y + h * 0.66, z - d / 2 - 0.002)],
    { color: [46, 42, 38], roughness: 1, doubleSided: true, alpha: 0.6, tag: 'stencil' },
  ))
  void tilt
}

export function addLockers(faces, { x, y, z, count = 4, width = 0.3, height = 1.8, depth = 0.45, seed = 13 }) {
  const rng = makeRng(seed)
  for (let i = 0; i < count; i++) {
    const lx = x + i * width
    const shade = rng.range(0.86, 1.06)
    faces.push(...box(lx + width / 2, y + height / 2, z, width - 0.01, height, depth, {
      color: [84 * shade, 92 * shade, 88 * shade],
      sideColor: [70 * shade, 78 * shade, 74 * shade],
      topColor: [92 * shade, 100 * shade, 96 * shade],
      roughness: 0.55,
    }))
    if (rng.chance(0.3)) {
      // A door left ajar — a dark slot, not a black box.
      faces.push(face(
        [v3(lx + 0.02, y + 0.1, z - depth / 2 - 0.02), v3(lx + width - 0.03, y + 0.1, z - depth / 2 - 0.16), v3(lx + width - 0.03, y + height - 0.1, z - depth / 2 - 0.16), v3(lx + 0.02, y + height - 0.1, z - depth / 2 - 0.02)],
        { color: [12, 13, 14], doubleSided: true, tag: 'locker-gap' },
      ))
    }
  }
}

export function addPipeRun(faces, { x, y, z, length, count = 3, radius = 0.06, color = [96, 88, 76] }) {
  for (let i = 0; i < count; i++) {
    const oy = y + i * (radius * 2.6)
    const ox = x + (i % 2) * radius * 3
    faces.push(...box(ox, oy, z + length / 2, radius * 2, radius * 2, length, {
      color, sideColor: color, topColor: [color[0] * 1.2, color[1] * 1.2, color[2] * 1.2], roughness: 0.5,
    }))
  }
}

export function addChair(faces, { x, y, z, seed = 17 }) {
  const rng = makeRng(seed)
  const seat = [72, 66, 58]
  faces.push(...box(x, y + 0.45, z, 0.44, 0.05, 0.44, { color: seat, sideColor: seat, topColor: [84, 78, 68] }))
  faces.push(...box(x, y + 0.72, z - 0.2, 0.42, 0.5, 0.05, { color: seat, sideColor: seat, topColor: [84, 78, 68] }))
  for (const dx of [-0.18, 0.18]) {
    for (const dz of [-0.18, 0.18]) {
      faces.push(...box(x + dx, y + 0.22, z + dz, 0.035, 0.45, 0.035, { color: [58, 56, 52] }))
    }
  }
  if (rng.chance(0.5)) {
    // Some chairs are stacked or overturned in a decommissioned wing.
    faces.push(...box(x, y + 0.62, z, 0.44, 0.05, 0.44, { color: seat, sideColor: seat, topColor: [80, 74, 66] }))
  }
}

export function addConduit(faces, { x, y, z, length, color = [110, 104, 92] }) {
  faces.push(...box(x, y, z + length / 2, 0.05, 0.05, length, { color, sideColor: color, topColor: color, roughness: 0.6 }))
}

export function addRadiator(faces, { x, y, z, length = 0.9 }) {
  faces.push(...box(x, y + 0.42, z, 0.12, 0.6, length, {
    color: [138, 134, 124], sideColor: [126, 122, 112], topColor: [148, 144, 134], roughness: 0.6,
  }))
  for (let i = 0; i < 7; i++) {
    faces.push(...box(x, y + 0.42, z - length / 2 + 0.06 + i * (length / 7), 0.16, 0.56, 0.02, {
      color: [120, 116, 108], sideColor: [114, 110, 102], topColor: [126, 122, 114],
    }))
  }
}

/** A human silhouette used sparingly — the horror lives in the frame, not in a filter. */
export function addFigure(faces, { x, y, z, height = 1.75, facing = 0, lean = 0, color = [16, 16, 18] }) {
  const parts = [
    // torso
    { cx: x, cy: y + height * 0.62, cz: z, sx: 0.42, sy: height * 0.42, sz: 0.24 },
    // head
    { cx: x, cy: y + height * 0.92, cz: z, sx: 0.19, sy: 0.24, sz: 0.2 },
    // legs
    { cx: x - 0.1, cy: y + height * 0.22, cz: z, sx: 0.15, sy: height * 0.44, sz: 0.16 },
    { cx: x + 0.1, cy: y + height * 0.22, cz: z, sx: 0.15, sy: height * 0.44, sz: 0.16 },
    // arms
    { cx: x - 0.26, cy: y + height * 0.6, cz: z, sx: 0.12, sy: height * 0.36, sz: 0.14 },
    { cx: x + 0.26, cy: y + height * 0.6, cz: z, sx: 0.12, sy: height * 0.36, sz: 0.14 },
  ]
  for (const part of parts) {
    const px = part.cx + Math.cos(facing) * lean
    faces.push(...box(px, part.cy, part.cz, part.sx, part.sy, part.sz, {
      color, sideColor: color, topColor: [color[0] * 1.6, color[1] * 1.6, color[2] * 1.6], roughness: 1,
    }))
  }
}

/**
 * The canonical corridor. Everything else in the art library is this room
 * with different dressing, different camera placement and different dressing
 * of the light.
 */
export function corridorScene(options = {}) {
  const {
    length = 26,
    width = 2.6,
    height = 2.9,
    lightsOn = true,
    lightEvery = 4.2,
    lightStart = 2.2,
    doorSide = 'left',
    doorEvery = 6.2,
    endDoor = true,
    signAt = null,
    ambient = [0.1, 0.108, 0.125],
    fogNear = 8,
    fogFar = 30,
    seed = 1,
    exposureHint = 1,
  } = options

  const faces = []
  const lights = []
  const hw = width / 2
  const wallColor = [148, 146, 136]
  const floorColor = [116, 114, 106]

  faces.push(quad(v3(-hw, 0, 0), v3(width, 0, 0), v3(0, 0, length), {
    color: floorColor, roughness: 0.55, texture: terrazzo(seed, 1), tag: 'floor', doubleSided: true,
  }))
  faces.push(quad(v3(-hw, height, length), v3(width, 0, 0), v3(0, 0, -length), {
    color: [130, 128, 120], roughness: 0.9, texture: ceilingTile(seed + 3, 1), tag: 'ceiling', doubleSided: true,
  }))
  faces.push(face([v3(-hw, 0, 0), v3(-hw, height, 0), v3(-hw, height, length), v3(-hw, 0, length)], {
    color: wallColor, roughness: 0.92, texture: paintedBlock(seed + 1, 1), tag: 'wall-left', doubleSided: true,
  }))
  faces.push(face([v3(hw, 0, length), v3(hw, height, length), v3(hw, height, 0), v3(hw, 0, 0)], {
    color: wallColor, roughness: 0.92, texture: paintedBlock(seed + 2, 1), tag: 'wall-right', doubleSided: true,
  }))
  faces.push(face([v3(-hw, 0, length), v3(hw, 0, length), v3(hw, height, length), v3(-hw, height, length)], {
    color: [134, 132, 124], roughness: 0.92, texture: paintedBlock(seed + 4, 1), tag: 'wall-end', doubleSided: true,
  }))

  // Skirting and a painted dado band: the horizontal lines that make a corridor read.
  for (const side of [-1, 1]) {
    faces.push(...box(side * hw, 0.075, length / 2, 0.04, 0.15, length, {
      color: [64, 62, 58], sideColor: [58, 56, 52], topColor: [70, 68, 64], roughness: 0.5,
    }))
    faces.push(face(
      side < 0
        ? [v3(-hw + 0.005, 0.98, 0), v3(-hw + 0.005, 0.98, length), v3(-hw + 0.005, 1.06, length), v3(-hw + 0.005, 1.06, 0)]
        : [v3(hw - 0.005, 0.98, length), v3(hw - 0.005, 0.98, 0), v3(hw - 0.005, 1.06, 0), v3(hw - 0.005, 1.06, length)],
      { color: [78, 92, 84], roughness: 0.9, doubleSided: true, tag: 'dado' },
    ))
  }

  for (let z = lightStart; z < length; z += lightEvery) {
    if (lightsOn) {
      faces.push(...box(0, height - 0.03, z, 1.22, 0.07, 0.32, {
        color: [96, 96, 92], sideColor: [90, 90, 86], topColor: [102, 102, 98],
      }))
      faces.push(troffer(0, height - 0.075, z, 1.12, 0.26, { emissive: 0.6, color: [216, 220, 210] }))
      lights.push({ position: v3(0, height - 0.2, z), intensity: 0.82 * exposureHint, range: 7.2, color: [1.0, 1.02, 0.96] })
    } else {
      faces.push(...box(0, height - 0.03, z, 1.22, 0.07, 0.32, {
        color: [82, 82, 78], sideColor: [78, 78, 74], topColor: [88, 88, 84],
      }))
    }
  }

  for (let z = 3.4; z < length - 2; z += doorEvery) {
    const side = doorSide === 'right' ? 1 : -1
    if ((doorSide === 'alternate' || doorSide === 'both') && ((Math.round(z / doorEvery) % 2) === 1)) {
      addDoor(faces, { x: side * (hw - 0.06), y: 0, z, width: 0.92, height: 2.06, open: 0, wall: 'side', inward: -side })
    } else {
      addDoor(faces, { x: side * (hw - 0.06), y: 0, z, width: 0.92, height: 2.06, open: 0, wall: 'side', inward: -side })
    }
    addDoor(faces, { x: -side * (hw - 0.06), y: 0, z: z + doorEvery * 0.5, width: 0.92, height: 2.06, open: 0.32, wall: 'side', inward: side })
  }

  if (endDoor) {
    addDoor(faces, { x: -0.48, y: 0, z: length - 0.04, width: 0.96, height: 2.1, open: 0 })
  }

  if (signAt) {
    faces.push(wallSign(signAt.x ?? -hw + 0.02, signAt.y ?? 2.12, signAt.z ?? 2.4, signAt.w ?? 0.5, signAt.h ?? 0.16, 0, signAt.color ?? [176, 172, 158], signAt.emissive ?? 0.12))
  }

  return {
    faces,
    lights,
    ambient,
    ambientSky: [ambient[0] * 1.4, ambient[1] * 1.4, ambient[2] * 1.6],
    fog: [34, 35, 37],
    fogNear,
    fogFar,
    background: [7, 8, 9],
  }
}

/** Archive / records room: shelving runs, a card index, sorting tables. */
export function archiveRoomScene(options = {}) {
  const { seed = 21, lit = true } = options
  const w = 7.2
  const d = 9.5
  const h = 3.1
  const faces = []
  const lights = []

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: [104, 100, 92], roughness: 0.6, texture: terrazzo(seed, 0.9), tag: 'floor', doubleSided: true }))
  faces.push(quad(v3(-w / 2, h, d), v3(w, 0, 0), v3(0, 0, -d), { color: [126, 124, 116], roughness: 0.9, texture: ceilingTile(seed + 2, 1), tag: 'ceiling', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, 0), v3(-w / 2, h, 0), v3(-w / 2, h, d), v3(-w / 2, 0, d)], { color: [140, 138, 128], roughness: 0.92, texture: paintedBlock(seed + 1, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(w / 2, 0, d), v3(w / 2, h, d), v3(w / 2, h, 0), v3(w / 2, 0, 0)], { color: [140, 138, 128], roughness: 0.92, texture: paintedBlock(seed + 2, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], { color: [132, 130, 122], roughness: 0.92, texture: paintedBlock(seed + 3, 1), tag: 'wall', doubleSided: true }))

  // Aisle shelving on both sides, aisle running to the back wall.
  for (let i = 0; i < 3; i++) {
    const z = 2.4 + i * 2.5
    addShelving(faces, { x: -w / 2 + 0.1, y: 0, z, w: 0.62, h: 2.1, d: 2.1, shelves: 5, seed: seed + i })
    addShelving(faces, { x: w / 2 - 0.72, y: 0, z, w: 0.62, h: 2.1, d: 2.1, shelves: 5, seed: seed + 10 + i })
  }
  addShelving(faces, { x: -1.7, y: 0, z: d - 0.9, w: 3.4, h: 1.9, d: 0.55, shelves: 4, seed: seed + 31 })

  // Sorting table with a card index cabinet.
  faces.push(...box(0.1, 0.78, 3.0, 2.0, 0.05, 1.0, { color: [104, 82, 58], sideColor: [86, 68, 48], topColor: [118, 96, 68] }))
  for (const dx of [-0.9, 0.9]) {
    for (const dz of [-0.42, 0.42]) {
      faces.push(...box(0.1 + dx, 0.39, 3.0 + dz, 0.06, 0.78, 0.06, { color: [70, 68, 62] }))
    }
  }
  faces.push(...box(2.4, 0.7, 4.6, 0.9, 1.4, 0.62, { color: [96, 88, 74], sideColor: [84, 78, 66], topColor: [104, 96, 82], roughness: 0.75 }))
  for (let i = 0; i < 5; i++) {
    faces.push(...box(2.4, 0.24 + i * 0.24, 4.28, 0.78, 0.19, 0.04, { color: [116, 108, 92], sideColor: [110, 102, 88], topColor: [124, 116, 100] }))
    faces.push(face(
      [v3(2.06, 0.18 + i * 0.24, 4.25), v3(2.74, 0.18 + i * 0.24, 4.25), v3(2.74, 0.3 + i * 0.24, 4.25), v3(2.06, 0.3 + i * 0.24, 4.25)],
      { color: [176, 170, 152], roughness: 1, doubleSided: true, alpha: 0.5, tag: 'card' },
    ))
  }

  addWindow(faces, { x: -w / 2 + 0.03, y: 1.5, z: 1.2, w: 0.001, h: 0.001, boarded: true })

  for (let i = 0; i < 3; i++) {
    const z = 2.2 + i * 3.1
    faces.push(...box(0, h - 0.05, z, 1.3, 0.08, 0.34, { color: [92, 92, 88], sideColor: [86, 86, 82], topColor: [98, 98, 94] }))
    if (lit) {
      faces.push(troffer(0, h - 0.1, z, 1.2, 0.28, { emissive: 0.5, color: [212, 214, 202] }))
      lights.push({ position: v3(0, h - 0.3, z), intensity: 0.8, range: 7.4, color: [1, 1, 0.95] })
    }
  }

  return {
    faces,
    lights,
    ambient: [0.03, 0.033, 0.038],
    ambientSky: [0.05, 0.055, 0.062],
    fog: [30, 31, 33],
    fogNear: 9,
    fogFar: 30,
    background: [6, 7, 8],
  }
}

/** Stairwell: flights, landings, a fire door, an exit sign. */
export function stairwellScene(options = {}) {
  const { seed = 31, lit = true } = options
  const faces = []
  const lights = []
  const w = 3.2
  const d = 5.4
  const h = 3.4

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: [98, 96, 90], roughness: 0.6, texture: terrazzo(seed, 0.92), tag: 'floor', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, 0), v3(-w / 2, h, 0), v3(-w / 2, h, d), v3(-w / 2, 0, d)], { color: [146, 144, 134], roughness: 0.92, texture: paintedBlock(seed + 1, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(w / 2, 0, d), v3(w / 2, h, d), v3(w / 2, h, 0), v3(w / 2, 0, 0)], { color: [146, 144, 134], roughness: 0.92, texture: paintedBlock(seed + 2, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], { color: [138, 136, 128], roughness: 0.92, texture: paintedBlock(seed + 3, 1), tag: 'wall', doubleSided: true }))

  // A flight of concrete steps climbing away from the camera.
  const steps = 11
  const rise = 0.17
  const run = 0.28
  for (let i = 0; i < steps; i++) {
    const y = i * rise
    const z = 1.0 + i * run
    faces.push(...box(0, y + rise / 2, z, w - 0.5, rise, run, {
      color: [122, 120, 114], sideColor: [96, 94, 88], topColor: [136, 134, 126], roughness: 0.7,
    }))
    // Nosing stripe: worn yellow, mostly scuffed away.
    faces.push(face(
      [v3(-(w / 2 - 0.25), y + rise - 0.002, z - run / 2 - 0.002), v3(w / 2 - 0.25, y + rise - 0.002, z - run / 2 - 0.002), v3(w / 2 - 0.25, y + rise - 0.002, z - run / 2 + 0.045), v3(-(w / 2 - 0.25), y + rise - 0.002, z - run / 2 + 0.045)],
      { color: [148, 126, 46], roughness: 0.9, doubleSided: true, alpha: 0.55, tag: 'nosing' },
    ))
  }

  // Handrail on the open side.
  for (let i = 0; i < steps; i++) {
    const y = i * rise
    const z = 1.0 + i * run
    faces.push(...box(w / 2 - 0.34, y + 0.92, z, 0.05, 0.05, run, { color: [92, 88, 80], sideColor: [86, 82, 76], topColor: [98, 94, 86] }))
    if (i % 2 === 0) {
      faces.push(...box(w / 2 - 0.34, y + 0.48, z, 0.04, 0.92, 0.04, { color: [88, 84, 78] }))
    }
  }

  addConduit(faces, { x: -w / 2 + 0.1, y: 2.4, z: 1.0, length: 3.6 })
  addPipeRun(faces, { x: w / 2 - 0.2, y: h - 0.5, z: 0.8, length: 3.4, count: 2, radius: 0.05 })

  if (lit) {
    faces.push(...box(0, h - 0.06, 1.6, 0.5, 0.1, 0.24, { color: [90, 90, 86], sideColor: [84, 84, 80], topColor: [96, 96, 92] }))
    faces.push(troffer(0, h - 0.12, 1.6, 0.42, 0.18, { emissive: 0.44, color: [210, 208, 196] }))
    lights.push({ position: v3(0, h - 0.3, 1.7), intensity: 0.72, range: 6.4, color: [1, 1, 0.94] })
    // Exit sign: the only saturated colour in the building.
    faces.push(wallSign(-w / 2 + 0.02, 2.36, 3.4, 0.42, 0.17, 0, [40, 120, 66], 0.7))
  }

  return {
    faces,
    lights,
    ambient: [0.028, 0.031, 0.036],
    ambientSky: [0.042, 0.046, 0.052],
    fog: [28, 29, 31],
    fogNear: 6,
    fogFar: 22,
    background: [6, 7, 8],
  }
}

/** Basement plant room: concrete, pipework, a valve tree, standing water. */
export function plantRoomScene(options = {}) {
  const { seed = 41, lit = true } = options
  const faces = []
  const lights = []
  const w = 6.0
  const d = 8.0
  const h = 2.6
  const concrete = [96, 96, 92]

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: [84, 84, 80], roughness: 0.85, texture: plaster(seed, 0.9), tag: 'floor', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, 0), v3(-w / 2, h, 0), v3(-w / 2, h, d), v3(-w / 2, 0, d)], { color: concrete, roughness: 0.95, texture: plaster(seed + 1, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(w / 2, 0, d), v3(w / 2, h, d), v3(w / 2, h, 0), v3(w / 2, 0, 0)], { color: concrete, roughness: 0.95, texture: plaster(seed + 2, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], { color: [88, 88, 84], roughness: 0.95, texture: plaster(seed + 3, 1), tag: 'wall', doubleSided: true }))
  faces.push(quad(v3(-w / 2, h, d), v3(w, 0, 0), v3(0, 0, -d), { color: [78, 78, 74], roughness: 0.95, texture: plaster(seed + 4, 1), tag: 'ceiling', doubleSided: true }))

  addPipeRun(faces, { x: -w / 2 + 0.35, y: 2.05, z: 0.4, length: d - 0.8, count: 3, radius: 0.075, color: [110, 96, 72] })
  addPipeRun(faces, { x: w / 2 - 0.3, y: 2.15, z: 0.4, length: d - 0.8, count: 2, radius: 0.055, color: [88, 92, 96] })

  // Valve tree.
  faces.push(...box(-1.1, 0.9, 4.2, 0.16, 1.8, 0.16, { color: [96, 92, 84] }))
  faces.push(...box(-1.1, 1.7, 4.2, 1.5, 0.12, 0.12, { color: [110, 100, 82] }))
  for (let i = 0; i < 3; i++) {
    faces.push(...box(-1.7 + i * 0.6, 1.78, 4.2, 0.26, 0.05, 0.26, { color: [128, 72, 56], sideColor: [116, 64, 50], topColor: [138, 80, 62], roughness: 0.5 }))
  }

  // Pump skid.
  faces.push(...box(1.6, 0.34, 2.0, 1.5, 0.68, 0.9, { color: [72, 88, 82], sideColor: [62, 78, 72], topColor: [82, 98, 92], roughness: 0.6 }))
  faces.push(...box(1.6, 0.76, 2.0, 0.7, 0.16, 0.6, { color: [64, 64, 60] }))
  faces.push(...box(1.6, 0.9, 1.68, 0.4, 0.12, 0.04, { color: [70, 108, 96], emissive: 0.12, doubleSided: true, tag: 'gauge' }))

  addCrate(faces, { x: -2.3, y: 0, z: 1.4, w: 0.7, h: 0.55, d: 0.5, seed: seed + 2 })
  addCrate(faces, { x: -2.35, y: 0.55, z: 1.42, w: 0.62, h: 0.45, d: 0.44, seed: seed + 3 })
  addCrate(faces, { x: 2.3, y: 0, z: 5.4, w: 0.8, h: 0.6, d: 0.6, seed: seed + 4 })

  // Standing water: a dark reflective sheet with a mirror of the light.
  faces.push(face([v3(-1.2, 0.004, 2.6), v3(3.0, 0.004, 2.6), v3(3.0, 0.004, 4.6), v3(-1.2, 0.004, 4.6)], {
    color: [22, 26, 28], roughness: 0.02, doubleSided: true, alpha: 0.72, tag: 'water',
  }))

  if (lit) {
    faces.push(...box(0, h - 0.08, 2.2, 0.32, 0.12, 0.2, { color: [88, 88, 84] }))
    faces.push(troffer(0, h - 0.15, 2.2, 0.26, 0.14, { emissive: 0.4, color: [206, 204, 190] }))
    lights.push({ position: v3(0, h - 0.32, 2.3), intensity: 0.6, range: 6, color: [1, 0.98, 0.9] })
  }

  return {
    faces,
    lights,
    ambient: [0.022, 0.024, 0.028],
    ambientSky: [0.03, 0.032, 0.036],
    fog: [26, 27, 29],
    fogNear: 5,
    fogFar: 20,
    background: [5, 6, 7],
  }
}

/** Laboratory: benches, fume hood, glassware, blackboard still on the wall. */
export function labScene(options = {}) {
  const { seed = 51, lit = true } = options
  const faces = []
  const lights = []
  const w = 6.4
  const d = 8.4
  const h = 3.0

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: [116, 114, 108], roughness: 0.4, texture: terrazzo(seed, 0.96), tag: 'floor', doubleSided: true }))
  faces.push(quad(v3(-w / 2, h, d), v3(w, 0, 0), v3(0, 0, -d), { color: [140, 138, 132], roughness: 0.9, texture: ceilingTile(seed + 2, 1), tag: 'ceiling', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, 0), v3(-w / 2, h, 0), v3(-w / 2, h, d), v3(-w / 2, 0, d)], { color: [176, 176, 168], roughness: 0.75, texture: plaster(seed + 1, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(w / 2, 0, d), v3(w / 2, h, d), v3(w / 2, h, 0), v3(w / 2, 0, 0)], { color: [176, 176, 168], roughness: 0.75, texture: plaster(seed + 2, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], { color: [166, 166, 158], roughness: 0.8, texture: plaster(seed + 3, 1), tag: 'wall', doubleSided: true }))

  // Chemical whiteboard: the surviving part of a lesson nobody finished.
  faces.push(...box(-1.4, 1.75, d - 0.08, 2.4, 1.3, 0.08, { color: [58, 62, 60], sideColor: [52, 56, 54], topColor: [64, 68, 66] }))
  faces.push(face(
    [v3(-2.5, 1.18, d - 0.125), v3(-0.3, 1.18, d - 0.125), v3(-0.3, 2.32, d - 0.125), v3(-2.5, 2.32, d - 0.125)],
    { color: [206, 206, 196], roughness: 0.5, doubleSided: true, tag: 'board' },
  ))

  addLabBench(faces, { x: -1.6, y: 0, z: 2.4, w: 2.6, d: 0.85, seed: seed + 4 })
  addLabBench(faces, { x: 1.7, y: 0, z: 3.6, w: 2.4, d: 0.85, seed: seed + 5 })
  addLabBench(faces, { x: 1.7, y: 0, z: 6.2, w: 2.4, d: 0.85, seed: seed + 6 })

  // Fume hood.
  faces.push(...box(-2.2, 1.0, 5.6, 1.5, 2.0, 0.85, { color: [156, 160, 158], sideColor: [138, 142, 140], topColor: [168, 172, 170], roughness: 0.5 }))
  faces.push(face(
    [v3(-2.85, 1.0, 5.16), v3(-1.55, 1.0, 5.16), v3(-1.55, 1.75, 5.16), v3(-2.85, 1.75, 5.16)],
    { color: [40, 46, 46], roughness: 0.1, doubleSided: true, alpha: 0.8, tag: 'hood-glass' },
  ))

  addChair(faces, { x: -1.2, y: 0, z: 3.3, seed: seed + 8 })
  addChair(faces, { x: 1.4, y: 0, z: 2.5, seed: seed + 9 })
  addLockers(faces, { x: 2.0, y: 0, z: 7.6, count: 3, seed: seed + 12 })

  if (lit) {
    for (let i = 0; i < 3; i++) {
      const z = 1.8 + i * 2.6
      faces.push(...box(0, h - 0.05, z, 1.3, 0.08, 0.34, { color: [96, 96, 92] }))
      faces.push(troffer(0, h - 0.1, z, 1.2, 0.28, { emissive: 0.58, color: [220, 224, 214] }))
      lights.push({ position: v3(0, h - 0.3, z), intensity: 0.88, range: 7.2, color: [0.98, 1, 0.96] })
    }
  }

  return {
    faces,
    lights,
    ambient: [0.04, 0.043, 0.046],
    ambientSky: [0.06, 0.064, 0.07],
    fog: [32, 33, 35],
    fogNear: 8,
    fogFar: 28,
    background: [7, 8, 9],
  }
}

/** Classroom: desks in rows, a chalkboard, an aborted lecture. */
export function classroomScene(options = {}) {
  const { seed = 61, lit = true } = options
  const faces = []
  const lights = []
  const w = 6.6
  const d = 8.0
  const h = 3.0

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: [104, 92, 72], roughness: 0.7, texture: plaster(seed, 0.85), tag: 'floor', doubleSided: true }))
  faces.push(quad(v3(-w / 2, h, d), v3(w, 0, 0), v3(0, 0, -d), { color: [150, 148, 140], roughness: 0.9, texture: plaster(seed + 1, 1), tag: 'ceiling', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, 0), v3(-w / 2, h, 0), v3(-w / 2, h, d), v3(-w / 2, 0, d)], { color: [168, 164, 150], roughness: 0.9, texture: paintedBlock(seed + 2, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(w / 2, 0, d), v3(w / 2, h, d), v3(w / 2, h, 0), v3(w / 2, 0, 0)], { color: [168, 164, 150], roughness: 0.9, texture: paintedBlock(seed + 3, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], { color: [158, 154, 142], roughness: 0.9, texture: paintedBlock(seed + 4, 1), tag: 'wall', doubleSided: true }))

  // Chalkboard, mostly erased.
  faces.push(...box(0, 1.6, d - 0.09, 4.0, 1.3, 0.09, { color: [66, 62, 54], sideColor: [58, 54, 48], topColor: [72, 68, 60] }))
  faces.push(face(
    [v3(-1.9, 0.98, d - 0.14), v3(1.9, 0.98, d - 0.14), v3(1.9, 2.22, d - 0.14), v3(-1.9, 2.22, d - 0.14)],
    { color: [40, 46, 42], roughness: 0.85, doubleSided: true, tag: 'chalkboard' },
  ))

  const rows = 4
  for (let r = 0; r < rows; r++) {
    const z = 2.0 + r * 1.35
    for (const x of [-1.7, 0, 1.7]) {
      // Single desk + attached chair form, the way 1970s schools were furnished.
      faces.push(...box(x, 0.72, z, 1.0, 0.05, 0.55, { color: [118, 92, 60], sideColor: [98, 76, 50], topColor: [130, 104, 70] }))
      for (const dx of [-0.44, 0.44]) {
        for (const dz of [-0.22, 0.22]) {
          faces.push(...box(x + dx, 0.36, z + dz, 0.045, 0.72, 0.045, { color: [72, 66, 56] }))
        }
      }
      if (r % 2 === 1) {
        faces.push(...box(x, 0.44, z + 0.5, 0.42, 0.04, 0.38, { color: [96, 76, 52] }))
        faces.push(...box(x, 0.7, z + 0.66, 0.4, 0.44, 0.04, { color: [96, 76, 52] }))
        for (const dx of [-0.17, 0.17]) {
          faces.push(...box(x + dx, 0.22, z + 0.5, 0.035, 0.44, 0.035, { color: [66, 60, 52] }))
        }
      }
    }
  }

  addWindow(faces, { x: -w / 2 + 0.03, y: 1.2, z: 2.2, w: 0, h: 0, boarded: true })
  addRadiator(faces, { x: w / 2 - 0.2, y: 0, z: 3.0, length: 1.1 })

  if (lit) {
    for (let i = 0; i < 2; i++) {
      const z = 2.4 + i * 3.0
      faces.push(...box(0, h - 0.05, z, 1.24, 0.08, 0.32, { color: [94, 94, 90] }))
      faces.push(troffer(0, h - 0.1, z, 1.14, 0.26, { emissive: 0.52, color: [216, 216, 204] }))
      lights.push({ position: v3(0, h - 0.3, z), intensity: 0.76, range: 7, color: [1, 1, 0.94] })
    }
  }

  return {
    faces,
    lights,
    ambient: [0.036, 0.038, 0.042],
    ambientSky: [0.055, 0.058, 0.064],
    fog: [32, 32, 32],
    fogNear: 7,
    fogFar: 26,
    background: [7, 7, 8],
  }
}

/** Institutional office: desk, terminal, filing cabinets, venetian blinds. */
export function officeScene(options = {}) {
  const { seed = 71, lit = true } = options
  const faces = []
  const lights = []
  const w = 4.6
  const d = 5.2
  const h = 2.8

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: [110, 100, 84], roughness: 0.7, texture: terrazzo(seed, 0.88), tag: 'floor', doubleSided: true }))
  faces.push(quad(v3(-w / 2, h, d), v3(w, 0, 0), v3(0, 0, -d), { color: [148, 146, 138], roughness: 0.9, texture: ceilingTile(seed + 1, 1), tag: 'ceiling', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, 0), v3(-w / 2, h, 0), v3(-w / 2, h, d), v3(-w / 2, 0, d)], { color: [172, 168, 154], roughness: 0.9, texture: paintedBlock(seed + 2, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(w / 2, 0, d), v3(w / 2, h, d), v3(w / 2, h, 0), v3(w / 2, 0, 0)], { color: [172, 168, 154], roughness: 0.9, texture: paintedBlock(seed + 3, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], { color: [164, 160, 148], roughness: 0.9, texture: paintedBlock(seed + 4, 1), tag: 'wall', doubleSided: true }))

  addDesk(faces, { x: 0, y: 0, z: d - 1.2, w: 1.7, d: 0.85, seed: seed + 5, monitor: true, paper: true })
  addChair(faces, { x: 0, y: 0, z: d - 2.3, seed: seed + 6 })

  // Four-drawer filing cabinet.
  faces.push(...box(-w / 2 + 0.4, 0.66, 1.4, 0.5, 1.32, 0.62, { color: [110, 108, 100], sideColor: [98, 96, 90], topColor: [120, 118, 110], roughness: 0.6 }))
  for (let i = 0; i < 4; i++) {
    faces.push(...box(-w / 2 + 0.4, 0.2 + i * 0.31, 1.09, 0.46, 0.27, 0.03, { color: [100, 98, 92], sideColor: [94, 92, 86], topColor: [106, 104, 98] }))
    faces.push(...box(-w / 2 + 0.4, 0.2 + i * 0.31, 1.06, 0.14, 0.04, 0.03, { color: [140, 138, 130] }))
  }

  addWindow(faces, { x: w / 2 - 0.03, y: 1.05, z: 1.1, w: 1.4, h: 1.1, boarded: false, glow: 0.1, tint: [70, 84, 96] })
  addShelving(faces, { x: -1.1, y: 0, z: 0.5, w: 1.1, h: 1.6, d: 0.36, shelves: 3, seed: seed + 8 })

  if (lit) {
    faces.push(...box(0, h - 0.04, 2.2, 1.1, 0.08, 0.3, { color: [94, 94, 90] }))
    faces.push(troffer(0, h - 0.09, 2.2, 1.0, 0.24, { emissive: 0.5, color: [214, 212, 200] }))
    lights.push({ position: v3(0, h - 0.28, 2.3), intensity: 0.72, range: 6.4, color: [1, 1, 0.93] })
  }

  return {
    faces,
    lights,
    ambient: [0.034, 0.036, 0.04],
    ambientSky: [0.05, 0.053, 0.058],
    fog: [30, 31, 33],
    fogNear: 6,
    fogFar: 24,
    background: [7, 8, 9],
  }
}

/** Storage / plant room with crates: a place things were put and never removed. */
export function storageScene(options = {}) {
  const { seed = 81, lit = false } = options
  const faces = []
  const lights = []
  const w = 6.2
  const d = 7.6
  const h = 2.7

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: [88, 86, 80], roughness: 0.8, texture: plaster(seed, 0.88), tag: 'floor', doubleSided: true }))
  faces.push(quad(v3(-w / 2, h, d), v3(w, 0, 0), v3(0, 0, -d), { color: [92, 92, 86], roughness: 0.95, texture: plaster(seed + 1, 1), tag: 'ceiling', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, 0), v3(-w / 2, h, 0), v3(-w / 2, h, d), v3(-w / 2, 0, d)], { color: [122, 120, 112], roughness: 0.95, texture: paintedBlock(seed + 2, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(w / 2, 0, d), v3(w / 2, h, d), v3(w / 2, h, 0), v3(w / 2, 0, 0)], { color: [122, 120, 112], roughness: 0.95, texture: paintedBlock(seed + 3, 1), tag: 'wall', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], { color: [114, 112, 104], roughness: 0.95, texture: paintedBlock(seed + 4, 1), tag: 'wall', doubleSided: true }))

  const rng = makeRng(seed + 40)
  for (let i = 0; i < 14; i++) {
    const x = rng.range(-w / 2 + 0.6, w / 2 - 0.6)
    const z = rng.range(0.8, d - 1.0)
    addCrate(faces, { x, y: 0, z, w: rng.range(0.45, 0.8), h: rng.range(0.4, 0.72), d: rng.range(0.4, 0.7), seed: seed + i })
  }
  addShelving(faces, { x: -w / 2 + 0.1, y: 0, z: d - 1.2, w: 1.4, h: 2.0, d: 0.5, shelves: 4, seed: seed + 50 })
  addShelving(faces, { x: w / 2 - 1.5, y: 0, z: d - 1.2, w: 1.4, h: 2.0, d: 0.5, shelves: 4, seed: seed + 51 })
  addPipeRun(faces, { x: 0, y: h - 0.3, z: 0.5, length: d - 1, count: 2, radius: 0.05, color: [104, 96, 82] })

  if (lit) {
    faces.push(...box(0, h - 0.06, 3.0, 0.4, 0.1, 0.22, { color: [88, 88, 84] }))
    faces.push(troffer(0, h - 0.12, 3.0, 0.34, 0.16, { emissive: 0.36, color: [206, 202, 188] }))
    lights.push({ position: v3(0, h - 0.3, 3.1), intensity: 0.56, range: 6.2, color: [1, 0.98, 0.9] })
  } else {
    // A single high window is the only source, and it is barely working.
    addWindow(faces, { x: w / 2 - 0.03, y: 2.0, z: 2.2, w: 0, h: 0, boarded: true })
    lights.push({ position: v3(w / 2 - 0.6, 2.3, 2.2), intensity: 0.2, range: 4.5, color: [0.72, 0.82, 0.98] })
  }

  return {
    faces,
    lights,
    ambient: [0.02, 0.022, 0.026],
    ambientSky: [0.03, 0.033, 0.038],
    fog: [26, 27, 29],
    fogNear: 5,
    fogFar: 20,
    background: [5, 6, 7],
  }
}

/** Exterior entrance at night: steps, doors, a canopy, one sodium light. */
export function entranceScene(options = {}) {
  const { seed = 91, night = true } = options
  const faces = []
  const lights = []
  const w = 12
  const d = 9
  const h = 7.5

  faces.push(quad(v3(-w / 2, 0, 0), v3(w, 0, 0), v3(0, 0, d), { color: night ? [58, 58, 56] : [128, 126, 118], roughness: 0.5, texture: terrazzo(seed, night ? 0.7 : 1), tag: 'ground', doubleSided: true }))
  faces.push(face([v3(-w / 2, 0, d), v3(w / 2, 0, d), v3(w / 2, h, d), v3(-w / 2, h, d)], {
    color: [96, 92, 84], roughness: 0.95, texture: paintedBlock(seed + 1, night ? 0.8 : 1), tag: 'facade', doubleSided: true,
  }))

  // Recessed entrance bay.
  faces.push(...box(0, 1.3, d - 0.35, 5.0, 2.6, 0.7, { color: [64, 62, 58], sideColor: [56, 54, 50], topColor: [72, 70, 66], roughness: 0.9 }))
  faces.push(face(
    [v3(-2.2, 0.05, d - 0.7), v3(2.2, 0.05, d - 0.7), v3(2.2, 2.5, d - 0.7), v3(-2.2, 2.5, d - 0.7)],
    { color: [24, 26, 28], roughness: 0.2, doubleSided: true, tag: 'entrance' },
  ))
  for (const x of [-1.1, 1.1]) {
    faces.push(...box(x, 1.3, d - 0.66, 2.0, 2.5, 0.1, { color: [52, 50, 46], sideColor: [46, 44, 42], topColor: [58, 56, 52], roughness: 0.6 }))
    faces.push(face(
      [v3(x - 0.9, 0.2, d - 0.72), v3(x + 0.9, 0.2, d - 0.72), v3(x + 0.9, 2.4, d - 0.72), v3(x - 0.9, 2.4, d - 0.72)],
      { color: [40, 46, 48], roughness: 0.08, doubleSided: true, alpha: 0.85, tag: 'door-glass' },
    ))
  }
  // Push bars.
  for (const x of [-1.1, 1.1]) {
    faces.push(...box(x, 1.15, d - 0.78, 1.5, 0.05, 0.05, { color: [148, 146, 138], sideColor: [140, 138, 130], topColor: [156, 154, 146] }))
  }

  // Canopy over the doors.
  faces.push(...box(0, 2.85, d - 1.2, 5.6, 0.18, 2.0, { color: [78, 76, 70], sideColor: [70, 68, 64], topColor: [86, 84, 78] }))
  for (const x of [-2.4, 2.4]) {
    faces.push(...box(x, 1.4, d - 2.0, 0.14, 2.8, 0.14, { color: [70, 68, 64] }))
  }

  // Entrance steps.
  for (let i = 0; i < 4; i++) {
    faces.push(...box(0, 0.06 + i * 0.15, d - 2.3 - i * 0.34, 4.4, 0.15, 0.34, {
      color: [112, 110, 104], sideColor: [94, 92, 86], topColor: [124, 122, 116], roughness: 0.8,
    }))
  }

  // Carved band above the entrance — the building's only ornament.
  faces.push(...box(0, 3.4, d - 0.12, 5.2, 0.5, 0.24, { color: [110, 104, 94], sideColor: [98, 92, 84], topColor: [118, 112, 100] }))

  // Window grid across the facade.
  for (let floor = 0; floor < 2; floor++) {
    for (let col = -3; col <= 3; col++) {
      if (col === 0 && floor === 0) continue
      const lit = night && ((col * 3 + floor * 5 + seed) % 7 === 0)
      faces.push(...box(col * 1.5, 4.4 + floor * 1.9, d - 0.1, 0.95, 1.35, 0.14, { color: [66, 64, 60] }))
      faces.push(face(
        [v3(col * 1.5 - 0.44, 3.78 + floor * 1.9, d - 0.19), v3(col * 1.5 + 0.44, 3.78 + floor * 1.9, d - 0.19), v3(col * 1.5 + 0.44, 5.02 + floor * 1.9, d - 0.19), v3(col * 1.5 - 0.44, 5.02 + floor * 1.9, d - 0.19)],
        { color: lit ? [188, 170, 128] : [30, 32, 36], emissive: lit ? 0.4 : 0, doubleSided: true, tag: 'window' },
      ))
    }
  }

  if (night) {
    // Sodium canopy light — the colour sodium gives everything.
    faces.push(...box(0, 2.72, d - 1.4, 0.5, 0.1, 0.28, { color: [60, 58, 54] }))
    faces.push(troffer(0, 2.66, d - 1.4, 0.42, 0.2, { emissive: 0.66, color: [226, 186, 116] }))
    lights.push({ position: v3(0, 2.5, d - 1.6), intensity: 0.95, range: 5.5, color: [1.0, 0.82, 0.52] })
    lights.push({ position: v3(-3.2, 1.2, d - 2.8), intensity: 0.16, range: 4, color: [0.8, 0.86, 1] })
  } else {
    lights.push({ position: v3(0, 6.5, d - 3), intensity: 1.0, range: 12, color: [1, 0.98, 0.92] })
  }

  return {
    faces,
    lights,
    ambient: night ? [0.016, 0.018, 0.024] : [0.16, 0.17, 0.18],
    ambientSky: night ? [0.024, 0.028, 0.038] : [0.3, 0.32, 0.36],
    fog: night ? [10, 11, 14] : [150, 152, 150],
    fogNear: 8,
    fogFar: 34,
    background: night ? [4, 5, 7] : [132, 148, 168],
  }
}

export const SCENE_BUILDERS = {
  corridor: corridorScene,
  archive: archiveRoomScene,
  stairwell: stairwellScene,
  plant: plantRoomScene,
  lab: labScene,
  classroom: classroomScene,
  office: officeScene,
  storage: storageScene,
  entrance: entranceScene,
}
