-- ============================================================================
-- NEXUS — Recoverable player login codes + idempotent team provisioning
--
-- BUG (the reported Bureau dead-end):
--   The Bureau could create a team and its players, but the resulting login
--   codes could never be seen again or re-issued:
--     1. bureau-operations 'generate-codes' only ever considered players whose
--        login_code_hash IS NULL. Provisioned players already have a hash, so
--        the action returned an empty list and could not repair anything.
--     2. Both 'generate-code' and 'generate-codes' called
--        auth.admin.createUser with the player's internal email. A provisioned
--        player already owns that auth user, so re-issuing always failed with a
--        duplicate-user error and returned HTTP 500.
--     3. 'generate-codes' never inspected the auth result, so it could report
--        success while silently leaving players with unusable credentials.
--     4. bureau_provision_team had no idempotency key, so a retried or
--        double-submitted wizard created a SECOND team for one wizard session
--        and left the first roster's players unable to log in.
--
-- FIX:
--   * bureau_reissue_login_codes() — one transactional, admin-only action that
--     rotates the login code of every player on a team (or a given subset),
--     returning the plaintext codes exactly once. It clears the per-player
--     lockout counters so a locked-out player is recoverable, and does NOT
--     touch device bindings, auth user ids or player status.
--   * bureau_provision_team() gains an idempotency key. Replaying the same key
--     returns the ORIGINAL team with a freshly rotated set of codes instead of
--     creating a duplicate team.
--   * A partial unique index on teams.metadata->>'provisioningKey' makes the
--     dedupe race-safe: two concurrent submissions of the same key cannot both
--     create a team.
--
-- SECURITY: no plaintext is ever stored. Codes remain salted-MD5 hashes in
-- players.login_code_hash, exactly as verify_login_code() / player_login_flow()
-- already expect, and the only change to a re-issued player's Supabase Auth
-- user is its password (still its internal nexus+<player_id>@internal account,
-- never exposed to the player). Both functions stay SECURITY DEFINER and are
-- only reachable through bureau-operations, which verifies an admin_users row
-- before doing anything. Re-issuing is refused once a team is live, exactly as
-- roster changes are.
-- ============================================================================

-- ============================================================================
-- 1. Race-safe dedupe of wizard submissions
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_provisioning_key
  ON teams ((metadata ->> 'provisioningKey'))
  WHERE metadata ? 'provisioningKey';

-- ============================================================================
-- 2. Shared code generator
--    8 characters from the 32-symbol alphabet player-login validates against
--    (^[A-Z2-9]{8}$, no I/O/0/1), one independent random byte each, hashed with
--    the existing hash_login_code() so the on-disk format is unchanged.
--    Factored out so provisioning and re-issue can never drift apart.
-- ============================================================================
CREATE OR REPLACE FUNCTION nexus_unique_login_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes BYTEA;
  v_code TEXT := '';
  i INTEGER;
BEGIN
  LOOP
    v_bytes := gen_random_bytes(8);
    v_code := '';

    FOR i IN 0..7 LOOP
      -- 256 is a whole multiple of 32, so the mapping is unbiased.
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    END LOOP;

    EXIT WHEN v_code ~ '^[A-Z2-9]{8}$' AND NOT EXISTS (
      SELECT 1 FROM players pl
      WHERE pl.login_code_hash IS NOT NULL AND verify_login_code(v_code, pl.login_code_hash)
    );
  END LOOP;

  RETURN v_code;
END;
$$;

-- ============================================================================
-- 3. Re-issue (rotate) login codes
--    p_player_ids NULL => every player on the team.
-- ============================================================================
CREATE OR REPLACE FUNCTION bureau_reissue_login_codes(
  p_team_id UUID,
  p_player_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  player_role player_role,
  login_code TEXT,
  auth_user_id UUID,
  auth_user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_status team_status;
  v_row RECORD;
  v_code TEXT;
  v_hash TEXT;
  v_results JSONB := '[]'::jsonb;
BEGIN
  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'teamId is required';
  END IF;

  SELECT t.status INTO v_team_status FROM teams t WHERE t.id = p_team_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Roster and credentials are frozen once the team is live, matching the
  -- existing role-lock rule in bureau-operations 'generate-code'.
  IF v_team_status NOT IN ('REGISTERED', 'FORMING', 'READY', 'WAITING', 'RESET') THEN
    RAISE EXCEPTION 'Cannot issue login codes: team is % and its roster is locked', v_team_status;
  END IF;

  FOR v_row IN
    SELECT pl.id, pl.display_name, pl.role, pl.auth_user_id, pl.auth_user_email
    FROM players pl
    WHERE pl.team_id = p_team_id
      AND (p_player_ids IS NULL OR pl.id = ANY (p_player_ids))
    ORDER BY pl.role
    FOR UPDATE
  LOOP
    v_code := nexus_unique_login_code();
    v_hash := hash_login_code(v_code);

    -- Rotating the code invalidates every previously issued code for this
    -- player. Device binding, auth identity and player status are untouched,
    -- so an already-bound player keeps their session.
    UPDATE players
    SET login_code_hash = v_hash,
        login_code_expires_at = NULL,
        login_attempts = 0,
        login_locked_until = NULL,
        updated_at = now()
    WHERE id = v_row.id;

    v_results := v_results || jsonb_build_object(
      'player_id', v_row.id::text,
      'name', v_row.display_name,
      'role', v_row.role::text,
      'login_code', v_code,
      'auth_user_id', v_row.auth_user_id::text,
      'auth_user_email', v_row.auth_user_email
    );
  END LOOP;

  IF v_results = '[]'::jsonb THEN
    RAISE EXCEPTION 'No matching players on this team';
  END IF;

  -- Codes are in circulation: the team is now waiting on its players.
  IF v_team_status = 'READY' THEN
    UPDATE teams t SET status = 'WAITING' WHERE t.id = p_team_id;
  END IF;

  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'ROLE_ASSIGN', p_team_id,
          jsonb_build_object('action', 'REISSUE_CODES', 'players', jsonb_array_length(v_results)),
          'Login codes re-issued by Bureau', NULL);

  RETURN QUERY
  SELECT
    (e.item ->> 'player_id')::UUID,
    e.item ->> 'name',
    (e.item ->> 'role')::player_role,
    e.item ->> 'login_code',
    (e.item ->> 'auth_user_id')::UUID,
    e.item ->> 'auth_user_email'
  FROM jsonb_array_elements(v_results) AS e(item);
END;
$$;

-- ============================================================================
-- 4. Idempotent provisioning
--    Replaying one wizard session's key returns the original team with freshly
--    rotated codes, so a lost response can be retried without duplicating a
--    team and without leaving the first attempt's players unable to log in.
-- ============================================================================
DROP FUNCTION IF EXISTS bureau_provision_team(TEXT, JSONB);

CREATE OR REPLACE FUNCTION bureau_provision_team(
  p_team_name TEXT,
  p_players JSONB,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
  team_code TEXT,
  players JSONB,
  replayed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_code TEXT;
  v_team_id UUID;
  v_item JSONB;
  v_player_id UUID;
  v_player_name TEXT;
  v_player_role player_role;
  v_code TEXT;
  v_hash TEXT;
  v_results JSONB := '[]'::jsonb;
  v_count INTEGER := 0;
  v_row RECORD;
  v_key TEXT := NULLIF(trim(coalesce(p_idempotency_key, '')), '');
BEGIN
  -- Replay of a submission that already created the team: hand back the same
  -- team, with working codes, rather than a second copy of it.
  IF v_key IS NOT NULL THEN
    SELECT t.id, t.code INTO v_team_id, v_team_code
    FROM teams t
    WHERE t.metadata ->> 'provisioningKey' = v_key;

    IF v_team_id IS NOT NULL THEN
      FOR v_row IN
        SELECT pl.id, pl.display_name, pl.role, pl.auth_user_id, pl.auth_user_email
        FROM players pl
        WHERE pl.team_id = v_team_id
        ORDER BY pl.role
        FOR UPDATE
      LOOP
        v_code := nexus_unique_login_code();
        v_hash := hash_login_code(v_code);

        UPDATE players p2
        SET login_code_hash = v_hash,
            login_code_expires_at = NULL,
            login_attempts = 0,
            login_locked_until = NULL,
            updated_at = now()
        WHERE p2.id = v_row.id;

        v_results := v_results || jsonb_build_object(
          'player_id', v_row.id::text,
          'name', v_row.display_name,
          'role', v_row.role::text,
          'login_code', v_code,
          'auth_user_id', v_row.auth_user_id::text,
          'auth_user_email', v_row.auth_user_email
        );
      END LOOP;

      INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
      VALUES (auth.uid()::text, 'TEAM_CREATE', v_team_id,
              jsonb_build_object('action', 'PROVISION_REPLAY', 'key', v_key),
              'Duplicate wizard submission resolved to the original team', NULL);

      RETURN QUERY SELECT v_team_id, v_team_code, v_results, TRUE;
      RETURN;
    END IF;
  END IF;

  IF p_team_name IS NULL OR length(trim(p_team_name)) < 1 OR length(p_team_name) > 50 THEN
    RAISE EXCEPTION 'Team name must be 1-50 characters';
  END IF;

  IF p_players IS NULL OR jsonb_typeof(p_players) <> 'array' OR jsonb_array_length(p_players) < 1 THEN
    RAISE EXCEPTION 'At least one player is required';
  END IF;

  IF jsonb_array_length(p_players) > 3 THEN
    RAISE EXCEPTION 'A team may have at most 3 players';
  END IF;

  -- Generate a unique 6-char team code
  LOOP
    v_team_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE code = v_team_code);
  END LOOP;

  INSERT INTO teams (name, code, status, metadata)
  VALUES (
    trim(p_team_name),
    v_team_code,
    'REGISTERED',
    CASE
      WHEN v_key IS NULL
        THEN jsonb_build_object('registeredBy', 'ADMIN', 'assignedRoles', true)
      ELSE jsonb_build_object(
             'registeredBy', 'ADMIN',
             'assignedRoles', true,
             'provisioningKey', v_key
           )
    END
  )
  RETURNING id INTO v_team_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_players) LOOP
    v_player_name := coalesce(trim(v_item ->> 'name'), '');
    v_player_role := (v_item ->> 'role')::player_role;

    IF v_player_name = '' THEN
      RAISE EXCEPTION 'Every player needs a name';
    END IF;

    IF v_player_role IS NULL THEN
      RAISE EXCEPTION 'Every player needs a role';
    END IF;

    IF EXISTS (SELECT 1 FROM players pl WHERE pl.team_id = v_team_id AND pl.role = v_player_role) THEN
      RAISE EXCEPTION 'Role % is already assigned on this team', v_player_role;
    END IF;

    v_code := nexus_unique_login_code();
    v_hash := hash_login_code(v_code);

    INSERT INTO players AS pl (team_id, role, display_name, status, created_at, joined_at, login_code_hash)
    VALUES (v_team_id, v_player_role, v_player_name, 'INVITED', now(), now(), v_hash)
    RETURNING pl.id INTO v_player_id;

    v_results := v_results || jsonb_build_object(
      'player_id', v_player_id::text,
      'name', v_player_name,
      'role', v_player_role::text,
      'login_code', v_code
    );
    v_count := v_count + 1;
  END LOOP;

  -- Advance the team along the only legal path: REGISTERED -> FORMING -> READY
  IF v_count > 1 THEN
    UPDATE teams t SET status = 'FORMING' WHERE t.id = v_team_id;
  END IF;
  IF v_count = 3 THEN
    UPDATE teams t SET status = 'READY' WHERE t.id = v_team_id;
  END IF;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_CREATE', v_team_id,
          jsonb_build_object('players', v_count, 'action', 'PROVISION'),
          'Team provisioned via Bureau wizard', NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_REGISTERED', v_team_id,
          jsonb_build_object('teamCode', v_team_code, 'players', v_count));

  RETURN QUERY SELECT v_team_id, v_team_code, v_results, FALSE;
END;
$$;
