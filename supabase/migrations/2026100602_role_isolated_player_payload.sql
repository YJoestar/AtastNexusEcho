-- ============================================================================
-- NEXUS - Role-isolated player payload
--
-- Information asymmetry is the mechanic: the Observer's material, the
-- Analyst's material and the Operator's material are three different
-- perspectives on one investigation, and the team is supposed to
-- reconstruct the whole by talking. Two fields defeated that:
--
--   coordinationChain. Every role received it, and it spells out the
--   chain in plain language - observerProduces, analystTransforms,
--   operatorExecutes. The Analyst could read the Observer's result
--   instead of hearing it; the Operator could read both. The verbal
--   transfer the game is built on was optional.
--
--   operatorInvestigation.requiredDiscoveries. Served to the Operator
--   alone, it states what the Observer and the Analyst are expected to
--   discover - for P26, literally "Reads left shard: REFL" and "Reads
--   center shard: ECT". An Operator holding those needs nothing from
--   their teammates, which is the exact failure mode the role chain
--   exists to prevent.
--
--   failurePropagation. Carried an unprompted recovery hint to every
--   client; help is something a team earns by requesting a hint, not
--   something the node hands out on load.
--
-- So the player payload now carries each role's own block and nothing
-- that describes another role's expected result. The Operator keeps
-- their own evidence and task description, minus requiredDiscoveries.
-- The Bureau still sees the full node - bureau_get_node_detail reads
-- puzzle_nodes directly as service_role, and the Game Master console
-- is where a stuck team is diagnosed.
--
-- The confidentiality boundary was never this predicate; redaction is
-- (nexus_redact_jsonb still strips the accepted answer from every
-- string that is returned), and the caller's role still comes from
-- `players`, never from the request.
--
-- Migration history is immutable, so this repairs forward rather than
-- editing 2026100504. `SET search_path` is stated inline because
-- CREATE OR REPLACE resets a function's SET clauses.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_player_node_detail(
  p_node_id UUID,
  p_player_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

  -- 'SOLVED' joins 'AVAILABLE' and 'IN_PROGRESS': a team may read a lead it
  -- has been given, whether or not it has closed it yet.
  SELECT EXISTS (
    SELECT 1 FROM node_progress
    WHERE team_id = v_team_id
    AND node_id = p_node_id
    AND status IN ('AVAILABLE', 'IN_PROGRESS', 'SOLVED')
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

  -- Operator-only, and only the Operator's own material: the required
  -- discoveries of the other two roles are exactly what they must
  -- communicate verbally, so they do not travel to any client.
  v_investigation := CASE
    WHEN v_role_key = 'OPERATOR'
      THEN (v_node.content -> 'operatorInvestigation') - 'requiredDiscoveries'
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
