import {
  MatchSnapshot,
  MatchPhase,
  MatchResult,
  ZombieSnapshot,
  SoldierSnapshot,
  TowerSnapshot,
  CombatEvent,
  GiftSkillState,
  WaveState,
} from '../game.js';
import { BASTION_GEOMETRY } from './BastionGeometryConfig.js';
import { BastionCollisionSystem, GateCollisionState } from './BastionCollisionSystem.js';
import { SeededRandom } from './SeededRandom.js';

export interface EngineZombie {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  vy: number;
  hp: number;
  maxHp: number;
  lane: number;
  radius: number;
  isDead: boolean;
  isAttacking: boolean;
  deathTick?: number;
}

export interface EngineTower {
  id: string;
  type: 'machinegun' | 'plasma' | 'tesla';
  name: string;
  x: number;
  y: number;
  level: number;
  cooldownTicks: number;
  maxCooldownTicks: number;
}

export interface EngineSoldier {
  id: string;
  userId: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldownTicks: number;
  maxCooldownTicks: number;
}

export interface EngineOptions {
  seed?: number;
  matchId?: string;
  maxZombies?: number;
  disableCombat?: boolean;
}

/**
 * AUTHORITATIVE GAME ENGINE (20Hz FIXED TICK)
 * 
 * Động cơ mô phỏng chiến trường thời gian thực trên Authoritative Server & Mock In-Memory:
 * - Deterministic 100%: Mọi kết quả chiến đấu phụ thuộc vào seed và tick.
 * - Không phụ thuộc wall-clock timer cho việc tính sát thương hay di chuyển.
 * - Tích hợp BastionCollisionSystem giải quyết va chạm vật lý ranh giới y=840 và cổng trượt.
 * - Quản lý độc lập trạng thái và HP từng đoạn tường thành.
 * - Sinh mã định danh CombatEvent duy nhất (eventId) phục vụ deduplication trên client.
 */
export class AuthoritativeGameEngine {
  public readonly seed: number;
  public readonly matchId: string;
  private rng: SeededRandom;

  public tick: number = 0;
  private sequenceId: number = 0;
  private eventSeq: number = 0;

  public phase: MatchPhase = 'WAVE_1';
  public result: MatchResult = 'IN_PROGRESS';
  public baseHp: number = 10000;
  public maxBaseHp: number = 10000;

  public collisionSystem: BastionCollisionSystem;

  private zombies: Map<string, EngineZombie> = new Map();
  private towers: Map<string, EngineTower> = new Map();
  private soldiers: Map<string, EngineSoldier> = new Map();

  // Gate transition state (progress: 0.0 = fully closed, 1.0 = fully open)
  private gateState: GateCollisionState = 'CLOSED';
  private gateProgress: number = 0.0;
  private readonly gateTransitionTicks: number = 20; // 1.0s at 20Hz

  private recentEvents: CombatEvent[] = [];
  private activeGiftSkill?: GiftSkillState & { triggerTick?: number };

  private waveNumber: number = 1;
  private waveTicksRemaining: number = 20 * 120; // 120 seconds per wave
  private maxZombies: number = 10;
  private disableCombat: boolean = false;

  constructor(opts: EngineOptions = {}) {
    this.seed = opts.seed ?? 42;
    this.matchId = opts.matchId ?? `match_${Date.now()}`;
    this.maxZombies = opts.maxZombies ?? 10;
    this.disableCombat = !!opts.disableCombat;

    this.rng = new SeededRandom(this.seed);
    this.collisionSystem = new BastionCollisionSystem();

    this.initTowers();
    this.initSoldiers();
    this.initZombies();
  }

  public spawnTestZombie(lane: 1 | 2 | 3, initialY: number, speed: number = 80): EngineZombie {
    const laneCenterX = BASTION_GEOMETRY.lanes[lane - 1].centerX;
    const id = `test_zombie_${lane}_${Date.now()}_${this.zombies.size}`;
    const z: EngineZombie = {
      id,
      type: 'walker',
      name: `Test Zombie Lane ${lane}`,
      x: laneCenterX,
      y: initialY,
      vy: speed,
      hp: 100,
      maxHp: 100,
      lane,
      radius: 20,
      isDead: false,
      isAttacking: false,
    };
    this.zombies.set(id, z);
    return z;
  }

  private initTowers(): void {
    const configs: Array<Omit<EngineTower, 'cooldownTicks' | 'maxCooldownTicks'>> = [
      { id: 'turret_alpha', type: 'machinegun', name: 'Ụ Pháo Alpha', x: 280, y: 580, level: 1 },
      { id: 'turret_bravo', type: 'plasma', name: 'Ụ Pháo Bravo', x: 540, y: 580, level: 1 },
      { id: 'turret_charlie', type: 'tesla', name: 'Ụ Pháo Charlie', x: 800, y: 580, level: 1 },
    ];
    for (const c of configs) {
      this.towers.set(c.id, {
        ...c,
        cooldownTicks: 0,
        maxCooldownTicks: c.type === 'machinegun' ? 5 : c.type === 'plasma' ? 8 : 7,
      });
    }
  }

  private initSoldiers(): void {
    const configs = [
      { id: 'soldier_alpha_0', userId: 'usr_alpha_1', name: 'Alpha Xạ Thủ', x: 280, y: 1030 },
      { id: 'soldier_bravo_0', userId: 'usr_bravo_1', name: 'Bravo Đội Trưởng', x: 540, y: 1050 },
      { id: 'soldier_charlie_0', userId: 'usr_charlie_1', name: 'Charlie Hỏa Lực', x: 800, y: 1030 },
    ];
    for (const c of configs) {
      this.soldiers.set(c.id, {
        ...c,
        hp: 100,
        maxHp: 100,
        cooldownTicks: 0,
        maxCooldownTicks: 7, // ~350ms
      });
    }
  }

  private initZombies(): void {
    for (let i = 0; i < this.maxZombies; i++) {
      this.spawnZombie(i);
    }
  }

  private spawnZombie(index: number): EngineZombie {
    const lane = index % 3;
    const laneX = BASTION_GEOMETRY.lanes[lane].centerX;
    const id = `zombie_${lane}_${index}`;
    const initialY = 180 + index * 55;
    const speed = this.rng.nextFloat(70, 95); // pixels per second

    // Bravo Lane (lane 1) has higher HP to withstand turret fire and demonstrate gate corridor traversal
    const isBravo = lane === 1;
    const hp = isBravo ? 1200 : 450;

    const z: EngineZombie = {
      id,
      type: 'walker',
      name: isBravo ? `Bravo Juggernaut #${index + 1}` : `Zombie #${index + 1}`,
      x: laneX,
      y: initialY,
      vy: speed,
      hp,
      maxHp: hp,
      lane: (lane + 1) as 1 | 2 | 3,
      radius: 20,
      isDead: false,
      isAttacking: false,
    };
    this.zombies.set(id, z);
    return z;
  }

  // =========================================================================
  // ACTIONS & COMMANDS (AUTHORITATIVE)
  // =========================================================================

  public openGate(): void {
    if (this.gateState === 'OPEN' || this.gateState === 'OPENING') return;
    this.gateState = 'OPENING';
    this.collisionSystem.setGateState('OPENING');
  }

  public closeGate(): void {
    if (this.gateState === 'CLOSED' || this.gateState === 'CLOSING') return;
    this.gateState = 'CLOSING';
    this.collisionSystem.setGateState('CLOSING');
  }

  public triggerGiftSkill(
    name: string = 'TÊN LỬA TỔNG LỰC',
    sender: string = 'VIP_Gamer99',
    targetX: number = 540,
    targetY: number = 580
  ): void {
    this.activeGiftSkill = {
      skillId: 'airstrike',
      name,
      remainingSeconds: 4,
      senderName: sender,
      targetX,
      targetY,
      triggerTick: this.tick + 15, // Detonates in ~750ms
    };

    this.recentEvents.push({
      id: `evt_${this.tick}_${this.eventSeq++}`,
      tick: this.tick,
      type: 'GIFT_SKILL',
      sourceId: sender,
      damage: 0,
      x: targetX,
      y: targetY,
    });
  }

  public damageWall(id: 'LEFT' | 'RIGHT', amount: number): void {
    const updated = this.collisionSystem.damageWall(id, amount);
    this.recentEvents.push({
      id: `evt_${this.tick}_${this.eventSeq++}`,
      tick: this.tick,
      type: 'WALL_HIT',
      sourceId: 'debug',
      damage: amount,
      x: id === 'LEFT' ? 240 : 840,
      y: 840,
    });
    if (updated.state === 'BREACHED') {
      console.log(`[ENGINE] Tường ${id} đã bị PHÁ VỠ (BREACHED)!`);
    }
  }

  // =========================================================================
  // DETERMINISTIC SIMULATION STEP (FIXED 20Hz / 50ms)
  // =========================================================================

  public step(): void {
    this.tick++;
    const dt = 0.05; // 50ms
    this.recentEvents = []; // Clear previous tick's events for snapshot clean dispatch

    if (this.baseHp <= 0) {
      this.result = 'DEFEAT';
      this.phase = 'RESULTS';
      return;
    }

    // 1. Process Gate Transition
    this.stepGateTransition();

    // 2. Process Zombie Movement & Physical Collision
    this.stepZombieMovement(dt);

    // 3. Process Combat: Turrets & Soldiers Target & Fire
    this.stepCombat();

    // 4. Process Gift Skill Detonation
    this.stepGiftSkill();

    // 5. Clean up expired corpses & replenish dead zombies if wave ongoing
    this.stepZombieLifecycle();
  }

  private stepGateTransition(): void {
    const bg = BASTION_GEOMETRY.blastGate;
    const stepDelta = 1.0 / this.gateTransitionTicks;

    if (this.gateState === 'OPENING') {
      this.gateProgress = Math.min(1.0, this.gateProgress + stepDelta);
      if (this.gateProgress >= 1.0) {
        this.gateState = 'OPEN';
        this.collisionSystem.setGateState('OPEN');
      }
    } else if (this.gateState === 'CLOSING') {
      this.gateProgress = Math.max(0.0, this.gateProgress - stepDelta);
      if (this.gateProgress <= 0.0) {
        this.gateState = 'CLOSED';
        this.collisionSystem.setGateState('CLOSED');
      }
    }

    // Interpolate door positions strictly according to progress
    const leftDoorX = bg.doorLeftClosedX + (bg.doorLeftOpenX - bg.doorLeftClosedX) * this.gateProgress;
    const rightDoorX = bg.doorRightClosedX + (bg.doorRightOpenX - bg.doorRightClosedX) * this.gateProgress;
    this.collisionSystem.updateGateDoors(leftDoorX, rightDoorX);
  }

  private stepZombieMovement(dt: number): void {
    for (const z of this.zombies.values()) {
      if (z.isDead) continue;

      const laneCenterX = BASTION_GEOMETRY.lanes[z.lane - 1].centerX;
      // Deterministic slight lateral sway
      const sway = Math.sin(this.tick * 0.08 + z.lane) * 12;
      const nextX = laneCenterX + sway;
      const nextY = z.y + z.vy * dt;

      // Authoritative physical resolution
      const res = this.collisionSystem.resolveMovement(z.x, z.y, nextX, nextY, z.radius);

      z.x = res.resolvedX;
      z.y = res.resolvedY;

      if (res.collided) {
        z.isAttacking = true;
        // Apply damage to obstacle
        if (res.segment === 'LEFT_WALL') {
          this.collisionSystem.damageWall('LEFT', 0.25);
        } else if (res.segment === 'RIGHT_WALL') {
          this.collisionSystem.damageWall('RIGHT', 0.25);
        } else if (res.segment === 'GATE') {
          this.baseHp = Math.max(0, this.baseHp - 0.5);
        }
      } else {
        z.isAttacking = false;
        // If advanced deep into courtyard past defense line, attack command bunker
        if (z.y >= 1080) {
          this.baseHp = Math.max(0, this.baseHp - 1.5);
          z.isAttacking = true;
        }
      }
    }
  }

  private stepCombat(): void {
    if (this.disableCombat) return;
    const liveZombies = Array.from(this.zombies.values()).filter((z) => !z.isDead);
    if (liveZombies.length === 0) return;

    // A. Turrets target & fire
    for (const turret of this.towers.values()) {
      if (turret.cooldownTicks > 0) {
        turret.cooldownTicks--;
        continue;
      }

      const target = this.getClosestZombie(turret.x, turret.y, liveZombies);
      if (target) {
        const isCritical = this.rng.next() < 0.18;
        const baseDmg = turret.type === 'plasma' ? 55 : turret.type === 'tesla' ? 45 : 38;
        const damage = isCritical ? Math.round(baseDmg * 1.5) : baseDmg;

        target.hp = Math.max(0, target.hp - damage);
        turret.cooldownTicks = turret.maxCooldownTicks;

        // Emit Authoritative Shoot & Hit Event
        this.recentEvents.push({
          id: `evt_${this.tick}_${this.eventSeq++}`,
          tick: this.tick,
          type: 'SHOOT',
          sourceId: turret.id,
          targetId: target.id,
          damage,
          isCritical,
          x: target.x,
          y: target.y,
        });

        if (target.hp <= 0 && !target.isDead) {
          target.isDead = true;
          target.deathTick = this.tick;
          this.recentEvents.push({
            id: `evt_${this.tick}_${this.eventSeq++}`,
            tick: this.tick,
            type: 'DEATH',
            sourceId: turret.id,
            targetId: target.id,
            damage: 0,
            x: target.x,
            y: target.y,
          });
        }
      }
    }

    // B. Soldiers target & fire
    for (const soldier of this.soldiers.values()) {
      if (soldier.cooldownTicks > 0) {
        soldier.cooldownTicks--;
        continue;
      }

      const target = this.getClosestZombie(soldier.x, soldier.y, liveZombies);
      if (target) {
        const isCritical = this.rng.next() < 0.12;
        const damage = isCritical ? 45 : 28;

        target.hp = Math.max(0, target.hp - damage);
        soldier.cooldownTicks = soldier.maxCooldownTicks;

        this.recentEvents.push({
          id: `evt_${this.tick}_${this.eventSeq++}`,
          tick: this.tick,
          type: 'SHOOT',
          sourceId: soldier.id,
          targetId: target.id,
          damage,
          isCritical,
          x: target.x,
          y: target.y,
        });

        if (target.hp <= 0 && !target.isDead) {
          target.isDead = true;
          target.deathTick = this.tick;
          this.recentEvents.push({
            id: `evt_${this.tick}_${this.eventSeq++}`,
            tick: this.tick,
            type: 'DEATH',
            sourceId: soldier.id,
            targetId: target.id,
            damage: 0,
            x: target.x,
            y: target.y,
          });
        }
      }
    }
  }

  private stepGiftSkill(): void {
    if (!this.activeGiftSkill) return;

    if (this.activeGiftSkill.triggerTick && this.tick >= this.activeGiftSkill.triggerTick) {
      const tx = this.activeGiftSkill.targetX ?? 540;
      const ty = this.activeGiftSkill.targetY ?? 580;
      const aoeRadius = 260;

      for (const z of this.zombies.values()) {
        if (z.isDead) continue;
        const dist = Math.hypot(z.x - tx, z.y - ty);
        if (dist <= aoeRadius) {
          const dmg = this.rng.nextInt(1200, 1600);
          z.hp = Math.max(0, z.hp - dmg);

          this.recentEvents.push({
            id: `evt_${this.tick}_${this.eventSeq++}`,
            tick: this.tick,
            type: 'HIT',
            sourceId: 'gift_missile',
            targetId: z.id,
            damage: dmg,
            isCritical: true,
            x: z.x,
            y: z.y,
          });

          if (z.hp <= 0 && !z.isDead) {
            z.isDead = true;
            z.deathTick = this.tick;
            this.recentEvents.push({
              id: `evt_${this.tick}_${this.eventSeq++}`,
              tick: this.tick,
              type: 'DEATH',
              sourceId: 'gift_missile',
              targetId: z.id,
              damage: 0,
              x: z.x,
              y: z.y,
            });
          }
        }
      }

      this.activeGiftSkill.triggerTick = undefined;
    }

    // Tick down remaining duration
    if (this.tick % 20 === 0) {
      this.activeGiftSkill.remainingSeconds = Math.max(0, this.activeGiftSkill.remainingSeconds - 1);
      if (this.activeGiftSkill.remainingSeconds <= 0) {
        this.activeGiftSkill = undefined;
      }
    }
  }

  private stepZombieLifecycle(): void {
    // Remove dead zombies after 80 ticks (4 seconds) and respawn at top to keep battlefield active
    for (const [id, z] of this.zombies.entries()) {
      if (z.isDead && z.deathTick !== undefined && this.tick - z.deathTick >= 80) {
        this.zombies.delete(id);
        const parts = id.split('_');
        const index = parseInt(parts[parts.length - 1], 10) || 0;
        this.spawnZombie(index);
      }
    }
  }

  private getClosestZombie(fromX: number, fromY: number, zombies: EngineZombie[]): EngineZombie | null {
    let closest: EngineZombie | null = null;
    let minDist = Infinity;
    for (const z of zombies) {
      if (z.isDead) continue;
      const d = Math.hypot(z.x - fromX, z.y - fromY);
      if (d < minDist) {
        minDist = d;
        closest = z;
      }
    }
    return closest;
  }

  // =========================================================================
  // SNAPSHOT & REPLAY STATE HASH
  // =========================================================================

  public generateSnapshot(): MatchSnapshot {
    this.sequenceId++;
    const walls = this.collisionSystem.getWallStates();
    const doors = this.collisionSystem.getGateDoorPositions();

    const soldiers: SoldierSnapshot[] = Array.from(this.soldiers.values()).map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.name,
      x: s.x,
      y: s.y,
      hp: s.hp,
      maxHp: s.maxHp,
    }));

    const zombies: ZombieSnapshot[] = Array.from(this.zombies.values()).map((z) => ({
      id: z.id,
      type: z.type,
      name: z.name,
      x: Math.round(z.x * 10) / 10,
      y: Math.round(z.y * 10) / 10,
      hp: Math.round(z.hp),
      maxHp: z.maxHp,
      lane: z.lane,
      isDead: z.isDead,
      isAttacking: z.isAttacking,
    }));

    const towers: TowerSnapshot[] = Array.from(this.towers.values()).map((t) => ({
      id: t.id,
      type: t.type,
      name: t.name,
      x: t.x,
      y: t.y,
      level: t.level,
    }));

    const waveState: WaveState = {
      waveNumber: this.waveNumber,
      remainingSeconds: Math.ceil(this.waveTicksRemaining / 20),
      totalZombiesInWave: this.maxZombies,
      killedZombiesInWave: Array.from(this.zombies.values()).filter((z) => z.isDead).length,
    };

    return {
      matchId: this.matchId,
      seed: this.seed,
      tick: this.tick,
      sequenceId: this.sequenceId,
      serverTime: Date.now(),
      phase: this.phase,
      baseHp: Math.round(this.baseHp),
      maxBaseHp: this.maxBaseHp,
      walls: {
        left: { id: 'LEFT', state: walls.left.state, hp: Math.round(walls.left.hp), maxHp: walls.left.maxHp },
        right: { id: 'RIGHT', state: walls.right.state, hp: Math.round(walls.right.hp), maxHp: walls.right.maxHp },
      },
      gate: {
        state: this.gateState,
        doorLeftX: Math.round(doors.leftX * 10) / 10,
        doorRightX: Math.round(doors.rightX * 10) / 10,
      },
      soldiers,
      zombies,
      towers,
      recentEvents: [...this.recentEvents],
      activeGiftSkill: this.activeGiftSkill ? { ...this.activeGiftSkill } : undefined,
      waveState,
      waveRemainingSeconds: Math.ceil(this.waveTicksRemaining / 20),
      activePlayerCount: 40,
      result: this.result,
      elapsedSeconds: Math.floor(this.tick / 20),
      mvpPlayers: [
        { name: 'XạThủAlpha', points: 1540, avatarColor: 0x00f5d4 },
        { name: 'HộVệBravo', points: 1320, avatarColor: 0xfee440 },
        { name: 'BắnTỉaCharlie', points: 1080, avatarColor: 0xf72585 },
      ],
    };
  }

  /**
   * Tính toán chuỗi hash trạng thái tất định (Deterministic State Hash)
   * để kiểm chứng tính toàn vẹn replay (same seed + events = same hash).
   */
  public getStateHash(): string {
    const liveZombies = Array.from(this.zombies.values())
      .map((z) => `${z.id}:${Math.round(z.x)}:${Math.round(z.y)}:${Math.round(z.hp)}:${z.isDead ? 1 : 0}`)
      .join('|');
    const wallStr = `L${Math.round(this.collisionSystem.getWallState('LEFT').hp)}R${Math.round(this.collisionSystem.getWallState('RIGHT').hp)}`;
    const gateStr = `G:${this.gateState}:${Math.round(this.gateProgress * 100)}`;
    return `T${this.tick}_HP${Math.round(this.baseHp)}_${wallStr}_${gateStr}_Z[${liveZombies}]`;
  }

  public getZombie(id: string): EngineZombie | undefined {
    return this.zombies.get(id);
  }

  public getAllZombies(): EngineZombie[] {
    return Array.from(this.zombies.values());
  }

  public getGateCollisionState(): GateCollisionState {
    return this.gateState;
  }
}
