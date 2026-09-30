-- ============================================================================
-- NEXUS - Actually unlock the next node
--
-- 2026093013 unlocked the next node with:
--     ON CONFLICT (team_id, node_id) DO NOTHING
-- but bureau_reset_node() pre-creates a node_progress row for every node as
-- LOCKED, so on a real game the row already exists and the conflict clause
-- discarded the update. The node stayed LOCKED, so the very next call to
-- get_player_node_detail() still returned {unlocked:false} and the team could
-- never move past the first puzzle they solved.
--
-- Confirmed live: solving P01 scored 50 and reported a nextNodeId, but all
-- three roles were then refused access to P02.
--
-- The conflict clause now promotes a LOCKED row to AVAILABLE. A node that is
-- already SOLVED, IN_PROGRESS or otherwise advanced keeps its status, so this
-- cannot regress or re-open a node a team has already cleared.
-- ============================================================================
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
