# FIELD DEVICE EMULATION — ISOLATION AUDIT

**Claim under test:** the emulator lets a tester walk every case, every role and
every state **without reading or writing production game state.**

**Verdict:** the claim holds, with one deliberate and necessary exception —
the emulator **reads** two admin catalogs. It writes nothing. This is checked
against the real source in `src/tests/qa-emulation-isolation.test.ts`.

---

## 1. What the emulator may touch

| Call | Direction | Why it exists | Production impact |
| --- | --- | --- | --- |
| `adminAPI.listPuzzleQA()` | read | Supplies the stored node rows so the emulation can show real content | None (read-only, admin-authenticated) |
| `adminAPI.listQRCodes()` | read | Supplies the real marker register so a simulated scan is answered by the same lookup the server performs | None (read-only, admin-authenticated) |

These are the **only** outbound calls in `QASimulatorContext.tsx`. The isolation
test asserts it mechanically:

```ts
const calls = [...SOURCE.matchAll(/adminAPI\.(\w+)\(/g)].map(m => m[1]).sort()
expect(calls).toEqual(['listPuzzleQA', 'listQRCodes'])
```

The same test rejects any `gameAPI.`, `supabase.from(`, `supabase.rpc(` or
`functions.invoke(` reference in the module.

---

## 2. What the emulator must never touch (and does not)

| Production surface | Written by the emulator? | How this is guaranteed |
| --- | --- | --- |
| `teams` / team score | **No** | `score` is React state in the provider |
| `players` / sessions | **No** | `player` is the constant `{ id: 'qa-player', teamId: 'qa-team' }` |
| `team_node_progress` | **No** | `nodeProgress` is derived in-memory (`buildDefaultPuzzleProgress` + `withSimulatedAttempts`) |
| `submissions` / answers | **No** | `submitAnswer` compares in-memory and never calls the server |
| `hint_requests` / timing | **No** | `requestHint` returns in-memory hints; `hintsUsed` is state |
| `puzzle_completions` | **No** | `forceSolve` / `markSolved` mutate the solved set only |
| `evidence` / inventory | **No** | `inventory` is built from the catalog; overrides are local |
| `qr_scans` / claims | **No** | `scanQR` matches against the fetched marker list in memory |
| `notifications` | **No** | `generateNotifications` is a pure function of solved count |
| `leaderboard` | **No** | Built from the simulated run |

The module contains no mutating verb against any remote surface. The isolation
test fails the build if one is introduced.

---

## 3. Identity isolation

Synthetic identities are constants:

- `player.id === 'qa-player'`, `player.teamId === 'qa-team'`
- Team name `QA Simulation Team`; players `QA OBSERVER` / `QA ANALYST` / `QA OPERATOR`

The isolation test rejects any literal UUID in the module — a real production id
appearing there would mean a team or player record had been captured into the
simulator. It also rejects any `service_role` / `SERVICE_ROLE_KEY` mention,
consistent with the project rule that service-role keys never reach browser code.

---

## 4. Why a read is not a leak

The two reads return **case definitions**, not team state. `list-puzzle-qa` is a
bureau-operations action guarded like every other admin action — it requires an
authenticated `admin_users` grant. It returns node rows, evidence, and the
stored answer metadata; it does **not** return any team's progress, score,
submissions or timing.

The stored answer is used only to render the admin-side STATE INSPECTOR and the
"Reveal Answer" control. It is never written into the player viewport:

- The player tree receives `roleContent`, which is the redacted role block.
- `generateRoleContent` (the fallback) contains no answer.
- `puzzle-visual.test.tsx` and `case-content.test.ts` both assert no answer
  token appears in any player-facing string.

Verified by `qa-emulation-production-state.test.tsx`:
*"never leaks the stored answer into a player-facing field"*.

---

## 5. Visible isolation

Isolation must be legible to the tester, not merely true. The hub header now
derives its label from state:

| State | Header |
| --- | --- |
| Rows loaded | `ISOLATED MEMORY / READ-ONLY MIRROR OF STORED STATE / NO PRODUCTION WRITES` |
| Feed refused | `ISOLATED MEMORY / STORED STATE UNREACHABLE / NO PRODUCTION WRITES` |

plus a `role="status"` line reporting the loaded-row count, or a `role="alert"`
banner when the feed was refused. A tester can therefore tell at a glance whether
what they are looking at is the stored case.

---

## 6. Residual risk

| Risk | Status |
| --- | --- |
| A future edit adds a write | Guarded: isolation test fails the build |
| A future edit hardcodes a production id | Guarded: uuid-literal assertion |
| `list-puzzle-qa` is called without an admin session | Handled: the failure is surfaced as a banner, not swallowed |
| The emulator diverges from the player | Structurally prevented: the emulation mounts the real player tree, no second renderer |

No residual risk requires weakening RLS, authorization, or `verify_jwt` posture;
none was changed by this work.
