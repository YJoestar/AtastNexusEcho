# NEXUS ECHO — Puzzle Inventory

Every gate in the case, its content source of truth, its canonical answer, and
the state of the evidence around it. This document is **generated from the real
migration history**, not from memory or from the TypeScript bundle: for each gate
the newest `UPDATE puzzle_nodes` across all 67 migrations wins, exactly as the
database would apply them.

Companion to `NEXUS_COMPREHENSIVE_AUDIT.md` (defect register) and
`NEXUS_PUZZLE_LOGIC_REPAIR.md` (the reasoning repairs made).

## How the inventory was built

A migration-aware extractor (`scratch`, run against `supabase/migrations/`)
replayed every `UPDATE puzzle_nodes` statement in filename order and kept, per
gate code, the last assignment to `content`, `answer_metadata` and `metadata`,
with an SQL-aware splitter that skips `--` comments, single-quoted strings and
dollar-quoted bodies so a JSON blob full of punctuation cannot be misparsed.

Result: **81 `UPDATE puzzle_nodes` statements**, collapsing to **47 distinct
gates**. The authoritative design document for what each gate is *meant* to be is
`docs/NEXUS_CASE_MATRIX.md`; the token canon is `docs/NEXUS_CASE_BIBLE.md`.

## Source of truth, per gate

| Content layer | Lives in | Notes |
| --- | --- | --- |
| Gate title, role blocks, hints, narrative | `puzzle_nodes.content` | rebuilt `2026100603`–`2026100607` (stages 1–5) |
| Accepted answer(s) | `puzzle_nodes.answer_metadata` | multi-answer dispositions in `2026100608` / `2026100609` |
| Stage, graph edges, flags | `puzzle_nodes.metadata` | plus `requiredDiscoveries` where gated |
| Repair overlays | `2026100610`–`2026100613` | newest-wins, applied on top of the rebuild |

## Stage map

| Stage | Name | Migration | Gates |
| --- | --- | --- | --- |
| 1 | Intake | `2026100603` | P01, P02, P03, P04, P05, M01 |
| 2 | Records | `2026100604` | P06, P07, P08, P09, P10, P11, P12, P13, P06b, P07b, M02 |
| 3 | Classification | `2026100605` | P14, P15, P16, P17, P17b, P18, P19, P20, P21, M03 |
| 4 | Core | `2026100606` | P22, P23, P23b, P24, P24b, P25, P26, P27, P27b, P28, P29, M04 |
| 5 | Avalanche | `2026100607` | P30, P31, P32, P33, P34, P35, P36, P37 |

## Full gate table

`Answer` is the canonical `acceptedAnswer`. Where the disposition migration
(`2026100608` / `2026100609` / a repair) added alternates, they are listed in
`Also accepts`. `Source` is the newest file that writes the gate row.

| Code | Stage | Title | Answer | Also accepts | Source |
| --- | --- | --- | --- | --- | --- |
| M01 | 1 | The First Lock | `LIGHT` | — | `2026100613` |
| M02 | 2 | The Network Meta | `CONNECTION` | — | `2026100604` |
| M03 | 3 | The Symbol Meta | `SYMBOL` | — | `2026100605` |
| M04 | 4 | Core Activation Protocol | `FRAGMENT 5` | — | `2026100606` |
| P01 | 1 | The Facade | `CDFDEFF` | — | `2026100603` |
| P02 | 1 | The Clock | `2147` | — | `2026100603` |
| P03 | 1 | The Facade Pin | `3425` | — | `2026100603` |
| P04 | 1 | The Poster Dates | `F` | — | `2026100613` |
| P05 | 1 | The Third Figure | `VEYR` | — | `2026100603` |
| P06 | 2 | The Pivot | `17` | — | `2026100604` |
| P06b | 2 | Time Remaining | `17` | — | `2026100604` |
| P07 | 2 | The Binary | `17:47` | — | `2026100604` |
| P07b | 2 | The Network | `CONNECTION` | — | `2026100604` |
| P08 | 2 | The Vector | `DELTA` | — | `2026100604` |
| P09 | 2 | The Chronology | `17` | — | `2026100604` |
| P10 | 2 | The Blue Door | `LIGHT` | — | `2026100604` |
| P11 | 2 | The Symbol | `ARCHWAY` | — | `2026100604` |
| P12 | 2 | The Armrest | `B7` | — | `2026100604` |
| P13 | 2 | The Laboratory | `3425` | — | `2026100604` |
| P14 | 3 | The Memory Bank | `VECTOR` | — | `2026100605` |
| P15 | 3 | The Cipher Wheel | `3425` | — | `2026100605` |
| P16 | 3 | The Auditorium | `15` | — | `2026100605` |
| P17 | 3 | The Audio Log | `ECHO` | — | `2026100605` |
| P17b | 3 | The Echo Fold | `DOORS` | — | `2026100605` |
| P18 | 3 | The Pattern Lock | `3425` | — | `2026100605` |
| P19 | 3 | The Archive | `SUBMERGE` | — | `2026100605` |
| P20 | 3 | The Symbol Sequence | `2147` | — | `2026100605` |
| P21 | 3 | The Final Clue | `ARCHIVE` | — | `2026100613` |
| P22 | 4 | The Unknown of the Manifold | `X` | — | `2026100606` |
| P23 | 4 | Two Clocks | `REINTERPRET` | — | `2026100606` |
| P23b | 4 | The Vent Route | `14` | — | `2026100606` |
| P24 | 4 | The Second Condition-Mark | `CONNECTION` | — | `2026100606` |
| P24b | 4 | The Witness | `VALE` | — | `2026100606` |
| P25 | 4 | The Stream Gate | `FILTER` | — | `2026100606` |
| P26 | 4 | The Turned Beam | `REFLECTION` | — | `2026100606` |
| P27 | 4 | The Compiler | `STRUCTURE` | — | `2026100606` |
| P27b | 4 | The Memory Patch | `0x02` | `0x2` | `2026100611` |
| P28 | 4 | Operation Shatter | `FRAGMENT 5` | — | `2026100606` |
| P29 | 4 | The Mirror Entity | `NEXUS IS AI` | `NEXUS AI` | `2026100612` |
| P30 | 5 | The Spire Coupler | `PULSE` | — | `2026100607` |
| P31 | 5 | The Vault Door | `SYNC` | — | `2026100607` |
| P32 | 5 | The GM Key | `UNITY` | — | `2026100607` |
| P33 | 5 | The Failsafe | `CONVERGE` | — | `2026100607` |
| P34 | 5 | The Protocol Initiator | `D` | — | `2026100607` |
| P35 | 5 | The Consent Console | `AGREE` | — | `2026100607` |
| P36 | 5 | The Level Designation | `META` | — | `2026100607` |
| P37 | 5 | The Final Boss | `###37###` | `DELETE`, `RETAIN`, `SHARE`, `ERASE`, `KEEP`, `RELEASE` | `2026100610` |

Two gates have a genuinely multi-valued disposition: **P27b** (`0x02` / `0x2` —
same number, two notations) and **P37** (the finale, where the player states a
disposition and either word family is honoured after the `2026100610` repair).
Everything else has exactly one accepted token.

## Answer-token families

Several gates deliberately re-use a token across stages — the player who has
learned the number re-reads it in a new context. These repeats are **by design**
(they are the "loop": `3425`, `2147`, `17`, `CONNECTION`, `LIGHT`, `FRAGMENT 5`):

- `3425` — P03 (stage 1), P13 (stage 2), P15 (stage 3), P18 (stage 3)
- `2147` — P02 (stage 1), P20 (stage 3)
- `17` — P06 / P06b (stage 2), P09 (stage 2)
- `CONNECTION` — M02, P07b, P24 (stages 2 and 4)
- `LIGHT` — M01 (stage 1), P10 (stage 2)
- `FRAGMENT 5` — M04, P28 (stage 4)

A repeat is only fair where each appearance has its own local evidence, and the
`NEXUS_PUZZLE_LOGIC_REPAIR.md` register is exactly about the handful of gates
where that local evidence was missing.

## Token-provenance status

A gate is **provenance-clean** when its accepted token is derivable from strings
the player can actually see. The content audit found three gates where it was not;
all three are repaired in `2026100613`.

| Gate | Token | Was the token printed? | Repair |
| --- | --- | --- | --- |
| P04 | `F` | No — no poster letter, date or closure date anywhere | dated poster set + closure record + acquisition register print it |
| M01 | `LIGHT` | No — the classes were named but no class ever was | register entries print the class term; policy defines its assignment |
| P21 | `ARCHIVE` | No — "institution records repository" described it, never named it | access register heads its first line with the term |

These are the only three gates whose token is *presented as data*. They carry
`answer_metadata.presentedEvidence = true`, which is what makes
`get_player_node_detail` pass an empty redaction key for them — otherwise the
sealer would ship the repaired register as `[ sealed ]` and the fix would cancel
itself (`2026100614`; the flag set is pinned by test to exactly
`['M01','P04','P21']`).

## Branch gates

Five branch gates open off a main-stage decision, and each pairs with its parent:

| Branch | Parent | Diverges on |
| --- | --- | --- |
| P06b | P06 | time remaining (`17`) |
| P07b | P07 | the network a pivot belongs to (`CONNECTION`) |
| P17b | P17 | where the echo folds (`DOORS`) |
| P23b | P23 | the vent route count (`14`) |
| P24b | P24 | the witness name (`VALE`) |

## Per-gate status roll-up

| Status | Gates |
| --- | --- |
| **Provenance-clean, no defect found** | 44 of 47 |
| **Provenance repaired (`2026100613`)** | P04, M01, P21 |
| **Answer disposition repaired (`2026100610`)** | P37 |
| **Token target repaired (`2026100611`)** | P27b |
| **Answer format repaired (`2026100612`)** | P29 |

The remaining defects in the audit register are **not** gate-content defects: D-07
is the server sealer, D-08/D-17/D-18/D-19 are component defects, D-10/D-11/D-15/D-16
are emulator defects, D-13/D-14 are audio/animation defects. The gate text itself
is sound everywhere except the five rows above.
