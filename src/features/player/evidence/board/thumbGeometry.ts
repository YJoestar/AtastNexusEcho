import type { ArtifactType } from '../types'

/**
 * Intrinsic size of the generated thumbnails in public/evidence/thumb, per
 * medium (measured: photographs 220x175, surveillance 220x180, documents and
 * personnel ~185x240, notes ~187x240, maps 240x175, fragments 240x127 PNG,
 * audio 240x62). They are passed as width/height so the browser reserves the
 * box before the file arrives and the list never shifts.
 */
export const THUMB_SIZE: Record<ArtifactType, readonly [number, number]> = {
  PHOTOGRAPH: [220, 175],
  SURVEILLANCE: [220, 180],
  DOCUMENT: [185, 240],
  NOTE: [187, 240],
  MAP: [240, 175],
  PERSONNEL: [185, 240],
  FRAGMENT: [240, 127],
  AUDIO: [240, 62],
}

/** Torn outline that follows what the record says happened to it. */
export function fragmentClip(condition: string): string {
  switch (condition) {
    case 'BURNED':
      return 'polygon(2% 6%, 14% 1%, 30% 5%, 47% 0, 66% 4%, 84% 1%, 98% 8%, 100% 30%, 96% 52%, 100% 74%, 94% 96%, 76% 100%, 58% 94%, 40% 99%, 22% 94%, 6% 99%, 0 78%, 3% 55%, 0 32%)'
    case 'TORN':
    case 'PARTIAL':
    case 'INCOMPLETE':
      return 'polygon(0 0, 100% 0, 100% 90%, 91% 94%, 78% 89%, 63% 96%, 49% 90%, 33% 97%, 18% 91%, 7% 96%, 0 91%)'
    case 'DAMAGED':
      return 'polygon(0 3%, 22% 0, 21% 14%, 40% 2%, 100% 0, 100% 100%, 64% 97%, 58% 100%, 0 100%)'
    default:
      return 'polygon(0 4%, 12% 0, 38% 3%, 63% 0, 88% 4%, 100% 0, 98% 38%, 100% 66%, 97% 100%, 70% 96%, 42% 100%, 16% 96%, 0 100%, 3% 55%)'
  }
}

