import Phaser from 'phaser';

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

    // 1. Top Left: Streamer Profile Pill
    const profilePill = scene.add.graphics();
    profilePill.fillStyle(0x000000, 0.45);
    profilePill.fillRoundedRect(35, 45, 260, 65, 32);

    const avatar = scene.add.graphics();
    avatar.fillStyle(0xff0055, 1);
    avatar.fillCircle(68, 77, 24);

    const nameText = scene.add.text(102, 58, 'ZombieLiveVN', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    const followerText = scene.add.text(102, 79, '❤️ 142.5K lượt thích', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#cccccc',
    });

    // 2. Top Right: Live Viewers Badge & Close Button
    const livePill = scene.add.graphics();
    livePill.fillStyle(0x000000, 0.45);
    livePill.fillRoundedRect(width - 220, 45, 120, 45, 22);

    const viewerCount = scene.add.text(width - 160, 67, '👁️ 3,420', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const closeBtn = scene.add.graphics();
    closeBtn.fillStyle(0x000000, 0.45);
    closeBtn.fillCircle(width - 55, 68, 22);
    const closeX = scene.add.text(width - 55, 68, '✕', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 3. Bottom Left: Simulated TikTok Live Chat Stream
    const chatContainer = scene.add.container(35, height - 420);
    const chatBg = scene.add.graphics();
    chatBg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.4, 0.4);
    chatBg.fillRect(0, 0, 460, 260);

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
      bubble.fillStyle(0x000000, 0.55);
      bubble.fillRoundedRect(0, i * 60, 440, 48, 12);

      const commentUser = scene.add.text(12, i * 60 + 8, `@${c.user}:`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#00f5d4',
        fontStyle: 'bold',
      });

      const commentContent = scene.add.text(12, i * 60 + 26, c.text, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffffff',
      });

      chatContainer.add([bubble, commentUser, commentContent]);
    }

    // 4. Bottom Right: TikTok Floating Action Icons (Share, Rose, Gift, Like Stream)
    const actionIconsContainer = scene.add.container(width - 100, height - 460);

    const icons = [
      { label: '📤', sub: 'Chia sẻ' },
      { label: '🌹', sub: 'Hoa' },
      { label: '🎁', sub: 'Hộp Quà' },
      { label: '💖', sub: '124K' },
    ];

    for (let i = 0; i < icons.length; i++) {
      const btnBg = scene.add.graphics();
      btnBg.fillStyle(0x000000, 0.5);
      btnBg.fillCircle(0, i * 85, 28);
      btnBg.lineStyle(1.5, 0xffffff, 0.3);
      btnBg.strokeCircle(0, i * 85, 28);

      const iconText = scene.add.text(0, i * 85 - 2, icons[i].label, {
        fontSize: '24px',
      }).setOrigin(0.5);

      const subText = scene.add.text(0, i * 85 + 24, icons[i].sub, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#ffffff',
      }).setOrigin(0.5);

      actionIconsContainer.add([btnBg, iconText, subText]);
    }

    // 5. Bottom Comment Input Bar
    const inputBar = scene.add.graphics();
    inputBar.fillStyle(0x000000, 0.6);
    inputBar.fillRoundedRect(35, height - 120, width - 260, 60, 30);

    const inputPlaceholder = scene.add.text(65, height - 90, 'Thêm bình luận...', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);

    // Safe zone boundary markers (translucent dashed green lines showing exact safe zones)
    const safeZoneGuides = scene.add.graphics();
    safeZoneGuides.lineStyle(2, 0x00ff88, 0.6);
    safeZoneGuides.strokeRect(30, 190, width - 60, height - 380);

    const safeZoneTag = scene.add.text(width / 2, 205, '📱 TIKTOK LIVE SAFE ZONE (KHÔNG BỊ CHE KHUẤT)', {
      fontFamily: 'Arial Black',
      fontSize: '12px',
      color: '#00ff88',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5);

    this.container.add([
      profilePill,
      avatar,
      nameText,
      followerText,
      livePill,
      viewerCount,
      closeBtn,
      closeX,
      chatContainer,
      actionIconsContainer,
      inputBar,
      inputPlaceholder,
      safeZoneGuides,
      safeZoneTag,
    ]);

    // Hidden by default unless toggled
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
