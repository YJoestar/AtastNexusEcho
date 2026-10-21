# NEXUS Adversarial Review — Findings Register

**Scope:** `D:\Projects\NexusEcho`, branch `investigation-rebuild`, HEAD `5f154a2`.
**Target:** the 47 gates rebuilt by the five `202610060{3..7}_investigation_rebuild_stage*.sql`
migrations (P01–P37 incl. P06b/P07b/P17b/P23b/P24b/P27b, plus M01–M04).
**Method:** five attacks — Test B (expert team, shortest bypass path), Test A (skeptical
investigator, rival explanations), Test D (fair play — are the needed facts present in
player-visible strings?), Test E (narrative continuity, CONFIRMED/IMPLIED/CONTRADICTORY/UNRESOLVED),
Test F (field practicality / mobile rendering).

**Goal of this register is not to loosen the case.** Every repair below fixes evidence,
framing, or wording — it never widens answer matching and never adds a spoiler.

---

## How to read this register

Attacks were weighted by expected yield: Test B (bypass) first, then the correctness
checks that B surfaced (a bypass is worthless if the "correct" answer is also wrong),
then A / D / E / F.

Everything below was verified against the **served strings** — the exact JSON in the
migration `content` / `answer_metadata` columns, not the design docs. The design docs are
already known to drift from the rebuild, and where they do, that drift is reported as its
own finding rather than treated as canon.

### The leak machinery being attacked (and its documented blind spots)

Two guards exist, and both share the same hole:

1. **Server** — `nexus_contains_answer` in
   `supabase/migrations/2026093010_server_authoritative_puzzles.sql`. Line 146–151:

   > `-- Answers shorter than 3 alphanumeric characters (F, X, 17) match far too`
   > `-- much ordinary prose to redact safely, so they are not matched at all.`
   > `-- Those nodes leak through whatTheySee/intermediateOutput instead; that`
   > `-- is puzzle design, not a transport bug, and is left for the game owner.`
   > `char_length(nexus_normalize(p_answer)) >= 3`

2. **Repo test** — `src/tests/case-content.test.ts`, line 313:
   `if (needle.length < 3) continue // the server does not match short answers either`

`nexus_normalize` strips every non-alphanumeric, so `17:47` → `1747`, `21:47` → `2147`,
`B7` → `B7`. **Consequence: any answer whose letters are separated by other characters, or
any answer shorter than three alphanumerics, is invisible to both guards.** The findings
under Test B below are attacks on exactly that seam — not on the literal-token check, which
does work.

---

## P0 — Correctness: an expert team reasoning correctly is rejected

### B1 · P27b ("The Memory Patch") — the canonical answer names the wrong register; the gate is unsolvable as written

**Test:** B (and A)
**Gate:** P27b
**Files / evidence:** `2026100606_investigation_rebuild_stage4.sql:78` (the `answer_metadata`
`fullSolution` and `acceptedAnswer`), and the served `observer`/`analyst`/`operator` payloads of
the same row. Matrix: `docs/NEXUS_CASE_MATRIX.md:1241-1271`.

**What is wrong.** The gate is a memory-patch puzzle: find the corrupted step, take *its register
address*, convert to two-digit upper-case hex, submit. Three player-visible strings fix step 1's
register as **ONE**:

- Observer `dataPayload`: `STEP 1, REGISTER ONE, INPUT ONE, WRITES STATE TWO - marked SUSPECT.`
- Analyst `dataPayload`: *"the write that must be patched is the one at step 1, and the patch
  console addresses registers in hexadecimal, two digits, upper case."*
- Analyst `intermediateOutput`: *"the register to patch is step 1's."*
- Operator `dataPayload`: *"ADDRESS: [ _ _ ]. The terminal takes a register address…"* and
  `taskPrompt` *"Convert the register address of the step to be patched into two-digit
  hexadecimal."*

Step 1's register is REGISTER ONE → hex **`0x01`**. But `acceptedAnswer` is **`0x02`**, and the
`fullSolution` (line 78) makes the error explicit:

> *"The patch target is step 1's own register, **register two in decimal**; the patch terminal
> takes two-digit upper-case hexadecimal, so the submitted address is **0x02**."*

`0x02` is **step 1's abbreviation-written state ("WRITES STATE TWO")**, not its register address.
The author appears to have read "STATE TWO" as "register two". The taxonomy's own intent agrees the
answer is a *register address*: matrix line 1252 — *"the two-digit hexadecimal register address the
map marks"* — and line 1258 — *"Observer reports the marked register."*

**Why it is broken rather than hard.** This is not ambiguity the player can out-think. A team that
executes the stated procedure exactly (register address of step 1 → `01`) is **rejected**; only a
team that repeats the author's mis-reading (address of the *written state* → `02`) passes. The gate
therefore *rewards the error it is built to punish* — the whole point of the puzzle (Test B,
"do not trust the SUSPECT flag; test each step against the assertion") is moot because the exit
condition contradicts the reasoning the gate demands.

**Repair (preserves difficulty).** Do **not** change `acceptedAnswer` to `0x01` and stop — that
silently repoints a shipped token. Instead pick one side and make the served strings and the answer
agree, keeping the decimal→hex conversion (the actual skill):

- Preferred: keep `0x02` as the answer, and change the *thing being converted* to the register that
  holds state two. The cleanest fix is to make the corruption a **write into a register numbered
  differently from its written state** — e.g. relabel the trace so the suspect step is
  `STEP 1, REGISTER TWO, INPUT ONE, WRITES STATE ONE` (register advanced instead of holding), or
  keep the current step table but rewrite every player-visible reference from "the register to
  patch is step 1's own" to "the register to patch is the one holding the wrong written state —
  register two". Then `0x02` is correct and the Analyst's inferred "re-simulation gives one, one,
  three, two" still holds.
- Whatever is chosen, the `fullSolution` at line 78 must be corrected too: it currently says both
  "step 1's own register" *and* "register two in decimal", which cannot both be true of the trace
  as printed.

**Severity: P0** — an incorrectly-scored gate, and the one gate whose published solution is
internally self-contradictory.

---

## P1 — Role-removal failures (one role alone solves the gate) and canon breaks

### B2 · P07 ("The Binary") — the Observer's payload spells the answer out, defeating role partition

**Test:** B
**Gate:** P07
**Files / evidence:** `2026100604_investigation_rebuild_stage2.sql` (P07 `observer.dataPayload`).
Answer `17:47` (`acceptedAnswer`, validation `null`).

**What is wrong.** The Observer's `dataPayload` reads:

> `DATA: two pairs, punched as ONE-SEVEN then FOUR-SEVEN.`

"ONE-SEVEN then FOUR-SEVEN" concatenated in the printed order is `17` then `47` → **17:47**, the
canonical answer, in the answer's own order. Because the letters `S-E-V-E-N` sit between/around the
digits, `nexus_normalize` yields `ONESEVENFOURSEVEN`, which does **not** contain `1747` as a
substring — so neither `nexus_contains_answer` nor `case-content.test.ts` flags it. This is the
documented sub-string seam, used against the case.

Worse, the Analyst's payload then removes the last any-team constraint by naming the category
outright: *"A field is a WALL-CLOCK STAMP when the epoch marker is set on it…"* and the Operator's
console *"accepts one wall-clock stamp in HH:MM."* So even a player who ignored the spelled digits
has the reading order (`HH:MM`) handed to them. One role (Observer) holds the value; a second
(Operator) holds the format; the Analyst's "field rules" add difficulty but are not load-bearing
for the *value*.

**Why it is unfair rather than hard.** Role isolation is the design premise ("Each role is meant to
hold one third of the puzzle", `2026093010:255-256`). A gate where a single role's screen prints
the answer in words is not a three-role puzzle; it is a reading exercise. The seam it relies on is
acknowledged in the code as known leakage.

**Repair (preserves difficulty, keeps the digits).** Keep the two-pair structure and the *digit*
content, but stop printing the number-words in answer order. Options:

- Print the pairs as **glyph/letter references that require the field rules**, e.g.
  `DATA: two pairs, punched on channels SEVEN-ONE then SEVEN-FOUR` (reverses each pair) — so the
  team must use the field rules to recover order. Still trivially readable though; better:
- Print the pairs as an **offset/cipher that the epoch marker resolves**, e.g. `DATA: two pairs,
  first pair carries the field mark; second pair is the first pair under the mirror offset`, with
  the offset read on the Operator's console. That restores the Analyst's role.
- Minimum viable fix that still closes B2: print the number-words **out of order** relative to the
  answer (e.g. `punched as FOUR-SEVEN … then … ONE-SEVEN` is wrong; instead give the pairs as
  *"a pair on the seven channel and a pair on the four channel"* plus a rule that fixes which is
  hour and which is minute), so the printed order no longer equals the answer order.

Any of these keeps 17:47 as the answer and keeps the "is it a time, a checksum, or a corrected
stamp" judgement intact.

**Severity: P1** — complete bypass of a Stage-2 gate by one role.

### B3 · P23 ("Two Clocks") — the Operator's payload alone determines `REINTERPRET`; role-removal test fails

**Test:** B
**Gate:** P23
**Files / evidence:** `2026100606_investigation_rebuild_stage4.sql` (P23 `operator.dataPayload`
and `hints`). Answer `REINTERPRET`.

**What is wrong.** The Operator's own `dataPayload` says:

> `…the directive is ELEVEN LETTERS, opens with RE-, closes with -PRET, and names the act of
> reading prior evidence inside the frame it was written in.`

Eleven letters, `RE-…-PRET`, "reading prior evidence inside the frame it was written in" is
`REINTERPRET` with no other plausible candidate. Hint 2 (*"add four hours and seventeen minutes"*)
then hands over the offset the Analyst is supposed to derive, and the Analyst's payload
(`add FOUR HOURS AND SEVENTEEN MINUTES to any civil time`) is the same fact repeated. The Observer
supplies the two conflicting reports — but their *content* (17:30 civil vs 21:47 house) is
restated in the Analyst card, so the Observer's screen is also skippable.

**Why it is unfair rather than hard.** Same premise as B2: the matrix's own role-removal test
(`NEXUS_CASE_MATRIX.md:1033`) claims *"without Analyst the memo's doctrine is unfound; without
Operator the verb is unknown."* In the shipped payload the Operator screen contains both the
definition **and** (via hint 2) the offset, so a solo Operator solves it. The gate does not test
coordination; it tests that one role can read.

**Repair (preserves difficulty).** Split the two facts the Operator currently holds:

- Move the **lexicon definition** (`ELEVEN LETTERS, RE-…-PRET, "reading prior evidence inside its
  own frame"`) to the **Analyst** screen (it is a transcription/doctrine card — it belongs there),
  and leave the Operator's plate with only the standing order (*"when an external report conflicts
  with a house record, do not choose between them — apply the directive"*) plus the empty field.
- Remove the offset from **hint 2** (it is the Analyst's `analystDiscovery` and should stay there),
  or reword hint 2 to *"the deck transcription card maps civil time to house time"* without stating
  the value. The offset is available on the Analyst screen; hint 2 currently duplicates it as a
  bypass.

The answer stays `REINTERPRET`; the difficulty is unchanged for a coordinated team and restored for
the solo Operator.

**Severity: P1** — same class as B2 (single-role bypass), on a difficulty-4.5 gate.

### B5 · P23b ("The Vent Route") — the Observer screen marks the answer live, so the register's counting is decorative

**Test:** B
**Gate:** P23b
**Files / evidence:** `2026100606_investigation_rebuild_stage4.sql` (P23b `observer.dataPayload`).
Answer `14`; validation `null` (sub-3, so unguarded — see D1).

**What is wrong.** The whole puzzle is *"which of the two plate stamps is the live route number?"*
Two candidates are shown (`14` and `41`) and the registering convention (count the straight runs) is
supposed to decide. But the **Observer payload states the decision outright**:

> `The 41 stamp has been struck through and restamped; the 14 stamp is fresh.`

A player holding only the Observer screen knows the answer is the *fresh* stamp, `14`. The Analyst's
straight-run count (I verified it: the inked route is exactly 14 distinct-direction runs) then merely
*confirms* a number the Observer already flagged as live. So the gate's inferential core — apply the
register convention — is skippable, and the answer `14` is a bare printed token that both the server
guard and `case-content.test.ts` skip because it is under three characters.

**Why it is unfair rather than hard.** The matrix's role-removal test for P23b (`:1065`) claims
*"without Analyst the certification is unfound."* In the shipped strings the certification is on the
Observer screen, and the Analyst's register only re-derives it. A gate that prints "the 14 stamp is
fresh" next to the field asking for the live route number is not a test of the counting convention.

**Repair (preserves difficulty, keeps `14`).** Move the liveness judgement off the Observer screen.
The Observer should record **the physical facts only** — e.g. *"the plate carries two stamped
numbers, 14 and 41; both are struck into the same face."* — and remove the clause that says which
one is fresh/restamped. Then the Analyst's register (and its "does not match any count" test)
becomes load-bearing again: the team must count the runs to discover that `14` is the live stamp and
that `41` matches no count. `14` remains the answer; nothing about the counting changes.

**Severity: P1** — single-role bypass on a Stage-4 gate, amplified by the sub-3 answer escaping both
guards.

### E1 · P23 — the rebuild silently changes the canonical offset from `+17:30` to `+4:17`, contradicting the Bible and repairing one documented contradiction while creating another

**Test:** E (continuity) / A
**Gate:** P23 (and its interaction with P02, P07)
**Files / evidence:** served `analyst.dataPayload` of P23 (`add FOUR HOURS AND SEVENTEEN MINUTES`);
`docs/NEXUS_CASE_BIBLE.md:100-103` (*"timestamps are shifted by 17:30 … the corrected time is
04:17"*); `docs/NEXUS_TIMELINE_AND_KNOWLEDGE_GRAPH.md` C4 (line 319) and §A.3 (lines 84-143).

**What is wrong.** Canon (Bible) fixes the archive offset at **+17:30**, and the timeline doc
records its own internal contradiction **C4**: *"`21:47 − 17:30 = 04:17` succeeds, but
`17:47 − 17:30 = 00:17`"* — i.e. the stated offset cannot produce `04:17` from `17:47` (the P07
answer). The rebuild's P23 replaces the offset with **+4:17**: *"add FOUR HOURS AND SEVENTEEN
MINUTES … the bulletin's departure time becomes 21:47 house time."* That makes
`17:30 + 4:17 = 21:47` *arithmetically* work, but it is a **different offset from the one the Bible
states**, and it is stated only in a Stage-4 payload that never reconciles with the Stage-2 framing.

**Classification.**

- P23's internal arithmetic (`17:30 + 4:17 = 21:47`) is **CONFIRMED** — it is self-consistent.
- P23 vs the Bible's `+17:30` offset is **CONTRADICTORY** — two canonical sources give different
  offsets, and the rebuild does not record the change as a rename/repair.
- The `04:17` motif's presence in the rebuild is **IMPLIED** (the offset's minutes are `:17`, and
  P24b keeps the corridor transcript at literal `04:17`), never **CONFIRMED** as the case's single
  true minute inside the rebuilt Stage-4 material.

**Why it matters (and why it is not merely a doc problem).** The case's stated authority
(`NEXUS_CASE_BIBLE.md:42`) makes `04:17` "the minute the network first held, and the minute
Subject 05 was lost" — the emotional and thematic centre. The rebuild leaves the player with two
irreconcilable time systems and no in-fiction instruction on which governs. A careful team will
notice `+17:30` and `+4:17` cannot both be the archive's offset, and will be unable to resolve it,
because the resolving fact exists only in a design doc the player never sees.

**Repair (preserves difficulty).** Do not invent a third offset. Reconcile forward:

- If `+4:17` is now the intended offset, add a one-line **in-fiction** justification and retire the
  old one: e.g. the deck card distinguishes *the migration offset* (`+17:30`, the false theory the
  Bible sells first) from *the transcription instruction actually printed on these bulletins*
  (`+4:17`), and states why they differ. That *uses* C4 as intended content — the false offset is a
  trap the case already wants to sell — instead of leaving it as an unreconciled bug.
- Update `NEXUS_CASE_BIBLE.md` and `NEXUS_TIMELINE_AND_KNOWLEDGE_GRAPH.md §A.3/C4` to record the
  rebuild's choice, so the docs stop certifying an offset the served content contradicts.

**Severity: P1** — canon contradiction in shipped, player-visible content, on the case's central
motif.

---

## P2 — Soft role-sufficiency, documentation drift, and fairness gaps

### B4 · P28 ("The Fragment") — the class word is operator-visible, so the Analyst's contribution collapses

**Test:** B
**Gate:** P28 (and its echo M04)
**Files / evidence:** `2026100606_investigation_rebuild_stage4.sql:84-86`. Served strings: operator
`dataPayload` *"FRAGMENT REGISTRY, artifact designation field"*; observer `dataPayload`
*"FRAGMENT RACK…"*; answer `FRAGMENT 5`.

**What is wrong.** The ledger form is *"the rack legend's series class word, one space, then the
accession number."* The **class word is printed in the observer and operator payloads as the
literal token `FRAGMENT`** (`FRAGMENT RACK`, `FRAGMENT REGISTRY`), and the *count* is stated by the
observer read-out (*"five accessions for four cylinders"*, restated in hints). The Analyst's
screen abstractly says *"the series class word"* and *"validators here always write the two parts
joined by a single space"* — i.e. it supplies only the separator convention, which the operator
screen also states (*"one space"*). So the answer `FRAGMENT 5` is reachable from observer + operator
without the Analyst.

**Why it is real but not a hard fail.** The gate still requires the *insight* (the fifth accession
is a subject, not a cylinder) and it correctly closes the historical trap (`FRAG 5` / bare `5` is
rejected). The infraction is quieter than B2/B3: one role (Analyst) is not load-bearing. The
matrix (`:1257`-style role-removal test) claims otherwise.

**Repair (preserves difficulty).** Do not rename the token. Either:

- Remove the literal word `FRAGMENT` from the **operator** screen (call it *"the rack registry"* /
  *"designation field"*), leaving the class word on the observer's legend only — so the operator
  must be told the word, restoring the Analyst's relay; **or**
- Keep `FRAGMENT` visible but make the **Analyst** own the *number*: move the *"five accessions for
  four cylinders"* count off the observer read-out and hints onto the Analyst's validator, so the
  Analyst owns the `5` and the observer owns the word. Either split restores the three-role relay
  without touching the answer.

**Severity: P2** — soft role-sufficiency; the gate still functions, but its coordination claim is
overstated.

### A1 · `docs/NEXUS_CASE_MATRIX.md` describes the *old* design for several rebuilt gates

**Test:** A / documentation drift
**Gates:** P23 (and by inspection the Stage-4 batch)
**Files / evidence:** matrix `:1017-1047` describes P23 as a **dictaphone memo** and a *"standing
order plate"* whose *"directive is read verbatim from the deck"* — but the shipped P23 is a
**transcription card** (civil↔house offset) with two conflicting reports. The matrix's *decisive
inference* (*"read the house record again"*) and *analyst evidence* (*"the dictaphone memo records
the same doctrine"*) name evidence that does not exist in the served payload.

**What is wrong.** The matrix is the per-gate design authority. It now certifies evidence
(dictaphone memo REC-16, a "standing order plate" read verbatim) that the rebuild replaced with
different evidence (a transcription card, two reports, an offset). A reviewer — or an implementer
working from the matrix — will build against strings the players never see.

**Why it matters.** Not player-facing, so not P0/P1; but it is exactly the kind of drift the test
suite's own header warns about ("a green suite can never be read as 'the whole case was
rewritten'"). It undermines the matrix's authority as canon.

**Repair.** Regenerate the matrix from the rebuilt `content` / `answer_metadata` (the extractor
already used in this review produces the effective rows), or annotate each rebuilt gate with
"AUTHORITY: served content supersedes this section (rebuild `<file>`)". Keep the canonical answer
token lines — those match — but correct the evidence/objective/chain lines.

**Severity: P2** — offline documentation defect; no player impact.

### D1 · Sub-3-character answers escape both leak guards; seven are fair, one (`14`) is printed outright

**Test:** D (fair play) / B
**Gates:** the nine short/one-char answers — P04 `F`, P06 `17`, P06b `17`, P09 `17`, P12 `B7`,
P16 `15`, P22 `X`, P23b `14`, P34 `D`.
**Files / evidence:** `2026093010:146-151` (server skips them); `case-content.test.ts:313` (test
skips them).

**What is wrong.** These answers are invisible to both guards. For seven of the nine I verified this
is *harmless* — the answer is never printed and is genuinely derivable from visible facts:

- `P22 X` — the substring "X" occurs only inside ordinary words (`E-X-HIBIT`, `CROSS`), never as a
  standalone token; the gate requires the notation-key insight (cross = the never-solved quantity).
- `P04 F`, `P12 B7`, `P34 D`, `P06/P06b/P09 17`, `P16 15` — the answers are *derivable* but never
  printed: P04 makes the team identify which poster fails the closure-date test (the prompt never
  says "F"); P12 requires reading `ROW B, POSITION 7` as an unspaced accession `B7`; P34 requires
  picking the *first* of two omitted alphabet letters (`D`, not `H`).

But one sub-3 answer **is** printed as a standalone token: `P23b 14` (see B5) — the Observer payload
literally reads *"the 14 stamp is fresh."* Because both guards skip answers under three characters,
this is invisible to the test suite.

**Repair (no player change for the seven sound gates).** Two parts:

1. Fix P23b as described in B5 (move liveness off the Observer screen).
2. Add a targeted assertion to `case-content.test.ts` for the sub-3 answers that *is* meaningful:
   assert they do not appear as a **standalone token** (bounded by non-alphanumerics or string ends)
   in any `playerStrings()` value. That catches `"the 14 stamp is fresh"` without the false positives
   that motivated the blanket skip, and it makes the documented gap enforced rather than merely noted.

**Severity: P2** — latent for seven gates, *active* for P23b (B5). Reported because the case's own
tests explicitly disclaim it.

### F1 · Longest analyst payloads exceed a comfortable handset screen with no folding cue

**Test:** F (field practicality)
**Gates:** P28 (818 chars), P27b (812), M02 (724), P29 (697), P33 (694).
**Files / evidence:** `dataPayload` lengths of the `analyst` role block (measured from served
content); Player renders this in `src/features/player/`.

**What is wrong.** The Player is the handset device (`AGENTS.md`: "Player = handset, mobile-first
field device"). The longest Analyst blocks are 700–820 characters of dense forensic prose presented
as a single `dataPayload` string. On a phone this is a wall of text that a team standing in a
corridor will not read carefully; the puzzle-critical clause (e.g. P27b's *"the register to patch is
step 1's"*, or P28's *"the fifth accession… is a subject"*) is buried mid-paragraph. There is no
visible structure (bullet/list) in the payload strings themselves.

**Why it matters for fairness.** P27b's defect (B1) is *harder* to catch precisely because the
contradiction is buried in 812 characters; a team that skims will submit whatever the console
suggests. Dense payloads do not break a gate, but they materially raise the chance a correct team
misses the load-bearing sentence — which is a fairness cost, not a difficulty feature.

**Repair (preserves difficulty).** Split the longest `dataPayload` strings into **2–4 short
paragraphs** with the operative clause on its own line (the sandbox strings already contain
sentence boundaries; this is a formatting edit, not a content/answer change). Optionally have the
Player render `\n\n` as paragraph breaks. This changes no fact and no answer.

**Severity: P2** — presentation; interacts with P0/B1.

---

## P3 — Observations and latent risks (no action required to ship)

### E2 · P37 finale disposition is intentionally undetermined — not a bug

**Test:** E
**Gate:** P37
**Evidence:** `2026100607_investigation_rebuild_stage5.sql` carries a sentinel `###37###`;
`2026100609_finale_dispositions.sql` installs `acceptedAnswers: ["DELETE","RETAIN","SHARE"]`;
`2026100608_multi_answer_disposition.sql` implements multi-answer matching. The stage-5 sentinel
and its supersession are documented in-file.

**Assessment.** **CONFIRMED as intended.** The final decision is open by design — the case's thesis
("if the truth needs you alone, question it") requires the team to *choose*, not to match. Not
reported as a defect; recorded so a future reviewer does not re-raise it.

### E3 · `04:17` motif continuity after the offset change (P24b stays literal)

**Test:** E
**Gate:** P24b and the Stage-4 batch.
**Evidence:** P24b's transcript keeps literal `04:17` (Adrian, Veyr) and the camera power-down at
`04:15:03`; the answer is `VALE` and does not depend on the offset.

**Assessment.** **CONFIRMED in-fiction, UNRESOLVED across gates.** P24b's logic is internally sound
(after 04:15:03 there is no footage to review). But it keeps `04:17` as a bare literal while P23 has
just redefined the time system's offset. The two never reference each other, so the case's central
motif is asserted in one gate and re-derived inconsistently in another. Folding this into E1's
repair (one in-fiction statement reconciling the offsets) resolves both.

### A2 · Cross-gate token exposure is continuity, not a bypass — verified

**Test:** B / A
**Gates:** M02, M04.
**Evidence:** M02's observer panel lists the Stage-2 values raw (`17`, `17:47`, `DELTA`, `LIGHT`,
`ARCHWAY`, `B7`, `3425`); M04's observer restates the Stage-4 answers (`P22 X, P23 REINTERPRET, …`).

**Assessment.** **Not a finding.** Every value shown in M02 belongs to a gate the team has already
cleared in Stage 2 and the meta gate exists to *summarise* them; M04 likewise recaps Stage 4 with
`P28 [DESIGNATION SEALED]` correctly withheld. This is intended continuity ("every Stage 4 answer
converges here as evidence, not as a password", M04 `whyTeamworkMatters`). Recorded as
attacked-and-held.

---

## Held up under attack (verified sound; listed so coverage is honest)

I attacked these and could not break them within budget. They are recorded as passing, not as
"unexamined":

- **P01 P05 M01 / sub-3 short answers fairness** — P04 `F`, P12 `B7`, P34 `D`, P22 `X`: answers are
  derivable from visible facts and never printed (Test D pass; P23b `14` is the exception, see B5).
- **P25 `FILTER`** — row 17 job + class mask `F******` (six letters, first letter F); the mask does
  not name the word, and the pivot selection is the Analyst's. No single-role bypass found.
- **P26 `REFLECTION`**, **P27 `STRUCTURE`** — shard fragments / nine-node chain are recorded by the
  Observer but the *word* is only derivable via the Analyst's read-order / chamber-card step; the
  answers never appear as tokens in any role payload (spelled-out check negative). Held.
- **P16 `15`**, **P18 `3425`**, **P20 `2147`**, **P21 `ARCHIVE`** — the archive-notation step
  (binder/shelf/file → four figures) is load-bearing and owned by the Analyst/Operator split; the
  decimals are not pre-given. Held.
- **P24 `CONNECTION`**, **P24b `VALE`**, **M03 `SYMBOL`** — each requires a distinct inferential
  step (sequence-of-pulls; impossible-as-recorded statement; condition-vs-value mark) that no single
  role's payload completes. Held.
- **P29 `NEXUS IS AI`** — the two-card misfile judgement (blank object card vs stamped entity card)
  is the Analyst's; the answer is assembled from briefing word + two-letter class code, neither of
  which is printed whole by the Operator. Held.
- **M02 / M04 cross-gate recaps** — continuity, not leakage (A2). Held.

---

## Coverage statement — what this review did and did not examine

**Examined in depth (served strings read, role by role):** P04, P06b, P07, P07b, P08, P12, P15,
P16, P17b, P18, P21, P22, P23, P23b, P24, P24b, P25, P26, P27, P27b, P28, P29, P34, M01, M02, M03,
M04 — plus the leak machinery (`2026093010`, `case-content.test.ts`) and the timeline/Bible offset
canon. Sub-3 answers (P04, P06, P06b, P09, P12, P16, P22, P23b, P34) were run through a standalone-
token check against their own served strings.

**Examined for structure/consistency but not exhaustively re-derived:** P01–P03, P05, P06, P09–P11,
P13, P14, P19, P20, P30–P33, P35–P37. These were checked for the specific attack classes (literal
token leakage, spelled-out answers — all negative; sub-3-answer fairness; P37 sentinel). I did **not**
independently re-derive every answer from its evidence across all 47 gates; a wrong-but-plausible
canonical answer of the P27b kind could still exist in an unexamined gate. **P27b is proof that this
class of defect survives a green test suite**, so a systematic answer-vs-evidence audit of the
remaining gates is the natural next pass.

**Not performed:** runtime/DB execution (analysis is source-level against migrations and tests);
audio/asset pipeline; admin-side (Bureau terminal) screens; accessibility of the handset rendering
beyond the payload-length observation in F1.

**Bounded budget:** Test B was weighted heaviest (bypass paths) and yielded B1–B4; Test A/E yielded
E1–E3 and A1–A2; Test D/F yielded D1/F1. Findings are limited to what was verified against served
strings — nothing here is inferred from the design docs alone.
