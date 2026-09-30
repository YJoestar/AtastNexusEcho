-- ============================================================================
-- NEXUS — Add interactiveData with audioUrl to P17 observer block
--
-- The P17 observer block has no interactiveData key, so the jsonb_set
-- calls with path '{observer, interactiveData, audioUrl}' were no-ops.
-- This migration adds the full interactiveData object with audio fields.
-- ============================================================================

UPDATE puzzle_nodes
   SET content = jsonb_set(
         content,
         '{observer, interactiveData}',
         '{"audioUrl":"/audio/p17-audio-log-transmission.mp3","audioSpeaker":"GM Voice","audioTranscript":"This is the Nexus Operator. I''ve intercepted a frequency echo from the old network. The time is 17:47. Report the peaks."}'::jsonb,
         true
       )
 WHERE code = 'P17';
