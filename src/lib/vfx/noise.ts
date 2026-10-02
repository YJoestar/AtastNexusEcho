/**
 * Procedural noise tile, generated once.
 *
 * Grain used to be repainted per pixel, per frame, across the whole viewport.
 * Now it is one small tile, painted once, and "animated" by stepping a
 * compositor-only transform — the cost is a few hundred bytes of pixels, not
 * megabytes per frame.
 */

const TILE = 128
let cached: string | null = null

export function noiseTileURL(): string {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    canvas.width = TILE
    canvas.height = TILE
    const ctx = canvas.getContext('2d')
    if (!ctx || typeof ctx.createImageData !== 'function') {
      cached = ''
      return cached
    }
    const image = ctx.createImageData(TILE, TILE)
    for (let i = 0; i < image.data.length; i += 4) {
      const v = (Math.random() * 255) | 0
      image.data[i] = v
      image.data[i + 1] = v
      image.data[i + 2] = v
      image.data[i + 3] = (Math.random() * 255) | 0
    }
    ctx.putImageData(image, 0, 0)
    cached = canvas.toDataURL('image/png')
  } catch {
    cached = ''
  }
  return cached
}

export const NOISE_TILE_SIZE = TILE
