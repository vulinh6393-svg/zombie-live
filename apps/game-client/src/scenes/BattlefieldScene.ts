import Phaser from 'phaser';
import { GameSnapshotSource } from '../sources/GameSnapshotSource.js';
import { ExtendedMatchSnapshot, ZombieSnapshot } from '../types.js';
import { CombatEvent } from '@zombie-live/shared';
import { ZombieRenderer } from '../entities/ZombieRenderer.js';
import { TowerRenderer } from '../entities/TowerRenderer.js';
import { SquadVisualizer, FormationMode } from '../entities/SquadVisualizer.js';
import { ProjectilePool } from '../entities/ProjectilePool.js';
import { DamageNumberPool } from '../entities/DamageNumberPool.js';
import { HUD } from '../ui/HUD.js';
import { TikTokSafeZone } from '../ui/TikTokSafeZone.js';
import { FortressRenderer } from '../renderer/FortressRenderer.js';
import { SpriteAssetLoader } from '../assets/SpriteAssetLoader.js';
import { CharacterAnimationRegistry } from '../assets/CharacterAnimationRegistry.js';
import { TextureGenerator } from '../graphics/TextureGenerator.js';
import { DEFAULT_SCALE_TIER } from '../config/SpriteScaleConfig.js';
import { GAME_FONTS } from '../config/FontConfig.js';

export interface BattlefieldSceneConfig {
  snapshotSource?: GameSnapshotSource;
  isOverlayMode?: boolean;
}

export class BattlefieldScene extends Phaser.Scene {
  private snapshotSource?: GameSnapshotSource;
  private unsubscribeSnapshot?: () => void;
  private isOverlayMode: boolean = false;

  // Visual Entities & Pools
  private squadVisualizer!: SquadVisualizer;
  private zombies: Map<string, ZombieRenderer> = new Map();
  private towers: Map<string, TowerRenderer> = new Map();
  private projectilePool!: ProjectilePool;
  private damagePool!: DamageNumberPool;
  private hud!: HUD;
  private tiktokSafeZone!: TikTokSafeZone;

  // Event Deduplication Cache
  private processedEventIds: Set<string> = new Set();
  private latestSnapshot: ExtendedMatchSnapshot | null = null;

  // Environment & Fortress
  private fortressRenderer!: FortressRenderer;
  private layoutVariant: 'highway' | 'bastion' = 'bastion';
  private lastBaseHp: number = 10000;
  private lastBaseHitTime: number = 0;

  // Performance Telemetry
  private fpsText?: Phaser.GameObjects.Text;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private currentFps: number = 60;

  // QA & Diagnostic flags
  private debugEntities: boolean = false;
  private currentFormationMode: FormationMode = 'C';

  constructor() {
    super({ key: 'BattlefieldScene' });
  }

  init(data: BattlefieldSceneConfig) {
    this.snapshotSource = data.snapshotSource;
    this.isOverlayMode = !!data.isOverlayMode;
  }

  preload() {
    const safeLoad = (key: string, url: string) => {
      if (!this.textures.exists(key)) {
        this.load.image(key, url);
      }
    };

    // 1. Bastion Master Architecture Sprites
    safeLoad('clean_plate', 'assets/concept/bastion_clean_environment.png');
    safeLoad('bastion_wall', 'assets/environment/bastion/bastion_wall_segment.png');
    safeLoad('bastion_gate_frame', 'assets/environment/bastion/bastion_gate_frame.png');
    safeLoad('bastion_door_left', 'assets/environment/bastion/bastion_gate_door_left.png');
    safeLoad('bastion_door_right', 'assets/environment/bastion/bastion_gate_door_right.png');
    safeLoad('bastion_turret_pad', 'assets/environment/bastion/bastion_turret_platform.png');
    safeLoad('wall_damage_overlay', 'assets/environment/bastion/wall_damage_overlay.png');

    // 2. Character & Weapon Sprite Sheets
    SpriteAssetLoader.loadAll(this);
    TextureGenerator.generateProps(this);
  }

  create() {
    CharacterAnimationRegistry.registerAll(this);

    const urlParams = new URLSearchParams(window.location.search);
    this.debugEntities = urlParams.get('debugEntities') === '1' || urlParams.get('debug') === '1';

    const reqFormation = urlParams.get('formation');
    if (reqFormation === 'A' || reqFormation === 'B' || reqFormation === 'C') {
      this.currentFormationMode = reqFormation;
    }

    const reqLayout = urlParams.get('layout') === 'highway' ? 'highway' : 'bastion';
    this.layoutVariant = reqLayout;

    // 1. Draw 9:16 Natural Highway & Architectural Military Fortress
    this.createBattlefieldMap();

    // 2. Object Pools
    this.projectilePool = new ProjectilePool(this, 60);
    this.damagePool = new DamageNumberPool(this, 50);

    // 3. Initialize 3 Tactical Squads (Alpha, Bravo, Charlie with guaranteed zero overlap)
    this.squadVisualizer = new SquadVisualizer(this, this.currentFormationMode, this.debugEntities);

    // 4. Spawn 3 Sentry Turrets on reinforced circular pads
    this.createFortressTurrets();

    // 5. HUD
    this.hud = new HUD(this);

    // 6. TikTok Safe Zone Simulation Overlay
    this.tiktokSafeZone = new TikTokSafeZone(this);
    if (urlParams.get('tiktok') === '1') {
      this.tiktokSafeZone.setVisible(true);
    }

    // 7. Telemetry HUD (Development / debug mode only - NEVER in production LIVE)
    if (!this.isOverlayMode && (this.debugEntities || urlParams.get('debug') === '1')) {
      this.fpsText = this.add.text(35, 250, 'FPS: 60 | Entities: 0 | p95: 16.6ms', {
        fontFamily: GAME_FONTS.MONO,
        fontSize: '13px',
        color: '#00f5d4',
        backgroundColor: '#0a1128dd',
        padding: { x: 8, y: 4 },
      }).setDepth(130);
    }

    // 8. Expose QA & Automation API to window
    this.setupWindowBattlefieldAPI();

    // 9. Connect Snapshot Source
    if (this.snapshotSource) {
      this.snapshotSource.connect();
      this.unsubscribeSnapshot = this.snapshotSource.subscribe((snapshot) => {
        this.handleSnapshot(snapshot);
      });
    }
  }

  update(time: number, delta: number) {
    this.currentFps = Math.round(this.game.loop.actualFps);
    if (this.lastFrameTime > 0) {
      this.frameTimes.push(time - this.lastFrameTime);
      if (this.frameTimes.length > 300) this.frameTimes.shift();
    }
    this.lastFrameTime = time;

    if (this.fpsText && !this.isOverlayMode) {
      const p95 = this.calculateP95FrameTime();
      const liveZombies = Array.from(this.zombies.values()).filter((z) => !z.isDead).length;
      this.fpsText.setText(
        `FPS: ${this.currentFps} | Lính: ${this.squadVisualizer.getAllSoldiers().length} | Zombie: ${liveZombies} | p95: ${p95.toFixed(1)}ms`
      );
    }

    // Update Squads
    this.squadVisualizer.update(delta);

    // Update Zombies (Client-side smooth lerp interpolation)
    for (const zombie of this.zombies.values()) {
      zombie.update(delta);
    }
  }

  // =========================================================================
  // DUAL LAYOUT ARCHITECTURE: LAYOUT A (HIGHWAY) vs LAYOUT B (BASTION)
  // =========================================================================
  private createBattlefieldMap(): void {
    if (this.layoutVariant === 'bastion') {
      this.createBastionMap();
    } else {
      this.createHighwayMap();
    }
  }

  // Layout A: Fortified Highway Defense (Linear 3-lane choke point)
  private createHighwayMap(): void {
    const width = 1080;
    const height = 1920;
    const roadX = 140;
    const roadW = 800;

    // Dark soil background
    const ground = this.add.graphics().setDepth(0);
    ground.fillStyle(0x0c0f15, 1);
    ground.fillRect(0, 0, width, height);

    // Highway Asphalt Bed
    const roadGraphics = this.add.graphics().setDepth(2);
    roadGraphics.fillStyle(0x181c24, 1);
    roadGraphics.fillRect(roadX, 220, roadW, 1120);

    // Shoulders
    roadGraphics.fillStyle(0x2a2f3a, 1);
    roadGraphics.fillRect(roadX - 16, 220, 16, 1120);
    roadGraphics.fillRect(roadX + roadW, 220, 16, 1120);

    // Double solid yellow center line
    roadGraphics.fillStyle(0xebaf25, 0.9);
    roadGraphics.fillRect(540 - 5, 220, 4, 1080);
    roadGraphics.fillRect(540 + 2, 220, 4, 1080);

    // White dashed dividers
    roadGraphics.fillStyle(0xffffff, 0.5);
    for (let y = 230; y < 1300; y += 70) {
      roadGraphics.fillRect(398, y, 4, 40);
      roadGraphics.fillRect(678, y, 4, 40);
    }

    // Cracks & oil slicks
    const cracks = this.add.graphics().setDepth(3);
    cracks.lineStyle(2, 0x101217, 0.9);
    cracks.beginPath();
    cracks.moveTo(250, 520); cracks.lineTo(290, 550); cracks.lineTo(330, 535);
    cracks.moveTo(510, 740); cracks.lineTo(550, 770); cracks.lineTo(580, 755);
    cracks.moveTo(790, 610); cracks.lineTo(830, 635); cracks.lineTo(870, 620);
    cracks.strokePath();

    // Directional Spotlights
    const spotlights = this.add.graphics().setDepth(4);
    spotlights.fillStyle(0xffeed1, 0.08);
    spotlights.beginPath();
    spotlights.moveTo(260, 1370); spotlights.lineTo(150, 500); spotlights.lineTo(370, 500); spotlights.closePath();
    spotlights.moveTo(540, 1350); spotlights.lineTo(410, 450); spotlights.lineTo(670, 450); spotlights.closePath();
    spotlights.moveTo(820, 1370); spotlights.lineTo(710, 500); spotlights.lineTo(930, 500); spotlights.closePath();
    spotlights.fillPath();
    spotlights.setBlendMode(Phaser.BlendModes.ADD);

    // Roadside abandoned vehicles (Image 1 & 3 inspired)
    this.add.image(roadX - 45, 820, 'vehicle_police').setRotation(0.18).setScale(0.95).setDepth(5);
    this.add.image(roadX + roadW + 48, 1080, 'vehicle_humvee').setRotation(-0.14).setScale(0.95).setDepth(5);

    // Defensive Barricade Line
    const laneCenters = [260, 540, 820];
    for (const bx of laneCenters) {
      this.add.image(bx - 60, 1235, 'barricade_barrier').setScale(0.9).setDepth(8);
      this.add.image(bx + 60, 1235, 'barricade_barrier').setScale(0.9).setDepth(8);
      this.add.image(bx - 35, 1260, 'sandbags').setScale(1.0).setDepth(9);
      this.add.image(bx + 35, 1260, 'sandbags').setScale(1.0).setDepth(9);
      this.add.image(bx - 125, 1230, 'traffic_cone').setScale(0.85).setDepth(8);
      this.add.image(bx + 125, 1230, 'traffic_cone').setScale(0.85).setDepth(8);
    }

    // High-Fidelity Fortress
    this.fortressRenderer = new FortressRenderer(this, 'highway');

    // Vignette
    const vignette = this.add.graphics().setDepth(26);
    vignette.fillStyle(0x040609, 0.7);
    vignette.fillRect(0, 0, roadX - 16, height);
    vignette.fillRect(roadX + roadW + 16, 0, width - (roadX + roadW + 16), height);
  }

  // Layout B: Fortified Bastion Outpost (SSOT Geometry & Master Environment)
  private createBastionMap(): void {
    // 1. Clean Environment Plate (Depth 1) - Verified zero baked gates or turrets
    this.add.image(540, 960, 'clean_plate').setDepth(1);

    // 2. Bastion Tactical Spotlights (Cold cyan illumination along 3 defense funnels)
    const spotlights = this.add.graphics().setDepth(4);
    spotlights.fillStyle(0x38bdf8, 0.08);
    spotlights.beginPath();
    spotlights.moveTo(280, 580); spotlights.lineTo(160, 240); spotlights.lineTo(400, 240); spotlights.closePath();
    spotlights.moveTo(540, 580); spotlights.lineTo(420, 240); spotlights.lineTo(660, 240); spotlights.closePath();
    spotlights.moveTo(800, 580); spotlights.lineTo(680, 240); spotlights.lineTo(920, 240); spotlights.closePath();
    spotlights.fillPath();
    spotlights.setBlendMode(Phaser.BlendModes.ADD);

    // 3. Assemble Full Semi-Realistic Bastion Architecture
    this.fortressRenderer = new FortressRenderer(this, 'CLOSED');
  }

  private createFortressTurrets(): void {
    // Mounted directly on top of the 3 SSOT Hexagonal Concrete Turret Pads at y=580
    const turretPositions = [
      { id: 'turret_alpha', name: 'Ụ Pháo Alpha', type: 'machinegun' as const, x: 280, y: 580, level: 1 },
      { id: 'turret_bravo', name: 'Ụ Pháo Bravo', type: 'plasma' as const, x: 540, y: 580, level: 1 },
      { id: 'turret_charlie', name: 'Ụ Pháo Charlie', type: 'tesla' as const, x: 800, y: 580, level: 1 },
    ];

    for (const t of turretPositions) {
      const tower = new TowerRenderer(this, t);
      this.towers.set(t.id, tower);
    }
  }

  // =========================================================================
  // =========================================================================
  // AUTHORITATIVE COMBAT EVENT HANDLER (Server-Driven VFX & Animations)
  // Mọi sát thương, tia đạn, số damage và hoạt ảnh tử vong đều kích hoạt từ sự kiện Server!
  // =========================================================================
  private handleCombatEvent(ev: CombatEvent): void {
    if (ev.type === 'SHOOT') {
      const target = ev.targetId ? this.zombies.get(ev.targetId) : null;
      const targetX = target ? target.getX() : ev.x;
      const targetY = target ? target.getY() : ev.y;

      if (ev.sourceId.startsWith('soldier_')) {
        const soldier = this.squadVisualizer.getSoldierById(ev.sourceId) || this.squadVisualizer.getAllSoldiers()[0];
        if (soldier) {
          soldier.aimAt(targetX, targetY);
          const { flashX, flashY } = soldier.fireMuzzleFlash();
          this.projectilePool.fireTracer(flashX, flashY, targetX, targetY, 120);
        }
      } else if (ev.sourceId.startsWith('turret_')) {
        const turret = this.towers.get(ev.sourceId);
        if (turret) {
          turret.aimAt(targetX, targetY);
          const { flashX, flashY } = turret.fireMuzzleFlash();
          this.projectilePool.fireTracer(flashX, flashY, targetX, targetY, 120);
        }
      }

      if (target && !target.isDead) {
        this.time.delayedCall(120, () => {
          if (!target.isDead) {
            target.triggerHitFlash();
            if (ev.damage && ev.damage > 0) {
              this.damagePool.showDamage(targetX, targetY, ev.damage, !!ev.isCritical);
            }
          }
        });
      }
    } else if (ev.type === 'HIT') {
      const target = ev.targetId ? this.zombies.get(ev.targetId) : null;
      if (target && !target.isDead) {
        target.triggerHitFlash();
        if (ev.damage && ev.damage > 0) {
          this.damagePool.showDamage(ev.x, ev.y, ev.damage, !!ev.isCritical);
        }
      }
    } else if (ev.type === 'DEATH') {
      const target = ev.targetId ? this.zombies.get(ev.targetId) : null;
      if (target && !target.isDead) {
        target.triggerDeath();
      }
    } else if (ev.type === 'GIFT_SKILL') {
      this.triggerGiftSkillVFX('TÊN LỬA TỔNG LỰC', ev.x, ev.y);
    } else if (ev.type === 'COMMAND_FEEDBACK') {
      this.triggerCommandFeedbackVFX(ev.sourceId, ev.x, ev.y);
    }
  }

  // =========================================================================
  // SNAPSHOT SYNCHRONIZATION
  // =========================================================================
  private handleSnapshot(snapshot: ExtendedMatchSnapshot): void {
    this.latestSnapshot = snapshot;
    // 1. Process Authoritative Combat Events (Deduplicated by eventId)
    if ((snapshot as any).recentEvents && (snapshot as any).recentEvents.length > 0) {
      for (const ev of (snapshot as any).recentEvents as CombatEvent[]) {
        if (this.processedEventIds.has(ev.id)) continue;
        this.processedEventIds.add(ev.id);
        if (this.processedEventIds.size > 500) {
          const firstKey = this.processedEventIds.values().next().value;
          if (firstKey) this.processedEventIds.delete(firstKey);
        }
        this.handleCombatEvent(ev);
      }
    }

    // 2. Synchronize Physical Gate Doors & Independent Wall States from Snapshot
    if ((snapshot as any).gate) {
      const g = (snapshot as any).gate;
      this.fortressRenderer.syncGate(g.doorLeftX, g.doorRightX, g.state);
    }
    if ((snapshot as any).walls) {
      const w = (snapshot as any).walls;
      this.fortressRenderer.syncWalls(w.left, w.right);
    }

    // 3. Sync Zombies (100% Real Sprites with authoritative life state)
    const incomingZombieIds = new Set(snapshot.zombies.map((z) => z.id));
    for (const [id, renderer] of this.zombies.entries()) {
      if (!incomingZombieIds.has(id)) {
        renderer.destroy();
        this.zombies.delete(id);
      }
    }

    for (const z of snapshot.zombies) {
      const existing = this.zombies.get(z.id);
      if (existing) {
        existing.updateSnapshot(z);
        // Automatic state transition at collision boundary (y=840)
        if (z.y >= 800 && !existing.isDead) {
          const col = this.fortressRenderer.getCollisionSystem().resolveMovement(z.x, z.y, z.x, z.y + 10, 20);
          if (col.collided) {
            existing.playState('attack');
          } else {
            existing.playState('walk');
          }
        }
      } else {
        const renderer = new ZombieRenderer(this, z, DEFAULT_SCALE_TIER, this.debugEntities);
        this.zombies.set(z.id, renderer);
      }
    }

    // 4. Base HP Reaction (Localized only, strictly throttled)
    const now = this.time.now;
    if (snapshot.baseHp < this.lastBaseHp && now - this.lastBaseHitTime > 3000) {
      this.lastBaseHitTime = now;
      this.triggerBaseHitReaction();
    }
    this.lastBaseHp = snapshot.baseHp;
    this.fortressRenderer.updateHp(snapshot.baseHp, snapshot.maxBaseHp);

    // 5. Update HUD
    this.hud.update(snapshot);
  }

  // LOCALIZED BASE HIT REACTION (P0 Fix: Never covers full screen in red!)
  private triggerBaseHitReaction(): void {
    // Localized spark burst and border flicker along wall at y: 900
    const spark = this.add.graphics().setDepth(35);
    spark.fillStyle(0xff3333, 0.85);
    spark.fillRoundedRect(50, 900, 1080 - 100, 65, 8);
    spark.lineStyle(4, 0xff0055, 1);
    spark.strokeRoundedRect(50, 900, 1080 - 100, 65, 8);

    this.cameras.main.shake(150, 0.005);

    this.tweens.add({
      targets: spark,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  // COMMAND FEEDBACK VFX (Flare & reinforcement indicators)
  private triggerCommandFeedbackVFX(sourceId: string, x: number, y: number): void {
    const isRepair = y < 1000;
    const color = isRepair ? 0x00f5d4 : 0xfee440;
    const textStr = isRepair ? '🔧 ĐÃ GIA CỐ THÀNH!' : '⭐ CHI VIỆN CHIẾN TRƯỜNG!';

    const text = this.add.text(x, y - 20, textStr, {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '18px',
      fontStyle: 'bold',
      color: isRepair ? '#00f5d4' : '#fee440',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(60);

    const burst = this.add.graphics().setDepth(59);
    burst.fillStyle(color, 0.7);
    burst.fillCircle(x, y, 26);

    this.tweens.add({
      targets: [text, burst],
      y: y - 60,
      alpha: 0,
      scale: 1.15,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.destroy();
        burst.destroy();
      },
    });
  }

  // GIFT SKILL: TÊN LỬA TỔNG LỰC (AIRSTRIKE CRUISE MISSILE)
  private triggerGiftSkillVFX(skillName: string = 'Tên Lửa Tổng Lực', targetX: number = 540, targetY: number = 580): void {
    this.hud.showGiftAlert(skillName, 'VIP_Gamer99');

    // 1. Tactical Targeting Reticle at impact point
    const reticle = this.add.image(targetX, targetY, 'tactical_reticle')
      .setScale(0.8)
      .setAlpha(0)
      .setDepth(45);

    this.tweens.add({
      targets: reticle,
      alpha: 1,
      scale: 1.15,
      angle: 90,
      duration: 600,
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: 1,
    });

    // 2. High-Tech Cruise Missile descends diagonally
    const startX = targetX - 280;
    const startY = targetY - 600;
    const missile = this.add.image(startX, startY, 'gift_missile')
      .setScale(1.2)
      .setRotation(0.42) // angled down-right towards target
      .setDepth(47);

    // Rocket thruster exhaust glow
    const exhaustGlow = this.add.graphics().setDepth(46);

    const updateExhaust = () => {
      exhaustGlow.clear();
      exhaustGlow.fillStyle(0xff7700, 0.4);
      exhaustGlow.fillCircle(missile.x - 12, missile.y - 25, 18);
    };

    this.tweens.add({
      targets: missile,
      x: targetX,
      y: targetY,
      duration: 650,
      ease: 'Quad.easeIn',
      onUpdate: updateExhaust,
      onComplete: () => {
        missile.destroy();
        exhaustGlow.destroy();
        reticle.destroy();

        // 3. High-Impact Detonation & Shockwave
        this.cameras.main.shake(320, 0.015);

        // Expanding shockwave ring
        const shockwave = this.add.graphics().setDepth(48);
        shockwave.lineStyle(4, 0x00f5d4, 1);
        shockwave.strokeCircle(targetX, targetY, 20);

        this.tweens.addCounter({
          from: 20,
          to: 220,
          duration: 400,
          ease: 'Cubic.easeOut',
          onUpdate: (tween) => {
            const r = tween.getValue() ?? 20;
            shockwave.clear();
            shockwave.lineStyle(4, 0x00f5d4, Math.max(0, 1 - (r - 20) / 200));
            shockwave.strokeCircle(targetX, targetY, r);
          },
          onComplete: () => shockwave.destroy(),
        });

        // Giant Explosion Fireball
        const boom = this.add.image(targetX, targetY, 'hit_explosion')
          .setScale(3.2)
          .setDepth(49);
        this.tweens.add({
          targets: boom,
          scale: 4.0,
          alpha: 0,
          duration: 450,
          ease: 'Cubic.easeOut',
          onComplete: () => boom.destroy(),
        });

        // 4. Authoritative Hit Reaction & Damage Numbers on surrounding zombies
        for (const zombie of this.zombies.values()) {
          const zX = zombie.container.x;
          const zY = zombie.container.y;
          const dist = Phaser.Math.Distance.Between(targetX, targetY, zX, zY);
          if (dist < 260 && !zombie.isDead) {
            zombie.triggerHitFlash();
            this.damagePool.showDamage(zX + Phaser.Math.Between(-15, 15), zY - 30, Phaser.Math.Between(280, 450), true);
          }
        }
      },
    });
  }

  // =========================================================================
  // WINDOW AUTOMATION & QA BENCHMARK API (Restricted to Debug / Dev Test only!)
  // =========================================================================
  private setupWindowBattlefieldAPI(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugOrTest = this.debugEntities || urlParams.get('debug') === '1' || urlParams.get('test') === '1';
    if (!isDebugOrTest || this.isOverlayMode) {
      // Vô hiệu hóa tuyệt đối API trên production LIVE và route /overlay
      return;
    }

    (window as any).battlefield = {
      openGate: () => {
        if ((this.snapshotSource as any)?.openGate) {
          (this.snapshotSource as any).openGate();
        } else {
          this.fortressRenderer.openGate();
        }
      },

      closeGate: () => {
        if ((this.snapshotSource as any)?.closeGate) {
          (this.snapshotSource as any).closeGate();
        } else {
          this.fortressRenderer.closeGate();
        }
      },

      setFormationMode: (mode: FormationMode) => {
        this.currentFormationMode = mode;
        this.squadVisualizer.setFormationMode(mode);
        return this.squadVisualizer.generateOverlapReport();
      },

      setLayoutVariant: (variant: 'highway' | 'bastion') => {
        this.layoutVariant = variant;
        this.fortressRenderer.setLayoutVariant(variant);
      },

      getSquadOverlapReport: () => {
        return this.squadVisualizer.generateOverlapReport();
      },

      getEntitiesDiagnostic: () => {
        const liveWalkerZombies = Array.from(this.zombies.values()).map((z) => z.getDiagnosticInfo());
        const liveSoldiers = this.squadVisualizer.getAllSoldiers().map((s) => s.getVisualBounds());
        return {
          totalZombiesInMap: this.zombies.size,
          liveZombiesCount: liveWalkerZombies.filter((z) => !z.isDead).length,
          deadZombiesCount: liveWalkerZombies.filter((z) => z.isDead).length,
          liveWalkerZombies,
          soldiersRenderedCount: liveSoldiers.length,
          soldiers: liveSoldiers,
          overlapReport: this.squadVisualizer.generateOverlapReport(),
        };
      },

      triggerZombieDeath: (zombieId?: string) => {
        // Gửi lệnh tiêu diệt authoritative lên server/engine, KHÔNG tự sửa entity trực tiếp trên client
        let killedInfo = { killedId: '', aliveCount: 0 };
        if ((this.snapshotSource as any)?.killAuthoritativeZombie) {
          killedInfo = (this.snapshotSource as any).killAuthoritativeZombie(zombieId);
        }
        return { killedId: killedInfo.killedId, aliveCount: killedInfo.aliveCount, success: Boolean(killedInfo.killedId) };
      },

      triggerViewerJoin: (viewerName: string = 'HungGamer', squadId: 'alpha' | 'bravo' | 'charlie' = 'bravo') => {
        this.squadVisualizer.handleViewerJoin(squadId, viewerName);
      },

      triggerGift: (skillName: string = 'Tên Lửa Tổng Lực') => {
        if ((this.snapshotSource as any)?.triggerGift) {
          (this.snapshotSource as any).triggerGift(skillName);
        } else {
          this.triggerGiftSkillVFX(skillName);
        }
      },

      triggerMinorDamage: () => {
        this.triggerBaseHitReaction();
      },

      damageWall: (side: 'LEFT' | 'RIGHT' = 'LEFT', amount: number = 500) => {
        if ((this.snapshotSource as any)?.damageWall) {
          (this.snapshotSource as any).damageWall(side, amount);
        }
      },

      getLatestSnapshot: () => this.latestSnapshot,

      getSocketState: () => ({
        isConnected: (this.snapshotSource as any)?.isConnected?.() ?? false,
        sequenceId: (this.snapshotSource as any)?.getLastSequenceId?.() ?? -1,
        mode: this.snapshotSource ? (this.snapshotSource as any).mode : 'unknown',
      }),

      disconnectSocket: () => {
        if (this.snapshotSource) {
          this.snapshotSource.disconnect();
        }
      },

      connectSocket: () => {
        if (this.snapshotSource) {
          this.snapshotSource.connect();
        }
      },

      snapshotSource: this.snapshotSource,

      getProcessedEventsCount: () => this.processedEventIds.size,

      toggleTikTokSafeZone: () => {
        return this.tiktokSafeZone.toggle();
      },

      getFpsMetrics: () => ({
        actualFps: Math.round(this.game.loop.actualFps),
        p95FrameTime: this.calculateP95FrameTime(),
        soldierCount: this.squadVisualizer.getAllSoldiers().length,
        zombieCount: Array.from(this.zombies.values()).filter((z) => !z.isDead).length,
      }),
    };
  }

  private calculateP95FrameTime(): number {
    if (this.frameTimes.length === 0) return 16.6;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 16.6;
  }

  /**
   * Dọn dẹp hoàn chỉnh khi scene shutdown hoặc reload
   */
  shutdown(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = undefined;
    }
    if (this.snapshotSource) {
      this.snapshotSource.disconnect();
    }
    this.processedEventIds.clear();
    this.zombies.forEach((z) => z.destroy());
    this.zombies.clear();
    this.towers.clear();
    if ((window as any).battlefield) {
      delete (window as any).battlefield;
    }
  }
}
