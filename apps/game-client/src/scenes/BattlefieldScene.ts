import Phaser from 'phaser';
import { GameSnapshotSource } from '../sources/GameSnapshotSource.js';
import { ExtendedMatchSnapshot, ZombieSnapshot } from '../types.js';
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

  // Environment & Fortress
  private fortressRenderer!: FortressRenderer;
  private layoutVariant: 'highway' | 'bastion' = 'highway';
  private lastBaseHp: number = 10000;
  private lastBaseHitTime: number = 0;

  // Real-time Firing Simulation Timers
  private fireTimer: number = 0;

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

    const reqLayout = urlParams.get('layout') === '2' ? 'bastion' : 'highway';
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

    // Update Zombies
    for (const zombie of this.zombies.values()) {
      zombie.update(delta);
    }

    // Visual Combat Loop (Purely visual effects, never modifies entity HP on client!)
    this.fireTimer += delta;
    if (this.fireTimer >= 320) {
      this.fireTimer = 0;
      this.simulateVisualCombat();
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

  // Layout B: Fortified Bastion Outpost (Enclosed Military Courtyard Plaza - No Highway!)
  private createBastionMap(): void {
    const width = 1080;
    const height = 1920;

    // Dark barren wasteland terrain surrounding the citadel
    const ground = this.add.graphics().setDepth(0);
    ground.fillStyle(0x080b10, 1);
    ground.fillRect(0, 0, width, height);

    // Central Bastion Courtyard Staging Plaza (Stone & Reinforced Slabs)
    const plaza = this.add.graphics().setDepth(2);
    plaza.fillStyle(0x161c26, 1);
    plaza.fillRect(90, 320, width - 180, 1080);

    // Stone paving joints & grid lines
    plaza.lineStyle(1.5, 0x242e3f, 0.7);
    for (let x = 150; x < width - 150; x += 130) {
      plaza.lineBetween(x, 320, x, 1400);
    }
    for (let y = 350; y < 1400; y += 90) {
      plaza.lineBetween(90, y, width - 90, y);
    }

    // Heavy Fortified Left Rampart (Flank Defense)
    const ramparts = this.add.graphics().setDepth(3);
    ramparts.fillStyle(0x232c3d, 1);
    ramparts.fillRect(30, 300, 110, 1100);
    ramparts.fillRect(width - 140, 300, 110, 1100);

    // Battlements & embrasures on flanking ramparts
    ramparts.fillStyle(0x3a4860, 1);
    for (let y = 320; y < 1380; y += 80) {
      ramparts.fillRect(35, y, 25, 45);
      ramparts.fillRect(width - 60, y, 25, 45);
    }

    // Drop shadows from flank ramparts
    ramparts.fillStyle(0x000000, 0.6);
    ramparts.fillRect(140, 300, 20, 1100);
    ramparts.fillRect(width - 160, 300, 20, 1100);

    // 3 Breach Funnels at the top (Alpha: 260, Bravo: 540, Charlie: 820)
    ramparts.fillStyle(0xd97706, 0.85); // Hazard caution bars at breaches
    ramparts.fillRect(210, 330, 100, 12);
    ramparts.fillRect(490, 330, 100, 12);
    ramparts.fillRect(770, 330, 100, 12);

    // Bastion Courtyard Barricades & Forward Redoubts
    const bastionLanes = [260, 540, 820];
    for (const bx of bastionLanes) {
      this.add.image(bx - 65, 1210, 'fortress_sandbags').setScale(1.0).setDepth(8);
      this.add.image(bx + 65, 1210, 'fortress_sandbags').setScale(1.0).setDepth(8);
      this.add.image(bx, 1180, 'fortress_barricade').setScale(1.0).setDepth(8);
      this.add.image(bx - 120, 1200, 'ammo_crate').setScale(0.9).setDepth(8);
      this.add.image(bx + 120, 1200, 'ammo_crate').setScale(0.9).setDepth(8);
    }

    // Bastion Floodlights illuminating the 3 entry funnels
    const spotlights = this.add.graphics().setDepth(4);
    spotlights.fillStyle(0x38bdf8, 0.09); // Cold tactical cyan lighting
    spotlights.beginPath();
    spotlights.moveTo(260, 1330); spotlights.lineTo(170, 360); spotlights.lineTo(350, 360); spotlights.closePath();
    spotlights.moveTo(540, 1300); spotlights.lineTo(440, 360); spotlights.lineTo(640, 360); spotlights.closePath();
    spotlights.moveTo(820, 1330); spotlights.lineTo(730, 360); spotlights.lineTo(910, 360); spotlights.closePath();
    spotlights.fillPath();
    spotlights.setBlendMode(Phaser.BlendModes.ADD);

    // High-Fidelity Fortress
    this.fortressRenderer = new FortressRenderer(this, 'bastion');

    // Outer darkness vignette
    const vignette = this.add.graphics().setDepth(26);
    vignette.fillStyle(0x040609, 0.8);
    vignette.fillRect(0, 0, 30, height);
    vignette.fillRect(width - 30, 0, 30, height);
  }

  private createFortressTurrets(): void {
    const isBastion = this.layoutVariant === 'bastion';
    const turretPositions = isBastion
      ? [
          { id: 'turret_alpha', name: 'Ụ Pháo Alpha', type: 'machinegun' as const, x: 230, y: 1300, level: 1 },
          { id: 'turret_bravo', name: 'Ụ Pháo Bravo', type: 'plasma' as const, x: 540, y: 1260, level: 1 },
          { id: 'turret_charlie', name: 'Ụ Pháo Charlie', type: 'tesla' as const, x: 850, y: 1300, level: 1 },
        ]
      : [
          { id: 'turret_alpha', name: 'Ụ Pháo Alpha', type: 'machinegun' as const, x: 260, y: 1330, level: 1 },
          { id: 'turret_bravo', name: 'Ụ Pháo Bravo', type: 'plasma' as const, x: 540, y: 1310, level: 1 },
          { id: 'turret_charlie', name: 'Ụ Pháo Charlie', type: 'tesla' as const, x: 820, y: 1330, level: 1 },
        ];

    for (const t of turretPositions) {
      const tower = new TowerRenderer(this, t);
      this.towers.set(t.id, tower);
    }
  }

  // =========================================================================
  // REAL-TIME COMBAT VISUAL SIMULATION (Server Authoritative)
  // NEVER modifies target HP or triggers client death on its own!
  // =========================================================================
  private simulateVisualCombat(): void {
    if (this.zombies.size === 0) return;

    const allSoldiers = this.squadVisualizer.getAllSoldiers();
    const activeZombies = Array.from(this.zombies.values()).filter((z) => !z.isDead);
    if (activeZombies.length === 0) return;

    // 1. Squad Soldiers fire at closest zombies
    const shootersCount = Math.min(3, allSoldiers.length);
    for (let i = 0; i < shootersCount; i++) {
      const soldier = allSoldiers[Phaser.Math.Between(0, allSoldiers.length - 1)];
      const target = this.getClosestZombie(soldier.getX(), soldier.getY());
      if (target) {
        soldier.aimAt(target.getX(), target.getY());
        const { flashX, flashY } = soldier.fireMuzzleFlash();

        // Projectile tracer flight
        this.projectilePool.fireTracer(flashX, flashY, target.getX(), target.getY(), 140);

        this.time.delayedCall(140, () => {
          if (!target.isDead) {
            target.triggerHitFlash();
            const dmg = Phaser.Math.Between(25, 45);
            this.damagePool.showDamage(target.getX(), target.getY(), dmg, dmg > 38);
          }
        });
      }
    }

    // 2. Turrets fire dual bursts at closest zombies
    for (const turret of this.towers.values()) {
      const target = this.getClosestZombie(turret.getX(), turret.getY());
      if (target) {
        turret.aimAt(target.getX(), target.getY());
        const { flashX, flashY } = turret.fireMuzzleFlash();

        this.projectilePool.fireTracer(flashX, flashY, target.getX(), target.getY(), 120);
        this.time.delayedCall(120, () => {
          if (!target.isDead) {
            target.triggerHitFlash();
            this.damagePool.showDamage(target.getX(), target.getY(), 55, true);
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
  // SNAPSHOT SYNCHRONIZATION
  // =========================================================================
  private handleSnapshot(snapshot: ExtendedMatchSnapshot): void {
    // 1. Sync Zombies (100% Real Sprites with authoritative life state)
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
        const renderer = new ZombieRenderer(this, z, DEFAULT_SCALE_TIER, this.debugEntities);
        this.zombies.set(z.id, renderer);
      }
    }

    // 2. Base HP Reaction (Localized only, strictly throttled)
    const now = this.time.now;
    if (snapshot.baseHp < this.lastBaseHp && now - this.lastBaseHitTime > 3000) {
      this.lastBaseHitTime = now;
      this.triggerBaseHitReaction();
    }
    this.lastBaseHp = snapshot.baseHp;
    this.fortressRenderer.updateHp(snapshot.baseHp, snapshot.maxBaseHp);

    // 3. Update HUD
    this.hud.update(snapshot);
  }

  // LOCALIZED BASE HIT REACTION (P0 Fix: Never covers full screen in red!)
  private triggerBaseHitReaction(): void {
    // Localized spark burst and border flicker along wall at y: 1380
    const spark = this.add.graphics().setDepth(35);
    spark.fillStyle(0xff3333, 0.85);
    spark.fillRoundedRect(50, 1380, 1080 - 100, 65, 8);
    spark.lineStyle(4, 0xff0055, 1);
    spark.strokeRoundedRect(50, 1380, 1080 - 100, 65, 8);

    this.cameras.main.shake(150, 0.005);

    this.tweens.add({
      targets: spark,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => spark.destroy(),
    });
  }

  // GIFT SKILL: TÊN LỬA TỔNG LỰC (AIRSTRIKE CRUISE MISSILE)
  private triggerGiftSkillVFX(skillName: string = 'Tên Lửa Tổng Lực'): void {
    this.hud.showGiftAlert(skillName, 'MinhAnh99');

    const targetX = 540;
    const targetY = 750;

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
  // WINDOW AUTOMATION & QA BENCHMARK API
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
            y: 340 + i * 65,
            hp: 100,
            maxHp: 100,
            lane: lane + 1,
          };
          const z = new ZombieRenderer(this, zSnapshot, DEFAULT_SCALE_TIER, this.debugEntities);
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
            y: 300 + i * 45,
            hp: 100,
            maxHp: 100,
            lane: lane + 1,
          };
          const z = new ZombieRenderer(this, zSnapshot, DEFAULT_SCALE_TIER, this.debugEntities);
          this.zombies.set(zSnapshot.id, z);
        }
      },

      spawn50Entities: () => {
        for (let i = 0; i < 40; i++) {
          const lane = i % 3;
          const lanesX = [260, 540, 820];
          const zSnapshot: ZombieSnapshot = {
            id: `walker_horde_${Date.now()}_${i}`,
            type: 'walker',
            name: `Horde #${i + 1}`,
            x: lanesX[lane] + Phaser.Math.Between(-55, 55),
            y: 280 + i * 25,
            hp: 100,
            maxHp: 100,
            lane: lane + 1,
          };
          const z = new ZombieRenderer(this, zSnapshot, DEFAULT_SCALE_TIER, this.debugEntities);
          this.zombies.set(zSnapshot.id, z);
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
        let killedInfo = { killedId: '', aliveCount: 9 };
        if ((this.snapshotSource as any)?.killAuthoritativeZombie) {
          killedInfo = (this.snapshotSource as any).killAuthoritativeZombie(zombieId);
        }
        let target: ZombieRenderer | undefined;
        if (killedInfo.killedId) {
          target = this.zombies.get(killedInfo.killedId);
        } else if (zombieId) {
          target = this.zombies.get(zombieId);
        } else {
          target = Array.from(this.zombies.values()).find((z) => !z.isDead);
        }
        if (target) {
          target.isPermadeath = true;
          target.triggerDeath();
          console.log(`[BATTLEFIELD API] Authoritative Death applied to: ${target.id} | Remaining alive: ${killedInfo.aliveCount}`);
          return { killedId: target.id, aliveCount: killedInfo.aliveCount, success: true };
        }
        return { success: false, message: 'No live zombie found' };
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
}
