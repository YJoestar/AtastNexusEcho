# NEXUS ECHO — Brand book

Sheets: `docs/brand/brand-kit.png`, `docs/brand/glyph-states.png`. Assets:
`public/brand/`. Source of truth for geometry: `src/lib/brand/geometry.ts`
(regenerate with `npx vite-node scripts/brand/build.ts`).

## 01 Core idea

Derived from the game, not invented for it: NEXUS ECHO is the Bureau's field
system for a team recovering CASE NX-037 from an archive that cannot be fully
trusted. A team **traces** records to other records (nexus: where things
connect) and finds that the same events **recur** in different media (echo: the
same corridor, three timestamps). The brand has to say *investigate, connect,
trace, recover*, not just *horror*.

**Visual thesis.** *NEXUS ECHO looks like the restricted field software of an
old records bureau: carefully maintained, square-cornered, procedural — and
slightly out of register, as if every record has been printed twice.*

## 02 Five pillars

| Pillar | Means | Looks like | Moves like | Avoid |
|---|---|---|---|---|
| **Forensic** | Procedure, identification | IDs, labels, rules, chain-of-custody rows | Precise, stops where it lands | holograms, sci-fi glow |
| **Institutional-retro** | An old but maintained system | Plex type, square corners, paper and phosphor | Decisive, no bounce | pixel fonts, 8-bit borders, fake DOS |
| **Trace** | Things connect | Nodes (4 px squares) and lines | A line draws itself | decorative networks |
| **Echo** | Recurrence, a second copy | A thinner displaced duplicate | A brief offset, then rest | constant glitch |
| **Quiet** | Unease through restraint | Space, one focus, long stable stretches | Mostly still | black + red cliché, jump cues |

## 03 Logo and symbol

The **symbol** is a monoline **N** — two verticals joined by a diagonal, which is
what a two-node network looks like — with **nodes** (filled squares) at the two
ends of the diagonal, a **thinner displaced copy** behind it (the echo), and
**four corner brackets** framing it like a fiducial on a recovered record.

- **Full** (≥ 28 px): brackets + echo + N + nodes.
- **Compact** (< 28 px, favicon): N + nodes + a light echo. Brackets drop out.
- Variants: dark, light, mono-black, mono-white; device mark (on CRT black).
- Clear space: the width of one bracket arm (10 / 64 of the mark).
- Minimum: 16 px compact; 28 px full.

The **wordmark** is drawn, not typeset: monoline capitals on a 5 × 7 cell,
square caps, so it never depends on a font. ECHO carries the same displaced
second copy at 35 %. The O of ECHO has a one-unit break in its top edge (a
dropped bit of signal). A break on the side was tried and read as a *C*; the
top break stays legible.

**Lockups:** symbol + stacked wordmark (default); wordmark alone for tight
bars. **Where it appears:** login (full), player header (compact), admin system
bar, favicon/app icon, loading/boot, evidence stamp. Not on every screen.

Tested: 16 / 24 / 32 / 48 px; dark; light; monochrome; wordmark hidden (the N
carries it). Tested against the story: N = network, echo = recurrence.

Rejected: an eye, a camera, a skull, a ghost, a warning triangle, a waveform
(all generic or a cliché); a pixel-font wordmark (the retro look is geometry
and procedure, not a pixel grid).

## 04 Colour

Discipline: one ground, one text colour, **four** semantic accents. A colour
means one thing wherever it appears.

| Token | Hex | Means |
|---|---|---|
| `bg` CRT black | `#0a0a0b` | the screen |
| `surface` / `elevated` | `#101012` / `#16161a` | panels, one step apart |
| `text` off-white | `#d8d6d0` | primary information |
| `text-muted` / `subtle` | `#918f89` / `#85837d` | secondary / metadata |
| `paper` | `#d4d0c5` | recovered paper: documents only |
| **accent** cold cyan | `#6fb3c4` | live, technical, actionable, found |
| **warning** amber | `#b8863f` | needs attention, new, archive |
| **verified** green | `#7fa88a` | confirmed / closed |
| **danger** red | `#cc6058` | contradiction, critical clock. Never decoration |
| `restricted` | `#7c2f33` | restricted material |

`verified` is new; it is applied to the case ledger and available as
`nexus-verified`. It has **not** been retrofitted onto every existing "verified"
stamp, which still use the cyan accent.

## 05 Typography

| Role | Face | Use |
|---|---|---|
| Reading | **IBM Plex Sans** 400/500/600 | descriptions, dispatches, record text |
| Label | **IBM Plex Sans Condensed** 500/600 | headings, module names |
| System | **IBM Plex Mono** 400/500 | IDs, timestamps, state, metadata, buttons |
| Typed paper | **Courier Prime** | Bureau documents and the one lead title |
| Hand | system script | field annotations only |

Plex was chosen for its institutional (IBM) lineage and because it is not the
default stack of every AI-generated site. Mono is for things a machine says;
sans for things a person reads. Min sizes on the handset: mono 11 px, body 16 px.

## 06 Shape, line, label

Square. The only rounding is 2 px on a pressed control. Lines: 1 px resting,
2 px for emphasis (the active bar, a selected edge). Corner brackets are the
recurring frame (lead panel, mark). Labels are uppercase mono with 0.12–0.2 em
tracking: `CASE 037`, `NX-037-B-01 PHOTOGRAPH`, `UPDATED`, `RECOVERED`.
Existing IDs are never altered.

## 07 Material vocabulary

Archive/record rows (flat, ruled), lead panel (graphite, bracketed), document
surface (paper), terminal surface (admin), device chrome (header / bar). Not
every surface is the same card; the game's content is shown as records, not
cards.

## 08 Photography, surveillance, documents

Documentary, cold, imperfect, period-correct (see the renderer notes in
`ARCHITECTURE_NOTES.md`); not cinematic. CCTV: camera ID and timestamp in the
corners, REC marker. Documents: header with case/ID, classification, footer;
paper stock. These systems existed from the evidence work and now share the
type and colour above.

## 09 Motion & VFX

Fast 90 ms (press), medium 180 ms (a screen), slow 360 ms (an investigation
moment). Easing `lock` (arrives and stops) or `draw` (a line forming). Existing:
a link draws itself; a record locks into the board; effects are event-driven
(damaged record opened, signal loss, new dispatch). Normal state is still.
Turn every effect off and the layout still works (checked).

## 10 Accessibility

Contrast measured on `bg` `#0a0a0b` (WCAG): text 13.6, muted 6.1, **subtle 5.2** (was 3.6, below AA; raised), accent 8.4, warning 6.1, verified 7.4, **danger 5.1** (was 2.95, unusable as text; raised). On the `#16161a` elevated surface the lowest is subtle at 4.8 and danger at 4.6. Targets ≥ 44 px; status is never colour alone
(label, shape, position); reduced-motion and effects-off honoured; focus
visible; every glyph has a label or is `aria-hidden` beside one.

## 11 Do / Don't

**Do** keep one dominant thing per screen; use the nodes-and-lines motif where
records relate; keep IDs in mono; let evidence be the largest object.
**Don't** add black-on-red, constant glitch, gradients, glass, pill buttons,
rounded cards, neon, pixel fonts, generic horror symbols, or a second icon set.

## 12 Tests run

- *Without the logo* (judged from screenshots, not a user test): the corner brackets, mono IDs, square rules and cyan nodes
  carry recognition on the Case screen.
- *Monochrome icons:* shapes differ per glyph and per state (bar, dash, marker).
- *Small:* mark legible at 16 px compact.
- *Not run:* grayscale conversion of every screen; a Steam-page mock; large
  desktop composition review beyond the admin bar.
