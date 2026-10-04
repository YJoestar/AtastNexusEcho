# NEXUS ECHO — Final Bug Audit

Scope: frontend, edge functions, database, migrations, auth/authz, game logic.
Method: the full migration history was replayed for the first time on a clean
PostgreSQL 16 with a Supabase stub (`scripts/db/supabase-stub.sql`), role
behaviour was simulated with `SET ROLE` + JWT claims, and each finding got a
regression test that was shown to fail without its fix. See
`SYSTEM_ARCHITECTURE_AUDIT.md` for the system map and the limits of what ran.

## Totals

Found 23. Fixed 23. Verified-by-test where noted. Remaining/blocked: see below.

| Severity | Found | Fixed |
|---|---|---|
| Critical | 4 | 4 |
| High | 7 | 7 |
| Medium | 8 | 8 |
| Low | 4 | 4 |

## By area

**Security / authorization (Critical–High)**
- Every `bureau_*` admin RPC was executable by anon/authenticated via default
  Supabase grants. Fixed: guarded wrappers (admin or service_role) + REVOKE
  (`2026100301`). Test: `privileges.sql`.
- Tables (puzzle answers in `puzzle_nodes`, submissions, `players` credential
  and device columns, game_events, locations, login_rate_limits) were reachable
  through PostgREST. Fixed: RLS, policy removal, privilege revokes, column-level
  SELECT on players (`301`, `306`). Test: `privileges.sql`.
- Client-supplied role in `game-get-node` selected role-gated content. Fixed:
  role read server-side (`302`); client value ignored.
- QR table readable by any team for unscanned codes. Fixed: `team_has_scanned`
  policy (`307`). Test: `qr_scan.sql`.
- `game-scan-qr` injected unvalidated input into a filter. Fixed: validated,
  resolved via `resolve_qr_code`.

**Database / migrations**
- `2026093015` had a missing `INSERT` header (syntax error) and hard-coded
  puzzle UUIDs that violate FKs on a clean database. Fixed in place.
- `jsonb_agg` with misplaced ORDER BY in `get_available_nodes` and
  `bureau_get_location` (`303`).
- Ambiguous column reference in `bureau_start_team` (`304`).
- `bureau_list_locations` and `bureau_create_team` returned wrong/empty rows (`301`).
- `get_team_game_state` computed `availableNodeIds` inconsistently with
  `node_progress` (`305`).

**Edge functions**
- Malformed JSON/missing fields produced 500s; now 400 via
  `_shared/request.ts`. Tests: `edge-request.test.ts`.
- Node references accepted only UUIDs; now UUID or code (`308`).

**Frontend**
- Minimap tap navigation was wrong (projection) and the rAF loop never
  converged; fixed with tests (`campus-map.test.tsx`).
- 23 lint warnings (hook deps, any, non-component exports) fixed without
  suppressions; `--max-warnings 0` passes.
- No security headers/CSP on the Vercel deploy: added to `vercel.json`
  (loaded login pages under the CSP).
- Dead service-role client module removed.

## Remaining issues (not fixed)

| Item | Status |
|---|---|
| Edge functions never executed against a real Deno/Supabase runtime; only the pure request helper is unit-tested | NOT VERIFIED |
| Real Supabase Auth/PostgREST behaviour (stub only) | BLOCKED, no project access |
| SUPER_ADMIN vs ADMIN gating of destructive RPCs | DECISION NEEDED |
| Login rate limiting is table-based and coarse | REMAINING |
| Main JS chunk > 500 kB (build warning, not an error) | REMAINING |
| Multi-tab / expired-session behaviour, breakpoint regression sweep, performance profiling | NOT DONE |
| Dependency upgrades / `npm audit` triage | NOT DONE |
| Storage/media exposure (no buckets exist today) | N/A currently |

## Tests run (final run, this commit)

- `npx tsc --noEmit`: clean
- `npm run lint` (`--max-warnings 0`): clean
- `npx vitest run`: 45 files, 656 tests passed
- `npm run build`: succeeds; chunk-size warning only
- DB: `scripts/db/verify-migrations.sh` exit 0 (privileges, role_content,
  rpc_smoke, game_flow, qr_scan; `must_fail` rows are expected denials)

## Migration result

All 44 migrations apply in Supabase order on clean Postgres 16 with the stub,
followed by the five SQL test files. Not applied to a real Supabase project.

This audit does not claim everything is fixed: it claims the listed findings are
fixed and tested within the limits above.
