-- CreateTable match_command_journal
CREATE TABLE IF NOT EXISTS "match_command_journal" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "seq" BIGINT NOT NULL,
    "tick" INTEGER NOT NULL,
    "command_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applied_tick" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_command_journal_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on match_id and command_id to prevent duplicate journaling
CREATE UNIQUE INDEX IF NOT EXISTS "match_command_journal_match_id_command_id_key" ON "match_command_journal"("match_id", "command_id");

-- Index on match_id and seq for ordered recovery
CREATE INDEX IF NOT EXISTS "match_command_journal_match_id_seq_idx" ON "match_command_journal"("match_id", "seq");

-- CreateTable match_checkpoints
CREATE TABLE IF NOT EXISTS "match_checkpoints" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "last_journal_seq" BIGINT NOT NULL,
    "state_snapshot" JSONB NOT NULL,
    "state_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_checkpoints_pkey" PRIMARY KEY ("id")
);

-- Index on match_id and tick for latest checkpoint lookup
CREATE INDEX IF NOT EXISTS "match_checkpoints_match_id_tick_idx" ON "match_checkpoints"("match_id", "tick");
