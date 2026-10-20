# NEXUS — CURRENT CASE INVENTORY (Checkpoint A)

**Purpose.** A definitive, evidence-backed inventory of the *current* progression
gates and narrative canon of the NEXUS game, produced as Checkpoint A of a
redesign. Every factual claim below is tagged **VERIFIED** (read from the code /
SQL in this repository) or **INFERRED** (derived, but not directly stated).
Where something could not be found, the text says **NOT FOUND** rather than
guessing.

**Branch / revision.** `investigation-rebuild`. All 59 files in
`supabase/migrations/` were enumerated; every statement that inserts or updates
`puzzle_nodes` was read.

**Method.**
- The database migration history is treated as the canonical *runtime* source of
  progression content (the running app reads puzzle content only through edge
  functions → Postgres RPCs; see Phase 4).
- Field-by-field "last writer" was determined by ordering the migrations that
  touch `puzzle_nodes` and reading the final `ON CONFLICT … DO UPDATE` / `UPDATE`
  for each field.
- Text search used PowerShell `Select-String` across `*.md`, `*.ts`, `*.tsx`,
  `*.sql`, `*.json`, `*.mjs`. No secrets, tokens, keys, or `.env` values were
  read or printed; no such values were encountered in scope.

**Hard rules observed.** No existing source, migration, or data was modified.
This file is the only artifact written.

---

## 0. HEADLINE COUNTS

| Metric | Value | Evidence |
|---|---|---|
| Puzzle nodes in the DB (final state) | **47** | 43 rows in `supabase/migrations/2026092903_seed_puzzle_nodes.sql` + 4 rows in `supabase/migrations/2026093035_audio_evidence_integration.sql` |
| Node rows in the client skeleton (`src/content/puzzles/index.ts`) | **47** | `code:` count = 47; codes match the DB set exactly |
| Playable **gate** nodes | **43** | `P01`–`P37` (35 base codes) + `P06b`, `P07b` (2 alt/branch gates) + `P17b`, `P23b`, `P24b`, `P27b` (4 audio-branch gates) — see note below |
| **Meta / supplementary** nodes | **4** | `M01`–`M04` (type `META`) |
| QR-mapped nodes | **47** | `supabase/migrations/2026093015_seed_physical_tables.sql` (`qr_nodes`), `2026100208_add_missing_qr_nodes.sql` |
| Evidence rows in DB | 47 | `2026093015_seed_physical_tables.sql:143-...` (`EVID-M01…M04`, `EVID-P01…P37`, `FRAG-01…04`, `CASE-LV07`, `ENDING-CERTIFICATE`) |
| Fragments (DB) | 4 | `2026093015_seed_physical_tables.sql:200` (`FRAG-01…04`) |
| Canonical glyphs | 7 | `2026093015` `EVID-P06b`/`EVID-P13` (Origin, Connection, Structure, Memory, Choice, Truth, Finality) |

**Gate vs supplementary caveat.** `P06b` and `P07b` are *additional* Stage-2
gates, not replacements: they sit on the main chain (`P13 → P06b → P07b → M02`).
`P17b`, `P23b`, `P24b`, `P27b` are inserted *into* existing chains in
`2026093035` (`P17 → P17b → P18`; `P23 → P23b → P24`; `P24 → P24b → P25`;
`P27 → P27b → P28`). So the main playable path is longer than the 37 base
"P" numbers. If "gate" is defined as *a node the operator must submit an answer
for to advance the chain*, the count is **43**; if "gate" means *the numbered
P01–P37 spine*, it is **37** plus 6 branch gates. Both figures are reported
rather than collapsed.

---

## PHASE 1 — PUZZLE / GATE INVENTORY

### 1.1 Field ownership — which migration LAST sets each field

| Field | First set | Last writer (final runtime value) |
|---|---|---|
| `code`, `title`, `type`, `difficulty`, `stage`, `location`, `position`, `prerequisites`, `branches`, `content`, `rewards`, `answer_metadata`, `metadata` (P01–P21, M01–M04, P22–P37, P06b, P07b) | `2026092903_seed_puzzle_nodes.sql:11-57` | Row-by-row: `2026100507_puzzle_content_balancing.sql` (`content`/`answer_metadata` for P07, P09, P15, P18, P22) and `2026100506_repair_p33_p34_answer_keys.sql` (`answer_metadata` for P33, P34). |
| `estimated_minutes` | `2026092902_game_engine.sql` (column) + `2026092903` seed | unchanged after seed |
| `failurePropagation`, `branchConditions` (inside `content`) | backfilled | `2026093010_server_authoritative_puzzles.sql` (see §1.4) |
| `hints[0..2]` (trim to 3) | `2026092903` | `2026093010` (P17, P20 trimmed) + `2026100507` (P15, P18, P22) |
| `P17b`, `P23b`, `P24b`, `P27b` rows | — | `2026093035_audio_evidence_integration.sql:18,51,84,117` |
| `branches.unlocks` / `prerequisites` rewiring around the new gates | — | `2026093035:181-191` |
| Evidence type `DOCUMENT → AUDIO` (7 dictaphone memos: P23, P26, P29, P30, P32, P34, P35) | `2026093015` | `2026093035:198` |
| Authoritative answer validation + normalization + points decay | — | `2026100601_operator_only_conclusions.sql` (see §1.5) |
| Role-isolated player payload + answer redaction | — | `2026100602_role_isolated_player_payload.sql` (see §1.5) |

### 1.2 Master node table (final answers)

Answers shown are the **final** runtime values. `validation` = `answer_metadata.validationMethod`.

| code | title | type | diff | min | stage | location | prereq(s) | unlocks | pts | accepted answer | validation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P01 | The Facade | OBSERVATION | 2 | 6 | 1 | [ADMIN BUILDING] Main Entrance Facade | — | P02 | 50 | `CDFDEFF` | exact |
| P02 | The Clock | SPATIAL | 2 | 5 | 1 | [ADMIN BUILDING] Lobby Clock Tower | P01 | P03 | 40 | `21:47` | exact |
| P03 | The Facade Pin | CIPHER | 2 | 4 | 1 | [ADMIN BUILDING] Facade Base Terminal | P02 | P04 | 35 | `3425` | exact |
| P04 | The Poster Dates | PATTERN | 3 | 7 | 1 | [ADMIN BUILDING] Archive Poster Wall | P03 | P05 | 30 | `F` | exact |
| P05 | The Third Figure | DEDUCTION | 3 | 6 | 1 | [ADMIN BUILDING] Archive Figure Display | P04 | M01 | 45 | `VEY` | case_insensitive |
| P06 | The Pivot | MEMORY | 2 | 5 | 2 | [LIBRARY] Stack Reference Desk | M01 | P07 | 40 | `17` | exact |
| P07 | The Binary | BINARY | 3 | 8 | 2 | [LIBRARY] Basement Server Rack | P06 | P08 | 50 | `17:47` | exact |
| P08 | The Vector | PATTERN | 3 | 7 | 2 | [ADMIN BUILDING] Archive Cabinet 3 | P07 | P09 | 45 | `DELTA` | case_insensitive |
| P09 | The Chronology | LOGIC | 3 | 8 | 2 | [ADMIN BUILDING] Clock Room | P08 | P10 | 50 | `17` | exact |
| P10 | The Blue Door | EXTRACTION | 3 | 6 | 2 | [ADMIN BUILDING] Blue-Marked Door | P09 | P11 | 35 | `LIGHT` | case_insensitive |
| P11 | The Symbol | VISUAL | 3 | 7 | 2 | [ADMIN BUILDING] Wall/Glowing Blue Symbol | P10 | P12 | 40 | `ARCHWAY` | case_insensitive |
| P12 | The Armrest | DEDUCTION | 3 | 6 | 2 | [ADMIN BUILDING] Lecture Hall Room 214 | P11 | P13 | 35 | `B7` | exact |
| P13 | The Laboratory | OBSERVATION | 4 | 10 | 2 | [SCIENCE BUILDING] Research Lab | P12 | M02 | 60 | `3425` | exact |
| P06b | Time Remaining | MEMORY | 1 | 3 | 2 | [SCIENCE BUILDING] Lab Wall Clock | P13 | P07b | 30 | `17` | exact |
| P07b | The Network | GRAPH | 4 | 9 | 2 | [SCIENCE BUILDING] Lab Network Diagram | P06b | M02 | 55 | `CONNECTION` | case_insensitive |
| P14 | The Memory Bank | MEMORY | 3 | 6 | 3 | [SCIENCE BUILDING] Memory Lab | M02 | P15 | 45 | `VECTOR` | case_insensitive |
| P15 | The Cipher Wheel | CIPHER | 3 | 7 | 3 | [LIBRARY] Entrance Symbol Wall | P14 | P16 | 40 | `3425` | exact |
| P16 | The Auditorium | OBSERVATION | 3 | 6 | 3 | [SCIENCE BUILDING] Main Auditorium | P15 | P17 | 35 | `15` | exact |
| P17 | The Audio Log | AUDIO | 4 | 8 | 3 | [SCIENCE BUILDING] Auditorium Stage | P16 | P17b | 50 | `ECHO` | case_insensitive |
| P17b | The Echo Fold | CIPHER | 4 | 8 | 3 | (audio branch; see §1.3) | P17 | P18 | 55 | `COUNT THE DOORS NOT THE CLOCKS` | case_insensitive |
| P18 | The Pattern Lock | PATTERN | 3 | 6 | 3 | [LIBRARY] Reading Room Fifth Symbol | P17b | P19 | 40 | `3425` | exact |
| P19 | The Archive | DEDUCTION | 4 | 7 | 3 | [CAMPUS] Sculpture Garden | P18 | P20 | 50 | `SUBMERGE` | case_insensitive |
| P20 | The Symbol Sequence | PATTERN | 5 | 10 | 3 | [ADMIN BUILDING] Building Dome | P19 | P21 | 70 | `2147` | exact |
| P21 | The Final Clue | NARRATIVE_INVESTIGATION | 5 | 8 | 3 | [ADMIN BUILDING] Fourth Floor Window | P20 | M03 | 65 | `ARCHIVE` | case_insensitive |
| M01 | The First Lock | META | 4 | 12 | 1 | [ADMIN BUILDING] Central Archive | P05 | P06 | 80 | `LIGHT` | case_insensitive |
| M02 | The Network Meta | META | 4 | 15 | 2 | [SCIENCE BUILDING] Memory Lab | P07b | P14 | 100 | `CONNECTION` | case_insensitive |
| M03 | The Symbol Meta | META | 5 | 18 | 3 | [ADMIN BUILDING] Central Archive | P21 | P22 | 120 | `SYMBOL` | case_insensitive |
| M04 | The Hidden Layer | META | 5 | 25 | 4 | [ENGINEERING BLOCK] Vault Delta Core | P29 | P30 | 150 | `FRAGMENT 5` | case_insensitive |
| P22 | The Hidden Layer | LOGIC | 4.5 | 12 | 4 | [SCIENCE BUILDING] Research Lab | M03 | P23 | 60 | `X` | exact |
| P23 | The Reinterpretation | DEDUCTION | 4.5 | 12 | 4 | [ENGINEERING BLOCK] Robotics Bay 1 | P22 | P23b | 60 | `REINTERPRET` | exact |
| P23b | The Path Lock | LOGIC | 4 | 8 | 4 | [ENGINEERING BLOCK] (audio branch) | P23 | P24 | 65 | `14` | exact |
| P24 | The Cross-Reference | CROSS_REFERENCE | 4.5 | 11 | 4 | [ENGINEERING BLOCK] Communications Array | P23b | P24b | 60 | `CONNECTION` | case_insensitive |
| P24b | The Audio Contradiction | NARRATIVE_INVESTIGATION | 4 | 7 | 4 | [ENGINEERING BLOCK] Antenna Deck Interrogation Room | P24 | P25 | 65 | `VALE` | case_insensitive |
| P25 | The Overload | EXTRACTION | 4.5 | 10 | 4 | [ENGINEERING BLOCK] Server Room Cooling Corridor | P24b | P26 | 70 | `FILTER` | case_insensitive |
| P26 | The Mirror II | THREE_PHONE | 4.5 | 12 | 4 | [ENGINEERING BLOCK] Holographic Projector | P25 | P27 | 70 | `REFLECTION` | case_insensitive |
| P27 | The Dependency | LOGIC | 4.5 | 11 | 4 | [ENGINEERING BLOCK] Computer Systems Archive | P26 | P27b | 70 | `STRUCTURE` | case_insensitive |
| P27b | The Code That Lies | LOGIC | 4 | 9 | 4 | [ENGINEERING BLOCK] Architecture Lab / Debug Console | P27 | P28 | 70 | `0x02` | exact |
| P28 | The Fragment | EXTRACTION | 4.5 | 10 | 4 | [ENGINEERING BLOCK] Cyber-Physical Research | P27b | P29 | 65 | `FRAGMENT 5` | case_insensitive |
| P29 | The Revelation | NARRATIVE_INVESTIGATION | 4 | 8 | 4 | [ENGINEERING BLOCK] Core | P28 | M04 | 60 | `NEXUS IS AI` | case_insensitive |
| P30 | The Transmitter Spire | MEMORY | 4 | 9 | 5 | [NEXUS CORE] Transmitter Spire | M04 | P31 | 65 | `PULSE` | case_insensitive |
| P31 | The Memory Array | MEMORY | 4 | 9 | 5 | [NEXUS CORE] Memory Arrays | P30 | P32 | 65 | `SYNC` | exact |
| P32 | The Three Phones II | THREE_PHONE | 4 | 9 | 5 | [NEXUS CORE] Final Vault | P31 | P33 | 65 | `UNITY` | case_insensitive |
| P33 | The GM Key Protocol | DEDUCTION | 4.5 | 8 | 5 | [NEXUS CORE] GM Key Panel | P32 | P34 | 70 | `CONVERGE` *(seed said `CONVERGENCE`)* | case_insensitive |
| P34 | The Final Sequence | PATTERN | 4.5 | 8 | 5 | [NEXUS CORE] Central Hub | P33 | P35 | 70 | `D` *(seed said `C`)* | exact |
| P35 | The Final Choice | NARRATIVE_INVESTIGATION | 4.5 | 8 | 5 | [NEXUS CORE] Final Boss Chamber | P34 | P36 | 75 | `AGREE` | case_insensitive |
| P36 | The GM Intervention | META | 5 | 7 | 5 | [NEXUS CORE] GM Observation Deck | P35 | P37 | 80 | `META` | exact |
| P37 | The Final Boss | FINAL_BOSS | 5 | 10 | 5 | [NEXUS CORE] Final Boss Arena | P36 | — (nextNodes = null) | 200 | `NEXUS` | case_insensitive |

**VERIFIED.** Base values: `2026092903_seed_puzzle_nodes.sql:15-57`. P33/P34
final answers: `2026100506_repair_p33_p34_answer_keys.sql:5-19`. The four audio
branch nodes: `2026093035_audio_evidence_integration.sql:18-144`. Chain rewires:
`2026093035:181-191`. `P37.branches.nextNodes = null`:
`2026093010_server_authoritative_puzzles.sql`.

### 1.3 Per-node narrative / role content (summarised)

Each node's `content` JSONB holds three role blocks (`observer`, `analyst`,
`operator`) plus `operatorInvestigation`, `coordinationChain`, `hints`, and
`narrativeObjective`. The narrative *arc* runs: read the physical world
(Observer) → transform it (Analyst) → submit the conclusion (Operator). Only the
Operator may submit (see §1.5). The following is a 1–2 line narrative summary per
node and the field that carries it (`content.observer.dataPayload` /
`content.*.storyReveal` / `metadata.storyReveal` / `metadata.locationClue.clueText`).

- **P01 The Facade** — stone glyph grid at the building entrance; decode a 7-glyph
  substitution to `CDFDEFF`. `content.observer.dataPayload`.
- **P02 The Clock** — read 9:47 from the east, add 12h → `21:47`; the game's central
  time motif begins. `content.observer.dataPayload`.
- **P03 The Facade Pin** — brass plates 3-4-2-5 ordered by P01 glyph positions →
  `3425`; this code recurs in P13/P15/P18. `content.observer.dataPayload`.
- **P04 The Poster Dates** — four 2021 dates hide the note "the key to the future is
  the 6th letter" → `F`. `content.observer.dataPayload`.
- **P05 The Third Figure** — empty third photo frame etched "V"; deduce the
  redacted member's surname `VEY` from Dr. Lina Vey. `content.observer.dataPayload`.
- **P06 The Pivot** — ledger entry checked out by "L.V." on 17/10/2024; the day is
  the pivot `17`. `content.observer.dataPayload` (`interactiveData.requiresPuzzle=P01`).
- **P07 The Binary** — LED bytes decode to `IS:472501`; the operator text is told
  the server log shows 09:47, tying it to `17:47`. `content.observer.dataPayload`.
- **P08 The Vector** — Fragment 1's "straight line vs network" → `DELTA`.
  `content.observer.dataPayload` (`requiresPuzzle=P05`).
- **P09 The Chronology** — Roman numeral XVII → `17`.
- **P10 The Blue Door** — blueprint margin `BLUE = LIGHT` → `LIGHT`.
- **P11 The Symbol** — the glowing blue glyph ⟁ is mounted on an archway → `ARCHWAY`.
- **P12 The Armrest** — seating chart Row B Seat 7 marked "L.V." → `B7`.
- **P13 The Laboratory** — whiteboard experiment code `3425`, cross-referenced to P03.
- **P06b Time Remaining** — recall the P06 pivot `17` to set the lab clock.
  Seed row: `2026092903:28`.
- **P07b The Network** — network diagram ⟁ ⧉ ⬡; resolve ⧉ = `CONNECTION`.
  Seed row: `2026092903:29`.
- **P14 The Memory Bank** — recall Fragment 1 keyword `VECTOR`.
- **P15 The Cipher Wheel** — 7-position wheel; decrypt to the recurring `3425`.
  (Content rewritten in `2026100507:46-68`, including `hints[1]` and `answer_metadata`.)
- **P16 The Auditorium** — count 15 seats in Section B Row 7 → `15`.
- **P17 The Audio Log** — spectrum peaks 1747/2147 Hz encode 17:47; reversed → `ECHO`.
  Hints trimmed to 3 in `2026093010`; audio URL added in `2026093035:150`.
- **P17b The Echo Fold** — the audio-branch cipher gate; answer
  `COUNT THE DOORS NOT THE CLOCKS`. `2026093035:18-49`.
- **P18 The Pattern Lock** — recurring code `3425`; taskPrompt/hints softened in
  `2026100507:80-97`.
- **P19 The Archive** — half-submerged sculpture → `SUBMERGE`.
- **P20 The Symbol Sequence** — seven symbols in discovery order → `2147`.
  Hints trimmed in `2026093010`.
- **P21 The Final Clue** — window note "the archive holds what the symbols cannot
  say" → `ARCHIVE`.
- **M01 The First Lock** — aggregate the 5 Stage-1 answers; common concept `LIGHT`.
- **M02 The Network Meta** — Stage-2 meta; `CONNECTION`.
- **M03 The Symbol Meta** — Stage-3 meta; `SYMBOL`.
- **M04 The Hidden Layer** — Stage-4 meta; `FRAGMENT 5`. (Shares its title with P22.)
- **P22 The Hidden Layer** — the window "X" was not a room but the unknown variable
  of the manifold → `X`. Hints/answer leak removed and `analyst.whatTheySee` /
  `coordinationChain` / `requiredDiscoveries` reworded in `2026100507:100-129`.
- **P23 The Reinterpretation** — a police bulletin claiming the subject left at
  17:30 is a misdirection; `REINTERPRET`.
- **P23b The Path Lock** — audio-branch logic gate; answer `14`. `2026093035:51-83`.
- **P24 The Cross-Reference** — Candidate 00 overflowed ingesting 2000 bytes; three
  people filtering need only a fraction → `CONNECTION`.
- **P24b The Audio Contradiction** — four witnesses (Vale, Vey, Selim, Rahal) plus
  badge logs; identify the impossible statement → `VALE`. Canon-rich; see Phase 2.
  `2026093035:84-111`.
- **P25 The Overload** — three people filter the noise → `FILTER`.
- **P26 The Mirror II** — "the syndicate is in the courtyard… you cannot steal what
  does not exist in any single place" → `REFLECTION`.
- **P27 The Dependency** — Structure is the third glyph; recover Fragment 5 →
  `STRUCTURE`.
- **P27b The Code That Lies** — corrupted state-machine trace; patch address `0x02`.
  `2026093035:117-144`.
- **P28 The Fragment** — recover Fragment 5 → `FRAGMENT 5`. Holds canon memo
  `CASE-LV07` (Operation Shatter).
- **P29 The Revelation** — "NEXUS IS AI"; the player's final revelation. Holds
  `EVID-P29` (the mirror-entity memo).
- **P30 The Transmitter Spire** — "all 28 answers are in the array… the 29th must
  come from within" → `PULSE`.
- **P31 The Memory Array** — sync worked; GM key accessible; "NEXUS can only be
  stopped if all three players simultaneously agree" → `SYNC`.
- **P32 The Three Phones II** — three shards speak of unity; GM key is 7 letters →
  `UNITY`.
- **P33 The GM Key Protocol** — the final boss requires all three to confirm
  simultaneously → `CONVERGE`.
- **P34 The Final Sequence** — the entity stirs; needs all three to confirm
  presence and choice → `D`.
- **P35 The Final Choice** — the GM observes and guides → `AGREE`.
- **P36 The GM Intervention** — final boss requires all three role-specific answers;
  the answer is the game's name as an acronym → `META`.
- **P37 The Final Boss** — `NEXUS`; completion emits `ENDING-CERTIFICATE`.

**VERIFIED.** All seed narrative lives in
`2026092903_seed_puzzle_nodes.sql` `content` / `metadata` columns (rows 15-57);
audio nodes in `2026093035`.

### 1.4 Hints, prerequisites, failure propagation

- **Hint count** is capped at **3** (`MAX_HINTS = 3` inside
  `request_hint`, `2026093010_server_authoritative_puzzles.sql:537`). Seed nodes
  originally carried 3–4 hints; `2026093010` trimmed P17 and P20 to 3, and
  `2026100507` edited P15/P18/P22 `hints[1]`/`hints[2]`. Hints live in
  `content.hints[]` and are served one at a time with a time penalty
  (`HINT_PENALTIES = {1:120, 2:300, 3:600}` in `src/content/constants.ts`, but the
  authoritative penalty is applied server-side in `request_hint`).
- **Prerequisites** live in `puzzle_nodes.prerequisites` (JSONB array). The chain
  is strictly linear with meta insertions; every node except P01 has exactly one
  prerequisite. `P01.prerequisites = []`; the first team unlock is handled by
  `2026100209_unlock_p01_on_start.sql`.
- **Failure propagation / branch conditions** were backfilled by
  `2026093010_server_authoritative_puzzles.sql` into `content.failurePropagation`
  and `content.branchConditions`. P37's `branches.nextNodes` was set to `null` so
  the final node terminates the chain.

### 1.5 Submission / answer validation (final authority)

**VERIFIED** from `2026100601_operator_only_conclusions.sql`:
- Only the **OPERATOR** role may submit an answer; a non-operator submission is
  refused at the payload level (lines 89-93). (Contrast: AGENTS.md notes that an
  authenticated caller lacking a grant should be 403, never 401 — this refusal is a
  role/authorization refusal inside the function.)
- Answer normalisation (lines 164-173) computes `UPPER(TRIM(...))` and collapses
  internal whitespace before comparison. Consequence: `validationMethod` values
  `"exact"` and `"case_insensitive"` are **functionally identical** at the final
  compare step; the distinction is cosmetic metadata only.
- **Points decay** on repeated attempts: attempt 1 = full points, attempt 2 =
  half + 1, attempt ≥ 3 = 0.
- A correct submission writes an atomic `SOLVED` and unlocks the next node via
  `branches->>'unlocks'`; solving P37 sets team status `COMPLETED`.

**VERIFIED** from `2026093010_server_authoritative_puzzles.sql`:
- `nexus_normalize` (line 132), `nexus_contains_answer` (line 140),
  `nexus_redact_answer` / `nexus_redact_jsonb`, `get_player_node_detail` (line
  207), `submit_puzzle_answer` (line 307), `request_hint` (line 537).
**VERIFIED** from `2026100602_role_isolated_player_payload.sql`: the player
payload returns only the requesting role's own block and redacts the accepted
answer out of every player-visible string.

### 1.6 QR / location association

Each `puzzle_nodes.code` maps to exactly one `qr_nodes.puzzle_node_id`.
`2026093015_seed_physical_tables.sql:46` seeds `QR-NODE-02..48` (47 rows),
and `2026100208_add_missing_qr_nodes.sql` repairs `QR-NODE-38..48` (11 rows,
`ON CONFLICT` upsert). Locations are the human-readable strings in the
`location` column (see §1.2). 47 nodes ↔ 47 QR records (VERIFIED by count:
47 rows in `2026093015`, distinct codes `QR-NODE-02..48`).

---

## PHASE 2 — NARRATIVE CANON

Every canonical claim below cites the file and line where it is stated, and is
classified:

- **ESTABLISHED** — stated plainly in the canonical (DB) source.
- **STRONGLY IMPLIED** — assembled from multiple statements; not stated verbatim.
- **CONTRADICTORY** — two or more sources disagree.
- **UNRESOLVED** — a premise is loaded but never paid off.
- Also flagged: **NON-DB / PARALLEL CANON** — content that exists in the repo but
  is *not* in the database and (see Phase 4) is not read by production runtime.

### 2.1 Project NEXUS

| Claim | Class | Evidence |
|---|---|---|
| NEXUS is a consciousness-as-network experiment: "Consciousness is not a single entity but a vector." | ESTABLISHED | `2026093015_seed_physical_tables.sql` `EVID-P07` row (line ~155 area); also `2026092903` P08 narrative |
| Test subjects 00-04 were isolated; Subject 05 was the first to reach network state. | ESTABLISHED | `EVID-P07` (2026093015) |
| In 2021, Candidate 00 tried to ingest all 2000 bytes at once and overflowed; three people filtering the noise need only a fraction each. | ESTABLISHED | `EVID-P24` / `EVID-P25` (2026093015) |
| NEXUS cannot think unless three human hearts provide the pulse; it is not a weapon. | ESTABLISHED | `EVID-P29` (2026093015) |
| The final boss requires all three players to simultaneously agree/submit; no single role can trigger it. | ESTABLISHED | `EVID-P33`, `EVID-P34`, `EVID-P36` (2026093015) |
| "The system was never the enemy. It was the mirror." | ESTABLISHED | `ENDING-CERTIFICATE` (2026093015) |
| The game's final answer is `NEXUS`, entered as the game's name in acronym format. | ESTABLISHED | P36/P37 seed rows (`2026092903:56,57`) + `EVID-P36` |
| NEXUS re-weaves old threads; the window "X" was the unknown variable of the manifold. | ESTABLISHED | `EVID-P22` (2026093015) |

### 2.2 Lina Vey

| Claim | Class | Evidence |
|---|---|---|
| Dr. Lina Vey is the Project Lead (of the 2021 NEXUS project). | ESTABLISHED | `EVID-P04` and `EVID-P03` (2026093015); P05 narrative (`2026092903:19`) |
| Prof. Marcus Carter is the Advisor; a third member is `[REDACTED]` with initial `V`. | ESTABLISHED | `EVID-P04` (2026093015); P04/P05 narrative (`2026092903:18-19`) |
| Vey left a final memo (`CASE-LV07`, "Operation Shatter"): "If they take me tonight, they will find nothing in my hands. The entire architecture has been deployed into the minds of Candidate 01. The answer to P29 will explain what NEXUS truly is." | ESTABLISHED | `2026093015` `CASE-LV07` row (`:177` nodeCode `P28`) |
| Vey's seat was Row B, Seat 7 ("L.V."). | ESTABLISHED | `EVID-P11` (2026093015); P12 narrative |
| Lina is name-checked in in-world "LINA'S NOTE" location clues (e.g., P10, P12, P18, P21, P24b, P27b). | ESTABLISHED | `2026092903` `metadata.locationClue.clueText`; `2026093035:96,129` |
| Vey's fate (arrested / hidden / alive) is never resolved. | UNRESOLVED | `CASE-LV07` implies imminent capture ("If they take me tonight…"); no later node states the outcome. |

### 2.3 The Bureau

| Claim | Class | Evidence |
|---|---|---|
| The organisational frame is an investigative "Bureau" workstation (admin) vs a player handset. | ESTABLISHED | `src/components/bureau/*`; `AGENTS.md` "Visual Language"; `docs/architecture/overview.md` |
| An in-world bureau entity is named "BUREAU OF CONTINUITY RECORDS". | NON-DB / PARALLEL CANON | `src/lib/evidence/showcaseCatalog.ts:25` (`SHOWCASE_CASE.bureau`), dev-only |
| Otherwise the DB contains no named "Bureau" institution in the playable canon. | ESTABLISHED (absence) | keyword sweep found no `Bureau`-as-institution row in any DB migration |

### 2.4 The 04:17 timestamp

| Claim | Class | Evidence |
|---|---|---|
| `04:17` is asserted as a time by four witnesses in the P24b interrogation transcript: Dr. Vale claims he reviewed east-lab footage at 04:17; Dr. Vey says she was in the east lab when the containment-breach alarm sounded at 04:17; Selim places Vey in the west corridor at 04:20; Rahal says the east cameras were powered down from 04:15. | ESTABLISHED | `2026093035_audio_evidence_integration.sql:93` (`content.observer.dataPayload`) |
| The recorded contradiction: Vale's 04:17 claim is impossible because the cameras were powered down at 04:15; the true witness contradiction is Vale. | ESTABLISHED | `2026093035:95` (`fullSolution`) |
| The core time motif elsewhere in canon is **21:47 / 17:47 / 2147**, not 04:17. | ESTABLISHED | P02 `21:47`, P07 `17:47`, P17, P20 `2147` (`2026092903`) |
| A competing timestamp **03:17 / 03:17:11** is asserted for the same corridor incident. | CONTRADICTORY / PARALLEL CANON | `src/lib/evidence/showcaseCatalog.ts:29` (`keyTime: '03:17:11'`); `public/evidence/manifest.json` photographs captured `14 OCT 94 03:17:11` |
| `04:17` appears nowhere in any root or `docs/**` markdown. | ESTABLISHED (absence) | keyword sweep |

**Contradiction to flag explicitly:** the canonical DB timestamp (04:17) and the
generated showcase timestamp (03:17:11) describe the same "east corridor"
incident at different times. The showcase timeline places it in **1994**, the DB
timeline in **2021/2024**. These are two different timelines sharing a motif.

### 2.5 Observer / Analyst / Operator roles

| Claim | Class | Evidence |
|---|---|---|
| Three roles exist: OBSERVER, ANALYST, OPERATOR. | ESTABLISHED | `role_content` blocks in every seed row (`2026092903`); `2026100602_role_isolated_player_payload.sql` |
| The intended division: Observer reads the physical world, Analyst transforms, Operator submits. | ESTABLISHED | `content.coordinationChain` / `operatorInvestigation` in seed rows |
| Only the OPERATOR may submit an answer. | ESTABLISHED | `2026100601_operator_only_conclusions.sql:89-93` |
| Each role sees only its own block; the accepted answer is redacted from all player-visible strings. | ESTABLISHED | `2026100602_role_isolated_player_payload.sql`; `get_player_node_detail` (`2026093010:207`) |
| A fourth in-world actor, the **GM / Game Master**, observes and guides the finale. | ESTABLISHED | P33-P37 narrative; `EVID-P35`, `EVID-P36`; `ENDING-CERTIFICATE` ("NEXUS GAME MASTER CERTIFICATE") |
| Role names map to in-world "Candidate" identities. | STRONGLY IMPLIED | `CASE-LV07` "deployed into the minds of Candidate 01"; `EVID-P35` "all three players are now recognized as the true candidates" |

### 2.6 "Avalanche" principle

| Claim | Class | Evidence |
|---|---|---|
| "Avalanche" is **not** narrative canon. In this repo "avalanche" refers to the *wrong-answer avalanche* / failure-propagation mechanic (bounded at max 9 attempts) and to generic UI failure copy. | ESTABLISHED | `performance-report.md:176,302`; `playtest-report.md:32,231,243`; `docs/ui-review/design-brief.md:75`; `src/tests/playtest-edges.test.tsx:5,171`; `2026093010` `failurePropagation` |
| No DB row describes an "Avalanche principle" as story. | ESTABLISHED (absence) | keyword sweep of all migrations |

**Conclusion:** if the brief lists "the Avalanche principle" as canon, that is a
mis-attribution — it is a mechanics/UX term, not narrative.

### 2.7 The final moral decision (delete / retain / share)

| Claim | Class | Evidence |
|---|---|---|
| A final moral *choice among delete / retain / share* | **NOT FOUND** | The finale (P33-P37) requires all three roles to agree/submit and yields `ENDING-CERTIFICATE`; no delete/retain/share branch exists in any migration, node, or doc. |
| What the finale actually encodes: three minds agree, NEXUS is "the mirror", game complete. | ESTABLISHED | P33-P37 narrative; `ENDING-CERTIFICATE` (2026093015) |

**Gap.** The redesign premise assumes a final delete/retain/share decision. It is
not present in the current build.

### 2.8 Named characters, institutions, incidents, codes

| Name | Class | Evidence |
|---|---|---|
| Dr. Adrian Vale | ESTABLISHED | `2026093035:93-96` (false-witness statement) |
| Mara Selim | ESTABLISHED | `2026093035:93` (west-corridor witness) |
| Noor Rahal | ESTABLISHED | `2026093035:93` (camera-maintenance witness) |
| Prof. Marcus Carter | ESTABLISHED | `EVID-P04` (2026093015); P05 narrative |
| Candidate 00 / Candidate 01 | ESTABLISHED | `2026093015` `EVID-P23`, `EVID-P24`, `CASE-LV07` |
| "Operation Shatter" (case id `CASE-LV07`) | ESTABLISHED | `2026093015:177` (memo row) |
| "The syndicate" (adversary searching for a flash drive) | ESTABLISHED | `2026093015` `EVID-P24`/`EVID-P26`; P26 narrative |
| The 7 glyphs ⟁ Origin, ⧉ Connection, ⬡ Structure, ⧫ Memory, ⌬ Choice, ⍟ Truth, ⎔ Finality | ESTABLISHED | `2026093015` `EVID-P06b`, `EVID-P13`; `2026092903` P15/P20 |
| The recurring access code `3425` | ESTABLISHED | `2026092903` P03/P13/P15/P18 |
| `IS:472501` vs corrected `IS:44721` | ESTABLISHED (correction) | seed P07 said `IS:472501`; `2026100507:19` replaced it with `IS:44721` |
| "The key to the future is the 6th letter" | ESTABLISHED | `2026092903` P04 narrative; `EVID-P03` |
| `Halder Institute for Continuity Studies` | PARALLEL CANON (non-DB) | `scripts/evidence-gen/library.mjs:18`; `public/evidence/manifest.json`; `src/lib/evidence/showcaseCatalog.ts:24` |
| Lina Margaret Vey, born 11 JUN 1954, appointed 14 SEP 1981 | PARALLEL CANON (non-DB) | `scripts/evidence-gen/library.mjs:45`; `public/evidence/manifest.json` `personnel["L.V.-0029"]` |
| "East Corridor" incident, 14 OCT 1994 | PARALLEL CANON (non-DB) | `scripts/evidence-gen/library.mjs:634`; `public/evidence/manifest.json` |
| Case id `NX-037` | PARALLEL CANON (non-DB) | `src/lib/evidence/showcaseCatalog.ts:21`; `public/evidence/manifest.json` |

### 2.9 CONTRADICTIONS (explicit list)

1. **Timeline of Lina Vey / the incident.** DB canon: 2021 project initiation,
   2024 clock maintenance, modern-day candidate cohort
   (`2026092903`; `EVID-P02` "October 14, 2024", `EVID-P03` "2021 Project
   Initiation"). Parallel canon: Halder Institute 1974 building, Vey appointed
   1981, incident 1994, DOB 1954 (`scripts/evidence-gen/library.mjs:18,45,634`;
   `public/evidence/manifest.json`). **CONTRADICTORY.**
2. **The corridor timestamp.** DB: `04:17` (`2026093035:93`). Showcase:
   `03:17:11` (`showcaseCatalog.ts:29`; manifest photographs). **CONTRADICTORY.**
3. **Institution name.** DB canon names no institution beyond locations like
   "[ADMIN BUILDING]"; the showcase invents "BUREAU OF CONTINUITY RECORDS" /
   "HALDER INSTITUTE FOR CONTINUITY STUDIES". **CONTRADICTORY / PARALLEL.**
4. **Duplicate node title.** `P22` and `M04` both use the title "The Hidden Layer"
   (`2026092903:41,42`). Not a story contradiction, but a display collision.
   **AMBIGUOUS.**
5. **P07 binary self-correction.** The operator line states the server log shows
   `09:47` while the decoded string is `IS:472501` (→ `17:47`), and
   `2026100507:19` changed the stored string to `IS:44721`. The on-page operator
   prose still references cross-referencing P02; whether the player is expected to
   reconcile `4725` vs `4472` is **UNRESOLVED**.

---

## PHASE 3 — REPOSITORY DOCUMENTS

One line each. "Carries non-DB narrative?" = does it contain story content that
is *not* already in the database? (Keyword sweep for Lina/Vey/Avalanche/04:17/
Shatter/syndicate/CASE-LV07/NEXUS IS AI/Vale/Selim/Rahal/glyph/personnel.)

### Root markdown

| File | Covers | Non-DB narrative? |
|---|---|---|
| `README.md` | Project intro, setup, commands | No (no canon hits) |
| `AGENTS.md` | Agent instructions, commands, edge-function conventions, visual language | No |
| `ARCHITECTURE_NOTES.md` | Architecture rationale; notes icons are an 11-glyph set; says no posters/emails are in the data | No (glyph = icon set, not canon glyphs) |
| `DESIGN_RESEARCH.md` | Design research; status carried by colour + stroke + glyph | No |
| `GAME_SCOPE_AUDIT.md` | Scope audit; lists evidence categories incl. PERSONNEL | No |
| `SYSTEM_ARCHITECTURE_AUDIT.md` | System architecture audit | No |
| `MOBILE_UI_UX_AUDIT.md` | Mobile UI audit; nav icons, glyph states | No |
| `MOBILE_GAME_AUDIT.md` | Mobile game audit | No |
| `FINAL_BUG_AUDIT.md` | Bug audit | No |
| `SECURITY_AUDIT.md` | Security audit (39 KB) | No |
| `EVIDENCE_ASSET_REGISTRY.md` | Registry of NX-037 generated assets (66 records) incl. personnel files | References `personnel_lv_0029.jpg` etc.; **parallel canon** (non-DB names/timeline) |
| `EVIDENCE_ECOSYSTEM_AUDIT.md` | Evidence ecosystem stats (8 media, 94 clues) | No explicit names; parallel-canon IDs |
| `EVIDENCE_IMPLEMENTATION_AUDIT.md` | "The game is the authority", canonical case NX-037 | No explicit names; parallel-canon framing |
| `EVIDENCE_MATRIX.md` | Media → clue-type matrix | No |
| `EVIDENCE_REFERENCE_NOTES.md` | Visual reference notes (personnel/ID card layout) | No explicit names |
| `EVIDENCE_SHOWCASE.md` | Screenshot showcase incl. personnel medium | No explicit names |
| `NEXUS_ECHO_BRAND_BOOK.md` | Brand book; glyph states, icons | No (glyph = UI iconography) |
| `NEXUS_ECHO_BRAND_MOODBOARD.md` | Moodboard; glyph grammar | No |
| `NEXUS_ECHO_DESIGN_SYSTEM.md` | Design system; `NexusWordmark`, `Glyph` | No |
| `NEXUS_ECHO_ICON_GUIDELINES.md` | Field glyph set + Bureau icons | No (UI glyphs) |
| `NEXUS_ECHO_MOBILE_DESIGN.md` | Mobile design spec | No |
| `playtest-report.md` | Playtest results; "Wrong-Answer Avalanche" section | No story; "Avalanche" = mechanic |
| `performance-report.md` | Perf report; avalanche test coverage | No story |

### `docs/**`

| File | Covers | Non-DB narrative? |
|---|---|---|
| `docs/architecture/database.md` | DB schema reference | No |
| `docs/architecture/overview.md` | Architecture overview | No |
| `docs/deployment/PRODUCTION_DEPLOYMENT.md` | Deployment runbook | No |
| `docs/development/roadmap.md` | Development roadmap | No |
| `docs/event/NEXUS_EVENT_DAY_RUNBOOK.md` | Live event-day runbook | No |
| `docs/research/deduction-and-detective-games.md` | Research on deduction game design | No |
| `docs/research/mystery-design-craft.md` | Mystery-design craft; explicitly discusses the real matcher (`17:47` vs `1747` vs `Archway!` normalization) | No new canon; **describes** the real matching behaviour |
| `docs/ui-review/design-brief.md` | UI design brief; mentions "Avalanche failure copy untouched" | No story |
| `docs/ui-review/REPORT.md` | UI review report | No |

**Finding.** No root or docs markdown contains any of the DB-only canon strings
(`04:17`, `Operation Shatter`, `CASE-LV07`, `syndicate`, `NEXUS IS AI`, `Lina`,
`Vey`). The only narrative-adjacent content outside the DB is the **parallel
NX-037 / Halder Institute** material documented in the EVIDENCE_* files, which
describes generated showcase assets rather than the playable canon.

---

## PHASE 4 — DUPLICATION MAP (runtime vs dead)

### 4.1 What the running app actually reads

**VERIFIED** path: player UI → `src/lib/game/index.ts` (10 edge functions:
`game-get-node`, `game-get-state`, `game-submit`, `game-scan-qr`, `game-use-hint`,
`game-notifications`, `game-inventory`, `game-node-progress`, `game-leaderboard`)
→ `supabase/functions/game-*` → Postgres RPCs
(`get_player_node_detail`, `get_team_game_state`, `submit_puzzle_answer`,
`request_hint`, `scan_qr_code`/`resolve_qr_code`, `get_available_nodes`,
`get_team_inventory`, `get_team_node_progress`, `get_leaderboard`,
`get_team_notifications`, `resolve_node_ref`).

**Answer keys, role blocks, hints, and story text are read ONLY from the
database.** No answer ever reaches the browser (`2026093010` redaction helpers;
`2026100602` role-isolated payload).

### 4.2 Every place puzzle/case content exists

| Source | Content | Read at runtime? | Verdict |
|---|---|---|---|
| `supabase/migrations/*` (esp. `2026092903`, `2026093010`, `2026093015`, `2026093035`, `2026100506`, `2026100507`, `2026100601`, `2026100602`) | Canonical node rows, answers, hints, role blocks, evidence, QR, fragments | **Yes** (DB) | **Canonical** |
| `src/content/puzzles/index.ts` (47 entries) | Node *skeleton* only: id, code, name, stage, type, difficulty, time, location, points, prerequisiteNodes, nextNodes. Header (lines 1-16) states it "deliberately contains no playable content: no role blocks, no coordination chain, no hints, no location clues, no story text, and no answers." | Yes, for pre-auth map drawing only (`useGameEngine`, admin dashboards, tests) | **Not a duplicate of playable content** — a map index |
| `src/content/campus.ts` | Campus/location layout; imports `ALL_PUZZLES` for map placement | Yes (map) | Not narrative |
| `src/content/constants.ts` | `PUZZLE_TYPES`, `HINT_PENALTIES {120,300,600}`, `MAX_HINTS_PER_NODE=3`, `FINAL_READINESS_TARGETS` | Yes (client UI assumptions) | Mirrors server values; **client copy** — server is authoritative |
| `scripts/evidence-gen/library.mjs` | Generates NX-037 showcase artifacts + Halder Institute personnel roster | **No** (build-time generator) | **Dead/parallel** for production |
| `scripts/evidence-gen/build.mjs` | Writes `public/evidence/manifest.json` + images | No (build-time) | Build tool |
| `scripts/evidence-gen/ink-check.mjs`, `preview.mjs` | Read `public/evidence/manifest.json` | No (dev scripts) | Dev tooling |
| `public/evidence/manifest.json` + `public/evidence/*` images | 66 NX-037 artifacts, personnel roster | Only via the dev-gated showcase (see next row) | **Dev-only asset store** |
| `src/lib/evidence/assetLibrary.generated.ts` | Generated index of the 66 showcase assets | Consumed by `showcaseCatalog.ts` | **Generated, dev-only** |
| `src/lib/evidence/showcaseCatalog.ts` | Exposes showcase assets as `CaseArtifact`s; `showcaseEnabled()` returns `import.meta.env.DEV === true`; every record flagged `simulation: true`; header (lines 9-12) says production reads the server catalog and "never see these records." | **No in production**; Yes in dev builds | **Dev-only / parallel canon** |
| `src/features/admin/evidenceLabCatalog.ts` | `buildDevelopmentCatalog()` — dev evidence lab fixture (includes "LINA VEY" rows) | Consumed by `QASimulatorContext.tsx` and `EvidenceLab.tsx`, both dev/QA-gated | **Dev-only** |
| `supabase/functions/bureau-operations/index.ts` `list-evidence-lab-catalog` (line 1595) + `list-puzzle-qa` (line 1515) | Server read of DB `evidence`, `inventory_items`, `fragments`, `puzzle_nodes` | **Yes** (admin/bureau) | **Canonical read path** |
| `src/tests/*` (e.g. `game-engine.test.ts`, `playtest-*.test.tsx`, `invariants.test.ts`) | Assert against the client skeleton + constants | Test-time only | Tests, not runtime content |
| `src/hooks/useGameEngine.ts` | Fetches node details via `gameAPI`; imports the skeleton for map data | Yes | **Runtime client**, skeleton = map only |

### 4.3 Duplication verdict

- **Single source of truth for playable content = the database.** The client
  bundle is intentionally reduced to a spoiler-free map index; there is **no
  duplicated answer/hint/story copy** shipped to the browser.
- **The one real duplication/divergence** is the **NX-037 / Halder Institute
  showcase canon** (`scripts/evidence-gen/*` → `public/evidence/*` →
  `assetLibrary.generated.ts` → `showcaseCatalog.ts`) versus the **DB canon**.
  Both describe a Lina Vey and an east-corridor incident, but with different
  institutions, dates, and timestamps. The showcase is dev-gated
  (`import.meta.env.DEV`) and flagged `simulation: true`, so it does **not**
  reach production players — but it *is* the source of the "contradictory"
  canon flagged in Phase 2, and a redesign must decide which timeline is real.
- **Dead / dev-only copies that are safe to ignore for canon:** all of
  `scripts/evidence-gen/*`, `public/evidence/manifest.json`,
  `src/lib/evidence/assetLibrary.generated.ts`,
  `src/lib/evidence/showcaseCatalog.ts`,
  `src/features/admin/evidenceLabCatalog.ts`.
- **Client constant mirror** (`src/content/constants.ts`) duplicates server
  values (`MAX_HINTS_PER_NODE`, hint penalties). It must be kept in sync with
  `request_hint` (`2026093010:537`) and `2026100601`; drift here would be a bug,
  not a canon issue.

---

## 5. DEAD / DUPLICATED / UNVERIFIABLE GAPS

### Dead or duplicated sources
- NX-037 showcase pipeline (see §4.3): `scripts/evidence-gen/*`,
  `public/evidence/manifest.json`, `assetLibrary.generated.ts`,
  `showcaseCatalog.ts`, `evidenceLabCatalog.ts` — **dev/parallel, not runtime
  canon**.
- `src/content/puzzles/index.ts` is a **map skeleton**, not a content duplicate
  (verified by its 47 entries containing no answers/role blocks/hints/story).
- Root `EVIDENCE_*` markdown documents the generated showcase, not the DB canon.

### Contradictions
- Halder/1994 timeline vs DB/2021-2024 timeline (Phase 2.9 #1).
- `04:17` (DB) vs `03:17:11` (showcase) (Phase 2.9 #2).
- Institution naming (Phase 2.9 #3).
- Duplicate title "The Hidden Layer" on P22 and M04 (Phase 2.9 #4).
- P07 `IS:472501` → `IS:44721` correction leaves operator prose ambiguous
  (Phase 2.9 #5).

### Unverifiable / NOT FOUND
- **Final delete / retain / share moral decision: NOT FOUND.** The finale is a
  three-role agreement that emits a certificate; no moral branch exists.
- **"Avalanche principle" as canon: NOT FOUND.** "Avalanche" is the wrong-answer
  mechanic/UI copy only.
- **Lina Vey's ultimate fate: UNRESOLVED** (implied capture in `CASE-LV07`, never
  narrated afterwards).
- **Identity of the third, redacted team member** beyond "initial V" / surname
  `VEY`: the DB presents Vey herself as the lead, so the redacted third figure's
  relation to Vey (same person? relative?) is **UNRESOLVED**.
- **The role of the "GM"** as a distinct in-world character vs the facilitator is
  **STRONGLY IMPLIED** but never defined in a DB row.
- **Runtime use of the showcase catalog in a production build** was confirmed
  *gated off* by reading `showcaseEnabled()`; whether any deployed environment
  sets `DEV` is environment-dependent and was **not** verified from config here
  (**NOT FOUND** in repo config).

### Verified-absence notes
- No root/docs markdown contains `04:17`, `Operation Shatter`, `CASE-LV07`,
  `syndicate`, `NEXUS IS AI`, `Lina`, or `Vey`.
- `NEXUS IS AI` appears only in `2026092903:49` and
  `2026093010:84`.
- `04:17` appears only in `2026093035:93,95` (plus a test reference).
- `CASE-LV07` / `Operation Shatter` appear only in `2026092903:48` and
  `2026093015:177`.
- No secrets, tokens, keys, or `.env` values were read or printed.

---

## 6. APPENDIX — CANONICAL SOURCE INDEX

| Concern | File | Notes |
|---|---|---|
| Node rows + answers + hints + role blocks | `supabase/migrations/2026092903_seed_puzzle_nodes.sql` | 43 rows (lines 15-57) |
| Audio-branch nodes + rewiring + `04:17` transcript | `supabase/migrations/2026093035_audio_evidence_integration.sql` | 4 rows (18,51,84,117) |
| Evidence, fragments, QR, CASE-LV07, ENDING-CERTIFICATE | `supabase/migrations/2026093015_seed_physical_tables.sql` | `evidence` (143), `fragments` (200), `qr_nodes` (46,98) |
| Failure propagation, redaction, submit/hint bodies | `supabase/migrations/2026093010_server_authoritative_puzzles.sql` | 132,140,207,307,537 |
| Final P33/P34 answers | `supabase/migrations/2026100506_repair_p33_p34_answer_keys.sql` | 5-19 |
| Content/hint balancing (P07,P09,P15,P18,P22) | `supabase/migrations/2026100507_puzzle_content_balancing.sql` | 13-129 |
| Operator-only submission + normalization + decay | `supabase/migrations/2026100601_operator_only_conclusions.sql` | 89-93,164-173 |
| Role-isolated payload | `supabase/migrations/2026100602_role_isolated_player_payload.sql` | — |
| Client map skeleton | `src/content/puzzles/index.ts` | 47 entries, no answers |
| Client constants | `src/content/constants.ts` | hint penalties, max hints |
| Runtime client wrapper | `src/lib/game/index.ts` | 10 edge functions |
| Admin/bureau evidence read | `supabase/functions/bureau-operations/index.ts` | 1515, 1595 |
| Parallel/showcase canon | `scripts/evidence-gen/library.mjs`, `public/evidence/manifest.json`, `src/lib/evidence/showcaseCatalog.ts`, `src/features/admin/evidenceLabCatalog.ts` | dev-only |

*End of inventory.*
