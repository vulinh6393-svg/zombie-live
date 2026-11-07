import Phaser from 'phaser';
import { TextureGenerator } from '../../graphics/TextureGenerator.js';

export class ContactSheetScene extends Phaser.Scene {
  constructor() {
    super('ContactSheetScene');
  }

  create() {
    TextureGenerator.generateAll(this);

    const width = 1080;
    const height = 1920;

    // Dark canvas background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1128, 0x0a1128, 0x001f54, 0x001f54, 1);
    bg.fillRect(0, 0, width, height);

    // Header Title
    this.add.text(width / 2, 70, 'BẢNG THIẾT KẾ 10 CHỦNG ZOMBIE & CHIẾN BINH', {
      fontFamily: 'Arial Black',
      fontSize: '34px',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, 120, 'Zombie Đại Chiến: Thành Trì Cuối Cùng — Character Contact Sheet', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Grid of 10 zombies + Soldier
    const roster = [
      { key: 'soldier_tactical', name: 'Chiến Binh (Survivor)', scale: 1.6, hp: '100 HP', role: 'Phe Ta / Người xem' },
      { key: 'zombie_walker', name: '1. Zombie Thường (Walker)', scale: 1.6, hp: '60 HP', role: 'Đợt 1 / Cơ bản' },
      { key: 'zombie_runner', name: '2. Zombie Chạy (Runner)', scale: 1.6, hp: '40 HP', role: 'Đợt 2 / Tốc độ 2.0' },
      { key: 'zombie_armored', name: '3. Zombie Giáp (Armored)', scale: 1.6, hp: '200 HP', role: 'Đợt 2 / Giảm 30% ST' },
      { key: 'zombie_spitter', name: '4. Zombie Độc (Spitter)', scale: 1.6, hp: '90 HP', role: 'Đợt 3 / Phun axit DoT' },
      { key: 'zombie_healer', name: '5. Zombie Hồi Máu (Healer)', scale: 1.6, hp: '100 HP', role: 'Đợt 3 / Hồi 10 HP/s' },
      { key: 'zombie_brute', name: '6. Zombie Khổng Lồ (Brute)', scale: 1.4, hp: '700 HP', role: 'Đợt 4 / Sát thương 100' },
      { key: 'zombie_shocker', name: '7. Zombie Điện (Shocker)', scale: 1.6, hp: '160 HP', role: 'Đợt 4 / Choáng 2s' },
      { key: 'zombie_summoner', name: '8. Zombie Triệu Hồi (Summoner)', scale: 1.6, hp: '250 HP', role: 'Đợt 4 / Gọi quái' },
      { key: 'zombie_shadow', name: '9. Zombie Bóng Tối (Shadow)', scale: 1.6, hp: '120 HP', role: 'Đợt 5 / Tàng hình 2s' },
    ];

    // Draw grid 2 columns x 5 rows
    const startX = 270;
    const colStep = 540;
    const startY = 220;
    const rowStep = 230;

    roster.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * colStep;
      const y = startY + row * rowStep;

      // Card frame
      const frame = this.add.graphics();
      frame.fillStyle(0x1a2639, 0.85);
      frame.fillRoundedRect(x - 230, y - 85, 460, 180, 16);
      frame.lineStyle(2, index === 0 ? 0x00f5d4 : 0x00bbf9, 0.8);
      frame.strokeRoundedRect(x - 230, y - 85, 460, 180, 16);

      // Sprite preview
      const sprite = this.add.sprite(x - 140, y + 10, item.key);
      sprite.setScale(item.scale);

      // Name & details
      this.add.text(x - 60, y - 50, item.name, {
        fontFamily: 'Arial Black',
        fontSize: '21px',
        color: index === 0 ? '#00f5d4' : '#ffffff',
      });

      this.add.text(x - 60, y - 15, `Máu: ${item.hp}`, {
        fontFamily: 'Arial Black',
        fontSize: '17px',
        color: '#fee440',
      });

      this.add.text(x - 60, y + 18, `Vai trò: ${item.role}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#adb5bd',
      });
    });

    // Boss Zombie King Showcase at bottom (Full width)
    const bossCard = this.add.graphics();
    bossCard.fillStyle(0x3a0ca3, 0.9);
    bossCard.fillRoundedRect(50, 1420, width - 100, 380, 20);
    bossCard.lineStyle(4, 0xf72585, 1);
    bossCard.strokeRoundedRect(50, 1420, width - 100, 380, 20);

    const bossSprite = this.add.sprite(220, 1610, 'zombie_king');
    bossSprite.setScale(1.8);

    this.add.text(390, 1460, '10. ZOMBIE VUA (ZOMBIE KING - BOSS)', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#f72585',
    });

    this.add.text(390, 1515, 'Máu: 12,000 HP | Tốc độ: 0.25 | Sát thương: 200 | 3 Giai đoạn cuồng nộ', {
      fontFamily: 'Arial Black',
      fontSize: '19px',
      color: '#fee440',
    });

    this.add.text(390, 1560, '• Silhouette khổng lồ x3 có sừng gai bọc thép và vương miện hoàng gia nạm hồng ngọc.\n• Hào quang lửa đỏ thẫm cuồng nộ mở rộng dần theo từng pha mất máu.\n• Miễn nhiễm hiệu ứng đẩy lùi, tung sóng xung kích quét sạch hàng phòng ngự.', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#f8f9fa',
      lineSpacing: 10,
    });
  }
}
