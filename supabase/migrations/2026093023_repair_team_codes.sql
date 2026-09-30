-- ============================================================================
-- NEXUS — Repair team codes that were generated outside the alphabet
--
-- 2026093021 stopped generating team codes with md5 hex, but teams created
-- before that can still carry a 0 or a 1 (e.g. "31E3E5"), because the old
-- guard was `^[A-Z0-9]{6}$`.
--
-- A team code is a label, not a credential: nothing authenticates with it, and
-- every surface that shows it (admin team list, team page, leaderboard) reads
-- it straight from this table. So rewriting it is safe as long as the write and
-- the display come from the same row — which is exactly what happens here. The
-- player Logic Codes are untouched: they are stored as salted hashes, so there
-- is no invalid plaintext to repair and no credential is invalidated.
--
-- The repair is unconditional rather than a hand-picked list, and it then
-- VALIDATEs the constraint from 2026093021 — so if a single offender survived,
-- this migration would abort and the database would be left unchanged.
-- ============================================================================

DO $$
DECLARE
  v_old TEXT;
  v_new TEXT;
  v_repaired TEXT;
  v_count INTEGER := 0;
  v_teams RECORD;
BEGIN
  FOR v_teams IN
    SELECT t.id, t.code
    FROM teams t
    WHERE NOT nexus_is_valid_logic_code(t.code, nexus_team_code_length())
    FOR UPDATE
  LOOP
    v_old := v_teams.code;

    LOOP
      v_new := nexus_random_team_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE code = v_new);
    END LOOP;

    UPDATE teams t
    SET code = v_new, updated_at = now()
    WHERE t.id = v_teams.id;

    v_repaired := coalesce(v_repaired, '') || v_old || ' -> ' || v_new || '; ';
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'LOGIC CODE REPAIR: % team code(s) rewritten: %', v_count, coalesce(v_repaired, 'none');
END;
$$;

-- Proves the alphabet now holds for every row, past and present.
ALTER TABLE teams VALIDATE CONSTRAINT valid_team_code_alphabet;
