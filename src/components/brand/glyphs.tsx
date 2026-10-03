/**
 * NEXUS ECHO — field glyphs
 *
 * The icons for the five investigation spaces and the marks that tell their
 * state. One grammar, matching the Bureau icon set they sit beside:
 *
 *   grid      24 × 24, live area 20 × 20 (2 unit margin)
 *   stroke    1.5, square caps, mitred joins, `currentColor`
 *   corners   square. A radius exists only on the search lens
 *   nodes     a 4 × 4 square is a node: a place where records meet. It is the
 *             single recurring detail, echoing the NEXUS mark
 *   density   no more than 4 strokes + 1 node per glyph
 *
 * State is never colour alone. Each state changes shape too:
 *   default   outline
 *   active    accent colour, filled node, and a bar on the bottom edge
 *   selected  same as active, plus a plate behind (set by the container)
 *   disabled  dashed stroke, 40 % opacity
 *   locked    dashed stroke + padlock tick
 *   new       solid amber square, top right
 *   alert     amber triangle, top right
 *   connected cyan node, bottom right
 *
 * Labels accompany every glyph that is not self-evident; see
 * NEXUS_ECHO_ICON_GUIDELINES.md.
 */
import type { ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/utils'

type Props = SVGProps<SVGSVGElement> & { className?: string }

function Base({ className, children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg
      data-bureau-icon="true"
      className={cn('bureau-icon', className)}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      {...props}
    >
      {children}
    </svg>
  )
}

/** The recurring node: a 4 × 4 square. `data-node` is what a state fills. */
const Node = ({ x, y }: { x: number; y: number }) => <rect data-node="true" x={x} y={y} width="4" height="4" />

/** CASE: a dossier. Tab, body, two ruled lines of entry. */
export function CaseGlyph(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 20 V4.5 H10 L12 7.5 H20 V20 Z" />
      <path d="M8 12.5 H16 M8 16 H13" />
    </Base>
  )
}

/** EVIDENCE: an archive box with its label slot: recovered, stored, tagged. */
export function EvidenceGlyph(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 4.5 H21 V9 H3 Z" />
      <path d="M5 9 V20 H19 V9" />
      <path d="M10 13 H14" />
    </Base>
  )
}

/** BOARD: three records and the links between them. */
export function BoardGlyph(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 7 V11 M12 11 L5 16 M12 11 L19 16" />
      <Node x={10} y={3} />
      <Node x={3} y={16} />
      <Node x={17} y={16} />
    </Base>
  )
}

/** SCAN: a viewfinder with a marker inside it. */
export function ScanGlyph(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15" />
      <Node x={10} y={10} />
    </Base>
  )
}

/** COMMS: a source node and two bands of signal each side: a channel, broadcasting. */
export function CommsGlyph(props: Props) {
  return (
    <Base {...props}>
      <path d="M7 9 V15 M17 9 V15 M4 6 V18 M20 6 V18" />
      <Node x={10} y={10} />
    </Base>
  )
}

/** LEDGER: ranked rows, one marked. Replaces a trophy: this is a record, not a prize. */
export function LedgerGlyph(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 5.5 H20 M4 10.5 H20 M4 15.5 H13 M4 20 H9" />
      <rect data-node="true" x="16" y="13.5" width="4" height="4" />
    </Base>
  )
}

export const GLYPHS = {
  case: CaseGlyph,
  evidence: EvidenceGlyph,
  board: BoardGlyph,
  scan: ScanGlyph,
  comms: CommsGlyph,
  ledger: LedgerGlyph,
} as const

export type GlyphName = keyof typeof GLYPHS
export type GlyphState = 'default' | 'active' | 'selected' | 'disabled' | 'locked' | 'new' | 'alert' | 'connected'

/** micro: metadata · small: secondary · medium: navigation · large: module */
export const GLYPH_SIZE = { micro: 12, small: 16, medium: 24, large: 32 } as const

/**
 * A glyph with its state. State styling is in CSS (`.nx-glyph[data-state]`) so
 * it follows the container; the markers are drawn here so they are real shapes,
 * not colours.
 */
export function Glyph({
  name,
  size = 'medium',
  state = 'default',
  label,
  className,
}: {
  name: GlyphName
  size?: keyof typeof GLYPH_SIZE
  state?: GlyphState
  /** Accessible name. Omit when a visible label sits next to the glyph. */
  label?: string
  className?: string
}) {
  const Shape = GLYPHS[name]
  const px = GLYPH_SIZE[size]
  return (
    <span
      className={cn('nx-glyph', className)}
      data-state={state}
      style={{ width: px, height: px }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Shape width={px} height={px} />
      {state === 'new' && <span className="nx-glyph-mark nx-glyph-new" />}
      {state === 'alert' && <span className="nx-glyph-mark nx-glyph-alert" />}
      {state === 'connected' && <span className="nx-glyph-mark nx-glyph-connected" />}
      {state === 'locked' && <span className="nx-glyph-mark nx-glyph-locked" />}
    </span>
  )
}
