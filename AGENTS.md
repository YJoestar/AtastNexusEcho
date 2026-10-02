# AGENTS.md

## Commands

- **Typecheck**: `npx tsc --noEmit`
- **Tests**: `npx vitest run` (478 tests, 27 test files)
- **Lint**: `npm run lint`
- **Dev**: `npm run dev`

## Project Structure

- **Player** (handset): `src/features/player/` — mobile-first field device screens
- **Admin** (desktop): `src/features/admin/` — bureau workstation screens
- **Bureau primitives**: `src/components/bureau/` — `TerminalFrame`, `EvidenceBoard`, `DocumentShell`, `RegisterList`, etc.
- **Player primitives**: `src/components/player/` — `BottomNav`, `PlayerHeader`, `OfflineBanner`, `map/`

## Visual Language

- Player = handset (bordered, bezel, safe-area)
- Admin = terminal (boot sequence, register, monitor)
- Shared DNA via `--nx-*` CSS custom properties in `src/styles/globals.css`
