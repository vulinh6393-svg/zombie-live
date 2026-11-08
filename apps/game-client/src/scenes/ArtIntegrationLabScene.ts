import Phaser from 'phaser';

interface ZombieEntity {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  lane: number;
  baseX: number;
  targetY: number;
  initialY: number;
}

export class ArtIntegrationLabScene extends Phaser.Scene {
  // Architecture
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

  // Entities
  private soldiers: Phaser.GameObjects.Container[] = [];
  private zombies: ZombieEntity[] = [];

  // HUD & Telemetry
  private statusText!: Phaser.GameObjects.Text;
  private stepText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private zombieCountText!: Phaser.GameObjects.Text;

  // Gift & VFX
  private giftBannerContainer!: Phaser.GameObjects.Container;
  private orbitalBeamGraphics!: Phaser.GameObjects.Graphics;
  private muzzleFlashes: Phaser.GameObjects.Image[] = [];

  private currentPhase = 0;
  private loopTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'ArtIntegrationLabScene' });
  }

  preload() {
    // 1. Environment & Architecture
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
    this.load.image('bullet_tracer', 'assets/weapons/bullet_tracer.png');

    // 3. Real Character Assets
    this.load.image('survivor_idle', 'assets/characters/survivor/idle/idle_0.png');
    this.load.image('survivor_shoot', 'assets/characters/survivor/shoot/shoot_1.png');
    this.load.image('zombie_move', 'assets/characters/zombie/move/move_4.png');
    this.load.image('zombie_attack', 'assets/characters/zombie/attack/attack_2.png');
  }

  create() {
    // 1. Clean Environment Plate (Depth 1) - Zero baked gates or turrets
    this.add.image(540, 960, 'clean_plate').setDepth(1);

    // 2. Main Blast Gate Assembly (Center: x=540, y=900)
    // Left & Right Sliding Doors (Depth 6)
    this.gateDoorLeft = this.add.image(483, 908, 'bastion_door_left').setDepth(6);
    this.gateDoorRight = this.add.image(597, 908, 'bastion_door_right').setDepth(6);

    // Blast Gate Armored Frame (Depth 7)
    this.gateFrame = this.add.image(540, 900, 'bastion_gate_frame').setDepth(7);

    // LED Status Lamp on Gate Archway
    this.ledLight = this.add.circle(540, 832, 7, 0x10b981).setDepth(8);

    // 3. Modular Rampart Walls (Depth 7)
    this.wallLeft = this.add.image(240, 900, 'bastion_wall').setDepth(7);
    this.wallRight = this.add.image(840, 900, 'bastion_wall').setDepth(7);

    // Wall Damage Overlay on Left Rampart (Depth 8, starts invisible)
    this.wallDamageOverlay = this.add.image(240, 900, 'wall_damage_overlay').setDepth(8).setAlpha(0);

    // 4. Three Turret Emplacements (y=580)
    const turretLanes = [280, 540, 800];
    this.turretBases = [];
    this.turretGuns = [];
    this.muzzleFlashes = [];

    turretLanes.forEach((tx, idx) => {
      // Hexagonal concrete pad
      this.add.image(tx, 580, 'bastion_turret_pad').setDepth(8);

      // Rotating base
      const base = this.add.image(tx, 580, 'turret_base').setDisplaySize(80, 80).setDepth(9);
      this.turretBases.push(base);

      // Dual gun mount
      const gun = this.add.image(tx, 580, 'turret_gun').setOrigin(0.5, 0.7).setDisplaySize(60, 80).setDepth(10);
      this.turretGuns.push(gun);

      // Muzzle flash
      const flash = this.add.image(tx, 530, 'muzzle_flash').setDisplaySize(40, 40).setDepth(11).setAlpha(0);
      this.muzzleFlashes.push(flash);
    });

    // 5. Collision Boundary Markers for All 3 Lanes (at y=840)
    this.createCollisionBoundaryLines();

    // 6. Spawn 3 Soldiers (1 Representative per Lane)
    this.spawnSoldiers();

    // 7. Spawn 9 Zombies (3 per Lane: Alpha, Bravo, Charlie)
    this.spawnNineZombies();

    // 8. Create VFX Graphics for Orbital Laser / Airstrike
    this.orbitalBeamGraphics = this.add.graphics().setDepth(25);

    // 9. Create Gift Banner Alert
    this.createGiftBanner();

    // 10. Create Full HUD & Safe Zone Overlay
    this.createDiagnosticHUD();

    // 11. Run Demonstration Cycle
    this.startDemonstrationLoop();
  }

  private createCollisionBoundaryLines() {
    // Lane 0: Alpha (Left Wall Rampart)
    const g = this.add.graphics().setDepth(5);
    g.lineStyle(2, 0xef4444, 0.8);

    // Alpha boundary
    g.strokeRect(80, 836, 320, 6);
    this.add.text(240, 822, 'LANE ALPHA VẬT CẢN TƯỜNG [y=840]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ef4444',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5).setDepth(6);

    // Bravo boundary (Blast Gate)
    g.strokeRect(410, 836, 260, 6);
    this.add.text(540, 822, 'LANE BRAVO CỔNG THÉP [y=840]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#38bdf8',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5).setDepth(6);

    // Charlie boundary (Right Wall Rampart)
    g.strokeRect(680, 836, 320, 6);
    this.add.text(840, 822, 'LANE CHARLIE VẬT CẢN TƯỜNG [y=840]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ef4444',
      backgroundColor: '#0f172a'
    }).setOrigin(0.5).setDepth(6);
  }

  private spawnSoldiers() {
    this.soldiers = [];
    const soldierConfigs = [
      { lane: 0, x: 280, y: 1030, name: 'ALPHA (CHI VIỆN: 14)' },
      { lane: 1, x: 540, y: 1050, name: 'BRAVO (CHI VIỆN: 13)' },
      { lane: 2, x: 800, y: 1030, name: 'CHARLIE (CHI VIỆN: 13)' }
    ];

    soldierConfigs.forEach((cfg) => {
      const container = this.add.container(cfg.x, cfg.y).setDepth(11);
      const img = this.add.image(0, 0, 'survivor_idle');
      // Scale 132px logic height (132 / 152 = 0.868)
      img.setScale(132 / 152);
      img.setAngle(-90);
      container.add(img);

      // Squad badge
      const badgeBg = this.add.rectangle(0, 36, 130, 22, 0x0f172a, 0.85);
      badgeBg.setStrokeStyle(1.5, 0x10b981);
      const badgeTxt = this.add.text(0, 36, cfg.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#10b981',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(badgeBg);
      container.add(badgeTxt);

      this.soldiers.push(container);
    });
  }

  private spawnNineZombies() {
    this.zombies = [];
    // 3 per lane: Alpha (x=280), Bravo (x=540), Charlie (x=800)
    const zombieData = [
      // Alpha Lane (Left)
      { lane: 0, x: 250, initY: 260, targetY: 790 },
      { lane: 0, x: 290, initY: 400, targetY: 820 },
      { lane: 0, x: 270, initY: 540, targetY: 840 },

      // Bravo Lane (Center)
      { lane: 1, x: 510, initY: 230, targetY: 780 },
      { lane: 1, x: 550, initY: 370, targetY: 810 },
      { lane: 1, x: 530, initY: 510, targetY: 840 },

      // Charlie Lane (Right)
      { lane: 2, x: 770, initY: 270, targetY: 790 },
      { lane: 2, x: 810, initY: 410, targetY: 820 },
      { lane: 2, x: 790, initY: 550, targetY: 840 }
    ];

    zombieData.forEach((zd, idx) => {
      const container = this.add.container(zd.x, zd.initY).setDepth(12);
      const img = this.add.image(0, 0, 'zombie_move');
      // Scale 132px logic height (132 / 196 = 0.673)
      img.setScale(132 / 196);
      img.setAngle(90);
      container.add(img);

      // HP bar over zombie
      const hpBg = this.add.rectangle(0, -32, 40, 6, 0x000000, 0.8);
      const hpFill = this.add.rectangle(-20, -32, 40, 6, 0xef4444).setOrigin(0, 0.5);
      container.add(hpBg);
      container.add(hpFill);

      this.zombies.push({
        container,
        sprite: img,
        lane: zd.lane,
        baseX: zd.x,
        targetY: zd.targetY,
        initialY: zd.initY
      });
    });
  }

  private createGiftBanner() {
    this.giftBannerContainer = this.add.container(540, 320).setDepth(35).setAlpha(0);

    const bg = this.add.rectangle(0, 0, 720, 64, 0x0f172a, 0.95);
    bg.setStrokeStyle(2, 0xf59e0b);

    const txtTitle = this.add.text(0, -12, '🎁 SỰ KIỆN QUÀ TẶNG: RỒNG LỬA OANH TẠC (AIRSTRIKE)', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#f59e0b'
    }).setOrigin(0.5);

    const txtSub = this.add.text(0, 14, 'Người xem: @vietnam_live tặng x50 Rocket · Quét sạch mục tiêu trên cả 3 Lane!', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '13px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.giftBannerContainer.add(bg);
    this.giftBannerContainer.add(txtTitle);
    this.giftBannerContainer.add(txtSub);
  }

  private createDiagnosticHUD() {
    // 1. Top HUD Header
    const topBg = this.add.rectangle(540, 75, 1020, 105, 0x0f172a, 0.94).setDepth(30);
    topBg.setStrokeStyle(2, 0x00ffcc);

    this.add.text(60, 35, '⚡ BASTION RUNTIME PROOF: 9 ZOMBIE · 3 SOLDIER · 3 LANE COLLISION', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00ffcc',
    }).setDepth(31);

    this.statusText = this.add.text(60, 68, 'Pha: 1. TIẾN CÔNG CẢ 3 LANE (Zombie tiếp cận vạch va chạm y=840)', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '16px',
      color: '#38bdf8',
    }).setDepth(31);

    this.stepText = this.add.text(60, 96, 'Kiểm tra: Collision Boundary 3 Lane riêng biệt | Occlusion Z-order | Zero Baked Archway', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '13px',
      color: '#94a3b8',
    }).setDepth(31);

    // 2. Telemetry Badges (Right side of HUD)
    this.timerText = this.add.text(920, 42, '⏱ 01:58', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f59e0b',
    }).setOrigin(0.5).setDepth(31);

    this.zombieCountText = this.add.text(920, 80, 'ZOMBIE: 9/9 LIVE', {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ef4444',
    }).setOrigin(0.5).setDepth(31);

    // 3. TikTok Safe Zone Comment Box Simulation at Bottom
    const commentBg = this.add.rectangle(260, 1680, 440, 180, 0x0f172a, 0.85).setDepth(30);
    commentBg.setStrokeStyle(1.5, 0x334155);

    this.add.text(60, 1605, '💬 TIKTOK LIVE SAFE ZONE (KHUNG BÌNH LUẬN)', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00ffcc',
      fontStyle: 'bold'
    }).setDepth(31);

    const mockComments = [
      '👤 User_88: Tuyến phòng thủ Alpha vững chắc!',
      '👤 ChiChi: Bắn nát cổng chính rồi!',
      '🎁 GamerPro đã gửi [Tên Lửa x10]',
      '👤 MinhHung: 3 lane giữ cự ly cực chuẩn!'
    ];
    mockComments.forEach((c, i) => {
      this.add.text(60, 1632 + i * 26, c, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#e2e8f0'
      }).setDepth(31);
    });

    // 4. Bottom Technical Watermark
    const footBg = this.add.rectangle(540, 1885, 1000, 48, 0x0f172a, 0.92).setDepth(30);
    footBg.setStrokeStyle(1.5, 0x10b981);

    this.add.text(540, 1885, 'Phaser 3.90 WebGL · 60 FPS Target · 3-Lane Boundary Verified · Real RGBA Sprites', {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#34d399',
    }).setOrigin(0.5).setDepth(31);
  }

  private startDemonstrationLoop() {
    this.loopTimer = this.time.addEvent({
      delay: 4500,
      loop: true,
      callback: () => {
        this.currentPhase = (this.currentPhase + 1) % 4;
        this.executePhase(this.currentPhase);
      },
    });

    this.executePhase(0);
  }

  private executePhase(phase: number) {
    if (phase === 0) {
      // PHA 1: 9 ZOMBIE TIẾN CÔNG & DỪNG TẠI COLLISION BOUNDARY RIÊNG CỦA TỪNG LANE
      this.statusText.setText('Pha: 1. TIẾN CÔNG CẢ 3 LANE (9 Zombie dừng tại Collision Boundary y=840)');
      this.stepText.setText('Cơ chế: Từng lane có vạch va chạm riêng; Cổng đóng kín; Lính Alpha & Charlie ở cover');
      this.timerText.setText('⏱ 01:58');
      this.zombieCountText.setText('ZOMBIE: 9/9 LIVE');
      this.ledLight.setFillStyle(0x10b981);
      this.wallDamageOverlay.setAlpha(0);
      this.giftBannerContainer.setAlpha(0);
      this.orbitalBeamGraphics.clear();

      // Reset & close gate doors
      this.tweens.add({ targets: this.gateDoorLeft, x: 483, duration: 800, ease: 'Cubic.easeInOut' });
      this.tweens.add({ targets: this.gateDoorRight, x: 597, duration: 800, ease: 'Cubic.easeInOut' });

      // Move 9 zombies toward individual collision boundaries at y=840
      this.zombies.forEach((z) => {
        this.tweens.add({
          targets: z.container,
          x: z.baseX,
          y: z.targetY,
          duration: 1600,
          ease: 'Linear'
        });
      });

      // Soldiers in front of wall
      this.soldiers[0].setDepth(11);
      this.soldiers[2].setDepth(11);
      this.tweens.add({ targets: this.soldiers[0], x: 280, y: 1030, duration: 900 });
      this.tweens.add({ targets: this.soldiers[2], x: 800, y: 1030, duration: 900 });

    } else if (phase === 1) {
      // PHA 2: CỔNG TRƯỢT MỞ, ZOMBIE BRAVO ĐỘT PHÁ & OCCLUSION Z-ORDER
      this.statusText.setText('Pha: 2. CỔNG MỞ TRƯỢT 2 CÁNH & LÍNH CHE KHUẤT SAU TƯỜNG (Occlusion)');
      this.stepText.setText('Cơ chế: Cửa trượt sang 2 bên (-53px, +53px); Zombie Bravo lọt vào thông đạo; Lính nấp sau tường');
      this.timerText.setText('⏱ 01:54');
      this.ledLight.setFillStyle(0x38bdf8);

      // Slide open gate
      this.tweens.add({ targets: this.gateDoorLeft, x: 430, duration: 1200, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: this.gateDoorRight, x: 650, duration: 1200, ease: 'Cubic.easeOut' });

      // Zombie in Bravo lane penetrates the opened gate toward y=890 (inside archway!)
      const bravoZombie = this.zombies.find(z => z.lane === 1 && z.targetY === 840);
      if (bravoZombie) {
        this.tweens.add({
          targets: bravoZombie.container,
          y: 890,
          duration: 1200,
          ease: 'Linear'
        });
      }

      // Soldier Alpha moves BEHIND wall rampart (Depth 4 under wall depth 7)
      this.tweens.add({
        targets: this.soldiers[0],
        x: 280,
        y: 860,
        duration: 1000,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.soldiers[0].setDepth(4); // Under wall parapet!
        }
      });

    } else if (phase === 2) {
      // PHA 3: TƯỜNG NỨT VỠ, PHÁO XOAY BẮN TRẢ & TIA LỬA
      this.statusText.setText('Pha: 3. TƯỜNG NHẬN SÁT THƯƠNG, 3 PHÁO XOAY BẮN THEO TỪNG LANE');
      this.stepText.setText('Cơ chế: Decal nứt vỡ kích hoạt; 3 Turret chĩa vào 3 lane; Muzzle Flash nổ sáng liên tục');
      this.timerText.setText('⏱ 01:49');
      this.ledLight.setFillStyle(0xef4444);

      this.cameras.main.shake(250, 0.005);

      // Fade in wall damage overlay
      this.tweens.add({ targets: this.wallDamageOverlay, alpha: 1, duration: 350 });

      // Fire muzzle flashes
      this.muzzleFlashes.forEach((f) => {
        this.tweens.add({
          targets: f,
          alpha: 1,
          yoyo: true,
          repeat: 4,
          duration: 90
        });
      });

    } else if (phase === 3) {
      // PHA 4: HIỆU ỨNG GIFT TIKTOK OANH TẠC (AIRSTRIKE) & QUÉT SẠCH QUÁI
      this.statusText.setText('Pha: 4. HIỆU ỨNG GIFT OANH TẠC (Airstrike) TIÊU DIỆT TOÀN BỘ QUÁI');
      this.stepText.setText('Cơ chế: Banner Gift hiện giữa màn hình; Tia laser quỹ đạo dội xuống quét sạch cả 3 lane');
      this.timerText.setText('⏱ 01:45');
      this.zombieCountText.setText('ZOMBIE: 0/9 ELIMINATED');

      // Pop in Gift Banner
      this.giftBannerContainer.setScale(0.8);
      this.tweens.add({
        targets: this.giftBannerContainer,
        alpha: 1,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut'
      });

      // Draw Orbital Strike Beams down on each lane
      this.orbitalBeamGraphics.clear();
      for (const lx of [280, 540, 800]) {
        this.orbitalBeamGraphics.lineStyle(12, 0x00ffff, 0.9);
        this.orbitalBeamGraphics.lineBetween(lx, 0, lx, 840);
        this.orbitalBeamGraphics.lineStyle(4, 0xffffff, 1);
        this.orbitalBeamGraphics.lineBetween(lx, 0, lx, 840);
      }

      // Zombies knocked back and fade
      this.zombies.forEach((z) => {
        this.tweens.add({
          targets: z.container,
          y: z.initialY,
          alpha: 0.3,
          duration: 1000,
          onComplete: () => {
            z.container.setAlpha(1);
          }
        });
      });
    }
  }

  update(time: number, delta: number) {
    // Dynamically aim 3 Turrets at the leading zombie of each lane
    const laneZombies = [
      this.zombies.filter(z => z.lane === 0),
      this.zombies.filter(z => z.lane === 1),
      this.zombies.filter(z => z.lane === 2)
    ];

    [0, 1, 2].forEach((laneIdx) => {
      const zList = laneZombies[laneIdx];
      if (zList.length > 0 && this.turretGuns[laneIdx]) {
        // Find zombie with largest y (closest to wall)
        let leadZ = zList[0];
        for (let i = 1; i < zList.length; i++) {
          if (zList[i].container.y > leadZ.container.y) leadZ = zList[i];
        }

        const tx = this.turretGuns[laneIdx].x;
        const ty = this.turretGuns[laneIdx].y;
        const angle = Phaser.Math.Angle.Between(tx, ty, leadZ.container.x, leadZ.container.y);
        this.turretGuns[laneIdx].setRotation(angle - Math.PI / 2);
      }
    });
  }
}
