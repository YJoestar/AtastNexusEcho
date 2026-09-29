# NEXUS

**Cooperative Puzzle Hunt Platform** for the ATAST event at ISIMM Monastir — 30/09/2026

## Overview

NEXUS is a production-grade, campus-wide, 3-player cooperative puzzle-hunt application. Each team consists of exactly three players with distinct roles:

- **OBSERVER** — Gathers visual intelligence, scans environments, identifies patterns
- **ANALYST** — Processes data, decodes signals, connects fragments
- **OPERATOR** — Executes actions, manipulates systems, bridges physical and digital

Players communicate verbally in real life. The application does **not** provide team chat or automatic information transfer between players.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| Validation | Zod |
| Testing | Vitest, React Testing Library |
| Deployment | Vercel / Cloudflare Pages |

## Project Structure

```
src/
├── app/
│   ├── router/         # React Router configuration
│   ├── providers/      # React Context providers
│   └── config/         # Application constants
├── components/
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
├── features/
│   ├── auth/           # Authentication (planned)
│   ├── player/         # Player experience screens
│   ├── admin/          # Bureau/admin screens
│   ├── game/           # Game logic (planned)
│   ├── puzzle/         # Puzzle engine (planned)
│   ├── inventory/      # Inventory system (planned)
│   ├── evidence/       # Evidence system (planned)
│   ├── qr/             # QR scanning (planned)
│   ├── leaderboard/    # Leaderboard (planned)
│   └── notifications/  # Notifications (planned)
├── lib/
│   ├── supabase/       # Supabase client & types
│   ├── validation/     # Zod schemas
│   ├── time/           # Time utilities
│   └── utils/          # General utilities
├── types/
│   └── domain.ts       # Core domain types
├── content/            # Puzzle content (future)
├── styles/             # Global styles & design system
├── tests/              # Test files
└── main.tsx            # Application entry point

supabase/
├── migrations/         # Database migrations
├── functions/          # Edge functions
└── seed/               # Seed data

docs/
├── architecture/       # Architecture documentation
├── development/        # Development guides
└── operations/         # Operations runbooks
```

## Routes

### Player Experience
- `/player/login` — Team code entry & role selection
- `/player/waiting` — Waiting for game start
- `/player/game` — Game hub dashboard
- `/player/game/node/:nodeId` — Individual puzzle screen
- `/player/game/evidence` — Evidence collection
- `/player/game/inventory` — Inventory management
- `/player/game/navigation` — Campus map & navigation
- `/player/game/qr` — QR code scanner
- `/player/game/leaderboard` — Live rankings
- `/player/game/final` — Final boss/meta puzzle
- `/player/game/complete` — Completion screen

### Bureau/Admin Experience
- `/admin/login` — Bureau authentication
- `/admin/dashboard` — Overview & quick actions
- `/admin/teams` — Team management
- `/admin/teams/:teamId` — Team detail view
- `/admin/leaderboard` — Detailed leaderboard
- `/admin/game-control` — Game state & configuration
- `/admin/audit` — Administrative action log

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:watch   # Run tests in watch mode
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_APP_NAME` | Application name | No (default: NEXUS) |
| `VITE_APP_VERSION` | Application version | No |
| `VITE_APP_ENV` | Environment (development/production) | No |
| `VITE_ENABLE_DEV_TOOLS` | Enable development tools | No |
| `VITE_ENABLE_MOCK_DATA` | Use mock data instead of API | No |

## Current Implementation Status

### ✅ Completed (Foundation)
- Project scaffolding with Vite + React + TypeScript
- Tailwind CSS v4 design system (clinical investigation aesthetic)
- Type-safe domain model (`src/types/domain.ts`)
- Zod validation schemas for all entities
- React Router with player/admin route separation
- Layout components (mobile-first player, desktop-first admin)
- Placeholder screens for all player and admin routes
- Supabase client configuration (browser & server)
- Database type definitions
- Core utility libraries (time, validation, utils)
- Test infrastructure (Vitest + React Testing Library)
- Unit tests for utilities, time, and validation

### 🚧 In Progress / Planned
- [ ] Supabase database schema & migrations
- [ ] Authentication (Supabase Auth + RLS policies)
- [ ] Team registration & role assignment
- [ ] Real-time game state synchronization
- [ ] Puzzle engine (data-driven)
- [ ] Submission validation (server-side)
- [ ] Evidence/inventory/fragment systems
- [ ] QR code generation & scanning
- [ ] Leaderboard with live updates
- [ ] Admin real-time controls
- [ ] Notification system
- [ ] Final boss / meta puzzle logic
- [ ] Story/cinematic system
- [ ] Security hardening & QA
- [ ] Deployment configuration

## Security Principles

- **Browser is untrusted** — No puzzle answers or admin data sent to clients
- **Server-side validation** — All submissions validated via Supabase Edge Functions
- **Authoritative state** — Team progression, timing, scoring controlled by server
- **Role isolation** — Players only see content for their role
- **No cross-team data** — RLS policies enforce team boundaries
- **Audit logging** — All admin actions recorded

## Design System

**Direction:** Clinical investigation archive + experimental research system + classified institutional interface

- **Colors:** Dark base (`#0a0a0f`), teal accent (`#00d4aa`), semantic colors for status
- **Typography:** Inter (UI), Space Grotesk (display), JetBrains Mono (data)
- **Mobile-first:** Touch targets ≥44px (preferred 48-56px), no horizontal scroll
- **Responsive:** 360×800 to 412×915 phone viewports
- **Accessibility:** Focus visible, reduced motion, semantic HTML

## Deployment

### Vercel
1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy — automatic on push to main

### Cloudflare Pages
1. Connect GitHub repository to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables

## Event Information

- **Date:** 30/09/2026
- **Location:** ISIMM Monastir
- **Teams:** ~25 teams × 3 players = ~75 players
- **Duration:** ~3 hours per team
- **Format:** Rolling starts, 10-minute intervals
- **Operators:** 2 Bureau/admin operators

## Contributing

This is an event-specific application. The codebase is not open for external contributions during the event preparation phase.

## License

Internal use only — ATAST Event 2026