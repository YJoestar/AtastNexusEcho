-- ============================================================================
-- NEXUS — QR Field Marker Rework
--
-- Adds deployment-grade columns to qr_nodes so each marker carries:
--   marker_id         — human-facing bureau identifier (e.g. NX-037-A)
--   manual_code       — human-typed fallback (e.g. 037-A-4821)
--   deployment_status — GENERATED / ACTIVE / DEPLOYED / VERIFIED / ARCHIVED / DISABLED
--   deployment_batch  — print-run identifier (e.g. BATCH-01)
--
-- Also tightens the RLS policy: players can no longer read the full marker
-- table. They learn markers only through scanning (scan_qr_code RPC), not
-- by querying the table directly.
-- ============================================================================

-- Add new columns (idempotent)
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS marker_id TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS manual_code TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS deployment_status TEXT DEFAULT 'GENERATED';
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS deployment_batch TEXT;
ALTER TABLE qr_nodes ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ;

-- Add unique constraints to prevent duplicate markers / manual codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_nodes_marker_id ON qr_nodes(marker_id) WHERE marker_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_nodes_manual_code ON qr_nodes(manual_code) WHERE manual_code IS NOT NULL;

-- Fix RLS: players should NOT read qr_nodes directly — that leaks every marker.
-- They discover markers through the scan_qr_code RPC only.
DROP POLICY IF EXISTS "Players read qr_nodes" ON qr_nodes;
CREATE POLICY "Players discover qr_nodes through scanning only" ON qr_nodes
  FOR SELECT USING (
    id = ANY(
      SELECT qrn.id FROM qr_nodes qrn
      JOIN game_events ge ON ge.payload->>'qrCode' = qrn.code
      JOIN players p ON p.auth_user_id = auth.uid()
      WHERE p.team_id = ge.team_id
    )
  );

-- Service role / admin retains full access
CREATE POLICY "Service role can manage qr_nodes" ON qr_nodes
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );
