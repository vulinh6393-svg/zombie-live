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
  PlayerContribution,
} from '../game.js';
import { AuthoritativeGiftEvent } from '../events.js';
import { BASTION_GEOMETRY } from './BastionGeometryConfig.js';
import { BastionCollisionSystem, GateCollisionState } from './BastionCollisionSystem.js';
import { SeededRandom } from './SeededRandom.js';
import { DEFAULT_GAME_BALANCE, ZombieSpec } from './GameBalanceConfig.js';
import { resolveGiftSkill, SKILL_REGISTRY, SkillConfig } from './SkillRegistry.js';

export interface SkillCommand {
  commandId: string;
  matchId: string;
  targetMatchId?: string;
  seq?: number;
  targetTick: number;
  sourceUserId: string;
  sourceUserName: string;
  skillId: string;
  quantity: number;
  streakId?: string;
  targetX?: number;
  targetY?: number;
}

export interface ActiveAirstrike {
  id: string;
  commandId: string;
  senderName: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  warningEndTick: number;
  hasDetonated: boolean;
}

export interface ActiveShieldBuff {
  commandId: string;
  expirationTick: number;
  damageReduction: number;
}

export interface ActiveOverclockBuff {
  commandId: string;
  expirationTick: number;
  fireRateMultiplier: number;
  originalTowerCooldowns: Map<string, number>;
}

export interface ActiveMechUnit {
  id: string;
  commandId: string;
  senderName: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  expirationTick: number;
  cooldownTicks: number;
  maxCooldownTicks: number;
}

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
  isBoss?: boolean;
  armor?: number;
  stages?: number;
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
  targetZombieId?: string;
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
  targetZombieId?: string;
  squad: 'alpha' | 'bravo' | 'charlie';
}

export interface EngineOptions {
  seed?: number;
  matchId?: string;
  maxZombies?: number;
  disableCombat?: boolean;
}

/**
 * AUTHORITATIVE GAME ENGINE (20Hz FIXED TICK) — FULL PRODUCTION ARCHITECTURE
 * 
 * - Vòng lặp fixed-tick 20Hz (50ms/tick) độc lập hoàn toàn với client/rendering.
 * - Mô hình 5 Wave + Boss Zombie King 3 giai đoạn theo chuẩn docs/GAME_BALANCE.json.
 * - Hàng đợi sự kiện mô phỏng tách biệt (Event Buffer & Broadcast Cursor):
 *   + Không bao giờ mất sự kiện ở tick lẻ khi broadcast ở 10Hz.
 *   + Không xóa sự kiện khi client yêu cầu snapshot đột xuất (reconnect/query).
 * - Quản lý người chơi thực tế, comment commands, gift idempotency và MVP leaderboard thời gian thực.
 * - Tự động tái khởi động vòng đấu (24/7 continuous livestream loop).
 */
export class AuthoritativeGameEngine {
  public seed: number;
  public matchId: string;
  private rng: SeededRandom;

  public tick: number = 0;
  private sequenceId: number = 0;
  private eventSeq: number = 0;
  private lastPublishedEventSeq: number = 0;

  // Event buffer lưu trữ tối đa 500 sự kiện gần nhất cho cursor delivery
  private eventBuffer: CombatEvent[] = [];

  public phase: MatchPhase = 'PREPARING';
  public result: MatchResult = 'IN_PROGRESS';
  public baseHp: number = DEFAULT_GAME_BALANCE.round.baseHp;
  public maxBaseHp: number = DEFAULT_GAME_BALANCE.round.baseHp;

  public collisionSystem: BastionCollisionSystem;

  private zombies: Map<string, EngineZombie> = new Map();
  private towers: Map<string, EngineTower> = new Map();
  private soldiers: Map<string, EngineSoldier> = new Map();

  // Người chơi tham gia thực tế (Deduplicated by userId)
  private players: Map<string, PlayerContribution> = new Map();
  private processedGiftIds: Set<string> = new Set();
  private executedCommandIds: Set<string> = new Set();
  private activeStreaks: Map<string, { lastQuantity: number; status: string }> = new Map();
  private userCooldowns: Map<string, Map<string, number>> = new Map(); // userId -> (command -> expireTick)

  // Gate transition state (progress: 0.0 = fully closed, 1.0 = fully open)
  private gateState: GateCollisionState = 'CLOSED';
  private gateProgress: number = 0.0;
  private readonly gateTransitionTicks: number = 20; // 1.0s at 20Hz

  private activeGiftSkill?: GiftSkillState & { triggerTick?: number; shieldEndTime?: number };

  // Phase 06 Deterministic Command Queue & Authoritative Skill State
  private commandQueue: SkillCommand[] = [];
  private deferredSkillCommands: SkillCommand[] = [];
  private activeAirstrikes: ActiveAirstrike[] = [];
  private activeShieldBuff?: ActiveShieldBuff;
  private activeOverclockBuff?: ActiveOverclockBuff;
  private activeMechUnit?: ActiveMechUnit;
  private skillActivationCounts: Map<string, number> = new Map();
  private skillCooldowns: Map<string, number> = new Map();
  private reinforcementSoldierLifespans: Map<string, number> = new Map();
  public onCommandApplied?: (cmd: SkillCommand, appliedTick: number, result: { success: boolean; status: 'APPLIED' | 'REJECTED' | 'DEFERRED' | 'FAILED'; reason?: string }) => void;
  public onCheckpointNeeded?: (tick: number, state: any, lastAppliedJournalSeq: number) => Promise<void> | void;
  public onCommandTransitionNeeded?: (transition: { commandId: string; fromMatchId: string; toMatchId: string; reason: string }) => Promise<void> | void;

  // Contiguous applied journal sequence watermark tracker
  public lastAppliedJournalSeq: number = 0;
  private processedSeqs: Set<number> = new Set();

  public getCommandQueueLength(): number {
    return this.commandQueue.length;
  }

  public recordProcessedSeq(seq?: number): void {
    if (seq === undefined || seq === null) return;
    this.processedSeqs.add(seq);
    while (this.processedSeqs.has(this.lastAppliedJournalSeq + 1)) {
      this.lastAppliedJournalSeq++;
      this.processedSeqs.delete(this.lastAppliedJournalSeq);
    }
  }

  public getLastAppliedJournalSeq(): number {
    return this.lastAppliedJournalSeq;
  }

  private waveNumber: number = 1;
  private waveTicksRemaining: number = 20 * 20; // 20s for PREPARING
  private maxZombies: number = 10;
  private disableCombat: boolean = false;

  // Boss state
  private bossSpawned: boolean = false;
  private bossStage: number = 1;

  constructor(opts: EngineOptions = {}) {
    this.seed = opts.seed ?? 42;
    this.matchId = opts.matchId ?? `match_${Date.now()}`;
    this.maxZombies = opts.maxZombies ?? 10;
    this.disableCombat = !!opts.disableCombat;

    this.rng = new SeededRandom(this.seed);
    this.collisionSystem = new BastionCollisionSystem();

    this.initTowers();
    this.initSoldiers();
    this.initZombiesForWave(1);
  }

  // =========================================================================
  // INITIALIZATION & ROUND RESET
  // =========================================================================

  private initTowers(): void {
    this.towers.clear();
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
    this.soldiers.clear();
    const configs: Array<Omit<EngineSoldier, 'hp' | 'maxHp' | 'cooldownTicks' | 'maxCooldownTicks'>> = [
      { id: 'soldier_alpha_0', userId: 'usr_alpha_1', name: 'Alpha Xạ Thủ', x: 280, y: 1030, squad: 'alpha' },
      { id: 'soldier_bravo_0', userId: 'usr_bravo_1', name: 'Bravo Đội Trưởng', x: 540, y: 1050, squad: 'bravo' },
      { id: 'soldier_charlie_0', userId: 'usr_charlie_1', name: 'Charlie Hỏa Lực', x: 800, y: 1030, squad: 'charlie' },
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

  private initZombiesForWave(wave: number): void {
    this.zombies.clear();
    const availableSpecs = DEFAULT_GAME_BALANCE.zombies.filter((z) => !z.isBoss && z.firstWave <= wave);
    
    for (let i = 0; i < this.maxZombies; i++) {
      const spec = availableSpecs[i % availableSpecs.length] || DEFAULT_GAME_BALANCE.zombies[0];
      this.spawnZombieFromSpec(spec, i);
    }
  }

  private spawnZombieFromSpec(spec: ZombieSpec, index: number): EngineZombie {
    const lane = index % 3;
    const laneX = BASTION_GEOMETRY.lanes[lane].centerX;
    const id = `zombie_${lane}_${this.tick}_${index}`;
    const initialY = 180 + index * 55;
    
    // Tốc độ chuẩn hóa (speed * 80px/s)
    const baseSpeed = spec.speed * 80;
    const speedVariation = this.rng.nextFloat(baseSpeed * 0.9, baseSpeed * 1.1);

    const isBravo = lane === 1;
    // Bravo lane có lượng máu cao hơn để chứng minh thông đạo cổng mở
    const hp = isBravo && !spec.isBoss ? Math.max(spec.hp, 800) : spec.hp;

    const z: EngineZombie = {
      id,
      type: spec.id,
      name: `${spec.name} #${index + 1}`,
      x: laneX,
      y: initialY,
      vy: speedVariation,
      hp,
      maxHp: hp,
      lane: (lane + 1) as 1 | 2 | 3,
      radius: 20,
      isDead: false,
      isAttacking: false,
      armor: spec.armor,
    };
    this.zombies.set(id, z);
    return z;
  }

  private spawnBoss(): EngineZombie {
    const bossSpec = DEFAULT_GAME_BALANCE.zombies.find((z) => z.isBoss) || DEFAULT_GAME_BALANCE.zombies[9];
    const id = `boss_zombie_king_${this.tick}`;
    const laneX = BASTION_GEOMETRY.lanes[1].centerX; // Trung tâm Lane Bravo
    const boss: EngineZombie = {
      id,
      type: 'zombie_king',
      name: 'Zombie Vua (Boss)',
      x: laneX,
      y: 150,
      vy: bossSpec.speed * 80, // 20px/s
      hp: bossSpec.hp,
      maxHp: bossSpec.hp,
      lane: 2,
      radius: 38,
      isDead: false,
      isAttacking: false,
      isBoss: true,
      armor: 0.5, // 50% damage reduction in stage 1
      stages: 3,
    };
    this.zombies.set(id, boss);
    this.bossSpawned = true;
    this.bossStage = 1;
    return boss;
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

  // =========================================================================
  // AUTHORITATIVE ACTIONS & COMMAND HANDLING (VIEWER INTERACTIONS)
  // =========================================================================

  public handleJoin(userId: string, userName: string, squad: 'alpha' | 'bravo' | 'charlie'): { success: boolean; reason?: string } {
    if (!userId || !userName) return { success: false, reason: 'INVALID_USER' };

    // Chống duplicate: Nếu người chơi đã gia nhập, giữ nguyên vị trí, không tăng quân số lặp
    let player = this.players.get(userId);
    if (player) {
      player.userName = userName;
      player.hasJoined = true;
      return { success: true, reason: 'ALREADY_JOINED' };
    }

    player = {
      userId,
      userName,
      squad,
      score: 10, // Điểm thưởng gia nhập
      competitiveScore: 10,
      giftScore: 0,
      hasJoined: true,
      kills: 0,
      assists: 0,
      repairs: 0,
      rescues: 0,
      bossDamage: 0,
      lastActionTick: this.tick,
    };
    this.players.set(userId, player);

    this.recordEvent({
      type: 'COMMAND_FEEDBACK',
      sourceId: userId,
      damage: 0,
      x: squad === 'alpha' ? 280 : squad === 'bravo' ? 540 : 800,
      y: 1050,
    });

    return { success: true };
  }

  public handleShoot(userId: string): { success: boolean; reason?: string } {
    const player = this.players.get(userId);
    if (!player || !player.hasJoined) return { success: false, reason: 'NOT_JOINED' };

    const cd = this.checkCooldown(userId, 'BAN', 200); // 10s cooldown
    if (!cd.ready) return { success: false, reason: `COOLDOWN_${cd.remainingSeconds}s` };

    // Tăng hỏa lực cho đội hình của người chơi
    player.assists++;
    player.competitiveScore += DEFAULT_GAME_BALANCE.leaderboard.assist;
    player.score = player.competitiveScore;

    // Kích hoạt ngay một phát bắn phụ từ tiểu đội tương ứng
    const squadSoldiers = Array.from(this.soldiers.values()).filter((s) => s.squad === player.squad);
    const shooter = squadSoldiers[0];
    if (shooter) {
      shooter.cooldownTicks = 0; // Reset cooldown để bắn ngay
    }

    return { success: true };
  }

  public handleRepair(userId: string): { success: boolean; reason?: string } {
    const player = this.players.get(userId);
    if (!player || !player.hasJoined) return { success: false, reason: 'NOT_JOINED' };

    const cd = this.checkCooldown(userId, 'SUA', 300); // 15s cooldown
    if (!cd.ready) return { success: false, reason: `COOLDOWN_${cd.remainingSeconds}s` };

    // Sửa chữa tường thành đang bị hư hại nhất
    const walls = this.collisionSystem.getWallStates();
    if (walls.left.hp < walls.left.maxHp) {
      this.collisionSystem.setWallState('LEFT', walls.left.hp + 50 >= walls.left.maxHp ? 'INTACT' : 'DAMAGED', walls.left.hp + 50);
    } else if (walls.right.hp < walls.right.maxHp) {
      this.collisionSystem.setWallState('RIGHT', walls.right.hp + 50 >= walls.right.maxHp ? 'INTACT' : 'DAMAGED', walls.right.hp + 50);
    } else {
      this.baseHp = Math.min(this.maxBaseHp, this.baseHp + 50);
    }

    player.repairs++;
    player.competitiveScore += DEFAULT_GAME_BALANCE.leaderboard.repair;
    player.score = player.competitiveScore;

    this.recordEvent({
      type: 'COMMAND_FEEDBACK',
      sourceId: userId,
      damage: 0,
      x: 540,
      y: 900,
    });

    return { success: true };
  }

  public handleRescue(userId: string): { success: boolean; reason?: string } {
    const player = this.players.get(userId);
    if (!player || !player.hasJoined) return { success: false, reason: 'NOT_JOINED' };

    const cd = this.checkCooldown(userId, 'CUU', 400); // 20s cooldown
    if (!cd.ready) return { success: false, reason: `COOLDOWN_${cd.remainingSeconds}s` };

    // Hồi máu cho lính của squad
    const squadSoldiers = Array.from(this.soldiers.values()).filter((s) => s.squad === player.squad);
    for (const s of squadSoldiers) {
      s.hp = Math.min(s.maxHp, s.hp + 30);
    }

    player.rescues++;
    player.competitiveScore += DEFAULT_GAME_BALANCE.leaderboard.rescue;
    player.score = player.competitiveScore;

    return { success: true };
  }

  public handleBossFocus(userId: string): { success: boolean; reason?: string } {
    const player = this.players.get(userId);
    if (!player || !player.hasJoined) return { success: false, reason: 'NOT_JOINED' };

    const cd = this.checkCooldown(userId, 'BOSS', 300); // 15s cooldown
    if (!cd.ready) return { success: false, reason: `COOLDOWN_${cd.remainingSeconds}s` };

    // Dồn toàn bộ ụ súng nhắm vào Boss nếu Boss đã xuất hiện
    const boss = Array.from(this.zombies.values()).find((z) => z.isBoss && !z.isDead);
    if (boss) {
      for (const t of this.towers.values()) {
        t.targetZombieId = boss.id;
      }
    }

    return { success: true };
  }

  public isShieldActive(): boolean {
    return !!this.activeShieldBuff && this.tick < this.activeShieldBuff.expirationTick;
  }

  public isOverclockActive(): boolean {
    return !!this.activeOverclockBuff && this.tick < this.activeOverclockBuff.expirationTick;
  }

  public getActiveMech(): ActiveMechUnit | undefined {
    return this.activeMechUnit;
  }

  /**
   * Đưa lệnh kích hoạt kỹ năng vào hàng đợi xử lý theo tick đơn điệu (Monotonic Tick Queue).
   */
  public queueSkillCommand(cmd: SkillCommand): { queued: boolean; reason?: string } {
    if (cmd.matchId && cmd.matchId !== this.matchId) {
      if (this.phase === 'RESULTS') {
        this.deferredSkillCommands.push(cmd);
        return { queued: true, reason: 'DEFERRED_FOR_NEXT_MATCH' };
      }
      return { queued: false, reason: 'MISMATCHED_MATCH_ID' };
    }

    if (this.executedCommandIds.has(cmd.commandId) || this.commandQueue.some((c) => c.commandId === cmd.commandId)) {
      return { queued: false, reason: 'COMMAND_ALREADY_EXECUTED' };
    }

    if (this.commandQueue.length >= 500) {
      return { queued: false, reason: 'COMMAND_QUEUE_OVERFLOW' };
    }

    this.commandQueue.push(cmd);
    this.commandQueue.sort((a, b) => {
      if (a.targetTick !== b.targetTick) return a.targetTick - b.targetTick;
      if (a.seq !== undefined && b.seq !== undefined && a.seq !== b.seq) return a.seq - b.seq;
      return a.commandId.localeCompare(b.commandId);
    });

    return { queued: true };
  }

  /**
   * Xử lý tối đa 10 lệnh kỹ năng theo tick hiện tại (Cap per tick để chống nghẽn CPU/OBS)
   */
  private processQueuedCommandsForTick(): void {
    const maxCommandsPerTick = 10;
    let processed = 0;

    while (this.commandQueue.length > 0 && processed < maxCommandsPerTick) {
      const nextCmd = this.commandQueue[0];
      if (nextCmd.targetTick > this.tick) break;

      this.commandQueue.shift();
      this.applySkillCommand(nextCmd);
      processed++;
    }
  }

  /**
   * Áp dụng lệnh kỹ năng vào thế giới Authoritative với validation, per-match cap, cooldown, stacking.
   */
  public applySkillCommand(cmd: SkillCommand): { success: boolean; reason?: string; skillName: string } {
    const notifyReject = (reason: string, skillName: string = 'UNKNOWN') => {
      this.recordProcessedSeq(cmd.seq);
      if (this.onCommandApplied) {
        this.onCommandApplied(cmd, this.tick, { success: false, status: 'REJECTED', reason });
      }
      return { success: false, reason, skillName };
    };

    if (this.executedCommandIds.has(cmd.commandId)) {
      return notifyReject('COMMAND_ALREADY_EXECUTED', 'ALREADY_EXECUTED');
    }

    const config = SKILL_REGISTRY[cmd.skillId];
    if (!config) {
      return notifyReject('UNSUPPORTED_GIFT_TYPE', 'UNKNOWN');
    }

    // 1. Kiểm tra per-match cap
    const currentCount = this.skillActivationCounts.get(cmd.skillId) || 0;
    if (currentCount >= config.perMatchCap) {
      return notifyReject('PER_MATCH_CAP_REACHED', config.name);
    }

    // 2. Kiểm tra Stacking & Concurrency policy
    if (cmd.skillId === 'shield') {
      if (this.isShieldActive() && config.stackPolicy === 'reject') {
        return notifyReject('STACK_POLICY_REJECT', config.name);
      }
    } else if (cmd.skillId === 'overclock') {
      if (this.isOverclockActive() && config.stackPolicy === 'reject') {
        return notifyReject('STACK_POLICY_REJECT', config.name);
      }
    } else if (cmd.skillId === 'mech') {
      if (this.activeMechUnit && this.activeMechUnit.hp > 0) {
        return notifyReject('MAX_MECH_CONCURRENT_REACHED', config.name);
      }
    } else if (cmd.skillId === 'reinforcements') {
      let activeReinfCount = 0;
      for (const id of this.soldiers.keys()) {
        if (id.startsWith('reinf_')) activeReinfCount++;
      }
      if (activeReinfCount >= (config.maxSoldiers || 4)) {
        return notifyReject('MAX_REINFORCEMENTS_REACHED', config.name);
      }
    }

    // 3. Kiểm tra cooldown
    const expireTick = this.skillCooldowns.get(cmd.skillId) || 0;
    if (this.tick < expireTick) {
      return notifyReject('SKILL_ON_COOLDOWN', config.name);
    }

    // Đăng ký/lấy profile đóng góp của người gửi
    let player = this.players.get(cmd.sourceUserId);
    if (!player) {
      player = {
        userId: cmd.sourceUserId,
        userName: cmd.sourceUserName,
        squad: 'bravo',
        score: 0,
        competitiveScore: 0,
        giftScore: 0,
        hasJoined: false,
        kills: 0,
        assists: 0,
        repairs: 0,
        rescues: 0,
        bossDamage: 0,
        lastActionTick: this.tick,
      };
      this.players.set(cmd.sourceUserId, player);
    }

    const qty = Math.max(1, cmd.quantity || 1);
    const durationTicks = config.durationSeconds * 20;

    // 4. Áp dụng hiệu ứng gameplay Authoritative
    switch (cmd.skillId) {
      case 'airstrike': {
        const tx = cmd.targetX ?? 540;
        const ty = cmd.targetY ?? 580;
        const warningTicks = config.warningDelayTicks || 20;
        const airstrike: ActiveAirstrike = {
          id: `ast_${this.tick}_${cmd.commandId}`,
          commandId: cmd.commandId,
          senderName: cmd.sourceUserName,
          x: tx,
          y: ty,
          radius: config.damageRadius || 280,
          damage: (config.damageAoE || 450) * Math.min(qty, 3),
          warningEndTick: this.tick + warningTicks,
          hasDetonated: false,
        };
        this.activeAirstrikes.push(airstrike);
        this.recordEvent({
          type: 'SKILL_AIRSTRIKE_WARNING',
          sourceId: cmd.commandId,
          senderName: cmd.sourceUserName,
          x: tx,
          y: ty,
          radius: airstrike.radius,
          color: config.bannerColor,
          duration: warningTicks,
        });
        player.giftScore += 100 * qty;
        break;
      }

      case 'shield': {
        const remainingTicks = this.isShieldActive() ? this.activeShieldBuff!.expirationTick - this.tick : 0;
        const newExpiration = config.stackPolicy === 'extend'
          ? this.tick + remainingTicks + durationTicks
          : this.tick + durationTicks;

        this.activeShieldBuff = {
          commandId: cmd.commandId,
          expirationTick: newExpiration,
          damageReduction: config.damageReductionPercent || 0.5,
        };
        this.recordEvent({
          type: 'SKILL_SHIELD_ACTIVATED',
          sourceId: cmd.commandId,
          senderName: cmd.sourceUserName,
          x: 540,
          y: 1200,
          duration: config.durationSeconds,
          color: config.bannerColor,
        });
        player.giftScore += 50 * qty;
        break;
      }

      case 'overclock': {
        const origCooldowns = new Map<string, number>();
        for (const [id, t] of this.towers.entries()) {
          origCooldowns.set(id, t.maxCooldownTicks);
          t.maxCooldownTicks = Math.max(2, Math.floor(t.maxCooldownTicks / 2));
        }
        const remainingTicks = this.isOverclockActive() ? this.activeOverclockBuff!.expirationTick - this.tick : 0;
        const newExpiration = config.stackPolicy === 'extend'
          ? this.tick + remainingTicks + durationTicks
          : this.tick + durationTicks;

        this.activeOverclockBuff = {
          commandId: cmd.commandId,
          expirationTick: newExpiration,
          fireRateMultiplier: config.turretFireRateMultiplier || 2.0,
          originalTowerCooldowns: this.activeOverclockBuff?.originalTowerCooldowns || origCooldowns,
        };
        this.recordEvent({
          type: 'SKILL_OVERCLOCK_ACTIVATED',
          sourceId: cmd.commandId,
          senderName: cmd.sourceUserName,
          x: 540,
          y: 950,
          duration: config.durationSeconds,
          color: config.bannerColor,
        });
        player.giftScore += 80 * qty;
        break;
      }

      case 'reinforcements': {
        const spawnCount = Math.min(2, config.maxSoldiers || 4);
        const lifespanTicks = config.durationSeconds * 20;
        for (let i = 0; i < spawnCount; i++) {
          const sId = `reinf_${this.tick}_${i}_${Math.random().toString(36).substring(2, 6)}`;
          const soldier: EngineSoldier = {
            id: sId,
            userId: `ai_reinf_${cmd.sourceUserId}`,
            name: `Biệt Kích (${cmd.sourceUserName})`,
            x: 480 + i * 120,
            y: 1180,
            hp: 100,
            maxHp: 100,
            cooldownTicks: 0,
            maxCooldownTicks: 20,
            squad: i % 2 === 0 ? 'alpha' : 'bravo',
          };
          this.soldiers.set(sId, soldier);
          this.reinforcementSoldierLifespans.set(sId, this.tick + lifespanTicks);
        }
        this.recordEvent({
          type: 'SKILL_REINFORCEMENTS_SPAWNED',
          sourceId: cmd.commandId,
          senderName: cmd.sourceUserName,
          x: 540,
          y: 1180,
          quantity: spawnCount,
          color: config.bannerColor,
        });
        player.giftScore += 60 * qty;
        break;
      }

      case 'mech': {
        const lifespanTicks = config.durationSeconds * 20;
        this.activeMechUnit = {
          id: `mech_${cmd.commandId}`,
          commandId: cmd.commandId,
          senderName: cmd.sourceUserName,
          x: 540,
          y: 1350,
          hp: config.mechHp || 1500,
          maxHp: config.mechHp || 1500,
          expirationTick: this.tick + lifespanTicks,
          cooldownTicks: 10,
          maxCooldownTicks: 30, // Bắn đại bác mỗi 1.5s
        };
        this.recordEvent({
          type: 'SKILL_MECH_DEPLOYED',
          sourceId: cmd.commandId,
          senderName: cmd.sourceUserName,
          x: 540,
          y: 1350,
          duration: config.durationSeconds,
          color: config.bannerColor,
        });
        player.giftScore += 150 * qty;
        break;
      }

      case 'healing': {
        const healAmt = (config.healAmount || 400) * qty;
        const soldierHeal = config.soldierHealAmount || 100;
        this.baseHp = Math.min(this.maxBaseHp, this.baseHp + healAmt);
        for (const s of this.soldiers.values()) {
          s.hp = Math.min(s.maxHp, s.hp + soldierHeal);
        }
        this.recordEvent({
          type: 'SKILL_HEALING_APPLIED',
          sourceId: cmd.commandId,
          senderName: cmd.sourceUserName,
          damage: healAmt,
          x: 540,
          y: 1400,
          color: config.bannerColor,
        });
        player.giftScore += 50 * qty;
        break;
      }

      case 'honor': {
        this.recordEvent({
          type: 'SKILL_HONOR_CELEBRATION',
          sourceId: cmd.commandId,
          senderName: cmd.sourceUserName,
          text: `Vinh danh VIP: ${cmd.sourceUserName}!`,
          x: 540,
          y: 600,
          color: config.bannerColor,
        });
        player.giftScore += 40 * qty;
        break;
      }
    }

    // Phát sự kiện GIFT_BANNER cho Stream Overlay hiển thị trong vùng an toàn (safe area)
    this.recordEvent({
      type: 'GIFT_BANNER',
      sourceId: cmd.commandId,
      senderName: cmd.sourceUserName,
      skillId: config.id,
      text: config.name,
      quantity: qty,
      color: config.bannerColor,
      duration: 3,
      x: 540,
      y: 1300,
    });

    // Cập nhật activeGiftSkill cho snapshot tương thích ngược client
    this.activeGiftSkill = {
      skillId: config.id,
      name: config.name,
      remainingSeconds: config.durationSeconds,
      senderName: cmd.sourceUserName,
      targetX: cmd.targetX ?? 540,
      targetY: cmd.targetY ?? 580,
    };

    // Cập nhật cooldown và số lần kích hoạt per-match
    this.skillActivationCounts.set(cmd.skillId, currentCount + 1);
    this.skillCooldowns.set(cmd.skillId, this.tick + config.cooldownSeconds * 20);

    // Tính điểm leaderboard
    if (!DEFAULT_GAME_BALANCE.leaderboard.paidSkillExcludedFromCompetitiveScore) {
      player.competitiveScore += player.giftScore;
    }
    player.score = player.competitiveScore;

    this.executedCommandIds.add(cmd.commandId);
    if (this.executedCommandIds.size > 2000) {
      const first = this.executedCommandIds.values().next().value;
      if (first) this.executedCommandIds.delete(first);
    }

    this.recordProcessedSeq(cmd.seq);
    if (this.onCommandApplied) {
      this.onCommandApplied(cmd, this.tick, { success: true, status: 'APPLIED' });
    }

    return { success: true, skillName: config.name };
  }

  /**
   * Xử lý quà tặng Live với bảo đảm tính Idempotency chặt chẽ bằng providerEventId và commandId
   */
  public handleGift(
    giftInput: AuthoritativeGiftEvent | string,
    senderId?: string,
    senderName?: string,
    quantity: number = 1,
    streakId?: string,
    commandId?: string
  ): { success: boolean; reason?: string; skillName: string } {
    let event: AuthoritativeGiftEvent;

    if (typeof giftInput === 'string') {
      if (!senderId) return { success: false, reason: 'INVALID_SENDER', skillName: 'UNKNOWN' };
      event = {
        provider: 'mock',
        liveSessionId: this.matchId,
        providerEventId: streakId ? `${streakId}_${quantity}` : `evt_gift_${senderId}_${Date.now()}_${Math.random()}`,
        senderId,
        senderName: senderName || 'VIP_Supporter',
        giftId: giftInput,
        quantity: quantity || 1,
        streakId,
        timestamp: Date.now(),
      };
    } else {
      event = giftInput;
    }

    const cmdId = commandId || event.providerEventId;
    if (cmdId && this.executedCommandIds.has(cmdId)) {
      return { success: false, reason: 'COMMAND_ALREADY_EXECUTED', skillName: 'ALREADY_EXECUTED' };
    }

    // 1. Kiểm tra bắt buộc providerEventId
    if (!event.providerEventId) {
      return { success: false, reason: 'MISSING_PROVIDER_EVENT_ID', skillName: 'UNKNOWN' };
    }

    // 2. Chống lặp (Idempotency Guard) qua providerEventId
    if (this.processedGiftIds.has(event.providerEventId)) {
      return { success: false, reason: 'DUPLICATE_EVENT', skillName: 'ALREADY_PROCESSED' };
    }

    // 2.1. Kiểm tra trạng thái streak
    if (event.streakId) {
      const activeStreak = this.activeStreaks.get(event.streakId);
      if (activeStreak && activeStreak.status === 'FINISHED') {
        return { success: false, reason: 'STREAK_ALREADY_FINISHED', skillName: 'ALREADY_FINISHED' };
      }
      if (activeStreak) {
        activeStreak.status = event.streakStatus || 'IN_PROGRESS';
        activeStreak.lastQuantity = event.quantity;
      } else {
        this.activeStreaks.set(event.streakId, {
          lastQuantity: event.quantity,
          status: event.streakStatus || 'IN_PROGRESS',
        });
      }
    }

    this.processedGiftIds.add(event.providerEventId);
    if (this.processedGiftIds.size > 2000) {
      const first = this.processedGiftIds.values().next().value;
      if (first) this.processedGiftIds.delete(first);
    }

    // 3. Tra cứu kỹ năng từ SkillRegistry (Exact match)
    const resolvedSkill = resolveGiftSkill(event.giftId);
    if (!resolvedSkill) {
      return { success: false, reason: 'UNSUPPORTED_GIFT_TYPE', skillName: 'UNKNOWN' };
    }

    const cmd: SkillCommand = {
      commandId: cmdId,
      matchId: event.liveSessionId || this.matchId,
      targetTick: this.tick,
      sourceUserId: event.senderId,
      sourceUserName: event.senderName,
      skillId: resolvedSkill.id,
      quantity: event.quantity,
      streakId: event.streakId,
    };

    return this.applySkillCommand(cmd);
  }

  private checkCooldown(userId: string, cmd: string, cooldownTicks: number): { ready: boolean; remainingSeconds: number } {
    let userMap = this.userCooldowns.get(userId);
    if (!userMap) {
      userMap = new Map();
      this.userCooldowns.set(userId, userMap);
    }
    const expire = userMap.get(cmd) || 0;
    if (this.tick < expire) {
      const remainingSeconds = Math.ceil((expire - this.tick) / 20);
      return { ready: false, remainingSeconds };
    }
    userMap.set(cmd, this.tick + cooldownTicks);
    return { ready: true, remainingSeconds: 0 };
  }

  // =========================================================================
  // GATE & WALL DIRECT CONTROLS (PROTECTED ADMIN)
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
    const cmdId = `gift_missile_${this.tick}_${Math.random().toString(36).substring(2, 6)}`;
    const ast: ActiveAirstrike = {
      id: `ast_${this.tick}_${cmdId}`,
      commandId: 'gift_missile',
      senderName: sender,
      x: targetX,
      y: targetY,
      radius: 280,
      damage: 1400,
      warningEndTick: this.tick + 15,
      hasDetonated: false,
    };
    this.activeAirstrikes.push(ast);

    this.activeGiftSkill = {
      skillId: 'airstrike',
      name,
      remainingSeconds: 4,
      senderName: sender,
      targetX,
      targetY,
      triggerTick: this.tick + 15, // Detonates in ~750ms
    };

    this.recordEvent({
      type: 'GIFT_SKILL',
      sourceId: sender,
      damage: 0,
      x: targetX,
      y: targetY,
    });
  }

  public damageWall(id: 'LEFT' | 'RIGHT', amount: number): void {
    let effectiveAmount = amount;
    if (this.isShieldActive()) {
      effectiveAmount = Math.ceil(amount * (1 - this.activeShieldBuff!.damageReduction));
    }
    const updated = this.collisionSystem.damageWall(id, effectiveAmount);
    this.recordEvent({
      type: 'WALL_HIT',
      sourceId: 'admin',
      damage: effectiveAmount,
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
    if (this.phase === 'PAUSED') {
      return;
    }
    this.tick++;
    const dt = 0.05; // 50ms

    // 0. Xử lý hàng đợi lệnh kỹ năng theo tick đơn điệu (Deterministic Tick-Ordered Command Queue)
    this.processQueuedCommandsForTick();

    // 1. Quản lý trạng thái và đếm ngược chu kỳ Wave
    this.stepMatchLifecycle();

    if (this.baseHp <= 0) {
      this.result = 'DEFEAT';
      this.phase = 'RESULTS';
      return;
    }

    // 2. Chuyển động cổng Blast Gate
    this.stepGateTransition();

    // 3. Chuyển động Zombie & Va chạm vật lý
    this.stepZombieMovement(dt);

    // 4. Xử lý chiến đấu: Ụ pháo & Lính khóa mục tiêu và bắn
    this.stepCombat();

    // 5. Cập nhật kỹ năng chiến đấu 7 loại (Skills, Buffs, Airstrike AoE, Mech, Overclock)
    this.stepSkills();

    // 6. Quản lý vòng đời Zombie & Respawn
    this.stepZombieLifecycle();

    // 7. Checkpoint Trigger: Kích hoạt định kỳ tại simulation tick boundary (mỗi 100 ticks)
    if (this.tick > 0 && this.tick % 100 === 0) {
      this.onCheckpointNeeded?.(this.tick, this.getSimulationState(), this.lastAppliedJournalSeq);
    }
  }

  private stepMatchLifecycle(): void {
    this.waveTicksRemaining--;

    // Chu trình chuyển Wave tự động theo chuẩn GAME_BALANCE.json
    if (this.phase === 'PREPARING' && this.waveTicksRemaining <= 0) {
      this.phase = 'WAVE_1';
      this.waveNumber = 1;
      this.waveTicksRemaining = 20 * 60; // 60s
      this.initZombiesForWave(1);
    } else if (this.phase === 'WAVE_1' && this.waveTicksRemaining <= 0) {
      this.phase = 'WAVE_2';
      this.waveNumber = 2;
      this.waveTicksRemaining = 20 * 60;
      this.initZombiesForWave(2);
    } else if (this.phase === 'WAVE_2' && this.waveTicksRemaining <= 0) {
      this.phase = 'WAVE_3';
      this.waveNumber = 3;
      this.waveTicksRemaining = 20 * 60;
      this.initZombiesForWave(3);
    } else if (this.phase === 'WAVE_3' && this.waveTicksRemaining <= 0) {
      this.phase = 'WAVE_4';
      this.waveNumber = 4;
      this.waveTicksRemaining = 20 * 60;
      this.initZombiesForWave(4);
    } else if (this.phase === 'WAVE_4' && this.waveTicksRemaining <= 0) {
      this.phase = 'WAVE_5';
      this.waveNumber = 5;
      this.waveTicksRemaining = 20 * 40; // 40s Wave 5
      this.initZombiesForWave(5);
    } else if (this.phase === 'WAVE_5' && this.waveTicksRemaining <= 0) {
      this.phase = 'BOSS';
      this.waveNumber = 6;
      this.waveTicksRemaining = 20 * 40; // 40s to defeat boss
      this.zombies.clear();
      this.spawnBoss();
    } else if (this.phase === 'BOSS') {
      const boss = Array.from(this.zombies.values()).find((z) => z.isBoss);
      if (boss && boss.isDead) {
        this.result = 'VICTORY';
        this.phase = 'RESULTS';
        this.waveTicksRemaining = 20 * 20; // 20s to view results
      } else if (this.waveTicksRemaining <= 0) {
        this.result = 'DEFEAT';
        this.phase = 'RESULTS';
        this.waveTicksRemaining = 20 * 20;
      }
    } else if (this.phase === 'RESULTS' && this.waveTicksRemaining <= 0) {
      // Tự động khởi động trận tiếp theo (24/7 continuous stream)
      this.restartMatch();
    }
  }

  public onMatchStart?: (matchId: string, seed: number, phase: MatchPhase, baseHp: number) => void;

  private previousPhaseBeforePause: MatchPhase = 'PREPARING';

  public pauseSimulation(): void {
    if (this.phase !== 'PAUSED') {
      this.previousPhaseBeforePause = this.phase;
      this.phase = 'PAUSED';
    }
  }

  public resumeSimulation(): void {
    if (this.phase === 'PAUSED') {
      this.phase = this.previousPhaseBeforePause;
    }
  }

  public isPaused(): boolean {
    return this.phase === 'PAUSED';
  }

  public emergencyReset(): void {
    this.restartMatch();
  }

  public restartMatch(newMatchId?: string): void {
    this.matchId = newMatchId || `match_${crypto.randomUUID()}`;
    this.phase = 'PREPARING';
    this.result = 'IN_PROGRESS';
    this.baseHp = DEFAULT_GAME_BALANCE.round.baseHp;
    this.waveNumber = 1;
    this.waveTicksRemaining = 20 * 20;
    this.bossSpawned = false;
    this.bossStage = 1;
    this.activeGiftSkill = undefined;
    this.userCooldowns.clear();
    this.skillCooldowns.clear();
    this.skillActivationCounts.clear();
    this.activeAirstrikes = [];
    this.activeShieldBuff = undefined;
    this.activeOverclockBuff = undefined;
    this.activeMechUnit = undefined;
    this.reinforcementSoldierLifespans.clear();

    // Reset round scores cho người chơi, giữ nguyên định danh tài khoản
    for (const p of this.players.values()) {
      p.score = p.hasJoined ? 10 : 0;
      p.competitiveScore = p.hasJoined ? 10 : 0;
      p.giftScore = 0;
      p.kills = 0;
      p.assists = 0;
      p.repairs = 0;
      p.rescues = 0;
      p.bossDamage = 0;
      p.lastActionTick = this.tick;
    }

    this.initTowers();
    this.initSoldiers();
    this.initZombiesForWave(1);
    this.collisionSystem.setWallState('LEFT', 'INTACT', 1000);
    this.collisionSystem.setWallState('RIGHT', 'INTACT', 1000);
    this.closeGate();

    // P0: Chuyển toàn bộ deferred commands từ vòng RESULTS sang trận mới với transition audit trail!
    if (this.deferredSkillCommands.length > 0) {
      for (const cmd of this.deferredSkillCommands) {
        const fromMatchId = cmd.matchId;
        cmd.targetMatchId = this.matchId;
        cmd.matchId = this.matchId;
        cmd.targetTick = this.tick + 5;
        this.commandQueue.push(cmd);
        if (this.onCommandTransitionNeeded) {
          this.onCommandTransitionNeeded({
            commandId: cmd.commandId,
            fromMatchId,
            toMatchId: this.matchId,
            reason: 'DEFERRED_MATCH_TRANSITION',
          });
        }
      }
      this.deferredSkillCommands = [];
    }

    if (this.onMatchStart) {
      this.onMatchStart(this.matchId, this.seed, this.phase, this.baseHp);
    }
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

    const leftDoorX = bg.doorLeftClosedX + (bg.doorLeftOpenX - bg.doorLeftClosedX) * this.gateProgress;
    const rightDoorX = bg.doorRightClosedX + (bg.doorRightOpenX - bg.doorRightClosedX) * this.gateProgress;
    this.collisionSystem.updateGateDoors(leftDoorX, rightDoorX);
  }

  private stepZombieMovement(dt: number): void {
    for (const z of this.zombies.values()) {
      if (z.isDead) continue;

      // Xử lý các giai đoạn chiến đấu của Boss Zombie King
      if (z.isBoss) {
        const hpPercent = z.hp / z.maxHp;
        if (hpPercent <= 0.25 && this.bossStage < 3) {
          this.bossStage = 3;
          z.armor = 0; // Gỡ bỏ giáp
          z.vy = 80; // Cuồng sát, lao thẳng vào căn cứ
        } else if (hpPercent <= 0.6 && this.bossStage < 2) {
          this.bossStage = 2;
          z.armor = 0.2;
          z.vy = 45; // Tăng tốc độ gấp đôi
        }
      }

      const nextX = z.x;
      const nextY = z.y + z.vy * dt;

      const col = this.collisionSystem.resolveMovement(z.x, z.y, nextX, nextY, z.radius);
      z.x = col.resolvedX;
      z.y = col.resolvedY;
      z.isAttacking = col.collided;

      // Gây sát thương vào Base khi tiến sâu vào cứ điểm (y >= 1400)
      if (z.y >= 1400) {
        let baseDmg = z.isBoss ? 20 : 5;
        if (this.isShieldActive()) {
          baseDmg = Math.ceil(baseDmg * (1 - this.activeShieldBuff!.damageReduction));
        }
        this.baseHp = Math.max(0, this.baseHp - baseDmg);
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

      // Ưu tiên bắn mục tiêu chỉ định (nếu có lệnh BOSS)
      let target = turret.targetZombieId ? this.zombies.get(turret.targetZombieId) : null;
      if (!target || target.isDead) {
        target = this.getClosestZombie(turret.x, turret.y, liveZombies);
      }

      if (target) {
        const isCritical = this.rng.next() < 0.18;
        const baseDmg = turret.type === 'plasma' ? 55 : turret.type === 'tesla' ? 45 : 38;
        let damage = isCritical ? Math.round(baseDmg * 1.5) : baseDmg;

        // Giảm trừ giáp của Zombie
        if (target.armor && target.armor > 0) {
          damage = Math.round(damage * (1 - target.armor));
        }

        target.hp = Math.max(0, target.hp - damage);
        turret.cooldownTicks = turret.maxCooldownTicks;

        this.recordEvent({
          type: 'SHOOT',
          sourceId: turret.id,
          targetId: target.id,
          damage,
          isCritical,
          x: target.x,
          y: target.y,
        });

        if (target.isBoss) {
          const turretSquad = turret.id.includes('alpha') ? 'alpha' : turret.id.includes('charlie') ? 'charlie' : 'bravo';
          this.awardBossDamageToSquad(damage, turretSquad);
        }

        if (target.hp <= 0 && !target.isDead) {
          target.isDead = true;
          target.deathTick = this.tick;
          this.recordEvent({
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
        let damage = isCritical ? 45 : 28;
        if (target.armor && target.armor > 0) {
          damage = Math.round(damage * (1 - target.armor));
        }

        target.hp = Math.max(0, target.hp - damage);
        soldier.cooldownTicks = soldier.maxCooldownTicks;

        this.recordEvent({
          type: 'SHOOT',
          sourceId: soldier.id,
          targetId: target.id,
          damage,
          isCritical,
          x: target.x,
          y: target.y,
        });

        if (target.isBoss) {
          this.awardBossDamageToSquad(damage, soldier.squad);
        }

        if (target.hp <= 0 && !target.isDead) {
          target.isDead = true;
          target.deathTick = this.tick;
          this.recordEvent({
            type: 'DEATH',
            sourceId: soldier.id,
            targetId: target.id,
            damage: 0,
            x: target.x,
            y: target.y,
          });

          // Thưởng điểm hạ gục cho người chơi thuộc Squad của Soldier này
          this.awardKillPointsToSquad(soldier.squad);
        }
      }
    }
  }

  private awardKillPointsToSquad(squad: 'alpha' | 'bravo' | 'charlie'): void {
    const squadPlayers = Array.from(this.players.values()).filter((p) => p.hasJoined && p.squad === squad);
    if (squadPlayers.length > 0) {
      const luckyPlayer = squadPlayers[Math.floor(this.rng.next() * squadPlayers.length)];
      luckyPlayer.kills++;
      luckyPlayer.competitiveScore += DEFAULT_GAME_BALANCE.leaderboard.kill;
      luckyPlayer.score = luckyPlayer.competitiveScore;
    }
  }

  private awardBossDamageToSquad(damage: number, squad: 'alpha' | 'bravo' | 'charlie'): void {
    const squadPlayers = Array.from(this.players.values()).filter((p) => p.hasJoined && p.squad === squad);
    if (squadPlayers.length === 0) return;
    const share = Math.ceil(damage / squadPlayers.length);
    for (const p of squadPlayers) {
      p.bossDamage += share;
      const pts = Math.floor(share / DEFAULT_GAME_BALANCE.leaderboard.bossDamagePerPoint);
      p.competitiveScore += pts;
      p.score = p.competitiveScore;
    }
  }

  private stepSkills(): void {
    const liveZombies = Array.from(this.zombies.values()).filter((z) => !z.isDead);

    // 1. Step Active Airstrikes (warning marker delay -> AoE detonation)
    for (let i = this.activeAirstrikes.length - 1; i >= 0; i--) {
      const ast = this.activeAirstrikes[i];
      if (!ast.hasDetonated && this.tick >= ast.warningEndTick) {
        ast.hasDetonated = true;
        for (const z of liveZombies) {
          if (z.isDead) continue;
          const dist = Math.hypot(z.x - ast.x, z.y - ast.y);
          if (dist <= ast.radius) {
            z.hp = Math.max(0, z.hp - ast.damage);
            this.recordEvent({
              type: 'HIT',
              sourceId: ast.commandId,
              targetId: z.id,
              damage: ast.damage,
              isCritical: true,
              x: z.x,
              y: z.y,
            });

            if (z.hp <= 0 && !z.isDead) {
              z.isDead = true;
              z.deathTick = this.tick;
              this.recordEvent({
                type: 'DEATH',
                sourceId: ast.commandId,
                targetId: z.id,
                damage: 0,
                x: z.x,
                y: z.y,
              });
            }
          }
        }

        this.recordEvent({
          type: 'SKILL_AIRSTRIKE_DETONATED',
          sourceId: ast.commandId,
          senderName: ast.senderName,
          damage: ast.damage,
          radius: ast.radius,
          x: ast.x,
          y: ast.y,
          color: '#ff0055',
        });
      }

      // Cleanup sau khi chớp nổ kết thúc (sau 20 ticks = 1s)
      if (ast.hasDetonated && this.tick >= ast.warningEndTick + 20) {
        this.activeAirstrikes.splice(i, 1);
      }
    }

    // 2. Step Active Shield Buff
    if (this.activeShieldBuff) {
      if (this.tick >= this.activeShieldBuff.expirationTick) {
        this.recordEvent({
          type: 'SKILL_SHIELD_EXPIRED',
          sourceId: this.activeShieldBuff.commandId,
          x: 540,
          y: 1200,
          color: '#00f5d4',
        });
        this.activeShieldBuff = undefined;
      }
    }

    // 3. Step Active Overclock Buff
    if (this.activeOverclockBuff) {
      if (this.tick >= this.activeOverclockBuff.expirationTick) {
        // Phục hồi tốc độ bắn và maxCooldownTicks nguyên bản
        for (const [tId, origCd] of this.activeOverclockBuff.originalTowerCooldowns.entries()) {
          const t = this.towers.get(tId);
          if (t) t.maxCooldownTicks = origCd;
        }
        this.recordEvent({
          type: 'SKILL_OVERCLOCK_EXPIRED',
          sourceId: this.activeOverclockBuff.commandId,
          x: 540,
          y: 950,
          color: '#ffbe0b',
        });
        this.activeOverclockBuff = undefined;
      }
    }

    // 4. Step Active Mech Unit
    if (this.activeMechUnit) {
      if (this.tick >= this.activeMechUnit.expirationTick || this.activeMechUnit.hp <= 0) {
        this.recordEvent({
          type: 'DEATH',
          sourceId: this.activeMechUnit.id,
          x: this.activeMechUnit.x,
          y: this.activeMechUnit.y,
        });
        this.activeMechUnit = undefined;
      } else {
        // Mech tiến dần ra cứ điểm trung tâm
        if (this.activeMechUnit.y > 1100) {
          this.activeMechUnit.y = Math.max(1100, this.activeMechUnit.y - 1.5);
        }

        if (this.activeMechUnit.cooldownTicks > 0) {
          this.activeMechUnit.cooldownTicks--;
        } else {
          const target = this.getClosestZombie(this.activeMechUnit.x, this.activeMechUnit.y, liveZombies);
          if (target && Math.hypot(target.x - this.activeMechUnit.x, target.y - this.activeMechUnit.y) <= 450) {
            const cannonRadius = 160;
            const cannonDmg = 80;
            for (const z of liveZombies) {
              if (z.isDead) continue;
              if (Math.hypot(z.x - target.x, z.y - target.y) <= cannonRadius) {
                z.hp = Math.max(0, z.hp - cannonDmg);
                this.recordEvent({
                  type: 'HIT',
                  sourceId: this.activeMechUnit.id,
                  targetId: z.id,
                  damage: cannonDmg,
                  isCritical: true,
                  x: z.x,
                  y: z.y,
                });
                if (z.hp <= 0 && !z.isDead) {
                  z.isDead = true;
                  z.deathTick = this.tick;
                  this.recordEvent({
                    type: 'DEATH',
                    sourceId: this.activeMechUnit.id,
                    targetId: z.id,
                    damage: 0,
                    x: z.x,
                    y: z.y,
                  });
                }
              }
            }
            this.recordEvent({
              type: 'SHOOT',
              sourceId: this.activeMechUnit.id,
              targetId: target.id,
              damage: cannonDmg,
              x: target.x,
              y: target.y,
            });
            this.activeMechUnit.cooldownTicks = this.activeMechUnit.maxCooldownTicks;
          }
        }
      }
    }

    // 5. Step Reinforcements Lifespans
    for (const [sId, expireTick] of this.reinforcementSoldierLifespans.entries()) {
      const s = this.soldiers.get(sId);
      if (!s || s.hp <= 0 || this.tick >= expireTick) {
        this.soldiers.delete(sId);
        this.reinforcementSoldierLifespans.delete(sId);
      }
    }

    // 6. Active Gift Skill snapshot update
    if (this.activeGiftSkill && this.tick % 20 === 0) {
      this.activeGiftSkill.remainingSeconds = Math.max(0, this.activeGiftSkill.remainingSeconds - 1);
      if (this.activeGiftSkill.remainingSeconds <= 0) {
        this.activeGiftSkill = undefined;
      }
    }
  }

  private stepZombieLifecycle(): void {
    // Không respawn zombie thường nếu đang trong Boss wave
    if (this.phase === 'BOSS') return;

    for (const [id, z] of this.zombies.entries()) {
      if (z.isDead && z.deathTick !== undefined && this.tick - z.deathTick >= 80) {
        this.zombies.delete(id);
        const parts = id.split('_');
        const index = parseInt(parts[parts.length - 1], 10) || 0;
        const availableSpecs = DEFAULT_GAME_BALANCE.zombies.filter((spec) => !spec.isBoss && spec.firstWave <= this.waveNumber);
        const spec = availableSpecs[index % availableSpecs.length] || DEFAULT_GAME_BALANCE.zombies[0];
        this.spawnZombieFromSpec(spec, index);
      }
    }
  }

  private getClosestZombie(fromX: number, fromY: number, zombies: EngineZombie[]): EngineZombie | null {
    let closest: EngineZombie | null = null;
    let minDist = Infinity;
    for (const z of zombies) {
      const d = Math.hypot(z.x - fromX, z.y - fromY);
      if (d < minDist) {
        minDist = d;
        closest = z;
      }
    }
    return closest;
  }

  // =========================================================================
  // RELIABLE EVENT QUEUE & BROADCAST SNAPSHOT GENERATION
  // =========================================================================

  private recordEvent(partial: Omit<CombatEvent, 'id' | 'tick'>): CombatEvent {
    this.eventSeq++;
    const eventId = `${this.matchId}_evt_${this.tick}_${this.eventSeq}`;
    const ev: CombatEvent = {
      id: eventId,
      tick: this.tick,
      ...partial,
    };
    this.eventBuffer.push(ev);
    if (this.eventBuffer.length > 500) {
      this.eventBuffer.shift();
    }
    return ev;
  }

  /**
   * Trích xuất các sự kiện mới phát sinh kể từ lần broadcast 10Hz trước
   * Không làm mất sự kiện sinh ra ở tick lẻ, không bị xóa khi client reconnect
   */
  public drainEventsForBroadcast(): CombatEvent[] {
    const unbroadcasted: CombatEvent[] = [];
    for (const ev of this.eventBuffer) {
      const parts = ev.id.split('_');
      const seq = parseInt(parts[parts.length - 1], 10);
      if (seq > this.lastPublishedEventSeq) {
        unbroadcasted.push(ev);
      }
    }
    if (unbroadcasted.length > 0) {
      const maxSeq = Math.max(...unbroadcasted.map((e) => parseInt(e.id.split('_').pop() || '0', 10)));
      this.lastPublishedEventSeq = Math.max(this.lastPublishedEventSeq, maxSeq);
    }
    return unbroadcasted;
  }

  /**
   * Tạo snapshot phát định kỳ 10Hz (có drain sự kiện mới)
   */
  public generateBroadcastSnapshot(): MatchSnapshot {
    const events = this.drainEventsForBroadcast();
    return this.buildSnapshot(events);
  }

  /**
   * Tạo snapshot on-demand (cho reconnect/query) — KHÔNG làm thay đổi lastPublishedEventSeq!
   */
  public generateSnapshot(): MatchSnapshot {
    // Trả về cửa sổ 25 sự kiện gần nhất cho client mới kết nối
    const recentWindow = this.eventBuffer.slice(-25);
    return this.buildSnapshot(recentWindow);
  }

  private buildSnapshot(events: CombatEvent[]): MatchSnapshot {
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
      isBoss: z.isBoss,
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

    // Bảng xếp hạng MVP thực tế (Real MVP Leaderboard)
    // Lọc người chơi đã tham gia chiến đấu (hasJoined) và sắp xếp theo competitiveScore
    const sortedPlayers = Array.from(this.players.values())
      .filter((p) => p.hasJoined)
      .sort((a, b) => b.competitiveScore - a.competitiveScore)
      .slice(0, 10);

    const mvpPlayers = sortedPlayers.map((p) => ({
      name: p.userName,
      points: p.competitiveScore,
      avatarColor: p.squad === 'alpha' ? 0x00f5d4 : p.squad === 'bravo' ? 0xffbe0b : 0xff006e,
    }));

    const boss = Array.from(this.zombies.values()).find((z) => z.isBoss);

    return {
      matchId: this.matchId,
      seed: this.seed,
      tick: this.tick,
      sequenceId: this.sequenceId,
      serverTime: Date.now(),
      phase: this.phase,
      baseHp: this.baseHp,
      maxBaseHp: this.maxBaseHp,
      walls: {
        left: {
          id: 'LEFT',
          state: walls.left.state,
          hp: walls.left.hp,
          maxHp: walls.left.maxHp,
        },
        right: {
          id: 'RIGHT',
          state: walls.right.state,
          hp: walls.right.hp,
          maxHp: walls.right.maxHp,
        },
      },
      gate: {
        state: this.gateState,
        doorLeftX: doors.leftX,
        doorRightX: doors.rightX,
      },
      soldiers,
      zombies,
      towers,
      recentEvents: events,
      activeGiftSkill: this.activeGiftSkill
        ? {
            skillId: this.activeGiftSkill.skillId,
            name: this.activeGiftSkill.name,
            remainingSeconds: this.activeGiftSkill.remainingSeconds,
            senderName: this.activeGiftSkill.senderName,
          }
        : undefined,
      activeMech: this.activeMechUnit
        ? {
            id: this.activeMechUnit.id,
            x: Math.round(this.activeMechUnit.x),
            y: Math.round(this.activeMechUnit.y),
            hp: this.activeMechUnit.hp,
            maxHp: this.activeMechUnit.maxHp,
            remainingSeconds: Math.ceil(Math.max(0, this.activeMechUnit.expirationTick - this.tick) / 20),
          }
        : undefined,
      waveState,
      waveRemainingSeconds: Math.ceil(this.waveTicksRemaining / 20),
      activePlayerCount: Math.max(3, Array.from(this.players.values()).filter((p) => p.hasJoined).length), // Lực lượng tham chiến thực tế
      bossHp: boss ? boss.hp : undefined,
      maxBossHp: boss ? boss.maxHp : undefined,
      result: this.result,
      elapsedSeconds: Math.floor(this.tick / 20),
      mvpPlayers,
    };
  }

  // --- ACCESSORS & DIAGNOSTICS ---
  public getGateCollisionState(): GateCollisionState {
    return this.gateState;
  }

  public getGateProgress(): number {
    return this.gateProgress;
  }

  public getWaveNumber(): number {
    return this.waveNumber;
  }

  public getLiveZombies(): EngineZombie[] {
    return Array.from(this.zombies.values()).filter((z) => !z.isDead);
  }

  public getZombie(id: string): EngineZombie | undefined {
    return this.zombies.get(id);
  }

  public getAllZombies(): EngineZombie[] {
    return Array.from(this.zombies.values());
  }

  public getPlayers(): PlayerContribution[] {
    return Array.from(this.players.values());
  }

  public getAllSoldiers(): EngineSoldier[] {
    return Array.from(this.soldiers.values());
  }

  public getActiveAirstrikes(): ActiveAirstrike[] {
    return this.activeAirstrikes;
  }

  /**
   * Lưu trọn vẹn trạng thái Authoritative Simulation phục vụ Checkpoint & Crash Recovery
   */
  public getSimulationState(): any {
    return {
      engineVersion: '1.0.0',
      matchId: this.matchId,
      seed: this.seed,
      tick: this.tick,
      sequenceId: this.sequenceId,
      lastAppliedJournalSeq: this.lastAppliedJournalSeq,
      rngState: this.rng.getState(),
      phase: this.phase,
      result: this.result,
      baseHp: this.baseHp,
      maxBaseHp: this.maxBaseHp,
      waveNumber: this.waveNumber,
      waveTicksRemaining: this.waveTicksRemaining,
      bossSpawned: this.bossSpawned,
      bossStage: this.bossStage,
      gateState: this.gateState,
      gateProgress: this.gateProgress,
      wallLeft: this.collisionSystem.getWallState('LEFT'),
      wallRight: this.collisionSystem.getWallState('RIGHT'),
      towers: Array.from(this.towers.values()),
      soldiers: Array.from(this.soldiers.values()),
      zombies: Array.from(this.zombies.values()),
      players: Array.from(this.players.values()),
      executedCommandIds: Array.from(this.executedCommandIds),
      processedGiftIds: Array.from(this.processedGiftIds),
      processedSeqs: Array.from(this.processedSeqs),
      commandQueue: this.commandQueue.map((c) => ({ ...c })),
      deferredSkillCommands: this.deferredSkillCommands.map((c) => ({ ...c })),
      activeAirstrikes: this.activeAirstrikes,
      activeShieldBuff: this.activeShieldBuff,
      activeOverclockBuff: this.activeOverclockBuff
        ? {
            commandId: this.activeOverclockBuff.commandId,
            expirationTick: this.activeOverclockBuff.expirationTick,
            fireRateMultiplier: this.activeOverclockBuff.fireRateMultiplier,
            originalTowerCooldowns: Array.from(this.activeOverclockBuff.originalTowerCooldowns.entries()),
          }
        : undefined,
      activeMechUnit: this.activeMechUnit,
      skillActivationCounts: Array.from(this.skillActivationCounts.entries()),
      skillCooldowns: Array.from(this.skillCooldowns.entries()),
      reinforcementSoldierLifespans: Array.from(this.reinforcementSoldierLifespans.entries()),
      activeStreaks: Array.from(this.activeStreaks.entries()),
      userCooldowns: Array.from(this.userCooldowns.entries()).map(([u, map]) => [u, Array.from(map.entries())]),
    };
  }

  /**
   * Khôi phục toàn bộ trạng thái Authoritative Simulation từ Checkpoint Snapshot
   */
  public loadSimulationState(state: any): void {
    if (!state) return;
    if (state.engineVersion && state.engineVersion !== '1.0.0') {
      throw new Error(`[Engine] Fatal checkpoint schema version mismatch: checkpoint version '${state.engineVersion}' is incompatible with engine version '1.0.0'`);
    }
    this.matchId = state.matchId || this.matchId;
    this.seed = state.seed ?? this.seed;
    this.tick = state.tick ?? this.tick;
    this.sequenceId = state.sequenceId ?? this.sequenceId;
    this.lastAppliedJournalSeq = state.lastAppliedJournalSeq ?? this.lastAppliedJournalSeq;
    if (Array.isArray(state.processedSeqs)) {
      this.processedSeqs = new Set(state.processedSeqs);
    } else {
      this.processedSeqs.clear();
    }
    if (state.rngState !== undefined) this.rng.setState(state.rngState);
    this.phase = state.phase ?? this.phase;
    this.result = state.result ?? this.result;
    this.baseHp = state.baseHp ?? this.baseHp;
    this.maxBaseHp = state.maxBaseHp ?? this.maxBaseHp;
    this.waveNumber = state.waveNumber ?? this.waveNumber;
    this.waveTicksRemaining = state.waveTicksRemaining ?? this.waveTicksRemaining;
    this.bossSpawned = state.bossSpawned ?? this.bossSpawned;
    this.bossStage = state.bossStage ?? this.bossStage;
    this.gateState = state.gateState ?? this.gateState;
    this.gateProgress = state.gateProgress ?? this.gateProgress;
    this.collisionSystem.setGateState(this.gateState);

    if (state.wallLeft) {
      this.collisionSystem.setWallState('LEFT', state.wallLeft.state, state.wallLeft.hp);
    }
    if (state.wallRight) {
      this.collisionSystem.setWallState('RIGHT', state.wallRight.state, state.wallRight.hp);
    }

    if (Array.isArray(state.towers)) {
      this.towers.clear();
      for (const t of state.towers) this.towers.set(t.id, { ...t });
    }
    if (Array.isArray(state.soldiers)) {
      this.soldiers.clear();
      for (const s of state.soldiers) this.soldiers.set(s.id, { ...s });
    }
    if (Array.isArray(state.zombies)) {
      this.zombies.clear();
      for (const z of state.zombies) this.zombies.set(z.id, { ...z });
    }
    if (Array.isArray(state.players)) {
      this.players.clear();
      for (const p of state.players) this.players.set(p.userId, { ...p });
    }
    if (Array.isArray(state.executedCommandIds)) {
      this.executedCommandIds = new Set(state.executedCommandIds);
    }
    if (Array.isArray(state.processedGiftIds)) {
      this.processedGiftIds = new Set(state.processedGiftIds);
    }
    if (Array.isArray(state.commandQueue)) {
      this.commandQueue = state.commandQueue.map((c: any) => ({ ...c }));
    }
    if (Array.isArray(state.deferredSkillCommands)) {
      this.deferredSkillCommands = state.deferredSkillCommands.map((c: any) => ({ ...c }));
    }
    if (Array.isArray(state.activeAirstrikes)) {
      this.activeAirstrikes = state.activeAirstrikes.map((a: any) => ({ ...a }));
    }
    this.activeShieldBuff = state.activeShieldBuff ? { ...state.activeShieldBuff } : undefined;
    if (state.activeOverclockBuff) {
      this.activeOverclockBuff = {
        commandId: state.activeOverclockBuff.commandId,
        expirationTick: state.activeOverclockBuff.expirationTick,
        fireRateMultiplier: state.activeOverclockBuff.fireRateMultiplier,
        originalTowerCooldowns: new Map(state.activeOverclockBuff.originalTowerCooldowns),
      };
    } else {
      this.activeOverclockBuff = undefined;
    }
    this.activeMechUnit = state.activeMechUnit ? { ...state.activeMechUnit } : undefined;
    if (Array.isArray(state.skillActivationCounts)) {
      this.skillActivationCounts = new Map(state.skillActivationCounts);
    }
    if (Array.isArray(state.skillCooldowns)) {
      this.skillCooldowns = new Map(state.skillCooldowns);
    }
    if (Array.isArray(state.reinforcementSoldierLifespans)) {
      this.reinforcementSoldierLifespans = new Map(state.reinforcementSoldierLifespans);
    }
    if (Array.isArray(state.activeStreaks)) {
      this.activeStreaks = new Map(state.activeStreaks);
    }
    if (Array.isArray(state.userCooldowns)) {
      this.userCooldowns = new Map(
        state.userCooldowns.map(([u, arr]: [string, any[]]) => [u, new Map(arr)])
      );
    }
  }

  public getRawHashString(): string {
    const snap = this.generateSnapshot();
    return `${snap.tick}_${snap.baseHp}_${snap.phase}_${snap.gate.state}_${snap.walls.left.hp}_${snap.walls.right.hp}_${snap.zombies.map((z) => `${z.id}:${z.hp}:${Math.round(z.y)}`).join('|')}_${this.activeAirstrikes.length}_${this.isShieldActive() ? 1 : 0}_${this.isOverclockActive() ? 1 : 0}_${this.activeMechUnit ? this.activeMechUnit.hp : 0}_${Array.from(this.executedCommandIds).sort().join(',')}`;
  }

  public getStateHash(): string {
    const raw = this.getRawHashString();

    // Fast deterministic 64-bit FNV-1a / Murmur hash (universal for both Node & Browser)
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hashVal = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
    return hashVal.substring(0, 16);
  }
}
