-- Migration: 2026100306_revoke_direct_table_access
--
-- The game keeps its secrets server-side and hands players only what an RPC
-- chooses to return (2026093010 "server authoritative puzzles"). The table
-- layer did not agree:
--
--  * puzzle_nodes had `SELECT USING (true)` for every role, and Supabase grants
--    the API roles full table privileges by default. Reproduced as `anon`:
--        select code, answer_metadata->>'acceptedAnswer' from puzzle_nodes;
--    returns the accepted answer of all 47 puzzles (plus every role's clue block,
--    hints and branch graph). The anon key ships in the web bundle, so anyone
--    could read the answers without playing.
--  * players exposed to every teammate the login-code hash (a salted MD5 of an
--    8-symbol code, brute-forceable offline), the encrypted code, the device
--    token and fingerprint, and the internal auth e-mail.
--  * `anon` and `authenticated` kept INSERT/UPDATE/DELETE/TRUNCATE on every
--    table, with only RLS between them and the data; a player could also insert
--    rows into `submissions` directly ("Players submit for own team").
--
-- Nothing in the app reads or writes these tables with a user session: players
-- go through the game-* edge functions and RPCs, admins through edge functions
-- on the service role. So the privileges simply go.

-- 1. Puzzle definitions are service-side only.
DROP POLICY IF EXISTS "Players can read released nodes" ON puzzle_nodes;
REVOKE ALL ON puzzle_nodes FROM anon, authenticated;

-- 2. No writes through the API roles, anywhere in public.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
DROP POLICY IF EXISTS "Players submit for own team" ON submissions;

-- 3. The signed-out role reads nothing directly, and no sequences are usable.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 4. Teammates keep the roster columns, not the credential and device columns.
REVOKE SELECT ON players FROM authenticated;
DO $$
DECLARE cols TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'players'
     AND column_name NOT IN (
       'login_code_hash', 'login_code_cipher', 'login_code_expires_at',
       'login_attempts', 'login_locked_until',
       'device_session_token', 'device_fingerprint_hash', 'device_info',
       'auth_user_email'
     );
  EXECUTE format('GRANT SELECT (%s) ON players TO authenticated', cols);
END $$;

-- Tables created later start closed.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
