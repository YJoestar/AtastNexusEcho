-- Migration: 2026100301_lock_down_privileged_surface
--
-- Found by running the whole migration history on a clean database and
-- calling the API surface as the `anon` and `authenticated` roles:
--
--  1. Every SECURITY DEFINER function kept Postgres' default
--     `EXECUTE ... TO PUBLIC`. On Supabase, PostgREST exposes them at
--     /rest/v1/rpc/<name>, so anyone holding the public anon key could call
--     bureau_create_team, bureau_reset_team, bureau_manual_unlock,
--     bureau_reissue_login_codes (which RETURNS plaintext login codes),
--     verify_player_login, set_player_device_binding... Nothing inside the
--     bureau_* functions checks that the caller is an admin: that check lived
--     only in the edge function in front of them. Reproduced: as `anon`,
--     `SELECT * FROM bureau_create_team('x')` inserted a team.
--  2. game_events, locations, location_history and login_rate_limits had no
--     row-level security. With Supabase's default table grants that made the
--     login rate-limit table writable by anyone (bypass: delete your own rows;
--     abuse: insert rows for someone else's IP to lock them out), and the
--     event log and location overrides readable and writable.
--  4. bureau_create_team() returned no row. 2026093003 fixed that (RETURN QUERY),
--     then 2026093021 redefined the function from the pre-fix text and brought
--     back the bare `RETURN;`, so the edge function's `data[0].team_id` threw
--     a TypeError (HTTP 500) after the team had already been created.
--  3. bureau_list_locations() raised "column n.code must appear in the GROUP BY
--     clause" on every call, so the admin location list could never load.
--
-- Callers are unchanged: the edge functions use the service role (which keeps
-- every privilege) or an authenticated player/admin session.

-- ---------------------------------------------------------------------------
-- 3. Fix bureau_list_locations (ORDER BY belongs inside the aggregate).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bureau_list_locations()
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
    ) ORDER BY n.code
  ), '[]'::jsonb)
  INTO result
  FROM locations l
  JOIN puzzle_nodes n ON n.id = l.node_id;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Restore the row emitted by bureau_create_team (keeps 2026093021's
--    unambiguous team-code generator).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bureau_create_team(p_team_name TEXT)
RETURNS TABLE (team_id UUID, team_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_code TEXT;
  v_team_id UUID;
BEGIN
  LOOP
    v_team_code := nexus_random_team_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM teams t WHERE t.code = v_team_code);
  END LOOP;

  INSERT INTO teams (name, code, status, metadata)
  VALUES (p_team_name, v_team_code, 'REGISTERED', '{"registeredBy":"ADMIN","assignedRoles":false}')
  RETURNING id INTO v_team_id;

  INSERT INTO audit_log (admin_id, action_type, target_team_id, payload, reason, ip_address)
  VALUES (auth.uid()::text, 'TEAM_CREATE', v_team_id, '{}'::jsonb, 'Team created via Bureau panel', NULL);

  INSERT INTO game_events (type, team_id, payload)
  VALUES ('TEAM_REGISTERED', v_team_id, jsonb_build_object('teamCode', v_team_code));

  RETURN QUERY SELECT v_team_id, v_team_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Row-level security on the four tables that had none. No policies: only the
--    service role (which bypasses RLS) and SECURITY DEFINER functions touch them.
-- ---------------------------------------------------------------------------
ALTER TABLE game_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_rate_limits  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON game_events, locations, location_history, login_rate_limits FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1a. Admin guard for the bureau_* functions.
--     Each is renamed to <name>_impl (callable only by the owner and the service
--     role) and replaced by a same-signature wrapper that refuses anyone who is
--     not an admin or the service role. Idempotent: a function that already has
--     an _impl twin is skipped.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f RECORD;
  call_args TEXT;
  body_call TEXT;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname, p.proretset,
           pg_get_function_identity_arguments(p.oid) AS identity_args,
           pg_get_function_result(p.oid) AS result_type,
           p.proargnames, p.pronargs
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname LIKE 'bureau\_%'
       AND p.proname NOT LIKE '%\_impl'
       AND NOT EXISTS (
         SELECT 1 FROM pg_proc q
          WHERE q.pronamespace = p.pronamespace AND q.proname = p.proname || '_impl')
  LOOP
    -- Input arguments are the first pronargs names, in order.
    SELECT COALESCE(string_agg(quote_ident(nm), ', ' ORDER BY ord), '')
      INTO call_args
      FROM unnest(f.proargnames[1:f.pronargs]) WITH ORDINALITY AS t(nm, ord);

    EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I', f.proname, f.identity_args, f.proname || '_impl');

    body_call := CASE WHEN f.proretset
      THEN format('RETURN QUERY SELECT * FROM public.%I(%s);', f.proname || '_impl', call_args)
      ELSE format('RETURN public.%I(%s);', f.proname || '_impl', call_args)
    END;

    EXECUTE format($fn$
      CREATE FUNCTION public.%I(%s)
      RETURNS %s
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $body$
      BEGIN
        IF NOT (auth.role() = 'service_role' OR public.is_current_user_admin()) THEN
          RAISE EXCEPTION 'Bureau administrator access required' USING ERRCODE = '42501';
        END IF;
        %s
      END;
      $body$
    $fn$, f.proname, f.identity_args, f.result_type, body_call);

    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', f.proname || '_impl', f.identity_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', f.proname || '_impl', f.identity_args);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1b. Function privileges: nothing is callable by PUBLIC or anon; signed-in
--     users get only what the game and the admin session actually call.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Player RPCs (scoped by auth.uid() inside).
GRANT EXECUTE ON FUNCTION
  get_player_node_detail(uuid, text),
  get_team_node_progress(),
  scan_qr_code(text),
  get_team_game_state(),
  get_team_notifications(boolean),
  get_team_inventory(),
  request_hint(uuid, integer),
  get_leaderboard(),
  submit_puzzle_answer(uuid, text),
  mark_notifications_read(),
  get_available_nodes()
TO authenticated;

-- Evaluated by RLS policies as the querying role, so that role needs EXECUTE.
GRANT EXECUTE ON FUNCTION
  get_current_player_id(),
  get_current_team_id(),
  is_current_user_admin(),
  is_current_user_super_admin()
TO authenticated;

-- Admin session RPCs: the guarded wrappers created above.
DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname LIKE 'bureau\_%' AND p.proname NOT LIKE '%\_impl'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', f.proname, f.identity_args);
  END LOOP;
END $$;

-- Functions created later are private by default; grant explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
