-- Phase 08 Reliability & Security Hardening Migration
-- 1. Persistent Session Revocation Store
CREATE TABLE IF NOT EXISTS revoked_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  reason VARCHAR(255) DEFAULT 'USER_LOGOUT'
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_expires ON revoked_sessions (expires_at);

-- 2. Durable Deferred Match Commands (Multi-Match & Crash Resilient)
CREATE TABLE IF NOT EXISTS deferred_match_commands (
  id VARCHAR(255) PRIMARY KEY,
  match_id VARCHAR(255) NOT NULL,
  command_payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DEFERRED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP,
  target_match_id VARCHAR(255),
  transition_reason VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_deferred_commands_status ON deferred_match_commands (status, match_id);
