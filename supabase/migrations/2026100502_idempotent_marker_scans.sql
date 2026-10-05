-- ============================================================================
-- NEXUS - A marker is registered once, and a typed code counts as a scan
--
-- Three defects in scan_qr_code, all on the live player path.
--
-- 1. Re-scanning one marker wrote a full duplicate progress record every time.
--
--    The AVAILABLE branch unconditionally wrote the discovered marker, a
--    PUZZLE_UNLOCKED notification fanned out to all three roles, and a QR_SCANNED
--    event - with no check for whether this team had already done so. Nothing in
--    the function writes node_progress, so the node stays AVAILABLE for the whole
--    window and every single re-scan repeated all three writes. A player holding
--    a camera steady on one marker fires a lookup every time the dedupe window
--    lapses, and the Bureau event buffer and the team notification list fill with
--    identical rows. The alreadyClaimed guard that does exist sits in the ELSE
--    branch, which no seeded marker reaches, because all of them set
--    puzzle_node_id.
--
-- 2. The event recorded what the player typed, not what it resolved to.
--
--    qr_nodes is readable by a player through team_has_scanned(code), which
--    compares the event payload against qr_nodes.CODE. The event was written as
--    jsonb_build_object('qrCode', p_qr_code) - the raw input. So scanning the
--    printed image worked, but typing the manual code or the marker id printed
--    in plain text beside that image recorded '037-A-4821' where the policy looks
--    for 'QR-NODE-02'. That marker then stayed invisible to the team through RLS
--    for the rest of the event. The fallback exists precisely so a player whose
--    camera will not focus can still use the marker, and it was the one path
--    that could not record it.
--
-- 3. A refusal said nothing about what to do next.
--
--    Scanning a real marker whose puzzle this team has not opened yet returned
--    bare {"discovered": false}, and the scanner fell through to "whatever it
--    points to remains sealed" - true, and useless. The reason is now named, so
--    the player is told which of the two very different situations they are in:
--    a marker their team has already used, or a marker they have not reached.
--
-- Return shapes are additive: every key the client already reads is still sent.
-- ============================================================================

CREATE OR REPLACE FUNCTION scan_qr_code(
  p_qr_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_qr_node RECORD;
  v_node_progress_status puzzle_stage;
  v_seen_before BOOLEAN;
BEGIN
  SELECT team_id INTO v_team_id
  FROM players
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No team found');
  END IF;

  SELECT * INTO v_qr_node
  FROM qr_nodes
  WHERE code = p_qr_code
     OR marker_id = p_qr_code
     OR manual_code = p_qr_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid QR code');
  END IF;

  -- If QR maps to a puzzle node, check if available for the team
  IF v_qr_node.puzzle_node_id IS NOT NULL THEN
    SELECT status INTO v_node_progress_status
    FROM node_progress
    WHERE team_id = v_team_id AND node_id = v_qr_node.puzzle_node_id;

    IF v_node_progress_status IS NULL THEN
      RETURN jsonb_build_object('discovered', false, 'reason', 'node_not_reached');
    END IF;

    IF v_node_progress_status = 'AVAILABLE' THEN
      -- One marker, one record per team. A camera held steady on a single
      -- marker will resolve it again and again; the player must see the same
      -- answer each time and the Bureau must see one event, not one per frame.
      SELECT EXISTS (
        SELECT 1 FROM game_events ge
         WHERE ge.team_id = v_team_id
           AND ge.type = 'QR_SCANNED'
           AND ge.node_id = v_qr_node.puzzle_node_id
      ) INTO v_seen_before;

      IF NOT v_seen_before THEN
        -- Mark QR as discovered by this team
        UPDATE qr_nodes
        SET discovered_by_team_id = v_team_id
        WHERE id = v_qr_node.id;

        -- Create notification
        INSERT INTO notifications (team_id, target_roles, type, title, message)
        VALUES (v_team_id, ARRAY['OBSERVER', 'ANALYST', 'OPERATOR'], 'PUZZLE_UNLOCKED',
                'QR Code Scanned', 'A physical QR code has been scanned.');

        -- Log game event. The payload records the RESOLVED code, never the raw
        -- input: team_has_scanned(code) is what makes this marker readable to
        -- the team at all, and it compares against qr_nodes.code. A player who
        -- typed the manual code printed next to the image has still scanned
        -- this marker and must be able to see it.
        INSERT INTO game_events (type, team_id, node_id, payload)
        VALUES ('QR_SCANNED', v_team_id, v_qr_node.puzzle_node_id,
                jsonb_build_object(
                  'qrCode', v_qr_node.code,
                  'submittedAs', p_qr_code,
                  'markerId', v_qr_node.marker_id
                ));
      END IF;

      RETURN jsonb_build_object(
        'discovered', true,
        'alreadyClaimed', v_seen_before,
        'nodeCode', (SELECT code FROM puzzle_nodes WHERE id = v_qr_node.puzzle_node_id),
        'nodeTitle', v_qr_node.label,
        'markerId', v_qr_node.marker_id,
        'manualCode', v_qr_node.manual_code,
        'deploymentStatus', v_qr_node.deployment_status,
        'qrCode', v_qr_node.code
      );
    ELSE
      -- SOLVED, IN_PROGRESS, LOCKED or FAILED. The marker is real and this team
      -- has met it before; say which, because "not discovered" reads to a player
      -- as a failure and this is not one.
      RETURN jsonb_build_object(
        'discovered', false,
        'alreadyClaimed', v_node_progress_status IN ('SOLVED', 'IN_PROGRESS'),
        'reason', 'node_not_open',
        'nodeCode', (SELECT code FROM puzzle_nodes WHERE id = v_qr_node.puzzle_node_id),
        'qrCode', v_qr_node.code
      );
    END IF;
  ELSE
    -- QR maps to evidence or other content
    IF v_qr_node.discovered_by_team_id IS NOT NULL
    AND v_qr_node.discovered_by_team_id = v_team_id THEN
      RETURN jsonb_build_object('discovered', false, 'alreadyClaimed', true,
                                'qrCode', v_qr_node.code);
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM game_events ge
       WHERE ge.team_id = v_team_id
         AND ge.type = 'QR_SCANNED'
         AND ge.payload ->> 'qrCode' = v_qr_node.code
    ) INTO v_seen_before;

    IF NOT v_seen_before THEN
      UPDATE qr_nodes SET discovered_by_team_id = v_team_id WHERE id = v_qr_node.id;

      INSERT INTO game_events (type, team_id, payload)
      VALUES ('QR_SCANNED', v_team_id, jsonb_build_object(
        'qrCode', v_qr_node.code,
        'submittedAs', p_qr_code
      ));
    END IF;

    RETURN jsonb_build_object('discovered', true, 'alreadyClaimed', v_seen_before,
      'qrLabel', v_qr_node.label,
      'markerId', v_qr_node.marker_id,
      'manualCode', v_qr_node.manual_code,
      'deploymentStatus', v_qr_node.deployment_status,
      'qrCode', v_qr_node.code);
  END IF;
END;
$$;