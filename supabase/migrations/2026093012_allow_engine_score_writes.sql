-- ============================================================================
-- NEXUS - Let the game engine award points
--
-- prevent_direct_score_change() raises 'Score cannot be modified directly'
-- whenever auth.role() = 'authenticated' and teams.score changes. The guard
-- is right in spirit - a player must not be able to set their own score via
-- PostgREST - but it is too broad: auth.role() is derived from the JWT and is
-- still 'authenticated' inside a SECURITY DEFINER function, so the guard also
-- fired for submit_puzzle_answer(). The result was that no team could ever
-- score:
--     ERROR: Score cannot be modified directly
-- and because the whole function is one transaction, the submission, the
-- node_progress row, the unlock of the next node and the game_events log were
-- all rolled back with it. Solving a puzzle was impossible.
--
-- The guard is narrowed to what it was actually for: a direct client write.
-- Two things are now allowed through:
--   * an admin, as before;
--   * a call arriving through a SECURITY DEFINER function owned by the
--     postgres role, which is how the game engine writes. A player cannot
--     reach such a function except through its own validated entry points.
--
-- Direct PostgREST PATCH from an authenticated player is still blocked: that
-- path does not run inside a definer function, and the teams RLS policy
-- "Admins can update all teams" additionally requires an admin_users row.
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_direct_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;  -- service_role / anon / SQL maintenance
  END IF;

  IF OLD.score IS NOT DISTINCT FROM NEW.score THEN
    RETURN NEW;  -- no score change in this statement
  END IF;

  -- Admins may adjust score through the bureau tooling.
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
  ) THEN
    RETURN NEW;
  END IF;

  -- Game engine writes arrive through a SECURITY DEFINER function owned by a
  -- superuser, so current_user is the owner rather than "authenticated".
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Score cannot be modified directly';
END;
$$;
