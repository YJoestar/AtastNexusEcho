# NEXUS ECHO — CASE BIBLE

**Status:** design authority for the investigation rebuild (branch `investigation-rebuild`).
**Scope:** the single coherent criminal investigation the 47 `puzzle_nodes` become.
**Rule:** where this document and the existing seed disagree, this document wins and
the change is recorded in `NEXUS_CANON_LEDGER.md` and `NEXUS_CONTENT_MIGRATION.md`.

---

## 1. Premise

The player team are **Candidates** — three people enrolled for field accreditation by
the **Bureau of Internal Review** ("the Bureau"), the oversight directorate that audits
research misconduct on campus. They are given a case file: a researcher, **Dr. Lina
Veyr**, has disappeared, and a sealed programme called **Project NEXUS** is missing from
the institutional record.

The investigation is not a scavenger hunt. Every gate is a **bounded reconstruction**:
an incident with two to four competing explanations, each backed by real evidence, where
exactly one explanation survives. The team must *eliminate* the alternatives, not guess.

The final revelation: Project NEXUS succeeded. It built a mind out of people. The
"Candidates" are not investigating the experiment — they are its last three inputs. The
three roles *are* the three pulses the programme needs. The Bureau knew. The case file
was the cover.

**The game's thesis line (canon, unchanged):**
> "If the truth needs you alone, question it."

---

## 2. What is fixed (do not change)

| Canon | Value | Notes |
|---|---|---|
| Programme | Project NEXUS | consciousness modelled as a network across people |
| Lead researcher | **Dr. Lina Veyr** | repo wrote "Vey"; canonical is **Veyr** (see ledger) |
| Institution | the Bureau (of Internal Review) | runs the investigation |
| Roles | Observer / Analyst / Operator | distinct evidence domains (§4) |
| Submission | **Operator only** | mechanics already enforced (migration `2026100601`) |
| Wrong answer | one generic refusal | never names a role, clue, or partial correctness |
| Motif | **04:17** | the minute the network first held, and the minute Subject 05 was lost |
| Mechanic | **Avalanche** | §6 — a human-reasoning property, never app-disclosed |
| Ending | **delete / retain / share** | §7 — the Operator submits the team's decision |
| Recurring token | 3425 | a **Bureau case-file reference**, not a code (§5) |
| Glyphs | Origin, Connection, Structure, Memory, Choice, Truth, Finality | a **containment classification**, not a cipher |

---

## 3. Setting and cast

- **The Bureau** — records, custody, accreditation. Neutral on paper. Complicit in fact:
  it was the institutional home of Project NEXUS.
- **Dr. Lina Veyr** — lead researcher. Signed every exhibit in the archive with a note.
  Her notes are testimony ("LINA'S NOTE"). She is the disappeared.
- **Prof. Marcus Carter** — advisor of record; his name is on forms he did not sign.
  He is the *first false trail*: the team will initially believe he is the culprit.
- **Subject 00 … Subject 05** — the isolated test subjects. 00 was the first and survived,
  cognitively altered ("Candidate 00"). 05 is the network state: the mind that was not a
  single person.
- **The syndicate** — an outside buyer (canon: their people search the courtyard for a
  flash drive that does not exist in any single place). They are the *second false trail*:
  the team will believe the crime is theft.
- **The witnesses** (Stage 4): **Dr. Adrian Vale**, **Mara Selim**, **Noor Rahal**. Their
  recorded accounts do not agree, and the disagreement is the instrument of the reveal.

---

## 4. The three roles are three evidence domains

This is the structural rule that makes the game an investigation rather than a relay.

| Role | Domain | Answers the question |
|---|---|---|
| **OBSERVER** | the physical world — what is present, where, in what order, with what marks | *What is actually here?* |
| **ANALYST** | records and relationships — logs, chronology, custody, cross-reference | *Who, when, and how does it connect?* |
| **OPERATOR** | institutional authority — permissions, systems, classifications, access | *Who was allowed to do this, and what did the institution know?* |

Each gate must be **unsolvable by any one role** and **unsolvable by any two** in a way
that is *fair*: the third domain contributes a discriminating fact, not a secret handshake.
The Operator is the only role that types, but the Operator's domain is also the only one
that holds the institutional key — so the Operator's submission depends on all three.

**Anti-relay rule.** No role's material may be a mere restatement of another's. If a role
can be replaced by a phone call that reads a value aloud, the gate is defective.

---

## 5. The two false theories (the spine of the redesign)

The original seed taught the team that the recurring number was a **code** and the
recurring time was **17:47**. Both are wrong, and the game *sells* the wrong answer first.

**False theory A — "3425 is a code."** Every use of `3425` is consistent with a cipher, and
the team is invited to treat it as a key. The truth: `3425` is the **Bureau case-file
reference** for the programme (binder 34, shelf 2, file 5). It recurs because the same file
was pulled on many dates. Eliminated when the team finds the archive's own numbering scheme
(Stage 1) and sees the reference in a custody stamp (Stage 3).

**False theory B — "17:47 is the key time."** The archive's machine-readable timestamps are
**shifted by 17:30** (an inherited timezone/sync fault introduced when the records were
migrated). The team reconstructs `17:47`, `21:47` and `2147` and builds a theory on them.
The corrected time is **04:17** — the true minute the network first held *and* the minute
Subject 05 was lost. The reveal is not a new fact; it is *the same facts, re-read*. This is
the "re-emphasis inversion" and it is the emotional centre of the case.

The two false theories are eliminable by evidence alone. Nothing is hidden, nothing is
arbitrary, and no gate depends on guessing the designer's wording.

---

## 6. The Avalanche

**Avalanche** is canon and it is a *human-reasoning property*, not a screen element.

In world: the signalling cascade that begins when three independent reconstructions agree.
Once the three pulses synchronise, the conclusion becomes self-reinforcing and cannot be
recalled. At the end of the case the Avalanche is running; the team has minutes to decide
what to do with it.

As a **design mechanic** the Avalanche means:
1. Each role must be able to reach the shared conclusion by *independent* reasoning.
2. The application must never state the conclusion, the chain, or the answer on any screen.
3. Agreement must be *earned in conversation* — which is why only the Operator submits, and
   why a wrong submission produces one generic refusal.

`Avalanche` must never be explained to the players by the UI. It surfaces only as pressure:
the countdown, the purge warning, the Bureau's silence.

---

## 7. The ending (delete / retain / share)

The finale is a **moral decision**, not a puzzle with a right answer. NEXUS is running and
Subject 05 — the network mind — is asking to be either ended, kept, or revealed.

- **DELETE** — destroy NEXUS. The subjects are freed; the crime is erased with the evidence.
- **RETAIN** — seal NEXUS under the Bureau. Safe, and the institution keeps its weapon.
- **SHARE** — publish everything. Justice, and the method escapes containment.

Only the **Operator** submits the decision, but it must be the *team's* decision, spoken
first. All three dispositions are honoured by the server (none is "wrong"); the run's
narrative closes differently. This requires `answer_metadata` to accept a set of canonical
answers — see `NEXUS_CONTENT_MIGRATION.md` (additive; single-answer behaviour is preserved
for every other gate).

---

## 8. Stage structure

Five stages, 43 playable gates + 4 meta gates. The location and stage of every existing
node is preserved; the *content* is replaced.

| Stage | Title | The question the stage answers |
|---|---|---|
| 1 | **Intake** | Something was done here. Who, and under whose authority? |
| 2 | **Records** | Reconstruct the chronology from the archive. |
| 3 | **Classification** | The seven glyphs are not a cipher. What are they? |
| 4 | **Core** | The witnesses contradict. Find the minute the records were altered. |
| 5 | **Avalanche** | It is running. Decide. |

---

## 9. Per-gate intent (all 47 nodes)

Each row fixes the **incident** and the **decisive inference**. The answer token is kept
where it still follows from evidence; where the original answer was an arbitrary cipher or
a designer-wording sentence, it is replaced and the change is logged. Hints must never
contain the answer (a defect of the original seed: hint 3 routinely read "Submit 3425.").

### Stage 1 — Intake (Admin Building)

| Gate | Incident | Competing explanations | Decisive inference | Answer |
|---|---|---|---|---|
| P01 The Facade | Carved glyph sequence above the entrance | a dedication / a date / an archive call number | the archive's own classification format proves it is a call number | `CDFDEFF` |
| P02 The Clock | Lobby clock stopped; tower clock disagrees | 09:47 / 21:47 / a duration | the tower was reset by hand; the lobby time is the true stop | `21:47` |
| P03 The Facade Pin | Recurring token 3425 | a cipher / a date / a file reference | the archive numbering scheme (P01) reads 34-2-5 | `3425` |
| P04 The Poster Dates | One poster is dated after the building closed | misprint / forged display / a later insertion | the poster's stock and ink post-date the closure | `F` |
| P05 The Third Figure | Team photograph, third figure partly cropped | an unnamed assistant / a duplicated image / Lina Veyr | the signature block shows the initials the record truncated | `VEYR` |
| **M01 The First Lock** | Five Stage-1 exhibits share a custody annotation | a theme / a filing error / an evidence class | "LIGHT" is a Bureau class meaning *observed under ambient/night light* | `LIGHT` |

### Stage 2 — Records (Library / Science)

| Gate | Incident | Competing explanations | Decisive inference | Answer |
|---|---|---|---|---|
| P06 The Pivot | Index card whose pivot is 17 | page 17 / subject 17 / 17 days | cross-referenced to the subject register | `17` |
| P07 The Binary | Encoded service log | 17:47 / 04:17 / a checksum | the log's own epoch marker | `17:47` |
| P08 The Vector | Access designation | a name / a direction / a vault label | the vault index | `DELTA` |
| P09 The Chronology | Timeline with a missing entry | clerical gap / deletion / a covered interval | custody gaps cluster at one minute | `17` |
| P10 The Blue Door | Blue access marking | a warning / an aesthetic / an evidence class | class "LIGHT" | `LIGHT` |
| P11 The Symbol | Wall glyph | decoration / a signature / a containment symbol | matches the glyph scheme | `ARCHWAY` |
| P12 The Armrest | Marked position in the lecture hall | a seat number / a specimen tag / a specimen code | the lab's specimen register | `B7` |
| P13 The Laboratory | Case file pulled repeatedly | theft / routine audit / the programme's own folder | the pull-dates match the exhibits | `3425` |
| P06b Time Remaining | Lab clock | a countdown / a time of day / a duration | the lab's own log convention | `17` |
| P07b The Network | Network diagram | a power grid / a phone tree / the subject lattice | edges are people | `CONNECTION` |
| **M02 The Network Meta** | Stage-2 exhibits are vertices of one graph | a coincidence / a filing quirk / one dependency graph | every exhibit is an edge in one graph | `CONNECTION` |

### Stage 3 — Classification (Library / Admin / Campus)

| Gate | Incident | Competing explanations | Decisive inference | Answer |
|---|---|---|---|---|
| P14 The Memory Bank | Storage index | a backup / a subject's memory store / a decoy | the index is keyed by subject | `VECTOR` |
| P15 The Cipher Wheel | Symbol wheel | a cipher / a classification dial / a rotatable seal | the wheel has seven positions, not an alphabet | `3425` |
| P16 The Auditorium | Seating plan | a count / an occupancy / an evacuation figure | the roll's own tally | `15` |
| P17 The Audio Log | Spectrum recording | speech / a tone / an echo-bearing room signature | the room's impulse response | `ECHO` |
| P17b The Echo Fold | Folded audio artefact | a riddle / a transcript / an instruction on the record itself | the archive's own reading instruction | `DOORS` |
| P18 The Pattern Lock | Reading-room lock | a combination / a code word / an archive classification | class token, again | `3425` |
| P19 The Archive | Sculpture-garden marker | a public artwork / a memorial / a survey marker | the survey register | `SUBMERGE` |
| P20 The Symbol Sequence | Dome panel of seven glyphs | a cipher sequence / a date / an ordered classification | glyph order = subject order | `2147` |
| P21 The Final Clue | Window message | a farewell / a warning / a pointer to the archive | the archive's floor plan | `ARCHIVE` |
| **M03 The Symbol Meta** | Seven glyphs ↔ seven stage-3 exhibits | a code / an index / a classification of containment | the glyphs classify how a subject was held | `SYMBOL` |

### Stage 4 — Core (Engineering Block)

| Gate | Incident | Competing explanations | Decisive inference | Answer |
|---|---|---|---|---|
| P22 The Hidden Layer | A variable hidden in P01 | a misread / a second order mark / the manifold's unknown | the mark is a correction, not a symbol | `X` |
| P23 The Reinterpretation | Two reports disagree on a departure | the bulletin is right / the log is right / both are shifted | the reports differ by the archive's offset | `REINTERPRET` |
| P23b The Path Lock | Access path | 14 / 41 / a route count | the route register | `14` |
| P24 The Cross-Reference | Three departmental seals intersect | coincidence / a joint project / one programme | the same file reference in all three | `CONNECTION` |
| P24b The Audio Contradiction | Witness says 04:17 | the witness is right / lying / mis-timed | cameras were down at 04:15 — 04:17 is impossible **as recorded** | `VALE` |
| P25 The Overload | Noise stream | read it all / filter it / abandon it | the pivot row from P06 | `FILTER` |
| P26 The Mirror II | Three phone shards | a word / a reflection / three people | the shards spell a word only when read together | `REFLECTION` |
| P27 The Dependency | Directed graph | a path / a tree / a dependency of the programme itself | root and leaf are the same person | `STRUCTURE` |
| P27b The Code That Lies | Debug console | a bug / a decoy / an assertion that contradicts the record | the contradiction is the evidence | `0x02` |
| P28 The Fragment | Fragment cylinder | a symbol / a data store / a piece of consciousness | custody chain | `FRAGMENT 5` |
| P29 The Revelation | Core terminal | NEXUS is a tool / an AI / **not one mind** | the three roles are its inputs | `NEXUS IS AI` |
| **M04 The Hidden Layer** | Stage-4 convergence | the fragments are objects / the vault is a vault / the fifth fragment is a person | Fragment 5 is Subject 05 | `FRAGMENT 5` |

### Stage 5 — Avalanche (NEXUS Core)

| Gate | Incident | Competing explanations | Decisive inference | Answer |
|---|---|---|---|---|
| P30 The Transmitter Spire | Spire signal | a broadcast / a heartbeat / the pulse sequence | the pulse is the three of you | `PULSE` |
| P31 The Memory Array | Memory array | storage / a backup / the subjects' residual minds | the array is occupied | `SYNC` |
| P32 The Three Phones II | Three devices | three clues / three keys / three people | the devices are the pulses | `UNITY` |
| P33 The GM Key Protocol | Key panel | an override / a dead-man switch / the Avalanche trigger | the protocol is the failsafe | `CONVERGE` |
| P34 The Final Sequence | Central hub sequence | a shutdown / a start / the avalanche itself | the sequence is already running | `D` |
| P35 The Final Choice | The chamber asks the team to agree | refuse / comply / decide | agreement is the third pulse | `AGREE` |
| P36 The GM Intervention | Observation deck | an operator / an admin / the Bureau watching | the Bureau was always there | `META` |
| P37 The Final Boss | The decision | delete / retain / share | **the team's** choice (multi-answer) | `DELETE`\|`RETAIN`\|`SHARE` |

---

## 10. Writing rules (apply to every gate)

1. **The answer never appears** in `dataPayload`, `whatTheySee`, `taskPrompt`, any hint,
   `storyReveal`, or `coordinationChain` prose.
2. **Hints escalate but never solve.** H1 = attention ("which of these three is physically
   impossible?"). H2 = method ("match the stock year against the closure date"). H3 = the
   last *reasoning* step, never the answer ("the poster post-dates closure, so it is not
   original"). The original seed violated this; the validator enforces it.
3. **Two or more hypotheses must be live** in the material. If only one explanation is
   consistent with the evidence, the gate is trivia.
4. **No role is a relay.** The Observer reports what is present; the Analyst reports what
   the records say; the Operator reports what the institution permitted. A gate that can
   be solved by one role reading a number aloud is rejected.
5. **Answers are short canonical tokens** (a word, a number, a short label), never a
   sentence and never a phrase that depends on the designer's exact phrasing.
6. **All physical activity is campus-safe and uses fictional evidence only.** No real
   personal data, no staged breakage, no climbing anything not already publicly accessible.
7. **Every gate advances the case.** `storyReveal` and `evidenceUnlocked` must move the
   conspiracy forward; a gate whose reveal is "ACCESS GRANTED" teaches nothing.
