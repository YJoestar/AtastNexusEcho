// Photograph and surveillance-frame composition.
//
// Pipeline:  scene render → optical treatment → emulsion → capture fault
//            → print border / caption / label → encode
//
// Nothing here draws a scene: the geometry comes from the 3D room builders, and
// the character comes from what happens to the pixels afterwards.

import sharp from 'sharp'
import { HAND_FAMILY } from './fontenv.mjs'
import { createCamera, renderScene } from './render3d.mjs'
import { SCENE_BUILDERS, addFigure, addCrate, addShelving, addDesk, addLockers, addChair, wallSign, troffer } from './scenes.mjs'
import { v3 } from './render3d.mjs'
import { box, face } from './render3d.mjs'
import {
  createCanvas, toRaw, toneMap, vignette, sensorNoise, bloom, flashFalloff, blur,
  filmGrain, colorGrade, desaturate, lensDistortion, depthOfField,
  compressionBlocks, interlace, signalTear, deadRegion, physicalImperfections, resizeCanvas,
} from './pixels.mjs'
import { makeRng, makeNoise1d } from './rng.mjs'
import { photoPrint, surveillanceOsd, captionFields, penAnnotation } from './print.mjs'
import { scratches, burnMask, stain, crease, tearMask, missingStrip, fade } from './damage.mjs'

const HAND_FONT = HAND_FAMILY

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Render a dressed room to a float canvas. */
function renderRoom(spec, width, height, cameraSpec) {
  const build = SCENE_BUILDERS[spec.scene] ?? SCENE_BUILDERS.corridor
  const scene = build(spec.sceneOptions ?? {})
  dressScene(scene, spec)
  const camera = createCamera({ width, height, ...cameraSpec })
  const canvas = createCanvas(width, height)
  renderScene(scene, camera, canvas)
  return canvas
}

/** Per-artifact dressing: props, figures, and the objects that make a room specific. */
function dressScene(scene, spec) {
  const rng = makeRng(spec.seed ?? 1)
  for (const item of spec.props ?? []) {
    switch (item.kind) {
      case 'figure':
        addFigure(scene.faces, item)
        break
      case 'crate':
        addCrate(scene.faces, { ...item, seed: rng.int(1, 9999) })
        break
      case 'shelving':
        addShelving(scene.faces, { ...item, seed: rng.int(1, 9999) })
        break
      case 'desk':
        addDesk(scene.faces, { ...item, seed: rng.int(1, 9999) })
        break
      case 'lockers':
        addLockers(scene.faces, { ...item, seed: rng.int(1, 9999) })
        break
      case 'chair':
        addChair(scene.faces, { ...item, seed: rng.int(1, 9999) })
        break
      case 'sign':
        scene.faces.push(wallSign(item.x, item.y, item.z, item.w, item.h, item.rotY ?? 0, item.color ?? [176, 172, 158], item.emissive ?? 0.14))
        break
      case 'fixture':
        scene.faces.push(troffer(item.x, item.y, item.z, item.w, item.d, { emissive: item.emissive ?? 0.5, color: item.color ?? [214, 216, 204] }))
        break
      case 'box':
        scene.faces.push(...box(item.x, item.y, item.z, item.w, item.h, item.d, { color: item.color ?? [120, 116, 108] }))
        break
      case 'plane':
        scene.faces.push(face(item.points, item.options ?? { color: [120, 120, 116], doubleSided: true, alpha: item.alpha ?? 1 }))
        break
    }
  }
  // A light directly above the camera reads as the flash bouncing off the ceiling.
  if (spec.cameraBounce) {
    scene.lights.push({ position: v3(0, 3.0, 0.4), intensity: spec.cameraBounce, range: 5.5, color: [0.95, 0.96, 1.0] })
  }
}

/** Optical + emulsion treatment shared by every field photograph. */
function photographicTreatment(canvas, spec, seed) {
  const p = spec.treatment ?? {}
  bloom(canvas, { threshold: p.bloomThreshold ?? 0.5, radius: p.bloomRadius ?? 14, strength: p.bloom ?? 0.5 })
  toneMap(canvas, {
    exposure: p.exposure ?? 2.2,
    contrast: p.contrast ?? 1.15,
    blackLift: p.blackLift ?? 0.02,
  })
  desaturate(canvas, p.desaturate ?? 0.4, p.tint ?? [1, 1, 1.04])
  colorGrade(canvas, { shadows: p.shadows ?? [0.012, 0.014, 0.022], highlights: p.highlights ?? [0.012, 0.009, -0.004] })
  if (p.flash !== false) {
    flashFalloff(canvas, { strength: p.flashStrength ?? 0.3, radius: p.flashRadius ?? 0.92, centerX: p.flashX ?? 0.5, centerY: p.flashY ?? 0.46 })
  }
  if (p.blur) depthOfField(canvas, { focusX: p.focusX ?? 0.5, focusY: p.focusY ?? 0.48, maxRadius: p.blur, focusSpread: p.focusSpread ?? 0.3 })
  lensDistortion(canvas, { amount: p.barrel ?? 0.05, chromatic: p.chromatic ?? 1.1 })
  vignette(canvas, { strength: p.vignette ?? 0.62, radius: p.vignetteRadius ?? 0.76, softness: 0.5 })
  sensorNoise(canvas, seed, { amount: p.noise ?? 0.05, chroma: p.chromaNoise ?? 0.5 })
  filmGrain(canvas, seed + 91, p.grain ?? 0.035, p.grainSize ?? 1)
  physicalImperfections(canvas, seed + 3, { dust: p.dust ?? 50, scratches: p.printScratches ?? 3, smudges: p.smudges ?? 2 })
  if (p.blurFinal) blur(canvas, p.blurFinal, 1)
}

/**
 * A recovered field photograph. States are part of the artifact: an
 * underexposed frame, a flash blowout and a blurred miss all have to look
 * wrong before any metadata is read.
 */
export async function composePhotograph(spec) {
  const width = spec.width ?? 1024
  const height = spec.height ?? 768
  const seed = spec.seed ?? 1
  const canvas = renderRoom(spec, width, height, {
    position: spec.camera?.position ?? { x: 0, y: 1.62, z: 0 },
    yaw: spec.camera?.yaw ?? 0,
    pitch: spec.camera?.pitch ?? -0.02,
    focal: spec.camera?.focal ?? 820,
  })
  photographicTreatment(canvas, spec, seed)

  const damaged = spec.condition && spec.condition !== 'NORMAL'
  if (damaged) applyPixelDamage(canvas, spec, seed)

  const raw = toRaw(canvas)
  const innerDataUrl = `data:image/jpeg;base64,${(await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer()).toString('base64')}`

  const border = spec.border ?? 30
  const captionBottom = spec.caption === false ? 0 : 46
  const svg = photoPrint({
    imageDataUrl: innerDataUrl,
    imageWidth: width,
    imageHeight: height,
    width,
    height: height + captionBottom,
    border,
    captionBottom,
    caption: spec.caption === false ? null : captionFields([
      spec.captionFields?.[0] ?? spec.code,
      spec.location ?? 'LOCATION NOT RECORDED',
      spec.capturedAt ?? 'DATE UNKNOWN',
      spec.device ?? 'DEVICE NOT RECORDED',
    ]),
    label: spec.label === false ? null : spec.code,
    paperTint: spec.paperTint ?? '#e9e4d6',
    paperAge: spec.paperAge ?? 0.6,
    seed,
    rotated: spec.printRotation ?? 0,
    labelTone: spec.labelTone ?? 'amber',
  })
  const overlay = spec.overlay ?? null
  const printDamage = spec.printDamage === false
    ? ''
    : printDamageOverlay({ ...spec, condition: spec.printCondition ?? spec.condition ?? spec.damageKind }, width, height + captionBottom)
  const layers = [overlay, printDamage].filter(Boolean).join('')
  const composed = layers ? `${svg.replace('</svg>', `${layers}</svg>`)}` : svg
  const fullBuffer = await sharp(Buffer.from(composed)).jpeg({ quality: 88 }).toBuffer()
  const thumbBuffer = await sharp(fullBuffer).resize(220, 220, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer()
  return { full: fullBuffer, thumb: thumbBuffer }
}

/** Pixel-level damage: faults that live in the emulsion, not on the paper. */
function applyPixelDamage(canvas, spec, seed) {
  const kind = spec.damageKind ?? spec.condition
  const { width, height } = canvas
  if (kind === 'DAMAGED' || kind === 'BURNED' || kind === 'TORN') {
    deadRegion(canvas, seed + 11, { x: 0.72, y: 0.68, w: 0.22, h: 0.2, style: 'noise' })
    vignette(canvas, { strength: 0.8, radius: 0.5 })
  }
  if (kind === 'DEGRADED' || kind === 'PARTIAL') {
    signalTear(canvas, seed + 13, { y: height * (0.34 + (seed % 7) * 0.03), height: height * 0.09, strength: 0.8 })
  }
  if (kind === 'FADED') {
    toneMap(canvas, { exposure: 1.9, contrast: 0.86, blackLift: 0.06 })
    filmGrain(canvas, seed + 17, 0.06, 1)
  }
  if (kind === 'OVEREXPOSED' || kind === 'FLASH_BLOWOUT') {
    bloom(canvas, { threshold: 0.4, radius: 24, strength: 0.9 })
    toneMap(canvas, { exposure: 1.5, contrast: 1.3, blackLift: 0.05 })
  }
  if (kind === 'BLURRED') {
    blur(canvas, 5, 2)
  }
  void width
}

/**
 * A surveillance frame. Same building, different machine: a fixed wide lens
 * mounted high, low dynamic range, macroblock compression, and an OSD that
 * reports the state of the recorder rather than the state of the world.
 */
export async function composeSurveillance(spec) {
  const width = spec.width ?? 704
  const height = spec.height ?? 576
  const seed = spec.seed ?? 1
  const state = spec.surveillanceState ?? 'SIGNAL STABLE'

  // A fixed camera: wide lens, high mount, tilted down. Never a handheld angle.
  const hfov = spec.hfov ?? 104
  const focal = (width / 2) / Math.tan((hfov * Math.PI) / 360)
  const canvas = renderRoom(spec, width, height, {
    position: spec.camera?.position ?? { x: 0, y: 2.95, z: 0.3 },
    yaw: spec.camera?.yaw ?? 0,
    pitch: spec.camera?.pitch ?? -0.52,
    focal,
  })

  // Sensor behaviour: low dynamic range, then the recorder's own artefacts.
  toneMap(canvas, { exposure: spec.treatment?.exposure ?? 1.9, contrast: 0.92, blackLift: 0.05 })
  desaturate(canvas, 0.55, spec.irTint ?? [0.92, 1.0, 0.9])
  colorGrade(canvas, { shadows: [0.01, 0.02, 0.01], highlights: [-0.01, 0.01, 0.0] })
  blur(canvas, spec.treatment?.softness ?? 1.4, 2)
  compressionBlocks(canvas, seed, { block: 8, strength: 0.7, banding: 0.5 })
  interlace(canvas, seed + 5, { skew: 0.8, dropChance: 0.08 })
  sensorNoise(canvas, seed + 2, { amount: 0.055, chroma: 0.2, shadowBias: 1.2 })
  filmGrain(canvas, seed + 7, 0.02, 1)
  lensDistortion(canvas, { amount: 0.1, chromatic: 1.6 })
  vignette(canvas, { strength: 0.72, radius: 0.62 })

  if (state === 'SIGNAL DEGRADED') {
    const tearRng = makeRng(seed + 19)
    for (let i = 0; i < 7; i++) {
      const y = Math.floor(((seed * 13 + i * 91) % 100) / 100 * height)
      const h = 3 + ((seed + i) % 5)
      for (let yy = y; yy < Math.min(height, y + h); yy++) {
        const shift = (yy - y) % 2 === 0 ? 2 : -2
        for (let x = width - 1; x > 0; x--) {
          const src = (yy * width + Math.max(0, x - Math.abs(shift))) * 3
          const dst = (yy * width + x) * 3
          const noise = (tearRng() - 0.5) * 0.1
          canvas.data[dst] = Math.min(1, Math.max(0, canvas.data[src] * 0.75 + noise + 0.12))
          canvas.data[dst + 1] = Math.min(1, Math.max(0, canvas.data[src + 1] * 0.75 + noise + 0.12))
          canvas.data[dst + 2] = Math.min(1, Math.max(0, canvas.data[src + 2] * 0.75 + noise + 0.12))
        }
      }
    }
  }
  if (state === 'FRAME DROPOUT' || state === 'PARTIAL RECORD') {
    signalTear(canvas, seed + 31, { y: height * 0.46, height: height * 0.14, strength: 0.92 })
    deadRegion(canvas, seed + 33, { x: 0.5, y: 0.7, w: 0.9, h: 0.1, style: 'noise' })
  }
  if (state === 'LOW LIGHT') {
    toneMap(canvas, { exposure: 1.25, contrast: 1.05, blackLift: 0.09 })
    sensorNoise(canvas, seed + 41, { amount: 0.11, chroma: 0.15, shadowBias: 2.2 })
  }
  if (state === 'CAMERA OFFLINE') {
    // The lens is still there. The recorder simply has no signal to give.
    toneMap(canvas, { exposure: 0.32, contrast: 0.8, blackLift: 0.03 })
    sensorNoise(canvas, seed + 43, { amount: 0.09, chroma: 0.1, shadowBias: 1.6 })
  }

  const raw = toRaw(canvas)
  const baseJpeg = await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 88 })
    .toBuffer()
  const baseDataUrl = `data:image/jpeg;base64,${baseJpeg.toString('base64')}`

  const osd = surveillanceOsd({
    width,
    height,
    camera: spec.cameraLabel ?? 'CAM-07',
    location: spec.osdLocation ?? 'LOC-C214',
    date: spec.osdDate ?? '14-10-94',
    time: spec.osdTime ?? '03:17:11',
    state: state === 'CAMERA OFFLINE' ? 'NO REC' : 'REC',
    signal: state === 'CAMERA OFFLINE' ? 'OFFLINE' : state === 'SIGNAL DEGRADED' ? 'DEGRADED' : state === 'LOW LIGHT' ? 'LOW' : 'STABLE',
    integrity: spec.integrity ?? state,
    frame: spec.frame,
    total: spec.totalFrames ?? 345600,
    seed,
    fontSize: 15,
  })

  const artefacts = []
  artefacts.push(scratches({ width, height, seed: seed + 61, count: state === 'SIGNAL DEGRADED' ? 9 : 4, color: 'rgba(226,232,226,0.3)' }))
  if (spec.damageKind === 'DAMAGED') {
    const burn = burnMask({ width, height, seed: seed + 71, id: `svburn${seed}`, originX: 0.08, originY: 0.94, radius: 0.22 })
    artefacts.push(`<defs>${burn.defs}</defs>${burn.shape}`)
  }
  if (spec.damageKind === 'DAMAGED' || spec.condition === 'PARTIAL') {
    artefacts.push(missingStrip({ width, height, y: height * 0.24, h: height * 0.06, seed: seed + 73, id: `svmiss${seed}` }).shape)
  }
  if (spec.damageKind === 'STAIN') {
    const s = stain({ width, height, seed: seed + 75, cx: 0.8, cy: 0.8, r: 0.26, id: `svstain${seed}` })
    artefacts.push(`<defs>${s.defs}</defs>${s.shape}`)
  }
  if (spec.annotated) {
    artefacts.push(penAnnotation({ cx: width * (spec.annotateX ?? 0.52), cy: height * (spec.annotateY ?? 0.55), r: Math.min(width, height) * 0.16, note: spec.annotateNote ?? '?', color: '#c8422f', rotation: -8, seed: seed + 3, style: spec.annotateStyle ?? 'circle' }))
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#0a0b0a"/>
    <image href="${baseDataUrl}" x="0" y="0" width="${width}" height="${height}"/>
    ${osd}
    ${artefacts.join('')}
    <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="none" stroke="#000" stroke-opacity="0.5"/>
  </svg>`

  const fullBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 87 }).toBuffer()
  const thumbBuffer = await sharp(fullBuffer).resize(220, 220, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer()
  return { full: fullBuffer, thumb: thumbBuffer }
}

/**
 * Physical damage applied on the paper surface of a print: torn corner, folded
 * edge, water ring, burn. Returned as SVG so it survives the print compositing.
 */
export function printDamageOverlay(spec, width, height) {
  if (!spec.condition || spec.condition === 'NORMAL') return ''
  const seed = spec.seed ?? 1
  const parts = []
  const kind = spec.damageKind ?? spec.condition

  if (kind === 'TORN' || kind === 'DAMAGED') {
    const mask = tearMask({ width, height, edge: spec.tearEdge ?? 'right', depth: spec.tearDepth ?? 0.16, seed, id: `tear${seed}` })
    parts.push(`<defs>${mask.defs}</defs>`)
    // The corner is gone: what shows through is the surface the print lay on.
    parts.push(`<g mask="url(#tear${seed})"><rect x="0" y="0" width="${width}" height="${height}" fill="${spec.surfaceTone ?? '#cfcabd'}"/></g>`)
    parts.push(`<rect width="${width}" height="${height}" fill="none" stroke="rgba(120,110,92,0.55)" stroke-width="1.4" stroke-dasharray="7 5 2 6" opacity="0.5"/>`)
  }
  if (kind === 'BURNED') {
    const burn = burnMask({ width, height, seed, id: `burn${seed}`, originX: spec.burnX ?? 0.86, originY: spec.burnY ?? 0.88, radius: spec.burnR ?? 0.26 })
    parts.push(`<defs>${burn.defs}</defs>${burn.shape}`)
  }
  if (kind === 'FOLDED') {
    parts.push(crease({ x1: width * 0.5, y1: 0, x2: width * 0.5, y2: height, width: 3.4, shadow: 0.2 }))
    parts.push(crease({ x1: 0, y1: height * 0.5, x2: width, y2: height * 0.5, width: 2.6, shadow: 0.16 }))
  }
  if (kind === 'STAIN') {
    const s = stain({ width, height, seed, cx: spec.stainX ?? 0.22, cy: spec.stainY ?? 0.76, r: spec.stainR ?? 0.24, id: `stain${seed}` })
    parts.push(`<defs>${s.defs}</defs>${s.shape}`)
  }
  if (kind === 'FADED') {
    const f = fade({ width, height, seed, cx: spec.fadeX ?? 0.5, cy: spec.fadeY ?? 0.5, r: 0.5, id: `fade${seed}` })
    parts.push(`<defs>${f.defs}</defs>${f.shape}`)
  }
  parts.push(scratches({ width, height, seed: seed + 5, count: kind === 'DAMAGED' ? 7 : 3, color: 'rgba(255,255,255,0.28)' }))
  if (spec.annotated) {
    parts.push(penAnnotation({ cx: width * (spec.annotateX ?? 0.55), cy: height * (spec.annotateY ?? 0.5), r: Math.min(width, height) * 0.13, note: spec.annotateNote ?? '?', color: '#8a2f24', rotation: spec.annotateRotation ?? -6, seed: seed + 9, style: spec.annotateStyle ?? 'circle' }))
  }
  return parts.join('')
}

export { escapeText, HAND_FONT, makeNoise1d, resizeCanvas }
