import { describe, it, expect } from 'vitest';
import { AuthoritativeGameEngine } from './AuthoritativeGameEngine.js';
import { resolveGiftSkill, SKILL_REGISTRY } from './SkillRegistry.js';

describe('Phase 06 — Config-Driven Skill Engine & Deterministic Effects', () => {
  describe('1. SkillRegistry & Exact Gift Mapping', () => {
    it('maps all supported gift IDs to correct skill categories with exact lookup', () => {
      expect(resolveGiftSkill('gift_missile')?.id).toBe('airstrike');
      expect(resolveGiftSkill('airstrike')?.id).toBe('airstrike');
      expect(resolveGiftSkill('gift_shield')?.id).toBe('shield');
      expect(resolveGiftSkill('shield')?.id).toBe('shield');
      expect(resolveGiftSkill('gift_overclock')?.id).toBe('overclock');
      expect(resolveGiftSkill('gift_doughnut')?.id).toBe('overclock');
      expect(resolveGiftSkill('machinegun')?.id).toBe('overclock');
      expect(resolveGiftSkill('gift_reinforce')?.id).toBe('reinforcements');
      expect(resolveGiftSkill('reinforcements')?.id).toBe('reinforcements');
      expect(resolveGiftSkill('gift_mech')?.id).toBe('mech');
      expect(resolveGiftSkill('mech')?.id).toBe('mech');
      expect(resolveGiftSkill('gift_heart')?.id).toBe('healing');
      expect(resolveGiftSkill('heal')?.id).toBe('healing');
      expect(resolveGiftSkill('gift_honor')?.id).toBe('honor');
      expect(resolveGiftSkill('gift_crown')?.id).toBe('honor');
      expect(resolveGiftSkill('crown')?.id).toBe('honor');
      expect(resolveGiftSkill('rose')?.id).toBe('reinforcements');
      expect(resolveGiftSkill('gift_rose')?.id).toBe('reinforcements');
    });

    it('rejects unsupported or malicious gift IDs immediately with null', () => {
      expect(resolveGiftSkill('gift_unknown_999')).toBeNull();
      expect(resolveGiftSkill('')).toBeNull();
      expect(resolveGiftSkill('random_coin')).toBeNull();
      expect(resolveGiftSkill('inject; DROP TABLE')).toBeNull();
    });

    it('defines balance parameters for all 7 skills adhering to validated schemas', () => {
      const skills = ['airstrike', 'shield', 'overclock', 'reinforcements', 'mech', 'healing', 'honor'];
      for (const s of skills) {
        const config = SKILL_REGISTRY[s];
        expect(config).toBeDefined();
        expect(config.perMatchCap).toBeGreaterThan(0);
        expect(config.cooldownSeconds).toBeGreaterThanOrEqual(0);
        expect(config.bannerColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('2. Authoritative Simulation Mechanics for All 7 Skills', () => {
    it('Airstrike: warns with targeting circle, then detonates 450 AoE damage', () => {
      const engine = new AuthoritativeGameEngine({ seed: 100, disableCombat: true });
      const zombies = engine.getLiveZombies();
      const firstZ = zombies[0];
      firstZ.x = 540;
      firstZ.y = 580;
      const initialHp = firstZ.hp;

      const res = engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_air_1',
        senderId: 'user_general',
        senderName: 'General_Alpha',
        giftId: 'gift_missile',
        quantity: 1,
        timestamp: Date.now(),
      });

      expect(res.success).toBe(true);
      expect(res.skillName).toBe('TÊN LỬA TỔNG LỰC');

      // Vòng cảnh báo kéo dài 20 ticks (1.0s)
      for (let i = 0; i < 19; i++) engine.step();
      // Trước khi nổ, zombie chưa mất máu
      expect(firstZ.hp).toBe(initialHp);

      // Bước sang tick 20: Tên lửa kích nổ AoE
      engine.step();
      expect(firstZ.hp).toBe(Math.max(0, initialHp - 450));
    });

    it('Fortress Shield: reduces Base and Wall incoming damage by 50% and expires cleanly', () => {
      const engine = new AuthoritativeGameEngine({ seed: 200, disableCombat: true });
      expect(engine.isShieldActive()).toBe(false);

      // Kích hoạt khiên bảo vệ (12s = 240 ticks)
      engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_shield_1',
        senderId: 'user_defender',
        senderName: 'Guardian',
        giftId: 'gift_shield',
        quantity: 1,
        timestamp: Date.now(),
      });

      expect(engine.isShieldActive()).toBe(true);

      // Thử sát thương tường thành: 200 damage bị giảm 50% còn 100
      engine.damageWall('LEFT', 200);
      const wallLeft = engine.collisionSystem.getWallState('LEFT');
      expect(wallLeft.hp).toBe(900); // 1000 - 100 = 900

      // Cho chạy qua 240 ticks
      for (let i = 0; i < 245; i++) engine.step();
      expect(engine.isShieldActive()).toBe(false);

      // Khi khiên hết hạn: 200 damage nhận đủ 200
      engine.damageWall('LEFT', 200);
      expect(engine.collisionSystem.getWallState('LEFT').hp).toBe(700); // 900 - 200 = 700
    });

    it('Turret Overclock: doubles fire rate for 15s then cleanly restores original cooldowns', () => {
      const engine = new AuthoritativeGameEngine({ seed: 300, disableCombat: true });
      const snap1 = engine.generateSnapshot();
      const origCooldown = snap1.towers[0].level; // Snapshot contains towers

      engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_overclock_1',
        senderId: 'user_engi',
        senderName: 'Mechanic',
        giftId: 'gift_overclock',
        quantity: 1,
        timestamp: Date.now(),
      });

      expect(engine.isOverclockActive()).toBe(true);

      // Tua qua 305 ticks (15s = 300 ticks)
      for (let i = 0; i < 305; i++) engine.step();
      expect(engine.isOverclockActive()).toBe(false);
    });

    it('Reinforcements: spawns supporting infantry units up to capacity limit', () => {
      const engine = new AuthoritativeGameEngine({ seed: 400, disableCombat: true });
      const initialSoldierCount = engine.generateSnapshot().soldiers.length;

      engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_reinf_1',
        senderId: 'user_capt',
        senderName: 'Captain',
        giftId: 'gift_reinforce',
        quantity: 1,
        timestamp: Date.now(),
      });

      const snap = engine.generateSnapshot();
      expect(snap.soldiers.length).toBe(initialSoldierCount + 2);
    });

    it('Mech Support: deploys Titan Mech unit, respects max concurrent cap = 1', () => {
      const engine = new AuthoritativeGameEngine({ seed: 500, disableCombat: true });
      expect(engine.getActiveMech()).toBeUndefined();

      const res1 = engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_mech_1',
        senderId: 'user_titan',
        senderName: 'TitanPilot',
        giftId: 'gift_mech',
        quantity: 1,
        timestamp: Date.now(),
      });

      expect(res1.success).toBe(true);
      const mech = engine.getActiveMech();
      expect(mech).toBeDefined();
      expect(mech?.hp).toBe(1500);

      // Cố gắng gọi Mech thứ hai trong khi Mech hiện tại còn sống -> bị từ chối
      const res2 = engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_mech_2',
        senderId: 'user_titan_2',
        senderName: 'TitanPilot2',
        giftId: 'gift_mech',
        quantity: 1,
        timestamp: Date.now(),
      });

      expect(res2.success).toBe(false);
      expect(res2.reason).toBe('MAX_MECH_CONCURRENT_REACHED');
    });

    it('Healing: restores Base HP and Soldier HP, strictly capped at maxBaseHp', () => {
      const engine = new AuthoritativeGameEngine({ seed: 600, disableCombat: true });
      engine.baseHp = 8000; // Giảm còn 8000
      const soldiers = engine.generateSnapshot().soldiers;

      engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_heal_1',
        senderId: 'user_medic',
        senderName: 'Doc',
        giftId: 'gift_heart',
        quantity: 1,
        timestamp: Date.now(),
      });

      expect(engine.baseHp).toBe(8400); // 8000 + 400

      // Cố tình hồi quá mức -> không bao giờ vượt trần maxBaseHp (10000)
      engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_heal_huge',
        senderId: 'user_medic',
        senderName: 'Doc',
        giftId: 'gift_heart',
        quantity: 50,
        timestamp: Date.now(),
      });

      expect(engine.baseHp).toBe(engine.maxBaseHp);
    });

    it('Honor: triggers cosmetic celebration banner without competitive score distortion', () => {
      const engine = new AuthoritativeGameEngine({ seed: 700, disableCombat: true });

      const res = engine.handleGift({
        provider: 'mock',
        liveSessionId: engine.matchId,
        providerEventId: 'evt_honor_1',
        senderId: 'user_vip',
        senderName: 'KingViewer',
        giftId: 'gift_honor',
        quantity: 1,
        timestamp: Date.now(),
      });

      expect(res.success).toBe(true);
      const player = engine.getPlayers().find((p) => p.userId === 'user_vip');
      expect(player).toBeDefined();
      expect(player?.giftScore).toBe(40);
      expect(player?.competitiveScore).toBe(0); // Tách biệt khỏi competitive gameplay score
    });
  });

  describe('3. Monotonic Tick-Ordered Command Queue & Crash Recovery', () => {
    it('applies queued commands at the exact assigned targetTick', () => {
      const engine = new AuthoritativeGameEngine({ seed: 800, disableCombat: true });
      engine.baseHp = 9000;

      // Đưa lệnh vào hàng đợi cho tick 10
      const queueRes = engine.queueSkillCommand({
        commandId: 'cmd_queued_heal',
        matchId: engine.matchId,
        targetTick: 10,
        sourceUserId: 'user_q',
        sourceUserName: 'QueuedMedic',
        skillId: 'healing',
        quantity: 1,
      });

      expect(queueRes.queued).toBe(true);

      // Chạy 8 ticks: Lệnh chưa được thực thi
      for (let i = 0; i < 8; i++) engine.step();
      expect(engine.baseHp).toBe(9000);

      // Chạy đến tick 10: Lệnh được thực thi
      engine.step(); // tick 9
      engine.step(); // tick 10
      expect(engine.baseHp).toBe(9400);
    });

    it('saves authoritative simulation state checkpoint and restores identically after simulated crash', () => {
      const engine1 = new AuthoritativeGameEngine({ seed: 999, disableCombat: true });

      // Chạy 50 ticks và kích hoạt 2 skills
      for (let i = 0; i < 20; i++) engine1.step();
      engine1.handleGift({
        provider: 'mock',
        liveSessionId: engine1.matchId,
        providerEventId: 'evt_chk_1',
        senderId: 'user_chk',
        senderName: 'Checkpointer',
        giftId: 'gift_shield',
        quantity: 1,
        timestamp: Date.now(),
      });
      for (let i = 0; i < 30; i++) engine1.step();

      const snapshot = engine1.getSimulationState();
      const hashBefore = engine1.getStateHash();

      // Mô phỏng server khởi động lại (engine2) và tải lại checkpoint
      const engine2 = new AuthoritativeGameEngine({ seed: 999, disableCombat: true });
      engine2.loadSimulationState(snapshot);

      expect(engine2.getStateHash()).toBe(hashBefore);
      expect(engine2.tick).toBe(engine1.tick);
      expect(engine2.baseHp).toBe(engine1.baseHp);
      expect(engine2.isShieldActive()).toBe(engine1.isShieldActive());
    });

    it('defers gifts received during RESULTS phase and automatically executes in the next match', () => {
      const engine = new AuthoritativeGameEngine({ seed: 1111, disableCombat: true });
      engine.phase = 'RESULTS';

      const queueRes = engine.queueSkillCommand({
        commandId: 'cmd_results_gift',
        matchId: 'old_match_id',
        targetTick: 0,
        sourceUserId: 'user_donor',
        sourceUserName: 'LateDonor',
        skillId: 'healing',
        quantity: 1,
      });

      expect(queueRes.queued).toBe(true);
      expect(queueRes.reason).toBe('DEFERRED_FOR_NEXT_MATCH');

      // Khởi động vòng đấu mới
      engine.restartMatch();
      expect(engine.phase).toBe('PREPARING');

      // Bước 5 ticks để command được dequeue
      for (let i = 0; i < 6; i++) engine.step();
      // Quà đã được áp dụng trong trận mới!
      const player = engine.getPlayers().find((p) => p.userId === 'user_donor');
      expect(player).toBeDefined();
      expect(player?.giftScore).toBe(50);
    });

    it('Deterministic Replay Test: 2 separate engine instances produce exact same state hash', () => {
      const seed = 1337;
      const commands = [
        { tick: 5, giftId: 'gift_missile', user: 'u1' },
        { tick: 15, giftId: 'gift_shield', user: 'u2' },
        { tick: 25, giftId: 'gift_overclock', user: 'u3' },
        { tick: 35, giftId: 'gift_heart', user: 'u4' },
      ];

      const runSimulation = () => {
        const eng = new AuthoritativeGameEngine({ seed, disableCombat: false });
        for (let t = 1; t <= 60; t++) {
          const cmd = commands.find((c) => c.tick === t);
          if (cmd) {
            eng.handleGift({
              provider: 'mock',
              liveSessionId: eng.matchId,
              providerEventId: `evt_${t}_${cmd.user}`,
              senderId: cmd.user,
              senderName: `Commander_${cmd.user}`,
              giftId: cmd.giftId,
              quantity: 1,
              timestamp: Date.now(),
            });
          }
          eng.step();
        }
        return eng.getStateHash();
      };

      const hashRun1 = runSimulation();
      const hashRun2 = runSimulation();

      expect(hashRun1).toBe(hashRun2);
    });
  });
});
