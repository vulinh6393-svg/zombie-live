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

    // --- 1. Top HUD Header (Safe under TikTok Top Pills: y: 125 - 275) ---
    const topContainer = scene.add.container(0, 125).setDepth(150);

    const topBg = scene.add.graphics();
    topBg.fillStyle(0x0a1128, 0.95);
    topBg.fillRoundedRect(30, 0, width - 60, 142, 14);
    topBg.lineStyle(2, 0x00f5d4, 0.9);
    topBg.strokeRoundedRect(30, 0, width - 60, 142, 14);

    // Wave indicator - Heavy tactical display font
    this.waveText = scene.add.text(55, 12, 'ĐỢT 3: TỔNG LỰC', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 3,
    });

    // Wave countdown / elapsed timer
    this.timerText = scene.add.text(width - 55, 14, '⏱️ 04:15', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fee440',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    // Base HP Bar Background & Fill (Enlarged for mobile readability)
    const baseHpBarBg = scene.add.graphics();
    baseHpBarBg.fillStyle(0x161a22, 0.95);
    baseHpBarBg.fillRoundedRect(width / 2 - 290, 46, 580, 28, 14);
    baseHpBarBg.lineStyle(2, 0x3e4451, 1);
    baseHpBarBg.strokeRoundedRect(width / 2 - 290, 46, 580, 28, 14);

    this.baseHpBarFill = scene.add.graphics();

    // High-legibility Fortress HP Text (P0: Readable on 360x640 mobile preview)
    this.baseHpText = scene.add.text(width / 2, 60, 'THÀNH TRÌ: 10,000 / 10,000 HP (100%)', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Streamlined military stats (High contrast, condensed for mobile)
    this.entityCountText = scene.add.text(width / 2, 90, '👥 40 Chiến Binh  •  ⚔️ 3 Trực Chiến  •  🧟 10 Zombie', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#cbd5e1',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Prominent High-Contrast Callout Guidance for TikTok Viewers (P0 Priority)
    const calloutBg = scene.add.graphics();
    calloutBg.fillStyle(0x050e1f, 0.95);
    calloutBg.fillRoundedRect(width / 2 - 310, 110, 620, 28, 14);
    calloutBg.lineStyle(1.5, 0x00f5d4, 0.85);
    calloutBg.strokeRoundedRect(width / 2 - 310, 110, 620, 28, 14);

    const callout = scene.add.text(width / 2, 124, '💬 Chat: "1" ALPHA (Cyan)  |  "2" BRAVO (Vàng)  |  "3" CHARLIE (Hồng)', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#00f5d4',
    }).setOrigin(0.5);

    topContainer.add([topBg, this.waveText, this.timerText, baseHpBarBg, this.baseHpBarFill, this.baseHpText, this.entityCountText, calloutBg, callout]);

    // --- 2. Boss HP Bar (Docked safely at y: 280) ---
    this.bossContainer = scene.add.container(0, 280).setDepth(150);
    const bossBg = scene.add.graphics();
    bossBg.fillStyle(0x2d0047, 0.95);
    bossBg.fillRoundedRect(80, 0, width - 160, 66, 12);
    bossBg.lineStyle(2, 0xf72585, 1);
    bossBg.strokeRoundedRect(80, 0, width - 160, 66, 12);

    const bossTitle = scene.add.text(width / 2, 16, '⚠️ ZOMBIE KING (TRÙM CUỐI TIẾN CÔNG) ⚠️', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f72585',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.bossHpBarFill = scene.add.graphics();
    this.bossHpText = scene.add.text(width / 2, 46, '12,000 / 12,000 HP', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.bossContainer.add([bossBg, bossTitle, this.bossHpBarFill, this.bossHpText]);
    this.bossContainer.setVisible(false);

    // --- 3. Compact Gift Skill Alert Banner (y: 355, auto hides in 2.5s) ---
    this.giftBanner = scene.add.container(width / 2, 355).setDepth(160);
    const giftBg = scene.add.graphics();
    giftBg.fillStyle(0x38040e, 0.94);
    giftBg.fillRoundedRect(-270, -24, 540, 48, 24);
    giftBg.lineStyle(2, 0xff0055, 1);
    giftBg.strokeRoundedRect(-270, -24, 540, 48, 24);

    this.giftText = scene.add.text(0, 0, '🎁 VIP_Gamer99 KÍCH HOẠT: TÊN LỬA TỔNG LỰC!', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fee440',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.giftBanner.add([giftBg, this.giftText]);
    this.giftBanner.setVisible(false);

    // --- 4. MVP Tactical Leaderboard (High legibility, docked top-left y: 280) ---
    this.mvpContainer = scene.add.container(35, 280).setDepth(140);
    const mvpBg = scene.add.graphics();
    mvpBg.fillStyle(0x0a1128, 0.92);
    mvpBg.fillRoundedRect(0, 0, 220, 145, 10);
    mvpBg.lineStyle(1.5, 0x38bdf8, 0.9);
    mvpBg.strokeRoundedRect(0, 0, 220, 145, 10);

    const mvpHeader = scene.add.text(110, 16, '★ TOP CHIẾN CÔNG ★', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fee440',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.mvpContainer.add([mvpBg, mvpHeader]);

    for (let i = 0; i < 4; i++) {
      const row = scene.add.text(14, 38 + i * 26, `${i + 1}. Đang tải...`, {
        fontFamily: GAME_FONTS.TACTICAL,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e2e8f0',
        stroke: '#000000',
        strokeThickness: 2,
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
      const elapsed = snapshot.elapsedSeconds ?? Math.floor((snapshot.tick || 0) / 20);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      this.timerText.setText(`⏱️ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }

    // 3. Base HP
    const baseRatio = Math.max(0, snapshot.baseHp / snapshot.maxBaseHp);
    const percent = Math.round(baseRatio * 100);
    this.baseHpText.setText(`THÀNH TRÌ: ${snapshot.baseHp.toLocaleString()} / ${snapshot.maxBaseHp.toLocaleString()} HP (${percent}%)`);

    this.baseHpBarFill.clear();
    const barWidth = 574;
    const currentW = Math.max(0, barWidth * baseRatio);
    const color = baseRatio > 0.5 ? 0x00f5d4 : baseRatio > 0.25 ? 0xfee440 : 0xff0055;
    this.baseHpBarFill.fillStyle(color, 1);
    this.baseHpBarFill.fillRoundedRect(width / 2 - 287, 49, currentW, 22, 11);

    // 4. Entity Statistics (Streamlined high-contrast stats)
    const aliveZombies = snapshot.zombies.filter((z) => z.hp > 0).length;
    const totalMembers = snapshot.activePlayerCount || 40;
    const activeSoldiers = 3; // 1 representative soldier per squad in Phase 02.4

    this.entityCountText.setText(
      `👥 ${totalMembers} Chiến Binh  •  ⚔️ ${activeSoldiers} Trực Chiến  •  🧟 ${aliveZombies} Zombie`
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
    const activeSkill = (snapshot as any).activeGiftSkill || snapshot.giftSkillActive;
    if (activeSkill) {
      this.showGiftAlert(activeSkill.name, activeSkill.senderName);
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
