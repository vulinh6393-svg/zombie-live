-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "squad" TEXT DEFAULT 'bravo',
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "seed" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "base_hp" INTEGER NOT NULL,
    "mvp_player_id" TEXT,
    "stats" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_players" (
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "squad" TEXT NOT NULL DEFAULT 'bravo',
    "score" INTEGER NOT NULL DEFAULT 0,
    "competitive_score" INTEGER NOT NULL DEFAULT 0,
    "gift_score" INTEGER NOT NULL DEFAULT 0,
    "has_joined" BOOLEAN NOT NULL DEFAULT true,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "repairs" INTEGER NOT NULL DEFAULT 0,
    "rescues" INTEGER NOT NULL DEFAULT 0,
    "boss_damage" INTEGER NOT NULL DEFAULT 0,
    "gift_damage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "match_players_pkey" PRIMARY KEY ("match_id","player_id")
);

-- CreateTable
CREATE TABLE "event_log" (
    "id" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "live_session_id" TEXT,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_mappings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "gift_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 0,
    "per_trigger_cap" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "gift_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_value" INTEGER NOT NULL,
    "xp_reward" INTEGER NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_progress" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "current_val" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_grants" (
    "id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "xp_granted" INTEGER NOT NULL DEFAULT 0,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_inventory" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "player_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshots" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "live_session_id" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "gift_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "delta_quantity" INTEGER NOT NULL DEFAULT 1,
    "quantity_mode" TEXT NOT NULL DEFAULT 'cumulative',
    "streak_id" TEXT,
    "streak_status" TEXT NOT NULL DEFAULT 'FINISHED',
    "settlement_status" TEXT NOT NULL DEFAULT 'SETTLED',
    "skill_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_streaks" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "live_session_id" TEXT NOT NULL,
    "streak_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "gift_id" TEXT NOT NULL,
    "last_settled_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "aggregate" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gameplay_actions" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gameplay_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_provider_platform_user_id_key" ON "players"("provider", "platform_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_log_event_key_key" ON "event_log"("event_key");

-- CreateIndex
CREATE UNIQUE INDEX "gift_mappings_provider_gift_id_key" ON "gift_mappings"("provider", "gift_id");

-- CreateIndex
CREATE UNIQUE INDEX "missions_code_key" ON "missions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mission_progress_player_id_mission_id_period_key" ON "mission_progress"("player_id", "mission_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "reward_grants_source_key_key" ON "reward_grants"("source_key");

-- CreateIndex
CREATE UNIQUE INDEX "gift_events_provider_event_id_key" ON "gift_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "gift_events_provider_live_session_id_idx" ON "gift_events"("provider", "live_session_id");

-- CreateIndex
CREATE INDEX "gift_events_sender_id_idx" ON "gift_events"("sender_id");

-- CreateIndex
CREATE INDEX "gift_events_streak_id_idx" ON "gift_events"("streak_id");

-- CreateIndex
CREATE UNIQUE INDEX "gift_streaks_provider_live_session_id_streak_id_key" ON "gift_streaks"("provider", "live_session_id", "streak_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "gameplay_actions_match_id_player_id_idx" ON "gameplay_actions"("match_id", "player_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_log" ADD CONSTRAINT "event_log_live_session_id_fkey" FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_progress" ADD CONSTRAINT "mission_progress_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_progress" ADD CONSTRAINT "mission_progress_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
