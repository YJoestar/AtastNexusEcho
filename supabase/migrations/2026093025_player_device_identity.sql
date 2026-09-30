-- ============================================================================
-- NEXUS — Give every player a unique device identity, created automatically
--
-- THE PROBLEM
-- Device binding existed, but nothing in the schema guaranteed it was unique,
-- and the provisioning wizard asked the admin to type a Device ID by hand for
-- every player — a field the admin cannot know, that was never shown again,
-- and that had no unique constraint behind it. Two players could easily end up
-- registered against the same device, which silently destroys the one property
-- device binding exists for: that a phone is one player's identity.
--
-- THE DECISION
-- A player's device identity is created by the server when the player is
-- provisioned, and is never typed, displayed, or chosen by anyone. It is a
-- reserved placeholder, not a real fingerprint, and it is hidden from every
-- admin and player screen.
--
-- When the player logs in from their own phone, player_login_flow replaces that
-- placeholder with the fingerprint computed on that device. From that moment
-- the binding is real, and the unique constraint below means the same phone
-- can never become a second player's login.
--
-- The placeholder is namespaced ("pending:" + a UUID) so it can never collide
-- with a real fingerprint, and it stays in the unique index like any other
-- value, so uniqueness holds from the very first row.
-- ============================================================================

-- Provisioned players start with a reserved, unique device identity. The value
-- is meaningless as a fingerprint — it only guarantees the column is unique and
-- ready to be replaced by the player's real device at first login. This runs
-- before the index so legacy placeholder or duplicate values cannot make the
-- index creation fail.
UPDATE players
SET device_fingerprint_hash = 'pending:' || gen_random_uuid()::text,
    updated_at = now()
WHERE device_fingerprint_hash IS NULL
   OR btrim(device_fingerprint_hash) = ''
   OR btrim(device_fingerprint_hash) ~* '^DEVICE-[0-9]+$';

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_device_identity
  ON players (device_fingerprint_hash)
  WHERE device_fingerprint_hash IS NOT NULL;

-- ============================================================================
-- bureau_provision_team: issue the device identity with the player
-- ============================================================================
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

        -- The device identity is deliberately left alone on a replay: it is not
        -- a credential and it may already be a real bound device.
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

    INSERT INTO players AS pl (
      team_id, role, display_name, status, created_at, joined_at,
      login_code_hash, device_fingerprint_hash
    )
    VALUES (
      v_team_id, v_player_role, v_player_name, 'INVITED', now(), now(),
      v_hash, 'pending:' || gen_random_uuid()::text
    )
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
