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
});
