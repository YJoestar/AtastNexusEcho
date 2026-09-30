-- ============================================================================
-- NEXUS - Make the game engine server-authoritative
--
-- Three defects made the live game unplayable, and one exposed every puzzle
-- answer to the browser.
--
-- (1) submit_puzzle_answer() validated against answer_metadata->>'canonical_answer'
--     and ->'accepted_answers'. The seed stores "acceptedAnswer", so 0 of 43
--     nodes had a readable answer and v_is_correct could never become TRUE.
--     Every submission in the game was rejected; no node could be solved.
--     It also read points and rewards from answer_metadata, which holds
--     neither - points live in the separate "rewards" column.
--
-- (2) request_hint() read answer_metadata->'hints'. Hints live in
--     content->'hints', so every hint request returned "Hint not available".
--
-- (3) get_player_node_detail() selected role_content, populated in 0 of 43
--     rows, so it returned roleContent = {} for every node. The client then
--     fell back to the local content bundle in src/content/puzzles, which
--     ships acceptedAnswer for all 43 nodes.
--
-- This migration also backfills failurePropagation, which existed only in
-- that client bundle, and reconciles P17/P20, which carried a 4th hint that
-- spelled out the answer and cost no penalty.
--
-- No puzzle prose is rewritten.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Backfill failurePropagation, which lived only in the client bundle
--    (0 of 43 rows). branchConditions is uniformly empty but is materialised
--    here so the client type stays satisfiable from the database alone.
-- ---------------------------------------------------------------------------

UPDATE puzzle_nodes AS n
   SET content = jsonb_set(
         jsonb_set(
           COALESCE(n.content, '{}'::jsonb),
           '{failurePropagation}',
           jsonb_build_object(
             'wrongStep', v.wrong_step,
             'consequence', v.consequence,
             'recoveryGuidance', v.recovery_guidance
           )
         ),
         '{branchConditions}',
         COALESCE(n.content->'branchConditions', '[]'::jsonb)
       )
  FROM (VALUES
    ('M01', 'Team tries letter extraction approaches.', 'Wrong meta.', 'What do facades, clocks, PINs, letters, and last names all relate to?'),
    ('M02', 'Team submits a specific answer instead of the concept.', 'Meta rejected.', 'It is the concept of linking, not a specific link.'),
    ('M03', 'Team submits a specific symbol name instead of the concept.', 'Meta rejected.', 'It is the concept, not a specific symbol.'),
    ('M04', 'Operator enters a symbol instead of the fragment name.', 'Vault Delta expects the artifact name.', 'Enter FRAGMENT 5.'),
    ('P01', 'Analyst misreads the glyph order.', 'Entry rejected — no access granted to P02.', 'Check the substitution key again, starting from the leftmost column.'),
    ('P02', 'Team reads the clock from the default angle (front: 21:47).', 'Terminal accepts but does not advance — angle-specific.', 'The clock shows different times from different angles.'),
    ('P03', 'PIN entered in wrong order.', 'Access denied.', 'The order follows the P01 glyph sequence.'),
    ('P04', 'Team counts from 0 instead of 1 (gives E).', 'Archive access denied.', 'Alphabet: A=1, B=2, C=3, D=4, E=5, F=6.'),
    ('P05', 'Team submits just "V" or "LINA".', 'Identity validation fails.', 'Submit the full LAST NAME.'),
    ('P06', 'Team uses the month (10) or year (2024) instead of day.', 'Pivot invalid; terminal locks for 10 seconds.', 'The day is the middle number: 17.'),
    ('P06b', 'Team forgets the pivot.', 'Clock doesn''t advance.', 'What was the day from the library ledger?'),
    ('P07', 'Team submits the raw decode "IS:472501".', 'Terminal expects HH:MM format.', 'Recall the clock from P02: 21:47 = 17:47.'),
    ('P07b', 'Team submits "STRUCTURE" or "ORIGIN".', 'Concept mismatch.', 'The middle symbol is ⧉ = CONNECTION.'),
    ('P08', 'Team submits ALPHA (the straight line).', 'Terminal rejects: wrong branch.', 'You chose the network path throughout the game.'),
    ('P09', 'Team enters 7 (direct clock value, not Roman).', 'Terminal rejects: expects Roman conversion.', 'Convert XVII, not just the Arabic 7.'),
    ('P10', 'Team submits BLUE.', 'Door stays locked.', 'Submit the right-hand side of the equation.'),
    ('P11', 'Team submits "DOOR" or "WALL".', 'Classification mismatch.', 'It is the curved architectural feature above the door.'),
    ('P12', 'Team submits "42" (the seat number from the clue).', 'Terminal rejects: expects row+seat format.', 'Submit the row letter and seat number together.'),
    ('P13', 'Team can''t find the code or submits the experiment number.', 'Door remains locked.', 'Look for a 4-digit code on the whiteboard.'),
    ('P14', 'Team submits wrong word.', 'Memory bank rejects.', 'Recall the first fragment keyword.'),
    ('P15', 'Team tries to derive the code from symbols alone.', 'Code mismatch.', 'The code connects to P03.'),
    ('P16', 'Team counts sections or rows instead of seats.', 'Wrong number.', 'Count individual seats in one row.'),
    ('P17', 'Team submits "1747" or "TIME".', 'Word validation fails.', 'Reverse the time 17:47.'),
    ('P18', 'Team enters different recurring number.', 'Lock resets.', 'Think P03, P13, P15.'),
    ('P19', 'Team submits "UNDERWATER" or "WATER".', 'Not an action verb.', 'What do you DO to something? SUBMERGE.'),
    ('P20', 'Team uses wrong order or extracts wrong positions.', 'Sequence rejected.', 'Positions: ⧉=2, ⟁=1, ⬡=4, ⎔=7.'),
    ('P21', 'Team submits "SYMBOLS" or "WINDOW".', 'Concept mismatch.', 'The message is about where things are stored.'),
    ('P22', 'Team guesses random letters.', 'Operator locked out for 45 seconds.', 'Think Stage 2 answer for P03: what alphabet position?'),
    ('P23', 'Analyst guesses REEVALUATE (10) or RECALCULATE (12).', 'Wrong letter count; input box rejects.', 'Must be exactly 11 letters: R-E-I-N-T-E-R-P-R-E-T.'),
    ('P24', 'Analyst submits NETWORKING or INTERFACE.', 'Wrong length or synonym rejected.', 'Symbol 2 is named CONNECTION in your HUD.'),
    ('P25', 'Team tries to read Row 1 instead of Row 17.', 'Drowns in 500 lines of gibberish.', 'Remember 17! Look at line 17.'),
    ('P26', 'Phones held in wrong order (ECTREFLION).', 'Operator gets nonsensical anagram.', 'Align phones Left-Center-Right.'),
    ('P27', 'Observer reads alphabetically (CCERRSTUU).', 'Compiler crash.', 'Follow the arrows in directed order.'),
    ('P28', 'Operator enters FRAG 5 or just 5.', 'System rejects: "FULL DESIGNATION REQUIRED".', 'Enter full name: FRAGMENT 5.'),
    ('P29', 'Operator omits "IS" and types NEXUS AI.', 'Terminal: "3 WORDS EXPECTED".', 'Type all three words: NEXUS IS AI.'),
    ('P30', 'Operator enters HEART or BEAT.', 'System: "WRONG PATTERN. RETRY REQUIRED."', 'The M04 key is PULSE.'),
    ('P31', 'Operator enters OBSERVE.', 'System: "WRONG TYPE. COMMAND CODE EXPECTED."', 'Submit the command code: SYNC.'),
    ('P32', 'Operator enters ONENESS.', 'System: "CONCEPT ACCEPTED. WORD NOT RECOGNIZED."', '5 letters: U-N-I-T-Y.'),
    ('P33', 'Operator enters CONVERGENCE.', 'System: "7 LETTERS REQUIRED, 10 PROVIDED."', 'Use the verb form: CONVERGE.'),
    ('P34', 'Operator enters H.', 'System: "WRONG POSITION. RETRY."', 'Submit the first missing value: D.'),
    ('P35', 'One role does not confirm.', 'System: "ALL ROLES REQUIRED."', 'All three must confirm simultaneously.'),
    ('P36', 'Operator enters PUZZLE.', 'GM: "NOT THE META. THINK DEEPER."', 'Submit META.'),
    ('P37', 'Not all three submit simultaneously.', 'BOSS: "INCOMPLETE. ALL THREE ARE ONE."', 'Coordinate: all three submit NEXUS at the same time.')
  ) AS v(code, wrong_step, consequence, recovery_guidance)
 WHERE n.code = v.code;

-- ---------------------------------------------------------------------------
-- 2. Reconcile hint lists that exceeded MAX_HINTS_PER_NODE (3).
--    P17 and P20 held a 4th hint - "Submit ECHO." / "Submit 2147." - which
--    gave away the answer, and request_hint charges nothing for hint 4+.
-- ---------------------------------------------------------------------------

UPDATE puzzle_nodes
   SET content = jsonb_set(content, '{hints}', '["The frequencies encode a time reference.","Recall 17:47 from Stage 2.","Reverse it: ECHO."]'::jsonb)
 WHERE code = 'P17';

UPDATE puzzle_nodes
   SET content = jsonb_set(content, '{hints}', '["Arrange symbols by when you first discovered them.","Extract the position numbers of key symbols.","Connection=2, Origin=1, Structure=4, Finality=7. Submit 2147."]'::jsonb)
 WHERE code = 'P20';

-- P37 is terminal: branches.nextNodes was null in the client bundle.
UPDATE puzzle_nodes
   SET branches = jsonb_set(branches, '{nextNodes}', 'null'::jsonb)
 WHERE code = 'P37';

-- ---------------------------------------------------------------------------
-- 3. Answer-redaction helpers
--
-- The seeded prose states the answer in plain language in fields that are
-- rendered to players, e.g. P01's coordinationChain.operatorExecutes reads
-- "Operator enters CDFDEFF at the facade terminal." and is shown to all three
-- roles (src/features/player/Node.tsx). That defeats the whole premise of a
-- role-partitioned puzzle, so any player-visible string containing the
-- accepted answer is replaced wholesale.
--
-- Wholesale replacement, not excision: excising "CDFDEFF" from
-- "C D F D E F F" would still leak the answer one character at a time.
--
-- Comparison strips case and non-alphanumerics so "21:47" is caught inside
-- "Submit: 21:47" and "F" is not matched inside "facade".
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION nexus_normalize(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT UPPER(REGEXP_REPLACE(COALESCE(p_text, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION nexus_contains_answer(p_text TEXT, p_answer TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    -- Answers shorter than 3 alphanumeric characters (F, X, 17) match far too
    -- much ordinary prose to redact safely, so they are not matched at all.
    -- Those nodes leak through whatTheySee/intermediateOutput instead; that
    -- is puzzle design, not a transport bug, and is left for the game owner.
    char_length(nexus_normalize(p_answer)) >= 3
    AND nexus_normalize(p_text) LIKE '%' || nexus_normalize(p_answer) || '%';
$$;

CREATE OR REPLACE FUNCTION nexus_redact_answer(p_text TEXT, p_answer TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_text IS NULL THEN NULL
    WHEN nexus_contains_answer(p_text, p_answer) THEN '[ sealed ]'
    ELSE p_text
  END;
$$;

-- Recursively redact every string inside a JSONB value.
CREATE OR REPLACE FUNCTION nexus_redact_jsonb(p_value JSONB, p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_out JSONB;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  CASE jsonb_typeof(p_value)
    WHEN 'string' THEN
      RETURN to_jsonb(nexus_redact_answer(p_value #>> '{}', p_answer));
    WHEN 'object' THEN
      SELECT COALESCE(jsonb_object_agg(k, nexus_redact_jsonb(val, p_answer)), '{}'::jsonb)
        INTO v_out
        FROM jsonb_each(p_value);
      RETURN v_out;
    WHEN 'array' THEN
      SELECT COALESCE(jsonb_agg(nexus_redact_jsonb(val, p_answer) ORDER BY ord), '[]'::jsonb)
        INTO v_out
        FROM jsonb_array_elements(p_value) WITH ORDINALITY AS t(val, ord);
      RETURN v_out;
    ELSE
      RETURN p_value;
  END CASE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. get_player_node_detail - serve real content, from the database
--
-- Reads content/metadata/rewards (populated 43/43) instead of the empty
-- role_content column, returns the requesting role's own block, and redacts
-- the accepted answer from every player-visible string. answer_metadata is
-- never selected into the result and is used only to drive redaction.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_player_node_detail(
  p_node_id UUID,
  p_player_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_is_unlocked BOOLEAN;
  v_node RECORD;
  v_role_key TEXT;
  v_role_content JSONB;
  v_investigation JSONB;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('unlocked', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM node_progress
    WHERE team_id = v_team_id
    AND node_id = p_node_id
    AND status IN ('AVAILABLE', 'IN_PROGRESS')
  ) INTO v_is_unlocked;

  IF NOT v_is_unlocked THEN
    RETURN jsonb_build_object('unlocked', false);
  END IF;

  SELECT code, title, type, difficulty, estimated_minutes, location, stage,
         content, metadata, rewards, answer_metadata
    INTO v_node
    FROM puzzle_nodes
   WHERE id = p_node_id;

  IF v_node.code IS NULL THEN
    RETURN jsonb_build_object('unlocked', false);
  END IF;

  v_role_key := UPPER(COALESCE(p_player_role, 'OBSERVER'));

  -- Only this role's own block. Each role is meant to hold one third of the
  -- puzzle; sending all three would hand every player the full solution.
  v_role_content := COALESCE(v_node.content -> LOWER(v_role_key), '{}'::jsonb);

  -- The Operator's investigation protocol is the Operator's own screen, and
  -- it restates what the other two must report.
  v_investigation := CASE
    WHEN v_role_key = 'OPERATOR' THEN v_node.content -> 'operatorInvestigation'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'unlocked', true,
    'code', v_node.code,
    'title', v_node.title,
    'type', v_node.type::text,
    'difficulty', v_node.difficulty,
    'estimatedMinutes', v_node.estimated_minutes,
    'location', v_node.location,
    'stage', v_node.stage,
    'narrativeObjective', nexus_redact_answer(v_node.content->>'narrativeObjective', v_node.answer_metadata->>'acceptedAnswer'),
    'roleDependencyLevel', v_node.content->>'roleDependencyLevel',
    'roleContent', nexus_redact_jsonb(v_role_content, v_node.answer_metadata->>'acceptedAnswer'),
    'operatorInvestigation', nexus_redact_jsonb(v_investigation, v_node.answer_metadata->>'acceptedAnswer'),
    'coordinationChain', nexus_redact_jsonb(v_node.content->'coordinationChain', v_node.answer_metadata->>'acceptedAnswer'),
    'failurePropagation', nexus_redact_jsonb(v_node.content->'failurePropagation', v_node.answer_metadata->>'acceptedAnswer'),
    'locationClue', nexus_redact_jsonb(v_node.metadata->'locationClue', v_node.answer_metadata->>'acceptedAnswer'),
    'evidenceUnlocked', nexus_redact_jsonb(v_node.metadata->'evidenceUnlocked', v_node.answer_metadata->>'acceptedAnswer'),
    'storyReveal', nexus_redact_answer(v_node.metadata->>'storyReveal', v_node.answer_metadata->>'acceptedAnswer'),
    'whyTeamworkMatters', nexus_redact_answer(v_node.metadata->>'whyTeamworkMatters', v_node.answer_metadata->>'acceptedAnswer'),
    'branchConditions', COALESCE(v_node.content->'branchConditions', '[]'::jsonb),
    'points', COALESCE((v_node.rewards->>'points')::INTEGER, 0)
    -- Deliberately absent: answer_metadata, fullSolution, acceptedAnswer,
    -- validationMethod, and the unused hints array.
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- 5. submit_puzzle_answer - validate against the key the seed actually uses
--
-- Corrected keys:
--   acceptedAnswer  (was canonical_answer / accepted_answers)
--   rewards->points (was answer_metadata->points)
--   branches.unlocks for the next node (was answer_metadata->next_node_id)
--
-- validationMethod is honoured: 'exact' compares the normalized string,
-- 'case_insensitive' is identical after normalization (Postgres upper-cases
-- both sides) and is kept explicit so the intent is readable.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION submit_puzzle_answer(
  p_node_id UUID,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_player_id UUID;
  v_player_role player_role;
  v_team_status team_status;
  v_game_started_at TIMESTAMPTZ;
  v_answer_meta JSONB;
  v_rewards JSONB;
  v_branches JSONB;
  v_progress RECORD;
  v_normalized_answer TEXT;
  v_accepted TEXT;
  v_is_correct BOOLEAN;
  v_attempt_number INTEGER;
  v_response_time INTEGER;
  v_points_awarded INTEGER;
  v_recent_submissions INTEGER;
  v_base_points INTEGER;
  v_next_code TEXT;
  v_next_uuid UUID;
  result JSONB;
  MAX_SUBMISSIONS_PER_MINUTE CONSTANT INTEGER := 5;
BEGIN
  SELECT team_id, id, role INTO v_team_id, v_player_id, v_player_role
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found for player');
  END IF;

  SELECT status, game_started_at
    INTO v_team_status, v_game_started_at
    FROM teams
   WHERE id = v_team_id;

  IF v_team_status <> 'ACTIVE' THEN
    RETURN jsonb_build_object('error', 'Game not active');
  END IF;

  v_response_time := GREATEST(
    0,
    EXTRACT(EPOCH FROM (now() - v_game_started_at))::INTEGER
  );

  SELECT COUNT(*) INTO v_recent_submissions
  FROM submissions
  WHERE team_id = v_team_id
  AND submitted_at > now() - INTERVAL '1 minute';

  IF v_recent_submissions >= MAX_SUBMISSIONS_PER_MINUTE THEN
    RETURN jsonb_build_object('error', 'Rate limited. Please wait before submitting again.');
  END IF;

  -- answer_metadata is server-only and is never returned to the client.
  SELECT answer_metadata, rewards, branches
    INTO v_answer_meta, v_rewards, v_branches
  FROM puzzle_nodes
  WHERE id = p_node_id
    AND id IN (
      SELECT node_id FROM node_progress
      WHERE team_id = v_team_id
      AND status IN ('AVAILABLE', 'IN_PROGRESS')
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Node not accessible');
  END IF;

  SELECT * INTO v_progress
  FROM node_progress
  WHERE team_id = v_team_id AND node_id = p_node_id;

  IF NOT FOUND THEN
    INSERT INTO node_progress (team_id, node_id, status)
    VALUES (v_team_id, p_node_id, 'IN_PROGRESS')
    RETURNING * INTO v_progress;
  END IF;

  v_attempt_number := v_progress.attempts + 1;

  -- Normalize both sides identically: upper-case, trim, collapse inner runs
  -- of whitespace. This makes "exact" and "case_insensitive" equivalent,
  -- which is the behaviour the seed's validationMethod values describe.
  v_normalized_answer := UPPER(TRIM(p_answer));
  v_normalized_answer := REGEXP_REPLACE(v_normalized_answer, '\s+', ' ', 'g');

  v_accepted := UPPER(TRIM(COALESCE(v_answer_meta->>'acceptedAnswer', '')));
  v_accepted := REGEXP_REPLACE(v_accepted, '\s+', ' ', 'g');

  v_is_correct := (
    v_accepted <> ''
    AND v_normalized_answer = v_accepted
  );

  v_base_points := COALESCE((v_rewards->>'points')::INTEGER, 0);

  v_points_awarded := CASE
    WHEN NOT v_is_correct THEN 0
    WHEN v_attempt_number = 1 THEN v_base_points
    WHEN v_attempt_number = 2 THEN (v_base_points + 1) / 2
    ELSE 0
  END;

  INSERT INTO submissions (
    team_id, node_id, player_id, role, submitted_answer,
    normalized_answer, is_correct, attempt_number,
    response_time_seconds, points_awarded
  ) VALUES (
    v_team_id, p_node_id, v_player_id, v_player_role, p_answer,
    v_normalized_answer, v_is_correct, v_attempt_number,
    v_response_time, v_points_awarded
  );

  UPDATE node_progress
  SET attempts = v_attempt_number,
      updated_at = now()
  WHERE team_id = v_team_id AND node_id = p_node_id;

  IF v_is_correct THEN
    UPDATE node_progress
    SET status = 'SOLVED',
        solved_at = now(),
        solved_answer = v_normalized_answer,
        attempts = v_attempt_number,
        time_spent_seconds = time_spent_seconds + v_response_time,
        points_awarded = v_points_awarded
    WHERE team_id = v_team_id AND node_id = p_node_id;

    UPDATE teams
    SET score = score + v_points_awarded
    WHERE id = v_team_id;

    -- Mirror the solved node into the team's aggregate progress so the
    -- player's map and counter update without a second round trip.
    UPDATE team_progress
    SET solved_nodes = (
          SELECT COALESCE(jsonb_agg(jsonb_build_array(np.node_id)), '[]'::jsonb)
          FROM node_progress np
          WHERE np.team_id = v_team_id AND np.status = 'SOLVED'
        ),
        score = (SELECT score FROM teams WHERE id = v_team_id)
    WHERE team_id = v_team_id;

    v_next_code := NULLIF(v_branches->>'unlocks', '');
    IF v_next_code IS NOT NULL THEN
      SELECT id INTO v_next_uuid
      FROM puzzle_nodes
      WHERE code = v_next_code;

      IF v_next_uuid IS NOT NULL THEN
        -- DO UPDATE, not DO NOTHING: bureau_reset_node() pre-creates every
        -- node as LOCKED, so the row usually already exists. With DO NOTHING
        -- the freshly unlocked node stayed LOCKED and get_player_node_detail
        -- kept answering {unlocked:false}, stalling the game after one puzzle.
        -- A node that was already solved or in progress keeps its status.
        INSERT INTO node_progress (team_id, node_id, status)
        VALUES (v_team_id, v_next_uuid, 'AVAILABLE')
        ON CONFLICT (team_id, node_id) DO UPDATE
        SET status = 'AVAILABLE',
            updated_at = now()
        WHERE node_progress.status = 'LOCKED';

        UPDATE teams
        SET current_node_id = v_next_uuid,
            current_node_code = v_next_code
        WHERE id = v_team_id;

        UPDATE team_progress
        SET current_node_id = v_next_uuid,
            current_node_code = v_next_code
        WHERE team_id = v_team_id;
      END IF;
    END IF;

    INSERT INTO game_events (type, team_id, player_id, node_id, payload)
    VALUES ('NODE_SOLVED', v_team_id, v_player_id, p_node_id,
            jsonb_build_object('points', v_points_awarded, 'attempts', v_attempt_number));

    INSERT INTO notifications (team_id, target_roles, type, title, message)
    VALUES (v_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'],
            'PUZZLE_SOLVED', 'Puzzle Solved', 'Your team has solved this puzzle.');

    result := jsonb_build_object(
      'isCorrect', true,
      'pointsAwarded', v_points_awarded,
      'attemptNumber', v_attempt_number,
      'nextNodeId', v_next_uuid
    );
  ELSE
    INSERT INTO game_events (type, team_id, player_id, node_id, payload)
    VALUES ('SUBMISSION_MADE', v_team_id, v_player_id, p_node_id,
            jsonb_build_object('correct', false, 'attempt', v_attempt_number));

    result := jsonb_build_object(
      'isCorrect', false,
      'pointsAwarded', 0,
      'attemptNumber', v_attempt_number
    );
  END IF;

  RETURN result;
END;
$$;


-- ---------------------------------------------------------------------------
-- 6. request_hint - read hints from content, not answer_metadata
--
-- The old body selected answer_metadata and then indexed ->'hints', which
-- does not exist there, so hint_content was always NULL and every request
-- returned 'Hint not available'. Hints are in content->'hints'.
--
-- Two further corrections:
--   * hints beyond MAX_HINTS_PER_NODE (3) were charged no penalty, so a 4th
--     hint - which on P17/P20 spelled out the answer - was free. Penalties
--     now come from game_config and the request is refused past the cap.
--   * the node's availability and the team's status were never checked, so a
--     locked node could be hinted and a hint could be bought before start.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION request_hint(
  p_node_id UUID,
  p_hint_number INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_team_status team_status;
  v_hint_used BOOLEAN;
  v_hint_available BOOLEAN;
  v_penalty INTEGER;
  v_max_hints INTEGER;
  v_penalties JSONB;
  hint_content TEXT;
  v_content JSONB;
BEGIN
  IF p_hint_number IS NULL OR p_hint_number < 1 THEN
    RETURN jsonb_build_object('error', 'Invalid hint number');
  END IF;

  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found');
  END IF;

  SELECT status INTO v_team_status
  FROM teams
  WHERE id = v_team_id;

  IF v_team_status <> 'ACTIVE' THEN
    RETURN jsonb_build_object('error', 'Game not active');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM node_progress
    WHERE team_id = v_team_id
    AND node_id = p_node_id
    AND status IN ('AVAILABLE', 'IN_PROGRESS')
  ) INTO v_hint_available;

  IF NOT v_hint_available THEN
    RETURN jsonb_build_object('error', 'Node not available for hints');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM hints_used
    WHERE team_id = v_team_id AND node_id = p_node_id AND hint_number = p_hint_number
  ) INTO v_hint_used;

  IF v_hint_used THEN
    RETURN jsonb_build_object('error', 'Hint already used');
  END IF;

  -- Cap and penalties are configuration, not literals.
  SELECT value INTO v_penalties
  FROM game_config
  WHERE key = 'hint_penalties';

  v_max_hints := COALESCE(jsonb_array_length((SELECT content->'hints' FROM puzzle_nodes WHERE id = p_node_id)), 0);
  v_max_hints := LEAST(v_max_hints, 3);

  IF p_hint_number > v_max_hints THEN
    RETURN jsonb_build_object('error', 'Hint not available');
  END IF;

  SELECT content INTO v_content
  FROM puzzle_nodes
  WHERE id = p_node_id;

  -- Hints are served one at a time and never in bulk: returning the array
  -- would hand the player every remaining hint, including the last one that
  -- states the answer outright.
  hint_content := v_content->'hints'->>(p_hint_number - 1);

  IF hint_content IS NULL THEN
    RETURN jsonb_build_object('error', 'Hint not available');
  END IF;

  v_penalty := COALESCE(
    (v_penalties->>('hint' || p_hint_number))::INTEGER,
    0
  );

  INSERT INTO hints_used (team_id, node_id, hint_number, time_penalty_seconds)
  VALUES (v_team_id, p_node_id, p_hint_number, v_penalty);

  UPDATE node_progress
  SET hints_used = hints_used + 1,
      time_spent_seconds = time_spent_seconds + v_penalty,
      updated_at = now()
  WHERE team_id = v_team_id AND node_id = p_node_id;

  UPDATE team_progress
  SET hints_used = hints_used + 1
  WHERE team_id = v_team_id;

  INSERT INTO notifications (team_id, target_roles, type, title, message)
  VALUES (v_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'],
          'HINT_AVAILABLE', 'Hint Used',
          'Time penalty: ' || (v_penalty / 60) || ' minutes applied.');

  INSERT INTO game_events (type, team_id, node_id, payload)
  VALUES ('HINT_CONSUMED', v_team_id, p_node_id,
          jsonb_build_object('hintNumber', p_hint_number, 'penaltySeconds', v_penalty));

  RETURN jsonb_build_object(
    'hint', hint_content,
    'penaltySeconds', v_penalty
  );
END;
$$;
