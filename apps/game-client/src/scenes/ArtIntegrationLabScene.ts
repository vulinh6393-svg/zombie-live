import Phaser from 'phaser';

export class ArtIntegrationLabScene extends Phaser.Scene {
  private gateFrame!: Phaser.GameObjects.Image;
  private gateDoorLeft!: Phaser.GameObjects.Image;
  private gateDoorRight!: Phaser.GameObjects.Image;
  private wallLeft!: Phaser.GameObjects.Image;
  private wallRight!: Phaser.GameObjects.Image;
  private wallDamageOverlay!: Phaser.GameObjects.Image;

  private turretBase0!: Phaser.GameObjects.Image;
  private turretGun0!: Phaser.GameObjects.Image;
  private turretBase1!: Phaser.GameObjects.Image;
  private turretGun1!: Phaser.GameObjects.Image;
  private turretBase2!: Phaser.GameObjects.Image;
  private turretGun2!: Phaser.GameObjects.Image;

  private soldier!: Phaser.GameObjects.Container;
  private zombie!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private stepText!: Phaser.GameObjects.Text;
  private ledLight!: Phaser.GameObjects.Arc;
  private sparksEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  private cycleTimer = 0;
  private currentPhase = 0;

  constructor() {
    super({ key: 'ArtIntegrationLabScene' });
  }

  preload() {
    // 1. Environment & Architecture (Clean Plate & New Textured Sprites)
    this.load.image('clean_plate', 'assets/concept/bastion_clean_environment.png');
    this.load.image('bastion_wall', 'assets/environment/bastion/bastion_wall_segment.png');
    this.load.image('bastion_gate_frame', 'assets/environment/bastion/bastion_gate_frame.png');
    this.load.image('bastion_door_left', 'assets/environment/bastion/bastion_gate_door_left.png');
    this.load.image('bastion_door_right', 'assets/environment/bastion/bastion_gate_door_right.png');
    this.load.image('bastion_turret_pad', 'assets/environment/bastion/bastion_turret_platform.png');
    this.load.image('wall_damage_overlay', 'assets/environment/bastion/wall_damage_overlay.png');

    // 2. Weapons & VFX
    this.load.image('turret_base', 'assets/weapons/turret_base.png');
    this.load.image('turret_gun', 'assets/weapons/turret_gun_dual.png');
    this.load.image('muzzle_flash', 'assets/vfx/muzzle_flash.png');
    this.load.image('tracer', 'assets/weapons/bullet_tracer.png');

    // 3. Characters (Riley Gombart real frames)
    this.load.image('survivor_idle', 'assets/characters/survivor/idle/idle_0.png');
    this.load.image('survivor_shoot', 'assets/characters/survivor/shoot/shoot_1.png');
    this.load.image('zombie_move', 'assets/characters/zombie/move/move_4.png');
    this.load.image('zombie_attack', 'assets/characters/zombie/attack/attack_2.png');
  }

  create() {
    // 1. Clean Environment Plate (Depth 1)
    this.add.image(540, 960, 'clean_plate').setDepth(1);

    // 2. Main Blast Gate Assembly (Depth 5 - 6) at Center (x=540, y=900)
    // Frame
    this.gateFrame = this.add.image(540, 900, 'bastion_gate_frame').setDepth(7);

    // Left and Right Sliding Doors
    // Closed initial positions: left at x=483, right at x=597
    this.gateDoorLeft = this.add.image(483, 908, 'bastion_door_left').setDepth(6);
    this.gateDoorRight = this.add.image(597, 908, 'bastion_door_right').setDepth(6);

    // Dynamic LED Status Indicator on gate frame
    this.ledLight = this.add.circle(540, 832, 6, 0x10b981).setDepth(8);

    // 3. Modular Rampart Walls (Depth 7)
    // Left Wall Segment: Center at (240, 900)
    this.wallLeft = this.add.image(240, 900, 'bastion_wall').setDepth(7);
    // Right Wall Segment: Center at (840, 900)
    this.wallRight = this.add.image(840, 900, 'bastion_wall').setDepth(7);

    // Wall damage overlay on left wall
    this.wallDamageOverlay = this.add.image(240, 900, 'wall_damage_overlay').setDepth(8).setAlpha(0);

    // 4. Three Turret Emplacements at Measured Positions (y=580)
    // Lane 0: (280, 580), Lane 1: (540, 580), Lane 2: (800, 580)
    for (const [x, y] of [[280, 580], [540, 580], [800, 580]]) {
      this.add.image(x, y, 'bastion_turret_pad').setDepth(8);
    }

    // Turret 0 (Alpha)
    this.turretBase0 = this.add.image(280, 580, 'turret_base').setDisplaySize(80, 80).setDepth(9);
    this.turretGun0 = this.add.image(280, 580, 'turret_gun').setOrigin(0.5, 0.7).setDisplaySize(60, 80).setDepth(10);

    // Turret 1 (Bravo)
    this.turretBase1 = this.add.image(540, 580, 'turret_base').setDisplaySize(80, 80).setDepth(9);
    this.turretGun1 = this.add.image(540, 580, 'turret_gun').setOrigin(0.5, 0.7).setDisplaySize(60, 80).setDepth(10);

    // Turret 2 (Charlie)
    this.turretBase2 = this.add.image(800, 580, 'turret_base').setDisplaySize(80, 80).setDepth(9);
    this.turretGun2 = this.add.image(800, 580, 'turret_gun').setOrigin(0.5, 0.7).setDisplaySize(60, 80).setDepth(10);

    // 5. Soldier Container (Calibrated Scale 132px Logic Height)
    this.soldier = this.add.container(540, 1050).setDepth(11);
    const sImg = this.add.image(0, 0, 'survivor_idle');
    // Scale factor: 132 / 152 = 0.868
    sImg.setScale(132 / 152);
    sImg.setAngle(-90);
    this.soldier.add(sImg);

    // 6. Zombie Container (Calibrated Scale 132px Logic Height)
    this.zombie = this.add.container(540, 420).setDepth(12);
    const zImg = this.add.image(0, 0, 'zombie_move');
    // Scale factor: 132 / 196 = 0.673
    zImg.setScale(132 / 196);
    zImg.setAngle(90);
    this.zombie.add(zImg);

    // 7. On-Screen Telemetry & Status HUD (Safe Zone compliant)
    this.createDiagnosticHUD();

    // 8. Start Automated Demonstration Loop
    this.startDemonstrationLoop();
  }

  private createDiagnosticHUD() {
    // Header Bar
    const bg = this.add.rectangle(540, 80, 1020, 110, 0x0f172a, 0.92).setDepth(30);
    bg.setStrokeStyle(2, 0x00ffcc);

    this.add.text(60, 40, '⚡ PHASER ART INTEGRATION LAB (RUNTIME PROOF)', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#00ffcc',
    }).setDepth(31);

    this.statusText = this.add.text(60, 75, 'Trạng thái: 1. CỔNG ĐÓNG KÍN (Pistons Locked, LED Green)', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '17px',
      color: '#38bdf8',
    }).setDepth(31);

    this.stepText = this.add.text(60, 105, 'Cơ chế: Gate, Turrets 360°, Occlusion Depth Sorting & Collision Boundary', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '14px',
      color: '#94a3b8',
    }).setDepth(31);

    // Bottom Status Banner
    const footBg = this.add.rectangle(540, 1850, 980, 70, 0x0f172a, 0.9).setDepth(30);
    footBg.setStrokeStyle(1.5, 0x10b981);

    this.add.text(540, 1850, 'Phaser 3.90 WebGL · 60 FPS Target · Zero Baked Background · Real RGBA Sprites', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#34d399',
    }).setOrigin(0.5).setDepth(31);
  }

  private startDemonstrationLoop() {
    // Sequence of 4 mechanical phases running over 16 seconds
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        this.currentPhase = (this.currentPhase + 1) % 4;
        this.executePhase(this.currentPhase);
      },
    });

    // Run initial phase immediately
    this.executePhase(0);
  }

  private executePhase(phase: number) {
    if (phase === 0) {
      // PHASE 0: GATE CLOSED & SOLDIER IN FRONT (Courtyard)
      this.statusText.setText('Trạng thái: 1. CỔNG ĐÓNG KÍN (Pistons Locked, LED Green)');
      this.stepText.setText('Cơ chế: Cổng đóng 100% kín, Lính ở sân trước tường (Depth 11, hiển thị toàn thân)');
      this.ledLight.setFillStyle(0x10b981);
      this.wallDamageOverlay.setAlpha(0);

      // Close doors with tween
      this.tweens.add({
        targets: this.gateDoorLeft,
        x: 483,
        duration: 900,
        ease: 'Cubic.easeInOut',
      });
      this.tweens.add({
        targets: this.gateDoorRight,
        x: 597,
        duration: 900,
        ease: 'Cubic.easeInOut',
      });

      // Move soldier in front of wall at depth 11
      this.soldier.setDepth(11);
      this.tweens.add({
        targets: this.soldier,
        x: 540,
        y: 1040,
        duration: 1000,
        ease: 'Linear',
      });

      // Zombie moves toward boundary y=840
      this.tweens.add({
        targets: this.zombie,
        x: 540,
        y: 840,
        duration: 1500,
        ease: 'Linear',
      });
    } else if (phase === 1) {
      // PHASE 1: GATE SLIDING OPEN & SOLDIER MOVES BEHIND WALL (Depth Occlusion)
      this.statusText.setText('Trạng thái: 2. CỔNG MỞ TRƯỢT 2 CÁNH (Sliding Doors Open)');
      this.stepText.setText('Cơ chế: 2 cánh cửa trượt sang 2 bên (-52px và +52px), lộ thông đạo không bị dính nền cũ!');
      this.ledLight.setFillStyle(0x38bdf8);

      // Open doors smoothly
      this.tweens.add({
        targets: this.gateDoorLeft,
        x: 430, // Slid left
        duration: 1200,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.gateDoorRight,
        x: 650, // Slid right
        duration: 1200,
        ease: 'Cubic.easeOut',
      });

      // Move Soldier BEHIND the parapet wall at depth 4 (Behind wall depth 7)
      // Legs occluded by wall parapet, chest visible above!
      this.tweens.add({
        targets: this.soldier,
        x: 280,
        y: 860,
        duration: 1200,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.soldier.setDepth(4); // Under wall depth 7!
        },
      });
    } else if (phase === 2) {
      // PHASE 2: GATE DAMAGED & WALL IMPACT CRACK
      this.statusText.setText('Trạng thái: 3. CỔNG HƯ HẠI & TƯỜNG NỨT VỠ (Breached & Sparks)');
      this.stepText.setText('Cơ chế: Cổng rung giật, LED đỏ báo động, decal nứt vỡ tường thành kích hoạt');
      this.ledLight.setFillStyle(0xef4444);

      // Camera shake small
      this.cameras.main.shake(200, 0.006);

      // Fade in wall damage overlay
      this.tweens.add({
        targets: this.wallDamageOverlay,
        alpha: 1,
        duration: 400,
      });

      // Jitter doors slightly to represent damage impact
      this.tweens.add({
        targets: [this.gateDoorLeft, this.gateDoorRight],
        y: '+=4',
        yoyo: true,
        repeat: 3,
        duration: 60,
      });
    } else if (phase === 3) {
      // PHASE 3: TURRET 360° TARGET TRACKING & RETURN
      this.statusText.setText('Trạng thái: 4. Ụ PHÁO XOAY 360° THEO MỤC TIÊU & CHUẨN BỊ RESET');
      this.stepText.setText('Cơ chế: Bệ cố định, 3 nòng pháo xoay 90°, 180°, 270° theo tọa độ mục tiêu');

      // Rotate Turret 0, 1, 2 smoothly
      this.tweens.add({
        targets: this.turretGun0,
        angle: 90,
        duration: 900,
        ease: 'Cubic.easeInOut',
      });
      this.tweens.add({
        targets: this.turretGun1,
        angle: 180,
        duration: 1000,
        ease: 'Cubic.easeInOut',
      });
      this.tweens.add({
        targets: this.turretGun2,
        angle: -90,
        duration: 900,
        ease: 'Cubic.easeInOut',
      });

      // Move zombie back up
      this.tweens.add({
        targets: this.zombie,
        y: 420,
        duration: 1200,
      });
    }
  }

  update(time: number, delta: number) {
    // Continuously aim turrets back toward center when in active phase
    if (this.currentPhase === 0 || this.currentPhase === 1) {
      const targetX = this.zombie.x;
      const targetY = this.zombie.y;

      const angle0 = Phaser.Math.Angle.Between(280, 580, targetX, targetY);
      const angle1 = Phaser.Math.Angle.Between(540, 580, targetX, targetY);
      const angle2 = Phaser.Math.Angle.Between(800, 580, targetX, targetY);

      this.turretGun0.setRotation(angle0 - Math.PI / 2);
      this.turretGun1.setRotation(angle1 - Math.PI / 2);
      this.turretGun2.setRotation(angle2 - Math.PI / 2);
    }
  }
}
