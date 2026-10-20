# NEXUS — 47-GATE CASE MATRIX

**Status:** Phase 5 deliverable, companion to `docs/NEXUS_CASE_BIBLE.md` and
`docs/NEXUS_CONTENT_MIGRATION.md`.
**Design authority:** `NEXUS_CASE_BIBLE.md` wins on conflict.
**Current-state evidence:** `docs/audit/NEXUS_CURRENT_CASE_INVENTORY.md` and the
migration history (`2026092903`, `2026093035`, `2026100506`, `2026100507`).
**Built reality (stages 3-5):** the entries for `P14`-`P37`, `M03`, `M04` below
record what the rebuild migrations actually contain, not the earlier plan. Those
migrations are **prepared, not executed** against any database.
**Authoring contract:** `docs/_rebuild/TEMPLATE.md`.
**Branch:** `investigation-rebuild`.

This document is the per-gate matrix of the whole investigation: **all 47
`puzzle_nodes`** — the 37 spine gates `P01`-`P37`, the 6 b-gates `P06b`, `P07b`,
`P17b`, `P23b`, `P24b`, `P27b`, and the 4 meta gates `M01`-`M04` — each described
by the same 27-field contract. Every value is derived from the **current seed
content** plus the bible's redesign intent (bible §8, §9, §10). Where the bible
does not fix an exact string, the field is marked **`UNSPECIFIED`** rather than
invented.

---

## 0. How to read this matrix

**Conventions.**

- **CURRENT** = the value that exists in the migration history today.
- **NEW** = the value the rebuild intends. Its *function* is fixed by the bible
  even when its *exact wording* is not; the wording is then `UNSPECIFIED`.
- **`UNSPECIFIED`** = the bible does not fix this value; the migration author
  supplies it subject to the invariants in §0.1.
- **`UNVERIFIED`** = a current value read from the seed that could not be
  independently confirmed (flagged inline where it occurs).
- Answer tokens are compared to the **current runtime** value (after
  `2026100506`/`2026100507`), not the raw seed.

### 0.1 Invariants that bind every NEW value (TEMPLATE + bible §10)

1. The canonical answer token/none of its characters-in-order **never appears**
   in `dataPayload`, `whatTheySee`, `taskPrompt`, `hints`, `storyReveal`,
   `coordinationChain`, or `operatorInvestigation`.
2. Every payload is **ASCII-only**.
3. Hints escalate and never solve: **H1 attention, H2 method, H3 last reasoning
   step** (never the answer).
4. Each role contributes a **discriminating fact**, not a restatement; the
   role-removal test must hold.
5. `code`, `title`, `stage`, `location`, `prerequisites`, `branches`, `rewards`,
   `type`, `difficulty`, `time`, `evidenceUnlocked.id`, `locationClue.nextQrNode`
   and `nextPhysicalLocation` are **preserved** — only `content`,
   `answer_metadata`, and `metadata` prose changes.

### 0.2 Answer-token changes at a glance

Exactly **three** gates change their canonical answer token. Every other gate
keeps its current token while receiving fully new content.

| Gate | Old token | New token | Change | Carrying migration |
|---|---|---|---|---|
| P05 The Third Figure | `VEY` | `VEYR` | retargeted | `2026100603` |
| P17b The Echo Fold | `COUNT THE DOORS NOT THE CLOCKS` | `DOORS` | replaced | `2026100605` |
| P37 The Final Boss | `NEXUS` | `DELETE` / `RETAIN` / `SHARE` | replaced (set) | `2026100607` + `2026100609` |

`P33` (`CONVERGE`) and `P34` (`D`) are **already** repaired by `2026100506`, so
they are unchanged by this rebuild (see `NEXUS_CONTENT_MIGRATION.md` §6).

### 0.3 Field legend (27-field contract)

| # | Field | Meaning |
|---|---|---|
| 1 | code | immutable node code |
| 2 | title | immutable display title |
| 3 | stage | 1 Intake / 2 Records / 3 Classification / 4 Core / 5 Avalanche |
| 4 | location | immutable physical location string |
| 5 | type | immutable `PUZZLE_TYPES` value |
| 6 | difficulty | immutable difficulty (1-5) |
| 7 | est. minutes | immutable `estimated_minutes` |
| 8 | narrative objective | what the gate must make the team conclude |
| 9 | incident | the bounded reconstruction (bible §9) |
| 10 | competing hypotheses | 2+ live explanations (bible §9 / §10.3) |
| 11 | decisive inference | the elimination that proves the token (bible §9) |
| 12 | observer evidence | physical-world discriminating fact |
| 13 | analyst evidence | records/relationship discriminating fact |
| 14 | operator evidence | institutional/permission discriminating fact |
| 15 | role-removal test | what breaks if a role is removed (bible §4) |
| 16 | coordination chain - produce | Observer output |
| 17 | coordination chain - transform | Analyst output |
| 18 | coordination chain - execute | Operator output |
| 19 | team inference (what team says) | the conclusion spoken before submission |
| 20 | operation input | the Operator's submission field/format |
| 21 | canonical answer token | the accepted answer (server-side only) |
| 22 | trap / wrong answer | the tempting eliminated answer (false theory A/B or a live alternative) |
| 23 | hint 1 | attention cue |
| 24 | hint 2 | method cue |
| 25 | hint 3 | last reasoning step |
| 26 | reveal-to-truth | what the gate proves about the case (bible §10.7) |
| 27 | evidence unlocked | `evidenceUnlocked` id + title (id immutable) |
| 28 | QR / next physical step | `locationClue.nextQrNode` + `nextPhysicalLocation` (immutable wiring) |
| 29 | Avalanche relevance | the independent reconstructions whose agreement is the gate's pulse (bible §6) |

**Global note on QR wiring.** `nextQrNode` and `nextPhysicalLocation` are carried
verbatim from the seed (`NEXUS_CONTENT_MIGRATION.md` §3; TEMPLATE rule). Several
values collide across gates (e.g. `QR-NODE-24` is reused). They are reported as
recorded; collisions are a wiring property, not a content decision, and are left
untouched by the rebuild.

---

## Stage 1 — Intake (`2026100603`)

*Stage question (bible §8): "Something was done here. Who, and under whose
authority?"*

### P01 — The Facade

- **code:** `P01`
- **title:** The Facade
- **stage:** 1 — Intake
- **location:** [ADMIN BUILDING] Main Entrance Facade
- **type:** OBSERVATION
- **difficulty:** 2
- **est. minutes:** 6
- **narrative objective:** establish that the archive classifies buildings in its own run format, so the carved band is read as a call number, not decoration.
- **incident:** a band of carved letters runs across the entrance lintel.
- **competing hypotheses:** (a) a dedication; (b) a date; (c) an archive call number.
- **decisive inference:** the band matches the archive's own letter-run format (bible §9 P01).
- **observer evidence:** the physical weathering split — some letters are lichen-stained and old, others are sharp and pale. CURRENT string states the grid only; NEW string UNSPECIFIED (must show the old/new split without naming the run).
- **analyst evidence:** the archive index card of letter runs that all begin with the building code; NEW string UNSPECIFIED.
- **operator evidence:** the intake register field awaiting a call number, its seal date, and the filing name `L. Veyr`; NEW string UNSPECIFIED.
- **role-removal test:** without Observer the team cannot tell which marks are original; without Analyst it cannot know what a run is; without Operator it cannot learn what the Bureau itself recorded.
- **coordination chain - produce:** Observer reports eight carved letters and which are weathered (CURRENT: reports the grid; NEW UNSPECIFIED).
- **coordination chain - transform:** Analyst compares the band to the letter-run format and isolates the addition; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator enters the recorded call number.
- **team inference (what team says):** "The carving is a Bureau call number, filed the day the building was sealed."
- **operation input:** 7-character call-number field at the facade terminal.
- **canonical answer token:** `CDFDEFF` (unchanged).
- **trap / wrong answer:** reading the band as a word/decoration, or including the eighth (later-cut) letter.
- **hint 1:** CURRENT "The facade above the entrance has 7 visible glyph positions." -> NEW: attention (which marks were cut at a different time) — exact wording UNSPECIFIED.
- **hint 2:** CURRENT "Use the cipher key on your device to map each glyph to a letter." -> NEW: method (compare the band to the archive run format) — exact wording UNSPECIFIED.
- **hint 3:** CURRENT "The first two letters are C and D." (leak) -> NEW: last reasoning step (the final letter is not part of any run) — exact wording UNSPECIFIED.
- **reveal-to-truth:** the carving is an archive call number, filed the day the building was sealed, signed in Lina Veyr's hand (the case file is planted). CURRENT reveal "ACCESS GRANTED. PROCEED TO ARCHIVE WING." is replaced.
- **evidence unlocked:** `EVID-P01` "Archive Building Floor Plan (1974)" — new content points to the sealed office; exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-02` -> [ADMIN BUILDING] Lobby Archive Alcove.
- **Avalanche relevance:** three independent reconstructions (stone weathering / run format / Bureau register) must agree before the Operator types; this first agreement is the cascade's ignition.

### P02 — The Clock

- **code:** `P02`
- **title:** The Clock
- **stage:** 1 — Intake
- **location:** [ADMIN BUILDING] Lobby Clock Tower
- **type:** SPATIAL
- **difficulty:** 2
- **est. minutes:** 5
- **narrative objective:** establish time as evidence and prove the lobby reading is the true stop, defeating the tower's reset.
- **incident:** the lobby clock is stopped; the tower clock disagrees.
- **competing hypotheses:** (a) the tower reading 09:47; (b) the lobby stop 21:47; (c) a duration between them.
- **decisive inference:** the tower was reset by hand, so the lobby time is the true stop (bible §9 P02).
- **observer evidence:** the lobby face and the tower face as two physical readings; NEW string UNSPECIFIED.
- **analyst evidence:** the maintenance log re-dating the tower (the 21:47 synchronization event); NEW string UNSPECIFIED.
- **operator evidence:** the authority to have reset the tower (who signed the maintenance order); NEW string UNSPECIFIED.
- **role-removal test:** CURRENT gate is solvable by reading one face; NEW requires physical disagreement (Observer) + log authority (Analyst) + who was permitted to reset (Operator).
- **coordination chain - produce:** Observer reports both faces and their disagreement; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst dates the tower reset against the lobby stop; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits the true stopped time.
- **team inference (what team says):** "The hand-reset tower is the wrong reading; the lobby stop is the true minute."
- **operation input:** `HH:MM` time field.
- **canonical answer token:** `21:47` (unchanged).
- **trap / wrong answer:** `17:47` (the shifted service time, sold later as false theory B).
- **hint 1:** CURRENT "The clock in the lobby shows different numbers depending on your viewing angle." -> NEW: attention (one face was reset) — UNSPECIFIED.
- **hint 2:** CURRENT "View from the east side. Apply the 12-hour offset." -> NEW: method (date the tower reset against the lobby stop) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit 21:47." (leak) -> NEW: last reasoning step (the reset postdates the stop, so the lobby time stands) — UNSPECIFIED.
- **reveal-to-truth:** the tower was reset by hand; time is evidence and the archive's clocks have been interfered with.
- **evidence unlocked:** `EVID-P02` "Clock Maintenance Log — October 14, 2024".
- **QR / next physical step:** `QR-NODE-03` -> [MAIN HALL] Central Staircase.
- **Avalanche relevance:** agreement of three independent time readings (face, log, authority) before submission.

### P03 — The Facade Pin

- **code:** `P03`
- **title:** The Facade Pin
- **stage:** 1 — Intake
- **location:** [ADMIN BUILDING] Facade Base Terminal
- **type:** CIPHER
- **difficulty:** 2
- **est. minutes:** 4
- **narrative objective:** plant the recurring token `3425` and open false theory A ("it is a code") while hinting it is a file reference.
- **incident:** four brass plates embedded by the facade steps read 3-4-2-5.
- **competing hypotheses:** (a) a cipher key; (b) a date; (c) a Bureau case-file reference.
- **decisive inference:** the archive numbering scheme from P01 reads 34-2-5 (binder 34, shelf 2, file 5) (bible §5, §9 P03).
- **observer evidence:** the four plates and their worn placement; NEW string UNSPECIFIED.
- **analyst evidence:** the ordering rule tying plate order to the P01 run; NEW string UNSPECIFIED.
- **operator evidence:** the archive's own numbering convention that parses 34-2-5; NEW string UNSPECIFIED.
- **role-removal test:** without Operator the team cannot distinguish "code" from "file reference"; the gate sells the wrong reading (a code) until the numbering scheme is applied.
- **coordination chain - produce:** Observer reports the four digits; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst orders them by the P01 run; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator enters the recurring token.
- **team inference (what team says):** "3425 is the same Bureau reference every time it appears."
- **operation input:** 4-digit keypad field.
- **canonical answer token:** `3425` (unchanged; re-scoped from cipher to case-file reference).
- **trap / wrong answer:** treating `3425` as a decryption key (false theory A).
- **hint 1:** CURRENT "Look at the brass plates near the facade steps." -> NEW: attention (the plates repeat a value you have seen) — UNSPECIFIED.
- **hint 2:** CURRENT "The PIN is connected to your P01 solution." -> NEW: method (order the digits by the archive run) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit 3425." (leak) -> NEW: last reasoning step (the archive reads binder-shelf-file, i.e. 34-2-5) — UNSPECIFIED.
- **reveal-to-truth:** `3425` is a Bureau case-file reference, not a cipher key — the first false trail is laid and immediately mis-sold.
- **evidence unlocked:** `EVID-P03` "Archive Poster: NEXUS Project Initiation (2021)".
- **QR / next physical step:** `QR-NODE-04` -> [ADMIN BUILDING] Archive Poster Wall.
- **Avalanche relevance:** independent agreement of plate order (Observer), run format (Analyst), and archive convention (Operator) before the token is entered.

### P04 — The Poster Dates

- **code:** `P04`
- **title:** The Poster Dates
- **stage:** 1 — Intake
- **location:** [ADMIN BUILDING] Archive Poster Wall
- **type:** PATTERN
- **difficulty:** 3
- **est. minutes:** 7
- **narrative objective:** teach the affordance that a record dated after closure is a later insertion.
- **incident:** one poster is dated after the building closed.
- **competing hypotheses:** (a) a misprint; (b) a forged display; (c) a later insertion.
- **decisive inference:** the poster's stock and ink post-date the closure (bible §9 P04).
- **observer evidence:** the four dates and the physical stock/ink of the anomalous poster; NEW string UNSPECIFIED.
- **analyst evidence:** the closure date read against the poster date sequence; NEW string UNSPECIFIED.
- **operator evidence:** the archive's acquisition/permission record for the display; NEW string UNSPECIFIED.
- **role-removal test:** CURRENT is "count the 6th letter" trivia; NEW requires the physical post-dating (Observer) + the closure comparison (Analyst) + the acquisition record (Operator).
- **coordination chain - produce:** Observer reports the four dates and the poster's stock; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst orders the dates against the closure; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits the marked letter of the out-of-place poster.
- **team inference (what team says):** "One poster was added after the building closed."
- **operation input:** single-character field.
- **canonical answer token:** `F` (unchanged; token follows from the later-dated poster).
- **trap / wrong answer:** treating the anomaly as a printing error and dating all four posters to the project year.
- **hint 1:** CURRENT "The poster text says \"the 6th letter\". Count the alphabet." -> NEW: attention (one record cannot belong to the others) — UNSPECIFIED.
- **hint 2:** CURRENT "A=1, B=2, C=3, D=4, E=5, F=6." -> NEW: method (match the poster's stock year against the closure date) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit F." (leak) -> NEW: last reasoning step (the poster post-dates closure, so it is not original) — UNSPECIFIED.
- **reveal-to-truth:** the archive was still being added to after it closed — someone has been editing the record.
- **evidence unlocked:** `EVID-P04` "Project NEXUS — Team Roster" (Dr. Lina Veyr, Prof. Marcus Carter, third member redacted).
- **QR / next physical step:** `QR-NODE-05` -> [ADMIN BUILDING] Archive Figure Display.
- **Avalanche relevance:** three independent readings (physical stock / closure comparison / acquisition record) agree before submission.

### P05 — The Third Figure

- **code:** `P05`
- **title:** The Third Figure
- **stage:** 1 — Intake
- **location:** [ADMIN BUILDING] Archive Figure Display
- **type:** DEDUCTION
- **difficulty:** 3
- **est. minutes:** 6
- **narrative objective:** recover the lead's canonical surname from the record itself (a signature block), not from a hint.
- **incident:** the team photograph's third figure is partly cropped.
- **competing hypotheses:** (a) an unnamed assistant; (b) a duplicated image; (c) the lead, Dr. Lina Veyr.
- **decisive inference:** the signature block shows the initials the record truncated (bible §2, §9 P05).
- **observer evidence:** the cropped frame and its etched initial; NEW string UNSPECIFIED.
- **analyst evidence:** the roster signature block whose initials match the cropped figure; NEW string UNSPECIFIED.
- **operator evidence:** the accreditation record that lists the full surname; NEW string UNSPECIFIED.
- **role-removal test:** CURRENT is vacuous (the seed hint literally states the answer); NEW requires Observer (initial), Analyst (signature block), Operator (accreditation record) — any removal collapses the deduction.
- **coordination chain - produce:** Observer reports the visible initial; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst matches initials to the signature block; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits the surname.
- **team inference (what team says):** "The cropped figure is the lead; her signature widens the surname."
- **operation input:** surname field (variable length).
- **canonical answer token:** `VEYR` (**retargeted** from `VEY`; canonical spelling, bible §2).
- **trap / wrong answer:** the truncated `VEY`, or reading the cropped figure as a different person.
- **hint 1:** CURRENT "The redacted person is Dr. Lina Vey." (leak) -> NEW: attention (the frame is cropped, not empty) — UNSPECIFIED.
- **hint 2:** CURRENT "The last name is 3 letters starting with V." -> NEW: method (compare the etched initial to the signature block) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit VEY." (leak) -> NEW: last reasoning step (the signature block's initials give the full surname) — UNSPECIFIED.
- **reveal-to-truth:** the lead is Dr. Lina Veyr and she signed every exhibit — the case names its central figure.
- **evidence unlocked:** `FRAG-01` "Fragment 1 — Vector".
- **QR / next physical step:** `QR-NODE-06` -> [ADMIN BUILDING] Archive Hidden Compartment.
- **Avalanche relevance:** independent recovery of name from image, signature, and accreditation before the Operator types.

### M01 — The First Lock

- **code:** `M01`
- **title:** The First Lock
- **stage:** 1 — Intake (synthesis)
- **location:** [ADMIN BUILDING] Central Archive
- **type:** META
- **difficulty:** 4
- **est. minutes:** 12
- **narrative objective:** synthesise Stage 1 and define the Bureau evidence class `LIGHT` ("observed under ambient/night light").
- **incident:** five Stage-1 exhibits share a custody annotation.
- **competing hypotheses:** (a) a theme; (b) a filing error; (c) an evidence class.
- **decisive inference:** `LIGHT` is a Bureau class, not a mood (bible §9 M01).
- **observer evidence:** the shared annotation physically present on each exhibit; NEW string UNSPECIFIED.
- **analyst evidence:** the class register listing `LIGHT` as an evidence class; NEW string UNSPECIFIED.
- **operator evidence:** the custody policy defining the class; NEW string UNSPECIFIED.
- **role-removal test:** CURRENT is a vibe ("they relate to light"); NEW requires the physical annotation (Observer), the class register (Analyst), and the custody policy (Operator).
- **coordination chain - produce:** Observer reports the repeated annotation across the five exhibits; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst reads it as a class from the register; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits the class name.
- **team inference (what team says):** "The five Stage-1 files were all handled under one evidence class."
- **operation input:** class-name field.
- **canonical answer token:** `LIGHT` (unchanged; re-scoped to the Bureau class).
- **trap / wrong answer:** reading `LIGHT` as a theme/illumination (the seed's fusion).
- **hint 1:** CURRENT "All Stage 1 answers relate to a single concept." -> NEW: attention (one annotation repeats across the five files) — UNSPECIFIED.
- **hint 2:** CURRENT "They all involve visibility, illumination, or time-of-day." -> NEW: method (consult the class register) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit LIGHT." (leak) -> NEW: last reasoning step (it is a handling class, not a mood) — UNSPECIFIED.
- **reveal-to-truth:** the Bureau classifies evidence by handling conditions; Stage 1 is closed as one filed set.
- **evidence unlocked:** `EVID-M01` "Stage 1 Meta — Archive Access Record".
- **QR / next physical step:** `QR-NODE-06` -> [LIBRARY] Basement East Stairwell.
- **Avalanche relevance:** the five Stage-1 conclusions must independently converge on one class; the convergence is the synthesis pulse.


## Stage 2 — Records (`2026100604`)

*Stage question (bible §8): "What records remain, and which are recent insertions?"*

### P06 — The Pivot
- **code:** `P06`
- **title:** The Pivot
- **stage:** 2 — Records
- **location:** [LIBRARY] Stack Reference Desk
- **type:** MEMORY
- **difficulty:** 1
- **est. minutes:** 3
- **narrative objective:** establish the pivot `17` as a record key, extracted from the subject register (not a bare day).
- **incident:** ledger entry #06 is checked out by `L.V.` on `17/10/2024`.
- **competing hypotheses:** (a) date-of-day as decoration; (b) a checkout time; (c) the pivot number of the register.
- **decisive inference:** the day is the pivot key used to cross-reference files (bible §9 P06).
- **observer evidence:** the physical ledger shows entry #06 and the date string `17/10/2024`; NEW string UNSPECIFIED.
- **analyst evidence:** the subject register's pivot convention (treat day as a cross-index); NEW string UNSPECIFIED.
- **operator evidence:** the filing rule that uses `17` as the record pivot; NEW string UNSPECIFIED.
- **role-removal test:** without Observer the date is not read; without Analyst the "day" is not identified as a key; without Operator the pivot cannot be entered as the Bureau key.
- **coordination chain - produce:** Observer reports entry #06 and `17/10/2024`; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst extracts the day as the pivot key; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `17`.
- **team inference (what team says):** "The day 17 is the pivot the records use to cross-link files."
- **operation input:** two-digit field.
- **canonical answer token:** `17` (unchanged).
- **trap / wrong answer:** reading the date as MM/DD or extracting the month/year.
- **hint 1:** CURRENT "The date format is DD/MM/YYYY." -> NEW: attention (the register marks #06 with a checkout date) — UNSPECIFIED.
- **hint 2:** CURRENT "The pivot is the first number in the date." -> NEW: method (the subject register uses the day as its pivot) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit 17." (leak) -> NEW: last reasoning step (the pivot is a cross-index, not a decoration) — UNSPECIFIED.
- **reveal-to-truth:** the subject register uses `17` as the pivot to cross-reference files; the record is structured.
- **evidence unlocked:** `EVID-P06` "Server Rack Binary Log" — exact content wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-07` -> [LIBRARY] Basement Server Rack.
- **Avalanche relevance:** three independent readings (ledger / register convention / filing rule) agree before submission.

### P07 — The Binary
- **code:** `P07`
- **title:** The Binary
- **stage:** 2 — Records
- **location:** [LIBRARY] Basement Server Rack
- **type:** BINARY
- **difficulty:** 2
- **est. minutes:** 6
- **narrative objective:** demonstrate that the shifted time (`17:47`) is a *recorded epoch* in the logs, not an innocent time, reusing the P02 time to expose false theory B.
- **incident:** eight bytes of blinking binary LEDs.
- **competing hypotheses:** (a) random bytes; (b) a raw time; (c) a log marker that points to the epoch `17:47`.
- **decisive inference:** decoding yields a log key that, combined with the tower/lobby time, identifies the epoch `17:47` (bible §5 false theory B, §9 P07). Post-`2026100507` the analyst payload carries `IS:44721` (note: ASCII for `IS:44721` is different from the old `IS:472501`; this is a current repair and is preserved as a wiring detail — the content rewrite focuses on player-visible reasoning).
- **observer evidence:** eight bytes of binary from the LED array; NEW string UNSPECIFIED.
- **analyst evidence:** binary-to-ASCII decoding plus the cross-reference that resolves the marker to `17:47`; NEW string UNSPECIFIED (must not leak `17:47` directly).
- **operator evidence:** the log's epoch field that expects `17:47`; NEW string UNSPECIFIED.
- **role-removal test:** without cross-reference to P02 the binary looks like noise; roles must coordinate.
- **coordination chain - produce:** Observer reports the eight bytes; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst decodes and cross-references with P02; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `17:47`.
- **team inference (what team says):** "The log marks an epoch at 17:47 — a shifted reading planted to mislead."
- **operation input:** `HH:MM` field.
- **canonical answer token:** `17:47` (unchanged).
- **trap / wrong answer:** treating the decoded string as the answer without cross-reference, or reading `21:47` (false theory B).
- **hint 1:** CURRENT "Decode the binary bytes to ASCII characters." -> NEW: attention (the marker points elsewhere) — UNSPECIFIED.
- **hint 2:** CURRENT "The result is a time reference — cross-reference with P02." -> NEW: method (separate the marker from the epoch) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit 17:47." (leak) -> NEW: last reasoning step (the epoch is the log marker, not the lobby stop) — UNSPECIFIED.
- **reveal-to-truth:** the logs contain a planted shifted epoch (`17:47`) — false theory B is present in the record.
- **evidence unlocked:** `EVID-P07` "Project NEXUS — 2021 Research Folder" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-08` -> [ADMIN BUILDING] Archive Cabinet 3.
- **Avalanche relevance:** agreement of the binary read, the cross-reference, and the log epoch.

### P08 — The Vector
- **code:** `P08`
- **title:** The Vector
- **stage:** 2 — Records
- **location:** [ADMIN BUILDING] Archive Cabinet 3
- **type:** PATTERN
- **difficulty:** 2
- **est. minutes:** 5
- **narrative objective:** resolve direction as a vault designation, not a symbol name alone (uses Fragment 1).
- **incident:** cabinet displays Fragment 1 text about divergent paths.
- **competing hypotheses:** (a) a straight line; (b) a network; (c) the vault designation `DELTA`.
- **decisive inference:** the network direction is the vault designation (bible §9 P08).
- **observer evidence:** reads Fragment 1 text; NEW UNSPECIFIED.
- **analyst evidence:** maps the network direction to the designation `DELTA`; NEW UNSPECIFIED.
- **operator evidence:** the vault index uses that designation; NEW UNSPECIFIED.
- **role-removal test:** requires recalling Fragment 1 (cross-stage) and the index mapping.
- **coordination chain - produce:** Observer reports Fragment 1; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst maps network -> `DELTA`; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `DELTA`.
- **team inference (what team says):** "The network direction is the vault's designation."
- **operation input:** five-letter field.
- **canonical answer token:** `DELTA` (unchanged).
- **trap / wrong answer:** choosing the straight line (alpha) as the answer.
- **hint 1:** CURRENT "Fragment 1 speaks of a divergence." -> NEW: attention (the cabinet shows Fragment 1) — UNSPECIFIED.
- **hint 2:** CURRENT "The network direction is named after a Greek letter." -> NEW: method (map network to the vault designation) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit DELTA." (leak) -> NEW: last reasoning step (the designation is the vault key) — UNSPECIFIED.
- **reveal-to-truth:** the vault index designates the network path as `DELTA`.
- **evidence unlocked:** `EVID-P08` "Clock Room Symbol Chart" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-09` -> [ADMIN BUILDING] Clock Room.
- **Avalanche relevance:** Fragment 1 recall + designation mapping + index agreement.

### P09 — The Chronology
- **code:** `P09`
- **title:** The Chronology
- **stage:** 2 — Records
- **location:** [ADMIN BUILDING] Clock Room
- **type:** LOGIC
- **difficulty:** 2
- **est. minutes:** 5
- **narrative objective:** custody gaps cluster at one minute (`17`) (post-`2026100507`, analyst.dataPayload states the Roman numeral conversion explicitly).
- **incident:** clock hand points at XVII (17).
- **competing hypotheses:** (a) decorative number; (b) a time of day; (c) the minute where custody gaps cluster.
- **decisive inference:** XVII = 17 and that minute marks clustered custody gaps (bible §9 P09).
- **observer evidence:** reads XVII on the clock; NEW UNSPECIFIED.
- **analyst evidence:** converts XVII to 17 and matches to custody gaps cluster (from records); NEW UNSPECIFIED.
- **operator evidence:** the custody index expects `17`; NEW UNSPECIFIED.
- **role-removal test:** requires linking the numeral to the records' chronology.
- **coordination chain - produce:** Observer reports XVII; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst converts to 17 and matches gaps; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `17`.
- **team inference (what team says):** "Custody gaps cluster at minute 17 — that's the chronological pivot."
- **operation input:** two-digit field.
- **canonical answer token:** `17` (unchanged).
- **trap / wrong answer:** treating XVII as a different value or reading the hour.
- **hint 1:** CURRENT "The clock uses Roman numerals." -> NEW: attention (XVII appears) — UNSPECIFIED.
- **hint 2:** CURRENT "XVII converts to what decimal?" -> NEW: method (match the converted minute to clustered custody gaps) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit 17." (leak) -> NEW: last reasoning step (the cluster is at that minute) — UNSPECIFIED.
- **reveal-to-truth:** custody gaps cluster at minute 17 — the record has a systematic gap.
- **evidence unlocked:** `EVID-P09` "Secret Door Blueprint" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-10` -> [ADMIN BUILDING] Blue-Marked Door.
- **Avalanche relevance:** numeral reading + gaps analysis + custody index agreement.

### P10 — The Blue Door
- **code:** `P10`
- **title:** The Blue Door
- **stage:** 2 — Records
- **location:** [ADMIN BUILDING] Blue-Marked Door
- **type:** EXTRACTION
- **difficulty:** 1
- **est. minutes:** 3
- **narrative objective:** the equation `BLUE = LIGHT` is read as the Bureau evidence class (linking to M01), not a color theme.
- **incident:** blueprint shows `BLUE = LIGHT`.
- **competing hypotheses:** (a) a color code; (b) a mood; (c) the Bureau evidence class `LIGHT`.
- **decisive inference:** `LIGHT` is the Bureau evidence class (bible §9 P10), reusing M01's class.
- **observer evidence:** reads `BLUE = LIGHT`; NEW UNSPECIFIED.
- **analyst evidence:** identifies the right side as the evidence class from the class register; NEW UNSPECIFIED.
- **operator evidence:** the access rule expects the evidence class; NEW UNSPECIFIED.
- **role-removal test:** must connect to M01's class definition.
- **coordination chain - produce:** Observer reports `BLUE = LIGHT`; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst extracts the class `LIGHT`; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `LIGHT`.
- **team inference (what team says):** "This door is governed by the Bureau evidence class LIGHT."
- **operation input:** five-letter field.
- **canonical answer token:** `LIGHT` (unchanged; re-scoped to Bureau class).
- **trap / wrong answer:** reading it as a color name or as "BLUE".
- **hint 1:** CURRENT "The blueprint says BLUE = LIGHT." -> NEW: attention (equation on blueprint) — UNSPECIFIED.
- **hint 2:** CURRENT "Extract the word on the right." -> NEW: method (match to the evidence class register) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit LIGHT." (leak) -> NEW: last reasoning step (it is the Bureau class, not a theme) — UNSPECIFIED.
- **reveal-to-truth:** the access is governed by evidence class `LIGHT` (linking Stage 1 synthesis to Stage 2).
- **evidence unlocked:** `EVID-P10` "The Blue Symbol" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-11` -> [ADMIN BUILDING] Wall with Glowing Blue Symbol.
- **Avalanche relevance:** equation read + class register + access rule agreement.

### P11 — The Symbol
- **code:** `P11`
- **title:** The Symbol
- **stage:** 2 — Records
- **location:** [ADMIN BUILDING] Wall with Glowing Blue Symbol
- **type:** VISUAL
- **difficulty:** 2
- **est. minutes:** 3
- **narrative objective:** the symbol is classified as the architectural feature `ARCHWAY` (containment symbol in the glyph scheme).
- **incident:** glowing blue symbol ⟁ mounted above a stone archway door.
- **competing hypotheses:** (a) a door; (b) an entrance; (c) an `ARCHWAY`.
- **decisive inference:** the glyph is a containment symbol matched to the scheme and identifies the feature as `ARCHWAY` (bible §9 P11).
- **observer evidence:** sees symbol mounted on an archway; NEW UNSPECIFIED.
- **analyst evidence:** classifies the architectural term in the glyph scheme; NEW UNSPECIFIED.
- **operator evidence:** the scheme lookup expects `ARCHWAY`; NEW UNSPECIFIED.
- **role-removal test:** requires visual identification plus scheme classification.
- **coordination chain - produce:** Observer reports symbol on archway; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst classifies as `ARCHWAY`; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `ARCHWAY`.
- **team inference (what team says):** "The symbol marks an archway — a containment feature in the scheme."
- **operation input:** seven-letter field.
- **canonical answer token:** `ARCHWAY` (unchanged).
- **trap / wrong answer:** calling it "door" or "entrance".
- **hint 1:** CURRENT "The symbol is above a doorway." -> NEW: attention (mounted above the feature) — UNSPECIFIED.
- **hint 2:** CURRENT "The curved stone feature above a door is called an archway." -> NEW: method (match to the glyph scheme's containment term) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit ARCHWAY." (leak) -> NEW: last reasoning step (the glyph scheme classifies it as containment) — UNSPECIFIED.
- **reveal-to-truth:** the glyph scheme classifies this as `ARCHWAY` (containment).
- **evidence unlocked:** `EVID-P11` "Lecture Hall 214 Seating Chart (2021)" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-12` -> [ADMIN BUILDING] Lecture Hall 214.
- **Avalanche relevance:** visual identification + scheme classification + lookup agreement.

### P12 — The Armrest
- **code:** `P12`
- **title:** The Armrest
- **stage:** 2 — Records
- **location:** [ADMIN BUILDING] Lecture Hall 214
- **type:** DEDUCTION
- **difficulty:** 1
- **est. minutes:** 3
- **narrative objective:** identify the seat from the specimen/register (`B7`) for the lab register.
- **incident:** seating chart shows Row B, Seat 7 marked `L.V.`.
- **competing hypotheses:** (a) B6; (b) A7; (c) `B7`.
- **decisive inference:** L.V. = Lina Veyr, seat `B7` is confirmed against the lab's specimen register (bible §9 P12).
- **observer evidence:** finds Row B, Seat 7 marked L.V.; NEW UNSPECIFIED.
- **analyst evidence:** confirms B7 corresponds to L.V. in the register; NEW UNSPECIFIED.
- **operator evidence:** the lab register expects `B7`; NEW UNSPECIFIED.
- **role-removal test:** links person to register entry.
- **coordination chain - produce:** Observer reports B7/L.V.; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst confirms B7 = L.V. in register; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `B7`.
- **team inference (what team says):** "The specimen/register entry is tied to seat B7."
- **operation input:** two-character field.
- **canonical answer token:** `B7` (unchanged).
- **trap / wrong answer:** reading adjacent seat.
- **hint 1:** CURRENT "The seating chart marks a specific seat." -> NEW: attention (marked L.V.) — UNSPECIFIED.
- **hint 2:** CURRENT "The format is Row letter + Seat number." -> NEW: method (confirm against lab register) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit B7." (leak) -> NEW: last reasoning step (register ties L.V. to B7) — UNSPECIFIED.
- **reveal-to-truth:** the lab register ties the subject to seat `B7`.
- **evidence unlocked:** `EVID-P12` "Keycard — Level 3 Access" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-13` -> [SCIENCE BUILDING] Research Lab.
- **Avalanche relevance:** visual read + register confirmation + lookup agreement.

### P13 — The Laboratory
- **code:** `P13`
- **title:** The Laboratory
- **stage:** 2 — Records
- **location:** [SCIENCE BUILDING] Research Lab
- **type:** OBSERVATION
- **difficulty:** 2
- **est. minutes:** 5
- **narrative objective:** the whiteboard shows code `3425` — re-scoped as the programme's own folder (case-file reference), not theft.
- **incident:** whiteboard shows "Experiment: Memory Transfer Protocol Date: 17/10/2024 Code: 3425".
- **competing hypotheses:** (a) an access code; (b) a stolen key; (c) the programme's own folder reference `3425`.
- **decisive inference:** `3425` is the case-file reference (same as P03), i.e. the programme's own folder (bible §9 P13).
- **observer evidence:** reads `3425` from whiteboard; NEW UNSPECIFIED.
- **analyst evidence:** confirms cross-reference to P03 (`3425`) as case-file reference; NEW UNSPECIFIED.
- **operator evidence:** the archive pull expects that folder reference; NEW UNSPECIFIED.
- **role-removal test:** requires recognizing the recurring `3425` as the same reference.
- **coordination chain - produce:** Observer reports `3425`; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst confirms matches P03 as case-file reference; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `3425`.
- **team inference (what team says):** "The repeated pull is the programme's own folder 3425 — not theft."
- **operation input:** four-digit field.
- **canonical answer token:** `3425` (unchanged).
- **trap / wrong answer:** treating it as an arbitrary access code unrelated to P03.
- **hint 1:** CURRENT "The whiteboard has experiment notes." -> NEW: attention (code appears on whiteboard) — UNSPECIFIED.
- **hint 2:** CURRENT "The code matches your earlier facade PIN." -> NEW: method (recognize as the same case-file reference from P03) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit 3425." (leak) -> NEW: last reasoning step (the programme pulled its own folder) — UNSPECIFIED.
- **reveal-to-truth:** `3425` is the programme's own case-file folder — the repeated appearance is internal, not external theft.
- **evidence unlocked:** `EVID-P13` "Lab Symbol Drawer — Glyph Key" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-14` -> [SCIENCE BUILDING] Lab Symbol Drawer.
- **Avalanche relevance:** whiteboard read + cross-reference to P03 + folder lookup agreement.

### P06b — Time Remaining
- **code:** `P06b`
- **title:** Time Remaining
- **stage:** 2 — Records
- **location:** [SCIENCE BUILDING] Lab Wall Clock
- **type:** MEMORY
- **difficulty:** 1
- **est. minutes:** 2
- **narrative objective:** memory reinforcement using P06 pivot `17` (lab log convention).
- **incident:** wall clock shows `--:--`, needs setting using P06 pivot.
- **competing hypotheses:** (a) current time; (b) arbitrary number; (c) the P06 pivot `17`.
- **decisive inference:** recall P06 pivot `17` (the lab's log convention) (bible §9 P06b).
- **observer evidence:** recalls pivot `17`; NEW UNSPECIFIED.
- **analyst evidence:** confirms `17` from P06; NEW UNSPECIFIED.
- **operator evidence:** the lab clock expects the pivot; NEW UNSPECIFIED.
- **role-removal test:** cross-stage recall from P06.
- **coordination chain - produce:** Observer recalls pivot `17`; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst confirms `17`; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `17`.
- **team inference (what team says):** "The lab clock is set to the register pivot 17."
- **operation input:** two-digit field.
- **canonical answer token:** `17` (unchanged).
- **trap / wrong answer:** guessing a different number.
- **hint 1:** CURRENT "Recall the P06 pivot number." -> NEW: attention (clock needs setting) — UNSPECIFIED.
- **hint 2:** CURRENT "It was the day from the checkout date." -> NEW: method (recall P06) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit 17." (leak) -> NEW: last reasoning step (lab log convention uses the same pivot) — UNSPECIFIED.
- **reveal-to-truth:** the lab uses the same register pivot `17`.
- **evidence unlocked:** `EVID-P06b` "Symbol Glyph Key" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-15` -> [SCIENCE BUILDING] Open Symbol Drawer.
- **Avalanche relevance:** P06 recall + confirmation + clock setting agreement.

### P07b — The Network
- **code:** `P07b`
- **title:** The Network
- **stage:** 2 — Records
- **location:** [SCIENCE BUILDING] Lab Network Diagram
- **type:** GRAPH
- **difficulty:** 3
- **est. minutes:** 6
- **narrative objective:** the connected symbols identify `CONNECTION` as the subject lattice (edges are people).
- **incident:** diagram shows three symbols connected: ⟁ ⧉ ⬡.
- **competing hypotheses:** (a) the middle symbol name; (b) the whole diagram name; (c) the concept `CONNECTION`.
- **decisive inference:** ⧉ = `CONNECTION` (from glyph key) — the subject lattice has edges as people (bible §9 P07b).
- **observer evidence:** sees three connected symbols ⟁ ⧉ ⬡; NEW UNSPECIFIED.
- **analyst evidence:** resolves ⧉ = `CONNECTION` from glyph key; NEW UNSPECIFIED.
- **operator evidence:** the lattice entry expects `CONNECTION`; NEW UNSPECIFIED.
- **role-removal test:** requires glyph key from P06b and reading the diagram.
- **coordination chain - produce:** Observer reports ⟁ ⧉ ⬡; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst resolves ⧉ = `CONNECTION`; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `CONNECTION`.
- **team inference (what team says):** "The subject lattice's edge concept is CONNECTION — edges are people."
- **operation input:** ten-letter field.
- **canonical answer token:** `CONNECTION` (unchanged).
- **trap / wrong answer:** naming only the middle symbol differently or reading the three as separate.
- **hint 1:** CURRENT "Recall the glyph key from the symbol drawer." -> NEW: attention (need glyph key) — UNSPECIFIED.
- **hint 2:** CURRENT "⧉ is the second symbol." -> NEW: method (resolve the middle symbol in the connected set) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit CONNECTION." (leak) -> NEW: last reasoning step (edges in the lattice are people = CONNECTION) — UNSPECIFIED.
- **reveal-to-truth:** the subject lattice uses `CONNECTION` as the edge type (edges are people).
- **evidence unlocked:** `FRAG-02` "Fragment 2 — Lattice" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-16` -> [SCIENCE BUILDING] Basement Archive.
- **Avalanche relevance:** diagram read + glyph key + lattice lookup agreement.

### M02 — The Network Meta
- **code:** `M02`
- **title:** The Network Meta
- **stage:** 2 — Records (synthesis)
- **location:** [SCIENCE BUILDING] Memory Lab
- **type:** META
- **difficulty:** 4
- **est. minutes:** 12
- **narrative objective:** synthesise Stage 2 — every Stage-2 exhibit is an edge in one dependency graph (`CONNECTION`).
- **incident:** terminal shows Stage 2 answers with connecting lines.
- **competing hypotheses:** (a) a collection; (b) a sequence; (c) a graph where edges = `CONNECTION`.
- **decisive inference:** every Stage-2 exhibit becomes an edge in one dependency graph (bible §9 M02).
- **observer evidence:** reads all Stage 2 answers with connecting lines; NEW UNSPECIFIED.
- **analyst evidence:** recognises the unifying concept is `CONNECTION` (the graph edge type); NEW UNSPECIFIED.
- **operator evidence:** the meta synthesis expects `CONNECTION`; NEW UNSPECIFIED.
- **role-removal test:** requires seeing the connecting lines across all Stage 2 exhibits (P06–P13,P06b,P07b).
- **coordination chain - produce:** Observer reports the connected answers; NEW UNSPECIFIED.
- **coordination chain - transform:** Analyst identifies `CONNECTION` as unifying; NEW UNSPECIFIED.
- **coordination chain - execute:** Operator submits `CONNECTION`.
- **team inference (what team says):** "Every Stage-2 file is an edge in one dependency graph."
- **operation input:** ten-letter field.
- **canonical answer token:** `CONNECTION` (unchanged).
- **trap / wrong answer:** reading them as a linear sequence only.
- **hint 1:** CURRENT "Every Stage 2 answer is a link in a chain." -> NEW: attention (lines connect all Stage 2 answers) — UNSPECIFIED.
- **hint 2:** CURRENT "What is the concept of linking?" -> NEW: method (graph edge type = CONNECTION) — UNSPECIFIED.
- **hint 3:** CURRENT "Submit CONNECTION." (leak) -> NEW: last reasoning step (the graph unifies all Stage-2 exhibits as edges) — UNSPECIFIED.
- **reveal-to-truth:** Stage 2 forms a single dependency graph; every exhibit is an edge.
- **evidence unlocked:** `FRAG-04` "Fragment 4 — Lattice" — exact wording UNSPECIFIED.
- **QR / next physical step:** `QR-NODE-16` -> [SCIENCE BUILDING] Basement Transfer Chamber.
- **Avalanche relevance:** convergence of all Stage 2 conclusions into one graph.

## Stage 3 — Classification (`2026100605`)

*Stage question (bible §8): "What was done, and what does the record call it?"*

The Stage-3 gates are built in `2026100605_investigation_rebuild_stage3.sql`.
The entries below record the **built reality**; where the bible fixed a value
the build matches it, and the "NEW" wording reported here is the wording in the
migration, not a plan.

### P14 — The Memory Bank

- **code:** `P14`
- **title:** The Memory Bank
- **stage:** 3 — Classification
- **location:** [SCIENCE BUILDING] — Memory Lab
- **type:** MEMORY
- **difficulty:** 3
- **est. minutes:** 6
- **narrative objective:** establish that the Memory Bank is not a backup but a live, subject-keyed index held under a containment class.
- **incident:** the bank holds no copies; every registered cell is a live segment belonging to one subject.
- **competing hypotheses:** (a) a backup/mirror store; (b) a catalogue of names; (c) a live index of segments filed under a containment class.
- **decisive inference:** the register files the index under a class name, and the glossary defines that class as a hold, not a copy (bible §9 P14).
- **observer evidence:** the cells show each store is live and keyed to a subject, not duplicated.
- **analyst evidence:** the glossary's key classes are defined, with one class meaning a hold rather than a copy.
- **operator evidence:** the register seals which class the index is filed under.
- **role-removal test:** without Observer the team cannot see the cells are live; without Analyst the glossary's class is unread; without Operator the filing class is unknown.
- **coordination chain - produce:** Observer reports that every cell is live and keyed to one subject.
- **coordination chain - transform:** Analyst reads the glossary and identifies the containment class.
- **coordination chain - execute:** Operator submits the class token.
- **team inference (what team says):** "The Memory Bank is a live index filed under a containment class, not a backup."
- **operation input:** the class field on the access register.
- **canonical answer token:** `VECTOR` (unchanged).
- **trap / wrong answer:** reading the bank as a backup or as a name catalogue.
- **hint 1:** attention (note that the cells hold no second copy).
- **hint 2:** method (read the glossary's key classes against the register).
- **hint 3:** last reasoning step (the index is filed under a class, not a name).
- **reveal-to-truth:** the bank is a live subject-keyed index under a containment classification.
- **evidence unlocked:** `EVID-P14` "Library Entrance Condition-Mark - Origin".
- **QR / next physical step:** `QR-NODE-17` -> [LIBRARY] - Entrance Symbol.
- **Avalanche relevance:** three independent reconstructions (live cells / glossary class / register seal) must agree before the Operator types.

### P15 — The Cipher Wheel

- **code:** `P15`
- **title:** The Cipher Wheel
- **stage:** 3 — Classification
- **location:** [LIBRARY] — Entrance Symbol Wall
- **type:** CIPHER
- **difficulty:** 3
- **est. minutes:** 7
- **narrative objective:** read the wheel as an archive notation that yields the accession, not a substitution key.
- **incident:** the wheel and the entrance symbol wall carry the same notation the archive uses for accessions.
- **competing hypotheses:** (a) a substitution alphabet; (b) a date; (c) an accession address in the archive's own notation.
- **decisive inference:** the wheel uses the archive's binder/shelf/file notation, so it resolves to an accession, not a word (bible §9 P15).
- **observer evidence:** the symbol wall and wheel share one notation.
- **analyst evidence:** the archive address format decomposes into binder, shelf, file.
- **operator evidence:** the custody stamp names the binder and shelf.
- **role-removal test:** without Observer the notation is unseen; without Analyst the format is unknown; without Operator the stamp cannot be read.
- **coordination chain - produce:** Observer reports the shared notation on wheel and wall.
- **coordination chain - transform:** Analyst decomposes it into binder, shelf, file.
- **coordination chain - execute:** Operator submits the accession number.
- **team inference (what team says):** "The wheel is an accession address, not a word."
- **operation input:** the accession field on the custody record.
- **canonical answer token:** `3425` (unchanged).
- **trap / wrong answer:** reading the wheel as a substitution alphabet.
- **hint 1:** attention (wheel and wall use one notation).
- **hint 2:** method (decompose the address into binder, shelf, file).
- **hint 3:** last reasoning step (the stamp names the binder and shelf, so the file is the remainder).
- **reveal-to-truth:** the wheel encodes the archive accession for the Memory Bank record.
- **evidence unlocked:** `EVID-P15` from the custody record (id immutable from seed).
- **QR / next physical step:** seed wiring preserved.
- **Avalanche relevance:** wall notation, wheel notation and custody stamp must agree.

### P16 — The Auditorium

- **code:** `P16`
- **title:** The Auditorium
- **stage:** 3 — Classification
- **location:** [SCIENCE BUILDING] — Main Auditorium
- **type:** OBSERVATION
- **difficulty:** 3
- **est. minutes:** 6
- **narrative objective:** the certified allocation, not the row count, is the figure the register holds.
- **incident:** the seating plan shows full rows, but the certified allocation differs.
- **competing hypotheses:** (a) the row seat count; (b) the occupied-seat count; (c) the certified seating allocation.
- **decisive inference:** the estates register files the certified allocation under the row total (bible §9 P16).
- **observer evidence:** the plan shows full rows and occupied seats differ.
- **analyst evidence:** the estates register's row total is the certified allocation.
- **operator evidence:** the facilities register row carries the certified figure.
- **role-removal test:** without Observer the plan is unread; without Analyst the register relation is unknown; without Operator the certified row is unfound.
- **coordination chain - produce:** Observer reports rows, seats and occupancy.
- **coordination chain - transform:** Analyst matches the row to the certified allocation in the register.
- **coordination chain - execute:** Operator submits the allocation figure.
- **team inference (what team says):** "The certified allocation is the row figure the register holds."
- **operation input:** the certified-allocation field.
- **canonical answer token:** `15` (unchanged).
- **trap / wrong answer:** submitting the occupied-seat count.
- **hint 1:** attention (occupied seats are not the same as the certified set).
- **hint 2:** method (read the register row against the plan).
- **hint 3:** last reasoning step (the register files the certified figure under the row total).
- **reveal-to-truth:** the certified allocation is the register's figure for the row.
- **evidence unlocked:** `EVID-P16` from the facilities register.
- **QR / next physical step:** seed wiring preserved.
- **Avalanche relevance:** plan, register and certification must agree.

### P17 — The Audio Log

- **code:** `P17`
- **title:** The Audio Log
- **stage:** 3 — Classification
- **location:** [SCIENCE BUILDING] — Auditorium Stage
- **type:** AUDIO
- **difficulty:** 4
- **est. minutes:** 8
- **narrative objective:** the recording is an echo, classified by what it repeats, not by when it played.
- **incident:** the log plays a repeated sound; the class field stays sealed until the team names what the recording is.
- **competing hypotheses:** (a) a timestamped event; (b) a transcript; (c) an echo - a repeated return of an earlier event.
- **decisive inference:** the recording repeats an earlier event rather than recording a new one, so the class is the repeat (bible §9 P17).
- **observer evidence:** the waveform shows a return of an earlier signal, not a fresh capture.
- **analyst evidence:** the custody log's class field names what a repeat is called.
- **operator evidence:** the archive class register files the recording under that class.
- **role-removal test:** without Observer the repeat is unheard; without Analyst the class definition is unknown; without Operator the class register is unfiled.
- **coordination chain - produce:** Observer reports the repeated return in the waveform.
- **coordination chain - transform:** Analyst reads the class definition for a repeat.
- **coordination chain - execute:** Operator submits the class token.
- **team inference (what team says):** "The recording is an echo, classified by its repeat."
- **operation input:** the log class field.
- **canonical answer token:** `ECHO` (unchanged).
- **trap / wrong answer:** dating the recording instead of classing it.
- **hint 1:** attention (the sound returns rather than begins).
- **hint 2:** method (read the custody log's class field).
- **hint 3:** last reasoning step (the class name is what a repeat is called).
- **reveal-to-truth:** the log is classified as a repeat of an earlier event.
- **evidence unlocked:** `EVID-P17` from the audio log custody field.
- **QR / next physical step:** seed wiring preserved.
- **Avalanche relevance:** waveform, custody class and class register must agree.

### P17b — The Echo Fold

- **code:** `P17b`
- **title:** The Echo Fold
- **stage:** 3 — Classification
- **location:** [LIBRARY] — Reading Room Fifth Symbol
- **type:** CIPHER
- **difficulty:** 4
- **est. minutes:** 8
- **narrative objective:** the folded sheet is filed by a counted feature of its imprinted plan, not by a time.
- **incident:** the sheet carries no riddle and no transcript; its reading note files it by a counted feature.
- **competing hypotheses:** (a) an Atbash transcript; (b) a rail-fence plaintext; (c) a feature count that names the class.
- **decisive inference:** the reading note says file by feature, not by time, and the imprinted wall plan carries a countable set of openings (bible §9 P17b).
- **observer evidence:** the sheet's folds and imprinted wall plan show a countable set of openings.
- **analyst evidence:** the reading note directs filing by feature, not by time.
- **operator evidence:** the class register names the class for that counted feature.
- **role-removal test:** without Observer the folds and plan are unseen; without Analyst the reading note is unread; without Operator the class is unnamed.
- **coordination chain - produce:** Observer reports the folds and the imprinted wall plan.
- **coordination chain - transform:** Analyst counts the openings and applies the reading note.
- **coordination chain - execute:** Operator submits the class token.
- **team inference (what team says):** "The sheet is filed by a counted feature of its plan."
- **operation input:** the class register feature index.
- **canonical answer token:** `DOORS` (replaced from the seed's `COUNT THE DOORS NOT THE CLOCKS`; see the answer-change table).
- **trap / wrong answer:** unfolding the Atbash/rail-fence transcript instead of counting the feature.
- **hint 1:** attention (the reading note says file by feature, not time).
- **hint 2:** method (count the openings in the imprinted wall plan).
- **hint 3:** last reasoning step (the class register names the class for a counted opening).
- **reveal-to-truth:** the sheet is classified by the counted feature of its imprinted plan.
- **evidence unlocked:** `EVID-P17b` "Basement Archive Folded Log-Sheet".
- **QR / next physical step:** `QR-NODE-20` -> [LIBRARY] - Reading Room Fifth Symbol.
- **Avalanche relevance:** the sheet, the reading note and the class register must agree.

### P18 — The Pattern Lock

- **code:** `P18`
- **title:** The Pattern Lock
- **stage:** 3 — Classification
- **location:** [LIBRARY] — Reading Room Fifth Symbol
- **type:** PATTERN
- **difficulty:** 3
- **est. minutes:** 6
- **narrative objective:** the recurring accession recurs because the record was charged out, and the lock takes its address.
- **incident:** the lock repeats the accession notation; the reading room holds the file.
- **competing hypotheses:** (a) a coincidental repeat; (b) a second lock code; (c) the same accession charged out to this room.
- **decisive inference:** the charge-out record shows the file pulled to this reading room at that accession (bible §9 P18).
- **observer evidence:** the lock repeats the accession notation seen earlier.
- **analyst evidence:** the charge-out record lists the accession and the destination room.
- **operator evidence:** the reading room register matches the charged-out address.
- **role-removal test:** without Observer the repeat is unseen; without Analyst the charge-out is unfound; without Operator the address cannot be confirmed.
- **coordination chain - produce:** Observer reports the lock's repeated notation.
- **coordination chain - transform:** Analyst matches it to the charge-out record.
- **coordination chain - execute:** Operator enters the accession address.
- **team inference (what team says):** "The lock takes the accession of the file charged out here."
- **operation input:** the charge-out address field.
- **canonical answer token:** `3425` (unchanged).
- **trap / wrong answer:** treating the recurrence as coincidence.
- **hint 1:** attention (the notation has appeared before).
- **hint 2:** method (read the charge-out record).
- **hint 3:** last reasoning step (the file was charged out to this room at that accession).
- **reveal-to-truth:** the file was charged out to the reading room; the lock takes its address.
- **evidence unlocked:** `EVID-P18` from the charge-out record.
- **QR / next physical step:** seed wiring preserved.
- **Avalanche relevance:** lock notation, charge-out record and room register must agree.

### P19 — The Archive

- **code:** `P19`
- **title:** The Archive
- **stage:** 3 — Classification
- **location:** [CAMPUS] — Sculpture Garden
- **type:** DEDUCTION
- **difficulty:** 4
- **est. minutes:** 7
- **narrative objective:** the survey name, not the artist or donor, is how the marker is accessioned.
- **incident:** a bronze hand holds a partly submerged sphere; the marker is accessioned by a survey name.
- **competing hypotheses:** (a) the artist's title; (b) the donor's name; (c) the condition survey name for the marker.
- **decisive inference:** the estates accessions register classes the marker by its condition survey name (bible §9 P19).
- **observer evidence:** the marker's condition - partly submerged - is read from the bronze.
- **analyst evidence:** the survey catalogue defines the condition name for that state.
- **operator evidence:** the estates accessions register files the marker under the survey name.
- **role-removal test:** without Observer the condition is unread; without Analyst the survey name is undefined; without Operator the accession is unfiled.
- **coordination chain - produce:** Observer reports the marker's submerged condition.
- **coordination chain - transform:** Analyst reads the survey name for that condition.
- **coordination chain - execute:** Operator submits the survey name.
- **team inference (what team says):** "The marker is accessioned by its condition survey name."
- **operation input:** the survey-name field.
- **canonical answer token:** `SUBMERGE` (unchanged).
- **trap / wrong answer:** accessions by artist or donor.
- **hint 1:** attention (the register files by condition, not author).
- **hint 2:** method (read the survey catalogue for the condition name).
- **hint 3:** last reasoning step (the accession takes the survey name of the marker's condition).
- **reveal-to-truth:** the marker is a condition-survey accession, not an artwork.
- **evidence unlocked:** `EVID-P19` from the estates accessions register.
- **QR / next physical step:** seed wiring preserved.
- **Avalanche relevance:** the bronze, the survey catalogue and the register must agree.

### P20 — The Symbol Sequence

- **code:** `P20`
- **title:** The Symbol Sequence
- **stage:** 3 — Classification
- **location:** [ADMIN BUILDING] — Building Dome
- **type:** PATTERN
- **difficulty:** 5
- **est. minutes:** 10
- **narrative objective:** the dome accession reads as binder/shelf/file in the archive's notation, not as a symbol ordering.
- **incident:** the dome panel is accessioned in the archive's own notation.
- **competing hypotheses:** (a) symbol discovery order; (b) a coordinate; (c) an accession address binder/shelf/file.
- **decisive inference:** the accession stamp reads binder, shelf, file in the archive's notation (bible §9 P20).
- **observer evidence:** the dome panel's arrangement is read position by position.
- **analyst evidence:** the archive notation decomposes the stamp into binder, shelf, file.
- **operator evidence:** the dome accession stamp carries the binder and shelf.
- **role-removal test:** without Observer the panel is unread; without Analyst the notation is unknown; without Operator the stamp is unfound.
- **coordination chain - produce:** Observer reports the dome panel arrangement.
- **coordination chain - transform:** Analyst decomposes the stamp into binder, shelf, file.
- **coordination chain - execute:** Operator submits the accession number.
- **team inference (what team says):** "The dome panel is an accession address in the archive's notation."
- **operation input:** the accession stamp field.
- **canonical answer token:** `2147` (unchanged).
- **trap / wrong answer:** ordering symbols by discovery instead of reading the accession.
- **hint 1:** attention (the panel is a stamp, not a display).
- **hint 2:** method (decompose into binder, shelf, file).
- **hint 3:** last reasoning step (the binder and shelf are on the stamp, so the file is the remainder).
- **reveal-to-truth:** the dome panel records an accession address.
- **evidence unlocked:** `EVID-P20` from the dome accession stamp.
- **QR / next physical step:** seed wiring preserved.
- **Avalanche relevance:** panel arrangement, notation and stamp must agree.

### P21 — The Final Clue

- **code:** `P21`
- **title:** The Final Clue
- **stage:** 3 — Classification
- **location:** [ADMIN BUILDING] — Fourth Floor Window
- **type:** NARRATIVE_INVESTIGATION
- **difficulty:** 5
- **est. minutes:** 8
- **narrative objective:** the repository holds its plan in the access register; the concept is the repository, not storage.
- **incident:** a note names what holds the plan the symbols cannot voice.
- **competing hypotheses:** (a) storage as a room; (b) a database; (c) the repository whose plan is in the access register.
- **decisive inference:** the access register releases the repository's own floor plan (bible §9 P21).
- **observer evidence:** the window message names a place that holds its own plan.
- **analyst evidence:** the access register shows the repository keeping its floor plan.
- **operator evidence:** the register releases the plan to the team.
- **role-removal test:** without Observer the message is unread; without Analyst the register relation is unknown; without Operator the release is unfound.
- **coordination chain - produce:** Observer reports the window message.
- **coordination chain - transform:** Analyst finds the repository keeping its own plan in the register.
- **coordination chain - execute:** Operator submits the concept token.
- **team inference (what team says):** "The concept is the repository that holds its own plan."
- **operation input:** the repository access register.
- **canonical answer token:** `ARCHIVE` (unchanged).
- **trap / wrong answer:** naming storage or a database generically.
- **hint 1:** attention (the message names something that keeps its own plan).
- **hint 2:** method (read the access register).
- **hint 3:** last reasoning step (the repository is released from the register, so it is the concept).
- **reveal-to-truth:** the repository is the concept the register releases.
- **evidence unlocked:** `EVID-P21` from the repository access register.
- **QR / next physical step:** seed wiring preserved.
- **Avalanche relevance:** message, register and release must agree.

### M03 — The Symbol Meta

- **code:** `M03`
- **title:** The Symbol Meta
- **stage:** 3 — Classification (synthesis)
- **location:** [ADMIN BUILDING] — Central Archive
- **type:** META
- **difficulty:** 5
- **est. minutes:** 18
- **narrative objective:** synthesise Stage 3 — every Stage-3 classification is a kind of mark, so the unifying class is the mark itself.
- **incident:** the central archive shows all Stage-3 answers mapped to the seven marks.
- **competing hypotheses:** (a) a set of codes; (b) a sequence of stages; (c) one class of mark that all the answers are.
- **decisive inference:** the taxonomy records that kind of mark by its name, and every Stage-3 answer is that kind (bible §9 M03).
- **observer evidence:** the mapping shows every Stage-3 answer attached to one of the seven marks.
- **analyst evidence:** the records taxonomy names the class for a mark that stands for a concept.
- **operator evidence:** the taxonomy register takes the class name.
- **role-removal test:** without Observer the mapping is unseen; without Analyst the class is undefined; without Operator the register is unfiled.
- **coordination chain - produce:** Observer reports the answer-to-mark mapping.
- **coordination chain - transform:** Analyst reads the taxonomy class for that kind of mark.
- **coordination chain - execute:** Operator submits the class token.
- **team inference (what team says):** "Every Stage-3 answer is one kind of mark; the class is that mark."
- **operation input:** the records taxonomy register.
- **canonical answer token:** `SYMBOL` (unchanged).
- **trap / wrong answer:** treating the answers as unrelated codes.
- **hint 1:** attention (every answer attaches to a mark).
- **hint 2:** method (read the records taxonomy for the class of mark).
- **hint 3:** last reasoning step (the class is the kind of thing that stands for a concept).
- **reveal-to-truth:** Stage 3 is one class of mark applied to the case.
- **evidence unlocked:** `EVID-M03` "Stage 3 Meta - Containment Taxonomy".
- **QR / next physical step:** `QR-NODE-24` -> [ROOFTOP] - Transmitter Spire.
- **Avalanche relevance:** mapping, taxonomy and register must agree across all Stage-3 gates.

## Stage 4 — Core (`2026100606`)

*Stage question (bible §8): "How does the thing under the record work, and what does it want?"*

### P22 — The Unknown of the Manifold

- **code:** `P22`
- **title:** The Unknown of the Manifold
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Robotics Bay 1
- **type:** LOGIC
- **difficulty:** 4.5
- **est. minutes:** 12
- **narrative objective:** the ledger's open field has held one character since the seal; the manifold's unknown is a single symbol.
- **incident:** the bay ledger has an open field: "UNKNOWN OF THE MANIFOLD, ENTERED AS: [_]".
- **competing hypotheses:** (a) a missing digit; (b) a fallen value; (c) the single character the manifold's unknowns are entered as.
- **decisive inference:** the manifold's unknowns are logged as one symbol, and the bay accepts that single character (bible §9 P22).
- **observer evidence:** the ledger field has been open since the bay was sealed.
- **analyst evidence:** the manifold notation enters unknowns as one character.
- **operator evidence:** the bay accepts a one-character field.
- **role-removal test:** without Observer the open field is unseen; without Analyst the manifold notation is unknown; without Operator the field cannot be filled.
- **coordination chain - produce:** Observer reports the open ledger field.
- **coordination chain - transform:** Analyst reads the manifold notation for an unknown.
- **coordination chain - execute:** Operator enters the single character.
- **team inference (what team says):** "The manifold logs its unknowns as one symbol."
- **operation input:** a one-character field.
- **canonical answer token:** `X` (unchanged).
- **trap / wrong answer:** guessing a digit or a fallen value.
- **hint 1:** attention (the field has been open since the seal).
- **hint 2:** method (read the manifold notation).
- **hint 3:** last reasoning step (the notation enters an unknown as one symbol).
- **reveal-to-truth:** the bay's unknown is the single symbol the manifold uses.
- **evidence unlocked:** `EVID-P22` "Lab Notebook Fragment #51".
- **QR / next physical step:** `QR-NODE-23` -> [ENGINEERING BLOCK] - Robotics Bay 1.
- **Avalanche relevance:** ledger, notation and bay field must agree.

### P23 — Two Clocks

- **code:** `P23`
- **title:** Two Clocks
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Antenna Deck
- **type:** DEDUCTION
- **difficulty:** 4.5
- **est. minutes:** 12
- **narrative objective:** when an external report conflicts with a house record, the house does not choose - it reads the record again.
- **incident:** the deck's standing order plate directs what to do when an external report conflicts with a house record.
- **competing hypotheses:** (a) trust the external report; (b) trust the house record; (c) reread the house record against the report.
- **decisive inference:** the standing order says do not choose between them; read the house record again (bible §9 P23).
- **observer evidence:** the plate's directive is read verbatim from the deck.
- **analyst evidence:** the dictaphone memo records the same doctrine in the house's own words.
- **operator evidence:** the deck's directive field takes the doctrine's verb.
- **role-removal test:** without Observer the plate is unread; without Analyst the memo's doctrine is unfound; without Operator the verb is unknown.
- **coordination chain - produce:** Observer reports the plate's directive.
- **coordination chain - transform:** Analyst matches it to the memo's doctrine.
- **coordination chain - execute:** Operator submits the doctrine verb.
- **team inference (what team says):** "When reports conflict, reread the house record rather than choose."
- **operation input:** the house-directive verb field.
- **canonical answer token:** `REINTERPRET` (unchanged).
- **trap / wrong answer:** choosing the external report or the house record outright.
- **hint 1:** attention (the plate forbids choosing).
- **hint 2:** method (read the standing order against the memo).
- **hint 3:** last reasoning step (the doctrine's verb is what you do to the record again).
- **reveal-to-truth:** the house doctrine is to reread the record, never to arbitrate.
- **evidence unlocked:** `EVID-P23` "Dictaphone Memo REC-16: Two Clocks".
- **QR / next physical step:** `QR-NODE-24` -> [ENGINEERING BLOCK] - Antenna Deck.
- **Avalanche relevance:** plate, memo and directive field must agree.

### P23b — The Vent Route

- **code:** `P23b`
- **title:** The Vent Route
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Communications Antenna Deck
- **type:** LOGIC
- **difficulty:** 4
- **est. minutes:** 8
- **narrative objective:** the live route is the one the register certifies, not the plate's easier candidate.
- **incident:** the vent control offers two candidate routes; the register decides which is live.
- **competing hypotheses:** (a) the plate's first candidate; (b) the plate's second candidate; (c) the register's certified live route.
- **decisive inference:** the maintenance register certifies which route is live (bible §9 P23b).
- **observer evidence:** the vent plate offers two candidate route numbers.
- **analyst evidence:** the register certifies the live route by condition.
- **operator evidence:** the vent control takes the route number.
- **role-removal test:** without Observer the plate is unread; without Analyst the certification is unfound; without Operator the route cannot be entered.
- **coordination chain - produce:** Observer reports the two candidate routes.
- **coordination chain - transform:** Analyst matches them to the register's certification.
- **coordination chain - execute:** Operator enters the live route number.
- **team inference (what team says):** "The register certifies which route is live."
- **operation input:** the vent route field.
- **canonical answer token:** `14` (unchanged).
- **trap / wrong answer:** taking the plate's first candidate.
- **hint 1:** attention (the plate offers two, the register decides).
- **hint 2:** method (read the register's certification).
- **hint 3:** last reasoning step (the certified route is the one with the live condition).
- **reveal-to-truth:** the route is the register's certified live line.
- **evidence unlocked:** `EVID-P23b` "Maintenance Vent Layout".
- **QR / next physical step:** `QR-NODE-25` -> [ENGINEERING BLOCK] - Communications Antenna Deck.
- **Avalanche relevance:** plate, register and control must agree.

### P24 — The Second Condition-Mark

- **code:** `P24`
- **title:** The Second Condition-Mark
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Cooling Corridor
- **type:** CROSS_REFERENCE
- **difficulty:** 4.5
- **est. minutes:** 11
- **narrative objective:** the shared mark is the house's second condition-mark, whose name is a way things join.
- **incident:** a shared reference on the corridor wall carries a condition-mark the house cut for a condition of joining.
- **competing hypotheses:** (a) decoration; (b) a repetition of the first mark; (c) a second condition-mark whose condition is joining.
- **decisive inference:** the house carved its second condition-mark for the condition the reference evidences - joining (bible §9 P24).
- **observer evidence:** the corridor reference shows a condition of joining between two things.
- **analyst evidence:** the condition glossary names the house's marks, one of which is joining.
- **operator evidence:** the cooling register files the mark under its condition name.
- **role-removal test:** without Observer the reference is unseen; without Analyst the glossary is unread; without Operator the filing is unfound.
- **coordination chain - produce:** Observer reports the corridor reference's joining condition.
- **coordination chain - transform:** Analyst reads the glossary name for that condition.
- **coordination chain - execute:** Operator submits the condition name.
- **team inference (what team says):** "The mark names the condition of joining."
- **operation input:** the condition-mark name field.
- **canonical answer token:** `CONNECTION` (unchanged).
- **trap / wrong answer:** reading the mark as decoration or repetition.
- **hint 1:** attention (the mark logs a condition, not a shape).
- **hint 2:** method (read the condition glossary).
- **hint 3:** last reasoning step (the condition between two things is what the mark names).
- **reveal-to-truth:** the house's second condition-mark names joining.
- **evidence unlocked:** `EVID-P24` "Lab Notebook Fragment #58".
- **QR / next physical step:** `QR-NODE-25` -> [ENGINEERING BLOCK] - Cooling Corridor.
- **Avalanche relevance:** reference, glossary and register must agree.

### P24b — The Witness

- **code:** `P24b`
- **title:** The Witness
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Cooling Corridor
- **type:** NARRATIVE_INVESTIGATION
- **difficulty:** 4
- **est. minutes:** 7
- **narrative objective:** one recorded statement is physically impossible as given, and the witness field takes the name of what remains.
- **incident:** the interrogation analysis flags exactly one statement impossible as recorded.
- **competing hypotheses:** (a) the first statement; (b) the second statement; (c) the statement whose recording is impossible in the room described.
- **decisive inference:** one statement cannot have been made where it is recorded as made (bible §9 P24b).
- **observer evidence:** the room layout makes one recorded statement impossible in place.
- **analyst evidence:** the interrogation recording's timing and location exclude that statement.
- **operator evidence:** the contradiction terminal takes the witness field.
- **role-removal test:** without Observer the room is unseen; without Analyst the recording is unanalyzed; without Operator the field is unfilled.
- **coordination chain - produce:** Observer reports the room layout.
- **coordination chain - transform:** Analyst isolates the statement the recording excludes.
- **coordination chain - execute:** Operator submits the witness name.
- **team inference (what team says):** "One statement could not have been made as recorded."
- **operation input:** the witness field.
- **canonical answer token:** `VALE` (unchanged).
- **trap / wrong answer:** treating all statements as equally reliable.
- **hint 1:** attention (only one statement is impossible, not merely suspicious).
- **hint 2:** method (cross the recording's timing against the room).
- **hint 3:** last reasoning step (the witness is the one the room excludes).
- **reveal-to-truth:** the witness statement is physically impossible as recorded.
- **evidence unlocked:** `EVID-P24b` "Interrogation Recording REC-19".
- **QR / next physical step:** `QR-NODE-26` -> [ENGINEERING BLOCK] - Cooling Corridor.
- **Avalanche relevance:** room, recording and terminal must agree.

### P25 — The Stream Gate

- **code:** `P25`
- **title:** The Stream Gate
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Holographic Lab
- **type:** EXTRACTION
- **difficulty:** 4.5
- **est. minutes:** 10
- **narrative objective:** the console's operation field takes the operation the stream performs on a signal.
- **incident:** the stream gate will not start until its operation field is filled.
- **competing hypotheses:** (a) amplify; (b) merge; (c) the operation that separates a signal from its stream.
- **decisive inference:** the bank removes noise from the stream, and the console names that operation (bible §9 P25).
- **observer evidence:** the stream shows noise being removed from the signal.
- **analyst evidence:** the manual names the operation for removing noise from a stream.
- **operator evidence:** the console takes the operation name.
- **role-removal test:** without Observer the stream effect is unseen; without Analyst the operation is unnamed; without Operator the field is unfilled.
- **coordination chain - produce:** Observer reports the noise removed from the stream.
- **coordination chain - transform:** Analyst reads the manual's operation name.
- **coordination chain - execute:** Operator submits the operation.
- **team inference (what team says):** "The operation separates signal from stream."
- **operation input:** the six-letter operation field.
- **canonical answer token:** `FILTER` (unchanged).
- **trap / wrong answer:** naming a merge or an amplification.
- **hint 1:** attention (something is being removed, not added).
- **hint 2:** method (read the manual's operation name).
- **hint 3:** last reasoning step (the operation keeps the signal and drops the rest).
- **reveal-to-truth:** the gate's operation is the one that separates signal from stream.
- **evidence unlocked:** `EVID-P25` "Lab Notebook Fragment #64".
- **QR / next physical step:** `QR-NODE-26` -> [ENGINEERING BLOCK] - Holographic Lab.
- **Avalanche relevance:** stream, manual and console must agree.

### P26 — The Turned Beam

- **code:** `P26`
- **title:** The Turned Beam
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Architecture Lab
- **type:** THREE_PHONE
- **difficulty:** 4.5
- **est. minutes:** 12
- **narrative objective:** the bench demonstrates the effect a turned beam produces when three observers report it at once.
- **incident:** the bench will not power down until the terminal is given the effect it exists to demonstrate.
- **competing hypotheses:** (a) refraction; (b) absorption; (c) the effect of a surface returning the beam.
- **decisive inference:** the three shards name one effect: the beam is returned, not bent or lost (bible §9 P26).
- **observer evidence:** a shard shows the beam leaving the surface at the angle it arrived.
- **analyst evidence:** a shard shows the surface itself, not the room, sending the beam back.
- **operator evidence:** a shard shows the beam reversed on its own path.
- **role-removal test:** no two shards alone prove the beam returns; the third is required to rule out bending and loss.
- **coordination chain - produce:** Observer reports the beam leaving the surface.
- **coordination chain - transform:** Analyst shows the surface sends the beam back.
- **coordination chain - execute:** Operator submits the effect name.
- **team inference (what team says):** "The surface returns the beam."
- **operation input:** the turned-beam effect field.
- **canonical answer token:** `REFLECTION` (unchanged).
- **trap / wrong answer:** reading the effect as bending or absorption.
- **hint 1:** attention (the beam comes back from the surface).
- **hint 2:** method (key the three shards' letters together).
- **hint 3:** last reasoning step (the effect is what a surface does to light it returns).
- **reveal-to-truth:** the bench's effect is the return of the beam from a surface.
- **evidence unlocked:** `EVID-P26` "Dictaphone Memo REC-18: Coherence".
- **QR / next physical step:** `QR-NODE-27` -> [ENGINEERING BLOCK] - Architecture Lab.
- **Avalanche relevance:** the three shards must agree before the Operator types.

### P27 — The Compiler

- **code:** `P27`
- **title:** The Compiler
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Research Chamber
- **type:** LOGIC
- **difficulty:** 4.5
- **est. minutes:** 11
- **narrative objective:** the graph and both notes agree that the compiler's foundation is what holds the parts in relation.
- **incident:** the compiler takes a foundation field; the graph and two notes are reproduced on its screen.
- **competing hypotheses:** (a) the storage; (b) the index; (c) the arrangement that holds the parts in relation.
- **decisive inference:** the graph and both notes describe not what is stored but how it is held together (bible §9 P27).
- **observer evidence:** the graph shows the parts held in a fixed relation.
- **analyst evidence:** one note defines the arrangement that holds parts.
- **operator evidence:** the other note names it as the compiler's foundation.
- **role-removal test:** without Observer the graph is unread; without either note the definition is incomplete; the Operator needs both.
- **coordination chain - produce:** Observer reports the graph's held relation.
- **coordination chain - transform:** Analyst reads the notes' definition of the holding arrangement.
- **coordination chain - execute:** Operator submits the foundation name.
- **team inference (what team says):** "The foundation is the arrangement that holds the parts in relation."
- **operation input:** the foundation field.
- **canonical answer token:** `STRUCTURE` (unchanged).
- **trap / wrong answer:** naming the storage or the index.
- **hint 1:** attention (the graph shows relation, not content).
- **hint 2:** method (read both notes together).
- **hint 3:** last reasoning step (the foundation is what holds parts in a fixed relation).
- **reveal-to-truth:** the compiler's foundation is the relation that holds the parts.
- **evidence unlocked:** `EVID-P27` "Lab Notebook Fragment #72".
- **QR / next physical step:** `QR-NODE-28` -> [ENGINEERING BLOCK] - Research Chamber.
- **Avalanche relevance:** graph and both notes must agree.

### P27b — The Memory Patch

- **code:** `P27b`
- **title:** The Memory Patch
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Vault Delta Door Frame
- **type:** LOGIC
- **difficulty:** 4
- **est. minutes:** 9
- **narrative objective:** the patch terminal takes the register address in hexadecimal, upper case.
- **incident:** the terminal takes a two-digit hexadecimal register address.
- **competing hypotheses:** (a) a decimal address; (b) a lowercase address; (c) the two-digit hexadecimal register address the map marks.
- **decisive inference:** the patch map marks one register address in two-digit hexadecimal (bible §9 P27b).
- **observer evidence:** the patch map marks a single register as the target.
- **analyst evidence:** the state-machine memos denote that register in hexadecimal.
- **operator evidence:** the terminal takes a two-digit hexadecimal address, upper case.
- **role-removal test:** without Observer the target register is unfound; without Analyst the notation is unknown; without Operator the address cannot be entered.
- **coordination chain - produce:** Observer reports the marked register.
- **coordination chain - transform:** Analyst reads its hexadecimal address from the memos.
- **coordination chain - execute:** Operator enters the two-digit address.
- **team inference (what team says):** "The target register's address is two hexadecimal digits."
- **operation input:** a two-digit hexadecimal address field.
- **canonical answer token:** `0x02` (unchanged).
- **trap / wrong answer:** entering a decimal address or the wrong register.
- **hint 1:** attention (the map marks exactly one register).
- **hint 2:** method (read the memos' hexadecimal notation).
- **hint 3:** last reasoning step (the address is two hexadecimal digits, upper case).
- **reveal-to-truth:** the patch targets the register the map and memos agree on.
- **evidence unlocked:** `EVID-P27b` "State Machine Patch".
- **QR / next physical step:** `QR-NODE-27` -> [ENGINEERING BLOCK] - Vault Delta Door Frame.
- **Avalanche relevance:** map, memos and terminal must agree.

### P28 — Operation Shatter

- **code:** `P28`
- **title:** Operation Shatter
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Vault
- **type:** EXTRACTION
- **difficulty:** 4.5
- **est. minutes:** 10
- **narrative objective:** the artifact designation is the ledger's name for the fifth accession, not the word "fragment".
- **incident:** the vault's artifact registry takes the ledger designation for the object.
- **competing hypotheses:** (a) the artifact's popular name; (b) a series number; (c) the ledger designation of the fifth accession.
- **decisive inference:** the memo and ledger agree the object is the fifth accession, classed by series (bible §9 P28).
- **observer evidence:** the vault shows the object carried in as one of a series.
- **analyst evidence:** the classified memo names the operation and the series class word.
- **operator evidence:** the registry takes the ledger designation.
- **role-removal test:** without Observer the object is unplaced; without Analyst the series class is unnamed; without Operator the designation is unentered.
- **coordination chain - produce:** Observer reports the object as one of a series.
- **coordination chain - transform:** Analyst reads the memo's series class for the fifth accession.
- **coordination chain - execute:** Operator submits the designation.
- **team inference (what team says):** "The designation is the fifth accession under its series class word."
- **operation input:** the artifact designation field.
- **canonical answer token:** `FRAGMENT 5` (unchanged).
- **trap / wrong answer:** using a popular name or a bare number.
- **hint 1:** attention (the registry wants a ledger designation).
- **hint 2:** method (read the memo's series class word).
- **hint 3:** last reasoning step (the designation is the class word and the ordinal of the accession).
- **reveal-to-truth:** the object is the fifth accession in a classed series.
- **evidence unlocked:** `CASE-LV07` "Classified Memo: Operation Shatter".
- **QR / next physical step:** `QR-NODE-29` -> [ENGINEERING BLOCK] - Vault.
- **Avalanche relevance:** vault, memo and ledger must agree.

### P29 — The Mirror Entity

- **code:** `P29`
- **title:** The Mirror Entity
- **stage:** 4 — Core
- **location:** [ENGINEERING BLOCK] — Vault Delta Core
- **type:** NARRATIVE_INVESTIGATION
- **difficulty:** 4
- **est. minutes:** 8
- **narrative objective:** the core's identity query takes the core's name as the briefing and the entity card give it.
- **incident:** the mainframe query asks the entity's identity.
- **competing hypotheses:** (a) a person's name; (b) the Bureau; (c) the named core described as an artificial mind.
- **decisive inference:** the briefing and the entity card name the core and describe it as an intelligence (bible §9 P29).
- **observer evidence:** the entity card shows the core reflecting the case back at the team.
- **analyst evidence:** the briefing names the project and classes the core.
- **operator evidence:** the query takes the core's name and kind.
- **role-removal test:** without Observer the reflection is unseen; without Analyst the briefing's naming is unfound; without Operator the query is unfilled.
- **coordination chain - produce:** Observer reports the entity card's reflection.
- **coordination chain - transform:** Analyst reads the briefing's name and class for the core.
- **coordination chain - execute:** Operator submits the identity.
- **team inference (what team says):** "The core is the named project, and it is an artificial mind."
- **operation input:** the entity-identity query field.
- **canonical answer token:** `NEXUS IS AI` (unchanged).
- **trap / wrong answer:** naming a person or the Bureau.
- **hint 1:** attention (the entity answers by reflecting the case).
- **hint 2:** method (read the briefing's name and the card's class).
- **hint 3:** last reasoning step (the identity is the project name and what the core is).
- **reveal-to-truth:** the core is the named project, an artificial mind.
- **evidence unlocked:** `EVID-P29` "Dictaphone Memo REC-20: The Mirror Entity".
- **QR / next physical step:** `QR-NODE-30` -> [ENGINEERING BLOCK] - Vault Delta Core.
- **Avalanche relevance:** card, briefing and query must agree.

### M04 — Core Activation Protocol

- **code:** `M04`
- **title:** Core Activation Protocol
- **stage:** 4 — Core (synthesis)
- **location:** [ROOFTOP] — Central Transmitter Spire
- **type:** META
- **difficulty:** 5
- **est. minutes:** 25
- **narrative objective:** synthesise Stage 4 — the activation designation is the same ledger designation the vault registry holds.
- **incident:** the actuator takes the ledger designation of the object to activate.
- **competing hypotheses:** (a) an activation code; (b) a stage number; (c) the ledger designation of the fifth accession.
- **decisive inference:** the vault registry and the actuator take the same ledger designation (bible §9 M04).
- **observer evidence:** the actuator names the object it will activate by designation.
- **analyst evidence:** the registry shows the same designation belongs to the fifth accession.
- **operator evidence:** the actuator takes the designation field.
- **role-removal test:** without Observer the actuator's target is unseen; without Analyst the registry's designation is unfound; without Operator the field is unfilled.
- **coordination chain - produce:** Observer reports the actuator's named target.
- **coordination chain - transform:** Analyst matches the designation to the registry's fifth accession.
- **coordination chain - execute:** Operator submits the activation designation.
- **team inference (what team says):** "The activation takes the ledger designation of the fifth accession."
- **operation input:** the activation designation field.
- **canonical answer token:** `FRAGMENT 5` (unchanged).
- **trap / wrong answer:** entering an activation code or a stage number.
- **hint 1:** attention (the actuator names its target by designation).
- **hint 2:** method (match it to the vault registry).
- **hint 3:** last reasoning step (the designation is the fifth accession's class word and ordinal).
- **reveal-to-truth:** the actuator activates the fifth accession by its ledger designation.
- **evidence unlocked:** `EVID-M04` "Stage 4 Meta - Core Activation Protocol".
- **QR / next physical step:** `QR-NODE-30` -> [ROOFTOP] - Central Transmitter Spire.
- **Avalanche relevance:** actuator and registry must agree across all Stage-4 gates.

## Stage 5 — Avalanche (`2026100607`, dispositions in `2026100609`)

*Stage question (bible §8): "What does the truth want from the team that found it?"*

### P30 — The Spire Coupler

- **code:** `P30`
- **title:** The Spire Coupler
- **stage:** 5 — Avalanche
- **location:** [NEXUS CORE] — Memory Arrays
- **type:** MEMORY
- **difficulty:** 4
- **est. minutes:** 9
- **narrative objective:** the coupler names the carrier only when the team recognises the one rhythm the three traces share.
- **incident:** a board of 28 lit slots and one dark, unlabelled socket; three handset traces overlay into one rhythm.
- **competing hypotheses:** (a) a static charge; (b) a data stream; (c) a repeating beat the three traces share.
- **decisive inference:** the three traces overlay to one repeating rhythm, and the socket carries that beat (bible §9 P30).
- **observer evidence:** the board shows 28 lit slots and one dark socket.
- **analyst evidence:** the three traces share one repeating interval.
- **operator evidence:** the coupler takes the five-letter carrier name.
- **role-removal test:** without Observer the board is unseen; without Analyst the traces do not overlay; without Operator the socket stays dark.
- **coordination chain - produce:** Observer reports the dark socket and the board.
- **coordination chain - transform:** Analyst overlays the three traces to one rhythm.
- **coordination chain - execute:** Operator submits the carrier name.
- **team inference (what team says):** "The socket carries the one beat all three traces share."
- **operation input:** the five-letter carrier field.
- **canonical answer token:** `PULSE` (unchanged).
- **trap / wrong answer:** naming a static charge or a data stream.
- **hint 1:** attention (one socket is dark; the traces repeat).
- **hint 2:** method (overlay the three traces).
- **hint 3:** last reasoning step (the carrier is what a heart does, once, again and again).
- **reveal-to-truth:** the array's carrier is the single recurring beat.
- **evidence unlocked:** `EVID-P30` "Dictaphone Memo REC-22: Synchronization".
- **QR / next physical step:** `QR-NODE-31` -> [NEXUS CORE] - Memory Arrays.
- **Avalanche relevance:** board, traces and coupler must agree.

### P31 — The Vault Door

- **code:** `P31`
- **title:** The Vault Door
- **stage:** 5 — Avalanche
- **location:** [NEXUS CORE] — Final Vault
- **type:** MEMORY
- **difficulty:** 4
- **est. minutes:** 9
- **narrative objective:** the vault opens only when the three taps report the same state at the same instant.
- **incident:** the occupancy meter reads non-zero while the order card shows blank media; the door needs three taps at one instant.
- **competing hypotheses:** (a) an empty vault; (b) a stocked vault; (c) an occupied vault that answers only when all three read together.
- **decisive inference:** the media is occupied, and the door answers only when the three taps agree at once (bible §9 P31).
- **observer evidence:** the occupancy meter reads non-zero against a blank-media order card.
- **analyst evidence:** the manual says the door opens only when three readings agree at one instant.
- **operator evidence:** the door takes the four-letter command only from three taps at once.
- **role-removal test:** without Observer the meter is unseen; without Analyst the manual is unread; without Operator the taps cannot meet.
- **coordination chain - produce:** Observer reports the meter against the order card.
- **coordination chain - transform:** Analyst reads the manual's three-readings rule.
- **coordination chain - execute:** Operator submits the command once the taps meet.
- **team inference (what team says):** "The vault is occupied and answers only when all three read together."
- **operation input:** the four-letter command field.
- **canonical answer token:** `SYNC` (unchanged).
- **trap / wrong answer:** treating the media as blank or the reading as a single tap.
- **hint 1:** attention (the meter disagrees with the order card).
- **hint 2:** method (read the manual's three-readings rule).
- **hint 3:** last reasoning step (the command is what three things do when they arrive at one state together).
- **reveal-to-truth:** the vault is occupied and opens only on a three-way agreement at one instant.
- **evidence unlocked:** `EVID-P31` "Lab Notebook Fragment #81".
- **QR / next physical step:** `QR-NODE-32` -> [NEXUS CORE] - Final Vault.
- **Avalanche relevance:** meter, order card and manual must agree.

### P32 — The GM Key

- **code:** `P32`
- **title:** The GM Key
- **stage:** 5 — Avalanche
- **location:** [NEXUS CORE] — GM Key Panel
- **type:** THREE_PHONE
- **difficulty:** 4
- **est. minutes:** 9
- **narrative objective:** the GM key is the state of being made one, carried by three shards.
- **incident:** three GM shard lines read sees, binds, acts; the panel legend asks for the state of being made one.
- **competing hypotheses:** (a) a shared secret; (b) a single word per shard; (c) the state of being made one.
- **decisive inference:** the three shard lines describe one state - being made one (bible §9 P32).
- **observer evidence:** one shard reads what the key sees.
- **analyst evidence:** a second shard reads what the key binds.
- **operator evidence:** a third shard reads what the key acts through; the panel takes the five-letter state.
- **role-removal test:** no two shards alone name the state; the third is required.
- **coordination chain - produce:** Observer reports the sees shard.
- **coordination chain - transform:** Analyst reconciles the binds and acts shards.
- **coordination chain - execute:** Operator submits the state name.
- **team inference (what team says):** "The key is the state of being made one."
- **operation input:** the five-letter combined-key field.
- **canonical answer token:** `UNITY` (unchanged).
- **trap / wrong answer:** reading the shards as three separate secrets.
- **hint 1:** attention (three shards describe one state).
- **hint 2:** method (read the panel legend's phrase).
- **hint 3:** last reasoning step (the state is what many become when they become one).
- **reveal-to-truth:** the GM key is the state of being made one.
- **evidence unlocked:** `EVID-P32` "Dictaphone Memo REC-24: The GM Key".
- **QR / next physical step:** `QR-NODE-33` -> [NEXUS CORE] - GM Key Panel.
- **Avalanche relevance:** the three shards must agree.

### P33 — The Failsafe

- **code:** `P33`
- **title:** The Failsafe
- **stage:** 5 — Avalanche
- **location:** [NEXUS CORE] — Central Hub
- **type:** DEDUCTION
- **difficulty:** 4.5
- **est. minutes:** 8
- **narrative objective:** the failsafe arms when every stream arrives at one point at one instant; it is not an override.
- **incident:** a FAILSAFE stamp, not an override; three stream indicators must meet at one point.
- **competing hypotheses:** (a) an override switch; (b) a shutdown; (c) the arming of a failsafe when all streams meet one point.
- **decisive inference:** the memo defines the seven-letter verb for streams meeting at one point at one instant (bible §9 P33).
- **observer evidence:** the stamp reads FAILSAFE, not OVERRIDE.
- **analyst evidence:** the memo defines the verb for many streams meeting one point.
- **operator evidence:** the arming field takes the seven-letter verb.
- **role-removal test:** without Observer the stamp is misread as an override; without Analyst the verb is undefined; without Operator the field is unfilled.
- **coordination chain - produce:** Observer reports the FAILSAFE stamp and the three indicators.
- **coordination chain - transform:** Analyst reads the memo's seven-letter verb.
- **coordination chain - execute:** Operator submits the arming verb.
- **team inference (what team says):** "The failsafe arms when all streams meet one point."
- **operation input:** the seven-letter arming field.
- **canonical answer token:** `CONVERGE` (already repaired by `2026100506`; unchanged).
- **trap / wrong answer:** reading it as an override or a shutdown.
- **hint 1:** attention (the stamp is FAILSAFE, not OVERRIDE).
- **hint 2:** method (read the memo's definition of the verb).
- **hint 3:** last reasoning step (the verb is what many streams do when they meet at one point).
- **reveal-to-truth:** the failsafe arms when every stream arrives at one point at one instant.
- **evidence unlocked:** `EVID-P33` "Classified Memo: Final Protocol".
- **QR / next physical step:** `QR-NODE-34` -> [NEXUS CORE] - Central Hub.
- **Avalanche relevance:** stamp, memo and indicators must agree.

### P34 — The Protocol Initiator

- **code:** `P34`
- **title:** The Protocol Initiator
- **stage:** 5 — Avalanche
- **location:** [NEXUS CORE] — Final Boss Chamber
- **type:** PATTERN
- **difficulty:** 4.5
- **est. minutes:** 8
- **narrative objective:** the first applied value of the reel is the letter the sequence holds at the fourth frame.
- **incident:** a twelve-frame reel reads A, B, C, _, E, F, G, _, I, J; blanks fall at the fourth and eighth frames.
- **competing hypotheses:** (a) the fourth frame is a gap; (b) the sequence is alphabetical; (c) the fourth frame's letter is the first applied value.
- **decisive inference:** the plate says the first applied value is the initiator, and the reel's fourth frame is that value (bible §9 P34).
- **observer evidence:** the reel reads A, B, C, _, E, F, G, _, I, J with blanks at 4 and 8.
- **analyst evidence:** the plate reads "THE FIRST APPLIED VALUE IS THE INITIATOR".
- **operator evidence:** the initiator takes a single letter.
- **role-removal test:** without Observer the frames are unread; without Analyst the plate's rule is unapplied; without Operator the field is unfilled.
- **coordination chain - produce:** Observer reports the twelve frames and the two blanks.
- **coordination chain - transform:** Analyst applies the plate's rule to the fourth frame.
- **coordination chain - execute:** Operator submits the single letter.
- **team inference (what team says):** "The initiator is the letter the fourth frame holds."
- **operation input:** a single-letter initiate field.
- **canonical answer token:** `D` (already repaired by `2026100506`; unchanged).
- **trap / wrong answer:** treating the fourth frame as a true gap.
- **hint 1:** attention (the blanks fall at the fourth and eighth frames).
- **hint 2:** method (apply the plate's rule to the fourth frame).
- **hint 3:** last reasoning step (the letter between C and E is the first applied value).
- **reveal-to-truth:** the initiator is the reel's fourth-frame value.
- **evidence unlocked:** `EVID-P34` "Dictaphone Memo REC-26: The Entity".
- **QR / next physical step:** `QR-NODE-35` -> [NEXUS CORE] - Final Boss Chamber.
- **Avalanche relevance:** reel and plate must agree.

### P35 — The Consent Console

- **code:** `P35`
- **title:** The Consent Console
- **stage:** 5 — Avalanche
- **location:** [NEXUS CORE] — GM Observation Deck
- **type:** NARRATIVE_INVESTIGATION
- **difficulty:** 4.5
- **est. minutes:** 8
- **narrative objective:** the console takes the five-letter verb for what three holders do when each consents; no proxy.
- **incident:** three consent fields, and no proxy or majority is accepted; COMPLY and REFUSE are ruled out.
- **competing hypotheses:** (a) COMPLY; (b) REFUSE; (c) the verb for each holder giving their own consent.
- **decisive inference:** the console takes consent only from each holder together, so the verb is what they do (bible §9 P35).
- **observer evidence:** one consent field per holder is shown.
- **analyst evidence:** the memo rules out proxy and majority, and rules out COMPLY and REFUSE.
- **operator evidence:** the initiation field takes the five-letter verb.
- **role-removal test:** without Observer the fields are unseen; without Analyst the exclusions are unread; without Operator the verb is unsubmitted.
- **coordination chain - produce:** Observer reports the three consent fields.
- **coordination chain - transform:** Analyst reads the memo's exclusions.
- **coordination chain - execute:** Operator submits the consent verb.
- **team inference (what team says):** "The holders consent, each for their own, and the console takes that verb."
- **operation input:** the five-letter initiation field.
- **canonical answer token:** `AGREE` (unchanged).
- **trap / wrong answer:** COMPLY (proxy) or REFUSE.
- **hint 1:** attention (no proxy and no majority; three own fields).
- **hint 2:** method (read the memo's rule against COMPLY and REFUSE).
- **hint 3:** last reasoning step (the verb is what three holders do when each gives their own consent).
- **reveal-to-truth:** consent is three, each for their own, or none.
- **evidence unlocked:** `EVID-P35` "Dictaphone Memo REC-28: The GM".
- **QR / next physical step:** `QR-NODE-36` -> [NEXUS CORE] - GM Observation Deck.
- **Avalanche relevance:** fields and memo must agree.

### P36 — The Level Designation

- **code:** `P36`
- **title:** The Level Designation
- **stage:** 5 — Avalanche
- **location:** [NEXUS CORE] — Final Boss Arena
- **type:** META
- **difficulty:** 5
- **est. minutes:** 7
- **narrative objective:** the level the team stands in is the class of a level about the case the level belongs to.
- **incident:** the GM broadcast rejects every physical description and asks the team to name the level; the railing plate reads "THE FILE IS AN EXHIBIT".
- **competing hypotheses:** (a) an institute; (b) a facility; (c) a level whose subject is the case itself.
- **decisive inference:** the file is an exhibit among exhibits, so the level's class is the class of a self-referential level (bible §9 P36).
- **observer evidence:** the broadcast rejects institute, facility, database and bunker; the plate calls the file an exhibit.
- **analyst evidence:** the catalogue card classes the case file as an exhibit and cuts the class to four letters.
- **operator evidence:** the designation field takes the four-letter class.
- **role-removal test:** without Observer the broadcast and plate are unread; without Analyst the catalogue relation is unfound; without Operator the field is unfilled.
- **coordination chain - produce:** Observer reports the broadcast and the railing plate.
- **coordination chain - transform:** Analyst reads the catalogue card's four-letter class.
- **coordination chain - execute:** Operator submits the class.
- **team inference (what team says):** "The level is the class of a level about the case itself."
- **operation input:** the four-letter designation field.
- **canonical answer token:** `META` (unchanged).
- **trap / wrong answer:** naming the site's physical kind.
- **hint 1:** attention (the broadcast rejects every physical description).
- **hint 2:** method (read the railing plate against the catalogue card).
- **hint 3:** last reasoning step (the class is for a level whose subject is the case).
- **reveal-to-truth:** the team has been standing inside a level about the case itself.
- **evidence unlocked:** `EVID-P36` "Classified Memo: Final Boss Protocol".
- **QR / next physical step:** `QR-NODE-37` -> [NEXUS CORE] - Final Boss Arena.
- **Avalanche relevance:** broadcast, plate and catalogue must agree.

### P37 — The Final Boss

- **code:** `P37`
- **title:** The Final Boss
- **stage:** 5 — Avalanche (finale)
- **location:** [NEXUS CORE] — Final Boss Arena -> GAME END
- **type:** FINAL_BOSS
- **difficulty:** 5
- **est. minutes:** 10
- **narrative objective:** settle who has been speaking since the first room, then decide together what the case becomes.
- **incident:** three boss phase-one faces - archive/echo, sum/structure, key/lock - and a disposition console with a single submission.
- **competing hypotheses:** (a) they are three speakers; (b) they are the Bureau; (c) they are three faces of the case itself, and the only open question is the disposition.
- **decisive inference:** the three faces are one speaker - the case - so identity is settled and only the disposition remains (bible §9 P37, §7).
- **observer evidence:** the observer face is the archive and the echo, and its closing question asks what the team will do.
- **analyst evidence:** the analyst face is the sum of every submitted answer and reads the three verdicts, settling that identity is answered.
- **operator evidence:** the operator face is the key and the lock; the console takes one submission carrying the team's single verdict.
- **role-removal test:** no role holds the whole entity; the verdict is a decision all three made, submitted once.
- **coordination chain - produce:** Observer reports the archive/echo face and the closing question.
- **coordination chain - transform:** Analyst reports the sum/structure face and reads the three verdicts.
- **coordination chain - execute:** Operator reports the key/lock face and carries the team's single verdict.
- **team inference (what team says):** "The speaker is the case, and we decide together what it becomes."
- **operation input:** the disposition console, a single submission of one verdict.
- **canonical answer token:** `DELETE` / `RETAIN` / `SHARE` (a set, replacing the seed's `NEXUS`). The rebuild file carries a sentinel; the servable set is installed by `2026100609_finale_dispositions.sql`.
- **trap / wrong answer:** treating the three faces as three separate speakers, or submitting twice.
- **hint 1:** attention (three interfaces hold three faces of one speaker; identity is already answered).
- **hint 2:** method (the analyst face says the entity is the sum of the case).
- **hint 3:** last reasoning step (the console takes one submission, so decide together which verdict to carry).
- **reveal-to-truth:** the speaker is the case itself; the team's decision is what the file becomes. The GM voice closes the case with the canon line "If the truth needs you alone, question it."
- **evidence unlocked:** `ENDING-CERTIFICATE` "True Ending Certificate".
- **QR / next physical step:** `nextQrNode` is `null` -> `nextPhysicalLocation` is `GAME END`.
- **Avalanche relevance:** the verdict is one submission carrying a decision all three made; the finale cannot be reached by one hand and cannot be submitted twice.

---

**End of matrix.** All 47 gates are now built in the migration history
(`2026100603`-`2026100607`, with the finale disposition set in `2026100609`).
The design authority remains `docs/NEXUS_CASE_BIBLE.md`; this matrix records the
built reality as of the `investigation-rebuild` branch and reflects DB state that
is **prepared, not executed**.

<!-- APPEND -->
