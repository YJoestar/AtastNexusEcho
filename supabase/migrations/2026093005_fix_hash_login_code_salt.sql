-- ============================================================================
-- NEXUS — Fix hash_login_code / verify_login_code salt mismatch
--
-- BUG: hash_login_code built its value from TWO independent random values:
--        gen_random_uuid()::text || '$' || md5(input_code || gen_random_uuid()::text)
--      The first UUID is stored as the "salt", but the digest was computed over
--      a DIFFERENT second UUID. verify_login_code can only recompute
--      md5(input_code || <stored salt>), which therefore never equals the
--      stored digest.
--
-- IMPACT: verify_login_code() returned false for every possible code, so
--      player_login_flow() always answered NOT_FOUND and player-login always
--      answered 401 "Invalid access code". No player could ever log in.
--
-- FIX: derive a single salt and use it for both the stored prefix and the
--      digest. The on-disk format (`<salt>$<md5>`) is unchanged, so
--      verify_login_code is untouched and any existing hash stays parseable
--      (codes are single-use and expire in 15 minutes, so nothing to migrate).
--
-- No security change: still an unsalted-per-row random salt, still MD5-based
-- as originally designed, still RLS-invisible. (A keyed KDF such as
-- crypt() with pgcrypto/bcrypt would be stronger, but that is a deliberate
-- design change and is out of scope for this bug fix.)
-- ============================================================================

CREATE OR REPLACE FUNCTION hash_login_code(input_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT s.salt || '$' || md5(input_code || s.salt)
  FROM (SELECT gen_random_uuid()::text AS salt) s;
$$;
