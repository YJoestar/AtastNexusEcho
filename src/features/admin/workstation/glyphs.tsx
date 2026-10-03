/**
 * NEXUS ECHO — Workstation glyphs
 *
 * An original set drawn on a 24-unit grid with square caps and mitred joins:
 * the marks of a 1980s control-room panel, not a modern icon pack. Monochrome;
 * colour comes from the surrounding text.
 */
import type { SVGProps } from 'react'
import type { GlyphName } from './apps'

const PATHS: Record<GlyphName, JSX.Element> = {
  // A case folder: notched tab, punched hole, two index lines.
  dossier: (
    <>
      <path d="M3 5h7l2 2.5h9V20H3z" />
      <circle cx="7.5" cy="14" r="1.3" />
      <path d="M11.5 12.5H18M11.5 16H16" />
    </>
  ),
  // An issued ID card with a photo slot.
  personnel: (
    <>
      <path d="M3 5h18v14H3z" />
      <path d="M6 8h5v6H6z" />
      <path d="M13.5 9H18M13.5 12H18M6 16.5H14" />
    </>
  ),
  // A site plan: grid, crosshair, a surveyed marker.
  site: (
    <>
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" opacity=".45" />
      <path d="M12 7v10M7 12h10" />
      <path d="M12 9.5 14.5 14h-5z" />
    </>
  ),
  // Three master switches on a panel.
  switchboard: (
    <>
      <path d="M3 4h18v16H3z" />
      <path d="M6 8h12M6 12h12M6 16h12" opacity=".5" />
      <path d="M14 6.5h3v3h-3zM7 10.5h3v3H7zM12 14.5h3v3h-3z" />
    </>
  ),
  // A ledger: bars rising from a ruled baseline.
  ledger: (
    <>
      <path d="M3 20h18" />
      <path d="M5 20v-5h3v5M10.5 20V9h3v11M16 20v-8h3v8" />
      <path d="M3 4v3M3 10v0" opacity=".5" />
    </>
  ),
  // A mounted photographic plate with corner registration marks.
  plate: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M4 8h2M4 16h2M18 8h2M18 16h2M8 4v2M16 4v2M8 18v2M16 18v2" opacity=".6" />
      <path d="M12 8.5 15.5 12 12 15.5 8.5 12z" />
    </>
  ),
  // A fixed camera on a short bracket.
  camera: (
    <>
      <path d="M3 8h13v8H3z" />
      <path d="M16 10.5 21 8v8l-5-2.5" />
      <circle cx="9.5" cy="12" r="2.2" />
      <path d="M6 16v3h7v-3" opacity=".6" />
    </>
  ),
  // A cassette: reels and a tape window.
  tape: (
    <>
      <path d="M3 6h18v12H3z" />
      <circle cx="8.5" cy="11" r="2" />
      <circle cx="15.5" cy="11" r="2" />
      <path d="M7 16h10l-1.2-2h-7.6z" />
    </>
  ),
  // A field handset: tall body, notch, home bar.
  handset: (
    <>
      <path d="M7 2.5h10v19H7z" />
      <path d="M10.5 5h3" />
      <path d="M10 19h4" />
      <path d="M9.5 8.5h5v6h-5z" opacity=".55" />
    </>
  ),
  // An inspection reticle on a plate.
  inspect: (
    <>
      <path d="M4 4h12v12H4z" />
      <path d="M10 6.5v7M6.5 10h7" />
      <path d="m14.5 14.5 6 6" />
      <path d="M17 17.5l2-2" opacity=".5" />
    </>
  ),
  // A prompt: chevron and cursor bar.
  prompt: (
    <>
      <path d="M3 4h18v16H3z" />
      <path d="m7 9 4 3-4 3" />
      <path d="M13 16h4" />
    </>
  ),
}

interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: GlyphName
  size?: number
}

export function Glyph({ name, size = 20, ...props }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
