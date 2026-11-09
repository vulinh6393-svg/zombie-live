import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRandom } from './SeededRandom.js';
import { BastionCollisionSystem } from './BastionCollisionSystem.js';
import { BASTION_GEOMETRY } from './BastionGeometryConfig.js';

describe('SeededRandom (Deterministic PRNG)', () => {
  it('produces identical sequence for identical seed', () => {
    const rng1 = new SeededRandom(1337);
    const rng2 = new SeededRandom(1337);

    const seq1 = Array.from({ length: 50 }, () => rng1.next());
    const seq2 = Array.from({ length: 50 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRandom(100);
    const rng2 = new SeededRandom(200);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });
});

describe('BastionCollisionSystem (Authoritative Core)', () => {
  let collision: BastionCollisionSystem;

  beforeEach(() => {
    collision = new BastionCollisionSystem();
  });

  it('blocks all 3 lanes at y=840 when gate is CLOSED', () => {
    collision.setGateState('CLOSED');

    const resAlpha = collision.resolveMovement(280, 830, 280, 860, 20);
    expect(resAlpha.collided).toBe(true);
    expect(resAlpha.resolvedY).toBe(820);
    expect(resAlpha.segment).toBe('LEFT_WALL');

    const resBravo = collision.resolveMovement(540, 830, 540, 860, 20);
    expect(resBravo.collided).toBe(true);
    expect(resBravo.resolvedY).toBe(820);
    expect(resBravo.segment).toBe('GATE');

    const resCharlie = collision.resolveMovement(800, 830, 800, 860, 20);
    expect(resCharlie.collided).toBe(true);
    expect(resCharlie.resolvedY).toBe(820);
    expect(resCharlie.segment).toBe('RIGHT_WALL');
  });

  it('allows Bravo passage when gate is OPEN while Alpha & Charlie remain blocked', () => {
    collision.setGateState('OPEN');

    const resBravo = collision.resolveMovement(540, 830, 540, 860, 20);
    expect(resBravo.collided).toBe(false);
    expect(resBravo.resolvedY).toBe(860);
    expect(resBravo.passThroughReason).toBe('GATE_OPEN');

    const resAlpha = collision.resolveMovement(280, 830, 280, 860, 20);
    expect(resAlpha.collided).toBe(true);
    expect(resAlpha.resolvedY).toBe(820);

    const resCharlie = collision.resolveMovement(800, 830, 800, 860, 20);
    expect(resCharlie.collided).toBe(true);
    expect(resCharlie.resolvedY).toBe(820);
  });

  it('reproducibly resolves zombies caught in closing doors', () => {
    collision.setGateState('CLOSING');
    collision.updateGateDoors(490, 590); // Narrowing gap

    // Zombie at north of threshold (currY = 860 <= 890): pushed back to y=820
    const resNorth = collision.resolveMovement(540, 860, 540, 880, 20);
    expect(resNorth.collided).toBe(true);
    expect(resNorth.resolvedY).toBe(820);

    // Zombie at south of threshold (currY = 910 > 890): pushed forward into courtyard
    const resSouth = collision.resolveMovement(540, 910, 540, 920, 20);
    expect(resSouth.collided).toBe(true);
    expect(resSouth.resolvedY).toBeGreaterThanOrEqual(950);
  });

  it('allows passage when wall is damaged to BREACHED', () => {
    collision.setWallState('LEFT', 'BREACHED', 0);

    const resAlpha = collision.resolveMovement(280, 830, 280, 860, 20);
    expect(resAlpha.collided).toBe(false);
    expect(resAlpha.passThroughReason).toBe('WALL_BREACHED');
  });
});
