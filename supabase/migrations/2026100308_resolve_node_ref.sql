-- Migration: 2026100308_resolve_node_ref
--
-- The app identifies a node by its CODE ("P01") everywhere a player can see it
-- (routes, the map, the offline answer queue, scan results), and sends that code
-- as `nodeId` to game-get-node, game-submit and game-use-hint. The RPCs behind
-- them take the node's UUID, so a code reaches PostgreSQL as
-- `invalid input syntax for type uuid: "P01"` and the request fails. This
-- resolver lets the edge functions accept either form: a UUID is returned as is
-- (when it names a node), a code is looked up. It reveals nothing sensitive: ids
-- are not secrets and every RPC still checks that the node is open to the team.

CREATE OR REPLACE FUNCTION resolve_node_ref(p_ref TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_ref TEXT := btrim(coalesce(p_ref, ''));
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR v_ref = '' OR length(v_ref) > 64 THEN
    RETURN NULL;
  END IF;

  IF v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT pn.id INTO v_id FROM puzzle_nodes pn WHERE pn.id = v_ref::uuid;
  ELSE
    SELECT pn.id INTO v_id FROM puzzle_nodes pn WHERE upper(pn.code) = upper(v_ref);
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION resolve_node_ref(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION resolve_node_ref(text) TO authenticated, service_role;
