import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from './server.js';

describe('Phase 05 — Database Persistence, Streak Settlement & Final Security', () => {
  let app: any;
  let stopEngine: () => void;
  let adminSecret: string;
  let dashboardDevToken: string;

  beforeEach(async () => {
    const s = buildServer({
      logger: false,
      adminSecret: 'super_secret_test_key_phase05_123',
      enableMockDashboard: true,
      disableCombat: true,
    });
    app = s.app;
    stopEngine = s.stopEngine;
    adminSecret = s.adminSecret;
    dashboardDevToken = s.dashboardDevToken;
    await app.ready();
  });

  afterEach(async () => {
    stopEngine();
    await app.close();
  });

  describe('1. P0.1 Dashboard & Player Inspection Security', () => {
    it('strictly rejects unauthenticated GET /dashboard with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/dashboard',
      });
      expect(res.statusCode).toBe(401);
      expect(res.body).toContain('UNAUTHORIZED');
    });

    it('rejects GET /dashboard with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/dashboard?token=wrong_token_123',
      });
      expect(res.statusCode).toBe(401);
    });

    it('accepts GET /dashboard with valid dev token and DOES NOT leak token in HTML', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/dashboard?token=${dashboardDevToken}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      // BẢO MẬT: Token không được nhúng cứng vào HTML trả về!
      expect(res.body).not.toContain(`window.__DASHBOARD_TOKEN__ = "${dashboardDevToken}"`);
    });

    it('returns only safe public fields for unauthenticated GET /api/dashboard/player/:userId', async () => {
      // 1. Join user
      await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: {
          type: 'COMMENT',
          userId: 'usr_sec_test',
          userName: 'SecretPlayer',
          command: 'JOIN 1',
        },
      });

      // 2. Unauthenticated GET player -> Safe public fields only
      const pubRes = await app.inject({
        method: 'GET',
        url: '/api/dashboard/player/usr_sec_test',
      });
      expect(pubRes.statusCode).toBe(200);
      const pubData = JSON.parse(pubRes.payload);
      expect(pubData.userId).toBe('usr_sec_test');
      expect(pubData.userName).toBe('SecretPlayer');
      expect(pubData.squad).toBe('alpha');
      // Không tiết lộ internal telemetry
      expect(pubData.persistent).toBeUndefined();
      expect(pubData.missions).toBeUndefined();
      expect(pubData.assists).toBeUndefined();
      expect(pubData.repairs).toBeUndefined();

      // 3. Authenticated GET player -> Full authoritative & persistent data
      const authRes = await app.inject({
        method: 'GET',
        url: '/api/dashboard/player/usr_sec_test',
        headers: { 'x-dashboard-token': dashboardDevToken },
      });
      expect(authRes.statusCode).toBe(200);
      const authData = JSON.parse(authRes.payload);
      expect(authData.userId).toBe('usr_sec_test');
      expect(authData.score).toBe(10);
      expect(authData.missions).toBeDefined();
    });
  });

  describe('2. P0.2 Gift Streak Cumulative Settlement', () => {
    it('settles incremental delta correctly in cumulative streak packets', async () => {
      const streakId = `stk_p5_${Date.now()}`;

      // Packet 1: quantity = 1 (IN_PROGRESS)
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: {
          type: 'GIFT',
          provider: 'mock',
          liveSessionId: 'sess_p5',
          providerEventId: `evt_${streakId}_1`,
          userId: 'usr_streaker_1',
          userName: 'StreakerOne',
          giftId: 'gift_missile',
          quantity: 1,
          streakId,
          streakStatus: 'IN_PROGRESS',
        },
      });
      expect(res1.statusCode).toBe(200);
      const b1 = JSON.parse(res1.payload);
      expect(b1.accepted).toBe(true);
      expect(b1.deltaQuantity).toBe(1);
      expect(b1.skillName).toBe('TÊN LỬA TỔNG LỰC');

      // Packet 2: quantity = 3 (IN_PROGRESS) -> Delta = 2
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: {
          type: 'GIFT',
          provider: 'mock',
          liveSessionId: 'sess_p5',
          providerEventId: `evt_${streakId}_2`,
          userId: 'usr_streaker_1',
          userName: 'StreakerOne',
          giftId: 'gift_missile',
          quantity: 3,
          streakId,
          streakStatus: 'IN_PROGRESS',
        },
      });
      const b2 = JSON.parse(res2.payload);
      expect(b2.accepted).toBe(true);
      expect(b2.deltaQuantity).toBe(2);

      // Packet 3: re-broadcast packet quantity = 3 -> Delta = 0, NO skill trigger
      const res3 = await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: {
          type: 'GIFT',
          provider: 'mock',
          liveSessionId: 'sess_p5',
          providerEventId: `evt_${streakId}_3_re`,
          userId: 'usr_streaker_1',
          userName: 'StreakerOne',
          giftId: 'gift_missile',
          quantity: 3,
          streakId,
          streakStatus: 'IN_PROGRESS',
        },
      });
      const b3 = JSON.parse(res3.payload);
      expect(b3.accepted).toBe(true);
      expect(b3.deltaQuantity).toBe(0);
      expect(b3.skillName).toBe('NO_SKILL_TRIGGER');

      // Packet 4: FINISHED packet quantity = 5 -> Delta = 2
      const res4 = await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: {
          type: 'GIFT',
          provider: 'mock',
          liveSessionId: 'sess_p5',
          providerEventId: `evt_${streakId}_4_fin`,
          userId: 'usr_streaker_1',
          userName: 'StreakerOne',
          giftId: 'gift_missile',
          quantity: 5,
          streakId,
          streakStatus: 'FINISHED',
        },
      });
      const b4 = JSON.parse(res4.payload);
      expect(b4.accepted).toBe(true);
      expect(b4.deltaQuantity).toBe(2);

      // Packet 5: Late packet after FINISHED -> Blocked
      const res5 = await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: {
          type: 'GIFT',
          provider: 'mock',
          liveSessionId: 'sess_p5',
          providerEventId: `evt_${streakId}_5_late`,
          userId: 'usr_streaker_1',
          userName: 'StreakerOne',
          giftId: 'gift_missile',
          quantity: 6,
          streakId,
          streakStatus: 'IN_PROGRESS',
        },
      });
      const b5 = JSON.parse(res5.payload);
      expect(b5.accepted).toBe(false);
      expect(b5.reason).toBe('STREAK_ALREADY_FINISHED');
    });
  });

  describe('3. Player Profile & Daily Missions API (/api/me)', () => {
    it('updates daily mission progress and awards XP upon completion', async () => {
      const uid = `usr_mission_p5_${Date.now()}`;

      // 1. Gửi lệnh JOIN 1
      await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: { type: 'COMMENT', userId: uid, userName: 'MissionSeeker', command: 'JOIN 1' },
      });

      // Cho asynchronous persistence hoàn tất
      await new Promise((r) => setTimeout(r, 200));

      // 2. Query /api/me
      const meRes = await app.inject({
        method: 'GET',
        url: `/api/me?provider=mock&userId=${uid}`,
      });
      expect(meRes.statusCode).toBe(200);
      const meData = JSON.parse(meRes.payload);

      expect(meData.player).toBeDefined();
      expect(meData.player.username).toBe('MissionSeeker');
      // Hoàn thành DAILY_JOIN (+50 XP)
      expect(meData.player.xp).toBe(50);
      expect(meData.missions.length).toBe(5);

      const joinMission = meData.missions.find((m: any) => m.code === 'DAILY_JOIN');
      expect(joinMission.completed).toBe(true);
      expect(joinMission.currentValue).toBe(1);

      const shootMission = meData.missions.find((m: any) => m.code === 'DAILY_SHOOT');
      expect(shootMission.completed).toBe(false);
      expect(shootMission.currentValue).toBe(0);

      // 3. Gửi lệnh BAN
      await app.inject({
        method: 'POST',
        url: '/api/dashboard/command',
        headers: { 'x-dashboard-token': dashboardDevToken },
        payload: { type: 'COMMENT', userId: uid, userName: 'MissionSeeker', command: 'BAN' },
      });

      await new Promise((r) => setTimeout(r, 200));

      const meRes2 = await app.inject({
        method: 'GET',
        url: `/api/me?provider=mock&userId=${uid}`,
      });
      const meData2 = JSON.parse(meRes2.payload);
      const shootMission2 = meData2.missions.find((m: any) => m.code === 'DAILY_SHOOT');
      expect(shootMission2.currentValue).toBe(1);
    });
  });

  describe('4. Persistent Match Lifecycle & Leaderboards API', () => {
    it('returns match leaderboard from /api/leaderboards', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/leaderboards?scope=match',
      });
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.scope).toBe('match');
      expect(data.matchId).toBeDefined();
      expect(Array.isArray(data.leaderboard)).toBe(true);
    });
  });

  describe('5. P0.1 Player Authentication & Forged Token Rejection', () => {
    it('strictly rejects forged Bearer ply_tiktok_victimId with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: { authorization: 'Bearer ply_tiktok_victimId' },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('UNAUTHORIZED');
    });

    it('issues signed session token and accepts it for /api/me', async () => {
      // 1. Issue session via privileged bridge endpoint
      const issueRes = await app.inject({
        method: 'POST',
        url: '/api/auth/session',
        headers: { 'x-admin-token': adminSecret },
        payload: { provider: 'tiktok', userId: 'real_viewer_101' },
      });
      expect(issueRes.statusCode).toBe(200);
      const { token } = JSON.parse(issueRes.payload);
      expect(token).toBeDefined();
      expect(token.startsWith('s_tok_')).toBe(true);

      // 2. Query /api/me with signed token
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(meRes.statusCode).toBe(200);
      const meData = JSON.parse(meRes.payload);
      expect(meData.player).toBeDefined();
      expect(meData.player.id).toBe('usr_tiktok_real_viewer_101');
      expect(meData.player.provider).toBe('tiktok');
    });

    it('strictly rejects tampered session token signature with 401', async () => {
      const tampered = 's_tok_dGlrdG9rOnZpY3RpbToxNzYyODg3NjYxOTUy.deadbeefinvalidmocksignature';
      const res = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: { authorization: `Bearer ${tampered}` },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
