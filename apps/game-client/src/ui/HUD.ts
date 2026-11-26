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

    // --- 1. Top HUD Header (Safe below TikTok Top Pills even on 360x640: y: 175 - 355) ---
    const topContainer = scene.add.container(0, 175).setDepth(150);

    const topBg = scene.add.graphics();
    topBg.fillStyle(0x0a1128, 0.94);
    topBg.fillRoundedRect(24, 0, width - 48, 180, 16);
    topBg.lineStyle(2.5, 0x00f5d4, 0.9);
    topBg.strokeRoundedRect(24, 0, width - 48, 180, 16);

    // Row 1: Wave indicator & Timer (36px on 1080px = 12.0px on 360px mobile)
    this.waveText = scene.add.text(48, 14, 'ĐỢT 3: TỔNG LỰC', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 4,
    });

    this.timerText = scene.add.text(width - 48, 14, '⏱️ 04:15', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#fee440',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(1, 0);

    // Row 2: Base HP Bar (Enlarged to 984x44 for 36px = 12.0px mobile text)
    const baseHpBarBg = scene.add.graphics();
    baseHpBarBg.fillStyle(0x161a22, 0.95);
    baseHpBarBg.fillRoundedRect(48, 64, width - 96, 44, 14);
    baseHpBarBg.lineStyle(2, 0x3e4451, 1);
    baseHpBarBg.strokeRoundedRect(48, 64, width - 96, 44, 14);

    this.baseHpBarFill = scene.add.graphics();

    this.baseHpText = scene.add.text(width / 2, 86, 'HP: 10,000 / 10,000 (100%)', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Secondary entity stats hidden from top HUD to eliminate clutter and maximize mobile legibility
    this.entityCountText = scene.add.text(width / 2, 0, '', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '14px',
    }).setVisible(false);

    // Row 3: Prominent High-Contrast Callout Guidance for TikTok Viewers (36px = 12.0px on 360px)
    const calloutBg = scene.add.graphics();
    calloutBg.fillStyle(0x050e1f, 0.96);
    calloutBg.fillRoundedRect(48, 120, width - 96, 48, 14);
    calloutBg.lineStyle(2, 0x00f5d4, 0.9);
    calloutBg.strokeRoundedRect(48, 120, width - 96, 48, 14);

    const callout = scene.add.text(width / 2, 144, 'GÕ: "1" ALPHA | "2" BRAVO | "3" CHARLIE', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    topContainer.add([topBg, this.waveText, this.timerText, baseHpBarBg, this.baseHpBarFill, this.baseHpText, this.entityCountText, calloutBg, callout]);

    // --- 2. Boss HP Bar (Docked safely at y: 368) ---
    this.bossContainer = scene.add.container(0, 368).setDepth(150);
    const bossBg = scene.add.graphics();
    bossBg.fillStyle(0x2d0047, 0.95);
    bossBg.fillRoundedRect(48, 0, width - 96, 76, 14);
    bossBg.lineStyle(2, 0xf72585, 1);
    bossBg.strokeRoundedRect(48, 0, width - 96, 76, 14);

    const bossTitle = scene.add.text(width / 2, 20, '⚠️ ZOMBIE KING ⚠️', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f72585',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.bossHpBarFill = scene.add.graphics();
    this.bossHpText = scene.add.text(width / 2, 54, '12,000 / 12,000 HP', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.bossContainer.add([bossBg, bossTitle, this.bossHpBarFill, this.bossHpText]);
    this.bossContainer.setVisible(false);

    // --- 3. High-Visibility Gift Skill Alert Banner (y: 400, auto hides in 2.5s) ---
    this.giftBanner = scene.add.container(width / 2, 400).setDepth(160);
    const giftBg = scene.add.graphics();
    giftBg.fillStyle(0x38040e, 0.95);
    giftBg.fillRoundedRect(-460, -32, 920, 64, 24);
    giftBg.lineStyle(2.5, 0xff0055, 1);
    giftBg.strokeRoundedRect(-460, -32, 920, 64, 24);

    this.giftText = scene.add.text(0, 0, '🎁 VIP_Gamer99: TÊN LỬA TỔNG LỰC!', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#fee440',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.giftBanner.add([giftBg, this.giftText]);
    this.giftBanner.setVisible(false);

    // --- 4. Compact MVP Leaderboard (Secondary info, tucked neatly at top-left y: 368 without blocking lanes) ---
    this.mvpContainer = scene.add.container(24, 368).setDepth(140);
    const mvpBg = scene.add.graphics();
    mvpBg.fillStyle(0x0a1128, 0.88);
    mvpBg.fillRoundedRect(0, 0, 260, 124, 10);
    mvpBg.lineStyle(1.5, 0x38bdf8, 0.85);
    mvpBg.strokeRoundedRect(0, 0, 260, 124, 10);

    const mvpHeader = scene.add.text(130, 16, '★ TOP MVP ★', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fee440',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.mvpContainer.add([mvpBg, mvpHeader]);

    for (let i = 0; i < 3; i++) {
      const row = scene.add.text(14, 38 + i * 28, `${i + 1}. Đang tải...`, {
        fontFamily: GAME_FONTS.TACTICAL,
        fontSize: '18px',
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
    this.baseHpText.setText(`HP: ${snapshot.baseHp.toLocaleString()} / ${snapshot.maxBaseHp.toLocaleString()} (${percent}%)`);

    this.baseHpBarFill.clear();
    const barWidth = width - 104; // 976px inside 984px border
    const currentW = Math.max(0, barWidth * baseRatio);
    const color = baseRatio > 0.5 ? 0x00f5d4 : baseRatio > 0.25 ? 0xfee440 : 0xff0055;
    this.baseHpBarFill.fillStyle(color, 1);
    this.baseHpBarFill.fillRoundedRect(52, 68, currentW, 36, 11);

    // 4. Entity Statistics (Hidden from top HUD to preserve mobile legibility)
    this.entityCountText.setVisible(false);

    // 5. Boss Bar
    if (snapshot.phase === 'BOSS' && snapshot.bossHp !== undefined && snapshot.maxBossHp !== undefined) {
      this.bossContainer.setVisible(true);
      const bossRatio = Math.max(0, snapshot.bossHp / snapshot.maxBossHp);
      this.bossHpText.setText(`${snapshot.bossHp.toLocaleString()} / ${snapshot.maxBossHp.toLocaleString()} HP`);
      this.bossHpBarFill.clear();
      this.bossHpBarFill.fillStyle(0xf72585, 1);
      this.bossHpBarFill.fillRoundedRect(56, 38, (width - 112) * bossRatio, 28, 8);
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
