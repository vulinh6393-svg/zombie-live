import Phaser from 'phaser';
import { ExtendedMatchSnapshot } from '../types.js';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Header components
  private waveText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private baseHpText: Phaser.GameObjects.Text;
  private baseHpBar: Phaser.GameObjects.Graphics;
  private entityCountText: Phaser.GameObjects.Text;

  // Boss components
  private bossContainer: Phaser.GameObjects.Container;
  private bossHpBar: Phaser.GameObjects.Graphics;
  private bossHpText: Phaser.GameObjects.Text;

  // Gift Alert
  private giftAlertContainer: Phaser.GameObjects.Container;
  private giftAlertText: Phaser.GameObjects.Text;
  private giftAlertTween: Phaser.Tweens.Tween | null = null;

  // MVP Leaderboard
  private mvpContainer: Phaser.GameObjects.Container;
  private mvpLines: Phaser.GameObjects.Text[] = [];

  // Match outcome
  private outcomeContainer: Phaser.GameObjects.Container;
  private outcomeTitle: Phaser.GameObjects.Text;
  private outcomeSubtitle: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = 1080;

    // --- 1. Top HUD Header ---
    const topBg = scene.add.graphics();
    topBg.fillStyle(0x0a1128, 0.92);
    topBg.fillRoundedRect(30, 40, width - 60, 150, 16);
    topBg.lineStyle(2, 0x00f5d4, 0.8);
    topBg.strokeRoundedRect(30, 40, width - 60, 150, 16);

    this.waveText = scene.add.text(60, 60, 'ĐỢT: CHUẨN BỊ', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#00f5d4',
    });

    this.timerText = scene.add.text(width - 60, 60, '05:00', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#fee440',
    }).setOrigin(1, 0);

    // Base HP Bar
    this.baseHpBar = scene.add.graphics();
    this.baseHpText = scene.add.text(width / 2, 115, 'MÁU CĂN CỨ: 10,000 / 10,000 HP', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.entityCountText = scene.add.text(width / 2, 155, 'Lính: 0 | Zombie: 0', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#adb5bd',
    }).setOrigin(0.5);

    // --- 2. Boss HP Bar (Hidden by default) ---
    this.bossContainer = scene.add.container(0, 210);
    const bossBg = scene.add.graphics();
    bossBg.fillStyle(0x3a0ca3, 0.9);
    bossBg.fillRoundedRect(80, 0, width - 160, 75, 12);
    bossBg.lineStyle(3, 0xf72585, 1);
    bossBg.strokeRoundedRect(80, 0, width - 160, 75, 12);

    const bossTitle = scene.add.text(width / 2, 16, '⚠️ ZOMBIE VUA (BOSS PHASE) ⚠️', {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#f72585',
    }).setOrigin(0.5);

    this.bossHpBar = scene.add.graphics();
    this.bossHpText = scene.add.text(width / 2, 50, '12,000 / 12,000 HP', {
      fontFamily: 'Arial Black',
      fontSize: '17px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.bossContainer.add([bossBg, bossTitle, this.bossHpBar, this.bossHpText]);
    this.bossContainer.setVisible(false);

    // --- 3. Gift Alert Banner ---
    this.giftAlertContainer = scene.add.container(width / 2, 330);
    const giftBg = scene.add.graphics();
    giftBg.fillStyle(0xff5400, 0.95);
    giftBg.fillRoundedRect(-260, -30, 520, 60, 30);
    giftBg.lineStyle(3, 0xfee440, 1);
    giftBg.strokeRoundedRect(-260, -30, 520, 60, 30);

    this.giftAlertText = scene.add.text(0, 0, '🎁 QUÀ TẶNG: KÍCH HOẠT KỸ NĂNG', {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.giftAlertContainer.add([giftBg, this.giftAlertText]);
    this.giftAlertContainer.setVisible(false);

    // --- 4. MVP Mini Leaderboard (Top Right) ---
    this.mvpContainer = scene.add.container(width - 290, 320);
    const mvpBg = scene.add.graphics();
    mvpBg.fillStyle(0x001f54, 0.85);
    mvpBg.fillRoundedRect(0, 0, 250, 160, 12);
    mvpBg.lineStyle(1, 0x00bbf9, 0.8);
    mvpBg.strokeRoundedRect(0, 0, 250, 160, 12);

    const mvpTitle = scene.add.text(125, 14, '🏆 BẢNG MVP TRẬN', {
      fontFamily: 'Arial Black',
      fontSize: '16px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    this.mvpContainer.add([mvpBg, mvpTitle]);
    for (let i = 0; i < 4; i++) {
      const line = scene.add.text(20, 42 + i * 28, `${i + 1}. ...`, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#ffffff',
      });
      this.mvpLines.push(line);
      this.mvpContainer.add(line);
    }

    // --- 5. Bottom Instructions (Safe for TikTok UI) ---
    const bottomBg = scene.add.graphics();
    bottomBg.fillStyle(0x0a1128, 0.95);
    bottomBg.fillRoundedRect(30, 1780, width - 60, 100, 16);
    bottomBg.lineStyle(2, 0x00bbf9, 0.8);
    bottomBg.strokeRoundedRect(30, 1780, width - 60, 100, 16);

    const commentTitle = scene.add.text(width / 2, 1805, '💬 BÌNH LUẬN ĐỂ THAM GIA PHÒNG THỦ', {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    const commandList = scene.add.text(width / 2, 1845, 'JOIN: Vào trận | BẮN: Bắn tỉa | SỬA: Hồi máu căn cứ | CỨU: Tiếp tế', {
      fontFamily: 'Arial',
      fontSize: '19px',
      color: '#f8f9fa',
    }).setOrigin(0.5);

    // --- 6. Outcome Banner (Victory / Defeat) ---
    this.outcomeContainer = scene.add.container(width / 2, 900);
    const outcomeBg = scene.add.graphics();
    outcomeBg.fillStyle(0x000000, 0.9);
    outcomeBg.fillRoundedRect(-380, -120, 760, 240, 24);
    outcomeBg.lineStyle(4, 0xfee440, 1);
    outcomeBg.strokeRoundedRect(-380, -120, 760, 240, 24);

    this.outcomeTitle = scene.add.text(0, -40, 'KẾT THÚC TRẬN', {
      fontFamily: 'Arial Black',
      fontSize: '52px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    this.outcomeSubtitle = scene.add.text(0, 45, 'Chuẩn bị vòng tiếp theo...', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.outcomeContainer.add([outcomeBg, this.outcomeTitle, this.outcomeSubtitle]);
    this.outcomeContainer.setVisible(false);

    // Master container
    this.container = scene.add.container(0, 0, [
      topBg,
      this.waveText,
      this.timerText,
      this.baseHpBar,
      this.baseHpText,
      this.entityCountText,
      this.bossContainer,
      this.giftAlertContainer,
      this.mvpContainer,
      bottomBg,
      commentTitle,
      commandList,
      this.outcomeContainer,
    ]);
  }

  update(snapshot: ExtendedMatchSnapshot): void {
    // 1. Wave phase & timer
    const phaseLabel = this.getPhaseLabel(snapshot.phase);
    this.waveText.setText(`ĐỢT: ${phaseLabel}`);

    const totalSeconds = 300;
    const remaining = Math.max(0, totalSeconds - snapshot.elapsedSeconds);
    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');
    this.timerText.setText(`${mins}:${secs}`);

    // 2. Base HP Bar
    this.baseHpBar.clear();
    const barWidth = 980;
    const barHeight = 16;
    const barX = 50;
    const barY = 95;

    this.baseHpBar.fillStyle(0x1a2639, 1);
    this.baseHpBar.fillRect(barX, barY, barWidth, barHeight);

    const ratio = Math.max(0, Math.min(1, snapshot.baseHp / snapshot.maxBaseHp));
    const color = ratio > 0.5 ? 0x00f5d4 : ratio > 0.25 ? 0xfee440 : 0xd90429;
    this.baseHpBar.fillStyle(color, 1);
    this.baseHpBar.fillRect(barX, barY, barWidth * ratio, barHeight);

    this.baseHpText.setText(`MÁU CĂN CỨ: ${snapshot.baseHp.toLocaleString()} / ${snapshot.maxBaseHp.toLocaleString()} HP`);
    this.entityCountText.setText(`Lính: ${snapshot.soldiers.length} / 40 | Zombie: ${snapshot.zombies.length} | Người xem: ${snapshot.activePlayerCount}`);

    // 3. Boss Bar
    if (snapshot.bossHp !== undefined && snapshot.maxBossHp && snapshot.bossHp > 0) {
      this.bossContainer.setVisible(true);
      this.bossHpBar.clear();
      const bRatio = Math.max(0, Math.min(1, snapshot.bossHp / snapshot.maxBossHp));
      this.bossHpBar.fillStyle(0x1a2639, 1);
      this.bossHpBar.fillRect(100, 36, 880, 14);
      this.bossHpBar.fillStyle(0xf72585, 1);
      this.bossHpBar.fillRect(100, 36, 880 * bRatio, 14);
      this.bossHpText.setText(`${snapshot.bossHp.toLocaleString()} / ${snapshot.maxBossHp.toLocaleString()} HP`);
    } else {
      this.bossContainer.setVisible(false);
    }

    // 4. Gift Alert
    if (snapshot.giftSkillActive) {
      this.showGiftAlert(snapshot.giftSkillActive.name, snapshot.giftSkillActive.senderName);
    }

    // 5. MVP Leaderboard
    if (snapshot.mvpPlayers && snapshot.mvpPlayers.length > 0) {
      this.mvpContainer.setVisible(true);
      snapshot.mvpPlayers.slice(0, 4).forEach((mvp, idx) => {
        if (this.mvpLines[idx]) {
          this.mvpLines[idx].setText(`${idx + 1}. ${mvp.name} - ${mvp.points} đ`);
        }
      });
    }

    // 6. Outcome
    if (snapshot.result === 'VICTORY') {
      this.outcomeContainer.setVisible(true);
      this.outcomeTitle.setText('🏆 CHIẾN THẮNG! 🏆');
      this.outcomeTitle.setColor('#00f5d4');
      this.outcomeSubtitle.setText('Thành trì đã được bảo vệ thành công!');
    } else if (snapshot.result === 'DEFEAT') {
      this.outcomeContainer.setVisible(true);
      this.outcomeTitle.setText('💀 THẤT THỦ! 💀');
      this.outcomeTitle.setColor('#d90429');
      this.outcomeSubtitle.setText('Căn cứ đã bị zombie tàn phá!');
    } else {
      this.outcomeContainer.setVisible(false);
    }
  }

  showGiftAlert(skillName: string, sender?: string): void {
    if (this.giftAlertContainer.visible) return;
    const text = sender ? `🎁 ${sender} TẶNG: ${skillName}!` : `🎁 KÍCH HOẠT: ${skillName}!`;
    this.giftAlertText.setText(text);
    this.giftAlertContainer.setVisible(true).setAlpha(0).setScale(0.8);

    if (this.giftAlertTween) this.giftAlertTween.stop();

    this.giftAlertTween = this.scene.tweens.add({
      targets: this.giftAlertContainer,
      alpha: 1,
      scale: 1,
      duration: 200,
      hold: 2500,
      yoyo: true,
      onComplete: () => {
        this.giftAlertContainer.setVisible(false);
      },
    });
  }

  private getPhaseLabel(phase: string): string {
    const map: Record<string, string> = {
      PREPARING: 'CHUẨN BỊ',
      WAVE_1: 'ĐỢT 1',
      WAVE_2: 'ĐỢT 2',
      WAVE_3: 'ĐỢT 3',
      WAVE_4: 'ĐỢT 4',
      BOSS: 'TRÙM CUỐI (BOSS)',
      RESULTS: 'KẾT QUẢ',
      PAUSED: 'TẠM DỪNG',
    };
    return map[phase] || phase;
  }
}
