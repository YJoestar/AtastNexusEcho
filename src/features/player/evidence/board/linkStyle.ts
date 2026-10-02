import type { LinkStatus } from '@/lib/investigationWorkspace'

export interface StatusStyle {
  stroke: string
  dash: string | undefined
  /** Glyph repeated in the label so status never relies on colour alone. */
  glyph: string
}

/**
 * Status is carried three ways: stroke colour, stroke pattern, and a glyph in
 * the label. Any one of them is enough to read the link.
 */
export const LINK_STATUS_STYLE: Record<LinkStatus, StatusStyle> = {
  CONNECTED: { stroke: '#d3b87b', dash: undefined, glyph: '•' },
  UNCONFIRMED: { stroke: '#d3b87b', dash: '9 6', glyph: '?' },
  CONFIRMED: { stroke: '#7fbf9a', dash: undefined, glyph: '✓' },
  CONTRADICTED: { stroke: '#c0554b', dash: '2 7', glyph: '✕' },
  UNKNOWN: { stroke: '#8a8d92', dash: '1 9', glyph: '…' },
}
