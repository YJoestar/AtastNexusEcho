-- ============================================================================
-- NEXUS — One Logic Code alphabet, enforced by the database too
--
-- THE BUG
-- Four different, inconsistent rules existed for the codes this game hands out:
--
--   1. Team codes were generated as upper(substr(md5(...), 1, 6)). md5 hex is
--      0-9A-F, so a team code could contain 0 or 1 — exactly the characters the
--      game forbids. "31E3E5" is a perfectly ordinary team code from that
--      generator: it is not corrupted, it was always allowed. The guard on
--      teams.code was `^[A-Z0-9]{6}$`, which permits both.
--
--   2. Player codes were generated from md5 hex with I->X, O->Y, 0->Z, 1->W
--      replacements (bureau_generate_login_code, and every copy of it in
--      2026093008/3009). That can only ever emit A-F, 2-9, W, X, Y, Z — 18 of
--      the 32 legal symbols, so a fifth of the intended entropy was never used,
--      and codes looked repetitive (every code began with A-F).
--
--   3. The validators were LOOSER than the generators. Every SQL check and the
--      player-login edge function used `^[A-Z2-9]{8}$`, and that range includes
--      I and O. So a code the game would never issue was accepted as
--      well-formed and then failed as an unknown code — a silent dead end for
--      the player.
--
--   4. The alphabet itself was copy-pasted into six files with no shared
--      definition, so any of them could drift again.
--
-- THE FIX
--   * nexus_code_alphabet() is now the only definition in SQL, and
--     nexus_random_code() / nexus_is_valid_logic_code() are the only generator
--     and the only validator. They are character-for-character identical to
--     src/lib/auth/code-generation.ts and supabase/functions/_shared/logicCode.ts.
--
--         alphabet : A-Z and 2-9
--         length   : 8 for a player Logic Code, 6 for a team code
--         banned   : I, O, 0, 1
--
--   * Every existing generator now calls them, so the same rule produces and
--     accepts every code in the game.
--   * teams.code gets a real alphabet constraint. It is added NOT VALID on
--     purpose: teams that already exist keep the code printed on their
--     paperwork (a team code is a label, not a credential, and silently
--     rewriting one is how a team ends up with a code nobody has), while every
--     team created from now on is guaranteed clean. The grandfathered rows are
--     reported below so the Bureau can decide.
--
-- NO CREDENTIAL IS CHANGED. Player codes are stored as salted hashes, so
-- nothing stored can contain a forbidden character and nothing needs rewriting.
-- ============================================================================

-- ============================================================================
-- 1. The single source of truth
-- ============================================================================
CREATE OR REPLACE FUNCTION nexus_code_alphabet()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
$$;

CREATE OR REPLACE FUNCTION nexus_login_code_length()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 8;
$$;

CREATE OR REPLACE FUNCTION nexus_team_code_length()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 6;
$$;

-- The only validator. p_length is explicit because a team code and a player
-- code use the same alphabet at different lengths.
CREATE OR REPLACE FUNCTION nexus_is_valid_logic_code(p_code TEXT, p_length INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_code IS NOT NULL
     AND p_length IS NOT NULL
     AND p_length > 0
     AND length(p_code) = p_length
     AND p_code ~ ('^[' || nexus_code_alphabet() || ']{' || p_length || '}$');
$$;

-- The only generator. One CSPRNG byte per character; the alphabet has 32
-- symbols and a byte is 256 = 8 x 32, so "byte % 32" is unbiased and every
-- symbol is equally likely (the md5 + replace() approach it replaces was not).
--
-- gen_random_bytes() is not available on this database, so the bytes come from
-- gen_random_uuid() via the core decode()/get_byte() pair.
CREATE OR REPLACE FUNCTION nexus_random_code(p_length INTEGER DEFAULT 8)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_alphabet TEXT := nexus_code_alphabet();
  v_symbols INTEGER := length(nexus_code_alphabet());
  v_bytes BYTEA;
  v_code TEXT := '';
  i INTEGER;
BEGIN
  IF p_length IS NULL OR p_length < 1 THEN
    RAISE EXCEPTION 'Logic code length must be a positive integer, got %', p_length;
  END IF;

  v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  WHILE length(v_bytes) < p_length LOOP
    v_bytes := v_bytes || decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  END LOOP;

  FOR i IN 0..p_length - 1 LOOP
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % v_symbols) + 1, 1);
  END LOOP;

  IF NOT nexus_is_valid_logic_code(v_code, p_length) THEN
    RAISE EXCEPTION 'Generated logic code failed its own validation: %', v_code;
  END IF;

  RETURN v_code;
END;
$$;

-- A player Logic Code: the game's length, from the game's alphabet.
CREATE OR REPLACE FUNCTION nexus_random_login_code()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT nexus_random_code(nexus_login_code_length());
$$;

-- A team code: teams.code is CHAR(6), so 6 characters, same alphabet.
CREATE OR REPLACE FUNCTION nexus_random_team_code()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT nexus_random_code(nexus_team_code_length());
$$;

-- A player Logic Code that no player in the game currently holds. Rotation
-- always goes through here, so issuing a code can never collide with, or
-- overwrite, another player's credential.
CREATE OR REPLACE FUNCTION nexus_unique_login_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_code TEXT;
BEGIN
  LOOP
    v_code := nexus_random_login_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM players pl
      WHERE pl.login_code_hash IS NOT NULL
        AND verify_login_code(v_code, pl.login_code_hash)
    );
  END LOOP;

  RETURN v_code;
END;
$$;

-- ============================================================================
-- 2. Re-point every existing generator at the shared definition
-- ============================================================================

-- Bureau: generate a team (was md5 hex -> could emit 0 and 1)
CREATE OR REPLACE FUNCTION bureau_create_team(p_team_name TEXT)
RETURNS TABLE (team_id UUID, team_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_code TEXT;
BEGIN
  LOOP
    v_team_code := nexus_random_team_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE code = v_team_code);
  END LOOP;

  INSERT INTO teams (name, code, status, metadata)
  VALUES (p_team_name, v_team_code, 'REGISTERED', '{"registeredBy":"ADMIN","assignedRoles":false}')
  RETURNING id, code INTO team_id, team_code;

  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_CREATE', team_id, '{}'::jsonb, 'Team created via Bureau panel', NULL);

  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_REGISTERED', team_id, jsonb_build_object('teamCode', v_team_code));

  RETURN;
END;
$$;

-- Bureau: issue a single player's Logic Code
-- (was md5 hex + I/O/0/1 -> letter replacement, an 18-symbol alphabet)
CREATE OR REPLACE FUNCTION bureau_generate_login_code(p_player_id UUID)
RETURNS TABLE (player_id UUID, login_code TEXT, login_code_hash TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_hash TEXT;
BEGIN
  v_code := nexus_unique_login_code();
  v_hash := hash_login_code(v_code);

  UPDATE players AS pl
  SET login_code_hash = v_hash,
      login_code_expires_at = now() + INTERVAL '15 minutes',
      login_attempts = 0,
      login_locked_until = NULL
  WHERE pl.id = p_player_id;

  RETURN QUERY SELECT p_player_id, v_code, v_hash;
END;
$$;

-- Provisioning keeps the 2026093018 body; only the two code generators change.
DROP FUNCTION IF EXISTS bureau_provision_team(TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION bureau_provision_team(
  p_team_name TEXT,
  p_players JSONB,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  team_id UUID,
  team_code TEXT,
  players JSONB,
  replayed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_code TEXT;
  v_team_id UUID;
  v_item JSONB;
  v_player_id UUID;
  v_player_name TEXT;
  v_player_role player_role;
  v_code TEXT;
  v_hash TEXT;
  v_results JSONB := '[]'::jsonb;
  v_count INTEGER := 0;
  v_row RECORD;
  v_status team_status;
  v_key TEXT := NULLIF(trim(coalesce(p_idempotency_key, '')), '');
BEGIN
  IF v_key IS NOT NULL THEN
    SELECT t.id, t.code, t.status INTO v_team_id, v_team_code, v_status
    FROM teams t
    WHERE t.metadata ->> 'provisioningKey' = v_key;

    IF v_team_id IS NOT NULL THEN
      FOR v_row IN
        SELECT pl.id, pl.display_name, pl.role, pl.auth_user_id, pl.auth_user_email
        FROM players pl
        WHERE pl.team_id = v_team_id
        ORDER BY pl.role
        FOR UPDATE
      LOOP
        v_code := nexus_unique_login_code();
        v_hash := hash_login_code(v_code);

        UPDATE players p2
        SET login_code_hash = v_hash,
            login_code_expires_at = NULL,
            login_attempts = 0,
            login_locked_until = NULL,
            updated_at = now()
        WHERE p2.id = v_row.id;

        v_results := v_results || jsonb_build_object(
          'player_id', v_row.id::text,
          'name', v_row.display_name,
          'role', v_row.role::text,
          'login_code', v_code,
          'auth_user_id', v_row.auth_user_id::text,
          'auth_user_email', v_row.auth_user_email
        );
      END LOOP;

      IF v_status = 'READY' THEN
        UPDATE teams t SET status = 'WAITING' WHERE t.id = v_team_id;
      END IF;

      INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
      VALUES (auth.uid()::text, 'TEAM_CREATE', v_team_id,
              jsonb_build_object('action', 'PROVISION_REPLAY', 'key', v_key),
              'Duplicate wizard submission resolved to the original team', NULL);

      RETURN QUERY SELECT v_team_id, v_team_code, v_results, TRUE;
      RETURN;
    END IF;
  END IF;

  IF p_team_name IS NULL OR length(trim(p_team_name)) < 1 OR length(p_team_name) > 50 THEN
    RAISE EXCEPTION 'Team name must be 1-50 characters';
  END IF;

  IF p_players IS NULL OR jsonb_typeof(p_players) <> 'array' OR jsonb_array_length(p_players) < 1 THEN
    RAISE EXCEPTION 'At least one player is required';
  END IF;

  IF jsonb_array_length(p_players) > 3 THEN
    RAISE EXCEPTION 'A team may have at most 3 players';
  END IF;

  LOOP
    v_team_code := nexus_random_team_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE code = v_team_code);
  END LOOP;

  INSERT INTO teams (name, code, status, metadata)
  VALUES (
    trim(p_team_name),
    v_team_code,
    'REGISTERED',
    CASE
      WHEN v_key IS NULL
        THEN jsonb_build_object('registeredBy', 'ADMIN', 'assignedRoles', true)
      ELSE jsonb_build_object(
             'registeredBy', 'ADMIN',
             'assignedRoles', true,
             'provisioningKey', v_key
           )
    END
  )
  RETURNING id INTO v_team_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_players) LOOP
    v_player_name := coalesce(trim(v_item ->> 'name'), '');
    v_player_role := (v_item ->> 'role')::player_role;

    IF v_player_name = '' THEN
      RAISE EXCEPTION 'Every player needs a name';
    END IF;

    IF v_player_role IS NULL THEN
      RAISE EXCEPTION 'Every player needs a role';
    END IF;

    IF EXISTS (SELECT 1 FROM players pl WHERE pl.team_id = v_team_id AND pl.role = v_player_role) THEN
      RAISE EXCEPTION 'Role % is already assigned on this team', v_player_role;
    END IF;

    v_code := nexus_unique_login_code();
    v_hash := hash_login_code(v_code);

    INSERT INTO players AS pl (team_id, role, display_name, status, created_at, joined_at, login_code_hash)
    VALUES (v_team_id, v_player_role, v_player_name, 'INVITED', now(), now(), v_hash)
    RETURNING pl.id INTO v_player_id;

    v_results := v_results || jsonb_build_object(
      'player_id', v_player_id::text,
      'name', v_player_name,
      'role', v_player_role::text,
      'login_code', v_code
    );
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 1 THEN
    UPDATE teams t SET status = 'FORMING' WHERE t.id = v_team_id;
  END IF;
  IF v_count = 3 THEN
    UPDATE teams t SET status = 'READY' WHERE t.id = v_team_id;
  END IF;

  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_CREATE', v_team_id,
          jsonb_build_object('players', v_count, 'action', 'PROVISION'),
          'Team provisioned via Bureau wizard', NULL);

  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_REGISTERED', v_team_id,
          jsonb_build_object('teamCode', v_team_code, 'players', v_count));

  RETURN QUERY SELECT v_team_id, v_team_code, v_results, FALSE;
END;
$$;

-- Re-issue (from 2026093016) only changes where the code comes from.
DROP FUNCTION IF EXISTS bureau_reissue_login_codes(UUID, UUID[]);

CREATE OR REPLACE FUNCTION bureau_reissue_login_codes(
  p_team_id UUID,
  p_player_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  player_role player_role,
  login_code TEXT,
  auth_user_id UUID,
  auth_user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_status team_status;
  v_row RECORD;
  v_code TEXT;
  v_hash TEXT;
  v_results JSONB := '[]'::jsonb;
BEGIN
  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'teamId is required';
  END IF;

  SELECT t.status INTO v_team_status FROM teams t WHERE t.id = p_team_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF v_team_status NOT IN ('REGISTERED', 'FORMING', 'READY', 'WAITING', 'RESET') THEN
    RAISE EXCEPTION 'Cannot issue login codes: team is % and its roster is locked', v_team_status;
  END IF;

  FOR v_row IN
    SELECT pl.id, pl.display_name, pl.role, pl.auth_user_id, pl.auth_user_email
    FROM players pl
    WHERE pl.team_id = p_team_id
      AND (p_player_ids IS NULL OR pl.id = ANY (p_player_ids))
    ORDER BY pl.role
    FOR UPDATE
  LOOP
    v_code := nexus_unique_login_code();
    v_hash := hash_login_code(v_code);

    UPDATE players
    SET login_code_hash = v_hash,
        login_code_expires_at = NULL,
        login_attempts = 0,
        login_locked_until = NULL,
        updated_at = now()
    WHERE id = v_row.id;

    v_results := v_results || jsonb_build_object(
      'player_id', v_row.id::text,
      'name', v_row.display_name,
      'role', v_row.role::text,
      'login_code', v_code,
      'auth_user_id', v_row.auth_user_id::text,
      'auth_user_email', v_row.auth_user_email
    );
  END LOOP;

  IF v_results = '[]'::jsonb THEN
    RAISE EXCEPTION 'No matching players on this team';
  END IF;

  IF v_team_status = 'READY' THEN
    UPDATE teams t SET status = 'WAITING' WHERE t.id = p_team_id;
  END IF;

  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'ROLE_ASSIGN', p_team_id,
          jsonb_build_object('action', 'REISSUE_CODES', 'players', jsonb_array_length(v_results)),
          'Login codes re-issued by Bureau', NULL);

  RETURN QUERY
  SELECT
    (e.item ->> 'player_id')::UUID,
    e.item ->> 'name',
    (e.item ->> 'role')::player_role,
    e.item ->> 'login_code',
    (e.item ->> 'auth_user_id')::UUID,
    e.item ->> 'auth_user_email'
  FROM jsonb_array_elements(v_results) AS e(item);
END;
$$;

-- ============================================================================
-- 3. Database-level guarantee for team codes
--    NOT VALID: existing teams keep the code already printed on their
--    paperwork, every new or updated team must obey the alphabet.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_team_code_alphabet'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT valid_team_code_alphabet
      CHECK (code ~ ('^[' || nexus_code_alphabet() || ']{' || nexus_team_code_length() || '}$'))
      NOT VALID;
  END IF;
END;
$$;

-- ============================================================================
-- 4. Report what already exists, so nothing is silently rewritten
-- ============================================================================
DO $$
DECLARE
  v_bad_teams TEXT;
  v_no_auth_user INTEGER;
  v_no_code_no_device INTEGER;
  v_consumed INTEGER;
BEGIN
  SELECT string_agg(t.code || ' (' || t.name || ')', ', ')
  INTO v_bad_teams
  FROM teams t
  WHERE NOT nexus_is_valid_logic_code(t.code, nexus_team_code_length());

  -- A credential the game can never use: a stored hash with no auth user whose
  -- password could match it. The Bureau fixes these from the team page.
  SELECT count(*) INTO v_no_auth_user
  FROM players pl
  WHERE pl.login_code_hash IS NOT NULL AND pl.auth_user_id IS NULL;

  -- No code and no device: the player has no way in until a code is issued.
  SELECT count(*) INTO v_no_code_no_device
  FROM players pl
  WHERE pl.login_code_hash IS NULL AND pl.device_session_token IS NULL;

  -- Code consumed by a successful login (login_code_hash is cleared on use).
  SELECT count(*) INTO v_consumed
  FROM players pl
  WHERE pl.login_code_hash IS NULL AND pl.device_session_token IS NOT NULL;

  RAISE NOTICE 'LOGIC CODE AUDIT: %',
    jsonb_build_object(
      'grandfathered_team_codes_outside_alphabet', coalesce(v_bad_teams, 'none'),
      'players_with_code_but_no_auth_user', v_no_auth_user,
      'players_with_no_code_and_no_device', v_no_code_no_device,
      'players_who_already_used_their_code', v_consumed
    )::text;
END;
$$;
