# NEXUS — Architecture Overview

## Frontend / Backend Separation

NEXUS follows a **client-server architecture** where the browser is treated as **untrusted**.

### Frontend (React + Vite)
- **Responsibility:** Presentation, user interaction, optimistic UI updates
- **Authority:** None — all authoritative state lives on the server
- **Communication:** Supabase client (REST + Realtime)
- **Validation:** Client-side only for UX (immediate feedback), never for security

### Backend (Supabase)
- **PostgreSQL:** Authoritative data store with Row Level Security
- **Auth:** Supabase Auth (email/magic link or anonymous)
- **Realtime:** Live updates for game state, notifications, leaderboard
- **Edge Functions:** Server-side validation, game logic, admin actions
- **Storage:** Assets (images, documents, audio) for puzzles

## Player / Admin Separation

Two completely separate route trees with different layouts and permissions:

### Player Routes (`/player/*`)
- **Layout:** Mobile-first, bottom navigation, minimal chrome
- **Auth:** Team code + role selection (no passwords)
- **Data Access:** Only own team's data via RLS
- **Real-time:** Subscribed to own team's progress channel

### Admin Routes (`/admin/*`)
- **Layout:** Desktop-first, sidebar navigation, dense information
- **Auth:** Bureau credentials (separate auth flow)
- **Data Access:** All teams, full game state, audit log
- **Real-time:** Subscribed to global game events channel

## State Authority

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVER (Supabase)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Teams      │  │  Puzzles    │  │  Game Config        │  │
│  │  Players    │  │  Nodes      │  │  Timing             │  │
│  │  Progress   │  │  Content    │  │  Scoring Rules      │  │
│  │  Submissions│  │  Solutions  │  │  Admin Actions      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐    ┌───────────────┐
            │  PLAYER       │    │  ADMIN        │
            │  (React)      │    │  (React)      │
            │  - Optimistic │    │  - Full view  │
            │  - Read-only  │    │  - Write auth │
            └───────────────┘    └───────────────┘
```

**Key Principle:** The server is the **single source of truth** for:
- Team registration & status
- Puzzle solutions (never sent to client)
- Game timing (start, end, pause)
- Score calculation
- Role assignments
- Evidence/item/fragment ownership

## Future Puzzle Engine

Puzzles are **data-driven**, not hardcoded components.

### Puzzle Definition Structure
```typescript
interface PuzzleNode {
  id: string
  code: string
  type: PuzzleType
  content: {
    observer?: RoleContent      // OBSERVER-only briefing
    analyst?: RoleContent       // ANALYST-only briefing
    operator?: RoleContent      // OPERATOR-only briefing
    shared?: SharedContent      // Visible to all
    solution?: SolutionData     // BUREAU ONLY - never sent to players
  }
  prerequisites: Prerequisite[]
  branches: BranchCondition[]
  rewards: PuzzleRewards
}
```

### Runtime Flow
1. **Server** evaluates prerequisites → determines available nodes per team
2. **Client** receives available nodes + role-specific content (no solutions)
3. **Player** submits answer via Edge Function
4. **Server** validates against solution → returns result + rewards
5. **Server** updates team progress, triggers notifications, emits events
6. **Clients** receive real-time updates → UI refreshes

### Supported Mechanics
- Role-specific content delivery
- Prerequisites (nodes, evidence, fragments, time, admin unlock)
- Branching narratives based on conditions
- Evidence/item/fragment rewards
- Story events (narrative, alerts, system, branch)
- Hints with time penalties
- Location/QR verification
- Meta puzzles combining multiple fragments

## Security Philosophy

### Defense in Depth

| Layer | Mechanism |
|-------|-----------|
| **Network** | HTTPS only, CSP headers, CORS restricted |
| **Auth** | Supabase Auth + custom claims for roles |
| **Database** | Row Level Security on all tables |
| **API** | Edge Functions for all mutations |
| **Validation** | Zod schemas on client AND server |
| **Secrets** | Service role key only in Edge Functions |
| **Audit** | Immutable log of all admin actions |

### What NEVER Goes to Client
- Puzzle solutions (`PuzzleNode.content.solution`)
- Admin-only configuration
- Other teams' progress/data
- Scoring algorithms
- Game control endpoints

### What Client Receives
- Own team's progress (via RLS)
- Role-specific puzzle content (no solutions)
- Available node IDs (not locked ones)
- Own evidence/inventory/fragments
- Public leaderboard (anonymized if needed)
- Notifications addressed to own team/role

## Data Flow Example: Puzzle Submission

```
Player (OBSERVER)                    Supabase Edge Function              Database
     │                                      │                              │
     ├─ submitAnswer(nodeId, answer) ─────►│                              │
     │                                      ├─ Validate team exists ──────►│
     │                                      ├─ Check node available ──────►│
     │                                      ├─ Verify role matches ───────►│
     │                                      ├─ Check rate limit ──────────►│
     │                                      ├─ Load solution (server only) │
     │                                      ├─ Validate answer ───────────►│
     │                                      ├─ Create submission record ──►│
     │                                      ├─ If CORRECT:                │
     │                                      │   ├─ Update team progress ──►│
     │                                      │   ├─ Grant rewards ─────────►│
     │                                      │   ├─ Check unlocks ─────────►│
     │                                      │   └─ Emit game events ─────►│
     │◄────────── SubmissionResult ────────┤                              │
     │                                      │                              │
     │         (Realtime) ◄─────────────────┤  (PG_NOTIFY / Realtime)    │
     │                                      │                              │
```

## Realtime Channels

| Channel | Subscribers | Events |
|---------|-------------|--------|
| `team_progress:{teamId}` | Team players | Progress updates, new evidence, items |
| `notifications:{teamId}` | Team players | New notifications |
| `game_events` | Admin only | All game events (audit) |
| `leaderboard` | All players + admin | Rank changes |

## Deployment Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GitHub     │────►│   Vercel     │────►│   Supabase   │
│   (Source)   │     │   (Edge)     │     │   (Backend)  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     ▼             ▼
              ┌────────────┐ ┌────────────┐
              │  Player    │ │   Admin    │
              │  (PWA)     │ │  (Desktop) │
              └────────────┘ └────────────┘
```

- **Static assets** served from Vercel Edge Network
- **API calls** go directly to Supabase (no intermediate backend)
- **Edge Functions** run in Supabase's infrastructure (Deno)
- **Database** in Supabase managed PostgreSQL