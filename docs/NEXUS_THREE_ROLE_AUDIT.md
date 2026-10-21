# NEXUS ECHO — Three-Role Cooperation Audit

Observer, Analyst, Operator: what each one is for, whether the chain actually
forces cooperation, and the tests that hold it in place. Written against the real
content and the real server contract, not against intent.

Companion to `NEXUS_COMPREHENSIVE_AUDIT.md` (register) and
`NEXUS_PUZZLE_INVENTORY.md` (gate data).

## The intended chain

The case is played by three people on three devices. The roles are **deliberately
asymmetric** — each is handed a different slice of the evidence and none can see
another's screen.

```
Observer  →  sees the physical world (evidence, position, weathering, count)
                │
                │  speaks the observation aloud
                ▼
Analyst   →  transforms it against the archive (format, rule, reference)
                │
                │  speaks the transformation aloud
                ▼
Operator  →  holds the only terminal that accepts input, and submits
```

The line the whole design rests on:

> If the truth needs you alone, question it.

That line is the anti-solo rule stated as a theme. A gate that one role can solve
alone contradicts it.

## How the chain is *actually* enforced — by information, not by a gate

This is the finding that reorganised the audit. The server **does not** and
**cannot** detect "role removal", because of a deliberate design decision in
`2026100601`:

- The application never receives the Observer's or the Analyst's *results*.
  They see their block, do their work, and **say it out loud**. The data is never
  transported between devices.
- Only the Operator's device carries the terminal, and only the Operator's
  submission is accepted. A submission from anyone else is refused (403 /
  error) — not because they are "not the right role" but because they do not
  hold the submitting session.

So a subagent claim that "the role chain can be bypassed server-side" is **false
as a server defect** and is recorded as **R-03**. There is nothing server-side to
bypass: the chain is not a permission, it is a *dependency between pieces of
information that physically live on different devices*.

**Consequence for the audit.** Role-cooperation defects cannot be found in the
server. They can only be found in the **content**: a gate whose Observer block is
a placeholder, or whose Analyst block repeats the Observer's prose, has a chain
that has silently collapsed — and it will still pass every shape check. That is
exactly the regression the case×role matrix exists to catch.

## The case × role matrix (T9)

`src/tests/case-content.test.ts` holds all **47 gates × 3 roles** to the chain's
contract. Each assertion below runs per gate:

| Assertion | Catches |
| --- | --- |
| Every role block exists and every field is a non-empty string | a missing or blank role block |
| Each role states `whatTheySee` (its private evidence) and hands something on | a role with nothing of its own |
| `observerProduces` → `analystTransforms` → `operatorExecutes` all present | a broken coordination chain |
| **No two roles carry the same `dataPayload`** | a redundant role — if the Observer and Analyst are handed the same instrument, the gate is solvable without one of them |
| **No two roles are given the same `whatTheySee`** | duplicated evidence = a collapsed chain |
| Each gate has exactly three non-empty hints | hint degradation |
| Declared `visualType`s all have a renderer | a role block that would fall back to prose |
| The accepted answer is a token, not a sentence (≤ 4 words, ≤ 40 chars) | answer drift into prose |

The two **uniqueness** assertions are the heart of it. Identical prose across two
roles is the signature of a gate that no longer needs three people. Because the
matrix runs over the *current* content (newest `UPDATE` per code), it will fail
the moment a future edit collapses a role.

## Role-leak verification

A separate scan compared **every player-visible string of every gate × role**
against that gate's accepted answers, over the current content. A leak is either
(a) a role seeing the answer to a *deduction* gate, or (b) one role being handed
another role's material.

**Result: no gate leaks a deduction answer.** A token is visible to a role in
exactly two situations, both intentional:

| Situation | Gates | Why permitted |
| --- | --- | --- |
| Presented evidence | M01, P04, P21 | The token *is* a register/poster entry the team reads (the `2026100613` provenance repair). Flagged `presentedEvidence: true`; the server does not seal it. |
| Decision console | P37 | The finale asks the player to *choose* a disposition; the option labels are the answer set by construction. |

The scan also disposed of two alarms as false positives:

- A "leak at P07 / P23 / P23b" was the **short-answer redaction floor** (D-12: a
  document owner policy that answers under three alphanumerics are exempt from
  redaction) being misread as a leak. Those answers are single digits that appear
  incidentally in prose.
- No gate hands one role another role's material — the role-isolated payload
  (`2026100602`) holds.

## Submission integrity

| Rule | Where enforced | Test |
| --- | --- | --- |
| Only the Operator's session may submit | `2026100601` (operator-only submission) | invariant suite scans the function sources |
| A non-Operator submission is refused with the right status | 403 (authenticated, not permitted), never 401 | `src/tests/invariants.test.ts` |
| The Observer/Analyst results never reach the app by transport | `get_player_node_detail` returns role-isolated blocks | role-isolation scan (above) |

## Findings

| Ref | Finding | Verdict |
| --- | --- | --- |
| R-03 | Role-removal bypass server-side | **REFUTED** — not server-enforceable by design; reclassified as a content-quality question, now covered by the case×role matrix. |
| — | Role block collapsed to a placeholder in any gate | **Not present.** All 47 gates pass the uniqueness and completeness assertions. |
| — | A deduction answer visible to a role | **Not present.** Only M01/P04/P21 (presented evidence) and P37 (decision) show a token, both intentional. |
| — | Non-Operator submission accepted | **Not present.** Operator-only enforcement in `2026100601` is intact. |

## What the chain guarantees, stated plainly

A team of three *cannot* finish the case by one person working alone, and the
guarantee is physical rather than procedural: the Observer is the only one who
can see the wall, the Analyst is the only one who can read the archive, and the
Operator is the only one who can type. No amount of cleverness on one device
supplies the other two devices' screens. The matrix ensures the *content* keeps
honouring that — no gate quietly hands two roles the same thing.
