# NEXUS — REDESIGN DECISION RECORD (RDR-001)

**Status:** decision record for the investigation rebuild on branch
`investigation-rebuild`.
**Date:** 2026-10-19.
**Decision owner:** redesign authoring (this branch).
**Scope:** choose the *structural* design of the 47-node case — what a "gate" is,
how the three roles share it, and how the case is proven. Content wording is out of
scope (governed by `docs/NEXUS_CASE_BIBLE.md` and `docs/_rebuild/TEMPLATE.md`).

**Authority.** The design authority is `docs/NEXUS_CASE_BIBLE.md` (the bible). This
record does not overrule the bible; it **documents the choice the bible already
embodies**, against two genuine alternatives, so the choice is auditable. Where the
record disagrees with the bible, the bible wins and the change belongs in
`NEXUS_CANON_LEDGER.md` — **which does not exist in this repository** (glob-confirmed;
see `docs/NEXUS_TIMELINE_AND_KNOWLEDGE_GRAPH.md`, §D.3).

---

## 1. Problem statement

The current build is **43 playable gates + 4 meta gates** (inventory
`docs/audit/NEXUS_CURRENT_CASE_INVENTORY.md:34-51`). The engine is sound; the content
is not (worklog `docs/NEXUS_TRANSFORMATION_WORKLOG.md:31-43`):

1. **Most gates are code-reading, not investigation.** The material *states* the
   answer. Difficulty comes from ciphers and trivia — exactly what the rebuild
   prohibits (bible `:18-20`; worklog `:35-37`).
2. **Hint 3 leaks the answer.** The original seed's third hint routinely reads
   "Submit 3425." (bible `:169`; `TEMPLATE.md:14`).
3. **The two central "codes" are wrong.** The recurring `3425` is treated as a
   cipher and the recurring time as `17:47`; neither is true (bible `:89-108`).
4. **There is no shared, provable thesis.** The 47 nodes do not yet assemble into
   one eliminable conclusion; the team is not *deducing*, it is *transcribing*.

The design problem is therefore: **what structure turns each of the 47 nodes into a
bounded, eliminable investigation that no single role (and no pair of roles) can
solve alone, without turning the game into a relay?**

### Constraints (non-negotiable)

- **Three roles, one submitter.** Observer / Analyst / Operator are the only roles
  (`src/types/domain.ts:10,12`); only the Operator may submit
  (`2026100601_operator_only_conclusions.sql:89-93`).
- **Unsolvable by one, and by any two.** Each gate must require all three domains
  (bible `:79-82`).
- **Anti-relay.** No role's material may be a restatement another role could read
  aloud (bible `:84-85`, `:255-257`).
- **Fair-play contract.** Every fact needed is in evidence; no reliance on the
  designer's wording (mystery craft `docs/research/mystery-design-craft.md:104-164`).
- **Canon fidelity.** 2021 / 2024, `04:17`, the `3425` file reference, and the
  delete / retain / share ending (bible `:32-46`, `:132-145`).
- **No schema change required.** The rebuild is a *content* rebuild; the mechanics
  are already correct (worklog `:31-34`).

---

## 2. Candidate directions

Three genuinely different structures were developed. Each is a whole-game frame, not
a feature toggle.

### Candidate A — Bounded reconstruction

**Mechanic.** Every gate is a **bounded reconstruction**: an incident with two to
four competing explanations, each backed by real evidence, where exactly one
survives. The team *eliminates* alternatives; it does not guess or decode (bible
`:18-20`). The three roles hold the three domains — physical (Observer), records
(Analyst), institutional (Operator) — and the gate is only solvable when all three
contribute a *discriminating* fact (bible `:73-82`). The submission stays
Operator-only; the other two solve privately and speak the result.

**Fiction.** The team is three Candidates on a Bureau accreditation, auditing the
disappearance of Dr. Lina Veyr and a sealed programme called Project NEXUS. The
fiction *is* the method: the Bureau is a records institution, so the case is
literally made of records, testimony and custody stamps (bible `:12-25`, `:50-65`).
The two false theories — `3425`-as-code and `17:47`-as-key-time — are sold first and
eliminated by evidence, ending in the re-read of `04:17` (bible `:89-108`).

**What makes each gate an investigation.** The gate presents *live alternatives* and
an elimination, so the team's work is reasoning under uncertainty (mystery craft
`:236-273` — a fair red herring is a real possibility that turns out false, with a
legitimate explanation). The fairness contract is the standard the whole genre uses
(Knox / Van Dine; mystery craft `:102-164`), and the Three-Route Rule — every
conclusion reachable by more than one route — is the redundancy that makes a wrong
theory *die* rather than merely be contradicted (mystery craft `:200-220`). The
re-emphasis inversion — "the same facts, re-read" — is the emotional centre
(bible `:103-105`; cinema `docs/research/investigative-cinema.md:414`).

**Cost.** Moderate. It fits the existing schema exactly: three role blocks plus
`coordinationChain`/`operatorInvestigation` already exist per node (worklog `:38-40`);
`2026100602` already ships only the requesting role's block. The cost is **authoring
and validation effort** for 47 nodes, plus a content validator that enforces the
"answer never appears / hints never solve" rules (worklog `:25`).

**Risk.** The chief risk is **authorial unfairness**: an elimination that only works
if the player uses the designer's exact wording. The bible closes this with rule 5
("short canonical tokens, never a phrase that depends on the designer's exact
phrasing", `:258-259`), and the server normalizes both sides
(`2026100601:161-173`). A secondary risk is that a "reconstruction" with only one
consistent explanation becomes trivia; the bible's rule 3 (two or more hypotheses
must stay live) is the guard (`:253-254`).

### Candidate B — Records forensics (Obra Dinn / Golden Idol)

**Mechanic.** Replace per-gate submissions with a **commit-based deduction matrix**:
a book of fates with a row per person/event and columns for role, place, time and
method, where a set of entries is only confirmed once the whole group is correct
(deduction games `docs/research/deduction-and-detective-games.md:105-170`). The
shared object is a slot board, as in *The Case of the Golden Idol*
(`deduction-and-detective-games.md:29-100, 545`); the NEXUS-specific adaptation is a
**Person × Role × Location × Time × Method** grid whose confidence is "how many
independent routes confirm it" (`:560-572`).

**Fiction.** The team is filling in the Bureau's **fate ledger** for the NEXUS
cohort — the same fiction as A, but the artefact on screen is a matrix the team
*writes*, not a string the Operator *submits* (deduction games `:545-546`).

**What makes each gate an investigation.** Batched confirmation is the mechanic
that makes wrong theories survive: the game does not tell a role after each clue
whether it is right, so the team must hold a provisional model and refine it
(deduction games `:135-136, 162`). Genuinely ambiguous shared roles and revisitable
evidence give retroactive ahas (`:546`). This is the strongest *mechanic* for
elimination found in the research.

**Cost.** High. It needs a new persisted board object and a new confirmation RPC —
i.e. **schema/engine work the constraints say is unnecessary** (worklog `:31-34`).
The 60-identity scale of Obra Dinn is more cast than the case has, and
all-or-nothing per-entry scoring conflicts with the existing points-decay model
(`2026100601:177-182`; deduction games `:170`).

**Risk.** The documented failure modes are severe for a 3-player phone game: a
**single-brain mental model**, a **full word bank** that hands over the nouns, and
silent diegetic onboarding (deduction games `:95-100, 168`). Batched confirmation
also lets a wrong entry sit undetected for a long time (`:135-136`).

### Candidate C — Institutional process simulator

**Mechanic.** Make the **Bureau itself** the puzzle. Each gate is a *process*
decision — a permission to grant, an audit trail to reconstruct, a custody transfer
to authorise — and truth emerges from the institution's own procedures rather than
from a single eliminable incident. The Operator's domain (permissions, systems,
classifications, access; bible `:77`) becomes the primary mechanical surface, and
the other two roles feed it.

**Fiction.** The team plays the institution that covered up NEXUS. The conspiracy is
not a hidden fact to find but a **routine** the team reproduces, which is the
invasion-of-routine structure the cinema research identifies as the strongest form
of accretive dread (`docs/research/investigative-cinema.md`; bible `:52-53`, "the
Bureau... complicit in fact").

**What makes each gate an investigation.** The team must decide *who was allowed to
do this*, which forces reasoning about authority, not just facts (bible `:77`). Two-
phase private-solve-before-joint-resolve is the strongest documented anti-relay fix
(cooperative asymmetry `docs/research/cooperative-asymmetry-games.md:244, 474`), and
the process framing uses it naturally.

**Cost.** High and riskiest. It requires new state (permits, audit records) and new
verbs the engine does not have; it also drifts the game toward a workplace sim and
away from the bible's bounded-reconstruction premise (`:18-20`).

**Risk.** Process ambiguity reads as unfairness ("why was my permit rejected?"), and
the correctness of a process decision is harder to validate than a canonical token.
The absence of a named institution in the DB canon (inventory `:321,399-401`) means
the fiction would have to be invented rather than recovered.

---

## 3. Weighted scoring

Scores are 1–5 per criterion (5 best). **Implementation cost** is scored so that
5 = cheapest; **risk of red herrings** so that 5 = lowest risk. Weights sum to 100.

| Criterion (weight) | Candidate A — Bounded reconstruction | Candidate B — Records forensics | Candidate C — Process simulator |
|---|---|---|---|
| Fairness (20) | **5** — elimination + Three-Route Rule; token answers | 4 — matrix is fair but slot vocabulary can leak | 3 — process correctness reads as arbitrary |
| Role independence (20) | **4** — all three domains required; Operator-only submit | **5** — per-role string/route colour; strongest on paper | 3 — Operator domain dominates |
| Replayability (10) | 3 — a solved elimination is known | **5** — re-deriving a matrix is satisfying | 4 — processes are re-runnable |
| Fidelity to canon (15) | **5** — is the bible's premise | 4 — matching, but re-frames the artefact | 3 — needs an invented institution (inventory `:321`) |
| Implementation cost (15) | **4** — content-only; schema already supports it | 2 — new board + confirmation RPC | 2 — new permits/audit state + new verbs |
| Risk of red herrings (10) | 4 — few and structural (mystery craft `:273`) | 3 — word bank can over-hint; wrong entries linger | 4 — mis-clicks, not false theories |
| Ease of validation (10) | **5** — one canonical token per gate, machine-checkable | 3 — whole-group confirmation is harder to test | 3 — process outcomes are hard to assert |
| **Weighted total / 500** | **435 (87.0%)** | 380 (76.0%) | 305 (61.0%) |

**Sensitivity.** Candidate A wins under every weight within ±25% of the stated
values; it loses the top spot only if *replayability* is weighted above ~35 points
**and** *implementation cost* below ~5, a weighting that would contradict the
"content rebuild, not engine rebuild" constraint (worklog `:31-34`).

---

## 4. Decision

**Adopt Candidate A — bounded reconstruction — as the spine of the case**, and
reconciling two components from the losing candidates:

1. **From Candidate B:** adopt its *commit/lock* mechanic **only for the four meta
   gates** (`M01`–`M04`), which are already synthesis gates that read across a whole
   stage (inventory `:37,101-104`). This gives the team a satisfying "lock in the
   group" moment at each stage boundary without introducing a new persisted board.
2. **From Candidate C:** keep the *institution-as-system* layer as the **Operator's
   domain** (bible `:77`) and keep the two-phase private-solve pattern
   (cooperative asymmetry `:474`) as the standard for every gate.

The 43 playable gates remain bounded reconstructions with single canonical tokens;
the ending remains the moral delete / retain / share decision (bible `:132-145`).

**Rationale.** A is the only candidate that satisfies all six non-negotiable
constraints *without* new engine work, and it is the only one whose fairness is
already backed by the genre's published contract (mystery craft `:104-164`). B's
matrix is a better *elimination* mechanic in the abstract, but its documented
failure modes (word bank, single-brain model, batched confirmation) are exactly the
ones a 3-player phone game cannot absorb (deduction games `:95-100, 135-136, 168`).
C's process framing is the most atmospheric but requires inventing canon the DB does
not have (inventory `:321`).

**Confidence:** high for the spine (A); moderate for the B-derived meta-gate lock and
the C-derived Operator framing, which are adoptions *within* A rather than a
different spine.

---

## 5. Rejected directions

| # | Direction | Why rejected | Source of the rule it violates |
|---|---|---|---|
| R1 | **Relay with a timer.** Three players each hold a fragment and read it aloud; the fastest team wins. | It is a relay, not an investigation; a phone call replaces a role. | bible `:84-85`, `:255-257` |
| R2 | **Single-player deduction with AI teammates.** | Removes the asymmetry the whole design rests on. | deduction games `:100` (single-brain model) |
| R3 | **Pure cipher-chain / escape-room.** The *current* defective state. | Difficulty from ciphers and trivia; hints leak answers. | worklog `:35-37`; bible `:169` |
| R4 | **Fully procedural case generation.** | Procedural generation cannot guarantee an eliminable truth or a fair contract. | deduction games `:550` (procedural risks) |
| R5 | **Truth by confession / cutscene reveal.** | The reveal must be a re-read of held facts, not an exposition drop. | bible `:103-105` |
| R6 | **Per-role answer keys** (each of the three submits). | Contradicts the Operator-only mechanic already enforced. | `2026100601:89-93`; bible `:40,81-82` |
| R7 | **Full Obra Dinn matrix as the spine** (Candidate B whole). | New engine state, wrong scale, wrong failure modes (see §C B). | worklog `:31-34`; deduction games `:168-170` |

---

## 6. The 6-role-removal test policy

**Basis.** The bible requires each gate to be **unsolvable by any one role** *and*
**unsolvable by any two** (bible `:79-80`), and restates it as "No role is a relay"
(`:255-257`). The worklog schedules "role-removal tests" as the logic/fairness gate
(worklog `:24`).

**Definition (derived).** The solver set is exactly `{Observer, Analyst, Operator}`
(`src/types/domain.ts:10,12`). The **six role-removal configurations** are the six
non-empty, non-full subsets of that set:

- **Single-role-only (2 roles removed):** `{Observer}`, `{Analyst}`, `{Operator}`.
- **Two-role-only (1 role removed):** `{Observer, Analyst}`, `{Observer, Operator}`,
  `{Analyst, Operator}`.

That the count is six is a **derived** consequence of "six proper non-empty subsets
of a three-element set"; no repository source states the number verbatim. Tagged
**INFERENCE**. The phrase "6 perspectives" in worklog `:26` is a *different*
artefact — the adversarial-review perspectives for `docs/NEXUS_CASE_QA.md` — and is
**not** the removal test; the two must not be conflated.

**Policy.**

1. **Six tests per gate.** For every one of the 43 playable gates, run the six
   configurations above. In each configuration, the *missing* role's block is
   withheld and its player contributes nothing.
2. **Pass condition.** A gate **passes** only if **all six configurations fail to
   reach the canonical answer** — i.e. the residual subset cannot produce the token
   by reasoning from its own material plus conversation alone. The full trio is the
   only configuration allowed to succeed.
3. **Test for the right kind of failure.** A configuration must fail because the
   *discriminating fact is absent*, not because the answer was never typed. For the
   single-role `{Operator}` case in particular, failing only because the Operator
   lacks the Observer's and Analyst's facts is the *intended* result; failing
   because the Operator literally never sees a value it should own is a defect.
4. **Relay check inside each two-role configuration.** In each two-role case, ask
   whether the two surviving roles could reach the answer by one reading a value
   aloud to the other. If yes, the gate fails the anti-relay rule even though it
   "needed" a third role on paper (bible `:84-85`).
5. **Meta gates use the same six, plus the lock.** `M01`–`M04` run the six
   configurations on the *synthesis* material; because they adopt Candidate B's
   commit/lock mechanic, the missing role's evidence must be *required for the
   group to lock*, not merely present.
6. **Record, do not fix silently.** Any gate failing a configuration is logged in
   `docs/NEXUS_CASE_QA.md` (worklog `:24`) with the configuration, the missing fact
   and the proposed repair. Repairing content is a new migration; migration history
   is immutable and repairs go forward
   (`supabase/migrations/2026100401_repair_admin_rls_policy_evaluation.sql` header;
   worklog `:56`).

**Exclusion — the GM.** The seed names a fourth in-world actor, the **GM**, in the
Stage-5 narrative and the ending certificate (inventory `:346,559-560`). The GM is
**not** a solver role: it never submits (only the Operator does, `2026100601:89-93`)
and it is not in `src/types/domain.ts:10`. The GM is therefore **excluded** from the
six configurations. This exclusion is tagged **UNVERIFIED**, because no repository
source explicitly defines the GM's role (inventory `:559-560`); if a later source
grants the GM a solver function, the test set becomes the seven non-empty proper
subsets of a four-element set.

---

## 7. Consequences

**Content.** The 43 playable gates are rewritten as bounded reconstructions
(`docs/_rebuild/TEMPLATE.md` is the authoring contract); `M01`–`M04` gain the
commit/lock behaviour. The two false theories are planted in Stage 1–3 and
eliminated by Stage 4 (bible `:89-108`). Content changes are content-only: `UPDATE`s
to `puzzle_nodes.content`, `answer_metadata`, `metadata` — no `DROP`, `TRUNCATE`,
`DELETE`, or destructive `ALTER` (worklog `:50-56`).

**Ending.** The delete / retain / share finale is **additive**. The server already
supports a set of equally acceptable answers via `answer_metadata.acceptedAnswers`
(`2026100608_multi_answer_disposition.sql:11-26, 176-195`), but **no node populates
it yet** — the mechanism exists, the data does not (grep: the token appears only in
that function body). Implementing the ending is a content migration that carries the
three dispositions and a non-prose sentinel in `acceptedAnswer` (so the choice text
is not sealed by the answer-redaction rule, `2026100608:19-26`). Until then, P37
still answers `NEXUS` (inventory `:123`).

**Validation.** Adopt the 6-role-removal policy (§6) plus an automated content
validator (worklog `:25`) that enforces the writing rules mechanically: the answer
never appears in any player-visible string; hints escalate but never solve; two or
more hypotheses stay live (bible `:245-263`). Fairness rests on the published
normalization contract (`2026100601:161-173`; mystery craft `:459-486`).

**Runtime / mechanics unchanged.** Operator-only submission, generic refusal,
role-isolated payloads, atomic scoring, hints and QR resolution are already
implemented and tested (worklog `:31-34`). No frozen migration is edited; all
repairs are forward.

**Event-day operations.** The runbook's manual-unlock workaround
(`docs/event/NEXUS_EVENT_DAY_RUNBOOK.md:78`) becomes more important, not less: a
gate that fails a removal configuration in the field cannot be reasoned through and
must be manually unlocked. The QA pass must therefore run *before* the event, not
during it.

**Documentation debt (OPEN).** Two files the bible's own rule mandates —
`NEXUS_CANON_LEDGER.md` and `NEXUS_CONTENT_MIGRATION.md` — **do not exist**
(bible `:5-6`, `:144-145`; `2026100608:26`). The recorded rename "Vey → Veyr"
(bible `:37`), the `04:17` vs `03:17:11` and 2021/2024 vs 1974/1981/1994
contradictions, and the "Avalanche-as-canon" change (inventory `:349-357`) have no
ledger to live in. **This record flags the debt; it does not discharge it.**

---

*End of decision record.*
