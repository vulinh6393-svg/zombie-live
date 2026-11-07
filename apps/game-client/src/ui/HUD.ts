import Phaser from 'phaser';
import { ExtendedMatchSnapshot } from '../types.js';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Header components
  private waveText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private baseHpText: Phaser.GameObjects.Text;
  private baseHpBarFill: Phaser.GameObjects.Graphics;
  private entityCountText: Phaser.GameObjects.Text;

  // Boss components
  private bossContainer: Phaser.GameObjects.Container;
  private bossHpBarFill: Phaser.GameObjects.Graphics;
  private bossHpText: Phaser.GameObjects.Text;

  // Gift Alert
  private giftAlertContainer: Phaser.GameObjects.Container;
  private giftAlertText: Phaser.GameObjects.Text;
  private giftAlertSubtext: Phaser.GameObjects.Text;
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

    // --- 1. Top HUD Header (0% - 10% Safe Zone, y: 30 - 170) ---
    const topBg = scene.add.graphics();
    topBg.fillStyle(0x0a1128, 0.92);
    topBg.fillRoundedRect(30, 35, width - 60, 140, 16);
    topBg.lineStyle(2, 0x00f5d4, 0.85);
    topBg.strokeRoundedRect(30, 35, width - 60, 140, 16);

    this.waveText = scene.add.text(55, 50, 'ĐỢT: CHUẨN BỊ', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#00f5d4',
    });

    this.timerText = scene.add.text(width - 55, 50, '05:00', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#fee440',
    }).setOrigin(1, 0);

    // Base HP Bar Background & Fill
    const baseHpBarBg = scene.add.graphics();
    baseHpBarBg.fillStyle(0x161a22, 0.9);
    baseHpBarBg.fillRoundedRect(width / 2 - 250, 90, 500, 24, 12);
    baseHpBarBg.lineStyle(1.5, 0x3e4451, 1);
    baseHpBarBg.strokeRoundedRect(width / 2 - 250, 90, 500, 24, 12);

    this.baseHpBarFill = scene.add.graphics();

    this.baseHpText = scene.add.text(width / 2, 102, 'MÁU THÀNH TRÌ: 10,000 / 10,000 HP (100%)', {
      fontFamily: 'Arial Black',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.entityCountText = scene.add.text(width / 2, 145, 'Quân Đội: 12 Lính (3 Squads) | Kẻ Địch: 0 Zombie', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#adb5bd',
    }).setOrigin(0.5);

    // --- 2. Boss HP Bar (Hidden by default, y: 185) ---
    this.bossContainer = scene.add.container(0, 185).setDepth(40);
    const bossBg = scene.add.graphics();
    bossBg.fillStyle(0x2d0047, 0.95);
    bossBg.fillRoundedRect(80, 0, width - 160, 65, 12);
    bossBg.lineStyle(2, 0xf72585, 1);
    bossBg.strokeRoundedRect(80, 0, width - 160, 65, 12);

    const bossTitle = scene.add.text(width / 2, 16, '⚠️ ZOMBIE KING (TRÙM CUỐI TẤN CÔNG) ⚠️', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#f72585',
    }).setOrigin(0.5);

    this.bossHpBarFill = scene.add.graphics();
    this.bossHpText = scene.add.text(width / 2, 45, '12,000 / 12,000 HP', {
      fontFamily: 'Arial Black',
      fontSize: '15px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.bossContainer.add([bossBg, bossTitle, this.bossHpBarFill, this.bossHpText]);
    this.bossContainer.setVisible(false);

    // --- 3. Gift Alert Banner (Positioned safely at y: 260, not blocking center combat) ---
    this.giftAlertContainer = scene.add.container(width / 2, 260).setDepth(50);
    const giftBg = scene.add.graphics();
    giftBg.fillStyle(0x0a1128, 0.95);
    giftBg.fillRoundedRect(-240, -32, 480, 64, 16);
    giftBg.lineStyle(2.5, 0xfee440, 1);
    giftBg.strokeRoundedRect(-240, -32, 480, 64, 16);

    this.giftAlertText = scene.add.text(0, -10, '🎁 TIẾP VIỆN QUÀ TẶNG TIKTOK!', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#fee440',
    }).setOrigin(0.5);

    this.giftAlertSubtext = scene.add.text(0, 14, '@MinhGamer đã tặng Tên Lửa Phòng Thủ', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    this.giftAlertContainer.add([giftBg, this.giftAlertText, this.giftAlertSubtext]);
    this.giftAlertContainer.setVisible(false);

    // --- 4. MVP Mini Leaderboard (Top Right, x: width - 260, y: 190) ---
    this.mvpContainer = scene.add.container(width - 250, 190).setDepth(35);
    const mvpBg = scene.add.graphics();
    mvpBg.fillStyle(0x001f54, 0.88);
    mvpBg.fillRoundedRect(0, 0, 220, 145, 12);
    mvpBg.lineStyle(1.5, 0x00bbf9, 0.85);
    mvpBg.strokeRoundedRect(0, 0, 220, 145, 12);

    const mvpTitle = scene.add.text(110, 14, '🏆 TOP ĐỒNG ĐỘI', {
      fontFamily: 'Arial Black',
      fontSize: '14px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    this.mvpContainer.add([mvpBg, mvpTitle]);
    for (let i = 0; i < 4; i++) {
      const line = scene.add.text(15, 38 + i * 25, `${i + 1}. ...`, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffffff',
      });
      this.mvpLines.push(line);
      this.mvpContainer.add(line);
    }

    // --- 5. Bottom Instructions (y: 1780 - 1880) ---
    const bottomBg = scene.add.graphics();
    bottomBg.fillStyle(0x0a1128, 0.95);
    bottomBg.fillRoundedRect(30, 1780, width - 60, 95, 16);
    bottomBg.lineStyle(2, 0x00bbf9, 0.85);
    bottomBg.strokeRoundedRect(30, 1780, width - 60, 95, 16);

    const commentTitle = scene.add.text(width / 2, 1805, '💬 BÌNH LUẬN "JOIN" ĐỂ GIA NHẬP QUÂN ĐỘI TIỂU ĐỘI', {
      fontFamily: 'Arial Black',
      fontSize: '19px',
      color: '#00f5d4',
    }).setOrigin(0.5);

    const commandList = scene.add.text(width / 2, 1845, 'Alpha: Làn Trái | Bravo: Làn Giữa | Charlie: Làn Phải | 🎁 Tặng Quà Kích Hoạt Kỹ Năng', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#f8f9fa',
    }).setOrigin(0.5);

    // --- 6. Outcome Banner (Victory / Defeat) ---
    this.outcomeContainer = scene.add.container(width / 2, 900).setDepth(150);
    const outcomeBg = scene.add.graphics();
    outcomeBg.fillStyle(0x000000, 0.92);
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
      baseHpBarBg,
      this.baseHpBarFill,
      this.baseHpText,
      this.entityCountText,
      this.bossContainer,
      this.giftAlertContainer,
      this.mvpContainer,
      bottomBg,
      commentTitle,
      commandList,
      this.outcomeContainer,
    ]).setDepth(50);
  }

  update(snapshot: ExtendedMatchSnapshot): void {
    // 1. Wave phase & timer
    const phaseLabel = this.getPhaseLabel(snapshot.phase);
    this.waveText.setText(`ĐỢT: ${phaseLabel}`);

    const remainingSec = Math.max(0, 300 - snapshot.elapsedSeconds);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    this.timerText.setText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

    // 2. Base HP Bar
    this.updateBaseHp(snapshot.baseHp, snapshot.maxBaseHp);

    // 3. Entity Count
    const soldierCount = snapshot.soldiers ? snapshot.soldiers.length : 12;
    const zombieCount = snapshot.zombies ? snapshot.zombies.length : 0;
    this.entityCountText.setText(`Quân Đội: ${soldierCount} Lính | Kẻ Địch: ${zombieCount} Zombie`);

    // 4. Boss HP Bar
    if (snapshot.phase === 'BOSS' && snapshot.bossHp && snapshot.maxBossHp) {
      this.bossContainer.setVisible(true);
      const ratio = Math.max(0, snapshot.bossHp / snapshot.maxBossHp);
      this.bossHpBarFill.clear();
      this.bossHpBarFill.fillStyle(0xf72585, 1);
      this.bossHpBarFill.fillRoundedRect(95, 36, (1080 - 190) * ratio, 20, 10);
      this.bossHpText.setText(`${snapshot.bossHp.toLocaleString()} / ${snapshot.maxBossHp.toLocaleString()} HP (${Math.round(ratio * 100)}%)`);
    } else {
      this.bossContainer.setVisible(false);
    }

    // 5. Gift Skill Alert
    if (snapshot.giftSkillActive) {
      this.showGiftAlert(snapshot.giftSkillActive.name, snapshot.giftSkillActive.senderName);
    }

    // 6. MVP Players
    if (snapshot.mvpPlayers && snapshot.mvpPlayers.length > 0) {
      for (let i = 0; i < this.mvpLines.length; i++) {
        const p = snapshot.mvpPlayers[i];
        if (p) {
          this.mvpLines[i].setText(`${i + 1}. ${p.name}: ${p.points}đ`);
        }
      }
    }

    // 7. Match Outcome
    if (snapshot.result === 'VICTORY') {
      this.outcomeTitle.setText('🏆 CHIẾN THẮNG! 🏆');
      this.outcomeTitle.setColor('#00f5d4');
      this.outcomeSubtitle.setText('Thành trì được bảo vệ thành công!');
      this.outcomeContainer.setVisible(true);
    } else if (snapshot.result === 'DEFEAT') {
      this.outcomeTitle.setText('☠️ THẤT THỦ! ☠️');
      this.outcomeTitle.setColor('#ff0055');
      this.outcomeSubtitle.setText('Căn cứ đã bị zombie phá hủy!');
      this.outcomeContainer.setVisible(true);
    } else {
      this.outcomeContainer.setVisible(false);
    }
  }

  public showGiftAlert(skillName: string, senderName: string = 'Viewer VIP'): void {
    this.giftAlertText.setText(`🎁 KỸ NĂNG: ${skillName.toUpperCase()}`);
    this.giftAlertSubtext.setText(`@${senderName} đã kích hoạt chi viện hỏa lực!`);
    this.giftAlertContainer.setVisible(true);
    this.giftAlertContainer.setAlpha(1);

    if (this.giftAlertTween) this.giftAlertTween.stop();
    this.giftAlertTween = this.scene.tweens.add({
      targets: this.giftAlertContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      duration: 200,
      repeat: 2,
    });

    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: this.giftAlertContainer,
        alpha: 0,
        duration: 400,
        onComplete: () => this.giftAlertContainer.setVisible(false),
      });
    });
  }

  private updateBaseHp(hp: number, maxHp: number): void {
    const width = 1080;
    const ratio = Math.max(0, hp / maxHp);
    const barWidth = 500;
    const barX = width / 2 - 250;

    this.baseHpBarFill.clear();
    const color = ratio > 0.5 ? 0x00f5d4 : ratio > 0.25 ? 0xfee440 : 0xff0055;
    this.baseHpBarFill.fillStyle(color, 1);
    this.baseHpBarFill.fillRoundedRect(barX, 90, barWidth * ratio, 24, 12);

    const percent = Math.round(ratio * 100);
    this.baseHpText.setText(`MÁU THÀNH TRÌ: ${hp.toLocaleString()} / ${maxHp.toLocaleString()} HP (${percent}%)`);
  }

  private getPhaseLabel(phase: string): string {
    switch (phase) {
      case 'PREPARING': return 'CHUẨN BỊ (30s)';
      case 'WAVE_1': return 'ĐỢT 1 — TRINH SÁT';
      case 'WAVE_2': return 'ĐỢT 2 — CÀN QUÉT';
      case 'WAVE_3': return 'ĐỢT 3 — TỔNG LỰC';
      case 'WAVE_4': return 'ĐỢT 4 — ĐỘT PHÁ';
      case 'BOSS': return 'TRÙM CUỐI (ZOMBIE KING)';
      case 'RESULTS': return 'KẾT THÚC';
      default: return 'CHIẾN ĐẤU';
    }
  }
}
