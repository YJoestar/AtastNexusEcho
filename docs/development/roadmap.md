# NEXUS — Development Roadmap

## Phase 1: Foundation ✅
**Status:** Complete
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Tailwind CSS v4 design system
- [x] Type-safe domain model (`src/types/domain.ts`)
- [x] Zod validation schemas
- [x] React Router with player/admin separation
- [x] Layout components (mobile-first player, desktop-first admin)
- [x] Placeholder screens for all routes
- [x] Supabase client configuration
- [x] Database type definitions
- [x] Core utilities (time, validation, utils)
- [x] Test infrastructure (Vitest + RTL)
- [x] Unit tests for core utilities

## Phase 2: Authentication & Registration
**Target:** Week 1
- [ ] Supabase Auth integration (anonymous + email)
- [ ] Team registration flow (player-initiated)
- [ ] Admin team creation
- [ ] Role selection & assignment logic
- [ ] Team code generation (6-char alphanumeric)
- [ ] RLS policies for teams/players
- [ ] Session persistence (localStorage + Supabase)
- [ ] "Bureau assigns role" fallback
- [ ] Role lock after game start

## Phase 3: Team/Player Management
**Target:** Week 1-2
- [ ] Player connection tracking (heartbeat)
- [ ] Team status transitions (REGISTERED → WAITING → ACTIVE)
- [ ] Rolling start timer per team
- [ ] Admin team detail view with live data
- [ ] Player device info capture
- [ ] Team metadata (notes, registeredBy)
- [ ] Admin actions: pause, resume, disqualify
- [ ] Realtime sync for team status

## Phase 4: Game-State Engine
**Target:** Week 2
- [ ] Game config table & admin UI
- [ ] Global game state (NOT_STARTED/RUNNING/PAUSED/ENDED)
- [ ] Team progress initialization
- [ ] Prerequisite evaluation engine
- [ ] Available node computation (server-side)
- [ ] Time tracking (elapsed/remaining per team)
- [ ] Game phase transitions (REGISTRATION → BRIEFING → GAMEPLAY → FINAL → DEBRIEF)
- [ ] Realtime progress updates
- [ ] Admin game control panel

## Phase 5: Puzzle Engine
**Target:** Week 2-3
- [ ] Puzzle node CRUD (admin)
- [ ] Data-driven puzzle renderer
- [ ] Role-specific content delivery
- [ ] Asset management (images, audio, documents)
- [ ] Submission Edge Function (server validation)
- [ ] Rate limiting & attempt tracking
- [ ] Hint system with penalties
- [ ] Branching logic evaluation
- [ ] Solution data isolation (never to client)

## Phase 6: QR & Navigation
**Target:** Week 3
- [ ] QR code generation (admin)
- [ ] QR node management
- [ ] Camera-based scanner (html5-qrcode)
- [ ] Location verification (GPS + QR)
- [ ] Navigation map with nodes
- [ ] Floor/building level selector
- [ ] Offline QR scanning capability

## Phase 7: Evidence & Inventory
**Target:** Week 3-4
- [ ] Evidence viewer (documents, images, audio)
- [ ] Inventory management UI
- [ ] Item use/actions system
- [ ] Fragment collection & display
- [ ] Transfer between roles (physical only)
- [ ] Evidence sharing (manual, via showing phone)
- [ ] Classification-based access control

## Phase 8: Bureau/Admin
**Target:** Week 4
- [ ] Real-time team monitoring dashboard
- [ ] Live leaderboard with admin controls
- [ ] Game control (start/pause/resume/end)
- [ ] Manual interventions (unlock, skip, grant)
- [ ] Score/time adjustments with audit
- [ ] Announcement broadcast system
- [ ] Audit log with filtering/export
- [ ] Emergency controls (disqualify, force complete)

## Phase 9: Leaderboard & Scoring
**Target:** Week 4
- [ ] Scoring algorithm (base + bonuses - penalties)
- [ ] Real-time leaderboard (Realtime)
- [ ] Team rank computation
- [ ] Tie-breaking rules
- [ ] Player-facing leaderboard
- [ ] Admin detailed leaderboard
- [ ] Export functionality

## Phase 10: Story & Cinematics
**Target:** Week 4-5
- [ ] Story event system
- [ ] Narrative delivery (text, audio, video)
- [ ] Cinematic sequences (between phases)
- [ ] Branch-specific story content
- [ ] Final boss narrative integration
- [ ] Completion ceremony

## Phase 11: Final Boss
**Target:** Week 5
- [ ] Meta puzzle architecture
- [ ] Multi-role coordination requirement
- [ ] Fragment synthesis mechanic
- [ ] Progressive unlock stages
- [ ] Time-critical final sequence
- [ ] Victory condition validation

## Phase 12: Security & QA
**Target:** Week 5-6
- [ ] Penetration testing (client-side)
- [ ] RLS policy verification
- [ ] Edge Function security audit
- [ ] Rate limiting & DDoS protection
- [ ] Input sanitization review
- [ ] CORS/CSP configuration
- [ ] Load testing (25 teams × 3 players)
- [ ] Offline/resilience testing
- [ ] Accessibility audit (WCAG AA)

## Phase 13: Deployment
**Target:** Week 6
- [ ] Vercel production deployment
- [ ] Supabase production project setup
- [ ] Environment variable configuration
- [ ] Custom domain setup
- [ ] SSL/TLS verification
- [ ] Monitoring & alerting
- [ ] Runbook documentation
- [ ] Dry run with Bureau operators
- [ ] Event day checklist

## Milestones

| Milestone | Target Date | Criteria |
|-----------|-------------|----------|
| M1: Foundation Complete | Week 0 | ✅ All Phase 1 done |
| M2: Auth & Teams Live | Week 1 | Players can register, join, select roles |
| M3: Game Loop Works | Week 2 | Start → play → submit → progress → complete |
| M4: Content Systems Ready | Week 3 | Puzzles, QR, evidence, inventory functional |
| M5: Admin Control Ready | Week 4 | Bureau can run full event |
| M6: Polish & Polish | Week 5 | Story, final boss, UX refinements |
| M7: Event Ready | Week 6 | Security audit passed, deployed, tested |

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase Realtime limits | High | Test with 75 concurrent connections; fallback to polling |
| QR scanning on older phones | Medium | Provide manual code entry fallback |
| Network connectivity on campus | High | Optimistic UI, local caching, offline queue |
| Puzzle content changes late | Medium | Data-driven engine, hot-reload content |
| Admin UI complexity | Medium | Iterative design with Bureau operators |
| Time synchronization | High | Server-authoritative timing, NTP sync |

## Definition of Done (Per Feature)

- [ ] Type-safe implementation (no `any`)
- [ ] Zod validation on client & server
- [ ] RLS policies tested
- [ ] Unit tests for logic (≥80% coverage)
- [ ] Integration test for API
- [ ] Mobile responsive (360px-412px)
- [ ] Accessibility (keyboard, screen reader)
- [ ] Error boundaries & loading states
- [ ] Documentation updated