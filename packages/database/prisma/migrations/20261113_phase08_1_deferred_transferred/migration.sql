-- Phase 08.1 Deferred Commands Durability & Transferred Status Migration
ALTER TABLE deferred_match_commands ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_deferred_commands_transferred ON deferred_match_commands (status, target_match_id);
