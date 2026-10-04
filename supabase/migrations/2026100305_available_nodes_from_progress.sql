-- Migration: 2026100305_available_nodes_from_progress
--
-- get_team_game_state().progress.availableNodeIds came from
-- team_progress.available_node_ids, which is set to {P01} when a team starts and
-- cleared on reset, and never updated when nodes unlock or are solved. Verified
-- by solving P01 on a started team: the state still reported ["P01"] as open
-- (it is solved) and did not list P02, the node that had just unlocked. The
-- player map and the Case screen's "also open" list read this field, so from the
-- second node on they were wrong. It is now derived from node_progress.

CREATE OR REPLACE FUNCTION get_team_game_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_team_status text;
  v_team_name TEXT;
  v_team_code CHAR(6);
  v_team_score INTEGER;
  v_team_started TIMESTAMPTZ;
  v_team_deadline TIMESTAMPTZ;
  v_current_node UUID;
  v_solved_count INTEGER;
  v_current_node_code TEXT;
  v_current_node_title TEXT;
  v_current_node_type puzzle_type;
  v_current_node_location TEXT;
  v_current_node_stage INTEGER;
  v_unread_count INTEGER;
  v_available_node_codes TEXT[];
  result JSONB;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found for player');
  END IF;

  SELECT t.status, t.name, t.code, t.score, t.game_started_at, t.game_deadline,
         t.current_node_id
  INTO v_team_status, v_team_name, v_team_code, v_team_score,
       v_team_started, v_team_deadline, v_current_node
  FROM teams t
  WHERE t.id = v_team_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Team not found');
  END IF;

  SELECT COUNT(*) INTO v_solved_count
  FROM node_progress
  WHERE team_id = v_team_id AND status = 'SOLVED';

  IF v_current_node IS NOT NULL THEN
    SELECT code, title, type, location, stage
    INTO v_current_node_code, v_current_node_title, v_current_node_type,
         v_current_node_location, v_current_node_stage
    FROM puzzle_nodes
    WHERE id = v_current_node;
  END IF;

  SELECT COUNT(*) INTO v_unread_count
  FROM notifications
  WHERE team_id = v_team_id AND is_read = false;

  -- The nodes open to the team right now, as codes. Derived from node_progress,
  -- which every unlock and solve already maintains. team_progress.available_node_ids
  -- is only written on start and reset, so it kept advertising a solved P01 and
  -- never listed anything that unlocked later.
  SELECT COALESCE(array_agg(pn.code ORDER BY pn.stage, pn.code), ARRAY[]::TEXT[])
  INTO v_available_node_codes
  FROM node_progress np
  JOIN puzzle_nodes pn ON pn.id = np.node_id
  WHERE np.team_id = v_team_id
    AND np.status IN ('AVAILABLE', 'IN_PROGRESS');

  result := jsonb_build_object(
    'team', jsonb_build_object(
      'id', v_team_id::text,
      'name', v_team_name,
      'code', v_team_code,
      'status', v_team_status,
      'score', v_team_score,
      'startedAt', v_team_started,
      'deadline', v_team_deadline
    ),
    'progress', jsonb_build_object(
      'solvedCount', v_solved_count,
      'currentNodeId', v_current_node::text,
      'availableNodeIds', v_available_node_codes
    ),
    'currentNode', CASE
      WHEN v_current_node IS NOT NULL THEN
        jsonb_build_object(
          'code', v_current_node_code,
          'title', v_current_node_title,
          'type', v_current_node_type::text,
          'location', v_current_node_location,
          'stage', v_current_node_stage
        )
      ELSE NULL
    END,
    'unreadNotifications', v_unread_count
  );

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_team_game_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_team_game_state() TO authenticated, service_role;
