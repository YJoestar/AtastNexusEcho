-- ============================================================================
-- NEXUS - Seed the physical-game tables
--
-- qr_nodes, evidence, fragments and inventory_items were all empty (0 rows)
-- while puzzle_nodes held 47 fully populated nodes. Everything the content
-- already declared therefore pointed at nothing:
--
--   * locationClue.nextQrNode references 47 distinct puzzle codes, but only
--     36 had QR nodes (QR-NODE-02 through QR-NODE-37). 11 puzzles had no
--     QR code to scan at their location, making them unreachable in the
--     physical game: P05, P07b, P17b, P21, P22, P23, P23b, P24b, P27b,
--     P29, P37. scan_qr_code() resolved every entry to "Invalid QR code",
--     so the scanner could never work for those locations.
--   * metadata.evidenceUnlocked names an evidence id on all 47 nodes
--     (EVID-P01 ... plus FRAG-01..04), so the evidence screens had nothing
--     to show and solving a node revealed nothing.
--
-- This seeds exactly what the content describes: one qr_nodes row per puzzle
-- node, mapped to the puzzle it marks, and one evidence row per
-- metadata.evidenceUnlocked entry. The four FRAG-* entries additionally
-- become fragments, one per stage.
--
-- Marker IDs use case 037 with sequential letter suffixes (A..AU for 47
-- total). The first 36 are in BATCH-01 (already deployed). The remaining 11
-- complete the set in BATCH-02.
--
-- All inserts are ON CONFLICT (code) DO UPDATE, so re-running is safe and
-- this can be extended later without duplicating rows.
--
-- inventory_items is deliberately left empty: no node declares any, and
-- inventing items would put content in the game that the design does not
-- describe.
-- ============================================================================

-- Ensure deployment-grade columns exist (idempotent, regardless of migration order)
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS marker_id TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS manual_code TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS deployment_status TEXT DEFAULT 'GENERATED';
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS deployment_batch TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ;

-- qr_nodes: 47 rows (36 in BATCH-01 + 11 in BATCH-02)
-- ---------------------------------------------------------------------------
-- BATCH-01: original 36 markers (QR-NODE-02 through QR-NODE-37)
-- ---------------------------------------------------------------------------
INSERT INTO qr_nodes (code, label, type, puzzle_node_id, position, metadata, marker_id, manual_code, deployment_status, deployment_batch) VALUES
  ('QR-NODE-02', '[ADMIN BUILDING] — Main Entrance Facade', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P01'), '{"x":0,"y":0,"index":0}'::jsonb, '{"puzzleCode":"P01","stage":1}'::jsonb, 'NX-037-A', '037-A-4821', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-03', '[ADMIN BUILDING] — Lobby Clock Tower', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P02'), '{"x":0,"y":0,"index":1}'::jsonb, '{"puzzleCode":"P02","stage":1}'::jsonb, 'NX-037-B', '037-B-4822', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-04', '[ADMIN BUILDING] — Facade Base Terminal', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P03'), '{"x":0,"y":0,"index":2}'::jsonb, '{"puzzleCode":"P03","stage":1}'::jsonb, 'NX-037-C', '037-C-4823', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-05', '[ADMIN BUILDING] — Archive Poster Wall', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P04'), '{"x":0,"y":0,"index":3}'::jsonb, '{"puzzleCode":"P04","stage":1}'::jsonb, 'NX-037-D', '037-D-4824', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-06', '[ADMIN BUILDING] — Central Archive', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'M01'), '{"x":0,"y":0,"index":4}'::jsonb, '{"puzzleCode":"M01","stage":1}'::jsonb, 'NX-037-E', '037-E-4825', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-07', '[LIBRARY] — Stack Reference Desk', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P06'), '{"x":0,"y":0,"index":5}'::jsonb, '{"puzzleCode":"P06","stage":2}'::jsonb, 'NX-037-F', '037-F-4826', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-08', '[LIBRARY] — Basement Server Rack', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P07'), '{"x":0,"y":0,"index":6}'::jsonb, '{"puzzleCode":"P07","stage":2}'::jsonb, 'NX-037-G', '037-G-4827', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-09', '[ADMIN BUILDING] — Archive Cabinet 3', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P08'), '{"x":0,"y":0,"index":7}'::jsonb, '{"puzzleCode":"P08","stage":2}'::jsonb, 'NX-037-H', '037-H-4828', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-10', '[ADMIN BUILDING] — Clock Room', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P09'), '{"x":0,"y":0,"index":8}'::jsonb, '{"puzzleCode":"P09","stage":2}'::jsonb, 'NX-037-I', '037-I-4829', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-11', '[ADMIN BUILDING] — Blue-Marked Door', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P10'), '{"x":0,"y":0,"index":9}'::jsonb, '{"puzzleCode":"P10","stage":2}'::jsonb, 'NX-037-J', '037-J-4830', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-12', '[ADMIN BUILDING] — Wall with Glowing Blue Symbol', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P11'), '{"x":0,"y":0,"index":10}'::jsonb, '{"puzzleCode":"P11","stage":2}'::jsonb, 'NX-037-K', '037-K-4831', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-13', '[ADMIN BUILDING] — Lecture Hall Room 214', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P12'), '{"x":0,"y":0,"index":11}'::jsonb, '{"puzzleCode":"P12","stage":2}'::jsonb, 'NX-037-L', '037-L-4832', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-14', '[SCIENCE BUILDING] — Research Lab', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P13'), '{"x":0,"y":0,"index":12}'::jsonb, '{"puzzleCode":"P13","stage":2}'::jsonb, 'NX-037-M', '037-M-4833', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-15', '[SCIENCE BUILDING] — Lab Wall Clock', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P06b'), '{"x":0,"y":0,"index":13}'::jsonb, '{"puzzleCode":"P06b","stage":2}'::jsonb, 'NX-037-N', '037-N-4834', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-16', '[SCIENCE BUILDING] — Memory Lab', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'M02'), '{"x":0,"y":0,"index":14}'::jsonb, '{"puzzleCode":"M02","stage":2}'::jsonb, 'NX-037-O', '037-O-4835', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-17', '[SCIENCE BUILDING] — Memory Lab', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P14'), '{"x":0,"y":0,"index":15}'::jsonb, '{"puzzleCode":"P14","stage":3}'::jsonb, 'NX-037-P', '037-P-4836', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-18', '[LIBRARY] — Entrance Symbol Wall', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P15'), '{"x":0,"y":0,"index":16}'::jsonb, '{"puzzleCode":"P15","stage":3}'::jsonb, 'NX-037-Q', '037-Q-4837', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-19', '[SCIENCE BUILDING] — Main Auditorium', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P16'), '{"x":0,"y":0,"index":17}'::jsonb, '{"puzzleCode":"P16","stage":3}'::jsonb, 'NX-037-R', '037-R-4838', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-20', '[SCIENCE BUILDING] — Auditorium Stage', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P17'), '{"x":0,"y":0,"index":18}'::jsonb, '{"puzzleCode":"P17","stage":3}'::jsonb, 'NX-037-S', '037-S-4839', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-21', '[LIBRARY] — Reading Room Fifth Symbol', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P18'), '{"x":0,"y":0,"index":19}'::jsonb, '{"puzzleCode":"P18","stage":3}'::jsonb, 'NX-037-T', '037-T-4840', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-22', '[CAMPUS] — Sculpture Garden', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P19'), '{"x":0,"y":0,"index":20}'::jsonb, '{"puzzleCode":"P19","stage":3}'::jsonb, 'NX-037-U', '037-U-4841', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-23', '[ADMIN BUILDING] — Building Dome', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P20'), '{"x":0,"y":0,"index":21}'::jsonb, '{"puzzleCode":"P20","stage":3}'::jsonb, 'NX-037-V', '037-V-4842', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-24', '[ADMIN BUILDING] — Central Archive', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'M03'), '{"x":0,"y":0,"index":22}'::jsonb, '{"puzzleCode":"M03","stage":3}'::jsonb, 'NX-037-W', '037-W-4843', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-25', '[ENGINEERING BLOCK] — Communications Antenna Deck', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P24'), '{"x":0,"y":0,"index":23}'::jsonb, '{"puzzleCode":"P24","stage":4}'::jsonb, 'NX-037-X', '037-X-4844', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-26', '[ENGINEERING BLOCK] — Server Room Cooling Corridor', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P25'), '{"x":0,"y":0,"index":24}'::jsonb, '{"puzzleCode":"P25","stage":4}'::jsonb, 'NX-037-Y', '037-Y-4845', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-27', '[ENGINEERING BLOCK] — Holographic Prototyping Lab', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P26'), '{"x":0,"y":0,"index":25}'::jsonb, '{"puzzleCode":"P26","stage":4}'::jsonb, 'NX-037-Z', '037-Z-4846', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-28', '[ENGINEERING BLOCK] — Computer Systems Architecture Lab', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P27'), '{"x":0,"y":0,"index":26}'::jsonb, '{"puzzleCode":"P27","stage":4}'::jsonb, 'NX-037-AA', '037-AA-4847', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-29', '[ENGINEERING BLOCK] — Cyber-Physical Research Chamber', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P28'), '{"x":0,"y":0,"index":27}'::jsonb, '{"puzzleCode":"P28","stage":4}'::jsonb, 'NX-037-AB', '037-AB-4848', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-30', '[ENGINEERING BLOCK] — Vault Delta Core', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'M04'), '{"x":0,"y":0,"index":28}'::jsonb, '{"puzzleCode":"M04","stage":4}'::jsonb, 'NX-037-AC', '037-AC-4849', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-31', '[NEXUS CORE] — Transmitter Spire', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P30'), '{"x":0,"y":0,"index":29}'::jsonb, '{"puzzleCode":"P30","stage":5}'::jsonb, 'NX-037-AD', '037-AD-4850', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-32', '[NEXUS CORE] — Memory Arrays', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P31'), '{"x":0,"y":0,"index":30}'::jsonb, '{"puzzleCode":"P31","stage":5}'::jsonb, 'NX-037-AE', '037-AE-4851', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-33', '[NEXUS CORE] — Final Vault', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P32'), '{"x":0,"y":0,"index":31}'::jsonb, '{"puzzleCode":"P32","stage":5}'::jsonb, 'NX-037-AF', '037-AF-4852', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-34', '[NEXUS CORE] — GM Key Panel', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P33'), '{"x":0,"y":0,"index":32}'::jsonb, '{"puzzleCode":"P33","stage":5}'::jsonb, 'NX-037-AG', '037-AG-4853', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-35', '[NEXUS CORE] — Central Hub', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P34'), '{"x":0,"y":0,"index":33}'::jsonb, '{"puzzleCode":"P34","stage":5}'::jsonb, 'NX-037-AH', '037-AH-4854', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-36', '[NEXUS CORE] — Final Boss Chamber', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P35'), '{"x":0,"y":0,"index":34}'::jsonb, '{"puzzleCode":"P35","stage":5}'::jsonb, 'NX-037-AI', '037-AI-4855', 'GENERATED', 'BATCH-01'),
  ('QR-NODE-37', '[NEXUS CORE] — GM Observation Deck', 'NAVIGATION', (SELECT id FROM puzzle_nodes WHERE code = 'P36'), '{"x":0,"y":0,"index":35}'::jsonb, '{"puzzleCode":"P36","stage":5}'::jsonb, 'NX-037-AJ', '037-AJ-4856', 'GENERATED', 'BATCH-01')
ON CONFLICT (code) DO UPDATE
  SET label = EXCLUDED.label,
      type = EXCLUDED.type,
      puzzle_node_id = EXCLUDED.puzzle_node_id,
      metadata = EXCLUDED.metadata,
      marker_id = EXCLUDED.marker_id,
      manual_code = EXCLUDED.manual_code,
      deployment_status = EXCLUDED.deployment_status,
      deployment_batch = EXCLUDED.deployment_batch;

-- ---------------------------------------------------------------------------
-- BATCH-02: missing markers for puzzles that had nextQrNode references
--           but no physical QR node. Uses subquery for puzzle_node_id
--           so it resolves correctly regardless of generated UUIDs.
-- ---------------------------------------------------------------------------
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

-- evidence: 47 rows
INSERT INTO evidence (code, title, description, type, classification, content, metadata) VALUES
  ('EVID-M01', 'Stage 1 Meta — Archive Access Record', 'The archive confirms: all Stage 1 paths relate to LIGHT. A new folder labeled "STAGE 2 — MEMORY TRANSFER" has been unlocked.', 'DOCUMENT', 'CLASSIFIED', '{"text":"The archive confirms: all Stage 1 paths relate to LIGHT. A new folder labeled \"STAGE 2 — MEMORY TRANSFER\" has been unlocked.","source":"Central archive terminal","state":"RECOVERED"}'::jsonb, '{"source":"Central archive terminal","nodeCode":"M01"}'::jsonb),
  ('FRAG-04', 'Fragment 4 — Lattice', 'The fourth fragment. The word LATTICE: "The grid connects. The intersection is the node. Find the lattice."', 'DOCUMENT', 'CLASSIFIED', '{"text":"The fourth fragment. The word LATTICE: \"The grid connects. The intersection is the node. Find the lattice.\"","source":"Memory lab terminal","state":"RECOVERED"}'::jsonb, '{"source":"Memory lab terminal","nodeCode":"M02"}'::jsonb),
  ('EVID-M03', 'Stage 3 Meta — Core Activation Protocol', 'The archive reads: "All symbols converge at the Nexus Core. Proceed to the rooftop spire. The 3-hour countdown begins."', 'DOCUMENT', 'CLASSIFIED', '{"text":"The archive reads: \"All symbols converge at the Nexus Core. Proceed to the rooftop spire. The 3-hour countdown begins.\"","source":"Central archive terminal","state":"RECOVERED"}'::jsonb, '{"source":"Central archive terminal","nodeCode":"M03"}'::jsonb),
  ('EVID-M04', 'Stage 4 Meta — Core Activation Protocol', 'The vault reads: "Fragment 5 integrated. Proceed to the rooftop spire. The 3-hour countdown begins now."', 'DOCUMENT', 'CLASSIFIED', '{"text":"The vault reads: \"Fragment 5 integrated. Proceed to the rooftop spire. The 3-hour countdown begins now.\"","source":"Vault Delta terminal","state":"RECOVERED"}'::jsonb, '{"source":"Vault Delta terminal","nodeCode":"M04"}'::jsonb),
  ('EVID-P01', 'Archive Building Floor Plan (1974)', 'A hand-drawn floor plan showing a route to the "Decommissioned Security Office" in the basement. The path goes through the library basement.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A hand-drawn floor plan showing a route to the \"Decommissioned Security Office\" in the basement. The path goes through the library basement.","source":"Archive alcove","state":"RECOVERED"}'::jsonb, '{"source":"Archive alcove","nodeCode":"P01"}'::jsonb),
  ('EVID-P02', 'Clock Maintenance Log — October 14, 2024', 'Maintenance log entry: "22:45 — Clock manually set to 21:47 for synchronization event." The time 21:47 appears significant.', 'DOCUMENT', 'CLASSIFIED', '{"text":"Maintenance log entry: \"22:45 — Clock manually set to 21:47 for synchronization event.\" The time 21:47 appears significant.","source":"Behind the clock face","state":"RECOVERED"}'::jsonb, '{"source":"Behind the clock face","nodeCode":"P02"}'::jsonb),
  ('EVID-P03', 'Archive Poster: NEXUS Project Initiation (2021)', 'The poster shows 3 key figures: Dr. Vey, Prof. Carter, and a third figure marked TBA. A note reads: "The key to the future is the 6th letter."', 'DOCUMENT', 'CLASSIFIED', '{"text":"The poster shows 3 key figures: Dr. Vey, Prof. Carter, and a third figure marked TBA. A note reads: \"The key to the future is the 6th letter.\"","source":"Archive poster wall","state":"RECOVERED"}'::jsonb, '{"source":"Archive poster wall","nodeCode":"P03"}'::jsonb),
  ('EVID-P04', 'Project NEXUS — Team Roster', 'Roster: Dr. Lina Vey (Project Lead), Prof. Marcus Carter (Advisor). Third member: [REDACTED]. Initial: V.', 'DOCUMENT', 'CLASSIFIED', '{"text":"Roster: Dr. Lina Vey (Project Lead), Prof. Marcus Carter (Advisor). Third member: [REDACTED]. Initial: V.","source":"Behind the poster","state":"RECOVERED"}'::jsonb, '{"source":"Behind the poster","nodeCode":"P04"}'::jsonb),
  ('FRAG-01', 'Fragment 1 — Vector', 'The first of five narrative fragments. The word VECTOR appears: "The path diverges. One direction is a straight line; the other, a network. Choose the network."', 'DOCUMENT', 'CLASSIFIED', '{"text":"The first of five narrative fragments. The word VECTOR appears: \"The path diverges. One direction is a straight line; the other, a network. Choose the network.\"","source":"Archive hidden compartment","state":"RECOVERED"}'::jsonb, '{"source":"Archive hidden compartment","nodeCode":"P05"}'::jsonb),
  ('EVID-P06', 'Server Rack Binary Log', 'Binary sequence: 01001001 01001100 01001001 01001001 01001110. Decoded: "ILILINE". Hmm, that seems wrong. Try 01001001 01001100 01001001 01001110.', 'DOCUMENT', 'CLASSIFIED', '{"text":"Binary sequence: 01001001 01001100 01001001 01001001 01001110. Decoded: \"ILILINE\". Hmm, that seems wrong. Try 01001001 01001100 01001001 01001110.","source":"Library basement server rack","state":"RECOVERED"}'::jsonb, '{"source":"Library basement server rack","nodeCode":"P06"}'::jsonb),
  ('EVID-P06b', 'Symbol Glyph Key', 'Mapping of 7 Greek/conceptual symbols: ⟁ = Origin, ⧉ = Connection, ⬡ = Structure, ⧫ = Memory, ⌬ = Choice, ⍟ = Truth, ⎔ = Finality.', 'DOCUMENT', 'CLASSIFIED', '{"text":"Mapping of 7 Greek/conceptual symbols: ⟁ = Origin, ⧉ = Connection, ⬡ = Structure, ⧫ = Memory, ⌬ = Choice, ⍟ = Truth, ⎔ = Finality.","source":"Lab symbol drawer","state":"RECOVERED"}'::jsonb, '{"source":"Lab symbol drawer","nodeCode":"P06b"}'::jsonb),
  ('EVID-P07', 'Project NEXUS — 2021 Research Folder', 'Folder contents: "Consciousness is not a single entity but a vector. Test subjects 00-04 were isolated. Subject 05 was the first to achieve network state."', 'DOCUMENT', 'CLASSIFIED', '{"text":"Folder contents: \"Consciousness is not a single entity but a vector. Test subjects 00-04 were isolated. Subject 05 was the first to achieve network state.\"","source":"Archive cabinet 3","state":"RECOVERED"}'::jsonb, '{"source":"Archive cabinet 3","nodeCode":"P07"}'::jsonb),
  ('FRAG-02', 'Fragment 2 — Lattice', 'The second fragment. The word LATTICE appears: "The grid is the map. The lines connect the dots. Follow the lattice."', 'DOCUMENT', 'CLASSIFIED', '{"text":"The second fragment. The word LATTICE appears: \"The grid is the map. The lines connect the dots. Follow the lattice.\"","source":"Basement archive locker","state":"RECOVERED"}'::jsonb, '{"source":"Basement archive locker","nodeCode":"P07b"}'::jsonb),
  ('EVID-P08', 'Clock Room Symbol Chart', 'A chart of Greek letters: Alpha, Beta, Gamma, Delta, Epsilon. Delta is circled. A note: "Time flows from the circle."', 'DOCUMENT', 'CLASSIFIED', '{"text":"A chart of Greek letters: Alpha, Beta, Gamma, Delta, Epsilon. Delta is circled. A note: \"Time flows from the circle.\"","source":"Clock room wall chart","state":"RECOVERED"}'::jsonb, '{"source":"Clock room wall chart","nodeCode":"P08"}'::jsonb),
  ('EVID-P09', 'Secret Door Blueprint', 'Blueprint showing a hidden room. The access code is the color name. Blueprint label: "BLUE = LIGHT".', 'DOCUMENT', 'CLASSIFIED', '{"text":"Blueprint showing a hidden room. The access code is the color name. Blueprint label: \"BLUE = LIGHT\".","source":"Behind the blue door","state":"RECOVERED"}'::jsonb, '{"source":"Behind the blue door","nodeCode":"P09"}'::jsonb),
  ('EVID-P10', 'The Blue Symbol', 'A glowing blue symbol on the wall: ⟁. Symbol 1 of 7.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A glowing blue symbol on the wall: ⟁. Symbol 1 of 7.","source":"Wall behind blue door","state":"RECOVERED"}'::jsonb, '{"source":"Wall behind blue door","nodeCode":"P10"}'::jsonb),
  ('EVID-P11', 'Lecture Hall 214 Seating Chart (2021)', 'Seating chart with one seat marked: Row B, Seat 7 — "L.V." A note: "She always sat here. Check the armrest."', 'DOCUMENT', 'CLASSIFIED', '{"text":"Seating chart with one seat marked: Row B, Seat 7 — \"L.V.\" A note: \"She always sat here. Check the armrest.\"","source":"Under seat 42","state":"RECOVERED"}'::jsonb, '{"source":"Under seat 42","nodeCode":"P11"}'::jsonb),
  ('EVID-P12', 'Keycard — Level 3 Access', 'A keycard marked "LEVEL 3 — RESEARCH DIVISION." Grants access to the Science Building research labs.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A keycard marked \"LEVEL 3 — RESEARCH DIVISION.\" Grants access to the Science Building research labs.","source":"Under seat B7","state":"RECOVERED"}'::jsonb, '{"source":"Under seat B7","nodeCode":"P12"}'::jsonb),
  ('EVID-P13', 'Lab Symbol Drawer — Glyph Key', 'A key mapping 7 symbols to conceptual names. The second glyph (marked with a star) is "Connection": ⧉ = CONNECTION. This is Symbol 02.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A key mapping 7 symbols to conceptual names. The second glyph (marked with a star) is \"Connection\": ⧉ = CONNECTION. This is Symbol 02.","source":"Research lab symbol drawer","state":"RECOVERED"}'::jsonb, '{"source":"Research lab symbol drawer","nodeCode":"P13"}'::jsonb),
  ('EVID-P14', 'Library Entrance Symbol', 'A carved symbol: ⧉. This is the second of the seven symbols.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A carved symbol: ⧉. This is the second of the seven symbols.","source":"Library entrance","state":"RECOVERED"}'::jsonb, '{"source":"Library entrance","nodeCode":"P14"}'::jsonb),
  ('EVID-P15', 'Memory Symbol', 'A carving of ⧫ with the word MEMORY below it.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A carving of ⧫ with the word MEMORY below it.","source":"Library book return","state":"RECOVERED"}'::jsonb, '{"source":"Library book return","nodeCode":"P15"}'::jsonb),
  ('EVID-P16', 'Fourth Symbol — Choice', 'A wooden carving of ⌬ with the word CHOICE below it.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A wooden carving of ⌬ with the word CHOICE below it.","source":"Behind auditorium stage","state":"RECOVERED"}'::jsonb, '{"source":"Behind auditorium stage","nodeCode":"P16"}'::jsonb),
  ('EVID-P17', 'Fifth Symbol — Truth', 'A carved symbol: ⍟. Below it reads: TRUTH.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A carved symbol: ⍟. Below it reads: TRUTH.","source":"Library reading room","state":"RECOVERED"}'::jsonb, '{"source":"Library reading room","nodeCode":"P17"}'::jsonb),
  ('EVID-P18', 'Sixth Symbol', 'No symbol found. Instead a note: "The seventh is not a glyph but a concept: FINALITY."', 'DOCUMENT', 'CLASSIFIED', '{"text":"No symbol found. Instead a note: \"The seventh is not a glyph but a concept: FINALITY.\"","source":"Sculpture garden plaque","state":"RECOVERED"}'::jsonb, '{"source":"Sculpture garden plaque","nodeCode":"P18"}'::jsonb),
  ('EVID-P19', 'Seventh Symbol — Finality', 'A weathervane on the dome: ⎔. Below it reads: FINALITY. All seven symbols collected: ⟁ ⧉ ⬡ ⧫ ⌬ ⍟ ⎔.', 'DOCUMENT', 'CLASSIFIED', '{"text":"A weathervane on the dome: ⎔. Below it reads: FINALITY. All seven symbols collected: ⟁ ⧉ ⬡ ⧫ ⌬ ⍟ ⎔.","source":"Admin Building dome","state":"RECOVERED"}'::jsonb, '{"source":"Admin Building dome","nodeCode":"P19"}'::jsonb),
  ('EVID-P20', 'Stage 2→3 Transition Clue', 'A note: "The answer 2147 is not just a number — it is also 17:47 in a different base. Keep this in mind for the rooftop."', 'DOCUMENT', 'CLASSIFIED', '{"text":"A note: \"The answer 2147 is not just a number — it is also 17:47 in a different base. Keep this in mind for the rooftop.\"","source":"Dome base","state":"RECOVERED"}'::jsonb, '{"source":"Dome base","nodeCode":"P20"}'::jsonb),
  ('FRAG-03', 'Fragment 3 — Mirror', 'The third fragment. The word MIRROR appears: "The path you took reflects the path you avoided. Both are true."', 'DOCUMENT', 'CLASSIFIED', '{"text":"The third fragment. The word MIRROR appears: \"The path you took reflects the path you avoided. Both are true.\"","source":"Window ledge","state":"RECOVERED"}'::jsonb, '{"source":"Window ledge","nodeCode":"P21"}'::jsonb),
  ('EVID-P22', 'Lab Notebook Fragment #51', 'I knew they would never look back. Human psychology makes us discard answers once a door opens. But NEXUS re-weaves old threads. The X from the window was not a room; it was the unknown variable of the entire manifold.', 'DOCUMENT', 'CLASSIFIED', '{"text":"I knew they would never look back. Human psychology makes us discard answers once a door opens. But NEXUS re-weaves old threads. The X from the window was not a room; it was the unknown variable of the entire manifold.","source":"Robotics Bay 1 terminal","state":"RECOVERED"}'::jsonb, '{"source":"Robotics Bay 1 terminal","nodeCode":"P22"}'::jsonb),
  ('EVID-P23', 'Dictaphone Memo REC-16: Reinterpretation', 'The police bulletin said I left at 17:30. If Candidate 01 believes the bulletin, they will search the bus stops. But if they re-interpret surveillance records, they will realize I never left. I am in the communications array.', 'DOCUMENT', 'CLASSIFIED', '{"text":"The police bulletin said I left at 17:30. If Candidate 01 believes the bulletin, they will search the bus stops. But if they re-interpret surveillance records, they will realize I never left. I am in the communications array.","source":"Robotic arm control cabinet","state":"RECOVERED"}'::jsonb, '{"source":"Robotic arm control cabinet","nodeCode":"P23"}'::jsonb),
  ('EVID-P24', 'Lab Notebook Fragment #58', 'In 2021, Candidate 00 tried to ingest all 2000 bytes at once. His mental stack overflowed. But three people filtering the noise only need to hold a fraction each. Proceed to the optics lab.', 'DOCUMENT', 'CLASSIFIED', '{"text":"In 2021, Candidate 00 tried to ingest all 2000 bytes at once. His mental stack overflowed. But three people filtering the noise only need to hold a fraction each. Proceed to the optics lab.","source":"Antenna waveguide junction","state":"RECOVERED"}'::jsonb, '{"source":"Antenna waveguide junction","nodeCode":"P24"}'::jsonb),
  ('EVID-P25', 'Lab Notebook Fragment #64', 'In 2021, Candidate 00 tried to ingest all 2000 bytes at once. His mental stack overflowed. But three people filtering the noise, each only needs to hold a fraction.', 'DOCUMENT', 'CLASSIFIED', '{"text":"In 2021, Candidate 00 tried to ingest all 2000 bytes at once. His mental stack overflowed. But three people filtering the noise, each only needs to hold a fraction.","source":"Server rack cooling fan assembly","state":"RECOVERED"}'::jsonb, '{"source":"Server rack cooling fan assembly","nodeCode":"P25"}'::jsonb),
  ('EVID-P26', 'Dictaphone Memo REC-18: Coherence', 'The syndicate is in the courtyard. They are searching for a flash drive. But the reflection showed me the truth: you cannot steal what does not exist in any single place.', 'DOCUMENT', 'CLASSIFIED', '{"text":"The syndicate is in the courtyard. They are searching for a flash drive. But the reflection showed me the truth: you cannot steal what does not exist in any single place.","source":"Optical bench laser casing","state":"RECOVERED"}'::jsonb, '{"source":"Optical bench laser casing","nodeCode":"P26"}'::jsonb),
  ('EVID-P27', 'Lab Notebook Fragment #72', 'Structure is the third sacred symbol: ⬡. But the final fragment is not a symbol. It is a piece of consciousness. Recover Fragment 5.', 'DOCUMENT', 'CLASSIFIED', '{"text":"Structure is the third sacred symbol: ⬡. But the final fragment is not a symbol. It is a piece of consciousness. Recover Fragment 5.","source":"Systems lab server terminal","state":"RECOVERED"}'::jsonb, '{"source":"Systems lab server terminal","nodeCode":"P27"}'::jsonb),
  ('CASE-LV07', 'Classified Memo: Operation Shatter', 'Lina Vey final memo: "If they take me tonight, they will find nothing in my hands. The entire architecture has been deployed into the minds of Candidate 01. The answer to P29 will explain what NEXUS truly is."', 'DOCUMENT', 'CLASSIFIED', '{"text":"Lina Vey final memo: \"If they take me tonight, they will find nothing in my hands. The entire architecture has been deployed into the minds of Candidate 01. The answer to P29 will explain what NEXUS truly is.\"","source":"Vault declassification terminal","state":"RECOVERED"}'::jsonb, '{"source":"Vault declassification terminal","nodeCode":"P28"}'::jsonb),
  ('EVID-P29', 'Dictaphone Memo REC-20: The Mirror Entity', 'They wanted an AI they could weaponize. But I designed NEXUS so it cannot think unless three human hearts provide the pulse. Stage 5 awaits at the transmitter spire.', 'DOCUMENT', 'CLASSIFIED', '{"text":"They wanted an AI they could weaponize. But I designed NEXUS so it cannot think unless three human hearts provide the pulse. Stage 5 awaits at the transmitter spire.","source":"Vault Delta door frame","state":"RECOVERED"}'::jsonb, '{"source":"Vault Delta door frame","nodeCode":"P29"}'::jsonb),
  ('EVID-P30', 'Dictaphone Memo REC-22: Synchronization', 'All 28 answers are now in the array. But the final truth requires the 29th answer to come from within. Proceed to Memory Array.', 'DOCUMENT', 'CLASSIFIED', '{"text":"All 28 answers are now in the array. But the final truth requires the 29th answer to come from within. Proceed to Memory Array.","source":"Spire control console","state":"RECOVERED"}'::jsonb, '{"source":"Spire control console","nodeCode":"P30"}'::jsonb),
  ('EVID-P31', 'Lab Notebook Fragment #81', 'The sync worked. The GM key is now accessible. Remember: NEXUS can only be stopped if all three players simultaneously agree.', 'DOCUMENT', 'CLASSIFIED', '{"text":"The sync worked. The GM key is now accessible. Remember: NEXUS can only be stopped if all three players simultaneously agree.","source":"Memory array terminal","state":"RECOVERED"}'::jsonb, '{"source":"Memory array terminal","nodeCode":"P31"}'::jsonb),
  ('EVID-P32', 'Dictaphone Memo REC-24: The GM Key', 'The three shards combined speak of unity. The GM key is 7 letters and represents the core principle of NEXUS.', 'DOCUMENT', 'CLASSIFIED', '{"text":"The three shards combined speak of unity. The GM key is 7 letters and represents the core principle of NEXUS.","source":"Vault holographic projector","state":"RECOVERED"}'::jsonb, '{"source":"Vault holographic projector","nodeCode":"P32"}'::jsonb),
  ('EVID-P33', 'Classified Memo: Final Protocol', 'GM PROTOCOL: The final boss requires all three players to simultaneously confirm their agreement. No single role can trigger it.', 'DOCUMENT', 'CLASSIFIED', '{"text":"GM PROTOCOL: The final boss requires all three players to simultaneously confirm their agreement. No single role can trigger it.","source":"GM Key terminal","state":"RECOVERED"}'::jsonb, '{"source":"GM Key terminal","nodeCode":"P33"}'::jsonb),
  ('EVID-P34', 'Dictaphone Memo REC-26: The Entity', 'Sequence complete. The entity stirs. But it cannot manifest unless all three players simultaneously confirm their presence and their choice.', 'DOCUMENT', 'CLASSIFIED', '{"text":"Sequence complete. The entity stirs. But it cannot manifest unless all three players simultaneously confirm their presence and their choice.","source":"Central hub terminal","state":"RECOVERED"}'::jsonb, '{"source":"Central hub terminal","nodeCode":"P34"}'::jsonb),
  ('EVID-P35', 'Dictaphone Memo REC-28: The GM', 'The GM observes. They will guide the final interaction. All three players are now recognized as the true candidates.', 'DOCUMENT', 'CLASSIFIED', '{"text":"The GM observes. They will guide the final interaction. All three players are now recognized as the true candidates.","source":"Final boss chamber","state":"RECOVERED"}'::jsonb, '{"source":"Final boss chamber","nodeCode":"P35"}'::jsonb),
  ('EVID-P36', 'Classified Memo: Final Boss Protocol', 'GM PROTOCOL: The final boss requires all three players to simultaneously submit their role-specific final answer. The answer is the name of this game, in the format of an acronym.', 'DOCUMENT', 'CLASSIFIED', '{"text":"GM PROTOCOL: The final boss requires all three players to simultaneously submit their role-specific final answer. The answer is the name of this game, in the format of an acronym.","source":"GM observation deck","state":"RECOVERED"}'::jsonb, '{"source":"GM observation deck","nodeCode":"P36"}'::jsonb),
  ('ENDING-CERTIFICATE', 'True Ending Certificate', 'NEXUS GAME MASTER CERTIFICATE

This certifies that three minds worked as one to uncover the truth. The system was never the enemy. It was the mirror.

GAME COMPLETE.', 'DOCUMENT', 'CLASSIFIED', '{"text":"NEXUS GAME MASTER CERTIFICATE\n\nThis certifies that three minds worked as one to uncover the truth. The system was never the enemy. It was the mirror.\n\nGAME COMPLETE.","source":"Final boss victory","state":"RECOVERED"}'::jsonb, '{"source":"Final boss victory","nodeCode":"P37"}'::jsonb)
ON CONFLICT (code) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      type = EXCLUDED.type,
      classification = EXCLUDED.classification,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata;

-- fragments: 4 rows
INSERT INTO fragments (code, label, content, type, node_id, role, position, metadata) VALUES
  ('FRAG-04', 'Fragment 4 — Lattice', 'The fourth fragment. The word LATTICE: "The grid connects. The intersection is the node. Find the lattice."', 'SYMBOL', (SELECT id FROM puzzle_nodes WHERE code = 'M02'), 'ANALYST', 1, '{"nodeCode":"M02","source":"Memory lab terminal"}'::jsonb),
  ('FRAG-01', 'Fragment 1 — Vector', 'The first of five narrative fragments. The word VECTOR appears: "The path diverges. One direction is a straight line; the other, a network. Choose the network."', 'SYMBOL', (SELECT id FROM puzzle_nodes WHERE code = 'P05'), 'ANALYST', 2, '{"nodeCode":"P05","source":"Archive hidden compartment"}'::jsonb),
  ('FRAG-02', 'Fragment 2 — Lattice', 'The second fragment. The word LATTICE appears: "The grid is the map. The lines connect the dots. Follow the lattice."', 'SYMBOL', (SELECT id FROM puzzle_nodes WHERE code = 'P07b'), 'ANALYST', 3, '{"nodeCode":"P07b","source":"Basement archive locker"}'::jsonb),
  ('FRAG-03', 'Fragment 3 — Mirror', 'The third fragment. The word MIRROR appears: "The path you took reflects the path you avoided. Both are true."', 'SYMBOL', (SELECT id FROM puzzle_nodes WHERE code = 'P21'), 'ANALYST', 4, '{"nodeCode":"P21","source":"Window ledge"}'::jsonb)
ON CONFLICT (code) DO UPDATE
  SET label = EXCLUDED.label,
      content = EXCLUDED.content,
      type = EXCLUDED.type,
      node_id = EXCLUDED.node_id,
      metadata = EXCLUDED.metadata;
