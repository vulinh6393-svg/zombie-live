import Phaser from 'phaser';
import { ExtendedMatchSnapshot } from '../types.js';
import { GAME_FONTS } from '../config/FontConfig.js';

export class HUD {
  private scene: Phaser.Scene;
  private waveText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private baseHpText: Phaser.GameObjects.Text;
  private baseHpBarFill: Phaser.GameObjects.Graphics;
  private entityCountText: Phaser.GameObjects.Text;

  // Boss Elements
  private bossContainer: Phaser.GameObjects.Container;
  private bossHpBarFill: Phaser.GameObjects.Graphics;
  private bossHpText: Phaser.GameObjects.Text;

  // Gift Alert Banner
  private giftBanner: Phaser.GameObjects.Container;
  private giftText: Phaser.GameObjects.Text;
  private giftTimer?: Phaser.Time.TimerEvent;

  // MVP Board
  private mvpContainer: Phaser.GameObjects.Container;
  private mvpListTexts: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = 1080;

    // --- 1. Top HUD Header (Safe under TikTok Top Pills: y: 125 - 245) ---
    const topContainer = scene.add.container(0, 125).setDepth(150);

    const topBg = scene.add.graphics();
    topBg.fillStyle(0x0a1128, 0.94);
    topBg.fillRoundedRect(30, 0, width - 60, 115, 14);
    topBg.lineStyle(2, 0x00f5d4, 0.9);
    topBg.strokeRoundedRect(30, 0, width - 60, 115, 14);

    this.waveText = scene.add.text(55, 14, 'ĐỢT: ĐỢT 3 (TIẾN CÔNG)', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00f5d4',
    });

    this.timerText = scene.add.text(width - 55, 14, '04:15', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fee440',
    }).setOrigin(1, 0);

    // Base HP Bar Background & Fill
    const baseHpBarBg = scene.add.graphics();
    baseHpBarBg.fillStyle(0x161a22, 0.9);
    baseHpBarBg.fillRoundedRect(width / 2 - 250, 44, 500, 22, 11);
    baseHpBarBg.lineStyle(1.5, 0x3e4451, 1);
    baseHpBarBg.strokeRoundedRect(width / 2 - 250, 44, 500, 22, 11);

    this.baseHpBarFill = scene.add.graphics();

    this.baseHpText = scene.add.text(width / 2, 55, 'THÀNH TRÌ: 9,850 / 10,000 HP (98.5%)', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Clear Military Statistics
    this.entityCountText = scene.add.text(width / 2, 92, 'Quân Chi Viện: 40 Người (3 Đội) | Trực Chiến: 3 Lính | Kẻ Địch: 10 Zombie', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#adb5bd',
    }).setOrigin(0.5);

    // Callout guidance for TikTok viewers
    const callout = scene.add.text(width / 2, 118, '💬 Bình luận: "1" (Alpha) | "2" (Bravo) | "3" (Charlie) để chi viện!', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#00f5d4',
      backgroundColor: '#050a14cc',
      padding: { x: 8, y: 2 },
    }).setOrigin(0.5);

    topContainer.add([topBg, this.waveText, this.timerText, baseHpBarBg, this.baseHpBarFill, this.baseHpText, this.entityCountText, callout]);

    // --- 2. Boss HP Bar (Docked safely at y: 255) ---
    this.bossContainer = scene.add.container(0, 255).setDepth(150);
    const bossBg = scene.add.graphics();
    bossBg.fillStyle(0x2d0047, 0.95);
    bossBg.fillRoundedRect(80, 0, width - 160, 60, 12);
    bossBg.lineStyle(2, 0xf72585, 1);
    bossBg.strokeRoundedRect(80, 0, width - 160, 60, 12);

    const bossTitle = scene.add.text(width / 2, 14, '⚠️ ZOMBIE KING (TRÙM CUỐI TIẾN CÔNG) ⚠️', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#f72585',
    }).setOrigin(0.5);

    this.bossHpBarFill = scene.add.graphics();
    this.bossHpText = scene.add.text(width / 2, 42, '12,000 / 12,000 HP', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.bossContainer.add([bossBg, bossTitle, this.bossHpBarFill, this.bossHpText]);
    this.bossContainer.setVisible(false);

    // --- 3. Compact Gift Skill Alert Banner (y: 335, auto hides in 2.5s) ---
    this.giftBanner = scene.add.container(width / 2, 335).setDepth(160);
    const giftBg = scene.add.graphics();
    giftBg.fillStyle(0x38040e, 0.92);
    giftBg.fillRoundedRect(-240, -22, 480, 44, 22);
    giftBg.lineStyle(2, 0xff0055, 1);
    giftBg.strokeRoundedRect(-240, -22, 480, 44, 22);

    this.giftText = scene.add.text(0, 0, '🎁 VIP_Gamer99 KÍCH HOẠT: TÊN LỬA TỔNG LỰC!', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fee440',
    }).setOrigin(0.5);

    this.giftBanner.add([giftBg, this.giftText]);
    this.giftBanner.setVisible(false);

    // --- 4. MVP Tactical Leaderboard (Compact, docked top-left y: 250, safe margin) ---
    this.mvpContainer = scene.add.container(35, 250).setDepth(140);
    const mvpBg = scene.add.graphics();
    mvpBg.fillStyle(0x0a1128, 0.88);
    mvpBg.fillRoundedRect(0, 0, 200, 135, 10);
    mvpBg.lineStyle(1.5, 0x38bdf8, 0.8);
    mvpBg.strokeRoundedRect(0, 0, 200, 135, 10);

    const mvpHeader = scene.add.text(100, 14, '★ TOP CHIẾN CÔNG ★', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fee440',
    }).setOrigin(0.5);

    this.mvpContainer.add([mvpBg, mvpHeader]);

    for (let i = 0; i < 4; i++) {
      const row = scene.add.text(14, 34 + i * 24, `${i + 1}. Đang tải...`, {
        fontFamily: GAME_FONTS.TACTICAL,
        fontSize: '11px',
        color: '#e2e8f0',
      });
      this.mvpListTexts.push(row);
      this.mvpContainer.add(row);
    }
  }

  public update(snapshot: ExtendedMatchSnapshot): void {
    const width = 1080;

    // 1. Wave Phase
    let phaseDisplay = 'ĐỢT: CHUẨN BỊ';
    if (snapshot.phase === 'WAVE_1') phaseDisplay = 'ĐỢT 1: THÁM THÍNH';
    else if (snapshot.phase === 'WAVE_2') phaseDisplay = 'ĐỢT 2: ĐỘT KÍCH';
    else if (snapshot.phase === 'WAVE_3') phaseDisplay = 'ĐỢT 3: TỔNG LỰC';
    else if (snapshot.phase === 'BOSS') phaseDisplay = '⚠️ TRÙM CUỐI XUẤT HIỆN ⚠️';
    else if (snapshot.phase === 'RESULTS') phaseDisplay = snapshot.result === 'VICTORY' ? '🏆 CHIẾN THẮNG' : '💀 THẤT THỦ';
    this.waveText.setText(phaseDisplay);

    // 2. Timer (Countdown vs Elapsed)
    if (snapshot.waveRemainingSeconds !== undefined) {
      const rMins = Math.floor(snapshot.waveRemainingSeconds / 60);
      const rSecs = snapshot.waveRemainingSeconds % 60;
      this.timerText.setText(`⏱️ ${rMins.toString().padStart(2, '0')}:${rSecs.toString().padStart(2, '0')}`);
    } else {
      const mins = Math.floor(snapshot.elapsedSeconds / 60);
      const secs = snapshot.elapsedSeconds % 60;
      this.timerText.setText(`⏱️ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }

    // 3. Base HP
    const baseRatio = Math.max(0, snapshot.baseHp / snapshot.maxBaseHp);
    const percent = Math.round(baseRatio * 100);
    this.baseHpText.setText(`THÀNH TRÌ: ${snapshot.baseHp.toLocaleString()} / ${snapshot.maxBaseHp.toLocaleString()} HP (${percent}%)`);

    this.baseHpBarFill.clear();
    const barWidth = 496;
    const currentW = barWidth * baseRatio;
    const color = baseRatio > 0.5 ? 0x00f5d4 : baseRatio > 0.25 ? 0xfee440 : 0xff0055;
    this.baseHpBarFill.fillStyle(color, 1);
    this.baseHpBarFill.fillRoundedRect(width / 2 - 248, 46, currentW, 18, 9);

    // 4. Entity Statistics (Transparent distinction)
    const aliveZombies = snapshot.zombies.filter((z) => z.hp > 0).length;
    const totalMembers = snapshot.activePlayerCount || 40;
    const activeSoldiers = 3; // 1 representative soldier per squad in Phase 02.4

    this.entityCountText.setText(
      `Quân Chi Viện: ${totalMembers} Người (3 Đội) | Trực Chiến: ${activeSoldiers} Lính | Kẻ Địch: ${aliveZombies} Zombie`
    );

    // 5. Boss Bar
    if (snapshot.phase === 'BOSS' && snapshot.bossHp !== undefined && snapshot.maxBossHp !== undefined) {
      this.bossContainer.setVisible(true);
      const bossRatio = Math.max(0, snapshot.bossHp / snapshot.maxBossHp);
      this.bossHpText.setText(`${snapshot.bossHp.toLocaleString()} / ${snapshot.maxBossHp.toLocaleString()} HP`);
      this.bossHpBarFill.clear();
      this.bossHpBarFill.fillStyle(0xf72585, 1);
      this.bossHpBarFill.fillRoundedRect(85, 34, (width - 170) * bossRatio, 20, 8);
    } else {
      this.bossContainer.setVisible(false);
    }

    // 6. Gift Skill Banner
    if (snapshot.giftSkillActive) {
      this.showGiftAlert(snapshot.giftSkillActive.name, snapshot.giftSkillActive.senderName);
    }

    // 7. MVP Board
    if (snapshot.mvpPlayers && snapshot.mvpPlayers.length > 0) {
      for (let i = 0; i < this.mvpListTexts.length; i++) {
        if (snapshot.mvpPlayers[i]) {
          const p = snapshot.mvpPlayers[i];
          this.mvpListTexts[i].setText(`${i + 1}. ${p.name.slice(0, 10)}: ${p.points}`);
        }
      }
    }
  }

  public showGiftAlert(skillName: string, senderName: string = 'Đồng Minh'): void {
    this.giftText.setText(`🎁 ${senderName} KÍCH HOẠT: ${skillName}!`);
    this.giftBanner.setVisible(true);
    this.giftBanner.setScale(0.85);

    this.scene.tweens.add({
      targets: this.giftBanner,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });

    if (this.giftTimer) {
      this.giftTimer.remove(false);
    }

    this.giftTimer = this.scene.time.delayedCall(2500, () => {
      this.giftBanner.setVisible(false);
    });
  }
}
