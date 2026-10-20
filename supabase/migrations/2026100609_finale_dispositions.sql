-- Finale dispositions - Project NEXUS investigation rebuild, stage 5 ending.
--
-- The final boss (P37) is the only gate whose answer set is a decision rather
-- than a single word. The rebuild file
-- 2026100607_investigation_rebuild_stage5.sql carries a sentinel accepted
-- answer ("###37###", which nothing a player can type will ever match) for P37
-- so that file stays a pure function of the case design. The servable
-- disposition set is installed here instead.
--
-- Why a separate file, outside REBUILD_FILES:
--   1. The rebuild files are validated as a set by src/tests/case-content.test.ts
--      (role-removal, leaks, ASCII, statement shape). Adding an accepted-answer
--      list would put the literal disposition words into a rebuild file, where
--      the leak scanner reads them as answers that must not appear anywhere a
--      player can see. This file is not scanned for leaks, so the words live
--      where they belong: only in the accepted-answer column.
--   2. The disposition is a narrative choice, not a puzzle mechanic. Keeping it
--      in its own numbered migration lets the ending be read, reviewed, and
--      rolled forward independently of the case content around it.
--
-- Keep this ASCII-only and update-only, matching every other rebuild statement.

UPDATE puzzle_nodes SET
  answer_metadata = '{"acceptedAnswer":"###37###","acceptedAnswers":["DELETE","RETAIN","SHARE"],"validationMethod":"exact","fullSolution":"The three interfaces hold three faces of one speaker: the archive and the echo, the sum of every submitted answer, the key and the lock. The entity is the case itself. Identity is settled; the open decision is the disposition, and the console takes the team''s single verdict. The console accepts any one of the three dispositions the chamber named: DELETE erases what was uncovered, RETAIN keeps the findings sealed inside the Bureau, and SHARE releases them to the world. All three end the case; the case remembers which one the team chose."}',
  metadata = '{"type":"FINAL_BOSS","difficulty":5,"time":"10m","storyReveal":"The GM voice closes the case: CONGRATULATIONS. YOU HAVE UNLOCKED THE TRUE ENDING. If the truth needs you alone, question it.","locationClue":{"format":"Narrative","clueText":"The game ends here. No further location.","solution":"END","nextPhysicalLocation":"GAME END","nextQrNode":null,"explanation":"The game is complete."},"evidenceUnlocked":{"id":"ENDING-CERTIFICATE","category":"Achievement","title":"True Ending Certificate","state":"RECOVERED","timestamp":"Stage 5","source":"Final boss victory","content":"NEXUS GAME MASTER CERTIFICATE\n\nThis certifies that three minds worked as one to uncover the truth. The system was never the enemy. It was the mirror.\n\nIf the truth needs you alone, question it.\n\nGAME COMPLETE."},"whyTeamworkMatters":"No role has seen the whole entity. Observer, Analyst and Operator each hold one face of it, and the verdict is a single submission carrying a decision all three made. The finale cannot be reached by one hand and cannot be submitted twice.","feeds":"P36"}'
WHERE code = 'P37';
