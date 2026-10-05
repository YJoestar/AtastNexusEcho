-- Puzzle content balancing pass
-- Fixes inconsistencies, hint leaks, and decode typos across player-facing content.
-- See playtest-report.md sections for analysis.

-- =====================================================================
-- P07: Binary decode typo — "IS:472501" should be "IS:44721"
-- Binary sequence 01001001 01010011 00111010 00110100 00110100 00110111
--   00110010 00110001 decodes to ASCII: I S : 4 4 7 2 1 = "IS:44721"
-- The Analyst text incorrectly showed "IS:472501" throughout.
-- Also fixes Observer intermediateOutput — bytes 5 and 7 were transposed.
-- =====================================================================

UPDATE puzzle_nodes
SET content = jsonb_set(
  replace(content::text, 'IS:472501', 'IS:44721')::jsonb,
  '{observer,intermediateOutput}',
  to_jsonb('01001001 01010011 00111010 00110100 00110100 00110111 00110010 00110001')
),
answer_metadata = replace(answer_metadata::text, 'IS:472501', 'IS:44721')::jsonb
WHERE code = 'P07';

-- =====================================================================
-- P09: Replace circular equation with direct Roman numeral conversion
-- Original Analyst dataPayload: "P06 pivot (17) + clock hand (7) = 24.
--   24 - 7 = 17. Or simply: XVII = 17."
-- The equation 17+7=24, 24-7=17 is circular and does not explain the
-- conversion from Roman numeral XVII to decimal 17.
-- =====================================================================

UPDATE puzzle_nodes
SET content = jsonb_set(
  content,
  '{analyst,dataPayload}',
  to_jsonb('CONVERSION: The Roman numeral XVII converts to decimal 17. P06''s pivot of 17 confirms this value.')
)
WHERE code = 'P09';

-- =====================================================================
-- P15: Strengthen cipher wheel deduction (was pure P03 recall)
-- Original Analyst dataPayload mentioned "17th position on the wheel" —
-- nonsensical for a 7-position wheel. IntermediateOutput stated
-- "value from P03 is 3425" — pure recall with no derivation.
-- Now derives the code via the glyph key mapping.
-- =====================================================================

UPDATE puzzle_nodes
SET content = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          content,
          '{analyst,dataPayload}',
          to_jsonb('CONVERSION: Each cipher symbol maps to a digit via the glyph key. The wheel''s symbols yield the code when mapped in order.')
        ),
        '{analyst,intermediateOutput}',
        to_jsonb('The cipher wheel maps symbols to digits via the glyph key: 3-4-2-5.')
      ),
      '{coordinationChain,analystTransforms}',
      to_jsonb('Analyst maps cipher symbols to digits via the glyph key, deriving 3425.')
    ),
    '{operatorInvestigation,requiredDiscoveries,analystDiscovery}',
    to_jsonb('Maps cipher symbols to digits via the glyph key.')
  ),
  '{hints,1}',
  to_jsonb('Map the cipher wheel symbols to digits using the glyph key.')
)
WHERE code = 'P15';

-- Update P15 fullSolution for consistency (server-side)
UPDATE puzzle_nodes
SET answer_metadata = jsonb_set(
  answer_metadata,
  '{fullSolution}',
  to_jsonb('The cipher wheel symbols map to digits via the glyph key, yielding 3425. Submitting 3425 unlocks P16.')
)
WHERE code = 'P15';

-- =====================================================================
-- P18: De-explicitify observer taskPrompt and hints
-- Original taskPrompt named specific puzzles: "The code is the recurring
--   one from P03/P13/P15."
-- Hint 2 directly revealed the source: "It was the P03 PIN."
-- Both are softened to preserve deduction.
-- =====================================================================

UPDATE puzzle_nodes
SET content = jsonb_set(
  jsonb_set(
    content,
    '{observer,taskPrompt}',
    to_jsonb('The code is a recurring value from your investigation.')
  ),
  '{hints,1}',
  to_jsonb('It has appeared at multiple stations.')
)
WHERE code = 'P18';

-- =====================================================================
-- P22: Remove answer leak from hints and Analyst text
-- Hint 2 directly stated the answer: "The 24th letter of the alphabet is X."
-- Analyst whatTheySee also leaked: "The 24th letter is X."
-- Hint 3 gave the answer outright: "Submit X."
-- All three are reworded to guide without revealing.
-- =====================================================================

UPDATE puzzle_nodes
SET content = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          content,
          '{hints,1}',
          to_jsonb('Counting A(1) through Z(26), identify the letter at position 24.')
        ),
        '{hints,2}',
        to_jsonb('Submit the single-letter binding variable.')
      ),
      '{analyst,whatTheySee}',
      to_jsonb('Analyzer showing: A(1)...X(24)...Z(26). The binding variable sits at position 24.')
    ),
    '{coordinationChain,analystTransforms}',
    to_jsonb('Analyst derives the binding variable as the 24th letter of the alphabet.')
  ),
  '{operatorInvestigation,requiredDiscoveries,analystDiscovery}',
  to_jsonb('Computes the 24th letter of the alphabet.')
)
WHERE code = 'P22';
