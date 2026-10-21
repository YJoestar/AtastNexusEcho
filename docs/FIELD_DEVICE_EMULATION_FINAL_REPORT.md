# FIELD DEVICE EMULATION — FINAL REPORT

Repair of the admin panel's **FIELD DEVICE EMULATION** (QA simulator), so it can
inspect and QA-test every gate, every role, the investigative logic, and the
Operator conclusion flow without touching production state.

Branch `investigation-rebuild`, head `5f154a2` + this working tree. Nothing
merged to `work`/`main`; nothing pushed.

---

**1. What was wrong, in one line.**
The emulation was showing a *mock* of the case while labelling itself
"NO PRODUCTION STATE" — it invented every narrative field instead of reading the
stored row, and 20 of 123 role blocks declared a visual the player could not draw.

**2. Two independent defects, not one.**
(a) A **content → renderer contract break**: `terminal`, `telemetry`, `chart`,
`console`, `timeline` shipped with no renderer, so those blocks degraded silently
to prose. (b) A **fidelity break**: `generateNodeDetail` fabricated the
objective, story reveal, teamwork note, physical clue, operator brief and
unlocked evidence instead of reading them from the row it already had — and the
edge handler dropped the `metadata` column those fields live in.

**3. Why it was invisible.**
`PuzzleVisual` is total by design (it never renders nothing), so a missing
renderer is a silent downgrade. `CONTENT_VISUAL_TYPES` claimed to list every
shipped type but omitted the five new ones, so the DEV warning never fired and
the existing test iterated the stale list. `case-content.test.ts` never asserted
`visualType`. A swallowed `catch (_err) {}` made a refused feed look like thin
content. Every failure path produced plausible output.

**4. What was added to the renderer.**
Five dedicated renderers — `TerminalVisual`, `TelemetryVisual`, `ChartVisual`,
`ConsoleVisual`, `TimelineVisual` — with new payload readers (`readMetrics`,
`readBars`, `readSteps`, `readEvents`), registered in the `RENDERERS` map in
`src/components/player/puzzle/PuzzleVisual.tsx`.

**5. What was added to the registry.**
`terminal`, `telemetry`, `chart`, `console`, `timeline` added to both
`CONTENT_VISUAL_TYPES` and `RENDERED_VISUAL_TYPES` in `visualTypes.ts`.

**6. What was added to the edge function.**
`bureau-operations` `list-puzzle-qa` now returns the `metadata` column it was
already selecting. `PuzzleQAEntry.metadata` is typed in `src/lib/admin/index.ts`.

**7. What was added to the simulator.**
`generateNodeDetail` now reads **every** narrative field from the stored row:
`narrativeObjective` and `operatorInvestigation` from `content`; `storyReveal`,
`whyTeamworkMatters`, `locationClue` and `evidenceUnlocked` from `metadata`, with
the linked evidence row supplying the unlocked file's text. Synthetic text is
reserved for a node the feed genuinely could not reach, and flagged by a new
`contentIsReal` boolean.

**8. What makes a failure loud.**
`loadPuzzleQA` no longer swallows errors. `qaLoadError` drives a `role="alert"`
banner (*STORED CONTENT UNAVAILABLE*) and `qaLoadedCodes` drives a `role="status"`
line reporting how many stored rows loaded. An empty feed is now distinguishable
from a refused one.

**9. What makes the isolation legible.**
The hub header is derived from state: *READ-ONLY MIRROR OF STORED STATE* when rows
loaded, *STORED STATE UNREACHABLE* when the feed was refused — always
*NO PRODUCTION WRITES*.

**10. The emulation still reuses the real player renderer.**
No second renderer was introduced. `QAPlayerShell` mounts the production player
tree; the screens call `useApp()`/`useGameEngine()`, which detect the QA context
(`useGameEngine.ts:626`) and delegate. A change to the player shows up in the
emulation automatically.

**11. Isolation is proved against the source, not asserted.**
`qa-emulation-isolation.test.ts` fails the build if the module gains a write, a
third admin call, a literal UUID, or a service-role reference. The only outbound
calls are the two read-only admin catalogs (`listPuzzleQA`, `listQRCodes`). No
RLS, authorization or `verify_jwt` posture was changed.

**12. Coverage of every gate and role.**
`docs/FIELD_DEVICE_EMULATION_CASE_INVENTORY.md` lists all 47 gates and their
per-role `visualType`. 141 role blocks total; 123 declare a visual, 18 (Stage 1)
declare none and correctly render the generic readout. After the repair, **zero**
declared visuals fall through.

**13. The Operator conclusion flow.**
P37 is reachable by jumping to it in any state; the operator-only conclusion runs
through the real `Final.tsx`, whose dispositions (`DELETE`/`RETAIN`/`SHARE`) are
read from the stored row. No verdict is exposed to Observer or Analyst, and a
failed conclusion stays the single generic in-fiction rejection.

**14. Verification actually performed.**
`npm run typecheck` clean (app + edge); `npm run lint` clean
(`--max-warnings 0`); `npm run build` clean; `npx vitest run` →
**74 files, 1649/1649 passed** (baseline 72/1582; +2 files, +67 tests, none
weakened). Targeted: `case-content` 483, `puzzle-visual` 24, production-state 10,
isolation 4, `invariants` 180.

**15. Verification NOT performed (stated plainly).**
No browser walk-through (this environment has vitest and
`@testing-library/react`, no Playwright and no display). No live
`list-puzzle-qa` round trip (requires an authenticated admin session). No real
human playthrough. These are documented in
`docs/FIELD_DEVICE_EMULATION_VALIDATION.md` §5 rather than papered over. The
emulation is *verified as a tool*, not yet *used* as one.

**16. Regression posture.**
The repair cannot silently regress: a new `visualType` without a renderer fails
`case-content.test.ts`; the type list drifting from the migrations fails the same
suite; invented content fails the production-state tests; a write or a production
id fails the isolation test; a swallowed feed failure or a dropped `metadata`
column fails the production-state tests.

**17. Deliverables.**
All five required documents are written:
`FIELD_DEVICE_EMULATION_ROOT_CAUSE.md` (RC-1…RC-7 + repair status A–F),
`FIELD_DEVICE_EMULATION_TOOL_AUDIT.md` (control-by-control truth audit),
`FIELD_DEVICE_EMULATION_ISOLATION_AUDIT.md` (what it may touch, proved),
`FIELD_DEVICE_EMULATION_CASE_INVENTORY.md` (47 gates × 3 roles),
`FIELD_DEVICE_EMULATION_VALIDATION.md` (commands, results, and the gaps).
This report is the final item.

---

## Outstanding, and the next action

The repair is complete and verified in-source. The one thing that remains is the
thing only a person can do: open `/admin/qa-simulator` on a real device and play
one gate as each role, then the P37 conclusion as Operator. If anything looks
wrong there, the useful report is **role + gate code + observed symptom**, which
maps directly onto the assertions added here.
