# NEXUS ECHO — Final Bug Audit

Scope: frontend, edge functions, database, migrations, auth/authz, game logic.
Method: the full migration history was replayed for the first time on a clean
PostgreSQL 16 with a Supabase stub (`scripts/db/supabase-stub.sql`), role
behaviour was simulated with `SET ROLE` + JWT claims, and each finding got a
regression test that was shown to fail without its fix. See
`SYSTEM_ARCHITECTURE_AUDIT.md` for the system map and the limits of what ran.

## Totals

Round one: 23 found, 23 fixed. Round two adds the items below. Remaining/blocked: see the table.

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

## Second round (this commit)

Fixed and tested:
- **SUPER_ADMIN gating** (`2026100309`): `bureau_reset_team`, `bureau_reset_node` and the edge actions
  `reset-team`, `reset-game`, `end-game`, `disqualify-team`, `delete-location` require a super
  administrator (403 otherwise). Ordinary ADMIN operations are unchanged.
- **Login rate limiting rebuilt**: atomic bucketed limiter (network, optional team code, global
  breaker); counts every attempt; success no longer resets it; client-controlled
  X-Forwarded-For first-entry bypass removed; bounded cleanup; 30-parallel-attempt test lets exactly 5 through.
- 47 SECURITY DEFINER functions had no `search_path`: fixed. 5 foreign keys without indexes: indexed.
  `inventory_items` `USING (true)` policy leaked the item catalogue: removed.
- All 14 edge functions now reject non-POST (405); about 30 raw DB error messages no longer reach clients.
- Auth/session (player and admin): hung startup on `getSession` failure, no cross-tab sign-out, leaked
  realtime channel, admin workstation unmounted on every token refresh, double-submit, localStorage quota
  failure turning login into failure. 14 of 19 new tests failed on the old code.
- Node screen: a failed submit replaced the puzzle with a blocking screen; stale loads overwrote the
  current node. Fixed.
- Performance: main chunk 628.8 kB to 76.5 kB via route-level lazy loading and named vendor chunks; warning gone.
- Accessibility: form errors linked with `aria-describedby`/`role=alert` on both logins, QR and Node.
- Evidence ecosystem: series/chronology, importance and facts derivations, archive chronology order,
  admin M-06 importance column, `EVIDENCE_ECOSYSTEM_AUDIT.md` (content lock still holds for 66 records).

## Remaining issues (not fixed)

| Item | Status |
|---|---|
| Edge functions never executed in Deno/Supabase; wiring checked by source-text tests and pure-helper unit tests | NOT VERIFIED |
| Real Supabase Auth/PostgREST behaviour (stub only) | BLOCKED |
| Rate limiter assumes the last X-Forwarded-For entry is trustworthy on the real platform | UNVERIFIED |
| `login_rate_limit_purge()` not scheduled (add pg_cron on the real project) | REMAINING |
| `react-router(-dom)` 2 moderate advisories: fix is the v7 major; app has no SSR and no user-supplied navigation targets | REMAINING, planned migration |
| 12 dev-tooling advisories (vitest/vite/tailwind), all semver-major, not shipped | REMAINING |
| Browser sweep covered only the two login pages; authenticated screens only in jsdom; no axe/Lighthouse, no contrast measurement | NOT DONE |
| Evidence audio records have no attached audio (inspector shows NOT ATTACHED; no fake playback) | CONTENT GAP, not a bug |
| Evidence visuals not compared against sourced real-world references (none found) | LIMITATION |
| Admin error text from Supabase Auth appears in credential-issuing failures (admin only) | LOW |
| Storage/media exposure | N/A, no buckets |

## Tests run (final, combined tree)

- `npx tsc --noEmit`: clean
- `npm run lint` (`--max-warnings 0`): clean
- `npm run evidence:lock`: holds for 66 records
- `npx vitest run`: 49 files, 744 tests passed
- `npm run build`: succeeds, no chunk-size warning
- DB: `verify-migrations.sh` exit 0 (privileges, role_content, rpc_smoke, game_flow, qr_scan,
  security_hardening, rate-limit concurrency 5 of 30)

## Migration result

All 45 migrations apply in Supabase order on clean Postgres 16 with the stub, then every SQL test
passes. Not applied to a real Supabase project.

This report does not claim everything is fixed; it claims the listed findings are fixed and tested within the limits above.
