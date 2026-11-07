import Phaser from 'phaser';
import { GAME_FONTS } from '../config/FontConfig.js';

/**
 * TikTok LIVE UI Safe Zone Overlay Simulator
 * Renders an authentic TikTok LIVE mobile portrait interface overlay
 * to verify zero visual obstruction with game HUD, squads, and active combat.
 */
export class TikTokSafeZone {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = 1080;
    const height = 1920;

    this.container = scene.add.container(0, 0).setDepth(200);

    // 1. Top Left: Streamer Profile Pill (y: 40 - 105)
    const profilePill = scene.add.graphics();
    profilePill.fillStyle(0x000000, 0.5);
    profilePill.fillRoundedRect(35, 45, 260, 65, 32);

    const avatar = scene.add.graphics();
    avatar.fillStyle(0xff0055, 1);
    avatar.fillCircle(68, 77, 24);

    const nameText = scene.add.text(102, 58, 'ZombieLiveVN', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    const followerText = scene.add.text(102, 79, '❤️ 142.5K lượt thích', {
      fontFamily: GAME_FONTS.BODY,
      fontSize: '12px',
      color: '#cccccc',
    });

    // 2. Top Right: Live Viewers Badge & Close Button (y: 45 - 95)
    const livePill = scene.add.graphics();
    livePill.fillStyle(0x000000, 0.5);
    livePill.fillRoundedRect(width - 220, 45, 120, 45, 22);

    const viewerCount = scene.add.text(width - 160, 67, '👁️ 3,420', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const closeBtn = scene.add.graphics();
    closeBtn.fillStyle(0x000000, 0.5);
    closeBtn.fillCircle(width - 55, 68, 22);
    const closeX = scene.add.text(width - 55, 68, '✕', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 3. Bottom Left: Simulated TikTok Live Chat Stream (Docked at y: 1580, completely below combat & fortress wall)
    const chatContainer = scene.add.container(35, height - 340);
    const chatBg = scene.add.graphics();
    chatBg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.45, 0.45);
    chatBg.fillRect(0, 0, 440, 220);

    const sampleComments = [
      { user: 'MinhAnh99', text: 'JOIN Alpha! Phòng tuyến trái cố lên!' },
      { user: 'HuyGamer', text: 'Đã gửi 10 Hoa Hồng hỗ trợ đạn dược 🌹' },
      { user: 'ThaoTran', text: 'Căn cứ sắp vỡ rồi, sửa đi mọi người!' },
      { user: 'BaoLong_Pro', text: 'JOIN Charlie! Đội hỏa lực sẵn sàng!' },
    ];

    chatContainer.add(chatBg);
    for (let i = 0; i < sampleComments.length; i++) {
      const c = sampleComments[i];
      const bubble = scene.add.graphics();
      bubble.fillStyle(0x000000, 0.6);
      bubble.fillRoundedRect(0, i * 52, 420, 44, 10);

      const commentUser = scene.add.text(12, i * 52 + 6, `@${c.user}:`, {
        fontFamily: GAME_FONTS.TACTICAL,
        fontSize: '13px',
        color: '#00f5d4',
        fontStyle: 'bold',
      });

      const commentContent = scene.add.text(12, i * 52 + 23, c.text, {
        fontFamily: GAME_FONTS.BODY,
        fontSize: '12px',
        color: '#ffffff',
      });

      chatContainer.add([bubble, commentUser, commentContent]);
    }

    // 4. Bottom Right: TikTok Floating Action Icons
    const actionIconsContainer = scene.add.container(width - 85, height - 380);
    const icons = ['🎁', '🌹', '↗️', '❤️'];
    for (let i = 0; i < icons.length; i++) {
      const iconBg = scene.add.graphics();
      iconBg.fillStyle(0x000000, 0.55);
      iconBg.fillCircle(0, i * 65, 24);

      const iconText = scene.add.text(0, i * 65, icons[i], {
        fontSize: '22px',
      }).setOrigin(0.5);

      actionIconsContainer.add([iconBg, iconText]);
    }

    // 5. Visual Safe Zone Guideline Bounds
    const safeZoneLines = scene.add.graphics();
    safeZoneLines.lineStyle(2, 0x00f5d4, 0.5);
    safeZoneLines.strokeRect(30, 125, width - 60, height - 480);

    const safeTag = scene.add.text(width / 2, height - 365, '--- KHU VỰC CHIẾN ĐẤU AN TOÀN (TIKTOK SAFE ZONE) ---', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#00f5d4',
    }).setOrigin(0.5);

    this.container.add([
      profilePill, avatar, nameText, followerText,
      livePill, viewerCount, closeBtn, closeX,
      chatContainer,
      actionIconsContainer,
      safeZoneLines, safeTag,
    ]);

    this.container.setVisible(false);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.container.setVisible(visible);
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    this.container.setVisible(this.isVisible);
    return this.isVisible;
  }
}
