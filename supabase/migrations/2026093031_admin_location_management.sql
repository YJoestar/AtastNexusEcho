-- Migration: 2026093000_admin_location_management
-- Adds runtime-configurable physical puzzle locations with history and status.

-- ============================================================================
-- Locations table: overrides the static location text on puzzle_nodes at
-- solve-time. QR codes identify nodes (not locations), so relocating a node
-- does NOT require QR regeneration — players scan the same QR and the edge
-- function returns the current location string.
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_node_id ON locations(node_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);

-- ============================================================================
-- Location history: full audit trail of every location change. Replaces are
-- append-only; the current row is always the latest entry per node_id.
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_location_history_node_id ON location_history(node_id);
CREATE INDEX IF NOT EXISTS idx_location_history_created_at ON location_history(created_at DESC);

-- ============================================================================
-- Helper: resolve the current location for a node. Prefers the admin-managed
-- `locations` table; falls back to the static `puzzle_nodes.location` column.
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_node_location(p_node_id UUID)
RETURNS TABLE (
  location_name TEXT,
  location_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT l.name, l.status
  FROM locations l
  WHERE l.node_id = p_node_id
  AND l.status = 'ACTIVE'
  ORDER BY l.created_at DESC
  LIMIT 1;

  -- If no active override row exists, fall back to the node's static location
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT NULL::TEXT, 'ACTIVE'::TEXT
    FROM puzzle_nodes n
    WHERE n.id = p_node_id
    AND n.location IS NOT NULL;
  END IF;
END;
$$;

-- ============================================================================
-- Modify get_player_node_detail to read location from the locations table.
-- The column `location` on puzzle_nodes is now a fallback default; the
-- admin-managed `locations` table provides the runtime value.
-- ============================================================================

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
  v_is_unlocked BOOLEAN;
  v_node RECORD;
  v_role_key TEXT;
  v_role_content JSONB;
  v_investigation JSONB;
  v_resolved_location TEXT;
  v_resolved_status TEXT;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
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
  FROM resolve_node_location(v_node.id) rl;

  IF v_resolved_location IS NULL THEN
    v_resolved_location := v_node.location;
  END IF;

  v_role_key := UPPER(COALESCE(p_player_role, 'OBSERVER'));

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

-- ============================================================================
-- Bureau RPC: list all locations with node info for admin management.
-- ============================================================================

CREATE OR REPLACE FUNCTION bureau_list_locations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only admins can call this (enforced in the edge function via service-role).
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
    )
  ), '[]'::jsonb)
  INTO result
  FROM locations l
  JOIN puzzle_nodes n ON n.id = l.node_id
  ORDER BY n.code;

  RETURN result;
END;
$$;

-- ============================================================================
-- Bureau RPC: get a single location by node_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION bureau_get_location(p_node_id UUID)
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
    )
  ), '[]'::jsonb)
  INTO result
  FROM locations l
  JOIN puzzle_nodes n ON n.id = l.node_id
  WHERE l.node_id = p_node_id
  ORDER BY l.created_at DESC;

  RETURN result;
END;
$$;
