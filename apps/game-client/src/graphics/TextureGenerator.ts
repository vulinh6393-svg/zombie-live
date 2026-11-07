import Phaser from 'phaser';

export class TextureGenerator {
  static generateAll(scene: Phaser.Scene): void {
    if (scene.textures.exists('soldier_base')) {
      return;
    }

    this.generateSoldier(scene);
    this.generate10Zombies(scene);
    this.generateTowers(scene);
    this.generateProjectilesAndFX(scene);
    this.generateBaseAssets(scene);
  }

  private static generateSoldier(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Body & armor
    g.fillStyle(0x0077b6, 1);
    g.fillCircle(24, 24, 18);
    // Helmet
    g.fillStyle(0x00f5d4, 1);
    g.fillCircle(24, 22, 10);
    // Weapon rifle pointing up
    g.fillStyle(0x1a2639, 1);
    g.fillRect(28, 4, 6, 26);
    g.fillStyle(0xfee440, 1);
    g.fillRect(29, 2, 4, 6);
    g.generateTexture('soldier_base', 48, 48);
    g.destroy();
  }

  private static generate10Zombies(scene: Phaser.Scene): void {
    // 1. Walker (Zombie Thường)
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x38b000, 1); // Dark Green
    g.fillCircle(24, 24, 18);
    g.fillStyle(0x70e000, 1);
    g.fillCircle(24, 20, 12);
    // Red glowing eyes
    g.fillStyle(0xd90429, 1);
    g.fillCircle(20, 18, 3);
    g.fillCircle(28, 18, 3);
    g.generateTexture('zombie_walker', 48, 48);
    g.destroy();

    // 2. Runner (Zombie Chạy) - Lean, sharp, crimson orange
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xf72585, 1);
    g.fillTriangle(24, 6, 8, 42, 40, 42);
    g.fillStyle(0xffbe0b, 1);
    g.fillCircle(24, 24, 8);
    g.generateTexture('zombie_runner', 48, 48);
    g.destroy();

    // 3. Armored (Zombie Giáp) - Steel grey with spiked plate
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x6c757d, 1);
    g.fillRoundedRect(6, 6, 40, 40, 8);
    g.lineStyle(3, 0xffd166, 1);
    g.strokeRoundedRect(6, 6, 40, 40, 8);
    g.fillStyle(0x38b000, 1);
    g.fillCircle(26, 26, 10);
    g.generateTexture('zombie_armored', 52, 52);
    g.destroy();

    // 4. Spitter (Zombie Độc) - Acid slime purple/lime pustules
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x7209b7, 1);
    g.fillCircle(26, 26, 20);
    g.fillStyle(0xccff33, 1); // Toxic slime
    g.fillCircle(18, 20, 7);
    g.fillCircle(32, 22, 6);
    g.fillCircle(25, 32, 8);
    g.generateTexture('zombie_spitter', 52, 52);
    g.destroy();

    // 5. Healer (Zombie Hồi Máu) - Emerald green with glowing cross
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x06d6a0, 1);
    g.fillCircle(24, 24, 18);
    // Green Cross
    g.fillStyle(0xffffff, 1);
    g.fillRect(21, 10, 6, 28);
    g.fillRect(10, 21, 28, 6);
    g.generateTexture('zombie_healer', 48, 48);
    g.destroy();

    // 6. Brute (Zombie Khổng Lồ) - 2x size massive behemoth
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x3a0ca3, 1);
    g.fillCircle(45, 45, 40);
    g.fillStyle(0xb5179e, 1);
    g.fillCircle(45, 40, 26);
    // Spikes
    g.fillStyle(0xf72585, 1);
    g.fillTriangle(45, 5, 35, 20, 55, 20);
    g.fillTriangle(15, 30, 25, 40, 10, 50);
    g.fillTriangle(75, 30, 65, 40, 80, 50);
    g.generateTexture('zombie_brute', 90, 90);
    g.destroy();

    // 7. Shocker (Zombie Điện) - Crackling cyan/yellow
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x4cc9f0, 1);
    g.fillCircle(25, 25, 18);
    // Lightning bolt
    g.fillStyle(0xfee440, 1);
    g.beginPath();
    g.moveTo(25, 8);
    g.lineTo(16, 26);
    g.lineTo(26, 26);
    g.lineTo(22, 42);
    g.lineTo(34, 22);
    g.lineTo(26, 22);
    g.closePath();
    g.fillPath();
    g.generateTexture('zombie_shocker', 50, 50);
    g.destroy();

    // 8. Summoner (Zombie Triệu Hồi) - Dark hood with mystic orb
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x240046, 1);
    g.fillTriangle(25, 5, 5, 45, 45, 45);
    g.fillStyle(0x9d4edd, 1);
    g.fillCircle(25, 28, 11);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(25, 28, 4);
    g.generateTexture('zombie_summoner', 50, 50);
    g.destroy();

    // 9. Shadow (Zombie Bóng Tối) - Translucent dark ninja
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x10002b, 0.85);
    g.fillCircle(24, 24, 18);
    g.lineStyle(2, 0xc77dff, 0.9);
    g.strokeCircle(24, 24, 18);
    // Glowing cyan slit eyes
    g.fillStyle(0x00f5d4, 1);
    g.fillRect(16, 20, 6, 3);
    g.fillRect(26, 20, 6, 3);
    g.generateTexture('zombie_shadow', 48, 48);
    g.destroy();

    // 10. Zombie King (Zombie Vua - BOSS) - 3x Giant size, crown & magma
    g = scene.make.graphics({ x: 0, y: 0 });
    // Outer dark rage aura
    g.fillStyle(0x590d22, 0.8);
    g.fillCircle(70, 70, 65);
    // Inner demonic body
    g.fillStyle(0x800f2f, 1);
    g.fillCircle(70, 70, 48);
    // Glowing core
    g.fillStyle(0xff4d6d, 1);
    g.fillCircle(70, 65, 28);
    // Royal Spiked Crown
    g.fillStyle(0xffb703, 1);
    g.beginPath();
    g.moveTo(40, 36);
    g.lineTo(45, 12);
    g.lineTo(57, 28);
    g.lineTo(70, 6);
    g.lineTo(83, 28);
    g.lineTo(95, 12);
    g.lineTo(100, 36);
    g.closePath();
    g.fillPath();
    // Crown Jewels
    g.fillStyle(0xd90429, 1);
    g.fillCircle(70, 24, 5);
    g.fillCircle(52, 28, 4);
    g.fillCircle(88, 28, 4);
    g.generateTexture('zombie_king', 140, 140);
    g.destroy();
  }

  private static generateTowers(scene: Phaser.Scene): void {
    // Machinegun Turret
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1f2421, 1);
    g.fillCircle(36, 36, 32);
    g.fillStyle(0x00bbf9, 1);
    g.fillCircle(36, 36, 20);
    // Dual barrels
    g.fillStyle(0xced4da, 1);
    g.fillRect(28, 4, 5, 28);
    g.fillRect(39, 4, 5, 28);
    g.generateTexture('tower_machinegun', 72, 72);
    g.destroy();

    // Plasma Cannon
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2b2d42, 1);
    g.fillCircle(36, 36, 32);
    g.fillStyle(0xf72585, 1);
    g.fillCircle(36, 36, 22);
    g.fillStyle(0x7209b7, 1);
    g.fillCircle(36, 36, 12);
    g.generateTexture('tower_plasma', 72, 72);
    g.destroy();

    // Tesla Tower
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x03045e, 1);
    g.fillCircle(36, 36, 32);
    g.fillStyle(0x0077b6, 1);
    g.fillCircle(36, 36, 22);
    g.fillStyle(0xfee440, 1);
    g.fillCircle(36, 36, 10);
    g.generateTexture('tower_tesla', 72, 72);
    g.destroy();
  }

  private static generateProjectilesAndFX(scene: Phaser.Scene): void {
    // Bullet tracer
    let g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xfee440, 1);
    g.fillRoundedRect(0, 0, 4, 16, 2);
    g.generateTexture('bullet_tracer', 4, 16);
    g.destroy();

    // Plasma Orb
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x00f5d4, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 4);
    g.generateTexture('plasma_orb', 16, 16);
    g.destroy();

    // Spark particle
    g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xff5400, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle_spark', 8, 8);
    g.destroy();

    // Shield dome texture
    g = scene.make.graphics({ x: 0, y: 0 });
    g.lineStyle(4, 0x00f5d4, 0.8);
    g.strokeCircle(60, 60, 56);
    g.fillStyle(0x00f5d4, 0.15);
    g.fillCircle(60, 60, 54);
    g.generateTexture('shield_dome', 120, 120);
    g.destroy();
  }

  private static generateBaseAssets(scene: Phaser.Scene): void {
    // Defense barricade piece
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1a2639, 1);
    g.fillRoundedRect(0, 0, 120, 30, 6);
    g.lineStyle(2, 0x00bbf9, 1);
    g.strokeRoundedRect(0, 0, 120, 30, 6);
    // Hazard stripes
    g.fillStyle(0xfee440, 0.4);
    g.fillTriangle(20, 0, 40, 0, 20, 30);
    g.fillTriangle(60, 0, 80, 0, 60, 30);
    g.generateTexture('base_barricade', 120, 30);
    g.destroy();
  }
}
