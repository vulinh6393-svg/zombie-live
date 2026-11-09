import Phaser from 'phaser';
import { BASTION_GEOMETRY } from '../config/BastionGeometryConfig';
import { BastionCollisionSystem, CollisionResult } from '../systems/BastionCollisionSystem';

interface PhysicalZombie {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
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

  // Characters
  private soldier!: Phaser.GameObjects.Container;
  private soldierSprite!: Phaser.GameObjects.Image;
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
    // 1. Clean Environment Plate & Semi-realistic Textured Assets
    this.load.image('clean_plate', 'assets/concept/bastion_clean_environment.png');
    this.load.image('bastion_wall', 'assets/environment/bastion/bastion_wall_segment.png');
    this.load.image('bastion_gate_frame', 'assets/environment/bastion/bastion_gate_frame.png');
    this.load.image('bastion_door_left', 'assets/environment/bastion/bastion_gate_door_left.png');
    this.load.image('bastion_door_right', 'assets/environment/bastion/bastion_gate_door_right.png');
    this.load.image('bastion_turret_pad', 'assets/environment/bastion/bastion_turret_platform.png');
    this.load.image('wall_damage_overlay', 'assets/environment/bastion/wall_damage_overlay.png');

    // 2. Weapon & VFX Assets
    this.load.image('turret_base', 'assets/weapons/turret_base.png');
    this.load.image('turret_gun', 'assets/weapons/turret_gun_dual.png');
    this.load.image('muzzle_flash', 'assets/vfx/muzzle_flash.png');

    // 3. Real Character Sprite Frames (Riley Gombart asset pack)
    this.load.image('survivor_idle', 'assets/characters/survivor/idle/idle_0.png');
    this.load.image('survivor_shoot', 'assets/characters/survivor/shoot/shoot_1.png');
    this.load.image('zombie_move', 'assets/characters/zombie/move/move_4.png');
    this.load.image('zombie_attack', 'assets/characters/zombie/attack/attack_2.png');
  }

  create() {
    // 1. Initialize Real Collision System
    this.collisionSystem = new BastionCollisionSystem();

    // 2. Clean Environment Background (Depth 1) - Zero baked gates or turrets
    this.add.image(540, 960, 'clean_plate').setDepth(1);

    // 3. Assembly Blast Gate at SSOT Coordinates: (540, 900)
    const bgConfig = BASTION_GEOMETRY.blastGate;
    // Sliding Doors (Depth 6)
    this.gateDoorLeft = this.add.image(bgConfig.doorLeftClosedX, bgConfig.doorsY, 'bastion_door_left').setDepth(6);
    this.gateDoorRight = this.add.image(bgConfig.doorRightClosedX, bgConfig.doorsY, 'bastion_door_right').setDepth(6);

    // Heavy Armored Gate Frame (Depth 7)
    this.gateFrame = this.add.image(bgConfig.centerX, bgConfig.centerY, 'bastion_gate_frame').setDepth(7);

    // LED Status Indicator on Archway
    this.ledLight = this.add.circle(bgConfig.centerX, bgConfig.centerY - 68, 7, 0x10b981).setDepth(8);

    // 4. Modular Wall Ramparts at SSOT Coordinates: (240, 900) and (840, 900)
    const leftWallCfg = BASTION_GEOMETRY.walls[0];
    const rightWallCfg = BASTION_GEOMETRY.walls[1];
    this.wallLeft = this.add.image(leftWallCfg.centerX, leftWallCfg.centerY, 'bastion_wall').setDepth(7);
    this.wallRight = this.add.image(rightWallCfg.centerX, rightWallCfg.centerY, 'bastion_wall').setDepth(7);

    // Wall Damage Overlay on Left Rampart (Depth 8, starts hidden)
    this.wallDamageOverlay = this.add.image(leftWallCfg.centerX, leftWallCfg.centerY, 'wall_damage_overlay').setDepth(8).setAlpha(0);

    // 5. Three Turret Emplacements at SSOT Coordinates: y=580 (Lanes: 280, 540, 800)
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
      const gun = this.add.image(t.x, t.y, 'turret_gun').setOrigin(0.5, 0.7).setDisplaySize(60, 80).setDepth(10);
      this.turretGuns.push(gun);

      // Muzzle flash
      const flash = this.add.image(t.x, t.y - 50, 'muzzle_flash').setDisplaySize(44, 44).setDepth(11).setAlpha(0);
      this.muzzleFlashes.push(flash);
    });

    // 6. Draw Real Collision Boundary Line at y=840
    this.renderCollisionBoundaryOverlay();

    // 7. Spawn Soldier at SSOT Coordinates: Cover position (280, 1030)
    this.spawnSoldier();

    // 8. Spawn Physical Zombies on All 3 Lanes
    this.spawnPhysicalZombies();

    // 9. Graphics for Tracers
    this.bulletTracers = this.add.graphics().setDepth(20);

    // 10. Create HUD & Telemetry Display
    this.createDiagnosticHUD();

    // 11. Run Phase 0
    this.enterPhase(0);
  }

  private renderCollisionBoundaryOverlay() {
    const g = this.add.graphics().setDepth(5);
    // Draw collision boundary line at y=840
    g.lineStyle(2, 0xef4444, 0.85);
    g.strokeRect(80, 838, 920, 4);

    this.add.text(540, 822, '⚡ REAL COLLISION BOUNDARY LINE (y = 840) — ĐƯỢC TÍNH TOÁN BẰNG THUẬT TOÁN HÌNH HỌC', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ef4444',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5).setDepth(6);
  }

  private spawnSoldier() {
    // Soldier at Alpha Cover position (x=280, y=1030)
    this.soldier = this.add.container(280, 1030).setDepth(11);
    this.soldierSprite = this.add.image(0, 0, 'survivor_idle');
    // Scale 132px logic height (132 / 152 = 0.868)
    this.soldierSprite.setScale(132 / 152);
    this.soldierSprite.setAngle(-90);
    this.soldier.add(this.soldierSprite);

    const badgeBg = this.add.rectangle(0, 36, 150, 22, 0x0f172a, 0.9);
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
    // 3 Physical Zombies representing the 3 Lanes
    // Lane 0: Alpha (Left Wall Rampart)
    // Lane 1: Bravo (Blast Gate)
    // Lane 2: Charlie (Right Wall Rampart)
    const configs = [
      { lane: 0, x: 280, y: 520, vy: 140 },
      { lane: 1, x: 540, y: 480, vy: 140 },
      { lane: 2, x: 800, y: 520, vy: 140 }
    ];

    configs.forEach((cfg) => {
      const container = this.add.container(cfg.x, cfg.y).setDepth(12);
      const sprite = this.add.image(0, 0, 'zombie_move');
      // Scale 132px logic height (132 / 196 = 0.673)
      sprite.setScale(132 / 196);
      sprite.setAngle(90);
      container.add(sprite);

      // HP Bar
      const hpBg = this.add.rectangle(0, -32, 50, 7, 0x000000, 0.85);
      const hpFill = this.add.rectangle(-25, -32, 50, 7, 0xef4444).setOrigin(0, 0.5);
      container.add(hpBg);
      container.add(hpFill);

      this.zombies.push({
        container,
        sprite,
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
    // 1. Top HUD Header
    const topBg = this.add.rectangle(540, 75, 1020, 105, 0x0f172a, 0.95).setDepth(30);
    topBg.setStrokeStyle(2, 0x00ffcc);

    this.add.text(60, 32, '⚡ VERTICAL SLICE PROOF: REAL COLLISION & SEMI-REALISTIC ASSETS', {
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

    // 2. Real-time Telemetry (Right side)
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

    // 3. Bottom HUD Safe Zone
    const footBg = this.add.rectangle(540, 1885, 1000, 48, 0x0f172a, 0.92).setDepth(30);
    footBg.setStrokeStyle(1.5, 0x10b981);

    this.add.text(540, 1885, 'Phaser 3.90 WebGL · Dynamic Hitbox System · Semi-Realistic Concrete & Steel Textures', {
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
        z.sprite.setTexture('zombie_move');
        z.hpFill.setScale(1, 1);
      });

      // Soldier in front
      this.soldier.setDepth(11);
      this.soldier.setPosition(280, 1030);
      this.soldierSprite.setTexture('survivor_idle');

    } else if (phase === 1) {
      // PHA 1: CỔNG TRƯỢT MỞ — ZOMBIE BRAVO ĐỘT PHÁ QUA HÀNH LANG, ALPHA/CHARLIE VẪN BỊ CHẶN
      this.statusText.setText('Pha: 2. CỔNG TRƯỢT MỞ — ZOMBIE BRAVO ĐỘT PHÁ QUA CỔNG, ALPHA/CHARLIE VẪN BỊ CHẶN!');
      this.stepText.setText('Cơ chế: Cổng mở giải phóng hitbox hành lang x:[430..650]; Zombie Bravo tiếp tục tiến; Lính nấp sau tường (Occlusion)');
      this.gateStateText.setText('GATE: OPEN').setColor('#10b981');
      this.ledLight.setFillStyle(0x10b981);
      this.collisionSystem.setGateState('OPEN');

      // Slide open doors
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
      this.zombies[1].sprite.setTexture('zombie_move');

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

      // Camera shake
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
      this.statusText.setText('Pha: 4. LÍNH & PHÁO ĐỒNG LOẠT KHAI HỎA — ZOMBIE WALKER BỊ TIÊU DIỆT!');
      this.stepText.setText('Cơ chế: Soldier chuyển frame bắn survivor_shoot; Đạn bắn trúng Zombie; Zombie HP về 0 và tan biến.');
      this.soldierSprite.setTexture('survivor_shoot');

      // Fire tracer lines from Soldier and Turrets to Zombie 1
      const targetZ = this.zombies[1];
      this.bulletTracers.clear();
      this.bulletTracers.lineStyle(3, 0xffeb3b, 0.9);
      this.bulletTracers.lineBetween(this.soldier.x, this.soldier.y, targetZ.container.x, targetZ.container.y);
      this.bulletTracers.lineBetween(this.turretGuns[1].x, this.turretGuns[1].y, targetZ.container.x, targetZ.container.y);

      // Zombie 1 takes lethal damage
      this.tweens.add({
        targets: targetZ.hpFill,
        scaleX: 0,
        duration: 400
      });

      this.tweens.add({
        targets: targetZ.container,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 600,
        delay: 400,
        onComplete: () => {
          targetZ.isDead = true;
          this.bulletTracers.clear();
        }
      });
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

    // --- REAL DYNAMIC COLLISION RESOLUTION IN GAME LOOP ---
    let blockedCount = 0;

    this.zombies.forEach((z) => {
      if (z.isDead) return;

      if (!z.isAttacking) {
        // Compute prospective next position based on velocity
        const nextY = z.y + z.vy * dt;
        // Test collision against Bastion defense geometry
        const res: CollisionResult = this.collisionSystem.resolveMovement(z.x, z.y, z.x, nextY, 20);

        z.x = res.resolvedX;
        z.y = res.resolvedY;
        z.container.setPosition(z.x, z.y);

        if (res.collided) {
          // Collision detected! Entity halted at boundary!
          blockedCount++;
          z.isAttacking = true;
          z.sprite.setTexture('zombie_attack');
        } else if (res.passThroughReason === 'GATE_OPEN') {
          // Successfully breached open gate corridor!
          // Continue moving forward toward courtyard!
        }
      } else {
        // Still touching obstacle
        blockedCount++;
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
