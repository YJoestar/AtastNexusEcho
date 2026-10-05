-- Re-pin search_path on every SECURITY DEFINER function that has lost it.
--
-- The defect:
--
--   2026100309 walked pg_proc and ran
--     ALTER FUNCTION <sig> SET search_path = public, extensions, pg_temp
--   on all 47 SECURITY DEFINER functions that lacked it. That hardening does not
--   survive being edited.
--
--   CREATE OR REPLACE FUNCTION resets a function's SET clauses to their defaults
--   unless they are restated in the new definition. Every later migration that
--   rewrote a definer function therefore quietly undid the pin:
--
--     2026100501  submit_puzzle_answer(...)  -- no SET search_path
--     2026100502  scan_qr_code(...)          -- no SET search_path
--     2026100504  get_player_node_detail(...) -- now states it
--
--   The first two are the two functions that mutate a team's game state: one
--   moves node_progress to SOLVED, pays out the score and unlocks the next node;
--   the other records a marker claim. Both execute as their owner and both resolve
--   unqualified names (players, node_progress, teams, puzzle_nodes) through
--   whatever search_path the caller supplied.
--
-- Why it matters:
--
--   With no pinned path, any role that can create an object in a schema ahead of
--   `public` - or in pg_temp, which every session can write - can shadow a table
--   or helper the function calls and have the function execute the attacker's
--   version as the definer. That is privilege escalation from an ordinary
--   authenticated caller to the migration owner, on the two code paths that write
--   score and progression.
--
-- The fix is the same repair 2026100309 performed, reapplied. It is written to be
-- idempotent: it only touches functions whose proconfig has no search_path entry,
-- so running it on a database that is already correct is a no-op. `extensions` is
-- where Supabase installs pgcrypto; pg_temp goes last so temp objects cannot
-- shadow.
--
-- This repairs forward. Editing 2026100501/2026100502 to restate the SET clause
-- would be wrong: a database that has already applied them would not re-run them.
--
-- src/tests/invariants.test.ts now fails if a future CREATE OR REPLACE introduces
-- a definer function without the clause and without a later repair, so this
-- cannot silently recur.

DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    RAISE NOTICE 're-pinning search_path on %', f.sig;
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.sig);
  END LOOP;
END $$;
