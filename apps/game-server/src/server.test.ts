import { describe, it, expect } from 'vitest';
import { buildServer } from './server.js';

describe('Game Server Health & Ready Endpoints', () => {
  it('returns 200 OK from /health', async () => {
    const { app } = buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('game-server');
  });

  it('returns 200 Ready from /ready', async () => {
    const { app } = buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ready');
    expect(body.mockMode).toBe(true);
  });
});
