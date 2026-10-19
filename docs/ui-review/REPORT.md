# NEXUS ECHO — UI Transformation Pass (final report)

Branch: `work` · Scope: player handset + shared bureau primitives (+ one bureau
token cleanup) · Method: discover → verify → install → study → design →
implement → browser test → critique → refine → regression test.

Nothing here is a mock: every change ships in the real components. No auth, QR,
progression or role-permission behaviour was altered.

---

## 1. Tools & skills discovered / installed / rejected

Discovery used the harness skill catalog plus a direct look at candidate repos.
Free-only; nothing was installed until its content was read.

| Candidate | Verdict | Reason |
|---|---|---|
| `designing-frontend-interfaces` (osmontero/opencode-skills) | **installed** | Art-direction iron law: written brief + token deltas before code. Steered the whole pass. |
| `designing-user-experience` (osmontero/opencode-skills) | **installed** | States/empty/error/feedback discipline. Used for the field-log empty state. |
| `building-accessible-interfaces` (osmontero/opencode-skills) | **installed** | Keyboard/focus/ARIA/contrast checks. Used to re-grade the critique and to add the mute toggle's `aria-pressed`/label. |
| `reviewing-interface-quality` (osmontero/opencode-skills) | **installed** | The critique rubric used in the CRITIQUE stage. |
| `frontend-design` | pre-existing (on disk) | Ready-made visual-direction skill; loaded for the brief. |
| openai/plugins | rejected | No LICENSE — unusable. |
| Joey-1123 skill pack | rejected | Bundled a competing animation system (conflicts with the existing GSAP/motion setup). |
| Composio skill mirrors (many) | rejected | Redundant with the harness catalog; adds no design capability. |
| Third-party "skills CLI" | rejected | Manual copy into `.agents/skills/` is auditable and dependency-free. |

Installed at `.agents/skills/` (the repo's already-tracked skills location,
see commit `810dca4`). No config file was overwritten.

**Quality gate — only skills actually *used* count:** `designing-frontend-interfaces`
(brief + token table), `designing-user-experience` (empty-state copy),
`building-accessible-interfaces` (contrast re-grade + toggle semantics) and
`reviewing-interface-quality` (critique). `frontend-design` was loaded for
direction. That is 5 used; the rejects were never loaded.

---

## 2. UI transformation

Reused the existing stack only (React 18, Vite, Tailwind 3, the `--nx-*`
tokens). No new animation library, no new hues, no new font sizes.

### 2a. One header, everywhere — `ScreenHeader.tsx` (new primitive)
Seven player sub-screens hand-rolled their own back header with drifting gaps,
hover fills and aria-label casing (MOBILE_UI_UX_AUDIT #12). They now share one
component: back control (defaults `backTo=ROUTES.PLAYER_GAME`,
`backLabel='RETURN TO FIELD'`), optional eyebrow, `heading-3` title, optional
subtitle, optional right-hand actions.

Adopters: `Node`, `Final`, `Leaderboard`, `Inventory`, `QR`, `Navigation`,
`evidence/EvidenceArchive`.

### 2b. Field log made real — `FieldMode.tsx`
The field log was a placeholder sentence. It now renders the team's **real**
newest-first notifications (`useApp().notifications`, timestamped, capped at 4)
with an honest empty state ("NO ACTIVITY RECORDED — the log fills as the case
moves"). No synthetic entries.

### 2c. Audio mute — `useGameAudio.ts`, `PlayerHeader.tsx`
SFX already existed and were already used (Node, QR, EvidenceArchive). Added a
persisted mute: `localStorage["nexus_audio_muted"]`, gated **at the synth
source** (`tone`/`noise` return before creating an oscillator/buffer), toggled
from a new header button with `aria-pressed` + dynamic label, icons
`SoundIcon`/`SoundOffIcon` added to `BureauIcons`/`iconRegistry`.

### 2d. Evidence framing & type consolidation
EvidenceArchive title restyled from `font-mono` to the shared `heading-3`;
micro-type outliers (`0.5 / 0.52 / 0.56 / 0.58rem`) consolidated to `0.55rem`
across 12 files; `0.625rem` kept as the established "larger micro" tier (it
already existed at HEAD in 13 files — no new size introduced).

### 2e. Bureau token cleanup
`Workstation.tsx`: hardcoded `bg-[#060607]` → `bg-nexus-bg`.

### 2f. Final readiness — `content/constants.ts`, `Final.tsx`
The Final-screen readiness checklist thresholds were magic numbers inline; they
are now `FINAL_READINESS_TARGETS` (evidence 5 / inventoryItems 3 / fragments 7)
and documented as **display-only** indicators — the real unlock remains
`solved >= totalNodes - 1`.

---

## 3. Micro-interactions

- `nx-wake` — a 220 ms opacity/translate entrance on every player screen `page`
  div (13 files). Guarded by the existing `prefers-reduced-motion` drain.
- Unified `transition-colors duration-fast` + hover fill on the shared back
  control, header icons and list affordances (previously inconsistent or absent).
- `:active` pressed state on the handset button; `:focus-visible` accent ring on
  the handset input (kept).
- All motion uses the existing `--dur-fast/-med/-slow` tokens and is disabled
  under reduced motion — no second animation system.

---

## 4. Testing evidence

All commands run on this working tree, after the final refinements.

| Check | Result |
|---|---|
| `npm run typecheck` (app **and** edge) | pass |
| `npm run lint` (`--max-warnings 0`) | pass |
| `npx vitest run` | **71 files / 1140 tests passed** |
| `npm run build` | pass (built in ~5–7 s) |

### Browser capture + programmatic audit (Puppeteer)
`scripts/screenshots/ui-review.mjs` captures real components at mobile
**390×844 @2x touch** (emulated — no physical device was used) and desktop
1440×900, then runs a system audit per view: distinct computed
font-size / font-family / border-radius / box-shadow, ancestor-clip-aware
horizontal overflow, `hScroll`, and console errors. Output:
`docs/ui-review/before/` and `docs/ui-review/after/` (PNGs +
`ui-review-report.json`).

**After the refinements (final `after/`):**

| view | fontSize | family | radii | shadows | hScroll | overflow | errors |
|---|---|---|---|---|---|---|---|
| player-login-mobile | 7 | 2 | 0 | 3 | 0 | 0 | 0 |
| player-login-desktop | 7 | 2 | 0 | 3 | 0 | 0 | 0 |
| player-hub-mobile | 12 | 3 | 1 | 3 | 0 | 0 | 3* |
| player-hub-desktop | 12 | 3 | 1 | 3 | 0 | 0 | 2* |
| player-evidence-mobile | 15 | 4 | 3 | 6 | 0 | 0 | 2* |
| player-evidence-desktop | 15 | 4 | 3 | 6 | 0 | 0 | 2* |
| player-inventory-mobile | 10 | 3 | 0 | 2 | 0 | 0 | 2* |
| player-navigation-mobile | 12 | 4 | 0 | 3 | 0 | 0 | 2* |
| player-qr-mobile | 10 | 3 | 0 | 3 | 0 | 0 | 2* |
| player-leaderboard-mobile | 13 | 4 | 0 | 2 | 0 | 0 | 2* |
| player-notifications-mobile | 12 | 2 | 0 | 3 | 0 | 0 | 2* |
| bureau-workstation-desktop | 10 | 2 | 0 | 1 | 0 | 0 | 2* |

\* only offline-backend noise (`ERR_NAME_NOT_RESOLVED`, `callBureau non-2xx`) —
the same errors the baseline had. No application exceptions.

**Before → after (highlights):** evidence worst-case distinct font sizes
**16 → 15**; inventory **11 → 10**; radii restored to circles —
`player-hub` 0 → 1 (a real "live" status dot) and `player-evidence` 2 → 3 (the
status marker) — both now report `9999px`; **hScroll = 0 and overflow = 0 on
every view** before and after. Some views gained a distinct size (qr 8 → 10,
login 6 → 7, leaderboard 12 → 13) because `ScreenHeader` brings the shared
`heading-3` / eyebrow sizes onto screens that previously omitted them — these
are existing system sizes, not new ones.

### Refinement pass (post-critique)
Critique (subagent, `reviewing-interface-quality`) raised findings; the two
real, evidence-backed defects were fixed and re-verified:
1. The `globals.css` reset catch-all `[class*='rounded']` was squaring genuine
   circles (spinner rings, status dots). Added a later same-layer override
   restoring `rounded-full` → `border-radius: 9999px`. Verified in the built CSS
   (`index-*.css`) and in the audit (`9999px` now present).
2. No `::placeholder` rule existed, so the login placeholder inherited Tailwind
   `gray-400` (off-palette). Added `.handset-input::placeholder` →
   `var(--nx-text-subtle)`. Verified present in the built CSS.

A third finding (disabled-control contrast) was **not** changed: WCAG 1.4.3 /
1.4.11 explicitly exclude inactive components; the critique's "Critical" grade
was inflated.

---

## 5. Limitations / not covered

- **No physical device.** Mobile results are Puppeteer emulation
  (390×844 @2x, touch, DPR 2) — not a real handset, so real Safari/iOS quirks,
  safe-area insets and true touch ergonomics are untested.
- **Screenshots were verified programmatically, not by eye.** This agent cannot
  read PNGs; confidence rests on the audit JSON, the built-CSS assertions, the
  1140-test suite and a subagent critique whose own image decoder also failed,
  so its pixel-level claims were re-checked in source before acting.
- **Admin workstation UI largely unreviewed.** `bureau-workstation-desktop.png`
  captures the `bg-black` boot overlay mid-sequence, not the settled
  workstation. Only the `bg-nexus-bg` token swap is in scope there.
- **Dead code left alone** (no behaviour change): the dead GSAP hook,
  `variables.css`, the `/admin` redirect.
- **`FieldLog.tsx`** (the separate full-screen log) was not re-reviewed; the
  in-hub field log now shows real data.
- Deferred: `Navigation`'s fixed-height map has no zero-data empty state
  (critique I4); MOBILE_UI_UX_AUDIT #13/#14/#15.
- The brand book's `paper #d4d0c5` row contradicts shipped code
  (`--nx-paper: #1a1917`). Code is treated as truth and documented in
  `design-brief.md`; the brand book was **not** edited this pass.

---

## 6. Git status

- Instrument: `scripts/screenshots/ui-review.mjs`; evidence: `docs/ui-review/`
  (`design-brief.md`, `before/`, `after/`, this report).
- Rejected dirs intentionally left uncommitted: `.claude/` (tool mirror, no
  tracked precedent) and `.aider-desk/skills/frontend-design/` (duplicate mirror
  not created by this pass). Installed skills live at `.agents/skills/`.
