# NEXUS ECHO — System architecture (as found)

Repository: `/home/user/AtastNexusEcho-work`, branch `work` (11 commits above `main` @ `810dca4`),
remote `upstream` = `YJoestar/atastnexusecho` (never pushed to). Working tree clean at each checkpoint.

## Stack

| Layer | What | Evidence |
|---|---|---|
| Frontend | Vite 5, React 18, TypeScript (strict), React Router 6.26, Tailwind 3, Vitest + Testing Library | `package.json` |
| Hosting | Static SPA on Vercel (rewrite everything to `/index.html`) | `vercel.json` |
| Backend | Supabase: Postgres + Auth + 15 Deno **edge functions**. No custom server | `supabase/functions/*` |
| Database | PostgreSQL, 19 tables, 56 SQL functions (32 `SECURITY DEFINER`), 37 migrations | `supabase/migrations` |
| Auth | Supabase Auth. Players: a Bureau-issued 8-symbol Logic Code (also the auth password) + device binding. Admins: e-mail/password + a row in `admin_users` | `player-login`, `admin-check` |
| Storage | **None.** Evidence media are static files under `public/evidence` (generated offline by `scripts/evidence-gen`) | — |
| Real-time | **None** (no websocket/channel subscriptions). The app polls through edge functions | grep |
| CI/CD | None in the repo | — |
| Docker | None | — |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (browser); `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, login-code cipher key (functions) | `.env.example`, function sources |

## Edge functions

| Function | Caller | Auth model | DB access |
|---|---|---|---|
| `player-login` | anonymous | rate limit by IP, code format check, device binding | service role → `player_login_flow`, `login_rate_limits`, `players` |
| `game-get-state`, `game-get-node`, `game-submit`, `game-use-hint`, `game-scan-qr`, `game-notifications`, `game-mark-read`, `game-inventory`, `game-node-progress`, `game-leaderboard` | player | forwards the player's JWT; RPCs scope by `auth.uid()` | player RPCs |
| `admin-check` | admin UI | JWT → `admin_users` | service role |
| `bureau-operations` (2,036 lines, ~45 actions), `game-bureau-ops` | admin UI | JWT → `admin_users` row with role ADMIN/SUPER_ADMIN | mixture: admin-JWT RPCs (so `auth.uid()` lands in the audit log) and service-role table access |
| `_shared/*` | — | `logicCode`, `loginCodeCipher`, `request` (new) | — |

## Flows

```
PLAYER   login ──▶ player-login ──▶ player_login_flow (SQL) ──▶ Supabase Auth session
         play  ──▶ game-* edge fn (player JWT) ──▶ RPC (SECURITY DEFINER, auth.uid()) ──▶ tables ──▶ JSON ──▶ AppProvider/useGameEngine ──▶ UI
         offline answer ─▶ localStorage queue ─▶ replayed through game-submit
ADMIN    login ──▶ Supabase Auth ──▶ admin-check ──▶ Workstation
         action ──▶ bureau-operations (admin verified) ──▶ bureau_* RPC (admin JWT) / tables (service role) ──▶ audit_log
EVIDENCE static files in public/evidence ──▶ <img>; relationships + clues derived in the client from the catalogue
BOARD    localStorage, per team (nexus_case_workspace_v1:<teamId>)
```

Server-authoritative by design: answers live in `puzzle_nodes.answer_metadata`; players only ever receive what the RPCs choose to return.

## Where the design and the database disagreed (what the audit found)

The security model above is sound on paper and was **not enforced at the database layer**: the table API and the RPC API are exposed by Supabase to anyone holding the public anon key, and the migrations left both open. Details in `FINAL_BUG_AUDIT.md`; the fixes are migrations `2026100301`–`2026100308`, with a replayable test suite (`scripts/db/verify-migrations.sh`).

## What could and could not be run here

| Area | Status |
|---|---|
| Frontend: type-check, lint (0 warnings), 656 unit tests, production build, CSP load test | **Run** |
| PostgreSQL 16 locally (Supabase stub for `auth`, roles, default grants) | **Run**: all 45 migrations from scratch + 5 SQL test files |
| Edge functions | **Not executed** (no Deno, no Supabase CLI, no network to a project). Statically reviewed; the shared request helper is unit-tested; the changed functions are untested end to end |
| Real Supabase project / production data | **Not available** |
| Docker, CI, deployment | Not present / not run |
