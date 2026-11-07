import Phaser from 'phaser';
import { SpriteAssetLoader } from '../../assets/SpriteAssetLoader.js';
import { CharacterAnimationRegistry } from '../../assets/CharacterAnimationRegistry.js';
import { CharacterRenderer } from '../../entities/CharacterRenderer.js';
import { SPRITE_SCALE_PRESETS, ScalePreset, DEFAULT_SCALE_PRESET } from '../../config/SpriteScaleConfig.js';

export class QualityLabScene extends Phaser.Scene {
  private walker!: CharacterRenderer;
  private survivor!: CharacterRenderer;
  private currentScalePreset: ScalePreset = DEFAULT_SCALE_PRESET;

  // Turret components
  private turretContainer!: Phaser.GameObjects.Container;
  private turretGun!: Phaser.GameObjects.Image;

  // UI status
  private statusText!: Phaser.GameObjects.Text;
  private scaleInfoText!: Phaser.GameObjects.Text;
  private benchmarkText!: Phaser.GameObjects.Text;

  // Benchmarking
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

    // 1. Draw Battlefield Environment (Atmospheric Night Defense Highway)
    this.createAtmosphericEnvironment();

    // 2. Spawn Sentry Turret
    this.createSentryTurret(680, 1150);

    // 3. Spawn Survivor Soldier (Behind barricade)
    this.survivor = new CharacterRenderer(
      this,
      540,
      1380,
      'survivor',
      'Đặc Nhiệm (Survivor)',
      this.currentScalePreset
    );
    // Face upwards/leftwards towards advancing zombie
    this.survivor.setRotation(-Math.PI / 2);

    // 4. Spawn Walker Zombie (Advancing down the asphalt highway)
    this.walker = new CharacterRenderer(
      this,
      540,
      680,
      'walker',
      'Zombie Walker (Mẫu Thật)',
      this.currentScalePreset
    );
    // Face downwards towards defense line
    this.walker.setRotation(Math.PI / 2);

    // 5. Build Top Lab Header & Dev Controls
    this.buildQualityLabUI();

    // 6. Setup Dom Event listener for external buttons
    this.setupDevControls();
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

    if (this.benchmarkText) {
      const p95 = this.calculateP95FrameTime();
      this.benchmarkText.setText(`FPS: ${fps} | FrameTime: ${delta.toFixed(1)}ms (p95: ${p95.toFixed(1)}ms)`);
    }

    // Aim turret at zombie if alive
    if (this.walker && !this.walker.isDead) {
      const angle = Phaser.Math.Angle.Between(
        this.turretContainer.x,
        this.turretContainer.y,
        this.walker.container.x,
        this.walker.container.y
      );
      // Turret sprite faces right (0 rad), so angle is directly applied
      this.turretGun.setRotation(angle);

      // Survivor aims at zombie
      const survAngle = Phaser.Math.Angle.Between(
        this.survivor.container.x,
        this.survivor.container.y,
        this.walker.container.x,
        this.walker.container.y
      );
      this.survivor.setRotation(survAngle);
    }
  }

  private createAtmosphericEnvironment(): void {
    const width = 1080;
    const height = 1920;

    // Dark asphalt road background
    const bg = this.add.graphics();
    bg.fillStyle(0x181a1f, 1);
    bg.fillRect(0, 0, width, height);

    // Asphalt highway segment (width 600, centered)
    const roadX = 240;
    const roadW = 600;
    const road = this.add.graphics();
    road.fillStyle(0x282c34, 1);
    road.fillRect(roadX, 0, roadW, height);

    // Road side curbs (concrete edges)
    road.fillStyle(0x3e4451, 1);
    road.fillRect(roadX - 16, 0, 16, height);
    road.fillRect(roadX + roadW, 0, 16, height);

    // Double yellow lines in the middle
    const yellowStripe = this.add.graphics();
    yellowStripe.fillStyle(0xe5c07b, 0.85);
    yellowStripe.fillRect(width / 2 - 8, 0, 5, height);
    yellowStripe.fillRect(width / 2 + 3, 0, 5, height);

    // Cracked asphalt decals
    const cracks = this.add.graphics();
    cracks.lineStyle(2, 0x14161a, 0.7);
    cracks.beginPath();
    cracks.moveTo(420, 800);
    cracks.lineTo(460, 830);
    cracks.lineTo(490, 820);
    cracks.lineTo(530, 860);
    cracks.strokePath();

    // Defense Barricade Line (at y: 1200 - 1240)
    // 1. Sandbags & barriers
    for (let x = 320; x <= 760; x += 110) {
      const barrier = this.add.image(x, 1220, 'barricade_barrier');
      barrier.setScale(0.85);
      barrier.setDepth(2);
    }

    // 2. Sandbags layer
    const sandbags1 = this.add.image(300, 1260, 'sandbags').setScale(0.9).setDepth(3);
    const sandbags2 = this.add.image(780, 1260, 'sandbags').setScale(0.9).setDepth(3);

    // 3. Military ammo crates
    const crate1 = this.add.image(380, 1280, 'ammo_crate').setScale(0.8).setDepth(3);
    const crate2 = this.add.image(700, 1280, 'ammo_crate').setScale(0.8).setDepth(3);

    // Spotlights / Floodlights illumination cones (Night atmosphere matching user reference photo 1 & 3)
    const floodlight = this.add.graphics();
    floodlight.fillStyle(0xfff3b0, 0.08);
    floodlight.fillTriangle(150, 1500, 400, 750, 680, 750);
    floodlight.fillStyle(0xfff3b0, 0.12);
    floodlight.fillTriangle(930, 1500, 450, 750, 720, 750);
    floodlight.setBlendMode(Phaser.BlendModes.ADD);

    // Dark ambient vignette around perimeter
    const vignette = this.add.graphics();
    vignette.fillStyle(0x05070a, 0.55);
    vignette.fillRect(0, 0, width, 180); // top header zone
    vignette.fillRect(0, 0, roadX - 16, height); // left side
    vignette.fillRect(roadX + roadW + 16, 0, width - (roadX + roadW + 16), height); // right side
    vignette.fillRect(0, 1700, width, 220); // bottom controls
  }

  private createSentryTurret(x: number, y: number): void {
    this.turretContainer = this.add.container(x, y).setDepth(5);

    // Base
    const base = this.add.image(0, 0, 'turret_base').setScale(0.85);

    // Dual-barrel gun
    this.turretGun = this.add.image(0, 0, 'turret_gun_dual').setScale(0.85);
    this.turretGun.setOrigin(0.3, 0.5); // Pivot at turret center

    this.turretContainer.add([base, this.turretGun]);
  }

  private buildQualityLabUI(): void {
    const width = 1080;

    // Header Panel
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0a1128, 0.95);
    headerBg.fillRoundedRect(30, 30, width - 60, 130, 16);
    headerBg.lineStyle(2, 0x00f5d4, 0.85);
    headerBg.strokeRoundedRect(30, 30, width - 60, 130, 16);

    this.add.text(width / 2, 52, '🔬 PHÒNG THÍ NGHIỆM CHẤT LƯỢNG — QUALITY LAB (PHASE 02.2)', {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    this.statusText = this.add.text(width / 2, 88, 'CHẾ ĐỘ MOCK: 1 Walker + 1 Survivor + 1 Turret + Rào Chắn Đêm', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#fee440',
    }).setOrigin(0.5);

    this.scaleInfoText = this.add.text(width / 2, 122, `Độ phóng đại: ${this.currentScalePreset.name} (${this.currentScalePreset.description})`, {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#adb5bd',
    }).setOrigin(0.5);

    // Benchmark HUD
    this.benchmarkText = this.add.text(45, 175, 'FPS: 60 | FrameTime: 16.6ms', {
      fontFamily: 'Courier',
      fontSize: '16px',
      color: '#00f5d4',
      backgroundColor: '#000000bb',
      padding: { x: 8, y: 4 },
    }).setDepth(100);
  }

  private setupDevControls(): void {
    // Expose laboratory actions to window for browser and automated testing
    (window as any).qualityLab = {
      spawnWalker: () => this.actionSpawnWalker(),
      walk: () => this.actionWalk(),
      attack: () => this.actionAttack(),
      shoot: () => this.actionShoot(),
      hit: () => this.actionHit(),
      death: () => this.actionDeath(),
      reset: () => this.actionReset(),
      setScale: (presetId: 'A' | 'B' | 'C') => this.actionSetScale(presetId),
      getStatus: () => ({
        walkerHp: this.walker.hp,
        walkerDead: this.walker.isDead,
        scalePreset: this.currentScalePreset.id,
        actualFps: Math.round(this.game.loop.actualFps),
        p95FrameTime: this.calculateP95FrameTime(),
      }),
    };
  }

  public actionSpawnWalker(): void {
    this.walker.reset(540, 680);
    this.statusText.setText('Đã xuất hiện Zombie Walker (100 HP)');
  }

  public actionWalk(): void {
    this.walker.playState('walk');
    this.survivor.playState('walk');
    this.statusText.setText('Trạng thái: Đang bước đi (Frame-by-frame animation)');
  }

  public actionAttack(): void {
    this.walker.playState('attack');
    this.statusText.setText('Trạng thái: Zombie cào cấu tấn công');
  }

  public actionShoot(): void {
    if (this.walker.isDead) {
      this.actionSpawnWalker();
    }

    // 1. Survivor fires
    this.survivor.playState('shoot');
    this.statusText.setText('Bắn súng: Khai hỏa súng trường + Muzzle flash + Bay đạn');

    // Muzzle flash at gun barrel
    const angle = this.survivor.container.rotation;
    const barrelDist = 48;
    const flashX = this.survivor.container.x + Math.cos(angle) * barrelDist;
    const flashY = this.survivor.container.y + Math.sin(angle) * barrelDist;

    const flash = this.add.image(flashX, flashY, 'muzzle_flash');
    flash.setScale(0.7);
    flash.setRotation(angle);
    flash.setDepth(10);
    this.time.delayedCall(60, () => flash.destroy());

    // 2. Turret recoil & muzzle flash
    this.tweens.add({
      targets: this.turretGun,
      x: '-=10',
      duration: 50,
      yoyo: true,
    });

    // 3. Projectile flight to Walker
    const bullet = this.add.image(flashX, flashY, 'bullet_tracer');
    bullet.setScale(0.85);
    bullet.setRotation(angle);
    bullet.setDepth(9);

    this.tweens.add({
      targets: bullet,
      x: this.walker.container.x,
      y: this.walker.container.y,
      duration: 180,
      ease: 'Linear',
      onComplete: () => {
        bullet.destroy();
        this.triggerBulletImpact();
      },
    });
  }

  private triggerBulletImpact(): void {
    if (this.walker.isDead) return;

    // Hit reaction
    const damage = 35;
    this.walker.takeDamage(damage);

    // Hit impact spark
    const hitFx = this.add.image(this.walker.container.x, this.walker.container.y, 'hit_explosion');
    hitFx.setScale(0.6);
    hitFx.setDepth(10);
    this.time.delayedCall(80, () => hitFx.destroy());

    // Floating damage number
    const dmgText = this.add.text(
      this.walker.container.x + Phaser.Math.Between(-20, 20),
      this.walker.container.y - 30,
      `-${damage}`,
      {
        fontFamily: 'Arial Black',
        fontSize: '26px',
        color: '#ff0055',
        stroke: '#ffffff',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: dmgText,
      y: '-=50',
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => dmgText.destroy(),
    });

    if (this.walker.hp <= 0) {
      this.statusText.setText('Mục tiêu bị tiêu diệt: Xác chết tồn lưu + Vũng máu loang');
    }
  }

  public actionHit(): void {
    this.walker.triggerHitFlash();
    this.survivor.triggerHitFlash();
    this.statusText.setText('Trạng thái: Trúng đạn (Hit flash đỏ + Rung chấn)');
  }

  public actionDeath(): void {
    this.walker.triggerDeath();
    this.statusText.setText('Trạng thái: Chết (Xác chết tồn lưu trên mặt đường)');
  }

  public actionReset(): void {
    this.walker.reset(540, 680);
    this.survivor.reset(540, 1380);
    this.survivor.setRotation(-Math.PI / 2);
    this.walker.setRotation(Math.PI / 2);
    this.statusText.setText('Đã khôi phục vị trí mặc định');
  }

  public actionSetScale(presetId: 'A' | 'B' | 'C'): void {
    this.currentScalePreset = SPRITE_SCALE_PRESETS[presetId];
    this.walker.applyScale(this.currentScalePreset);
    this.survivor.applyScale(this.currentScalePreset);
    this.scaleInfoText.setText(`Độ phóng đại: ${this.currentScalePreset.name} (${this.currentScalePreset.description})`);
    this.statusText.setText(`Đã áp dụng độ phân giải Scale ${presetId} (${this.currentScalePreset.mobileDisplayPx}px preview)`);
  }

  private calculateP95FrameTime(): number {
    if (this.frameTimes.length === 0) return 16.6;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 16.6;
  }
}
