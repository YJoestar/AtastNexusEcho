-- ============================================================================
-- NEXUS - Add missing physical QR nodes (BATCH-02)
--
-- The original seed migration was applied with only BATCH-01 (36 nodes).
-- This migration adds the 11 nodes that complete the set for puzzles:
--   P05, P07b, P17b, P21, P22, P23, P23b, P24b, P27b, P29, P37
--
-- Uses subqueries for puzzle_node_id so it resolves correctly regardless
-- of generated UUIDs. ON CONFLICT ensures this is idempotent.
-- ============================================================================

-- Ensure deployment columns exist (idempotent)
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS marker_id TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS manual_code TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS deployment_status TEXT DEFAULT 'GENERATED';
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS deployment_batch TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ;

-- Add the 11 missing QR nodes
INSERT INTO qr_nodes (code, label, type, puzzle_node_id, position, metadata, marker_id, manual_code, deployment_status, deployment_batch) VALUES
  ('QR-NODE-38', '[ADMIN BUILDING] — Archive Figure Display', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P05'), '{"x":0,"y":0,"index":36}'::jsonb,
   '{"puzzleCode":"P05","stage":1}'::jsonb, 'NX-037-AK', '037-AK-4857', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-39', '[SCIENCE BUILDING] — Basement Archive Locker', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P07b'), '{"x":0,"y":0,"index":37}'::jsonb,
   '{"puzzleCode":"P07b","stage":2}'::jsonb, 'NX-037-AL', '037-AL-4858', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-40', '[SCIENCE BUILDING] — Auditorium Basement Archive', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P17b'), '{"x":0,"y":0,"index":38}'::jsonb,
   '{"puzzleCode":"P17b","stage":3}'::jsonb, 'NX-037-AM', '037-AM-4859', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-41', '[ADMIN BUILDING] — Fourth Floor Window', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P21'), '{"x":0,"y":0,"index":39}'::jsonb,
   '{"puzzleCode":"P21","stage":3}'::jsonb, 'NX-037-AN', '037-AN-4860', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-42', '[SCIENCE BUILDING] — Research Lab', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P22'), '{"x":0,"y":0,"index":40}'::jsonb,
   '{"puzzleCode":"P22","stage":4}'::jsonb, 'NX-037-AO', '037-AO-4861', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-43', '[ENGINEERING BLOCK] — Robotics Bay 1', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P23'), '{"x":0,"y":0,"index":41}'::jsonb,
   '{"puzzleCode":"P23","stage":4}'::jsonb, 'NX-037-AP', '037-AP-4862', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-44', '[ENGINEERING BLOCK] — Robotics Bay 1 — Maintenance Vent', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P23b'), '{"x":0,"y":0,"index":42}'::jsonb,
   '{"puzzleCode":"P23b","stage":4}'::jsonb, 'NX-037-AQ', '037-AQ-4863', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-45', '[ENGINEERING BLOCK] — Antenna Deck Interrogation Room', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P24b'), '{"x":0,"y":0,"index":43}'::jsonb,
   '{"puzzleCode":"P24b","stage":4}'::jsonb, 'NX-037-AR', '037-AR-4864', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-46', '[ENGINEERING BLOCK] — Architecture Lab — Debug Console', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P27b'), '{"x":0,"y":0,"index":44}'::jsonb,
   '{"puzzleCode":"P27b","stage":4}'::jsonb, 'NX-037-AS', '037-AS-4865', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-47', '[ENGINEERING BLOCK] — Core Declassification Vault', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P29'), '{"x":0,"y":0,"index":45}'::jsonb,
   '{"puzzleCode":"P29","stage":4}'::jsonb, 'NX-037-AT', '037-AT-4866', 'GENERATED', 'BATCH-02'),
  ('QR-NODE-48', '[NEXUS CORE] — Final Boss Arena', 'NAVIGATION',
   (SELECT id FROM puzzle_nodes WHERE code = 'P37'), '{"x":0,"y":0,"index":46}'::jsonb,
   '{"puzzleCode":"P37","stage":5}'::jsonb, 'NX-037-AU', '037-AU-4867', 'GENERATED', 'BATCH-02')
ON CONFLICT (code) DO UPDATE
  SET label = EXCLUDED.label,
      type = EXCLUDED.type,
      puzzle_node_id = EXCLUDED.puzzle_node_id,
      metadata = EXCLUDED.metadata,
      marker_id = EXCLUDED.marker_id,
      manual_code = EXCLUDED.manual_code,
      deployment_status = EXCLUDED.deployment_status,
      deployment_batch = EXCLUDED.deployment_batch;
