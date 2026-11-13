import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AuthoritativeGameEngine } from './engine/AuthoritativeGameEngine.js';
import { AuthoritativeGiftEventSchema, AuthoritativeGiftEvent, resolveGiftSkill, SKILL_REGISTRY } from '@zombie-live/shared';
import {
  getDatabaseClient,
  PlayerRepository,
  GiftLedgerRepository,
  MissionRepository,
  MatchRepository,
  OutboxRepository,
  CommandJournalRepository,
  SessionRevocationRepository,
  DeferredCommandRepository,
} from '@zombie-live/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BuildServerOptions {
  logger?: boolean;
  engineSeed?: number;
  maxZombies?: number;
  adminSecret?: string;
  operatorSecret?: string;
  viewerSecret?: string;
  liveBridgeToken?: string;
  allowedOrigins?: string[];
  disableCombat?: boolean;
  enableMockDashboard?: boolean;
  matchId?: string;
  dbDataDir?: string;
  disableAutoTick?: boolean;
}

// Zod schemas for Admin / Command Payloads
const DamageWallSchema = z.object({
  side: z.enum(['LEFT', 'RIGHT']),
  amount: z.number().int().positive().finite().max(5000),
});

const GiftSkillSchema = z.object({
  name: z.string().min(1).max(100).default('TÊN LỬA TỔNG LỰC'),
  sender: z.string().min(1).max(50).default('VIP_Gamer99'),
});

const LiveCommentSchema = z.object({
  type: z.literal('COMMENT'),
  userId: z.string().min(1).max(100),
  userName: z.string().min(1).max(100),
  command: z.string().min(1).max(100),
  timestamp: z.number().optional(),
});

const LiveGiftPayloadSchema = z.object({
  type: z.literal('GIFT'),
  provider: z.enum(['mock', 'tiktok', 'replay']).default('mock'),
  liveSessionId: z.string().min(1).default('live_session_authoritative'),
  providerEventId: z.string().min(1), // Bắt buộc để bảo đảm Idempotency (P0.3)
  userId: z.string().min(1).max(100),
  userName: z.string().min(1).max(100),
  giftId: z.string().min(1).max(100),
  quantity: z.number().int().positive().default(1),
  streakId: z.string().optional(),
  streakStatus: z.enum(['IN_PROGRESS', 'FINISHED']).optional(),
  timestamp: z.number().int().positive().default(() => Date.now()),
});

const LiveEventPayloadSchema = z.discriminatedUnion('type', [LiveCommentSchema, LiveGiftPayloadSchema]);

export function buildServer(opts: BuildServerOptions = {}): {
  app: FastifyInstance;
  io: SocketIOServer;
  engine: AuthoritativeGameEngine;
  stopEngine: () => void;
  adminSecret: string;
  dashboardDevToken: string;
} {
  const app = fastify({ logger: opts.logger ?? false });

  // P0.2 SECURITY: Xóa bỏ hoàn toàn hardcoded default secret.
  // Ở môi trường production, bắt buộc phải có ADMIN_SECRET_KEY >= 16 ký tự.
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredSecret = opts.adminSecret || process.env.ADMIN_SECRET_KEY;
  if (isProduction && (!configuredSecret || configuredSecret.trim().length < 16)) {
    throw new Error('FATAL_SECURITY_ERROR: ADMIN_SECRET_KEY must be configured in environment with at least 16 characters in production mode.');
  }

  // Ở môi trường dev/test, nếu không cấu hình, tự động sinh chuỗi ngẫu nhiên bảo mật cao (không dùng chuỗi đoán trước được)
  const adminSecret = configuredSecret && configuredSecret.trim().length > 0
    ? configuredSecret
    : crypto.randomBytes(32).toString('hex');

  // P1.2: Phân tách rõ ràng secret credentials theo vai trò (Role Separation)
  const operatorSecret = opts.operatorSecret || process.env.OPERATOR_SECRET_KEY || `op_${crypto.createHash('sha256').update(adminSecret + ':operator').digest('hex').substring(0, 24)}`;
  const viewerSecret = opts.viewerSecret || process.env.VIEWER_SECRET_KEY || `view_${crypto.createHash('sha256').update(adminSecret + ':viewer').digest('hex').substring(0, 24)}`;

  // P0.1 (Phase 08): Dedicated Live Bridge Ingress Token (Tách biệt hoàn toàn khỏi Admin Secret)
  const liveBridgeToken = opts.liveBridgeToken || process.env.LIVE_BRIDGE_INGRESS_TOKEN || (isProduction ? `lb_${crypto.createHash('sha256').update(adminSecret + ':live_bridge').digest('hex').substring(0, 24)}` : 'live_bridge_ingress_secret_2026_token');
  if (isProduction && (!liveBridgeToken || liveBridgeToken.trim().length < 16)) {
    throw new Error('FATAL_SECURITY_ERROR: LIVE_BRIDGE_INGRESS_TOKEN must be configured with at least 16 characters in production mode.');
  }

  // Server-side session revocation store (P1.2: Vô hiệu hóa phiên đăng xuất phía máy chủ)
  const revokedSessionIds = new Set<string>();

  // Token phiên làm việc cho Mock Dashboard (P0.1)
  const dashboardDevToken = crypto.randomBytes(24).toString('hex');
  const enableMockDashboard = opts.enableMockDashboard ?? (process.env.ENABLE_MOCK_DASHBOARD === 'true' || !isProduction);

  const rawOrigins = opts.allowedOrigins || (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []);
  const allowedOrigins = rawOrigins.length > 0 ? rawOrigins : (isProduction ? [] : ['*']);

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
  });

  const engine = new AuthoritativeGameEngine({
    seed: opts.engineSeed ?? 42,
    matchId: opts.matchId,
    maxZombies: opts.maxZombies ?? 10,
    disableCombat: opts.disableCombat,
  });

  // Health and Readiness checks
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'game-server',
      engineTick: engine.tick,
      phase: engine.phase,
      baseHp: engine.baseHp,
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/ready', async (req, reply) => {
    let dbAlive = true;
    try {
      if (!dbClient) await initDb();
      if (dbClient) {
        dbAlive = await dbClient.healthCheck();
      }
    } catch {
      dbAlive = false;
    }

    if (!dbAlive) {
      reply.status(503);
      return {
        status: 'degraded',
        reason: 'DATABASE_UNHEALTHY',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    }

    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    const hasRedisUrl = Boolean(process.env.REDIS_URL);
    return {
      status: 'ready',
      uptime: process.uptime(),
      mockMode: process.env.MOCK_MODE !== 'false',
      engine: {
        tick: engine.tick,
        phase: engine.phase,
        baseHp: engine.baseHp,
        gateState: engine.getGateCollisionState(),
        zombieCount: engine.getAllZombies().length,
        soldierCount: engine.getAllSoldiers().length,
        playerCount: engine.getPlayers().length,
        shieldActive: engine.isShieldActive(),
        overclockActive: engine.isOverclockActive(),
        mechActive: Boolean(engine.getActiveMech()),
        airstrikesActive: engine.getActiveAirstrikes().length,
      },
      dependencies: {
        database: {
          configured: hasDbUrl,
          mode: hasDbUrl ? 'postgresql' : 'in_memory_fallback',
          healthy: dbAlive,
        },
        redis: {
          configured: hasRedisUrl,
          mode: hasRedisUrl ? 'redis_queue' : 'in_memory_fallback',
        },
      },
      timestamp: new Date().toISOString(),
    };
  });

  // Rate Limiting HTTP Ingress / Dashboard
  const httpRateLimits = new Map<string, number[]>();
  const checkHttpRateLimit = (key: string, limitPerSecond: number = 300): boolean => {
    const now = Date.now();
    let timestamps = httpRateLimits.get(key);
    if (!timestamps) {
      timestamps = [];
      httpRateLimits.set(key, timestamps);
    }
    const recent = timestamps.filter((t) => now - t < 1000);
    if (recent.length >= limitPerSecond) {
      return false;
    }
    recent.push(now);
    httpRateLimits.set(key, recent);
    return true;
  };

  // Database Repositories (Lazy loaded with fallback)
  let dbClient: any = null;
  let playerRepo: PlayerRepository | null = null;
  let giftLedgerRepo: GiftLedgerRepository | null = null;
  let missionRepo: MissionRepository | null = null;
  let matchRepo: MatchRepository | null = null;
  let outboxRepo: OutboxRepository | null = null;
  let journalRepo: CommandJournalRepository | null = null;
  let sessionRevocationRepo: SessionRevocationRepository | null = null;
  let deferredRepo: DeferredCommandRepository | null = null;

  const initDb = async () => {
    if (!dbClient) {
      try {
        const db = await getDatabaseClient(opts.dbDataDir ? { dataDir: opts.dbDataDir } : undefined);
        dbClient = db;
        playerRepo = new PlayerRepository(db);
        giftLedgerRepo = new GiftLedgerRepository(db);
        missionRepo = new MissionRepository(db);
        matchRepo = new MatchRepository(db);
        outboxRepo = new OutboxRepository(db);
        journalRepo = new CommandJournalRepository(db);
        sessionRevocationRepo = new SessionRevocationRepository(db);
        deferredRepo = new DeferredCommandRepository(db);

        // A1: Nạp các phiên đã thu hồi từ database để duy trì tính bền vững qua restart
        try {
          const persistedRevoked = await sessionRevocationRepo.getActiveRevokedSessionIds();
          for (const sId of persistedRevoked) {
            revokedSessionIds.add(sId);
          }
          if (persistedRevoked.length > 0) {
            app.log.info(`[SECURITY] Đã nạp ${persistedRevoked.length} phiên đã bị thu hồi từ cơ sở dữ liệu`);
          }
        } catch (e: any) {
          app.log.warn(`[SECURITY] Không thể nạp revoked_sessions: ${e.message}`);
        }
      } catch (err: any) {
        app.log.warn(`[DATABASE] Lazy init warning: ${err.message}`);
        if (isProduction) {
          throw err;
        }
      }
    }
  };

  // Unique worker ID for Outbox lease management
  const workerInstanceId = `worker_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;

  // Wire command execution callback from engine to persistent journal and outbox ACK
  engine.onCommandApplied = async (cmd, tick, result) => {
    let journalUpdated = false;
    if (journalRepo) {
      try {
        await journalRepo.markCommandApplied(
          cmd.matchId,
          cmd.commandId,
          tick,
          result.success ? 'APPLIED' : 'REJECTED',
          result.reason
        );
        journalUpdated = true;
      } catch (err: any) {
        app.log.warn(`[JOURNAL] Failed to mark command applied: ${err.message}`);
      }
    } else {
      journalUpdated = true;
    }

    // A2 (Phase 08): Không ACK outbox nếu ghi kết quả command vào journal thất bại!
    if (!journalUpdated) {
      app.log.error(`[RELIABILITY] Journal update failed for command ${cmd.commandId}. Withholding outbox ACK to allow reconciliation.`);
      if (outboxRepo) {
        await outboxRepo.markFailed(cmd.commandId, 'JOURNAL_PERSISTENCE_FAILED', workerInstanceId);
      }
      return;
    }

    if (outboxRepo) {
      try {
        const acked = await outboxRepo.markProcessed(cmd.commandId, workerInstanceId);
        if (!acked) {
          app.log.warn(`[OUTBOX] Failed to ACK command ${cmd.commandId}: lease lost, expired or status not processing`);
        }
      } catch (err: any) {
        app.log.warn(`[OUTBOX] Failed to mark outbox event processed: ${err.message}`);
      }
    }

    // P0.6 (Phase 08.1): Cập nhật trạng thái Deferred Command sang APPLIED hoặc FAILED
    // Chỉ cập nhật khi authoritative engine đã thực thi thành công trên simulation tick!
    if (deferredRepo) {
      try {
        if (result.success) {
          await deferredRepo.markCommandApplied(cmd.commandId);
        } else {
          await deferredRepo.markCommandFailed(cmd.commandId, result.reason || 'ENGINE_REJECTED');
        }
      } catch (err: any) {
        app.log.warn(`[DEFERRED] Failed to update deferred command terminal status: ${err.message}`);
      }
    }
  };

  // Checkpointing deterministically triggered at simulation tick boundary (every 100 ticks = 5s)
  engine.onCheckpointNeeded = async (tick, state) => {
    if (journalRepo) {
      try {
        const lastJournalSeq = state.lastAppliedJournalSeq ?? (await journalRepo.getLatestJournalSeq(engine.matchId));
        const stateHash = engine.getStateHash();
        await journalRepo.saveCheckpoint({
          matchId: engine.matchId,
          tick,
          lastJournalSeq,
          stateSnapshot: state,
          stateHash,
          engineVersion: '1.0.0',
        });
      } catch (chkErr: any) {
        app.log.warn(`[CHECKPOINT] Periodic save warning: ${chkErr.message}`);
      }
    }
  };

  // Wire command transition callback when deferred commands are transitioned across matches
  engine.onCommandTransitionNeeded = async (transition) => {
    if (journalRepo) {
      try {
        await journalRepo.recordTransition({
          commandId: transition.commandId,
          fromMatchId: transition.fromMatchId,
          toMatchId: transition.toMatchId,
          reason: transition.reason || 'MATCH_ENDED_DEFERRED_TRANSITION',
        });
      } catch (err: any) {
        app.log.warn(`[JOURNAL] Failed to record command transition: ${err.message}`);
      }
    }
  };

  // P0.6 (Phase 08.1): Chuyển giao các lệnh hoãn bền vững (Durable Deferred Commands) sang trận mới
  const transferAndQueueDeferredCommands = async (targetMatchId: string) => {
    if (!deferredRepo) return;
    try {
      const transferred = await deferredRepo.transferDeferredCommandsToMatch(targetMatchId);
      for (const cmd of transferred) {
        let jSeq: number | undefined;
        if (journalRepo) {
          const jRes = await journalRepo.appendCommand({
            matchId: targetMatchId,
            commandId: cmd.id,
            tick: engine.tick + 1,
            commandType: 'GIFT_SKILL_DEFERRED',
            payload: cmd.commandPayload,
          });
          jSeq = jRes.entry.seq;
        }
        engine.queueSkillCommand({
          commandId: cmd.id,
          matchId: targetMatchId,
          seq: jSeq,
          targetTick: engine.tick + 1,
          sourceUserId: cmd.commandPayload.senderId,
          sourceUserName: cmd.commandPayload.senderName,
          skillId: cmd.commandPayload.skillId,
          quantity: cmd.commandPayload.deltaQuantity,
          streakId: cmd.commandPayload.streakId,
        });
      }
      if (transferred.length > 0) {
        app.log.info(`[DEFERRED] Transferred and queued ${transferred.length} deferred commands to match ${targetMatchId}`);
      }
    } catch (err: any) {
      app.log.warn(`[DEFERRED] Lỗi khi chuyển giao lệnh hoãn sang trận mới: ${err.message}`);
    }
  };

  // P0.6 (Phase 08.1): Phục hồi các lệnh đã chuyển giao (TRANSFERRED) nhưng server bị crash trước khi APPLIED
  const recoverUnappliedTransferredCommands = async (targetMatchId: string) => {
    if (!deferredRepo) return;
    try {
      const unapplied = await deferredRepo.getUnappliedTransferredCommands(targetMatchId);
      for (const cmd of unapplied) {
        let jSeq: number | undefined;
        if (journalRepo) {
          const jRes = await journalRepo.appendCommand({
            matchId: targetMatchId,
            commandId: cmd.id,
            tick: engine.tick + 1,
            commandType: 'GIFT_SKILL_RECOVERED',
            payload: cmd.commandPayload,
          });
          jSeq = jRes.entry.seq;
        }
        engine.queueSkillCommand({
          commandId: cmd.id,
          matchId: targetMatchId,
          seq: jSeq,
          targetTick: engine.tick + 1,
          sourceUserId: cmd.commandPayload.senderId,
          sourceUserName: cmd.commandPayload.senderName,
          skillId: cmd.commandPayload.skillId,
          quantity: cmd.commandPayload.deltaQuantity,
          streakId: cmd.commandPayload.streakId,
        });
      }
      if (unapplied.length > 0) {
        app.log.info(`[RECOVERY] Recovered and re-queued ${unapplied.length} unapplied transferred commands for match ${targetMatchId}`);
      }
    } catch (err: any) {
      app.log.warn(`[RECOVERY] Lỗi khi phục hồi transferred commands: ${err.message}`);
    }
  };

  // Register onMatchStart callback to persist each new match to DB at its beginning
  engine.onMatchStart = async (matchId, seed, phase, baseHp) => {
    await initDb();
    if (matchRepo) {
      try {
        await matchRepo.startMatch(matchId, seed, phase, baseHp);
      } catch (err: any) {
        app.log.warn(`[MATCH_PERSISTENCE] Error on match start: ${err.message}`);
      }
    }
    // Chuyển giao các lệnh đang hoãn cho trận mới
    await transferAndQueueDeferredCommands(matchId);
  };

  app.addHook('onRequest', async () => {
    if (!dbClient) await initDb();
  });

  app.addHook('onReady', async () => {
    await initDb();
    if (matchRepo) {
      try {
        const activeMatch = await matchRepo.getActiveMatch();
        if (activeMatch) {
          app.log.info(`[RECOVERY] Resuming active match: ${activeMatch.id} (seed: ${activeMatch.seed}, phase: ${activeMatch.phase})`);
          engine.matchId = activeMatch.id;
          engine.seed = activeMatch.seed;
          engine.phase = activeMatch.phase as any;
          engine.baseHp = activeMatch.baseHp;

          if (journalRepo) {
            const latestCheckpoint = await journalRepo.getLatestCheckpoint(activeMatch.id);
            if (latestCheckpoint) {
              app.log.info(`[RECOVERY] Restoring simulation checkpoint for match ${activeMatch.id} at tick ${latestCheckpoint.tick} (seq ${latestCheckpoint.lastJournalSeq})`);
              engine.loadSimulationState(latestCheckpoint.stateSnapshot);

              // Replay unapplied journal commands after checkpoint sequence via tick-ordered queue
              const unapplied = await journalRepo.getCommandsToReplay(activeMatch.id, latestCheckpoint.lastJournalSeq);
              app.log.info(`[RECOVERY] Replaying ${unapplied.length} unapplied commands after seq ${latestCheckpoint.lastJournalSeq}`);
              for (const cmdEntry of unapplied) {
                engine.queueSkillCommand({
                  commandId: cmdEntry.commandId,
                  matchId: cmdEntry.matchId,
                  seq: cmdEntry.seq,
                  targetTick: cmdEntry.tick,
                  sourceUserId: cmdEntry.payload.senderId,
                  sourceUserName: cmdEntry.payload.senderName,
                  skillId: cmdEntry.payload.skillId,
                  quantity: cmdEntry.payload.deltaQuantity,
                  streakId: cmdEntry.payload.streakId,
                });
              }
            }
          }
        } else {
          app.log.info(`[MATCH_PERSISTENCE] No active match found. Starting new match: ${engine.matchId}`);
          await matchRepo.startMatch(engine.matchId, engine.seed, engine.phase, engine.baseHp);
        }

        // P0.6 (Phase 08.1): Phục hồi các lệnh hoãn đã chuyển giao nhưng chưa hoàn thành (crash recovery)
        await recoverUnappliedTransferredCommands(engine.matchId);
      } catch (recoveryErr: any) {
        app.log.warn(`[RECOVERY] Startup recovery error: ${recoveryErr.message}`);
      }
    }
  });

  // Background match persistence watcher (Runs when match ends, strictly non-blocking for 20Hz tick)
  const savedMatchIds = new Set<string>();
  const matchPersistenceTimer = setInterval(async () => {
    if (engine.phase === 'RESULTS' && !savedMatchIds.has(engine.matchId)) {
      await initDb();
      if (matchRepo) {
        try {
          const snapshot = engine.generateSnapshot();
          const mvpName = snapshot.mvpPlayers?.[0]?.name;
          const mvpPlayer = mvpName ? engine.getPlayers().find((p) => p.userName === mvpName) : undefined;
          const canonicalMvpPlayerId = mvpPlayer ? `usr_mock_${mvpPlayer.userId}` : null;

          const contributions = engine.getPlayers().map((p) => ({
            userId: p.userId,
            username: p.userName,
            squad: p.squad,
            score: p.score,
            competitiveScore: p.competitiveScore,
            giftScore: p.giftScore,
            kills: p.kills,
            assists: p.assists,
            repairs: p.repairs,
            rescues: p.rescues,
            bossDamage: p.bossDamage,
            hasJoined: p.hasJoined,
          }));

          const res = await matchRepo.finishMatch(
            engine.matchId,
            engine.result,
            canonicalMvpPlayerId,
            {
              tick: engine.tick,
              durationSeconds: Math.floor(engine.tick / 20),
              activePlayerCount: snapshot.activePlayerCount,
            },
            contributions
          );

          // P0: Chỉ đánh dấu persisted sau khi DB transaction commit thành công
          if (res.saved) {
            savedMatchIds.add(engine.matchId);
          }
        } catch (err: any) {
          app.log.warn(`[MATCH_PERSISTENCE] Error saving match: ${err.message}`);
          // DB error: Không thêm vào savedMatchIds -> sẽ retry ở chu kỳ kế tiếp
        }
      }
    }
  }, 500);

  // Background Outbox Worker: Sole authoritative path for executing gift skills into engine
  const outboxWorkerTimer = setInterval(async () => {
    if (!outboxRepo) {
      await initDb();
      if (!outboxRepo) return;
    }

    try {
      // Claim pending or expired events atomically with row locking (SKIP LOCKED) and 30s lease
      const claimed = await outboxRepo.claimPendingEvents(20, workerInstanceId, 30);
      for (const ev of claimed) {
        try {
          if (ev.eventType === 'GIFT_SKILL_TRIGGER') {
            const p = ev.payload;
            const targetMatchId = p.matchId || engine.matchId;
            let activeTargetMatchId = targetMatchId;

            // P0.3: Match Scoping Policy & Transparent Transitions
            if (targetMatchId !== engine.matchId) {
              if (engine.phase === 'RESULTS') {
                // A3 (Phase 08): Bền vững hóa deferred match commands vào database
                if (deferredRepo) {
                  await deferredRepo.deferCommand(ev.id, targetMatchId, p, 'MATCH_IN_RESULTS');
                }
                // Trận đấu đang ở màn kết quả: đưa vào hàng đợi hoãn cho trận kế tiếp
                const queueRes = engine.queueSkillCommand({
                  commandId: ev.id,
                  matchId: targetMatchId,
                  targetTick: engine.tick + 5,
                  sourceUserId: p.senderId,
                  sourceUserName: p.senderName,
                  skillId: p.skillId,
                  quantity: p.deltaQuantity,
                  streakId: p.streakId,
                });
                if (queueRes.queued) {
                  app.log.info(`[OUTBOX] Event ${ev.id} deferred durable for next match transition.`);
                }
                continue;
              } else if (engine.phase !== 'RESET') {
                // Trận đích cũ đã kết thúc nhưng trận hiện tại đang diễn ra: Chuyển quyền áp dụng sang trận hiện tại
                app.log.info(`[OUTBOX] Transferring gift ${ev.id} from past match ${targetMatchId} to active match ${engine.matchId}`);
                if (journalRepo) {
                  await journalRepo.recordTransition({
                    commandId: ev.id,
                    fromMatchId: targetMatchId,
                    toMatchId: engine.matchId,
                    reason: 'TRANSFERRED_TO_ACTIVE_MATCH',
                  });
                }
                activeTargetMatchId = engine.matchId;
              } else {
                // Không thể chuyển: ghi nhận transition bị từ chối rõ ràng kèm lý do
                app.log.warn(`[OUTBOX] Event ${ev.id} targeted obsolete match ${targetMatchId}. Transitioning to rejected.`);
                if (journalRepo) {
                  await journalRepo.recordTransition({
                    commandId: ev.id,
                    fromMatchId: targetMatchId,
                    toMatchId: engine.matchId,
                    reason: 'REJECTED_OBSOLETE_MATCH',
                  });
                  await journalRepo.appendCommand({
                    matchId: targetMatchId,
                    commandId: ev.id,
                    tick: engine.tick,
                    commandType: 'GIFT_SKILL_STALE_MATCH',
                    payload: { ...p, transitionReason: 'MATCH_ALREADY_COMPLETED' },
                  });
                  await journalRepo.markCommandApplied(targetMatchId, ev.id, engine.tick, 'REJECTED', 'MATCH_ALREADY_COMPLETED');
                }
                const acked = await outboxRepo.markProcessed(ev.id, workerInstanceId);
                if (!acked) {
                  app.log.warn(`[OUTBOX] Failed to ACK rejected obsolete event ${ev.id}`);
                }
                continue;
              }
            }

            // P0.2: Ghi nhận vào Command Journal trước khi đẩy vào engine queue và thu nhận seq thực tế
            let journalSeq: number | undefined;
            if (journalRepo) {
              const res = await journalRepo.appendCommand({
                matchId: activeTargetMatchId,
                commandId: ev.id,
                tick: engine.tick + 1,
                commandType: 'GIFT_SKILL',
                payload: p,
              });
              journalSeq = res.entry.seq;
            }

            // P0.2: Đưa vào hàng đợi lệnh theo tick của Authoritative Engine kèm journalSeq liên tục
            const queueRes = engine.queueSkillCommand({
              commandId: ev.id,
              matchId: activeTargetMatchId,
              seq: journalSeq,
              targetTick: engine.tick + 1,
              sourceUserId: p.senderId,
              sourceUserName: p.senderName,
              skillId: p.skillId,
              quantity: p.deltaQuantity,
              streakId: p.streakId,
            });

            if (!queueRes.queued) {
              if (queueRes.reason === 'COMMAND_ALREADY_EXECUTED') {
                const acked = await outboxRepo.markProcessed(ev.id, workerInstanceId);
                if (!acked) app.log.warn(`[OUTBOX] Failed to ACK already executed command ${ev.id}`);
              } else {
                await outboxRepo.markFailed(ev.id, queueRes.reason || 'ENGINE_QUEUE_REJECTED', workerInstanceId);
              }
            }
            // Note: When queued === true, outboxRepo.markProcessed will be called via engine.onCommandApplied when simulation processes it
          } else {
            const acked = await outboxRepo.markProcessed(ev.id, workerInstanceId);
            if (!acked) app.log.warn(`[OUTBOX] Failed to ACK non-gift outbox event ${ev.id}`);
          }
        } catch (dispatchErr: any) {
          await outboxRepo.markFailed(ev.id, dispatchErr.message || 'DISPATCH_ERROR', workerInstanceId);
        }
      }
    } catch (err: any) {
      // Worker retry loop continues
    }
  }, 100);

  // Core Event Processing Logic (Shared across HTTP Ingress and Dashboard)
  const processLiveEvent = async (ev: any) => {
    if (!dbClient) await initDb();

    if (ev.type === 'COMMENT') {
      const rawCmd = (ev.command || '').toUpperCase().trim();
      let res: { success: boolean; reason?: string } = { success: false, reason: 'UNKNOWN_COMMAND' };
      let squad: 'alpha' | 'bravo' | 'charlie' | undefined;
      let missionAction: 'JOIN' | 'BAN' | 'SUA' | 'CUU' | 'BOSS' | null = null;

      if (rawCmd.startsWith('JOIN')) {
        const parts = rawCmd.split(' ');
        const laneArg = parts[1];
        squad = laneArg === '1' || laneArg === 'ALPHA' ? 'alpha' : laneArg === '3' || laneArg === 'CHARLIE' ? 'charlie' : 'bravo';
        res = engine.handleJoin(ev.userId, ev.userName, squad);
        missionAction = 'JOIN';
      } else if (rawCmd === '1' || rawCmd === 'ALPHA') {
        squad = 'alpha';
        res = engine.handleJoin(ev.userId, ev.userName, 'alpha');
        missionAction = 'JOIN';
      } else if (rawCmd === '2' || rawCmd === 'BRAVO') {
        squad = 'bravo';
        res = engine.handleJoin(ev.userId, ev.userName, 'bravo');
        missionAction = 'JOIN';
      } else if (rawCmd === '3' || rawCmd === 'CHARLIE') {
        squad = 'charlie';
        res = engine.handleJoin(ev.userId, ev.userName, 'charlie');
        missionAction = 'JOIN';
      } else if (rawCmd === 'BAN' || rawCmd === 'BẮN') {
        res = engine.handleShoot(ev.userId);
        missionAction = 'BAN';
      } else if (rawCmd === 'SUA' || rawCmd === 'SỬA') {
        res = engine.handleRepair(ev.userId);
        missionAction = 'SUA';
      } else if (rawCmd === 'CUU' || rawCmd === 'CỨU') {
        res = engine.handleRescue(ev.userId);
        missionAction = 'CUU';
      } else if (rawCmd === 'BOSS') {
        res = engine.handleBossFocus(ev.userId);
        missionAction = 'BOSS';
      }

      if (res.success && missionAction && playerRepo && missionRepo) {
        playerRepo
          .findOrCreate('mock', ev.userId, ev.userName, squad || 'bravo')
          .then((p) => missionRepo!.recordAction(p.id, missionAction!))
          .catch((err) => app.log.warn(`[PERSISTENCE] Error saving mission action: ${err.message}`));
      }

      return { accepted: res.success, reason: res.reason, squad };
    } else if (ev.type === 'GIFT') {
      let deltaQuantity = ev.quantity;
      let settleReason: string | undefined;

      // P0.2 Vấn đề A2: Validate Gift ID & Skill Mapping TRƯỚC KHI tạo transaction settlement vào DB
      const resolvedSkill = resolveGiftSkill(ev.giftId);
      if (!resolvedSkill) {
        return {
          accepted: false,
          reason: 'UNSUPPORTED_GIFT_TYPE',
          skillName: 'UNKNOWN',
          deltaQuantity: 0,
        };
      }

      // 1. Settle in Persistent Gift Ledger & Commit Outbox Event (Atomic DB Transaction)
      if (!giftLedgerRepo) {
        await initDb();
      }

      if (!giftLedgerRepo) {
        return { accepted: false, reason: 'DATABASE_UNAVAILABLE', skillName: resolvedSkill.name };
      }

      try {
        const sRes = await giftLedgerRepo.settleGift({
          provider: ev.provider,
          liveSessionId: ev.liveSessionId,
          matchId: engine.matchId,
          providerEventId: ev.providerEventId,
          senderId: ev.userId,
          senderName: ev.userName,
          giftId: ev.giftId,
          quantity: ev.quantity,
          quantityMode: 'cumulative',
          streakId: ev.streakId,
          streakStatus: ev.streakStatus,
          skillId: resolvedSkill.id,
        });

        if (!sRes.success) {
          // P0.5 (Phase 08.1): Idempotent duplicate ACK nếu event đã được settle trước đó trong Gift Ledger
          if (sRes.reason === 'DUPLICATE_EVENT') {
            return {
              accepted: false,
              idempotentDuplicate: true,
              reason: 'DUPLICATE_EVENT',
              skillName: 'ALREADY_PROCESSED',
              deltaQuantity: 0,
            };
          }
          return { accepted: false, reason: sRes.reason, skillName: 'ALREADY_PROCESSED' };
        }

        deltaQuantity = sRes.deltaQuantity;
        settleReason = sRes.reason;
      } catch (err: any) {
        app.log.warn(`[GIFT_LEDGER] Settlement error: ${err.message}`);
        // Fail-fast! Tuyệt đối không fallback gọi unledgered skill nếu giao dịch database lỗi!
        return { accepted: false, reason: 'LEDGER_TRANSACTION_FAILED', skillName: 'TRANSACTION_ERROR' };
      }

      if (deltaQuantity > 0) {
        return {
          accepted: true,
          reason: settleReason || 'LEDGER_SETTLED_QUEUED_FOR_DISPATCH',
          skillName: resolvedSkill.name,
          deltaQuantity,
        };
      } else {
        return {
          accepted: true,
          reason: settleReason || 'NO_DELTA_QUANTITY',
          skillName: 'NO_SKILL_TRIGGER',
          deltaQuantity: 0,
        };
      }
    }

    return { accepted: false, reason: 'UNSUPPORTED_EVENT_TYPE' };
  };

  // Cookie & Session Token Helpers for Admin Dashboard (HttpOnly, CSRF Protected)
  const parseCookies = (header: string | undefined): Record<string, string> => {
    if (!header) return {};
    const out: Record<string, string> = {};
    const parts = header.split(';');
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const k = part.substring(0, idx).trim();
        const v = part.substring(idx + 1).trim();
        out[k] = decodeURIComponent(v);
      }
    }
    return out;
  };

  const signAdminSession = (payload: any, secret: string): string => {
    const enriched = {
      sessionId: payload.sessionId || crypto.randomUUID(),
      ...payload,
    };
    const b64 = Buffer.from(JSON.stringify(enriched)).toString('base64url');
    const hmac = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
    return `${b64}.${hmac}`;
  };

  const verifyAdminSession = (
    token: string | undefined,
    secret: string
  ): { valid: boolean; role?: 'viewer' | 'operator' | 'admin'; csrfToken?: string; sessionId?: string } => {
    if (!token || !token.includes('.')) return { valid: false };
    const [b64, hmac] = token.split('.');
    const expectedHmac = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
    try {
      if (hmac.length !== expectedHmac.length || !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
        return { valid: false };
      }
      const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
      if (payload.exp && Date.now() > payload.exp) {
        return { valid: false };
      }
      if (payload.sessionId && revokedSessionIds.has(payload.sessionId)) {
        return { valid: false };
      }
      return { valid: true, role: payload.role, csrfToken: payload.csrfToken, sessionId: payload.sessionId };
    } catch {
      return { valid: false };
    }
  };

  const ROLE_HIERARCHY: Record<'viewer' | 'operator' | 'admin', number> = {
    viewer: 1,
    operator: 2,
    admin: 3,
  };

  // Helper to authenticate administrative access via session cookie or direct API header
  const verifyAdminAuth = (
    request: any,
    reply: any,
    requiredRole: 'viewer' | 'operator' | 'admin' = 'viewer'
  ): { authenticated: boolean; role: 'viewer' | 'operator' | 'admin'; actor: string; sessionId?: string } | null => {
    const authHeader = request.headers['x-admin-token'] || request.headers.authorization;
    const cookies = parseCookies(request.headers.cookie);
    const sessionCookie = cookies['admin_session'];

    // 1. Direct API Header Auth (Automated scripts / E2E / testing) -> grants admin role
    if (authHeader === adminSecret || authHeader === `Bearer ${adminSecret}`) {
      return { authenticated: true, role: 'admin', actor: 'api_token' };
    }

    // 2. Session Cookie Auth
    if (sessionCookie) {
      const verified = verifyAdminSession(sessionCookie, adminSecret);
      if (verified.valid && verified.role) {
        // Enforce CSRF protection on state-mutating requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method.toUpperCase())) {
          const csrfHeader = request.headers['x-csrf-token'];
          if (!csrfHeader || csrfHeader !== verified.csrfToken) {
            reply.status(403).send({ error: 'CSRF_TOKEN_INVALID', message: 'Valid x-csrf-token header is required for session mutations.' });
            return null;
          }
        }

        const userRoleLevel = ROLE_HIERARCHY[verified.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[requiredRole];
        if (userRoleLevel >= requiredLevel) {
          return { authenticated: true, role: verified.role, actor: `session_${verified.role}`, sessionId: verified.sessionId };
        } else {
          reply.status(403).send({ error: 'FORBIDDEN_INSUFFICIENT_ROLE', message: `Role '${verified.role}' cannot perform '${requiredRole}' action.` });
          return null;
        }
      }
    }

    reply.status(401).send({ error: 'UNAUTHORIZED_ADMIN_TOKEN', message: 'Valid admin authentication required.' });
    return null;
  };

  // Structured Admin Audit Logging Helper
  const logAdminAction = async (actor: string, role: string, action: string, details: any = {}) => {
    if (journalRepo) {
      try {
        await journalRepo.saveAuditLog({
          actor,
          role,
          action,
          matchId: engine.matchId,
          tick: engine.tick,
          details,
        });
      } catch (err: any) {
        app.log.warn(`[AUDIT] Failed to save audit log: ${err.message}`);
      }
    }
  };

  // Sliding window tick measurement for actualSimulationHz
  const tickHistory: number[] = [];
  const recordTickTimestamp = () => {
    const now = Date.now();
    tickHistory.push(now);
    if (tickHistory.length > 40) {
      tickHistory.shift();
    }
  };

  const getActualSimulationHz = (): number => {
    if (engine.isPaused()) return 0;
    if (tickHistory.length < 5) return 20;
    const durationMs = tickHistory[tickHistory.length - 1] - tickHistory[0];
    if (durationMs <= 0) return 20;
    return Math.round(((tickHistory.length - 1) / durationMs) * 1000 * 10) / 10;
  };

  // POST /api/admin/login — Issue HttpOnly Session Cookie + CSRF Token with Rate Limiting & Strict Role Resolution
  app.post('/api/admin/login', async (request, reply) => {
    const ip = request.ip || 'unknown_ip';
    if (!checkHttpRateLimit(`login_${ip}`, 5)) {
      return reply.status(429).send({ error: 'RATE_LIMIT_EXCEEDED', message: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.' });
    }

    const { secret, role } = (request.body || {}) as { secret?: string; role?: string };
    if (!secret) {
      return reply.status(401).send({ error: 'MISSING_SECRET', message: 'Khóa bí mật là bắt buộc.' });
    }

    let determinedRole: 'viewer' | 'operator' | 'admin' | null = null;
    if (secret === adminSecret) {
      // Master secret: cho phép toàn quyền 'admin' hoặc hạ quyền tự nguyện 'operator' / 'viewer'
      determinedRole = role === 'viewer' || role === 'operator' ? role : 'admin';
    } else if (secret === operatorSecret) {
      // Operator secret: chỉ được gán 'operator' hoặc 'viewer' (không thể tự thăng lên 'admin')
      determinedRole = role === 'viewer' ? 'viewer' : 'operator';
    } else if (secret === viewerSecret) {
      // Viewer secret: nghiêm ngặt chỉ được cấp 'viewer'
      determinedRole = 'viewer';
    } else {
      return reply.status(401).send({ error: 'INVALID_ADMIN_SECRET', message: 'Thông tin xác thực quản trị không chính xác.' });
    }

    const sessionId = crypto.randomUUID();
    const csrfToken = crypto.randomBytes(16).toString('hex');
    const sessionToken = signAdminSession(
      {
        sessionId,
        role: determinedRole,
        csrfToken,
        exp: Date.now() + 24 * 3600 * 1000,
      },
      adminSecret
    );

    const secureFlag = isProduction ? '; Secure' : '';
    reply.header('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict${secureFlag}`);
    await logAdminAction(`session_${determinedRole}`, determinedRole, 'LOGIN', { ip, sessionId });
    return reply.send({
      success: true,
      role: determinedRole,
      csrfToken,
    });
  });

  // POST /api/admin/logout — Server-side Session Revocation + Invalidate Cookie + Socket Disconnect (A1)
  app.post('/api/admin/logout', async (request, reply) => {
    const cookies = parseCookies(request.headers.cookie);
    const sessionCookie = cookies['admin_session'];
    if (sessionCookie && sessionCookie.includes('.')) {
      try {
        const [b64] = sessionCookie.split('.');
        const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
        if (payload?.sessionId) {
          revokedSessionIds.add(payload.sessionId);
          if (sessionRevocationRepo) {
            const exp = payload.exp ? new Date(payload.exp) : new Date(Date.now() + 24 * 3600 * 1000);
            await sessionRevocationRepo.revokeSession(payload.sessionId, exp, 'ADMIN_LOGOUT');
          }
          await logAdminAction(`session_${payload.role || 'user'}`, payload.role || 'viewer', 'LOGOUT', { sessionId: payload.sessionId });

          // A1: Ngắt toàn bộ kết nối WebSocket /admin đang hoạt động sử dụng session vừa bị thu hồi
          const adminNs = io.of('/admin');
          for (const [_, sock] of adminNs.sockets) {
            if (sock.data?.sessionId === payload.sessionId) {
              app.log.info(`[SECURITY] Đóng kết nối socket ${sock.id} do session ${payload.sessionId} đã đăng xuất.`);
              sock.disconnect(true);
            }
          }
        }
      } catch {}
    }

    const secureFlag = isProduction ? '; Secure' : '';
    reply.header('Set-Cookie', `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag}`);
    return reply.send({ success: true, message: 'Đăng xuất thành công. Phiên đã được thu hồi.' });
  });

  // OBS Live Operations Admin Dashboard UI Route
  app.get('/admin', async (request, reply) => {
    const authHeader = request.headers['x-admin-token'] || request.headers.authorization;
    const cookies = parseCookies(request.headers.cookie);
    const sessionCookie = cookies['admin_session'];

    let isAuthed = authHeader === adminSecret || authHeader === `Bearer ${adminSecret}`;
    let userRole = 'admin';
    if (!isAuthed && sessionCookie) {
      const verified = verifyAdminSession(sessionCookie, adminSecret);
      if (verified.valid && verified.role) {
        isAuthed = true;
        userRole = verified.role;
      }
    }

    if (!isAuthed) {
      // Return 401 with secure login UI (Zero sensitive controls or data rendered to unauthenticated guests)
      const loginHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Zombie Đại Chiến — Đăng Nhập Quản Trị Viên (Live Operations)</title>
  <style>
    body { background: #0a0e17; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; width: 380px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h2 { font-size: 18px; color: #00f5d4; margin-bottom: 20px; text-align: center; }
    .field { margin-bottom: 16px; }
    label { display: block; font-size: 13px; color: #94a3b8; margin-bottom: 6px; }
    input, select { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px; color: #fff; font-size: 14px; }
    button { width: 100%; background: #0284c7; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: 700; cursor: pointer; margin-top: 10px; }
    button:hover { background: #0369a1; }
    #err { color: #f43f5e; font-size: 13px; margin-top: 12px; text-align: center; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔒 XÁC THỰC QUẢN TRỊ VIÊN</h2>
    <div class="field">
      <label>Khóa Quản Trị (Admin Secret)</label>
      <input type="password" id="secretInput" placeholder="Nhập ADMIN_SECRET_KEY..." autofocus />
    </div>
    <div class="field">
      <label>Vai Trò (Role)</label>
      <select id="roleSelect">
        <option value="admin">Administrator (Toàn quyền)</option>
        <option value="operator">Operator (Điều hành trận & cổng)</option>
        <option value="viewer">Viewer (Chỉ xem giám sát)</option>
      </select>
    </div>
    <button onclick="login()">ĐĂNG NHẬP VẬN HÀNH</button>
    <div id="err"></div>
  </div>
  <script>
    async function login() {
      const secret = document.getElementById('secretInput').value.trim();
      const role = document.getElementById('roleSelect').value;
      const err = document.getElementById('err');
      err.style.display = 'none';
      if (!secret) return;
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret, role })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const d = await res.json();
          err.textContent = d.message || 'Khóa bí mật không hợp lệ!';
          err.style.display = 'block';
        }
      } catch (e) {
        err.textContent = e.message;
        err.style.display = 'block';
      }
    }
  </script>
</body>
</html>`;
      return reply.status(401).type('text/html').send(loginHtml);
    }

    try {
      const candidates = [
        path.join(__dirname, 'admin.html'),
        path.join(__dirname, '../src/admin.html'),
        path.join(__dirname, '../../apps/game-server/src/admin.html'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const html = fs.readFileSync(p, 'utf-8');
          return reply.type('text/html').send(html);
        }
      }
      return reply.status(404).send('Admin dashboard HTML file not found');
    } catch (err: any) {
      return reply.status(500).send(`Failed to load admin dashboard: ${err.message}`);
    }
  });

  // Admin Authoritative Operations: Start / Restart Match (Requires 'operator')
  app.post('/api/admin/match/start', async (request, reply) => {
    const auth = verifyAdminAuth(request, reply, 'operator');
    if (!auth) return;
    const body = (request.body || {}) as { matchId?: string; seed?: number };
    const newMatchId = body.matchId || `match_${Date.now()}`;
    if (body.seed !== undefined) {
      engine.seed = body.seed;
    }
    engine.restartMatch(newMatchId);
    if (matchRepo) {
      await matchRepo
        .startMatch(newMatchId, engine.seed, engine.phase, engine.baseHp)
        .catch((e: any) => app.log.warn(`[ADMIN] Failed to persist new match: ${e.message}`));
    }
    // P0.6 (Phase 08.1): Chuyển giao các lệnh hoãn sang trận mới khi restart match
    await transferAndQueueDeferredCommands(newMatchId);
    await logAdminAction(auth.actor, auth.role, 'START_MATCH', { newMatchId, seed: engine.seed });
    return reply.send({
      success: true,
      matchId: engine.matchId,
      seed: engine.seed,
      phase: engine.phase,
      tick: engine.tick,
    });
  });

  // Admin Authoritative Operations: Pause Simulation Loop (Requires 'operator')
  app.post('/api/admin/match/pause', async (request, reply) => {
    const auth = verifyAdminAuth(request, reply, 'operator');
    if (!auth) return;
    engine.pauseSimulation();
    await logAdminAction(auth.actor, auth.role, 'PAUSE_SIMULATION', { tick: engine.tick });
    return reply.send({
      success: true,
      phase: engine.phase,
      tick: engine.tick,
      isPaused: engine.isPaused(),
    });
  });

  // Admin Authoritative Operations: Resume Simulation Loop (Requires 'operator')
  app.post('/api/admin/match/resume', async (request, reply) => {
    const auth = verifyAdminAuth(request, reply, 'operator');
    if (!auth) return;
    engine.resumeSimulation();
    await logAdminAction(auth.actor, auth.role, 'RESUME_SIMULATION', { tick: engine.tick });
    return reply.send({
      success: true,
      phase: engine.phase,
      tick: engine.tick,
      isPaused: engine.isPaused(),
    });
  });

  // Admin Authoritative Operations: Emergency Reset (Requires 'admin')
  app.post('/api/admin/match/emergency-reset', async (request, reply) => {
    const auth = verifyAdminAuth(request, reply, 'admin');
    if (!auth) return;
    engine.emergencyReset();

    // P0.6 (Phase 08.1): Chuyển giao các lệnh hoãn bền vững (Durable Deferred Commands) sang trận mới
    await transferAndQueueDeferredCommands(engine.matchId);

    await logAdminAction(auth.actor, auth.role, 'EMERGENCY_RESET', { tick: engine.tick, baseHp: engine.baseHp });
    return reply.send({
      success: true,
      matchId: engine.matchId,
      phase: engine.phase,
      tick: engine.tick,
      baseHp: engine.baseHp,
    });
  });

  // Admin Authoritative Operations: Blast Gate Control (Requires 'operator')
  app.post('/api/admin/gate', async (request, reply) => {
    const auth = verifyAdminAuth(request, reply, 'operator');
    if (!auth) return;
    const body = (request.body || {}) as { action: 'OPEN' | 'CLOSE' };
    if (body.action === 'OPEN') {
      engine.openGate();
    } else if (body.action === 'CLOSE') {
      engine.closeGate();
    } else {
      return reply.status(400).send({ error: 'INVALID_GATE_ACTION', message: 'Action must be OPEN or CLOSE' });
    }
    await logAdminAction(auth.actor, auth.role, body.action === 'OPEN' ? 'OPEN_GATE' : 'CLOSE_GATE', {
      gateState: engine.getGateCollisionState(),
    });
    return reply.send({
      success: true,
      gateState: engine.getGateCollisionState(),
    });
  });

  // Admin Live Operations Monitoring & Telemetry Endpoint (Requires 'viewer')
  app.get('/api/admin/monitoring', async (request, reply) => {
    const auth = verifyAdminAuth(request, reply, 'viewer');
    if (!auth) return;
    if (!dbClient) await initDb();

    let outboxLag = 0;
    let pendingOutbox = 0;
    let oldestPendingAgeMs = 0;
    let latestCheckpointTick = 0;
    let latestJournalSeq = 0;
    let recentAuditLogs: any[] = [];

    if (dbClient) {
      try {
        if (outboxRepo) {
          oldestPendingAgeMs = await outboxRepo.getOldestPendingAgeMs();
        }
        const obRes = await dbClient.query(`SELECT count(*) as count FROM outbox_events WHERE status = 'PENDING' OR status = 'PROCESSING'`);
        pendingOutbox = Number(obRes.rows[0]?.count || 0);
        outboxLag = pendingOutbox;
      } catch {}
      try {
        if (journalRepo) {
          latestJournalSeq = await journalRepo.getLatestJournalSeq(engine.matchId);
          const cp = await journalRepo.getLatestCheckpoint(engine.matchId);
          latestCheckpointTick = cp ? cp.tick : 0;
          recentAuditLogs = await journalRepo.getRecentAuditLogs(10);
        }
      } catch {}
    }

    const connectedClients = (io.of('/game').sockets?.size ?? 0) + (io.sockets?.sockets?.size ?? 0);

    return reply.send({
      server: {
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        nodeVersion: process.version,
        environment: isProduction ? 'production' : 'development',
      },
      engine: {
        matchId: engine.matchId,
        tick: engine.tick,
        phase: engine.phase,
        result: engine.result,
        isPaused: engine.isPaused(),
        baseHp: engine.baseHp,
        maxBaseHp: engine.maxBaseHp,
        waveNumber: engine.getWaveNumber(),
        gateState: engine.getGateCollisionState(),
        entities: {
          zombies: engine.getAllZombies().filter((z: any) => !z.isDead).length,
          soldiers: engine.getAllSoldiers().length,
          players: engine.getPlayers().length,
          mechActive: Boolean(engine.getActiveMech()),
          airstrikesActive: engine.getActiveAirstrikes().length,
        },
        activeBuffs: {
          shield: engine.isShieldActive(),
          overclock: engine.isOverclockActive(),
        },
      },
      operations: {
        dbConnected: Boolean(dbClient),
        outboxPendingCount: pendingOutbox,
        outboxLag,
        oldestPendingAgeMs,
        latestJournalSeq,
        lastAppliedJournalSeq: engine.getLastAppliedJournalSeq(),
        latestCheckpointTick,
        simulationHz: getActualSimulationHz(),
        connectedClients,
        recentAuditLogs,
        currentRole: auth.role,
      },
    });
  });

  // Admin Read-Only Database Inspection Endpoint (Disabled in Production, Requires 'admin' in Dev/Test)
  app.post('/api/admin/query', async (request, reply) => {
    if (isProduction) {
      return reply.status(403).send({
        error: 'FORBIDDEN_IN_PRODUCTION',
        message: 'Arbitrary database queries are strictly prohibited in production mode.',
      });
    }

    const auth = verifyAdminAuth(request, reply, 'admin');
    if (!auth) return;

    if (!dbClient) await initDb();
    if (!dbClient) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }

    const { sql, params } = (request.body || {}) as { sql: string; params?: any[] };
    if (!sql || typeof sql !== 'string') {
      return reply.status(400).send({ error: 'INVALID_SQL' });
    }

    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT')) {
      return reply.status(403).send({ error: 'ONLY_SELECT_QUERIES_ALLOWED' });
    }

    try {
      const res = await dbClient.query(sql, params || []);
      await logAdminAction(auth.actor, auth.role, 'EXECUTE_QUERY', { sql: sql.substring(0, 100) });
      return reply.send({ rows: res.rows, rowCount: res.rowCount });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Secure HTTP endpoint for Live Bridge Ingress (P0.1: Dedicated Ingress Token)
  app.post('/api/live/event', async (request, reply) => {
    const ingressTokenHeader = request.headers['x-live-bridge-token'] || request.headers.authorization;
    const legacyAdminHeader = request.headers['x-admin-token'];

    // P0.1: Kiểm tra riêng biệt LIVE_BRIDGE_INGRESS_TOKEN (không yêu cầu hay cấp quyền admin)
    const isValidToken = 
      ingressTokenHeader === liveBridgeToken || 
      ingressTokenHeader === `Bearer ${liveBridgeToken}` ||
      (!isProduction && (legacyAdminHeader === adminSecret || legacyAdminHeader === `Bearer ${adminSecret}`));

    if (!isValidToken) {
      return reply.status(401).send({ error: 'UNAUTHORIZED_LIVE_BRIDGE_TOKEN', message: 'Ingress requires valid LIVE_BRIDGE_INGRESS_TOKEN.' });
    }

    if (!checkHttpRateLimit('ingress', 400)) {
      return reply.status(429).send({ error: 'RATE_LIMIT_EXCEEDED' });
    }

    const parseRes = LiveEventPayloadSchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({ error: 'INVALID_PAYLOAD', details: parseRes.error.format() });
    }

    const result = await processLiveEvent(parseRes.data);
    return reply.send(result);
  });

  // Mock LIVE Interaction Dashboard (P0.1: Chặn hoàn toàn ở production, bảo vệ bằng session/dev token)
  app.get('/dashboard', async (request, reply) => {
    if (!enableMockDashboard) {
      return reply.status(403).send('FORBIDDEN: Mock dashboard is disabled in production environment.');
    }

    const tokenHeader = request.headers['x-dashboard-token'] || request.headers['x-admin-token'];
    const tokenQuery = (request.query as any)?.token;
    const isAuthed =
      tokenHeader === dashboardDevToken ||
      tokenHeader === adminSecret ||
      tokenQuery === dashboardDevToken ||
      tokenQuery === adminSecret;

    if (!isAuthed) {
      return reply.status(401).send('UNAUTHORIZED: Valid dev token is required to access dashboard.');
    }

    try {
      const candidates = [
        path.join(__dirname, 'dashboard.html'),
        path.join(__dirname, '../src/dashboard.html'),
        path.join(__dirname, '../../apps/game-server/src/dashboard.html'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const html = fs.readFileSync(p, 'utf-8');
          // Bảo mật P0.1: Không chèn token công khai vào HTML
          return reply.type('text/html').send(html);
        }
      }
      return reply.status(404).send('Dashboard file not found');
    } catch (err: any) {
      return reply.status(500).send(`Failed to load dashboard: ${err.message}`);
    }
  });

  // Internal dashboard command endpoint (P0.1: Bắt buộc xác thực, từ chối unauthenticated 401)
  app.post('/api/dashboard/command', async (request, reply) => {
    if (!enableMockDashboard) {
      return reply.status(403).send({ accepted: false, error: 'FORBIDDEN: Mock dashboard is disabled in production.' });
    }

    const tokenHeader = request.headers['x-dashboard-token'] || request.headers['x-admin-token'] || request.headers.authorization;
    const isAuthorized =
      tokenHeader === dashboardDevToken ||
      tokenHeader === adminSecret ||
      tokenHeader === `Bearer ${adminSecret}`;

    if (!isAuthorized) {
      return reply.status(401).send({ accepted: false, error: 'UNAUTHORIZED_DASHBOARD_ACCESS' });
    }

    if (!checkHttpRateLimit('dashboard', 250)) {
      return reply.status(429).send({ accepted: false, error: 'RATE_LIMIT_EXCEEDED' });
    }

    const parseRes = LiveEventPayloadSchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({ accepted: false, error: 'INVALID_PAYLOAD', details: parseRes.error.format() });
    }

    const result = await processLiveEvent(parseRes.data);
    return reply.send(result);
  });

  // Diagnostics & Leaderboard player inspection endpoint (P0.1: Bảo vệ quyền truy cập)
  app.get('/api/dashboard/player/:userId', async (request, reply) => {
    const tokenHeader = request.headers['x-dashboard-token'] || request.headers['x-admin-token'] || request.headers.authorization;
    const isAuthorized =
      tokenHeader === dashboardDevToken ||
      tokenHeader === adminSecret ||
      tokenHeader === `Bearer ${adminSecret}`;

    const { userId } = request.params as { userId: string };
    const player = engine.getPlayers().find((p) => p.userId === userId);

    if (!player) {
      return reply.status(404).send({ error: 'PLAYER_NOT_FOUND' });
    }

    if (isAuthorized) {
      await initDb();
      let persistentProfile: any = null;
      let missions: any = [];
      if (playerRepo && missionRepo) {
        try {
          persistentProfile = await playerRepo.getProfile('mock', userId);
          if (persistentProfile) {
            missions = await missionRepo.getPlayerMissions(persistentProfile.id);
          }
        } catch {}
      }

      return reply.send({
        ...player,
        persistent: persistentProfile,
        missions,
      });
    }

    // Public / Unauthenticated: Safe minimal public fields
    return reply.send({
      userId: player.userId,
      userName: player.userName,
      squad: player.squad,
      score: player.score,
      hasJoined: player.hasJoined,
    });
  });

  // Public Safe Player Profile (P0.4: Safe minimal public fields)
  app.get('/api/players/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id) {
      return reply.status(400).send({ error: 'MISSING_PLAYER_ID' });
    }

    await initDb();
    if (!playerRepo) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }

    const publicProfile = await playerRepo.getPublicProfile(id);
    if (!publicProfile) {
      return reply.status(404).send({ error: 'PLAYER_NOT_FOUND' });
    }

    return reply.send(publicProfile);
  });

  // Secret key used for signing HMAC tokens
  const tokenSigningSecret = crypto.createHash('sha256').update(adminSecret).digest('hex');

  // Server-side session store (P0.1: Secure player session management)
  interface PlayerSession {
    token: string;
    provider: string;
    platformUserId: string;
    expiresAt: number;
  }
  const playerSessions = new Map<string, PlayerSession>();

  // Function to create and issue a secure cryptographically signed player session token
  const issuePlayerSessionToken = (provider: string, platformUserId: string, ttlMs: number = 24 * 3600 * 1000): string => {
    const expiresAt = Date.now() + ttlMs;
    const payload = `${provider}:${platformUserId}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', tokenSigningSecret).update(payload).digest('hex');
    const token = `s_tok_${Buffer.from(payload).toString('base64url')}.${signature}`;
    playerSessions.set(token, { token, provider, platformUserId, expiresAt });
    return token;
  };

  // Function to verify a player session token
  const verifyPlayerSessionToken = (token: string): { provider: string; platformUserId: string } | null => {
    if (!token || !token.startsWith('s_tok_')) return null;
    const raw = token.replace('s_tok_', '');
    const dotIndex = raw.lastIndexOf('.');
    if (dotIndex === -1) return null;
    const b64Payload = raw.substring(0, dotIndex);
    const signature = raw.substring(dotIndex + 1);

    let payload = '';
    try {
      payload = Buffer.from(b64Payload, 'base64url').toString('utf-8');
    } catch {
      return null;
    }

    const expectedSig = crypto.createHmac('sha256', tokenSigningSecret).update(payload).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const [provider, platformUserId, expiresAtStr] = payload.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      playerSessions.delete(token);
      return null;
    }

    return { provider, platformUserId };
  };

  // Endpoint to issue session token for verified players / login
  app.post('/api/auth/session', async (request, reply) => {
    const authHeader = request.headers['x-admin-token'] || request.headers.authorization;
    const isPrivileged = authHeader === adminSecret || authHeader === `Bearer ${adminSecret}`;
    
    // In production, session issuance requires Live Bridge / Admin credential or verified webhook
    if (isProduction && !isPrivileged) {
      return reply.status(403).send({ error: 'FORBIDDEN: Session issuance requires verified provider bridge credentials' });
    }

    const body = request.body as { provider?: string; userId?: string };
    if (!body?.userId) {
      return reply.status(400).send({ error: 'MISSING_USER_ID' });
    }

    const provider = body.provider || 'mock';
    const token = issuePlayerSessionToken(provider, body.userId);
    return reply.send({ token, provider, userId: body.userId, expiresAt: Date.now() + 24 * 3600 * 1000 });
  });

  // Protected Player Profile & Daily Mission API (P0: Require verified signed player session, strictly anti-IDOR)
  app.get('/api/me', async (request, reply) => {
    const authHeader = request.headers.authorization || request.headers['x-player-token'];
    
    let authenticatedUser: { provider: string; platformUserId: string } | null = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer s_tok_')) {
      const token = authHeader.replace('Bearer ', '');
      authenticatedUser = verifyPlayerSessionToken(token);
    } else if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('s_tok_')) {
      authenticatedUser = verifyPlayerSessionToken(authHeader);
    } else if (!isProduction) {
      // Mock mode fallback chỉ cho phép trong môi trường test/development cục bộ (không bật ở production)
      const query = request.query as { provider?: string; userId?: string };
      if (query.userId) {
        authenticatedUser = { provider: query.provider || 'mock', platformUserId: query.userId };
      }
    }

    if (!authenticatedUser) {
      return reply.status(401).send({ error: 'UNAUTHORIZED: Valid signed player session token required to access /api/me' });
    }

    const { provider, platformUserId } = authenticatedUser;

    await initDb();
    if (!playerRepo || !missionRepo) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }

    let profile = await playerRepo.getProfile(provider, platformUserId);
    if (!profile) {
      profile = await playerRepo.findOrCreate(provider, platformUserId, platformUserId);
    }
    const missions = await missionRepo.getPlayerMissions(profile.id);

    return reply.send({
      player: {
        id: profile.id,
        provider: profile.provider,
        username: profile.username,
        level: profile.level,
        xp: profile.xp,
        squad: profile.squad,
      },
      missions,
    });
  });

  // Persistent Leaderboards endpoint (P1)
  app.get('/api/leaderboards', async (request, reply) => {
    const query = request.query as { scope?: string };
    const scope = query.scope || 'match';

    if (scope === 'match') {
      const snap = engine.generateSnapshot();
      return reply.send({
        scope: 'match',
        matchId: snap.matchId,
        leaderboard: snap.mvpPlayers || [],
      });
    }

    await initDb();
    if (!matchRepo) {
      return reply.send({ scope, leaderboard: [] });
    }

    const periodKey = new Date().toISOString().split('T')[0];
    const snap = await matchRepo.getLeaderboardSnapshot(scope, periodKey);
    return reply.send({
      scope,
      periodKey,
      leaderboard: snap?.leaderboard || [],
    });
  });

  // Socket.IO Server attached to Fastify's raw HTTP server
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  // =========================================================================
  // PUBLIC /game NAMESPACE (READ-ONLY FOR GAME CLIENT & VIEWERS)
  // =========================================================================
  const gameNamespace = io.of('/game');

  gameNamespace.on('connection', (socket) => {
    // 1. Gửi full snapshot mới nhất khi vừa kết nối / reconnect
    socket.emit('match:snapshot', engine.generateSnapshot());

    socket.emit('bridge:status', {
      connected: true,
      provider: 'authoritative_server',
      tick: engine.tick,
      phase: engine.phase,
      timestamp: new Date().toISOString(),
    });

    // 2. Client re-sync request
    socket.on('match:getSnapshot', () => {
      socket.emit('match:snapshot', engine.generateSnapshot());
    });

    // BẢO VỆ AN NINH (P0.1): Tuyệt đối từ chối các lệnh quản trị trên namespace công cộng
    const rejectPrivileged = (action: string) => {
      socket.emit('error:unauthorized', {
        action,
        error: 'FORBIDDEN: Admin commands are not permitted on public /game namespace. Connect to /admin with credentials.',
      });
    };

    socket.on('admin:openGate', () => rejectPrivileged('openGate'));
    socket.on('admin:closeGate', () => rejectPrivileged('closeGate'));
    socket.on('admin:giftSkill', () => rejectPrivileged('giftSkill'));
    socket.on('admin:damageWall', () => rejectPrivileged('damageWall'));
  });

  // =========================================================================
  // PROTECTED /admin NAMESPACE (REQUIRES AUTHENTICATION, RBAC & RATE LIMITING)
  // =========================================================================
  const adminNamespace = io.of('/admin');

  // Middleware xác thực bảo mật trước khi cho phép kết nối Socket.IO /admin
  adminNamespace.use(async (socket, next) => {
    if (!dbClient) await initDb();
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (token === adminSecret || token === `Bearer ${adminSecret}`) {
      socket.data.role = 'admin';
      socket.data.actor = 'api_token';
      return next();
    }
    const cookieHeader = socket.handshake.headers?.cookie;
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies['admin_session'] || (token && token.includes('.') ? token : undefined);
    if (sessionToken) {
      const verified = verifyAdminSession(sessionToken, adminSecret);
      if (verified.valid && verified.role) {
        socket.data.role = verified.role;
        socket.data.actor = `session_${verified.role}`;
        socket.data.sessionId = verified.sessionId;
        return next();
      }
    }
    return next(new Error('UNAUTHORIZED_ADMIN_ACCESS'));
  });

  // Helper kiểm tra thẩm quyền RBAC cho từng sự kiện Socket.IO
  const authorizeSocketAction = (
    socket: any,
    minRole: 'viewer' | 'operator' | 'admin',
    action: string
  ): boolean => {
    const role = (socket.data?.role || 'viewer') as 'viewer' | 'operator' | 'admin';
    const currentLevel = ROLE_HIERARCHY[role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];
    if (currentLevel < requiredLevel) {
      socket.emit('error:unauthorized', {
        action,
        error: `FORBIDDEN_INSUFFICIENT_ROLE: Role '${role}' is not authorized to execute '${action}'. Required: '${minRole}'.`,
      });
      return false;
    }
    return true;
  };

  // Rate Limiting in-memory sliding window
  const adminRateLimits = new Map<string, number[]>();
  const checkRateLimit = (socketId: string, limitPerSecond: number = 20): boolean => {
    const now = Date.now();
    let timestamps = adminRateLimits.get(socketId);
    if (!timestamps) {
      timestamps = [];
      adminRateLimits.set(socketId, timestamps);
    }
    // Lọc các request trong 1000ms gần nhất
    const recent = timestamps.filter((t) => now - t < 1000);
    if (recent.length >= limitPerSecond) {
      return false; // Rate limited
    }
    recent.push(now);
    adminRateLimits.set(socketId, recent);
    return true;
  };

  adminNamespace.on('connection', (socket) => {
    socket.emit('admin:status', {
      authenticated: true,
      role: socket.data?.role || 'viewer',
      actor: socket.data?.actor || 'unknown',
      tick: engine.tick,
      phase: engine.phase,
    });

    socket.on('admin:openGate', () => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      if (!authorizeSocketAction(socket, 'operator', 'openGate')) return;
      engine.openGate();
      const snap = engine.generateSnapshot();
      gameNamespace.emit('match:snapshot', snap);
      adminNamespace.emit('match:snapshot', snap);
      logAdminAction(socket.data?.actor || 'socket_op', socket.data?.role || 'operator', 'SOCKET_OPEN_GATE');
    });

    socket.on('admin:closeGate', () => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      if (!authorizeSocketAction(socket, 'operator', 'closeGate')) return;
      engine.closeGate();
      const snap = engine.generateSnapshot();
      gameNamespace.emit('match:snapshot', snap);
      adminNamespace.emit('match:snapshot', snap);
      logAdminAction(socket.data?.actor || 'socket_op', socket.data?.role || 'operator', 'SOCKET_CLOSE_GATE');
    });

    socket.on('admin:giftSkill', async (data: unknown) => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      if (!authorizeSocketAction(socket, 'operator', 'giftSkill')) return;
      const parsed = GiftSkillSchema.safeParse(data);
      if (!parsed.success) {
        return socket.emit('error:invalid_payload', parsed.error.format());
      }

      // P0.1: Tuyệt đối không bypass Gift Ledger & Outbox! Định tuyến qua processLiveEvent
      let giftId = 'rose';
      const nameLower = (parsed.data.name || '').toLowerCase();
      if (nameLower.includes('lửa') || nameLower.includes('airstrike')) giftId = 'galaxy';
      else if (nameLower.includes('khiên') || nameLower.includes('shield')) giftId = 'donut';
      else if (nameLower.includes('xung') || nameLower.includes('overclock')) giftId = 'heart';
      else if (nameLower.includes('viện') || nameLower.includes('reinforce')) giftId = 'rose';
      else if (nameLower.includes('mech')) giftId = 'tiktok_shuttle';
      else if (nameLower.includes('máu') || nameLower.includes('heal')) giftId = 'ice_cream';
      else if (nameLower.includes('vinh') || nameLower.includes('honor')) giftId = 'capsule';

      const liveEvent = {
        type: 'GIFT' as const,
        provider: 'mock' as const,
        liveSessionId: engine.matchId,
        providerEventId: `admin_sock_gift_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        userId: `admin_${socket.data?.actor || 'op'}`,
        userName: parsed.data.sender || 'Admin_Operator',
        giftId,
        quantity: 1,
        timestamp: Date.now(),
      };

      const result = await processLiveEvent(liveEvent);
      socket.emit('admin:giftSkill_result', result);
      logAdminAction(socket.data?.actor || 'socket_op', socket.data?.role || 'operator', 'SOCKET_GIFT_SKILL', {
        giftId,
        sender: parsed.data.sender,
        result,
      });
    });

    socket.on('admin:damageWall', (data: unknown) => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      if (!authorizeSocketAction(socket, 'admin', 'damageWall')) return;
      const parsed = DamageWallSchema.safeParse(data);
      if (!parsed.success) {
        return socket.emit('error:invalid_payload', parsed.error.format());
      }
      engine.damageWall(parsed.data.side, parsed.data.amount);
      const snap = engine.generateSnapshot();
      gameNamespace.emit('match:snapshot', snap);
      adminNamespace.emit('match:snapshot', snap);
      logAdminAction(socket.data?.actor || 'socket_admin', socket.data?.role || 'admin', 'SOCKET_DAMAGE_WALL', {
        side: parsed.data.side,
        amount: parsed.data.amount,
      });
    });

    socket.on('disconnect', () => {
      adminRateLimits.delete(socket.id);
    });
  });

  // =========================================================================
  // 20Hz FIXED-TICK SIMULATION LOOP USING MONOTONIC CLOCK (performance.now)
  // 10Hz BROADCAST DELIVERS 100% EVENTS PRODUCED ON ODD & EVEN TICKS
  // =========================================================================
  let lastMonotonicTime = performance.now();
  let accumulator = 0;
  const TICK_DURATION_MS = 50; // 20Hz (50ms)
  const CATCH_UP_LIMIT = 5;

  let simulationInterval: any = null;
  if (!opts.disableAutoTick) {
    simulationInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastMonotonicTime;
      lastMonotonicTime = now;
      accumulator += elapsed;

      let ticksRan = 0;
      while (accumulator >= TICK_DURATION_MS && ticksRan < CATCH_UP_LIMIT) {
        engine.step();
        recordTickTimestamp();
        accumulator -= TICK_DURATION_MS;
        ticksRan++;

        // Phát snapshot tại 10Hz (mỗi 2 ticks)
        if (engine.tick % 2 === 0) {
          const snapshot = engine.generateBroadcastSnapshot();
          gameNamespace.emit('match:snapshot', snapshot);
          adminNamespace.emit('match:snapshot', snapshot);
        }
      }

      // Bounded catch-up khống chế tối đa 5 ticks, ngăn chặn spiral of death
      if (accumulator > TICK_DURATION_MS * CATCH_UP_LIMIT) {
        accumulator = 0;
      }
    }, 20); // Kiểm tra mỗi 20ms cho độ chính xác cao
  }

  const stopEngine = () => {
    if (simulationInterval) clearInterval(simulationInterval);
    clearInterval(matchPersistenceTimer);
    clearInterval(outboxWorkerTimer);
  };

  app.addHook('onClose', async (_instance) => {
    stopEngine();
    if (dbClient) {
      try {
        await dbClient.close();
      } catch {}
      dbClient = null;
    }
  });

  return { app, io, engine, stopEngine, adminSecret, dashboardDevToken };
}
