-- ============================================================================
-- NEXUS — Atomic team + player + login-code provisioning
--
-- The Bureau "Create Team" wizard previously drove provisioning from the
-- browser as a sequence of independent Edge Function calls
-- (create-team -> add-player x N -> generate-code x N). Any failure part-way
-- through left a half-created team: a team row with one or two players, no
-- login codes, and no way for the remaining players to log in.
--
-- bureau_provision_team() performs the whole database half of provisioning in
-- ONE transaction, so the team, its players and their login-code hashes either
-- all exist or none do:
--   * unique 6-char team code
--   * one player per entry, with role-uniqueness enforcement
--   * unique 8-char login code per player, stored only as a salted hash
--   * team status advanced to READY (3 players) or FORMING
--   * audit_log + game_events rows
--
-- The caller (bureau-operations 'provision-team') then creates the Supabase
-- Auth users, which cannot participate in a SQL transaction, and compensates
-- by deleting the team if that step fails.
--
-- The stored format is exactly what player-login / player_login_flow already
-- consume: 8 characters from [A-Z2-9], salted-MD5 hash, team-scoped.
--
-- No security change: SECURITY DEFINER, auth.uid()-scoped audit writes, the
-- deny-all RLS policy on admin_users, and protect_sensitive_columns() all
-- behave as before. The function is only reachable through bureau-operations,
-- which already requires a verified admin_users row.
-- ============================================================================

CREATE OR REPLACE FUNCTION bureau_provision_team(
  p_team_name TEXT,
  p_players JSONB
)
RETURNS TABLE (
  team_id UUID,
  team_code TEXT,
  players JSONB
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
BEGIN
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
  VALUES (trim(p_team_name), v_team_code, 'REGISTERED',
          jsonb_build_object('registeredBy', 'ADMIN', 'assignedRoles', true))
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

    -- Unique login code, same alphabet the player-login edge function expects
    LOOP
      v_code := upper(substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 8));
      v_code := replace(replace(replace(replace(v_code, 'I', 'X'), 'O', 'Y'), '0', 'Z'), '1', 'W');
      EXIT WHEN length(v_code) = 8 AND v_code ~ '^[A-Z2-9]{8}$' AND NOT EXISTS (
        SELECT 1 FROM players pl
        WHERE pl.login_code_hash IS NOT NULL AND verify_login_code(v_code, pl.login_code_hash)
      );
    END LOOP;

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

  -- Advance the team once its roster is known
  IF v_count = 3 THEN
    UPDATE teams t SET status = 'READY' WHERE t.id = v_team_id;
  ELSIF v_count > 1 THEN
    UPDATE teams t SET status = 'FORMING' WHERE t.id = v_team_id;
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

  RETURN QUERY SELECT v_team_id, v_team_code, v_results;
END;
$$;
