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

## Clue layers and cross-referencing

`src/lib/evidence/clues.ts` derives clues from the relationships the case data **already declares** (`artifact.relationships`). It invents nothing: a clue's text is the relationship's own note. Kind → category / difficulty: SOURCE, SPATIAL → easy; PERSONNEL, REFERENCE → medium; TEMPORAL → hard (found by lining timestamps up); CONTRADICTION → expert.

The player never sees the clue list. In **Compare** (`CompareStation.tsx`) they choose how to examine two records:
- *Side by side* and *Overlay* turn up cross-references.
- *Timeline* parses both timestamps, shows the gap, and turns up timestamp relationships. It refuses (and finds nothing) when a record has no readable time.

Findings persist in the workspace (`discoveries`, device-local like the rest) and are announced once, in restrained language ("LOCATION MATCH", "TIMESTAMP RELATIONSHIP RECORDED"). Status is the player's own reasoning: discovered, or corroborated / contradicted if they filed and confirmed a link of their own. Filing a link on the board does **not** reveal anything.

Limits, stated plainly:
- Relationships exist only in the generated NX-037 catalog (dev showcase). Server-delivered evidence in production carries none, so production would show no clues until the server supplies relationships.
- There are no pixel-region clues (something small inside a photograph found by zooming). Adding one means changing the picture's content, which this pass was forbidden to do. The model is ready for it (`DiscoveryMethod` can grow a `ZOOM` entry with a region).
- Frame stepping needs video; the case has stills only. Inspection gained view-only brightness / contrast / sharpen instead.

`EVIDENCE_ASSET_REGISTRY.md` + `docs/evidence/asset-registry.json` (generated; kept out of `public/` because it lists the clues) record each asset, its renderer treatment, a content-lock hash of its canonical facts, and its clues. `npm run evidence:lock` fails if any canonical fact drifts.

## Evidence render fix (presentation only)

The procedural renderer (`scripts/evidence-gen/lib/render3d.mjs`) had two bugs that made every photograph and CCTV frame read as abstract triangles:

1. **Quads were rasterised as one triangle** (only the first three vertices were used).
2. **No near-plane clipping**: any polygon with a vertex behind the camera was dropped whole, deleting most walls, floors and ceilings.

Both are fixed (Sutherland-Hodgman clip + fan triangulation). Corridor side-wall doors were also built across the corridor instead of in the wall plane (`addDoor` now takes `wall: 'side'`). Exposure on three bright rooms (B-05, B-11, CAM-05) was lowered, because they had only ever been tuned against the broken render.

**Content is untouched.** `public/evidence/manifest.json` and `src/lib/evidence/assetLibrary.generated.ts` are byte-identical before and after; only the JPEG pixels changed. `npm run evidence:verify` (determinism) and `evidence:refs` (138 paths) pass.

Inspection view: shows the thumbnail instantly behind the full frame, and now lists CONDITION and CAPTURED from fields that already existed. The board swaps to the full-size image above 110 % zoom (thumbnails are 220 px).

Later fixes in the same renderer: a **z-buffer** replaced the painter's sort (doors/signs now sit correctly in their walls, and props that had been hidden behind walls — the figure in B-02, the crates in B-09 — now appear); hairline **black scratches** were a NaN from a fractional array index (`physicalImperfections`); and the evidence label no longer overlaps the print caption. Exposure on B-01 and B-05 was lowered.

**Photoreal AI imagery was tried and not used.** The connected Canva generator produced a convincing flash-photo corridor, but only a 199 px preview is returned; getting full-size files needs the sandbox to reach Canva's download hosts, which the environment's network policy blocks, and the owner chose not to open it. The pipeline stays procedural. Known limits: flat-shaded surfaces, a blotchy wall texture, unlit black ceilings.

Gotcha: `build.mjs --only <codes>` deletes every other artifact's files and truncates the catalog. Always run the full build (about 50 s).

## Evidence audit (CASE NX-037, 66 generated artifacts)

All 138 referenced media paths exist (`npm run evidence:refs`). Mix: 12 photographs, 9 surveillance, 9 documents, 9 notes, 10 fragments, 6 personnel, 6 audio, 5 maps; 38 normal, 28 degraded in 9 conditions; 98 declared relationships (9 contradictions). 

**Not in the data, so not touched:** there are no posters and no emails. Documents, notes and personnel files already have physical paper treatment (typed forms, carbon copies, stamps, redaction bars, tears, burns). Nothing was invented to fill the gap.

**Gaps against the brief**, left unfilled on purpose because evidence must carry story, not decorate the UI: no posters / public notices, newspaper clippings, phone or message records, receipts/tickets, lab/DNA/medical reports. Adding them is a content task for `scripts/evidence-gen/library.mjs` and needs the case writer's facts.

## Not done (so nobody assumes it was)

- No sound hooks, no object **groups**, no minimap, no multi-card drag.
- The admin has no *board* of its own: admins see the player archive through the QA simulator. A GM-side board (all teams, publish/hide evidence) needs backend work.
- Screen curvature, and an in-app control for the effects preference, were not built (the preference API exists).
- Admin screens (dashboard, QA hub, locations…) were audited, not redesigned; the QA hub in particular still looks like generic web UI.
- Per-device wording like "Mobile viewport" in the simulator is a CSS width, not a real device.
