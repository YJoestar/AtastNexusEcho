# Evidence Reference Notes (NEXUS ECHO)

Design PRINCIPLES only. No assets, UI layouts, text or art are to be reproduced from any title.

## Research honesty statement

- WebSearch worked. WebFetch was **EGRESS_BLOCKED for every domain tried** (gamedeveloper.com,
  colepowered.com, colepowered.itch.io, playingatdetection.com, medium.com, forensicspot.com,
  blog.ampedsoftware.com, en.wikipedia.org). No page was opened.
- Therefore NO claim below is tagged SOURCED. Everything is FROM-SUMMARY (seen in a search-result
  snippet; URL shown is the result the snippet came from, not a page I read) or UNVERIFIED
  (my own background knowledge, not confirmed this session).
- The search tool returns model-written summaries, so even FROM-SUMMARY items are second-hand. Treat as
  leads to verify, not citations.
- Searches that found little: The Sign (only app-store pages and one critic line; the "Ghostcrawler"
  name in the query was my guess and matched nothing), Duskwood (store/aggregator pages), Painscreek
  and Signalis (reviews only, no dev material), Roottrees (no design interview surfaced).

Tags: SOURCED = opened URL. FROM-SUMMARY = search snippet only. UNVERIFIED = recall/inference.

---

## 1. Game references

### The Operator
- Evidence arrives as a bounded subset of files tied to one concrete question ("what is the killer's
  address?"), so the puzzle is scoped and the player knows what they are solving. FROM-SUMMARY
  (https://www.gamedeveloper.com/design/the-operator-is-a-crime-solving-game-delivered-entirely-with-ui)
- The whole game is delivered through a period desktop/terminal: CCTV footage, statements, documents,
  database searches. The tool IS the interface. FROM-SUMMARY (same URL)
- Note: my query said "Chinese FMV"; the snippet did not support that. Do not rely on it.

### Shadows of Doubt
- Skeuomorphic evidence: info windows look like case files, the board looks like a corkboard.
  FROM-SUMMARY (https://colepowered.com/shadows-of-doubt-devblog-4-case-folders-cork-boards/)
- Player decides relevance: pin items, draw strings, write own notes; the game does not auto-solve.
  FROM-SUMMARY (https://boilingsteam.com/shadows-of-doubt/ and the devblog result above)
- Strings carry directional meaning (which way suspicion flows), so connections have semantics, not
  just adjacency. FROM-SUMMARY (devblog 4 result)

### Return of the Obra Dinn
- Compartmentalise a large mystery into small groups of fates so the player can reason locally.
  FROM-SUMMARY (https://www.gamedeveloper.com/design/for-lucas-pope-i-return-of-the-obra-dinn-i-was-a-bunch-of-appealing-design-problems)
- Identification comes from converging weak clues (voice dialect, clothing, position, context), no
  single "name tag" answer. FROM-SUMMARY (Wikipedia/review result at
  https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn)
- The player commits conclusions in a book; the game confirms only in batches (the batch-of-three rule
  is from my memory). Reduces guess-and-check. UNVERIFIED

### The Painscreek Killings
- No hints, quests or objective markers; emulates a real investigation. FROM-SUMMARY
  (https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/ThePainscreekKillings)
- Player keeps their own notes; an in-game camera photographs notes instead of auto-logging them.
  FROM-SUMMARY (review results, e.g. https://goldplatedgames.com/2018/10/21/review-the-painscreek-killings/)
- Cross-document puzzles: a code in one diary is explained in a different one; relationships are a
  tangled web needing cork board and string. FROM-SUMMARY (search summary text)

### The Roottrees Are Dead
- Deduction by filling in a structured artifact (family tree) from heterogeneous clues: written
  descriptions, age, ethnicity, hair colour. FROM-SUMMARY
  (https://thinkygames.com/reviews/the-roottrees-are-dead-review/)
- Research happens in an in-world 1998 web/browser frame. FROM-SUMMARY
  (https://playingatdetection.com/blog/2025/03/08/the-roottrees-are-dead-2025-jeremy-johnston-robin-ward/)

### Her Story
- Clips found by typing keywords into a police database; results are capped at five per search, so the
  player must refine and re-search. FROM-SUMMARY (https://en.wikipedia.org/wiki/Her_Story_(video_game))
- Diegetic terminal: the player is "sat at a police computer", so UI constraints read as setting.
  FROM-SUMMARY (Wikipedia result above)

### Telling Lies
- Extends Her Story: playback is more tactile (forward, backward, pause, speed), and clicking transcript
  words launches a new search. FROM-SUMMARY (https://en.wikipedia.org/wiki/Telling_Lies_(video_game))
- Framed as a "desktop thriller" with apps and notepads on a virtual desktop. FROM-SUMMARY (same)
- Barlow's stated goal: make the exploration mechanic broader and more tactile. FROM-SUMMARY
  (https://www.engadget.com/2019-06-13-telling-lies-e3-demo-sam-barlow-interview-her-story.html)

### Orwell
- Player picks which extracted "data chunks" go into a person's file; some chunks conflict, and the
  choice matters. FROM-SUMMARY (https://www.pcgamer.com/orwell-review/ and the Wikipedia result)
- Judgment under ambiguity, sometimes with no way to verify, is the point: moral weight on curation.
  FROM-SUMMARY (review snippets)

### Stories Untold
- Interfaces are intentionally clunky; the operating procedure of each machine is part of the
  gameplay and of the story. FROM-SUMMARY
  (https://www.gamedeveloper.com/design/crafting-the-deliberately-frustrating-interfaces-of-i-stories-untold-i-)
- Text-adventure layer is diegetic to the character's world. FROM-SUMMARY
  (https://en.wikipedia.org/wiki/Stories_Untold_(video_game))

### Duskwood
- "Found phone" format: investigation through a messenger with photos, video, voice messages and calls.
  FROM-SUMMARY (https://apps.apple.com/us/app/duskwood-detective-story/id1479430106)

### The Sign
- Little reliable design info found. One critic line: a limited phone UI plus obvious hand-holding
  makes the experience feel forced. FROM-SUMMARY (snippet only, source page not identified)
- Monetised move-limits on mini-games frustrate players; avoid gating evidence behind friction that is
  not diegetic. FROM-SUMMARY (store review snippets)

### Signalis
- Lore sits in censored bureaucratic documents, medical logs, posters; the player infers rather than is
  told. FROM-SUMMARY (https://waytoomany.games/2022/11/10/review-signalis/ and others)
- Analog, bulky controls (dials, frequency tuning) turn decoding into a physical-feeling action.
  FROM-SUMMARY (review snippets)
- Silence and negative space heighten atmosphere; "low-fi, high-tech". FROM-SUMMARY
  (https://en.wikipedia.org/wiki/Signalis result)

---

## 2. Real-world practice references

### Crime scene photography
- Tiered coverage: overall (context), mid-range (evidence relative to landmarks, with number marker and
  scale), close-up (detail with scale in the same plane). FROM-SUMMARY
  (https://forensicspot.com/topics/forensic-physics/crime-scene-photography-workflow and
  https://www.crime-scene-investigator.net/csp-evidence-photography-at-the-crime-scene.html)
- Shoot each close-up with and without scale/marker to prove nothing was obscured; shoot before markers
  are placed. FROM-SUMMARY (same)
- L-shaped ABFO No. 2 scale is standard for most evidence shots. FROM-SUMMARY (same)

### Police case file / incident report layout
- Header (case number, date/time, location, officer and badge), involved parties, then a chronological
  narrative, then evidence and actions taken. FROM-SUMMARY
  (https://policepathfinder.com/what-does-a-police-report-look-like/,
  https://www.blueforcelearning.com/blog/how-to-write-effective-incident-report-in-law-enforcement)

### Forensic lab document layout
- Lab case number first; cross-referenced case numbers on page 1; each item gets a unique identifier.
  FROM-SUMMARY (https://forensicresources.org/2014/what-is-in-a-state-crime-laboratory-lab-report/)
- Chain of custody within lab, examiner identity and signature, "page X of Y" from page 2. FROM-SUMMARY
  (https://forensicresources.org/wp-content/uploads/2019/07/Reporting-Results-03-15-2019.pdf)

### CCTV/DVR on-screen display
- OSD elements: camera name (often top-left), date/time (often top-right), optional extra text lines;
  date format varies by region; 12/24 h choice. FROM-SUMMARY
  (https://www.cctvcamerapros.com/camera-name-date-display-s/1591.htm)
- Burned-in timestamps can be wrong (clock drift), which matters forensically. FROM-SUMMARY (title only:
  https://blog.ampedsoftware.com/2021/04/06/timestamps-not-always-showing-the-right-time)

### Handwritten investigator notes
- Contemporaneous, black pen, even for sketches; DDTP (day, date, time, place) and persons present.
  FROM-SUMMARY (https://www.blueline.ca/the_abcs_of_police_note-taking-3288/,
  https://www.forensicnotes.com/forensic-notetaking-guide/)
- Rough notes dated and initialed; sketches use conventional symbols and clarifying remarks. FROM-SUMMARY

### Cassette/dictaphone evidence logs
- Consecutively numbered and dated tapes; log with times of conversations and tape positions. FROM-SUMMARY
  (https://www.expertpages.com/library/sound-recordings-as-evidence-in-court-proceedings)
- Counter-number cross-referenced log marks where segments begin/end and where interruptions occur.
  FROM-SUMMARY (https://www.justice.gov/atr/case-document/file/500151/dl)
- Verbatim transcript with [inaudible] and overlap notation. FROM-SUMMARY
  (https://speakwrite.com/blog/evidence-transcription/)

### Personnel / ID card
- Hierarchy: photo, name (largest text), title/department, logo; ID number often as barcode on back;
  expiry on front. FROM-SUMMARY (https://getjoan.com/employee-badge-design/ and
  https://oddjobsmedia.com/guides/employee-id-badges)

### Facilities floor plans
- "You are here" marker is the key orientation element; plan oriented to viewer; legend for symbols;
  optional north arrow; room numbers; routes marked. FROM-SUMMARY
  (https://sf-fire.org/211-submittal-guidelines-emergency-evacuation-signs,
  https://oshamap.com/evacuation-map-design)

---

## 3. Mapping principles to NEXUS ECHO media

**PHOTOGRAPH**
- Tiered views: let a scene have an overall shot, a mid-range shot and a close-up; the player links
  them by landmark or evidence-marker number. (crime scene tiers)
- Scale ruler / number tags in frame are readable data, and "with/without scale" pairs can hide or
  reveal a detail. (photo convention)
- Player judges relevance and pins the crop; no auto-highlighting. (Shadows of Doubt, Painscreek)

**SURVEILLANCE**
- OSD burned-in camera name and timestamp are the cross-reference hooks to DOCUMENT/AUDIO times.
  (DVR OSD, The Operator)
- A deliberately imperfect clock (drift) as a deduction layer: footage time vs log time. (Amped, partial)
- Tactile playback (scrub, step, speed) like Telling Lies; limited channels, not a flat clip list.

**DOCUMENT**
- Header with case number, item number, examiner/officer, "page X of Y"; the case number is the
  universal join key to other media. (police and lab layouts)
- Narrative sections plus an evidence/actions list; chain-of-custody table as a clue source (who
  handled what, when). (lab report)
- Redactions as a signal of significance. (Signalis; inferred)
- Contradictions between two documents are discovered by the player, never flagged. (Painscreek, Orwell)

**FRAGMENT**
- Keyword/term-driven discovery: words in one fragment are hooks to others, with a capped result set to
  force refinement. (Her Story, Telling Lies)
- Torn or partial pieces that gain meaning only when matched with another medium. (Painscreek code split
  across diaries)

**MAP**
- "You are here" plus legend plus room numbers; orient to the viewer; marking routes. (floor plans)
- Spatial anchor for photo and camera placement: show camera positions and photo vantage points.
  (inference from crime scene mid-range tier and CCTV channels)

**PERSONNEL**
- Photo, large name, role, ID number, expiry, access colour: each field is a possible lead (expired
  badge, wrong access level). (ID conventions)
- Identification from converging soft clues (Obra Dinn), and structured fill-in as a deduction output
  (Roottrees family-tree style).

**NOTE**
- Handwritten, dated, initialed, DDTP header; sketches in pen; abbreviations and symbols that the
  player must learn. (field-notes conventions)
- Player's own notes live beside evidence and can be pinned; the game does not auto-write them.
  (Shadows of Doubt, Painscreek)

**AUDIO**
- Cassette/dictaphone log: tape number, date, counter positions, segment start/end, interruptions;
  these are cross-reference keys. (evidence logs)
- Verbatim transcript with [inaudible] and overlap marks, so gaps are legible and hearing is the
  evidence, not the transcript. (transcription convention)
- Terms heard become search hooks into other media. (Her Story)
- Analog, physical-feeling controls (tuning, scrub) over a modern player. (Signalis, Stories Untold)

**Cross-cutting**
- One join key (case/item number, timestamp, room number) appearing across all eight media so the
  player can link them. (police, lab, DVR, floor plans)
- Player commits conclusions; the game confirms in batches to limit trial and error. (Obra Dinn;
  UNVERIFIED mechanic)

---

## 4. Principles that do NOT apply (and why)

- Real-time chat cadence and push-style delivery (Duskwood): NEXUS ECHO evidence is inspected, not
  delivered by live characters. FROM-SUMMARY basis.
- Deliberately frustrating, multi-step machine operation as the main challenge (Stories Untold): fine
  as a garnish, but it would bury evidence reading if applied to all 8 media.
- Full text-parser input (Stories Untold, Her Story's free keyword search over a huge corpus): only
  apply if NEXUS ECHO has a searchable corpus; otherwise it is unguided guessing.
- No-hint open-world exploration (Painscreek): applies to evidence discovery only if the game has
  navigable space; a medium-viewer game needs some direction.
- Fully skeuomorphic 3D corkboard with physics strings (Shadows of Doubt) and a procedurally generated
  city: out of scope for a fixed hand-authored case.
- Full-motion-video clips and actor performance (Her Story, Telling Lies, Duskwood): only relevant to
  SURVEILLANCE/AUDIO if footage is real video; stylised stills would not need playback tools.
- Legal rigor (hashing audio, ISO lab accreditation language, ABFO scale placement): too detailed; borrow
  the look and the cross-referencing, not the compliance content.
- Obra Dinn's 1-bit rendering and its specific confirm-in-threes rule: stylistic and mechanical choices
  specific to that game; adopt only if NEXUS ECHO has a fixed solution set.
