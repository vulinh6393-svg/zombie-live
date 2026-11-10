import { describe, it, expect, afterEach } from 'vitest';
import { buildServer } from './server.js';

describe('Game Server Security & Event Ingestion', () => {
  let stopFn: (() => void) | null = null;

  afterEach(() => {
    if (stopFn) {
      stopFn();
      stopFn = null;
    }
  });

  it('returns 200 OK from /health', async () => {
    const { app, stopEngine } = buildServer();
    stopFn = stopEngine;
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('game-server');
    expect(body.engineTick).toBeDefined();
  });

  it('returns 200 Ready from /ready', async () => {
    const { app, stopEngine } = buildServer();
    stopFn = stopEngine;
    const res = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ready');
    expect(body.mockMode).toBe(true);
    expect(body.dependencies).toBeDefined();
  });

  it('rejects unauthorized live events with 401 on /api/live/event', async () => {
    const { app, stopEngine } = buildServer({ adminSecret: 'secret_test_key_123' });
    stopFn = stopEngine;

    const res = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: {
        'x-admin-token': 'wrong_token',
      },
      payload: {
        type: 'COMMENT',
        userId: 'hacker_1',
        userName: 'BadActor',
        command: 'JOIN 1',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('UNAUTHORIZED_ADMIN_TOKEN');
  });

  it('accepts authorized JOIN command and prevents duplicate player count', async () => {
    const { app, engine, stopEngine, adminSecret } = buildServer();
    stopFn = stopEngine;

    // First JOIN
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'COMMENT',
        userId: 'viewer_alice',
        userName: 'AliceGamer',
        command: 'JOIN 2',
      },
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.accepted).toBe(true);
    expect(body1.squad).toBe('bravo');
    expect(engine.getPlayers().length).toBe(1);

    // Duplicate JOIN from same user
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'COMMENT',
        userId: 'viewer_alice',
        userName: 'AliceGamer',
        command: 'JOIN 2',
      },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.accepted).toBe(true);
    expect(body2.reason).toBe('ALREADY_JOINED');
    // Player count stays 1!
    expect(engine.getPlayers().length).toBe(1);
  });

  it('accepts BAN command, applies cooldown and awards score to contributor', async () => {
    const { app, engine, stopEngine, adminSecret } = buildServer();
    stopFn = stopEngine;

    // Join first
    await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'COMMENT',
        userId: 'viewer_bob',
        userName: 'BobShooter',
        command: 'JOIN 1',
      },
    });

    // First BAN
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'COMMENT',
        userId: 'viewer_bob',
        userName: 'BobShooter',
        command: 'BAN',
      },
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.accepted).toBe(true);

    const player = engine.getPlayers().find((p) => p.userId === 'viewer_bob');
    expect(player?.assists).toBe(1);

    // Immediate second BAN triggers cooldown
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'COMMENT',
        userId: 'viewer_bob',
        userName: 'BobShooter',
        command: 'BAN',
      },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.accepted).toBe(false);
    expect(body2.reason).toContain('COOLDOWN');
  });

  it('accepts GIFT skill with idempotency streak preservation', async () => {
    const { app, engine, stopEngine, adminSecret } = buildServer();
    stopFn = stopEngine;

    const res1 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'GIFT',
        userId: 'rich_donor',
        userName: 'DonorKing',
        giftId: 'gift_missile',
        quantity: 1,
        streakId: 'streak_1001',
      },
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.accepted).toBe(true);
    expect(body1.skillName).toBe('TÊN LỬA TỔNG LỰC');

    // Duplicate streak packet with same streakId & quantity
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'GIFT',
        userId: 'rich_donor',
        userName: 'DonorKing',
        giftId: 'gift_missile',
        quantity: 1,
        streakId: 'streak_1001',
      },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.accepted).toBe(false);
    expect(body2.skillName).toBe('ALREADY_PROCESSED');
  });

  it('reliably queues and delivers events between 20Hz ticks to 10Hz snapshots without loss', async () => {
    const { engine, stopEngine } = buildServer({ disableCombat: false });
    stopFn = stopEngine;

    // Run tick 1 (odd tick)
    engine.step();
    // Run tick 2 (even tick)
    engine.step();

    // Broadcast snapshot extracts all accumulated events
    const broadcastSnap = engine.generateBroadcastSnapshot();
    expect(broadcastSnap.tick).toBe(2);

    // Call on-demand snapshot (e.g. for reconnect)
    const onDemandSnap = engine.generateSnapshot();
    // Does not wipe the event history!
    expect(onDemandSnap.recentEvents).toBeDefined();

    // Step tick 3 (odd) and tick 4 (even)
    engine.step();
    engine.step();

    const nextBroadcastSnap = engine.generateBroadcastSnapshot();
    expect(nextBroadcastSnap.tick).toBe(4);
    // Sequence continues monotonically
    expect(nextBroadcastSnap.sequenceId).toBeGreaterThan(broadcastSnap.sequenceId);
  });
});
