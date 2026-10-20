# NEXUS — TIMELINE AND KNOWLEDGE GRAPH

**Purpose.** Fix the case's true in-world chronology, the archive's *apparent*
chronology (which is what the team actually reads and what the two false theories
grow from), and the per-role knowledge graph across the five stages. This is a
**derived document**: it adds no canon and changes no source. Every claim cites the
file and line it comes from, and every claim is tagged.

**Branch.** `investigation-rebuild`.

**Authority order.** The design authority is `docs/NEXUS_CASE_BIBLE.md` (the bible).
Where the bible and the database seed disagree, the bible wins and the change is
recorded in `NEXUS_CANON_LEDGER.md` / `NEXUS_CONTENT_MIGRATION.md` — **neither file
exists in this repository** (glob-confirmed). That absence is recorded below, not
smoothed over. The audit that produced the raw facts is
`docs/audit/NEXUS_CURRENT_CASE_INVENTORY.md` (the inventory).

---

## Tag legend

| Tag | Meaning |
|---|---|
| **FACT** | Read directly from a source file, cited `file:line`. |
| **INFERENCE** | Derived by assembling two or more facts; not stated verbatim anywhere. |
| **ALLEGATION** | A claim made by an in-world actor inside the case material; not adjudicated by the DB. |
| **CONTRADICTION** | Two canonical sources disagree. Both are shown. |
| **UNVERIFIED** | Loaded as a premise but never paid off, or asserted without a source in the repo. |
| **NOT FOUND** | Searched for and absent from the repository. |

---

# SECTION A — THE TRUE CHRONOLOGY (in-world)

This is the order in which the events *actually happened* in the fiction. Only
Stage 4–5 material lets the team see it in this order; everything before Stage 4
reaches them as records (Section B).

## A.1 The record of truth

| # | When (true) | Event | Evidence | Tag |
|---|---|---|---|---|
| T1 | **2021** | **Project NEXUS initiation.** Programme formed to model consciousness as a network across people. Dr. Lina Vey is lead researcher; Prof. Marcus Carter is advisor of record; a third team member is shown with initial "V" and marked TBA. Poster note: "The key to the future is the 6th letter." | `2026093015_seed_physical_tables.sql:150` (`EVID-P03`); `2026093015:155` (`EVID-P07`); `docs/NEXUS_CASE_BIBLE.md:36-37` | FACT |
| T2 | **2021** | **Subjects 00–04 isolated.** Subject 05 is the first to reach network state ("the mind that was not a single person"). | `2026093015:155` (`EVID-P07`); `docs/NEXUS_CASE_BIBLE.md:58-60` | FACT |
| T3 | **2021** | **Candidate 00 overflows.** Candidate 00 tries to ingest all 2000 bytes at once; the mental stack overflows. The design conclusion: three people filtering the noise need only a fraction each. | `2026093015:173-174` (`EVID-P24`/`EVID-P25`) | FACT |
| T4 | between 2021 and 2024 | **Operation Shatter.** Vey's final memo (`CASE-LV07`): "If they take me tonight, they will find nothing in my hands. The entire architecture has been deployed into the minds of Candidate 01." | `2026093015:177` (`CASE-LV07`); inventory `:310` | FACT |
| T5 | **2024-10-14** | **Clock maintenance / the synchronization event.** The clock is manually set to `21:47`. This is the archive's *apparent* time; the true minute is `04:17` (§A.3). | `2026093015:149` (`EVID-P02`: "Clock Maintenance Log — October 14, 2024", "Clock manually set to 21:47 for synchronization event") | FACT |
| T6 | **the pivotal minute — 04:17** | **The network first held, and Subject 05 was lost, in the same minute.** `04:17` is the single true minute under the whole case. | `docs/NEXUS_CASE_BIBLE.md:42` ("the minute the network first held, and the minute Subject 05 was lost"); `2026093035_audio_evidence_integration.sql:93,95` | FACT |
| T7 | same night | **The corridor incident (Stage 4).** Four witness accounts plus badge logs disagree: Vale claims he reviewed east-lab footage at 04:17; Vey says she was in the east lab when the breach alarm sounded at 04:17; Selim places Vey in the **west** corridor at 04:20; Rahal says the east cameras were **powered down from 04:15**. Badge logs: Vey east-lab 04:17, west corridor 04:20. The physical contradiction: **cameras were down at 04:15, so Vale's 04:17 "footage review" is impossible.** | `2026093035:93` (transcript), `2026093035:95` (`fullSolution` = `VALE`) | FACT |
| T8 | **present day** | **The investigation.** Three Candidates (the players) are enrolled for field accreditation by the Bureau and given the case file. They are not investigating the experiment — they are its last three inputs; the three roles *are* the three pulses. | `docs/NEXUS_CASE_BIBLE.md:12-25`; `docs/NEXUS_CASE_BIBLE.md:118-119` | FACT |
| T9 | **endgame** | **The Avalanche runs.** The signalling cascade begins when three independent reconstructions agree; it cannot be recalled. The team disposes of NEXUS: **delete / retain / share**. | `docs/NEXUS_CASE_BIBLE.md:112-128`; `docs/NEXUS_CASE_BIBLE.md:132-145`; server support `2026100608_multi_answer_disposition.sql:5-26` | FACT (bible + server) / **NOT FOUND as data** (§D.3) |

## A.2 Per-event knowledge — who knows, who does NOT

"Knows" = holds the fact as true. The three solver roles are the *player* roles;
the other rows are in-world actors. The GM is listed because the seed names it, but
its epistemic position is never defined (see §D.3).

| Event | Who knows | Who does **NOT** know |
|---|---|---|
| T1 Initiation (2021) | Veyr (lead), Carter (advisor of record), the Bureau (institutional home) | The three Candidates; the syndicate | 
| T2 Subjects 00–04; Subject 05 = the network | Veyr; the programme staff | The Candidates until Stage 4; the syndicate (thinks NEXUS is a device) |
| T3 Candidate 00 overflow | Veyr (it is her note) | The Candidates; the Bureau (on paper) |
| T4 Operation Shatter — architecture deployed into Candidate 01 | Veyr | The Bureau (Veyr hid it deliberately: "they will find nothing in my hands"); the Candidates; the syndicate |
| T5 Clock set to 21:47 (2024-10-14) | Whoever performed maintenance (a log entry, unnamed); the Analyst domain surfaces the log | The Observer; the Operator until records are joined |
| T6 The true minute 04:17 | Veyr; the two people actually present at the alarm | Vale (he is not credible); the Candidates until Stage 4 |
| T7 Corridor incident | Each witness holds one fragment only; the badge system holds the swipe times | **Vale does NOT know the cameras were down** — that is exactly what exposes his statement as impossible (`2026093035:93,95`) |
| T8 The team are the pulses | The Bureau ("The Bureau knew. The case file was the cover."); Subject 05 (the mind that wants to be ended/kept/revealed) | **The Candidates** — this is the reveal (`docs/NEXUS_CASE_BIBLE.md:22-25`) |
| T9 The disposition | Veyr (author of the architecture); Subject 05; the Bureau | The team decides, but the *outcome* is theirs to choose, not a fact to discover (`docs/NEXUS_CASE_BIBLE.md:132-145`) |

**Second false trail — the syndicate.** An outside buyer's people search the
courtyard "for a flash drive that does not exist in any single place" (bible:61;
P26 narrative, inventory `:197`). The syndicate therefore **does not know** the
crime is not theft; neither does the team at first. **ALLEGATION** by in-world
actors; the DB never establishes the syndicate's membership or their success.

**Carter false trail.** Carter's name is on forms he did not sign, so Carter **does
not know** what was done in his name; the team initially believes *he* is the
culprit (bible:56-57). **INFERENCE** — the "did not sign" is stated; the team's
initial belief is the bible's design intent (`docs/NEXUS_CASE_BIBLE.md:57`).

## A.3 Why 04:17 is the pivotal minute

`04:17` is the only minute in the case that is simultaneously **a beginning** (the
network first held) and **a loss** (Subject 05 was lost) (bible:42). Every other
token in the archive — `21:47`, `17:47`, `2147`, `3425` — is either that minute
seen through the archive's offset (§B.2) or a filing reference (§B.3). The reveal
is therefore **not a new fact but a re-read of facts the team already holds**
(bible:103-105). The team submits the archive's tokens gate-by-gate; the truth is
the correction that turns them back into `04:17`.

---

# SECTION B — THE ARCHIVE'S APPARENT CHRONOLOGY

This is the chronology the team builds while playing, stage by stage, from the
records. It is **false in exactly two ways** — the time offset and the code
misreading — and both falsities are eliminable by evidence alone (bible:107-108).

## B.1 How the record reads to the team

| Stage | What the archive appears to say | Source token(s) | Where it is read |
|---|---|---|---|
| 1 Intake | The building was sealed; a call number `CDFDEFF`; a clock stopped; a recurring token `3425`; a poster dated after closure | `CDFDEFF`, `21:47`, `3425`, `F`, `VEY` | bible §9 Stage 1 (`NEXUS_CASE_BIBLE.md:175-180`) |
| 2 Records | A service log encoding a time; a chronology with a missing entry; a network diagram; recurring `3425` | `17`, `17:47`, `DELTA`, `LIGHT`, `ARCHWAY`, `B7`, `3425`, `CONNECTION` | bible §9 Stage 2 (`:186-196`) |
| 3 Classification | Seven glyphs that look like a cipher; a wheel with seven positions; a sequence `2147` | `VECTOR`, `3425`, `15`, `ECHO`, `DOORS`, `SUBMERGE`, `2147`, `ARCHIVE`, `SYMBOL` | bible §9 Stage 3 (`:203-211`) |
| 4 Core | Two reports that differ by an offset; a witness who says `04:17`; three seals that intersect | `X`, `REINTERPRET`, `14`, `CONNECTION`, `VALE`, `FILTER`, `REFLECTION`, `STRUCTURE`, `0x02`, `FRAGMENT 5`, `NEXUS IS AI` | bible §9 Stage 4 (`:217-228`); transcript `2026093035:93` |
| 5 Avalanche | The pulse is the three of you; the safe key; the sequence is already running | `PULSE`, `SYNC`, `UNITY`, `CONVERGE`, `D`, `AGREE`, `META`, and the disposition | bible §9 Stage 5 (`:234-241`) |

## B.2 The +17:30 offset (False theory B)

The archive's machine-readable timestamps were migrated with an inherited
timezone/sync fault: they are **shifted by +17:30** relative to the true time
(bible:100-103).

- **True** pivotal minute: `04:17`.
- **Apparent** (archive) rendering: `04:17 + 17:30 = **21:47**`.

`21:47` is therefore not a second event; it is `04:17` with the offset applied
(`EVID-P02` sets the clock "to 21:47 for synchronization event",
`2026093015:149`). The team "reconstructs `17:47`, `21:47` and `2147` and builds a
theory on them" (bible:102); the correction re-reads them as `04:17`.

**Source disagreement to flag (do not smooth).** The offset arithmetic is
internally inconsistent across the tokens the bible names:

| Archive token | Where | `token − 17:30` | Lands on `04:17`? |
|---|---|---|---|
| `21:47` | P02 (`2026092903`, inventory `:78`) | `04:17` | **Yes** |
| `2147` | P20 (`2026092903`, inventory `:99`) | `21:47` (as digits, no colon) | Only if re-read as `21:47` first |
| `17:47` | P07 (`2026092903`, inventory `:83`) | `00:17` | **No** |

`17:47` reduces to `00:17`, not `04:17`. So the single "+17:30" rule explains
`21:47` and the `2147` sequence (via `21:47`) but does **not** explain P07's
`17:47` answer token. **CONTRADICTION (internal to the design authority).** Three
reconciliations are possible, and none is stated in any source:

1. P07's `17:47` is a *second, independent* corruption (a byte-order transposition:
   `04:17` digits re-ordered), not the offset — **INFERENCE**.
2. `17:47` is a deliberate decoy token that the team must *reject* during Stage 4
   ("the reports differ by the archive's offset", `REINTERPRET`, bible:218) —
   **INFERENCE**.
3. `17:47` is simply a residual of the original seed and should be remapped —
   **UNVERIFIED**; the seed still ships it as P07's `acceptedAnswer`
   (`2026092903`, inventory `:83`), unchanged by the balancing migration.

**Recorded as an open item; not resolved here.**

## B.3 The `3425` misreading (False theory A)

`3425` recurs in P03, P13, P15 and P18 (inventory `:79,89,93,97`). Every use is
consistent with a cipher, so the team is invited to treat it as a key. The truth:
`3425` is the **Bureau case-file reference** for the programme — **binder 34, shelf
2, file 5** — and it recurs because the same file was pulled on many dates
(bible:94-98). It is eliminated when the team finds the archive's own numbering
scheme in Stage 1 (P01's `CDFDEFF` call number) and sees the reference in a custody
stamp in Stage 3 (bible:97-98; inventory `:177,193`).

**Note.** The elimination is structural, not phonetic: `3425` is read as the
three-part archive address `34-2-5`, the same way `CDFDEFF` is read as a run in
`docs/_rebuild/TEMPLATE.md:78`.

## B.4 Parallel canon — a second, contradictory archive

A second corpus exists in the repository but **not** in the database and **not** in
production runtime: the NX-037 / "Halder Institute" showcase. It is dev-gated
(`showcaseEnabled()` returns `import.meta.env.DEV === true`,
`src/lib/evidence/showcaseCatalog.ts:37-39`) and every record is flagged
`simulation: true` (`:62`).

| Dimension | DB canon (authoritative) | Showcase / parallel canon |
|---|---|---|
| Institution | no named institution beyond locations like `[ADMIN BUILDING]` (inventory `:321,399-401`) | "HALDER INSTITUTE FOR CONTINUITY STUDIES" (`showcaseCatalog.ts:24`), "BUREAU OF CONTINUITY RECORDS" (`:25`) |
| Pivotal time | `04:17` (`2026093035:93`) | `03:17:11` (`showcaseCatalog.ts:29`); photographs `14 OCT 94 03:17:11` |
| Vey timeline | initiation 2021 (`2026093015:150`); clock 2024 (`:149`) | born 1954, appointed 1981, incident 1994 (`scripts/evidence-gen/library.mjs:45,634`; inventory `:385-386`) |
| Case id | the DB has no `NX-037` id | `NX-037` (`showcaseCatalog.ts:21`) |

**CONTRADICTION.** Two timelines share one motif. The worklog resolves it: "DB
canon is authoritative; the showcase is retired"
(`docs/NEXUS_TRANSFORMATION_WORKLOG.md:41-43`). This document follows that
resolution, and records the showcase as **parallel/dev-only, not canon**.

---

# SECTION C — PER-ROLE KNOWLEDGE GRAPH (5 STAGES)

## C.0 The three evidence domains

The structural rule is that the three roles are three **evidence domains**, not
three holders of one answer (bible:69-85). Only the Operator types; the Operator's
domain is also the only one holding the institutional key, so the submission
depends on all three (bible:81-82).

| Role | Domain | The question it answers |
|---|---|---|
| **OBSERVER** | the physical world — what is present, where, in what order, with what marks | *What is actually here?* |
| **ANALYST** | records and relationships — logs, chronology, custody, cross-reference | *Who, when, and how does it connect?* |
| **OPERATOR** | institutional authority — permissions, systems, classifications, access | *Who was allowed to do this, and what did the institution know?* |

Source: `docs/NEXUS_CASE_BIBLE.md:73-77`. The three roles are the only roles in the
codebase (`src/types/domain.ts:10,12`; `src/app/config/index.ts:85,192`). A fourth
in-world actor, the **GM**, is named only in the Stage-5 narrative and is not a
solver role (inventory `:346,559`); see §D.3.

## C.1 Required table — Stage | Observer knows | Analyst knows | Operator knows | Team must infer | What the gate proved

| Stage | Observer knows (physical) | Analyst knows (records) | Operator knows (institution) | Team must infer | What the gate proved |
|---|---|---|---|---|---|
| **1 Intake** (Admin Building) | The glyph band above the entrance is carved in two ages (six weathered, two fresh); the lobby clock is stopped; the poster wall and the third photo frame carry marks | The archive classifies buildings by a letter run (e.g. `CDF-D-4`); the poster dates cluster in 2021; the signature block was truncated | The intake register has a call-number field and a same-day SEAL custody stamp; the filing name is `L. Veyr` | The carving is an **archive call number**, not a dedication; the recurring `3425` is a **file reference** not a cipher; the poster post-dates closure | A Bureau intake exists with a call number, a seal date, and Veyr's signature; the numbering scheme that kills False theory A (`NEXUS_CASE_BIBLE.md:97-98,175-180`; `TEMPLATE.md:78-80`) |
| **2 Records** (Library / Science) | The service rack shows LED bytes; the wall clock disagrees with the ledger; the network diagram has three glyph types; the lecture-hall armrest is marked | The service log has an epoch marker; the ledger entry is checked out by "L.V." on 17/10/2024; the chronology has one missing entry; the pull-dates of the case file match the exhibits | The access designation is read from the vault index; the specimen register keys the armrest mark; the lab's own log convention sets the clock | The pivot is the **day** (17), not page/subject; the log's own epoch yields the time token; the network edges are **people**; the case file was pulled on the exhibit dates | The chronology is reconstructible from the archive; the case file `3425` maps to specific pull-dates (`NEXUS_CASE_BIBLE.md:186-196`; inventory `:151-165`) |
| **3 Classification** (Library / Admin / Campus) | The symbol wheel has seven positions, not an alphabet; the dome panel shows seven glyphs; the sculpture garden marker is a survey marker; the window carries a message | The storage index is keyed by subject; the auditorium roll gives its own tally; the glyph order matches the subject register; the reading-room class token recurs | The archive's classification format is institutional; the floor plan places the archive; the classification is a **containment** scheme | The seven glyphs are a **containment classification**, not a cipher; glyph order = subject order; the sequence is a date only after the offset is known | The glyphs classify how a subject was held; `2147` is the offset rendering of the true minute (`NEXUS_CASE_BIBLE.md:158,203-211`) |
| **4 Core** (Engineering Block) | The window "X" is a correction mark, not a symbol; the mirror shards spell a word only together; the fragment cylinder has a custody chain | Two reports differ by the archive's offset; the camera maintenance log shows a 04:15 power-down; the three departmental seals share one file reference; the trace is corrupted at one step | The wrong statement is the evidence; the debug console's assertion contradicts the record; the vault holds the fifth fragment | The witness who says `04:17` is **impossible as recorded** because the cameras were down at 04:15; "both reports shifted" is the resolution; Fragment 5 is **Subject 05** (a person) | The minute the records were altered; the three domains converge on one programme; the reveal is a re-read of `04:17`, and Fragment 5 is the network mind (`NEXUS_CASE_BIBLE.md:217-228`; `2026093035:93,95`; inventory `:203-206`) |
| **5 Avalanche** (NEXUS Core) | The transmitter spire beats a pulse sequence; the memory array is occupied | The three devices' shards speak of unity; the safe key is seven letters; the sequence is already running | The GM-Key protocol requires all three to confirm simultaneously; the observation deck shows the Bureau was always there | The pulse is **the three of them**; agreement is the third pulse; the finale is a **moral** decision, not a puzzle | NEXUS is running; the team is its input; the disposition is theirs (`NEXUS_CASE_BIBLE.md:112-128,234-241`) |

## C.2 Gate-level knowledge (what each gate contributes)

Every gate is a **bounded reconstruction**: two to four competing explanations,
each backed by real evidence, exactly one surviving (bible:18-20). The four meta
gates (`M01`–`M04`) are *synthesis* gates: they read across a whole stage rather
than a single exhibit (inventory `:37,101-104`).

| Gate | Incident | The explanation that survives | Decisive inference | Answer | Tag |
|---|---|---|---|---|---|
| P01 The Facade | Carved glyph band | the archive's own call-number format | the run `34-2-5`… read as `CDFDEFF` run | `CDFDEFF` | FACT |
| P02 The Clock | Lobby clock vs tower clock | the lobby time is the true stop; the tower was reset by hand | the tower reset is a second, later act | `21:47` | FACT |
| P03 The Facade Pin | recurring `3425` | a Bureau file reference, not a cipher | the archive numbering scheme from P01 | `3425` | FACT |
| P04 The Poster Dates | poster dated after closure | a later insertion (stock and ink post-date closure) | the note "the key to the future is the 6th letter" → `F` | `F` | FACT |
| P05 The Third Figure | cropped third figure | Lina Veyr | truncated signature initials | `VEYR` | FACT (bible) / seed `VEY` |
| M01 The First Lock | five Stage-1 custody annotations | an evidence class | "LIGHT" = observed under ambient/night light | `LIGHT` | FACT |
| P06 The Pivot | index card pivot `17` | cross-referenced to the subject register | the ledger day 17/10/2024 | `17` | FACT |
| P07 The Binary | encoded service log | the log's own epoch marker | see §B.2 tension | `17:47` | FACT token / **CONTRADICTION** |
| P08 The Vector | access designation | the vault index | Fragment 1 "straight line vs network" | `DELTA` | FACT |
| P09 The Chronology | timeline missing an entry | a covered interval | custody gaps cluster at one minute | `17` | FACT |
| P10 The Blue Door | blue access marking | an evidence class | class "LIGHT" | `LIGHT` | FACT |
| P11 The Symbol | wall glyph | a containment symbol | matches the glyph scheme | `ARCHWAY` | FACT |
| P12 The Armrest | marked lecture-hall position | a specimen code | the lab's specimen register | `B7` | FACT |
| P13 The Laboratory | case file pulled repeatedly | the programme's own folder | pull-dates match the exhibits | `3425` | FACT |
| P06b Time Remaining | lab clock | the lab's own log convention | recall the P06 pivot | `17` | FACT |
| P07b The Network | network diagram | the subject lattice | edges are people | `CONNECTION` | FACT |
| M02 The Network Meta | Stage-2 exhibits as vertices | one dependency graph | every exhibit is an edge in one graph | `CONNECTION` | FACT |
| P14 The Memory Bank | storage index | keyed by subject | recall Fragment 1 | `VECTOR` | FACT |
| P15 The Cipher Wheel | symbol wheel | a classification dial (seven positions) | the wheel is not an alphabet | `3425` | FACT |
| P16 The Auditorium | seating plan | the roll's own tally | count Section B Row 7 | `15` | FACT |
| P17 The Audio Log | spectrum recording | the room's impulse response | reversed → `ECHO` | `ECHO` | FACT |
| P17b The Echo Fold | folded audio artefact | the archive's own reading instruction | `COUNT THE DOORS NOT THE CLOCKS` | `COUNT THE DOORS NOT THE CLOCKS` | FACT |
| P18 The Pattern Lock | reading-room lock | an archive classification | class token, again | `3425` | FACT |
| P19 The Archive | sculpture-garden marker | a survey marker | the survey register | `SUBMERGE` | FACT |
| P20 The Symbol Sequence | dome panel of seven glyphs | an ordered classification | glyph order = subject order → `2147` | `2147` | FACT |
| P21 The Final Clue | window message | a pointer to the archive | the archive's floor plan | `ARCHIVE` | FACT |
| M03 The Symbol Meta | seven glyphs ↔ seven exhibits | a classification of containment | the glyphs classify how a subject was held | `SYMBOL` | FACT |
| P22 The Hidden Layer | variable hidden in P01 | the manifold's unknown | the mark is a correction, not a symbol | `X` | FACT |
| P23 The Reinterpretation | two reports on a departure | both are shifted by the archive's offset | the bulletin's 17:30 is a misdirection | `REINTERPRET` | FACT |
| P23b The Path Lock | access path | the route register | 14 / 41 / a route count | `14` | FACT |
| P24 The Cross-Reference | three departmental seals | one programme | the same file reference in all three | `CONNECTION` | FACT |
| P24b The Audio Contradiction | witness says `04:17` | cameras down at 04:15 — impossible as recorded | Vale's claim to have reviewed footage | `VALE` | FACT |
| P25 The Overload | noise stream | filter it | the pivot row from P06 | `FILTER` | FACT |
| P26 The Mirror II | three phone shards | three people | the shards spell a word only together | `REFLECTION` | FACT |
| P27 The Dependency | directed graph | a dependency of the programme | root and leaf are the same person | `STRUCTURE` | FACT |
| P27b The Code That Lies | debug console | an assertion that contradicts the record | the contradiction is the evidence | `0x02` | FACT |
| P28 The Fragment | fragment cylinder | a piece of consciousness | the custody chain | `FRAGMENT 5` | FACT |
| P29 The Revelation | core terminal | **not one mind** | the three roles are its inputs | `NEXUS IS AI` | FACT |
| M04 The Hidden Layer | Stage-4 convergence | the fifth fragment is a person | Fragment 5 is Subject 05 | `FRAGMENT 5` | FACT |
| P30 The Transmitter Spire | spire signal | the pulse sequence | the pulse is the three of you | `PULSE` | FACT |
| P31 The Memory Array | memory array | the subjects' residual minds | the array is occupied | `SYNC` | FACT |
| P32 The Three Phones II | three devices | three people | the devices are the pulses | `UNITY` | FACT |
| P33 The GM Key Protocol | key panel | the Avalanche trigger (a failsafe) | the protocol is the failsafe | `CONVERGE` | FACT |
| P34 The Final Sequence | central hub sequence | the avalanche itself — already running | the sequence is already running | `D` | FACT |
| P35 The Final Choice | the chamber asks for agreement | decide | agreement is the third pulse | `AGREE` | FACT |
| P36 The GM Intervention | observation deck | the Bureau watching | the Bureau was always there | `META` | FACT |
| P37 The Final Boss | the decision | delete / retain / share | **the team's** choice (multi-answer) | `DELETE`\|`RETAIN`\|`SHARE` | FACT (bible) / **NOT FOUND as data** |

Source: `docs/NEXUS_CASE_BIBLE.md:164-241` (intent + answers); the *runtime*
answers are the seed values in `supabase/migrations/2026092903_seed_puzzle_nodes.sql:15-57`
and `2026093035:18-144`, as tabulated in the inventory `:75-123`.

## C.3 Where the runtime answers diverge from the bible intent

Three divergences are load-bearing and must not be smoothed:

1. **P05** runtime answer is `VEY` (inventory `:81`); the bible fixes the canonical
   name as **Veyr** (`NEXUS_CASE_BIBLE.md:37`, and the authoring example already
   writes `L. Veyr` in `TEMPLATE.md:78,80`). **CONTRADICTION / recorded rename.**
2. **P33/P34** shipped wrong key values in the seed (`CONVERGENCE`/`C`) and were
   repaired forward to `CONVERGE`/`D` (`2026100506_repair_p33_p34_answer_keys.sql:5-19`);
   the bible already carries the corrected tokens (`NEXUS_CASE_BIBLE.md:237-238`).
   **FACT (already repaired).**
3. **P37** runtime `acceptedAnswer` is still `NEXUS` (inventory `:123`), and **no
   migration populates `acceptedAnswers`** — grep over `supabase/` finds the token
   only inside the function body of `2026100608_multi_answer_disposition.sql`, never
   in data. The delete/retain/share finale therefore exists as a **server
   capability** but not yet as **content**. **INFERENCE / gap** (§D.3).

---

# SECTION D — PROVENANCE, CONTRADICTIONS, GAPS

## D.1 Source index (what each claim rests on)

| Concern | Canonical source | Lines |
|---|---|---|
| True chronology, motif `04:17`, false theories, ending, stages | `docs/NEXUS_CASE_BIBLE.md` | 12-25, 36-46, 79-108, 132-145, 175-241 |
| Corridor transcript and contradiction | `supabase/migrations/2026093035_audio_evidence_integration.sql` | 93, 95 |
| Node answers, hints, role blocks (runtime) | `supabase/migrations/2026092903_seed_puzzle_nodes.sql` | 15-57 |
| Evidence, 2021/2024 dates, `CASE-LV07` | `supabase/migrations/2026093015_seed_physical_tables.sql` | 149, 150, 155, 173-174, 177 |
| P33/P34 repair | `supabase/migrations/2026100506_repair_p33_p34_answer_keys.sql` | 5-19 |
| P07 correction + hint balancing | `supabase/migrations/2026100507_puzzle_content_balancing.sql` | 13-129 |
| Operator-only submission, normalization, points decay | `supabase/migrations/2026100601_operator_only_conclusions.sql` | 89-93, 164-181 |
| Multi-answer disposition server support | `supabase/migrations/2026100608_multi_answer_disposition.sql` | 5-26, 176-195 |
| Raw facts, contradiction list, NOT FOUND list | `docs/audit/NEXUS_CURRENT_CASE_INVENTORY.md` | 75-123, 293-336, 389-409, 549-573 |
| Parallel/showcase canon | `src/lib/evidence/showcaseCatalog.ts`; `scripts/evidence-gen/library.mjs` | 21-32, 37-39, 45, 634 |

## D.2 Contradictions (explicit, unresolved)

| # | Contradiction | Both sides shown | Tag |
|---|---|---|---|
| C1 | **DB timeline vs showcase timeline.** 2021 initiation / 2024 clock vs Halder 1974 building / Vey appointed 1981 / incident 1994 / DOB 1954. | `2026093015:149-150` vs `library.mjs:45,634`; inventory `:391-396` | CONTRADICTION |
| C2 | **Pivotal minute.** `04:17` vs `03:17:11`. | `2026093035:93` vs `showcaseCatalog.ts:29`; inventory `:397-398` | CONTRADICTION |
| C3 | **Institution naming.** No DB institution vs "BUREAU OF CONTINUITY RECORDS" / "HALDER INSTITUTE". | inventory `:321,399-401` vs `showcaseCatalog.ts:24-25` | CONTRADICTION |
| C4 | **Offset arithmetic.** `21:47 − 17:30 = 04:17` succeeds, but `17:47 − 17:30 = 00:17`. | `NEXUS_CASE_BIBLE.md:100-103` vs `2026092903` P07 | CONTRADICTION (internal) |
| C5 | **Duplicate title.** `P22` and `M04` are both "The Hidden Layer". | `2026092903:41,42`; inventory `:402-404` | CONTRADICTION (display) |
| C6 | **P07 self-correction.** The operator prose says the log shows `09:47` while the decoded string was changed from `IS:472501` to `IS:44721`. | `2026100507:19`; inventory `:405-409` | UNRESOLVED |
| C7 | **Canonical name.** Seed/runtime write "Vey"; the bible and the authoring template write "Veyr". | `2026092903` vs `NEXUS_CASE_BIBLE.md:37`, `TEMPLATE.md:80` | CONTRADICTION (recorded rename) |

## D.3 Unverified / NOT FOUND

| Item | Status | Evidence |
|---|---|---|
| `NEXUS_CANON_LEDGER.md` (mandated by the bible's own rule) | **NOT FOUND** | bible `:5-6` names it; glob of `docs/**` finds no such file |
| `NEXUS_CONTENT_MIGRATION.md` (mandated by the bible) | **NOT FOUND** | bible `:6,144-145` name it; not in `docs/**` |
| `NEXUS_CONTENT_MIGRATION.md` referenced by the finale migration | **NOT FOUND** | `2026100608_multi_answer_disposition.sql:26` cites it; absent |
| Delete / retain / share as **data** | **NOT FOUND** | grep: `acceptedAnswers` appears only in the function body of `2026100608`, never in a node row; P37 still answers `NEXUS` (inventory `:123`) |
| Lina Veyr's ultimate fate | **UNVERIFIED** | `CASE-LV07` implies imminent capture; no later node narrates the outcome (inventory `:313,554-555`) |
| The redacted third figure's relation to Veyr | **UNVERIFIED** | DB presents Veyr as lead; the "third figure" with initial V is unresolved (inventory `:556-558`) |
| The GM as a defined in-world character | **UNVERIFIED** | named in P33–P37 narrative and `EVID-P35/P36`; never defined in a DB row (inventory `:559-560`) |
| "Avalanche" as narrative canon | **CONTRADICTED by inventory** | inventory `:349-357` finds it is a UI/mechanics term; the bible asserts it as in-world canon (`NEXUS_CASE_BIBLE.md:112-128`). **The bible wins** per the bible's own rule, but the ledger that would record that change does not exist (row 1). |
| Runtime use of showcase in production | **NOT FOUND** | gated by `import.meta.env.DEV` (`showcaseCatalog.ts:37-39`); no repo config sets it (inventory `:561-564`) |

---

*End of timeline and knowledge graph.*
