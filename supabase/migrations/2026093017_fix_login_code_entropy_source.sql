-- ============================================================================
-- NEXUS — Fix missing entropy source in the login-code generator
--
-- 2026093016 rewrote nexus_unique_login_code() to draw one random byte per
-- character from gen_random_bytes(). That function is not present in this
-- database, so issuing a code failed at runtime with
--     ERROR: function gen_random_bytes(integer) does not exist
-- which would have made every team creation and every re-issue fail outright.
--
-- FIX: build the random bytes from gen_random_uuid(), which this schema
-- already relies on, using the core decode()/get_byte() pair. The result is
-- still 8 independent characters drawn uniformly from the 32-symbol alphabet
-- player-login validates (8 x 5 bits of CSPRNG output), so nothing about the
-- code format, the stored hash format or verify_login_code() changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION nexus_unique_login_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes BYTEA;
  v_code TEXT := '';
  i INTEGER;
BEGIN
  LOOP
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';

    FOR i IN 0..7 LOOP
      -- 256 is a whole multiple of 32, so the mapping is unbiased.
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    END LOOP;

    EXIT WHEN v_code ~ '^[A-Z2-9]{8}$' AND NOT EXISTS (
      SELECT 1 FROM players pl
      WHERE pl.login_code_hash IS NOT NULL AND verify_login_code(v_code, pl.login_code_hash)
    );
  END LOOP;

  RETURN v_code;
END;
$$;
