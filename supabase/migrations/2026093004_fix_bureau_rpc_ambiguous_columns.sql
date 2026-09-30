-- ============================================================================
-- NEXUS — Fix "column reference is ambiguous" in bureau_* RPCs
--
-- BUG: bureau_add_player, bureau_generate_login_code, bureau_start_team and
--      bureau_reset_team are all RETURNS TABLE functions, so their OUT
--      parameters become plpgsql variables. With the default
--      plpgsql.variable_conflict = error, an expression that references a
--      column of the same name is rejected with
--          column reference "team_id" is ambiguous
--      Colliding names: OUT `team_id` vs `players.team_id` / `team_progress.team_id`,
--      and OUT `login_code_hash` vs `players.login_code_hash`.
--
-- IMPACT: every one of these four Bureau actions failed at runtime.
--      create-player (add-player) failed immediately, so the admin panel
--      could not staff a team and the whole player flow was unreachable.
--
-- FIX: qualify the colliding column references with an explicit table alias.
--      UPDATE/INSERT SET *target* lists are column positions, not plpgsql
--      expressions, so they are left untouched.
--
-- No security change: SECURITY DEFINER, auth.uid()-scoped audit and event
-- writes, role-uniqueness enforcement, and RLS are all unchanged.
-- ============================================================================

-- Bureau: Add a player to a team
CREATE OR REPLACE FUNCTION bureau_add_player(
  p_team_id UUID,
  p_display_name TEXT,
  p_role player_role
)
RETURNS TABLE (player_id UUID, team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_count INTEGER;
  v_player_id UUID;
  v_new_team_id UUID;
BEGIN
  -- Check role uniqueness
  SELECT COUNT(*) INTO v_role_count
  FROM players pl
  WHERE pl.team_id = p_team_id AND pl.role = p_role;

  IF v_role_count > 0 THEN
    RAISE EXCEPTION 'Role % is already assigned to another player in this team', p_role
    USING ERRCODE = 'unique_violation';
  END IF;

  -- Insert the player
  INSERT INTO players AS pl (team_id, role, display_name, status, created_at, joined_at)
  VALUES (p_team_id, p_role, p_display_name, 'INVITED', now(), now())
  RETURNING pl.id, pl.team_id INTO v_player_id, v_new_team_id;

  -- Transition team to FORMING
  UPDATE teams
  SET status = 'FORMING'
  WHERE id = p_team_id AND status = 'REGISTERED';

  -- If all 3 roles are now filled, transition to READY
  IF (SELECT COUNT(*) FROM players p2
      WHERE p2.team_id = p_team_id AND p2.role IN ('OBSERVER', 'ANALYST', 'OPERATOR')) = 3 THEN
    UPDATE teams
    SET status = 'READY'
    WHERE id = p_team_id AND status = 'FORMING';
  END IF;

  RETURN QUERY SELECT v_player_id, v_new_team_id;
END;
$$;

-- Bureau: Generate a login code for a player
CREATE OR REPLACE FUNCTION bureau_generate_login_code(p_player_id UUID)
RETURNS TABLE (player_id UUID, login_code TEXT, login_code_hash TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_hash TEXT;
BEGIN
  -- Generate a random 8-char code excluding ambiguous characters
  LOOP
    v_code := upper(substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 8));
    -- Exclude I, O, 0, 1
    v_code := replace(replace(replace(replace(v_code, 'I', 'X'), 'O', 'Y'), '0', 'Z'), '1', 'W');
    EXIT WHEN LENGTH(v_code) = 8 AND v_code ~ '^[A-Z2-9]{8}$' AND NOT EXISTS (
      SELECT 1 FROM players pl
      WHERE pl.login_code_hash IS NOT NULL AND verify_login_code(v_code, pl.login_code_hash)
    );
  END LOOP;

  v_hash := hash_login_code(v_code);

  UPDATE players AS pl
  SET login_code_hash = v_hash,
      login_code_expires_at = now() + INTERVAL '15 minutes',
      login_attempts = 0,
      login_locked_until = NULL
  WHERE pl.id = p_player_id;

  RETURN QUERY SELECT p_player_id, v_code, v_hash;
END;
$$;

-- Bureau: Start a team (WAITING → ACTIVE)
CREATE OR REPLACE FUNCTION bureau_start_team(p_team_id UUID, p_reason TEXT DEFAULT 'Started by Bureau')
RETURNS TABLE (success BOOLEAN, team_id UUID, started_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_started_at TIMESTAMPTZ;
BEGIN
  SELECT t.status INTO v_current_status FROM teams t WHERE t.id = p_team_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF v_current_status != 'WAITING' THEN
    RAISE EXCEPTION 'Team must be in WAITING status to start, current status is %', v_current_status;
  END IF;

  -- Check all players are logged in (have auth_user_id and device_session_token)
  IF (SELECT COUNT(*) FROM players pl
      WHERE pl.team_id = p_team_id
        AND pl.auth_user_id IS NOT NULL
        AND pl.device_session_token IS NOT NULL) < 3 THEN
    RAISE EXCEPTION 'All 3 players must have logged in and bound their devices';
  END IF;

  v_started_at := now();

  UPDATE teams AS t
  SET status = 'ACTIVE',
      started_at = v_started_at,
      game_started_at = v_started_at,
      game_deadline = v_started_at + INTERVAL '180 minutes',
      updated_at = v_started_at
  WHERE t.id = p_team_id;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_START', p_team_id, jsonb_build_object('startedAt', v_started_at), p_reason, NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_STARTED', p_team_id, jsonb_build_object('startedAt', v_started_at));

  RETURN QUERY SELECT TRUE, p_team_id, v_started_at;
END;
$$;

-- Bureau: Reset a team (preserves identity, resets gameplay state)
CREATE OR REPLACE FUNCTION bureau_reset_team(p_team_id UUID, p_reason TEXT DEFAULT 'Reset by Bureau')
RETURNS TABLE (success BOOLEAN, team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT t.status INTO v_current_status FROM teams t WHERE t.id = p_team_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Clear gameplay state without destroying identity
  UPDATE team_progress AS tp
  SET solved_nodes = '{}'::jsonb,
      current_node_id = NULL,
      available_node_ids = '{}'::uuid[],
      evidence_owned = '{}'::uuid[],
      inventory_owned = '{}'::jsonb,
      fragments_owned = '{}'::uuid[],
      score = 0,
      hints_used = 0,
      hints_available = 3,
      time_elapsed_minutes = 0,
      time_remaining_minutes = 180,
      started_at = NULL,
      last_activity_at = now(),
      metadata = '{}'::jsonb
  WHERE tp.team_id = p_team_id;

  UPDATE teams AS t
  SET status = 'RESET',
      started_at = NULL,
      completed_at = NULL,
      current_node_id = NULL,
      score = 0,
      updated_at = now()
  WHERE t.id = p_team_id;

  -- Clear login codes and device bindings for all players on the team
  UPDATE players AS pl
  SET login_code_hash = NULL,
      login_code_expires_at = NULL,
      device_session_token = NULL,
      device_fingerprint_hash = NULL,
      device_info = NULL,
      login_attempts = 0,
      login_locked_until = NULL
  WHERE pl.team_id = p_team_id;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_UPDATE', p_team_id, jsonb_build_object('action', 'RESET'), p_reason, NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_RESET', p_team_id, jsonb_build_object('reason', p_reason));

  RETURN QUERY SELECT TRUE, p_team_id;
END;
$$;
