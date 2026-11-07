import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';

export interface BuildServerOptions {
  logger?: boolean;
}

export function buildServer(opts: BuildServerOptions = {}): {
  app: FastifyInstance;
  io: SocketIOServer;
} {
  const app = fastify({ logger: opts.logger ?? false });

  app.register(cors, {
    origin: '*',
  });

  // Health and Readiness checks
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'game-server',
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
      status: 'idle',
      mode: 'mock',
      phase: 'PREPARING',
      activePlayerCount: 0,
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
    socket.emit('bridge:status', {
      connected: true,
      provider: 'mock',
      timestamp: new Date().toISOString(),
    });
  });

  return { app, io };
}
