import Phaser from 'phaser';
import { BASTION_GEOMETRY } from '../config/BastionGeometryConfig';
import { BastionCollisionSystem, CollisionResult } from '../systems/BastionCollisionSystem';
import { SpriteAssetLoader } from '../assets/SpriteAssetLoader';
import { CharacterAnimationRegistry } from '../assets/CharacterAnimationRegistry';

interface PhysicalZombie {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  lane: number;
  x: number;
  y: number;
  vy: number;
  hp: number;
  maxHp: number;
  isAttacking: boolean;
  isDead: boolean;
}

export class ArtIntegrationLabScene extends Phaser.Scene {
  // Dynamic Collision System (Real physics calculation)
  private collisionSystem!: BastionCollisionSystem;

  // Architecture GameObjects (Semi-realistic textured sprites)
  private gateFrame!: Phaser.GameObjects.Image;
  private gateDoorLeft!: Phaser.GameObjects.Image;
  private gateDoorRight!: Phaser.GameObjects.Image;
  private wallLeft!: Phaser.GameObjects.Image;
  private wallRight!: Phaser.GameObjects.Image;
  private wallDamageOverlay!: Phaser.GameObjects.Image;
  private ledLight!: Phaser.GameObjects.Arc;

  // Turrets
  private turretBases: Phaser.GameObjects.Image[] = [];
  private turretGuns: Phaser.GameObjects.Image[] = [];
  private muzzleFlashes: Phaser.GameObjects.Image[] = [];

  // Characters (Real multi-frame animations)
  private soldier!: Phaser.GameObjects.Container;
  private soldierSprite!: Phaser.GameObjects.Sprite;
  private zombies: PhysicalZombie[] = [];

  // HUD & Telemetry
  private statusText!: Phaser.GameObjects.Text;
  private stepText!: Phaser.GameObjects.Text;
  private collisionTelemetryText!: Phaser.GameObjects.Text;
  private gateStateText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  // VFX
  private bulletTracers!: Phaser.GameObjects.Graphics;

  private currentPhase = 0;
  private phaseTimer = 0;

  constructor() {
    super({ key: 'ArtIntegrationLabScene' });
  }

  preload() {
    const safeLoad = (key: string, url: string) => {
      if (!this.textures.exists(key)) {
        this.load.image(key, url);
      }
    };

    // 1. Clean Environment Plate & Semi-realistic Textured Assets
    safeLoad('clean_plate', 'assets/concept/bastion_clean_environment.png');
    safeLoad('bastion_wall', 'assets/environment/bastion/bastion_wall_segment.png');
    safeLoad('bastion_gate_frame', 'assets/environment/bastion/bastion_gate_frame.png');
    safeLoad('bastion_door_left', 'assets/environment/bastion/bastion_gate_door_left.png');
    safeLoad('bastion_door_right', 'assets/environment/bastion/bastion_gate_door_right.png');
    safeLoad('bastion_turret_pad', 'assets/environment/bastion/bastion_turret_platform.png');
    safeLoad('wall_damage_overlay', 'assets/environment/bastion/wall_damage_overlay.png');

    // 2. Load all character animation frames (Riley Gombart asset pack) and weapons via SpriteAssetLoader
    SpriteAssetLoader.loadAll(this);
  }

  create() {
    // 1. Register all multi-frame animations into Phaser Animation Manager
    CharacterAnimationRegistry.registerAll(this);

    // 2. Initialize Real Dynamic Collision System
    this.collisionSystem = new BastionCollisionSystem();

    // 3. Clean Environment Background (Depth 1) - Zero baked gates or turrets
    this.add.image(540, 960, 'clean_plate').setDepth(1);

    // 4. Assembly Blast Gate at SSOT Coordinates: (540, 900)
    const bgConfig = BASTION_GEOMETRY.blastGate;
    // Sliding Doors (Depth 6)
    this.gateDoorLeft = this.add.image(bgConfig.doorLeftClosedX, bgConfig.doorsY, 'bastion_door_left').setDepth(6);
    this.gateDoorRight = this.add.image(bgConfig.doorRightClosedX, bgConfig.doorsY, 'bastion_door_right').setDepth(6);

    // Heavy Armored Gate Frame (Depth 7) - Hollow center portal (alpha = 0)
    this.gateFrame = this.add.image(bgConfig.centerX, bgConfig.centerY, 'bastion_gate_frame').setDepth(7);

    // LED Status Indicator on Archway
    this.ledLight = this.add.circle(bgConfig.centerX, bgConfig.centerY - 68, 7, 0xef4444).setDepth(8);

    // 5. Modular Wall Ramparts at SSOT Coordinates: (240, 900) and (840, 900)
    const leftWallCfg = BASTION_GEOMETRY.walls[0];
    const rightWallCfg = BASTION_GEOMETRY.walls[1];
    this.wallLeft = this.add.image(leftWallCfg.centerX, leftWallCfg.centerY, 'bastion_wall').setDepth(7);
    this.wallRight = this.add.image(rightWallCfg.centerX, rightWallCfg.centerY, 'bastion_wall').setDepth(7);

    // Wall Damage Overlay on Left Rampart (Depth 8, starts hidden)
    this.wallDamageOverlay = this.add.image(leftWallCfg.centerX, leftWallCfg.centerY, 'wall_damage_overlay').setDepth(8).setAlpha(0);

    // 6. Three Turret Emplacements at SSOT Coordinates: y=580 (Lanes: 280, 540, 800)
    this.turretBases = [];
    this.turretGuns = [];
    this.muzzleFlashes = [];

    BASTION_GEOMETRY.turrets.forEach((t) => {
      // Hexagonal concrete pad
      this.add.image(t.x, t.y, 'bastion_turret_pad').setDepth(8);

      // Rotating turret base
      const base = this.add.image(t.x, t.y, 'turret_base').setDisplaySize(80, 80).setDepth(9);
      this.turretBases.push(base);

      // Dual gun mount
      const gun = this.add.image(t.x, t.y, 'turret_gun_dual').setOrigin(0.5, 0.7).setDisplaySize(60, 80).setDepth(10);
      this.turretGuns.push(gun);

      // Muzzle flash
      const flash = this.add.image(t.x, t.y - 50, 'muzzle_flash').setDisplaySize(44, 44).setDepth(11).setAlpha(0);
      this.muzzleFlashes.push(flash);
    });

    // 7. Draw Real Collision Boundary Line at y=840
    this.renderCollisionBoundaryOverlay();

    // 8. Spawn Soldier with multi-frame idle animation
    this.spawnSoldier();

    // 9. Spawn Physical Zombies with multi-frame walk animation
    this.spawnPhysicalZombies();

    // 10. Graphics for Bullet Tracers
    this.bulletTracers = this.add.graphics().setDepth(20);

    // 11. Create HUD & Telemetry Display
    this.createDiagnosticHUD();

    // 12. Enter Phase 0
    this.enterPhase(0);
  }

  private renderCollisionBoundaryOverlay() {
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(2, 0xef4444, 0.85);
    g.strokeRect(30, 838, 1020, 4);

    this.add.text(540, 822, '⚡ REAL COLLISION BOUNDARY LINE (y = 840) — ĐƯỢC TÍNH TOÁN BẰNG THUẬT TOÁN HÌNH HỌC', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ef4444',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5).setDepth(6);
  }

  private spawnSoldier() {
    this.soldier = this.add.container(280, 1030).setDepth(11);
    this.soldierSprite = this.add.sprite(0, 0, 'survivor_idle_0');
    this.soldierSprite.setScale(132 / 152); // 132px logic height
    this.soldierSprite.setAngle(-90);
    this.soldierSprite.play('survivor-idle');
    this.soldier.add(this.soldierSprite);

    const badgeBg = this.add.rectangle(0, 36, 160, 22, 0x0f172a, 0.9);
    badgeBg.setStrokeStyle(1.5, 0x10b981);
    const badgeTxt = this.add.text(0, 36, 'SOLDIER ALPHA (132px)', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#10b981',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.soldier.add(badgeBg);
    this.soldier.add(badgeTxt);
  }

  private spawnPhysicalZombies() {
    this.zombies = [];
    const configs = [
      { lane: 0, x: 280, y: 520, vy: 140 },
      { lane: 1, x: 540, y: 480, vy: 140 },
      { lane: 2, x: 800, y: 520, vy: 140 }
    ];

    configs.forEach((cfg) => {
      const container = this.add.container(cfg.x, cfg.y).setDepth(12);
      const sprite = this.add.sprite(0, 0, 'zombie_move_0');
      sprite.setScale(132 / 196); // 132px logic height
      sprite.setAngle(90);
      sprite.play('walker-walk');
      container.add(sprite);

      // HP Bar
      const hpBg = this.add.rectangle(0, -32, 50, 7, 0x000000, 0.85);
      const hpFill = this.add.rectangle(-25, -32, 50, 7, 0xef4444).setOrigin(0, 0.5);
      container.add(hpBg);
      container.add(hpFill);

      this.zombies.push({
        container,
        sprite,
        hpBg,
        hpFill,
        lane: cfg.lane,
        x: cfg.x,
        y: cfg.y,
        vy: cfg.vy,
        hp: 100,
        maxHp: 100,
        isAttacking: false,
        isDead: false
      });
    });
  }

  private createDiagnosticHUD() {
    const topBg = this.add.rectangle(540, 75, 1020, 105, 0x0f172a, 0.95).setDepth(30);
    topBg.setStrokeStyle(2, 0x00ffcc);

    this.add.text(60, 32, '⚡ VERTICAL SLICE PROOF: REAL ANIMATION & DYNAMIC COLLISION', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00ffcc',
    }).setDepth(31);

    this.statusText = this.add.text(60, 64, 'Pha: 1. CỔNG ĐÓNG — REAL COLLISION CHẶN ZOMBIE TẠI y=840', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '15px',
      color: '#38bdf8',
    }).setDepth(31);

    this.stepText = this.add.text(60, 92, 'Cơ chế: Không dùng tween cố định! Vị trí được tính toán bằng BastionCollisionSystem từng frame.', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '12px',
      color: '#94a3b8',
    }).setDepth(31);

    this.timerText = this.add.text(940, 42, '⏱ 01:58', {
      fontFamily: 'monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f59e0b',
    }).setOrigin(0.5).setDepth(31);

    this.gateStateText = this.add.text(940, 72, 'GATE: CLOSED', {
      fontFamily: 'monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ef4444',
    }).setOrigin(0.5).setDepth(31);

    this.collisionTelemetryText = this.add.text(940, 96, 'COLLISION: 0 BLOCKED', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#38bdf8',
    }).setOrigin(0.5).setDepth(31);

    const footBg = this.add.rectangle(540, 1885, 1000, 48, 0x0f172a, 0.92).setDepth(30);
    footBg.setStrokeStyle(1.5, 0x10b981);

    this.add.text(540, 1885, 'Phaser 3.90 WebGL · Dynamic Hitbox System · Riley Gombart Multi-Frame Anims · Concrete & Steel', {
      fontFamily: 'monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#34d399',
    }).setOrigin(0.5).setDepth(31);
  }

  private enterPhase(phase: number) {
    this.currentPhase = phase;
    this.phaseTimer = 0;

    if (phase === 0) {
      // PHA 0: CỔNG ĐÓNG — THUẬT TOÁN VA CHẠM CHẶN ĐỨNG 3 ZOMBIE TẠI y=840
      this.statusText.setText('Pha: 1. CỔNG ĐÓNG — THUẬT TOÁN VA CHẠM CHẶN ĐỨNG CẢ 3 LANE TẠI y=840');
      this.stepText.setText('Cơ chế: Zombie di chuyển bằng vận tốc vy=140px/s; Khi chạm vạch y=840, collisionSystem lập tức chặn đứng!');
      this.gateStateText.setText('GATE: CLOSED').setColor('#ef4444');
      this.ledLight.setFillStyle(0xef4444);
      this.collisionSystem.setGateState('CLOSED');
      this.wallDamageOverlay.setAlpha(0);

      // Reset gate door positions
      this.gateDoorLeft.setX(BASTION_GEOMETRY.blastGate.doorLeftClosedX);
      this.gateDoorRight.setX(BASTION_GEOMETRY.blastGate.doorRightClosedX);
      this.collisionSystem.updateGateDoors(this.gateDoorLeft.x, this.gateDoorRight.x);

      // Reset zombies to spawn
      this.zombies[0].y = 520; this.zombies[0].vy = 140; this.zombies[0].hp = 100; this.zombies[0].isAttacking = false; this.zombies[0].isDead = false;
      this.zombies[1].y = 480; this.zombies[1].vy = 140; this.zombies[1].hp = 100; this.zombies[1].isAttacking = false; this.zombies[1].isDead = false;
      this.zombies[2].y = 520; this.zombies[2].vy = 140; this.zombies[2].hp = 100; this.zombies[2].isAttacking = false; this.zombies[2].isDead = false;
      this.zombies.forEach(z => {
        z.container.setAlpha(1);
        z.sprite.play('walker-walk');
        z.hpBg.setVisible(true);
        z.hpFill.setVisible(true);
        z.hpFill.width = 50;
      });

      // Soldier in front
      this.soldier.setDepth(11);
      this.soldier.setPosition(280, 1030);
      this.soldierSprite.play('survivor-idle');

    } else if (phase === 1) {
      // PHA 1: CỔNG TRƯỢT MỞ — ZOMBIE BRAVO ĐỘT PHÁ QUA HÀNH LANG, ALPHA/CHARLIE VẪN BỊ CHẶN
      this.statusText.setText('Pha: 2. CỔNG TRƯỢT MỞ — ZOMBIE BRAVO ĐỘT PHÁ QUA CỔNG, ALPHA/CHARLIE VẪN BỊ CHẶN!');
      this.stepText.setText('Cơ chế: Cổng mở giải phóng hitbox hành lang [507.5..572.5]; Zombie Bravo tiếp tục tiến; Lính nấp sau tường (Occlusion)');
      this.gateStateText.setText('GATE: OPEN').setColor('#10b981');
      this.ledLight.setFillStyle(0x10b981);
      this.collisionSystem.setGateState('OPEN');

      // Slide open doors dynamically
      this.tweens.add({
        targets: this.gateDoorLeft,
        x: BASTION_GEOMETRY.blastGate.doorLeftOpenX, // 430
        duration: 1000,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          this.collisionSystem.updateGateDoors(this.gateDoorLeft.x, this.gateDoorRight.x);
        }
      });
      this.tweens.add({
        targets: this.gateDoorRight,
        x: BASTION_GEOMETRY.blastGate.doorRightOpenX, // 650
        duration: 1000,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          this.collisionSystem.updateGateDoors(this.gateDoorLeft.x, this.gateDoorRight.x);
        }
      });

      // Zombie Bravo resumes walking forward through open gate!
      this.zombies[1].isAttacking = false;
      this.zombies[1].vy = 120;
      this.zombies[1].sprite.play('walker-walk');

      // Soldier Alpha moves BEHIND wall rampart (Occlusion depth 4 under wall depth 7)
      this.tweens.add({
        targets: this.soldier,
        x: 280,
        y: 860,
        duration: 900,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.soldier.setDepth(4); // Behind wall!
        }
      });

    } else if (phase === 2) {
      // PHA 2: TƯỜNG TRÁI BỊ SÁT THƯƠNG & 3 THÁP PHÁO BẮN TRẢ
      this.statusText.setText('Pha: 3. TƯỜNG TRÁI NHẬN SÁT THƯƠNG (NỨT VỠ) & Ụ PHÁO XOAY BẮN TRẢ');
      this.stepText.setText('Cơ chế: Decal nứt vỡ kích hoạt; 3 Ụ pháo tự động tính góc và chĩa nòng súng vào mục tiêu từng lane.');
      this.ledLight.setFillStyle(0xf59e0b);

      this.cameras.main.shake(200, 0.005);

      // Wall damage overlay fades in
      this.collisionSystem.setWallState('LEFT', 'DAMAGED', 500);
      this.tweens.add({
        targets: this.wallDamageOverlay,
        alpha: 1,
        duration: 300
      });

      // Turrets fire
      this.muzzleFlashes.forEach(flash => {
        this.tweens.add({
          targets: flash,
          alpha: 1,
          yoyo: true,
          repeat: 3,
          duration: 80
        });
      });

    } else if (phase === 3) {
      // PHA 3: LÍNH BẮN ANIMATION THẬT, ZOMBIE WALKER BỊ TIÊU DIỆT (HP VỀ 0)
      this.statusText.setText('Pha: 4. LÍNH & PHÁO ĐỒNG LOẠT KHAI HỎA — ZOMBIE WALKER BỊ TIÊU DIỆT (CORPSE)');
      this.stepText.setText('Cơ chế: Soldier chạy animation survivor-shoot; Zombie nhận damage thật (HP=0, isDead=true), hiện corpse_0.');
      this.soldierSprite.play('survivor-shoot');

      // Fire tracer lines from Soldier and Turrets to Zombie 1
      const targetZ = this.zombies[1];
      this.bulletTracers.clear();
      this.bulletTracers.lineStyle(3, 0xffeb3b, 0.9);
      this.bulletTracers.lineBetween(this.soldier.x, this.soldier.y, targetZ.container.x, targetZ.container.y);
      this.bulletTracers.lineBetween(this.turretGuns[1].x, this.turretGuns[1].y, targetZ.container.x, targetZ.container.y);

      // Apply real damage to Zombie 1 over time
      const damageInterval = setInterval(() => {
        if (!targetZ.isDead && this.currentPhase === 3) {
          targetZ.hp = Math.max(0, targetZ.hp - 35);
          targetZ.hpFill.width = Math.max(0, (targetZ.hp / targetZ.maxHp) * 50);

          if (targetZ.hp <= 0) {
            targetZ.isDead = true;
            targetZ.vy = 0;
            targetZ.hpBg.setVisible(false);
            targetZ.hpFill.setVisible(false);
            targetZ.sprite.stop();
            targetZ.sprite.setTexture('zombie_corpse_0');
            targetZ.sprite.setAlpha(0.85);
            this.bulletTracers.clear();
            clearInterval(damageInterval);
          }
        } else {
          clearInterval(damageInterval);
        }
      }, 150);
    }
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;
    this.phaseTimer += dt;

    // Phase cycle timer: 4.5 seconds per phase (Total 18s loop)
    if (this.phaseTimer >= 4.5) {
      const nextPhase = (this.currentPhase + 1) % 4;
      this.enterPhase(nextPhase);
    }

    // --- REAL DYNAMIC COLLISION & CONTINUOUS STATE EVALUATION ---
    let blockedCount = 0;

    this.zombies.forEach((z) => {
      if (z.isDead) return;

      // Calculate prospective next position based on velocity
      const nextY = z.y + z.vy * dt;
      // Re-evaluate collision against defense geometry on EVERY tick
      const res: CollisionResult = this.collisionSystem.resolveMovement(z.x, z.y, z.x, nextY, 20);

      z.x = res.resolvedX;
      z.y = res.resolvedY;
      z.container.setPosition(z.x, z.y);

      if (res.collided) {
        // Obstacle blocking movement
        blockedCount++;
        if (!z.isAttacking) {
          z.isAttacking = true;
          z.sprite.play('walker-attack');
        }
      } else {
        // Path is open and clear (e.g., Gate corridor opened wide enough or beyond wall)
        if (z.isAttacking) {
          // Obstacle cleared! Auto-resume forward advance!
          z.isAttacking = false;
          z.sprite.play('walker-walk');
        }
      }
    });

    this.collisionTelemetryText.setText(`COLLISION: ${blockedCount} BLOCKED`);

    // --- DYNAMIC TURRET AIMING (AIM AT CLOSEST ZOMBIE) ---
    [0, 1, 2].forEach((laneIdx) => {
      const z = this.zombies[laneIdx];
      if (z && !z.isDead && this.turretGuns[laneIdx]) {
        const tx = this.turretGuns[laneIdx].x;
        const ty = this.turretGuns[laneIdx].y;
        const angle = Phaser.Math.Angle.Between(tx, ty, z.container.x, z.container.y);
        this.turretGuns[laneIdx].setRotation(angle - Math.PI / 2);
      }
    });
  }
}
