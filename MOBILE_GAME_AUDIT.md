# NEXUS ECHO — Mobile Game Audit (player)

Audited by running every player screen in a touch-emulated browser at
360×800, 390×844 and 412×915 (and 844×390 landscape for the main ones), and by
reading the code behind them. Method limits are listed at the end; they matter.

## The real loop (from the code, not from references)

A team arrives at a physical location, **scans** a Bureau marker, opens the
**node** (a puzzle with a role-specific block of content), submits an answer
(hints cost points), and is rewarded with **recovered material**: evidence
records, objects and fragments. That material goes into the **archive**; the
team **inspects** it, files notes, **compares** two records, and arranges and
links records on a **board** to reason about what happened. **Dispatches** from
the Bureau are the only channel back to the team. The case ends with a final
code.

| Question | What the game actually has |
|---|---|
| What is discovered? | The contents of CASE NX-037: who did what in the east corridor, when. |
| Information available | Nodes, recovered records (8 evidence types), dispatches. |
| Inspectable | Every record: zoom/pan, brightness/contrast/sharpen, metadata, annotations. |
| Connectable | Board links (8 kinds, 5 statuses), compare (side/overlay/timeline). |
| Deducible | Clues derived from record relationships (`lib/evidence/clues.ts`). |
| Changeable | Notes, marks, placements, links — all local and persistent. |
| **Not present** | Contacts, chat threads with NPCs, calls, email client, timeline screen. |

That last row decides the scope. Messaging/calls/contacts are *not* built,
because the game has no data for them (the Bureau's dispatches are one-way
broadcasts). Inventing NPC chat would be inventing story, which the brief
forbids.

## Screen audit (before this rebuild → decision)

| SCREEN | CURRENT UX / VISUAL | GAMEPLAY ROLE | PROBLEMS FOUND | DECISION |
|---|---|---|---|---|
| Header | Two rows (~100 px), 4 pieces of metadata | Orientation | Cost a quarter of a 360×800 screen with the connection banner; timer wrapped | **REBUILT** one row |
| Connection banner | 3 lines whenever degraded | State | ~100 px for an explanation | **COMPACTED** (previous pass) |
| Home (Game) | Stack of 8 panels: case doc, timer, progress, map (42 vh), node doc, node list, 6 "standing instructions", score grid, status grid | Orientation | Exactly the dashboard the brief forbids; nothing says what to do next | **REBUILT** as Case: lead → news → ledger |
| Bottom bar | Case · Evidence · Inventory · QR · Ranking | Navigation | Generic; no Board or Comms; Ranking is not an investigation space | **REBUILT** Case · Evidence · Board · Scan · Comms |
| Node | Role content + answer + hints | Core puzzle | *Not verified* (see limits) | KEEP |
| QR scanner | Camera + manual entry, 10 explicit error states | Core | Good states; back arrow redundant with bar | KEEP |
| Site map | Fogged campus map | Supporting | Fine | KEEP (reached from Case) |
| Evidence archive | Dense desktop list, 8–9 px text, tiny TABLE/COMPARE buttons, 4 rows of filter chips, stats aside | Core | Unusable thumb targets; search only matched title/code | **REBUILT** |
| Inspection | Zoom/pan/enhance good; metadata 7–9 px; no way onward | Core | Dead end: no links, no trace | **REBUILT** (trace, linked records, thumb-zone actions) |
| Compare | Side/overlay/timeline | Supporting | Reached only from tiny list buttons | KEEP; reached from inspection |
| Board | Pan/zoom/pinch, focus inspector | Core | Tools panel pushed the canvas below the fold on phones | **FIXED** (collapsed by default <640 px; reachable from the bar) |
| Inventory | Objects/fragments register | Core | Header wrapped (previous pass) | KEEP, linked from Case and Evidence |
| Comms (Notifications) | Register rows, one line each | Supporting | Message text truncated to a single line (previous pass) | **REBUILT** header + wrapped dispatches |
| Leaderboard | Ranked teams | Supporting | Dense, secondary | KEEP, demoted to a link on Case |
| Final / Complete / Waiting / Login | Gate and closure screens | Core | *Not re-audited this pass* | KEEP |

## What this pass deliberately did not build

Timeline screen, contacts, calls, chat threads, a video player with frame
stepping, a "reconstruction" UI. Each fails the filter: no data in the game
backs it. Surveillance exists as still frames (`SURVEILLANCE` records) — they
are inspected like photographs; there is no video to step through.

## Limits of this audit (said plainly)

- Runs against the QA simulator in a harness with **no network**. The Node
  screen calls the server directly, so it stayed on "Loading" in the harness
  and was **not visually verified**. It is unchanged.
- The archive/clue content seen is the dev-only CASE NX-037 showcase set.
  Production records carry no `relationships`, so *Linked records* appears only
  where the server supplies them; *Trace* works on any record that has a
  location or device.
- Emulated touch is not a real phone: browser chrome, keyboard resize and
  safe-area insets were reasoned about, not measured on a device.
