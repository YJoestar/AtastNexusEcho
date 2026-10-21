# NEXUS ECHO — Story & Progression Audit

Plot continuity, chronology, and the five-stage progression, verified against the
**current** content (the newest `UPDATE puzzle_nodes` per gate across the whole
migration history) rather than against an earlier seed.

Companion to `NEXUS_COMPREHENSIVE_AUDIT.md` (register),
`NEXUS_PUZZLE_INVENTORY.md` (gate data), and
`NEXUS_TIMELINE_AND_KNOWLEDGE_GRAPH.md` (the in-world chronology, which this audit
reconciles and partially corrects).

## Canon this audit holds fixed

| Item | Value | Source of truth |
| --- | --- | --- |
| Project | **NEXUS** | `NEXUS_CASE_BIBLE.md` |
| Analyst | **Lina Veyr** | `NEXUS_CASE_BIBLE.md:37` |
| Institution | **The Bureau** (of Continuity Records) | `NEXUS_CASE_BIBLE.md` |
| Motif | **04:17** | `NEXUS_CASE_BIBLE.md`, `NEXUS_TIMELINE_AND_KNOWLEDGE_GRAPH.md` §A.3 |
| Theme line | *"If the truth needs you alone, question it."* | `NEXUS_CASE_BIBLE.md` |
| Ending | delete / retain / share | `NEXUS_CASE_BIBLE.md` §7 |

None of these was altered by any repair in this audit. The content repairs
(`2026100610`–`2026100613`) changed evidence and framing only; the token canon is
pinned by `docs/NEXUS_CASE_BIBLE.md` and `docs/NEXUS_CASE_MATRIX.md`.

## The chronology that survived the rebuild

The story has **one true chronology** and **one apparent (archived) chronology**,
and the central puzzle is that the archive reads as a *different* sequence of
events than what actually happened. The team's job across the five stages is to
notice the divergence and decide which record to trust.

- **The 04:17 motif.** The pivotal minute. The archive's apparent clock and the
  true clock disagree, and 04:17 is the minute at which the two can be told apart.
- **The two false theories.** The case deliberately plants:
  - *False theory A* — the `3425` misreading (a value read as a code that is
    actually something else);
  - *False theory B* — the `+17:30` offset (an arithmetic offset that seems to
    reconcile the two clocks but does not).

  Both are load-bearing: a team that adopts either without testing it will answer
  a later gate wrongly. Repairing these away would make the case *easier* and was
  therefore not done.

## Stage-by-stage progression

| Stage | Name | Entry condition | Exit token(s) | What the stage proves |
| --- | --- | --- | --- | --- |
| 1 | Intake | Session starts | `CDFDEFF`, `2147`, `3425`, `F`, `VEYR`, `LIGHT` | The archive classifies in its own format; the team learns to read it |
| 2 | Records | Stage 1 cleared | `17`, `17:47`, `DELTA`, `LIGHT`, `ARCHWAY`, `B7`, `3425`, `CONNECTION` | The records disagree with the physical world; the first false theory appears |
| 3 | Classification | Stage 2 cleared | `VECTOR`, `3425`, `15`, `ECHO`, `DOORS`, `SUBMERGE`, `2147`, `ARCHIVE` | The team must classify evidence by the archive's rules |
| 4 | Core | Stage 3 cleared | `X`, `REINTERPRET`, `14`, `CONNECTION`, `VALE`, `FILTER`, `REFLECTION`, `STRUCTURE`, `0x02`, `FRAGMENT 5`, `NEXUS IS AI` | The truth about NEXUS is assembled from the classified evidence |
| 5 | Avalanche | Stage 4 cleared | `PULSE`, `SYNC`, `UNITY`, `CONVERGE`, `D`, `AGREE`, `META`, then the finale | The team acts on what it found and decides the archive's fate |

Progression is gated by the **server**, not the bundle: `available_nodes_from_progress`
(`2026100305`) publishes which nodes a team may open, and the player's map treats
the server's opinion as authoritative (`useGameEngine.ts` `allNodesForMap`). An
operator's lock or unlock therefore reaches the map immediately.

## Continuity corrections — the timeline document is stale

`NEXUS_TIMELINE_AND_KNOWLEDGE_GRAPH.md` §C.3 and §D.3 were written against the
**pre-rebuild seed** (`2026092903`). The `2026100603`–`2026100609` rebuild
superseded that seed, so several of its "contradictions" and "gaps" no longer
describe the game. This audit corrects them:

| Old claim (§C.3 / §D.3) | Current reality (verified by replaying the migrations) | Verdict |
| --- | --- | --- |
| P05 runtime answer is `VEY`; bible fixes `Veyr` → "CONTRADICTION / recorded rename" | P05 `acceptedAnswer` is **`VEYR`** | **RESOLVED** by the rebuild |
| P37 runtime `acceptedAnswer` is `NEXUS`, and **no migration populates `acceptedAnswers`**; delete/retain/share exists only as a server capability | P37 `acceptedAnswer` is the decision sentinel `###37###` and `acceptedAnswers` **is** populated with `DELETE, RETAIN, SHARE, ERASE, KEEP, RELEASE` (`2026100609` / `2026100610`) | **RESOLVED** — the finale now exists as content, not just capability |
| Duplicate title: P22 and M04 both "The Hidden Layer" (§D.2 C5) | A full parse of all current gate titles finds **no duplicate**; P22 is "The Unknown of the Manifold", M04 is "Core Activation Protocol" | **RESOLVED** by the rebuild (also recorded as R-01) |
| Offset arithmetic `17:47 − 17:30 = 00:17` contradicts the `04:17` motif (§D.2 C4) | P07's rebuilt narrative no longer performs that subtraction; it asks the team to *decide what kind of value the log carries*, and the operator evidence states plainly that the field is a wall-clock time | **SUPERSEDED** — the contradiction was written out |
| P07 self-correction: prose says `09:47` while the decoded string was edited (§D.2 C6) | The rebuilt P07 content and hints were replaced wholesale and no longer carry the `09:47` prose | **SUPERSEDED** |

Nothing above required a content change *in this audit*; the rebuild had already
done the work. The correction here is to the *documentation*, which had gone stale
and would otherwise send a future reader hunting contradictions that no longer
exist. The remaining entries in §D.2/§D.3 that concern the **showcase/parallel
canon** (C1–C3) are addressed below.

## The two canons (and why they are allowed to differ)

There are two bodies of text that can look contradictory:

1. **The case canon** — the DB content the game actually plays (migrations).
2. **The showcase/parallel canon** — development-only artwork in
   `src/lib/evidence/showcaseCatalog.ts` and `scripts/evidence-gen`, labelled
   `SIMULATION DATA`. Its dates and institution names (Halder Institute,
   03:17:11, etc.) do **not** match the case canon on purpose; it is a look-and-feel
   fixture, gated behind `import.meta.env.DEV` and never shipped to a production
   build (verified in R-04).

So the timeline document's C1/C2/C3 "contradictions" are **not defects in the
game**; they are the showcase fixture diverging from case canon, which is
permitted because the fixture is never player-visible in production.

## Narrative gaps that remain genuinely open (recorded, not invented)

These are honest gaps. This audit does not fill them with invention.

| Gap | Status | Note |
| --- | --- | --- |
| Lina Veyr's ultimate fate | **OPEN** | `CASE-LV07` implies imminent capture; no later gate narrates the outcome. This is a deliberate ambiguity, not an error. |
| The redacted third figure's relation to Veyr | **OPEN** | The DB presents Veyr as lead; the "third figure" with initial V is unresolved by design. |
| The GM as a defined in-world character | **OPEN** | Named across P33–P37; never given a DB row. Acceptable for a meta-antagonist. |
| `NEXUS_CANON_LEDGER.md` (mandated by the bible's own rule) | **NOT FOUND** | The bible names it; it does not exist. Documentation gap, not a game defect. |

## Progression integrity checks

| Check | Result |
| --- | --- |
| Every stage's exit tokens are accepted by their gates | PASS (see `NEXUS_PUZZLE_INVENTORY.md`) |
| No gate is unreachable (every gate has an entry edge from a prior stage or a branch parent) | PASS |
| Branch gates rejoin the main spine | PASS — P06b/P07b/P17b/P23b/P24b each pair with a parent and rejoin |
| The server, not the bundle, is authoritative for availability | PASS — `useGameEngine` `allNodesFromProgress` handling |
| The finale is reachable and its disposition is recorded | PASS — `2026100609`, aligned in `2026100610` |
| Canon (NEXUS / Lina Veyr / Bureau / 04:17 / theme line / delete-retain-share) intact after repairs | PASS |

## Findings summary

| Ref | Finding | Verdict |
| --- | --- | --- |
| S-1 | Timeline doc §C.3/§D.3 stale against the rebuild (P05, P37, duplicate title, offset contradiction) | **DOCUMENTATION CORRECTED** here; game content already correct |
| R-01 | Duplicate gate title P22/M04 | **REFUTED** |
| R-04 | Showcase canon leaking into production | **REFUTED** (dev-gated) |
| — | Any canon element altered by a repair | **Not present** |
| — | Any stage unreachable or any branch gate orphaned | **Not present** |
