-- P27b repair - the answer key and the evidence must name the same thing.
--
-- DEFECT (found by the 2026-10 audit; see docs/NEXUS_PUZZLE_LOGIC_REPAIR.md):
-- 2026100606_investigation_rebuild_stage4.sql asks the team to convert "the
-- register address of the step to be patched" and then accepts 0x02. But the
-- trace it prints is:
--
--   STEP 1, REGISTER ONE, INPUT ONE, WRITES STATE TWO - marked SUSPECT
--
-- Step 1's REGISTER is ONE, so the register address is 0x01, not 0x02. 0x02 is
-- the value step 1 WROTE (state two), i.e. the corrupted VALUE, not the register
-- that holds it. The fullSolution compounded the error, calling register one
-- "register two in decimal". A team that reasons correctly from the printed
-- trace and converts the register address lands on 0x01 and is rejected.
--
-- The canonical token is 0x02 in the case bible and the matrix ("unchanged"),
-- so the repair is not to move the answer: it is to make the evidence name the
-- thing 0x02 actually is. The corrupted step wrote STATE TWO; the memory patch
-- addresses the STATE SLOT, not the register, and the corrupted slot is two.
-- The prompt, the anomaly detector, the terminal format, the hints, the
-- evidence and the fullSolution are all reworded to say exactly that, so the
-- reasoning chain "find the false step -> read the state it wrote -> convert
-- that slot to hex" now terminates on the accepted answer.
--
-- DIFFICULTY IS PRESERVED. The team must still (a) distrust the SUSPECT flag and
-- test every step against the console's own faithfulness assertion, (b) identify
-- step 1 as the contradiction from the input-vs-written comparison, and (c)
-- convert a decimal slot index into the terminal's hexadecimal format. Nothing
-- is made easier and no answer is made looser - only the noun the team converts
-- is corrected from the register (0x01) to the state slot (0x02), which is what
-- the key always meant.
--
-- The format is stated as "0x followed by two upper-case hexadecimal digits"
-- because the accepted answer carries the 0x prefix; the earlier wording said
-- "two-digit hexadecimal" and invited 02, which the exact-match normaliser would
-- reject.
--
-- Migration history is immutable, so this repairs forward.
-- ============================================================================

UPDATE puzzle_nodes SET
  content = '{"observer":{"role":"OBSERVER","screenTitle":"Debug Console - Execution Trace","dataPayload":"EXECUTION TRACE, vault delta door frame console, four steps indexed from zero: STEP 0, REGISTER ZERO, INPUT ONE, WRITES STATE ONE - marked GOOD. STEP 1, REGISTER ONE, INPUT ONE, WRITES STATE TWO - marked SUSPECT. STEP 2, REGISTER TWO, INPUT THREE, WRITES STATE THREE - marked GOOD. STEP 3, REGISTER THREE, INPUT TWO, WRITES STATE TWO - marked GOOD. Every register, every input and every written state on this trace is printed in decimal; the console prints no other notation.","visualType":"console","whatTheySee":"A four-step trace with one step marked suspect, all values written as plain decimal digits.","taskPrompt":"Record all four steps with their register, input and written state exactly as printed.","intermediateOutput":"Four steps, one suspect; all values decimal."},"analyst":{"role":"ANALYST","screenTitle":"Trace Anomaly Detector - The Contradiction","dataPayload":"ANOMALY DETECTOR: the console prints its own assertion beside the trace - THE TRACE IS FAITHFUL TO THE RECORD. Compare the assertion against the steps. A faithful machine holds the input it was given; step 0 wrote one from one, step 2 wrote three from three, step 3 wrote two from two. Step 1 was given one and wrote two: the value it wrote does not match the input it was given. The trace contradicts its own assertion, and the contradiction is the evidence - the trace is not faithful, it is an assertion wearing a trace''s clothes. Re-simulate with step 1 corrected to hold its input: the sequence of written states becomes one, one, three, two from a clean start. The write that must be patched is the one at step 1, and the memory patch addresses the written state slot rather than the register, in hexadecimal, two digits, upper case, with a leading zero-x.","visualType":"timeline","whatTheySee":"An anomaly detector pitting the console''s own faithfulness assertion against the four printed steps.","taskPrompt":"Find the step that contradicts the assertion and report the state value it wrote, in decimal.","intermediateOutput":"Step 1 contradicts the assertion; corrected re-simulation gives written states one, one, three, two; the state slot to patch is the one step 1 wrote."},"operator":{"role":"OPERATOR","screenTitle":"Memory Patch Terminal - Address Field","dataPayload":"MEMORY PATCH TERMINAL: ADDRESS: [ 0 x _ _ ]. The terminal takes a written-state slot address as a leading zero-x followed by two upper-case hexadecimal digits, and nothing else. The trace and the re-simulation are reproduced above it, all in decimal.","visualType":"terminal","whatTheySee":"An address field on the patch terminal expecting a zero-x prefix and two upper-case hexadecimal digits, above a decimal trace.","taskPrompt":"Convert the state slot written by the step to be patched into the terminal''s format - zero-x plus two upper-case hexadecimal digits - and submit it.","intermediateOutput":"Awaiting the team conclusion."},"operatorInvestigation":{"operatorOwnEvidence":"The memory patch terminal with its zero-x address field, the four-step decimal trace, and the anomaly detector''s re-simulation.","operatorTaskDescription":"The Observer records the decimal trace; the Analyst finds the step that contradicts the console''s own assertion and fixes the state slot to patch; the Operator converts that slot into the terminal''s hexadecimal format and submits it.","requiredDiscoveries":{"observerDiscovery":"Records all four steps with registers, inputs and written states in decimal.","analystDiscovery":"Identifies step 1 as the contradiction and derives that the state slot it wrote is the one to patch."}},"coordinationChain":{"observerProduces":"Observer reports the four decimal trace steps and the suspect flag on step 1.","analystTransforms":"Analyst tests the trace against the console''s faithfulness assertion and isolates the state slot to patch.","operatorExecutes":"Operator converts the state slot to zero-x hexadecimal and submits it, unlocking P28."},"hints":["Do not trust the SUSPECT flag on its own - the console also prints an assertion that the trace is faithful to the record. Test every step against that assertion.","A faithful machine holds the input it was given. One step was given one value and wrote another; that step, not the flag, is the corruption.","You have the state value in decimal. The patch terminal will not accept decimal - it wants that slot as a leading zero-x and two upper-case hexadecimal digits, and you patch the slot the corrupted step wrote into, not the register it ran in."],"narrativeObjective":"Catch the trace in its own lie and patch the state slot the console can no longer be trusted to hold.","roleDependencyLevel":"D3"}',
  answer_metadata = '{"acceptedAnswer":"0x02","acceptedAnswers":["0x2"],"validationMethod":"exact","fullSolution":"The console asserts the trace is faithful to the record. Step 1 was given input 1 and wrote state 2 - the written value does not match the input it was given, so step 1 is the corruption (corrected re-simulation of written states: 1, 1, 3, 2). The patch target is the state slot step 1 wrote, which holds the value two in decimal; the patch terminal takes a leading zero-x plus two upper-case hexadecimal digits, so the submitted address is 0x02."}',
  metadata = '{"type":"LOGIC","difficulty":4,"time":"9m","storyReveal":"TRACE CORRECTED. MEMORY RESTORED. The console had been told to assert its own faithfulness, and the assertion was the one untrue step in the room.","locationClue":{"format":"Symbol","clueText":"LINA''S NOTE: The vault holds the next key.","solution":"Vault Delta","nextPhysicalLocation":"[ENGINEERING BLOCK] - Vault Delta Door Frame","nextQrNode":"QR-NODE-27","explanation":"Points to Vault Delta."},"evidenceUnlocked":{"id":"EVID-P27b","category":"Blueprint","title":"State Machine Patch","state":"RECOVERED","content":"The trace was corrupted at step 1: it wrote value two where a faithful machine would have held its input of one. The state slot to patch holds two in decimal, and the patch terminal takes that slot as a leading zero-x and two upper-case hexadecimal digits. The console''s assertion that it was faithful was itself the false step."},"whyTeamworkMatters":"Only the observer can record the decimal trace; only the analyst can test the console''s assertion and isolate the state slot; only the operator can convert the slot into the format the patch terminal demands.","feeds":"P27"}'
WHERE code = 'P27b';
