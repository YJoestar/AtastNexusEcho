-- Migration: 2026100307_qr_policy_and_resolver
--
-- 1. The qr_nodes SELECT policy from 2026100201 selected from qr_nodes inside its
--    own USING clause. PostgreSQL rejects that with "infinite recursion detected
--    in policy for relation qr_nodes", so every user-session read of the table
--    failed. The game-scan-qr fallback (a player typing a marker id or manual
--    code instead of scanning) is exactly such a read, so the fallback never
--    worked.
-- 2. Even with the recursion gone the fallback could not work through the table:
--    the policy shows a player only markers their team has already scanned, and
--    the fallback exists to resolve one they have not scanned yet.
--
-- The policy now asks a SECURITY DEFINER predicate (no recursion, and the event
-- log stays closed to the API roles), and resolving a typed marker id / manual
-- code / node code is its own RPC. It takes the typed text as a bound parameter
-- (the old edge code interpolated it into a PostgREST filter string) and returns
-- only the node code, which the caller is about to scan anyway.

CREATE OR REPLACE FUNCTION team_has_scanned(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM game_events ge
      JOIN players p ON p.team_id = ge.team_id
     WHERE p.auth_user_id = auth.uid()
       AND ge.payload ->> 'qrCode' = p_code
  );
$$;

DROP POLICY IF EXISTS "Players discover qr_nodes through scanning only" ON qr_nodes;
CREATE POLICY "Players discover qr_nodes through scanning only" ON qr_nodes
  FOR SELECT USING (team_has_scanned(code));

CREATE OR REPLACE FUNCTION resolve_qr_code(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_input TEXT := upper(btrim(coalesce(p_input, '')));
  v_code TEXT;
BEGIN
  IF auth.uid() IS NULL OR v_input = '' OR length(v_input) > 64 THEN
    RETURN NULL;
  END IF;

  SELECT q.code INTO v_code
    FROM qr_nodes q
   WHERE upper(q.code) = v_input
      OR upper(q.marker_id) = v_input
      OR upper(q.manual_code) = v_input
   LIMIT 1;

  RETURN v_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION team_has_scanned(text), resolve_qr_code(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION team_has_scanned(text), resolve_qr_code(text) TO authenticated, service_role;
