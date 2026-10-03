# NEXUS ECHO — Game Scope Audit

Written before any further player-mobile work, from the code as it stands
(`src/features/player`, `src/features/admin`, `src/lib`, `src/content`,
`scripts/evidence-gen`). Test applied to every feature:

> If this is removed, does NEXUS ECHO become materially worse? If no, remove it.

## 0. What the game actually is

**NEXUS ECHO is a team-based, on-site campus investigation.** Teams log in with
a code, are handed a role (Investigator / Observer / Analyst / Operator), walk
to physical locations, scan QR markers, solve one puzzle per node, collect
recovered objects and fragments, and finally enter a code to close the case.
An administrator runs the event: teams, locations and QR codes, game state,
evidence, and live monitoring.

| Question | Answer (from the code) |
|---|---|
| Who is the player? | A team member in the field on a phone, a field investigator. |
| What is the admin? | The event director at a desk: sets up, starts/pauses, watches, audits. |
| Core loop | Go to a place → scan marker → read node → solve → receive object/fragment → connect it to the case → unlock the next node → final code. |
| What the player does | Scan, read, answer, request hints (with penalty), collect, inspect evidence, relate evidence, read dispatches. |
| What the admin does | Provision teams, manage nodes/QR, control game state, monitor progress, review evidence and audit trail, QA puzzle content. |

The phone is a **field handset**; the admin is a **bureau workstation**. Both
metaphors are already in the project and are kept. Nothing else is invented.

## A. Core systems (the game does not exist without these)

1. Team login and role assignment (`Login`, `Waiting`).
2. QR marker scanning with manual-code fallback (`QR`).
3. Node view and puzzle submission, hints with penalty (`Node`).
4. Progress and unlock state (`Game` case hub, `Navigation` site map).
5. Recovered objects and fragments (`Inventory`).
6. Evidence archive and inspection (`Evidence`, `ArtifactInspection`).
7. Final protocol and completion (`Final`, `Complete`).
8. Admin: game control, teams, locations/QR, audit (workstation M-01…M-05, M-08).

## B. Supporting systems (the core loop leans on them)

- Dispatches / field communications (`Notifications`): the only channel by which the
  game and admin speak to a team. Real server rows only.
- Leaderboard (`Leaderboard`): real competitive ranking of teams. Real data.
- Offline queue and connection banner: field use has real network loss.
- Investigation board, compare station, clue discovery: how evidence becomes
  deduction. Persisted per team.
- Admin: evidence register (M-06), surveillance control (M-07), simulator (M-09),
  QA monitor (M-10), search palette and terminal over the same data.

## C. Optional (keep only while cheap and honest)

- Glitch / CRT / noise effects: kept strictly event-driven (state change,
  signal loss, new evidence, corruption) with reduced-motion and off modes.
- Admin boot sequence and terminal: kept because it is skippable and reads real
  state. If it ever lies about activity it goes.
- Narrative escalation level (`useNarrative`): derives from real progress; kept.

## D. Excluded — will not be added

Calculator, weather, camera roll, social feed, music player, fake contacts,
fake texting with NPCs, XP, levels, coins/currency, achievements, daily
rewards, fake battery drain, fake "live" player counts, fake typing indicators,
fake hacking minigames. None has a data source in the game, and none changes
the core loop. (`grep` confirms none exist today.)

## E. Remove / merge

| Item | Decision | Reason |
|---|---|---|
| Bottom-nav "Ranking" as a primary tab | KEEP, but demote below Evidence/Inventory/QR/Case in priority | Leaderboard is secondary to the loop; not removed because teams do compete. |
| Inventory vs Evidence as two tabs | MERGE in presentation only | Both are "things I have recovered". Routes and data stay; Inventory objects are placeable on the board already. Done as cross-links, not route changes. |
| Duplicated back/"RETURN TO FIELD" headers | Already unified | One pattern. |

## F. Improve (exists but weak)

- Photographs: flat shading, blotchy walls, unlit flat ceilings — the single
  biggest quality gap in the evidence the player actually studies. (Renderer
  work, below.)
- Player header/nav copy uses a mix of "Game", "Ranking", "QR"; the handset
  labels exist (`DEVICE_LABELS`) and should be the only source.
- Empty / locked / error states exist per screen; make sure each says what
  gameplay action resolves it.

## G. Add (only what a gap proves)

Nothing new as a feature. The three gaps are all presentation of existing data:

1. A **case hub** that answers "what do I do next?" from real state (current
   node, unread dispatches, unplaced evidence). `Game.tsx` already does this;
   audit it against 360×800 / 390×844 / 412×915 rather than rebuild it.
2. Evidence and Inventory reachable from each other.
3. Locked-state explanations that name the unlock condition.

## H. Reasoning

The game's value is the *physical* hunt plus the *deduction* it feeds. The
handset is a tool, not a world. Every feature must either move a team along the
hunt, or help them reason about what they found, or let the director run the
event. Anything that merely decorates the phone competes with the real
environment the team is standing in. Realism and usability outrank atmosphere.

---

## Player screens

| SCREEN | PURPOSE | GAMEPLAY ROLE | DATA USED | PLAYER ACTION | WHY IT EXISTS | VERDICT |
|---|---|---|---|---|---|---|
| Login | Team enters code | Gate | team code, device fingerprint | Enter code | Identifies the team | KEEP |
| Waiting | Pre-start lobby | Gate | team, gameState | Wait / see roster | Event has a start time | KEEP |
| Game (case hub) | Where am I, what next | Orientation | progress, current node, timer, unread | Open node / scan / evidence | Answers "what now?" | KEEP, audit for fit |
| Node | One location's puzzle | Core | node, role content, hints | Read, solve, hint | The puzzle itself | KEEP |
| QR scanner | Read a physical marker | Core | camera, marker code | Scan / type code | Bridges physical and digital | KEEP |
| Navigation (site map) | Where things are, what is charted | Supporting | map nodes, knowledge state | View | Real campus orientation | KEEP |
| Evidence archive | Browse artifacts | Core | `CaseArtifact` list | Open, filter, compare | Source material for deduction | KEEP |
| Artifact inspection | Study one artifact | Core | artifact image/content | Zoom, enhance, annotate | Find the clue | KEEP |
| Investigation board | Relate artifacts | Core (deduction) | workspace (localStorage) | Place, link, note | Turns clues into theory | KEEP |
| Compare station | Side-by-side / overlay / timeline | Supporting | two artifacts | Compare | Contradictions need it | KEEP |
| Inventory | Recovered objects, fragments | Core | items, fragments | View, place on board | Rewards from nodes | KEEP, cross-link with Evidence |
| Notifications | Dispatches | Supporting | server rows | Read | Only game↔team channel | KEEP |
| Leaderboard | Rankings | Supporting | teams, status | View | Competition | KEEP |
| Final | Final code | Core | requirements, code | Enter code | Closes the case | KEEP |
| Complete | After-action | Core | team result | Share | Closure | KEEP |

## Admin screens

| SCREEN | PURPOSE | GAMEPLAY ROLE | DATA USED | ADMIN ACTION | WHY IT EXISTS | VERDICT |
|---|---|---|---|---|---|---|
| Sign-in | Authenticate | Gate | Supabase auth | Sign in | Protects control | KEEP |
| Command center | Live overview | Monitor | dashboard summary | Watch | Run the event | KEEP |
| Field units / team detail | Teams, credentials | Setup | teams | Create/edit | Provision | KEEP |
| Locations | Nodes and QR | Setup | nodes, QR | Create/print | Physical deployment | KEEP |
| Operations control | Game state | Control | game state | Start/pause/end | Event control | KEEP |
| Operational record | Rankings, ledger | Monitor | leaderboard | View | Results | KEEP (merge with command in future if redundant) |
| Evidence register | Evidence inventory | Setup | artifacts | Inspect | Verify what players see | KEEP |
| Surveillance control | CCTV frames | Supporting | surveillance artifacts | Review | Shows real recovered frames | KEEP |
| System access record | Audit | Control | audit rows | Review | Accountability | KEEP |
| Field simulator | Run a handset | QA | isolated state | Emulate | Test without touching live teams | KEEP |
| QA monitor | Puzzle content | QA | puzzles | Inspect | Content correctness | KEEP |
| Terminal / search | Same data, keyboard | Optional | same queries | Query | Power-user shortcut | KEEP (cheap, honest) |

## Evidence types

| TYPE | PURPOSE IN THE GAME |
|---|---|
| PHOTOGRAPH | Scene evidence: spatial and source clues (location, vantage, objects). |
| SURVEILLANCE | Temporal clues: who was where, when; contradictions with statements. |
| DOCUMENT | Official record: names, times, references. |
| FRAGMENT | Partial recovered data; completes only with another artifact. |
| MAP | Spatial anchoring of photographs and times. |
| PERSONNEL | Identity and role; links people to records. |
| NOTE | Informal testimony; usually contradicts a formal record. |
| AUDIO | Timing and testimony; the one non-visual channel. |

All eight are used by the clue derivation (`src/lib/evidence/clues.ts`); none
is decoration.
