# FIELD DEVICE EMULATION — ROOT CAUSE ANALYSIS

**Status:** Confirmed by static trace + deterministic assertions; **repair
implemented and verified** (§4a)
**Scope:** Admin panel → *FIELD DEVICE EMULATION* (QA simulator hub) and the
player renderer it reuses
**Symptom reported:** every rebuilt puzzle renders as flat, near-empty prose;
per-role evidence and investigative structure are invisible; the emulation does
not let a tester inspect what the team will actually see.

---

## 1. Reproduction

The symptom reproduces without a browser, because the failure is in the content
→ renderer contract, not in the transport. The shortest deterministic
reproduction is:

1. Start the admin panel and open **FIELD DEVICE EMULATION**.
2. Start a simulation in the **FRESH** state, role **OBSERVER**, jump to node
   **P15** (or any Stage 2–5 gate).
3. The player node screen shows the role's `dataPayload` prose inside a plain
   "Data Feed" shell. No dial, no seating plan, no grating, no telemetry board,
   no dependency graph — even though the node is *about* one of those objects.

The same node in the **pre-rebuild** content rendered its dedicated visual. The
rebuild changed the content; the renderer registry was not changed with it.

Assertion form (added to `src/tests/puzzle-visual.test.tsx`, see §5):

```
shipped visualType set (from migrations 2026100603–09):
  audio, chart, console, document-forensics, graph-network,
  meta, observation, telemetry, terminal, timeline

CONTENT_VISUAL_TYPES (src/components/player/puzzle/visualTypes.ts):
  observation, spatial, visual, memory-recall, cipher, graph-network,
  document-forensics, audio, binary-technical, pattern, puzzle,
  dependency-tree, contradiction-hunt, timeline-investigation,
  three-phone, cipher-text, grid-maze, meta, final-boss

shipped but absent from the registry:
  chart, console, telemetry, terminal, timeline
```

---

## 2. The data path (traced end to end)

```
QAHub "Start Simulation"
  → QASimulatorProvider (client, in-memory)
      → loadPuzzleQA()  → adminAPI.listPuzzleQA()
            → bureau-operations edge fn, action 'list-puzzle-qa'
                  → SELECT code, content, answer_metadata, metadata … FROM puzzle_nodes
                    (the handler previously dropped `metadata` from the
                     response — RC-7)
      → puzzleQAData[code] = real node row
  → qa.getNode(nodeId, role)
      → generateNodeDetail(puzzle, role, solved, puzzleQAData[nodeId])
            roleContent = qaData.content[role.toLowerCase()]
                          ?? generateRoleContent(puzzle, role)   // synthetic fallback
            …every other narrative field used to be invented here (RC-6)
  → player Node.tsx
      → <PuzzleVisual type={roleContent.visualType}
                      dataPayload={roleContent.dataPayload}
                      interactiveData={roleContent.interactiveData} />
            RENDERERS[visualType.toLowerCase()] ?? GenericVisual
```

Two independent things must line up for a gate to render correctly:

1. **`list-puzzle-qa` must return the real row.** It requires the admin's
   `callBureau` session. If it fails, `loadPuzzleQA` swallows the error
   (`catch (_err) { /* QA data is optional */ }`) and `generateNodeDetail` falls
   back to `generateRoleContent`, which is *synthetic placeholder prose*:

   > `dataPayload: "Simulated payload for P15 (OBSERVATION)"`,
   > `whatTheySee: "You are the OBSERVER… Estimate: 8m."`,
   > `intermediateOutput: "[REDACTED for QA — server would provide here]"`

   This is the "empty / incoherent" screen. It is indistinguishable, to the
   tester, from a node that genuinely has no content — which is why the first
   half of the fix is to make that fallback *loudly legible* as a failure (§4D)
   rather than silently plausible.

2. **`visualType` must have a renderer.** When the real row loads, the rebuilt
   content ships `visualType` values the registry does not draw, and ships no
   `interactiveData` for most gates. Both cause a silent downgrade to
   `GenericVisual` (a grey "Data Feed" paragraph).

---

## 3. Root cause

### RC-1 — Content ships `visualType` values with no renderer (primary)

The Stage 1–5 rebuild introduced five `visualType` values that did not exist in
the seeded content the registry was built against:

| shipped `visualType` | role blocks | renderer today |
| --- | --- | --- |
| `terminal` | 14 | none → `GenericVisual` |
| `telemetry` | 3 | none → `GenericVisual` |
| `chart` | 1 | none → `GenericVisual` |
| `console` | 1 | none → `GenericVisual` |
| `timeline` | 1 | none → `GenericVisual` |
| `meta` | 29 | `MetaVisual` (draws, but its board reads missing data — RC-2) |

**20 of 123 rebuilt role blocks** declare a `visualType` the player cannot draw.
`PuzzleVisual` is deliberately total (it never renders nothing), so the failure
is silent: the tester sees a plausible paragraph, not an error.

### RC-2 — Rebuilt role blocks carry no `interactiveData` for structured visuals

*(Re-examined during the repair; downgraded from a defect to an accepted
limitation. See §4a.)*

The rebuild authored prose-only role blocks. The dedicated renderers are
*data-driven*: they read typed fields out of `interactiveData` and draw from
them. With none shipped:

- `meta` (29 blocks) → `MetaVisual` draws the "Stage Aggregator" shell with no
  links and no glyphs, because `interactiveData.answers` / `.symbols` / `.hint`
  are all absent. The stage aggregate looks broken because it *is* empty.
- `document-forensics` (40 blocks) → wraps the prose in the document shell but
  has no `documentText`, so the "recovered document" is just the payload line.
- `observation` (31 blocks) → `ObservationVisual` degrades to payload text plus
  an empty recall line.
- `audio` (2 blocks) → no `audioUrl` / `audioTranscript`, so no player.
- `graph-network` (1) → `CryptogramVisual` with no `symbols` → falls to prose.

In other words: even where a renderer exists, the content never gave it anything
to draw. This is *why the emulation reads as "no production state"* — the state
is real, but it is all unstructured prose.

### RC-3 — The guard that should have caught RC-1 is unmaintained

`src/components/player/puzzle/visualTypes.ts` claims to list *"Every visualType
present in the seeded puzzle content"*. It does not: the five new values are
absent, so:

- the DEV console warning (`PuzzleVisual.tsx:701`) never fires, and
- `puzzle-visual.test.tsx` — *"has a dedicated renderer for every type the
  content ships"* — passes, because it iterates the stale list, not the content.

`src/tests/case-content.test.ts` validates the rebuilt migrations' answers,
wiring, seeds and evidence, but **never asserts `visualType`**. So the drift was
invisible to the entire 1582-test suite.

### RC-4 — `list-puzzle-qa` failure is swallowed into plausible-looking prose

`QASimulatorContext.loadPuzzleQA` catches every error and proceeds with
`puzzleQAData = {}`. `generateRoleContent` then produces *confident, well-formed,
wrong* content. A tester cannot tell "the admin session expired" from "this node
is a stub". The QA tool must distinguish these, because the entire point of the
tool is to certify that what the team sees is what the Bureau stores.

### RC-5 — Isolation indicator is present but not load-bearing

The label `ISOLATED MEMORY / NO PRODUCTION STATE` (`QAHub.tsx:286`) is static
text. Nothing derives it from the state, so it stays "safe-looking" even if the
simulator were reading a production node. Isolation is real (synthetic
`qa-team` / `qa-player`, in-memory `getNode` / `submitAnswer`), but unproven to
the eye.

### RC-6 — The emulation invented the narrative instead of reading the stored row

This is the defect the header *"NO PRODUCTION STATE"* was hiding. During the
repair it became clear that `generateNodeDetail` read **only**
`qaData.content[role]` (line 211) and then *fabricated* every other field:

| Field shown to the tester | Where it actually came from |
| --- | --- |
| `narrativeObjective` | `"Investigate ${name} at ${location}."` — invented |
| `storyReveal` | `"Solving ${name} reveals the next piece…"` — invented |
| `whyTeamworkMatters` | `"The ${role}'s unique perspective…"` — invented |
| `locationClue` | `clueText: "Physical marker found at ${location}"`, `solution: "[Simulated]"` — invented |
| `evidenceUnlocked` | Built from `puzzle.type`, content `"Simulated evidence from…"` — invented |
| `operatorInvestigation` | `"Operator-only evidence for ${name}"` — invented |

The real row was in `qaData` the whole time. So even with a healthy admin
session and real content, the STATE INSPECTOR and the player viewport showed
plausible prose that was **not in the database**. A tester comparing the
emulation against the case bible would find the case thin — when it is not.

### RC-7 — `list-puzzle-qa` drops the `metadata` column on the way out

The handler selects `metadata` (line 1518) but does not return it (line 1576+).
`storyReveal`, `whyTeamworkMatters`, `locationClue` and `evidenceUnlocked` all
live there, so the emulation *structurally could not* read them even after
RC-6 is fixed. RC-6 and RC-7 together are the real "no production state": the
tool was showing a mock of the case, not the case.

---

## 4. Repair strategy

| # | Change | Files | Addresses |
| --- | --- | --- | --- |
| A | Add renderers for `terminal`, `telemetry`, `chart`, `console`, `timeline` | `PuzzleVisual.tsx` | RC-1 |
| B | Extend `CONTENT_VISUAL_TYPES` / `RENDERED_VISUAL_TYPES` with the new types | `visualTypes.ts` | RC-1, RC-3 |
| C | Derive the shipped type list from the migrations in a test | `case-content.test.ts` | RC-3 |
| D | Surface `list-puzzle-qa` failure as an explicit emulation banner / state, not silent synthetic content | `QASimulatorContext.tsx`, `QAHub.tsx` | RC-4 |
| E | Read every narrative field from the stored row instead of inventing it; return `metadata` from the edge handler; flag fallback with `contentIsReal` | `QASimulatorContext.tsx`, `bureau-operations/index.ts`, `lib/admin/index.ts`, `types/game-engine.ts` | RC-6, RC-7 |
| F | Derive the isolation indicator from simulated state and prove no production IDs are read | `QAHub.tsx` + isolation test | RC-5 |

**Constraints preserved:** content and structure only; no answer leakage; no
second renderer; no changes to RLS, authorization, or `verify_jwt` posture; new
numbered migrations only (history immutable); ASCII-only SQL payloads.

---

## 4a. Repair status

All six items are implemented and verified on this working tree:

| # | Status | Evidence |
| --- | --- | --- |
| A | Done | 5 renderers registered; `puzzle-visual.test.tsx` +5 tests |
| B | Done | both type lists extended; drift test green |
| C | Done | `case-content.test.ts` per-gate + drift assertions, 483 tests |
| D | Done | `role="alert"` banner + loaded-row `role="status"`; 3 tests |
| E | Done | `generateNodeDetail` reads stored row; handler returns `metadata`; 7 tests |
| F | Done | header derived from state; `qa-emulation-isolation.test.ts` 4 tests |

RC-2 was re-examined during the repair and **downgraded**: prose-only role blocks
legitimately render prose. The renderers are data-driven, and the rebuilt content
does not always ship `interactiveData`; inventing structure to fill them would
fabricate evidence, which the project forbids. The regression that mattered was
RC-1 (declaring a visual and not drawing it), and that is closed. Where a row
*does* carry structured data, RC-6's repairs now surface it faithfully.

Full-suite result after the repair: **74 files, 1649/1649 passed**; typecheck,
lint and build all clean. See `FIELD_DEVICE_EMULATION_VALIDATION.md`.

---

## 5. Verification used to establish this analysis

- Enumerated every `"visualType":"…"` in `supabase/migrations/2026100603–09`
  and diffed against `CONTENT_VISUAL_TYPES` (§1). 20/123 blocks unrendered.
- Traced `QAHub → QASimulatorProvider → getNode → generateNodeDetail →
  Node.tsx → PuzzleVisual` and read the real `list-puzzle-qa` handler
  (`bureau-operations/index.ts:1515`) to confirm it returns the real row.
- Read `puzzle-visual.test.tsx` and `case-content.test.ts` to establish that no
  existing assertion covers `visualType` drift (RC-3).

A deterministic reproduction assertion is added in the repair so this cannot
regress silently.
