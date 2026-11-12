-- CreateTable match_command_transitions
CREATE TABLE IF NOT EXISTS "match_command_transitions" (
    "id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "from_match_id" TEXT NOT NULL,
    "to_match_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_command_transitions_pkey" PRIMARY KEY ("id")
);

-- Index on command_id for audit lookup
CREATE INDEX IF NOT EXISTS "match_command_transitions_command_id_idx" ON "match_command_transitions"("command_id");

-- CreateTable admin_audit_logs
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "match_id" TEXT,
    "tick" INTEGER,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at" DESC);
