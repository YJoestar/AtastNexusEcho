-- NEXUS — Phase 1: Identity, Authentication, Team Registration, Device Security
-- Migration: 20260929_create_identity_auth_schema
--
-- This migration creates the core schema for:
--   * Team lifecycle (REGISTERED → FORMING → READY → WAITING → ACTIVE → ...)
--   * Player identity with login code hashing and device binding
--   * Admin authorization (separate auth path)
--   * Audit logging for all Bureau actions
--   * RLS policies ensuring team isolation
--   * Real-time publications for waiting room and team status

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- pgcrypto not needed: we use built-in gen_random_uuid() and md5() for
-- login code hashing instead of bcrypt (see hash_login_code function).

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE team_status AS ENUM (
  'REGISTERED',
  'FORMING',
  'READY',
  'WAITING',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'DISQUALIFIED',
  'ABANDONED',
  'RESET'
);

CREATE TYPE player_role AS ENUM (
  'OBSERVER',
  'ANALYST',
  'OPERATOR'
);

CREATE TYPE player_status AS ENUM (
  'INVITED',
  'ACTIVE',
  'OFFLINE',
  'REMOVED'
);

CREATE TYPE puzzle_type AS ENUM (
  'OBSERVATION',
  'DECODING',
  'LOGIC',
  'PATTERN',
  'PHYSICAL',
  'META',
  'FINAL'
);

CREATE TYPE puzzle_stage AS ENUM (
  'LOCKED',
  'AVAILABLE',
  'IN_PROGRESS',
  'SOLVED',
  'FAILED',
  'SKIPPED'
);

CREATE TYPE submission_result AS ENUM (
  'CORRECT',
  'INCORRECT',
  'PARTIAL',
  'ALREADY_SOLVED',
  'PREREQUISITE_MISSING',
  'RATE_LIMITED',
  'INVALID_FORMAT',
  'GAME_NOT_ACTIVE',
  'ROLE_MISMATCH'
);

CREATE TYPE evidence_type AS ENUM (
  'DOCUMENT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DATA',
  'PHYSICAL',
  'DIGITAL'
);

CREATE TYPE evidence_classification AS ENUM (
  'PUBLIC',
  'RESTRICTED',
  'CLASSIFIED',
  'TOP_SECRET'
);

CREATE TYPE inventory_type AS ENUM (
  'TOOL',
  'KEY',
  'CODE',
  'DEVICE',
  'CONSUMABLE',
  'ARTIFACT',
  'FRAGMENT_CONTAINER'
);

CREATE TYPE inventory_rarity AS ENUM (
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY'
);

CREATE TYPE fragment_type AS ENUM (
  'TEXT',
  'CIPHER',
  'COORDINATE',
  'KEYWORD',
  'SYMBOL',
  'SEQUENCE'
);

CREATE TYPE qr_node_type AS ENUM (
  'START',
  'PUZZLE',
  'EVIDENCE',
  'INVENTORY',
  'NAVIGATION',
  'CHECKPOINT',
  'FINAL'
);

CREATE TYPE notification_type AS ENUM (
  'SYSTEM',
  'PUZZLE_UNLOCKED',
  'PUZZLE_SOLVED',
  'EVIDENCE_FOUND',
  'ITEM_ACQUIRED',
  'FRAGMENT_REVEALED',
  'HINT_AVAILABLE',
  'TIME_WARNING',
  'ROLE_ACTION_REQUIRED',
  'ADMIN_MESSAGE',
  'GAME_PHASE_CHANGE',
  'TEAM_STATUS_CHANGE'
);

CREATE TYPE notification_priority AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE game_event_type AS ENUM (
  'TEAM_REGISTERED',
  'TEAM_STARTED',
  'TEAM_PAUSED',
  'TEAM_RESUMED',
  'TEAM_COMPLETED',
   'TEAM_DISQUALIFIED',
   'TEAM_RESET',
  'NODE_UNLOCKED',
  'NODE_STARTED',
  'NODE_SOLVED',
  'NODE_FAILED',
  'NODE_SKIPPED',
  'SUBMISSION_MADE',
  'SUBMISSION_VALIDATED',
  'EVIDENCE_DISCOVERED',
  'EVIDENCE_SHARED',
  'ITEM_ACQUIRED',
  'ITEM_USED',
  'ITEM_TRANSFERRED',
  'FRAGMENT_REVEALED',
  'HINT_REQUESTED',
  'HINT_CONSUMED',
  'QR_SCANNED',
  'ROLE_ACTION_PERFORMED',
  'ADMIN_ACTION',
  'GAME_PHASE_CHANGED',
  'SYSTEM_ALERT'
);

CREATE TYPE admin_action_type AS ENUM (
  'TEAM_CREATE',
  'TEAM_UPDATE',
  'TEAM_DELETE',
  'TEAM_START',
  'TEAM_PAUSE',
  'TEAM_RESUME',
  'TEAM_COMPLETE',
  'TEAM_DISQUALIFY',
  'ROLE_ASSIGN',
  'ROLE_REASSIGN',
  'NODE_UNLOCK',
  'NODE_LOCK',
  'NODE_SKIP',
  'SUBMISSION_OVERRIDE',
  'SCORE_ADJUST',
  'TIME_ADJUST',
  'HINT_GRANT',
  'EVIDENCE_GRANT',
  'ITEM_GRANT',
  'FRAGMENT_REVEAL',
  'GAME_START',
  'GAME_PAUSE',
  'GAME_RESUME',
  'GAME_END',
  'CONFIG_UPDATE',
  'ANNOUNCEMENT_SEND'
);

CREATE TYPE admin_role AS ENUM (
  'ADMIN',
  'SUPER_ADMIN'
);

-- ============================================================================
-- CORE TABLES (ordered by dependency — no FKs referencing tables created later)
-- ============================================================================

-- Teams table (no FK dependencies)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code CHAR(6) NOT NULL UNIQUE,
  status team_status NOT NULL DEFAULT 'REGISTERED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_node_id UUID,
  score INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT valid_team_code CHECK (code ~ '^[A-Z0-9]{6}$')
);

CREATE INDEX idx_teams_code ON teams(code);
CREATE INDEX idx_teams_status ON teams(status);
CREATE INDEX idx_teams_started_at ON teams(started_at);

-- Admin users table (no FK dependencies)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  role admin_role NOT NULL DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_users_auth_user ON admin_users(auth_user_id);
CREATE INDEX idx_admin_users_username ON admin_users(username);

-- Login rate limiting table (IP-based attempts tracking)
CREATE TABLE login_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_rate_limits_ip ON login_rate_limits(ip_address);
CREATE INDEX idx_login_rate_limits_created_at ON login_rate_limits(created_at);

-- Audit log table (no FK dependencies — uses auth.uid() at runtime)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT,
  action_type admin_action_type NOT NULL,
  target_team_id UUID,
  target_player_id UUID,
  target_node_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted_at TIMESTAMPTZ,
  reverted_by TEXT
);

CREATE INDEX idx_audit_log_admin ON audit_log(admin_id);
CREATE INDEX idx_audit_log_team ON audit_log(target_team_id);
CREATE INDEX idx_audit_log_action ON audit_log(action_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Puzzle nodes table (reference data — no FK dependencies)
CREATE TABLE puzzle_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type puzzle_type NOT NULL,
  difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  estimated_minutes INTEGER NOT NULL,
  position JSONB NOT NULL,
  prerequisites JSONB NOT NULL DEFAULT '[]',
  branches JSONB NOT NULL DEFAULT '[]',
  content JSONB NOT NULL,
  rewards JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_puzzle_nodes_code ON puzzle_nodes(code);

-- Players table (depends on teams)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role player_role NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  device_info JSONB,
  status player_status NOT NULL DEFAULT 'INVITED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_code_hash TEXT,
  auth_user_id UUID,
  auth_user_email TEXT,
  device_session_token TEXT,
  device_fingerprint_hash TEXT,
   last_login_at TIMESTAMPTZ,
   login_attempts INTEGER NOT NULL DEFAULT 0,
   login_locked_until TIMESTAMPTZ,
   login_code_expires_at TIMESTAMPTZ,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, role),
  UNIQUE (login_code_hash)
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_role ON players(role);
CREATE INDEX idx_players_auth_user_id ON players(auth_user_id);
CREATE INDEX idx_players_login_code_hash ON players(login_code_hash);
CREATE INDEX idx_players_device_token ON players(device_session_token);
CREATE INDEX idx_players_status ON players(status);

-- Game events table (depends on teams, players)
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type game_event_type NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  node_id UUID,
  payload JSONB NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_game_events_team ON game_events(team_id);
CREATE INDEX idx_game_events_type ON game_events(type);
CREATE INDEX idx_game_events_timestamp ON game_events(timestamp DESC);

-- Team progress table (depends on teams)
CREATE TABLE team_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  solved_nodes JSONB NOT NULL DEFAULT '{}',
  current_node_id UUID,
  available_node_ids UUID[] NOT NULL DEFAULT '{}',
  evidence_owned UUID[] NOT NULL DEFAULT '{}',
  inventory_owned JSONB NOT NULL DEFAULT '{}',
  fragments_owned UUID[] NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  hints_available INTEGER NOT NULL DEFAULT 3,
  time_elapsed_minutes INTEGER NOT NULL DEFAULT 0,
  time_remaining_minutes INTEGER NOT NULL DEFAULT 180,
  started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_team_progress_team ON team_progress(team_id);

-- ============================================================================
-- RLS — ENABLE ON ALL TABLES
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzle_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Helper: identify the authenticated player from the JWT
-- Returns the player's internal ID based on auth.uid()
CREATE OR REPLACE FUNCTION get_current_player_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM players WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_team_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Teams policies
CREATE POLICY "Players can read own team" ON teams
  FOR SELECT USING (
    status IN ('REGISTERED', 'FORMING', 'READY', 'WAITING', 'ACTIVE', 'PAUSED')
    AND id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Admins can read all teams" ON teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins can insert teams" ON teams
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

-- Players policies
CREATE POLICY "Players can read teammates" ON players
  FOR SELECT USING (
    team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Admins can read all players" ON players
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Players update own connection status" ON players
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Players cannot modify role, team_id, or login_code_hash" ON players
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    AND team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- Admin users policies — no public access
CREATE POLICY "No public access to admin_users" ON admin_users
  FOR ALL USING (FALSE);

-- Audit log policies — no public access (admins via service role only)
CREATE POLICY "No public access to audit_log" ON audit_log
  FOR ALL USING (FALSE);

-- Puzzle nodes — reference data, no player write access
CREATE POLICY "Players can read released nodes" ON puzzle_nodes
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert puzzle_nodes" ON puzzle_nodes
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admins can update puzzle_nodes" ON puzzle_nodes
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admins can delete puzzle_nodes" ON puzzle_nodes
  FOR DELETE USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));

-- Team progress policies
CREATE POLICY "Players read own team progress" ON team_progress
  FOR SELECT USING (
    team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Admins can read all progress" ON team_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Hash a login code using salted MD5
-- (pgcrypto gen_salt not always available in all Supabase environments;
--  gen_random_uuid + md5 use built-in functions available without extension)
CREATE OR REPLACE FUNCTION hash_login_code(input_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT gen_random_uuid()::text || '$' || md5(input_code || gen_random_uuid()::text);
$$;

-- Verify a login code against a stored hash
CREATE OR REPLACE FUNCTION verify_login_code(input_code TEXT, stored_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT md5(input_code || split_part(stored_hash, '$', 1)) = split_part(stored_hash, '$', 2);
$$;

-- Validate team status transition
CREATE OR REPLACE FUNCTION validate_team_status_transition(
  current_status TEXT,
  new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STRICT
AS $$
DECLARE
  valid BOOLEAN;
BEGIN
  CASE
    WHEN current_status = new_status THEN valid := TRUE;
    WHEN new_status = 'RESET' THEN valid := TRUE;
    WHEN current_status = 'REGISTERED' AND new_status IN ('FORMING', 'ABANDONED', 'DISQUALIFIED') THEN valid := TRUE;
    WHEN current_status = 'FORMING' AND new_status IN ('READY', 'REGISTERED', 'ABANDONED', 'DISQUALIFIED') THEN valid := TRUE;
    WHEN current_status = 'READY' AND new_status IN ('WAITING', 'FORMING', 'ABANDONED', 'DISQUALIFIED') THEN valid := TRUE;
    WHEN current_status = 'WAITING' AND new_status IN ('ACTIVE', 'PAUSED', 'ABANDONED', 'DISQUALIFIED') THEN valid := TRUE;
    WHEN current_status = 'ACTIVE' AND new_status IN ('PAUSED', 'COMPLETED', 'ABANDONED', 'DISQUALIFIED') THEN valid := TRUE;
    WHEN current_status = 'PAUSED' AND new_status IN ('ACTIVE', 'COMPLETED', 'ABANDONED', 'DISQUALIFIED') THEN valid := TRUE;
    WHEN current_status IN ('COMPLETED', 'ABANDONED', 'DISQUALIFIED') AND new_status = 'ABANDONED' THEN valid := TRUE;
    WHEN current_status = 'RESET' AND new_status = 'REGISTERED' THEN valid := TRUE;
    ELSE valid := FALSE;
  END CASE;
  RETURN valid;
END;
$$;

-- Bureau: Create a new team
CREATE OR REPLACE FUNCTION bureau_create_team(p_team_name TEXT)
RETURNS TABLE (team_id UUID, team_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_code TEXT;
BEGIN
  -- Generate a unique 6-char team code
  LOOP
    v_team_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE code = v_team_code);
  END LOOP;

  INSERT INTO teams (name, code, status, metadata)
  VALUES (p_team_name, v_team_code, 'REGISTERED', '{"registeredBy":"ADMIN","assignedRoles":false}')
  RETURNING id, code INTO team_id, team_code;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_CREATE', team_id, '{}'::jsonb, 'Team created via Bureau panel', NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_REGISTERED', team_id, jsonb_build_object('teamCode', v_team_code));
END;
$$;

-- Bureau: Add a player to a team (does NOT generate login code — use bureau_generate_login_code separately)
CREATE OR REPLACE FUNCTION bureau_add_player(
  p_team_id UUID,
  p_display_name TEXT,
  p_role player_role
)
RETURNS TABLE (player_id UUID, team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role_count INTEGER;
BEGIN
  -- Check role uniqueness
  SELECT COUNT(*) INTO role_count
  FROM players
  WHERE team_id = p_team_id AND role = p_role;

  IF role_count > 0 THEN
    RAISE EXCEPTION 'Role % is already assigned to another player in this team', p_role
    USING ERRCODE = 'unique_violation';
  END IF;

  -- Insert the player
  INSERT INTO players (team_id, role, display_name, status, created_at, joined_at)
  VALUES (p_team_id, p_role, p_display_name, 'INVITED', now(), now())
  RETURNING id, team_id INTO player_id, team_id;

  -- Transition team to FORMING
  UPDATE teams
  SET status = 'FORMING'
  WHERE id = p_team_id AND status = 'REGISTERED';

  -- If all 3 roles are now filled, transition to READY
  IF (SELECT COUNT(*) FROM players WHERE team_id = p_team_id AND role IN ('OBSERVER', 'ANALYST', 'OPERATOR')) = 3 THEN
    UPDATE teams
    SET status = 'READY'
    WHERE id = p_team_id AND status = 'FORMING';
  END IF;

  RETURN QUERY SELECT player_id, team_id;
END;
$$;

-- Bureau: Generate a login code for a player
CREATE OR REPLACE FUNCTION bureau_generate_login_code(p_player_id UUID)
RETURNS TABLE (player_id UUID, login_code TEXT, login_code_hash TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_hash TEXT;
BEGIN
  -- Generate a random 8-char code excluding ambiguous characters
  LOOP
    v_code := upper(substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 8));
    -- Exclude I, O, 0, 1
    v_code := replace(replace(replace(replace(v_code, 'I', 'X'), 'O', 'Y'), '0', 'Z'), '1', 'W');
    EXIT WHEN LENGTH(v_code) = 8 AND v_code ~ '^[A-Z2-9]{8}$' AND NOT EXISTS (
      SELECT 1 FROM players WHERE login_code_hash IS NOT NULL AND verify_login_code(v_code, login_code_hash)
    );
  END LOOP;

  v_hash := hash_login_code(v_code);

  UPDATE players
  SET login_code_hash = v_hash,
      login_code_expires_at = now() + INTERVAL '15 minutes',
      login_attempts = 0,
      login_locked_until = NULL
  WHERE id = p_player_id;

  RETURN QUERY SELECT p_player_id, v_code, v_hash;
END;
$$;

-- Bureau: Start a team (WAITING → ACTIVE)
CREATE OR REPLACE FUNCTION bureau_start_team(p_team_id UUID, p_reason TEXT DEFAULT 'Started by Bureau')
RETURNS TABLE (success BOOLEAN, team_id UUID, started_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_started_at TIMESTAMPTZ;
BEGIN
  SELECT status INTO v_current_status FROM teams WHERE id = p_team_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF v_current_status != 'WAITING' THEN
    RAISE EXCEPTION 'Team must be in WAITING status to start, current status is %', v_current_status;
  END IF;

  -- Check all players are logged in (have auth_user_id and device_session_token)
  IF (SELECT COUNT(*) FROM players WHERE team_id = p_team_id AND auth_user_id IS NOT NULL AND device_session_token IS NOT NULL) < 3 THEN
    RAISE EXCEPTION 'All 3 players must have logged in and bound their devices';
  END IF;

  v_started_at := now();

  UPDATE teams
  SET status = 'ACTIVE',
      started_at = v_started_at,
      game_started_at = v_started_at,
      game_deadline = v_started_at + INTERVAL '180 minutes',
      updated_at = v_started_at
  WHERE id = p_team_id;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_START', p_team_id, jsonb_build_object('startedAt', v_started_at), p_reason, NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_STARTED', p_team_id, jsonb_build_object('startedAt', v_started_at));

  RETURN QUERY SELECT TRUE, p_team_id, v_started_at;
END;
$$;

-- Bureau: Reset a team (preserves identity, resets gameplay state)
CREATE OR REPLACE FUNCTION bureau_reset_team(p_team_id UUID, p_reason TEXT DEFAULT 'Reset by Bureau')
RETURNS TABLE (success BOOLEAN, team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status FROM teams WHERE id = p_team_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Clear gameplay state without destroying identity
  UPDATE team_progress
  SET solved_nodes = '{}'::jsonb,
      current_node_id = NULL,
      available_node_ids = '{}'::uuid[],
      evidence_owned = '{}'::uuid[],
      inventory_owned = '{}'::jsonb,
      fragments_owned = '{}'::uuid[],
      score = 0,
      hints_used = 0,
      hints_available = 3,
      time_elapsed_minutes = 0,
      time_remaining_minutes = 180,
      started_at = NULL,
      last_activity_at = now(),
      metadata = '{}'::jsonb
  WHERE team_id = p_team_id;

  UPDATE teams
  SET status = 'RESET',
      started_at = NULL,
      completed_at = NULL,
      current_node_id = NULL,
      score = 0,
      updated_at = now()
  WHERE id = p_team_id;

  -- Clear login codes and device bindings for all players on the team
  UPDATE players
  SET login_code_hash = NULL,
      login_code_expires_at = NULL,
      device_session_token = NULL,
      device_fingerprint_hash = NULL,
      device_info = NULL,
      login_attempts = 0,
      login_locked_until = NULL
  WHERE team_id = p_team_id;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_UPDATE', p_team_id, jsonb_build_object('action', 'RESET'), p_reason, NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_RESET', p_team_id, jsonb_build_object('reason', p_reason));

  RETURN QUERY SELECT TRUE, p_team_id;
END;
$$;

-- Player login verification
-- SECURITY DEFINER: can read login_code_hash even though players table has RLS.
-- Validates the code, checks device binding, and returns only minimum info.
-- Does NOT mutate — use player_login_flow for the full flow with binding.
CREATE OR REPLACE FUNCTION verify_player_login(
  input_code TEXT,
  input_device_fingerprint_hash TEXT,
  input_device_info JSONB
)
RETURNS TABLE (
  player_id UUID,
  team_id UUID,
  role player_role,
  display_name TEXT,
  team_name TEXT,
  team_status team_status,
  auth_user_id UUID,
  auth_user_email TEXT,
  device_bound BOOLEAN,
  device_match BOOLEAN,
  login_attempts INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id, p.team_id, p.role, p.display_name,
    t.name, t.status,
    p.auth_user_id, p.auth_user_email,
    (p.device_session_token IS NOT NULL) AS device_bound,
    (p.device_fingerprint_hash = input_device_fingerprint_hash) AS device_match,
    p.login_attempts
  FROM players p
  JOIN teams t ON t.id = p.team_id
  WHERE verify_login_code(input_code, p.login_code_hash)
    AND (p.login_locked_until IS NULL OR p.login_locked_until < now())
    AND (p.login_code_expires_at IS NULL OR p.login_code_expires_at > now())
  LIMIT 1;
$$;

-- Atomic player login flow: verify code + set device binding in one transaction
CREATE OR REPLACE FUNCTION player_login_flow(
  input_code TEXT,
  input_device_fingerprint_hash TEXT,
  input_device_info JSONB
)
RETURNS TABLE (
  player_id UUID,
  team_id UUID,
  role player_role,
  display_name TEXT,
  team_name TEXT,
  team_status team_status,
  auth_user_id UUID,
  auth_user_email TEXT,
  login_result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p_id UUID;
  v_device_bound BOOLEAN;
  v_device_match BOOLEAN;
  v_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;
  MAX_LOGIN_ATTEMPTS CONSTANT INTEGER := 5;
  LOCKOUT_DURATION CONSTANT INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- Find and verify player by login code (active code + not locked)
  SELECT id, (device_session_token IS NOT NULL), (device_fingerprint_hash = input_device_fingerprint_hash),
         login_attempts, login_locked_until
  INTO p_id, v_device_bound, v_device_match, v_attempts, v_locked_until
  FROM players
  WHERE verify_login_code(input_code, login_code_hash)
    AND (login_locked_until IS NULL OR login_locked_until < now())
    AND (login_code_expires_at IS NULL OR login_code_expires_at > now())
  LIMIT 1;

  IF p_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::player_role, ''::TEXT, ''::TEXT,
      NULL::team_status, NULL::UUID, NULL::TEXT, 'NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  -- Check device binding
  IF v_device_bound AND NOT v_device_match THEN
    -- Increment failed attempts on device mismatch
    UPDATE players
    SET login_attempts = login_attempts + 1,
        login_locked_until = CASE
          WHEN login_attempts + 1 >= MAX_LOGIN_ATTEMPTS THEN now() + LOCKOUT_DURATION
          ELSE login_locked_until
        END
    WHERE id = p_id;

    RETURN QUERY
    SELECT p.id, p.team_id, p.role, p.display_name,
           t.name, t.status,
           p.auth_user_id, p.auth_user_email, 'DEVICE_MISMATCH'::TEXT
    FROM players p
    JOIN teams t ON t.id = p.team_id
    WHERE p.id = p_id;
    RETURN;
  END IF;

  -- Bind or re-confirm device
  UPDATE players
  SET device_session_token = COALESCE(device_session_token, gen_random_uuid()::TEXT),
      device_fingerprint_hash = input_device_fingerprint_hash,
      device_info = input_device_info,
      login_attempts = 0,
      login_locked_until = NULL,
      login_code_hash = NULL,
      login_code_expires_at = NULL,
      last_login_at = now(),
      status = 'ACTIVE'
  WHERE id = p_id;

  -- Return success
  RETURN QUERY
  SELECT p.id, p.team_id, p.role, p.display_name,
         t.name, t.status,
         p.auth_user_id, p.auth_user_email, 'SUCCESS'::TEXT
  FROM players p
  JOIN teams t ON t.id = p.team_id
  WHERE p.id = p_id;
END;
$$;

-- Check if current auth user is an admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid()
  );
$$;

-- Check if current auth user is a super admin
CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

-- Set player device binding (called after successful first login)
CREATE OR REPLACE FUNCTION set_player_device_binding(
  p_player_id UUID,
  p_device_fingerprint_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players
  SET device_session_token = gen_random_uuid()::TEXT,
      device_fingerprint_hash = p_device_fingerprint_hash,
      login_attempts = 0,
      last_login_at = now(),
      status = 'ACTIVE'
  WHERE id = p_player_id
  AND device_session_token IS NULL;

  -- If the player already had a token, this is a same-device login — just update the fingerprint
  UPDATE players
  SET device_fingerprint_hash = p_device_fingerprint_hash,
      last_login_at = now(),
      status = 'ACTIVE'
  WHERE id = p_player_id
  AND device_session_token IS NOT NULL
  AND device_fingerprint_hash = p_device_fingerprint_hash;
END;
$$;

-- ============================================================================
-- REALTIME PUBLICATIONS
-- ============================================================================
-- (CREATE PUBLICATION doesn't support IF NOT EXISTS in PostgreSQL < 15)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_team_status') THEN
    CREATE PUBLICATION nexus_team_status FOR TABLE teams;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_players') THEN
    CREATE PUBLICATION nexus_players FOR TABLE players;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_team_progress') THEN
    CREATE PUBLICATION nexus_team_progress FOR TABLE team_progress;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_audit_log') THEN
    CREATE PUBLICATION nexus_audit_log FOR TABLE audit_log;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'nexus_game_events') THEN
    CREATE PUBLICATION nexus_game_events FOR TABLE game_events;
  END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create team_progress when a team is inserted
CREATE OR REPLACE FUNCTION create_team_progress_for_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO team_progress (team_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_team_progress
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_team_progress_for_team();

-- Update team status in team_progress when team is updated
CREATE OR REPLACE FUNCTION update_team_progress_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE team_progress
    SET last_activity_at = now()
    WHERE team_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_team_progress_activity
  AFTER UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_team_progress_activity();

-- Prevent status changes that are not valid transitions
CREATE OR REPLACE FUNCTION enforce_team_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT validate_team_status_transition(OLD.status::TEXT, NEW.status::TEXT) THEN
      RAISE EXCEPTION 'Invalid team status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_enforce_team_status_transition
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION enforce_team_status_transition();

-- Audit player role changes (role is locked once team is active)
CREATE OR REPLACE FUNCTION prevent_role_change_after_start()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF (SELECT status FROM teams WHERE id = NEW.team_id) IN ('ACTIVE', 'PAUSED', 'COMPLETED') THEN
      RAISE EXCEPTION 'Role cannot be changed after game has started';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prevent_role_change_after_start
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change_after_start();

-- Prevent team_id changes on players
CREATE OR REPLACE FUNCTION prevent_team_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.team_id IS DISTINCT FROM NEW.team_id THEN
    RAISE EXCEPTION 'team_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prevent_team_change
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION prevent_team_change();

-- Prevent score changes via direct DB on teams (must go through game logic)
-- Only blocks authenticated non-admin client calls; service_role and admin
-- SECURITY DEFINER functions (e.g., bureau_reset_team) are allowed.
CREATE OR REPLACE FUNCTION prevent_direct_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND auth.role() = 'authenticated' THEN
    -- Allow if the caller is an admin (verified in the edge function before RPC call)
    IF auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    ) THEN
      -- Admin via SECURITY DEFINER function — allow score change
      NULL;
    ELSIF OLD.score IS DISTINCT FROM NEW.score THEN
      RAISE EXCEPTION 'Score cannot be modified directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prevent_direct_score_change
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_score_change();

-- Update team updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-update updated_at timestamp on teams
CREATE TRIGGER trigger_update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at timestamp on players
CREATE TRIGGER trigger_update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Protect sensitive columns from client-side tampering
-- When the request comes from an authenticated client (not service_role),
-- critical auth columns cannot be modified directly.
CREATE OR REPLACE FUNCTION protect_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Block client (authenticated role) modifications of sensitive columns
    IF auth.role() = 'authenticated' THEN
      IF OLD.login_code_hash IS DISTINCT FROM NEW.login_code_hash THEN
        RAISE EXCEPTION 'login_code_hash cannot be modified directly';
      END IF;
      IF OLD.login_code_expires_at IS DISTINCT FROM NEW.login_code_expires_at THEN
        RAISE EXCEPTION 'login_code_expires_at cannot be modified directly';
      END IF;
      IF OLD.device_session_token IS DISTINCT FROM NEW.device_session_token THEN
        RAISE EXCEPTION 'device_session_token cannot be modified directly';
      END IF;
      IF OLD.device_fingerprint_hash IS DISTINCT FROM NEW.device_fingerprint_hash THEN
        RAISE EXCEPTION 'device_fingerprint_hash cannot be modified directly';
      END IF;
      IF OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id THEN
        RAISE EXCEPTION 'auth_user_id cannot be modified directly';
      END IF;
      IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'role cannot be modified directly';
      END IF;
      IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
        RAISE EXCEPTION 'team_id cannot be modified directly';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_protect_sensitive_columns
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION protect_sensitive_columns();

-- Auto-cleanup expired rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_login_rate_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM login_rate_limits
  WHERE created_at < now() - INTERVAL '1 hour';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_cleanup_login_rate_limits
  AFTER INSERT ON login_rate_limits
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_login_rate_limits();
