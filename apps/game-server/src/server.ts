import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { AuthoritativeGameEngine } from './engine/AuthoritativeGameEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BuildServerOptions {
  logger?: boolean;
  engineSeed?: number;
  maxZombies?: number;
  adminSecret?: string;
  allowedOrigins?: string[];
  disableCombat?: boolean;
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

const LiveEventPayloadSchema = z.object({
  type: z.enum(['COMMENT', 'GIFT']),
  userId: z.string().min(1).max(100),
  userName: z.string().min(1).max(100),
  command: z.string().optional(),
  giftId: z.string().optional(),
  giftName: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
  streakId: z.string().optional(),
  timestamp: z.number().optional(),
});

export function buildServer(opts: BuildServerOptions = {}): {
  app: FastifyInstance;
  io: SocketIOServer;
  engine: AuthoritativeGameEngine;
  stopEngine: () => void;
  adminSecret: string;
} {
  const app = fastify({ logger: opts.logger ?? false });
  const adminSecret = opts.adminSecret || process.env.ADMIN_SECRET_KEY || 'zombie_live_admin_secret_dev_2026';

  const allowedOrigins = opts.allowedOrigins || (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*']);

  app.register(cors, {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
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

  // Secure HTTP endpoint for Live Bridge / Admin Event Ingestion
  app.post('/api/live/event', async (request, reply) => {
    const authHeader = request.headers['x-admin-token'] || request.headers.authorization;
    if (authHeader !== adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return reply.status(401).send({ error: 'UNAUTHORIZED_ADMIN_TOKEN' });
    }

    const parseRes = LiveEventPayloadSchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({ error: 'INVALID_PAYLOAD', details: parseRes.error.format() });
    }

    const ev = parseRes.data;
    if (ev.type === 'COMMENT') {
      const rawCmd = (ev.command || '').toUpperCase().trim();
      if (rawCmd.startsWith('JOIN')) {
        const parts = rawCmd.split(' ');
        const laneArg = parts[1];
        const squad = laneArg === '1' || laneArg === 'ALPHA' ? 'alpha' : laneArg === '3' || laneArg === 'CHARLIE' ? 'charlie' : 'bravo';
        const res = engine.handleJoin(ev.userId, ev.userName, squad);
        return reply.send({ accepted: res.success, reason: res.reason, squad });
      } else if (rawCmd === 'BAN' || rawCmd === 'BẮN') {
        const res = engine.handleShoot(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      } else if (rawCmd === 'SUA' || rawCmd === 'SỬA') {
        const res = engine.handleRepair(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      } else if (rawCmd === 'CUU' || rawCmd === 'CỨU') {
        const res = engine.handleRescue(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      } else if (rawCmd === 'BOSS') {
        const res = engine.handleBossFocus(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      }
      return reply.send({ accepted: false, reason: 'UNKNOWN_COMMAND' });
    } else if (ev.type === 'GIFT') {
      const giftId = ev.giftId || 'gift_missile';
      const res = engine.handleGift(giftId, ev.userId, ev.userName, ev.quantity, ev.streakId);
      return reply.send({ accepted: res.success, skillName: res.skillName });
    }

    return reply.status(400).send({ error: 'UNSUPPORTED_EVENT_TYPE' });
  });

  // Mock LIVE Interaction Dashboard (Secure, separated from /overlay)
  app.get('/dashboard', async (_request, reply) => {
    try {
      const candidates = [
        path.join(__dirname, 'dashboard.html'),
        path.join(__dirname, '../src/dashboard.html'),
        path.join(__dirname, '../../apps/game-server/src/dashboard.html'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const html = fs.readFileSync(p, 'utf-8');
          return reply.type('text/html').send(html);
        }
      }
      return reply.status(404).send('Dashboard file not found');
    } catch (err: any) {
      return reply.status(500).send(`Failed to load dashboard: ${err.message}`);
    }
  });

  // Internal dashboard command endpoint (No admin token needed on frontend)
  app.post('/api/dashboard/command', async (request, reply) => {
    const parseRes = LiveEventPayloadSchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({ accepted: false, error: 'INVALID_PAYLOAD', details: parseRes.error.format() });
    }

    const ev = parseRes.data;
    if (ev.type === 'COMMENT') {
      const rawCmd = (ev.command || '').toUpperCase().trim();
      if (rawCmd.startsWith('JOIN')) {
        const parts = rawCmd.split(' ');
        const laneArg = parts[1];
        const squad = laneArg === '1' || laneArg === 'ALPHA' ? 'alpha' : laneArg === '3' || laneArg === 'CHARLIE' ? 'charlie' : 'bravo';
        const res = engine.handleJoin(ev.userId, ev.userName, squad);
        return reply.send({ accepted: res.success, reason: res.reason, squad });
      } else if (rawCmd === '1' || rawCmd === 'ALPHA') {
        const res = engine.handleJoin(ev.userId, ev.userName, 'alpha');
        return reply.send({ accepted: res.success, reason: res.reason, squad: 'alpha' });
      } else if (rawCmd === '2' || rawCmd === 'BRAVO') {
        const res = engine.handleJoin(ev.userId, ev.userName, 'bravo');
        return reply.send({ accepted: res.success, reason: res.reason, squad: 'bravo' });
      } else if (rawCmd === '3' || rawCmd === 'CHARLIE') {
        const res = engine.handleJoin(ev.userId, ev.userName, 'charlie');
        return reply.send({ accepted: res.success, reason: res.reason, squad: 'charlie' });
      } else if (rawCmd === 'BAN' || rawCmd === 'BẮN') {
        const res = engine.handleShoot(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      } else if (rawCmd === 'SUA' || rawCmd === 'SỬA') {
        const res = engine.handleRepair(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      } else if (rawCmd === 'CUU' || rawCmd === 'CỨU') {
        const res = engine.handleRescue(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      } else if (rawCmd === 'BOSS') {
        const res = engine.handleBossFocus(ev.userId);
        return reply.send({ accepted: res.success, reason: res.reason });
      }
      return reply.send({ accepted: false, reason: 'UNKNOWN_COMMAND' });
    } else if (ev.type === 'GIFT') {
      const giftId = ev.giftId || 'gift_missile';
      const res = engine.handleGift(giftId, ev.userId, ev.userName, ev.quantity, ev.streakId);
      return reply.send({ accepted: res.success, skillName: res.skillName });
    }

    return reply.status(400).send({ accepted: false, error: 'UNSUPPORTED_EVENT_TYPE' });
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
  };

  app.addHook('onClose', (_instance, done) => {
    stopEngine();
    done();
  });

  return { app, io, engine, stopEngine, adminSecret };
}
