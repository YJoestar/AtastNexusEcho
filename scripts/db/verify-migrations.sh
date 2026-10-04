#!/usr/bin/env bash
# Replay every migration on a throwaway PostgreSQL database, then run the
# privilege tests. Needs a reachable server and a role that can create databases.
#
#   PGHOST=localhost PGUSER=postgres scripts/db/verify-migrations.sh
#
# Migrations run in Supabase's order: by the version before the first underscore
# (so 20260929_x runs before 2026092902_y, which `ls` would get wrong).
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${NEXUS_TEST_DB:-nexus_migration_check}"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f scripts/db/supabase-stub.sql >/dev/null
for f in $(ls supabase/migrations/*.sql | python3 -c "import sys,os;print('\n'.join(sorted((l.strip() for l in sys.stdin), key=lambda p: os.path.basename(p).split('_')[0])))"); do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f" >/dev/null && echo "ok   $(basename "$f")"
done
for t in supabase/tests/*.sql; do echo "test $(basename "$t")"; psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$t"; done

# Concurrency: 30 simultaneous attempts against a limit of 5 must let exactly 5
# through (the counter is one atomic upsert, not read-then-insert).
psql -v ON_ERROR_STOP=1 -q -d "$DB" -c "truncate login_rate_limit_buckets" >/dev/null
allowed=$(for i in $(seq 1 30); do
  psql -At -d "$DB" -c "select allowed from login_rate_limit_hit(array['ip:race'],array[5],array[60])" &
done | grep -c '^t$' || true)
wait
if [ "$allowed" != "5" ]; then echo "rate limit race: $allowed of 30 passed, expected 5" >&2; exit 1; fi
echo "test rate-limit concurrency: 5 of 30 passed"
