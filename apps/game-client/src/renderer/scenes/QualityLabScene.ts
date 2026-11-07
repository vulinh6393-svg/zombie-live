import Phaser from 'phaser';
import { SpriteAssetLoader } from '../../assets/SpriteAssetLoader.js';
import { CharacterAnimationRegistry } from '../../assets/CharacterAnimationRegistry.js';
import { CharacterRenderer } from '../../entities/CharacterRenderer.js';
import { SPRITE_SCALE_TIERS, ScaleTier, DEFAULT_SCALE_TIER } from '../../config/SpriteScaleConfig.js';

export class QualityLabScene extends Phaser.Scene {
  // Primary Units
  private walker!: CharacterRenderer;
  private survivor!: CharacterRenderer;
  private currentScaleTier: ScaleTier = DEFAULT_SCALE_TIER;

  // Turret components
  private turretContainer!: Phaser.GameObjects.Container;
  private turretGun!: Phaser.GameObjects.Image;

  // Swarm benchmark entities (for 20 & 50 entity load tests)
  private swarmEntities: CharacterRenderer[] = [];

  // Visual Environment & Lights
  private bloodDecals: Phaser.GameObjects.Graphics[] = [];

  // Debug HUD elements (only rendered when debug === '1' or /controls)
  private isDebug: boolean = false;
  private debugHeaderContainer?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;
  private scaleInfoText?: Phaser.GameObjects.Text;
  private benchmarkText?: Phaser.GameObjects.Text;

  // Autonomous Combat Loop
  private autoCombatEnabled: boolean = true;
  private autoLoopTimer?: Phaser.Time.TimerEvent;
  private combatStep: 'spawn' | 'advance' | 'combat' | 'death' | 'pause' = 'spawn';

  // Frame benchmarking
  private frameTimes: number[] = [];
  private lastTime: number = 0;

  constructor() {
    super('QualityLabScene');
  }

  preload() {
    SpriteAssetLoader.loadAll(this);
  }

  create() {
    CharacterAnimationRegistry.registerAll(this);

    // Read URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.isDebug = urlParams.get('debug') === '1' || window.location.pathname.includes('/controls');

    const requestedScale = urlParams.get('scale') as '36px' | '44px' | '52px' | null;
    if (requestedScale && SPRITE_SCALE_TIERS[requestedScale]) {
      this.currentScaleTier = SPRITE_SCALE_TIERS[requestedScale];
    }

    // 1. Draw Battlefield Environment (Atmospheric Night Highway Barricade)
    this.createAtmosphericHighwayEnvironment();

    // 2. Spawn Sentry Turret (Behind barricade at x: 690, y: 1140)
    this.createSentryTurret(690, 1140);

    // 3. Spawn Survivor Soldier (Behind barricade at x: 500, y: 1200)
    this.survivor = new CharacterRenderer(
      this,
      500,
      1200,
      'survivor',
      'Survivor (Đặc Nhiệm)',
      this.currentScaleTier
    );
    this.survivor.setRotation(-Math.PI / 2);

    // 4. Spawn Walker Zombie (Advancing down the asphalt highway at x: 540, y: 760)
    this.walker = new CharacterRenderer(
      this,
      540,
      760,
      'walker',
      'Zombie Walker',
      this.currentScaleTier
    );
    this.walker.setRotation(Math.PI / 2);

    // 5. Build Debug HUD only if debug is enabled
    if (this.isDebug) {
      this.buildDebugHUD();
    }

    // 6. Expose automation & dev API to window
    this.setupWindowLabAPI();

    // 7. Start Autonomous Combat Loop
    this.startAutonomousCombatLoop();
  }

  update(time: number, delta: number) {
    // Benchmark tracking
    const fps = Math.round(this.game.loop.actualFps);
    if (this.lastTime > 0) {
      const frameDelta = time - this.lastTime;
      this.frameTimes.push(frameDelta);
      if (this.frameTimes.length > 300) this.frameTimes.shift();
    }
    this.lastTime = time;

    if (this.benchmarkText && this.isDebug) {
      const p95 = this.calculateP95FrameTime();
      this.benchmarkText.setText(`FPS: ${fps} | Delta: ${delta.toFixed(1)}ms | p95: ${p95.toFixed(1)}ms`);
    }

    // Dynamic aiming: Turret & Survivor aim at active target
    if (this.walker && !this.walker.isDead) {
      const turretAngle = Phaser.Math.Angle.Between(
        this.turretContainer.x,
        this.turretContainer.y,
        this.walker.container.x,
        this.walker.container.y
      );
      this.turretGun.setRotation(turretAngle);

      const survAngle = Phaser.Math.Angle.Between(
        this.survivor.container.x,
        this.survivor.container.y,
        this.walker.container.x,
        this.walker.container.y
      );
      this.survivor.setRotation(survAngle);
    }
  }

  // =========================================================================
  // ATMOSPHERIC HIGHWAY ENVIRONMENT (Matching User Reference Visuals 1, 2, 3)
  // =========================================================================
  private createAtmosphericHighwayEnvironment(): void {
    const width = 1080;
    const height = 1920;

    // 1. Dark dirt / off-road shoulder foundation
    const ground = this.add.graphics();
    ground.fillStyle(0x0e1117, 1);
    ground.fillRect(0, 0, width, height);

    // Subtle off-road terrain noise / patches
    ground.fillStyle(0x161a22, 0.6);
    for (let i = 0; i < 40; i++) {
      const rx = Phaser.Math.Between(0, width);
      const ry = Phaser.Math.Between(0, height);
      ground.fillCircle(rx, ry, Phaser.Math.Between(15, 60));
    }

    // 2. Asphalt Highway (Centered, width 640px from x: 220 to 860)
    const roadX = 220;
    const roadW = 640;
    const road = this.add.graphics();
    road.fillStyle(0x21252d, 1);
    road.fillRect(roadX, 0, roadW, height);

    // Concrete curbs
    road.fillStyle(0x3a3f4b, 1);
    road.fillRect(roadX - 18, 0, 18, height);
    road.fillRect(roadX + roadW, 0, 18, height);

    // White edge boundary lines
    road.fillStyle(0xffffff, 0.4);
    road.fillRect(roadX + 10, 0, 4, height);
    road.fillRect(roadX + roadW - 14, 0, 4, height);

    // Double solid yellow highway lines (Reference 3)
    const yellowStripe = this.add.graphics();
    yellowStripe.fillStyle(0xebaf25, 0.85);
    yellowStripe.fillRect(width / 2 - 8, 0, 6, height);
    yellowStripe.fillRect(width / 2 + 3, 0, 6, height);

    // Cracked asphalt & road wear decals (Reference 1 & 3)
    const cracks = this.add.graphics();
    cracks.lineStyle(2, 0x12141a, 0.8);
    // Crack 1
    cracks.beginPath();
    cracks.moveTo(380, 840);
    cracks.lineTo(430, 870);
    cracks.lineTo(470, 855);
    cracks.lineTo(510, 900);
    cracks.strokePath();
    // Crack 2
    cracks.beginPath();
    cracks.moveTo(620, 1010);
    cracks.lineTo(660, 1035);
    cracks.lineTo(700, 1020);
    cracks.strokePath();

    // Oil spill / scorch marks
    const scorch = this.add.graphics();
    scorch.fillStyle(0x13151b, 0.7);
    scorch.fillEllipse(540, 940, 90, 45);
    scorch.fillEllipse(440, 1100, 65, 30);

    // 3. Defense Barricade Line (at y: 1120 - 1160 across the road)
    // Wooden / metal traffic barriers
    for (let x = 300; x <= 780; x += 120) {
      const barrier = this.add.image(x, 1140, 'barricade_barrier');
      barrier.setScale(0.9);
      barrier.setDepth(2);
    }

    // Heavy Sandbag fortification layer
    const sandbagsLeft = this.add.image(280, 1170, 'sandbags').setScale(0.95).setDepth(3);
    const sandbagsMid = this.add.image(580, 1170, 'sandbags').setScale(0.95).setDepth(3);
    const sandbagsRight = this.add.image(800, 1170, 'sandbags').setScale(0.95).setDepth(3);

    // Military Ammo Crates (Reference 2)
    const crate1 = this.add.image(360, 1195, 'ammo_crate').setScale(0.85).setDepth(4);
    const crate2 = this.add.image(420, 1205, 'ammo_crate').setScale(0.8).setDepth(4);
    const crate3 = this.add.image(760, 1195, 'ammo_crate').setScale(0.85).setDepth(4);

    // 4. Dramatic Night Spotlights & Floodlight Illumination (Reference 1 & 3)
    // High-power floodlights casting warm beam onto the defensive line and combat zone
    const floodlightLeft = this.add.graphics();
    floodlightLeft.fillStyle(0xffe6a3, 0.12);
    floodlightLeft.fillTriangle(140, 1420, 360, 780, 720, 780);
    floodlightLeft.setBlendMode(Phaser.BlendModes.ADD);

    const floodlightRight = this.add.graphics();
    floodlightRight.fillStyle(0xffe6a3, 0.14);
    floodlightRight.fillTriangle(940, 1420, 360, 800, 720, 800);
    floodlightRight.setBlendMode(Phaser.BlendModes.ADD);

    // Radial combat spotlight focused at x: 540, y: 980
    const combatSpot = this.add.graphics();
    combatSpot.fillStyle(0xfff5d0, 0.08);
    combatSpot.fillCircle(540, 980, 240);
    combatSpot.fillStyle(0xffffff, 0.05);
    combatSpot.fillCircle(540, 1120, 180);
    combatSpot.setBlendMode(Phaser.BlendModes.ADD);

    // 5. Atmospheric Vignette around the edges (keeps eye locked on 9:16 combat area)
    const vignette = this.add.graphics();
    vignette.fillStyle(0x040609, 0.65);
    vignette.fillRect(0, 0, width, 140); // Soft top edge
    vignette.fillRect(0, 0, roadX - 30, height); // Left perimeter
    vignette.fillRect(roadX + roadW + 30, 0, width - (roadX + roadW + 30), height); // Right perimeter
    vignette.fillRect(0, 1750, width, 170); // Bottom perimeter
  }

  // =========================================================================
  // SENTRY TURRET CREATION
  // =========================================================================
  private createSentryTurret(x: number, y: number): void {
    this.turretContainer = this.add.container(x, y).setDepth(5);

    // Turret heavy base
    const base = this.add.image(0, 0, 'turret_base').setScale(0.85);

    // Turret dual-barrel machine gun
    this.turretGun = this.add.image(0, 0, 'turret_gun_dual').setScale(0.85);
    this.turretGun.setOrigin(0.3, 0.5); // Pivot at gun turret center

    this.turretContainer.add([base, this.turretGun]);
  }

  // =========================================================================
  // AUTONOMOUS COMBAT DEMONSTRATION LOOP
  // =========================================================================
  public startAutonomousCombatLoop(): void {
    this.autoCombatEnabled = true;
    this.combatStep = 'spawn';
    this.scheduleNextCombatPhase(300);
  }

  public pauseAutonomousCombatLoop(): void {
    this.autoCombatEnabled = false;
    if (this.autoLoopTimer) {
      this.autoLoopTimer.remove(false);
    }
  }

  private scheduleNextCombatPhase(delayMs: number): void {
    if (!this.autoCombatEnabled) return;
    this.autoLoopTimer = this.time.delayedCall(delayMs, () => {
      this.executeAutonomousCycleStep();
    });
  }

  private executeAutonomousCycleStep(): void {
    if (!this.autoCombatEnabled) return;

    switch (this.combatStep) {
      case 'spawn': {
        // Clear previous blood decals
        this.clearOldBloodDecals();

        // Respawn walker at road top
        this.walker.reset(540, 760);
        this.walker.setRotation(Math.PI / 2);
        this.survivor.playState('idle');

        this.combatStep = 'advance';
        this.scheduleNextCombatPhase(400);
        break;
      }

      case 'advance': {
        // Walker walks down towards defense line
        this.walker.playState('walk');
        this.tweens.add({
          targets: this.walker.container,
          y: 960,
          duration: 2200,
          ease: 'Linear',
          onComplete: () => {
            if (this.autoCombatEnabled) {
              this.combatStep = 'combat';
              this.executeAutonomousCycleStep();
            }
          },
        });
        break;
      }

      case 'combat': {
        // Firing sequence: 3 lethal bursts spaced 700ms apart
        this.walker.playState('idle');
        this.executeCombatBurst(1, () => {
          this.executeCombatBurst(2, () => {
            this.executeCombatBurst(3, () => {
              this.combatStep = 'death';
              this.scheduleNextCombatPhase(2500);
            });
          });
        });
        break;
      }

      case 'death': {
        // Walker is dead and lying in blood puddle.
        // Survivor scans, Turret returns to scanning angle
        this.survivor.playState('idle');
        this.tweens.add({
          targets: this.turretGun,
          rotation: -Math.PI / 2 + 0.3,
          duration: 800,
          yoyo: true,
          repeat: 1,
        });

        this.combatStep = 'pause';
        this.scheduleNextCombatPhase(3000);
        break;
      }

      case 'pause': {
        // Restart cycle
        this.combatStep = 'spawn';
        this.scheduleNextCombatPhase(500);
        break;
      }
    }
  }

  private executeCombatBurst(shotNum: number, onDone: () => void): void {
    if (!this.autoCombatEnabled && !this.walker) return;

    // 1. Survivor fires rifle
    this.survivor.playState('shoot');

    // Muzzle flash at rifle tip
    const survAngle = this.survivor.getRotation();
    const barrelDist = 55;
    const flashX = this.survivor.container.x + Math.cos(survAngle) * barrelDist;
    const flashY = this.survivor.container.y + Math.sin(survAngle) * barrelDist;

    const flash = this.add.image(flashX, flashY, 'muzzle_flash').setScale(0.85).setRotation(survAngle).setDepth(15);
    this.time.delayedCall(70, () => flash.destroy());

    // 2. Turret fires dual tracer supporting burst
    this.tweens.add({
      targets: this.turretGun,
      scaleX: 0.78,
      duration: 50,
      yoyo: true,
    });

    const turretAngle = this.turretGun.rotation;
    const turretFlashX = this.turretContainer.x + Math.cos(turretAngle) * 45;
    const turretFlashY = this.turretContainer.y + Math.sin(turretAngle) * 45;
    const turretFlash = this.add.image(turretFlashX, turretFlashY, 'muzzle_flash').setScale(0.7).setRotation(turretAngle).setDepth(15);
    this.time.delayedCall(60, () => turretFlash.destroy());

    // 3. Bullet tracer flies from survivor rifle to Walker
    const tracer = this.add.image(flashX, flashY, 'bullet_tracer').setScale(0.9).setRotation(survAngle).setDepth(12);

    this.tweens.add({
      targets: tracer,
      x: this.walker.container.x,
      y: this.walker.container.y,
      duration: 140,
      ease: 'Linear',
      onComplete: () => {
        tracer.destroy();
        this.applyBulletHit(shotNum === 3 ? 40 : 35);
        this.time.delayedCall(600, onDone);
      },
    });
  }

  private applyBulletHit(damage: number): void {
    if (!this.walker || this.walker.isDead) return;

    // Apply damage and hit flash
    this.walker.takeDamage(damage);

    // Hit explosion VFX spark
    const hitFx = this.add.image(this.walker.container.x, this.walker.container.y, 'hit_explosion').setScale(0.75).setDepth(14);
    this.time.delayedCall(90, () => hitFx.destroy());

    // Floating damage numbers
    const dmgText = this.add.text(
      this.walker.container.x + Phaser.Math.Between(-25, 25),
      this.walker.container.y - 45,
      `-${damage}`,
      {
        fontFamily: 'Arial Black',
        fontSize: '28px',
        color: '#ff1744',
        stroke: '#ffffff',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: dmgText,
      y: '-=60',
      alpha: 0,
      duration: 750,
      ease: 'Cubic.Out',
      onComplete: () => dmgText.destroy(),
    });

    // If Walker died on this shot
    if (this.walker.hp <= 0) {
      this.recordCorpseBloodDecal(this.walker.container.x, this.walker.container.y);

      // Float kill confirmation text
      const killText = this.add.text(
        this.walker.container.x,
        this.walker.container.y - 85,
        '+50 EXP (TIÊU DIỆT)',
        {
          fontFamily: 'Arial Black',
          fontSize: '22px',
          color: '#00f5d4',
          stroke: '#000000',
          strokeThickness: 3,
        }
      ).setOrigin(0.5).setDepth(26);

      this.tweens.add({
        targets: killText,
        y: '-=45',
        alpha: 0,
        delay: 500,
        duration: 900,
        ease: 'Cubic.Out',
        onComplete: () => killText.destroy(),
      });
    }
  }

  private recordCorpseBloodDecal(x: number, y: number): void {
    const decal = this.add.graphics();
    decal.fillStyle(0x660000, 0.75);
    decal.fillEllipse(x, y + 10, 60, 40);
    decal.fillStyle(0x3d0000, 0.9);
    decal.fillCircle(x + 8, y + 12, 22);
    decal.setDepth(1);
    this.bloodDecals.push(decal);
  }

  private clearOldBloodDecals(): void {
    for (const d of this.bloodDecals) {
      d.destroy();
    }
    this.bloodDecals = [];
  }

  // =========================================================================
  // DEBUG HUD (Rendered ONLY if ?debug=1 or /controls)
  // =========================================================================
  private buildDebugHUD(): void {
    const width = 1080;
    this.debugHeaderContainer = this.add.container(0, 0).setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1128, 0.92);
    bg.fillRoundedRect(30, 25, width - 60, 115, 14);
    bg.lineStyle(2, 0x00f5d4, 0.8);
    bg.strokeRoundedRect(30, 25, width - 60, 115, 14);

    const title = this.add.text(width / 2, 45, '🔬 QUALITY LAB — VISUAL PRESENTATION & SCALE CALIBRATION', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width / 2, 75, 'Chế độ: Tự động chạy kịch bản chiến đấu (Walk -> Aim -> Shoot -> Death)', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#fee440',
    }).setOrigin(0.5);

    this.scaleInfoText = this.add.text(width / 2, 105, `Độ phóng đại: ${this.currentScaleTier.name}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#adb5bd',
    }).setOrigin(0.5);

    this.benchmarkText = this.add.text(45, 150, 'FPS: 60 | Delta: 16.6ms', {
      fontFamily: 'Courier',
      fontSize: '15px',
      color: '#00f5d4',
      backgroundColor: '#000000bb',
      padding: { x: 8, y: 4 },
    });

    this.debugHeaderContainer.add([bg, title, this.statusText, this.scaleInfoText, this.benchmarkText]);
  }

  // =========================================================================
  // PUBLIC LAB API & MULTI-TIER BENCHMARK SUITE
  // =========================================================================
  private setupWindowLabAPI(): void {
    (window as any).qualityLab = {
      // Manual Action Triggers
      walk: () => {
        this.pauseAutonomousCombatLoop();
        this.walker.playState('walk');
        this.survivor.playState('walk');
        if (this.statusText) this.statusText.setText('Hành động: Walk animation đang chạy');
      },
      shoot: () => {
        this.pauseAutonomousCombatLoop();
        this.executeCombatBurst(1, () => {});
        if (this.statusText) this.statusText.setText('Hành động: Bắn súng + Muzzle Flash + Tracer');
      },
      hit: () => {
        this.pauseAutonomousCombatLoop();
        this.walker.triggerHitFlash();
        this.survivor.triggerHitFlash();
      },
      death: () => {
        this.pauseAutonomousCombatLoop();
        this.walker.triggerDeath();
        this.recordCorpseBloodDecal(this.walker.container.x, this.walker.container.y);
      },
      reset: () => {
        this.clearOldBloodDecals();
        this.walker.reset(540, 760);
        this.survivor.reset(500, 1200);
        this.startAutonomousCombatLoop();
      },
      pauseAutoLoop: () => this.pauseAutonomousCombatLoop(),
      resumeAutoLoop: () => this.startAutonomousCombatLoop(),

      // Scale Calibration
      setScale: (tierId: '36px' | '44px' | '52px') => {
        if (SPRITE_SCALE_TIERS[tierId]) {
          this.currentScaleTier = SPRITE_SCALE_TIERS[tierId];
          this.walker.applyScale(this.currentScaleTier);
          this.survivor.applyScale(this.currentScaleTier);
          for (const ent of this.swarmEntities) {
            ent.applyScale(this.currentScaleTier);
          }
          if (this.scaleInfoText) {
            this.scaleInfoText.setText(`Độ phóng đại: ${this.currentScaleTier.name}`);
          }
        }
      },

      // Multi-tier GPU Swarm Benchmark (1, 20, 50 entities)
      setBenchmarkEntities: (count: number) => {
        this.pauseAutonomousCombatLoop();
        // Clear existing swarm
        for (const ent of this.swarmEntities) {
          ent.destroy();
        }
        this.swarmEntities = [];

        if (count <= 1) {
          this.walker.container.setVisible(true);
          this.walker.reset(540, 960);
          return;
        }

        this.walker.container.setVisible(false);

        // Spawn swarm across the highway
        for (let i = 0; i < count; i++) {
          const x = Phaser.Math.Between(260, 820);
          const y = Phaser.Math.Between(600, 1050);
          const zombie = new CharacterRenderer(
            this,
            x,
            y,
            'walker',
            `Walker #${i + 1}`,
            this.currentScaleTier
          );
          zombie.setRotation(Math.PI / 2);
          zombie.playState('walk');
          this.swarmEntities.push(zombie);
        }
      },

      getStatus: () => ({
        scaleTier: this.currentScaleTier.id,
        actualFps: Math.round(this.game.loop.actualFps),
        p95FrameTime: this.calculateP95FrameTime(),
        walkerHp: this.walker.hp,
        walkerDead: this.walker.isDead,
        autoLoopRunning: this.autoCombatEnabled,
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
