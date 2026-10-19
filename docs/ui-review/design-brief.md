# NEXUS ECHO — Design Brief (UI transformation pass)

Written before implementation, per `designing-frontend-interfaces` (Iron Law:
brief + token deltas exist before any code changes).

## The 8-line brief

1. **Product**: NEXUS ECHO — a live investigation game. Two faces: the *player*
   handset (mobile-first, one hand, time pressure) and the *bureau workstation*
   (desktop terminal, admin).
2. **Archetype**: diegetic bureau terminal / analog-dossier noir — recovered
   dark stock, mono metadata, stamped states, hard corners. Every screen reads
   as an instrument state, not a web page.
3. **Audience**: players in three roles (Operator answers, Observer/Analyst
   watch), plus bureau staff. Mixed eyes, mixed devices, shared tension.
4. **Feel**: field equipment — snappy, legible under stress, quiet when idle.
   Feedback is mechanical (state markers, stamps, tones), never decorative.
5. **Non-negotiables**: dark paper `#1a1917` is canonical (see divergence
   note); sharp geometry (radius ≤ 3 px, enforced by the globals.css utility
   kill); mono for metadata, display for headings, sans for body; Operator is
   the only role that submits, and wrong conclusions fail as a *team* (no role
   attribution anywhere in copy or UI).
6. **Palette**: ship the existing `--nx-*` tokens only — cyan accent = action,
   amber = warning, red = critical, green = verified. No new hues.
7. **Type**: reuse the scale already in `tokens.css` / `globals.css`. New UI
   must not introduce new font sizes; consolidate outliers instead.
8. **Rejected** (anti-slop): rounded card piles, big soft shadows, gradient
   hero fills, glassmorphism, generic dashboard chrome, hover-only affordances,
   motion without `prefers-reduced-motion` cover.

## Token divergences found (and decision)

| Token | Brand book | Code (shipped) | Decision |
|---|---|---|---|
| `paper` | `#d4d0c5` light recovered paper (`NEXUS_ECHO_BRAND_BOOK.md:71`) | `--nx-paper: #1a1917` dark stock (`globals.css:61`, `tailwind.config.ts:39`) | **Code is truth**: the system shipped dark-mode-first; the brand-book row is stale documentation. Canonical = `#1a1917`. Documented here; brand book left untouched this pass. |
| radius | — | 2 px / 3 px only (globals utility kill forces `border-radius: 0` on utilities) | Keep. New components use `2px`/`3px` via existing classes. |
| motion | — | `--dur-fast / --dur-med / --dur-slow` (tokens.css) + `@media (prefers-reduced-motion)` drain in globals | Keep. Every new transition/animation uses these durations and is disabled under reduced motion. |
| `variables.css` | — | duplicate legacy palette (`--color-paper: #1a1917`) | Dead file; not extended this pass. |

## Baseline system audit (before)

From `docs/ui-review/before/ui-review-report.json` (Puppeteer, mobile 390×844 +
desktop 1440×900):

- Distinct font sizes per screen: 6–16 (evidence = 16, worst).
- Distinct font families: 2–4 (target: 3 — display, mono, sans).
- Border radii: 0–2 distinct (both on evidence; consistent with the ≤3 px rule).
- Box shadows: 1–6 distinct.
- Console errors: only offline-backend noise (`ERR_NAME_NOT_RESOLVED`,
  `callBureau non-2xx`) — no application exceptions.
- Known defect: hand-rolled back headers differ across Node / Final /
  Leaderboard / Inventory / QR / Navigation (gap, hover fill, aria-label
  casing) — MOBILE_UI_UX_AUDIT #12.

## Transformation plan (scope for this pass)

1. **`ScreenHeader` primitive** — one back-header component (back target +
   aria-label, eyebrow/status row, title, subtitle, actions slot); adopt it in
   Node, Final, Leaderboard, Inventory, QR, Navigation.
2. **Field log made real** — `FieldMode`'s placeholder block renders the
   team's actual recent notifications (`useApp().notifications`) with an
   honest empty state.
3. **Audio mute** — SFX exist (`useGameAudio` used by Node, QR,
   EvidenceArchive); add a persisted mute toggle wired into the player chrome.
4. **Evidence framing** — keep the scroll-strip tabs (by design), fix audit
   false positives via ancestor-clip aware audit; consolidate micro-type
   outliers where cheap.
5. **Bureau token cleanup** — replace hardcoded `bg-[#060607]` in
   `Workstation.tsx` with the `--nx-*` surface token.
6. **Micro-interactions** — unified `transition-colors duration-fast` on
   header/back/list affordances, pressed states, consistent entrance
   (`nx-wake`) on player screens — all guarded by the existing reduced-motion
   rules.
7. **Operator submission polish** — visual states only (idle / sending /
   queued); generic Avalanche failure copy untouched; no role attribution.

Out of scope this pass: brand-book rewrite, dead-GSAP removal beyond the
already-dead hook (no behavior change), type-scale consolidation beyond the
listed outliers (risk without visual review), any V2 feature work.
