# NEXUS — CONTENT MIGRATION SPECIFICATION

**Status:** implementation contract for the investigation rebuild.
**Design authority:** `docs/NEXUS_CASE_BIBLE.md` (wins on conflict).
**Current-state evidence:** `docs/audit/NEXUS_CURRENT_CASE_INVENTORY.md` (Checkpoint A).
**Authoring contract:** `docs/_rebuild/TEMPLATE.md`.
**Branch:** `investigation-rebuild`.

This document specifies, gate by gate, exactly what changes when the 43 playable
gates and 4 meta gates are rewritten as one evidence-driven investigation. It is
derived from the *current* seed content
(`supabase/migrations/2026092903_seed_puzzle_nodes.sql`,
`supabase/migrations/2026093035_audio_evidence_integration.sql`, plus the two
content repairs `2026100506` and `2026100507`) and the bible's per-gate redesign
intent (bible §9). Where the bible does not fix a value, this document writes
**UNSPECIFIED** rather than inventing it.

---

## 0. Schema note — what is allowed to change

The rebuild is a **content** rebuild, not an engine rebuild
(`docs/NEXUS_TRANSFORMATION_WORKLOG.md`, "Findings that changed the plan").

- Every content migration issues **only** `UPDATE puzzle_nodes SET content = ...,
  answer_metadata = ..., metadata = ... WHERE code = '...'`.
- No new tables are created. No column is added, dropped, or retyped.
- No `DROP`, `TRUNCATE`, `DELETE`, `ALTER TABLE`, or `INSERT` is used. See §5.
- The only non-`UPDATE` statement in the whole rebuild is the **additive
  `CREATE OR REPLACE FUNCTION submit_puzzle_answer(...)`** described in §4. A
  function body redefinition changes no stored data and preserves the existing
  signature, `SECURITY DEFINER`, and `SET search_path`.
- `code`, `title`, `stage`, `location`, `prerequisites`, `branches`, `rewards`,
  and `type` are **not** touched (TEMPLATE hard rule 6). Only `content`,
  `answer_metadata`, and `metadata` change.

---

## 1. Migration assignment (by stage)

| Migration file | Stage | Gates carried |
|---|---|---|
| `2026100603_investigation_rebuild_stage1.sql` | 1 — Intake | P01, P02, P03, P04, P05, M01 |
| `2026100604_investigation_rebuild_stage2.sql` | 2 — Records | P06, P07, P08, P09, P10, P11, P12, P13, P06b, P07b, M02 |
| `2026100605_investigation_rebuild_stage3.sql` | 3 — Classification | P14, P15, P16, P17, P17b, P18, P19, P20, P21, M03 |
| `2026100606_investigation_rebuild_stage4.sql` | 4 — Core | P22, P23, P23b, P24, P24b, P25, P26, P27, P27b, P28, P29, M04 |
| `2026100607_investigation_rebuild_stage5.sql` | 5 — Avalanche | P30, P31, P32, P33, P34, P35, P36, P37 (content + sentinel only) |
| `2026100609_finale_dispositions.sql` | 5 — Avalanche | P37 servable disposition set (`DELETE`/`RETAIN`/`SHARE`) |

The additive `submit_puzzle_answer` extension named in §4 is delivered by
`2026100608_multi_answer_disposition.sql`, which is a function migration, not a
content migration, and is therefore not listed above. The P37 content file
carries only a non-matching sentinel accepted answer; the servable disposition
set is installed by `2026100609_finale_dispositions.sql` (see §7).

A gate's carrying file is fixed by its **stage**, never by its current position
in the chain. `P06b`/`P07b` travel with Stage 2 because that is their stage;
`P17b` with Stage 3; `P23b`/`P24b`/`P27b` with Stage 4.

---

## 2. Gate-by-gate mapping table

Columns:
- **OLD answer** = the *current runtime* value of `answer_metadata.acceptedAnswer`
  (after `2026100506`/`2026100507`).
- **OLD source** = the **player-visible field(s)** that carried the answer (the
  leak); `AM-only` means the answer lived only in the server-only
  `answer_metadata` and was *not* leaked to a player string.
- **CHANGE** = `same` (byte-identical token) | `retargeted` (same evidence chain,
  token corrected to canon) | `replaced` (different token/answer set).
- **MIG** = carrying migration from §1.

### Stage 1 — Intake (`2026100603`)

| OLD code | OLD title | OLD answer | OLD source (leaking field) | NEW answer | CHANGE | Justification | MIG |
|---|---|---|---|---|---|---|---|
| P01 | The Facade | `CDFDEFF` | `hints[2]` ("first two letters are C and D"), `analyst.intermediateOutput`, `operator.intermediateOutput`, `coordinationChain.operatorExecutes` | `CDFDEFF` | same | Token already follows from the archive-run classification; bible §9 keeps it. Leak fields are rewritten so the run format, not the answer, is stated. | 2026100603 |
| P02 | The Clock | `21:47` | `hints[2]` ("Submit 21:47."), `analyst.intermediateOutput`, `coordinationChain` | `21:47` | same | Hand-reset tower proves the lobby reading; token unchanged. False theory B re-frames `17:47`/`21:47` but does not alter this gate. | 2026100603 |
| P03 | The Facade Pin | `3425` | `hints[2]` ("Submit 3425."), `analyst.intermediateOutput`, `coordinationChain` | `3425` | same | Token retained and *re-scoped*: from "a cipher PIN" to the Bureau case-file reference 34-2-5 (bible §5, false theory A). | 2026100603 |
| P04 | The Poster Dates | `F` | `hints[2]` ("Submit F."), `analyst.intermediateOutput` | `F` | same | Token follows from the later-dated poster / insertion inference (bible §9). | 2026100603 |
| P05 | The Third Figure | `VEY` | `hints[0]` ("is Dr. Lina Vey"), `hints[1]`, `analyst.intermediateOutput`, `coordinationChain` | `VEYR` | **retargeted** | Canonical lead is **Dr. Lina Veyr** (bible §2). The seed truncated the surname; the old deduction was also vacuous because the hint stated the answer. | 2026100603 |
| M01 | The First Lock | `LIGHT` | `hints[2]` ("Submit LIGHT."), `observer.dataPayload`, `analyst.dataPayload` | `LIGHT` | same | Token retained and re-scoped from a vague "illumination" theme to the Bureau evidence class "observed under ambient/night light" (bible §9 M01). | 2026100603 |

### Stage 2 — Records (`2026100604`)

| OLD code | OLD title | OLD answer | OLD source (leaking field) | NEW answer | CHANGE | Justification | MIG |
|---|---|---|---|---|---|---|---|
| P06 | The Pivot | `17` | `hints[1]`/`hints[2]`, `analyst.intermediateOutput`, `coordinationChain` | `17` | same | Token retained; the incident is now a subject-register pivot, not a bare date day. | 2026100604 |
| P07 | The Binary | `17:47` | `hints[2]` ("Submit 17:47."), `analyst.dataPayload` (post-repair `IS:44721`), `coordinationChain` | `17:47` | same | Token retained; the log's own epoch marker is the decisive inference. False theory B explains *why* the shifted time is misleading. | 2026100604 |
| P08 | The Vector | `DELTA` | `hints[2]` ("Submit DELTA."), `analyst.dataPayload`, `coordinationChain` | `DELTA` | same | Token retained; resolved by the vault index rather than a self-declared mapping. | 2026100604 |
| P09 | The Chronology | `17` | `hints[2]` ("Submit 17."), `analyst.intermediateOutput` | `17` | same | Token retained; custody gaps clustering at one minute is the new inference. | 2026100604 |
| P10 | The Blue Door | `LIGHT` | `hints[0]` ("BLUE = LIGHT"), `hints[2]`, `analyst.intermediateOutput` | `LIGHT` | same | Token retained and re-scoped to the Bureau class (bible §9 P10), linking to M01. | 2026100604 |
| P11 | The Symbol | `ARCHWAY` | `hints[1]`/`hints[2]`, `analyst.intermediateOutput` | `ARCHWAY` | same | Token retained; the glyph is a containment symbol, matched to the scheme. | 2026100604 |
| P12 | The Armrest | `B7` | `hints[2]` ("Submit B7."), `analyst.intermediateOutput` | `B7` | same | Token retained; resolved against the lab's specimen register. | 2026100604 |
| P13 | The Laboratory | `3425` | `hints[1]`/`hints[2]`, `analyst.dataPayload`, `coordinationChain` | `3425` | same | Token retained; re-scoped: the repeated pull is the programme's own folder (the case-file reference), not theft. | 2026100604 |
| P06b | Time Remaining | `17` | `hints[1]`/`hints[2]`, `analyst.intermediateOutput` | `17` | same | Token retained; the lab's own log convention is the new inference. | 2026100604 |
| P07b | The Network | `CONNECTION` | `hints[1]`/`hints[2]`, `analyst.dataPayload`, `coordinationChain` | `CONNECTION` | same | Token retained; edges are people (the subject lattice), matching the glyph scheme. | 2026100604 |
| M02 | The Network Meta | `CONNECTION` | `hints[2]` ("Submit CONNECTION."), `analyst.dataPayload` | `CONNECTION` | same | Token retained; every Stage-2 exhibit becomes an edge in one dependency graph. | 2026100604 |

### Stage 3 — Classification (`2026100605`)

| OLD code | OLD title | OLD answer | OLD source (leaking field) | NEW answer | CHANGE | Justification | MIG |
|---|---|---|---|---|---|---|---|
| P14 | The Memory Bank | `VECTOR` | `hints[2]` ("Submit VECTOR."), `analyst.dataPayload` | `VECTOR` | same | Token retained; the index is keyed by subject. | 2026100605 |
| P15 | The Cipher Wheel | `3425` | `hints[1]`/`hints[2]`, `analyst.intermediateOutput`, `coordinationChain` | `3425` | same | Token retained; the wheel has seven positions, so it is a classification dial, not an alphabet cipher. | 2026100605 |
| P16 | The Auditorium | `15` | `hints[2]` ("Submit 15."), `analyst.intermediateOutput` | `15` | same | Token retained; the roll's own tally is the decisive inference. | 2026100605 |
| P17 | The Audio Log | `ECHO` | `hints[2]` ("Reverse it: ECHO."), `hints[3]`, `analyst.dataPayload`, `coordinationChain` | `ECHO` | same | Token retained; resolved by the room impulse response, and hint count trimmed to 3. | 2026100605 |
| P17b | The Echo Fold | `COUNT THE DOORS NOT THE CLOCKS` | AM-only | `DOORS` | **replaced** | The old token is a **designer-wording sentence** produced by rail-fence + Atbash (an arbitrary cipher stack, bible §5). The answer is replaced by the short canonical token `DOORS`, derivable from the record's own reading instruction (bible §9: "an instruction on the record itself"). | 2026100605 |
| P18 | The Pattern Lock | `3425` | `hints[1]` ("It was the P03 PIN."), `hints[2]` | `3425` | same | Token retained; re-scoped to the archive classification token, again. | 2026100605 |
| P19 | The Archive | `SUBMERGE` | `hints[2]` ("Submit SUBMERGE."), `analyst.intermediateOutput` | `SUBMERGE` | same | Token retained; the survey register is the decisive inference. | 2026100605 |
| P20 | The Symbol Sequence | `2147` | `hints[2]`/`hints[3]` (four hints; lists positions), `analyst.dataPayload` | `2147` | same | Token retained; glyph order equals subject order, and hint list is trimmed to 3. | 2026100605 |
| P21 | The Final Clue | `ARCHIVE` | `hints[1]`/`hints[2]`, `analyst.intermediateOutput` | `ARCHIVE` | same | Token retained; the archive floor plan is the decisive inference. | 2026100605 |
| M03 | The Symbol Meta | `SYMBOL` | `hints[1]`/`hints[2]`, `analyst.dataPayload` | `SYMBOL` | same | Token retained; re-scoped: seven glyphs classify *how a subject was held* (containment classification). | 2026100605 |

### Stage 4 — Core (`2026100606`)

| OLD code | OLD title | OLD answer | OLD source (leaking field) | NEW answer | CHANGE | Justification | MIG |
|---|---|---|---|---|---|---|---|
| P22 | The Hidden Layer | `X` | `analyst.whatTheySee` ("the 24th letter is X") and (pre-`2026100507`) `hints[1]`/`hints[2]` | `X` | same | Token retained; the mark is a *correction*, not a symbol (bible §9). Residual leak in `analyst.whatTheySee` must be removed by the rewrite. | 2026100606 |
| P23 | The Reinterpretation | `REINTERPRET` | `hints[1]`/`hints[2]`, `analyst.dataPayload` | `REINTERPRET` | same | Token retained; the two reports differ by the archive's offset. | 2026100606 |
| P23b | The Path Lock | `14` | AM-only | `14` | same | Token retained; resolved by the route register (alternating-axis BFS). | 2026100606 |
| P24 | The Cross-Reference | `CONNECTION` | `hints[0]`/`hints[1]`/`hints[2]`, `analyst.dataPayload` | `CONNECTION` | same | Token retained; the same file reference in all three departments is the decisive inference. | 2026100606 |
| P24b | The Audio Contradiction | `VALE` | AM-only | `VALE` | same | Token retained; the witnesses contradict at **04:17**, the true motif (bible §2, §9). | 2026100606 |
| P25 | The Overload | `FILTER` | `hints[2]` ("Look at line 17: FILTER. Submit FILTER."), `analyst.dataPayload` | `FILTER` | same | Token retained; re-scoped to the P06 pivot row. | 2026100606 |
| P26 | The Mirror II | `REFLECTION` | `hints[2]` ("Read across: REFLECTION. Submit REFLECTION."), `analyst.dataPayload` | `REFLECTION` | same | Token retained; the shards spell a word only when read together. | 2026100606 |
| P27 | The Dependency | `STRUCTURE` | `hints[1]`/`hints[2]`, `analyst.dataPayload`, `coordinationChain` | `STRUCTURE` | same | Token retained; root and leaf are the same person. | 2026100606 |
| P27b | The Code That Lies | `0x02` | AM-only | `0x02` | same | Token retained; the contradiction is the evidence (assertion contradicts the record). | 2026100606 |
| P28 | The Fragment | `FRAGMENT 5` | `hints[1]`/`hints[2]` ("Submit FRAGMENT 5.") | `FRAGMENT 5` | same | Token retained; resolved by the custody chain. | 2026100606 |
| P29 | The Revelation | `NEXUS IS AI` | `hints[1]`/`hints[2]` ("Submit NEXUS IS AI.") | `NEXUS IS AI` | same | Token retained; the three roles are NEXUS's inputs. Carries the *old* P37 revelation ("NEXUS IS AI") rather than the P37 climax. | 2026100606 |
| M04 | The Hidden Layer | `FRAGMENT 5` | `hints[1]`/`hints[2]` ("Submit FRAGMENT 5.") | `FRAGMENT 5` | same | Token retained; re-scoped: Fragment 5 **is Subject 05**, a person, not an object. Duplicate title "The Hidden Layer" with P22 remains a display collision to resolve in `metadata` (title is not changed). | 2026100606 |

### Stage 5 — Avalanche (`2026100607`)

| OLD code | OLD title | OLD answer | OLD source (leaking field) | NEW answer | CHANGE | Justification | MIG |
|---|---|---|---|---|---|---|---|
| P30 | The Transmitter Spire | `PULSE` | `hints[1]`/`hints[2]` ("Submit PULSE."), `analyst.dataPayload` | `PULSE` | same | Token retained; the pulse is the three of you. | 2026100607 |
| P31 | The Memory Array | `SYNC` | `hints[1]`/`hints[2]` ("Submit SYNC."), `analyst.dataPayload` | `SYNC` | same | Token retained; the array is occupied. | 2026100607 |
| P32 | The Three Phones II | `UNITY` | `hints[1]`/`hints[2]`, `analyst.dataPayload` | `UNITY` | same | Token retained; the devices are the pulses. | 2026100607 |
| P33 | The GM Key Protocol | `CONVERGE` | `hints[1]`/`hints[2]` ("Submit CONVERGE.") | `CONVERGE` | same | Token retained and already repaired (`2026100506` changed the seed's `CONVERGENCE` to `CONVERGE`). Re-scoped: the protocol is the failsafe. | 2026100607 |
| P34 | The Final Sequence | `D` | `hints[1]`/`hints[2]` ("Submit D.") | `D` | same | Token retained and already repaired (`2026100506` changed the seed's `C` to `D`). Re-scoped: the sequence is already running. | 2026100607 |
| P35 | The Final Choice | `AGREE` | `hints[2]` ("Submit AGREE.") | `AGREE` | same | Token retained; agreement is the third pulse. | 2026100607 |
| P36 | The GM Intervention | `META` | `hints[1]`/`hints[2]` ("Submit META.") | `META` | same | Token retained; re-scoped: the Bureau was always there. | 2026100607 |
| P37 | The Final Boss | `NEXUS` | AM-only | `DELETE` / `RETAIN` / `SHARE` (multi-answer) | **replaced** | The finale becomes the team's **moral decision** (bible §7): delete, retain, or share. All three are honoured. `NEXUS` as a token is retired here (it survives in P29 as `NEXUS IS AI`). Requires the additive server change in §4. | 2026100607 |

---

## 3. Preserved progression spine

**Reconciliation.** The current database holds 47 `puzzle_nodes`:

- **37 spine gates** — `P01`–`P37`;
- **6 b-gates** — `P06b`, `P07b`, `P17b`, `P23b`, `P24b`, `P27b`;
- **4 meta gates** — `M01`–`M04`.

**37 + 6 + 4 = 47.** The rebuild preserves **all 47**. No gate is removed, and no
gate is added. `code`, `title`, `stage`, `location`, `prerequisites`, `branches`,
and `rewards` are untouched (TEMPLATE hard rule 6), so the progression graph and
the QR mapping (`qr_nodes`, 47 rows) remain exactly as they are.

### 3.1 Spine mapping (old gate → new role)

"New role" = the gate's function in the redesigned investigation (stage +
narrative function). The new **question the stage answers** is from bible §8.

| OLD code | OLD title | Stage | Stage name | New role / function | Preserved |
|---|---|---|---|---|---|
| P01 | The Facade | 1 | Intake | Establish the archive's own classification format (kills "it is a decoration") | yes |
| P02 | The Clock | 1 | Intake | Establish time as evidence; hand-reset tower | yes |
| P03 | The Facade Pin | 1 | Intake | Introduce recurring token 3425; plant false theory A ("it is a code") | yes |
| P04 | The Poster Dates | 1 | Intake | Affordance: a record dated after closure = later insertion | yes |
| P05 | The Third Figure | 1 | Intake | Recover the lead's canonical name (Veyr) | yes |
| M01 | The First Lock | 1 | Intake | Synthesise Stage 1; define Bureau class LIGHT | yes |
| P06 | The Pivot | 2 | Records | Introduce pivot 17 via subject register | yes |
| P07 | The Binary | 2 | Records | Plant false theory B (17:47) via the shifted service log | yes |
| P08 | The Vector | 2 | Records | Access designation resolved by the vault index | yes |
| P09 | The Chronology | 2 | Records | Custody gaps cluster at one minute | yes |
| P10 | The Blue Door | 2 | Records | Recur "LIGHT" as a Bureau evidence class | yes |
| P11 | The Symbol | 2 | Records | Containment symbol matched to the glyph scheme | yes |
| P12 | The Armrest | 2 | Records | Specimen code from the lab register | yes |
| P13 | The Laboratory | 2 | Records | Repeated pull = the programme's own folder (case-file reference) | yes |
| P06b | Time Remaining | 2 | Records | Lab log convention (memory reinforcement) | yes |
| P07b | The Network | 2 | Records | Subject lattice: edges are people | yes |
| M02 | The Network Meta | 2 | Records | Every Stage-2 exhibit is an edge of one graph | yes |
| P14 | The Memory Bank | 3 | Classification | Index keyed by subject | yes |
| P15 | The Cipher Wheel | 3 | Classification | Seven positions, not an alphabet | yes |
| P16 | The Auditorium | 3 | Classification | Roll tally as ground truth | yes |
| P17 | The Audio Log | 3 | Classification | Room impulse response (ECHO) | yes |
| P17b | The Echo Fold | 3 | Classification | Instruction on the record itself (DOORS) | yes (answer replaced) |
| P18 | The Pattern Lock | 3 | Classification | Archive classification token, again | yes |
| P19 | The Archive | 3 | Classification | Survey register (SUBMERGE) | yes |
| P20 | The Symbol Sequence | 3 | Classification | Glyph order = subject order (2147) | yes |
| P21 | The Final Clue | 3 | Classification | Archive floor plan (ARCHIVE) | yes |
| M03 | The Symbol Meta | 3 | Classification | Glyphs classify how a subject was held | yes |
| P22 | The Hidden Layer | 4 | Core | The mark is a correction, not a symbol | yes |
| P23 | The Reinterpretation | 4 | Core | Reports differ by the archive's offset | yes |
| P23b | The Path Lock | 4 | Core | Route register (14) | yes |
| P24 | The Cross-Reference | 4 | Core | One file reference in three departments | yes |
| P24b | The Audio Contradiction | 4 | Core | 04:17 impossible as recorded (VALE) | yes |
| P25 | The Overload | 4 | Core | Filter by the P06 pivot row | yes |
| P26 | The Mirror II | 4 | Core | Shards spell a word only together | yes |
| P27 | The Dependency | 4 | Core | Root and leaf are the same person | yes |
| P27b | The Code That Lies | 4 | Core | The contradiction is the evidence | yes |
| P28 | The Fragment | 4 | Core | Custody chain (FRAGMENT 5) | yes |
| P29 | The Revelation | 4 | Core | The three roles are its inputs (NEXUS IS AI) | yes |
| M04 | The Hidden Layer | 4 | Core | Fragment 5 is Subject 05 (a person) | yes |
| P30 | The Transmitter Spire | 5 | Avalanche | The pulse is the three of you | yes |
| P31 | The Memory Array | 5 | Avalanche | The array is occupied | yes |
| P32 | The Three Phones II | 5 | Avalanche | The devices are the pulses | yes |
| P33 | The GM Key Protocol | 5 | Avalanche | The protocol is the failsafe | yes |
| P34 | The Final Sequence | 5 | Avalanche | The sequence is already running | yes |
| P35 | The Final Choice | 5 | Avalanche | Agreement is the third pulse | yes |
| P36 | The GM Intervention | 5 | Avalanche | The Bureau was always there | yes |
| P37 | The Final Boss | 5 | Avalanche | The team's moral decision (multi-answer) | yes (answer replaced) |

### 3.2 b-gates and meta gates

- **b-gates (`P06b`, `P07b`, `P17b`, `P23b`, `P24b`, `P27b`).** All six are
  preserved in their existing chain positions (`2026093035` rewired
  `P17 -> P17b -> P18`, `P23 -> P23b -> P24`, `P24 -> P24b -> P25`,
  `P27 -> P27b -> P28`). Only their `content`/`answer_metadata`/`metadata`
  change.
- **Meta gates (`M01`–`M04`).** All four are preserved as synthesis gates at the
  end of their stages. `M04` keeps its title "The Hidden Layer" (title is
  immutable), so the display collision with `P22` must be disambiguated in
  `metadata.storyReveal` / screen titles, not by renaming.

**Gates removed: none.** If any gate were ever dropped, this section would name
it and say why; no such removal is specified.

---

## 4. Server extension note — the multi-answer ending

The finale (P37) must honour three canonical dispositions
(`DELETE`, `RETAIN`, `SHARE`) without weakening any other gate. This is an
**additive** change to `submit_puzzle_answer` only.

**Mechanism.** `answer_metadata` gains an optional `acceptedAnswers` array
alongside the existing `acceptedAnswer`. Existing gates keep only
`acceptedAnswer` and behave exactly as today.

**Exact SQL semantics** (the corrected comparison block; everything else in the
function body is unchanged from `2026100601_operator_only_conclusions.sql`):

```sql
-- declarations (add one)
  v_accepted_list TEXT[];

  -- Normalize both sides identically: upper-case, trim, collapse inner runs
  -- of whitespace. (unchanged)
  v_normalized_answer := UPPER(TRIM(p_answer));
  v_normalized_answer := REGEXP_REPLACE(v_normalized_answer, '\s+', ' ', 'g');

  v_accepted := UPPER(TRIM(COALESCE(v_answer_meta->>'acceptedAnswer', '')));
  v_accepted := REGEXP_REPLACE(v_accepted, '\s+', ' ', 'g');

  -- NEW: every member of acceptedAnswers, normalized by the same rule.
  -- jsonb_array_elements_text on a missing key yields no rows, so a
  -- single-answer gate leaves this array empty.
  v_accepted_list := ARRAY(
    SELECT UPPER(REGEXP_REPLACE(TRIM(x), '\s+', ' ', 'g'))
    FROM jsonb_array_elements_text(
           COALESCE(v_answer_meta->'acceptedAnswers', '[]'::jsonb)
         ) AS t(x)
  );
  -- reject empty entries so an empty string can never match
  v_accepted_list := ARRAY(
    SELECT e FROM unnest(v_accepted_list) AS e WHERE e <> ''
  );

  -- Union: single token (unchanged) OR membership in the set.
  v_is_correct := (
       (v_accepted <> '' AND v_normalized_answer = v_accepted)
    OR (array_length(v_accepted_list, 1) IS NOT NULL
        AND v_normalized_answer = ANY (v_accepted_list))
  );
```

**Guarantees.**

- **Single-answer behaviour is byte-for-byte preserved.** For a gate with no
  `acceptedAnswers`, `v_accepted_list` is empty and the predicate reduces to the
  original `v_accepted <> '' AND v_normalized_answer = v_accepted`.
- **Both sides are normalised by the same rule** (UPPER → TRIM →
  whitespace-collapse), so `DELETE`, ` delete `, and `Delete` all match.
- **Membership test, not prefix/contains.** `ANY (v_accepted_list)` requires an
  exact normalised equality; there is no partial credit and no substring match.
- **Fallback to single.** If `acceptedAnswers` is absent, null, empty, or
  contains only empty strings, the gate falls back to the single
  `acceptedAnswer` branch.
- **Empty answers never match.** An empty submission still fails both branches.
- Every other behaviour is untouched: the role gate (Operator only, 403
  payload), the rate limiter, the atomic attempt claim and attempt-based points
  decay (full / half+1 / 0), the once-only `SOLVED` transition, the
  `branches->>'unlocks'` unlock, and the run-completion path. P37 unlocks
  nothing, so a correct finale submission already lands in the completion
  branch.

**Migration.** Delivered in `2026100608_multi_answer_disposition.sql` as a
`CREATE OR REPLACE FUNCTION submit_puzzle_answer(UUID, TEXT)` with the same
signature, `LANGUAGE plpgsql`, `SECURITY DEFINER`, and
`SET search_path = public, extensions, pg_temp` (restated inline because
`CREATE OR REPLACE` resets `SET` clauses — see `2026100601` header). Migration
history is immutable, so this is a forward redefinition rather than an edit of
`2026100601`.

---

## 5. Rollback note and data-safety statement

### 5.1 Rollback

Migration history is immutable, so rollback is **forward-only**: a new migration
(e.g. `2026100699_rollback_case_content.sql`) that restores the pre-rebuild
content. Two supported methods:

1. **Replay-from-history (preferred, no new tables).** The rebuild only changes
   `content`, `answer_metadata`, and `metadata`. The prior values of those three
   columns are fully recoverable from the immutable migration history because the
   inventory records the last writer of every field (`NEXUS_CURRENT_CASE_INVENTORY.md`
   §1.1, §1.2). A rollback migration therefore re-issues the last-writer
   statements for each field in dependency order:
   `2026092903` (base rows) → `2026093035` (four audio nodes, chain rewires,
   P17 audio keys) → `2026093036` (P17 audio URL fix) → `2026100506` (P33/P34
   keys) → `2026100507` (P07/P09/P15/P18/P22). Re-running those statements
   restores the exact prior `content` / `answer_metadata` / `metadata`.
2. **Snapshot restore.** If a byte-for-byte restore is required without replay,
   take a database snapshot immediately before `2026100603` and restore it. No
   rebuild migration creates a backup table (that would violate §0's "no new
   tables").

The `submit_puzzle_answer` extension needs no rollback of its own: reverting
`2026100608` re-applies the `2026100601` body (method 1) or a `CREATE OR REPLACE`
of the original body, and the `acceptedAnswers` branch is inert when no gate
carries that key.

### 5.2 Data-safety statement

- **No `DROP`, no `TRUNCATE`, no `DELETE`** in any rebuild migration.
- **No `ALTER TABLE`**, no column added/dropped/retyped, no new table, no new
  index, no new policy.
- The **only** write target is `puzzle_nodes.content`, `puzzle_nodes.answer_metadata`,
  `puzzle_nodes.metadata`, by `UPDATE ... WHERE code = '...'`.
- The **only** function change is an additive `CREATE OR REPLACE` of
  `submit_puzzle_answer` that preserves its signature, security posture, and
  all existing behaviour (§4).
- No production data is modified by the branch until the migrations are applied.
- Migration history is never edited; all changes are forward.

---

## 6. Gates whose ANSWER TOKEN CHANGED (exhaustive)

Exactly **three** gates change their canonical answer token. Every other gate
keeps its current token (the `same` rows in §2). The `same` gates still receive
completely new `content`/`metadata` — only their *answer token* is unchanged.

| # | Gate | Old token | New token | Why it had to change |
|---|---|---|---|---|
| 1 | **P05 The Third Figure** | `VEY` | `VEYR` | Canonical spelling of the lead researcher is **Dr. Lina Veyr** (bible §2). The old token was also deductively vacuous: the seed's hint literally stated "The redacted person is Dr. Lina Vey," so the gate tested reading, not elimination. Retargeted to the correct surname recovered from the signature block. |
| 2 | **P17b The Echo Fold** | `COUNT THE DOORS NOT THE CLOCKS` | `DOORS` | The old answer is a **designer-wording sentence** produced by an arbitrary two-stage cipher (rail-fence then Atbash). It is not evidence and cannot be reached without guessing the designer's phrasing (bible §5, §10 rule 5). Replaced by the short canonical token `DOORS`, read off the record's own instruction. |
| 3 | **P37 The Final Boss** | `NEXUS` | `DELETE` / `RETAIN` / `SHARE` (set) | The finale becomes the team's **moral decision** rather than a single-answer puzzle (bible §7). All three dispositions are honoured by the server (§4). `NEXUS` is retired here; the revelation it encoded survives in **P29** as `NEXUS IS AI`. |

**Historical note (not a rebuild change).** Two further tokens differ from the
*original seed* but are **already** the current runtime values and are therefore
**unchanged** by this rebuild:

- `P33`: seed `CONVERGENCE` → current `CONVERGE` (repaired by `2026100506`).
- `P34`: seed `C` → current `D` (repaired by `2026100506`).

The rebuild keeps both current values.

---

## 7. Defects eliminated by the rewrite (cross-cutting)

These are properties of the rewrite, not per-gate answer changes, but they are
contractual:

1. **Hint leakage.** The seed's `hints[n]` routinely read "Submit 3425." /
   "Submit 14." / "Submit NEXUS IS AI." etc. Every hint in the rebuilt content
   must escalate and never contain the answer (bible §10 rule 2; TEMPLATE rule 4).
2. **Answer leakage in non-hint fields.** Several gates carry the answer in
   `analyst.intermediateOutput`, `analyst.whatTheySee`,
   `coordinationChain.*`, or the role `dataPayload` (e.g. P22's
   `analyst.whatTheySee` still says "the 24th letter is X"). The rewrite removes
   the answer from **every** player-visible string (TEMPLATE rule 3); the answer
   lives only in `answer_metadata` (`acceptedAnswer` / `acceptedAnswers`).
3. **Relay gates.** Gates solvable by one role reading a value aloud (e.g. P02,
   P10, P16, P18) are rebuilt so each role contributes a discriminating fact and
   the role-removal test holds (bible §4).
4. **ASCII discipline.** The seed contains em dashes, box-glyph characters, and
   arrows. Rebuilt payloads are ASCII-only (TEMPLATE rule 1).
5. **Finale answer placement.** P37 is the only gate whose answer is a set rather
   than a word. Its rebuild file (`2026100607_investigation_rebuild_stage5.sql`)
   carries a non-matching sentinel accepted answer so the content file stays free
   of the literal disposition words; the servable set (`DELETE`, `RETAIN`,
   `SHARE`) is installed by `2026100609_finale_dispositions.sql`. The consumer
   function in `2026100608_multi_answer_disposition.sql` normalizes each member
   of `acceptedAnswers` by the same rule it applies to `acceptedAnswer`.

*End of content migration specification.*
