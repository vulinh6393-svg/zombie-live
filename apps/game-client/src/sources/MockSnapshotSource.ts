import { GameSnapshotSource, SnapshotListener } from './GameSnapshotSource.js';
import { ExtendedMatchSnapshot, SoldierSnapshot, ZombieSnapshot, TowerSnapshot } from '../types.js';

export type MockScenario = 'wave1' | 'wave3' | 'wave4' | 'boss' | 'victory' | 'defeat';

export class MockSnapshotSource implements GameSnapshotSource {
  readonly mode = 'mock' as const;
  private listeners: Set<SnapshotListener> = new Set();
  private timer: any = null;
  private currentScenario: MockScenario = 'wave3';
  private tickCount = 0;
  private connected = false;

  connect(): void {
    if (this.connected) return;
    this.connected = true;
    this.tickCount = 0;
    // Emit snapshots at 10Hz (100ms)
    this.timer = setInterval(() => {
      this.tickCount++;
      const snapshot = this.generateSnapshot();
      for (const listener of this.listeners) {
        listener(snapshot);
      }
    }, 100);
  }

  disconnect(): void {
    this.connected = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    if (this.connected) {
      listener(this.generateSnapshot());
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  setScenario(scenario: MockScenario): void {
    this.currentScenario = scenario;
    this.tickCount = 0;
  }

  getScenario(): MockScenario {
    return this.currentScenario;
  }

  private generateSnapshot(): ExtendedMatchSnapshot {
    const elapsedSeconds = Math.floor(this.tickCount / 10);

    const towers: TowerSnapshot[] = [
      { id: 'turret_alpha', type: 'machinegun', name: 'Ụ Pháo Alpha', x: 260, y: 1450, level: 2 },
      { id: 'turret_bravo', type: 'plasma', name: 'Ụ Pháo Bravo', x: 540, y: 1430, level: 3 },
      { id: 'turret_charlie', type: 'tesla', name: 'Ụ Pháo Charlie', x: 820, y: 1450, level: 2 },
    ];

    const mvpPlayers = [
      { name: 'XạThủAlpha', points: 1540, avatarColor: 0x00f5d4 },
      { name: 'HộVệBravo', points: 1320, avatarColor: 0xfee440 },
      { name: 'BắnTỉaCharlie', points: 1080, avatarColor: 0xf72585 },
      { name: 'YTáChiếnTrường', points: 860, avatarColor: 0x00bbf9 },
    ];

    // BOSS SCENARIO
    if (this.currentScenario === 'boss') {
      const bossMaxHp = 15000;
      const bossHp = Math.max(1200, bossMaxHp - (this.tickCount * 45) % bossMaxHp);
      const bossY = 550 + Math.sin(this.tickCount * 0.04) * 35;

      const zombies: ZombieSnapshot[] = [
        {
          id: 'boss-king',
          type: 'boss',
          name: 'ZOMBIE VUA (BOSS)',
          x: 540,
          y: bossY,
          hp: bossHp,
          maxHp: bossMaxHp,
          lane: 2,
          isBoss: true,
        },
        // Escorts
        { id: 'z-escort-1', type: 'walker', name: 'Hộ Vệ Alpha', x: 260, y: bossY + 120, hp: 180, maxHp: 180, lane: 1 },
        { id: 'z-escort-2', type: 'walker', name: 'Hộ Vệ Charlie', x: 820, y: bossY + 120, hp: 180, maxHp: 180, lane: 3 },
      ];

      return {
        matchId: 'mock-match-boss',
        seed: 42,
        tick: this.tickCount,
        elapsedSeconds: 240 + (elapsedSeconds % 40),
        phase: 'BOSS',
        baseHp: 6500,
        maxBaseHp: 10000,
        soldiers: this.generateSoldiers(12),
        zombies,
        towers,
        activePlayerCount: 40,
        bossHp,
        maxBossHp: bossMaxHp,
        result: 'IN_PROGRESS',
        giftSkillActive: {
          skillId: 'airstrike',
          name: 'TÊN LỬA TỔNG LỰC',
          remainingSeconds: 4,
          senderName: 'VIP_Gamer99',
        },
        mvpPlayers,
      };
    }

    // VICTORY SCENARIO
    if (this.currentScenario === 'victory') {
      return {
        matchId: 'mock-match-win',
        seed: 42,
        tick: this.tickCount,
        elapsedSeconds: 300,
        phase: 'RESULTS',
        baseHp: 7800,
        maxBaseHp: 10000,
        soldiers: this.generateSoldiers(12),
        zombies: [],
        towers,
        activePlayerCount: 38,
        result: 'VICTORY',
        mvpPlayers,
      };
    }

    // DEFEAT SCENARIO
    if (this.currentScenario === 'defeat') {
      return {
        matchId: 'mock-match-loss',
        seed: 42,
        tick: this.tickCount,
        elapsedSeconds: 215,
        phase: 'RESULTS',
        baseHp: 0,
        maxBaseHp: 10000,
        soldiers: [],
        zombies: [
          { id: 'z-defeat-1', type: 'walker', name: 'Zombie Tràn Căn Cứ', x: 540, y: 1460, hp: 150, maxHp: 200, lane: 2 },
        ],
        towers,
        activePlayerCount: 15,
        result: 'DEFEAT',
        mvpPlayers,
      };
    }

    // STANDARD BATTLEFIELD WAVES: 10+ real walker zombies marching in 3 lanes
    const zombies: ZombieSnapshot[] = [];
    const lanes = [260, 540, 820];
    const totalZombies = this.currentScenario === 'wave1' ? 6 : 10;

    for (let i = 0; i < totalZombies; i++) {
      const lane = i % 3;
      const laneX = lanes[lane];
      // March down from y: 320 towards y: 1250 (defense line)
      const speed = 2.4;
      const initialOffset = i * 95;
      const currentY = ((initialOffset + this.tickCount * speed) % 950) + 320;

      zombies.push({
        id: `walker_lane_${lane}_${i}`,
        type: 'walker',
        name: `Zombie #${i + 1}`,
        x: laneX + Math.sin(this.tickCount * 0.08 + i) * 28,
        y: currentY,
        hp: Math.max(10, 100 - ((this.tickCount * 4 + i * 20) % 90)),
        maxHp: 100,
        lane: lane + 1,
      });
    }

    return {
      matchId: 'mock-match-ongoing',
      seed: 42,
      tick: this.tickCount,
      elapsedSeconds: (elapsedSeconds % 180) + 30,
      phase: this.currentScenario === 'wave1' ? 'WAVE_1' : 'WAVE_3',
      baseHp: Math.max(2500, 10000 - Math.floor(this.tickCount * 2.5)),
      maxBaseHp: 10000,
      soldiers: this.generateSoldiers(12),
      zombies,
      towers,
      activePlayerCount: 40,
      result: 'IN_PROGRESS',
      giftSkillActive: (this.tickCount % 120 < 35) ? {
        skillId: 'orbital_laser',
        name: 'TÊN LỬA TỔNG LỰC',
        remainingSeconds: Math.ceil((35 - (this.tickCount % 120)) / 10),
        senderName: 'FanCung07',
      } : undefined,
      mvpPlayers,
    };
  }

  private generateSoldiers(count: number): SoldierSnapshot[] {
    const soldiers: SoldierSnapshot[] = [];
    const squads = [
      { id: 'alpha', cx: 260, cy: 1380 },
      { id: 'bravo', cx: 540, cy: 1360 },
      { id: 'charlie', cx: 820, cy: 1380 },
    ];

    const offsets = [
      { dx: -35, dy: 10 },
      { dx: 35, dy: 10 },
      { dx: -18, dy: -25 },
      { dx: 18, dy: -25 },
    ];

    let idx = 0;
    for (const sq of squads) {
      for (let i = 0; i < 4; i++) {
        idx++;
        soldiers.push({
          id: `soldier_${sq.id}_${i}`,
          userId: `user_${sq.id}_${i}`,
          name: i === 0 ? `${sq.id.toUpperCase()} Đội Trưởng` : `Chiến Binh #${idx}`,
          x: sq.cx + offsets[i].dx,
          y: sq.cy + offsets[i].dy,
          hp: 100,
          maxHp: 100,
        });
      }
    }
    return soldiers;
  }
}
