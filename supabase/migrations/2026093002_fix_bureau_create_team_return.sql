-- ============================================================================
-- NEXUS — Fix bureau_create_team returning zero rows
--
-- BUG: bureau_create_team() is RETURNS TABLE (team_id UUID, team_code TEXT) but
--      the plpgsql body filled the OUT parameters via `RETURNING ... INTO` and
--      then fell off the end without any RETURN statement. PostgreSQL therefore
--      returned an empty result set.
--
-- IMPACT: the team row WAS created, but the caller saw data[0] === undefined.
--      bureau-operations' create-team action dereferenced data[0].team_id and
--      threw, so the Edge Function answered 500 and the admin panel could never
--      create a team. (A second, orphaned team was also inserted per attempt,
--      because the error was raised after the INSERT had already committed.)
--
-- FIX: add the missing bare `RETURN;`, which emits the current OUT parameter
--      values as a single row.
--
-- No security change: SECURITY DEFINER, auth.uid()-scoped audit and event
-- writes, and RLS are all unchanged.
-- ============================================================================

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

  RETURN;
END;
$$;
