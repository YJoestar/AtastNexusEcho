# NEXUS ECHO — Architecture notes (design / VFX / board pass)

## Investigation board (`src/features/player/evidence/`)

- `InvestigationTable.tsx` — camera, gestures, mutations. Same props as before
  (`artifacts`, `workspace`, `onUpdate`, `onInspect`), so `EvidenceArchive` is unchanged.
- `board/BoardCard.tsx` — memoised card. `data-medium` / `data-condition` drive the look in `globals.css` (`.nx-card`).
- `board/BoardLinks.tsx`, `board/linkStyle.ts` — SVG strings and the status vocabulary.
- `board/BoardInspector.tsx` — link creation, link editing, notes (add / edit / delete).
- `src/lib/boardGeometry.ts` — pure camera maths (zoom-about-cursor, clamp, fit, focus, pinch, grid and free-slot placement). Unit-tested.
- `src/lib/investigationWorkspace.ts` — persisted model + pure operations (`addLinks`, `updateLink`, `removeLink`, `addAnnotation` / `editAnnotation` / `deleteAnnotation`, `pruneWorkspace`).

### Interaction contract

| Input | Result |
|---|---|
| Drag background / one finger | pan |
| Wheel, ctrl-wheel, +/− , pinch | zoom about the pointer / midpoint |
| Trackpad two-finger scroll, arrow keys | pan |
| Drag a card or its title | move (pinned cards do not move) |
| Tap / click a card title or body | toggle selection (numbered; object 1 is the link origin) |
| Select ≥ 2 | link panel: type + hypothesis → `[ FILE UNVERIFIED LINK ]` |
| Tap a string | inspect: type, status, basis, notes, disconnect (confirm + undo) |
| `Esc`, `0`, `Delete` | clear selection, fit, remove selected link |

Pointers are registered in the **capture** phase so a second finger always becomes a pinch, even over a card button.

### Persistence

Still `localStorage`, per team (`nexus_case_workspace_v1:<teamId>`), schema version unchanged and **backward compatible**: old hypotheses load with `kind: HYPOTHESIS`, `status: UNCONFIRMED`. New fields: `view` (saved camera), link `kind` / `status` / `updatedAt`. Link notes live in `annotations['link:<id>']` and are removed with the link.

Deliberately **device-local**: the server stays authoritative for the game; the board is private reasoning. Consequence: a player's board does not follow them to another phone. Moving it server-side needs a new table and RLS policy and was not attempted.

Removing an object from the table never deletes its links: they go *dormant* and return with the object. `pruneWorkspace` removes references to objects no longer in the case, but only behind an explicit **PURGE** button — evidence arrives progressively and offline stubs exist, so automatic pruning could erase a player's board.

## VFX (`src/lib/vfx`, `src/components/visual`)

- **Before:** `CRTOverlay` and `SignalLayer` rewrote a full-viewport `ImageData` with `Math.random()` per pixel on every animation frame (on phones, for the handset), and ignored reduced motion for grain.
- **Now:** one cached 128 px noise tile (`noise.ts`) stepped by a compositor-only CSS transform (`NoiseField`); scanlines/vignette are static CSS gradients; no per-frame JavaScript.
- `glitch.ts` — controller. `glitch({ type, intensity, duration })`, types `LIGHT | SIGNAL | TRACKING | FRAME | CORRUPTION | FULL`. Hard duration ceilings (350–1400 ms), 2.5 s cooldown (6 s after a strong event), `force` for authored story moments, `reduced` events (still dim only), `off` preference stored in `localStorage` (`nexus_effects_v1`).
- `GlitchLayer.tsx` — paints events with transforms/opacity; at most one static burst per event.
- Triggers: opening a degraded record (`glitchForCondition`) or a camera feed (`glitchForMedium`) in `ArtifactInspection`; rare dropouts from `SignalLayer` when the link is weak or the case phase ≥ 2.
- Photosensitivity: nothing repeats faster than the cooldown; the only luminance step is one low-opacity static frame per event; the tube flicker is two ≤ 3.5 % dips per 7 s.

## Bugs fixed on the way

- `TacticalOverlay`: stray `}` made an SVG `transform` invalid (console error on every admin dashboard load).
- `BureauIcons`: invalid `d` (Eye) and `points` (SkipForward) attributes.
- `ArtifactInspection` ignored `artifact.imageUrl` (generated media), so generated evidence showed no image when inspected.
- Generated condition `STAIN` did not match the UI vocabulary `STAINED`.
- Board rotate cycled past ±12°, which the loader then clamped (rotation did not survive reload).
- `package.json` had duplicate `evidence:*` script keys.
- 5 `useConnection` tests failed without a local `.env`; the test config now supplies Supabase env.

## Evidence audit (CASE NX-037, 66 generated artifacts)

All 138 referenced media paths exist (`npm run evidence:refs`). Mix: 12 photographs, 9 surveillance, 9 documents, 9 notes, 10 fragments, 6 personnel, 6 audio, 5 maps; 38 normal, 28 degraded in 9 conditions; 98 declared relationships (9 contradictions). 

**Gaps against the brief**, left unfilled on purpose because evidence must carry story, not decorate the UI: no posters / public notices, newspaper clippings, phone or message records, receipts/tickets, lab/DNA/medical reports. Adding them is a content task for `scripts/evidence-gen/library.mjs` and needs the case writer's facts.

## Not done (so nobody assumes it was)

- No sound hooks, no object **groups**, no minimap, no multi-card drag.
- The admin has no *board* of its own: admins see the player archive through the QA simulator. A GM-side board (all teams, publish/hide evidence) needs backend work.
- Screen curvature, and an in-app control for the effects preference, were not built (the preference API exists).
- Admin screens (dashboard, QA hub, locations…) were audited, not redesigned; the QA hub in particular still looks like generic web UI.
- Per-device wording like "Mobile viewport" in the simulator is a CSS width, not a real device.
