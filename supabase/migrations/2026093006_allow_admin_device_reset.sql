-- ============================================================================
-- NEXUS — Let verified Bureau admins clear player device/login state
--
-- BUG: protect_sensitive_columns() blocked ANY change to login_code_hash,
--      login_code_expires_at, device_session_token, device_fingerprint_hash,
--      auth_user_id, role and team_id whenever auth.role() = 'authenticated'.
--
--      bureau-operations calls its RPCs with the signed-in Bureau operator's
--      own JWT (supabaseAdminUser), so auth.role() is 'authenticated' inside
--      the SECURITY DEFINER function too. bureau_reset_team() therefore always
--      aborted with "device_session_token cannot be modified directly" and the
--      admin panel's Reset Team action could never succeed.
--
-- FIX: exempt callers who are already authorized Bureau admins, using the
--      existing SECURITY DEFINER helper is_current_user_admin() (which reads
--      admin_users and therefore still sees the row despite the table's
--      deny-all RLS policy). This is exactly the trust decision the sibling
--      trigger prevent_direct_score_change() already makes for score writes.
--
-- SECURITY: unchanged for every non-admin. A regular player still cannot
--      modify any of these columns, and nothing about RLS, roles or the
--      admin_users policy is altered. Only a caller who already has an
--      admin_users row gains the ability to clear a player's own device
--      binding and login code through the Bureau RPCs.
-- ============================================================================

CREATE OR REPLACE FUNCTION protect_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Block client (authenticated, non-admin) modifications of sensitive columns
    IF auth.role() = 'authenticated' AND NOT is_current_user_admin() THEN
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
