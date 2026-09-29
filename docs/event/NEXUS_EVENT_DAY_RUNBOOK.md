# NEXUS — Event Day Operations Runbook

## Overview
This runbook guides the Bureau Operator through event-day setup, execution, and monitoring for a NEXUS game session.

---

## Pre-Event (30 minutes before start)

### 1. Check System Status
- **Admin Panel**: Log in and verify "Game State" shows `NOT_STARTED` with zero active teams.
- **Database**: Run `SELECT status, COUNT(*) FROM teams GROUP BY status;` — should show all teams in `REGISTERED`/`FORMING`/`READY`.
- **Edge Functions**: Visit Supabase Dashboard → Functions → verify all 14 functions are **"Active"** (green).

### 2. Team Rosters
For each team (typically 8–10 minutes before start):
1. Navigate to **Teams** in the admin panel.
2. Click **Generate Codes** — verify all 3 players on each team receive a login code.
3. Confirm team status transitions: `READY` → `WAITING`.
4. If a team is stuck, check the audit log for errors.

### 3. Player Login Verification
- Contact each team’s players to confirm they can log in with their codes.
- In the admin panel, verify each player shows **"Online"** and **device-bound**.
- If a player can't log in, check:
  - Login code is correct (8 chars, uppercase, no I/O/0/1).
  - Player hasn't exceeded 10 login attempts per minute (rate limit).
  - Device fingerprint mismatch — reset via `reset-team` if needed.

### 4. Final Pre-Start Check
1. Click **Start All Teams** (or start individually via team list).
2. Verify each team transitions to `ACTIVE` status.
3. Verify `game_started_at` and `game_deadline` are populated (180-minute timer).
4. Confirm game state shows `RUNNING`.

---

## During the Event (Live Monitoring)

### 1. Monitoring Dashboard
Key metrics to watch:
| Metric | Normal | Action |
|--------|--------|--------|
| Active Teams | All started teams | If less than expected, check login failures |
| Avg. Time Remaining | >30 min | If <10 min, consider time extension |
| Submissions/min | 1–5 per team | If 0 for 20+ min, check for player confusion |
| Hints Used | <3 per team | If >3, investigate difficulty balance |
| Error Rate | <5% | If >10%, check function logs |

### 2. Common Player Issues

#### "I can't scan a QR code"
- Have the player restart the app.
- Check that camera permissions are granted.
- Manual workaround: enter the node code manually (if the node supports code entry).

#### "My puzzle answer was rejected"
- Check the audit log for `SUBMISSION_MADE` events — verify the answer format.
- Answers are case-insensitive and whitespace-normalized.
- If a legitimate answer was rejected, use `manual_unlock` as a workaround.

#### "I'm stuck on a puzzle"
- Use the **"Grant Hint"** action from the team detail page.
- Select hint #1 (120s penalty) or #2 (300s penalty) or #3 (600s penalty).
- Note: emergency hints from the Bureau don't count against the player's hint budget but add the same time penalty.

#### "My timer is wrong / game is paused"
- Verify team status is `ACTIVE` (not `PAUSED`).
- Use **"Resume Team"** if paused unexpectedly.
- Timer is based on `game_deadline` — if a team lost time due to a technical issue, use **"Adjust Time"** (admin contact if not in UI).

### 3. Team Interventions

| Action | When to Use | How |
|--------|-------------|-----|
| **Pause Team** | Player has technical issue, needs break | Team Detail → Pause Team → select "Technical Issue" |
| **Resume Team** | Technical issue resolved, ready to continue | Team Detail → Resume Team |
| **Manual Unlock** | Puzzle is bugged/unsolvable, team is stuck | Team Detail → Manual Unlock → select node |
| **Reset Team** | Team needs to start over (device binding issue, etc.) | Team Detail → Reset Team → enter reason |
| **Disqualify Team** | Code of conduct violation | Team Detail → Disqualify Team → enter reason |
| **Send Notification** | Broadcast announcement to all or specific teams | Admin Panel → Notifications → compose |

### 4. Emergency Procedures

#### Database Unresponsive
1. Check Supabase Status Page: https://status.supabase.com
2. If Supabase is down, announce via in-person channel: "Technical pause — stand by."
3. Do NOT use `reset-team` or other destructive operations while DB is down.
4. Resume operations once DB is back (monitor status page).

#### Time Extension (All Teams)
If the event is delayed or running behind:
1. Contact Supabase admin.
2. Run SQL to extend all deadlines:
```sql
UPDATE teams
SET game_deadline = game_deadline + INTERVAL '30 minutes'
WHERE status = 'ACTIVE';
```
3. Announce to all teams: "Game extended by 30 minutes."

#### Time Extension (Single Team)
1. Navigate to Team Detail.
2. Use **"Adjust Time"** action (if available) or run:
```sql
UPDATE teams
SET game_deadline = game_deadline + INTERVAL '15 minutes'
WHERE id = 'team-uuid';
```

---

## Post-Event (After All Teams Finish)

### 1. Game Conclusion
- Verify all teams show `COMPLETED`, `DISQUALIFIED`, or `RESET` status.
- Game state should transition to `ENDED`.
- Run final leaderboard check.

### 2. Audit & Reporting
1. Export audit log: Admin Panel → Audit Log → Export CSV.
2. Export game events: Admin Panel → Game Events → Export CSV.
3. Export leaderboard: Admin Panel → Leaderboard → Export CSV.
4. Review submissions for any edge cases or disputes.

### 3. Post-Mortem Data Check
```sql
-- Verify no active sessions remain
SELECT COUNT(*) FROM auth.sessions WHERE user_id IN (
  SELECT auth_user_id FROM players WHERE status = 'ACTIVE'
);

-- Verify all teams have completed_at or were disqualified
SELECT id, name, status FROM teams WHERE status IN ('ACTIVE', 'PAUSED', 'WAITING');
```

### 4. Cleanup (Next Day)
- Reset all teams to `REGISTERED` status for next event:
```sql
UPDATE teams SET status = 'REGISTERED', started_at = NULL, completed_at = NULL, score = 0, current_node_id = NULL, game_started_at = NULL, game_deadline = NULL, updated_at = NOW();
DELETE FROM node_progress;
DELETE FROM submissions;
DELETE FROM hints_used;
DELETE FROM team_progress;
DELETE FROM notifications;
DELETE FROM game_events;
DELETE FROM audit_log;
```

---

## Contact Information

| Role | Contact |
|------|---------|
| Supabase Admin | (internal) |
| Game Master | (internal) |
| Technical Support | (internal) |

## Quick Reference: Status Flow

```
REGISTERED → FORMING → READY → WAITING → ACTIVE ↔ PAUSED → COMPLETED
                                                               ↓
                                                        DISQUALIFIED
                                                               ↓
                                                           ABANDONED
```

## Quick Reference: Edge Functions

| Function | Purpose |
|----------|---------|
| `player-login` | Validates access code, device binding, creates auth session |
| `game-submit` | Submits puzzle answer for a node |
| `game-get-node` | Fetches node detail (role-specific content, no answers) |
| `game-scan-qr` | Handles QR code scanning for node discovery |
| `game-get-state` | Fetches team game state + unread notification count |
| `game-use-hint` | Requests a hint for a puzzle node (with rate limiting) |
| `game-notifications` | Fetches team notifications |
| `game-node-progress` | Fetches team's progress on all nodes |
| `game-inventory` | Fetches team's inventory items |
| `game-leaderboard` | Fetches public leaderboard (ranked by score) |
| `game-mark-read` | Marks all notifications as read |
| `bureau-operations` | Admin team/player lifecycle management |
| `game-bureau-ops` | Admin node-level interventions (unlock, reset, hints) |
| `admin-check` | Verifies admin auth status |
