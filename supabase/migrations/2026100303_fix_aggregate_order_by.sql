-- Migration: 2026100303_fix_aggregate_order_by
--
-- Two functions put `ORDER BY` after an aggregate-only SELECT. PostgreSQL
-- rejects that at execution ("column ... must appear in the GROUP BY clause or
-- be used in an aggregate function"), so both raised on every call:
--   * get_available_nodes()  (the list of nodes open to the caller's team)
--   * bureau_get_location()  (admin: one node's location history; this is the
--                             _impl twin created by 2026100301)
-- (bureau_list_locations had the same fault and was fixed in 2026100301.)
-- The ordering moves inside the aggregate, which is what was meant.

CREATE OR REPLACE FUNCTION get_available_nodes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  result JSONB;
BEGIN
  SELECT pl.team_id INTO v_team_id
  FROM players pl
  WHERE pl.auth_user_id = auth.uid()
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', np.node_id::text,
      'code', n.code,
      'title', n.title,
      'type', n.type::text,
      'difficulty', n.difficulty,
      'location', n.location,
      'stage', n.stage,
      'status', np.status::text
    ) ORDER BY n.stage, n.code
  ), '[]'::jsonb) INTO result
  FROM node_progress np
  JOIN puzzle_nodes n ON n.id = np.node_id
  WHERE np.team_id = v_team_id
  AND np.status IN ('AVAILABLE', 'IN_PROGRESS');

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION bureau_get_location_impl(p_node_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'nodeId', l.node_id,
      'nodeCode', n.code,
      'nodeTitle', n.title,
      'name', l.name,
      'status', l.status,
      'createdAt', l.created_at,
      'updatedAt', l.updated_at,
      'createdBy', l.created_by,
      'updatedBy', l.updated_by
    ) ORDER BY l.created_at DESC
  ), '[]'::jsonb)
  INTO result
  FROM locations l
  JOIN puzzle_nodes n ON n.id = l.node_id
  WHERE l.node_id = p_node_id;

  RETURN result;
END;
$$;
