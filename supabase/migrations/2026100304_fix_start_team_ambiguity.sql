-- Migration: 2026100304_fix_start_team_ambiguity
--
-- 2026100209 redefined bureau_start_team from text that had already been fixed
-- once (2026093004) for the same fault: the function RETURNS TABLE (success,
-- team_id, started_at), so `team_id` is also a plpgsql variable, and the
-- unqualified `team_id` / `started_at` in its INSERT ... ON CONFLICT (team_id,
-- node_id) and UPDATE ... WHERE team_id = ... are ambiguous. PostgreSQL raised
-- 'column reference "team_id" is ambiguous' as soon as the first node existed,
-- so STARTING A TEAM failed for every team on a database built from the
-- migration history.
--
-- `#variable_conflict use_column` makes a bare name mean the column, which is what
-- every statement here intends (the function assigns no OUT variable; it ends in
-- RETURN QUERY). This replaces the _impl twin created by 2026100301, so the admin
-- guard stays in front of it.

CREATE OR REPLACE FUNCTION bureau_start_team_impl(p_team_id UUID, p_reason TEXT DEFAULT 'Started by Bureau')
RETURNS TABLE (success BOOLEAN, team_id UUID, started_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_column
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
