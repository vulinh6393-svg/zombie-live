-- Incremental Migration for Atomic Reservation status columns
ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING';
ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_processed_events_status ON processed_events (status);
