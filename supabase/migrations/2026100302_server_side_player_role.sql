-- Migration: 2026100302_server_side_player_role
--
-- get_player_node_detail(p_node_id, p_player_role) believed the role the CLIENT
-- sent, and game-get-node defaulted a missing role to OPERATOR. The game is
-- built on information asymmetry (each role gets its own clue block, and only
-- the Operator receives the investigation chain), so any player could read the
-- other roles' blocks, or the Operator's, just by asking. The role is now read
-- from `players` for the authenticated user; the parameter stays so existing
-- callers keep working, and is ignored.
--
-- Also fixed here: 2026093031 selected a record WITHOUT `id` and then read
-- `v_node.id` ("record v_node has no field id"), so the function raised for
-- every player and the puzzle screen could not load at all on a database built
-- from the migration history. It now uses p_node_id.

CREATE OR REPLACE FUNCTION get_player_node_detail(
  p_node_id UUID,
  p_player_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_actual_role TEXT;
  v_is_unlocked BOOLEAN;
  v_node RECORD;
  v_role_key TEXT;
  v_role_content JSONB;
  v_investigation JSONB;
  v_resolved_location TEXT;
  v_resolved_status TEXT;
BEGIN
  SELECT pl.team_id, pl.role::text INTO v_team_id, v_actual_role
  FROM players pl
  WHERE pl.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('unlocked', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM node_progress
    WHERE team_id = v_team_id
    AND node_id = p_node_id
    AND status IN ('AVAILABLE', 'IN_PROGRESS')
  ) INTO v_is_unlocked;

  IF NOT v_is_unlocked THEN
    RETURN jsonb_build_object('unlocked', false);
  END IF;

  SELECT code, title, type, difficulty, estimated_minutes, location, stage,
         content, metadata, rewards, answer_metadata
    INTO v_node
    FROM puzzle_nodes
   WHERE id = p_node_id;

  IF v_node.code IS NULL THEN
    RETURN jsonb_build_object('unlocked', false);
  END IF;

  -- Resolve the runtime location: prefer admin override, fall back to node's
  -- static location column.
  SELECT rl.location_name, rl.location_status
  INTO v_resolved_location, v_resolved_status
  FROM resolve_node_location(p_node_id) rl;

  IF v_resolved_location IS NULL THEN
    v_resolved_location := v_node.location;
  END IF;

  -- The caller's role comes from the database, never from the request.
  v_role_key := UPPER(v_actual_role);

  v_role_content := COALESCE(v_node.content -> LOWER(v_role_key), '{}'::jsonb);

  v_investigation := CASE
    WHEN v_role_key = 'OPERATOR' THEN v_node.content -> 'operatorInvestigation'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'unlocked', true,
    'code', v_node.code,
    'title', v_node.title,
    'type', v_node.type::text,
    'difficulty', v_node.difficulty,
    'estimatedMinutes', v_node.estimated_minutes,
    'location', v_resolved_location,
    'locationStatus', v_resolved_status,
    'stage', v_node.stage,
    'narrativeObjective', nexus_redact_answer(v_node.content->>'narrativeObjective', v_node.answer_metadata->>'acceptedAnswer'),
    'roleDependencyLevel', v_node.content->>'roleDependencyLevel',
    'roleContent', nexus_redact_jsonb(v_role_content, v_node.answer_metadata->>'acceptedAnswer'),
    'operatorInvestigation', nexus_redact_jsonb(v_investigation, v_node.answer_metadata->>'acceptedAnswer'),
    'coordinationChain', nexus_redact_jsonb(v_node.content->'coordinationChain', v_node.answer_metadata->>'acceptedAnswer'),
    'failurePropagation', nexus_redact_jsonb(v_node.content->'failurePropagation', v_node.answer_metadata->>'acceptedAnswer'),
    'locationClue', nexus_redact_jsonb(v_node.metadata->'locationClue', v_node.answer_metadata->>'acceptedAnswer'),
    'evidenceUnlocked', nexus_redact_jsonb(v_node.metadata->'evidenceUnlocked', v_node.answer_metadata->>'acceptedAnswer'),
    'storyReveal', nexus_redact_answer(v_node.metadata->>'storyReveal', v_node.answer_metadata->>'acceptedAnswer'),
    'whyTeamworkMatters', nexus_redact_answer(v_node.metadata->>'whyTeamworkMatters', v_node.answer_metadata->>'acceptedAnswer'),
    'branchConditions', COALESCE(v_node.content->'branchConditions', '[]'::jsonb),
    'points', COALESCE((v_node.rewards->>'points')::INTEGER, 0)
  );
END;
$$;

-- Keep the lock-down from 2026100301: CREATE OR REPLACE preserves privileges, but state them again.
REVOKE EXECUTE ON FUNCTION get_player_node_detail(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_player_node_detail(uuid, text) TO authenticated, service_role;
