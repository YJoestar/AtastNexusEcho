# AGENTS.md

## Commands

- **Typecheck**: `npm run typecheck` (app **and** edge functions — run this, not bare `tsc`)
  - `npm run typecheck:app` — `src/`, via `tsconfig.json`
  - `npm run typecheck:edge` — `supabase/functions/`, via `tsconfig.edge.json` + `deno-shims.d.ts`
- **Tests**: `npx vitest run` (898 tests, 57 test files)
- **Lint**: `npm run lint`
- **Build**: `npm run build` (typechecks first, then Vite)
- **Dev**: `npm run dev`

## Project Structure

- **Player** (handset): `src/features/player/` — mobile-first field device screens
- **Admin** (desktop): `src/features/admin/` — bureau workstation screens
- **Bureau primitives**: `src/components/bureau/` — `TerminalFrame`, `EvidenceBoard`, `DocumentShell`, `RegisterList`, etc.
- **Player primitives**: `src/components/player/` — `BottomNav`, `PlayerHeader`, `OfflineBanner`, `map/`
- **Edge Functions**: `supabase/functions/` — shared code in `_shared/` (`auth.ts`, `http.ts`, `request.ts`)
- **Migrations**: `supabase/migrations/` — SQL suites in `supabase/tests/`

## Visual Language

- Player = handset (bordered, bezel, safe-area)
- Admin = terminal (boot sequence, register, monitor)
- Shared DNA via `--nx-*` CSS custom properties in `src/styles/globals.css`

## Edge Function Conventions

Enforced by `src/tests/invariants.test.ts` — that suite scans the real function
sources and the whole migration history, so it catches drift a unit test would not.

- **Status codes mean what they say.** 400 malformed input, 401 missing/rejected
  credentials, 403 authenticated but not permitted, 404 absent resource, 409
  illegal state transition, 500 a genuine fault. An authenticated caller who
  lacks a grant is 403, never 401.
- **Never discard an `error`.** Use `maybeSingle()` (not `single()`) where zero
  rows is legitimate, and branch on lookup errors so "no such row" and "the
  database is down" stay distinguishable.
- **Do not destructure `{ data: { user } }`** — it throws a TypeError when `data`
  is null and reports a bad token as an unhandled 500.
- **Route database faults through `dbError()`** from `_shared/http.ts` rather than
  a blanket status, and keep PostgREST/RPC messages out of player-facing responses
  (`isPlayerSafeRpcMessage`).
- **Validate input** with the helpers in `_shared/request.ts` (`readJsonObject`,
  `requireString`, `requireUuid`, `requireInteger`, `requireBoolean`).
- **Establish identity**: `game-*` functions use `requireVerifiedUser` from
  `_shared/auth.ts`; admin functions verify the `admin_users` grant explicitly.
  Each function's `verify_jwt` posture is pinned in `supabase/config.toml`.
- **Migration history is immutable.** Never edit an already-applied migration; add
  a new numbered one that repairs forward (see
  `supabase/migrations/2026100401_repair_admin_rls_policy_evaluation.sql`, which
  restores nine admin policies that referenced a column `admin_users` never had).
