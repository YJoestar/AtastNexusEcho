# NEXUS REBUILD — AUTHORING TEMPLATE

This file is the exact contract for rewriting a gate's content. Nothing here is optional.

## Hard rules

1. **ASCII only.** No em dashes, curly quotes, accents, arrows, or box-glyphs. Use `-`,
   `'`, `...`. Malformed encoding has already corrupted the original seed; do not repeat it.
2. **SQL escaping.** Each payload is a single-quoted SQL string. Any apostrophe inside it is
   written `''` (two apostrophes). JSON uses double quotes, which need no escaping.
3. **The answer never appears** in `dataPayload`, `whatTheySee`, `taskPrompt`, `hints`,
   `storyReveal`, `coordinationChain`, `operatorInvestigation`, or `integer` text.
   The answer lives only in `answer_metadata.acceptedAnswer`.
4. **Hints escalate, never solve.** H3 is the last reasoning step, never the answer.
5. **Every role contributes a discriminating fact**, not a restatement.
6. Do not change `code`, `title`, `stage`, `location`, `prerequisites`, `branches`, or
   `rewards`. Only `content`, `answer_metadata`, and `metadata` change.

## Statement shape

```sql
UPDATE puzzle_nodes SET
  content = '{ ... }',
  answer_metadata = '{ ... }',
  metadata = '{ ... }'
WHERE code = 'P01';
```

## `content` object

```json
{
  "observer": { "role":"OBSERVER", "screenTitle":"...", "dataPayload":"...", "visualType":"observation", "whatTheySee":"...", "taskPrompt":"...", "intermediateOutput":"..." },
  "analyst":  { "role":"ANALYST",  "screenTitle":"...", "dataPayload":"...", "whatTheySee":"...", "taskPrompt":"...", "intermediateOutput":"..." },
  "operator": { "role":"OPERATOR", "screenTitle":"...", "dataPayload":"...", "whatTheySee":"...", "taskPrompt":"...", "intermediateOutput":"..." },
  "operatorInvestigation": { "operatorOwnEvidence":"...", "operatorTaskDescription":"..." },
  "coordinationChain": { "observerProduces":"...", "analystTransforms":"...", "operatorExecutes":"..." },
  "hints": ["...", "...", "..."],
  "narrativeObjective": "...",
  "roleDependencyLevel": "D3"
}
```

## `answer_metadata` object

```json
{ "acceptedAnswer": "TOKEN", "validationMethod": "exact", "fullSolution": "one or two sentences: the elimination that proves TOKEN." }
```

Server normalises both sides with UPPER+TRIM+whitespace-collapse, so "exact" and
"case_insensitive" behave identically. Answers are short canonical tokens.

## `metadata` object

```json
{
  "type": "<unchanged original type>",
  "difficulty": 2,
  "time": "6m",
  "storyReveal": "what this gate proves about the case (never just ACCESS GRANTED)",
  "locationClue": { "format":"...", "clueText":"...", "solution":"...", "nextPhysicalLocation":"...", "nextQrNode":"QR-NODE-02", "explanation":"..." },
  "evidenceUnlocked": { "id":"EVID-P01", "category":"...", "title":"...", "state":"RECOVERED", "timestamp":"Stage 1", "source":"...", "content":"..." },
  "whyTeamworkMatters": "why all three domains were required",
  "feeds": "<unchanged>"
}
```

Keep the original `locationClue.nextQrNode`, `nextPhysicalLocation`, `evidenceUnlocked.id`
and `feeds` values verbatim - they are wired to real QR rows and the progression graph.

---

## Worked example — the gate as it should be

```sql
-- P01 The Facade - Stage 1
UPDATE puzzle_nodes SET
  content = '{"observer":{"role":"OBSERVER","screenTitle":"Facade Inscription - Field Record","dataPayload":"MAIN ENTRANCE, north door. A band of EIGHT carved letters runs left to right across the lintel. SIX are weathered: lichen grows in the incisions and the sandstone around them is stained dark. The LAST TWO are sharp and pale - the stone under them is unstained.","visualType":"observation","whatTheySee":"Eight carved letters. Six are old and weathered; the last two look freshly cut.","taskPrompt":"Record the band left to right, and say which letters were cut at a different time.","intermediateOutput":"Eight letters recorded; the final two are later additions."},"analyst":{"role":"ANALYST","screenTitle":"Archive Classification Index","dataPayload":"BUREAU ARCHIVE INDEX: the archive never names a building in words. It uses a LETTER RUN - a building code, then a shelf letter, then a copy letter. Runs are read left to right. Examples on this card: CDF-D-4, CDF-E-7, CDF-E-7b. Every run begins with the same three letters for this building.","visualType":"document-forensics","whatTheySee":"An index card of letter runs that all begin C-D-F.","taskPrompt":"Compare the carved band with the archive run format. Which letters are consistent with a run, and which are additions?","intermediateOutput":"A seven-letter run beginning C-D-F; the eighth letter is not part of any run."},"operator":{"role":"OPERATOR","screenTitle":"Intake Register - Entry Field","dataPayload":"INTAKE REGISTER, entry 1: \"Inscription above Main Entrance recorded as CALL NUMBER: [_______]\". Custody stamp: SEALED the same day the building was closed. Filed by: L. Veyr.","visualType":"meta","whatTheySee":"A register field awaiting a call number, and a seal date.","taskPrompt":"Enter the call number the Bureau recorded for this inscription.","intermediateOutput":"Awaiting the team conclusion."},"operatorInvestigation":{"operatorOwnEvidence":"The intake register, its seal date, and the filing name. The Bureau filed this carving as a record, not as decoration.","operatorTaskDescription":"The Observer reports the band and which letters were cut later. The Analyst shows what the archive calls a run. You hold the register that already calls it a call number. State the number."},"coordinationChain":{"observerProduces":"the eight-letter band and the two letters cut later","analystTransforms":"the archive run format, isolating the seven original letters","operatorExecutes":"enters the seven-letter call number from the register"},"hints":["Look at the stone, not the shapes. Part of the band is newer than the rest.","An archive run never has eight letters. Count the weathered ones again.","The seven weathered letters are the record; the eighth was cut over it later."],"narrativeObjective":"Establish what the inscription above the Main Entrance actually is, and why the Bureau registered it as a call number.","roleDependencyLevel":"D3"}',
  answer_metadata = '{"acceptedAnswer":"CDFDEFF","validationMethod":"exact","fullSolution":"Six of the eight carved letters are weathered and one more matches the archive run format; only the eighth is a later addition. The Bureau registered the seven original letters CDFDEFF as an archive call number."}',
  metadata = '{"type":"OBSERVATION","difficulty":2,"time":"6m","storyReveal":"The carving was never a decoration. It is an archive call number, filed the day the building was sealed, and the intake form is signed in Lina Veyr''s hand.","locationClue":{"format":"Map Marker","clueText":"LINA''S NOTE: \"Through the main doors into the lobby. The first archive alcove is on your left.\"","solution":"Main Building Lobby Archive Alcove","nextPhysicalLocation":"[ADMIN BUILDING] - Lobby Archive Alcove","nextQrNode":"QR-NODE-02","explanation":"Directs teams from the entrance facade into the archive alcove."},"evidenceUnlocked":{"id":"EVID-P01","category":"Document","title":"Archive Building Floor Plan","state":"RECOVERED","timestamp":"Stage 1","source":"Archive alcove","content":"A hand-drawn floor plan marking a route to the Decommissioned Security Office in the basement."},"whyTeamworkMatters":"Only the stone shows which marks are original; only the index says what a run is; only the register says what the Bureau called it.","feeds":"M01"}'
WHERE code = 'P01';
```

Note in the example: the answer `CDFDEFF` never appears in any player-facing string, the three
hints escalate without solving, and the reveal advances the conspiracy (it plants the case
file, the seal, and Veyr's signature).
