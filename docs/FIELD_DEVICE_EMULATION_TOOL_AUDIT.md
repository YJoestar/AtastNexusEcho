# FIELD DEVICE EMULATION — TOOL AUDIT

**Scope:** every surface under `/admin/qa-simulator` ("FIELD DEVICE EMULATION"),
what each control actually does, and whether it tells the truth.

**Method:** read the real sources end to end —
`src/features/admin/QAHub.tsx`, `src/contexts/QASimulatorContext.tsx`,
`src/features/admin/QAPlayerShell.tsx`, `src/hooks/useGameEngine.ts`,
`src/features/player/Node.tsx`, `src/features/player/Final.tsx`,
`src/components/player/puzzle/PuzzleVisual.tsx` — and cross-checked each
control against a test.

---

## 1. Component inventory

| Component | File | Role |
| --- | --- | --- |
| `QAHub` | `src/features/admin/QAHub.tsx` | The hub: setup screen, tabbed control panel, embedded viewport |
| `QAHubInner` | same | Holds emulation state; reads `useQA()` |
| `PuzzleDetailViewer` | same | STATE INSPECTOR: per-node, per-role detail dump |
| `KeyboardShortcuts` | same | Space = solve, Ctrl+R = reset |
| `QAPlayerShell` | `src/features/admin/QAPlayerShell.tsx` | Second React root + `MemoryRouter`; renders the **real** player tree |
| `QASimulatorProvider` / `useQA` | `src/contexts/QASimulatorContext.tsx` | In-memory engine + app surface the player screens consume |
| `generateNodeDetail` | same | Builds the `NodeDetailPlayerView` the player renders |
| `PuzzleDetailViewer`, `PuzzleVisual` | `src/components/player/puzzle/` | The real renderer the emulation reuses |

The emulation **does not ship a second renderer**. `QAPlayerShell` mounts the
production player screens; they call `useApp()` / `useGameEngine()`, both of
which detect the QA context (`useGameEngine.ts:626`) and delegate. A change to
the player therefore shows up in the emulation automatically — which is the
only way the tool can certify anything.

---

## 2. Control audit

| Control | Intended effect | Actual effect | Verdict |
| --- | --- | --- | --- |
| **Start Simulation** | Begin an isolated run | `setCustomProgress` + optionally `jumpToNode('P01')`, mounts `QAPlayerShell` | Honest |
| **Terminate Simulation** | Tear down the run | `resetSimulation()` + unmount | Honest |
| **Solve Current** | Mark the active node solved | `forceSolve()` — marks solved, awards points, advances | Honest (was broken pre-rebuild; see §4) |
| **Advance Progression** | Move to the next node | `advanceProgression()` | Honest |
| **Jump to node** | Open any node by code | `jumpToNode(code)` if the code is in `ALL_PUZZLES` | Honest |
| **Role switch** (Observer/Analyst/Operator) | Re-render as that role | `setRole` → player screens re-render with that role's block | Honest |
| **Simulation type** (FRESH/PARTIAL/COMPLETE/CUSTOM) | Seed different progress states | `setCustomProgress` — derives the solved/available sets | Honest |
| **Toggle Offline** | Simulate offline | `toggleOffline()` → `isOffline` on the simulated engine | Honest |
| **Toggle Lock** | Simulate a game lock | `toggleLock()` → submissions refuse | Honest |
| **Reveal Answer** | Show the node's stored answer | `revealAnswer()` — **admin-side inspection only**; never rendered into the player viewport | Honest, but see §3 |
| **Force Solve** | Solve without the answer | `forceSolve()` | Honest |
| **Reveal QR** | Show a marker payload | `revealQR()` — admin-side inspection | Honest |
| **Keyboard: Space / Ctrl+R** | Solve / reset | Bound in `KeyboardShortcuts` | Honest |
| **Device preset** | Mobile viewport | Sets the shell width; the player tree renders unchanged | Honest |
| **Fullscreen** | Expand the viewport | Toggles the display overlay | Honest |
| **STATE INSPECTOR** | Dump node detail | `PuzzleDetailViewer` calls `getNode(code, role)` and prints the returned object | Honest after this repair (§3) |
| **NODE REGISTER** | Progress table | Reads `qa.nodeProgress` / `allNodesForMap` | Honest |
| **QR Inventory** | Marker register | `adminAPI.listQRCodes()`; failure is surfaced as a state, not an empty table | Honest |
| **EVIDENCE REGISTER** | Evidence catalog | `buildDevelopmentCatalog` against the real linked evidence | Honest |
| **EVIDENCE LAB mode** | `simulateEvidenceUpdate` | In-memory evidence override | Honest |

---

## 3. Where the tool did not tell the truth (now repaired)

### 3.1 The inspector showed fabricated narrative
`generateNodeDetail` read only `qaData.content[role]` and then **invented** the
objective, story reveal, teamwork note, physical clue, operator brief and
unlocked evidence. STATE INSPECTOR therefore displayed plausible prose that was
not in the database, under a header that said *"NO PRODUCTION STATE"*. A tester
reading it would reasonably conclude the case was thin — when in fact the real
row is rich.

**Repaired:** every narrative field is now read from the stored row
(`generateNodeDetail` in `QASimulatorContext.tsx`), with synthetic text reserved
for a node the feed could not reach and flagged by `contentIsReal:false`.

### 3.2 The `metadata` column was dropped at the edge
`list-puzzle-qa` selected `metadata` but never returned it, so the emulation
*structurally could not* show the real `storyReveal`, `locationClue`,
`evidenceUnlocked` or `whyTeamworkMatters`. **Repaired:** the handler returns
`metadata`; `PuzzleQAEntry.metadata` is typed.

### 3.3 A refused feed looked like thin content
`loadPuzzleQA` swallowed every error into `catch (_err) {}`. **Repaired:** the
failure is recorded (`qaLoadError`) and shown as a `role="alert"` banner;
success shows the loaded-row count as a `role="status"` line. An empty feed is
reported distinctly (0 rows, no alert).

### 3.4 Twenty role blocks rendered as prose despite declaring a visual
The rebuild shipped `terminal` (14), `telemetry` (3), `chart` (1), `console` (1)
and `timeline` (1) as `visualType`, none of which had a renderer, so all 20 fell
through to `GenericVisual`. **Repaired:** five dedicated renderers added, the
stale type lists extended, and two tests now derive the shipped set from the
migrations so the drift cannot return silently.

---

## 4. Controls whose history is a warning

**"Solve Current" used to do nothing.** It submitted the literal string
`'simulation_answer'`, which no puzzle accepts; the result was discarded into
`.catch(() => {})`; the node stayed unsolved. A tester would conclude the node
was unsolvable. It now calls `forceSolve()`.

**Attempt counts used to be fixed at 1.** `solvedNodes.has(nodeId) ? 1 : 1` is a
ternary with identical branches. Raised in `qa-simulator-attempts.test.tsx`.

These are recorded because they share one cause: the tool reporting success
without having done the work. The same cause produced §3.1–§3.3.

---

## 5. Coverage

| Property | Where proved |
| --- | --- |
| Real row drives every narrative field | `qa-emulation-production-state.test.tsx` |
| Refused feed is loud; empty feed is distinct | same |
| Only two read-only remote calls; no writes | `qa-emulation-isolation.test.ts` |
| Synthetic player/team ids; no uuid literal; no service key | same |
| Every shipped `visualType` has a renderer | `case-content.test.ts` |
| Shipped-type list matches the migrations | same |
| Each new renderer draws its data | `puzzle-visual.test.tsx` |
| Start / role switch / nav render without crashing | `qa-simulator.test.tsx`, `qa-simulator-integration.test.tsx` |
| Attempt counting is real | `qa-simulator-attempts.test.tsx` |
