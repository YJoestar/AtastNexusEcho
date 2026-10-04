-- ============================================================================
-- NEXUS — make the admin RLS policies actually evaluate
--
-- Nine policies across teams, players, puzzle_nodes and team_progress were
-- written as:
--
--     USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()))
--
-- That subquery is part of the policy expression, so PostgreSQL evaluates it as
-- the *invoking* role, and the referenced table's own row-level security
-- applies to it. admin_users carries a deny-all policy
-- ("No public access to admin_users" FOR ALL USING (FALSE)), so for any role
-- without BYPASSRLS the inner SELECT can never return a row.
--
-- The result: all nine policies were permanently FALSE. They read as though the
-- Bureau could reach teams and players with its own session, and were relied on
-- as the second line of defence behind the "Admins can update all teams" check
-- cited in 2026093012. They never fired.
--
-- Nothing was leaking, because the real gate is the privilege layer
-- (2026100306 revokes writes from anon/authenticated) plus service_role's
-- BYPASSRLS, and every bureau_* RPC is SECURITY DEFINER. But the policies were
-- dead code that would fail closed — silently — the moment anyone granted an
-- admin session table access, and a reviewer reading 20260929 would reasonably
-- conclude the opposite of what the database does.
--
-- The fix is to call is_current_user_admin(), which is SECURITY DEFINER and
-- therefore does bypass admin_users' RLS. This is the same helper
-- protect_sensitive_columns() already uses correctly.
--
-- The same dead-exemption bug is fixed in prevent_direct_score_change() below,
-- which is NOT SECURITY DEFINER and therefore had the identical problem.
--
-- No access is widened beyond what was already documented as intended: the
-- privilege layer still governs what an admin session can actually do, and
-- admins continue to operate through the service-role path in
-- bureau-operations regardless.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. teams
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all teams" ON teams;
CREATE POLICY "Admins can read all teams" ON teams
  FOR SELECT USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can insert teams" ON teams;
CREATE POLICY "Admins can insert teams" ON teams
  FOR INSERT WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update teams" ON teams;
CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE USING (public.is_current_user_admin());

-- ----------------------------------------------------------------------------
-- 2. players
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all players" ON players;
CREATE POLICY "Admins can read all players" ON players
  FOR SELECT USING (public.is_current_user_admin());

-- ----------------------------------------------------------------------------
-- 3. puzzle_nodes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert puzzle_nodes" ON puzzle_nodes;
CREATE POLICY "Admins can insert puzzle_nodes" ON puzzle_nodes
  FOR INSERT WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update puzzle_nodes" ON puzzle_nodes;
CREATE POLICY "Admins can update puzzle_nodes" ON puzzle_nodes
  FOR UPDATE USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete puzzle_nodes" ON puzzle_nodes;
CREATE POLICY "Admins can delete puzzle_nodes" ON puzzle_nodes
  FOR DELETE USING (public.is_current_user_admin());

-- ----------------------------------------------------------------------------
-- 4. team_progress
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all progress" ON team_progress;
CREATE POLICY "Admins can read all progress" ON team_progress
  FOR SELECT USING (public.is_current_user_admin());

-- ============================================================================
-- 5. Restate the two admin helpers with their search_path written down.
--
-- 2026100309 pinned search_path on these by walking pg_proc in a DO loop, so
-- they are already covered at runtime and this is not a repair. It is restated
-- explicitly because from here on every policy depends on these two functions,
-- and a security-critical helper should not rely on a loop elsewhere in the
-- history to have reached it. CREATE OR REPLACE keeps the existing ownership
-- and grants.
-- ============================================================================
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
$$;

-- ============================================================================
-- 6. prevent_direct_score_change() — the admin exemption never worked.
--
-- The trigger function is not SECURITY DEFINER, so it runs as the invoking role
-- and its inline subquery hit admin_users' deny-all policy, making the branch
-- permanently unreachable. An admin adjusting a score through their own session
-- was refused with 'Score cannot be modified directly' despite the comment above
-- it promising "an admin, as before".
--
-- bureau-operations writes scores with the service-role client, so
-- auth.role() = 'service_role' short-circuits before this point and live play
-- is unaffected. The branch is fixed so it means what it says.
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
  -- is_current_user_admin() is SECURITY DEFINER, so unlike the inline subquery
  -- this actually sees the admin_users row.
  IF public.is_current_user_admin() THEN
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

-- ============================================================================
-- 7. Guard against the defect returning.
--
-- A policy expression must never name admin_users directly: that is the exact
-- shape that cannot evaluate. This fails the migration rather than shipping a
-- silently dead policy, and gives a future migration a clear message instead
-- of a policy that looks right and never fires.
-- ============================================================================
DO $$
DECLARE
  offender TEXT;
BEGIN
  SELECT string_agg(pol.polname, ', ' ORDER BY pol.polname)
    INTO offender
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
    AND pol.qual IS NOT NULL
    AND pol.polname LIKE 'Admins can%'
    AND pol.qual ~* 'admin_users';

  IF offender IS NOT NULL THEN
    RAISE EXCEPTION
      'Admin policies still evaluate admin_users inline and are permanently false: %',
      offender;
  END IF;
END;
$$;