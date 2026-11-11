import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AuthoritativeGameEngine } from './engine/AuthoritativeGameEngine.js';
import { AuthoritativeGiftEventSchema, AuthoritativeGiftEvent } from '@zombie-live/shared';
import {
  getDatabaseClient,
  PlayerRepository,
  GiftLedgerRepository,
  MissionRepository,
  MatchRepository,
  OutboxRepository,
} from '@zombie-live/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BuildServerOptions {
  logger?: boolean;
  engineSeed?: number;
  maxZombies?: number;
  adminSecret?: string;
  allowedOrigins?: string[];
  disableCombat?: boolean;
  enableMockDashboard?: boolean;
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

  app.get('/ready', async () => {
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
        playerCount: engine.getPlayers().length,
      },
      dependencies: {
        database: {
          configured: hasDbUrl,
          mode: hasDbUrl ? 'postgresql' : 'in_memory_fallback',
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

  const initDb = async () => {
    if (!dbClient) {
      try {
        const db = await getDatabaseClient();
        dbClient = db;
        playerRepo = new PlayerRepository(db);
        giftLedgerRepo = new GiftLedgerRepository(db);
        missionRepo = new MissionRepository(db);
        matchRepo = new MatchRepository(db);
        outboxRepo = new OutboxRepository(db);
      } catch (err: any) {
        app.log.warn(`[DATABASE] Lazy init warning: ${err.message}`);
      }
    }
  };

  app.addHook('onReady', async () => {
    await initDb();
    if (matchRepo) {
      try {
        await matchRepo.startMatch(engine.matchId, engine.seed, engine.phase, engine.baseHp);
      } catch {}
    }
  });

  // Background match persistence watcher (Runs when match ends, strictly non-blocking for 20Hz tick)
  let lastSavedMatchId = '';
  const matchPersistenceTimer = setInterval(async () => {
    if (engine.phase === 'RESULTS' && lastSavedMatchId !== engine.matchId) {
      lastSavedMatchId = engine.matchId;
      await initDb();
      if (matchRepo) {
        try {
          const snapshot = engine.generateSnapshot();
          const mvp = snapshot.mvpPlayers?.[0];
          const contributions = engine.getPlayers().map((p) => ({
            userId: p.userId,
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

          await matchRepo.finishMatch(
            engine.matchId,
            engine.result,
            mvp?.name || null,
            {
              tick: engine.tick,
              durationSeconds: Math.floor(engine.tick / 20),
              activePlayerCount: snapshot.activePlayerCount,
            },
            contributions
          );
        } catch (err: any) {
          app.log.warn(`[MATCH_PERSISTENCE] Error saving match: ${err.message}`);
        }
      }
    }
  }, 1000);

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

      // 1. Settle in Persistent Gift Ledger
      if (giftLedgerRepo) {
        try {
          const sRes = await giftLedgerRepo.settleGift({
            provider: ev.provider,
            liveSessionId: ev.liveSessionId,
            providerEventId: ev.providerEventId,
            senderId: ev.userId,
            senderName: ev.userName,
            giftId: ev.giftId,
            quantity: ev.quantity,
            quantityMode: 'cumulative',
            streakId: ev.streakId,
            streakStatus: ev.streakStatus,
          });

          if (!sRes.success) {
            return { accepted: false, reason: sRes.reason, skillName: 'ALREADY_PROCESSED' };
          }

          deltaQuantity = sRes.deltaQuantity;
          settleReason = sRes.reason;
        } catch (err: any) {
          app.log.warn(`[GIFT_LEDGER] Settlement error: ${err.message}`);
        }
      }

      // 2. Dispatch to Authoritative Engine if deltaQuantity > 0
      if (deltaQuantity > 0) {
        const res = engine.handleGift({
          provider: ev.provider,
          liveSessionId: ev.liveSessionId,
          providerEventId: ev.providerEventId,
          senderId: ev.userId,
          senderName: ev.userName,
          giftId: ev.giftId,
          quantity: deltaQuantity,
          streakId: ev.streakId,
          streakStatus: ev.streakStatus,
          timestamp: ev.timestamp,
        });

        return {
          accepted: res.success,
          reason: res.reason,
          skillName: res.skillName,
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

  // Secure HTTP endpoint for Live Bridge / Admin Event Ingestion
  app.post('/api/live/event', async (request, reply) => {
    const authHeader = request.headers['x-admin-token'] || request.headers.authorization;
    if (authHeader !== adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return reply.status(401).send({ error: 'UNAUTHORIZED_ADMIN_TOKEN' });
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

  // Player Profile & Daily Mission API (P1)
  app.get('/api/me', async (request, reply) => {
    const query = request.query as { provider?: string; userId?: string; username?: string };
    const provider = query.provider || 'mock';
    const userId = query.userId;
    const username = query.username;

    if (!userId) {
      return reply.status(400).send({ error: 'MISSING_USER_ID' });
    }

    await initDb();
    if (!playerRepo || !missionRepo) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }

    let profile = await playerRepo.getProfile(provider, userId);
    if (!profile) {
      profile = await playerRepo.findOrCreate(provider, userId, username || userId);
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
  // PROTECTED /admin NAMESPACE (REQUIRES AUTHENTICATION & RATE LIMITING)
  // =========================================================================
  const adminNamespace = io.of('/admin');

  // Middleware xác thực bảo mật trước khi cho phép kết nối
  adminNamespace.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (token === adminSecret || token === `Bearer ${adminSecret}`) {
      return next();
    }
    return next(new Error('UNAUTHORIZED_ADMIN_ACCESS'));
  });

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
    socket.emit('admin:status', { authenticated: true, tick: engine.tick, phase: engine.phase });

    socket.on('admin:openGate', () => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      engine.openGate();
      const snap = engine.generateSnapshot();
      gameNamespace.emit('match:snapshot', snap);
      adminNamespace.emit('match:snapshot', snap);
    });

    socket.on('admin:closeGate', () => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      engine.closeGate();
      const snap = engine.generateSnapshot();
      gameNamespace.emit('match:snapshot', snap);
      adminNamespace.emit('match:snapshot', snap);
    });

    socket.on('admin:giftSkill', (data: unknown) => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      const parsed = GiftSkillSchema.safeParse(data);
      if (!parsed.success) {
        return socket.emit('error:invalid_payload', parsed.error.format());
      }
      engine.triggerGiftSkill(parsed.data.name, parsed.data.sender);
      const snap = engine.generateSnapshot();
      gameNamespace.emit('match:snapshot', snap);
      adminNamespace.emit('match:snapshot', snap);
    });

    socket.on('admin:damageWall', (data: unknown) => {
      if (!checkRateLimit(socket.id)) return socket.emit('error:rate_limit');
      const parsed = DamageWallSchema.safeParse(data);
      if (!parsed.success) {
        return socket.emit('error:invalid_payload', parsed.error.format());
      }
      engine.damageWall(parsed.data.side, parsed.data.amount);
      const snap = engine.generateSnapshot();
      gameNamespace.emit('match:snapshot', snap);
      adminNamespace.emit('match:snapshot', snap);
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

  const simulationInterval = setInterval(() => {
    const now = performance.now();
    const elapsed = now - lastMonotonicTime;
    lastMonotonicTime = now;
    accumulator += elapsed;

    let ticksRan = 0;
    while (accumulator >= TICK_DURATION_MS && ticksRan < CATCH_UP_LIMIT) {
      engine.step();
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

  const stopEngine = () => {
    clearInterval(simulationInterval);
    clearInterval(matchPersistenceTimer);
  };

  app.addHook('onClose', (_instance, done) => {
    stopEngine();
    done();
  });

  return { app, io, engine, stopEngine, adminSecret, dashboardDevToken };
}
