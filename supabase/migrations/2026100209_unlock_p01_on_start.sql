-- ============================================================================
-- NEXUS - Unlock P01 when the game starts
--
-- bureau_start_team() activated the team but left node_progress empty, so
-- every node stayed LOCKED. Players could not access P01 after the game
-- started — they had to wait for the step-by-step unlock chain, which
-- never kicked off because there was no "current" node to solve.
--
-- This migration updates bureau_start_team to:
--   1. Find P01's puzzle_node UUID
--   2. Create a node_progress row with status AVAILABLE
--   3. Set teams.current_node_id and current_node_code to P01
--   4. Set team_progress.current_node_id and current_node_code to P01
-- ============================================================================

CREATE OR REPLACE FUNCTION bureau_start_team(p_team_id UUID, p_reason TEXT DEFAULT 'Started by Bureau')
RETURNS TABLE (success BOOLEAN, team_id UUID, started_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_started_at TIMESTAMPTZ;
  v_first_node UUID;
BEGIN
  SELECT status INTO v_current_status FROM teams WHERE id = p_team_id;

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
      updated_at = v_started_at
  WHERE t.id = p_team_id;

  -- Find P01 (the first puzzle node) and unlock it immediately
  SELECT id INTO v_first_node FROM puzzle_nodes WHERE code = 'P01' LIMIT 1;

  IF v_first_node IS NOT NULL THEN
    -- Make P01 available to the team
    INSERT INTO node_progress (team_id, node_id, status)
    VALUES (p_team_id, v_first_node, 'AVAILABLE')
    ON CONFLICT (team_id, node_id) DO UPDATE
    SET status = 'AVAILABLE'
    WHERE node_progress.status = 'LOCKED';

    -- Set P01 as the current node
    UPDATE teams
    SET current_node_id = v_first_node,
        current_node_code = 'P01',
        updated_at = v_started_at
    WHERE id = p_team_id;

    UPDATE team_progress
    SET current_node_id = v_first_node,
        current_node_code = 'P01',
        available_node_ids = ARRAY[v_first_node],
        started_at = v_started_at,
        last_activity_at = v_started_at,
        time_remaining_minutes = 180
    WHERE team_id = p_team_id;
  END IF;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_START', p_team_id, jsonb_build_object('startedAt', v_started_at), p_reason, NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_STARTED', p_team_id, jsonb_build_object('startedAt', v_started_at));

  RETURN QUERY SELECT TRUE, p_team_id, v_started_at;
END;
$$;
