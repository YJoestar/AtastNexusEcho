# Deduction & Detective Games — Design Research for NEXUS ECHO

**Purpose.** Seven deduction/detective games, each studied for the mechanics that make
investigation *feel* like investigation, and for what transfers to NEXUS ECHO — an
outdoor, 3-player, QR-code investigation game where:

- **Observer** gathers field / physical evidence (the street, the scene, the object in hand),
- **Analyst** owns records, chronology, and relationships (the paper trail, the timeline),
- **Operator** owns institutional / authority / access evidence (the database, the registry,
  the permission nobody else has) and is the **only player who submits the single final answer**.

The research question throughout is not "what is a good detective game" but "what makes a
player *construct* a theory, hold it, doubt it, and kill it themselves." NEXUS ECHO's core
tension is that three people hold three partial views and no single phone can see the whole
picture — so every principle below is read through that lens.

**Method / honesty note.** Every game below is anchored to at least one real, fetched source
with URL and publication date recorded inline. Where a canonical first-party source was
JS-only or paywalled I say so and substitute a real alternative; I never invent a quote or a
citation. Several sections lean on **Game Maker's Toolkit, "What Makes a Great Detective
Game"** (Mark Brown, 11 Aug 2023, <https://gmtk.substack.com/p/what-makes-a-great-detective-game>)
because it names the shared design vocabulary (deduction vs. contradiction vs. investigation;
the "tester" problem) that the individual developer interviews then illustrate. One game
(The Operator) has a company homepage that could not be read in a text fetcher; that is
called out in its section rather than papered over.

---

## 1. The Case of the Golden Idol (Color Gray Games, 2022)

**Source.** Joel Couture, "Case of the Golden Idol's fill-in-the-blank detective work is
inspired by Return of the Obra Dinn," *Game Developer*, 1 Nov 2022,
<https://www.gamedeveloper.com/design/case-of-the-golden-idol>
(fetched; the article body renders mid-page behind heavy site boilerplate).

### What makes the investigation engaging (specific mechanics)
Golden Idol hands the player a **word cloud and a fill-in-the-blanks sentence sheet** rather
than an interrogation loop. Each scene is a frozen tableau full of objects, and the player
builds "deductions" by slotting supplied nouns/verbs into named blanks describing what
happened. There is no timer and no violence: the entire verb of the game is *filling in the
blanks correctly*. The studio deliberately designed the sheets so that adjacent scenes share
vocabulary, so the same word (a name, a place, a cause) must be reused across several
tableaux — the game rewards you for carrying a hypothesis forward.

### How the player obtains information
By inspecting a scene and reading its **character names, possessions, and physical
arrangement**. Information is public and simultaneous: the player can see every object in a
room and has the full word bank. What the game withholds is not the data, it is the
*relationship* between data points.

### What must be INFERRED, not received
The connective tissue: **who did it, in what order, and with what motive**. The game never
states the story; the player assembles it. Couture's interview is explicit that the team
built the sheets around "aha moments" — the design target is the instant a previously inert
noun suddenly becomes the answer to three blanks at once.

### How wrong theories are introduced and eliminated
Two mechanics do the killing:
1. **A distant error indicator.** When the player is close, the game signals that "two or
   fewer slots are incorrect" — it never says *which*. Near-miss feedback keeps a wrong
   theory alive enough to be interesting instead of resetting it outright.
2. **Red herrings and one-way clue paths.** Some clues are traps; some clues can only be
   reached one way, so a player who takes the other path genuinely lacks the evidence rather
   than merely failing to spot it.

### What creates the "aha"
The blank sheet converts scattered observation into a **sudden conjunction** — one newly
understood word lights up several blanks. The team described the design problem as *playtesting
without being able to un-know the answer*: they had to watch fresh players to find where the
aha was too early, too late, or absent.

### How narrative rewards correct deduction
Filling the sheet *is* the narrative. There is no separate cutscene payoff handed to the
player: the reward is a paragraph they wrote that now reads correctly, and the story mutates
from noise into prose. The studio also added **extra optional puzzles** for players who wanted
more inference than the main path demanded — a graded ceiling on difficulty rather than a
difficulty setting.

### Transferable to NEXUS ECHO
- **A shared "fill-in-the-blanks" answer artifact.** Operator submits one answer, but the
  three players can maintain a shared **theory board** of named slots (Who / Where / When /
  Method / Motive) that each role contributes evidence to. Operator's single submission is
  literally filling the final sentence — the roles differ in *which slots they can fill*, not
  in who "plays."
- **Near-miss feedback scoped to a role, not a global answer.** The player-facing game can
  give the *Analyst* a soft signal ("one of your timeline anchors is wrong") without naming
  it, killing a bad theory slowly instead of snapping it back.
- **Red herrings with exactly one legitimate path** are cheap to author: a decoy object the
  Observer can photograph that looks probative but is never referenced by any blank.
- **One-way clue paths** map cleanly onto the role split: some evidence is only reachable if
  the Operator uses institutional access, and some only if the Observer physically stands in
  the right place — so *no single role can complete the sheet alone.*

### What NOT to copy
- **The full word bank.** Golden Idol tells you which nouns are possible; that is a huge
  affordance. NEXUS ECHO should mostly *withhold* the candidate set, or the puzzle collapses
  into a matching exercise.
- **Sheet-adjacent scenes with shared vocabulary.** Deliberate cross-scene word coupling is a
  puzzle-authoring luxury that a 3-player game split across physical space cannot rely on.
- **A single-player mental model.** Golden Idol assumes one brain holding all state. NEXUS
  ECHO cannot; it must design for *incomplete* state by construction.

---

## 2. Return of the Obra Dinn (Lucas Pope, 2018)

**Sources.** Bryant Francis, "For Lucas Pope, Return of the Obra Dinn was 'a bunch of appealing
design problems'," *Game Developer*, 26 Nov 2018,
<https://www.gamedeveloper.com/design/for-lucas-pope-i-return-of-the-obra-dinn-i-was-a-bunch-of-appealing-design-problems>
(fetched); plus GMTK (op. cit.) for the confirmation-feedback critique.

### What makes the investigation engaging (specific mechanics)
The game is a **rigid matrix of identities**. The player has a book of fates with a row per
crew member/passenger and columns for *who they are* and *how they died*. The marquee design
decision, per Pope in the interview, was **shifting the core from "how did they die" to "who
are they"** — identity, not cause, became the load-bearing question. You are not solving one
murder; you are solving ~60 tiny identity puzzles that share a space.

### How the player obtains information
The player carries a **Memento Mortem** pocket watch into a corpse and is dropped into a frozen
frozen tableau of that person's final seconds — a **vignette** of dialogue and positioning. The
player can rotate the scene, listen, and step backwards (in the vignette sequence) to witness
the moments before. Crucially, each new body reveals its vignette whether or not the player
has figured out the *previous* one.

### What must be INFERRED, not received
**Names-to-faces** and **causes**. The vignettes supply behaviour and speech but rarely say
"this is the bosun." The player must cross-match: a mentioned name in vignette A, a uniform in
vignette B, a cabin assignment in vignette C — evidence for one identity is scattered across
several vignettes and the ship's manifest.

### How wrong theories are introduced and eliminated
- The **manifest/crew list** provides the hypothesis space, and multiple crew share roles,
  nationalities, or surnames — genuine ambiguity, not fake difficulty.
- **Confirmation is deferred and batched.** GMTK's critique is important here: the game
  confirms a set of fates as "correct" only once a *group* is complete, so a wrong entry can
  sit in the book without immediate rejection. That is deliberate — it lets a player hold a
  plausible wrong theory long enough for the eventual correction to land.
- **Generic questions (`How?` / `Where?`) are used deliberately.** Pope asked *unleading*
  questions so the player is never prompted toward the answer; GMTK formalizes this as the
  **"tester"** requirement — a good deduction game must not prompt, lead, or allow brute force.

### What creates the "aha"
A vignette you saw early suddenly re-reads in light of a name you learned late. Because
vignettes are revisitable and non-linear, the "aha" is *retroactive*: the evidence was always
on screen; only its meaning changed.

### How narrative rewards correct deduction
The reward is **closure per identity** — each correct fate locks in and the survey completes.
The final act converts the accumulated matrix into a single narrative event (the ship's fate),
rewarding the player who did the grunt work of naming rather than the fastest.

### Transferable to NEXUS ECHO
- **Make the answer a matrix, not a sentence.** NEXUS ECHO's Operator could submit a small
  grid (Person × Role × Action × Location × Time) rather than one line — this is the single
  most copyable mechanic for a game with three evidence specialties.
- **Generic, unled questions.** The Operator's submission UI should ask *Where?* / *With what?*
  and populate options from discovered evidence, never "which of these two is the killer."
- **Cross-referenced, revisitable evidence.** The Observer's photographs and the Analyst's
  records should be **re-openable and re-readable** at any time, so late information can
  retroactively re-light earlier evidence (the retroactive aha).
- **Batched confirmation.** Do not tell a role after each clue whether they are "right"; confirm
  only at the final submission, or at coarse checkpoints. This preserves productive doubt.

### What NOT to copy
- **60-person cast.** Player-count-appropriate: NEXUS ECHO has three investigators and a
  handful of suspects, not a ship's crew. The matrix must be *small and dense*.
- **Silent, purely-diegetic onboarding.** Obra Dinn assumes hours of patience. A phone-based
  outdoor game needs to first-teach its core verb in the first few minutes.
- **No partial credit.** Obra Dinn is all-or-nothing per entry; a 3-role game benefits from
  *partial* progress visibility so all three roles stay engaged.

---

## 3. Her Story (Sam Barlow, 2015)

**Source.** Simon Parkin, "'Powerful stories require ambiguity' — a story about Her Story,"
*Game Developer*, 16 Mar 2016,
<https://www.gamedeveloper.com/design/-powerful-stories-require-ambiguity-a-story-about-i-her-story-i->
(fetched).

### What makes the investigation engaging (specific mechanics)
The entire interface is a **1990s police video database with a search bar**. The player types
a word; the database returns up to five clips containing that word; you watch them, harvest new
words, and search again. There is no overworld, no map, no inventory. The mechanic *is* the
search engine — the player's theory is literally encoded in the terms they choose to type.

### How the player obtains information
**By keyword.** ~300 short interview clips are dispersed and only reachable by the right search
term. The player's vocabulary is the map. Clips are **deliberately non-chronological**, so
partial context keeps the player hunting for the one clip that reframes the rest.

### What must be INFERRED, not received
**Almost everything.** Parkin's interview foregrounds *ambiguity* as the design thesis: the game
deliberately refuses to confirm whether two characters are one person or two. The narrative is
an **iceberg** — what is on screen is the visible tip; the player infers the submerged mass
(an affair, an obsession, a possible murder) from subtext and repetition, not exposition.

### How wrong theories are introduced and eliminated
By **disconfirming clips the player must go looking for.** A theory ("she did it") survives until
a term the player hasn't thought to type yet returns a clip that contradicts it. There is no
in-game "wrong" buzzer; elimination is entirely player-driven. A late twist in the interview's
own telling is described as something that "reboots the simulation" — i.e. it invalidates the
player's prior mental model wholesale.

### What creates the "aha"
**Recontextualisation.** The same clip, seen after learning one new fact, means something else.
Parkin frames this as the "imagination engine": the game intentionally leaves room for the
player to fill, and that filling is the pleasure.

### How narrative rewards correct deduction
The `>` ending is deliberately **not a confirmation screen**. The reward is that the player has
assembled a coherent story and can now *argue for it*, with the residual uncertainty intact.
This is the opposite of a victory cutscene.

### Transferable to NEXUS ECHO
- **Make search/query part of the fiction.** The Analyst doesn't "get a hint," they get a record
  database they must *query*. The act of choosing a query is itself the deduction, and a wrong
  query returns nothing rather than a correction.
- **Ambiguity as a resource, not a bug.** NEXUS ECHO should leave at least one relationship
  genuinely two-ways-readable until the final submission — that is what makes three players
  argue productively.
- **Non-chronological records.** Give the Analyst unordered documents, not a tidy timeline; the
  chronology is the Analyst's *inference*, not their input.
- **Contradiction-clips as the kill mechanic.** Seed one record that only refutes a tempting
  theory, findable only by the right query — a wrong theory dies because the player *chose* to
  look, not because the game told them.

### What NOT to copy
- **No confirmation at all.** Her Story is single-player and intentionally unresolved; NEXUS
  ECHO needs a definite, checkable final answer for the Operator or the game has no ending.
- **Text-only search as the sole verb.** On phones, outdoor, in a group, a pure typing loop will
  lose the Observer entirely — search must be one modality among several.
- **350-clip volume.** Not authorable at this scope; the principle (dispersed, findable-by-term
  fragments) is what transfers, not the count.

---

## 4. Telling Lies (Sam Barlow, 2019)

**Source.** Sam Barlow, "Deep Dive: Telling Lies — making a mechanic out of scrubbing video,"
*Game Developer*, 8 Oct 2019,
<https://www.gamedeveloper.com/design/deep-dive-i-telling-lies-i---making-a-mechanic-out-of-scrubbing-video>
(fetched — developer-written deep dive).

### What makes the investigation engaging (specific mechanics)
The core mechanic is **video scrubbing as traversal**. The player has a database of video calls
and types a search term to surface a conversation. Then the real mechanic kicks in: you *drag
the playhead* and the footage is a fragile, imperfect recording — scrubbing has **friction and
inertia**, so you can't frictionlessly skim. You are dropped **in media res**, mid-conversation,
with no start marker, and must scrub *backwards* to find how the call began.

### How the player obtains information
**By scrubbing and by subtitle-visible scanning.** Barlow notes that subtitles are rendered so
the player can read across a scrubbed timeline — text-as-overview while audio/visual scrubbing
is the precision tool. Searching a term lands you somewhere in a call; the rest of that call is
found by scrubbing the recording.

### What must be INFERRED, not received
**Truth vs. lie** (the title says it), and **the relationship map across many speakers**. Calls
are one-sided snapshots of a wider set of relationships; the player infers the off-screen half.
Facts are also acquired *out of order* by design, so causal chains are inferred, not delivered.

### How wrong theories are introduced and eliminated
Because you arrive mid-call, **a fragment read alone is systematically misleading**. The kill
mechanic is *finishing the scrub* — going to the start or end of the call you only half-saw. The
player eliminates a bad reading by spending the effort to recover the surrounding context they
were denied at entry. Barlow is explicit that the intended feeling is **active effort, not
FOMO**: friction is what makes the found information feel earned.

### What creates the "aha"
**The context you find by scrubbing backwards.** The line that seemed hostile becomes protective
once you hear the two sentences before it. The "aha" is mechanically *the reward for friction*.

### How narrative rewards correct deduction
Correct reading unlocks **new searchable terms** (a name, a URL) that open new calls, so
understanding compounds: comprehension is literally the key to the next door.

### Transferable to NEXUS ECHO
- **Friction as an anti-brute-force device.** Do not let a role "reveal all evidence." Gate a
  piece of evidence behind doing the *work* — physically walking back to a QR, or re-opening a
  record and reading past the first paragraph. The Operator's final answer is only fair if the
  other two roles did frictionful work to assemble it.
- **In-media-res evidence.** Hand the Analyst a fragmentary document (a page starting mid-sentence)
  and make them find its start; hand the Observer a partial photo they must complete by standing
  somewhere else.
- **Subtitles-as-overview.** On phones, a collapsed text view of a long record is the scrubber
  equivalent: greppable, skimmable, but the *detail* needs the full open.
- **Compounding unlocks.** A correctly read record should reveal a *new query* — a name, an
  address, a badge number — that opens the next piece of evidence. This is the cleanest way to
  make the three roles *chain* into each other.

### What NOT to copy
- **Real-time video volume.** Not authorable; the *steering-with-friction* idea transfers, the
  FMV production budget does not.
- **A single player doing all the scrubbing.** In NEXUS ECHO one role must not be able to scrub
  through everything; the friction must be *distributed* (each role can only do their own kind
  of work).
- **Deliberate non-resolution as a tone.** Telling Lies can afford an uneasy ending; an outdoor
  team game with a submitted answer needs a crisp, fair verdict.

---

## 5. The Operator (Bureau 81, 2024)

**Sources.** Joel Couture, "The Operator is a crime-solving game delivered entirely with UI,"
*Game Developer*, 10 Sep 2024,
<https://www.gamedeveloper.com/design/the-operator-is-a-crime-solving-game-delivered-entirely-with-ui>
(fetched); Adam Cook, "The Operator announced — detective puzzler coming later this year,"
*GodisaGeek*, 20 Mar 2024,
<https://godisageek.com/2024/03/the-operator-announced-detective-puzzler-coming-later-this-year/>
(fetched).

**Honesty note on sourcing.** The developer's own site, <https://bureau81.com/>, serves a
JavaScript-only page that a text fetcher returns *nothing* for (it renders client-side). It is
recorded here as **not successfully read**, and the two fetched articles above stand in for it.
Neither of those two sources is a first-party design post-mortem; they are interviews/previews.

### What makes the investigation engaging (specific mechanics)
The whole game is an **FDI (Federal Department of Intelligence) analyst workstation**: fake
software screens. Per the GodisaGeek preview the toolkit includes a **Video Analyzer, Photo
Analyzer, Citizen Database, Vehicle Database, ChemScan, Notepad, and a console**. Couture's
piece stresses the design thesis: **the player is the analyst, and the analyst has a better
overview than the field agents do.** You never visit a crime scene; you look at what the agents
brought back and run it through the software.

### How the player obtains information
**By operating institutional tools.** You take a piece of evidence (a photo, a substance, a
plate) and *run it* through the appropriate system, which returns a database match. Information
is obtained by correctly routing an input to the right tool. Couture notes the systems are
**woven into the story** rather than bolted on — the toolset itself is part of the fiction
(you're using the department's software, which has permissions and quirks).

### What must be INFERRED, not received
**Who is lying, and what the agents missed.** Couture's standout example: a character claims a
wife who **does not exist** — the game plants a detail that the player only notices by
cross-checking a database entry that should have corroborated it and doesn't. The inference is
the *absence* of a record, not the presence of a damning one.

### How wrong theories are introduced and eliminated
By **running the wrong tool on the right evidence, or the right tool and reading only the first
screen.** Couture notes the game **hides secrets in plain view** — a database row that is
correct-looking but internally inconsistent is the kill mechanic. Because access is tiered
(different systems, different permissions), a theory can survive simply because the player
hasn't yet run the check that would break it.

### What creates the "aha"
**Cross-system contradiction.** A name exists in one system and not in another; a chemical scan
comes back "this is not what the witness said it was." The aha is administrative: the player
realises the *paperwork itself* is the lie.

### How narrative rewards correct deduction
New access and new case files unlock as competence is demonstrated; the story escalates
institutionally. Getting it right is rewarded with **more authority** — a bigger toolset and a
clearer picture of the conspiracy — which is a very fitting reward for an "operator" fantasy.

### Transferable to NEXUS ECHO
This is the **closest structural analogue to the Operator role**, and the most directly
copyable game in the set.

- **Evidence is an input; a tool is a verb.** The Operator shouldn't be given answers — they
  should get scanned artifacts (an ID photo, a plate, a signature) and a small set of query
  tools that return matches. Routing input→tool is the gameplay.
- **Sprinkle institutional texture into the tool.** A tool that occasionally says "record
  sealed / access denied" is more interesting than one that always answers, and it makes the
  Operator's *access* feel like a real power.
- **Design for negative evidence.** The single best puzzle in this genre is a corroborating
  record that is *missing*. NEXUS ECHO should include at least one "the database has no row for
  this person" beat — perfect for the Operator specifically, since only they can check.
- **Secrets in plain view.** Put the contradiction in a normal-looking row the Operator has
  already read, so the "aha" is a *re-read*, not a new discovery.
- **Reward with escalated access.** Let the Operator's competence unlock a deeper institutional
  query — mechanically identical to "reputation" in NEXUS ECHO's fiction.

### What NOT to copy
- **Couture's subject is a solo analyst.** In NEXUS ECHO the Operator must *depend* on the
  Observer and Analyst for the raw inputs to run; do not let the Operator's toolkit also contain
  the field evidence.
- **UI-only as a whole game.** NEXUS ECHO's Observer is physical and outdoors; the Operator's
  console can be UI-heavy precisely *because* the other two roles aren't.
- **Bureau-81's opaque product site is not a design text.** Do not cite it as one; the honest
  sources are the two articles above.

---

## 6. Shadows of Doubt (ColePowered Games, 2023)

**Sources.** Cole Jefferies, "Shadows of Doubt DevBlog #4: Case Folders & Cork Boards,"
*ColePowered*, 2 Jul 2018,
<https://colepowered.com/shadows-of-doubt-devblog-4-case-folders-cork-boards/> (fetched);
GMTK (op. cit.) for the procedural investigation critique.

### What makes the investigation engaging (specific mechanics)
A **procedurally generated city** where you play a private investigator with no scripted case.
The marquee UI is a **skeuomorphic case folder / corkboard**: you pin evidence (photos, notes,
testimony, IDs) and **connect them with strings**. Jefferies records the encoding: the string's
**colour indicates the type of incrimination** and its **width indicates reliability** — the
board is a literal visual model of the player's theory, and incrimination **flows outward from
key evidence**.

### How the player obtains information
By **many redundant routes**. GMTK's analysis names the killer feature: a needle-in-a-haystack
search where a suspect can be traced **several different ways** — fingerprints, CCTV, phone
records, shoe size, blood type — and each route is a legitimate path to the same person. The
player picks a route based on the evidence in hand rather than being funnelled.

### What must be INFERRED, not received
**Identity and guilt.** Because citizens are procedurally generated, no human wrote "this is the
murderer's backstory." The player infers the culprit from converging partial identifiers, and
the game's red herrings are *emergent* (coincidental matches) rather than authored.

### How wrong theories are introduced and eliminated
**Convergence.** A theory built on one identifier (shoe size) is fragile; the Player must
corroborate with a second independent identifier before the board's string "thickens." False
leads are generated by the same procedural system as true ones — the player eliminates them by
**failing to find a second converging route**, not by being told they're wrong.

### What creates the "aha"
**The moment two independent evidence routes point at the same face.** That is the game's whole
emotional payload, and it is exactly the "two independent chains converge" feeling GMTK holds up
as the goal of the deduction genre.

### How narrative rewards correct deduction
Accusation closes the case; the reward is **the solving of a puzzle that the game didn't
hand-write** — the sandbox validates your reasoning by the culprit's identity matching the
evidence you built. GMTK contrasts this with *Paradise Killer*'s one-shot accusation (no
right/wrong confirmation) and *Golden Idol*'s step-by-step confirmations: Shadows of Doubt sits
in the "you may accuse wrongly and the world responds" middle.

### Transferable to NEXUS ECHO
- **The corkboard is the multiplayer artifact.** A shared theory board where each role's
  evidence appears as a different **colour of string**, with **width = reliability**, is the
  single best UI idea for a 3-player split-evidence game. I could not sketch a better
  representation of "we each hold a different kind of evidence."
- **Redundant routes.** Give each of the three roles at least one independent route to the same
  core fact — the Observer by physical trace, the Analyst by record, the Operator by registry —
  so a fact is *strong* when confirmed twice and *fragile* when confirmed once. This is the
  cleanest way to make the three roles matter without any one being load-bearing.
- **Eliminate by failing to converge.** Do not build a "wrong!" screen. Let a false lead die
  because the second route doesn't exist and the player *notices* it doesn't.
- **Emergent-feeling red herrings.** Author decoys that are procedurally plausible in-fiction
  (a person whose description matches) rather than cartoonishly suspicious.

### What NOT to copy
- **Procedural generation.** NEXUS ECHO is a hand-authored, one-instance, real-world event;
  procedural citizens are the opposite of what a physical QR trail needs.
- **A single investigator doing everything.** Shadows of Doubt has one player walking all
  routes; NEXUS ECHO's entire premise is that nobody can. The board transfers; the solo
  traversal does not.
- **No confirmation ever.** A one-shot accusation with no feedback (Paradise Killer's model, per
  GMTK) is a bold choice for a solo art game; a 3-person outdoor game with a submitting Operator
  needs *some* confirmation surface, even if coarse.

---

## 7. Unheard (NExT Studios, 2019 / Voices of Crime Edition 2023)

**Sources.** GamingAudioNews, "NEXT Studios announces audio-driven narrative-based detective
game Unheard," 19 Dec 2018,
<https://gamingaudionews.com/2018/12/19/next-studios-announces-audio-driven-narrative-based-detective-game-unheard/>
(fetched); The Indie Game Website, "Innovative detective game Unheard announced," 18 Dec 2018,
<https://www.indiegamewebsite.com/2018/12/18/innovative-detective-game-unheard-announced/>
(fetched); Steve Perrin, "(Mini) Game Review: Unheard – Voices of Crime Edition," *Little Bits of
Gaming*, 16 Apr 2023,
<https://littlebitsofgaming.com/2023/04/16/mini-game-review-unheard-voices-of-crime-edition/>
(fetched).

**Honesty note on sourcing.** A widely-circulated Medium article ("Unheard — how a narrative is
woven into the mystery," <https://medium.com/game-design-fundamentals/unheard-how-a-narrative-is-woven-into-the-mystery-fb7824f9548a>)
**returned HTTP 403 to the fetcher** and could not be read; it is not cited as evidence here. I
also attempted a guessed Game Developer URL for Unheard, which turned out not to exist (it
redirected to the site's `/design` index) — also not cited. The three sources above are the
verified ones.

### What makes the investigation engaging (specific mechanics)
You are an **"acoustic detective"** with a device that returns you aurally to a crime scene. The
screen shows a **top-down blueprint** of the location with outlines and positional markers; you
hear voices and can walk between marked positions to listen to different people. There is **no
sight**: the entire evidence stream is a conversation you overhear, sometimes only one side of
it. The design intent, per creative director Nick Zhang, is "a true tribute to the radio dramas
of old" — the player "must really embody a detective using logic, reasoning and deductive power."

### How the player obtains information
By **listening, re-listening, and positioning**. The first job is **putting names to voices** —
Perrin's review describes exactly this: you hear people talking, have no idea who is who, and
must infer the mapping from one-sided conversations. Because the scene is **real-time**, things
happen elsewhere while you listen here: you get partial audio and must **rewind time and
reposition** to hear the other half.

### What must be INFERRED, not received
**Identity of voices, the relationship map, and motive.** Perrin's worked example (case one) is
ideal: two **twin brothers**, one possibly impersonating the other, and the question of which
planted the drugs. You only ever hear **one side** of a conversation at a time, so you must hold
brother A's account in memory while you rewind and hear brother B's, then reconcile them.

### How wrong theories are introduced and eliminated
**By re-listening from the other position.** A one-sided account is *systematically* misleading;
the kill mechanic is *going back and hearing the other side*. The game formalises this into an
**"ongoing moments" / non-linear branch** structure — the same real-time window is replayed from
different places and with different people, and only cross-referencing all of them lets you
single out the culprit.

### What creates the "aha"
**Voice-to-name resolution.** The instant a set of utterances across two positions resolves into
"*that* voice is *this* person" is the game's core aha; everything else (motive, culprit)
cascades from it. Perrin notes the difficulty ramps from a 2.5-minute first case to an hour-plus
of careful cross-referencing — the aha scales with the size of the voice map.

### How narrative rewards correct deduction
Cases are **tied together into a larger story** that "makes more sense as the game progresses" —
the individual crime is solved, but the connective tissue between seemingly unrelated cases is
the long-arc reward. You single out the responsible person in the fiction's own device framing.

### Transferable to NEXUS ECHO
- **One-sided evidence is a superb 3-player mechanic.** Unheard's single best idea maps directly:
  give each role a *one-sided* view. The Observer sees *what is physically present* but not *what
  it means*; the Analyst sees *what is recorded* but not *what happened in the room*; the Operator
  sees *what the institution believes* but not *what is true*. Each role holds one side of the
  same conversation, exactly as Unheard's brothers do.
- **Identity resolution as the first puzzle.** Make "who is who" the opening act for all three
  roles — a name to a face (Observer), a name to a record (Analyst), a name to a badge/registry
  entry (Operator). Unheard proves this is legible and satisfying on its own.
- **A real-time spine with rewind.** A shared clock the players can "rewind" (revisit a location,
  re-read a record with new context) is a cheap, strong way to make late information retroactive.
- **Blueprints with positional markers.** The Observer's map/blueprint idea — a schematic of the
  field with evidence pinned to positions — is a good shared artefact for NEXUS ECHO's phone UI.

### What NOT to copy
- **Audio-only.** NEXUS ECHO lives outdoors with QR codes; sight is unavoidable, and Unheard's
  audio-only purity would be lost anyway. Take the *one-sided* structure, not the sensory
  deprivation.
- **Real-time simultaneity as the only spine.** Unheard's real-time world is elegant but demanding;
  a 3-player field game needs asynchronous tolerance (players move at different speeds).
- **No subtitles for accessibility, per Perrin's own niggle.** NEXUS ECHO must ship text
  alternatives (this is both an accessibility and a group-coordination requirement).
- **Voice-acting-led production.** The *structure* of one-sided conversation is transferable; the
  fully voiced radio-drama production budget is not.

---

## Comparative matrix

| Game | Information model | Unit of deduction | How wrong theories are killed | Narrative reward | Transferable principle | NOT transferable |
|---|---|---|---|---|---|---|
| **The Case of the Golden Idol** | Simultaneous scene observation + supplied word bank | A fill-in-the-blanks sentence sheet ("deduction") per scene | Distant near-miss indicator ("≤2 slots wrong"), red herrings, one-way clue paths | The sheet you wrote now reads as correct prose; optional extra puzzles | Shared slot-based theory board; Operator's single answer = filling the final sentence; near-miss feedback scoped to a role | The full word bank; cross-scene shared vocabulary; single-brain mental model |
| **Return of the Obra Dinn** | Frozen vignettes from each corpse + ship manifest | An identity/cause matrix (Person × Who × How) | Batched group confirmation, genuinely ambiguous shared roles, generic unled questions | Per-identity closure locking in; final ship-fate event | Answer as a *matrix*, not a sentence; generic "How?/Where?" questions; revisitable evidence for retroactive ahas; defer confirmation | 60-person cast; pure diegetic silent onboarding; all-or-nothing per-entry scoring |
| **Her Story** | Keyword-searchable, dispersed, non-chronological clip database | A typed search term / the player's vocabulary | Disconfirming clips the player must *choose* to search for; no in-game buzzer | No confirmation — a coherent story you can argue for, ambiguity intact | Search/query as part of the fiction; ambiguity as a resource; non-chronological records; a contradiction only findable by the right query | No confirmation at all; text-only single verb; 350-clip volume |
| **Telling Lies** | Scrubbable video calls, entered in media res, subtitle-overview | A recovered call fragment + its surrounding context | Friction: you must scrub to the start/end to kill a misleading mid-call reading | New searchable terms unlock new calls — comprehension compounds | Friction as anti-brute-force; in-media-res fragments; subtitle-as-overview; compounding unlocks chained across roles | Real-time FMV volume; one player doing all scrubbing; deliberate non-resolution as tone |
| **The Operator** | Tiered institutional software (DBs, analyzers, scanners) + field-collected inputs | Routing an artifact into the correct tool, then reading the returned row | Running the wrong tool, or reading only the first screen; contradictions *inside* normal-looking records | Escalated access and new case files — competence rewarded with authority | Evidence as input, tool as verb; institutional texture/"sealed"; negative evidence (missing row); secrets in plain view; reward with access | Solo analyst (Operator must depend on the other two roles); UI-only as the whole game; Bureau-81's opaque site as a design text |
| **Shadows of Doubt** | Procedural city; fingerprints/CCTV/phone/shoe/blood as independent routes | The corkboard: pinned evidence connected by coloured, width-coded strings | Convergence — a single-route theory dies when no second route corroborates it | Case closure on a puzzle the game never hand-wrote | Corkboard with per-role string colour + reliability width; redundant routes so a fact is strong only when confirmed twice; eliminate by *non*-convergence | Procedural generation; a single investigator walking all routes; never confirming anything |
| **Unheard** | Audio-only, positioning-based, real-time blueprint with "ongoing moments" | Voice-to-name resolution → relationship map → culprit | Re-listening from the other position: the other half of a one-sided account | Cases interlock into a larger story that pays off over the campaign | One-sided evidence per role (each holds half a conversation); identity resolution as act one; rewindable real-time spine; blueprint with positional markers | Audio-only senses; real-time-only spine; no subtitles/accessibility gap; voiced radio-drama budget |

---

## Top 10 actionable principles for NEXUS ECHO

Each principle names its source game and states something concrete enough to build.

1. **Make Operator's submission a small matrix, not a single sentence.**
   *(Obra Dinn)* — Submit a grid of Person × Role × Location × Time × Method. The three roles
   each contribute *whichever cells their evidence type can fill*; Operator fills/validates the
   rest and submits. This gives the Operator a real job beyond "press send" and lets the other
   two roles see their fingerprints on the answer.

2. **Build a shared corkboard where each role's evidence is a different string colour, thickness
   = how many independent routes confirm it.**
   *(Shadows of Doubt)* — Observer = field/physical trace, Analyst = document/record, Operator =
   institutional/registry. A link confirmed by two roles renders thick; a single-role link is a
   thin, obviously fragile thread. This is the single highest-value UI idea in this research.

3. **Give every core fact at least two independent routes, one per role.**
   *(Shadows of Doubt)* — E.g. the culprit's identity is confirmable by a physical trace
   (Observer), a written record (Analyst), *and* an institutional lookup (Operator). The puzzle
   is stable only when all three converge; the game actively teaches "one source is a rumour."

4. **Design at least one puzzle whose solution is a record that is *missing*, and give it to
   the Operator.**
   *(The Operator)* — A witness claims a person who has no registry row. Only the Operator can
   run the check that returns nothing, and "nothing" is the clue. Negative evidence is
   under-used, cheap to author, and thematically perfect for an authority role.

5. **Kill wrong theories by non-convergence and friction, never by a "wrong" buzzer.**
   *(Shadows of Doubt + Telling Lies)* — A false lead dies because the second route doesn't
   exist and the players notice; a misread fragment dies because they re-open the record and
   read past the first line. Reserve explicit correctness feedback for the final submission.

6. **Make evidence one-sided by construction: each role literally holds half the conversation.**
   *(Unheard)* — Observer sees what is physically present but not its meaning; Analyst sees what
   is recorded but not what happened in the room; Operator sees what the institution believes but
   not what is true. No single phone can complete the picture — this is the game's whole reason
   to be three-player.

7. **Fall back to a keyword/query verb for the Analyst: choosing the query is the deduction.**
   *(Her Story)* — Seed records reachable only by the right term; a wrong query returns *nothing*,
   not a correction. Include one contradiction-record that refutes a tempting theory and can only
   be found by a query the players must think of themselves.

8. **Make late information retroactive by letting all evidence be re-opened at any time.**
   *(Obra Dinn + Telling Lies)* — The Observer re-views a photo, the Analyst re-reads a page, the
   Operator re-runs a query — and a fact learned ten minutes ago now means something new. This is
   what generates the mid-game "aha" without new content.

9. **Give near-miss feedback that is vague, role-scoped, and imperfect.**
   *(Golden Idol)* — "One timeline anchor you own is wrong" told to the Analyst alone, without
   naming which — preserves productive doubt and stops the group from collapsing a good theory
   too early. Do this at most a couple of times per game, or it becomes a hint system.

10. **Gate institutional tools behind "sealed / access denied" texture and reward competence
    with escalated access.**
    *(The Operator)* — The Operator's toolset should feel like real institutional software: some
    queries are refused, some unlock as the case proceeds. The reward loop becomes "being right
    gets you deeper access," which is exactly the fantasy the Operator role is selling, and it
    gives the group a reason to keep the Operator's answers honest.

---

## Limitations & what I could not verify

- **Bureau 81's own site (<https://bureau81.com/>) is unreadable to a text fetcher** (JS-only,
  returns no output). The Operator section therefore rests on two third-party articles, not a
  first-party design text. Treat its tool list as preview/journalist-reported, not studio-spec.
- **No first-party design post-mortem for Unheard was read.** The Medium essay that most directly
  analyses its narrative structure returned **HTTP 403**; it is excluded. Unheard claims here rest
  on a 2018 announcement (×2) and a 2023 review.
- **Shadows of Doubt's mechanics come from a 2018 devblog** (pre-release) plus GMTK's 2023
  analysis. Ship-state details may differ from the devblog's early UI notes.
- **GMTK is used as a secondary lens**, and its GTK taxonomy (deduction / contradiction /
  investigation, the "tester" problem) shapes how the individual games are read here. It is a
  useful critical frame, not a developer source.
- **No source in this set is about a 3-player cooperative deduction game.** Every transferable
  claim above is an *analogy* from single-player design; the multi-role split is my synthesis,
  not a documented practice. That is the biggest open question for NEXUS ECHO, and it should be
  prototyped rather than assumed.
