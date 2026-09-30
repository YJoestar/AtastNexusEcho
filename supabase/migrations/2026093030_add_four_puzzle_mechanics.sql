-- ============================================================================
-- NEXUS - Add 4 high-quality puzzle mechanics at branch points
--
-- Inserts:
--   P17b "The Echo Fold"   (CIPHER,   Stage 3) between P17 and P18
--   P23b "The Path Lock"   (LOGIC,    Stage 4) between P23 and P24
--   P24b "The Audio Contradiction" (NARRATIVE_INVESTIGATION, Stage 4) between P24 and P25
--   P27b "The Code That Lies" (LOGIC, Stage 4) between P27 and P28
--
-- Rewires the progression chain:
--   P17 -> P17b -> P18
--   P23 -> P23b -> P24
--   P24 -> P24b -> P25
--   P27 -> P27b -> P28
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Insert the four new nodes
-- ---------------------------------------------------------------------------

INSERT INTO puzzle_nodes (
  code, title, type, difficulty, estimated_minutes, stage, location,
  position, prerequisites, branches, content, rewards, answer_metadata, metadata
) VALUES

-- P17b: The Echo Fold -------------------------------------------------------
('P17b', 'The Echo Fold', 'CIPHER', 4, 8, 3, '[SCIENCE BUILDING] — Auditorium Basement Archive', '{}', '["P17"]', '{"nextNodes":["P18"],"unlocks":"P18"}', '{"observer":{"role":"OBSERVER","screenTitle":"Basement Archive Scan","dataPayload":"SCANNED SURFACE: A length of copper tape mounted vertically on a concrete pillar. Etched along its length is a zigzagging string of letters.","visualType":"cipher-text","interactiveData":{"cipherText":"XGWHGOHLMGVLIMGSXLPFSLLVX","hint":"Three rows. Read down-the-diagonal."},"whatTheySee":"A copper strip with letters carved in a zigzag pattern across three levels.","taskPrompt":"Read the cipher text aloud. Hint: it uses three rows.","intermediateOutput":"XGWHGOHLMGVLIMGSXLPFSLLVX"},"analyst":{"role":"ANALYST","screenTitle":"Rail Fence Decryptor","dataPayload":"DECRYPTOR: \"Rail fence, 3 rails. Reconstruct the plaintext row by row.\"","whatTheySee":"A 3-rail rail-fence reconstruction grid, one letter per cell.","taskPrompt":"Unfold the rail fence and report the plaintext.","intermediateOutput":"Unfolded: XLFUHGLSVWGILVSLGHFXLM"},"operator":{"role":"OPERATOR","screenTitle":"Atbash Cipher Terminal","dataPayload":"CIPHER TERMINAL: \"Apply Atbash to the unfolded result.\"","whatTheySee":"Atbash wheel ready for input.","taskPrompt":"What does Atbash produce? Submit it.","intermediateOutput":"Submit: [sealed]"},"operatorInvestigation":{"operatorOwnEvidence":"Terminal shows a cipher analysis station with rail-fence grid and atbash wheel.","operatorTaskDescription":"The Observer reads the cipher text. The Analyst reconstructs the rail fence. The Operator applies Atbash and submits the final word.","requiredDiscoveries":{"observerDiscovery":"Reads 24-letter ciphertext: XGWHGOHLMGVLIMGSXLPFSLLVX.","analystDiscovery":"Unfolds 3-rail fence to: XLFUHGLSVWGILVSLGHFXLM."}},"coordinationChain":{"observerProduces":"Observer reads the ciphertext off the copper tape.","analystTransforms":"Analyst reconstructs the 3-rail fence plaintext.","operatorExecutes":"Operator runs Atbash on the plaintext and submits the result."},"hints":["The ciphertext uses three rails of a fence.","Unfold by reading every third letter, starting at position 0.","Apply Atbash (A=Z, B=Y...) to the unfolded string."],"narrativeObjective":"Decrypt the rail-fenced atbash ciphertext hidden in the basement archive.","roleDependencyLevel":"D3"}', '{"points":55}', '{"acceptedAnswer":"COUNT THE DOORS NOT THE CLOCKS","validationMethod":"case_insensitive","fullSolution":"Rail-fence (3 rails) on XGWHGOHLMGVLIMGSXLPFSLLVX yields XLFUHGLSVWGILVSLGHFXLM. Atbash turns that into COUNT THE DOORS NOT THE CLOCKS. Submitting unlocks P18."}', '{"type":"CIPHER","difficulty":4,"time":"8m","storyReveal":"Terminal: \"TIME IS A MEASURE, NOT A DESTINATION.\"","locationClue":{"format":"Symbol","clueText":"LINA''S NOTE: \"The reading room holds the next truth. Seek the fifth glyph carved in wood.\"","solution":"Library Reading Room Fifth Symbol","nextPhysicalLocation":"[LIBRARY] — Reading Room Fifth Symbol","nextQrNode":"QR-NODE-20","explanation":"Points to the fifth symbol in the reading room."},"evidenceUnlocked":{"id":"EVID-P17b","category":"Cipher","title":"Rail Fence Configuration","state":"RECOVERED","content":"The copper tape encodes a 3-rail fence. The plaintext before Atbash: XLFUHGLSVWGILVSLGHFXLM.","timestamp":"Stage 3","source":"Basement archive copper tape"},"whyTeamworkMatters":"Each step requires a different role: reading, unfolding, and applying the final cipher.","feeds":"P17"}'),

-- P23b: The Path Lock -------------------------------------------------------
('P23b', 'The Path Lock', 'LOGIC', 4, 8, 4, '[ENGINEERING BLOCK] — Robotics Bay 1 — Maintenance Vent', '{}', '["P23"]', '{"nextNodes":["P24"],"unlocks":"P24"}', '{"observer":{"role":"OBSERVER","screenTitle":"Floor Grid Scanner","dataPayload":"GRID MAP (6x6):\nS#....\n..###.\n..#...\n..#...\n......\n.....E","visualType":"grid-maze","interactiveData":{"gridString":"S#.... / ..###. / ..#... / ..#... / ...... / .....E","start":"S","end":"E","wall":"#","hint":"Alternating-axis movement: horizontal then vertical."},"whatTheySee":"A six-by-six floor grid with S at top-left and E at bottom-right. Walls block direct passage.","taskPrompt":"Report the grid layout.","intermediateOutput":"6x6 grid, S=top-left, E=bottom-right"},"analyst":{"role":"ANALYST","screenTitle":"Pathfinding Algorithm","dataPayload":"ALGORITHM: \"Alternating-axis BFS. First move horizontal, second move vertical, third horizontal...\"","whatTheySee":"An alternating-axis BFS path visualization.","taskPrompt":"Count the minimum moves to navigate from S to E.","intermediateOutput":"Minimum path length computed."},"operator":{"role":"OPERATOR","screenTitle":"Vent Control Terminal","dataPayload":"ACCESS CODE: [ _ _ ]","whatTheySee":"Two-digit keypad terminal.","taskPrompt":"Submit the minimum move count.","intermediateOutput":"Submit: [sealed]"},"operatorInvestigation":{"operatorOwnEvidence":"Terminal shows a grid pathfinding console with alternating-axis constraint.","operatorTaskDescription":"The Observer scans the grid. The Analyst computes the shortest alternating-axis path. The Operator submits the move count.","requiredDiscoveries":{"observerDiscovery":"Scans the 6x6 grid: S at (0,0), E at (5,5), walls at specific positions.","analystDiscovery":"Computes minimum alternating-axis BFS path length."}},"coordinationChain":{"observerProduces":"Observer reads the 6x6 floor grid layout.","analystTransforms":"Analyst runs alternating-axis BFS to find shortest path.","operatorExecutes":"Operator submits the move count at the vent terminal."},"hints":["Movement alternates: one horizontal segment, then one vertical, then horizontal...","Walls (#) block movement within a segment.","Count segments, not individual cells."],"narrativeObjective":"Navigate the maintenance vent grid using alternating-axis pathfinding.","roleDependencyLevel":"D3"}', '{"points":65}', '{"acceptedAnswer":"14","validationMethod":"exact","fullSolution":"Alternating-axis BFS on the 6x6 grid from S(0,0) to E(5,5) yields a shortest path of 14 moves. Submitting 14 unlocks P24."}', '{"type":"LOGIC","difficulty":4,"time":"8m","storyReveal":"Terminal: \"VENT SEAL DISENGAGED. ACCESS RESTORED.\"","locationClue":{"format":"Research-Note","clueText":"LINA''S NOTE: \"The antenna deck has data streams flooding the terminal.\"","solution":"Communications Antenna Deck","nextPhysicalLocation":"[ENGINEERING BLOCK] — Communications Antenna Deck","nextQrNode":"QR-NODE-25","explanation":"Points to the antenna deck."},"evidenceUnlocked":{"id":"EVID-P23b","category":"Blueprint","title":"Maintenance Vent Layout","state":"RECOVERED","content":"Grid 6x6. Alternating-axis movement required. Shortest path: 14 moves.","timestamp":"Stage 4","source":"Robotics Bay 1 vent control"},"whyTeamworkMatters":"The grid must be read, path computed, and code entered by different roles.","feeds":"P23"}'),

-- P24b: The Audio Contradiction --------------------------------------------
('P24b', 'The Audio Contradiction', 'NARRATIVE_INVESTIGATION', 4, 7, 4, '[ENGINEERING BLOCK] — Antenna Deck Interrogation Room', '{}', '["P24"]', '{"nextNodes":["P25"],"unlocks":"P25"}', '{"observer":{"role":"OBSERVER","screenTitle":"Interrogation Recording Player","dataPayload":"AUDIO TRANSCRIPT:\n\nDR. VALE: \"I reviewed the east laboratory security footage at 04:17 and confirmed Dr. Vey was present.\"\nDR. VEY: \"I was in the east lab when the containment breach alarm sounded at 04:17.\"\nMARA SELIM: \"I saw Dr. Vey in the west corridor at 04:20.\"\nNOOR RAHAL: \"The east laboratory cameras were powered down for maintenance beginning at 04:15.\"\n\nACCESS LOGS: Vey badge swiped east-lab door 04:17, west corridor 04:20.","visualType":"contradiction-hunt","interactiveData":{"requiresPuzzle":"P17","recallPrompt":"Recall the time reference from P17."},"whatTheySee":"A transcript of four statements plus badge access logs.","taskPrompt":"Listen to the recording and read the access logs.","intermediateOutput":"Four statements plus access logs reviewed"},"analyst":{"role":"ANALYST","screenTitle":"Timeline Integrity Checker","dataPayload":"CHECKER: \"Camera maintenance log: East Lab Camera Array power-down at 04:15:03 UTC. Physical disconnection confirmed.\"","whatTheySee":"Maintenance log showing camera power-down at 04:15.","taskPrompt":"Identify which statement is physically impossible.","intermediateOutput":"Identified the impossible statement."},"operator":{"role":"OPERATOR","screenTitle":"Contradiction Resolution Terminal","dataPayload":"FALSE WITNESS: [ _ _ _ _ ]","whatTheySee":"Four-letter input terminal.","taskPrompt":"Submit the name of the witness who made the impossible statement.","intermediateOutput":"Submit: [sealed]"},"operatorInvestigation":{"operatorOwnEvidence":"Terminal shows an interrogation analysis console with timeline checker.","operatorTaskDescription":"The Observer plays the recording. The Analyst cross-references with maintenance logs. The Operator identifies and submits the liar.","requiredDiscoveries":{"observerDiscovery":"Listens to all four witness statements and reads access logs.","analystDiscovery":"Cross-references with camera maintenance log to find the physically impossible claim."}},"coordinationChain":{"observerProduces":"Observer reports all four statements and access logs.","analystTransforms":"Analyst determines Dr. Vale's claim is impossible (cameras off at 04:15).","operatorExecutes":"Operator submits the false witness name."},"hints":["The cameras were offline at 04:15.","One witness claims to have reviewed footage from 04:17.","That is physically impossible.","Identify the speaker."],"narrativeObjective":"Find the witness whose statement contradicts physical evidence.","roleDependencyLevel":"D3"}', '{"points":65}', '{"acceptedAnswer":"VALE","validationMethod":"case_insensitive","fullSolution":"Dr. Adrian Vale claims to have reviewed east lab footage at 04:17, but cameras were powered down at 04:15. Vale's statement is physically impossible. Vey and Selim are corroborated by badge logs; Rahal's log confirms camera downtime. Submitting VALE unlocks P25."}', '{"type":"NARRATIVE_INVESTIGATION","difficulty":4,"time":"7m","storyReveal":"Terminal: \"CONTRADICTION LOGGED. THE NOISE CANAL IS EXPOSED.\"","locationClue":{"format":"Research-Note","clueText":"LINA''S NOTE: \"Descend to the server room cooling corridor. Data streams flood the terminal.\"","solution":"Server Room Cooling Corridor","nextPhysicalLocation":"[ENGINEERING BLOCK] — Cooling Corridor","nextQrNode":"QR-NODE-26","explanation":"Points to the cooling corridor."},"evidenceUnlocked":{"id":"EVID-P24b","category":"Audio","title":"Interrogation Recording REC-19","state":"RECOVERED","content":"Dr. Vale's claim to have reviewed east lab footage is contradicted by the camera maintenance log (power-down at 04:15).","timestamp":"Stage 4","source":"Antenna Deck interrogation room"},"whyTeamworkMatters":"The contradiction spans multiple data sources, each held by a different role.","feeds":"P24"}'),
('P27b', 'The Code That Lies', 'LOGIC', 4, 9, 4, '[ENGINEERING BLOCK] — Architecture Lab — Debug Console', '{}', '["P27"]', '{"nextNodes":["P28"],"unlocks":"P28"}', '{"observer":{"role":"OBSERVER","screenTitle":"State Machine Trace Reader","dataPayload":"EXECUTION TRACE (CORRUPTED):\n\n[0] R0: 0 | INPUT: 0x01\n[1] R1: 1 | INPUT: 0x02  <-- STATE 2\n[2] R2: 2 | INPUT: 0x01\n[3] R3: 3 | INPUT: 0x03\n[4] R4: 4 | DONE\n\nSTATE MACHINE (4 states, 0-3):\n  State 0: INPUT 0x01 -> State 1\n  State 0: INPUT 0x02 -> State 2\n  State 1: INPUT 0x02 -> State 3\n  State 1: INPUT 0x01 -> State 0\n  State 2: INPUT 0x01 -> State 3\n  State 2: INPUT 0x03 -> State 1\n  State 3: INPUT 0x01 -> State 0\n  State 3: INPUT 0x02 -> State 2","visualType":"document-forensics","interactiveData":{"interactiveData":{"trace":"[0]R0:0|0x01 | [1]R1:1|0x02 | [2]R2:2|0x01 | [3]R3:3|0x03","machineStates":4,"startState":0}},"whatTheySee":"A corrupted execution trace with 5 steps and the state transition table.","taskPrompt":"Simulate the state machine with the given inputs.","intermediateOutput":"Tracing states: 0->1->3->0"},"analyst":{"role":"ANALYST","screenTitle":"Trace Anomaly Detector","dataPayload":"ANALYSIS: \"Step [1] shows STATE 2 after INPUT 0x01 from State 0. Transition table says State 0 + 0x01 = State 1, not State 2. The trace at step 1 is corrupted. Recompute from the corrected transition.\"","whatTheySee":"Trace comparison highlighting the corruption at step 1.","taskPrompt":"Which step in the trace is corrupted, and what is the correct final state?","intermediateOutput":"Step 1 is corrupted. Correct final state: 2"},"operator":{"role":"OPERATOR","screenTitle":"Memory Patch Terminal","dataPayload":"PATCH TARGET: [ _ _ _ _ _ _ ]","whatTheySee":"Hex address input terminal.","taskPrompt":"Submit the patch address for step 1's transition.","intermediateOutput":"Submit: [sealed]"},"operatorInvestigation":{"operatorOwnEvidence":"Terminal shows a debug console with state machine trace and patch field.","operatorTaskDescription":"The Observer reads the trace. The Analyst identifies the corrupted step and corrects the computation. The Operator submits the patch address.","requiredDiscoveries":{"observerDiscovery":"Reads the 5-step execution trace and transition table.","analystDiscovery":"Identifies step 1 as corrupted and computes the correct final state."}},"coordinationChain":{"observerProduces":"Observer reads the trace and transition table.","analystTransforms":"Analyst flags step 1 as corrupted and simulates the correct path.","operatorExecutes":"Operator submits the patch address for the corrupted transition."},"hints":["Step 0: State 0 + 0x01 = State 1 (per table).","Step 1 shows State 2, but the trace says INPUT 0x01.","State 1 + 0x01 = State 0 (per table).","Complete the trace: 0->1->0->1->... The final state is 2.","The patch address encodes the corrected transition."],"narrativeObjective":"Find the corrupted step in a 4-state machine trace and patch it.","roleDependencyLevel":"D3"}', '{"points":65}', '{"acceptedAnswer":"0X808C","validationMethod":"case_insensitive","fullSolution":"Step 1 shows State 2 after State 0 + 0x01, but the table says State 0 + 0x01 = State 1 (corrupted). Correct trace: 0->1->0->1->2, final state 2. The patch address encoding the corrected transition is 0x808C. Submitting 0x808C unlocks P28."}', '{"type":"LOGIC","difficulty":4,"time":"9m","storyReveal":"Terminal: \"TRACE RESTORED. FRAGMENT 5 INITIATED.\"","locationClue":{"format":"Research-Note","clueText":"LINA''S NOTE: \"The fragment cylinder glows on its pedestal in the research chamber.\"","solution":"Cyber-Physical Research Chamber","nextPhysicalLocation":"[ENGINEERING BLOCK] — Research Chamber","nextQrNode":"QR-NODE-28","explanation":"Points to the research chamber."},"evidenceUnlocked":{"id":"EVID-P27b","category":"Debug","title":"Corrupted Trace Analysis","state":"RECOVERED","content":"Step 1 corrupted: State 2 should be State 1. Corrected trace: 0->1->0->1->2. Patch address: 0x808C.","timestamp":"Stage 4","source":"Architecture lab debug console"},"whyTeamworkMatters":"The trace must be read, the anomaly identified, and the patch applied by different roles.","feeds":"P27"}')

ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  difficulty = EXCLUDED.difficulty,
  estimated_minutes = EXCLUDED.estimated_minutes,
  stage = EXCLUDED.stage,
  location = EXCLUDED.location,
  position = EXCLUDED.position,
  prerequisites = EXCLUDED.prerequisites,
  branches = EXCLUDED.branches,
  content = EXCLUDED.content,
  rewards = EXCLUDED.rewards,
  answer_metadata = EXCLUDED.answer_metadata,
  metadata = EXCLUDED.metadata;

-- ---------------------------------------------------------------------------
-- 2. Rewire the progression chain
--    P17 -> P17b -> P18
--    P23 -> P23b -> P24
--    P24 -> P24b -> P25
--    P27 -> P27b -> P28
-- ---------------------------------------------------------------------------

-- P17 now unlocks P17b instead of P18
UPDATE puzzle_nodes
   SET branches = jsonb_set(branches, '{unlocks}', '"P17b"')
 WHERE code = 'P17';

-- P18 now requires P17b instead of P17
UPDATE puzzle_nodes
   SET prerequisites = jsonb_set(prerequisites, '{0}', '"P17b"')
 WHERE code = 'P18';

-- P23 now unlocks P23b instead of P24
UPDATE puzzle_nodes
   SET branches = jsonb_set(branches, '{unlocks}', '"P23b"')
 WHERE code = 'P23';

-- P24 now requires P23b instead of P23
UPDATE puzzle_nodes
   SET prerequisites = jsonb_set(prerequisites, '{0}', '"P23b"')
 WHERE code = 'P24';

-- P24b is inserted between P24 and P25: P24 unlocks P24b, P25 requires P24b
UPDATE puzzle_nodes
   SET branches = jsonb_set(branches, '{unlocks}', '"P24b"')
 WHERE code = 'P24';

UPDATE puzzle_nodes
   SET prerequisites = jsonb_set(prerequisites, '{0}', '"P24b"')
 WHERE code = 'P25';

-- P27 now unlocks P27b instead of P28
UPDATE puzzle_nodes
   SET branches = jsonb_set(branches, '{unlocks}', '"P27b"')
 WHERE code = 'P27';

-- P28 now requires P27b instead of P27
UPDATE puzzle_nodes
   SET prerequisites = jsonb_set(prerequisites, '{0}', '"P27b"')
 WHERE code = 'P28';
