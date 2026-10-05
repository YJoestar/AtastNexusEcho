-- Let a player read their own team whatever its status.
--
-- The defect:
--
--   "Players can read own team" filtered on
--       status IN ('REGISTERED','FORMING','READY','WAITING','ACTIVE','PAUSED')
--   but team_status also contains COMPLETED, DISQUALIFIED, ABANDONED and RESET.
--   All four therefore made a team's own row unreadable by its own players.
--
--   `AppProvider` restores a session with
--       .from('players').select('*, teams(*)')
--   which PostgREST resolves as a to-one embed evaluated under that policy. For
--   an excluded status the embed comes back as NULL rather than as an error, so
--   the client cannot even tell that it was refused.
--
-- Why it matters most right now: migration 2026100501 completes a team
-- automatically the moment no reachable node remains. That made COMPLETED
-- reachable by ordinary play, and every finished run therefore ended with:
--
--   teams embed NULL -> `const t = playerData.teams; t.id` -> TypeError
--   -> swallowed -> player and team stay null -> isAuthenticated false
--   -> redirect to /player/login.
--
-- A team that finishes the case could never load the ending screen. Logging in
-- again worked (player_login_flow does not filter on status) and was undone by
-- the next refresh, so it was a loop rather than a one-time inconvenience. An
-- admin completing, disqualifying or resetting a team hit the same wall.
--
-- The fix removes the status filter and keeps the ownership scope. Nothing is
-- widened: the predicate was already restricted to the caller's own team via
-- `id = (SELECT team_id FROM players ...)`, so a player gains visibility of
-- exactly one row - their own - and of no other team's, at any status. They
-- need it: the score, the node register and the ending screen are all read
-- through it, and none of it is secret from the people who played it.
--
-- Migration history is immutable, so this repairs forward rather than editing
-- 20260929.

DROP POLICY IF EXISTS "Players can read own team" ON teams;

CREATE POLICY "Players can read own team" ON teams
  FOR SELECT USING (
    id = (SELECT team_id FROM players WHERE auth_user_id = auth.uid() LIMIT 1)
  );