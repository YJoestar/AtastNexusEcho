-- ============================================================================
-- NEXUS — Drop the credential self-test from the migration history
--
-- The Bureau credential flow (2026093016-2026093018) was verified by running
-- a temporary self-test migration against this database: it provisioned a
-- throwaway team, replayed its provisioning key, re-issued its codes and
-- asserted that every superseded code stopped verifying, that a locked-out
-- player was cleared, that a device binding survived a rotation, that a live
-- team refused a re-issue, and that it left no rows behind. It passed, and it
-- found two real defects on the way (see 2026093017 and 2026093018).
--
-- That self-test is a verification aid, not a schema change, so its file is not
-- part of this repository. This migration removes its bookkeeping row from
-- supabase_migrations.schema_migrations so the recorded history matches the
-- migrations that are actually version-controlled.
--
-- Idempotent: re-running it simply deletes nothing.
-- ============================================================================

DELETE FROM supabase_migrations.schema_migrations WHERE version = '2026093019';
