-- ============================================================================
-- NEXUS — Fix infinite RLS recursion on the players table
--
-- BUG: two policies defined ON `players` referenced `players` again in their
--      expressions:
--        "Players can read teammates"
--          USING (team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1))
--        "Players cannot modify role, team_id, or login_code_hash"
--          WITH CHECK (... AND team_id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1))
--      A policy on a table may not query that same table, because evaluating
--      the policy re-enters RLS for the inner query. PostgreSQL aborts with
--      SQLSTATE 42P17 "infinite recursion detected in policy for relation
--      \"players\"".
--
-- IMPACT: every player-context read and every player self-update against the
--      players table failed with a 500, so players could not read their own
--      team roster and could not persist connection status.
--
-- FIX: call the existing SECURITY DEFINER helper get_current_team_id(),
--      which is byte-for-byte the same subquery but executes as its owner and
--      therefore does not re-enter the caller's RLS. get_current_team_id()
--      already exists in the schema specifically for this purpose.
--
-- SECURITY: semantics are unchanged. The subquery and the helper are the same
--      predicate on auth.uid(), and no policy is widened. Enforcement of the
--      sensitive-column rules remains in protect_sensitive_columns().
-- ============================================================================

DROP POLICY IF EXISTS "Players can read teammates" ON players;

CREATE POLICY "Players can read teammates" ON players
  FOR SELECT USING (
    team_id = get_current_team_id()
  );

DROP POLICY IF EXISTS "Players cannot modify role, team_id, or login_code_hash" ON players;

CREATE POLICY "Players cannot modify role, team_id, or login_code_hash" ON players
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    AND team_id = get_current_team_id()
  );
