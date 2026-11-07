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
    return {
      status: 'ready',
      uptime: process.uptime(),
      mockMode: true,
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
