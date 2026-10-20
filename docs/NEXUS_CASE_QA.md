# NEXUS — CASE QA (logic, fairness and adversarial review)

**Status:** Phase 7 (role-removal / fairness) and Phase 9 (adversarial review).
Companion to `docs/NEXUS_CASE_BIBLE.md` (design authority),
`docs/NEXUS_CASE_MATRIX.md` (per-gate matrix) and
`docs/NEXUS_CONTENT_MIGRATION.md`.
**Branch:** `investigation-rebuild`.
**Database posture:** every migration named here is **prepared, not executed**
against any dev or production database. All results below are derived from the
migration sources and the automated validator, not from a live database.

---

## 0. What this document proves, and what it does not

This document records two independent passes over the built case:

- **Phase 7 — role-removal tests.** For every rebuilt gate, remove each of the
  three roles in turn and state the specific inference the team can no longer
  make. A gate passes only when all three removals lose a *distinct* inference.
- **Phase 9 — adversarial review.** Six hostile readings of the same case, each
  looking for a way to break it (leak the answer, trivialise it, break
  fairness, break the fiction, break progression, or break the difficulty
  promise).

It does **not** prove anything about runtime behaviour, because no migration in
this branch has run against a database. The automated validator
(`src/tests/case-content.test.ts`) and the invariant suite
(`src/tests/invariants.test.ts`) are the executable evidence; this document is
the reasoning that sits behind them and the record of what a database run would
have to confirm.

**Scope of the built case.** Stages 3-5 are fully built:
`2026100605_investigation_rebuild_stage3.sql` (P14, P15, P16, P17, P17b, P18,
P19, P20, P21, M03),
`2026100606_investigation_rebuild_stage4.sql` (P22, P23, P23b, P24, P24b, P25,
P26, P27, P27b, P28, P29, M04),
`2026100607_investigation_rebuild_stage5.sql` (P30, P31, P32, P33, P34, P35,
P36, P37), with the finale disposition set in
`2026100609_finale_dispositions.sql`. Stages 1-2
(`2026100603`, `2026100604`) were built and validated earlier; the same method
applies to them and is not repeated gate-by-gate below except where a Stage 3-5
gate depends on them.

---

## 1. The three role-removal tests

For each gate, three hypothetical teams are played: one with no Observer, one
with no Analyst, one with no Operator. The test asks: **what single inference
does the team lose that no other role supplies?**

### 1.1 Method

- The **Observer** removal tests whether the gate is anchored in the physical
  world. If a gate still works with no Observer, its evidence is not physical.
- The **Analyst** removal tests whether the gate needs a records/relationship
  step. If a gate still works with no Analyst, it is a reading relay, not an
  investigation.
- The **Operator** removal tests whether the gate needs an institutional or
  permission step, and whether the submission is genuinely the team's. If a gate
  still works with no Operator, the Operator is a courier, not a contributor.

A gate that fails any one removal is recorded as **WEAK** and must be corrected
before the gate is considered built. All rebuilt gates below are recorded as
**PASS**; any residual weakness is named explicitly rather than hidden.

### 1.2 Stage 3 results

| Gate | Remove Observer -> lost inference | Remove Analyst -> lost inference | Remove Operator -> lost inference | Verdict |
|---|---|---|---|---|
| P14 The Memory Bank | cells shown to be live per subject | glossary's containment class | register's filing class | PASS |
| P15 The Cipher Wheel | shared notation on wheel + wall | decomposition into binder/shelf/file | custody stamp's binder + shelf | PASS |
| P16 The Auditorium | rows vs occupied seats differ | register row = certified allocation | certified figure on the facilities row | PASS |
| P17 The Audio Log | waveform shows a repeat | class definition for a repeat | archive class register | PASS |
| P17b The Echo Fold | folds + imprinted wall plan | reading note: file by feature | class register's feature class | PASS |
| P18 The Pattern Lock | repeated accession notation | charge-out record to this room | reading-room register match | PASS |
| P19 The Archive | the marker's submerged condition | survey name for the condition | estates accessions register | PASS |
| P20 The Symbol Sequence | dome panel arrangement | notation decomposition | accession stamp binder + shelf | PASS |
| P21 The Final Clue | the window message | register shows repository keeps its plan | register releases the plan | PASS |
| M03 The Symbol Meta | answer-to-mark mapping | taxonomy class for that kind of mark | taxonomy register field | PASS |

### 1.3 Stage 4 results

| Gate | Remove Observer -> lost inference | Remove Analyst -> lost inference | Remove Operator -> lost inference | Verdict |
|---|---|---|---|---|
| P22 The Unknown of the Manifold | the open ledger field | manifold notation for an unknown | the one-character field | PASS |
| P23 Two Clocks | the standing-order plate | memo's doctrine | the directive verb field | PASS |
| P23b The Vent Route | the two candidate routes | register's certified live route | the vent route field | PASS |
| P24 The Second Condition-Mark | the corridor reference's joining | glossary name for that condition | cooling register filing | PASS |
| P24b The Witness | the room layout | recording excludes one statement | the witness field | PASS |
| P25 The Stream Gate | noise removed from the stream | manual's operation name | the operation field | PASS |
| P26 The Turned Beam | the beam leaving the surface | the surface sends it back (shard 2) | the reversed path (shard 3) | PASS (see 1.5) |
| P27 The Compiler | the graph's held relation | note 1: definition of the holding | note 2: the foundation name | PASS (see 1.5) |
| P27b The Memory Patch | the marked register | hexadecimal notation in the memos | the two-digit address field | PASS |
| P28 Operation Shatter | the object as one of a series | memo's series class word | the registry designation field | PASS |
| P29 The Mirror Entity | the entity card's reflection | briefing's name + class for the core | the identity query field | PASS |
| M04 Core Activation Protocol | the actuator's named target | registry designation of the 5th accession | the activation designation field | PASS |

### 1.4 Stage 5 results

| Gate | Remove Observer -> lost inference | Remove Analyst -> lost inference | Remove Operator -> lost inference | Verdict |
|---|---|---|---|---|
| P30 The Spire Coupler | the dark socket + board | the overlay of three traces | the carrier field | PASS |
| P31 The Vault Door | the meter against the order card | manual's three-readings rule | the three taps meeting once | PASS |
| P32 The GM Key | the "sees" shard | the "binds"/"acts" shards reconciled | the combined-key field | PASS |
| P33 The Failsafe | FAILSAFE not OVERRIDE | memo's seven-letter verb | the arming field | PASS |
| P34 The Protocol Initiator | the twelve frames + two blanks | the plate rule applied to frame 4 | the initiate field | PASS |
| P35 The Consent Console | the three consent fields | memo's exclusions (COMPLY/REFUSE) | the initiation field | PASS |
| P36 The Level Designation | broadcast rejecting physical names + plate | catalogue card's four-letter class | the designation field | PASS |
| P37 The Final Boss | archive/echo face + closing question | sum/structure face + three verdicts | key/lock face + the single submission | PASS |

### 1.5 Notes on the two gates that carry a shared-shard structure

P26 and P27 are the only gates whose team inference requires reading three
partial sources in concert (the three shard lines / the graph and two notes).
Their role-removal result is stated as **PASS** because removing any single role
loses an inference the other two cannot supply:

- **P26**: with two shards the team can prove the beam returns *from something*,
  but cannot rule out bending (shard 1 alone) or loss (shard 2 alone); the third
  shard is the elimination. Removing the Operator's shard leaves reflection and
  refraction both live.
- **P27**: the graph alone shows relation without a name; one note alone defines
  a holding arrangement without proving it is the compiler's foundation; the
  second note alone names the foundation without the relation. All three are
  required.

Neither structure is a three-password design: no shard contains a fragment of
the answer token, and no shard completion is itself a submission. The team
submits **once**, through the Operator, after the shards agree. This is the
"Avalanche principle" (bible §6) applied at gate scale.

### 1.6 The two structural invariants that hold across all gates

1. **Only the Operator submits.** Enforced in code by `2026100601` (operator-only
   submission, 403 for a non-Operator) and asserted by
   `src/tests/invariants.test.ts`. Observer and Analyst never receive a
   correctness verdict; the wrong-answer path returns one generic in-fiction
   refusal with **no role attribution**, so a wrong answer never blames a role.
2. **No three-password designs.** No gate is solved by assembling a submission
   from fragments held by different roles. Every rebuilt gate is solved by the
   team reaching **one** conclusion the Operator carries.

---

## 2. Adversarial review — six perspectives

Each perspective is a hostile reader with a specific goal. The finding records
whether the case survives, and names any residual exposure.

### 2.1 The Answer-Leak Hunter

**Goal:** recover the answer without solving, from any string a player can see.

**Attack surface:** role `dataPayload`, `whatTheySee`, `taskPrompt`,
`intermediateOutput`, `coordinationChain.*`, `operatorInvestigation.*`, the three
`hints`, `narrativeObjective`, `storyReveal`, `whyTeamworkMatters`,
`locationClue.clueText`, and `evidenceUnlocked.content`.

**Finding:** SURVIVES. The validator's per-gate leak check scans every
player-visible field and the answer's normalized form (upper-cased, non-alphanumerics
stripped, so spaces and hyphens collapse). It caught three real leaks during the
build of Stage 4 (`P26.intermediateOutput`, `P27.storyReveal`,
`P27b.evidenceUnlocked`) and two during Stage 5 (`P31.storyReveal` contained
"SYNCED"; `P36` operator `screenTitle` contained "Meta"). All five were rewritten.

**Residual exposure (accepted, documented):**
- `answer_metadata.fullSolution` contains the answer. This is **server-only**
  and is never delivered to a player: `2026100602` strips server fields from the
  player payload, and the leak scan deliberately excludes `fullSolution`. It is
  legal for it to name the answer.
- P37's literal disposition words (`DELETE`, `RETAIN`, `SHARE`) are kept out of
  the rebuild file entirely. The rebuild file carries a sentinel accepted answer
  (`###37###`) that no player input can match; the servable set lives only in
  `2026100609_finale_dispositions.sql`, in the `acceptedAnswers` array. The
  destructive-SQL scan would otherwise have flagged the word `DELETE`; the
  separation keeps a content file free of a word that is both an answer and a
  SQL verb.

**Needle traps verified present:** `REFLECTION` (P26 shards never concatenate to
it), `STRUCTURE` (P27 avoids "structured"), `0X02` (P27b avoids `0x02` in
player strings), `FRAGMENT5` (P28/M04 use "the fifth accession" / series class
word), `NEXUSISAI` (P29), `PULSE`, `SYNC`, `UNITY`, `CONVERGE`, `AGREE`, `META`.

### 2.2 The Trivialiser

**Goal:** solve every gate without leaving a chair, by pattern-matching the
content or reusing one trick.

**Finding:** SURVIVES with one documented deviation.
- The Stage-3 gates reuse the archive's notation across P15, P18 and P20, but
  each requires a *different* reading of it (wheel notation, charge-out record,
  accession stamp), so recognising the notation is necessary but not sufficient.
- Stage 4 replaces the seed's cipher-stack gates with deduction gates (P23's
  doctrine, P24b's impossibility, P27's relation). There is no shared cipher key
  the team can lift once and reuse.
- **Documented deviation:** P31's seed design was a multiple-choice question.
  The rebuild re-scoped it to the three-tap / occupancy-meter deduction because
  an MCQ is solvable by elimination. The deviation is recorded in the migration
  header (`2026100607`, P31) rather than presented as a like-for-like rewrite.

### 2.3 The Fairness Auditor

**Goal:** find a gate where a wrong-but-reasonable answer is punished unfairly,
or where the team cannot tell what is wrong.

**Finding:** SURVIVES.
- Every gate's wrong-answer path returns the same generic in-fiction refusal,
  with no role named and no partial credit revealed (`2026100601`).
- Acceptable-answer surface is tight where it must be: P15/P18 accept the bare
  accession (`3425`), P27b accepts the two-digit hex address, P28/M04 accept the
  ledger designation. The validator enforces short canonical answers so a gate
  is never failed for ordering or punctuation.
- The one asymmetric risk — the finale — is handled by a **set**: any one of
  `DELETE`, `RETAIN`, `SHARE` is honoured (`2026100608` normalizes each member
  of `acceptedAnswers` with the same rule it applies to the single answer). No
  disposition is "more correct" mechanically, matching bible §7.

### 2.4 The Fiction Auditor

**Goal:** find canon drift, a place where the rebuild contradicts the bible or
introduces a term the fiction has not earned.

**Finding:** SURVIVES. Canon anchors are preserved: Project NEXUS, Lina Veyr,
the Bureau, 04:17, the Observer/Analyst/Operator triad, the canon line "If the
truth needs you alone, question it" (carried into P37's `storyReveal` and the
`ENDING-CERTIFICATE`), and the final delete/retain/share decision (bible §7).
The rebuild's vocabulary is consistent — ERASE/KEEP/RELEASE appear in the
player-facing console, while the servable tokens are the disposition words held
server-side.

**Residual exposure (accepted):** Stage 3-5 use an "archive notation"
(binder/shelf/file) and "condition-mark" vocabulary that the seed did not use in
those exact words. This is the rebuild's chosen register (bible §10), applied
consistently; it is a deliberate extension of the canon, not a contradiction of
it, and is flagged here so it is not mistaken for pre-existing canon.

### 2.5 The Progression Auditor

**Goal:** find a gate whose wiring breaks the chain, or an answer change that
strands a downstream clue.

**Finding:** SURVIVES. The validator enforces that every rebuilt gate preserves
its seed wiring: `locationClue.nextQrNode`, the dash-folded
`nextPhysicalLocation`, the seed `type`, and the `evidenceUnlocked.id`. Only
three answer tokens change across the whole rebuild (P05 `VEYR`, P17b `DOORS`,
P37 the disposition set); every cross-gate answer mention was checked so no
downstream clue still expects the old token. P37's `nextQrNode` is JSON `null`
and its `nextPhysicalLocation` is `GAME END`, matching the seed ending.

**Residual exposure (accepted):** several `nextQrNode` values collide across
gates (e.g. `QR-NODE-24`). This is a seed wiring property, preserved by design,
not introduced here; it is recorded in `NEXUS_CASE_MATRIX.md` §0.

### 2.6 The Difficulty Skeptic

**Goal:** show the "elite difficulty" claim is actually trivia and
code-reading with new wallpaper.

**Finding:** SURVIVES with an explicit claim to defend. Difficulty now comes
from **competing hypotheses and elimination**, not from ciphers:
- P22 must reject four tempting readings of the open ledger field.
- P23 must reject "trust the report" and "trust the record" for the house's
  actual doctrine.
- P24b must isolate the single physically impossible statement.
- P33 must reject "override" and "shutdown" for the failsafe.
- P35 must reject COMPLY (proxy) and REFUSE.
- P36 must reject every physical name for the site.
Each red herring is **falsifiable from in-fiction evidence**, so a team that
loses can always learn why — the bible's fairness requirement (§10).

**Where the claim is weakest:** P15, P18 and P20 share the archive notation. A
team that has internalised it will move faster through those three. They are
retained because each still requires a distinct records step (see 2.2), but this
is the thinnest seam in the difficulty argument and is named here rather than
smoothed over.

---

## 3. What a database run must still confirm

Because no migration here has executed, the following are **unverified against a
live database** and are listed as the acceptance checks for the first real run:

1. Every `UPDATE puzzle_nodes ... WHERE code = 'XX'` affects exactly one row
   (each file uses a unique `code`, and all `code` values exist in the seed).
2. `answer_metadata.acceptedAnswers` is read by
   `submit_puzzle_answer` and every member matches on a normalized compare
   (P37 accepts `DELETE`, `RETAIN`, `SHARE`; a sentinel `###37###` never matches).
3. The sentinel in `2026100607` is overwritten by `2026100609`, so P37 has the
   servable set after the full chain applies in order.
4. ASCII-only payloads survive the database round-trip byte-for-byte.

Until those run, the honest status is: **built, validated statically, prepared,
not executed.**

---

## 4. Verdict

- **Phase 7 (role-removal):** 30 rebuilt gates in Stages 3-5 pass all three
  removals (Stage 1-2 gates passed the same test earlier). Two gates (P26, P27)
  are shared-shard gates and are argued explicitly in §1.5.
- **Phase 9 (adversarial):** all six perspectives survive; every residual
  exposure is named above rather than suppressed.
- **Automated evidence:** `src/tests/case-content.test.ts` all-green;
  `src/tests/invariants.test.ts` all-green; full suite 1582 passed; typecheck 0;
  lint 0; build 0.
- **Open deviation:** P31's MCQ-to-deduction re-scope (documented in the
  migration header).
- **Database:** prepared, not executed.
