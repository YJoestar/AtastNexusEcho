# NEXUS ECHO — Icon guidelines

Sheet: `docs/brand/glyph-states.png`. Code: `src/components/brand/glyphs.tsx`
(field glyphs) and `src/components/bureau/BureauIcons.tsx` (the wider Bureau
set, which uses the same grammar).

## Grammar

| | |
|---|---|
| Grid | 24 × 24, live area 20 × 20 (2 unit margin) |
| Stroke | 1.5, square caps, mitred joins, `currentColor` |
| Corners | Square. The one circle in the set is the search lens |
| Node | A 4 × 4 square: *a place where records meet*. The single recurring detail, echoing the NEXUS mark. Outline by default, filled when active |
| Density | ≤ 4 strokes + 1 node |
| Fill | Never filled shapes except the node. No gradients, no 3D, no emoji |
| Source | Drawn by hand; no imported icon library (lucide removed) |

## The field glyphs

| Glyph | Meaning | Construction |
|---|---|---|
| **Case** | The dossier you are working | folder with tab; two ruled lines of entry |
| **Evidence** | Recovered, stored, tagged material | archive box with a label slot |
| **Board** | Records and the links between them | three nodes joined |
| **Scan** | Read a physical marker | viewfinder corners around a node |
| **Comms** | A channel; dispatches arriving | source node with two bands of signal each side |
| **Ledger** | Ranking and record. Replaces a trophy: this is a record, not a prize | ranked rows, one marked |

Rejected: an eye (generic, and nothing here is "watching"), a magnifier for
Evidence (that is Search), a speech bubble for Comms (there is no chat), a
trophy (gamification), a star, a gem.

## Size

| Name | px | Use |
|---|---|---|
| micro | 12 | inline status / metadata |
| small | 16 | secondary actions, list rows |
| medium | 24 | navigation |
| large | 32 | module / evidence category |

Never mix sizes within one row. Hit area is always ≥ 44 px regardless of glyph size.

## States — never colour alone

| State | Change | Non-colour cue |
|---|---|---|
| default | outline, muted | — |
| active | accent, filled node | **2 px bar** under the glyph |
| selected | accent, filled node | plate behind (container) |
| disabled | 40 % opacity | **dashed stroke** |
| locked | 40 % opacity | dashed stroke + **padlock tick** |
| new | — | solid **amber square**, top right |
| alert | — | amber **triangle**, top right |
| connected | — | cyan **node**, bottom right |

Unread count on Comms is a number in a bordered box, announced in the control's
`aria-label` ("COMMS, 3 unread").

## Icon + label

Navigation always shows a label (CASE, EVIDENCE, BOARD, SCAN, COMMS). An icon
stands alone only where it is unambiguous (close ×, back ←, refresh ⟳), and has
an `aria-label`. Ambiguous actions (add to board, compare, trace) are text
buttons.

## Audit result (player screens)

37 distinct Bureau icons are used by the player screens; all share the 1.5
square-cap grammar. **Replaced:** the five nav icons and the trophy.
**Deleted** (unused): star, gem, pill, gamepad, bar charts, compass, navigation,
hash, cpu, music, trending-up. **Not redrawn one by one:** the remaining ~74
Bureau icons; they match the grammar but were not reviewed individually.
