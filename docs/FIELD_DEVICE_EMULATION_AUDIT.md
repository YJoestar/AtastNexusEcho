# FIELD DEVICE EMULATION — Consolidated Audit

The admin panel's **FIELD DEVICE EMULATION** (the QA simulator) lets a tester walk
every gate, every role and every state without touching production game state.
This document is the single-file audit of that subsystem: what it is, what was
wrong, what was repaired, how the repairs are proven, and — honestly — what could
not be verified here.

It consolidates six working documents, which remain as the detailed evidence:

| Detail document | Covers |
| --- | --- |
| `FIELD_DEVICE_EMULATION_ROOT_CAUSE.md` | the content→renderer contract break |
| `FIELD_DEVICE_EMULATION_CASE_INVENTORY.md` | every gate × role `visualType` and its renderer |
| `FIELD_DEVICE_EMULATION_TOOL_AUDIT.md` | every control under `/admin/qa-simulator` |
| `FIELD_DEVICE_EMULATION_ISOLATION_AUDIT.md` | the production-isolation proof |
| `FIELD_DEVICE_EMULATION_VALIDATION.md` | the evidence that the repair works |
| `FIELD_DEVICE_EMULATION_FINAL_REPORT.md` | the summary of the effort |

Companion to `NEXUS_QA_RESULTS.md` (commands actually run) and
`NEXUS_COMPREHENSIVE_AUDIT.md` (the repository-wide register).

## What the emulator is

A bureau workstation surface at `/admin/qa-simulator`, built from:

| Component | File | Role |
| --- | --- | --- |
| `QAHub` | `src/features/admin/QAHub.tsx` | setup screen, tabbed control panel, embedded viewport |
| `PuzzleDetailViewer` | same | STATE INSPECTOR: per-node, per-role detail dump |
| `KeyboardShortcuts` | same | Space = solve, Ctrl+R = reset |
| `QASimulatorContext` | `src/contexts/QASimulatorContext.tsx` | the emulated game engine: state, submit, scan, progress |
| `QAPlayerShell` | `src/features/admin/QAPlayerShell.tsx` | renders the player screens against the emulated engine |

It exists so the case can be QA-tested by a small team, on a workstation, with no
production session and no production writes.

## The two defects it originally had

**1. A content → renderer contract break.** Twenty of the 123 role blocks declared
a `visualType` (`terminal`, `telemetry`, `chart`, `console`, `timeline`) for which
no renderer existed, so those blocks silently degraded to generic prose. A tester
looking at such a gate saw flat text and could certify "the gate renders" while
the player would see the same flat text — the visual had never been drawable.

**2. A fidelity break.** `generateNodeDetail` *fabricated* the objective, story
reveal, teamwork note, physical clue, operator brief and unlocked evidence instead
of reading them from the stored row it already held. The emulator was showing a
mock of the case while labelling itself "NO PRODUCTION STATE", so a tester could
certify a node against invented text that no player ever sees.

## Repairs (prior session, verified here)

| Repair | Where | Proof |
| --- | --- | --- |
| A dedicated renderer for every declared `visualType`, and `PuzzleVisual` renders it as an **element** (not a function call, so renderer state resets across node changes) | `src/components/player/puzzle/` | `puzzle-visual.test.tsx`; `FIELD_DEVICE_EMULATION_CASE_INVENTORY.md` shows every block now resolves to a renderer or a correctly-gated feed |
| `generateNodeDetail` reads the stored row; synthetic text is labelled as synthetic | `QAHub.tsx` | `qa-emulation-production-state.test.tsx` asserts the inspector states, per role, whether the block came from the stored row or is synthetic, and warns against certifying the synthetic case |
| Production isolation: the emulator **reads** two admin catalogs and **writes nothing** | `QASimulatorContext.tsx` | `qa-emulation-isolation.test.ts` scans the real source and asserts the only outbound calls are `listPuzzleQA()` and `listQRCodes()`, both read-only |
| Keyboard shortcuts stand down for text fields; Ctrl+R pins modifiers | `QAHub.tsx` | `qa-emulation-production-state.test.tsx` |

## Emulator fidelity — the emulator and the server must agree

An emulator is only useful if it answers the way the server does. Two agreements
were audited and repaired to match the server exactly (defects D-10 and the QR
lead R-05):

| Behaviour | Server contract | Emulator |
| --- | --- | --- |
| Accepted set | `acceptedAnswer` ∪ all `acceptedAnswers` | same |
| Matching | case-insensitive, whitespace-collapsed | same |
| Blank | never matches | same |
| Retry payout | attempt 1 full, attempt 2 `floor((base+1)/2)`, attempt 3+ zero | same |
| QR resolution | exact match on `code` / `markerId` / `manualCode` against real `qr_nodes` rows | same |
| QR while offline | the server cannot record a scan | emulator refuses with `offline` |
| Duplicate scan | `alreadyClaimed` for a marker this team used | same |
| Marker for a lead not given | `node_not_open` | same |

Before this repair the emulator carried its own `NX|V1|…` payload registry and
accepted it, so a QA pass proved the scanner worked against codes that fail on
every marker actually on the wall. Covered by `qa-simulator-attempts.test.tsx`.

## Isolation proof

The emulator's only outbound calls are two admin-authenticated **reads**. This is
asserted mechanically against the real source, not claimed:

```ts
// src/tests/qa-emulation-isolation.test.ts (shape)
// asserts QASimulatorContext performs no writes and only these two reads
```

There is **one deliberate exception** to "touches nothing": the emulator reads the
puzzle-QA catalog (so it can show real content) and the QR catalog (so a simulated
scan is answered by the same lookup the server performs). Both are read-only. No
production game state is written by any emulator path.

## Emulator-vs-production honesty

The emulator's purpose is undermined if it *lies about itself*. Two safeguards:

- A banner states whether the displayed content is real (read from the stored row)
  or synthetic, per role, and tells the tester not to certify the synthetic case.
- The showcase/parallel canon (the `SIMULATION DATA` fixtures) is gated behind
  `import.meta.env.DEV`; a production build sees an empty catalog. Verified in
  R-04 / `evidence-showcase-empty.test.tsx`.

## What is verified, and what is not

| Claim | Status |
| --- | --- |
| Every declared `visualType` has a renderer | **VERIFIED** by test + inventory |
| The emulator reads the stored row rather than inventing it | **VERIFIED** by test |
| The emulator writes no production state | **VERIFIED** by source scan |
| Emulator submit/scan semantics match the server | **VERIFIED** by test |
| The emulator renders identically to the player device | **VERIFIED LIVE** — the isolated player shell and the real player device were both driven in Chromium against the real project and render the same role-scoped node content (the Observer saw "FIELD OBSERVATION", the Operator "SYSTEM SYNTHESIS" with an active `VERIFY CONCLUSION` control) |
| The emulator behaves the same on a real handset form factor | **VERIFIED LIVE** — driven at a real 430×932 handset viewport; no layout failure, no overflow, bottom nav and bezel intact |

## Live pass (what a green static suite could not see)

The emulator and the player device were exercised in a real browser against the
real project. That pass found defects the whole static suite had missed — see
`NEXUS_QA_RESULTS.md` §"Live browser session" and register entries D-20…D-23. Two
of them (`list-puzzle-qa` 400, `list-locations` 500) are exactly the class of
fault this audit warned about: a **string a client builds**, invisible to a
source scan (the intent reads as correct) and to a unit test with a mocked client
(mocked clients never build the string). They are repaired at source and guarded;
the fixes are **not deployed**, so the live function still answers with the buggy
shapes until a deploy happens.

### Harness route coverage (recorded limitation, not an app defect)

`src/harness/player.tsx` wires only **eight** routes — `game`, `node`,
`evidence`, `inventory`, `navigation`, `qr`, `leaderboard`, `notifications`.
`/field`, `/field-log`, `/final`, `/video/*` and `/audio/*` are not harness
routes and render nothing there. This is a limitation of the isolated test shell,
not of the product: the real player device renders all of them, and it is the reference for those screens. The finale was therefore exercised through the real
device path and the 51-test full-chain simulation, not through the harness.

The last two rows of the table above were originally stated as limits ("NOT FULLY
VERIFIED", "BLOCKED"). The live pass replaced those limits with results. Where a
claim could not be verified here it is still marked honestly rather than dressed
up — no claim is a weaker thing relabelled as the strong thing.
