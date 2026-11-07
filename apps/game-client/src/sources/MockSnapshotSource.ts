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
    // Immediately send initial snapshot if connected
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
    const timeRatio = (this.tickCount % 600) / 600;
    const elapsedSeconds = Math.floor(this.tickCount / 10);

    const towers: TowerSnapshot[] = [
      { id: 'tower-1', type: 'machinegun', name: 'Súng Máy Trái', x: 260, y: 1530, level: 2 },
      { id: 'tower-2', type: 'plasma', name: 'Pháo Năng Lượng', x: 540, y: 1480, level: 3 },
      { id: 'tower-3', type: 'tesla', name: 'Tháp Điện Phải', x: 820, y: 1530, level: 2 },
    ];

    const mvpPlayers = [
      { name: 'ChiếnBinh01', points: 1420, avatarColor: 0x00f5d4 },
      { name: 'XạThủPro', points: 1180, avatarColor: 0x00bbf9 },
      { name: 'HộVệThành', points: 950, avatarColor: 0xff5400 },
      { name: 'BácSĩZombie', points: 720, avatarColor: 0xfee440 },
    ];

    if (this.currentScenario === 'boss') {
      const bossMaxHp = 12000;
      const bossHp = Math.max(1000, bossMaxHp - (this.tickCount * 25) % bossMaxHp);
      const bossY = 480 + Math.sin(this.tickCount * 0.05) * 40;

      const zombies: ZombieSnapshot[] = [
        {
          id: 'boss-king',
          type: 'zombie_king',
          name: 'ZOMBIE VUA (BOSS)',
          x: 540,
          y: bossY,
          hp: bossHp,
          maxHp: bossMaxHp,
          lane: 2,
          isBoss: true,
        },
        // Escort minions
        { id: 'z-escort-1', type: 'shadow', name: 'Zombie Bóng Tối', x: 300, y: bossY + 80, hp: 120, maxHp: 120, lane: 1 },
        { id: 'z-escort-2', type: 'shocker', name: 'Zombie Điện', x: 780, y: bossY + 80, hp: 160, maxHp: 160, lane: 3 },
      ];

      return {
        matchId: 'mock-match-boss',
        seed: 42,
        tick: this.tickCount,
        elapsedSeconds: 240 + (elapsedSeconds % 40),
        phase: 'BOSS',
        baseHp: 6800,
        maxBaseHp: 10000,
        soldiers: this.generateSoldiers(40),
        zombies,
        towers,
        activePlayerCount: 40,
        bossHp,
        maxBossHp: bossMaxHp,
        result: 'IN_PROGRESS',
        giftSkillActive: {
          skillId: 'airstrike',
          name: 'KHÔNG KÍCH TÊN LỬA',
          remainingSeconds: 4,
          senderName: 'VIP_Gamer99',
        },
        mvpPlayers,
      };
    }

    if (this.currentScenario === 'victory') {
      return {
        matchId: 'mock-match-win',
        seed: 42,
        tick: this.tickCount,
        elapsedSeconds: 285,
        phase: 'RESULTS',
        baseHp: 7500,
        maxBaseHp: 10000,
        soldiers: this.generateSoldiers(25),
        zombies: [],
        towers,
        activePlayerCount: 38,
        bossHp: 0,
        maxBossHp: 12000,
        result: 'VICTORY',
        mvpPlayers,
      };
    }

    if (this.currentScenario === 'defeat') {
      return {
        matchId: 'mock-match-loss',
        seed: 42,
        tick: this.tickCount,
        elapsedSeconds: 220,
        phase: 'RESULTS',
        baseHp: 0,
        maxBaseHp: 10000,
        soldiers: [],
        zombies: [
          { id: 'z-brute-end', type: 'brute', name: 'Zombie Khổng Lồ', x: 540, y: 1580, hp: 650, maxHp: 700, lane: 2 },
        ],
        towers,
        activePlayerCount: 15,
        result: 'DEFEAT',
        mvpPlayers,
      };
    }

    // Default scenarios: wave1, wave3, wave4 showcasing distinct zombies
    const zombies: ZombieSnapshot[] = [];
    const zombieTypes = this.currentScenario === 'wave1'
      ? ['walker']
      : this.currentScenario === 'wave3'
      ? ['walker', 'runner', 'armored', 'spitter', 'healer']
      : ['armored', 'brute', 'shocker', 'summoner', 'shadow'];

    const lanes = [260, 540, 820];
    zombieTypes.forEach((type, idx) => {
      const lane = (idx % 3);
      const laneX = lanes[lane];
      // march down slowly from y=300 to y=1400
      const startY = 320 + idx * 180;
      const currentY = ((startY + this.tickCount * 3.5) % 1150) + 320;
      zombies.push({
        id: `z-${type}-${idx}`,
        type,
        name: this.getZombieVietnameseName(type),
        x: laneX + (Math.sin(this.tickCount * 0.1 + idx) * 35),
        y: currentY,
        hp: Math.max(20, 150 - idx * 20),
        maxHp: 200,
        lane: lane + 1,
      });
    });

    const soldierCount = this.currentScenario === 'wave1' ? 12 : this.currentScenario === 'wave3' ? 24 : 36;

    return {
      matchId: 'mock-match-ongoing',
      seed: 42,
      tick: this.tickCount,
      elapsedSeconds: (elapsedSeconds % 200) + 20,
      phase: this.currentScenario === 'wave1' ? 'WAVE_1' : this.currentScenario === 'wave3' ? 'WAVE_3' : 'WAVE_4',
      baseHp: Math.max(3000, 10000 - this.tickCount * 5),
      maxBaseHp: 10000,
      soldiers: this.generateSoldiers(soldierCount),
      zombies,
      towers,
      activePlayerCount: soldierCount + 5,
      result: 'IN_PROGRESS',
      giftSkillActive: this.tickCount % 80 < 30 ? {
        skillId: 'reinforcements',
        name: 'VIỆN BINH ĐẶC NHIỆM',
        remainingSeconds: Math.ceil((30 - (this.tickCount % 80)) / 10),
        senderName: 'FanCung07',
      } : undefined,
      mvpPlayers,
    };
  }

  private generateSoldiers(count: number): SoldierSnapshot[] {
    const soldiers: SoldierSnapshot[] = [];
    const cols = 8;
    const startX = 220;
    const stepX = 90;
    const startY = 1660;
    const stepY = 45;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      soldiers.push({
        id: `soldier-${i + 1}`,
        userId: `user-mock-${i + 1}`,
        name: `Lính #${i + 1}`,
        x: startX + col * stepX + (row % 2 ? 25 : 0),
        y: startY + row * stepY,
        hp: 100,
        maxHp: 100,
        targetZombieId: `z-target-${(i % 5)}`,
      });
    }
    return soldiers;
  }

  private getZombieVietnameseName(type: string): string {
    const names: Record<string, string> = {
      walker: 'Zombie Thường',
      runner: 'Zombie Chạy',
      armored: 'Zombie Giáp',
      spitter: 'Zombie Độc',
      healer: 'Zombie Hồi Máu',
      brute: 'Zombie Khổng Lồ',
      shocker: 'Zombie Điện',
      summoner: 'Zombie Triệu Hồi',
      shadow: 'Zombie Bóng Tối',
      zombie_king: 'Zombie Vua',
    };
    return names[type] || 'Zombie';
  }
}
