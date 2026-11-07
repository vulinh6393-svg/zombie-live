import Phaser from 'phaser';
import { SpriteAssetLoader } from '../assets/SpriteAssetLoader.js';
import { CharacterAnimationRegistry } from '../assets/CharacterAnimationRegistry.js';
import { GameSnapshotSource } from '../sources/GameSnapshotSource.js';
import { ExtendedMatchSnapshot, ZombieSnapshot } from '../types.js';
import { ZombieRenderer } from '../entities/ZombieRenderer.js';
import { TowerRenderer } from '../entities/TowerRenderer.js';
import { SquadVisualizer } from '../entities/SquadVisualizer.js';
import { ProjectilePool } from '../entities/ProjectilePool.js';
import { DamageNumberPool } from '../entities/DamageNumberPool.js';
import { HUD } from '../ui/HUD.js';
import { TikTokSafeZone } from '../ui/TikTokSafeZone.js';
import { DEFAULT_SCALE_TIER } from '../config/SpriteScaleConfig.js';

export interface BattlefieldSceneConfig {
  snapshotSource: GameSnapshotSource;
  isOverlayMode?: boolean;
}

export class BattlefieldScene extends Phaser.Scene {
  private snapshotSource!: GameSnapshotSource;
  private isOverlayMode: boolean = false;

  // Entities & Squads
  private squadVisualizer!: SquadVisualizer;
  private zombies: Map<string, ZombieRenderer> = new Map();
  private towers: Map<string, TowerRenderer> = new Map();

  // Pools & UI
  private projectilePool!: ProjectilePool;
  private damagePool!: DamageNumberPool;
  private hud!: HUD;
  private tiktokSafeZone!: TikTokSafeZone;

  // Fortress & Map elements
  private baseWallGraphics!: Phaser.GameObjects.Graphics;
  private lastBaseHp: number = 9850;
  private lastBaseHitTime: number = 0;

  // Combat firing loop
  private fireTimer: number = 0;

  // FPS & Diagnostics
  private currentFps: number = 60;
  private fpsText?: Phaser.GameObjects.Text;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private unsubscribeSnapshot?: () => void;

  constructor() {
    super('BattlefieldScene');
  }

  init(data: BattlefieldSceneConfig) {
    if (data.snapshotSource) {
      this.snapshotSource = data.snapshotSource;
      this.isOverlayMode = Boolean(data.isOverlayMode);
    }
  }

  preload() {
    SpriteAssetLoader.loadAll(this);
  }

  create() {
    CharacterAnimationRegistry.registerAll(this);

    // 1. Draw 9:16 Natural Battlefield Highway & Military Fortress
    this.createBattlefieldMap();

    // 2. Object Pools
    this.projectilePool = new ProjectilePool(this, 60);
    this.damagePool = new DamageNumberPool(this, 50);

    // 3. Initialize 3 Tactical Squads (Alpha, Bravo, Charlie - 3 distinct soldiers each, zero overlap)
    this.squadVisualizer = new SquadVisualizer(this);

    // 4. Spawn 3 Sentry Turrets on reinforced circular pads
    this.createFortressTurrets();

    // 5. HUD
    this.hud = new HUD(this);

    // 6. TikTok Safe Zone Simulation Overlay
    this.tiktokSafeZone = new TikTokSafeZone(this);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tiktok') === '1') {
      this.tiktokSafeZone.setVisible(true);
    }

    // 7. Benchmark HUD (only on development mode, never on /overlay)
    if (!this.isOverlayMode) {
      this.fpsText = this.add.text(35, 185, 'FPS: 60 | Natural View (Zero Red Haze)', {
        fontFamily: 'Courier',
        fontSize: '15px',
        color: '#00f5d4',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      }).setDepth(110);
    }

    // 8. Expose automation & QA API to window
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
      this.fpsText.setText(`FPS: ${this.currentFps} | Entities: ${this.squadVisualizer.getAllSoldiers().length + this.zombies.size} | p95: ${p95.toFixed(1)}ms`);
    }

    // Update Squads
    this.squadVisualizer.update(delta);

    // Update Zombies
    for (const zombie of this.zombies.values()) {
      zombie.update(delta);
    }

    // Visual Combat Loop
    this.fireTimer += delta;
    if (this.fireTimer >= 320) {
      this.fireTimer = 0;
      this.simulateVisualCombat();
    }
  }

  // =========================================================================
  // NATURAL 9:16 HIGHWAY BATTLEFIELD & MILITARY FORTRESS
  // =========================================================================
  private createBattlefieldMap(): void {
    const width = 1080;
    const height = 1920;

    // 1. Dark dirt ground (Zone outside highway)
    const ground = this.add.graphics().setDepth(0);
    ground.fillStyle(0x0c0f15, 1);
    ground.fillRect(0, 0, width, height);

    // 2. Wide Asphalt Highway Bed (Center 800px width from x: 140 to 940)
    const roadX = 140;
    const roadW = 800;
    const roadGraphics = this.add.graphics().setDepth(1);

    // Dark asphalt texture
    roadGraphics.fillStyle(0x1e222b, 1);
    roadGraphics.fillRect(roadX, 190, roadW, 1310);

    // Concrete shoulders & curbs
    roadGraphics.fillStyle(0x323742, 1);
    roadGraphics.fillRect(roadX - 14, 190, 14, 1310);
    roadGraphics.fillRect(roadX + roadW, 190, 14, 1310);

    // White outer lane boundary lines
    roadGraphics.fillStyle(0xffffff, 0.4);
    roadGraphics.fillRect(roadX + 12, 190, 4, 1310);
    roadGraphics.fillRect(roadX + roadW - 16, 190, 4, 1310);

    // 3. Lane Dividers for 3 Tactical Lanes (Left: 260, Center: 540, Right: 820)
    // Double solid yellow center divider for center lane
    roadGraphics.fillStyle(0xebaf25, 0.85);
    roadGraphics.fillRect(540 - 5, 190, 4, 1100);
    roadGraphics.fillRect(540 + 2, 190, 4, 1100);

    // White dashed dividers between lanes at x: 400 and x: 680
    roadGraphics.fillStyle(0xffffff, 0.5);
    for (let y = 200; y < 1280; y += 75) {
      roadGraphics.fillRect(398, y, 4, 45);
      roadGraphics.fillRect(678, y, 4, 45);
    }

    // Asphalt cracks & oil marks (natural combat wear)
    const cracks = this.add.graphics().setDepth(2);
    cracks.lineStyle(2, 0x12141a, 0.85);
    cracks.beginPath();
    cracks.moveTo(250, 620); cracks.lineTo(290, 650); cracks.lineTo(330, 635);
    cracks.moveTo(510, 840); cracks.lineTo(550, 870); cracks.lineTo(580, 855);
    cracks.moveTo(790, 710); cracks.lineTo(830, 735); cracks.lineTo(870, 720);
    cracks.strokePath();

    cracks.fillStyle(0x13151b, 0.65);
    cracks.fillEllipse(540, 930, 90, 45);
    cracks.fillEllipse(260, 1070, 65, 30);
    cracks.fillEllipse(820, 1120, 70, 35);

    // 4. Soft Tactical Spotlights (Lighting the combat zone with warm ambient glow)
    const spotlights = this.add.graphics().setDepth(2);
    spotlights.fillStyle(0xffeed1, 0.07);
    spotlights.fillCircle(540, 960, 260);
    spotlights.fillCircle(260, 1050, 180);
    spotlights.fillCircle(820, 1050, 180);
    spotlights.setBlendMode(Phaser.BlendModes.ADD);

    // 5. ZONE 3: MILITARY FORTRESS DEFENSE COMPOUND (y: 1260 to 1650)
    // Front barricade obstacle line at y: 1280 across all 3 lanes
    const barricades = [260, 540, 820];
    for (const bx of barricades) {
      // Wood/metal traffic barriers
      this.add.image(bx - 55, 1285, 'barricade_barrier').setScale(0.85).setDepth(3);
      this.add.image(bx + 55, 1285, 'barricade_barrier').setScale(0.85).setDepth(3);

      // Sandbag fortifications
      this.add.image(bx - 40, 1315, 'sandbags').setScale(0.95).setDepth(4);
      this.add.image(bx + 40, 1315, 'sandbags').setScale(0.95).setDepth(4);

      // Ammo crates
      this.add.image(bx - 85, 1325, 'ammo_crate').setScale(0.8).setDepth(4);
      this.add.image(bx + 85, 1325, 'ammo_crate').setScale(0.8).setDepth(4);
    }

    // Main Concrete Wall & Blast Gate (y: 1480 to 1540 across width)
    this.baseWallGraphics = this.add.graphics().setDepth(5);
    this.drawFortressWall(9850, 10000);

    // Central Blast Gate Structure (at x: 540, y: 1510)
    const blastGate = this.add.graphics().setDepth(6);
    blastGate.fillStyle(0x161c28, 1);
    blastGate.fillRoundedRect(540 - 75, 1485, 150, 50, 8);
    blastGate.lineStyle(2, 0xfee440, 1);
    blastGate.strokeRoundedRect(540 - 75, 1485, 150, 50, 8);

    // Hazard caution stripes on gate
    blastGate.fillStyle(0xfee440, 0.9);
    for (let gx = 540 - 65; gx <= 540 + 45; gx += 25) {
      blastGate.beginPath();
      blastGate.moveTo(gx, 1530);
      blastGate.lineTo(gx + 12, 1490);
      blastGate.lineTo(gx + 20, 1490);
      blastGate.lineTo(gx + 8, 1530);
      blastGate.fillPath();
    }

    this.add.text(540, 1510, '⚡ CỔNG THÀNH TRÌ ⚡', {
      fontFamily: 'Arial Black',
      fontSize: '11px',
      color: '#00f5d4',
      backgroundColor: '#0a1128ee',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5).setDepth(7);

    // Rear Staging Platform (y: 1550 to 1750)
    const staging = this.add.graphics().setDepth(2);
    staging.fillStyle(0x111622, 0.96);
    staging.fillRoundedRect(40, 1550, width - 80, 200, 14);
    staging.lineStyle(2, 0x00f5d4, 0.5);
    staging.strokeRoundedRect(40, 1550, width - 80, 200, 14);

    this.add.text(width / 2, 1572, '🛡️ KHU VỰC TẬP KẾT QUÂN ĐỘI & TUYẾN PHÒNG THỦ CHÍNH', {
      fontFamily: 'Arial Black',
      fontSize: '14px',
      color: '#00f5d4',
    }).setOrigin(0.5).setDepth(3);

    // Dark perimeter vignette
    const vignette = this.add.graphics().setDepth(12);
    vignette.fillStyle(0x040609, 0.65);
    vignette.fillRect(0, 0, roadX - 14, height);
    vignette.fillRect(roadX + roadW + 14, 0, width - (roadX + roadW + 14), height);
  }

  private drawFortressWall(hp: number, maxHp: number): void {
    const width = 1080;
    this.baseWallGraphics.clear();

    const ratio = Math.max(0, hp / maxHp);
    const wallColor = ratio > 0.4 ? 0x272e3d : 0x481822;
    const borderColor = ratio > 0.4 ? 0x00f5d4 : 0xff0055;

    // Fortress wall body
    this.baseWallGraphics.fillStyle(wallColor, 1);
    this.baseWallGraphics.fillRoundedRect(50, 1480, width - 100, 60, 10);
    this.baseWallGraphics.lineStyle(3, borderColor, 0.9);
    this.baseWallGraphics.strokeRoundedRect(50, 1480, width - 100, 60, 10);

    // Embrasures / crenels along the wall
    this.baseWallGraphics.fillStyle(0x161a24, 1);
    for (let x = 80; x < width - 80; x += 60) {
      this.baseWallGraphics.fillRect(x, 1485, 30, 12);
    }
  }

  private createFortressTurrets(): void {
    const turretPositions = [
      { id: 'turret_alpha', name: 'Ụ Pháo Alpha', type: 'machinegun' as const, x: 260, y: 1465, level: 1 },
      { id: 'turret_bravo', name: 'Ụ Pháo Bravo', type: 'plasma' as const, x: 540, y: 1445, level: 1 },
      { id: 'turret_charlie', name: 'Ụ Pháo Charlie', type: 'tesla' as const, x: 820, y: 1465, level: 1 },
    ];

    for (const t of turretPositions) {
      // Circular reinforced concrete pad under each turret
      const pad = this.add.graphics().setDepth(5);
      pad.fillStyle(0x2d3545, 1);
      pad.fillCircle(t.x, t.y, 42);
      pad.lineStyle(2, 0x00f5d4, 0.8);
      pad.strokeCircle(t.x, t.y, 42);

      const tower = new TowerRenderer(this, t);
      this.towers.set(t.id, tower);
    }
  }

  // =========================================================================
  // REAL-TIME COMBAT SIMULATION & AUTHORITATIVE FIRING
  // =========================================================================
  private simulateVisualCombat(): void {
    if (this.zombies.size === 0) return;

    const allSoldiers = this.squadVisualizer.getAllSoldiers();
    const activeZombies = Array.from(this.zombies.values()).filter((z) => !z.isDead);
    if (activeZombies.length === 0) return;

    // Squad Soldiers fire at closest zombies
    const shootersCount = Math.min(3, allSoldiers.length);
    for (let i = 0; i < shootersCount; i++) {
      const soldier = allSoldiers[Phaser.Math.Between(0, allSoldiers.length - 1)];
      const target = this.getClosestZombie(soldier.getX(), soldier.getY());
      if (target) {
        soldier.aimAt(target.getX(), target.getY());
        const { flashX, flashY } = soldier.fireMuzzleFlash();

        // Projectile flight
        this.projectilePool.fireTracer(flashX, flashY, target.getX(), target.getY(), 150);

        this.time.delayedCall(150, () => {
          if (!target.isDead) {
            target.triggerHitFlash();
            const dmg = Phaser.Math.Between(25, 45);
            this.damagePool.showDamage(target.getX(), target.getY(), dmg, dmg > 38);
            target.hp -= dmg;
            if (target.hp <= 0) {
              target.triggerDeath();
            }
          }
        });
      }
    }

    // Turrets fire dual supporting bursts
    for (const turret of this.towers.values()) {
      const target = this.getClosestZombie(turret.getX(), turret.getY());
      if (target) {
        turret.aimAt(target.getX(), target.getY());
        const { flashX, flashY } = turret.fireMuzzleFlash();

        this.projectilePool.fireTracer(flashX, flashY, target.getX(), target.getY(), 130);
        this.time.delayedCall(130, () => {
          if (!target.isDead) {
            target.triggerHitFlash();
            this.damagePool.showDamage(target.getX(), target.getY(), 55, true);
            target.hp -= 55;
            if (target.hp <= 0) {
              target.triggerDeath();
            }
          }
        });
      }
    }
  }

  private getClosestZombie(fromX: number, fromY: number): ZombieRenderer | null {
    let closest: ZombieRenderer | null = null;
    let minDist = Infinity;
    for (const z of this.zombies.values()) {
      if (z.isDead) continue;
      const dist = Phaser.Math.Distance.Between(fromX, fromY, z.getX(), z.getY());
      if (dist < minDist) {
        minDist = dist;
        closest = z;
      }
    }
    return closest;
  }

  // =========================================================================
  // SNAPSHOT SYNC
  // =========================================================================
  private handleSnapshot(snapshot: ExtendedMatchSnapshot): void {
    // 1. Sync Zombies (100% Real Sprites)
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
      } else {
        const renderer = new ZombieRenderer(this, z, DEFAULT_SCALE_TIER);
        this.zombies.set(z.id, renderer);
      }
    }

    // 2. Check Base HP Reaction (Localized only, strictly throttled)
    const now = this.time.now;
    if (snapshot.baseHp < this.lastBaseHp && now - this.lastBaseHitTime > 3000) {
      this.lastBaseHitTime = now;
      this.triggerBaseHitReaction();
    }
    this.lastBaseHp = snapshot.baseHp;
    this.drawFortressWall(snapshot.baseHp, snapshot.maxBaseHp);

    // 3. Update HUD
    this.hud.update(snapshot);
  }

  // LOCALIZED BASE HIT REACTION (P0 Fix: Never covers full screen in red!)
  public triggerBaseHitReaction(): void {
    // 1. Micro-shake on camera (120ms, subtle impact feeling)
    this.cameras.main.shake(120, 0.004);

    // 2. Localized spark burst along the fortress wall
    const sparkX = 540 + Phaser.Math.Between(-150, 150);
    const spark = this.add.image(sparkX, 1490, 'hit_explosion').setScale(1.2).setDepth(25);
    this.time.delayedCall(100, () => spark.destroy());

    // 3. Localized warning flash ON THE WALL ONLY (y: 1480, height: 60)
    const wallFlash = this.add.graphics().setDepth(20);
    wallFlash.fillStyle(0xff2200, 0.4);
    wallFlash.fillRoundedRect(50, 1480, 1080 - 100, 60, 10);

    this.tweens.add({
      targets: wallFlash,
      alpha: 0,
      duration: 200,
      onComplete: () => wallFlash.destroy(),
    });
  }

  // =========================================================================
  // GIFT SKILL VISUAL EFFECT (Airstrike / Orbital Laser)
  // =========================================================================
  public triggerGiftSkillVFX(skillName: string = 'Tên Lửa Tổng Lực'): void {
    this.hud.showGiftAlert(skillName, 'Viewer VIP');

    // Orbital beam strike down the center lane (clear boundary, auto-cleanup)
    const laser = this.add.graphics().setDepth(45);
    laser.fillStyle(0x00f5d4, 0.7);
    laser.fillRect(540 - 20, 200, 40, 1080);
    laser.lineStyle(3, 0xffffff, 1);
    laser.strokeRect(540 - 20, 200, 40, 1080);

    // Screen shockwave
    this.cameras.main.shake(250, 0.008);

    this.tweens.add({
      targets: laser,
      alpha: 0,
      scaleX: 2.0,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => laser.destroy(),
    });

    // Explosions along the lane
    for (let y = 350; y <= 1100; y += 180) {
      this.time.delayedCall(Phaser.Math.Between(40, 200), () => {
        const boom = this.add.image(540 + Phaser.Math.Between(-50, 50), y, 'hit_explosion').setScale(1.8).setDepth(48);
        this.time.delayedCall(100, () => boom.destroy());
      });
    }
  }

  // =========================================================================
  // WINDOW AUTOMATION & BENCHMARK API
  // =========================================================================
  private setupWindowBattlefieldAPI(): void {
    (window as any).battlefield = {
      spawn10Zombies: () => {
        for (let i = 0; i < 10; i++) {
          const lane = i % 3;
          const lanesX = [260, 540, 820];
          const zSnapshot: ZombieSnapshot = {
            id: `walker_bench_${Date.now()}_${i}`,
            type: 'walker',
            name: `Zombie #${i + 1}`,
            x: lanesX[lane] + Phaser.Math.Between(-35, 35),
            y: 360 + i * 65,
            hp: 100,
            maxHp: 100,
            lane: lane + 1,
          };
          const z = new ZombieRenderer(this, zSnapshot, DEFAULT_SCALE_TIER);
          this.zombies.set(zSnapshot.id, z);
        }
      },

      spawn30Entities: () => {
        for (let i = 0; i < 20; i++) {
          const lane = i % 3;
          const lanesX = [260, 540, 820];
          const zSnapshot: ZombieSnapshot = {
            id: `walker_swarm_${Date.now()}_${i}`,
            type: 'walker',
            name: `Swarm #${i + 1}`,
            x: lanesX[lane] + Phaser.Math.Between(-45, 45),
            y: 320 + i * 45,
            hp: 100,
            maxHp: 100,
            lane: lane + 1,
          };
          const z = new ZombieRenderer(this, zSnapshot, DEFAULT_SCALE_TIER);
          this.zombies.set(zSnapshot.id, z);
        }
      },

      triggerViewerJoin: (viewerName: string = 'HungGamer', squadId: 'alpha' | 'bravo' | 'charlie' = 'bravo') => {
        this.squadVisualizer.handleViewerJoin(squadId, viewerName);
      },

      triggerGift: (skillName: string = 'Tên Lửa Tổng Lực') => {
        this.triggerGiftSkillVFX(skillName);
      },

      triggerMinorDamage: () => {
        this.triggerBaseHitReaction();
      },

      setMockScenario: (sc: any) => {
        if ((this.snapshotSource as any)?.setScenario) {
          (this.snapshotSource as any).setScenario(sc);
        }
      },

      toggleTikTokSafeZone: () => {
        return this.tiktokSafeZone.toggle();
      },

      getFpsMetrics: () => ({
        actualFps: Math.round(this.game.loop.actualFps),
        p95FrameTime: this.calculateP95FrameTime(),
        soldierCount: this.squadVisualizer.getAllSoldiers().length,
        zombieCount: this.zombies.size,
      }),
    };
  }

  private calculateP95FrameTime(): number {
    if (this.frameTimes.length === 0) return 16.6;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 16.6;
  }
}
