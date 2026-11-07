import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const width = 1080;
    const height = 1920;

    // Background gradient / grid
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1128, 0x0a1128, 0x001f54, 0x001f54, 1);
    bg.fillRect(0, 0, width, height);

    // Grid lines for lanes
    const grid = this.add.graphics();
    grid.lineStyle(2, 0x00f5d4, 0.2);
    // Lane 1, Lane 2, Lane 3
    const laneWidth = width / 3;
    grid.lineBetween(laneWidth, 160, laneWidth, height - 320);
    grid.lineBetween(laneWidth * 2, 160, laneWidth * 2, height - 320);

    // Header HUD
    this.add.text(width / 2, 80, 'ZOMBIE ĐẠI CHIẾN', {
      fontFamily: "'Montserrat', 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#00f5d4',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(width / 2, 140, 'THÀNH TRÌ CUỐI CÙNG — PHASE 01', {
      fontFamily: "'Be Vietnam Pro', 'Montserrat', Arial, sans-serif",
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    // Base defense line placeholder at bottom
    const baseGraphics = this.add.graphics();
    baseGraphics.fillStyle(0x1a2639, 0.9);
    baseGraphics.fillRoundedRect(40, height - 320, width - 80, 260, 20);
    baseGraphics.lineStyle(4, 0x00bbf9, 1);
    baseGraphics.strokeRoundedRect(40, height - 320, width - 80, 260, 20);

    this.add.text(width / 2, height - 250, '🛡️ CĂN CỨ PHÒNG THỦ (BASE: 10,000 HP)', {
      fontFamily: "'Montserrat', 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#00bbf9',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 190, 'Lệnh chuẩn bị: JOIN | BẮN | SỬA | CỨU', {
      fontFamily: "'Be Vietnam Pro', Arial, sans-serif",
      fontSize: '24px',
      color: '#f8f9fa',
      align: 'center',
    }).setOrigin(0.5);

    // Status Badge
    const badge = this.add.graphics();
    badge.fillStyle(0xff5400, 1);
    badge.fillRoundedRect(width / 2 - 180, 220, 360, 50, 12);

    this.add.text(width / 2, 245, 'MOCK MODE • SERVER 20 HZ', {
      fontFamily: "'Montserrat', 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    // Central info
    this.add.text(width / 2, height / 2, 'HỆ THỐNG MÔ PHỎNG ĐANG SẴN SÀNG\nĐang kết nối Server Authoritative...', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#adb5bd',
      align: 'center',
      lineSpacing: 16,
    }).setOrigin(0.5);
  }
}
