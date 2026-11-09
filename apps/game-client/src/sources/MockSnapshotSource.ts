import { GameSnapshotSource, SnapshotListener } from './GameSnapshotSource.js';
import { AuthoritativeGameEngine, MatchSnapshot } from '@zombie-live/shared';

export type MockScenario = 'wave1' | 'wave3' | 'wave4' | 'boss' | 'victory' | 'defeat';

/**
 * MOCK SNAPSHOT SOURCE — 100% SHARED ENGINE PARITY
 * 
 * Vận hành AuthoritativeGameEngine trực tiếp trên client (in-memory mode):
 * - Không sử dụng công thức giả lập riêng.
 * - Chạy vòng lặp fixed-tick 20Hz (50ms) và phát snapshot 10Hz (100ms).
 * - Kết quả di chuyển, va chạm vật lý, sát thương và cái chết đồng nhất hoàn toàn với Game Server.
 */
export class MockSnapshotSource implements GameSnapshotSource {
  readonly mode = 'mock' as const;
  private listeners: Set<SnapshotListener> = new Set();
  private simulationInterval: any = null;
  private connected = false;

  private engine: AuthoritativeGameEngine;

  constructor(seed: number = 42, maxZombies: number = 10) {
    this.engine = new AuthoritativeGameEngine({ seed, maxZombies });
  }

  public getEngine(): AuthoritativeGameEngine {
    return this.engine;
  }

  public connect(): void {
    if (this.connected) return;
    this.connected = true;

    // Fixed-tick 20Hz simulation loop (50ms)
    this.simulationInterval = setInterval(() => {
      this.engine.step();

      // Emit snapshot at 10Hz (every 2 ticks)
      if (this.engine.tick % 2 === 0) {
        const snapshot = this.engine.generateSnapshot();
        for (const listener of this.listeners) {
          listener(snapshot as any);
        }
      }
    }, 50);
  }

  public disconnect(): void {
    this.connected = false;
    if (this.simulationInterval !== null) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    if (this.connected) {
      listener(this.engine.generateSnapshot() as any);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public openGate(): void {
    this.engine.openGate();
  }

  public closeGate(): void {
    this.engine.closeGate();
  }

  public triggerGift(name: string = 'TÊN LỬA TỔNG LỰC', sender: string = 'VIP_Gamer99'): void {
    this.engine.triggerGiftSkill(name, sender);
  }

  public damageWall(side: 'LEFT' | 'RIGHT', amount: number = 500): void {
    this.engine.damageWall(side, amount);
  }

  /**
   * Kích hoạt tiêu diệt zombie theo cơ chế Authoritative:
   * Giáng đòn sát thương chí tử vào entity trên engine để engine tự xử lý cái chết và sinh CombatEvent
   */
  public killAuthoritativeZombie(zombieId?: string): { killedId: string; aliveCount: number } {
    const all = this.engine.getAllZombies();
    let target = zombieId ? this.engine.getZombie(zombieId) : all.find((z) => !z.isDead);

    if (target && !target.isDead) {
      target.hp = 0;
      target.isDead = true;
      target.deathTick = this.engine.tick;
      const aliveCount = all.filter((z) => !z.isDead).length;
      console.log(`[AUTHORITATIVE EVENT] Tick: ${this.engine.tick} | Zombie ${target.id} HP: 0 (DEAD) | Live Count: ${aliveCount}`);
      return { killedId: target.id, aliveCount };
    }

    const aliveCount = all.filter((z) => !z.isDead).length;
    return { killedId: '', aliveCount };
  }

  private currentScenario: MockScenario = 'wave3';

  public generateSnapshot(): MatchSnapshot {
    return this.engine.generateSnapshot();
  }

  public setScenario(scenario: MockScenario): void {
    this.currentScenario = scenario;
  }

  public getScenario(): MockScenario {
    return this.currentScenario;
  }
}
