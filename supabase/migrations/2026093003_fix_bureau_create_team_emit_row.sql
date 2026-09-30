-- ============================================================================
-- NEXUS — Correct bureau_create_team result emission
--
-- 2026093002 added a bare `RETURN;`, which does NOT emit a row for a
-- RETURNS TABLE function (RETURNS TABLE == RETURNS SETOF record, so the only
-- ways to emit rows are RETURN NEXT and RETURN QUERY). The function therefore
-- still returned an empty result set and bureau-operations' create-team still
-- answered 500.
--
-- FIX: build the row from local variables and emit it with RETURN QUERY, the
--      same pattern the other bureau_* RPCs already use.
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
  v_team_id UUID;
BEGIN
  -- Generate a unique 6-char team code
  LOOP
    v_team_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE code = v_team_code);
  END LOOP;

  INSERT INTO teams (name, code, status, metadata)
  VALUES (p_team_name, v_team_code, 'REGISTERED', '{"registeredBy":"ADMIN","assignedRoles":false}')
  RETURNING id INTO v_team_id;

  -- Log the action
  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_CREATE', v_team_id, '{}'::jsonb, 'Team created via Bureau panel', NULL);

  -- Emit game event
  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_REGISTERED', v_team_id, jsonb_build_object('teamCode', v_team_code));

  RETURN QUERY SELECT v_team_id, v_team_code;
END;
$$;
