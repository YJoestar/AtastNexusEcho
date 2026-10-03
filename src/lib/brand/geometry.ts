/**
 * NEXUS ECHO — brand geometry (single source of truth)
 *
 * The mark is a monoline N on a 64-unit grid: two verticals joined by a
 * diagonal, which is what a network of two nodes looks like (NEXUS). A thinner,
 * displaced copy sits behind it (ECHO). Four corner brackets frame it the way a
 * fiducial frames a recovered record. At small sizes the brackets and echo drop
 * away and only the N and its nodes remain.
 *
 * The wordmark is drawn, not typeset: monoline capitals on a 5×7 cell, square
 * caps, so it never depends on a font and is identical everywhere. The final O
 * of ECHO has a break in it, a dropped bit of signal, small enough to leave the
 * word readable.
 *
 * Both the React components and `scripts/brand/build.ts` import this file.
 */

export const MARK_VIEWBOX = 64

/** The N, as a single open path. */
export const N_PATH = 'M20 45 V19 L44 45 V19'

/** Echo: the same N displaced down and right. */
export const ECHO_OFFSET = { x: 5, y: 5 }

/** Nexus nodes: the two ends of the diagonal. Centre x, centre y, size. */
export const NODES: Array<[number, number, number]> = [
  [20, 19, 8],
  [44, 45, 8],
]

/** Corner brackets (fiducial frame). */
export const BRACKETS = [
  'M5 17 V5 H17',
  'M47 5 H59 V17',
  'M59 47 V59 H47',
  'M17 59 H5 V47',
]

/* ── Wordmark ─────────────────────────────────────────────────────────── */

const CELL_W = 5
const CELL_H = 7

/** Monoline capitals on a 5×7 cell. Open paths; stroke and caps are applied by the renderer. */
const GLYPHS: Record<string, string> = {
  N: 'M0 7 V0 L5 7 V0',
  E: 'M5 0 H0 V7 H5 M0 3.5 H4',
  X: 'M0 0 L5 7 M5 0 L0 7',
  U: 'M0 0 V7 H5 V0',
  S: 'M5 0 H0 V3.5 H5 V7 H0',
  C: 'M5 0 H0 V7 H5',
  H: 'M0 0 V7 M5 0 V7 M0 3.5 H5',
  // The O of ECHO: a closed ring with a one-unit break in its top edge (a
  // dropped bit of signal). A break on the side would read as a C.
  O: 'M2.2 0 H0 V7 H5 V0 H3.4',
  'O.closed': 'M0 0 H5 V7 H0 Z',
}

const ADVANCE = CELL_W + 2.6
const WORD_GAP = 6.6

export interface Wordmark {
  /** Path data in wordmark units (cell height 7). */
  d: string
  width: number
  height: number
}

function run(text: string, startX: number, closedLast: boolean): { d: string; end: number } {
  let x = startX
  const parts: string[] = []
  const chars = [...text]
  chars.forEach((char, index) => {
    const key = char === 'O' && closedLast && index === chars.length - 1 ? 'O.closed' : char
    const glyph = GLYPHS[key]
    parts.push(translatePath(glyph, x, 0))
    x += ADVANCE
  })
  return { d: parts.join(' '), end: x - 2.6 }
}

/** Shift an M/L/H/V/Z path by (dx, dy). Only the commands this file uses. */
export function translatePath(d: string, dx: number, dy: number): string {
  return rewritePairs(d, dx, dy)
}

function rewritePairs(d: string, dx: number, dy: number): string {
  const re = /([MLHVZ])\s*([^MLHVZ]*)/g
  let m: RegExpExecArray | null
  const out: string[] = []
  while ((m = re.exec(d))) {
    const cmd = m[1]
    const args = m[2].trim().split(/\s+/).filter(Boolean).map(Number)
    if (cmd === 'Z') out.push('Z')
    else if (cmd === 'H') out.push(`H${round(args[0] + dx)}`)
    else if (cmd === 'V') out.push(`V${round(args[0] + dy)}`)
    else out.push(`${cmd}${round(args[0] + dx)} ${round(args[1] + dy)}`)
  }
  return out.join(' ')
}

const round = (n: number) => Math.round(n * 100) / 100

/** "NEXUS ECHO" on one line. */
export function wordmark(): Wordmark {
  const first = run('NEXUS', 0, false)
  const second = run('ECHO', first.end + WORD_GAP, false)
  return { d: `${first.d} ${second.d}`, width: second.end, height: CELL_H }
}

/** NEXUS over ECHO, left aligned, for a stacked lockup. */
export function wordmarkStacked(): Wordmark {
  const first = run('NEXUS', 0, false)
  const second = run('ECHO', 0, false)
  const dy = CELL_H + 3.2
  return { d: `${first.d} ${translatePath(second.d, 0, dy)}`, width: first.end, height: CELL_H * 2 + 3.2 }
}

export const WORDMARK_STROKE = 1.15
export const WORDMARK_ECHO_OFFSET = { x: 0.5, y: 0.5 }
