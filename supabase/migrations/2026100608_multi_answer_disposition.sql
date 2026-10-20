-- ============================================================================
-- NEXUS - a decision may have more than one acceptable answer
--
-- Every gate of the rebuilt investigation asks one question with one
-- canonical answer, and submit_puzzle_answer keeps answering those from
-- answer_metadata.acceptedAnswer exactly as before. The finale is not a
-- deduction, it is a moral decision: the team disposes of Project NEXUS
-- by deleting it, retaining it, or sharing it, and all three are honest
-- outcomes rather than one right and two wrong.
--
-- This migration adds a second, additive source of truth:
-- answer_metadata.acceptedAnswers, a JSON array of equally acceptable
-- canonical answers. acceptedAnswer stays authoritative and every node
-- that does not carry acceptedAnswers behaves byte-for-byte as it did
-- after 2026100601. Both sides are still normalised by upper-casing,
-- trimming and collapsing inner whitespace, and an empty submission can
-- never match an empty entry.
--
-- NOTE ON REDACTION: get_player_node_detail replaces with '[ sealed ]'
-- any player-visible string that contains the normalised acceptedAnswer
-- (nexus_contains_answer, for answers of three or more alphanumerics).
-- The finale therefore does NOT use a disposition word as its
-- acceptedAnswer - that would seal the very text that presents the
-- choice - and instead carries the three dispositions in acceptedAnswers
-- and a non-prose sentinel in acceptedAnswer. This is deliberate; see
-- docs/NEXUS_CONTENT_MIGRATION.md.
--
-- Nothing else changes: the Operator-only gate, the atomic attempt claim,
-- the once-only SOLVED transition, the payout, the unlock and the run
-- completion all behave exactly as 2026100601 left them. Migration
-- history is immutable, so this repairs forward, and the
-- `SET search_path` is restated inline because CREATE OR REPLACE resets a
-- function's SET clauses.
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_puzzle_answer(
  p_node_id UUID,
  p_answer TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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
  v_normalized_answer TEXT;
  v_accepted TEXT;
  v_is_correct BOOLEAN;
  v_attempt_number INTEGER;
  v_started_at TIMESTAMPTZ;
  v_response_time INTEGER;
  v_puzzle_seconds INTEGER;
  v_points_awarded INTEGER;
  v_recent_submissions INTEGER;
  v_base_points INTEGER;
  v_next_code TEXT;
  v_next_uuid UUID;
  v_solved_rowcount INTEGER;
  v_remaining_open INTEGER;
  v_completed_rowcount INTEGER;
  v_status_after puzzle_stage;
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

  -- The Observer and the Analyst solve their parts mentally and
  -- communicate the results verbally; the application never receives
  -- those answers and must never accept one. Only the Operator types,
  -- so only the Operator may submit.
  IF v_player_role <> 'OPERATOR' THEN
    RETURN jsonb_build_object(
      'error', 'Only the Operator may submit the team''s conclusion.'
    );
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

  -- ONE atomic claim. The row is guaranteed to exist by the accessibility check
  -- above, so the ON CONFLICT branch is the one that fires; the VALUES branch
  -- only covers a row deleted between the two statements. attempts is read back
  -- from the row the database just wrote instead of from a value read earlier,
  -- so two players submitting at the same moment are numbered N and N+1 rather
  -- than both being told N.
  INSERT INTO node_progress (team_id, node_id, status, attempts, started_at)
  VALUES (v_team_id, p_node_id, 'IN_PROGRESS', 1, now())
  ON CONFLICT (team_id, node_id) DO UPDATE
    SET attempts = node_progress.attempts + 1,
        started_at = COALESCE(node_progress.started_at, now()),
        updated_at = now()
  WHERE node_progress.status IN ('AVAILABLE', 'IN_PROGRESS')
  RETURNING attempts, started_at INTO v_attempt_number, v_started_at;

  IF v_attempt_number IS NULL THEN
    -- The claim's WHERE found the row already outside AVAILABLE/IN_PROGRESS,
    -- which means it was solved by a concurrent submission while this
    -- statement waited for the row lock. Distinguish that from a node that was
    -- failed or skipped, which is a genuine refusal.
    SELECT status INTO v_status_after
    FROM node_progress
    WHERE team_id = v_team_id AND node_id = p_node_id;

    IF v_status_after = 'SOLVED' THEN
      RETURN jsonb_build_object(
        'isCorrect', true,
        'pointsAwarded', 0,
        'attemptNumber', 0,
        'nextNodeId', NULL,
        'alreadySolved', true
      );
    END IF;

    RETURN jsonb_build_object('error', 'Node not accessible');
  END IF;

  -- Normalize both sides identically: upper-case, trim, collapse inner runs
  -- of whitespace. This makes "exact" and "case_insensitive" equivalent,
  -- which is the behaviour the seed's validationMethod values describe.
  v_normalized_answer := UPPER(TRIM(p_answer));
  v_normalized_answer := REGEXP_REPLACE(v_normalized_answer, '\s+', ' ', 'g');

  v_accepted := UPPER(TRIM(COALESCE(v_answer_meta->>'acceptedAnswer', '')));
  v_accepted := REGEXP_REPLACE(v_accepted, '\s+', ' ', 'g');

  -- acceptedAnswer is the single canonical answer and drives every node that
  -- has one. acceptedAnswers, when present, is an additional set of equally
  -- acceptable answers (the finale's delete / retain / share). An empty
  -- submission matches neither, so a blank entry can never ride in on an
  -- empty array element.
  v_is_correct := (
    v_normalized_answer <> ''
    AND (
      (v_accepted <> '' AND v_normalized_answer = v_accepted)
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          COALESCE(v_answer_meta->'acceptedAnswers', '[]'::jsonb)
        ) AS alternative(value)
        WHERE REGEXP_REPLACE(
                UPPER(TRIM(alternative.value)), '\s+', ' ', 'g'
              ) = v_normalized_answer
      )
    )
  );

  v_base_points := COALESCE((v_rewards->>'points')::INTEGER, 0);

  v_points_awarded := CASE
    WHEN NOT v_is_correct THEN 0
    WHEN v_attempt_number = 1 THEN v_base_points
    WHEN v_attempt_number = 2 THEN (v_base_points + 1) / 2
    ELSE 0
  END;

  -- Measured against when this node was first opened, not against the start of
  -- the game. A wrong first attempt does not reset it: it is the team's time
  -- on this puzzle.
  v_puzzle_seconds := GREATEST(
    0,
    EXTRACT(EPOCH FROM (now() - v_started_at))::INTEGER
  );

  INSERT INTO submissions (
    team_id, node_id, player_id, role, submitted_answer,
    normalized_answer, is_correct, attempt_number,
    response_time_seconds, points_awarded
  ) VALUES (
    v_team_id, p_node_id, v_player_id, v_player_role, p_answer,
    v_normalized_answer, v_is_correct, v_attempt_number,
    v_response_time, v_points_awarded
  );

  IF v_is_correct THEN
    -- The once-only arbiter. Only the transaction that actually moves the row
    -- out of a non-SOLVED status proceeds to pay out, unlock or emit anything.
    UPDATE node_progress
    SET status = 'SOLVED',
        solved_at = now(),
        solved_answer = v_normalized_answer,
        attempts = v_attempt_number,
        time_spent_seconds = v_puzzle_seconds,
        points_awarded = v_points_awarded
    WHERE team_id = v_team_id AND node_id = p_node_id
      AND status <> 'SOLVED';

    GET DIAGNOSTICS v_solved_rowcount = ROW_COUNT;

    IF v_solved_rowcount = 0 THEN
      -- A concurrent correct submission won the transition. The answer was
      -- right, the team already has the points, and saying so is the only
      -- honest reply. A second payout here is what used to happen.
      RETURN jsonb_build_object(
        'isCorrect', true,
        'pointsAwarded', 0,
        'attemptNumber', v_attempt_number,
        'nextNodeId', NULL,
        'alreadySolved', true
      );
    END IF;

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

    v_next_code := NULLIF(TRIM(COALESCE(v_branches->>'unlocks', '')), '');
    v_next_uuid := NULL;

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

        INSERT INTO game_events (type, team_id, node_id, payload)
        VALUES ('NODE_UNLOCKED', v_team_id, v_next_uuid,
                jsonb_build_object('unlockedFrom', p_node_id));
      END IF;
    END IF;

    -- Nothing left that this team can reach: the run is over. The finale
    -- unlocks nothing, so this is the ending. It also catches a mid-graph dead
    -- end, where finishing what is reachable is strictly better than leaving a
    -- team parked on a solved puzzle for the rest of the event.
    IF v_next_uuid IS NULL THEN
      SELECT COUNT(*) INTO v_remaining_open
      FROM node_progress
      WHERE team_id = v_team_id
        AND status IN ('AVAILABLE', 'IN_PROGRESS');

      IF v_remaining_open = 0 THEN
        UPDATE teams
        SET status = 'COMPLETED',
            completed_at = now()
        WHERE id = v_team_id
          AND status IN ('ACTIVE', 'PAUSED');

        GET DIAGNOSTICS v_completed_rowcount = ROW_COUNT;

        IF v_completed_rowcount > 0 THEN
          INSERT INTO game_events (type, team_id, node_id, payload)
          VALUES ('TEAM_COMPLETED', v_team_id, p_node_id,
                  jsonb_build_object(
                    'reason', 'final node solved',
                    'finalScore', v_points_awarded
                  ));

          INSERT INTO notifications (
            team_id, target_roles, type, priority, title, message
          ) VALUES (
            v_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'],
            'GAME_PHASE_CHANGE', 'CRITICAL',
            'Case Closed',
            'Your team has completed the investigation. The Bureau has logged your final score.'
          );
        END IF;
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
