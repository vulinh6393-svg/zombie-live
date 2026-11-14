-- Persistent Event Identity & Comment Deduplication with Atomic Reservation
CREATE TABLE IF NOT EXISTS processed_events (
  event_key VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  command VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING',
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_events_type ON processed_events (event_type, processed_at);
CREATE INDEX IF NOT EXISTS idx_processed_events_status ON processed_events (status);
