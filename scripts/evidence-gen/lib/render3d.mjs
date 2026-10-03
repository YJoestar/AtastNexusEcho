// Small 3D pipeline used to render believable interior architecture before the
// photographic and surveillance treatments are applied. Flat-shaded quads are
// enough to read as a real building: perspective, light falloff and surface
// value carry the image, texture and grain are added afterwards.

export const v3 = (x, y, z) => ({ x, y, z })

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function normalize(a) {
  const length = Math.hypot(a.x, a.y, a.z) || 1
  return { x: a.x / length, y: a.y / length, z: a.z / length }
}

export function createCamera({ position, yaw, pitch, focal, width, height }) {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  // Right, up and forward of the camera basis.
  const right = { x: cy, y: 0, z: -sy }
  const up = { x: -sy * sp, y: cp, z: -cy * sp }
  const forward = { x: sy * cp, y: sp, z: cy * cp }
  return { position, right, up, forward, focal, width, height }
}

export function project(camera, point) {
  const relative = sub(point, camera.position)
  const depth = dot(relative, camera.forward)
  if (depth <= 0.04) return null
  const x = dot(relative, camera.right)
  const y = dot(relative, camera.up)
  return {
    x: camera.width / 2 + (x * camera.focal) / depth,
    y: camera.height / 2 - (y * camera.focal) / depth,
    depth,
    wx: point.x,
    wy: point.y,
    wz: point.z,
  }
}

const NEAR = 0.08

/**
 * Clip a world-space polygon against the camera's near plane (Sutherland-
 * Hodgman). Walls, floors and ceilings in a corridor routinely run behind the
 * camera; dropping the whole polygon when one vertex is behind it (the old
 * behaviour) deleted most of the room.
 */
export function clipNear(camera, points) {
  const out = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const da = dot(sub(a, camera.position), camera.forward) - NEAR
    const db = dot(sub(b, camera.position), camera.forward) - NEAR
    if (da >= 0) out.push(a)
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })
    }
  }
  return out
}

/**
 * A shaded polygon. `points` are world-space, `color` is the albedo, `emissive`
 * marks self-lit surfaces (ceiling fixtures, signage, monitors) which ignore
 * falloff so a corridor actually has a light source in frame.
 */
export function face(points, options = {}) {
  return {
    points,
    color: options.color ?? [160, 158, 150],
    emissive: options.emissive ?? 0,
    roughness: options.roughness ?? 0.85,
    texture: options.texture ?? null,
    doubleSided: options.doubleSided ?? false,
    bias: options.bias ?? 0,
    alpha: options.alpha ?? 1,
    tag: options.tag ?? '',
  }
}

/** Axis-aligned box, emitted as six quads. */
export function box(cx, cy, cz, sx, sy, sz, options = {}) {
  const hx = sx / 2
  const hy = sy / 2
  const hz = sz / 2
  const x0 = cx - hx
  const x1 = cx + hx
  const y0 = cy - hy
  const y1 = cy + hy
  const z0 = cz - hz
  const z1 = cz + hz
  const color = options.color ?? [150, 148, 140]
  const accent = options.accent ?? color
  const rough = options.roughness ?? 0.9
  const f = options.emit ? { emissive: 1, color: options.emitColor ?? [255, 245, 210], roughness: 1 } : { color, roughness: rough }
  const top = options.topColor ?? accent
  const side = options.sideColor ?? color
  return [
    face([v3(x0, y0, z1), v3(x1, y0, z1), v3(x1, y1, z1), v3(x0, y1, z1)], { ...f, color: side, tag: 'front' }),
    face([v3(x1, y0, z0), v3(x0, y0, z0), v3(x0, y1, z0), v3(x1, y1, z0)], { ...f, color: side, tag: 'back' }),
    face([v3(x0, y1, z1), v3(x1, y1, z1), v3(x1, y1, z0), v3(x0, y1, z0)], { ...f, color: top, tag: 'top' }),
    face([v3(x0, y0, z0), v3(x1, y0, z0), v3(x1, y0, z1), v3(x0, y0, z1)], { ...f, color: [side[0] * 0.55, side[1] * 0.55, side[2] * 0.55], tag: 'bottom' }),
    face([v3(x1, y0, z1), v3(x1, y0, z0), v3(x1, y1, z0), v3(x1, y1, z1)], { ...f, color: top, tag: 'right' }),
    face([v3(x0, y0, z0), v3(x0, y0, z1), v3(x0, y1, z1), v3(x0, y1, z0)], { ...f, color: top, tag: 'left' }),
  ]
}

/** Quad defined by an origin and two span vectors — used for walls, floors, planes. */
export function quad(origin, spanA, spanB, options = {}) {
  return face(
    [
      v3(origin.x, origin.y, origin.z),
      v3(origin.x + spanA.x, origin.y + spanA.y, origin.z + spanA.z),
      v3(origin.x + spanA.x + spanB.x, origin.y + spanA.y + spanB.y, origin.z + spanA.z + spanB.z),
      v3(origin.x + spanB.x, origin.y + spanB.y, origin.z + spanB.z),
    ],
    options,
  )
}

function faceNormal(vertices) {
  const a = sub(vertices[1], vertices[0])
  const b = sub(vertices[2], vertices[0])
  return normalize(cross(a, b))
}

function barycentric(px, py, p0, p1, p2) {
  const d = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y)
  if (Math.abs(d) < 1e-9) return [0, 0, 0]
  const a = ((p1.y - p2.y) * (px - p2.x) + (p2.x - p1.x) * (py - p2.y)) / d
  const b = ((p2.y - p0.y) * (px - p2.x) + (p0.x - p2.x) * (py - p2.y)) / d
  return [a, b, 1 - a - b]
}


/**
 * Room bounds from the geometry itself, used for ambient occlusion: a surface
 * darkens where it meets a floor, ceiling or wall, which is what separates a
 * lit room from a coloured diagram of one.
 */
function sceneBounds(faces) {
  const min = { x: Infinity, y: Infinity, z: Infinity }
  const max = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const f of faces) {
    for (const p of f.points) {
      for (const k of ['x', 'y', 'z']) {
        if (p[k] < min[k]) min[k] = p[k]
        if (p[k] > max[k]) max[k] = p[k]
      }
    }
  }
  return { min, max }
}

/**
 * Solid occluders for shadow rays: every opaque, non-emissive box() in the
 * scene (six consecutive faces tagged front..left) that is thick enough to
 * throw a shadow. Housings, skirting and trim are ignored.
 */
const BOX_TAGS = ['front', 'back', 'top', 'bottom', 'right', 'left']
function collectOccluders(faces) {
  const out = []
  for (let i = 0; i + 5 < faces.length; i++) {
    if (faces[i].tag !== 'front') continue
    let ok = true
    for (let k = 0; k < 6; k++) if (faces[i + k].tag !== BOX_TAGS[k]) { ok = false; break }
    if (!ok) continue
    if (faces[i].emissive > 0 || faces[i].alpha < 1) continue
    const b = sceneBounds(faces.slice(i, i + 6))
    const size = { x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z }
    if (Math.min(size.x, size.y, size.z) < 0.09) continue
    // Overhead runs (pipes, beams) are not what throws a shadow on a floor.
    if (b.min.y > 1.1) continue
    out.push(b)
    i += 5
  }
  return out
}

/** Slab test: does the segment from `o` towards `t` (length `len`) cross `box`? */
function segmentHitsBox(o, d, len, box) {
  let t0 = 0
  let t1 = len
  for (const k of ['x', 'y', 'z']) {
    const inv = 1 / (d[k] || 1e-9)
    let a = (box.min[k] - o[k]) * inv
    let b = (box.max[k] - o[k]) * inv
    if (a > b) { const tmp = a; a = b; b = tmp }
    if (a > t0) t0 = a
    if (b < t1) t1 = b
    if (t0 > t1) return false
  }
  return true
}

const smooth = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Painter's-algorithm scanline rasteriser.
 *
 * `shading` receives depth, world position and the surface texture coordinate
 * so a scene can vary surface value per pixel (tile grout, plaster mottling,
 * brushed metal) without a texture atlas.
 */
export function renderScene(scene, camera, buffer, options = {}) {
  const { width, height, data } = buffer
  const lights = scene.lights ?? []
  const ambient = scene.ambient ?? [0.05, 0.055, 0.065]
  const ambientSky = scene.ambientSky ?? ambient
  const fogColor = scene.fog ?? null
  const fogNear = scene.fogNear ?? 6
  const fogFar = scene.fogFar ?? 30
  const background = scene.background ?? [10, 11, 12]
  const nearBias = options.nearBias ?? 0.004
  const bounds = scene.bounds ?? sceneBounds(scene.faces)
  const occluders = scene.shadows === false ? [] : collectOccluders(scene.faces)

  for (let i = 0; i < width * height; i++) {
    data[i * 3] = background[0] / 255
    data[i * 3 + 1] = background[1] / 255
    data[i * 3 + 2] = background[2] / 255
  }

  // Clip, project, triangulate and depth-sort.
  const prepared = []
  for (const polygon of scene.faces) {
    const normal = faceNormal(polygon.points)
    const toCamera = normalize(sub(camera.position, polygon.points[0]))
    const facing = dot(normal, toCamera)
    if (facing < 0 && !polygon.doubleSided) continue

    const clipped = clipNear(camera, polygon.points)
    if (clipped.length < 3) continue
    const screen = clipped.map(point => project(camera, point)).filter(Boolean)
    if (screen.length < 3) continue

    // A double-sided surface is lit by whichever face the camera can see, which
    // is how thin material — door leaves, signage, glass, paper — behaves.
    const shadingNormal = facing < 0 ? { x: -normal.x, y: -normal.y, z: -normal.z } : normal

    // Fan-triangulate: every vertex of a quad takes part, not just the first three.
    for (let i = 1; i < screen.length - 1; i++) {
      const tri = [screen[0], screen[i], screen[i + 1]]
      const avgDepth = (tri[0].depth + tri[1].depth + tri[2].depth) / 3
      prepared.push({ polygon, screen: tri, avgDepth, normal: shadingNormal, facing: Math.abs(facing) })
    }
  }
  // Per-pixel depth test. A painter's sort cannot order a door against the wall
  // it hangs in (coplanar, interleaved triangles), which showed up as slivers
  // and stray triangles. Opaque faces draw in any order; translucent ones
  // (glass, haze planes) go last, far to near, testing but not writing depth.
  const zbuf = new Float32Array(width * height).fill(Infinity)
  const opaque = prepared.filter(item => item.polygon.alpha >= 1)
  const translucent = prepared.filter(item => item.polygon.alpha < 1).sort((a, b) => b.avgDepth - a.avgDepth)

  for (const item of [...opaque, ...translucent]) {
    rasterPolygon(item, camera, buffer, {
      zbuf,
      ambient,
      ambientSky,
      lights,
      fogColor,
      fogNear,
      fogFar,
      nearBias,
      bounds,
      occluders,
      aoStrength: scene.ao ?? 0.55,
    })
  }

  return buffer
}

function rasterPolygon(item, camera, buffer, env) {
  const { width, height, data } = buffer
  const { polygon, screen, normal, facing } = item
  const projected = screen
  if (projected.some(p => p.depth < env.nearBias)) return

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of projected) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const x0 = Math.max(0, Math.floor(minX))
  const x1 = Math.min(width - 1, Math.ceil(maxX))
  const y0 = Math.max(0, Math.floor(minY))
  const y1 = Math.min(height - 1, Math.ceil(maxY))
  if (x1 < x0 || y1 < y0) return

  const [b0, b1, b2] = projected

  // Lights are evaluated per fragment: a 26-metre corridor wall and a 0.3-metre
  // door leaf must not share one shading direction.
  const lightCount = env.lights.length

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const weights = barycentric(x + 0.5, y + 0.5, b0, b1, b2)
      if (weights[0] < -0.0015 || weights[1] < -0.0015 || weights[2] < -0.0015) continue

      const depth = weights[0] * b0.depth + weights[1] * b1.depth + weights[2] * b2.depth
      if (depth < env.nearBias) continue

      // Perspective-correct world position for texture lookup.
      const iw = 1 / (weights[0] / b0.depth + weights[1] / b1.depth + weights[2] / b2.depth + 1e-9)
      // `iw` is the perspective-correct depth of this fragment. `bias` pulls a
      // decal (door leaf, sign, kick plate) a hair toward the camera so it
      // wins against the surface it is attached to.
      const zIndex = y * width + x
      const z = iw - (polygon.bias ?? 0)
      if (z >= env.zbuf[zIndex]) continue
      if (polygon.alpha >= 1) env.zbuf[zIndex] = z
      const wx = (weights[0] / b0.depth * b0.wx + weights[1] / b1.depth * b1.wx + weights[2] / b2.depth * b2.wx) * iw
      const wy = (weights[0] / b0.depth * b0.wy + weights[1] / b1.depth * b1.wy + weights[2] / b2.depth * b2.wy) * iw
      const wz = (weights[0] / b0.depth * b0.wz + weights[1] / b1.depth * b1.wz + weights[2] / b2.depth * b2.wz) * iw

      const surface = polygon.texture ? polygon.texture(wx, wy, wz, depth) : 1
      const albedoScale = surface

      let r = 0
      let g = 0
      let b = 0
      // Hemisphere ambient. A ceiling faces away from the sky term but is
      // lit by light bounced up off the floor, so it takes the sky value too.
      const sky = normal.y > 0 ? normal.y : Math.max(0, -normal.y) * 0.8
      r += env.ambientSky[0] * sky + env.ambient[0] * (1 - sky)
      g += env.ambientSky[1] * sky + env.ambient[1] * (1 - sky)
      b += env.ambientSky[2] * sky + env.ambient[2] * (1 - sky)

      // Ambient occlusion from the room volume: contact darkening where a
      // surface meets another plane. Planes the surface lies in are skipped.
      let occlusion = 1
      if (env.aoStrength > 0) {
        const bnd = env.bounds
        const p = { x: wx, y: wy, z: wz }
        for (const axis of ['x', 'y', 'z']) {
          if (Math.abs(normal[axis]) > 0.6) continue
          const reach = axis === 'y' ? 0.55 : 0.4
          const dLow = p[axis] - bnd.min[axis]
          const dHigh = bnd.max[axis] - p[axis]
          occlusion *= 1 - env.aoStrength * (1 - smooth(0, reach, dLow)) * 0.6
          occlusion *= 1 - env.aoStrength * (1 - smooth(0, reach, dHigh)) * 0.6
        }
      }

      if (polygon.emissive > 0) {
        r += polygon.color[0] * polygon.emissive
        g += polygon.color[1] * polygon.emissive
        b += polygon.color[2] * polygon.emissive
      } else {
        let shadowTests = 0
        for (let li = 0; li < lightCount; li++) {
          const light = env.lights[li]
          const dx = light.position.x - wx
          const dy = light.position.y - wy
          const dz = light.position.z - wz
          const distSq = dx * dx + dy * dy + dz * dz
          const dist = Math.sqrt(distSq)
          if (dist < 1e-5) continue
          const range = light.range ?? 6
          const falloff = (light.intensity ?? 1) / (1 + distSq / (range * range))
          const ndl = Math.max(0, (normal.x * dx + normal.y * dy + normal.z * dz) / dist)
          // Direct term with a little wrap so a surface at a grazing angle to a
          // fixture (a ceiling, a wall beside a troffer) still shows a gradient.
          let amount = ((ndl + 0.25) / 1.25) * falloff
          if (ndl <= 0) amount = 0.2 * falloff * Math.max(0, 0.25 + ndl)
          // Soft indirect: light that has already bounced off the room, with
          // no direction, so shadowed areas are dim rather than black.
          // Near a fixture the panel is a large soft source: surfaces beside it
          // (the ceiling it hangs in, the wall above a door) pool with light.
          const indirect = 0.06 * falloff + 0.15 * (light.intensity ?? 1) / (1 + distSq / 2.4)
          if (amount > 0.012 && env.occluders.length > 0 && shadowTests < 3 && dist > 0.3) {
            shadowTests++
            const inv = 1 / dist
            const dir = { x: dx * inv, y: dy * inv, z: dz * inv }
            const o = { x: wx + normal.x * 0.03, y: wy + normal.y * 0.03, z: wz + normal.z * 0.03 }
            for (const box of env.occluders) {
              if (segmentHitsBox(o, dir, dist - 0.05, box)) { amount *= 0.08; break }
            }
          }
          const total = amount + indirect
          r += polygon.color[0] * light.color[0] * total
          g += polygon.color[1] * light.color[1] * total
          b += polygon.color[2] * light.color[2] * total
        }
      }

      // Grazing surfaces catch slightly more light — cheap fresnel-ish lift.
      const graze = 0.82 + 0.18 * Math.abs(facing)

      r *= albedoScale * graze * occlusion
      g *= albedoScale * graze * occlusion
      b *= albedoScale * graze * occlusion

      if (env.fogColor) {
        const t = Math.max(0, Math.min(1, (depth - env.fogNear) / (env.fogFar - env.fogNear)))
        const k = t * t
        r = r * (1 - k) + env.fogColor[0] * k
        g = g * (1 - k) + env.fogColor[1] * k
        b = b * (1 - k) + env.fogColor[2] * k
      }

      const index = (y * width + x) * 3
      // Scene colours are authored in 0-255; the working buffer is 0-1 linear.
      const inv = 1 / 255
      if (polygon.alpha >= 1) {
        data[index] = r * inv
        data[index + 1] = g * inv
        data[index + 2] = b * inv
      } else {
        data[index] = (data[index] * (1 - polygon.alpha) + r * inv * polygon.alpha)
        data[index + 1] = (data[index + 1] * (1 - polygon.alpha) + g * inv * polygon.alpha)
        data[index + 2] = (data[index + 2] * (1 - polygon.alpha) + b * inv * polygon.alpha)
      }
    }
  }
}
