-- ============================================================================
-- NEXUS — Add missing enum values causing Silent Event/Log Failures
--
-- BUG: Edge functions and SQL functions insert game_event_type and
--      admin_action_type values that do NOT exist in their PostgreSQL enum
--      definitions. These inserts fail silently or cause 500 errors.
--
-- Missing values:
--   game_event_type:  GAME_STARTED, GAME_PAUSED, GAME_ENDED, NODE_RESET
--   admin_action_type: CODE_REVEAL, LOCATION_CREATE, LOCATION_UPDATE,
--                      LOCATION_DELETE, QR_DOWNLOAD
--
-- Also fixes logAction to surface errors instead of swallowing them
-- (applied to the edge function code separately).
-- ============================================================================

-- ALTER TYPE ADD VALUE IF NOT EXISTS requires PostgreSQL 12+ (Supabase uses 15)
ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'GAME_STARTED';
ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'GAME_PAUSED';
ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'GAME_ENDED';
ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'NODE_RESET';

ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'CODE_REVEAL';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'LOCATION_CREATE';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'LOCATION_UPDATE';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'LOCATION_DELETE';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'QR_DOWNLOAD';
