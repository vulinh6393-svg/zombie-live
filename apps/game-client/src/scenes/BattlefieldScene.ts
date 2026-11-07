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
import { SpriteAssetLoader } from '../assets/SpriteAssetLoader.js';
import { CharacterAnimationRegistry } from '../assets/CharacterAnimationRegistry.js';
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
  private baseWallGraphics!: Phaser.GameObjects.Graphics;
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
  private currentFormationMode: FormationMode = 'B';

  constructor() {
    super({ key: 'BattlefieldScene' });
  }

  init(data: BattlefieldSceneConfig) {
    this.snapshotSource = data.snapshotSource;
    this.isOverlayMode = !!data.isOverlayMode;
  }

  preload() {
    SpriteAssetLoader.loadAll(this);
  }

  create() {
    CharacterAnimationRegistry.registerAll(this);

    const urlParams = new URLSearchParams(window.location.search);
    this.debugEntities = urlParams.get('debugEntities') === '1' || urlParams.get('debug') === '1';

    const reqFormation = urlParams.get('formation');
    if (reqFormation === 'A' || reqFormation === 'B' || reqFormation === 'C') {
      this.currentFormationMode = reqFormation;
    }

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

    // 7. Telemetry HUD (Development mode only)
    if (!this.isOverlayMode) {
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
  // 9:16 HIGHWAY BATTLEFIELD & ARCHITECTURAL FORTRESS REDESIGN
  // =========================================================================
  private createBattlefieldMap(): void {
    const width = 1080;
    const height = 1920;

    // 1. Dark dirt ground background (Depth 0)
    const ground = this.add.graphics().setDepth(0);
    ground.fillStyle(0x0c0f15, 1);
    ground.fillRect(0, 0, width, height);

    // 2. Wide Asphalt Highway Bed (Center 800px width from x: 140 to 940, y: 220 to 1340)
    const roadX = 140;
    const roadW = 800;
    const roadGraphics = this.add.graphics().setDepth(2);

    // Dark asphalt texture
    roadGraphics.fillStyle(0x181c24, 1);
    roadGraphics.fillRect(roadX, 220, roadW, 1120);

    // Concrete shoulders & curbs
    roadGraphics.fillStyle(0x2a2f3a, 1);
    roadGraphics.fillRect(roadX - 16, 220, 16, 1120);
    roadGraphics.fillRect(roadX + roadW, 220, 16, 1120);

    // White outer shoulder line
    roadGraphics.fillStyle(0xffffff, 0.4);
    roadGraphics.fillRect(roadX + 10, 220, 4, 1120);
    roadGraphics.fillRect(roadX + roadW - 14, 220, 4, 1120);

    // 3. Lane Dividers for 3 Tactical Lanes (Left: 260, Center: 540, Right: 820)
    // Double solid yellow center line
    roadGraphics.fillStyle(0xebaf25, 0.9);
    roadGraphics.fillRect(540 - 5, 220, 4, 1080);
    roadGraphics.fillRect(540 + 2, 220, 4, 1080);

    // White dashed dividers between lanes at x: 400 and x: 680
    roadGraphics.fillStyle(0xffffff, 0.5);
    for (let y = 230; y < 1300; y += 70) {
      roadGraphics.fillRect(398, y, 4, 40);
      roadGraphics.fillRect(678, y, 4, 40);
    }

    // Asphalt cracks & oil marks (natural wear)
    const cracks = this.add.graphics().setDepth(3);
    cracks.lineStyle(2, 0x101217, 0.9);
    cracks.beginPath();
    cracks.moveTo(250, 520); cracks.lineTo(290, 550); cracks.lineTo(330, 535);
    cracks.moveTo(510, 740); cracks.lineTo(550, 770); cracks.lineTo(580, 755);
    cracks.moveTo(790, 610); cracks.lineTo(830, 635); cracks.lineTo(870, 620);
    cracks.strokePath();

    cracks.fillStyle(0x111318, 0.7);
    cracks.fillEllipse(540, 830, 95, 45);
    cracks.fillEllipse(260, 970, 70, 32);
    cracks.fillEllipse(820, 1020, 75, 36);

    // 4. Directional Tactical Spotlight Beams (Pointing upwards illuminating incoming zombies)
    const spotlights = this.add.graphics().setDepth(4);
    spotlights.fillStyle(0xffeed1, 0.08);
    // Spotlights emanating from the 3 turret positions towards the horde
    spotlights.beginPath();
    spotlights.moveTo(260, 1370); spotlights.lineTo(150, 500); spotlights.lineTo(370, 500); spotlights.closePath();
    spotlights.moveTo(540, 1350); spotlights.lineTo(410, 450); spotlights.lineTo(670, 450); spotlights.closePath();
    spotlights.moveTo(820, 1370); spotlights.lineTo(710, 500); spotlights.lineTo(930, 500); spotlights.closePath();
    spotlights.fillPath();
    spotlights.setBlendMode(Phaser.BlendModes.ADD);

    // 5. DEFENSE PERIMETER (y: 1220 to 1270)
    // Continuous tactical defensive line: barricades, sandbags & ammo crates
    const laneCenters = [260, 540, 820];
    for (const bx of laneCenters) {
      // Wood/metal traffic barrier horses
      this.add.image(bx - 60, 1235, 'barricade_barrier').setScale(0.9).setDepth(8);
      this.add.image(bx + 60, 1235, 'barricade_barrier').setScale(0.9).setDepth(8);

      // Stacked sandbag fortifications
      this.add.image(bx - 35, 1260, 'sandbags').setScale(1.0).setDepth(9);
      this.add.image(bx + 35, 1260, 'sandbags').setScale(1.0).setDepth(9);

      // Munitions crates
      this.add.image(bx - 95, 1270, 'ammo_crate').setScale(0.85).setDepth(9);
      this.add.image(bx + 95, 1270, 'ammo_crate').setScale(0.85).setDepth(9);
    }

    // 6. MAIN REINFORCED CONCRETE FORTRESS WALL (y: 1380 to 1450)
    this.baseWallGraphics = this.add.graphics().setDepth(20);
    this.drawFortressWall(9850, 10000);

    // 7. CENTRAL HEAVY BLAST GATE (x: 540, y: 1380 to 1445)
    const blastGate = this.add.graphics().setDepth(21);
    // Heavy steel frame with bevel
    blastGate.fillStyle(0x0e131d, 1);
    blastGate.fillRoundedRect(540 - 90, 1385, 180, 58, 8);
    blastGate.lineStyle(3, 0xfee440, 1);
    blastGate.strokeRoundedRect(540 - 90, 1385, 180, 58, 8);

    // Yellow / Black hazard caution stripes
    blastGate.fillStyle(0xfee440, 0.95);
    for (let gx = 540 - 80; gx <= 540 + 60; gx += 26) {
      blastGate.beginPath();
      blastGate.moveTo(gx, 1438);
      blastGate.lineTo(gx + 14, 1390);
      blastGate.lineTo(gx + 22, 1390);
      blastGate.lineTo(gx + 8, 1438);
      blastGate.fillPath();
    }

    this.add.text(540, 1414, '⚡ CỔNG THÀNH TRÌ #01 ⚡', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#00f5d4',
      backgroundColor: '#0a1128ee',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(23);

    // 8. LOGISTICS, COMMAND DEPOT & STAGING YARD (y: 1450 to 1750)
    const staging = this.add.graphics().setDepth(5);
    // Concrete industrial floor
    staging.fillStyle(0x131722, 0.98);
    staging.fillRoundedRect(35, 1450, width - 70, 240, 12);
    staging.lineStyle(2, 0x334155, 0.8);
    staging.strokeRoundedRect(35, 1450, width - 70, 240, 12);

    // Logistics markings & supply containers
    staging.lineStyle(1.5, 0x00f5d4, 0.4);
    staging.strokeRect(60, 1475, 220, 80);
    staging.strokeRect(width - 280, 1475, 220, 80);

    this.add.text(170, 1515, '📦 KHO TIẾP VẬN ALPHA', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#64748b',
    }).setOrigin(0.5).setDepth(6);

    this.add.text(width - 170, 1515, '📦 KHO TIẾP VẬN CHARLIE', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#64748b',
    }).setOrigin(0.5).setDepth(6);

    this.add.text(width / 2, 1550, '🛡️ SỞ CHỈ HUY & TUYẾN DỰ BỊ THÀNH TRÌ', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#00f5d4',
    }).setOrigin(0.5).setDepth(6);

    // Dark perimeter vignette for focus
    const vignette = this.add.graphics().setDepth(26);
    vignette.fillStyle(0x040609, 0.7);
    vignette.fillRect(0, 0, roadX - 16, height);
    vignette.fillRect(roadX + roadW + 16, 0, width - (roadX + roadW + 16), height);
  }

  private drawFortressWall(hp: number, maxHp: number): void {
    const width = 1080;
    this.baseWallGraphics.clear();

    const ratio = Math.max(0, hp / maxHp);
    const wallColor = ratio > 0.4 ? 0x222938 : 0x481822;
    const borderColor = ratio > 0.4 ? 0x00f5d4 : 0xff0055;

    // Concrete drop shadow
    this.baseWallGraphics.fillStyle(0x080b10, 0.85);
    this.baseWallGraphics.fillRect(40, 1445, width - 80, 15);

    // Main wall body (depth 20)
    this.baseWallGraphics.fillStyle(wallColor, 1);
    this.baseWallGraphics.fillRoundedRect(40, 1380, width - 80, 65, 8);
    this.baseWallGraphics.lineStyle(3, borderColor, 0.95);
    this.baseWallGraphics.strokeRoundedRect(40, 1380, width - 80, 65, 8);

    // Wall top edge parapet highlight
    this.baseWallGraphics.fillStyle(0x3e4a62, 1);
    this.baseWallGraphics.fillRect(44, 1382, width - 88, 12);

    // Embrasures / firing ports along wall
    this.baseWallGraphics.fillStyle(0x0e131d, 1);
    for (let x = 70; x < width - 70; x += 65) {
      if (x > 430 && x < 650) continue; // Clear around central blast gate
      this.baseWallGraphics.fillRect(x, 1398, 28, 14);
    }
  }

  private createFortressTurrets(): void {
    const turretPositions = [
      { id: 'turret_alpha', name: 'Ụ Pháo Alpha', type: 'machinegun' as const, x: 260, y: 1400, level: 1 },
      { id: 'turret_bravo', name: 'Ụ Pháo Bravo', type: 'plasma' as const, x: 540, y: 1375, level: 1 },
      { id: 'turret_charlie', name: 'Ụ Pháo Charlie', type: 'tesla' as const, x: 820, y: 1400, level: 1 },
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
    this.drawFortressWall(snapshot.baseHp, snapshot.maxBaseHp);

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

  // GIFT SKILL ORBITAL STRIKE VFX
  private triggerGiftSkillVFX(skillName: string = 'Tên Lửa Tổng Lực'): void {
    this.hud.showGiftAlert(skillName, 'VIP_Gamer99');

    const laser = this.add.graphics().setDepth(45);
    laser.fillStyle(0x00f5d4, 0.85);
    laser.fillRect(540 - 20, 220, 40, 1160);
    laser.fillStyle(0xffffff, 1);
    laser.fillRect(540 - 8, 220, 16, 1160);

    this.cameras.main.shake(300, 0.012);

    this.tweens.add({
      targets: laser,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => laser.destroy(),
    });

    for (let y = 350; y <= 1100; y += 180) {
      this.time.delayedCall(Phaser.Math.Between(40, 200), () => {
        const boom = this.add.image(540 + Phaser.Math.Between(-50, 50), y, 'hit_explosion').setScale(1.8).setDepth(48);
        this.time.delayedCall(100, () => boom.destroy());
      });
    }
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

      setFormationMode: (mode: FormationMode) => {
        this.currentFormationMode = mode;
        this.squadVisualizer.setFormationMode(mode);
        return this.squadVisualizer.generateOverlapReport();
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
        let target: ZombieRenderer | undefined;
        if (zombieId) {
          target = this.zombies.get(zombieId);
        } else {
          target = Array.from(this.zombies.values()).find((z) => !z.isDead);
        }
        if (target) {
          target.isPermadeath = true;
          target.triggerDeath();
          return { killedId: target.id, success: true };
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
