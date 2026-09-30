-- ============================================================================
-- NEXUS - Fix column aliases in nexus_redact_jsonb
--
-- 2026093010 wrote jsonb_object_agg(k, ...) / jsonb_each over an unaliased
-- relation. jsonb_each yields columns named "key" and "value", so "k" and
-- "val" were unresolvable and every call raised:
--     column "k" does not exist
-- which made get_player_node_detail fail outright for all three roles.
-- ============================================================================

CREATE OR REPLACE FUNCTION nexus_redact_jsonb(p_value JSONB, p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_out JSONB;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  CASE jsonb_typeof(p_value)
    WHEN 'string' THEN
      RETURN to_jsonb(nexus_redact_answer(p_value #>> '{}', p_answer));
    WHEN 'object' THEN
      SELECT COALESCE(jsonb_object_agg(e.key, nexus_redact_jsonb(e.value, p_answer)), '{}'::jsonb)
        INTO v_out
        FROM jsonb_each(p_value) AS e(key, value);
      RETURN v_out;
    WHEN 'array' THEN
      SELECT COALESCE(jsonb_agg(nexus_redact_jsonb(t.value, p_answer) ORDER BY t.ord), '[]'::jsonb)
        INTO v_out
        FROM jsonb_array_elements(p_value) WITH ORDINALITY AS t(value, ord);
      RETURN v_out;
    ELSE
      RETURN p_value;
  END CASE;
END;
$$;
