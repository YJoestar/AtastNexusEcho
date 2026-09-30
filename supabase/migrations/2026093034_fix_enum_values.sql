-- Fix the migration that failed (ALTER TYPE inside DO block is not allowed)
-- This adds the missing enum values that the previous migration attempted

ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'GAME_STARTED';
ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'GAME_PAUSED';
ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'GAME_ENDED';
ALTER TYPE game_event_type ADD VALUE IF NOT EXISTS 'NODE_RESET';

ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'CODE_REVEAL';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'LOCATION_CREATE';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'LOCATION_UPDATE';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'LOCATION_DELETE';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'QR_DOWNLOAD';
