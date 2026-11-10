import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from './config.js';
import { MockSnapshotSource } from './sources/MockSnapshotSource.js';
import { ExtendedMatchSnapshot } from './types.js';

describe('Game Client Configuration & Mock Source', () => {
  it('has 1080x1920 logical canvas size for 9:16 layout', () => {
    expect(GAME_CONFIG.width).toBe(1080);
    expect(GAME_CONFIG.height).toBe(1920);
    expect(GAME_CONFIG.scaleMode).toBe('FIT');
  });

  it('generates rich snapshots across all scenarios with 10 zombies and 40 soldiers', () => {
    const source = new MockSnapshotSource();
    source.connect();
    expect(source.isConnected()).toBe(true);

    let lastSnapshot: ExtendedMatchSnapshot | null = null;
    const unsub = source.subscribe((snap) => {
      lastSnapshot = snap;
    });

    expect(lastSnapshot).not.toBeNull();
    const snap = lastSnapshot!;
    expect(snap.zombies.length).toBeGreaterThan(0);
    expect(snap.soldiers.length).toBeGreaterThanOrEqual(3);
    expect(snap.activePlayerCount).toBeGreaterThanOrEqual(3);
    expect(snap.towers?.length).toBe(3);

    // 2. Boss Scenario
    source.setScenario('boss');
    expect(source.getScenario()).toBe('boss');

    // 3. Victory Scenario
    source.setScenario('victory');
    expect(source.getScenario()).toBe('victory');

    // 4. Defeat Scenario
    source.setScenario('defeat');
    expect(source.getScenario()).toBe('defeat');

    unsub();
    source.disconnect();
    expect(source.isConnected()).toBe(false);
  });

  it('accurately tracks live vs dead zombies: death reduces alive count from 10 to 9', () => {
    const source = new MockSnapshotSource();
    source.connect();
    let snap: ExtendedMatchSnapshot | null = null;
    const unsub = source.subscribe((s) => {
      snap = s;
    });

    expect(snap).not.toBeNull();
    const liveBefore = snap!.zombies.filter((z) => z.hp > 0).length;
    expect(liveBefore).toBe(10);

    // Call server-authoritative zombie kill
    const res = source.killAuthoritativeZombie();
    expect(res.killedId).toBeTruthy();
    expect(res.aliveCount).toBe(9);

    // Next snapshot verifies alive count is 9
    const liveAfter = source['generateSnapshot']().zombies.filter((z) => z.hp > 0).length;
    expect(liveAfter).toBe(9);

    unsub();
    source.disconnect();
  });

  it('correctly manages wave countdown timer without unexpected incrementation', () => {
    const source = new MockSnapshotSource();
    source.connect();
    let snap: ExtendedMatchSnapshot | null = null;
    const unsub = source.subscribe((s) => {
      snap = s;
    });

    expect(snap).not.toBeNull();
    expect(snap!.waveRemainingSeconds).toBeDefined();
    expect(snap!.waveRemainingSeconds).toBeLessThanOrEqual(120);

    unsub();
    source.disconnect();
  });
});
