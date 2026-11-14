-- Persistent Event Identity & Comment Deduplication
CREATE TABLE IF NOT EXISTS processed_events (
  event_key VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  command VARCHAR(255),
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_events_type ON processed_events (event_type, processed_at);
