-- ============================================================================
-- NEXUS — Expose available_node_ids from get_team_game_state
--
-- The get_team_game_state RPC did not return the set of nodes the team can
-- reach next. The client (AppProvider.refreshTeamProgress) had no data to
-- populate teamProgress.availableNodeIds, so it hardcoded []. That propagated
-- to useGameEngine's allNodesForMap, which then never marked any unlocked
-- node as "AVAILABLE" on the player map — every node except the current one
-- rendered as LOCKED.
--
-- This migration adds available_node_codes (node codes, not UUIDs) to the
-- RPC result by joining team_progress.available_node_ids against
-- puzzle_nodes.code. Existing callers that don't read the field are
-- unaffected.
-- ============================================================================

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

  -- Resolve the team's available_node_ids (UUIDs) to their human-readable
  -- codes so the player map can match them against the local puzzle index.
  SELECT COALESCE(array_agg(pn.code), ARRAY[]::TEXT[])
  INTO v_available_node_codes
  FROM team_progress tp
  JOIN puzzle_nodes pn ON pn.id = ANY(tp.available_node_ids)
  WHERE tp.team_id = v_team_id
    AND tp.available_node_ids IS NOT NULL;

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
