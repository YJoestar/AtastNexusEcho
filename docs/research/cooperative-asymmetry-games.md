# Cooperative & Asymmetric-Information Games — Design Research

**Purpose.** Design reference for NexusEcho's 3-role loop: Observer = field evidence,
Analyst = records/chronology, Operator = institutional/authority evidence; only the
Operator submits one final answer; a wrong answer gets one generic rejection that must
not reveal which inference failed. Five shipped asymmetric-information co-op games are
analysed for what transfers and what must not.

**Status.** Research notes. No source code modified. This is the only file produced.
**All sources accessed 2026-10-19** unless a publication date is stated.

---

## 0. Method and limitations (read before citing anything)

**Method.** `websearch` was unavailable for the whole session (every call returned
`Web search cancelled`). Substitute: direct HTTP queries against the DuckDuckGo HTML
endpoint (`https://html.duckduckgo.com/html/?q=...`) followed by fetching the result
pages themselves. Every claim attributed to a source was read from the fetched page,
not a search snippet, unless marked `(snippet only)`.

**Failed / incomplete — do not treat as verified:**

1. **GDC Vault is not a transcript.** `gdcvault.com/play/1023113/...` renders a video
   player plus title/speaker/track/overview. I could read the **abstract only**; the
   talk's actual argument was inaccessible.
2. **GDC slide PDF not readable.** `media.gdcvault.com/gdc2016/Presentations/Kane_Ben_Designing_Asymmetric_Gameplay.pdf`
   was located but the fetch layer rejected it (`Unsupported fetched file content type:
   application/pdf`). Not used.
3. **No Wikipedia article for Tick Tock: A Tale for Two** (HTTP 404). Sourced from the
   developer press kit plus two independent pages instead.
4. **Vendor sites are shallow.** `wewereheregames.com` and Rusty Lake's game page are
   marketing shells; the useful material is in press kits, devlogs and interviews.
5. **Anything labelled "inference" is my analysis, not a sourced claim.** Quotes prove
   what a designer said; they do not prove a design works.
6. **Reddit/Steam posts are anecdotal** and are used only to illustrate a failure mode.

**Role vocabulary** matches `src/app/config/index.ts`
(`ROLES = ['OBSERVER','ANALYST','OPERATOR']`; Observer "gathers visual intelligence",
Analyst "processes data / decodes signals", Operator "executes actions / bridges
physical and digital"). The single-submission, generic-rejection constraint is treated
throughout as the hard constraint that separates this design from the games studied.

---

## 1. Keep Talking and Nobody Explodes (Steel Crate Games, 2015)

*Sources: GDC Vault abstract (GDC 2016, Ben Kane); Voices of VR #98 (2015-03-04);
Wikipedia gameplay; Steam page; puzzlebyrinth essay (2026-07-22).*

**Asymmetry construction.** Split by *artifact*: the Defuser sees the bomb, the Experts
see the manual. Bomb state is procedurally generated; modules are independent and
disarmable in any order; some are conditional on bomb state (serial number, batteries,
indicators, current strikes) and some are multi-stage, forcing the Experts to remember
past actions (Wikipedia). The GDC abstract states the thesis: "at its heart is a game
about communication between players," aiming to keep players "talking in ways that
encourage tension, mistakes, hilarity, and occasionally even camaraderie." Difficulty is
manufactured *in the channel*: unnamed glyphs, homophones ("sees"/"seas"), filler
verbal tics, and ordinary command words ("press", "left") (Wikipedia). Kane confirms the
philosophy on Voices of VR: describing visual concepts was hard enough that they "did
not need misdirection or trick instructions." Noise sits outside the channel too: lights
out, alarm clocks, countdown, finite strikes.

**What makes it interdependent.** The manual holds **rules without state**; the bomb
holds **state without rules**. Every module needs a two-way crossing: bomb → descriptor →
manual rule → instruction → bomb action, often with a state-dependent second branch.
Kane: level design makes solo defusal "virtually impossible," and even the developers
struggle at the hardest settings. *Inference:* the mechanism is **indexing** — identifier
values (serial, batteries) are the shared key selecting which manual page applies; the
team must agree on the key before any rule can be evaluated. This is the most
transferable structural idea here.

**Forcing precise communication.** Three stacked costs: (1) *selection* — the Expert must
know which section applies, so the Defuser must relay the right identifying state;
(2) *translation* — glyphs have no stable labels, so the pair invents vocabulary
(puzzlebyrinth: "you can see it but cannot say it; you can hear it but cannot picture it
— that friction is the game"); (3) *reversibility* — wrong words produce wrong actions
and shared strikes. **Where it turns unfair (inference):** fair when the bomb exposes a
distinguishing feature the Defuser can recognise as relevant; unfair when relevance is
knowable only from the manual's internal taxonomy, so the Defuser truthfully describes
five things that cannot help. That is a **modelling mismatch between two documents**,
not a communication failure — and it is exactly what a 3-role investigation must avoid.

**Failure modes.** *Expert as relay* with one Expert (Wikipedia notes multiple Experts
are supported; Voices of VR says parallel reading is possible but sequential granular
communication is "the most efficient and effective approach"). *Defuser as babysitter* —
a fast Defuser outruns the Expert's confirmation. *One player carrying* — the manual is
finite and public, so a veteran can solo-recognise and reduce the Expert to a rubber
stamp; the community actively ranks the two roles (ktane subreddit, `(snippet only)`).
*Unproductive description* — homophones and glyphs guarantee some traffic establishes
vocabulary rather than solving. *Channel saturation* with large Expert groups.

**Recovery.** Independent modules allow a stuck module to be **parked** (state persists).
A finite **strike budget** converts a wrong answer into cost rather than verdict.
Retries are instant and blame-neutral: puzzlebyrinth — the board must "absorb the blame,"
so "the next attempt begins before blame can stick to any one person… you restart
laughing."

**Win/lose.** Binary per bomb (defuse/explode), progress-with-retry per session. Critically,
**no per-role verdict**: the strike counter is team-level. Kane: players "laugh a lot to
cope with the stress" and queue up again after failing badly.

**Transferable.** Shared identifier as join key; rules-without-state vs state-without-rules;
team-level penalty (shipped proof of generic rejection); deferrable sub-tasks; cheap,
blame-neutral retry; a *small, deliberate* amount of verbalisation difficulty.

**Do not copy.** Timed dexterity (punishes motor error, conflating it with inference); a
public memorisable rulebook (solo-solve leak); glyph-naming as the core difficulty.

---

## 2. We Were Here series (Total Mayhem Games, 2017–2026)

*Sources: Wikipedia; Game Developer "Road to the IGF" by Joel Couture (2018-02-05);
Game Developer developer diary by Lucia de Visser (2019-10-30); The Click (2026-10-05);
`wewereheregames.com` shell; puzzlebyrinth (2026-07-22).*

**Asymmetry construction.** Two players are physically separated with only a
walkie-talkie (Wikipedia). Roles are *situational and rotating* rather than fixed
classes, and We Were Here Together deliberately puts players in shared areas for parts of
the game — the designers vary separation on purpose. The Click (on *We Were Here
Tomorrow*) describes it best: "each Explorer has a distinct role, a different
perspective and their own high-tech tool," with different tools so that
"communication is joined by character-specific actions. That prevents the second player
from simply copying what the first person does" — different **verbs**, not only views.

**Interdependence.** Each side holds one half of a *single mechanism*: one player's
readout is the other's control, one player's route is the other's wall. The IGF interview
frames it as "talking each other through puzzles only one of them can see." puzzlebyrinth
classes it with KTANE ("Splitting the Information"): describing "crests and symbols they
have no names for while the other matches the description against their own room."
*Inference:* interdependence is **structural** (two halves of one device), not indexed —
stronger than KTANE against solo-solving, weaker against brute force.

**Forcing precise communication.** Symbols and rooms have **no shared names**, so the pair
builds an improvised lexicon (puzzlebyrinth's reward: the moment "the second one down,
the bird-looking one" gets through). The Click names the failure unprompted: "the
awkward moment when both people realise they have been describing different symbols for
several minutes." Community complaints (Reddit, `(snippet only)`) describe "much more
nearly identical details" and puzzles where "there is often no logic way to solve it.
Sometimes its random." **Unfair when** two candidates differ only in a detail the
describer cannot rank by relevance — precision pressure becomes guessing, with no manual
to arbitrate the intended distinguishing feature.

**Failure modes.** *The idle partner, developer-confirmed.* Van Hemert (IGF interview):
"The toughest part was balance. It proved quite difficult to put both players under stress
and have them solve a difficult challenge, **resulting in some less action-packed moments
for one of the players**." *Brute force* — with no timer/penalty in most entries, a stuck
pair can narrate everything until it connects. *Arbitrary logic* (community). Strength:
not solo-solvable at all — de Visser: "you cannot complete the game alone. Cooperation is
not optional!"

**Recovery.** Chapter checkpoints, no fail verdict; role rotation eventually reshuffles a
stuck division of labour; and recovery is designed rather than patched — Van Hemert:
they "practically built entire escape rooms, complete with real walkie-talkies, just to
prototype our concepts," testing "without writing a single line of code."

**Win/lose.** Progress. No timer, score or per-role grade — the clearest "you cannot lose,
you can only be confused" example, which is why the frustration that exists is purely a
channel property.

**Transferable.** Different verbs, not just views; one mechanism genuinely split in two;
prototype the channel in real life before coding; rotate the active role; state the
co-op-only constraint explicitly.

**Do not copy.** Unnamed, samey symbols as the main difficulty (the naming becomes the
puzzle); no pressure at all (exhaustive narration is optimal); role rotation as a
substitute for designing fixed roles.

---

## 3. Tick Tock: A Tale for Two (Other Tales Interactive, 2019)

*Sources: developer press kit `ticktockthegame.com/press` (release 2019-03-07);
Co-Optimus co-op page; Indie Hive review (2025-02-22). **No Wikipedia article (404).***

**Asymmetry construction.** Two separate copies on two devices, choosing "player 1" or
"player 2", with **no networking**: "the game itself… only runs locally on your device of
choice and does not connect to anything else" (Co-Optimus). Only a voice connection is
needed. Players see two similar-but-alternate worlds (two sisters, a clockwork world) and
"half of the clues on one and half on the other" (press kit quoting Eurogamer). Origin:
a 2016 research project by Tanja Tankred and Mira Dorthé on "how to create a narrative
for two."

**Interdependence.** Clues on one screen are the answer key to puzzles on the other;
"combine information on both players' screens" (press kit). Real but **one-directional per
puzzle** — read from A, act on B (inference from the puzzle types in Indie Hive:
time/clock, riddles, music).

**Forcing precise communication.** Mainly reading **exact values** (times, symbols,
sequences), not inventing vocabulary: "It is imperative for players to inform their
partner of what they can see, provide instructions and collaborate" (Indie Hive). The
channel is *narrow but sharp*. **Unfair (inference):** because the clue is often a
discrete value, one mis-read produces a wrong answer with no way for the acting player to
distinguish a mis-read from a mis-entry — no arbitration, no partial-credit signal.

**Failure modes.** *Relay roles are designed in* by the one-directional clue→answer
shape; Indie Hive praises accessibility ("simple mouse-only controls that are very
intuitive"), which also means low agency for the reader. *Silent mis-reads* with no
redundancy. *No pressure* — the "time is ticking" framing is thematic; reviews describe a
calm ~2–2.5 h experience with no fail state. Strength: not solo-solvable (two copies, two
screens required).

**Recovery.** Weakest of the five: no fail state, no documented hint system, no
partial-credit mechanism. Recovery is re-describe/backtrack (inference). Frustration is
bounded by brevity rather than solved.

**Win/lose.** Progress; narrative completion; no loss, no grade.

**Transferable.** Private copies with **no shared transport** (a hard anti-leak property —
no shared state can accidentally reveal another view); explicit chosen roles; short
sessions bounding frustration.

**Do not copy.** One-directional clue→answer puzzles (relay generators); discrete values
with no redundancy or arbitration; shipping with no recovery layer.

---

## 4. The Past Within (Rusty Lake, 2022)

*Sources: Rusty Lake devlog 4 (2021-09-23); devlog 6 (2022-06-08); Rusty Lake press kit;
Wikipedia; Eurogamer review by Matt Wales with Victoria Kennedy (2022-11-02).*

**Asymmetry construction.** One player in **the Past (2D)**, one in **the Future (3D)** —
a deliberate format asymmetry, "a first-time experience in the Rusty Lake universe"
(press kit). **Bidirectional causality:** "Clues in one time can affect puzzles in
another, and actions taken by future-based player affect the past-based one" (Wikipedia).
Cross-platform and offline; both need a copy plus a separate way to talk (press kit). Two
chapters, ~2 hours, designed for replay from the other perspective.

**Interdependence.** Devlog 4 is explicit: "in this game, every puzzle has to be solved
from 2 sides, so it needs to be tested on two sides… preferably by 2 new players every
time." Because the causal loop runs both ways, neither role can be a mere reader: each
side changes the other's available actions.

**Forcing precise communication.** The pressure is **environmental, not lexical** — two
people describing objects across two art styles and two dimensions. Devlog 6 documents the
channel as the production constraint: with two players on two devices in two environments,
"two people are playing (and at the same time communicating)… especially since you need to
hear what your partner is saying," so music and sound design had to be re-tuned around the
voice channel. This is the strongest documented example of a studio treating the channel
as the scarce resource.

**Failure modes — and the best anti-relay fix found.** Devlog 4 publishes playtest
feedback that is the key evidence here:

> "Love the communication aspect and having to talk through and describe things. Hopefully
> it will be a little more challenging and maybe some puzzles where **each person has to
> solve some things individually first.** Can't wait!"

The designers acted on it: puzzles became **two-phase** — each player solves a sub-problem
privately, then the joint step consumes both results. Devlog 4 also has a section titled
"A puzzle that didn't make the game," i.e. relay-feel and arbitrariness were caught in
playtesting, not in the design doc. Residual risk: Rusty Lake's house vocabulary of
symbols and ritual objects has no external referent, so a pair new to the series spends
channel budget on conventions the game leaves unstated (inference). The Eurogamer review
is itself a dialogue because "it's a game someone cannot review alone."

**Recovery.** Chapters give natural resets; **replay from the other perspective** (press
kit) is a *debrief* mechanism that shows each player the half they never saw, teaching the
system without assigning blame; a replayability mode gives fresh solutions. No hard fail
state is described.

**Win/lose.** Progress across two chapters. Structurally notable: the game is observably
2-player-only, and the two-reviewer format is the strongest proof that the information
sets cannot be merged.

**Transferable.** **Two-phase puzzles (private solve → joint resolve)** — the best
documented cure for relay roles; bidirectional dependency; treating voice as a budgeted
resource; two-sided playtesting with fresh pairs; post-case cross-perspective debrief.

**Do not copy.** A time hierarchy that makes one role omniscient (the "future knows what
the past did" fiction); requiring prior-series vocabulary to name things; relying on
brevity instead of designed recovery.

---

## 5. Operation: Tango (Clever Plays, 2021)

*Sources: Clever Plays press kit (release 2021-06-01); Wikipedia; IGN review by Luke
Reilly (updated 2022-03-21); Destructoid "The Agent's side" by Eric Van Allen
(2021-06-04); IGN Southeast Asia and Geek Culture `(snippet only)`.*

**Asymmetry construction.** Two fixed roles — **Agent** (physical/field) and **Hacker**
(virtual/databases) — "with only your voices to connect you" (press kit). Online-only, with
a Friend Pass so one purchase covers both players. The press kit states the thesis:
"**Combine skill sets from different points of view** to overcome challenges **focused on
communication, not difficulty**. These missions cannot be completed alone."

**Interdependence.** Each player's action unlocks the other's board; neither dataset
suffices. Destructoid's best moment is exactly the two-source model — identifying an item
in an archive by "cross-referencing our databases, making inferences and conclusions based
on **overlapping piles of evidence**." IGN: "each of you will generally only ever have
half the answers." **Note the precedent:** Agent = field/visual, Hacker = records/systems
is the closest shipped Observer+Analyst pairing — but there is no third
institutional-authority role and no single-submission gate. That gap is NexusEcho's design
space.

**Forcing precise communication.** Enforced by layouts, codes, files and routes. IGN calls
some puzzles "annoyingly silly" — the failure edge of forced precision, where players burn
time on a phrasing rather than a deduction.

**Failure modes — both named by reviewers.** *Role imbalance / idle partner:* IGN
Southeast Asia `(snippet only)` — "arguably a bit too much supplemental hacking regularly
required of the agent character"; IGN (US): "the agent will be required to dig through
computer files and do their own hacking. (There's probably a bit too much of the latter…)",
and the game is "short and a little shallow." *A band-aid for stalling:* Destructoid —
when a puzzle stalls, "things stall out, and this can feel a little brutal on the Agent
side"; the developers' answer was "a few distractions in some areas that let the player…
fiddle with various doodads or explore some lore while you talk over comms." *Inference:*
that is filler for an idle role, not an anti-carrier mechanism — a warning, not a model.
Also prominent: an "eliminating variables" loop where the Hacker narrates options for the
Agent to try (inference). Not solo-solvable (press kit).

**Recovery — the key precedent.** The game ships a **hint system**; Destructoid:
"there is a hints system that is pretty solid if you get really stuck. For comparison, we
used it once in the entire run of missions." A team-level hint, rarely needed, strong
enough to unstick, and **revealing no culprit** is the shipped precedent for "one generic
rejection, no role-blame."

**Win/lose.** Progress, with local stealth failure and checkpoint retries; six missions,
~2 evenings. No score, no per-role grade.

**Transferable.** "Communication, not difficulty" as an explicit thesis; cross-referencing
two evidence sets to reach one conclusion; a rarely-triggered team-level hint that names
no culprit; causal chaining of unlocks.

**Do not copy.** Filler distractions for the idle role; fixing imbalance by moving work
across roles (blurs evidence-class ownership); hints that solve the whole joint puzzle.

---

## 6. Comparative matrix

| Game | Asymmetry type | Communication requirement | Anti-carrier mechanism | Recovery mechanism | Transferable principle | Not transferable |
|---|---|---|---|---|---|---|
| **Keep Talking and Nobody Explodes** (2015) | Artifact split: bomb state vs rulebook, indexed by shared identifiers; procedural, independent modules. | Mandatory, real-time, sequential and granular; precision forced by conditional rules, unnamed glyphs, homophones. | Weak. Manual is public/memorisable; one Expert can degrade to relay. Mitigant: solo-solving made "virtually impossible" by design. | Shared strike budget (partial failure); independent modules allow deferral; instant blame-neutral retry; board "absorbs the blame." | Shared **index/join key**; rules-without-state vs state-without-rules; team-level penalty; deferrable sub-tasks; cheap blame-neutral retry. | Timed dexterity errors; public memorisable rulebook; glyph-naming as core difficulty. |
| **We Were Here** series (2017–2026) | Structural: two halves of one mechanism; different verbs/tools (Tomorrow); roles rotate per puzzle. Walkie-talkie only. | Mandatory, sustained; improvised vocabulary for unnamed symbols and rooms. | Partial. Different tools per role prevent copying; but devs admit one player gets "less action-packed moments"; rotation resets imbalance. | Chapter checkpoints; no fail verdict; role rotation; channel prototyped with real walkie-talkies before coding. | Different **verbs**, not just views; one mechanism split in two; prototype the channel; rotate the active role; state "co-op is not optional." | Unnamed/samey symbols as main difficulty; no pressure (brute-force narration); rotation as a substitute for role design. |
| **Tick Tock: A Tale for Two** (2019) | Two private devices, no networking; half the clues per screen; player 1 vs player 2; alternate worlds. | Required for values/symbols/sequences; **one-directional per puzzle** (read on A, act on B). | Weakest. Explicit role choice, but puzzles encourage "read the number, I'll type it" relay. | Minimal: no fail state, no documented hint system; bounded by short length (~2–2.5 h). | Private copies with **no shared transport** (hard anti-leak); explicit role ownership; short sessions bound frustration. | One-directional clue→answer (relay generator); discrete values without redundancy; no designed recovery layer. |
| **The Past Within** (2022) | Temporal/format: Past (2D) vs Future (3D), **bidirectional causality**; cross-platform, offline, external voice. | Required and heavy; two art styles to describe; devlog 6 re-tuned sound design around the voice channel. | **Strongest documented fix:** two-phase puzzles — private solve first, then a joint step that consumes both results (devlog 4 feedback, acted on). | Chapter resets; replay from the other perspective (debrief); replayability mode; two-sided QA with fresh pairs. | **Private-solve → joint-resolve**; bidirectional dependency; voice as a budgeted resource; two-sided playtesting; cross-perspective debrief. | A time hierarchy making one role omniscient; requiring prior-series vocabulary; relying on brevity instead of designed recovery. |
| **Operation: Tango** (2021) | Role split: Agent (field/physical) vs Hacker (virtual/records); online-only, voice only; closest Observer+Analyst precedent. | Required for codes, layouts, files, routes; thesis "focused on communication, not difficulty." | Weak-to-partial: reviewers flag role imbalance and the Agent doing "too much hacking"; devs added "doodads" — a warning, not a cure. | **Team-level hint system**, rarely used, strong enough to unstick, reveals no culprit (used once in a full run). | "Communication, not difficulty"; cross-referencing overlapping evidence; rarely-triggered generic hint; causal chaining. | Filler distractions for the idle role; fixing imbalance by moving work across roles; hints that solve the joint puzzle. |
| **NexusEcho target (3-role)** | Three evidence *classes*: field (Observer), records/chronology (Analyst), institutional/authority (Operator). One Operator submission. | Required, precision-critical; one **generic** rejection, never per-role. | To be designed (§7). Only acceptable mechanism: each role's output is another's prerequisite. | Proposed (§7). Precedents: KTANE shared strikes; Past Within chapters/debrief; Op. Tango generic hint. | Combine all five: join key + distinct verbs + two-phase private solve + team-level generic rejection + cross-perspective debrief. | Any per-role verdict; any authoritative role; any relay-shaped evidence transfer; any public shared answer key. |

---

## 7. Anti-patterns to avoid (for a 3-role investigation)

1. **Relay-only roles.** *Seen in:* Tick Tock's one-directional clue→answer; KTANE with one
   Expert; Op. Tango's "eliminating variables." If the Observer reads aloud for the
   Operator to type, the Observer is a UI element — and the no-verdict rule then hides that
   only one person is playing. **Counter:** two-phase puzzles; each role must *produce*
   something before any joint step consumes it. Transfer inferences, not data.
2. **Role-blame leakage.** *Seen in:* the *absence* of it in KTANE (team-level strikes) and
   in Op. Tango's blameless hint. A rejection that says "the records don't match" identifies
   the failed role, turning cooperation into status anxiety and encouraging withheld
   uncertainty. **Counter:** case-level language only — no role, artifact or evidence class.
   Even a diagnostic hint is a leak.
3. **One role can solve alone.** *Seen in:* KTANE's public memorisable manual (Kane had to
   engineer against it). Every role's asset must be necessary and **non-derivable** from the
   others: field evidence no record contains, chronology no authority document states,
   authority evidence with no field correlate. Verify with fresh players, Rusty Lake style.
4. **Arbitrary cipher conventions.** *Seen in:* We Were Here's unnamed crests ("nearly
   identical details"; "no logic way to solve it. Sometimes its random"); Rusty Lake's house
   vocabulary; KTANE glyphs (acceptable in a 5-minute party game only). The puzzle then tests
   shared naming luck, not investigation. **Counter:** every load-bearing item needs a
   speakable, disambiguating description, or the game supplies the convention in-world.
5. **Information that cannot be described verbally.** *Seen in:* the Click's pairs
   "describing different symbols for several minutes." Three roles across three screens
   multiplies this by three. Unnameable evidence is not asymmetry; it is noise. **Counter:**
   budget description time explicitly; make every artifact survive a blind verbal-description
   test.
6. **Per-role correctness verdicts (even implicit).** *Seen in:* nowhere in these five games
   — which is why it is the most dangerous item here; every game scores the *team*. Any
   per-role feedback gives teams a way to assign fault and therefore to protect themselves by
   withholding weak inferences. **Counter:** one submission, one rejection, zero attribution;
   if playtests show teams cannot form a hypothesis, add a case-level hint that narrows the
   search without naming a role.
7. **A role with nothing to do.** *Seen in:* We Were Here (dev-admitted idle stretches);
   Op. Tango (Agent idling, patched with "doodads and lore"). **Counter:** causal chaining
   plus two-phase private solve, so each role's sub-problem is a prerequisite for the next.
   Never add filler; change the dependency graph.
8. **A public, reusable answer key.** *Seen in:* KTANE's manual. A solved case becomes
   memorisable and the second play is a relay. Subtle risk: an institutional/authority
   evidence set is *supposed* to look like a rulebook, so if the Operator's evidence is a
   fixed lookup table the loop collapses into KTANE. **Counter:** case-specific keys —
   procedure must be understood, not looked up — and authority evidence must require the
   other two classes to be applied to it.
9. **No pressure at all.** *Seen in:* We Were Here and Tick Tock, where exhaustive narration
   is optimal play. **Counter:** a bounded, team-level budget (attempts or time-in-case) whose
   failure returns one generic rejection — KTANE's strike model applied to deduction instead
   of dexterity.
10. **Fixing imbalance by moving work between roles.** *Seen in:* Op. Tango's Agent doing
    "too much hacking" (IGN). Roles own *evidence classes*; duplicating Analyst work to keep
    the Operator busy destroys class distinctness and makes "whose inference failed?"
    unanswerable — or trivially answerable. **Counter:** fix the dependency graph; never
    reassign evidence class to fill dead time.
11. **A structurally omniscient role.** *Seen in:* The Past Within's load-bearing fiction
    that one timeline knows what the other did. An authoritative role collapses the triad into
    a two-role game with a narrator and enables blame leakage by construction. **Counter:**
    authority is *procedural*, not epistemic — the Operator holds the right to submit and to
    enforce institutional language, not privileged knowledge of the answer.
12. **Recovery that names the culprit or the answer.** Recovery that names the failing role
    is a per-role verdict by another name; recovery that names the answer deletes the loop.
    **Counter:** narrow the search at the case level ("re-examine the chronology against the
    field evidence") without naming a role or giving the answer.

---

## 8. Sources (all read 2026-10-19)

**Primary / developer**

- GDC Vault, *Designing Asymmetric Gameplay For 'Keep Talking and Nobody Explodes'*, Ben Kane,
  GDC 2016 — https://www.gdcvault.com/play/1023113/Designing-Asymmetric-Gameplay-For-Keep
  (mirror id 1023471: `.../1023471/Designing-Asymmetric-Gameplay-For-Keep`). **Abstract only.**
- Voices of VR #98, *Ben Kane on designing Keep Talking and Nobody Explodes*, 2015-03-04 —
  https://voicesofvr.com/98-ben-kane-on-designing-keep-talking-and-nobody-explodes/
- Rusty Lake, *The Past Within – Devlog 4*, 2021-09-23 — https://blog.rustylake.com/the-past-within-devlog-4/
- Rusty Lake, *The Past Within – Devlog 6*, 2022-06-08 — https://blog.rustylake.com/the-past-within-devlog-6/
- Rusty Lake press kit — https://press.rustylake.com/sheet.php?p=The%20Past%20Within
- Clever Plays press kit, *Operation: Tango* — https://www.clever-plays.com/presskit/operation_tango
- Other Tales Interactive press kit, *Tick Tock: A Tale for Two* — https://www.ticktockthegame.com/press
- Total Mayhem Games — https://www.wewereheregames.com/ (marketing shell)
- KTANE on Steam — https://store.steampowered.com/app/341800/Keep_Talking_and_Nobody_Explodes/

**Press / analysis**

- Joel Couture, *Road to the IGF: Total Mayhem Games' We Were Here*, Game Developer,
  2018-02-05 — https://www.gamedeveloper.com/game-platforms/road-to-the-igf-total-mayhem-games-i-we-were-here-i-
- Lucia de Visser, *We Were Here Together – Developer Diary*, Game Developer, 2019-10-30 —
  https://www.gamedeveloper.com/design/we-were-here-together---developer-diary
- JackF, *We Were Here Tomorrow Co Op: How Multiplayer Works*, The Click, 2026-10-05 —
  https://www.theclick.gg/we-were-here-tomorrow-co-op-how-multiplayer-works/
- *The Grammar of Solving Together — Co-op Puzzle Design and Information Asymmetry*,
  Puzzlebyrinth, 2026-07-22 — https://puzzlebyrinth.com/en/articles/coop-puzzle-information-asymmetry
- Matt Wales (with Victoria Kennedy), *The Past Within review*, Eurogamer, 2022-11-02 —
  https://www.eurogamer.net/the-past-within-review-rewarding-co-op-teamwork-with-a-fascinating-spin
- Luke Reilly, *Operation: Tango Review*, IGN, 2021 (updated 2022-03-21) —
  https://www.ign.com/articles/operation-tango-review
- Eric Van Allen, *It takes two to co-op Operation: Tango – The Agent's side*, Destructoid,
  2021-06-04 — https://www.destructoid.com/operation-tango-agent-side-co-op-impressions/
- Rachael Brearton, *Tick Tock: A Tale for Two*, Indie Hive, 2025-02-22 —
  https://indie-hive.com/tick-tock-a-tale-for-two/
- Co-Optimus, *Tick Tock: A Tale for Two (PC) Co-Op Information* —
  https://www.co-optimus.com/game/5598/pc/tick-tock-a-tale-for-two.html

**Encyclopedic**

- https://en.wikipedia.org/wiki/Keep_Talking_and_Nobody_Explodes
- https://en.wikipedia.org/wiki/We_Were_Here_(series)
- https://en.wikipedia.org/wiki/The_Past_Within
- https://en.wikipedia.org/wiki/Operation:_Tango

**Failed / unusable (recorded for honesty)**

- `https://media.gdcvault.com/gdc2016/Presentations/Kane_Ben_Designing_Asymmetric_Gameplay.pdf`
  — GDC slides located, rejected by the fetch layer (`application/pdf` unsupported). Not read.
- `https://en.wikipedia.org/wiki/Tick_Tock:_A_Tale_for_Two` — HTTP 404.
- `websearch` tool — unavailable all session ("Web search cancelled"); replaced with direct
  HTTP queries against `https://html.duckduckgo.com/html/`.
- IGN Southeast Asia Op. Tango review, Geek Culture announcement, KTANE/We Were Here Reddit
  threads — **snippet only**; used illustratively, never for conclusions.

---

## 9. Honest limitations

- **The GDC talk's content was never read** — only its abstract and a separate 2015
  interview. Claims about what it argues would be fabrication and are absent.
- **No game was played for this document.** All reports are from written sources plus
  inference; hands-on play could contradict the failure-mode analysis.
- **Community sentiment is anecdotal** and carries no evidentiary weight.
- **The NexusEcho mapping is a proposal, not a validated result.** The two-phase
  private-solve → joint-resolve pattern is the strongest evidence-backed anti-relay fix
  found, but none of these games implements the target configuration (three roles, one
  submission, one generic rejection). That configuration is untested precedent and must be
  prototyped and playtested before it is trusted.
