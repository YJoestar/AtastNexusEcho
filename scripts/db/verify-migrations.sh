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
