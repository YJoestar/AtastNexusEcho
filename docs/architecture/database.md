# NEXUS — Database Architecture

## Design Principles

1. **Minimal viable schema** — Start small, evolve safely
2. **RLS-first** — Every table has Row Level Security policies
3. **Explicit relationships** — Foreign keys with CASCADE where appropriate
4. **Audit trail** — Immutable logs for all mutations
5. **JSONB for flexibility** — Structured but extensible content

## Current Tables (Planned)

### `teams`
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code CHAR(6) NOT NULL UNIQUE,  -- e.g., "ALP123"
  status team_status NOT NULL DEFAULT 'REGISTERED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_node_id UUID REFERENCES puzzle_nodes(id),
  score INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT valid_code CHECK (code ~ '^[A-Z0-9]{6}$')
);

CREATE INDEX idx_teams_code ON teams(code);
CREATE INDEX idx_teams_status ON teams(status);
```

### `players`
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role player_role NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  device_info JSONB,
  UNIQUE (team_id, role)  -- One player per role per team
);

CREATE INDEX idx_players_team ON players(team_id);
```

### `puzzle_nodes`
```sql
CREATE TABLE puzzle_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type puzzle_type NOT NULL,
  difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  estimated_minutes INTEGER NOT NULL,
  position JSONB NOT NULL,  -- {x, y, layer}
  prerequisites JSONB NOT NULL DEFAULT '[]',
  branches JSONB NOT NULL DEFAULT '[]',
  content JSONB NOT NULL,  -- Full puzzle definition
  rewards JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_puzzle_nodes_code ON puzzle_nodes(code);
```

### `team_progress`
```sql
CREATE TABLE team_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  solved_nodes JSONB NOT NULL DEFAULT '{}',
  current_node_id UUID REFERENCES puzzle_nodes(id),
  available_node_ids UUID[] NOT NULL DEFAULT '{}',
  evidence_owned UUID[] NOT NULL DEFAULT '{}',
  inventory_owned JSONB NOT NULL DEFAULT '{}',
  fragments_owned UUID[] NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  hints_available INTEGER NOT NULL DEFAULT 3,
  time_elapsed_minutes INTEGER NOT NULL DEFAULT 0,
  time_remaining_minutes INTEGER NOT NULL DEFAULT 180,
  started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'
);
```

### `submissions`
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  role player_role NOT NULL,
  answer TEXT NOT NULL,
  result submission_result NOT NULL DEFAULT 'INCORRECT',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 1,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_submissions_team_node ON submissions(team_id, node_id);
CREATE INDEX idx_submissions_player ON submissions(player_id);
```

### `evidence`
```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type evidence_type NOT NULL,
  classification evidence_classification NOT NULL DEFAULT 'RESTRICTED',
  content JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);
```

### `inventory_items`
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type inventory_type NOT NULL,
  rarity inventory_rarity NOT NULL DEFAULT 'COMMON',
  properties JSONB NOT NULL DEFAULT '{}',
  uses JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}'
);
```

### `fragments`
```sql
CREATE TABLE fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  type fragment_type NOT NULL,
  puzzle_node_id UUID NOT NULL REFERENCES puzzle_nodes(id) ON DELETE CASCADE,
  role player_role NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (puzzle_node_id, role, position)
);

CREATE INDEX idx_fragments_node ON fragments(puzzle_node_id);
```

### `qr_nodes`
```sql
CREATE TABLE qr_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  type qr_node_type NOT NULL,
  puzzle_node_id UUID REFERENCES puzzle_nodes(id) ON DELETE SET NULL,
  position JSONB NOT NULL,  -- {x, y, floor?}
  metadata JSONB NOT NULL DEFAULT '{}'
);
```

### `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_roles JSONB NOT NULL,  -- Role[] or "ALL"
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'NORMAL',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB
);

CREATE INDEX idx_notifications_team_unread ON notifications(team_id, is_read);
```

### `game_events`
```sql
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type game_event_type NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  node_id UUID REFERENCES puzzle_nodes(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_game_events_team ON game_events(team_id);
CREATE INDEX idx_game_events_type ON game_events(type);
CREATE INDEX idx_game_events_timestamp ON game_events(timestamp DESC);
```

### `admin_actions`
```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  type admin_action_type NOT NULL,
  target_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  target_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  target_node_id UUID REFERENCES puzzle_nodes(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted_at TIMESTAMPTZ,
  reverted_by TEXT
);

CREATE INDEX idx_admin_actions_team ON admin_actions(target_team_id);
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
```

### `game_config`
```sql
CREATE TABLE game_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
```

## Enums

```sql
CREATE TYPE team_status AS ENUM (
  'REGISTERED', 'WAITING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'DISQUALIFIED'
);

CREATE TYPE player_role AS ENUM (
  'OBSERVER', 'ANALYST', 'OPERATOR'
);

CREATE TYPE puzzle_type AS ENUM (
  'OBSERVATION', 'DECODING', 'LOGIC', 'PATTERN', 'PHYSICAL', 'META', 'FINAL'
);

CREATE TYPE submission_result AS ENUM (
  'CORRECT', 'INCORRECT', 'PARTIAL', 'ALREADY_SOLVED',
  'PREREQUISITE_MISSING', 'RATE_LIMITED', 'INVALID_FORMAT',
  'GAME_NOT_ACTIVE', 'ROLE_MISMATCH'
);

CREATE TYPE evidence_type AS ENUM (
  'DOCUMENT', 'IMAGE', 'AUDIO', 'VIDEO', 'DATA', 'PHYSICAL', 'DIGITAL'
);

CREATE TYPE evidence_classification AS ENUM (
  'PUBLIC', 'RESTRICTED', 'CLASSIFIED', 'TOP_SECRET'
);

CREATE TYPE inventory_type AS ENUM (
  'TOOL', 'KEY', 'CODE', 'DEVICE', 'CONSUMABLE', 'ARTIFACT', 'FRAGMENT_CONTAINER'
);

CREATE TYPE inventory_rarity AS ENUM (
  'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'
);

CREATE TYPE fragment_type AS ENUM (
  'TEXT', 'CIPHER', 'COORDINATE', 'KEYWORD', 'SYMBOL', 'SEQUENCE'
);

CREATE TYPE qr_node_type AS ENUM (
  'START', 'PUZZLE', 'EVIDENCE', 'INVENTORY', 'NAVIGATION', 'CHECKPOINT', 'FINAL'
);

CREATE TYPE notification_type AS ENUM (
  'SYSTEM', 'PUZZLE_UNLOCKED', 'PUZZLE_SOLVED', 'EVIDENCE_FOUND',
  'ITEM_ACQUIRED', 'FRAGMENT_REVEALED', 'HINT_AVAILABLE',
  'TIME_WARNING', 'ROLE_ACTION_REQUIRED', 'ADMIN_MESSAGE',
  'GAME_PHASE_CHANGE', 'TEAM_STATUS_CHANGE'
);

CREATE TYPE notification_priority AS ENUM (
  'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
);

CREATE TYPE game_event_type AS ENUM (
  'TEAM_REGISTERED', 'TEAM_STARTED', 'TEAM_PAUSED', 'TEAM_RESUMED',
  'TEAM_COMPLETED', 'TEAM_DISQUALIFIED', 'NODE_UNLOCKED', 'NODE_STARTED',
  'NODE_SOLVED', 'NODE_FAILED', 'NODE_SKIPPED', 'SUBMISSION_MADE',
  'SUBMISSION_VALIDATED', 'EVIDENCE_DISCOVERED', 'EVIDENCE_SHARED',
  'ITEM_ACQUIRED', 'ITEM_USED', 'ITEM_TRANSFERRED', 'FRAGMENT_REVEALED',
  'HINT_REQUESTED', 'HINT_CONSUMED', 'QR_SCANNED', 'ROLE_ACTION_PERFORMED',
  'ADMIN_ACTION', 'GAME_PHASE_CHANGED', 'SYSTEM_ALERT'
);

CREATE TYPE admin_action_type AS ENUM (
  'TEAM_CREATE', 'TEAM_UPDATE', 'TEAM_DELETE', 'TEAM_START', 'TEAM_PAUSE',
  'TEAM_RESUME', 'TEAM_COMPLETE', 'TEAM_DISQUALIFY', 'ROLE_ASSIGN',
  'ROLE_REASSIGN', 'NODE_UNLOCK', 'NODE_LOCK', 'NODE_SKIP',
  'SUBMISSION_OVERRIDE', 'SCORE_ADJUST', 'TIME_ADJUST', 'HINT_GRANT',
  'EVIDENCE_GRANT', 'ITEM_GRANT', 'FRAGMENT_REVEAL', 'GAME_START',
  'GAME_PAUSE', 'GAME_RESUME', 'GAME_END', 'CONFIG_UPDATE', 'ANNOUNCEMENT_SEND'
);
```

## Row Level Security Policies

### Teams
```sql
-- Players can read their own team
CREATE POLICY "Players read own team" ON teams
  FOR SELECT USING (id IN (SELECT team_id FROM players WHERE id = auth.uid()));

-- Admins can read all (via service role)
```

### Players
```sql
-- Players can read teammates
CREATE POLICY "Players read teammates" ON players
  FOR SELECT USING (team_id IN (SELECT team_id FROM players WHERE id = auth.uid()));

-- Players can update their own connection status
CREATE POLICY "Players update self" ON players
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### Team Progress
```sql
-- Players read own team progress
CREATE POLICY "Players read own progress" ON team_progress
  FOR SELECT USING (team_id IN (SELECT team_id FROM players WHERE id = auth.uid()));
```

### Submissions
```sql
-- Players can insert submissions for their team
CREATE POLICY "Players submit for team" ON submissions
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM players WHERE id = auth.uid())
    AND player_id = auth.uid()
  );

-- Players read own team submissions
CREATE POLICY "Players read team submissions" ON submissions
  FOR SELECT USING (team_id IN (SELECT team_id FROM players WHERE id = auth.uid()));
```

### Evidence/Inventory/Fragments (Shared via Team Progress)
```sql
-- These are reference tables; ownership tracked in team_progress
-- Players read via team_progress.evidence_owned array
```

### Notifications
```sql
-- Players read notifications for their team+role
CREATE POLICY "Players read notifications" ON notifications
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM players WHERE id = auth.uid())
    AND (target_roles = 'ALL' OR (SELECT role FROM players WHERE id = auth.uid()) = ANY(target_roles))
  );
```

### Game Events & Admin Actions
```sql
-- Only admins (service role) can read/write
-- No policies for authenticated players
```

## Migration Strategy

### Phase 1: Core (Foundation)
1. `teams`, `players`, `puzzle_nodes`
2. Basic RLS policies
3. Seed initial puzzle nodes

### Phase 2: Game State
1. `team_progress`, `submissions`
2. Game config table
3. Realtime publication setup

### Phase 3: Content Systems
1. `evidence`, `inventory_items`, `fragments`
2. `qr_nodes`
3. `notifications`

### Phase 4: Observability
1. `game_events`, `admin_actions`
2. Audit triggers
3. Analytics views

## Realtime Publications

```sql
-- Team progress changes
CREATE PUBLICATION team_progress_changes FOR TABLE team_progress;

-- Notifications
CREATE PUBLICATION team_notifications FOR TABLE notifications;

-- Game events (admin only)
CREATE PUBLICATION game_events_pub FOR TABLE game_events;

-- Admin actions (admin only)
CREATE PUBLICATION admin_actions_pub FOR TABLE admin_actions;
```

## Edge Function Endpoints (Planned)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/submit-answer` | POST | Player | Validate puzzle submission |
| `/request-hint` | POST | Player | Grant hint with penalty |
| `/scan-qr` | POST | Player | Process QR code scan |
| `/use-item` | POST | Player | Use inventory item |
| `/start-game` | POST | Admin | Start team/game |
| `/pause-game` | POST | Admin | Pause team/game |
| `/adjust-score` | POST | Admin | Modify team score |
| `/unlock-node` | POST | Admin | Manual node unlock |
| `/grant-evidence` | POST | Admin | Grant evidence to team |
| `/grant-item` | POST | Admin | Grant item to team |
| `/reveal-fragment` | POST | Admin | Reveal fragment |
| `/send-announcement` | POST | Admin | Broadcast to teams |

## Seed Data Requirements

### Minimum for Testing
- 1 game config record
- 10-15 puzzle nodes (tutorial → final)
- 20 evidence entries
- 15 inventory items
- 30 fragments (distributed across roles/nodes)
- 20 QR nodes (campus map)

### Production (Event)
- 37 puzzle nodes (P01-P37 + metas + final)
- 100+ evidence entries
- 50+ inventory items
- 100+ fragments
- 50+ QR nodes (physical locations)
- 25 team codes pre-generated