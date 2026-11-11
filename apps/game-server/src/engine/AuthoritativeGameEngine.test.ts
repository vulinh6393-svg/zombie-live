import { describe, it, expect, beforeEach } from 'vitest';
import { AuthoritativeGameEngine } from './AuthoritativeGameEngine.js';

describe('AuthoritativeGameEngine (20Hz Deterministic Simulation)', () => {
  let engine: AuthoritativeGameEngine;

  beforeEach(() => {
    engine = new AuthoritativeGameEngine({ seed: 42, maxZombies: 6 });
  });

  it('Requirement 1: Deterministic simulation replay produces identical state hash', () => {
    const engine1 = new AuthoritativeGameEngine({ seed: 9999, maxZombies: 6 });
    const engine2 = new AuthoritativeGameEngine({ seed: 9999, maxZombies: 6 });

    // Step both engines 100 ticks
    for (let t = 0; t < 100; t++) {
      if (t === 25) {
        engine1.openGate();
        engine2.openGate();
      }
      if (t === 60) {
        engine1.triggerGiftSkill('TÊN LỬA', 'VIP_1');
        engine2.triggerGiftSkill('TÊN LỬA', 'VIP_1');
      }
      engine1.step();
      engine2.step();
    }

    const hash1 = engine1.getStateHash();
    const hash2 = engine2.getStateHash();

    expect(hash1).toBe(hash2);
    expect(engine1.baseHp).toBe(engine2.baseHp);
    expect(engine1.generateSnapshot().zombies).toEqual(engine2.generateSnapshot().zombies);
  });

  it('Requirement 2: Gate CLOSED blocks all 3 lanes at y=840', () => {
    // Run 60 ticks with gate closed
    for (let t = 0; t < 60; t++) {
      engine.step();
    }

    const snapshot = engine.generateSnapshot();
    for (const z of snapshot.zombies) {
      // Intact defense line must never let zombies exceed y=840 when closed
      expect(z.y).toBeLessThanOrEqual(840);
    }
  });

  it('Requirement 3: Gate OPEN allows Lane Bravo to advance into courtyard past y=840', () => {
    const testEngine = new AuthoritativeGameEngine({ seed: 42, maxZombies: 0, disableCombat: true });
    // Spawn test zombie right before gate at y=800
    testEngine.spawnTestZombie(2, 800, 80);
    testEngine.openGate();

    // Step 25 ticks: 20 ticks to fully open gate, 5 ticks to advance past 840
    for (let t = 0; t < 25; t++) {
      testEngine.step();
    }

    const snapshot = testEngine.generateSnapshot();
    expect(snapshot.gate.state).toBe('OPEN');

    const bravoZombies = snapshot.zombies.filter((z) => z.lane === 2);
    expect(bravoZombies.length).toBe(1);
    expect(bravoZombies[0].y).toBeGreaterThan(840);
  });

  it('Requirement 4: Wall damage causes BREACHED and allows lane penetration', () => {
    const testEngine = new AuthoritativeGameEngine({ seed: 42, maxZombies: 0, disableCombat: true });
    // Spawn test zombie right before Left Wall at y=800
    testEngine.spawnTestZombie(1, 800, 80);

    // Damage left wall to 0
    testEngine.damageWall('LEFT', 1000);

    const wall = testEngine.collisionSystem.getWallState('LEFT');
    expect(wall.state).toBe('BREACHED');
    expect(wall.hp).toBe(0);

    // Step engine 15 ticks to advance past 840
    for (let t = 0; t < 15; t++) {
      testEngine.step();
    }

    const snapshot = testEngine.generateSnapshot();
    const alphaZombies = snapshot.zombies.filter((z) => z.lane === 1);
    expect(alphaZombies.length).toBe(1);
    expect(alphaZombies[0].y).toBeGreaterThan(840);
  });

  it('Requirement 5: Combat generates CombatEvent and marks authoritative death when HP <= 0', () => {
    let deathEventFound = false;
    let shootEventsCount = 0;

    // Run until turret/soldier kills at least one zombie
    for (let t = 0; t < 120; t++) {
      engine.step();
      const snap = engine.generateSnapshot();
      for (const ev of snap.recentEvents) {
        if (ev.type === 'SHOOT') shootEventsCount++;
        if (ev.type === 'DEATH') deathEventFound = true;
      }
    }

    expect(shootEventsCount).toBeGreaterThan(0);
    expect(deathEventFound).toBe(true);

    const snapshot = engine.generateSnapshot();
    const deadZombies = snapshot.zombies.filter((z) => z.isDead);
    expect(deadZombies.length).toBeGreaterThan(0);
    for (const z of deadZombies) {
      expect(z.hp).toBe(0);
    }
  });

  it('Requirement 6: Gift Skill causes AoE damage and generates GIFT_SKILL and HIT events', () => {
    engine.triggerGiftSkill('TÊN LỬA TỔNG LỰC', 'VIP_PLAYER', 540, 500);

    let hitEventFound = false;
    for (let t = 0; t < 30; t++) {
      engine.step();
      const snap = engine.generateSnapshot();
      for (const ev of snap.recentEvents) {
        if (ev.type === 'HIT' && ev.sourceId === 'gift_missile') {
          hitEventFound = true;
        }
      }
    }

    expect(hitEventFound).toBe(true);
  });

  it('Requirement 7: Full 5-Wave Lifecycle transitions correctly through WAVE_1 to WAVE_5, BOSS, and RESULTS', () => {
    const lifecycleEngine = new AuthoritativeGameEngine({ seed: 100, maxZombies: 2, disableCombat: true });
    expect(lifecycleEngine.phase).toBe('PREPARING');

    // Fast-forward through PREPARING (20s = 400 ticks)
    for (let i = 0; i < 400; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('WAVE_1');

    // Fast-forward WAVE_1 (60s = 1200 ticks)
    for (let i = 0; i < 1200; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('WAVE_2');

    // Fast-forward WAVE_2 (60s = 1200 ticks)
    for (let i = 0; i < 1200; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('WAVE_3');

    // Fast-forward WAVE_3 (60s = 1200 ticks)
    for (let i = 0; i < 1200; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('WAVE_4');

    // Fast-forward WAVE_4 (60s = 1200 ticks) -> MUST ENTER WAVE_5!
    for (let i = 0; i < 1200; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('WAVE_5');

    // Fast-forward WAVE_5 (40s = 800 ticks) -> MUST ENTER BOSS!
    for (let i = 0; i < 800; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('BOSS');

    const boss = lifecycleEngine.getAllZombies().find((z) => z.isBoss);
    expect(boss).toBeDefined();
    expect(boss?.hp).toBe(12000);

    // Fast-forward BOSS timeout (40s = 800 ticks) -> RESULTS
    for (let i = 0; i < 800; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('RESULTS');

    // Fast-forward RESULTS (20s = 400 ticks) -> Auto restart to PREPARING
    for (let i = 0; i < 400; i++) lifecycleEngine.step();
    expect(lifecycleEngine.phase).toBe('PREPARING');
  });

  it('Requirement 8: Isolates competitiveScore from giftScore and ranks MVP solely by competitive actions', () => {
    const testEngine = new AuthoritativeGameEngine({ seed: 123, maxZombies: 2, disableCombat: true });

    // User A joins squad Alpha
    testEngine.handleJoin('user_a', 'AliceTactical', 'alpha');
    // User A performs tactical combat actions: 1 Assist (+4), 1 Repair (+2)
    testEngine.handleShoot('user_a');
    testEngine.handleRepair('user_a');

    // User B sends big gift but does not participate in tactical actions
    testEngine.handleGift({
      provider: 'mock',
      liveSessionId: 'sess_1',
      providerEventId: 'evt_gift_whale_1',
      senderId: 'user_b',
      senderName: 'BobWhale',
      giftId: 'gift_missile',
      quantity: 5,
      timestamp: Date.now(),
    });

    const playerA = testEngine.getPlayers().find((p) => p.userId === 'user_a')!;
    const playerB = testEngine.getPlayers().find((p) => p.userId === 'user_b')!;

    // Player A has competitiveScore = 10 (join) + 4 (assist) + 2 (repair) = 16
    expect(playerA.competitiveScore).toBe(16);
    expect(playerA.giftScore).toBe(0);

    // Player B has giftScore = 500, but competitiveScore = 0!
    expect(playerB.giftScore).toBe(500);
    expect(playerB.competitiveScore).toBe(0);

    // MVP Leaderboard ranks Player A #1, Player B is NOT ranked above Player A!
    const snap = testEngine.generateSnapshot();
    expect(snap.mvpPlayers?.[0]?.name).toBe('AliceTactical');
    expect(snap.mvpPlayers?.[0]?.points).toBe(16);
  });
});
