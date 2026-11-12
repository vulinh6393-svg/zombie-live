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

  it('accepts GIFT skill with idempotency providerEventId preservation', async () => {
    const { app, engine, stopEngine, adminSecret } = buildServer();
    stopFn = stopEngine;

    const uniqueEvtId = 'gift_unique_evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const uniqueStreakId = 'streak_' + uniqueEvtId;
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'GIFT',
        provider: 'mock',
        liveSessionId: 'test_session_1',
        providerEventId: uniqueEvtId,
        userId: 'rich_donor',
        userName: 'DonorKing',
        giftId: 'gift_missile',
        quantity: 1,
        streakId: uniqueStreakId,
        timestamp: Date.now(),
      },
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.accepted).toBe(true);
    expect(body1.skillName).toBe('TÊN LỬA TỔNG LỰC');

    // Duplicate event packet with same providerEventId
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'GIFT',
        provider: 'mock',
        liveSessionId: 'test_session_1',
        providerEventId: uniqueEvtId,
        userId: 'rich_donor',
        userName: 'DonorKing',
        giftId: 'gift_missile',
        quantity: 1,
        streakId: uniqueStreakId,
        timestamp: Date.now(),
      },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.accepted).toBe(false);
    expect(body2.skillName).toBe('ALREADY_PROCESSED');
  });

  it('rejects unsupported gift types and does NOT fallback to Airstrike', async () => {
    const { app, stopEngine, adminSecret } = buildServer();
    stopFn = stopEngine;

    const res = await app.inject({
      method: 'POST',
      url: '/api/live/event',
      headers: { 'x-admin-token': adminSecret },
      payload: {
        type: 'GIFT',
        provider: 'mock',
        liveSessionId: 'test_session_2',
        providerEventId: 'gift_unknown_evt_9999',
        userId: 'rich_donor',
        userName: 'DonorKing',
        giftId: 'unknown_fake_gift_id',
        quantity: 1,
        timestamp: Date.now(),
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accepted).toBe(false);
    expect(body.reason).toBe('UNSUPPORTED_GIFT_TYPE');
    expect(body.skillName).toBe('UNKNOWN');
  });

  it('rejects unauthenticated requests to /api/dashboard/command with 401 and leaves state untouched', async () => {
    const { app, engine, stopEngine } = buildServer();
    stopFn = stopEngine;

    const initialPlayerCount = engine.getPlayers().length;

    const res = await app.inject({
      method: 'POST',
      url: '/api/dashboard/command',
      // NO auth headers provided!
      payload: {
        type: 'COMMENT',
        userId: 'unauth_hacker',
        userName: 'SneakyViewer',
        command: 'JOIN 1',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.accepted).toBe(false);
    expect(body.error).toBe('UNAUTHORIZED_DASHBOARD_ACCESS');

    // Engine state MUST NOT have changed!
    expect(engine.getPlayers().length).toBe(initialPlayerCount);
    expect(engine.getPlayers().some((p) => p.userId === 'unauth_hacker')).toBe(false);
  });

  it('accepts authorized requests to /api/dashboard/command with x-dashboard-token', async () => {
    const { app, engine, stopEngine, dashboardDevToken } = buildServer();
    stopFn = stopEngine;

    const res = await app.inject({
      method: 'POST',
      url: '/api/dashboard/command',
      headers: { 'x-dashboard-token': dashboardDevToken },
      payload: {
        type: 'COMMENT',
        userId: 'valid_dashboard_user',
        userName: 'DevTester',
        command: 'JOIN 2',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accepted).toBe(true);
    expect(engine.getPlayers().some((p) => p.userId === 'valid_dashboard_user')).toBe(true);
  });

  it('blocks /dashboard with 403 when mock dashboard is disabled', async () => {
    const { app, stopEngine } = buildServer({ enableMockDashboard: false });
    stopFn = stopEngine;

    const resGet = await app.inject({
      method: 'GET',
      url: '/dashboard',
    });
    expect(resGet.statusCode).toBe(403);

    const resPost = await app.inject({
      method: 'POST',
      url: '/api/dashboard/command',
      payload: { type: 'COMMENT', userId: 'u1', userName: 'u1', command: 'JOIN 1' },
    });
    expect(resPost.statusCode).toBe(403);
  });

  it('fails fast on startup in production mode when ADMIN_SECRET_KEY is missing or < 16 chars', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => {
        buildServer({ adminSecret: 'short_key' });
      }).toThrow(/FATAL_SECURITY_ERROR/);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
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

  describe('Phase 07 Admin Operations & Live Monitoring Routes', () => {
    it('serves login HTML with 401 when unauthenticated at /admin, and serves admin dashboard HTML with 200 when authenticated', async () => {
      const { app, stopEngine, adminSecret } = buildServer();
      stopFn = stopEngine;

      // 1. Unauthenticated guest -> 401 login screen
      const unauthRes = await app.inject({
        method: 'GET',
        url: '/admin',
      });
      expect(unauthRes.statusCode).toBe(401);
      expect(unauthRes.headers['content-type']).toContain('text/html');
      expect(unauthRes.payload).toContain('XÁC THỰC QUẢN TRỊ VIÊN');

      // 2. Authenticated with admin secret -> 200 dashboard
      const authRes = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'x-admin-token': adminSecret },
      });
      expect(authRes.statusCode).toBe(200);
      expect(authRes.headers['content-type']).toContain('text/html');
      expect(authRes.payload).toContain('ZOMBIE ĐẠI CHIẾN');
    });

    it('rejects unauthorized requests to /api/admin/monitoring with 401', async () => {
      const { app, stopEngine } = buildServer({ adminSecret: 'production_secret_32_characters_min!!' });
      stopFn = stopEngine;

      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/monitoring',
        headers: { 'x-admin-token': 'wrong_token' },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('UNAUTHORIZED_ADMIN_TOKEN');
    });

    it('returns authoritative telemetry from /api/admin/monitoring when authorized', async () => {
      const { app, stopEngine, adminSecret } = buildServer();
      stopFn = stopEngine;

      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/monitoring',
        headers: { 'x-admin-token': adminSecret },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.server).toBeDefined();
      expect(body.server.environment).toBeDefined();
      expect(body.engine).toBeDefined();
      expect(body.engine.matchId).toBeDefined();
      expect(body.engine.phase).toBeDefined();
      expect(body.engine.isPaused).toBe(false);
      expect(body.operations).toBeDefined();
      expect(body.operations.simulationHz).toBe(20);
    });

    it('pauses and resumes simulation via /api/admin/match/pause and /api/admin/match/resume', async () => {
      const { app, engine, stopEngine, adminSecret } = buildServer();
      stopFn = stopEngine;

      // Pause
      const resPause = await app.inject({
        method: 'POST',
        url: '/api/admin/match/pause',
        headers: { 'x-admin-token': adminSecret },
        payload: { reason: 'Streamer emergency break' },
      });

      expect(resPause.statusCode).toBe(200);
      const pauseBody = JSON.parse(resPause.payload);
      expect(pauseBody.success).toBe(true);
      expect(pauseBody.isPaused).toBe(true);
      expect(engine.isPaused()).toBe(true);

      const tickBefore = engine.tick;
      engine.step();
      expect(engine.tick).toBe(tickBefore); // Paused tick does not advance

      // Resume
      const resResume = await app.inject({
        method: 'POST',
        url: '/api/admin/match/resume',
        headers: { 'x-admin-token': adminSecret },
      });

      expect(resResume.statusCode).toBe(200);
      const resumeBody = JSON.parse(resResume.payload);
      expect(resumeBody.success).toBe(true);
      expect(resumeBody.isPaused).toBe(false);
      expect(engine.isPaused()).toBe(false);

      engine.step();
      expect(engine.tick).toBe(tickBefore + 1); // Resumed tick advances
    });

    it('executes emergency reset and restores base hp via /api/admin/match/emergency-reset', async () => {
      const { app, engine, stopEngine, adminSecret } = buildServer();
      stopFn = stopEngine;

      // Damage base directly
      engine.baseHp = 1000;
      expect(engine.baseHp).toBeLessThan(2000);

      const resReset = await app.inject({
        method: 'POST',
        url: '/api/admin/match/emergency-reset',
        headers: { 'x-admin-token': adminSecret },
        payload: { reason: 'Desync recovery' },
      });

      expect(resReset.statusCode).toBe(200);
      const resetBody = JSON.parse(resReset.payload);
      expect(resetBody.success).toBe(true);
      expect(resetBody.baseHp).toBe(engine.maxBaseHp);
      expect(engine.baseHp).toBe(engine.maxBaseHp);
      expect(engine.phase).toBe('PREPARING');
    });

    it('controls fortress gate state via /api/admin/gate', async () => {
      const { app, engine, stopEngine, adminSecret } = buildServer();
      stopFn = stopEngine;

      const resClose = await app.inject({
        method: 'POST',
        url: '/api/admin/gate',
        headers: { 'x-admin-token': adminSecret },
        payload: { action: 'CLOSE' },
      });

      expect(resClose.statusCode).toBe(200);
      expect(['CLOSING', 'CLOSED']).toContain(engine.getGateCollisionState());

      const resOpen = await app.inject({
        method: 'POST',
        url: '/api/admin/gate',
        headers: { 'x-admin-token': adminSecret },
        payload: { action: 'OPEN' },
      });

      expect(resOpen.statusCode).toBe(200);
      expect(['OPENING', 'OPEN']).toContain(engine.getGateCollisionState());
    });

    it('starts a new match with custom seed via /api/admin/match/start', async () => {
      const { app, engine, stopEngine, adminSecret } = buildServer();
      stopFn = stopEngine;

      const oldMatchId = engine.matchId;

      const resStart = await app.inject({
        method: 'POST',
        url: '/api/admin/match/start',
        headers: { 'x-admin-token': adminSecret },
        payload: { matchId: 'custom_match_1001', seed: 99999 },
      });

      expect(resStart.statusCode).toBe(200);
      const startBody = JSON.parse(resStart.payload);
      expect(startBody.success).toBe(true);
      expect(startBody.matchId).toBe('custom_match_1001');
      expect(engine.matchId).toBe('custom_match_1001');
      expect(engine.matchId).not.toBe(oldMatchId);
    });

    describe('Phase 07.1 Hardened Session Auth, RBAC & Watermark Verification', () => {
      it('authenticates session via POST /api/admin/login and rejects invalid secret', async () => {
        const { app, stopEngine, adminSecret } = buildServer();
        stopFn = stopEngine;

        // Invalid secret
        const badRes = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: 'invalid_secret' },
        });
        expect(badRes.statusCode).toBe(401);

        // Valid secret with operator role
        const goodRes = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: adminSecret, role: 'operator' },
        });
        expect(goodRes.statusCode).toBe(200);
        const cookie = goodRes.headers['set-cookie'] as string;
        expect(cookie).toContain('admin_session=');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Strict');

        const body = JSON.parse(goodRes.payload);
        expect(body.success).toBe(true);
        expect(body.role).toBe('operator');
        expect(body.csrfToken).toBeDefined();
      });

      it('enforces RBAC role restrictions: viewer cannot mutate, operator cannot reset', async () => {
        const { app, stopEngine, adminSecret } = buildServer();
        stopFn = stopEngine;

        // 1. Login as Viewer
        const viewerLogin = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: adminSecret, role: 'viewer' },
        });
        const viewerCookie = viewerLogin.headers['set-cookie'] as string;
        const viewerSession = viewerCookie.split(';')[0];
        const viewerCsrf = JSON.parse(viewerLogin.payload).csrfToken;

        // Viewer can read monitoring
        const monRes = await app.inject({
          method: 'GET',
          url: '/api/admin/monitoring',
          headers: { cookie: viewerSession },
        });
        expect(monRes.statusCode).toBe(200);

        // Viewer CANNOT pause (requires operator)
        const pauseRes = await app.inject({
          method: 'POST',
          url: '/api/admin/match/pause',
          headers: {
            cookie: viewerSession,
            'x-csrf-token': viewerCsrf,
          },
        });
        expect(pauseRes.statusCode).toBe(403);
        expect(JSON.parse(pauseRes.payload).error).toBe('FORBIDDEN_INSUFFICIENT_ROLE');

        // 2. Login as Operator
        const opLogin = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: adminSecret, role: 'operator' },
        });
        const opCookie = opLogin.headers['set-cookie'] as string;
        const opSession = opCookie.split(';')[0];
        const opCsrf = JSON.parse(opLogin.payload).csrfToken;

        // Operator CAN pause with CSRF
        const opPause = await app.inject({
          method: 'POST',
          url: '/api/admin/match/pause',
          headers: {
            cookie: opSession,
            'x-csrf-token': opCsrf,
          },
        });
        expect(opPause.statusCode).toBe(200);

        // Missing CSRF rejects with 403
        const noCsrfPause = await app.inject({
          method: 'POST',
          url: '/api/admin/match/pause',
          headers: {
            cookie: opSession,
          },
        });
        expect(noCsrfPause.statusCode).toBe(403);
        expect(JSON.parse(noCsrfPause.payload).error).toBe('CSRF_TOKEN_INVALID');

        // Operator CANNOT emergency reset (requires admin)
        const opReset = await app.inject({
          method: 'POST',
          url: '/api/admin/match/emergency-reset',
          headers: {
            cookie: opSession,
            'x-csrf-token': opCsrf,
          },
        });
        expect(opReset.statusCode).toBe(403);
        expect(JSON.parse(opReset.payload).error).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
      });

      it('disallows /api/admin/query in production mode', async () => {
        const prevEnv = process.env.NODE_ENV;
        try {
          process.env.NODE_ENV = 'production';
          const { app, stopEngine, adminSecret } = buildServer({
            adminSecret: 'prod_admin_secret_super_long_32chars!',
          });
          stopFn = stopEngine;

          const res = await app.inject({
            method: 'POST',
            url: '/api/admin/query',
            headers: { 'x-admin-token': 'prod_admin_secret_super_long_32chars!' },
            payload: { sql: 'SELECT 1' },
          });

          expect(res.statusCode).toBe(403);
          expect(JSON.parse(res.payload).error).toBe('FORBIDDEN_IN_PRODUCTION');
        } finally {
          process.env.NODE_ENV = prevEnv;
        }
      });
    });
  });
});
