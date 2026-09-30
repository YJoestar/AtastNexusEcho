-- ============================================================================
-- NEXUS — Logic Code audit
--
-- Creates nexus_logic_code_audit(), a read-only report of every way the
-- players table and teams table can disagree with the Logic Code rules, and
-- runs it once so the current state is recorded in the database log.
--
-- What it looks for:
--   * team codes outside the alphabet (grandfathered by 2026093016/3021, since
--     rewriting a code already printed on a team's paperwork is worse than an
--     ugly one)
--   * a stored credential hash with no Supabase Auth user behind it, i.e. a
--     code that can never be used to log in
--   * a player with neither a live code nor a bound device: no way in
--   * a consumed code, so the Bureau can tell "already used" from "never issued"
--
-- It only reports. Repairing a player credential is deliberately an explicit
-- Bureau action (re-issue), never a silent background rewrite.
-- ============================================================================

CREATE OR REPLACE FUNCTION nexus_logic_code_audit()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'grandfathered_team_codes_outside_alphabet', coalesce((
      SELECT jsonb_agg(jsonb_build_object('code', t.code, 'team', t.name, 'status', t.status))
      FROM teams t
      WHERE NOT nexus_is_valid_logic_code(t.code, nexus_team_code_length())
    ), '[]'::jsonb),
    'players_with_code_but_no_auth_user', (
      SELECT count(*) FROM players pl
      WHERE pl.login_code_hash IS NOT NULL AND pl.auth_user_id IS NULL
    ),
    'players_with_no_code_and_no_device', (
      SELECT count(*) FROM players pl
      WHERE pl.login_code_hash IS NULL AND pl.device_session_token IS NULL
    ),
    'players_who_already_used_their_code', (
      SELECT count(*) FROM players pl
      WHERE pl.login_code_hash IS NULL AND pl.device_session_token IS NOT NULL
    ),
    'total_players', (SELECT count(*) FROM players),
    'total_teams', (SELECT count(*) FROM teams)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'LOGIC CODE AUDIT: %', nexus_logic_code_audit()::text;
END;
$$;
