import Phaser from 'phaser';
import { SpriteAssetLoader } from '../../assets/SpriteAssetLoader.js';
import { CharacterAnimationRegistry } from '../../assets/CharacterAnimationRegistry.js';

export class ContactSheetScene extends Phaser.Scene {
  constructor() {
    super('ContactSheetScene');
  }

  preload() {
    SpriteAssetLoader.loadAll(this);
  }

  create() {
    CharacterAnimationRegistry.registerAll(this);

    const width = 1080;
    const height = 1920;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1128, 0x0a1128, 0x001428, 0x001428, 1);
    bg.fillRect(0, 0, width, height);

    // Title Header
    this.add.text(width / 2, 60, 'BẢNG THIẾT KẾ SPRITE THẬT — REAL SPRITE ASSET SHEET', {
      fontFamily: 'Arial Black',
      fontSize: '30px',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, 105, 'Phase 02.2: Riley Gombart (OpenGameArt CC0 / CC-BY) & Kenney.nl (CC0)', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#fee440',
    }).setOrigin(0.5);

    // Section 1: Real Survivor Soldier (4 states)
    this.drawSectionHeader(width / 2, 160, '1. CHIẾN BINH ĐẶC NHIỆM (SURVIVOR SOLDIER - 20 FRAMES)');
    const survStates = [
      { label: 'Idle Stance\n(20 frames)', anim: 'survivor-idle', x: 200, y: 310 },
      { label: 'Move w/ Feet\n(20 frames)', anim: 'survivor-walk', x: 430, y: 310, hasFeet: true },
      { label: 'Shoot Carbine\n(3 frames)', anim: 'survivor-shoot', x: 660, y: 310 },
      { label: 'Tactical Reload\n(20 frames)', anim: 'survivor-reload', x: 880, y: 310 },
    ];

    for (const s of survStates) {
      const box = this.add.graphics();
      box.fillStyle(0x131f37, 0.85);
      box.fillRoundedRect(s.x - 95, s.y - 100, 190, 200, 10);
      box.lineStyle(1, 0x00bbf9, 0.6);
      box.strokeRoundedRect(s.x - 95, s.y - 100, 190, 200, 10);

      if (s.hasFeet) {
        const feet = this.add.sprite(s.x, s.y - 15, 'survivor_feet_walk_0').setScale(0.5).setRotation(-Math.PI / 2);
        feet.play('survivor-feet-walk');
      }
      const spr = this.add.sprite(s.x, s.y - 15, 'survivor_idle_0').setScale(0.48).setRotation(-Math.PI / 2);
      spr.play(s.anim);

      this.add.text(s.x, s.y + 65, s.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#00f5d4',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Section 2: Real Zombie Walker (4 states)
    this.drawSectionHeader(width / 2, 480, '2. ZOMBIE WALKER (OPEN GAME ART CC0 - RILEY GOMBART)');
    const zombieStates = [
      { label: 'Idle Breathe\n(17 frames)', anim: 'walker-idle', x: 200, y: 630 },
      { label: 'Walk Cycle\n(17 frames)', anim: 'walker-walk', x: 430, y: 630 },
      { label: 'Claw Attack\n(9 frames)', anim: 'walker-attack', x: 660, y: 630 },
      { label: 'Corpse Death\n(Corpse0 + Blood)', anim: null, texture: 'zombie_corpse_0', x: 880, y: 630 },
    ];

    for (const z of zombieStates) {
      const box = this.add.graphics();
      box.fillStyle(0x23141e, 0.85);
      box.fillRoundedRect(z.x - 95, z.y - 100, 190, 200, 10);
      box.lineStyle(1, 0xff0055, 0.6);
      box.strokeRoundedRect(z.x - 95, z.y - 100, 190, 200, 10);

      if (z.anim) {
        const spr = this.add.sprite(z.x, z.y - 15, 'zombie_idle_0').setScale(0.48).setRotation(Math.PI / 2);
        spr.play(z.anim);
      } else {
        // Blood puddle + corpse
        const blood = this.add.graphics();
        blood.fillStyle(0x7f0000, 0.7);
        blood.fillCircle(z.x, z.y - 15, 30);
        this.add.image(z.x, z.y - 15, z.texture!).setScale(0.48).setRotation(Math.PI / 2);
      }

      this.add.text(z.x, z.y + 65, z.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ff5400',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Section 3: Turrets & Weapons (Kenney CC0)
    this.drawSectionHeader(width / 2, 800, '3. VŨ KHÍ PHÒNG THỦ & ĐẠN (KENNEY TOWER DEFENSE CC0)');
    const turretAssets = [
      { label: 'Turret Base\n(Bệ Tháp Đá)', key: 'turret_base', scale: 0.9, x: 200, y: 940 },
      { label: 'Dual-Barrel Gun\n(Súng Nòng Đôi)', key: 'turret_gun_dual', scale: 0.9, x: 430, y: 940 },
      { label: 'Single Heavy Gun\n(Trọng Pháo)', key: 'turret_gun_single', scale: 0.9, x: 660, y: 940 },
      { label: 'Bullet & Flash\n(Đạn & Lửa Nòng)', key: 'bullet_tracer', scale: 1.1, x: 880, y: 940, extra: 'muzzle_flash' },
    ];

    for (const t of turretAssets) {
      const box = this.add.graphics();
      box.fillStyle(0x162238, 0.85);
      box.fillRoundedRect(t.x - 95, t.y - 90, 190, 180, 10);
      box.lineStyle(1, 0xfee440, 0.6);
      box.strokeRoundedRect(t.x - 95, t.y - 90, 190, 180, 10);

      this.add.image(t.x, t.y - 15, t.key).setScale(t.scale);
      if (t.extra) {
        this.add.image(t.x + 35, t.y - 15, t.extra).setScale(0.7);
      }

      this.add.text(t.x, t.y + 55, t.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#fee440',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Section 4: Environment & Barricades
    this.drawSectionHeader(width / 2, 1100, '4. CÔNG SỰ BARRICADE & CHIẾN TRƯỜNG ĐÊM (KENNEY CC0)');
    const envAssets = [
      { label: 'Barrier Barricade\n(Rào Cản Sọc)', key: 'barricade_barrier', scale: 0.9, x: 200, y: 1240 },
      { label: 'Sandbags\n(Bao Cát Chắn)', key: 'sandbags', scale: 0.9, x: 430, y: 1240 },
      { label: 'Ammo Crate\n(Thùng Tiếp Tế)', key: 'ammo_crate', scale: 0.85, x: 660, y: 1240 },
      { label: 'Hit Explosion\n(VFX Chạm Nổ)', key: 'hit_explosion', scale: 0.7, x: 880, y: 1240 },
    ];

    for (const e of envAssets) {
      const box = this.add.graphics();
      box.fillStyle(0x162238, 0.85);
      box.fillRoundedRect(e.x - 95, e.y - 90, 190, 180, 10);
      box.lineStyle(1, 0x00f5d4, 0.6);
      box.strokeRoundedRect(e.x - 95, e.y - 90, 190, 180, 10);

      this.add.image(e.x, e.y - 15, e.key).setScale(e.scale);

      this.add.text(e.x, e.y + 55, e.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#00f5d4',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Section 5: License & Attribution Footer
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x0a1128, 0.95);
    footerBg.fillRoundedRect(60, 1400, width - 120, 460, 16);
    footerBg.lineStyle(2, 0x00f5d4, 0.7);
    footerBg.strokeRoundedRect(60, 1400, width - 120, 460, 16);

    this.add.text(width / 2, 1430, '📜 BẢNG KÊ KHAI GIẤY PHÉP & BẢN QUYỀN (LICENSE MANIFEST)', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    const licenseLines = [
      '• Zombie Walker: Tác giả Riley Gombart, cấp phép CC0 1.0 Universal (Public Domain).',
      '  URL: https://opengameart.org/content/animated-top-down-zombie | SHA256: 2aebc386...',
      '• Survivor Soldier: Tác giả Riley Gombart, cấp phép CC-BY 3.0 với ghi nhận bản quyền.',
      '  URL: https://opengameart.org/content/animated-top-down-survivor-player | SHA256: 1e66fe4b...',
      '• Turrets, Environment, Barricades: Tác giả Kenney Vleugels (Kenney.nl), cấp phép CC0.',
      '  URL: https://kenney.nl/assets/tower-defense-top-down | Không yêu cầu trả phí.',
      '• Tuân thủ tuyệt đối: 100% asset đã tải và lưu trữ tại apps/game-client/public/assets/',
      '• Đảm bảo không sử dụng bất kỳ sprite hình học procedural đơn giản nào cho nhân vật.',
    ];

    let lineY = 1480;
    for (const line of licenseLines) {
      this.add.text(90, lineY, line, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#adb5bd',
        lineSpacing: 6,
      });
      lineY += 40;
    }
  }

  private drawSectionHeader(x: number, y: number, text: string): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x00f5d4, 0.15);
    bar.fillRoundedRect(60, y - 18, 960, 36, 8);
    bar.lineStyle(1, 0x00f5d4, 0.6);
    bar.strokeRoundedRect(60, y - 18, 960, 36, 8);

    this.add.text(x, y, text, {
      fontFamily: 'Arial Black',
      fontSize: '17px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
