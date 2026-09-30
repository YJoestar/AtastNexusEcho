-- ============================================================================
-- NEXUS — Fix invalid aggregate queries in player-facing RPCs
--
-- BUG: get_team_node_progress() and get_team_notifications() used
--   SELECT jsonb_agg(...) FROM ... ORDER BY <non-grouped column>
-- An ORDER BY on a column that is neither grouped nor aggregated is rejected
-- by PostgreSQL (SQLSTATE 42803), so both functions failed at runtime:
--   "column \"n.stage\" must appear in the GROUP BY clause ..."
--   "column \"n.created_at\" must appear in the GROUP BY clause ..."
--
-- FIX: the intended ordering was always the ordering *inside* the aggregate,
-- not of the aggregate result row. Move ORDER BY into jsonb_agg(... ORDER BY ...).
-- For notifications the 50-row cap is a real per-row limit, so it is applied
-- in an inner subquery.
--
-- No security change: SECURITY DEFINER, auth.uid()-scoped and RLS untouched.
-- ============================================================================

-- Get full team node progress (player-facing, NO answers)
CREATE OR REPLACE FUNCTION get_team_node_progress()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  result JSONB;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'nodeId', np.node_id::text,
      'code', n.code,
      'title', n.title,
      'type', n.type::text,
      'difficulty', n.difficulty,
      'location', n.location,
      'stage', n.stage,
      'status', np.status::text,
      'solvedAt', np.solved_at,
      'attempts', np.attempts,
      'hintsUsed', np.hints_used,
      'isCurrent', (t.current_node_id = np.node_id),
      'pointsAwarded', np.points_awarded
    )
    ORDER BY n.stage, n.code
  ), '[]'::jsonb) INTO result
  FROM node_progress np
  JOIN puzzle_nodes n ON n.id = np.node_id
  JOIN teams t ON t.id = np.team_id
  WHERE np.team_id = v_team_id;

  RETURN result;
END;
$$;

-- Get team notifications (player-facing)
CREATE OR REPLACE FUNCTION get_team_notifications(p_unread_only BOOLEAN DEFAULT true)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  result JSONB;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', n.id::text,
      'type', n.type::text,
      'title', n.title,
      'message', n.message,
      'priority', n.priority::text,
      'isRead', n.is_read,
      'createdAt', n.created_at,
      'actionUrl', n.action_url
    )
    ORDER BY n.created_at DESC
  ), '[]'::jsonb) INTO result
  FROM (
    SELECT *
    FROM notifications
    WHERE team_id = v_team_id
      AND (NOT p_unread_only OR is_read = false)
    ORDER BY created_at DESC
    LIMIT 50
  ) n;

  RETURN result;
END;
$$;
