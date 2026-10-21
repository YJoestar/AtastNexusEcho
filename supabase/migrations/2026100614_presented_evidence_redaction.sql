-- Presented-evidence gates - some answers ARE the evidence, and must not be sealed.
--
-- CONTEXT (2026-10 audit; see docs/NEXUS_PUZZLE_LOGIC_REPAIR.md).
-- get_player_node_detail seals any player-visible string that CONTAINS the
-- normalised acceptedAnswer (nexus_contains_answer, for answers of three or
-- more alphanumerics). That is right for a deduction gate: the whole point is
-- that the team works the answer out rather than reading it. But three gates in
-- the rebuilt investigation ask for a token that is itself a RECORD ENTRY the
-- team is meant to read off the evidence:
--
--   M01  the class register maps the shared annotation AMBIENT to a class name
--        and the custody policy defines it; the answer is that class name.
--   P21  the access register files the records repository under the archive's
--        own term and the answer is that term.
--   P04  prints the flagged poster's own letter; the letter is one character and
--        already sits under the three-character redaction floor.
--
-- Printing those entries verbatim - which the gates were always meant to do - is
-- what makes them solvable at all; without it the answer is unguessable
-- vocabulary (the provenance defect repaired in 2026100613). But the redactor
-- would replace the very register line that presents the token with '[ sealed ]'
-- and the gate would ship broken: shown-but-sealed. The two rules collide.
--
-- REPAIR: a gate may DECLARE that its answer is presented evidence by setting
-- answer_metadata.presentedEvidence = true. get_player_node_detail then passes
-- an empty redaction key for that gate, so none of its own player strings are
-- sealed. Everything else is unchanged.
--
-- WHY THIS DOES NOT WEAKEN THE GAME:
--   * The flag is per-gate and lives in the content migration, not in the
--     request. Nothing a client sends can turn redaction off for a gate.
--   * A deduction gate never sets the flag, so its answer stays sealed exactly
--     as before. The only gates that set it are the three whose answer is a
--     printed record entry; their difficulty lives in finding and reading the
--     entry, not in hiding it.
--   * An empty redaction key can never match: nexus_contains_answer treats a
--     blank answer as nothing to match, so no string is accidentally sealed and
--     none is accidentally spared beyond these declared gates.
--
-- Migration history is immutable, so this repairs forward.
-- ============================================================================

-- 1. The three gates declare themselves in 2026100613_repair_token_provenance.sql
--    (answer_metadata.presentedEvidence = true), next to the content that prints
--    the token. This migration teaches the server to honour the declaration.

-- 2. Teach get_player_node_detail to honour the declaration. CREATE OR REPLACE
--    keeps the function's privileges and SET clauses only if restated, so both
--    are restated below exactly as 2026100602 left them.
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
  v_redact_key TEXT;
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

  -- A gate that DECLARES its answer is presented evidence (a record entry the
  -- team reads off a register) suppresses sealing for its own strings; every
  -- other gate keeps its answer sealed. See 2026100614 for the rationale.
  v_redact_key := CASE
    WHEN COALESCE((v_node.answer_metadata ->> 'presentedEvidence')::boolean, false)
      THEN ''
    ELSE v_node.answer_metadata ->> 'acceptedAnswer'
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
    'narrativeObjective', nexus_redact_answer(v_node.content->>'narrativeObjective', v_redact_key),
    'roleDependencyLevel', v_node.content->>'roleDependencyLevel',
    'roleContent', nexus_redact_jsonb(v_role_content, v_redact_key),
    'operatorInvestigation', nexus_redact_jsonb(v_investigation, v_redact_key),
    'locationClue', nexus_redact_jsonb(v_node.metadata->'locationClue', v_redact_key),
    'evidenceUnlocked', nexus_redact_jsonb(v_node.metadata->'evidenceUnlocked', v_redact_key),
    'storyReveal', nexus_redact_answer(v_node.metadata->>'storyReveal', v_redact_key),
    'whyTeamworkMatters', nexus_redact_answer(v_node.metadata->>'whyTeamworkMatters', v_redact_key),
    'branchConditions', COALESCE(v_node.content->'branchConditions', '[]'::jsonb),
    'points', COALESCE((v_node.rewards->>'points')::INTEGER, 0)
  );
END;
$$;

-- Keep the lock-down from 2026100301 / 2026100602.
REVOKE EXECUTE ON FUNCTION get_player_node_detail(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_player_node_detail(uuid, text) TO authenticated, service_role;
