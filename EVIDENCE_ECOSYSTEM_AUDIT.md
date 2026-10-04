# NEXUS ECHO — Evidence ecosystem audit (CASE NX-037)

Scope: the canonical 66-record library (`src/lib/evidence/assetLibrary.generated.ts`), its clue layer (`src/lib/evidence/clues.ts`) and the player archive. Every number below was computed from that data with the repo's own `deriveClues`, `deriveSeries`, `chronology` and `evidenceImportance` (see `src/tests/evidence-series.test.ts`). No record, character, event or location was added or changed; `npm run evidence:lock` still reports `content lock holds for 66 records`.

## 1. Library at a glance

- 66 records, 8 media: PHOTOGRAPH 12, SURVEILLANCE 9, DOCUMENT 9, FRAGMENT 10, NOTE 9, PERSONNEL 6, AUDIO 6, MAP 5.
- 98 declared relationships. Four pairs are declared from both ends, so the clue layer holds **94 clues** (TEMPORAL 18, SPATIAL 18, PERSONNEL 18, REFERENCE 28, CONTRADICTION 9, SOURCE 3). No relationship points outside the library.
- **86 of 94 clues join two different media.** Only 8 stay inside one medium.
- 11 clues are timeline-method (a TEMPORAL or CONTRADICTION link between two records that both carry a readable time).
- The clue graph has three connected components: one of 62 records and two isolated pairs (B-04 with CAM-03, B-06 with CAM-01), each a photo and the camera frame it matches.
- 28 of 66 records are damaged in some way (registry count), so "damage" is common across media, not a property of one.

## 2. Per-type audit

"Clues/rec" is clue endpoints per record. Importance counts come from the rule in section 4.

| Type | Purpose (from data) | Implementation | Visual | Interaction (existing handlers only) | Story role | Weakness (measured) | Recommendation |
|---|---|---|---|---|---|---|---|
| PHOTOGRAPH (12) | Place and time a scene. All 12 carry a location, device (FIELD-CAM-01/02) and a capture time; 10 at second precision. | Rendered room, lens/flash/grain, print border and caption strip. | Print with caption strip; 2 DAMAGED (B-07 blown out, B-12). | Inspect: pan, pinch/zoom, brightness/contrast, annotate, mark, compare, board, trace terms. | Anchor. 3.17 clues/rec; B-02 is a CRITICAL hub (9 clues, 3 contradictions); 13 clues pair photos with camera frames. | Only 1 photo is BACKGROUND, but 7 of 12 are merely SUPPORTING: most photos confirm one fact. B-07 and B-12 are hard to read by design. | Keep. No new photo variant needed. |
| SURVEILLANCE (9) | Machine record of the same minutes. Second-precision times on all 9; sources are DVR NODE B-04, tapes 1-9. | Low-res CCD treatment, tracking tear, on-screen date/time. | 3 of 9 non-NORMAL (CAM-07 partial, CAM-06 no signal, CAM-08 interval missing). | Same inspector as photos (image first). Playback exists only if a video URL is attached; none is in the library. | CAM-07 is the library's biggest hub (15 clues, 2 contradictions, reaches 6 media). | **6 of 9 are BACKGROUND**: each is a single mirror of one photo (SPATIAL or TEMPORAL). Average cross-media reach 1.67 (only notes, at 1.44, is lower). | Keep. Series view (9 tapes) makes the mirrors legible without new content. |
| DOCUMENT (9) | Institutional word: registry, ledgers, forms. Mixed precision (6 day, 2 minute, 1 year). | Typeset form on paper stock with stamps/redaction. | 4 non-NORMAL (D-06, D-09 DAMAGED; D-04, D-08 PARTIAL). | Read as text surface, trace terms, compare, annotate. | Highest clues/rec after personnel (3.44); D-01 is a CRITICAL hub (8 clues); D-06 and D-09 carry contradictions. | 19 REFERENCE endpoints dominate (15 of 31 endpoints are REFERENCE): documents mostly point at things rather than conflict. | Keep. |
| FRAGMENT (10) | Physical recovery from C214, C101, S01. All 10 are day-precision only. | Torn/partial sheet with damage masks. | 9 of 10 non-NORMAL (TORN 5, DAMAGED 2, STAIN 1, BURNED 1). | Same inspector; source `FRAGMENT` archive tab. | Glue: 19 of 29 endpoints are REFERENCE; 3 contradictions (F-04~F-10, F-09~M-01). | **No TEMPORAL clue at all**, so the timeline comparison can never involve a fragment. 5 of 10 are UNRESOLVED. | Keep. The missing time is an authoring fact, not a missing type. |
| MAP (5) | Facilities drawings, MAR 74 to MAR 94 (month precision). | Plan drawing on paper stock / cyanotype. | FADED M-02, DAMAGED M-04. | Same inspector. | Disputes the building itself: 4 of 13 endpoints are CONTRADICTION (M-01~M-02, F-09~M-01, A-02~M-02). | Smallest set (5); 2 BACKGROUND. Only 1 TEMPORAL endpoint. | Keep. |
| PERSONNEL (6) | Identity forms (P-1). 4 year-only dates. | Issued card/file layout on card stock. | P-05 ANOMALOUS, P-04 DAMAGED, P-06 INCOMPLETE. | Same inspector; trace terms (names, numbers). | Densest type: 4.50 clues/rec; P-01 has 10 clues across 6 media; 18 PERSONNEL-kind endpoints. | P-05 (dated 17 APR 98, after the case) is the only record in the future, and P-06 is the only personnel form filed under an unassigned source. | Keep. |
| NOTE (9) | Observer and staff jottings. Day or month precision only. | Handwritten/typed sheet on paper stock. | 3 non-NORMAL (N-03, N-07 DAMAGED; N-09 BURNED). | Same inspector; archive tab "ANNOTATED" also lists any record the player annotated. | Colour and corroboration: 6 REFERENCE endpoints. | **Weakest connected type**: 1.56 clues/rec, 4 of 9 BACKGROUND, the only type with no contradiction and 1 TEMPORAL endpoint. | Keep. Chronology/series ordering helps; do not add content. |
| AUDIO (6) | Dictaphone TAPE 2 recordings, 00:39 to 02:34, all minute precision. | Recording log card with waveform. | 2 non-NORMAL (A-04 DEGRADED, A-06 PARTIAL). | Scrubber exists in the inspector **only when an audio URL is attached**. The library attaches none, so every audio record shows "AUDIO SOURCE / NOT ATTACHED" and a decorative waveform seeded from the record id. | 7 of 11 endpoints are TEMPORAL: audio is a clock check against CAM-07 and B-05. | No playable media. 0 REFERENCE endpoints. Lowest clues/rec after notes (1.83). | Keep. Do not fake playback; supply real audio via the pipeline if wanted. |

## 3. Evidence matrix

Clue endpoints by medium and relationship kind (a clue between two records adds one endpoint to each; the grid sums to 188 = 94 x 2).

| Medium | Records | TEMPORAL | SPATIAL | PERSONNEL | CONTRADICTION | SOURCE | REFERENCE | Endpoints | Timeline-method clues touched |
|---|---|---|---|---|---|---|---|---|---|
| PHOTOGRAPH | 12 | 9 | 11 | 5 | 4 | 0 | 9 | 38 | 8 |
| SURVEILLANCE | 9 | 10 | 8 | 0 | 2 | 3 | 2 | 25 | 9 |
| DOCUMENT | 9 | 5 | 2 | 5 | 2 | 2 | 15 | 31 | 1 |
| FRAGMENT | 10 | 0 | 5 | 2 | 3 | 0 | 19 | 29 | 0 |
| MAP | 5 | 1 | 5 | 1 | 4 | 0 | 2 | 13 | 0 |
| PERSONNEL | 6 | 3 | 1 | 18 | 2 | 0 | 3 | 27 | 0 |
| NOTE | 9 | 1 | 3 | 3 | 0 | 1 | 6 | 14 | 0 |
| AUDIO | 6 | 7 | 1 | 2 | 1 | 0 | 0 | 11 | 4 |

Most common medium pairs (clues): PHOTOGRAPH-SURVEILLANCE 13, DOCUMENT-PHOTOGRAPH 8, DOCUMENT-PERSONNEL 7, PERSONNEL-PHOTOGRAPH 6, FRAGMENT-NOTE 6, FRAGMENT-PHOTOGRAPH 5. Of 36 possible pairs (including same-medium), 29 occur at least once.

Importance (rule below) by medium:

| Medium | BACKGROUND | SUPPORTING | IMPORTANT | CRITICAL |
|---|---|---|---|---|
| PHOTOGRAPH | 1 | 7 | 3 | 1 |
| SURVEILLANCE | 6 | 2 | 0 | 1 |
| DOCUMENT | 1 | 3 | 4 | 1 |
| FRAGMENT | 1 | 5 | 4 | 0 |
| MAP | 2 | 1 | 2 | 0 |
| PERSONNEL | 1 | 1 | 3 | 1 |
| NOTE | 4 | 5 | 0 | 0 |
| AUDIO | 1 | 4 | 1 | 0 |
| **All 66** | 17 | 28 | 17 | 4 |

## 4. Importance (admin authoring aid)

Derived only from clues: CRITICAL 8+ clues; IMPORTANT 4+ clues or any contradiction; SUPPORTING 2-3; BACKGROUND 0-1. The four CRITICAL records are CAM-07 (15), P-01 (10), B-02 (9), D-01 (8). It is shown in the admin Evidence Register (M-06) in the index line and the state inspector, with the clue count. Players never see it. Thresholds are a judgement about this library's distribution (clues per record: 1 x17, 2 x21, 3 x12, 4 x9, 5 x3, then 8, 9, 10, 15), not a law.

## 5. Real cross-media chains

All from declared relationships; notes are the data's own words.

1. **The 03:17:11 frame.** B-02 (photo) TEMPORAL to CAM-07 (camera frame, same second); B-02 CONTRADICTION CAM-07 ("Same second. The frame shows no one."); B-02 CONTRADICTION D-09 (lab printout: "The log says this frame was reshot."); B-02 CONTRADICTION B-12 ("Both claim LOC-C214 at the same minute."); D-06 CONTRADICTION CAM-07 ("Registry and recorder disagree."); A-04 and A-06 (audio) TEMPORAL to CAM-07. Photograph, surveillance, document, audio in one cluster.
2. **Whose number.** P-01 (personnel) is PERSONNEL-linked from B-02, B-05, B-11 (photos), D-03, D-05 (documents), F-10 (fragment), M-03 (map) and A-01 (audio): six media. P-01 CONTRADICTION P-05 ("Same number, different appointment date.").
3. **The drawing that omits a room.** M-01 CONTRADICTION M-02 ("The current issue omits C214-X."); F-09 (fragment drawing) CONTRADICTION M-01 ("Issue 03 has no room C214-X."); A-02 (audio) CONTRADICTION M-02 ("The drawing disagrees."); N-05 (note) SPATIAL M-02. Fragment, map, audio, note.
4. **Ledger page to recorder.** P-06 REFERENCE F-04 (ledger-page fragment) REFERENCE D-02 (facilities ledger) SOURCE CAM-07; P-06 TEMPORAL A-05 (audio). Personnel, fragment, document, surveillance, audio over four hops.
5. **Incident record.** B-01 (photo) SPATIAL D-01 (incident record, LOC-C214); D-01 REFERENCE B-02, F-01, F-02, D-08, N-06 and PERSONNEL-links P-03.

## 6. Series and chronology (new, `src/lib/evidence/series.ts`)

Series = same medium + same source (trailing "/ TAPE n" or "/ VOL n" removed); at least two members; members ordered by event time. Ten series are found: PHOTOGRAPH and FRAGMENT under OBS-02 FIELD RECOVERY (12 and 10), SURVEILLANCE under DVR NODE B-04 (9), AUDIO under CASE FILE NX-037 (6), MAP under FACILITIES ENGINEERING (5), PERSONNEL under PERSONNEL FILE (5; P-06's unassigned file is correctly left out), NOTE under OBS-02 (4), and three document pairs (CASE FILE NX-037, FACILITIES ENGINEERING, NODE B-04). Tape number is not event order (tape 4 at 02:48 follows tape 3 at 02:58 by tape, precedes it by time), which is why chronology, not tape, orders members.

Chronology reads `captured_at` at its own precision: 27 records are second/minute precise, 24 day, 9 month, 6 year, 0 unreadable; a masked stamp ("03:0_:__") falls back to its day. Coarse stamps sort at the start of their period and the archive says "TIME DAY ONLY" and so on on the row, so a day-precision fragment is not mistaken for 00:00. Earliest: M-05 (JUN 74). Latest: P-05 (17 APR 98).

## 7. New categories considered and rejected

The earlier decision stands: no new types are justified.

| Candidate | Reason rejected (from data) |
|---|---|
| TRANSCRIPT / LOG | Logs already exist as DOCUMENT (D-03 dot-matrix, D-08 bound log). Both link by TEMPORAL and REFERENCE like other documents. Audio has no attached media, so a transcript would add text for a recording that has no sound. |
| FORENSIC / LAB | `FORENSIC` exists as a clue category but no relationship kind maps to it, and the one lab record (D-09, BUREAU LAB 3) is a DOCUMENT that behaves like one (4 clues, 1 contradiction). A type would hold one record. |
| TIMELINE / INCIDENT REPORT | D-01 is already the incident record and the library's CRITICAL document hub. A "timeline" type would restate chronology, which is now derived from `captured_at` for all 66 records. |
| DIGITAL FILE / TERMINAL SCREEN | Would be a presentation of a DOCUMENT (D-03 is a printout from NEXUS NODE B-04 / TERMINAL 07). No clue, relationship or field distinguishes it. |
| OBJECT / PHYSICAL ITEM | Already served by FRAGMENT (physical recovery, 10 records) and the separate inventory source. |
| MESSAGE / CORRESPONDENCE | No record in the library is correspondence; adding one is new content, which is out of scope. |

The gaps found are in connectivity (notes, audio, surveillance mirrors), not in missing media, and a new type would add records rather than connect existing ones.

## 8. Changes made in this pass

- `src/lib/evidence/series.ts`: `parseCaptureTime`, `chronology`, `sortChronologically`, `deriveSeries`, `seriesPosition`, `splitSource`.
- `src/lib/evidence/importance.ts`: `importanceFor`, `evidenceImportance`.
- `src/lib/evidence/facts.ts`: `mediumFacts`, the strip below.
- Archive (`src/features/player/evidence/EvidenceArchive.tsx`): "ORDER: INDEX / BY TIME" control; per-row facts strip (camera, frame time, signal for surveillance; length, recorder, recorded for audio; form/material/sheet and dates for the rest; only fields the record has); series position ("TAPE 7 · DVR NODE B-04 9/9").
- Admin Evidence Register (`src/features/admin/EvidenceLab.tsx`): importance in the index line; IMPORTANCE and CLUES lines in the state inspector.
- Per-medium interaction was **not** added in the archive list: the only medium-specific handlers (audio scrubber, image zoom/enhance) live in the inspector and are unchanged.

## 9. Limitations

- **No sourced real-world references.** The visual treatments were not compared against sourced photographs of real 1990s DVR, dictaphone or dot-matrix output; no such references were available or fetched. Visual claims above describe what the generator does and what the registry says was reviewed, not fidelity to real equipment.
- The registry marks only PHOTOGRAPH, SURVEILLANCE and DOCUMENT contact sheets as reviewed by eye; the other five media have not had a visual review recorded.
- Audio has no real audio payload, so "audio" is a log card and a waveform generated from the record id, not a recording.
- Importance thresholds and series rules are heuristics fitted to this library's data. A different case would need them checked.
- Clue counts exclude relationships whose far end is missing from a player's recovered set; the audit uses the full 66-record library, so a player mid-game sees fewer.
- Series membership relies on the `source` wording ("CASE FILE NX-037" groups six audio records and two documents separately because medium is part of the key). Inconsistent source spelling would split a series.
- The new archive and admin UI was checked by type-check, lint and unit tests, not in a browser at 360 px; layout is built with wrapping and no fixed widths but is unverified visually.
