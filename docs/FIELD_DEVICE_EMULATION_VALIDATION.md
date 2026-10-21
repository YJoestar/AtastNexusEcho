# FIELD DEVICE EMULATION — VALIDATION

**What this document is:** the evidence that the repair works, and an honest
statement of what has *not* been verified.

Every number below was produced by running the command shown, on this working
tree. Nothing here is projected or remembered.

---

## 1. Gate summary

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck (app + edge) | `npm run typecheck` | clean, 0 errors |
| Lint | `npm run lint` | clean, 0 warnings (`--max-warnings 0`) |
| Build | `npm run build` | clean, Vite emitted `dist/` |
| Tests | `npx vitest run` | **74 files, 1649/1649 passed** |

Baseline before this repair: 72 files, 1582 tests. The repair adds **2 files and
67 tests**; no pre-existing test was weakened or removed.

---

## 2. The five root causes, and the test that pins each

| # | Root cause | Repair | Pinned by |
| --- | --- | --- | --- |
| RC-1 | 20 role blocks declared a `visualType` with no renderer and silently degraded to prose | 5 renderers added: `terminal`, `telemetry`, `chart`, `console`, `timeline` | `puzzle-visual.test.tsx` — 5 tests, one per renderer; `case-content.test.ts` — every shipped type must have a renderer |
| RC-2 | Real content shipped no structured payload, so existing renderers drew empty shells | Not a defect after inspection: prose blocks legitimately render prose; the repaired reads (RC-6) now carry real payload where the row has one | `puzzle-visual.test.tsx`, `qa-emulation-production-state.test.tsx` |
| RC-3 | `CONTENT_VISUAL_TYPES` omitted the 5 new types, so the guard never fired | Lists extended; two tests derive the shipped set from the migrations | `case-content.test.ts` — `keeps the shipped-type list in step with the migrations` |
| RC-4 | `loadPuzzleQA` swallowed every error into an indistinguishable fallback | Error recorded and surfaced as a `role="alert"` banner; loaded-row count as `role="status"` | `qa-emulation-production-state.test.tsx` — 3 tests |
| RC-5 | Isolation label was static text | Label derived from state; behaviour proved against the source | `qa-emulation-isolation.test.ts` — 4 tests |
| RC-6/7 | `generateNodeDetail` invented every narrative field; `list-puzzle-qa` dropped `metadata` | Every field read from the stored row; `metadata` returned and typed; `contentIsReal` flags fallback | `qa-emulation-production-state.test.tsx` — 7 fidelity tests |

---

## 3. Tests added

### `src/tests/qa-emulation-production-state.test.tsx` (10 tests)

Fails if the emulation ever again shows invented content while claiming to show
stored content.

- reports how many stored rows it loaded
- surfaces an explicit banner when the stored rows cannot be read
- does not claim production state when the feed is empty
- reads the objective, story reveal and teamwork note from the stored row
- reads the physical clue from the stored metadata
- reads the operator brief from the stored content
- reads unlocked evidence from the stored metadata and linked file
- passes the stored `visualType` through to the renderer
- marks content as placeholder when no stored row is available
- never leaks the stored answer into a player-facing field

### `src/tests/qa-emulation-isolation.test.ts` (4 tests)

Fails if the emulation ever gains a write, a production id, or a privileged key.

- performs no writes against any remote surface
- only ever reads the two admin catalogs it needs
- uses synthetic player and team identities
- never mentions a service-role key

### Additions to existing suites

- `puzzle-visual.test.tsx`: +5 renderer tests (terminal readout, telemetry sealed
  reading, chart bars/flag, console suspect step, timeline events) → 24 tests
- `case-content.test.ts`: +a per-gate `visualType` renderer assertion and a
  shipped-type-list drift assertion → 483 tests

---

## 4. Direct commands run

```
npm run typecheck   -> clean (tsc --noEmit, app and edge)
npm run lint        -> clean (eslint --max-warnings 0)
npm run build       -> clean (tsc + vite build)
npx vitest run      -> 74 files, 1649/1649 passed, 14.59s
```

Targeted runs during the repair:

```
npx vitest run src/tests/case-content.test.ts src/tests/puzzle-visual.test.tsx
  -> 2 files, 507 passed
npx vitest run src/tests/qa-emulation-production-state.test.tsx
  -> 1 file, 10 passed
npx vitest run src/tests/qa-emulation-isolation.test.ts
  -> 1 file, 4 passed
npx vitest run src/tests/qa-simulator*.test.tsx
  -> passing, no regressions
```

---

## 5. What was NOT verified

Stated plainly, because a validation document that overstates its coverage is
worse than none.

1. **No browser walk-through.** This environment has vitest and
   `@testing-library/react`; it has no Playwright or other browser automation,
   and no interactive display. The emulation was therefore verified by
   deterministic component tests against the real tree, not by a human clicking
   through `/admin/qa-simulator` on a device.

   What that *does* cover: the real player tree mounts under the QA provider
   (`qa-simulator-integration.test.tsx`), the hub renders and starts a
   simulation (`qa-emulation-production-state.test.tsx`), the real per-role
   content reaches the player (`generateNodeDetail` fidelity tests), and every
   renderer draws (`puzzle-visual.test.tsx`).

   What it *does not* cover: pixel layout, scroll behaviour and touch handling on
   a physical handset.

2. **No live `list-puzzle-qa` round trip.** The tests mock the admin API. The
   live call requires an authenticated `admin_users` session, which is not
   available here. The edge-function change (`metadata` returned) is typechecked
   and its handler is exercised by `invariants.test.ts`, but the deployed
   function serving the new field has not been observed live.

3. **No real human playthrough.** The case has not been played end to end by
   people. The emulation exists to make that possible; it does not replace it.

Each of these gaps is closed by a person opening `/admin/qa-simulator` on a
device and playing one gate as each role. Until then, the emulation is
*verified as a tool*, not yet *used* as one.

---

## 6. Regression posture

The repair cannot silently regress:

| Failure mode | Trip wire |
| --- | --- |
| A new `visualType` ships without a renderer | `case-content.test.ts` (per-gate + drift) |
| The type list drifts from the migrations | `case-content.test.ts` |
| The emulation starts inventing content again | `qa-emulation-production-state.test.tsx` |
| The emulation gains a write | `qa-emulation-isolation.test.ts` |
| The emulation captures a production id | `qa-emulation-isolation.test.ts` |
| The feed failure is swallowed again | `qa-emulation-production-state.test.tsx` |
| The edge handler drops `metadata` again | `qa-emulation-production-state.test.tsx` (reads it) + `invariants.test.ts` |
