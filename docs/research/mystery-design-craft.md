# Mystery Design Craft — Research Notes

**Status:** Research (not a spec). Written 2026-10-19.
**Scope:** Craft-level guidance for puzzle/mystery construction, gathered from
published craft writing on detective fiction, tabletop mystery scenario design,
puzzle-game design, escape rooms, and puzzle hunts. Each topic ends with a
concrete recommendation for NEXUS ECHO.

**How to read the source tags**

- `[PRIMARY]` — the canonical text itself (rules, named method).
- `[SECONDARY]` — craft commentary/analysis by a practitioner or critic.
- `[ACADEMIC]` — peer-reviewed or thesis-grade source.
- `[GENERAL]` — general knowledge, **not** tied to a fetched URL. Labelled so.
- `[INACCESSIBLE]` — URL fetched, but the body was not retrievable.

Every fetched URL is listed in the Source Ledger (§10) with its fetch date.
The web pages below were retrieved on **2026-10-19** unless noted. Where a page
carries its own publication date, that date is recorded too.

---

## 1. Puzzle design fundamentals

**Principle.** A puzzle is a challenge that withholds something (the path, the
data, the rule) and rewards the solver for reconstructing it from what is
present. Good puzzles are *learnable*: they teach their own rules, then ask the
solver to apply them in a new arrangement. A puzzle is bad when the solver
cannot tell whether they are wrong or merely unlucky.

**Evidence.**

- Jolie Menzel (Ubisoft SF), "Solving Puzzle Design", GDC Level Design Workshop
  2016 `[SECONDARY]`. Key claims: puzzles depend on the *consistency* of a
  game's mechanics and theme to "make sense"; difficulty must be judged "in the
  context of the game as a whole"; and the designer must "watch others play your
  puzzle to check for assumptions you may have made."
- The GDC deck's troubleshooting taxonomy is directly reusable. "Too easy" is
  diagnosed as *just a lock and key*, *not enough steps*, *no variation in
  verbs/applications*. "Too hard" is diagnosed as *is info given to solve the
  puzzle?*, *how long ago?*, *can it be re-accessed?*, *is the goal clear?*
- MIT Mystery Hunt, "Thinking About a Puzzle" `[SECONDARY]`: a puzzle is closer
  to a research problem than an exam; the creator is a human sharing your
  notions of elegance and cultural background, which is what makes a puzzle
  solvable at all. Also: *check your work* — most wrong answers are the
  solver's own arithmetic, not a broken puzzle.

**Failure mode prevented.** Puzzles that are unfair by accident: steps that were
never taught, goals the solver cannot see, or difficulty judged from the
designer's privileged knowledge instead of a naive player's.

**Recommendation for NEXUS ECHO.** Treat each `puzzle_nodes` row as a teaching
unit. The seed already separates roles (`observer` sees, `analyst` transforms,
`operator` submits) — keep that as the puzzle's "verbs." When adding a node,
confirm the three GDC dials explicitly: (a) is the *goal* stated in
`operator.taskPrompt`? (b) is the *input* re-accessible after the role that
produced it has moved on? (c) does the mechanic vary from the previous node, or
is it a lock-and-key repeat? A node that fails (b) is the "info not re-accessible"
failure and should be split or given an inline recall affordance.

---

## 2. Detective game design: puzzles vs. story

**Principle.** In a detective game, the puzzle layer and the narrative layer
compete for the same screen. The clue must be *diegetic* (part of the fiction)
and *legible* (part of the game). If the plot reveals what the puzzle should
teach, the puzzle is scenery; if the puzzle is a pure abstraction, the story
stops mattering.

**Evidence.**

- Game Developer, "Detective Game Design: Puzzles vs. Story (Lacuna Devlog)"
  `[INACCESSIBLE]`. The page returns HTTP 200 but the article body is rendered
  client-side; the static HTML contains only site chrome. **Could not verify
  the article's specific claims.** Do not cite this as a source.
- Game Developer, "A Study Into Puzzle Design" `[INACCESSIBLE]` — same
  client-rendered problem. Unverified.
- MIT Mystery Hunt `[SECONDARY]`: the "human design" observation — puzzles are
  authored by people who share your cultural frames — is what connects
  puzzle-solving to narrative recall. It also warns of the opposite failure:
  puzzles so gimmick-dependent ("apply the gimmick again to the output") that
  meaning disappears.
- Wikipedia, *Whodunit* `[SECONDARY]`: the genre's contract is a *ratifying
  narrative* — the final chapter must "recount the events of the story" and
  convert clue-viewing into reasoning. Story is the vehicle for the proof.

**Failure mode prevented.** "Puzzle as vending machine": the fiction is a
wrapper, the answer is mechanical, and the reveal explains nothing. Conversely,
"story as railroad": the plot proceeds regardless of whether the puzzle was
solved.

**Recommendation for NEXUS ECHO.** Every node already carries `narrativeObjective`
and `storyReveal`. Make `storyReveal` lexically dependent on the *solved*
answer rather than on time passing (the seed mostly does this: "LIGHT ACCEPTED.
THE SYMBOL IS REVEALED."). When authoring, write the reveal *last* and require
it to name the answer or its consequence. A reveal that would read identically
if the team had failed is a story/puzzle desync and should be rewritten.

---

## 3. Fair-play mystery rules (Knox, Van Dine, and modern critique)

**Principle.** The fair-play contract: the reader/solver is given every fact the
detective uses, in time to solve it independently. Withholding is not
cleverness — it is cheating. The rules exist to protect that contract.

**Evidence — Knox's Decalogue** `[PRIMARY]`. Ronald A. Knox, "A Detective Story
Decalogue" (originally 1928/29; reprinted 1939). Full text retrieved via UMSL,
Open University, and Classic Crime Fiction. The ten rules:

1. The criminal must be mentioned early, but must not be anyone whose thoughts
   the reader has followed.
2. All supernatural or preternatural agencies are ruled out.
3. Not more than one secret room or passage is allowable.
4. No hitherto undiscovered poisons, nor any appliance needing long scientific
   explanation at the end.
5. No Chinaman must figure in the story. *(A period racial exclusion — see
   critique below.)*
6. No accident may help the detective, nor an unaccountable intuition that
   proves right.
7. The detective must not commit the crime.
8. The detective is bound to declare any clues he lights upon.
9. The Watson must not conceal thoughts from the reader; his intelligence must
   be "slightly, but very slightly, below that of the average reader."
10. Twin brothers and doubles must not appear without due preparation.

**Evidence — Van Dine's Twenty Rules** `[PRIMARY]`. S. S. Van Dine (Willard
Huntington Wright), "Twenty Rules for Writing Detective Stories" (1928).
Retrieved via WIRED (2019-01-10) and the Golden Age of Detective Fiction blog
(2022-12-23). The rules that matter for fair play:

- (1) "The reader must have equal opportunity with the detective for solving
  the mystery. All clues must be plainly stated and described."
- (2) No wilful tricks or deceptions on the reader, other than those the
  criminal plays on the detective.
- (4) The detective (or an official investigator) must never turn out to be the
  culprit.
- (5) The culprit must be determined by logical deduction — not accident,
  coincidence, or unmotivated confession.
- (8) The detective must not withhold vital information from the reader.
- (15) The culprit must be a person "with whom the reader is familiar and in
  whom he takes an interest."

Van Dine's list is deliberately stricter and partly self-serving; rules 3 (no
love interest), 7 (must be a corpse), and 18 (no hidden rooms) are preferences,
not fair-play requirements.

**Evidence — modern critique** `[SECONDARY]`.

- The Invisible Event, "Defining 'Fair Play' in detective fiction"
  (2015-11-29): the test is retrospective — "if I get to the reveal and can see
  how each crumb along the path of reasoning to the solution was given to me to
  pick up and examine at my leisure, then it's a fair play puzzle." It further
  argues that scattering "one or two spare comments amidst pages of white
  noise" is *not* fair play.
- Open University (Christie course, §5.1): the rules encode "contemporary
  prejudices," including the racist exclusion in Knox's rule 5; they are
  historical artifacts of genre conventions, not timeless laws.
- Agatha Christie Ltd, "Playing by the Rules" (2019-04-12): Knox and Van Dine
  published in the same year (1928); both are partly "tongue-in-cheek," and the
  durable common threads are fairness, no supernatural bail-outs, no lazy
  stereotypes, and no over-mechanical murder devices.
- danjdewhurst/story-skills, `mystery-fair-play.md` `[SECONDARY]`: the modern
  restatement — "the reader gets every clue; the culprit is introduced early;
  no withheld essentials; the solution must be the *best* explanation, not
  merely *a* consistent one."

**Failure mode prevented.** The two canonical cheats: (a) the final-act reveal
of evidence the solver never saw; (b) a solution that is internally consistent
but not uniquely supported.

**Recommendation for NEXUS ECHO.** Encode the durable (non-period) rules as
authoring invariants, not as dated dogma:

1. **Early culprit.** Map "culprit introduced early" to *the answer's subject
   appears in a node that unlocks before the node that requires it*. If the
   seed's `fullSolution` names a thing the team could not have seen, the node
   is unfair.
2. **Plainly stated clues.** Every fact in `fullSolution` must be present in at
   least one role's `dataPayload` / `whatTheySee` for that node.
3. **No withheld essentials.** Because NEXUS is role-split, "withheld" means
   "withheld from *all* roles," not "withheld from one role." The
   `coordinationChain` field already documents the intended merge; treat it as
   the fairness audit line.
4. Drop rules 3/5/7/18-class restrictions except rule 5's *spirit*: no reliance
   on an unearned stereotype for the solve.

---

## 4. Clue placement and the information economy

**Principle.** Redundancy beats singular brilliance. Because solvers miss,
ignore, or misread clues, the load-bearing conclusions of a mystery should each
be reachable by more than one route. Place clues so the whole chain survives any
single failure.

**Evidence.**

- The Alexandrian (Justin Alexander), "Three Clue Rule" (2008-05-08) `[PRIMARY]`:
  *"For any conclusion you want the PCs to make, include at least three clues."*
  Rationale: if each clue is a plan, three clues give two backups. "There are no
  exceptions." The author's own humility argument: "you already know what the
  solution is. This makes it very difficult for you to objectively judge whether
  something is obvious or not."
- CritForge, "Three-Clue Rule Explained" (2026-02-26) `[SECONDARY]`: clarifies
  the rule is *three clues per conclusion*, not three total; and warns of the
  inverse failure — *over-cluing* makes the mystery "frictionless" and makes
  players "paranoid that every detail is significant." It also requires a
  **failure state that doesn't end the campaign** ("the killer escapes but
  leaves a trail; the mystery pauses. It doesn't brick.").
- CritForge and The Alexandrian both stress independent *channels*: "backup
  clues should be available regardless of rolls, triggered by being in the right
  place or talking to the right person." (NEXUS equivalent: different roles, not
  different dice.)

**Failure mode prevented.** The **chokepoint**: one clue, one player action, one
interpretation standing between the team and all forward motion.

**Recommendation for NEXUS ECHO.** Adopt a **Three-Route Rule** for every
load-bearing deduction:

- For each `narrativeObjective`, ensure the conclusion can be reached from at
  least three of the following, *across different roles*: the Observer's
  observation, the Analyst's transform, a prior node's reveal, an evidence
  item, or the `interactiveData.recallPrompt`.
- Because the team must *coordinate*, treat "three routes" as "no single role's
  output is the only path." This is already close to the seed's design
  (`coordinationChain` implies a merge) — formalize it as a checklist item.
- **Do not over-clue.** Three is the target. A node with five redundant routes
  teaches the team that every detail matters, then punishes them for it later.
- The seed's `hints` array already functions as a planned backstop; see §6.

---

## 5. Red herrings: plausible and eliminable

**Principle.** A fair red herring is a *real* possibility that turns out false
for a stated reason. It must be plausible, fit the scenes it appears in, and be
**resolved** — the team must learn *why* the suspicious thing was innocent.
Misdirection without resolution is a broken promise.

**Evidence.**

- danjdewhurst/story-skills `[SECONDARY]`: every red herring must be
  "plausible (a reasonable reader could suspect this person), scene-fitting (it
  belongs in the scenes it appears in — never inserted solely to mislead), and
  resolved, not abandoned." A resolved herring "gets its own mini-payoff: the
  suspect is cleared for a reason that teaches the reader something true about
  the case." A herring with no payoff is "a broken promise."
- Slima, "Fair-Play Mystery Rules" (2026-01-26) `[SECONDARY]`: "the present
  company moved to Oregon… **every red herring must have a legitimate
  explanation.**" An unexplained red herring is "the cheapest form of
  deception." Christie's discipline: "Every suspicious character … has a
  genuine reason for being suspicious. Every one of those reasons gets revealed
  before the final page."
- The Alexandrian, "Red Herrings Are Overrated" corollary (2008) `[PRIMARY]`:
  in interactive scenarios, a red herring adds difficulty on top of an already
  hard deduction task. Crucially, *players will invent their own red herrings*
  ("the players are almost certainly going to take care of it for you"). If you
  do use one, provide "an absolutely incontrovertible refutation" — while
  conceding even that may not land.
- Kenneth W. Myers, "Red Herrings" (2026-06-13) `[SECONDARY]`: the strongest
  herrings are *layered* — several suspects each with means/motive/opportunity,
  where "each red herring carries a partial truth."

**Failure mode prevented.** Two opposite defects: the *unresolved* herring
(solver frustration: "so what was that about?") and the *manufactured* herring
(a coincidence inserted only to deceive, which reads as cheating rather than
cleverness).

**Recommendation for NEXUS ECHO.** NEXUS is a cooperative coordination game, not
a solo whodunit, so red herrings should be **few and structural**. Concretely:

1. Model a herring as a node field (suggested: `answer_metadata.herrings[]`
   with `{ clue, resolvedAt, explanation }`) so it can be audited.
2. Require `resolvedAt` to name a *later* node. An unresolved herring is an
   authoring error, the same way a dangling prerequisite would be.
3. Prefer "partial truths" over lies: e.g. a symbol that maps to two meanings,
   where only the second node disambiguates. This is scene-fitting and gives the
   elimination a mini-payoff.
4. Lean on the Alexandrian's observation: in a 3-role coordination game, the
   team will *generate* its own confusion. Do not spend clue budget on
   extra misdirection.

---

## 6. Progressive hint systems (the 3-tier ladder)

**Principle.** A hint system helps a stuck solver progress without destroying the
satisfaction of solving. The reliable shape is **optional + escalating**:
small nudge first, more only if still stuck, never the raw answer unless the
game's design allows full reveal.

**Evidence.**

- Bugnet Blog, "How to Design a Hint System for Puzzles" (2026-06-08)
  `[SECONDARY]`: the two governing properties are *guide without spoiling* and
  *optional + escalating*. "A hint that guides (nudges toward the solution)
  helps the player solve it themselves, while a hint that spoils (gives the
  answer) removes the satisfaction."
- Medium (Sultan Rizwan), "Mashable Connections Hints" (2025-11-15)
  `[SECONDARY]`: the three-tier ladder in practice — **Tier 1 (vague)**:
  broad category ("One set relates to nature"); **Tier 2 (moderate)**: narrows
  it; **Tier 3 (very clear)**: "almost revealing, but still stop short." Also:
  "reserve Tier 3 for confirmation, not as a shortcut."
- He et al., "An Adaptive Hint System for Puzzle Games" (IEEE, 2022)
  `[ACADEMIC]`: identifies two design problems with naive systems — (a)
  rule-based hints arrive at the wrong *moment* ("the timing of the hints cannot
  match the actual states of their game flows"); (b) hint *presentation* is
  "sometimes too abstract or too straightforward to follow and even leak the
  upcoming puzzles." Their fix is adaptive timing and multimodal presentation.
- The same paper's categorisation of *bad* hint mechanisms is worth keeping as
  anti-patterns: **hint on request** "may encourage [players] to request
  whenever a little obstacle occurs"; **hint for payment** leaves players who
  pay yet fail "more severe frustration."
- ACM, "A Data-Driven, Multidimensional Approach to Hint Design" (2017)
  `[ACADEMIC]`: hint systems are a difficulty-adjustment mechanism; treat them
  as part of the difficulty model, not an afterthought.
- NYT Connections' own hint behaviour (reported in the Medium piece and the
  AEROSTUDIES page, 2026-10-14) `[SECONDARY]`: reveal one correct pair at a
  time — a *granular* escalation, not three leap-frog levels.

**Failure mode prevented.** The **spoiler cliff**: a single "Hint" button that
dumps the answer, so a team that needed a nudge gets handed the solution and the
node's satisfaction collapses. Also the mirror defect: a hint so vague it is
indistinguishable from the puzzle itself.

**Recommendation for NEXUS ECHO.** The seed already stores `content.hints` as an
ordered array (~3 items) and `request_hint` serves them. Turn that array into a
*typed ladder* rather than three free-form strings, and price the escalation.
See the **Hint Ladder Template** (§8.1) for reusable wording. Enforcement points:

- `hints.length` must be exactly 3 (the tier contract). Reject authoring that
  ships a 1-line "hint."
- Tier 3 may state the answer only if the node's design intends a hard floor; by
  default Tier 3 should *confirm the interpretation*, not print the string —
  because `submit_puzzle_answer` already accepts only one `acceptedAnswer`, a
  spoiled Tier 3 would let a team skip the coordination the node exists to
  teach.
- Keep the existing `hint_penalties` config, but make the penalty *monotonic per
  tier* (cheap nudge, costly confirmation) so the ladder has a real gradient.
- The adaptive-hint literature warns against hint-on-request spam. Surface the
  hint affordance only after a threshold (e.g. attempts ≥ 2, or elapsed time on
  the node), not on a permanent button from frame one.

---

## 7. Difficulty calibration and playtesting

**Principle.** "Difficulty" in a puzzle is not a property of the puzzle alone; it
is *relational* — a function of the puzzle and the solver. Calibrate against
observed solver behaviour (attempts, time, backtracking), not the designer's
estimate.

**Evidence.**

- Kristensen, "Operationalising Difficulty in Puzzle Games" (ITU PhD thesis,
  2022) `[ACADEMIC]`: difficulty estimation from the initial board alone is
  inadequate because it misses dynamic "traps." Introduces *perceived
  difficulty* as "a relational attribute between the game and the player," and
  the **average number of attempts** as the operational metric, linked to churn.
- "Difficulty Modelling in Mobile Puzzle Games" (arXiv 2401.17436) `[ACADEMIC]`:
  "A direct way to quantify the difficulty of a level is by using the average
  number of attempts the players require to complete the level… linked to
  player churn." Also warns that cross-cohort averages "can be misleading."
- Gamigion, "How to Design Difficulty in Puzzle Games" (2025-01-06)
  `[SECONDARY]`, summarising Playliner research, gives a usable rubric in
  attempts: **1–3 attempts = Easy; 20–35 attempts = Hard.** Plus: multiple
  difficulty tiers, gradual mechanic introduction, and a difficulty curve
  (easy ramp → hard spike → progressive increase).
- Shen, "Generalized Entropy and Solution Information for Measuring Puzzle
  Difficulty" (2024) `[ACADEMIC]`: formal difficulty = information required,
  given the solver's knowledge, to describe the solution — and explicitly notes
  that over-powerful inference rules "overestimate players' abilities,"
  producing a *poorer* correlation with engagement.
- Menzel, GDC 2016 `[SECONDARY]`: "Do it as much as you can. Seriously, do it as
  much as you can. Capture as much of your testers' thinking processes as
  possible. Note where players get stuck."
- MysteryLocks (DIY escape-room guide) `[SECONDARY]`: "calibrate difficulty
  based on your players' age, skills, and experience level… Too easy creates
  boredom; too difficult leads to frustration," and iterative refinement +
  pacing calibration (alternating easier and harder challenges).

**Failure mode prevented.** Designer-blind difficulty: the difficulty field
reflects the author's intended complexity, but real teams either breezily clear
it or stall permanently, and nothing in the pipeline notices.

**Recommendation for NEXUS ECHO.** The `submissions` table already records
`attempt_number`, `response_time_seconds`, and `is_correct` per node — a
ready-made calibration instrument that is currently only used for scoring.
Add a **calibration procedure** (§8.3) that reads those columns. The seed's
`difficulty` 1–5 and `time` ("8m") fields should be *validated against* observed
attempts, not trusted. See §8.3 for the step-by-step.

---

## 8. Physical hunts, live events, and escape rooms

**Principle.** Physical puzzling adds two constraints that digital puzzles do
not: the environment must *mechanically* confirm progress (internal validation),
and the flow must accommodate groups working in parallel. Both shape fairness.

**Evidence.**

- terabox "Escape Room Puzzle Design Rules" `[SECONDARY]`: the central concept is
  **internal validation** — the players should "know you're right before trying
  a lock." The central anti-pattern is **"moon logic"**: "obscure leaps" that
  are only obvious to the designer.
- MysteryLocks `[SECONDARY]` (claims 100+ games, 28k+ groups): the five design
  principles are *make it intuitive, adapt it to your audience, make it fun,
  make it easy to understand, know when to stop*; and puzzle "layers" (turning
  "8" into "H" via alphabet position) for topical integration.
- steve-osborne-growth (King's Escape Room, Denver) `[SECONDARY]`: early rooms
  used **linear** flows (solve A → get B → solve C) and "became predictable and
  less engaging as the industry matured"; the fix was **branching** flows so
  teams work in parallel. Also: the 60-minute target was designed "to feel like
  a near-miss rather than a completion," and customers who finished (even over
  time) rated the room higher than those stopped mid-puzzle.
- UCSB / Stanford d.school, "Educational Escape Room — Planning Your Puzzles"
  `[SECONDARY]`: choose the structure up front — *sequential* (one leads to the
  next) vs *partial-solutions-combined* (each puzzle yields a fragment of the
  final solution).
- Wikipedia, *Puzzle hunt* `[SECONDARY]`: the answer is usually a **word or
  phrase**; deriving it is **"extraction"**; feeder puzzles combine into a
  **metapuzzle**. MIT Mystery Hunt `[SECONDARY]`: the runaround (a
  puzzle-guided journey across campus) is the culminating physical layer.
- MIT Mystery Hunt submission policy `[PRIMARY]`: answer boxes "ignore spaces,
  capitalization, and punctuation"; too many wrong guesses incur a delay; and
  **partial answers** (intermediate cluephrases) "may yield prompts or
  confirmations" — i.e. the interface confirms *intermediate* progress, not just
  the final answer.

**Failure mode prevented.** Live-play collapse: a group that is technically
correct but cannot tell, a mechanic only the designer can see, or a strictly
line-by-line flow that idles most of the team.

**Recommendation for NEXUS ECHO.** NEXUS is explicitly a live, in-person,
multi-role event (`docs/event/NEXUS_EVENT_DAY_RUNBOOK.md`). Adopt:

1. **Internal validation.** The `operator` submission is the team's lock. The
   *other* roles need lower-stakes confirmation that their intermediate output
   is right (the seed's `intermediateOutput` fields are exactly this, but they
   are static text). Where budget allows, add an "intermediate check" that
   confirms a role's partial result without unlocking the node — mirroring the
   Mystery Hunt's partial-answer prompts.
2. **Ban moon logic.** A node fails authoring review if its solution depends on
   a leap that no `dataPayload` states or implies. This is the same invariant as
   §3 rule (2), restated for live play.
3. **Parallelism.** The seed's branching (`prerequisites` + `branches.unlocks`)
   already supports non-linear flow. Prefer nodes that let Observer/Analyst begin
   the *next* observation while the Operator submits the current one.
4. **Near-miss pacing.** Design the total run so a competent team finishes
   slightly over the target, echoing the King's Escape Room finding — and never
   pull a team out mid-puzzle (§8.3 uses this as a calibration signal).

---

## 9. Answer normalization and input validation

**Principle.** For a typed-answer puzzle, the *matcher* is part of the puzzle's
fairness. It must accept everything the puzzle legitimately permits (case,
spacing, punctuation, harmless variants) and reject everything it does not —
without inventing equivalence the puzzle never intended. Arbitrary obfuscation
of the expected answer is a **defect**, not a feature: it makes the matcher
unpredictable and turns fair solves into "try the other spelling" guesses.

**Evidence.**

- MIT Mystery Hunt submission policy `[PRIMARY]`: the canonical, widely-adopted
  rule is to **ignore spaces, capitalization, and punctuation**. That is the
  entire normalization surface — nothing more. It is a *published contract*, so
  solvers can rely on it.
- Classtime, "How do I validate free text answers" (2022-09-19) `[SECONDARY]`:
  free-text answers need explicit handling — exact-match solution text, bulk
  validation of identical answers, and (beta) model-assisted prediction with a
  documented fallback to manual review when confidence is low. The lesson:
  free-text matching is a *product decision*, and auto-matching must degrade
  to review rather than silently reject.
- UIW, "Cardinal Quiz Converter: Validation Documentation" `[SECONDARY]`: short
  answers use an explicit list of acceptable answers (`* answer` lines); a
  question with **no** declared acceptable answer is a *validation error*. The
  lesson: the set of acceptable answers is a declared, audited artifact — never
  inferred at match time.
- ProProfs (SecAI Input Validation quiz, 2026-08-13) and the IMF-style guidance
  it reflects `[SECONDARY]`: Unicode normalization can prevent homograph
  attacks; validation must occur server-side; and **whitelisting is more secure
  than blacklisting**. Relevant because NEXUS accepts player text at an
  authenticated endpoint.
- **Project-specific finding (VERIFIED in this repo).** The current matcher,
  `submit_puzzle_answer` (last defined in
  `supabase/migrations/2026093014_unlock_next_node_on_conflict.sql`), normalizes
  as `UPPER(TRIM())` + collapse internal whitespace on **both** sides, and
  compares against a single `answer_metadata->>'acceptedAnswer'`. The seed sets
  `validationMethod` to `"exact"` or `"case_insensitive"`, but migration
  `2026093010_server_authoritative_puzzles.sql` explicitly notes the two are
  made equivalent by the shared normalization. There is **no** array of accepted
  alternates. `answer_metadata` is server-only and stripped from client
  payloads by `nexus_redact_answer` / `nexus_redact_jsonb`.

**Failure mode prevented.** Two classes:

- **False negatives** — a correct solve rejected because the team typed
  `17:47` vs `1747`, added a trailing period, or wrote `Archway!`. The matcher
  is narrower than the puzzle.
- **False positives / cheating surface** — a matcher so loose (`contains`,
  fuzzy distance, transliteration) that near-misses count, or so *opaque* that
  the expected form is unknowable. Arbitrary answer obfuscation (hashing the
  expected string, reversing it, storing a cipher) is the worst version of this:
  it protects nothing (the answer still had to be typed) while making the
  contract unverifiable and the matcher brittle.

**Recommendation for NEXUS ECHO.** Adopt the **Answer-Normalization Policy**
(§8.4). In short: publish the normalization (case, surrounding whitespace,
internal whitespace runs, and — where declared — punctuation), support a bounded
list of `acceptedAnswers[]` alternates in `answer_metadata`, and *never*
obfuscate the stored canonical answer. Keep `answer_metadata` server-only
(already the case) so the raw answer is never a client-side secret to be
"protected" by transformation.

---

## 10. Reusable artifacts

The four artifacts below are deliberately **case-agnostic** — copy them into an
authoring checklist, a ticket template, or a `docs/` sub-section. They contain
no NEXUS-specific answers.

### 10.1 Hint Ladder Template (three tiers, generic wording)

> Copy per node. Fill the angle brackets. Tiers must be authored *before* the
> puzzle ships, and Tier 3 may not simply print the answer unless the node is
> explicitly designed as a "gimme."

| Tier | Name | What it does | Reusable wording |
|---|---|---|---|
| 1 | **Nudge** | Points at *where to look* or *which mechanic applies*, without naming content. | "This is solved with the `<mechanic: cipher / counting / recall / ordering>` approach. Look at `<role or field>` — nothing there is decorative." |
| 2 | **Direction** | States the *rule or transform* and narrows to the branch of the solution, without giving the string. | "Apply `<transform>` to `<the thing>`. The answer is `<length/shape/format>` and relates to `<prior node or concept>`." |
| 3 | **Confirmation** | Confirms the *interpretation* and, only if allowed, the first characters or the exact format — never a full spoiler by accident. | "You have the right idea: it is `<concept>`. Submit it as `<format hint: e.g. one uppercase word / HH:MM / four digits>`. If your value starts with `<prefix>`, you are on track." |

**Cost gradient (suggested):** Tier 1 = small time/point cost; Tier 2 = moderate;
Tier 3 = largest. Monotonic, so the ladder is a real choice.

**Anti-patterns:** a one-line "hint"; a Tier 1 that already contains the answer;
three interchangeable tiers; a permanently visible hint button that trains
players to ask before trying.

### 10.2 Fairness Checklist

Use before a node is considered shippable. Every row must be **Yes**.

- [ ] **Early subject.** Anything named in the solution has appeared in an
  earlier-unlocked node or in this node's own player-visible fields.
- [ ] **Plain statement.** Every fact the solution relies on is present in a
  role's `dataPayload`, `whatTheySee`, or an evidence item.
- [ ] **No withheld essentials.** No fact needed for the solve exists only in
  the author's head or only in server-only metadata.
- [ ] **Best explanation.** The planted clues support *one* conclusion better
  than any rival; if three explanations fit, the planting is too thin.
- [ ] **Three routes.** Each load-bearing deduction is reachable by at least
  three inputs, not all from one role (the Three-Route Rule, §4).
- [ ] **Herrings resolved.** Every red herring has a later node that clears it
  for a stated, true reason.
- [ ] **No moon logic.** The leap from clue to conclusion is stated or directly
  implied somewhere player-visible.
- [ ] **Internal validation.** At least one role can tell they are on track
  before the Operator commits the final submission.
- [ ] **Answer contract.** The canonical answer is exactly as the puzzle's
  fields lead a careful team to produce it; the accepted-formats are declared
  (§8.4), not inferred.
- [ ] **Hint ladder present.** Exactly three tiers, escalating, non-spoiling by
  default.
- [ ] **Re-access.** Any information the team needed earlier can still be
  retrieved now (recall affordance or re-openable node).
- [ ] **No unexplained trick.** The reveal re-reads the clues rather than
  introducing new ones.

### 10.3 Difficulty Calibration Procedure

Reads the behavioural columns NEXUS already writes. Run per node, per event (or
per playtest cohort).

1. **Instrument.** For each node, aggregate from `submissions`:
   `attempts_to_solve` (attempt_number at first `is_correct`), `solves`,
   `starts`, `time_to_solve` (response_time_seconds at first correct), and
   `abandonment` (started, never solved by event end).
2. **Compute attempt bands.**
   - Easy: **1–3** attempts to solve.
   - Medium: **~4–12**.
   - Hard: **~20–35**.
   - *(Bands from Playliner/Gamigion; treat as heuristics, not laws.)*
3. **Compute the solve rate.** `solves / starts`. Flag any node below ~60% or
   above ~95% for review. Aggregate by *team*, not just by player, because NEXUS
   nodes are team-solved.
4. **Compare to the declared difficulty.** The seed's `difficulty` (1–5) and
   `time` ("8m") must agree with the observed band. A mismatch is a bug in the
   *declared* value, not the players.
5. **Diagnose before adjusting.** A too-hard node: is info missing, too far back,
   not re-accessible, or is the goal unclear? (GDC dials, §1.) A too-easy node:
   is it a lock-and-key with too few steps, or no variation in verbs?
6. **Adjust one dial at a time.** Options: add/relocate a clue (Three-Route
   Rule), sharpen the goal text, add an intermediate confirmation, or add a
   moderate hint tier. Never "just make the answer easier."
7. **Respect the near-miss.** Teams that finish slightly over time rate the
   experience higher than teams stopped mid-puzzle. Use `abandonment` as the
   red line, not raw duration.
8. **Feed the loop.** Record the observed band back into the node's metadata so
   the next event starts from measured, not estimated, difficulty.

### 10.4 Answer-Normalization Policy

**Applies to:** any NEXUS node whose `answer_metadata.validationMethod` is
`exact` or `case_insensitive`, and any future free-text node.

**A. The published contract (what the matcher ignores).**

Normalize *both* the submitted answer and each accepted answer identically:

1. Trim leading/trailing whitespace.
2. Collapse internal whitespace runs to a single space.
3. Compare case-insensitively (upper-fold both sides). `exact` and
   `case_insensitive` therefore behave the same, and any future `exact` must
   mean *"case and punctuation as declared"*, not a separate code path.
4. If (and only if) a node declares `punctuation: "ignore"`, strip the declared
   punctuation set from both sides before comparing. Default: punctuation is
   **significant**.

This mirrors the MIT Mystery Hunt convention (ignore spaces, capitalization,
punctuation) — a contract solvers can rely on. Publish it in the puzzle UI
(e.g. placeholder text on the input: *"Spaces, capitals and punctuation are
ignored."*) so the rule is visible at the moment of answering.

**B. Accepted forms.** Extend `answer_metadata` with a bounded alternates list:

```
answer_metadata = {
  acceptedAnswers: ["17:47", "1747"],   -- canonical first, then declared alternates
  validationMethod: "case_insensitive",
  punctuation: "significant",
  fullSolution: "…"
}
```

Rules: the first entry is canonical; alternates are *declared by the author*,
never generated at match time; the list is bounded (recommend ≤ 5) so it stays
auditable; a node with an empty list is a **validation error** (cf. UIW: "no
acceptable answer" is an error, not an empty question).

**C. Prohibited (defect) practices.**

- **Do not obfuscate the stored answer.** Hashing, reversing, ciphering, or
  otherwise transforming the canonical answer is a defect. It protects nothing —
  the solver still has to type the answer — while making the matcher
  unverifiable, brittle, and impossible to audit. Store the canonical answer in
  plain text in `answer_metadata`; rely on **server-only access** (already
  enforced: `answer_metadata` is stripped by `nexus_redact_answer` /
  `nexus_redact_jsonb`) for secrecy, not on transformation.
- **Do not use fuzzy matching** (edit distance, substring, phonetic) for graded
  answers. Fuzz produces false accepts that silently undermine the puzzle.
- **Do not silently reject.** A wrong answer should be distinguishable from a
  malformed one. `submit_puzzle_answer` already routes malformed input to 400
  and wrong answers to a scored miss — keep that separation.
- **Do not make the matcher stricter than the puzzle.** If the puzzle's own
  fields lead a careful team to `17:47`, the matcher must accept `17:47`,
  `17 : 47` (whitespace), and case variants of alphabet answers.

**D. Unicode and safety.** Normalize submitted text with a single Unicode
normalization form (NFC) before comparing `[SECONDARY]`, to prevent homograph
confusion; validate length and type server-side (already done: `requireString`
caps the answer at 1000 chars); never interpolate the answer into SQL or HTML.
Whitelist (the accepted list) rather than blacklist.

**E. Rate limiting.** Keep the per-team submission rate limit (currently 5/min).
Brute-forcing a short numeric answer is the main abuse case; the limit plus
scored attempt degradation is the intended defence.

---

## 11. Source Ledger

Fetched **2026-10-19** unless a publication date is shown. `RAW` = retrieved via
Wikipedia `?action=raw` wikitext.

**Primary (canonical texts)**

| Source | URL | Date |
|---|---|---|
| The Alexandrian — Three Clue Rule | https://thealexandrian.net/wordpress/1118/roleplaying-games/three-clue-rule | 2008-05-08 |
| The Alexandrian — Three Clue Rule Pt. 3 | https://thealexandrian.net/wordpress/1101/roleplaying-games/three-clue-rule-part-3-the-three-clue-rule | 2008-05-06 |
| The Alexandrian — Random GM Tips: Three Clue Rule | http://www.thealexandrian.net/creations/misc/three-clue-rule.html | — |
| Knox, "Detective Story Decalogue" (UMSL) | https://www.umsl.edu/~gradyf/film/knoxdecalogue.htm | 1939 ed. |
| Knox, Ten Commandments (Classic Crime Fiction) | http://www.classiccrimefiction.com/commandments.htm | 1928 |
| Van Dine, Twenty Rules (Golden Age blog) | https://goldenageofdetectivefiction.com/2022/12/23/s-s-van-dines-rules-for-a-fair-play-mystery | 2022-12-23 |
| Van Dine, Twenty Rules (WIRED) | https://www.wired.com/beyond-the-beyond/2019/01/s-s-van-dines-twenty-rules-writing-detective-stories/ | 2019-01-10 |
| MIT Mystery Hunt — About the Hunt | https://puzzles.mit.edu/2026/hunt/about | 2026 |

**Secondary (craft commentary / analysis)**

| Source | URL | Date |
|---|---|---|
| Open University — Rules of detective fiction | https://www.open.edu/openlearn/history-the-arts/agatha-christie-and-the-golden-age-detective-fiction/content-section-5.1 | — |
| Agatha Christie — Playing by the Rules | https://www.agathachristie.com/en/news/2019/playing-by-the-rules-christies-unconventional-crimes | 2019-04-12 |
| The Invisible Event — Defining Fair Play | https://theinvisibleevent.com/2015/11/29/42-defining-fair-play-in-detective-fiction/ | 2015-11-29 |
| CritForge — Three-Clue Rule Explained | https://www.getcritforge.com/blog/three-clue-rule-explained | 2026-02-26 |
| Slima — Fair-Play Mystery Rules | https://slima.ai/en/resources/article/genre-masterclass-02-mystery | 2026-01-26 |
| Kenneth W. Myers — Red Herrings | https://myersfiction.com/2026/06/16/red-herrings-mastering-misdirection-in-science-fiction-and-fantasy-plot | 2026-06-13 |
| danjdewhurst/story-skills — mystery-fair-play.md | https://github.com/danjdewhurst/story-skills/blob/main/skills/genre-craft/references/mystery-fair-play.md | — |
| TensorHub-ORG/Storydex — mystery-writing SKILL | https://github.com/TensorHub-ORG/Storydex/blob/main/apps/desktop/agent-runtime/skills/mystery-writing/SKILL.md | — |
| Bugnet — How to Design a Hint System | https://bugnet.io/blog/how-to-design-a-hint-system-for-puzzles | 2026-06-08 |
| Medium (Rizwan) — Connections Hints | https://medium.com/@sultanrizwan331/mashable-connections-hints-a-comprehensive-guide-acbe909be3a5 | 2025-11-15 |
| Menzel (Ubisoft SF), GDC — Solving Puzzle Design | https://media.gdcvault.com/gdc2016/Presentations/Menzel_Jolie_Level%20Design%20Workshop.pdf | 2016-03-21 |
| Gamigion — How to Design Difficulty | https://www.gamigion.com/how-to-design-difficulty-in-puzzle-games/ | 2025-01-06 |
| MysteryLocks — DIY Escape Room Puzzles | https://mysterylocks.com/blogs/diy-escape-rooms/diy-escape-room-puzzles | — |
| UCSB / Stanford d.school — Escape Room Toolkit | https://deeperlearning.education.ucsb.edu/sites/default/files/documents/Collab_Assessment/3.3%20Extension%20Option%20%233%20-%20Part%202%20-%20Escape%20Room%20Toolkit%20-%20Planning%20Your%20Puzzles.pdf | 2021-01-26 |
| steve-osborne-growth — Escape Room puzzle-design README | https://github.com/steve-osborne-growth/systems-architecture-public/blob/main/EXT-01-escape-room/components/puzzle-design/README.md | — |
| terabox — Escape Room Puzzle Design Rules | https://views.terabox.com/hub/what-makes-a-good-escape-room-puzzle-design-and-how-to-master-it | — |
| Classtime — Validate free-text answers | https://help.classtime.com/en/articles/37840-how-do-i-validate-free-text-answers-of-students | 2022-09-19 |
| UIW — Cardinal Quiz Converter Validation | https://help.uiw.edu/support/solutions/articles/17000197576-Cardinal-Quiz-Converter-Validation-Documentation | — |
| Sporcle — The Great Sporcle Puzzle Hunt | https://www.sporcle.com/blog/2013/02/the-great-sporcle-puzzle-hunt | 2013-02-24 |
| MIT — Thinking About A Puzzle | https://puzzles.mit.edu/resources/thinkingaboutpuzzles.html | — |
| crimeculture — Rules of the Game (Wayback) | https://web.archive.org/web/20170506124128/https://www.crimeculture.com/359/Rules.htm | 2017-05-06 (archive) |
| gadetection pbworks — More Commandments | http://gadetection.pbworks.com/w/page/7931102/More%20Commandments%20for%20Detective%20Fiction | — |
| ProProfs — Input Validation & Sanitization quiz | https://www.proprofs.com/quiz-school/quizzes/pp-secai-input-validation-and-sanitization-for-ai-quiz | 2026-08-13 |
| AEROSTUDIES — Connections tiered difficulty | https://jira.aerostudies.com/nyt-connections-answers-today-still-stuck-we-feel-your-pain-answers-inside | 2026-10-14 |

**Academic**

| Source | URL | Date |
|---|---|---|
| Kristensen — Operationalising Difficulty (ITU PhD) | https://pure.itu.dk/ws/portalfiles/portal/109068185/PhD_Thesis_Final_version_Jeppe_Kristensen.pdf | 2022 |
| Difficulty Modelling in Mobile Puzzle Games (arXiv) | https://arxiv.org/html/2401.17436v1 | — |
| Shen — Generalized Entropy / Solution Information | https://webdocs.cs.ualberta.ca/~nathanst/papers/shen24information.pdf | 2024-11-20 |
| He et al. — Adaptive Hint System (IEEE) | https://ieeexplore.ieee.org/document/10017301 | 2022 |
| He et al. — Adaptive Hint System (PDF) | https://faculty.washington.edu/weicaics/paper/papers/HaoHZC2022.pdf | 2022-08-09 |
| ACM — Data-Driven Hint Design | https://dl.acm.org/doi/10.1145/3025171.3025224 | 2017 |

**Encyclopedia (raw wikitext unless noted)**

| Source | URL | Date |
|---|---|---|
| Wikipedia — Detective fiction | https://en.wikipedia.org/wiki/Detective_fiction (RAW) | 2026-10-19 |
| Wikipedia — Whodunit | https://en.wikipedia.org/wiki/Whodunit (RAW) | 2026-10-19 |
| Wikipedia — Puzzle hunt | https://en.wikipedia.org/wiki/Puzzle_hunt | — |
| Wikipedia — MIT Mystery Hunt | https://en.wikipedia.org/wiki/MIT_Mystery_Hunt | — |
| Wikipedia — Ronald Knox | https://en.wikipedia.org/wiki/Ronald_Knox | — |
| Wikipedia — S. S. Van Dine | https://en.wikipedia.org/wiki/S._S._Van_Dine | — |
| Wikipedia — Golden Age of Detective Fiction | https://en.wikipedia.org/wiki/Golden_Age_of_Detective_Fiction | — |

**Known-inaccessible / unverifiable**

| Source | URL | Problem |
|---|---|---|
| Game Developer — "A Study Into Puzzle Design" | https://www.gamedeveloper.com/design/a-study-into-puzzle-design | HTTP 200; body is client-rendered, static HTML contains only site chrome. **Content unverified — do not cite.** |
| Game Developer — "Detective Game Design: Puzzles vs. Story (Lacuna Devlog)" | https://www.gamedeveloper.com/design/detective-game-design-puzzles-vs-story-lacuna-devlog- | HTTP 200; same client-rendered problem. **Content unverified — do not cite.** |

**Refuted / dead URLs (do not reuse)**

- `https://en.wikipedia.org/wiki/Fair_play_(literature)` — 404.
- `https://en.wikipedia.org/wiki/Three-clue_rule` — 404 (the rule is documented
  at The Alexandrian, not as its own Wikipedia article).

**Labelled `[GENERAL]` items.** Two claims in this document rest on general
craft knowledge rather than a fetched source, and are labelled in place: (a) the
framing of "difficulty is relational" in §7 is *also* explicitly supported by
the ITU thesis, so it is doubly grounded; (b) the phrase "three-tier ladder" is
used as a common-industry label for the escalating-hint pattern, supported in
§6 by the Mashable/Connections and Bugnet sources but not a single canonical
text. No other unsourced claims are made.

---

## 12. One-paragraph summary

Mystery design is a fairness contract. Knox and Van Dine fixed its durable
clauses (early culprit, plainly stated clues, no withheld essentials, no
accident or supernatural bail-out), and modern writers keep only those while
discarding the period prejudices. The information economy is governed by the
Three Clue Rule — at least three independent routes to each load-bearing
conclusion — with the explicit caveat that over-cluing is its own failure.
Red herrings are legal only if plausible, scene-fitting, and *resolved*. Hints
should be optional and escalating across three tiers, guiding rather than
spoiling. Difficulty is relational and must be calibrated against observed
attempts, times, and abandonment, not the designer's estimate. Physical events
add internal validation (including partial-answer prompts) and parallel flow.
And the answer matcher is itself a fairness mechanism: normalize by a published,
publicly documented rule, support a small declared list of alternates, and never
obfuscate the canonical answer.
