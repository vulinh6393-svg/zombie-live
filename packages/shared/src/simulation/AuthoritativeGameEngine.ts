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
import crypto from 'node:crypto';

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
  public readonly seed: number;
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
    if (commandId && this.executedCommandIds.has(commandId)) {
      return { success: false, reason: 'COMMAND_ALREADY_EXECUTED', skillName: 'ALREADY_EXECUTED' };
    }
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

    // 3. Đăng ký thông tin người gửi
    let player = this.players.get(event.senderId);
    if (!player) {
      player = {
        userId: event.senderId,
        userName: event.senderName,
        squad: 'bravo',
        score: 0,
        competitiveScore: 0,
        giftScore: 0,
        hasJoined: false, // Spectator donating gifts, not in active infantry squad
        kills: 0,
        assists: 0,
        repairs: 0,
        rescues: 0,
        bossDamage: 0,
        lastActionTick: this.tick,
      };
      this.players.set(event.senderId, player);
    }

    // 4. Mapping quà tặng nghiêm ngặt — Từ chối gift không xác định, không tự ý mặc định Airstrike
    const normGiftId = (event.giftId || '').toLowerCase().trim();
    let skillName = '';

    if (normGiftId === 'gift_shield' || normGiftId === 'shield') {
      skillName = 'KHIÊN CHẮN NĂNG LƯỢNG';
      this.activeGiftSkill = {
        skillId: 'shield',
        name: skillName,
        remainingSeconds: 10,
        senderName: event.senderName,
      };
      player.giftScore += 50 * event.quantity;
    } else if (normGiftId === 'gift_doughnut' || normGiftId === 'machinegun' || normGiftId === 'overclock') {
      skillName = 'TĂNG TỐC Ụ PHÁO';
      for (const t of this.towers.values()) {
        t.maxCooldownTicks = Math.max(2, Math.floor(t.maxCooldownTicks / 2));
      }
      this.activeGiftSkill = {
        skillId: 'machinegun',
        name: skillName,
        remainingSeconds: 15,
        senderName: event.senderName,
      };
      player.giftScore += 80 * event.quantity;
    } else if (normGiftId === 'gift_missile' || normGiftId === 'airstrike') {
      skillName = 'TÊN LỬA TỔNG LỰC';
      this.triggerGiftSkill(skillName, event.senderName, 540, 580);
      player.giftScore += 100 * event.quantity;
    } else if (normGiftId === 'gift_heart' || normGiftId === 'heal' || normGiftId === 'reinforce') {
      skillName = 'TIẾP TẾ Y TẾ';
      this.baseHp = Math.min(this.maxBaseHp, this.baseHp + 200 * event.quantity);
      for (const s of this.soldiers.values()) {
        s.hp = Math.min(s.maxHp, s.hp + 50);
      }
      player.giftScore += 60 * event.quantity;
    } else {
      // Từ chối quà tặng không xác định!
      return { success: false, reason: 'UNSUPPORTED_GIFT_TYPE', skillName: 'UNKNOWN' };
    }

    // 5. Quy tắc GAME_BALANCE: paidSkillExcludedFromCompetitiveScore
    if (!DEFAULT_GAME_BALANCE.leaderboard.paidSkillExcludedFromCompetitiveScore) {
      player.competitiveScore += player.giftScore;
    }
    player.score = player.competitiveScore;

    if (commandId) {
      this.executedCommandIds.add(commandId);
      if (this.executedCommandIds.size > 2000) {
        const first = this.executedCommandIds.values().next().value;
        if (first) this.executedCommandIds.delete(first);
      }
    }

    return { success: true, skillName };
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
    const updated = this.collisionSystem.damageWall(id, amount);
    this.recordEvent({
      type: 'WALL_HIT',
      sourceId: 'admin',
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

    // 5. Kích hoạt kỹ năng Gift Airstrike / Shield
    this.stepGiftSkill();

    // 6. Quản lý vòng đời Zombie & Respawn
    this.stepZombieLifecycle();
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
        this.baseHp = Math.max(0, this.baseHp - (z.isBoss ? 20 : 5));
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

          this.recordEvent({
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
            this.recordEvent({
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

    if (this.tick % 20 === 0) {
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

  public getStateHash(): string {
    const snap = this.generateSnapshot();
    return `${snap.tick}_${snap.baseHp}_${snap.phase}_${snap.gate.state}_${snap.walls.left.hp}_${snap.walls.right.hp}_${snap.zombies.map(z => `${z.id}:${z.hp}:${z.y}`).join('|')}`;
  }
}
