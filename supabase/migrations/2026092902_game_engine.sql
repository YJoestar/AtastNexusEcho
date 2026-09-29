-- NEXUS — Phase 2: Game Engine Schema
-- Migration: 2026092902_create_game_engine
--
-- Adds tables for submissions, evidence, inventory, fragments, QR nodes,
-- notifications, hints tracking, and game configuration.
-- Extends puzzle_type with additional types and adds stage/location to puzzle_nodes.

-- ============================================================================
-- EXTEND puzzle_type ENUM (PostgreSQL supports ALTER TYPE ADD VALUE)
-- The seed data uses these additional puzzle types.
-- ============================================================================

ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'BINARY';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'CIPHER';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'GRAPH';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'VISUAL';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'AUDIO';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'MEMORY';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'SPATIAL';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'EXTRACTION';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'CROSS_REFERENCE';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'THREE_PHONE';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'DEDUCTION';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'NARRATIVE_INVESTIGATION';
ALTER TYPE puzzle_type ADD VALUE IF NOT EXISTS 'FINAL_BOSS';

-- ============================================================================
-- ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

ALTER TABLE puzzle_nodes ADD COLUMN IF NOT EXISTS stage INTEGER NOT NULL DEFAULT 1;
ALTER TABLE puzzle_nodes ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE puzzle_nodes ADD COLUMN IF NOT EXISTS role_content JSONB;
ALTER TABLE puzzle_nodes ADD COLUMN IF NOT EXISTS answer_metadata JSONB;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS game_started_at TIMESTAMPTZ;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS game_deadline TIMESTAMPTZ;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS game_duration_minutes INTEGER NOT NULL DEFAULT 180;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_node_code TEXT;

ALTER TABLE team_progress ADD COLUMN IF NOT EXISTS current_node_code TEXT;

-- ============================================================================
-- SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role player_role NOT NULL,
  submitted_answer TEXT NOT NULL,
  normalized_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time_seconds INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  time_penalty_seconds INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_submissions_team_node ON submissions(team_id, node_id);
CREATE INDEX IF NOT EXISTS idx_submissions_player ON submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_submissions_node ON submissions(node_id);
CREATE INDEX IF NOT EXISTS idx_submissions_correct ON submissions(is_correct);

-- ============================================================================
-- EVIDENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type evidence_type NOT NULL,
  classification evidence_classification NOT NULL DEFAULT 'RESTRICTED',
  content JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_evidence_code ON evidence(code);

-- ============================================================================
-- INVENTORY ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type inventory_type NOT NULL,
  rarity inventory_rarity NOT NULL DEFAULT 'COMMON',
  properties JSONB NOT NULL DEFAULT '{}',
  uses JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(code);

-- ============================================================================
-- FRAGMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  type fragment_type NOT NULL,
  node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  role player_role NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (node_id, role, position)
);

CREATE INDEX IF NOT EXISTS idx_fragments_node ON fragments(node_id);

-- ============================================================================
-- QR NODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  type qr_node_type NOT NULL,
  puzzle_node_id UUID REFERENCES puzzle_nodes(id) ON DELETE SET NULL,
  discovered_by_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  position JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_qr_nodes_code ON qr_nodes(code);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'NORMAL',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notifications_team_unread ON notifications(team_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_team_created ON notifications(team_id, created_at DESC);

-- ============================================================================
-- HINTS TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hints_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  hint_number INTEGER NOT NULL CHECK (hint_number BETWEEN 1 AND 3),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_penalty_seconds INTEGER NOT NULL DEFAULT 120,
  UNIQUE (team_id, node_id, hint_number)
);

CREATE INDEX IF NOT EXISTS idx_hints_used_team ON hints_used(team_id);
CREATE INDEX IF NOT EXISTS idx_hints_used_node ON hints_used(node_id);

-- ============================================================================
-- GAME CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_game_config_key ON game_config(key);

INSERT INTO game_config (key, value, description)
VALUES
  ('game_duration_minutes', '180'::JSONB, 'Default team game duration in minutes'),
  ('hint_penalties', '{"hint1": 120, "hint2": 300, "hint3": 600}'::JSONB, 'Hint penalties in seconds'),
  ('rate_limit_submissions', '5'::JSONB, 'Max submissions per minute per team'),
  ('login_code_ttl_minutes', '15'::JSONB, 'Login code expiration in minutes')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- NODE PROGRESSION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS node_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  status puzzle_stage NOT NULL DEFAULT 'LOCKED',
  started_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  solved_answer TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_node_progress_team ON node_progress(team_id);
CREATE INDEX IF NOT EXISTS idx_node_progress_status ON node_progress(status);

-- ============================================================================
-- ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hints_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

CREATE POLICY "Players submit for own team" ON submissions
  FOR INSERT WITH CHECK (
    team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
    AND player_id = (SELECT id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Players read team submissions" ON submissions
  FOR SELECT USING (
    team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "No player updates submissions" ON submissions
  FOR UPDATE USING (FALSE);
CREATE POLICY "No player deletes submissions" ON submissions
  FOR DELETE USING (FALSE);

CREATE POLICY "Players read owned evidence" ON evidence
  FOR SELECT USING (
    id = ANY(
      (SELECT evidence_owned FROM team_progress WHERE team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1))::uuid[]
    )
  );

CREATE POLICY "Players cannot insert evidence" ON evidence
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Players cannot update evidence" ON evidence
  FOR UPDATE USING (FALSE);
CREATE POLICY "Players cannot delete evidence" ON evidence
  FOR DELETE USING (FALSE);

CREATE POLICY "Players read owned inventory" ON inventory_items
  FOR SELECT USING (TRUE);

CREATE POLICY "Players cannot insert inventory_items" ON inventory_items
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Players cannot update inventory_items" ON inventory_items
  FOR UPDATE USING (FALSE);
CREATE POLICY "Players cannot delete inventory_items" ON inventory_items
  FOR DELETE USING (FALSE);

CREATE POLICY "Players read owned fragments" ON fragments
  FOR SELECT USING (
    id = ANY(
      (SELECT fragments_owned FROM team_progress WHERE team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1))::uuid[]
    )
  );

CREATE POLICY "Players cannot insert fragments" ON fragments
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Players cannot update fragments" ON fragments
  FOR UPDATE USING (FALSE);
CREATE POLICY "Players cannot delete fragments" ON fragments
  FOR DELETE USING (FALSE);

CREATE POLICY "Players read qr_nodes" ON qr_nodes
  FOR SELECT USING (TRUE);

CREATE POLICY "Players cannot insert qr_nodes" ON qr_nodes
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Players cannot update qr_nodes" ON qr_nodes
  FOR UPDATE USING (FALSE);
CREATE POLICY "Players cannot delete qr_nodes" ON qr_nodes
  FOR DELETE USING (FALSE);

CREATE POLICY "Players read own notifications" ON notifications
  FOR SELECT USING (
    team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Players cannot insert notifications" ON notifications
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Players cannot update notifications" ON notifications
  FOR UPDATE USING (FALSE);
CREATE POLICY "Players cannot delete notifications" ON notifications
  FOR DELETE USING (FALSE);

CREATE POLICY "Players read own hints" ON hints_used
  FOR SELECT USING (
    team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Players cannot insert hints directly" ON hints_used
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Players cannot update hints directly" ON hints_used
  FOR UPDATE USING (FALSE);
CREATE POLICY "Players cannot delete hints directly" ON hints_used
  FOR DELETE USING (FALSE);

CREATE POLICY "Everyone reads game_config" ON game_config
  FOR SELECT USING (TRUE);

CREATE POLICY "No player inserts game_config" ON game_config
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "No player updates game_config" ON game_config
  FOR UPDATE USING (FALSE);
CREATE POLICY "No player deletes game_config" ON game_config
  FOR DELETE USING (FALSE);

CREATE POLICY "Players read own node progress" ON node_progress
  FOR SELECT USING (
    team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Players cannot insert node_progress directly" ON node_progress
  FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "Players cannot update node_progress directly" ON node_progress
  FOR UPDATE USING (FALSE);
CREATE POLICY "Players cannot delete node_progress directly" ON node_progress
  FOR DELETE USING (FALSE);

-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================
-- (IF NOT EXISTS not supported for CREATE PUBLICATION in PostgreSQL < 15)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_node_progress') THEN
    CREATE PUBLICATION nexus_node_progress FOR TABLE node_progress;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_notifications') THEN
    CREATE PUBLICATION nexus_notifications FOR TABLE notifications;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_evidence') THEN
    CREATE PUBLICATION nexus_evidence FOR TABLE evidence;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_fragments') THEN
    CREATE PUBLICATION nexus_fragments FOR TABLE fragments;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_inventory') THEN
    CREATE PUBLICATION nexus_inventory FOR TABLE inventory_items;
  END IF;
END $$;

-- ============================================================================
-- SERVER-ONLY FUNCTIONS (never return answers to clients)
-- ============================================================================

-- Get player-facing puzzle node detail (NO answers, NO solutions)
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
  v_role_content JSONB;
  v_role_specific JSONB;
  v_node_code TEXT;
  v_node_title TEXT;
  v_node_type puzzle_type;
  v_node_difficulty SMALLINT;
  v_node_estimated INTEGER;
  v_node_location TEXT;
  v_node_stage INTEGER;
  result JSONB;
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

  SELECT code, title, type, difficulty, estimated_minutes, location, stage, role_content
  INTO v_node_code, v_node_title, v_node_type, v_node_difficulty,
       v_node_estimated, v_node_location, v_node_stage, v_role_content
  FROM puzzle_nodes
  WHERE id = p_node_id;

  IF v_node_code IS NULL THEN
    RETURN jsonb_build_object('unlocked', false);
  END IF;

  v_role_specific := COALESCE(v_role_content -> p_player_role, '{}'::jsonb);

  result := jsonb_build_object(
    'unlocked', true,
    'code', v_node_code,
    'title', v_node_title,
    'type', v_node_type::text,
    'difficulty', v_node_difficulty,
    'estimatedMinutes', v_node_estimated,
    'location', v_node_location,
    'stage', v_node_stage,
    'roleContent', v_role_specific
  );

  RETURN result;
END;
$$;

-- Get team's current game state (player-facing, no answers)
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
      'currentNodeId', v_current_node::text
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

-- Get team inventory (player-facing, NO answers)
CREATE OR REPLACE FUNCTION get_team_inventory()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  evidence_list JSONB;
  inventory_list JSONB;
  fragment_list JSONB;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'code', e.code,
      'title', e.title,
      'description', e.description,
      'type', e.type::text,
      'content', e.content
    )
  ), '[]'::jsonb) INTO evidence_list
  FROM evidence e
  WHERE e.id = ANY(
    (SELECT evidence_owned FROM team_progress WHERE team_id = v_team_id)::uuid[]
  );

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'code', i.code,
      'name', i.name,
      'description', i.description,
      'type', i.type::text,
      'rarity', i.rarity::text
    )
  ), '[]'::jsonb) INTO inventory_list
  FROM inventory_items i
  WHERE i.code IN (
    SELECT DISTINCT (inv->>'code')::text
    FROM jsonb_array_elements(
      (SELECT inventory_owned FROM team_progress WHERE team_id = v_team_id)::jsonb
    ) AS inv
    WHERE inv IS NOT NULL AND (inv->>'code') IS NOT NULL
  );

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'code', f.code,
      'label', f.label,
      'content', f.content,
      'type', f.type::text,
      'role', f.role::text
    )
  ), '[]'::jsonb) INTO fragment_list
  FROM fragments f
  WHERE f.id = ANY(
    (SELECT fragments_owned FROM team_progress WHERE team_id = v_team_id)::uuid[]
  );

  RETURN jsonb_build_object(
    'evidence', evidence_list,
    'inventory', inventory_list,
    'fragments', fragment_list
  );
END;
$$;

-- Get available nodes for current team (player-facing, NO answers)
CREATE OR REPLACE FUNCTION get_available_nodes()
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
      'id', np.node_id::text,
      'code', n.code,
      'title', n.title,
      'type', n.type::text,
      'difficulty', n.difficulty,
      'location', n.location,
      'stage', n.stage,
      'status', np.status::text
    )
  ), '[]'::jsonb) INTO result
  FROM node_progress np
  JOIN puzzle_nodes n ON n.id = np.node_id
  WHERE np.team_id = v_team_id
  AND np.status IN ('AVAILABLE', 'IN_PROGRESS')
  ORDER BY n.stage, n.code;

  RETURN result;
END;
$$;

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
  ), '[]'::jsonb) INTO result
  FROM node_progress np
  JOIN puzzle_nodes n ON n.id = np.node_id
  JOIN teams t ON t.id = np.team_id
  WHERE np.team_id = v_team_id
  ORDER BY n.stage, n.code;

  RETURN result;
END;
$$;

-- ============================================================================
-- SERVER-AUTHORITATIVE: Submit puzzle answer
-- answer_metadata JSONB: { canonical_answer, accepted_answers[], validation_method, points, rewards, next_node_id }
-- Does NOT return the answer in the response
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_puzzle_answer(
  p_node_id UUID,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_player_id UUID;
  v_player_role player_role;
  v_team_status team_status;
  v_game_started_at TIMESTAMPTZ;
  v_game_deadline TIMESTAMPTZ;
  v_node_metadata JSONB;
  v_progress RECORD;
  v_normalized_answer TEXT;
  v_is_correct BOOLEAN;
  v_attempt_number INTEGER;
  v_response_time INTEGER;
  v_points_awarded INTEGER;
  v_recent_submissions INTEGER;
  next_node JSONB;
  result JSONB;
  MAX_SUBMISSIONS_PER_MINUTE CONSTANT INTEGER := 5;
BEGIN
  -- Get player info
  SELECT team_id, id, role INTO v_team_id, v_player_id, v_player_role
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found for player');
  END IF;

  -- Check game is active
  SELECT status, game_started_at, game_deadline
  INTO v_team_status, v_game_started_at, v_game_deadline
  FROM teams
  WHERE id = v_team_id;

  IF v_team_status != 'ACTIVE' THEN
    RETURN jsonb_build_object('error', 'Game not active');
  END IF;

  -- Response time from game start
  v_response_time := EXTRACT(EPOCH FROM (now() - v_game_started_at))::INTEGER;

  -- Rate limiting: check submissions in last minute
  SELECT COUNT(*) INTO v_recent_submissions
  FROM submissions
  WHERE team_id = v_team_id
  AND submitted_at > now() - INTERVAL '1 minute';

  IF v_recent_submissions >= MAX_SUBMISSIONS_PER_MINUTE THEN
    RETURN jsonb_build_object('error', 'Rate limited. Please wait before submitting again.');
  END IF;

  -- Get node with answer metadata (server-only field)
  SELECT answer_metadata INTO v_node_metadata
  FROM puzzle_nodes
  WHERE id = p_node_id
  AND id IN (
    SELECT node_id FROM node_progress WHERE team_id = v_team_id
    AND status IN ('AVAILABLE', 'IN_PROGRESS')
  );

  IF v_node_metadata IS NULL THEN
    RETURN jsonb_build_object('error', 'Node not accessible');
  END IF;

  -- Get current node progress
  SELECT * INTO v_progress
  FROM node_progress
  WHERE team_id = v_team_id AND node_id = p_node_id;

  IF NOT FOUND THEN
    INSERT INTO node_progress (team_id, node_id, status)
    VALUES (v_team_id, p_node_id, 'IN_PROGRESS')
    RETURNING * INTO v_progress;
  END IF;

  -- Increment attempt number
  v_attempt_number := v_progress.attempts + 1;

  -- Normalize: uppercase, trim whitespace, collapse internal whitespace
  v_normalized_answer := UPPER(TRIM(p_answer));
  v_normalized_answer := REGEXP_REPLACE(v_normalized_answer, '\s+', ' ', 'g');

  -- Validate against answer metadata
  -- Support: canonical_answer, accepted_answers array
  v_is_correct := FALSE;

  IF v_node_metadata->>'canonical_answer' IS NOT NULL THEN
    IF v_normalized_answer = UPPER(TRIM(v_node_metadata->>'canonical_answer')) THEN
      v_is_correct := TRUE;
    END IF;
  END IF;

  IF NOT v_is_correct AND v_node_metadata->'accepted_answers' IS NOT NULL THEN
    IF v_normalized_answer = ANY(SELECT jsonb_array_elements_text(v_node_metadata->'accepted_answers')) THEN
      v_is_correct := TRUE;
    END IF;
  END IF;

  -- Points: full points for first-try, 50% for second try, 0 for 3+
  v_points_awarded := CASE
    WHEN v_attempt_number = 1 THEN (v_node_metadata->>'points')::INTEGER
    WHEN v_attempt_number = 2 THEN ((v_node_metadata->>'points')::INTEGER + 1) / 2
    ELSE 0
  END;

  -- Record submission
  INSERT INTO submissions (
    team_id, node_id, player_id, role, submitted_answer,
    normalized_answer, is_correct, attempt_number,
    response_time_seconds, points_awarded
  ) VALUES (
    v_team_id, p_node_id, v_player_id, v_player_role, p_answer,
    v_normalized_answer, v_is_correct, v_attempt_number,
    v_response_time, v_points_awarded
  );

  -- Update node progress
  UPDATE node_progress
  SET attempts = v_attempt_number,
      updated_at = now()
  WHERE team_id = v_team_id AND node_id = p_node_id;

  IF v_is_correct THEN
    -- Grant evidence/inventory/fragment rewards
    IF v_node_metadata->'rewards'->'evidence' IS NOT NULL THEN
      UPDATE team_progress
      SET evidence_owned = evidence_owned || (
        SELECT ARRAY_AGG(e.id) FROM evidence e WHERE e.code = ANY(
          (v_node_metadata->'rewards'->'evidence')::text[]
        )
      )
      WHERE team_id = v_team_id;
    END IF;

    IF v_node_metadata->'rewards'->'fragment' IS NOT NULL THEN
      UPDATE team_progress
      SET fragments_owned = fragments_owned || (
        SELECT ARRAY_AGG(f.id) FROM fragments f WHERE f.code = (
          v_node_metadata->'rewards'->>'fragment'
        )
      )
      WHERE team_id = v_team_id;
    END IF;

    -- Mark node as solved
    UPDATE node_progress
    SET status = 'SOLVED',
        solved_at = now(),
        solved_answer = v_normalized_answer,
        attempts = v_attempt_number,
        time_spent_seconds = time_spent_seconds + v_response_time,
        points_awarded = v_points_awarded
    WHERE team_id = v_team_id AND node_id = p_node_id;

    -- Update team score
    UPDATE teams
    SET score = score + v_points_awarded
    WHERE id = v_team_id;

    -- Determine next node
    IF v_node_metadata->>'next_node_id' IS NOT NULL THEN
      next_node := v_node_metadata->'next_node_id';
    ELSE
      next_node := NULL;
    END IF;

    -- Create node_progress for next node if it exists
    IF next_node IS NOT NULL THEN
      INSERT INTO node_progress (team_id, node_id, status)
      VALUES (v_team_id, next_node::UUID, 'AVAILABLE')
      ON CONFLICT (team_id, node_id) DO NOTHING;

      -- Update team's current_node_id
      UPDATE teams
      SET current_node_id = next_node::UUID,
          current_node_code = (SELECT code FROM puzzle_nodes WHERE id = next_node::UUID)
      WHERE id = v_team_id;
    END IF;

    -- Log game event
    INSERT INTO game_events (type, team_id, player_id, node_id, payload)
    VALUES ('PUZZLE_SOLVED', v_team_id, v_player_id, p_node_id,
            jsonb_build_object('points', v_points_awarded, 'attempts', v_attempt_number));

    -- Create notification
    INSERT INTO notifications (team_id, target_roles, type, title, message)
    VALUES (v_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'], 'PUZZLE_SOLVED',
            'Puzzle Solved', 'Your team has solved this puzzle.');

    result := jsonb_build_object(
      'isCorrect', true,
      'pointsAwarded', v_points_awarded,
      'attemptNumber', v_attempt_number,
      'nextNodeId', next_node
    );
  ELSE
    -- Log failed submission
    INSERT INTO game_events (type, team_id, player_id, node_id, payload)
    VALUES ('SUBMISSION_MADE', v_team_id, v_player_id, p_node_id,
            jsonb_build_object('correct', false, 'attempt', v_attempt_number));

    result := jsonb_build_object(
      'isCorrect', false,
      'pointsAwarded', 0,
      'attemptNumber', v_attempt_number
    );
  END IF;

  RETURN result;
END;
$$;

-- Server-authoritative: scan a QR code (does not leak what node it maps to)
CREATE OR REPLACE FUNCTION scan_qr_code(
  p_qr_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_qr_node RECORD;
  v_node_progress_status puzzle_stage;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found');
  END IF;

  SELECT * INTO v_qr_node
  FROM qr_nodes
  WHERE code = p_qr_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid QR code');
  END IF;

  -- If QR maps to a puzzle node, check if available for the team
  IF v_qr_node.puzzle_node_id IS NOT NULL THEN
    SELECT status INTO v_node_progress_status
    FROM node_progress
    WHERE team_id = v_team_id AND node_id = v_qr_node.puzzle_node_id;

    IF v_node_progress_status IS NULL THEN
      RETURN jsonb_build_object('discovered', false);
    END IF;

    IF v_node_progress_status = 'AVAILABLE' THEN
      -- Mark QR as discovered by this team
      UPDATE qr_nodes
      SET discovered_by_team_id = v_team_id
      WHERE id = v_qr_node.id;

      -- Create notification
      INSERT INTO notifications (team_id, target_roles, type, title, message)
      VALUES (v_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'], 'PUZZLE_UNLOCKED',
              'QR Code Scanned', 'A physical QR code has been scanned.');

      -- Log game event
      INSERT INTO game_events (type, team_id, node_id, payload)
      VALUES ('QR_SCANNED', v_team_id, v_qr_node.puzzle_node_id,
              jsonb_build_object('qrCode', p_qr_code));

      RETURN jsonb_build_object(
        'discovered', true,
        'nodeCode', (SELECT code FROM puzzle_nodes WHERE id = v_qr_node.puzzle_node_id),
        'nodeTitle', v_qr_node.label
      );
    ELSE
      RETURN jsonb_build_object('discovered', false);
    END IF;
  ELSE
    -- QR maps to evidence or other content
    IF v_qr_node.discovered_by_team_id IS NOT NULL
    AND v_qr_node.discovered_by_team_id = v_team_id THEN
      RETURN jsonb_build_object('discovered', false, 'alreadyClaimed', true);
    END IF;

    UPDATE qr_nodes SET discovered_by_team_id = v_team_id WHERE id = v_qr_node.id;

    INSERT INTO game_events (type, team_id, payload)
    VALUES ('QR_SCANNED', v_team_id, jsonb_build_object('qrCode', p_qr_code));

    RETURN jsonb_build_object('discovered', true, 'qrLabel', v_qr_node.label);
  END IF;
END;
$$;

-- Server-authoritative: use a hint (with penalty, one per hint_number)
CREATE OR REPLACE FUNCTION request_hint(
  p_node_id UUID,
  p_hint_number INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_hint_used BOOLEAN;
  v_penalty INTEGER;
  hint_content TEXT;
  v_node_metadata JSONB;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found');
  END IF;

  -- Check if hint already used
  SELECT EXISTS (
    SELECT 1 FROM hints_used
    WHERE team_id = v_team_id AND node_id = p_node_id AND hint_number = p_hint_number
  ) INTO v_hint_used;

  IF v_hint_used THEN
    RETURN jsonb_build_object('error', 'Hint already used');
  END IF;

  -- Get hint content from node answer_metadata (server-only, NOT returned to player in seed data)
  SELECT answer_metadata INTO v_node_metadata
  FROM puzzle_nodes
  WHERE id = p_node_id;

  SELECT (v_node_metadata->'hints'->>(p_hint_number - 1)) INTO hint_content;

  IF hint_content IS NULL THEN
    RETURN jsonb_build_object('error', 'Hint not available');
  END IF;

  -- Calculate penalty (configurable)
  v_penalty := CASE p_hint_number
    WHEN 1 THEN 120
    WHEN 2 THEN 300
    WHEN 3 THEN 600
    ELSE 0
  END;

  -- Record hint usage
  INSERT INTO hints_used (team_id, node_id, hint_number, time_penalty_seconds)
  VALUES (v_team_id, p_node_id, p_hint_number, v_penalty);

  -- Update node progress
  UPDATE node_progress
  SET hints_used = hints_used + 1,
      time_spent_seconds = time_spent_seconds + v_penalty,
      updated_at = now()
  WHERE team_id = v_team_id AND node_id = p_node_id;

  -- Create notification
  INSERT INTO notifications (team_id, target_roles, type, title, message)
  VALUES (v_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'], 'HINT_AVAILABLE',
          'Hint Used', 'Time penalty: ' || (v_penalty / 60) || ' minutes applied.');

  -- Log game event
  INSERT INTO game_events (type, team_id, node_id, payload)
  VALUES ('HINT_CONSUMED', v_team_id, p_node_id,
          jsonb_build_object('hintNumber', p_hint_number, 'penaltySeconds', v_penalty));

  RETURN jsonb_build_object(
    'hint', hint_content,
    'penaltySeconds', v_penalty
  );
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
  ), '[]'::jsonb) INTO result
  FROM notifications n
  WHERE n.team_id = v_team_id
  AND (NOT p_unread_only OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT 50;

  RETURN result;
END;
$$;

-- Mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE team_id = v_team_id AND is_read = false;
END;
$$;

-- Get leaderboard (player-facing, no sensitive data)
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'rank', r.rnk,
      'teamName', r.name,
      'teamCode', r.code,
      'score', r.score,
      'status', r.status,
      'elapsedMinutes', CASE
        WHEN r.started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (now() - r.started_at))::INTEGER / 60
        ELSE 0
      END,
      'playerCount', (SELECT COUNT(*) FROM players WHERE team_id = r.id)
    )
  ), '[]'::jsonb)
  FROM (
    SELECT
      id, name, code, score, status, started_at,
      ROW_NUMBER() OVER (ORDER BY score DESC, started_at ASC) AS rnk
    FROM teams
    WHERE status IN ('ACTIVE', 'PAUSED', 'COMPLETED')
    AND started_at IS NOT NULL
    LIMIT 25
  ) r;
$$;

-- ============================================================================
-- BUREAU: Manual interventions (server-only, creates audit events)
-- ============================================================================

CREATE OR REPLACE FUNCTION bureau_manual_unlock(
  p_team_id UUID,
  p_node_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO node_progress (team_id, node_id, status)
  VALUES (p_team_id, p_node_id, 'AVAILABLE')
  ON CONFLICT (team_id, node_id) DO UPDATE
  SET status = 'AVAILABLE';

  INSERT INTO audit_log (admin_id, action_type, target_team_id, target_node_id, payload, reason)
  VALUES (auth.uid()::text, 'NODE_UNLOCK', p_team_id, p_node_id, '{}', p_reason);

  INSERT INTO notifications (team_id, target_roles, type, title, message)
  VALUES (p_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'], 'PUZZLE_UNLOCKED',
          'Node Unlocked', 'Bureau has manually unlocked a new puzzle node.');

  INSERT INTO game_events (type, team_id, node_id, payload)
  VALUES ('NODE_UNLOCKED', p_team_id, p_node_id,
          jsonb_build_object('manual', true, 'reason', p_reason));

  RETURN jsonb_build_object('success', true, 'teamId', p_team_id::text, 'nodeId', p_node_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION bureau_reset_node(
  p_team_id UUID,
  p_node_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM node_progress WHERE team_id = p_team_id AND node_id = p_node_id;
  DELETE FROM submissions WHERE team_id = p_team_id AND node_id = p_node_id;
  DELETE FROM hints_used WHERE team_id = p_team_id AND node_id = p_node_id;

  INSERT INTO audit_log (admin_id, action_type, target_team_id, target_node_id, payload, reason)
  VALUES (auth.uid()::text, 'NODE_SKIP', p_team_id, p_node_id, '{}', p_reason);

  INSERT INTO notifications (team_id, target_roles, type, title, message)
  VALUES (p_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'], 'SYSTEM',
          'Node Reset', 'Bureau has reset this node.');

  INSERT INTO game_events (type, team_id, node_id, payload)
  VALUES ('NODE_RESET', p_team_id, p_node_id, jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get node detail for Bureau (includes answers, server-only)
CREATE OR REPLACE FUNCTION bureau_get_node_detail(p_node_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_node RECORD;
  result JSONB;
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT * INTO v_node FROM puzzle_nodes WHERE id = p_node_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Node not found');
  END IF;

  result := to_jsonb(v_node);
  RETURN result;
END;
$$;
