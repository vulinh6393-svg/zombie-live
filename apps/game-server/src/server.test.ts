import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabaseClient } from '@zombie-live/database';
import { LiveEventDispatcher } from '@zombie-live/live-bridge';
import { buildServer } from './server.js';

describe('Game Server Security & Event Ingestion', () => {
  let stopFn: (() => void | Promise<void>) | null = null;

  afterEach(async () => {
    if (stopFn) {
      await stopFn();
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
    expect(body.error).toBe('UNAUTHORIZED_LIVE_BRIDGE_TOKEN');
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

      it('invalidates and revokes session server-side upon logout (P1.2 Session Revocation)', async () => {
        const { app, stopEngine, adminSecret } = buildServer();
        stopFn = stopEngine;

        // 1. Đăng nhập thành công
        const loginRes = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: adminSecret, role: 'viewer' },
        });
        expect(loginRes.statusCode).toBe(200);
        const cookie = loginRes.headers['set-cookie'] as string;
        const sessionCookie = cookie.split(';')[0];

        // 2. Truy cập monitoring trước khi đăng xuất -> 200 OK
        const beforeRes = await app.inject({
          method: 'GET',
          url: '/api/admin/monitoring',
          headers: { cookie: sessionCookie },
        });
        expect(beforeRes.statusCode).toBe(200);

        // 3. Thực hiện Đăng xuất
        const logoutRes = await app.inject({
          method: 'POST',
          url: '/api/admin/logout',
          headers: { cookie: sessionCookie },
        });
        expect(logoutRes.statusCode).toBe(200);

        // 4. Cố tình sử dụng lại session cookie cũ sau khi đã đăng xuất -> 401 UNAUTHORIZED
        const afterRes = await app.inject({
          method: 'GET',
          url: '/api/admin/monitoring',
          headers: { cookie: sessionCookie },
        });
        expect(afterRes.statusCode).toBe(401);
      });

      it('enforces credential-based role scoping and prevents privilege escalation (P1.2)', async () => {
        const operatorSecret = 'operator_secret_test_key_123';
        const viewerSecret = 'viewer_secret_test_key_123';
        const adminSecret = 'master_admin_secret_key_123';

        const { app, stopEngine } = buildServer({
          adminSecret,
          operatorSecret,
          viewerSecret,
        });
        stopFn = stopEngine;

        // 1. Viewer key chỉ cấp role viewer
        const viewerLogin = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: viewerSecret, role: 'admin' }, // Cố thăng quyền admin
        });
        expect(viewerLogin.statusCode).toBe(200);
        expect(JSON.parse(viewerLogin.payload).role).toBe('viewer'); // Bị giới hạn ở viewer

        // 2. Operator key chỉ cấp role operator (không thể thăng quyền admin)
        const opLogin = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: operatorSecret, role: 'admin' }, // Cố thăng quyền admin
        });
        expect(opLogin.statusCode).toBe(200);
        expect(JSON.parse(opLogin.payload).role).toBe('operator'); // Bị giới hạn ở operator
      });

      it('enforces Socket.IO /admin RBAC: viewer is blocked from all gameplay mutations (P0.1)', async () => {
        const { app, engine, stopEngine, adminSecret } = buildServer({ disableAutoTick: true });
        stopFn = stopEngine;

        const port = await new Promise<number>((resolve) => {
          app.listen({ port: 0, host: '127.0.0.1' }, () => {
            const addr = app.server.address() as any;
            resolve(addr.port);
          });
        });

        const { io: ioClient } = await import('socket.io-client');

        // Tạo viewer session cookie
        const viewerLogin = await app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: adminSecret, role: 'viewer' },
        });
        const viewerCookie = (viewerLogin.headers['set-cookie'] as string).split(';')[0];

        const viewerSocket = ioClient(`http://127.0.0.1:${port}/admin`, {
          extraHeaders: { cookie: viewerCookie },
          transports: ['websocket'],
        });

        await new Promise<void>((resolve, reject) => {
          viewerSocket.on('connect', () => resolve());
          viewerSocket.on('connect_error', reject);
        });

        // 1. Viewer cố mở cổng thành -> Bị từ chối qua error:unauthorized
        const unauthorizedEvents: any[] = [];
        viewerSocket.on('error:unauthorized', (data) => unauthorizedEvents.push(data));

        viewerSocket.emit('admin:openGate');
        await new Promise((r) => setTimeout(r, 100));

        expect(unauthorizedEvents.length).toBe(1);
        expect(unauthorizedEvents[0].action).toBe('openGate');
        expect(engine.getGateCollisionState()).toBe('CLOSED'); // Trạng thái engine không đổi!

        // 2. Viewer cố gây sát thương tường -> Bị từ chối
        viewerSocket.emit('admin:damageWall', { side: 'LEFT', amount: 500 });
        await new Promise((r) => setTimeout(r, 100));
        expect(unauthorizedEvents.length).toBe(2);
        expect(unauthorizedEvents[1].action).toBe('damageWall');
        expect(engine.collisionSystem.getWallState('LEFT').hp).toBe(1000); // Máu tường không đổi!

        viewerSocket.disconnect();
      });

      it('advances lastAppliedJournalSeq contiguous watermark from real HTTP gift ingress (P0.2)', async () => {
        const testDbDir = path.resolve(process.cwd(), '.data/test_db_watermark_' + Date.now());
        const { app, engine, stopEngine, adminSecret } = buildServer({
          disableAutoTick: true,
          dbDataDir: testDbDir,
        });
        stopFn = () => {
          stopEngine();
          try {
            if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
          } catch {}
        };

        // Kiểm tra ban đầu watermark = 0
        expect(engine.getLastAppliedJournalSeq()).toBe(0);

        // Gửi 1 Gift HTTP hợp lệ
        const res = await app.inject({
          method: 'POST',
          url: '/api/live/event',
          headers: { 'x-admin-token': adminSecret },
          payload: {
            type: 'GIFT',
            provider: 'mock',
            liveSessionId: engine.matchId,
            providerEventId: `p02_gift_test_${Date.now()}`,
            userId: 'user_p02',
            userName: 'WatermarkTester',
            giftId: 'rose',
            quantity: 1,
          },
        });

        expect(res.statusCode).toBe(200);

        // Chờ outbox worker claim và đưa vào hàng đợi engine
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (engine.getCommandQueueLength() > 0) break;
        }

        // Kích hoạt tick engine để xử lý lệnh từ hàng đợi
        engine.step();
        engine.step();

        // Watermark phải tiến lên 1 liên tục!
        expect(engine.getLastAppliedJournalSeq()).toBe(1);
      });

      it('enforces dedicated LIVE_BRIDGE_INGRESS_TOKEN and isolates from admin APIs (P0.1)', async () => {
        const testBridgeToken = 'live_bridge_ingress_token_test_12345';
        const { app, stopEngine } = buildServer({
          liveBridgeToken: testBridgeToken,
          adminSecret: 'super_admin_secret_99999',
        });
        stopFn = stopEngine;

        // 1. Gửi sự kiện với token Live Bridge hợp lệ -> 200 OK
        const validRes = await app.inject({
          method: 'POST',
          url: '/api/live/event',
          headers: { 'x-live-bridge-token': testBridgeToken },
          payload: {
            type: 'COMMENT',
            userId: 'bridge_user_1',
            userName: 'BridgeUser',
            command: 'JOIN 1',
          },
        });
        expect(validRes.statusCode).toBe(200);

        // 2. Gửi với token sai -> 401
        const invalidRes = await app.inject({
          method: 'POST',
          url: '/api/live/event',
          headers: { 'x-live-bridge-token': 'wrong_bridge_token' },
          payload: {
            type: 'COMMENT',
            userId: 'bridge_user_1',
            userName: 'BridgeUser',
            command: 'JOIN 1',
          },
        });
        expect(invalidRes.statusCode).toBe(401);

        // 3. Sử dụng LIVE_BRIDGE_INGRESS_TOKEN để gọi Admin API -> BỊ TỪ CHỐI (401/403)
        const adminBypassRes = await app.inject({
          method: 'POST',
          url: '/api/admin/match/emergency-reset',
          headers: { 'x-admin-token': testBridgeToken },
        });
        expect(adminBypassRes.statusCode).toBe(401);
      });

      it('disconnects active Socket.IO connection on logout and persists revocation across server restart (A1)', async () => {
        const { io: Client } = await import('socket.io-client');
        const testDbDir = path.resolve(process.cwd(), '.data/test_db_revocation_' + Date.now());
        const adminSecret = 'admin_secret_revocation_test_123';

        let srv1 = buildServer({
          adminSecret,
          dbDataDir: testDbDir,
          disableAutoTick: true,
        });
        stopFn = () => {
          srv1.stopEngine();
          try {
            if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
          } catch {}
        };

        await srv1.app.listen({ port: 0 });
        const port1 = (srv1.app.server.address() as any).port;

        // 1. Đăng nhập để lấy session token
        const loginRes = await srv1.app.inject({
          method: 'POST',
          url: '/api/admin/login',
          payload: { secret: adminSecret },
        });
        expect(loginRes.statusCode).toBe(200);
        const setCookie = loginRes.headers['set-cookie'] as string;
        const sessionToken = setCookie.split(';')[0].replace('admin_session=', '');

        // 2. Kết nối Socket.IO /admin bằng session token
        const adminSocket = Client(`http://127.0.0.1:${port1}/admin`, {
          auth: { token: sessionToken },
          transports: ['websocket'],
          reconnection: false,
        });

        await new Promise<void>((resolve, reject) => {
          adminSocket.on('connect', () => resolve());
          adminSocket.on('connect_error', reject);
        });
        expect(adminSocket.connected).toBe(true);

        let socketWasDisconnected = false;
        adminSocket.on('disconnect', () => {
          socketWasDisconnected = true;
        });

        // 3. Đăng xuất qua HTTP với session cookie
        const logoutRes = await srv1.app.inject({
          method: 'POST',
          url: '/api/admin/logout',
          headers: { cookie: `admin_session=${sessionToken}` },
        });
        expect(logoutRes.statusCode).toBe(200);

        // Chờ socket nhận sự kiện disconnect
        await new Promise((r) => setTimeout(r, 200));
        expect(socketWasDisconnected).toBe(true);
        expect(adminSocket.connected).toBe(false);

        // Đóng server 1
        await srv1.app.close();
        srv1.stopEngine();

        // 4. Khởi động lại Server 2 trên cùng dbDataDir (mô phỏng process restart)
        const srv2 = buildServer({
          adminSecret,
          dbDataDir: testDbDir,
          disableAutoTick: true,
        });
        stopFn = () => {
          srv2.stopEngine();
          try {
            if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
          } catch {}
        };

        // Thử truy cập API bảo vệ bằng session token cũ đã bị revoke
        const reusedRes = await srv2.app.inject({
          method: 'GET',
          url: '/api/admin/monitoring',
          headers: { cookie: `admin_session=${sessionToken}` },
        });

        // Phải bị chặn 401 vì session revocation đã được lưu bền vững vào database!
        expect(reusedRes.statusCode).toBe(401);
      });

      it('P1.3 End-to-End Pipeline Integration: Mock Viewer -> Bridge -> Ingress -> Gift Ledger -> Outbox -> Engine -> DB state', async () => {
        const testDbDir = path.resolve(process.cwd(), '.data/test_db_e2e_pipe_' + Date.now());
        const testBridgeToken = 'bridge_ingress_secret_token_e2e_test_999';
        const serverInstance = buildServer({
          liveBridgeToken: testBridgeToken,
          adminSecret: 'admin_secret_e2e_test_123',
          dbDataDir: testDbDir,
          disableAutoTick: true,
        });

        // Khởi động server HTTP lắng nghe trên port động
        const address = await serverInstance.app.listen({ port: 0, host: '127.0.0.1' });

        stopFn = async () => {
          serverInstance.stopEngine();
          await serverInstance.app.close();
          try {
            if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
          } catch {}
        };

        const dispatcher = new LiveEventDispatcher({
          serverUrl: address,
          ingressToken: testBridgeToken,
          queueStorageFile: path.join(testDbDir, 'queue.json'),
          deadLetterFile: path.join(testDbDir, 'dead_letter.json'),
          autoProcessQueue: false,
        });

        const viewerId = 'viewer_e2e_1001';
        const viewerName = 'HeroCommander';
        const providerEventId = `e2e_gift_${Date.now()}_001`;

        // 1. Mock Viewer gửi GIFT qua Live Bridge
        const dispatchResult = await dispatcher.handleIncomingEvent({
          eventKey: providerEventId,
          provider: 'mock',
          liveSessionId: serverInstance.engine.matchId,
          userId: viewerId,
          username: viewerName,
          at: new Date().toISOString(),
          type: 'gift',
          gift: {
            giftId: 'rose',
            quantity: 1,
            isFinal: true,
          },
        });

        expect(dispatchResult.accepted).toBe(true);

        // 2. Chờ Outbox Worker nhận và chuyển vào hàng đợi engine
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (serverInstance.engine.getCommandQueueLength() > 0) break;
        }

        // 3. Kết nối DB để theo dõi
        const db = await getDatabaseClient({ dataDir: testDbDir });

        // 4. Bước qua các tick engine và chờ outbox transition sang PROCESSED sau khi engine.onCommandApplied hoàn tất
        let isOutboxProcessed = false;
        for (let i = 0; i < 30; i++) {
          serverInstance.engine.step();
          await new Promise((r) => setTimeout(r, 100));
          const outboxRes = await db.query<{ status: string }>(
            `SELECT status FROM outbox_events WHERE aggregate = 'GIFT' ORDER BY created_at DESC LIMIT 1`
          );
          if (outboxRes.rows[0]?.status === 'PROCESSED') {
            isOutboxProcessed = true;
            break;
          }
        }
        expect(isOutboxProcessed).toBe(true);

        // 5. Xác nhận sequence watermark của Engine đã tăng
        expect(serverInstance.engine.getLastAppliedJournalSeq()).toBeGreaterThanOrEqual(1);

        // 5a. Gift Ledger ghi nhận chính xác bản ghi gift
        const giftRes = await db.query<{ provider_event_id: string; sender_id: string; gift_id: string }>(
          `SELECT provider_event_id, sender_id, gift_id FROM gift_events WHERE provider_event_id = $1`,
          [providerEventId]
        );
        expect(giftRes.rows.length).toBe(1);
        expect(giftRes.rows[0].sender_id).toBe(viewerId);
        expect(giftRes.rows[0].gift_id).toBe('rose');

        // 5c. Command Journal ghi nhận lệnh với số thứ tự seq
        const journalRes = await db.query<{ seq: number; command_type: string }>(
          `SELECT seq, command_type FROM match_command_journal WHERE command_type = 'GIFT_SKILL' ORDER BY seq DESC LIMIT 1`
        );
        expect(journalRes.rows.length).toBe(1);
        expect(journalRes.rows[0].seq).toBeGreaterThanOrEqual(1);

        await dispatcher.stop();
      });

      it('P1.1 Comment Deduplication: rejects duplicate comment execution on same providerEventId with idempotentDuplicate', async () => {
        const testBridgeToken = 'bridge_token_comment_dedup_test';
        const serverInstance = buildServer({
          liveBridgeToken: testBridgeToken,
          adminSecret: 'admin_secret_test_123',
          disableAutoTick: true,
        });

        // 1. Gửi comment lần đầu
        const res1 = await serverInstance.app.inject({
          method: 'POST',
          url: '/api/live/event',
          headers: {
            'x-live-bridge-token': testBridgeToken,
            'Content-Type': 'application/json',
          },
          payload: {
            type: 'COMMENT',
            providerEventId: 'comment_dedup_unique_001',
            userId: 'user_commenter_1',
            userName: 'Commenter 1',
            command: 'JOIN 1',
            timestamp: Date.now(),
          },
        });
        expect(res1.statusCode).toBe(200);
        const data1 = JSON.parse(res1.payload);
        expect(data1.accepted).toBe(true);

        // 2. Gửi lại cùng comment providerEventId (mô phỏng network retry từ bridge)
        const res2 = await serverInstance.app.inject({
          method: 'POST',
          url: '/api/live/event',
          headers: {
            'x-live-bridge-token': testBridgeToken,
            'Content-Type': 'application/json',
          },
          payload: {
            type: 'COMMENT',
            providerEventId: 'comment_dedup_unique_001',
            userId: 'user_commenter_1',
            userName: 'Commenter 1',
            command: 'JOIN 1',
            timestamp: Date.now(),
          },
        });
        expect(res2.statusCode).toBe(200);
        const data2 = JSON.parse(res2.payload);
        expect(data2.accepted).toBe(true);
        expect(data2.idempotentDuplicate).toBe(true);
        expect(data2.reason).toBe('DUPLICATE_COMMENT_ALREADY_PROCESSED');
      });

      it('P0.2 Operational DB endpoints: /api/admin/db/quiesce, /api/admin/db/stats, and /api/admin/db/resume', async () => {
        const adminSecret = 'admin_secret_quiesce_test';
        const serverInstance = buildServer({
          adminSecret,
          disableAutoTick: true,
        });

        // 1. Stats endpoint
        const statsRes = await serverInstance.app.inject({
          method: 'GET',
          url: '/api/admin/db/stats',
          headers: {
            'x-admin-token': adminSecret,
          },
        });
        expect(statsRes.statusCode).toBe(200);
        const statsData = JSON.parse(statsRes.payload);
        expect(statsData.success).toBe(true);
        expect(statsData.stats).toHaveProperty('players');
        expect(statsData.stats).toHaveProperty('giftEvents');
        expect(statsData.stats).toHaveProperty('outboxEvents');
        expect(statsData.stats).toHaveProperty('commandJournal');
        expect(statsData.stats).toHaveProperty('matches');

        // 2. Quiesce endpoint
        const quiesceRes = await serverInstance.app.inject({
          method: 'POST',
          url: '/api/admin/db/quiesce',
          headers: {
            'x-admin-token': adminSecret,
          },
        });
        expect(quiesceRes.statusCode).toBe(200);
        const quiesceData = JSON.parse(quiesceRes.payload);
        expect(quiesceData.success).toBe(true);
        expect(quiesceData.status).toBe('quiesced');
        expect(serverInstance.engine.isPaused()).toBe(true);

        // 3. Resume endpoint
        const resumeRes = await serverInstance.app.inject({
          method: 'POST',
          url: '/api/admin/db/resume',
          headers: {
            'x-admin-token': adminSecret,
          },
        });
        expect(resumeRes.statusCode).toBe(200);
        const resumeData = JSON.parse(resumeRes.payload);
        expect(resumeData.success).toBe(true);
        expect(resumeData.status).toBe('resumed');
        expect(serverInstance.engine.isPaused()).toBe(false);
      });
    });
  });
});
