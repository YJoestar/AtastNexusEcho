-- Let a team look at a node it has already solved.
--
-- The defect:
--
--   get_player_node_detail (2026100302) decides what a team may read with
--
--     SELECT EXISTS (
--       SELECT 1 FROM node_progress
--       WHERE team_id = v_team_id AND node_id = p_node_id
--         AND status IN ('AVAILABLE','IN_PROGRESS')
--     ) INTO v_is_unlocked;
--
--   'SOLVED' is not in that list. submit_puzzle_answer (2026100501) sets
--   node_progress.status to 'SOLVED' on the winning submission and never moves
--   it back, so the instant a node was solved the team lost the right to read
--   it - and the function answered {'unlocked': false}.
--
-- Why it matters:
--
--   The site map keeps solved nodes tappable on purpose
--   (useCampusMapState: `unlocked: !locked || solved || isCurrent`), because a
--   solved lead is the record of what the team found. Tapping one navigated to
--   /player/game/node/<code>, the server denied it, and useGameEngine's
--   fetchNode returned null - which PlayerNode rendered as `return null`.
--
--   So: solve a puzzle, tap it again on the map, get a blank page. The "Node
--   Complete" document with the story reveal was unreachable for exactly the
--   nodes it was written for. It also hit any solved node reached by direct URL,
--   and it was a dead end with no retry and no way back.
--
-- Why serving it is not a leak:
--
--   The predicate was never the confidentiality boundary; redaction is. Every
--   string this function returns still goes through nexus_redact_answer /
--   nexus_redact_jsonb with the node's accepted answer, so widening the
--   predicate cannot surface the answer. The caller's role is still read from
--   `players` (2026100302), so operatorInvestigation stays Operator-only. And
--   the row being read is the caller's OWN team's node_progress row, so a team
--   gains nothing but the node it already played - every field here was on its
--   screen the moment it solved the node.
--
-- What stays denied: a node the team was never given has no node_progress row,
--   and still answers {'unlocked': false}. A node id that is not in
--   puzzle_nodes still answers {'unlocked': false}. FAILED/reset rows are not
--   added - only the three states that mean "this team has this lead".
--
-- Migration history is immutable, so this repairs forward rather than editing
-- 2026100302.
--
-- The `SET search_path` is written into the definition on purpose. 2026100309
-- pinned it with an ALTER over pg_proc, but CREATE OR REPLACE **resets** a
-- function's SET clauses: replacing a SECURITY DEFINER function without
-- restating them silently drops the hardening and puts the function back on the
-- caller's search_path, where a role able to create objects in an earlier schema
-- (or in pg_temp) can shadow a table or function and run code as the definer.
-- That is exactly what happened to submit_puzzle_answer in 2026100501 and
-- scan_qr_code in 2026100502. Stating it here means this function cannot lose it
-- again; 2026100505 repairs the two that already had.

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

  -- 'SOLVED' joins 'AVAILABLE' and 'IN_PROGRESS': a team may read a lead it has
  -- been given, whether or not it has closed it yet.
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