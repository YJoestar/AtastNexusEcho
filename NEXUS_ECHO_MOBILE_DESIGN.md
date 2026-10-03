# NEXUS ECHO — Mobile Field Device: design

Companion to `MOBILE_GAME_AUDIT.md` (what exists) and `GAME_SCOPE_AUDIT.md`
(what belongs). Everything here is implemented unless marked **not built**.

## Core mobile loop

```
 CASE ──lead──▶ SCAN ──marker──▶ node (puzzle) ──reward──▶ EVIDENCE
   ▲                                                         │ inspect
   │                                                         ▼
 COMMS ◀── Bureau dispatch          TRACE a place/device/name ─▶ other records
   ▲                                                         │ link
   └───────────────  BOARD ◀── connect / contradict ◀────────┘
```
The phone is the only instrument: it points the team at a place (Case), reads
a marker (Scan), receives material (Evidence), and lets them reason (Board).

## Screen architecture & navigation

Five investigation spaces in the bottom bar, each with one purpose:

| Space | Purpose | Route |
|---|---|---|
| CASE | The current lead, what changed, where the case stands | `/player/game` |
| EVIDENCE | Search, inspect, compare recovered material | `/player/game/evidence` |
| BOARD | Connect and reason | `/player/game/evidence?view=table` |
| SCAN | Read a physical marker | `/player/game/qr` |
| COMMS | Bureau dispatches (unread badge) | `/player/game/notifications` |

References reached from Case, not the bar: Site map, Objects (inventory),
Field record (ranking). Node, Final, Complete are focused screens with their
own back control. Routes are unchanged; Board is a view of the evidence route.

Progressive complexity: the home shows only the lead and real news. Board and
Compare appear when the player has records to relate; nothing is hidden behind
an arbitrary lock.

## The Case screen (home)

1. **Lead** (primary): current node, place, one sentence from the narrative
   layer, one 56 px action. If there is no lead: scan / suspended / closed
   states with the right action.
2. **Since last check** (secondary): only real events — unread dispatches,
   records with new information, answers held offline, other open leads. Empty
   state: `NO NEW INFORMATION.`
3. **Case ledger** (tertiary): one strip, one cell per item, plus three links.

## Visual language

Original, restrained: near-black graphite, `nexus-accent` cyan for "this is
actionable / found", amber for "needs attention", red only for a contradiction
or a critical clock. Corner brackets frame the single lead like a viewfinder;
records are laid out as file entries, not cards. Mono for system metadata
(≥ 0.68 rem), a readable serif/type face for content (≥ 0.95 rem). No glass,
no rounded app cards, no fake bezel.

Components named for what they are: `FieldLead`, `IntelRow`, `FieldLedger`,
`FieldLink` (`components/player/field`), plus the board and inspection
components built earlier.

## Game mechanics added

- **Search as investigation** (`lib/evidence/search.ts`, 10 tests). All words
  must match, across id, title, location, description, record content,
  linked-record notes and the player's own notes. Each result says *where* the
  term matched. Media URLs are never searched.
- **Trace.** An inspected record offers its places, devices, names and
  reference numbers as buttons that run that search. The player notices a
  term, chases it, and finds which other records mention it.
- **Linked records.** Where the server supplies relationships, the record
  lists them (kind, note) and opens them in one tap.
- **Compare** is entered from the record's thumb-zone bar; choosing the second
  record opens the examination directly.

**Not built:** puzzles the data cannot support (timeline sort, keyword gating).
Clue discovery (`lib/evidence/clues.ts`) already exists for relationship
puzzles; this pass only makes it reachable on a phone.

## Communication flow

Dispatches only. Short, wrapped in full, with a single explicit action
(`REVIEW` if it has a destination, `MARK READ` otherwise). Arrival of a new
dispatch while the device is open fires one `LIGHT` glitch.

## Horror flow

Horror comes from the case's own evidence (damaged, contradicted, anomalous
records are labelled and carry the amber/red marks) and from state. Stable by
default. Disruptions are all event-driven through the existing glitch
controller: opening a damaged record, a camera feed locking, signal loss, and
now a new dispatch. Narrative level still drains colour through
`[data-horror]`. With effects removed the screens still read as an
investigation; they were built that way first.

## Loading / empty / error / locked

Existing system-language states were kept (`READING TEAM EVIDENCE INDEX…`,
`NO MATCHING FILES`, `NO ACTIVE COMMUNICATIONS`, `OPTICAL ACCESS REFUSED`…).
Locks exist only where the game has them (node locked, final restricted).

## Responsive rules

- Content column max 28 rem on the home; lists are single-column.
- Targets ≥ 44 px (records 88 px, primary actions 56 px, bar items 56 px).
- Inputs 16 px so iOS does not zoom on focus.
- Filter chips are one horizontally scrolling row.
- Content bottom padding clears the device bar (104 px + safe area); the
  record action bar sticks above it.
- Landscape: header and banner are one row each; no screen depends on height.

## Accessibility

Reduced-motion and effects-off honoured by the glitch controller and `nx-wake`;
status is never colour-only (labels, glyphs, text); `aria-current` on the bar;
unread badge announced in the item label; focus-visible preserved.

## Performance

No new continuous loops. One 220 ms opacity animation on the home, once.
Thumbnails are lazy, async-decoded 220 px files; full images load only in
inspection. Search is a linear scan over at most a few hundred records, memoised.

## Research

See `DESIGN_RESEARCH.md` (earlier rounds). Principles applied here: the phone is
the game space (Simulacra), search/cross-reference as the puzzle (Her Story,
Telling Lies), clues across media (The Sign), one case many surfaces (I Am
Innocent), short paced messages and not flooding the player (Simulacra's own
design notes). Nothing was copied; mechanics those games have and this one
lacks data for were left out.
