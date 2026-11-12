-- CreateTable match_command_counters
CREATE TABLE IF NOT EXISTS "match_command_counters" (
    "match_id" TEXT NOT NULL,
    "last_seq" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "match_command_counters_pkey" PRIMARY KEY ("match_id")
);

-- Unique constraint on match_id and seq to guarantee strictly no duplicates in journal
CREATE UNIQUE INDEX IF NOT EXISTS "match_command_journal_match_id_seq_key" ON "match_command_journal"("match_id", "seq");

-- Seed match_command_counters with existing MAX(seq) from match_command_journal
INSERT INTO "match_command_counters" ("match_id", "last_seq")
SELECT "match_id", COALESCE(MAX("seq"), 0)
FROM "match_command_journal"
GROUP BY "match_id"
ON CONFLICT ("match_id") DO UPDATE
SET "last_seq" = GREATEST("match_command_counters"."last_seq", EXCLUDED."last_seq");

-- Add engine_version column to match_checkpoints
ALTER TABLE "match_checkpoints" ADD COLUMN IF NOT EXISTS "engine_version" TEXT NOT NULL DEFAULT '1.0.0';
