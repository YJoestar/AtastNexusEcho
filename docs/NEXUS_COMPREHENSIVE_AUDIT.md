# NEXUS ECHO — Comprehensive Audit Ledger

Master working record for the repository audit, puzzle repair, and QA effort.
Companion documents:

| Document | Purpose |
| --- | --- |
| `NEXUS_PUZZLE_INVENTORY.md` | Every gate, its content source of truth, and per-gate status |
| `NEXUS_STORY_AND_PROGRESSION_AUDIT.md` | Plot continuity, chronology, adjacent-case transitions |
| `NEXUS_THREE_ROLE_AUDIT.md` | Observer / Analyst / Operator role-removal tests |
| `NEXUS_PUZZLE_LOGIC_REPAIR.md` | Case-level reasoning defects and the repairs made |
| `FIELD_DEVICE_EMULATION_AUDIT.md` | Admin simulator diagnosis and isolation proof |
| `NEXUS_QA_RESULTS.md` | Commands actually run, real outcomes, limits |

## Source-of-truth map (established by recon)

- **Gate content (title, role blocks, hints, answers, metadata)** — canonical
  location is the migration history, not TypeScript. Each gate is a
  `puzzle_nodes` row; the player-facing JSON lives in `content`,
  `answer_metadata` and `metadata`.
  - Seed: `supabase/migrations/2026092903_seed_puzzle_nodes.sql`,
    `2026093035_audio_evidence_integration.sql`
  - Rebuild (current text): `2026100603`–`2026100607` (stages 1–5)
  - Answer dispositions: `2026100608`, `2026100609`
  - Enforced by `src/tests/case-content.test.ts`
- **Design intent** — `docs/NEXUS_CASE_MATRIX.md` (47-gate matrix),
  `docs/NEXUS_CASE_BIBLE.md`, `docs/NEXUS_TIMELINE_AND_KNOWLEDGE_GRAPH.md`
- **Submission / scoring** — `submit_puzzle_answer` in
  `2026100501` → `2026100601` → `2026100608`, surfaced through the
  `game-submit` edge function.
- **Role isolation** — `2026100602_role_isolated_player_payload.sql`
  (`get_player_node_detail`), plus `2026100601` operator-only submission.
- **QR / progression** — `2026100305_available_nodes_from_progress.sql`,
  `2026100307_qr_policy_and_resolver.sql`, `2026100308_resolve_node_ref.sql`

## Baseline verification (recorded before any change)

| Check | Command | Result |
| --- | --- | --- |
| Typecheck (app + edge) | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Unit/integration tests | `npx vitest run` | PASS — 74 files, 1649 tests |
| Git | `git status` | branch `investigation-rebuild`, 9 modified + 11 untracked files (pre-existing work, preserved) |

Working-tree note: the tree carried uncommitted work at the start of this audit
(`PuzzleVisual.tsx`, `visualTypes.ts`, `QASimulatorContext.tsx`, `QAHub.tsx`,
`lib/admin/index.ts`, `case-content.test.ts`, `puzzle-visual.test.tsx`,
`game-engine.ts`, `bureau-operations/index.ts`, two new QA emulator tests, six
`FIELD_DEVICE_EMULATION_*` docs). That work was verified green first and is
preserved; no destructive Git operation was used.

## Task register

| # | Task | Status |
| --- | --- | --- |
| T0 | Baseline verification (typecheck/lint/tests) | VERIFIED |
| T1 | Source-of-truth mapping | VERIFIED |
| T2 | Code & architecture audit (subagent A) | DONE — findings in D-08, D-11 |
| T3 | Puzzle & evidence audit (subagent B) | DONE — findings in D-01…D-06, D-09 |
| T4 | Three-role cooperation audit (subagent C) | DONE - role-removal claim refuted (R-03); case×role matrix added as the enforceable contract |
| T5 | Security & database audit (subagent D) | DONE — D-07, D-12 |
| T6 | Automated QA / emulation audit (subagent E) | DONE — D-10 |
| T7 | Adversarial puzzle review (subagent F) | DONE — reconciled into register |
| T8 | Defect register + prioritised fixes | DONE — D-01…D-11 and D-13…D-19 fixed; D-12 is an owner policy question; the remaining P3 leads carried as unverified leads were each checked against the real source and either fixed (D-17/D-18/D-19) or refuted (R-04/R-05) |
| T9 | Case-role test matrix + content validator | DONE - validator extended (repair files, decision + presented-evidence exemptions); case×role matrix added (683 tests in `case-content.test.ts`); destructive-SQL guard widened to admit a function redefinition and verified non-vacuous |
| T10 | Full progression verification | DONE — full suite re-run green after every repair; final run 76 files / 1876 tests, plus `npm run typecheck`, `npm run lint` and `npm run build` all clean |
| T11 | Deliverable documents | DONE — all seven written: `NEXUS_COMPREHENSIVE_AUDIT.md`, `NEXUS_PUZZLE_INVENTORY.md`, `NEXUS_STORY_AND_PROGRESSION_AUDIT.md`, `NEXUS_THREE_ROLE_AUDIT.md`, `NEXUS_PUZZLE_LOGIC_REPAIR.md`, `FIELD_DEVICE_EMULATION_AUDIT.md`, `NEXUS_QA_RESULTS.md` |
| T12 | Live browser pass against the real project | DONE — real Chromium + real dev server + real Supabase; found D-20…D-23 (green static suite missed all four) and walked the three-role path through a rejected and an accepted Operator submission; results in `NEXUS_QA_RESULTS.md` §"Live browser session" |
| T13 | Deploy and reconfirm live | DONE — migrations `2026100610`–`2026100614` pushed to the live project (all 65 read `local == remote`) and their effects read back from the live rows; `bureau-operations` deployed. Reconfirmation caught **D-24**: the D-23 repair was wrong and its verification had measured a URL the function never sends; corrected, redeployed, both actions now live **200** |

## Defect register

Severity: **P0** breaks a playthrough · **P1** makes a gate unfair or
self-contradictory · **P2** correctness/robustness · **P3** polish.

Statuses are honest: **FIXED** = repair present in the tree and covered by a
test or a re-run; **OPEN** = verified, not yet fixed; **BLOCKED** = cannot be
verified here; **POLICY** = a deliberate design decision left to the owner.

| # | Sev | Area | Defect | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| D-01 | P0 | Content P37 | The finale console printed `ERASE` / `KEEP` / `RELEASE`, but only `DELETE` / `RETAIN` / `SHARE` were accepted, and the normalizer maps no synonyms — a team that typed what it read was rejected at the last gate. | `2026100607` stage 5 operator payload vs `answer_metadata.acceptedAnswers` | **FIXED** `2026100610_finale_disposition_alignment.sql` (both word families accepted, solution reworded) |
| D-02 | P1 | Content P27b | Prompt asked for the corrupted *step*, the register named a different value, and the only printed hex was the one the register flipped *to* — the accepted token `0x02` was contradicted by the evidence and unreachable. | `2026100606` stage 4 | **FIXED** `2026100611_repair_p27b_answer_target.sql` (canonical `0x02` kept; evidence reframed to the written state slot; format stated) |
| D-03 | P1 | Content P29 | Briefing printed the class name only as `NEXUS` and the code only as `AI`, then demanded `NEXUS IS AI` while forbidding the space it printed. | `2026100606` stage 4 | **FIXED** `2026100612_repair_p29_identity_format.sql` (project name + class code printed as separate data; contradiction removed; `NEXUS AI` also accepted) |
| D-04 | P1 | Content P04 | Answer `F`; the gate never printed a poster letter, a poster date, or the closure date, so the letter was unguessable vocabulary. | `2026100603` stage 1 | **FIXED** `2026100613_repair_token_provenance.sql` (dated poster set + closure record + acquisition register) |
| D-05 | P1 | Content M01 | Answer `LIGHT`; register "defines standard evidence classes" and policy "defines how classes are assigned" but neither ever named a class. | `2026100603` stage 1 | **FIXED** same migration (register entries + policy definition printed) |
| D-06 | P1 | Content P21 | Answer `ARCHIVE`; payload said "institution records repository" but never the archive's own one-word term. | `2026100605` stage 3 | **FIXED** same migration (access register heads each line with the term) |
| D-07 | P1 | Server | Printing a presented-evidence token would itself be sealed: `get_player_node_detail` redacts any player string containing the normalised answer, so a repaired register would ship as `[ sealed ]`. | `2026100602` L108–145, `nexus_contains_answer` `2026093010` L140 | **FIXED** `2026100614_presented_evidence_redaction.sql` (`answer_metadata.presentedEvidence` = per-gate exemption; pinned by test to exactly M01/P04/P21) |
| D-08 | P2 | Component | `PuzzleVisual` invoked the chosen renderer as a plain function, so renderer-local state was owned by the parent and did not reset across node changes. | `src/components/player/puzzle/PuzzleVisual.tsx` | **FIXED** rendered as an element; regression test in `puzzle-visual.test.tsx` |
| D-09 | P3 | Content P22/M04 | Reported as two gates sharing the title "The Hidden Layer". | — | **REFUTED** — a full parse of all 47 current gate titles finds no duplicates (P22 "Lab Notebook Fragment #51", M04 "Stage 4 Meta - Core Activation Protocol"). The finding came from a regex over-reaching across statement boundaries. No change made. |
| D-10 | P2 | Emulator | `QASimulatorContext.submitAnswer` ignores `acceptedAnswers` and the P37 sentinel, and ignores the server's retry halving — the emulator and the server disagree about correctness. | `src/contexts/QASimulatorContext.tsx` ≈L909 | **FIXED** — mirrors `submit_puzzle_answer` (2026100608): accepted set = `acceptedAnswer` + `acceptedAnswers`, case-insensitive with collapsed whitespace, blank never matches; payout follows the server's attempt 1 / 2 / 3+ schedule. Covered by `qa-simulator-attempts.test.tsx` |
| D-11 | P2 | App | `solvedNodes` was UUID-keyed while every consumer reads by code; the team-level `hintsUsed` was hardcoded `0`; QA mode reported `attempts: 0, hintsUsed: 0`. | `AppProvider.tsx` ≈L523, `useGameEngine.ts` ≈L675 | **FIXED** — keyed by `nodeCode` (UUID only as a fallback), hint total summed from the per-node rows the server publishes, QA branch reads the simulator's real progress |
| D-12 | POLICY | Server | Answers shorter than three alphanumerics are not redacted, so single-character answers surface in prose. Documented as intentional in the migration itself. | `2026093010` L146–149 | **POLICY** (owner decision) |
| D-13 | P3 | App | `useAnimation` passed `'cubic-bezier(0.16, 0.84, 0.44, 1)'` as a GSAP ease. GSAP does not accept a CSS bezier string: it misses the ease registry and silently substitutes `power1.out`, so the authored curve was never applied anywhere and nothing threw. | `src/hooks/useAnimation.ts` L35, L66, L103 | **FIXED** — one named `SNAP_OUT = 'power3.out'` used by all three timelines; `animation-ease.test.ts` scans the real sources and fails on any ease `gsap.parseEase` cannot resolve |
| D-14 | P3 | App | `useGameAudio` built its `AudioContext` at module scope — i.e. before any user gesture — which browsers start `suspended`, so the opening sounds of a session were silently discarded. | `src/hooks/useGameAudio.ts` L16–22 | **FIXED** — context is built lazily on the first sound (inside the gesture that asked for it) and resumed only when suspended; `game-audio-lifecycle.test.ts` pins lazy construction, single reuse, mute gating and the no-`AudioContext` fallback |
| D-15 | P3 | Emulator | The hub computed `contentIsReal` and never rendered it, so a tester could read generated placeholder prose under a header reading "NARRATIVE READ FROM PRODUCTION CONTENT" and certify a node against text no player sees. | `QAHub.tsx` `PuzzleDetailViewer` | **FIXED** — the inspector now states, per role, whether the block came from the stored row or is synthetic, and tells the tester not to certify the synthetic case. Covered in `qa-emulation-production-state.test.tsx` |
| D-16 | P3 | Emulator | Space ("solve current node") and Ctrl+R ("reset simulation") fired while any control had focus, so typing a space into a field solved the node under test and Ctrl+R wiped the run. | `QAHub.tsx` `KeyboardShortcuts` L856 | **FIXED** — shortcuts stand down for `input`/`textarea`/`select`/contenteditable targets, and Ctrl+R is matched with modifiers pinned so Shift/Ctrl+Shift+R (browser hard reload) still works. Covered in `qa-emulation-production-state.test.tsx` |
| D-17 | P2 | Component | `recordEvidenceInspection` mutated the workspace it was handed and returned a bare boolean, breaking this module's pure-return convention (`recordDiscoveries` returns a new workspace). `EvidenceArchive.markInspection` calls it inside `updateWorkspace(current => …)`, whose `current` is the state object already committed by React; the shallow `{ ...current }` the caller took shares the nested `revelations` map, so the write landed on the **previous** state. Any consumer holding the old reference saw it change under them and change detection could not tell the two apart. | `src/lib/investigationWorkspace.ts` L320, `EvidenceArchive.tsx` L149 | **FIXED** — `recordEvidenceInspection` is now pure (returns a new workspace, like its sibling); the badge-clear that `markInspection` used to force with a second in-place write is a dedicated pure `clearEvidenceNewInfo`. Contract pinned by `evidence-evolution.test.ts` (mutation guard + new-reference guard) |
| D-18 | P3 | Player hook | `useCaseLead` took a `solvedNodes: string[]` parameter whose only caller passed a hardcoded `[]`, so the extra `!solvedNodes.includes(n.code)` test could never fire. It implied a filter that was not in fact applied — solved nodes were excluded only because `allNodesForMap` already carries `solved` and the same predicate tests it. A parameter that looks load-bearing but is never supplied is a trap for the next reader. | `src/hooks/useCaseLead.ts` L22, `FieldHub.tsx` L70 | **FIXED** — dead parameter and its unreachable clause removed; the surviving `!n.solved` filter is the one that was doing the work |
| D-19 | P2 | Player map | The minimap clamps an out-of-range teammate to the rim of the dial. The clamp measured the gap in WORLD units (`halfView`, the world radius the dial covers) but placed the marker at `center * 0.85`, where `center` is half the canvas in PIXELS. Mixing the two spaces put the marker at a world offset unrelated to the edge — for the default 200-px dial and 280-unit view it drew at ≈30% of the radius, nowhere near the rim, so an out-of-range teammate was indistinguishable from a near one. | `src/components/player/map/DynamicMinimap.tsx` L213 | **FIXED** — clamp radius is now `halfView * 0.85` (world units), which projects to 85% of the pixel radius: a marker just inside the dial. Regression test reads the arcs the component actually draws and asserts the clamped marker is beyond 60% of the radius |
| D-20 | P1 | Player connectivity | The shared health probe published an **aborted** probe as a completed *degraded* verdict. The app renders inside `<StrictMode>`, whose first unmount aborts the in-flight probe while the remount's probe is skipped by the `inFlight` guard; the abort's `catch` then wrote `isServerReachable:false` **with a timestamp**, i.e. a finished "NO ROUTE TO SERVER". `useGameEngine` refuses to fetch while offline, so the hub rendered "CASE NOT OPEN" on a device whose probe answered 200, and stayed there until the player tapped RETRY. Found **live**, in a real browser against the real project — every static suite was green. | `src/hooks/useConnection.ts` `runProbe`/`subscribe` | **FIXED** — an aborted probe records no verdict; teardown clears the `inFlight` guard and the `abortInFlight` handle so the remount's probe runs at once. Guard in `connection.test.tsx` uses a probe that honours its `AbortSignal` and **fails before the fix**. |
| D-21 | P2 | Player connectivity | Same path: an abort set `lastProbedAt` without reaching the server, so the hook reported the completed `degraded` status rather than the in-progress `reconnecting` status — "still probing" collapsed into "probe failed". | `src/hooks/useConnection.ts` `runProbe` | **FIXED** — `lastProbedAt` is written only by a probe that reached the server or genuinely failed |
| D-22 | P0 | Server | `bureau-operations` `list-puzzle-qa` filtered with `.in('metadata->nodeCode', …)`. The single arrow makes PostgREST send the right-hand side as JSON, which Postgres rejects with `22P02` ("invalid input syntax for type json"); `dbError()` maps `22xxx` to **400**, so the action failed on every call and the QA simulator could never load stored puzzle content. Reproduced live at the REST layer: `metadata->nodeCode=in.(P01,P02)` → 400 `{"code":"22P02","details":"Token \"P01\" is invalid.","message":"invalid input syntax for type json"}`. | `supabase/functions/bureau-operations/index.ts` L1530 | **FIXED** — `.in('metadata->>nodeCode', …)` (verified live to return 200 via the function's own client). Guard in `invariants.test.ts`. |
| D-23 | P1 | Server | `bureau-operations` `list-locations` ordered an embedded table with `.order('puzzle_nodes.code', { foreignTable: 'puzzle_nodes' })`. PostgREST fails to parse the term, and the unclassified error surfaces as **500** on every call. Reproduced live at the REST layer: `order=puzzle_nodes.code.asc` → 400 `PGRST100` "unexpected \"c\" expecting \"asc\", \"desc\", \"nullsfirst\" or \"nullslast\"" — the server's own parser rejecting the exact string. | `supabase/functions/bureau-operations/index.ts` L2100 | **SUPERSEDED BY D-24** — the first repair kept the table-qualified form and still failed live. |
| D-24 | P1 | Server | The D-23 repair was wrong and its "live confirmation" was measured against a shape the function never sends. `{ foreignTable }` makes supabase-js emit a nested order keyed by the foreign table (`puzzle_nodes.order=<value>`), so the value must be a bare column. `puzzle_nodes(code).asc` stayed qualified → live **400 `PGRST108`** "'puzzle_nodes' is not an embedded resource in this request" (the embed is aliased `puzzle_nodes:node_id`). The action answered **500** for every caller. | `supabase/functions/bureau-operations/index.ts` L2100; guard rewritten in `src/tests/invariants.test.ts` | **FIXED & DEPLOYED** — `.order('code', { foreignTable: 'puzzle_nodes' })`; `list-locations` live **200**. Reproduced via supabase-js 2.45.0 (the pinned version) instead of a hand-built URL. The old guard asserted the literal `'puzzle_nodes(code)'` string and so *locked in* the wrong fix; it now asserts the shape and fails against the broken form. |

### Guard change (not a defect, recorded for transparency)

`case-content.test.ts` "no destructive or schema-changing SQL" held every repair
migration to `UPDATE puzzle_nodes` alone. `2026100614` legitimately redefines a
function body, so the guard was widened to admit exactly three statement shapes:
`UPDATE puzzle_nodes`, `CREATE OR REPLACE FUNCTION`, and the
`REVOKE`/`GRANT EXECUTE ON FUNCTION get_player_node_detail(uuid, text)` pair that
must accompany the redefinition (CREATE OR REPLACE does not preserve EXECUTE
grants). No other target is allowed, and a second assertion rejects any statement
containing `ALTER`, `DROP`, `TRUNCATE` or `DELETE`. The widened guard was itself
verified against a hostile fixture of four statements — `ALTER TABLE`, `DROP
POLICY`, `TRUNCATE` and a `REVOKE` on a *different* function — and rejects all
four, so it did not become vacuous.

`visualTypes.ts` and `lib/admin/index.ts` appear as modified in `git status` from
the **prior** session's Field Device Emulation work; they are being kept as
agreed, not re-authored here. `src/tests/qa-emulation-isolation.test.ts` is
likewise prior-session work.

### Findings raised and then refuted

Audits produce false positives as readily as real defects, and a defect register
that only grows is a register nobody can trust. Each entry below was checked
against the real artefacts and dismissed; they are kept so the same claims are
not re-raised.

| Ref | Claim | Verdict |
| --- | --- | --- |
| R-01 | Two gates (P22, M04) share the title "The Hidden Layer". | **REFUTED** (was D-09). A full parse of all 47 current titles finds no duplicate — P22 is "Lab Notebook Fragment #51", M04 is "Stage 4 Meta - Core Activation Protocol". The finding came from a regex reading across statement boundaries. |
| R-02 | An answer leaks into a role block at P07, P23, P23b. | **REFUTED.** Two independent scans of every player-visible string of all 47 gates × 3 roles find the answer visible to a role in exactly two gates: M01 and P21 — both of which present their token deliberately (D-04/D-05/D-06, `presentedEvidence`). The P07 alarm was the `<3`-character redaction floor (D-12, a documented policy) being misread as leakage. No gate leaks a deduction answer to a role. |
| R-03 | The role chain can be bypassed server-side (subagent F: "role-removal bypass"). | **REFUTED as a server defect; reclassified as design.** The application never receives the Observer's or the Analyst's results *by design* (2026100601): they communicate verbally, and the server accepts submissions from the Operator alone, returning 403/error otherwise. There is therefore nothing server-side to enforce, and no bypass exists. What remains is a content-quality question — whether a gate's non-Operator material is *substantive* — which is now pinned by the case × role matrix (T9). |
| R-04 | The evidence register ships developer fixtures (generated showcase records) that could be certified as production content. | **REFUTED.** The "showcase" catalog is development-only by construction: `showcaseEnabled()` returns `import.meta.env.DEV === true`, `showcaseCatalog()` returns `[]` otherwise, every record carries `simulation: true`, and each screen is stamped `SIMULATION DATA`. `evidence-showcase-empty.test.tsx` simulates a production build (catalog mocked to `[]`) and asserts no record renders even on a deep link. Not a leak. |
| R-05 | The emulator's QR scanner accepts codes the production scanner rejects, and lets an offline device "discover" a marker the server could never record. | **REFUTED.** `QASimulatorContext.scanQR` now matches the exact `scan_qr_code` contract: it resolves against the real `qr_nodes` rows by `code`/`markerId`/`manualCode`, refuses outright while `isOffline`, returns `alreadyClaimed` for a marker this team already used, and answers `node_not_open` for a lead the team has not been given. It previously carried its own `NX\|V1\|…` registry — that was D-10's class of defect and is already repaired. |

## Worklog

- **Recon.** Repository is a Vite/React 18/TS app with Supabase edge functions
  and a long SQL migration history. 47 gates (P01–P37 incl. branch gates
  P06b/P07b/P17b/P23b/P24b/P27b, plus M01–M04 meta gates). Existing suite is
  large and green (1649 tests), which means the defects to find are ones the
  suite does not yet exercise — not compile errors.
- Prior sessions left a partially-completed Field Device Emulation effort in the
  working tree; it is kept and will be verified rather than redone.
- **Content leak scan (verification, not a repair).** Every player-visible string
  of every gate was compared against that gate's accepted answers, per role, over
  the *current* content (the newest `UPDATE` per code across the whole migration
  history). Result: exactly two gates ever show a role its own answer — M01 and
  P21 — and both do so deliberately as presented evidence. No gate reveals a
  deduction answer, and no gate hands one role another role's material. The
  role-isolated payload (`2026100602`) holds: the Observer's and Analyst's
  results reach the team by speech, never by transport.
- **Repair migrations (D-01…D-07).** Five migrations, each a pure `UPDATE
  puzzle_nodes` except `2026100614`, which redefines one function. All five were
  re-read with an SQL-aware scanner that skips dollar-quoted bodies and
  single-quoted strings: balanced `$$` quoting, balanced parentheses, ASCII-only,
  and all 16 embedded JSON literals parse. An earlier "odd quote count" from a
  naive counter was an artefact of that counter running through a JSON body.
- **Carried P3 leads closed out.** Each unverified lead was re-checked against the
  real source rather than accepted on description. Three were real and are now
  fixed — D-17 (a helper that mutated committed React state), D-18 (a parameter
  that implied a filter it never applied) and D-19 (a clamp that mixed world and
  pixel units). Two were refuted and recorded — R-04 (the showcase register is
  dev-gated, not a production leak) and R-05 (the QR simulator already matches the
  server contract, including the offline refusal).
- **Live pass (T11).** After the static pass the product was driven in a real
  Chromium browser against the real dev server and the real Supabase project,
  with real Bureau super-admin credentials and three real player devices. The
  live pass did what no static suite could: it found **four** defects (D-20…D-23)
  while every suite was green. Two are PostgREST query-shape faults in
  `bureau-operations` — a `->` where `->>` is required (`list-puzzle-qa`, 400 on
  every call) and a `foreignTable` order term PostgREST cannot parse
  (`list-locations`, 500 on every call) — both invisible to a source scan and to a
  mocked client. The first was reproduced live and verified fixed live. The second
  also exposed the limit of that verification: the "confirmation" was measured
  against a URL the function never sends, so the first repair shipped, deployed,
  and still answered 500. Replaying the call through supabase-js 2.45.0 revealed
  the real shape (`400 PGRST108`) and the guard was rewritten, because the original
  had asserted the broken string literally **D-24**. Both actions now answer 200
  live. The other two are a connectivity race (D-20/D-21) that showed
  a healthy handset as "NO ROUTE TO SERVER" and left the hub on "CASE NOT OPEN"
  until the player tapped RETRY. The live three-role path was walked end to end:
  all three roles logged in and bound devices, `start-team` correctly refused
  before all three were bound and succeeded after, P01 rendered its real
  role-scoped content, a wrong Operator submission (`WRONGXX`) was rejected and
  recorded as an attempt, and the correct submission (`CDFDEFF`) was accepted —
  advancing the real case to `1 / 47` and issuing P02.
- **Final verification (T10).** After the last change: `npm run typecheck` clean
  (app and edge), `npm run lint` clean at `--max-warnings 0`, `npm run build`
  succeeds, and `npx vitest run` is **76 files / 1876 tests, 0 failed** — up three
  tests from the pre-live state (two PostgREST query-shape guards, one connection
  race guard) with one over-specified StrictMode test reshaped, not deleted. No
  pre-existing test was weakened, skipped or removed to reach green, and the D-20
  guard was confirmed to **fail before the fix** and pass after.