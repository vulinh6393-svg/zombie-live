import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PGliteDatabaseAdapter } from './db.js';
import { PlayerRepository, calculateLevelFromXp } from './repositories/PlayerRepository.js';
import { GiftLedgerRepository } from './repositories/GiftLedgerRepository.js';
import { MissionRepository } from './repositories/MissionRepository.js';
import { MatchRepository } from './repositories/MatchRepository.js';
import { OutboxRepository } from './repositories/OutboxRepository.js';

describe('Database Layer & PostgreSQL Persistence (Phase 05)', () => {
  let db: PGliteDatabaseAdapter;
  let playerRepo: PlayerRepository;
  let giftRepo: GiftLedgerRepository;
  let missionRepo: MissionRepository;
  let matchRepo: MatchRepository;
  let outboxRepo: OutboxRepository;

  beforeEach(async () => {
    db = new PGliteDatabaseAdapter();
    await db.init({ runMigrations: true, seed: true });

    playerRepo = new PlayerRepository(db);
    giftRepo = new GiftLedgerRepository(db);
    missionRepo = new MissionRepository(db);
    matchRepo = new MatchRepository(db);
    outboxRepo = new OutboxRepository(db);
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  describe('1. Player Repository & Level Progression', () => {
    it('calculates level correctly from XP formula: floor(sqrt(XP / 100)) + 1', () => {
      expect(calculateLevelFromXp(0)).toBe(1);
      expect(calculateLevelFromXp(50)).toBe(1);
      expect(calculateLevelFromXp(100)).toBe(2);
      expect(calculateLevelFromXp(399)).toBe(2);
      expect(calculateLevelFromXp(400)).toBe(3);
      expect(calculateLevelFromXp(900)).toBe(4);
      expect(calculateLevelFromXp(10000)).toBe(11);
    });

    it('creates new player or returns existing without losing stats', async () => {
      const p1 = await playerRepo.findOrCreate('tiktok', 'user_123', 'PlayerOne', 'alpha');
      expect(p1.id).toBe('usr_tiktok_user_123');
      expect(p1.xp).toBe(0);
      expect(p1.level).toBe(1);

      // Thêm 400 XP -> thăng cấp lên level 3
      const xpRes = await playerRepo.addXp(p1.id, 400);
      expect(xpRes.newXp).toBe(400);
      expect(xpRes.newLevel).toBe(3);
      expect(xpRes.leveledUp).toBe(true);

      // Tìm lại người chơi: XP và Level phải được bảo toàn
      const p1Reloaded = await playerRepo.findOrCreate('tiktok', 'user_123', 'PlayerOneRenamed', 'alpha');
      expect(p1Reloaded.xp).toBe(400);
      expect(p1Reloaded.level).toBe(3);
      expect(p1Reloaded.username).toBe('PlayerOneRenamed');
    });

    it('returns only safe fields for public profile', async () => {
      const p = await playerRepo.findOrCreate('mock', 'u_sec', 'SecretGamer', 'bravo');
      const pub = await playerRepo.getPublicProfile(p.id);
      expect(pub).toBeDefined();
      expect(pub?.username).toBe('SecretGamer');
      expect(pub?.level).toBe(1);
      expect((pub as any)?.platformUserId).toBeUndefined();
    });
  });

  describe('2. Gift Ledger & Streak Settlement State Machine', () => {
    it('settles a standalone gift once and rejects duplicates by providerEventId', async () => {
      const res1 = await giftRepo.settleGift({
        provider: 'mock',
        liveSessionId: 'sess_1',
        providerEventId: 'evt_standalone_1',
        senderId: 'usr_donor_1',
        senderName: 'VIPDonor',
        giftId: 'gift_missile',
        quantity: 1,
        streakStatus: 'FINISHED',
        skillId: 'airstrike',
      });

      expect(res1.success).toBe(true);
      expect(res1.deltaQuantity).toBe(1);

      // Gửi lại cùng event ID -> Bị từ chối DUPLICATE_EVENT
      const resDup = await giftRepo.settleGift({
        provider: 'mock',
        liveSessionId: 'sess_1',
        providerEventId: 'evt_standalone_1',
        senderId: 'usr_donor_1',
        senderName: 'VIPDonor',
        giftId: 'gift_missile',
        quantity: 1,
        streakStatus: 'FINISHED',
        skillId: 'airstrike',
      });

      expect(resDup.success).toBe(false);
      expect(resDup.reason).toBe('DUPLICATE_EVENT');
      expect(resDup.deltaQuantity).toBe(0);
    });

    it('handles cumulative streak increments correctly: only triggers skill for delta quantity', async () => {
      const streakId = 'streak_flame_999';

      // Packet 1: quantity = 1 (IN_PROGRESS)
      const p1 = await giftRepo.settleGift({
        provider: 'tiktok',
        liveSessionId: 'sess_live',
        providerEventId: 'evt_stk_1',
        senderId: 'u_streaker',
        senderName: 'StreakMaster',
        giftId: 'gift_shield',
        quantity: 1,
        quantityMode: 'cumulative',
        streakId,
        streakStatus: 'IN_PROGRESS',
        skillId: 'shield',
      });
      expect(p1.success).toBe(true);
      expect(p1.deltaQuantity).toBe(1); // Delta = 1 - 0 = 1

      // Packet 2: quantity = 5 (IN_PROGRESS) -> Delta = 5 - 1 = 4
      const p2 = await giftRepo.settleGift({
        provider: 'tiktok',
        liveSessionId: 'sess_live',
        providerEventId: 'evt_stk_2',
        senderId: 'u_streaker',
        senderName: 'StreakMaster',
        giftId: 'gift_shield',
        quantity: 5,
        quantityMode: 'cumulative',
        streakId,
        streakStatus: 'IN_PROGRESS',
        skillId: 'shield',
      });
      expect(p2.success).toBe(true);
      expect(p2.deltaQuantity).toBe(4);

      // Packet 3: quantity = 5 lặp lại (re-broadcast packet) -> Delta = 0, no skill trigger
      const p3 = await giftRepo.settleGift({
        provider: 'tiktok',
        liveSessionId: 'sess_live',
        providerEventId: 'evt_stk_3',
        senderId: 'u_streaker',
        senderName: 'StreakMaster',
        giftId: 'gift_shield',
        quantity: 5,
        quantityMode: 'cumulative',
        streakId,
        streakStatus: 'IN_PROGRESS',
        skillId: 'shield',
      });
      expect(p3.success).toBe(true);
      expect(p3.deltaQuantity).toBe(0);
      expect(p3.reason).toBe('NO_DELTA_QUANTITY');

      // Packet 4: quantity = 10 (FINISHED) -> Delta = 10 - 5 = 5
      const p4 = await giftRepo.settleGift({
        provider: 'tiktok',
        liveSessionId: 'sess_live',
        providerEventId: 'evt_stk_4',
        senderId: 'u_streaker',
        senderName: 'StreakMaster',
        giftId: 'gift_shield',
        quantity: 10,
        quantityMode: 'cumulative',
        streakId,
        streakStatus: 'FINISHED',
        skillId: 'shield',
      });
      expect(p4.success).toBe(true);
      expect(p4.deltaQuantity).toBe(5);

      // Packet 5: Packet trễ đến sau khi streak đã FINISHED -> Bị chặn STREAK_ALREADY_FINISHED
      const pLate = await giftRepo.settleGift({
        provider: 'tiktok',
        liveSessionId: 'sess_live',
        providerEventId: 'evt_stk_5_late',
        senderId: 'u_streaker',
        senderName: 'StreakMaster',
        giftId: 'gift_shield',
        quantity: 12,
        quantityMode: 'cumulative',
        streakId,
        streakStatus: 'IN_PROGRESS',
        skillId: 'shield',
      });
      expect(pLate.success).toBe(false);
      expect(pLate.reason).toBe('STREAK_ALREADY_FINISHED');
    });
  });

  describe('3. Daily Mission Tracking & Reward Grants', () => {
    it('tracks mission progress and awards XP only once per daily period', async () => {
      const p = await playerRepo.findOrCreate('mock', 'u_missioner', 'MissionTester', 'charlie');

      // 1. Thực hiện lệnh JOIN (target: 1, reward: 50 XP)
      const resJoin = await missionRepo.recordAction(p.id, 'JOIN');
      expect(resJoin.completedNow).toBe(true);
      expect(resJoin.xpGranted).toBe(50);

      // Kiểm tra XP đã được cộng vào player profile
      const pAfterJoin = await playerRepo.getProfile('mock', 'u_missioner');
      expect(pAfterJoin?.xp).toBe(50);

      // Thử JOIN lần 2 trong cùng ngày -> không cộng thêm
      const resJoin2 = await missionRepo.recordAction(p.id, 'JOIN');
      expect(resJoin2.completedNow).toBe(false);
      expect(resJoin2.xpGranted).toBe(0);

      // 2. Thực hiện lệnh BAN 5 lần (target: 5, reward: 100 XP)
      for (let i = 0; i < 4; i++) {
        const r = await missionRepo.recordAction(p.id, 'BAN');
        expect(r.completedNow).toBe(false);
      }

      // Phát thứ 5: Hoàn thành nhiệm vụ DAILY_SHOOT
      const r5 = await missionRepo.recordAction(p.id, 'BAN');
      expect(r5.completedNow).toBe(true);
      expect(r5.xpGranted).toBe(100);

      const pAfterShoot = await playerRepo.getProfile('mock', 'u_missioner');
      expect(pAfterShoot?.xp).toBe(150); // 50 + 100 = 150
      expect(pAfterShoot?.level).toBe(2); // sqrt(150/100) + 1 = 2
    });

    it('returns full daily mission progress list', async () => {
      const p = await playerRepo.findOrCreate('mock', 'u_list', 'Lister', 'bravo');
      await missionRepo.recordAction(p.id, 'JOIN');
      await missionRepo.recordAction(p.id, 'SUA');

      const missions = await missionRepo.getPlayerMissions(p.id);
      expect(missions.length).toBe(5);

      const joinM = missions.find((m) => m.code === 'DAILY_JOIN');
      expect(joinM?.completed).toBe(true);
      expect(joinM?.currentValue).toBe(1);

      const repairM = missions.find((m) => m.code === 'DAILY_REPAIR');
      expect(repairM?.completed).toBe(false);
      expect(repairM?.currentValue).toBe(1);
      expect(repairM?.targetValue).toBe(3);
    });
  });

  describe('4. Match Lifecycle & Leaderboard Snapshots', () => {
    it('saves match result and leaderboard snapshot, preventing duplicate finish', async () => {
      const matchId = `match_${Date.now()}`;
      await matchRepo.startMatch(matchId, 777, 'PREPARING', 10000);

      const finishRes1 = await matchRepo.finishMatch(
        matchId,
        'VICTORY',
        'usr_mvp_1',
        { durationSeconds: 320, totalKills: 45 },
        [
          {
            userId: 'usr_mvp_1',
            squad: 'alpha',
            score: 120,
            competitiveScore: 120,
            giftScore: 0,
            kills: 5,
            assists: 2,
            repairs: 1,
            rescues: 0,
            bossDamage: 500,
            hasJoined: true,
          },
          {
            userId: 'usr_player_2',
            squad: 'bravo',
            score: 60,
            competitiveScore: 60,
            giftScore: 50,
            kills: 2,
            assists: 1,
            repairs: 2,
            rescues: 1,
            bossDamage: 100,
            hasJoined: true,
          },
        ]
      );
      expect(finishRes1.saved).toBe(true);

      // Ghi lần 2 -> từ chối lặp lại
      const finishRes2 = await matchRepo.finishMatch(matchId, 'VICTORY', 'usr_mvp_1', {}, []);
      expect(finishRes2.saved).toBe(false);

      // Snapshot được bảo toàn
      const snapshot = await matchRepo.getLeaderboardSnapshot('match', matchId);
      expect(snapshot).toBeDefined();
      expect(snapshot.result).toBe('VICTORY');
      expect(snapshot.mvpPlayerId).toBe('usr_mvp_1');
      expect(snapshot.leaderboard.length).toBe(2);
      expect(snapshot.leaderboard[0].competitiveScore).toBe(120);
    });
  });

  describe('5. Transactional Outbox & Reliability', () => {
    it('fetches pending outbox events and marks them as processed', async () => {
      // Settle a gift to generate an outbox event
      await giftRepo.settleGift({
        provider: 'mock',
        liveSessionId: 'sess_outbox',
        providerEventId: 'evt_outbox_test',
        senderId: 'usr_sender',
        senderName: 'Sender',
        giftId: 'gift_shield',
        quantity: 1,
      });

      const pending = await outboxRepo.fetchPendingEvents(10);
      expect(pending.length).toBeGreaterThan(0);

      const target = pending.find((e) => e.aggregateId === 'evt_outbox_test');
      expect(target).toBeDefined();
      expect(target?.status).toBe('PENDING');

      // Đánh dấu đã xử lý
      await outboxRepo.markProcessed(target!.id);

      const remaining = await outboxRepo.fetchPendingEvents(10);
      const targetAfter = remaining.find((e) => e.aggregateId === 'evt_outbox_test');
      expect(targetAfter).toBeUndefined();
    });

    it('claims pending events atomically and marks status PROCESSING', async () => {
      await giftRepo.settleGift({
        provider: 'mock',
        liveSessionId: 'sess_claim',
        providerEventId: 'evt_claim_atomic',
        senderId: 'usr_claim',
        senderName: 'Claimer',
        giftId: 'gift_missile',
        quantity: 1,
      });

      const claimed = await outboxRepo.claimPendingEvents(5);
      const claimedTarget = claimed.find((e) => e.aggregateId === 'evt_claim_atomic');
      expect(claimedTarget).toBeDefined();
      expect(claimedTarget?.status).toBe('PROCESSING');

      // Claim lần 2 trong cùng lúc không lấy lại event đang PROCESSING
      const secondClaim = await outboxRepo.claimPendingEvents(5);
      const secondTarget = secondClaim.find((e) => e.aggregateId === 'evt_claim_atomic');
      expect(secondTarget).toBeUndefined();

      // Đánh dấu processed
      await outboxRepo.markProcessed(claimedTarget!.id);
    });

    it('recovers data 100% after closing and reopening database connection with persistent storage', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const testDir = path.resolve(process.cwd(), '.data/test_restart_' + Date.now());

      try {
        // Step 1: Khởi tạo database adapter lưu trên filesystem
        const persistentDb = new PGliteDatabaseAdapter(testDir);
        await persistentDb.init({ runMigrations: true, seed: true });

        const pRepo1 = new PlayerRepository(persistentDb);
        const mRepo1 = new MissionRepository(persistentDb);

        // Tạo player & tăng XP
        const p = await pRepo1.findOrCreate('tiktok', 'restart_user_1', 'CommanderRestart', 'alpha');
        await pRepo1.addXp(p.id, 900); // 900 XP -> Level 4

        // Ghi nhận nhiệm vụ
        const actionRes = await mRepo1.recordAction(p.id, 'JOIN');
        expect(actionRes.completedNow).toBe(true);
        expect(actionRes.xpGranted).toBe(50);

        // Đóng adapter (mô phỏng process crash / graceful shutdown)
        await persistentDb.close();

        // Step 2: Khởi động lại process mới trên cùng dataDir
        const restartedDb = new PGliteDatabaseAdapter(testDir);
        await restartedDb.init({ runMigrations: true });

        const pRepo2 = new PlayerRepository(restartedDb);
        const mRepo2 = new MissionRepository(restartedDb);

        // Kiểm tra dữ liệu người chơi
        const reloaded = await pRepo2.findOrCreate('tiktok', 'restart_user_1', 'CommanderRestart', 'alpha');
        expect(reloaded.xp).toBe(950); // 900 + 50 từ mission
        expect(reloaded.level).toBe(4);
        expect(reloaded.username).toBe('CommanderRestart');

        // Kiểm tra nhiệm vụ đã hoàn thành và điểm thưởng đã nhận
        const missions = await mRepo2.getPlayerMissions(p.id);
        const joinMission = missions.find((m) => m.code === 'DAILY_JOIN');
        expect(joinMission).toBeDefined();
        expect(joinMission?.currentValue).toBe(1);
        expect(joinMission?.completed).toBe(true);

        await restartedDb.close();
      } finally {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    }, 30000);
  });
});
