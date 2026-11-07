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
  private lastBaseHp: number = 10000;

  // Combat firing loop
  private fireTimer: number = 0;
  private bloodDecals: Phaser.GameObjects.Graphics[] = [];

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
    // 1. Load all real character, weapon, and environment sprites
    SpriteAssetLoader.loadAll(this);
  }

  create() {
    // 2. Register all frame-by-frame animations into Phaser Animation Manager
    CharacterAnimationRegistry.registerAll(this);

    // 3. Draw 9:16 Atmospheric Battlefield Highway & Fortress Compound
    this.createBattlefieldMap();

    // 4. Object Pools
    this.projectilePool = new ProjectilePool(this, 60);
    this.damagePool = new DamageNumberPool(this, 50);

    // 5. Initialize 3 Tactical Squads (Alpha, Bravo, Charlie)
    this.squadVisualizer = new SquadVisualizer(this);

    // 6. Spawn 3 Sentry Turrets on reinforced concrete pads
    this.createFortressTurrets();

    // 7. HUD
    this.hud = new HUD(this);

    // 8. TikTok Safe Zone Simulation Overlay
    this.tiktokSafeZone = new TikTokSafeZone(this);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tiktok') === '1') {
      this.tiktokSafeZone.setVisible(true);
    }

    // 9. Benchmark HUD (only on development mode, never on /overlay)
    if (!this.isOverlayMode) {
      this.fpsText = this.add.text(35, 185, 'FPS: 60 | Real Sprites: 100%', {
        fontFamily: 'Courier',
        fontSize: '15px',
        color: '#00f5d4',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      }).setDepth(110);
    }

    // 10. Expose laboratory & automation APIs to window
    this.setupWindowBattlefieldAPI();

    // 11. Connect Snapshot Source
    if (this.snapshotSource) {
      this.snapshotSource.connect();
      this.unsubscribeSnapshot = this.snapshotSource.subscribe((snapshot) => {
        this.handleSnapshot(snapshot);
      });
    }
  }

  update(time: number, delta: number) {
    // FPS tracking
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

    // Visual Combat Loop (Authoritative Snapshot firing simulation)
    this.fireTimer += delta;
    if (this.fireTimer >= 320) {
      this.fireTimer = 0;
      this.simulateVisualCombat();
    }
  }

  // =========================================================================
  // BATTLEFIELD MAP & FORTRESS COMPOUND (9:16 Portrait Layout)
  // =========================================================================
  private createBattlefieldMap(): void {
    const width = 1080;
    const height = 1920;

    // 1. Dark dirt ground
    const ground = this.add.graphics();
    ground.fillStyle(0x0e1117, 1);
    ground.fillRect(0, 0, width, height);

    // 2. 3 Assault Lanes with Asphalt Pavement (Left: 260, Center: 540, Right: 820)
    const lanes = [260, 540, 820];
    const laneWidth = 220;

    const roadGraphics = this.add.graphics();
    for (let i = 0; i < 3; i++) {
      const lx = lanes[i];
      // Asphalt road body (y: 200 to 1480)
      roadGraphics.fillStyle(0x21252d, 1);
      roadGraphics.fillRect(lx - laneWidth / 2, 200, laneWidth, 1280);

      // Concrete curbs
      roadGraphics.fillStyle(0x3a3f4b, 1);
      roadGraphics.fillRect(lx - laneWidth / 2 - 8, 200, 8, 1280);
      roadGraphics.fillRect(lx + laneWidth / 2, 200, 8, 1280);

      // Double yellow lines in lane center
      roadGraphics.fillStyle(0xebaf25, 0.75);
      roadGraphics.fillRect(lx - 4, 200, 3, 1280);
      roadGraphics.fillRect(lx + 2, 200, 3, 1280);

      // Lane tag header
      this.add.text(lx, 215, `LÀN ${i + 1} (${i === 0 ? 'ALPHA' : i === 1 ? 'BRAVO' : 'CHARLIE'})`, {
        fontFamily: 'Arial Black',
        fontSize: '13px',
        color: '#00f5d4',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setDepth(5);
    }

    // Asphalt cracks & scorch marks
    const decals = this.add.graphics();
    decals.lineStyle(2, 0x12141a, 0.8);
    decals.beginPath();
    decals.moveTo(240, 600); decals.lineTo(280, 630); decals.lineTo(310, 615);
    decals.moveTo(520, 850); decals.lineTo(560, 880); decals.lineTo(600, 865);
    decals.moveTo(800, 720); decals.lineTo(840, 745); decals.lineTo(880, 730);
    decals.strokePath();

    decals.fillStyle(0x13151b, 0.7);
    decals.fillEllipse(540, 920, 80, 40);
    decals.fillEllipse(260, 1080, 60, 30);
    decals.fillEllipse(820, 1140, 65, 35);

    // 3. Fortress Defense Compound (y: 1280 to 1620)
    // Front barricades across lanes at y: 1300
    for (let i = 0; i < 3; i++) {
      const lx = lanes[i];
      const bar1 = this.add.image(lx - 60, 1310, 'barricade_barrier').setScale(0.85).setDepth(3);
      const bar2 = this.add.image(lx + 60, 1310, 'barricade_barrier').setScale(0.85).setDepth(3);

      // Sandbags
      this.add.image(lx - 45, 1335, 'sandbags').setScale(0.9).setDepth(4);
      this.add.image(lx + 45, 1335, 'sandbags').setScale(0.9).setDepth(4);

      // Ammo Crates
      this.add.image(lx - 90, 1345, 'ammo_crate').setScale(0.75).setDepth(4);
      this.add.image(lx + 90, 1345, 'ammo_crate').setScale(0.75).setDepth(4);
    }

    // 4. Main Fortress Concrete Wall (at y: 1470 to 1540 across full width)
    this.baseWallGraphics = this.add.graphics().setDepth(5);
    this.drawFortressWall(10000, 10000);

    // Central Heavy Blast Gate (at x: 540, y: 1485)
    const blastGate = this.add.graphics().setDepth(6);
    blastGate.fillStyle(0x1a2130, 1);
    blastGate.fillRoundedRect(540 - 70, 1470, 140, 40, 8);
    blastGate.lineStyle(2, 0xfee440, 1);
    blastGate.strokeRoundedRect(540 - 70, 1470, 140, 40, 8);

    const gateTitle = this.add.text(540, 1490, '⚡ CỔNG THÀNH TRÌ ⚡', {
      fontFamily: 'Arial Black',
      fontSize: '11px',
      color: '#fee440',
    }).setOrigin(0.5).setDepth(7);

    // 5. High-power Defense Spotlights (Illuminating 3 lanes upward)
    const spotlights = this.add.graphics().setDepth(2);
    for (let i = 0; i < 3; i++) {
      const lx = lanes[i];
      spotlights.fillStyle(0xffe89e, 0.09);
      spotlights.fillTriangle(lx, 1440, lx - 110, 400, lx + 110, 400);
    }
    spotlights.setBlendMode(Phaser.BlendModes.ADD);

    // 6. Rear Squad Staging Platform (y: 1540 to 1750)
    const staging = this.add.graphics().setDepth(2);
    staging.fillStyle(0x111622, 0.95);
    staging.fillRoundedRect(40, 1530, width - 80, 220, 16);
    staging.lineStyle(2, 0x00f5d4, 0.6);
    staging.strokeRoundedRect(40, 1530, width - 80, 220, 16);

    this.add.text(width / 2, 1555, '🛡️ KHU VỰC TẬP KẾT QUÂN ĐỘI & TUYẾN PHÒNG THỦ CHÍNH', {
      fontFamily: 'Arial Black',
      fontSize: '15px',
      color: '#00f5d4',
    }).setOrigin(0.5).setDepth(3);

    // 7. Dark Perimeter Vignette
    const vignette = this.add.graphics().setDepth(10);
    vignette.fillStyle(0x040609, 0.65);
    vignette.fillRect(0, 0, 130, height);
    vignette.fillRect(width - 130, 0, 130, height);
  }

  private drawFortressWall(hp: number, maxHp: number): void {
    const width = 1080;
    this.baseWallGraphics.clear();

    const ratio = Math.max(0, hp / maxHp);
    const wallColor = ratio > 0.4 ? 0x242a38 : 0x4a1520;
    const borderColor = ratio > 0.4 ? 0x00f5d4 : 0xff0055;

    // Concrete fortress wall body
    this.baseWallGraphics.fillStyle(wallColor, 1);
    this.baseWallGraphics.fillRoundedRect(50, 1460, width - 100, 60, 10);
    this.baseWallGraphics.lineStyle(3, borderColor, 0.9);
    this.baseWallGraphics.strokeRoundedRect(50, 1460, width - 100, 60, 10);

    // Embrasures / crenels along the wall
    this.baseWallGraphics.fillStyle(0x161a24, 1);
    for (let x = 80; x < width - 80; x += 60) {
      this.baseWallGraphics.fillRect(x, 1465, 30, 12);
    }
  }

  private createFortressTurrets(): void {
    const turretPositions = [
      { id: 'turret_alpha', name: 'Ụ Pháo Alpha', type: 'machinegun' as const, x: 260, y: 1450, level: 1 },
      { id: 'turret_bravo', name: 'Ụ Pháo Bravo', type: 'plasma' as const, x: 540, y: 1430, level: 1 },
      { id: 'turret_charlie', name: 'Ụ Pháo Charlie', type: 'tesla' as const, x: 820, y: 1450, level: 1 },
    ];

    for (const t of turretPositions) {
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

    // 1. Squad Soldiers fire at closest zombies in their lanes
    const shootersCount = Math.min(3, allSoldiers.length);
    for (let i = 0; i < shootersCount; i++) {
      const soldier = allSoldiers[Phaser.Math.Between(0, allSoldiers.length - 1)];
      const target = this.getClosestZombie(soldier.getX(), soldier.getY());
      if (target) {
        soldier.aimAt(target.getX(), target.getY());
        const { flashX, flashY } = soldier.fireMuzzleFlash();

        // Projectile flight
        this.projectilePool.fireTracer(flashX, flashY, target.getX(), target.getY(), 160);

        this.time.delayedCall(160, () => {
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

    // 2. Turrets fire dual supporting burst
    for (const turret of this.towers.values()) {
      const target = this.getClosestZombie(turret.getX(), turret.getY());
      if (target) {
        turret.aimAt(target.getX(), target.getY());
        const { flashX, flashY } = turret.fireMuzzleFlash();

        this.projectilePool.fireTracer(flashX, flashY, target.getX(), target.getY(), 140);
        this.time.delayedCall(140, () => {
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

    // 2. Check Base HP Reaction
    if (snapshot.baseHp < this.lastBaseHp) {
      this.triggerBaseHitReaction();
    }
    this.lastBaseHp = snapshot.baseHp;
    this.drawFortressWall(snapshot.baseHp, snapshot.maxBaseHp);

    // 3. Update HUD
    this.hud.update(snapshot);
  }

  private triggerBaseHitReaction(): void {
    // Screen shake + red vignette flash
    this.cameras.main.shake(200, 0.008);

    const hitFlash = this.add.graphics().setDepth(120);
    hitFlash.fillStyle(0xff0033, 0.25);
    hitFlash.fillRect(0, 0, 1080, 1920);

    this.tweens.add({
      targets: hitFlash,
      alpha: 0,
      duration: 300,
      onComplete: () => hitFlash.destroy(),
    });
  }

  // =========================================================================
  // GIFT SKILL VISUAL EFFECT (Airstrike / Orbital Laser)
  // =========================================================================
  public triggerGiftSkillVFX(skillName: string = 'Mưa Tên Lửa'): void {
    this.hud.showGiftAlert(skillName, 'Viewer VIP');

    // Orbital beam strike down the center lane
    const laser = this.add.graphics().setDepth(45);
    laser.fillStyle(0x00f5d4, 0.85);
    laser.fillRect(540 - 25, 200, 50, 1100);
    laser.lineStyle(4, 0xffffff, 1);
    laser.strokeRect(540 - 25, 200, 50, 1100);

    // Screen shockwave
    this.cameras.main.shake(350, 0.012);

    this.tweens.add({
      targets: laser,
      alpha: 0,
      scaleX: 2.5,
      duration: 600,
      ease: 'Cubic.Out',
      onComplete: () => laser.destroy(),
    });

    // Massive explosions along the lane
    for (let y = 350; y <= 1150; y += 180) {
      this.time.delayedCall(Phaser.Math.Between(50, 250), () => {
        const boom = this.add.image(540 + Phaser.Math.Between(-60, 60), y, 'hit_explosion').setScale(2.2).setDepth(48);
        this.time.delayedCall(120, () => boom.destroy());
      });
    }
  }

  // =========================================================================
  // WINDOW AUTOMATION & BENCHMARK API
  // =========================================================================
  private setupWindowBattlefieldAPI(): void {
    (window as any).battlefield = {
      // Spawn 10 Real Walker Zombies in lanes
      spawn10Zombies: () => {
        for (let i = 0; i < 10; i++) {
          const lane = i % 3;
          const lanesX = [260, 540, 820];
          const zSnapshot: ZombieSnapshot = {
            id: `walker_bench_${Date.now()}_${i}`,
            type: 'walker',
            name: `Walker #${i + 1}`,
            x: lanesX[lane] + Phaser.Math.Between(-40, 40),
            y: 350 + i * 70,
            hp: 100,
            maxHp: 100,
            lane: lane + 1,
          };
          const z = new ZombieRenderer(this, zSnapshot, DEFAULT_SCALE_TIER);
          this.zombies.set(zSnapshot.id, z);
        }
      },

      // Spawn 30 Entities (Dense wave)
      spawn30Entities: () => {
        for (let i = 0; i < 20; i++) {
          const lane = i % 3;
          const lanesX = [260, 540, 820];
          const zSnapshot: ZombieSnapshot = {
            id: `walker_swarm_${Date.now()}_${i}`,
            type: 'walker',
            name: `Swarm #${i + 1}`,
            x: lanesX[lane] + Phaser.Math.Between(-55, 55),
            y: 320 + i * 45,
            hp: 100,
            maxHp: 100,
            lane: lane + 1,
          };
          const z = new ZombieRenderer(this, zSnapshot, DEFAULT_SCALE_TIER);
          this.zombies.set(zSnapshot.id, z);
        }
      },

      // Trigger JOIN simulation
      triggerViewerJoin: (viewerName: string = 'HungGamer', squadId: 'alpha' | 'bravo' | 'charlie' = 'bravo') => {
        this.squadVisualizer.handleViewerJoin(squadId, viewerName);
      },

      // Trigger Gift simulation
      triggerGift: (skillName: string = 'Tên Lửa Siêu Thanh') => {
        this.triggerGiftSkillVFX(skillName);
      },

      // Set mock scenario (e.g. 'boss', 'wave1', 'wave3')
      setMockScenario: (sc: any) => {
        if ((this.snapshotSource as any)?.setScenario) {
          (this.snapshotSource as any).setScenario(sc);
        }
      },

      // Toggle TikTok Safe Zone Overlay
      toggleTikTokSafeZone: () => {
        return this.tiktokSafeZone.toggle();
      },

      // Metrics
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
