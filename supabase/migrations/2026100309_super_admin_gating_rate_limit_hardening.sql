-- Migration: 2026100309_super_admin_gating_rate_limit_hardening
--
-- Closes the items 2026100301..308 left open. Four independent parts.
--
-- ===========================================================================
-- DECISION: which bureau_* RPCs need SUPER_ADMIN
-- ===========================================================================
-- Rule: an RPC is SUPER_ADMIN-only when it destroys data that cannot be
-- rebuilt from what remains (submissions, hint history, scores, credentials
-- and device bindings), or moves a team into a state it cannot leave again.
-- Everything an operator needs to run an event stays ADMIN.
--
--   SUPER_ADMIN (or service_role) required
--     bureau_reset_team   wipes progress, score, login codes and device bindings
--                         of a whole team (the edge `reset-game` calls it for
--                         every team)
--     bureau_reset_node   DELETEs a team's node_progress, submissions and
--                         hints_used rows for a node: the attempt history is gone
--   ADMIN (or service_role) unchanged
--     bureau_create_team, bureau_provision_team, bureau_add_player,
--     bureau_start_team, bureau_manual_unlock, bureau_generate_login_code,
--     bureau_reissue_login_codes (rotates codes; the old code is replaced, the
--     team can be re-issued again), bureau_get_*/bureau_list_* (read only)
--
-- There is no admin-management RPC (admin_users has no API surface at all:
-- RLS "No public access" + no grants), so nothing to gate there.
-- Edge-function-only destructive actions (no RPC behind them) are gated in the
-- function itself with the same rule: end-game, disqualify-team (terminal
-- state), delete-location, reset-team, reset-game.
-- The gate raises SQLSTATE 42501, which the edge functions map to HTTP 403.
--
-- ===========================================================================
-- 1. Super-admin wrappers for the two destructive RPCs.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.bureau_reset_team(p_team_id uuid, p_reason text)
RETURNS TABLE (success boolean, team_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.is_current_user_super_admin()) THEN
    RAISE EXCEPTION 'Super administrator access required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.bureau_reset_team_impl(p_team_id, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.bureau_reset_node(p_team_id uuid, p_node_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT (auth.role() = 'service_role' OR public.is_current_user_super_admin()) THEN
    RAISE EXCEPTION 'Super administrator access required' USING ERRCODE = '42501';
  END IF;
  RETURN public.bureau_reset_node_impl(p_team_id, p_node_id, p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.bureau_reset_team(uuid, text), public.bureau_reset_node(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bureau_reset_team(uuid, text), public.bureau_reset_node(uuid, uuid, text) TO authenticated, service_role;

-- ===========================================================================
-- 2. search_path on every SECURITY DEFINER function that lacks one.
--    Without it a definer function resolves unqualified names through the
--    caller's search_path, so a role that can create objects in a schema ahead
--    of `public` (or in pg_temp) can shadow tables/functions and run code as
--    the function owner. 47 functions were affected, including every
--    bureau_* wrapper and the login flow. `extensions` is where Supabase
--    installs pgcrypto; pg_temp goes last so temp objects cannot shadow.
-- ===========================================================================
DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', f.sig);
  END LOOP;
END $$;

-- ===========================================================================
-- 3. Foreign keys without a supporting index (every DELETE/UPDATE of the
--    parent row, and every join on the child column, scans the child table).
-- ===========================================================================
CREATE INDEX IF NOT EXISTS idx_game_events_player            ON game_events(player_id);
CREATE INDEX IF NOT EXISTS idx_location_history_location     ON location_history(location_id);
CREATE INDEX IF NOT EXISTS idx_node_progress_node            ON node_progress(node_id);
CREATE INDEX IF NOT EXISTS idx_qr_nodes_puzzle_node          ON qr_nodes(puzzle_node_id);
CREATE INDEX IF NOT EXISTS idx_qr_nodes_discovered_by_team   ON qr_nodes(discovered_by_team_id);

-- ===========================================================================
-- 4. RLS gap: inventory_items had "Players read owned inventory" USING (true),
--    i.e. every signed-in player could list the whole item catalogue through
--    PostgREST, owned or not. Players get their inventory from
--    get_team_inventory(); admins read it with the service role.
-- ===========================================================================
DROP POLICY IF EXISTS "Players read owned inventory" ON inventory_items;
REVOKE ALL ON inventory_items FROM anon, authenticated;

-- ===========================================================================
-- 5. Login rate limiting.
--
-- Replaces login_rate_limits (one row per attempt, read-then-insert so
-- concurrent requests all passed the check, the whole IP's history deleted on
-- any successful login which let an attacker reset their own counter with one
-- valid code, a trigger that scanned the table on every insert).
--
-- New model: fixed-window counters, one row per key, updated atomically with
-- INSERT .. ON CONFLICT DO UPDATE. The edge function sends several keys per
-- attempt (client network, team code when supplied, a global breaker); all are
-- incremented in one transaction in a fixed order (no deadlocks) and the
-- attempt is refused if any key is over its limit. Expired windows restart at
-- 1. Every call also deletes a bounded batch of expired rows, and
-- login_rate_limit_purge() clears them all (for pg_cron), so the table is
-- bounded by (attempt rate x longest window), not by history.
-- ===========================================================================
DROP TABLE IF EXISTS login_rate_limits;
DROP FUNCTION IF EXISTS cleanup_login_rate_limits();

CREATE TABLE login_rate_limit_buckets (
  key            TEXT PRIMARY KEY CHECK (char_length(key) BETWEEN 1 AND 128),
  attempts       INTEGER     NOT NULL DEFAULT 0,
  window_start   TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_seconds INTEGER     NOT NULL CHECK (window_seconds BETWEEN 1 AND 86400)
);
CREATE INDEX idx_login_rate_limit_buckets_window ON login_rate_limit_buckets(window_start);

ALTER TABLE login_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON login_rate_limit_buckets FROM PUBLIC, anon, authenticated;

-- Count one attempt against every key. Returns allowed=false when any key is
-- over its limit; blocked_key names the first offender and retry_after the
-- seconds until that window ends.
CREATE OR REPLACE FUNCTION login_rate_limit_hit(
  p_keys    TEXT[],
  p_limits  INTEGER[],
  p_windows INTEGER[]
)
RETURNS TABLE (allowed BOOLEAN, blocked_key TEXT, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  r RECORD;
  v_attempts INTEGER;
  v_start TIMESTAMPTZ;
  v_blocked TEXT := NULL;
  v_retry INTEGER := 0;
BEGIN
  IF p_keys IS NULL OR cardinality(p_keys) = 0
     OR cardinality(p_keys) <> cardinality(p_limits)
     OR cardinality(p_keys) <> cardinality(p_windows)
     OR cardinality(p_keys) > 8 THEN
    RAISE EXCEPTION 'invalid rate limit request' USING ERRCODE = '22023';
  END IF;

  FOR r IN
    SELECT k.key, l.lim, w.win
      FROM unnest(p_keys)    WITH ORDINALITY AS k(key, i)
      JOIN unnest(p_limits)  WITH ORDINALITY AS l(lim, i) USING (i)
      JOIN unnest(p_windows) WITH ORDINALITY AS w(win, i) USING (i)
     ORDER BY k.key
  LOOP
    INSERT INTO login_rate_limit_buckets AS b (key, attempts, window_start, window_seconds)
    VALUES (r.key, 1, now(), r.win)
    ON CONFLICT (key) DO UPDATE
      SET attempts = CASE
            WHEN b.window_start + make_interval(secs => b.window_seconds) <= now() THEN 1
            ELSE LEAST(b.attempts + 1, 1000000) END,
          window_start = CASE
            WHEN b.window_start + make_interval(secs => b.window_seconds) <= now() THEN now()
            ELSE b.window_start END,
          window_seconds = r.win
    RETURNING b.attempts, b.window_start INTO v_attempts, v_start;

    IF v_attempts > r.lim AND v_blocked IS NULL THEN
      v_blocked := r.key;
      v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_start + make_interval(secs => r.win) - now())))::INTEGER);
    END IF;
  END LOOP;

  -- Bounded housekeeping: expired rows go, a few per call.
  DELETE FROM login_rate_limit_buckets
   WHERE key IN (
     SELECT b.key FROM login_rate_limit_buckets b
      WHERE b.window_start + make_interval(secs => b.window_seconds) <= now()
      ORDER BY b.window_start
      LIMIT 25
      FOR UPDATE SKIP LOCKED);

  RETURN QUERY SELECT v_blocked IS NULL, v_blocked, v_retry;
END;
$$;

CREATE OR REPLACE FUNCTION login_rate_limit_purge()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE n INTEGER;
BEGIN
  DELETE FROM login_rate_limit_buckets
   WHERE window_start + make_interval(secs => window_seconds) <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION login_rate_limit_hit(TEXT[], INTEGER[], INTEGER[]), login_rate_limit_purge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION login_rate_limit_hit(TEXT[], INTEGER[], INTEGER[]), login_rate_limit_purge() TO service_role;
