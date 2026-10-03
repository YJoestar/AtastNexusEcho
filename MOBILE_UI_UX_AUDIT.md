# NEXUS ECHO — Mobile UI/UX audit (identity & polish pass)

Run against the QA-simulator harness at 360×800, 375×812, 390×844, 412×915 and
844×390, plus the real login route, plus the code. Priorities: **P0** reads as
unfinished/template, **P1** hurts use or cohesion, **P2** polish.

| # | CURRENT PROBLEM | WHY IT MATTERS (user / game impact) | FIX | PRI | STATUS |
|---|---|---|---|---|---|
| 1 | Favicon was the **Vite template's purple lightning bolt**; `public/icons.svg` held the template's social icons | First thing a player or a screenshot shows; the clearest "vibe-coded" tell | New NEXUS ECHO mark as favicon, apple-touch and 192/512 icons; template files removed | P0 | **Fixed** |
| 2 | Tailwind declared Inter / Space Grotesk / JetBrains Mono but **no font was ever loaded**: every player saw system fallbacks. Inter + Space Grotesk is also the stock AI-template pairing | Typography was accidental and different per device | Self-hosted IBM Plex Sans / Condensed / Mono + Courier Prime, Latin subset (~190 KB total, 9 files) | P0 | **Fixed** |
| 3 | No brand mark anywhere: header used a letter "N" in a box; login had none | No identity on the one screen every player sees first | Mark in header, login lockup, admin system bar | P0 | **Fixed** (player + admin bar) |
| 4 | 18 usages of CSS variables that **do not exist** (`--nx-surfaceElevated`, `--nx-textMuted`, `--nx-textSubtle`, `--nx-surfaceSubtle`): those rules silently fell back, so surfaces/icons ignored the theme | Inconsistent surfaces, the nav icon colour was undefined | Renamed to the defined kebab-case tokens | P1 | **Fixed** |
| 5 | Navigation icons were generic (file, package, share, scan-line, radio); a **trophy** for the ranking | Consumer/gamification vocabulary in a forensic device | Six original glyphs (Case, Evidence, Board, Scan, Comms, Ledger) on one grid with a state grammar; Trophy retired | P1 | **Fixed** |
| 6 | 12 generic icons never used (star, gem, pill, gamepad, bar charts, compass…) in the icon file | Dead vocabulary invites misuse | Deleted | P2 | **Fixed** |
| 7 | `lucide-react` listed as a dependency, imported nowhere, still in the build chunk config | Dead dependency, a second icon family waiting to be mixed in | Removed | P2 | **Fixed** |
| 8 | Active tab = a bordered box with a stray bracket pseudo-element | Noisy; the "where am I" cue was decoration | A 2 px bar on the top edge + accent + filled node (shape, not colour alone) | P1 | **Fixed** |
| 9 | Buttons / rows had no pressure response | Touch felt dead | 1 px press + brightness, 90 ms; none under reduced motion | P1 | **Fixed** for buttons, tabs; lists use background change |
| 10 | No spacing / type / motion / z-index / touch tokens; ~1,600 lines of CSS with literal values | The root cause of drift between screens | `styles/tokens.css` | P1 | **Defined and used by new code**; the old CSS is **not** retrofitted |
| 11 | "Verified" had no colour of its own (success was the same cyan as "live") | Two meanings, one colour | `verified` green, used first on the case ledger | P2 | **Started** |
| 12 | Node, Inventory, Leaderboard, Final, Complete, QR keep the earlier document-shell layout and back-arrow headers | They are coherent with the old Bureau look, not with the new Case/Evidence/Board screens | — | P1 | **Open** |
| 13 | No long-press explanation for unfamiliar controls (research: hover tooltips do not exist on touch) | Players must guess | — | P2 | **Open** — every new control carries a visible label or an `aria-label` instead |
| 14 | ~74 remaining Bureau icons not individually redrawn | They already share grammar (1.5 stroke, square caps, 24 grid) but were not audited one by one | — | P2 | **Open** |
| 15 | Node screen not visually verifiable offline (calls server) | Cannot sign it off | — | P1 | **Open** |

## Passed checks

No horizontal overflow at any tested size. Touch targets ≥ 44 px on the new
screens (records 88, primary 56, nav 56). Inputs 16 px. Reduced motion honoured.
Build, type-check and all 649 tests pass.

## How this audit was done (honest account)

- Two research subagents ran web searches (branding references; UI/UX
  references). Their access to full pages was blocked, so findings come from
  search-result summaries and are listed with URLs in
  `NEXUS_ECHO_BRAND_MOODBOARD.md`. One earlier research subagent has not
  reported back.
- **Not found:** a UI case study for *The Dark Arrival: Shadows of the Past*.
  Its principle is not cited as sourced. *The Operator* is by Bureau 81.
  Backrooms: Lost Tape's branding intent could not be sourced.
- No image-generation tool was used for the logo: the mark is built as exact
  vector geometry (the Canva tool in this session returns ~199 px previews
  only, unusable for production). That is the brief's own preferred method for
  anything with type in it.
- The separate "reviewer" roles (art director, accessibility, performance…) were
  not separate agents; they were passes I made myself against screenshots and
  measurements. Captured sheets are in `docs/brand/` (brand kit, glyph states).
