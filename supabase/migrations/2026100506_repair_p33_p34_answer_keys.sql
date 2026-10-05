-- Repair P33/P34 answer keys that contradict their own puzzle text/hints.
-- P33 should accept CONVERGE (7 letters), not CONVERGENCE (10 letters).
-- P34 should accept D (the missing letter), not C (already present in the sequence).

UPDATE puzzle_nodes
SET answer_metadata = jsonb_set(
  jsonb_set(answer_metadata, '{acceptedAnswer}', '"CONVERGE"'),
  '{fullSolution}',
  '"The 7-letter GM key is CONVERGE. Submitting CONVERGE unlocks P34."'
)
WHERE code = 'P33';

UPDATE puzzle_nodes
SET answer_metadata = jsonb_set(
  jsonb_set(answer_metadata, '{acceptedAnswer}', '"D"'),
  '{fullSolution}',
  '"The alphabet sequence has D missing at position 4. Submitting D unlocks P35."'
)
WHERE code = 'P34';
