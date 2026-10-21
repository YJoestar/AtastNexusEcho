# NEXUS ECHO — Puzzle Logic Repair Record

The reasoning defects found in the case gates and the repairs made to them. This
document is about **logic fairness**, not spelling: each entry states what the
gate demanded, why a competent team reading exactly what was on screen could not
reach it, and what was changed so that the intended deduction becomes reachable
without becoming easier.

Companion to `NEXUS_PUZZLE_INVENTORY.md` (what the gates are) and
`NEXUS_COMPREHENSIVE_AUDIT.md` (the full defect register, including the
non-content defects).

## The rule the repairs obey

> Fix the evidence and the framing. Never move the answer, never widen the
> accepted set to admit a weaker reading, never print the solution.

Every repair below honours that rule. The canonical token is unchanged in all
five cases; what changed is that the gate now *shows its working*, so the token
is the end of a chain the team can follow rather than vocabulary they were
expected to guess.

The canon preserved through every repair:

- Project **NEXUS**, the analyst **Lina Veyr**, **The Bureau** of Continuity
  Records, the **04:17** motif, the line *"If the truth needs you alone, question
  it."*, and the finale **delete / retain / share** decision.
- Elite difficulty. The repairs add *evidence*, not *clues*: they never state
  which of two candidate readings is right, and never reduce the number of steps.

---

## P37 — The Final Boss (finale disposition) · `2026100610`

**Severity P0** — this is the last gate; a team rejected here loses the ending.

**Demanded.** The stage-5 console (`2026100607`) printed the three options as
`ERASE` / `KEEP` / `RELEASE`. The disposition migration (`2026100609`) accepted
only `DELETE` / `RETAIN` / `SHARE`. The answer normaliser applies no synonym
table, so the two word families were simply disjoint.

**Why it was unfair.** This is not a puzzle — it is a *decision*. The team has
already solved everything; the finale asks them to choose a disposition and to
state it. Rejecting the words printed on the console in favour of a second,
never-shown vocabulary punishes a team for reading the screen and at the exact
moment the game is trying to hand them authorship of the ending.

**Repair.** `2026100610_finale_disposition_alignment.sql` accepts *both* families
— `DELETE`, `RETAIN`, `SHARE`, `ERASE`, `KEEP`, `RELEASE` — and rewords the
console so the two families are visibly the same decision rather than two
vocabularies. The canonical trio in the case bible stays `DELETE`/`RETAIN`/`SHARE`
for documentation, but a team that types what it read is no longer punished.

**Not made easier.** No option is presented as correct. The choice remains the
player's, and all three remain live dispositions with different epilogues.

---

## P27b — The Memory Patch · `2026100611`

**Severity P1** — the gate was self-contradictory.

**Demanded.** `0x02`.

**Why it was unfair.** Three failures stacked:

1. The prompt asked for the corrupted **step**, but the register named a
   different value as the corrupted step.
2. The only hex string printed anywhere was the value the register flipped the
   field **to**, not the one it asked about — so the visible evidence pointed at
   the wrong answer.
3. The expected notation was never stated, so a team that reached the right
   number still had to guess `0x02` over `0x2` or `2`.

**Repair.** `2026100611_repair_p27b_answer_target.sql` keeps the canonical
`0x02`, reframes the evidence so the register describes the **written state
slot** (the actual target), prints the hex with its notation, and records `0x2`
as an accepted alternate. The contradiction between "the step" and the value the
register named is gone.

**Not made easier.** The team still has to locate the corrupted slot and read the
written state; only the false trail and the notation ambiguity were removed.

---

## P29 — The Mirror Entity · `2026100612`

**Severity P1** — the gate forbade what it printed.

**Demanded.** `NEXUS IS AI`.

**Why it was unfair.** The briefing printed the project name only as `NEXUS` and
the classification only as `AI`, and the gate's own validation note forbade the
space between them — while the accepted answer *contains* that space. The gate
also never joined the two fragments into the demanded sentence, so the team had
to reverse-engineer the exact phrasing the gate wanted from fragments it declined
to combine.

**Repair.** `2026100612_repair_p29_identity_format.sql` prints the project name
and the class code as separate labelled data (so both fragments are provenance-
clean), removes the self-contradicting "no space" note, and accepts `NEXUS AI`
alongside `NEXUS IS AI` — the same claim, with and without the copula.

**Not made easier.** The deduction — that the mirror entity *is* the project, a
constructed intelligence — is unchanged and still has to be made by the team.

---

## P04 · M01 · P21 — the provenance repair · `2026100613`

**Severity P1 (three gates)** — same defect, three instances: **the gate demanded
a literal token, and no player-visible string anywhere supplied it.** The team was
being asked to guess vocabulary, not to reason.

| Gate | Token | What was on screen | What was missing |
| --- | --- | --- | --- |
| P04 — The Poster Dates | `F` | posters described, dates discussed | no poster was ever *lettered*, no closure date printed, no acquisition register |
| M01 — The First Lock | `LIGHT` | register "defines standard evidence classes"; policy "defines how classes are assigned" | neither ever named a class — the word `LIGHT` appeared nowhere |
| P21 — The Final Clue | `ARCHIVE` | payload said "institution records repository" | the archive's own one-word term was never printed |

**Repair.** `2026100613_repair_token_provenance.sql` is a single pure `UPDATE`
migration that supplies the missing provenance as **data on the registers and
posters the player already reads**:

- **P04** — a dated poster set (each poster carries its letter and date) plus a
  closure record and an acquisition register, so the letter `F` is the result of
  comparing the poster set to the closure, not a guess.
- **M01** — the register entries now print the class term itself, and the policy
  states how that class is assigned, so `LIGHT` is read off the register.
- **P21** — the access register heads its first line with the term `ARCHIVE`, so
  the repository is named by the word the gate accepts.

**Not made easier.** In each case the token is embedded in a register the team
must *interpret*; the repair does not say "the answer is F/LIGHT/ARCHIVE". For
P04 the team still has to decide which poster survives the closure rule; for M01
they still have to match the class to the assignment policy; for P21 they still
have to read the register correctly.

**Why this needed a second migration.** Printing the token as data collides with
the server's answer sealer: `get_player_node_detail` (`2026100602`) redacts any
player string containing the normalised answer, so the repaired register would
have shipped as `[ sealed ]` and the fix would have cancelled itself. Two things
were required:

1. a marker that says "for this gate the token is *presented evidence*, do not
   seal it" — `answer_metadata.presentedEvidence = true`, set for exactly
   M01/P04/P21 by `2026100613`, pinned by test to that exact set;
2. the function change that reads the marker — `2026100614`, a
   `CREATE OR REPLACE FUNCTION` that passes an empty redaction key for those
   gates only, and for no others.

---

## Repairs explicitly **not** made

Recorded so the same "fix" is not proposed again.

| Proposal | Why rejected |
| --- | --- |
| Expand the answer normaliser with other synonyms for the finale | The finale is a decision, not a vocabulary test; the correct fix is to accept both word families (done), not to accumulate an ever-growing synonym list. |
| Loosen P27b to accept any of `0x02`/`0x2`/`2` without fixing the evidence | The evidence already pointed at the wrong value; accepting more spellings of a wrong number does not make the gate fair. |
| Make the sealer blanket-permit single-word answers | This is D-12, a deliberate owner policy (answers under three alphanumerics are exempt from redaction). Changing it is an owner decision, not an audit fix. |
| Print the P04/M01/P21 tokens as a "hint" | A hint states the answer. Printing the token as *register data* makes it derivable without stating it — the distinction the repair was careful to keep. |
| Reduce any stage's gate count or difficulty to reach a "fair" baseline | Difficulty is the product. Fairness is repaired at the evidence layer only. |
