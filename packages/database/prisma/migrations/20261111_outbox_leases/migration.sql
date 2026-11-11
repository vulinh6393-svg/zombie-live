-- AlterTable outbox_events to add lease fields
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "locked_by" TEXT;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

-- Recreate index on outbox_events for status and lease expiration
CREATE INDEX IF NOT EXISTS "outbox_events_status_locked_until_idx" ON "outbox_events"("status", "locked_until");

-- Drop old global unique index on gift_events if exists and add composite unique index
DROP INDEX IF EXISTS "gift_events_provider_event_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "gift_events_provider_live_session_id_provider_event_id_key" 
ON "gift_events"("provider", "live_session_id", "provider_event_id");
