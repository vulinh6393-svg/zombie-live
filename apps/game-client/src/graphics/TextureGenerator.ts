import Phaser from 'phaser';

export class TextureGenerator {
  static generateAll(scene: Phaser.Scene): void {
    if (scene.textures.exists('soldier_tactical')) {
      return;
    }

    this.generateSoldier(scene);
    this.generate10Zombies(scene);
    this.generateTowers(scene);
    this.generateBaseFortress(scene);
    this.generateVFX(scene);
  }

  private static generateSoldier(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Shadow
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(28, 48, 32, 12);

    // Boots
    g.fillStyle(0x1a2639, 1);
    g.fillRoundedRect(18, 36, 8, 12, 3);
    g.fillRoundedRect(30, 36, 8, 12, 3);

    // Body (Tactical Kevlar Vest)
    g.fillStyle(0x09202a, 1); // outline / base
    g.fillRoundedRect(16, 18, 24, 22, 5);
    g.fillStyle(0x0077b6, 1); // Blue vest
    g.fillRoundedRect(18, 20, 20, 18, 4);

    // Tactical pouches
    g.fillStyle(0x93d8f1, 1);
    g.fillRect(20, 26, 6, 5);
    g.fillRect(30, 26, 6, 5);

    // Arms holding rifle
    g.fillStyle(0x09202a, 1);
    g.fillRect(36, 18, 6, 18);
    g.fillStyle(0x34454e, 1); // Assault Rifle
    g.fillRect(38, 4, 6, 32);
    g.fillStyle(0x00f5d4, 1); // Laser sight / scope
    g.fillRect(40, 10, 4, 6);

    // Helmet & Head
    g.fillStyle(0x00f5d4, 1); // Cyan helmet
    g.fillCircle(28, 14, 11);
    g.fillStyle(0x09202a, 1); // Tactical visor
    g.fillRoundedRect(22, 11, 12, 6, 2);

    g.generateTexture('soldier_tactical', 56, 56);
    // Also alias as soldier_base for compatibility
    g.generateTexture('soldier_base', 56, 56);
    g.destroy();
  }

  private static generate10Zombies(scene: Phaser.Scene): void {
    // --------------------------------------------------
    // 1. Walker (Zombie Thường) - 1.0x (52x52)
    // --------------------------------------------------
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(26, 46, 28, 10);
    // Legs
    g.fillStyle(0x2d3a3a, 1);
    g.fillRect(18, 32, 6, 14);
    g.fillRect(28, 30, 6, 16);
    // Tattered clothes & rotting flesh
    g.fillStyle(0x38b000, 1); // Rotten green
    g.fillRoundedRect(16, 16, 20, 18, 4);
    g.fillStyle(0x5a189a, 0.8); // Ripped purple shirt
    g.fillRect(16, 16, 20, 10);
    // Arms stretched forward
    g.fillStyle(0x70e000, 1);
    g.fillRect(10, 16, 6, 18);
    g.fillRect(36, 16, 6, 18);
    // Head with open jaw & glowing red eyes
    g.fillStyle(0x38b000, 1);
    g.fillCircle(26, 12, 10);
    g.fillStyle(0xd90429, 1); // Red eyes
    g.fillCircle(22, 10, 2.5);
    g.fillCircle(30, 10, 2.5);
    g.generateTexture('zombie_walker', 52, 52);
    g.destroy();

    // --------------------------------------------------
    // 2. Runner (Zombie Chạy) - 0.9x Lean, Sharp (44x44)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(22, 40, 24, 8);
    // Long athletic running legs
    g.fillStyle(0xd90429, 1);
    g.fillTriangle(14, 42, 22, 24, 18, 42);
    g.fillTriangle(26, 42, 22, 24, 30, 42);
    // Slanted body (leaning forward)
    g.fillStyle(0xf72585, 1);
    g.beginPath();
    g.moveTo(22, 8);
    g.lineTo(12, 34);
    g.lineTo(32, 34);
    g.closePath();
    g.fillPath();
    // Yellow blazing eyes & head
    g.fillStyle(0xffbe0b, 1);
    g.fillCircle(22, 10, 7);
    g.fillStyle(0x000000, 1);
    g.fillCircle(20, 9, 2);
    g.fillCircle(24, 9, 2);
    g.generateTexture('zombie_runner', 44, 44);
    g.destroy();

    // --------------------------------------------------
    // 3. Armored (Zombie Giáp) - 1.2x Bulky Steel (62x62)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(31, 54, 36, 12);
    // Heavy steel legs
    g.fillStyle(0x343a40, 1);
    g.fillRect(20, 38, 9, 16);
    g.fillRect(33, 38, 9, 16);
    // Spiked heavy chestplate
    g.fillStyle(0x6c757d, 1);
    g.fillRoundedRect(14, 18, 34, 24, 6);
    g.lineStyle(2, 0xffd166, 1);
    g.strokeRoundedRect(14, 18, 34, 24, 6);
    // Iron Shield on left arm
    g.fillStyle(0x495057, 1);
    g.fillRoundedRect(6, 16, 10, 28, 4);
    g.lineStyle(2, 0xffd166, 1);
    g.strokeRoundedRect(6, 16, 10, 28, 4);
    // Spiked steel helmet
    g.fillStyle(0xadb5bd, 1);
    g.fillCircle(31, 14, 12);
    g.fillStyle(0xd90429, 1); // Visor slit
    g.fillRect(25, 13, 12, 3);
    // Helmet spike
    g.fillStyle(0xffd166, 1);
    g.fillTriangle(31, 2, 28, 8, 34, 8);
    g.generateTexture('zombie_armored', 62, 62);
    g.destroy();

    // --------------------------------------------------
    // 4. Spitter (Zombie Độc) - 1.1x Toxic Slime (56x56)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(28, 48, 30, 10);
    // Swollen purple body
    g.fillStyle(0x7209b7, 1);
    g.fillCircle(28, 28, 18);
    // Glowing toxic pustules (acid green)
    g.fillStyle(0xccff33, 1);
    g.fillCircle(18, 22, 7);
    g.fillCircle(38, 20, 6);
    g.fillCircle(24, 38, 6);
    g.fillCircle(33, 34, 5);
    // Gaping acid maw
    g.fillStyle(0x38b000, 1);
    g.fillCircle(28, 16, 10);
    g.fillStyle(0xccff33, 1);
    g.fillCircle(28, 16, 5);
    g.generateTexture('zombie_spitter', 56, 56);
    g.destroy();

    // --------------------------------------------------
    // 5. Healer (Zombie Hồi Máu) - 1.0x Medical Cross (52x52)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(26, 46, 28, 10);
    // Healing aura glow
    g.lineStyle(2, 0x06d6a0, 0.6);
    g.strokeCircle(26, 24, 22);
    // Body & Biohazard pack
    g.fillStyle(0x06d6a0, 1);
    g.fillRoundedRect(16, 16, 20, 20, 5);
    g.fillStyle(0x118ab2, 1);
    g.fillRect(10, 18, 6, 14); // Left chemical canister
    g.fillRect(36, 18, 6, 14); // Right chemical canister
    // White Medical Cross on chest
    g.fillStyle(0xffffff, 1);
    g.fillRect(23, 20, 6, 12);
    g.fillRect(20, 23, 12, 6);
    // Head with emerald goggles
    g.fillStyle(0x073b4c, 1);
    g.fillCircle(26, 12, 9);
    g.fillStyle(0x06d6a0, 1);
    g.fillCircle(23, 11, 3);
    g.fillCircle(29, 11, 3);
    g.generateTexture('zombie_healer', 52, 52);
    g.destroy();

    // --------------------------------------------------
    // 6. Brute (Zombie Khổng Lồ) - 1.6x Behemoth (88x88)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.6);
    g.fillEllipse(44, 78, 56, 16);
    // Giant tree-trunk legs
    g.fillStyle(0x240046, 1);
    g.fillRect(24, 52, 16, 26);
    g.fillRect(48, 52, 16, 26);
    // Massive muscular torso
    g.fillStyle(0x3a0ca3, 1);
    g.fillRoundedRect(18, 22, 52, 36, 10);
    // Veins of molten lava
    g.fillStyle(0xf72585, 1);
    g.fillRect(28, 30, 8, 3);
    g.fillRect(48, 34, 10, 3);
    // Massive boulder fists
    g.fillStyle(0x10002b, 1);
    g.fillCircle(14, 46, 12);
    g.fillCircle(74, 46, 12);
    // Horned brutish head
    g.fillStyle(0x5a189a, 1);
    g.fillCircle(44, 18, 14);
    g.fillStyle(0xd90429, 1); // Spikes
    g.fillTriangle(30, 14, 38, 20, 28, 26);
    g.fillTriangle(58, 14, 50, 20, 60, 26);
    g.generateTexture('zombie_brute', 88, 88);
    g.destroy();

    // --------------------------------------------------
    // 7. Shocker (Zombie Điện) - 1.1x High Voltage (56x56)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(28, 48, 28, 10);
    // Electric blue torso & electrodes
    g.fillStyle(0x0077b6, 1);
    g.fillRoundedRect(16, 18, 24, 22, 5);
    // Twin Tesla coils on shoulders
    g.fillStyle(0xfee440, 1);
    g.fillRect(12, 12, 5, 16);
    g.fillRect(39, 12, 5, 16);
    g.fillCircle(14, 10, 4);
    g.fillCircle(41, 10, 4);
    // Head with spark visor
    g.fillStyle(0x023e8a, 1);
    g.fillCircle(28, 14, 10);
    g.fillStyle(0x00f5d4, 1);
    g.fillRect(22, 12, 12, 4);
    // Electric zig-zag lightning
    g.lineStyle(2, 0xfee440, 1);
    g.strokePoints([
      { x: 28, y: 22 },
      { x: 23, y: 28 },
      { x: 31, y: 32 },
      { x: 26, y: 38 },
    ]);
    g.generateTexture('zombie_shocker', 56, 56);
    g.destroy();

    // --------------------------------------------------
    // 8. Summoner (Zombie Triệu Hồi) - 1.25x Necromancer (64x64)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(32, 56, 34, 12);
    // Dark ceremonial robe
    g.fillStyle(0x240046, 1);
    g.beginPath();
    g.moveTo(32, 6);
    g.lineTo(12, 54);
    g.lineTo(52, 54);
    g.closePath();
    g.fillPath();
    // Glowing mystic orb in hands
    g.fillStyle(0x9d4edd, 1);
    g.fillCircle(32, 34, 10);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 34, 4);
    // Spooky floating skull minion on shoulder
    g.fillStyle(0xe0aaff, 1);
    g.fillCircle(14, 20, 6);
    g.fillStyle(0x000000, 1);
    g.fillCircle(12, 19, 1.5);
    g.fillCircle(16, 19, 1.5);
    // Hooded face with glowing purple eyes
    g.fillStyle(0x10002b, 1);
    g.fillCircle(32, 16, 9);
    g.fillStyle(0xc77dff, 1);
    g.fillCircle(29, 15, 2.5);
    g.fillCircle(35, 15, 2.5);
    g.generateTexture('zombie_summoner', 64, 64);
    g.destroy();

    // --------------------------------------------------
    // 9. Shadow (Zombie Bóng Tối) - 1.0x Translucent (48x48)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(24, 42, 24, 8);
    // Smokey dark silhouette (semi-transparent)
    g.fillStyle(0x10002b, 0.7);
    g.fillCircle(24, 24, 18);
    g.lineStyle(2, 0x7b2cbf, 0.85);
    g.strokeCircle(24, 24, 18);
    // Ninja hood wraps
    g.fillStyle(0x240046, 0.85);
    g.fillRect(16, 14, 16, 12);
    // Piercing cyan cat-slit eyes
    g.fillStyle(0x00f5d4, 1);
    g.fillRect(17, 18, 5, 2);
    g.fillRect(26, 18, 5, 2);
    g.generateTexture('zombie_shadow', 48, 48);
    g.destroy();

    // --------------------------------------------------
    // 10. Zombie King (Zombie Vua - BOSS) - 3.0x Giant (150x150)
    // --------------------------------------------------
    g = scene.make.graphics({ x: 0, y: 0 });
    // Massive ground shadow
    g.fillStyle(0x000000, 0.65);
    g.fillEllipse(75, 136, 100, 24);
    // Outer raging fire aura
    g.fillStyle(0x590d22, 0.75);
    g.fillCircle(75, 75, 68);
    g.lineStyle(4, 0xff0054, 0.8);
    g.strokeCircle(75, 75, 66);
    // Heavy demonic plated body
    g.fillStyle(0x800f2f, 1);
    g.fillCircle(75, 75, 50);
    // Molten core
    g.fillStyle(0xff4d6d, 1);
    g.fillCircle(75, 70, 30);
    g.fillStyle(0xffd166, 1);
    g.fillCircle(75, 68, 15);
    // Heavy Spiked Shoulder pauldrons
    g.fillStyle(0x2b0938, 1);
    g.fillTriangle(25, 40, 45, 65, 20, 85);
    g.fillTriangle(125, 40, 105, 65, 130, 85);
    // Royal Golden Crown (5 points with jewels)
    g.fillStyle(0xffb703, 1);
    g.beginPath();
    g.moveTo(42, 38);
    g.lineTo(46, 12);
    g.lineTo(60, 26);
    g.lineTo(75, 6);
    g.lineTo(90, 26);
    g.lineTo(104, 12);
    g.lineTo(108, 38);
    g.closePath();
    g.fillPath();
    // Crown Jewels (Rubies)
    g.fillStyle(0xd90429, 1);
    g.fillCircle(75, 22, 6);
    g.fillCircle(55, 26, 4.5);
    g.fillCircle(95, 26, 4.5);
    // Terrifying Glowing Eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(65, 52, 5);
    g.fillCircle(85, 52, 5);
    g.fillStyle(0xd90429, 1);
    g.fillCircle(65, 52, 2.5);
    g.fillCircle(85, 52, 2.5);
    g.generateTexture('zombie_king', 150, 150);
    g.destroy();
  }

  private static generateTowers(scene: Phaser.Scene): void {
    // 1. Rapid MG Turret (Dual Barrels)
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(38, 68, 48, 14);
    // Octagonal reinforced bunker base
    g.fillStyle(0x1f2421, 1);
    g.fillCircle(38, 38, 34);
    g.lineStyle(3, 0x00bbf9, 1);
    g.strokeCircle(38, 38, 34);
    // Turret cupola
    g.fillStyle(0x212529, 1);
    g.fillCircle(38, 38, 22);
    // Twin steel barrels
    g.fillStyle(0xced4da, 1);
    g.fillRect(30, 4, 6, 32);
    g.fillRect(40, 4, 6, 32);
    // Ammo drum
    g.fillStyle(0x00bbf9, 1);
    g.fillCircle(38, 38, 10);
    g.generateTexture('tower_rapid_mg', 76, 76);
    g.generateTexture('tower_machinegun', 76, 76);
    g.destroy();

    // 2. Plasma Cannon (Heavy Energy Reactor)
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(38, 68, 48, 14);
    // Mount
    g.fillStyle(0x2b2d42, 1);
    g.fillCircle(38, 38, 34);
    g.lineStyle(3, 0xf72585, 1);
    g.strokeCircle(38, 38, 34);
    // Glowing plasma reactor
    g.fillStyle(0x7209b7, 1);
    g.fillCircle(38, 38, 22);
    g.fillStyle(0xf72585, 1);
    g.fillCircle(38, 38, 14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(38, 38, 6);
    // Single heavy energy barrel
    g.fillStyle(0x8d99ae, 1);
    g.fillRect(34, 4, 8, 32);
    g.generateTexture('tower_plasma', 76, 76);
    g.destroy();

    // 3. Tesla Shock Tower
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(38, 68, 48, 14);
    // Blue steel mount
    g.fillStyle(0x03045e, 1);
    g.fillCircle(38, 38, 34);
    g.lineStyle(3, 0xfee440, 1);
    g.strokeCircle(38, 38, 34);
    // Insulator rings
    g.fillStyle(0x0077b6, 1);
    g.fillCircle(38, 38, 24);
    g.fillStyle(0x90e0ef, 1);
    g.fillCircle(38, 38, 16);
    // Golden discharge sphere
    g.fillStyle(0xfee440, 1);
    g.fillCircle(38, 38, 10);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(38, 38, 4);
    g.generateTexture('tower_tesla', 76, 76);
    g.destroy();
  }

  private static generateBaseFortress(scene: Phaser.Scene): void {
    const width = 980;
    const height = 180;
    const g = scene.make.graphics({ x: 0, y: 0 });

    // Fortified bunker wall
    g.fillStyle(0x0a1128, 0.98);
    g.fillRoundedRect(0, 0, width, height, 20);
    g.lineStyle(4, 0x00f5d4, 0.9);
    g.strokeRoundedRect(0, 0, width, height, 20);

    // Blast shield plates
    g.fillStyle(0x1a2639, 1);
    for (let x = 30; x < width - 40; x += 150) {
      g.fillRoundedRect(x, 15, 120, 40, 8);
      g.lineStyle(2, 0x00bbf9, 0.7);
      g.strokeRoundedRect(x, 15, 120, 40, 8);
    }

    // Hazard stripes on central gate
    g.fillStyle(0xffbe0b, 0.8);
    for (let x = 400; x < 580; x += 30) {
      g.fillTriangle(x, 70, x + 15, 70, x, 110);
    }

    // Steel Embrasures
    g.fillStyle(0x000000, 0.8);
    g.fillRoundedRect(380, 65, 220, 50, 10);
    g.lineStyle(3, 0xfee440, 1);
    g.strokeRoundedRect(380, 65, 220, 50, 10);

    g.generateTexture('base_fortress', width, height);
    g.destroy();
  }

  private static generateVFX(scene: Phaser.Scene): void {
    // Tracer bullet
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xfee440, 1);
    g.fillRoundedRect(0, 0, 6, 20, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(1, 2, 4, 10, 2);
    g.generateTexture('vfx_bullet', 6, 20);
    g.generateTexture('bullet_tracer', 6, 20);
    g.destroy();

    // Spark
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xff5400, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 2.5);
    g.generateTexture('vfx_spark', 12, 12);
    g.generateTexture('particle_spark', 12, 12);
    g.destroy();

    // Shield Dome
    g = scene.make.graphics({ x: 0, y: 0 });
    g.lineStyle(5, 0x00f5d4, 0.9);
    g.strokeCircle(70, 70, 65);
    g.fillStyle(0x00f5d4, 0.18);
    g.fillCircle(70, 70, 64);
    g.generateTexture('vfx_shield', 140, 140);
    g.generateTexture('shield_dome', 140, 140);
    g.destroy();
  }
}
