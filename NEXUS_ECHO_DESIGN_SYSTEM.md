# NEXUS ECHO — Design system

Brand rationale: `NEXUS_ECHO_BRAND_BOOK.md`. Icons: `NEXUS_ECHO_ICON_GUIDELINES.md`.
Tokens: `src/styles/tokens.css` (non-colour), `globals.css :root` + Tailwind
`nexus.*` (colour). New code uses tokens; a literal value is a bug.

## Tokens

| Group | Tokens |
|---|---|
| Space (4 px base) | `--sp-1…8` = 4 · 8 · 12 · **16 (gutter)** · 24 · 32 · 48 · 64 |
| Type (rem) | meta 11 px · label 12 · body-sm 14 · **body 16** · lead 20 · title 28 |
| Corners | `--r-0` 0 · `--r-1` 2 px (pressed controls only) |
| Lines | `--line-1` 1 px · `--line-2` 2 px |
| Motion | `--dur-fast` 90 ms · `--dur-med` 180 ms · `--dur-slow` 360 ms; `--ease-lock`, `--ease-draw` |
| Layers | base 0 · board 10 · sticky 20 · header/nav 40 · sheet 60 · overlay 80 · glitch 90 |
| Touch | `--touch-min` 44 px · `--touch-primary` 56 px |
| Breakpoints | phone < 640 · tablet 640–1023 · desktop ≥ 1024 (Tailwind `sm`/`lg`) |

## Layout

One column, 16 px gutter, content max 28 rem on the home. A screen has one
dominant thing (the lead / the record), secondary information, then reference.
Rows are separated by 1 px rules, not wrapped in cards.

## Surfaces

| Surface | Used for |
|---|---|
| Device chrome | header, bottom bar (`surface`, hairline) |
| Lead panel | the one thing to do (`.nx-lead`: graphite, corner brackets) |
| Record row | evidence, dispatches (flat, ruled) |
| Document | paper stock (`paper`), records read as documents |
| Terminal | admin workstation |

## Controls

| Control | Look | Pressed |
|---|---|---|
| Primary | off-white fill, dark text, 56 px | 1 px down, +12 % brightness |
| Secondary | outlined | same |
| Tool / chip | outlined, 44 px, mono | background step |
| Danger | red outline, text | same |
| Disabled | 45 % opacity, `cursor: not-allowed` | none |
| Focus | 2 px accent outline, kept | — |
Reduced motion removes the 1 px travel.

## Components (player)

`FieldLead`, `IntelRow`, `FieldLedger`, `FieldLink` (home); `NexusMark`,
`NexusWordmark`, `Glyph`; the bottom bar (`NavItem` model in `lib/navigation`);
the evidence record row, inspection (trace, linked records, action bar), and
the board from earlier passes. Deliberately **not** extracted into generic
Button/Modal/Sheet abstractions: the existing `.nexus-btn*` classes already
serve and a second system would add drift.

## Motion language

| Meaning | Behaviour |
|---|---|
| Open | opacity resolve, 180–220 ms (`nx-wake`) |
| Focus / select | the record locks (border + order), no scale pop |
| Connect | the link draws itself (existing) |
| Discover | the UPDATED marker appears; no fanfare |
| Confirm | text state change ("EVIDENCE LINKED"), not a banner |
| Error | stays put, says what happened and what to do |
| Abnormal | a brief glitch from the controller, then calm |

## Status vocabulary

Open / Suspended / Closed (case); UPDATED, NEW (records); VERIFIED, UNRESOLVED,
CONTRADICTED, ANOMALOUS (marks, existing); NO ROUTE TO SERVER, OFFLINE (link).
Copy: no "Success!". Prefer RECORD RECOVERED, EVIDENCE LINKED, ARCHIVE UPDATED.

## Honest status

Defined and applied: type, tokens (new code), colour semantics (+ verified,
contrast fixes), mark/wordmark, glyphs, nav, header, login, favicon.
**Not yet retrofitted:** the ~1,600 older CSS lines to tokens; Node, Inventory,
Leaderboard, Final, Complete, QR to the new header/rows; per-surface tooltip /
long-press help.
