import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { AuthoritativeGameEngine } from './engine/AuthoritativeGameEngine.js';

export interface BuildServerOptions {
  logger?: boolean;
  engineSeed?: number;
  maxZombies?: number;
}

export function buildServer(opts: BuildServerOptions = {}): {
  app: FastifyInstance;
  io: SocketIOServer;
  engine: AuthoritativeGameEngine;
  stopEngine: () => void;
} {
  const app = fastify({ logger: opts.logger ?? false });

  app.register(cors, {
    origin: '*',
  });

  const engine = new AuthoritativeGameEngine({
    seed: opts.engineSeed ?? 42,
    maxZombies: opts.maxZombies ?? 10,
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
        baseHp: engine.baseHp,
        gateState: engine.getGateCollisionState(),
        zombieCount: engine.getAllZombies().length,
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

  app.get('/api/stream/state', async () => {
    return {
      status: 'active',
      phase: engine.phase,
      tick: engine.tick,
      baseHp: engine.baseHp,
      activePlayerCount: 40,
      timestamp: new Date().toISOString(),
    };
  });

  // Socket.IO Server attached to Fastify's raw HTTP server
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const gameNamespace = io.of('/game');

  gameNamespace.on('connection', (socket) => {
    // 1. Immediately send full authoritative snapshot on connection/reconnect
    socket.emit('match:snapshot', engine.generateSnapshot());

    socket.emit('bridge:status', {
      connected: true,
      provider: 'authoritative_server',
      tick: engine.tick,
      timestamp: new Date().toISOString(),
    });

    // 2. Client re-sync request
    socket.on('match:getSnapshot', () => {
      socket.emit('match:snapshot', engine.generateSnapshot());
    });

    // 3. Admin / Live Event triggers
    socket.on('admin:openGate', () => {
      engine.openGate();
      gameNamespace.emit('match:snapshot', engine.generateSnapshot());
    });

    socket.on('admin:closeGate', () => {
      engine.closeGate();
      gameNamespace.emit('match:snapshot', engine.generateSnapshot());
    });

    socket.on('admin:giftSkill', (data: { name?: string; sender?: string }) => {
      engine.triggerGiftSkill(data?.name ?? 'TÊN LỬA TỔNG LỰC', data?.sender ?? 'VIP_Gamer99');
      gameNamespace.emit('match:snapshot', engine.generateSnapshot());
    });

    socket.on('admin:damageWall', (data: { side: 'LEFT' | 'RIGHT'; amount: number }) => {
      if (data?.side) {
        engine.damageWall(data.side, data.amount ?? 500);
        gameNamespace.emit('match:snapshot', engine.generateSnapshot());
      }
    });
  });

  // =========================================================================
  // 20Hz FIXED-TICK SIMULATION LOOP (50ms) & 10Hz BROADCAST
  // =========================================================================
  let lastTime = Date.now();
  let accumulator = 0;
  const TICK_DURATION_MS = 50; // 20Hz
  const CATCH_UP_LIMIT = 5;

  const simulationInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastTime;
    lastTime = now;
    accumulator += elapsed;

    let ticksRan = 0;
    while (accumulator >= TICK_DURATION_MS && ticksRan < CATCH_UP_LIMIT) {
      engine.step();
      accumulator -= TICK_DURATION_MS;
      ticksRan++;

      // Emit snapshot at 10Hz (every 2 ticks)
      if (engine.tick % 2 === 0) {
        const snapshot = engine.generateSnapshot();
        gameNamespace.emit('match:snapshot', snapshot);
      }
    }

    // Bounded catch-up: Prevent spiral of death if CPU lags
    if (accumulator > TICK_DURATION_MS * CATCH_UP_LIMIT) {
      accumulator = 0;
    }
  }, 25); // Check every 25ms for stable 20Hz timing

  const stopEngine = () => {
    clearInterval(simulationInterval);
  };

  app.addHook('onClose', (_instance, done) => {
    stopEngine();
    done();
  });

  return { app, io, engine, stopEngine };
}
